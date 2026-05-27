import { createServer }      from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize }   from 'node:path';
import { readFile }           from 'node:fs/promises';
import { fileURLToPath }      from 'node:url';
import path                   from 'node:path';

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const port   = Number(process.env.PORT || 3456);

// Serve from dist/ if it exists (i.e. after a build) — this locks down source
// files regardless of NODE_ENV. Falls back to project root only in local dev
// when dist/ hasn't been built yet.
const distDir = path.join(__dir, 'dist');
const isProd  = process.env.NODE_ENV === 'production';
let root;
try {
  statSync(path.join(distDir, 'index.html'));
  root = distDir;  // dist/ exists and has index.html — serve only from here
} catch {
  root = __dir;    // no dist/ yet — local dev fallback
}
if (root === distDir) {
  console.log('  Serving from dist/ — source files are protected');
} else {
  console.warn('  WARNING: dist/ not found, serving from project root (dev mode)');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; });
    req.on('end',  () => { try { resolve(JSON.parse(buf)); } catch { reject(new Error('Bad JSON')); } });
    req.on('error', reject);
  });
}

// ── Simulation engine (same logic as netlify/functions/simulate.mjs) ───────
const SOURCE_DEFS = new Set(['users', 'cdcsource', 'eventsource']);

// Default latency by component type (ms)
const DEFAULT_LATENCY = {
  appserver:50, vm:50, pod:20, serverless:100, database:10, cache:1,
  apigateway:5, loadbalancer:2, cdn:15, queue:5, eventbus:3, pubsub:3,
  kafkatopic:3, streamprocessor:20, bgworker:500, graphqlapi:30,
  websocket:5, searchengine:20, ratelimiter:2,
};

function effectiveLatency(defId, props, loadPct) {
  const base = props.latencyMs || DEFAULT_LATENCY[defId] || 50;
  const f = Math.max(0, Math.min(loadPct, 100)) / 100;
  // Exponential latency growth under load: 1x at 0%, 5x at 100%
  return Math.round(base * (1 + 4 * f * f));
}

function p95Latency(avgMs) { return Math.round(avgMs * 2.5); }

function sourceRate(n) {
  if (n.defId === 'cdcsource')   return n.props.changeRate || n.props.capacity || 100;
  if (n.defId === 'eventsource') return n.props.eventRate  || 100;
  return (n.props.userCount || 100) * (n.props.requestsPerUser || 1);
}

function runSimTick(nodes, edges) {
  const incoming = {};
  const eFlowNew = {};
  const simLoad  = {};
  Object.keys(nodes).forEach(id => { incoming[id] = 0; });

  // Seed sources
  Object.values(nodes).forEach(n => {
    if (SOURCE_DEFS.has(n.defId)) incoming[n.id] = sourceRate(n);
  });

  // Multi-pass propagation
  for (let pass = 0; pass < 8; pass++) {
    const prevFlow = { ...eFlowNew };

    const inDeg = {};
    Object.keys(nodes).forEach(id => { inDeg[id] = 0; });
    edges.forEach(e => { if (!e.dashed && nodes[e.src] && nodes[e.tgt]) inDeg[e.tgt]++; });

    const q    = Object.keys(nodes).filter(id => inDeg[id] === 0 || SOURCE_DEFS.has(nodes[id]?.defId));
    const seen = new Set(q);
    const order = [];
    let head = [...q];
    while (head.length) {
      const nxt = [];
      head.forEach(id => {
        order.push(id);
        edges.filter(e => e.src === id && !e.dashed && nodes[e.tgt])
             .forEach(e => { if (!seen.has(e.tgt)) { seen.add(e.tgt); nxt.push(e.tgt); } });
      });
      head = nxt;
    }
    Object.keys(nodes).forEach(id => { if (!seen.has(id)) order.push(id); });
    Object.keys(nodes).forEach(id => { if (!SOURCE_DEFS.has(nodes[id]?.defId)) incoming[id] = 0; });

    order.forEach(cur => {
      const n = nodes[cur]; if (!n) return;
      const inn = incoming[cur] || 0;
      let fwd = inn;
      if      (n.defId === 'cdn')       fwd = inn * (1 - (n.props.cacheHitRate || 85) / 100);
      else if (n.defId === 'cache')     fwd = inn * (1 - (n.props.hitRate      || 80) / 100);
      else if (n.defId === 'firewall')  fwd = inn * (1 - (n.props.blockRate    ||  5) / 100);
      else if (n.defId === 'deviceapp') fwd = inn * (n.props.eventsPerInput    ||  1);
      const down = edges.filter(e => e.src === cur && !e.dashed && nodes[e.tgt]);
      if (down.length && fwd > 0) {
        const hasW = down.some(e => e.trafficPct != null);
        const totalW = hasW ? (down.reduce((s,e)=>s+(e.trafficPct||0),0)||down.length) : down.length;
        down.forEach(e => {
          const w = hasW ? (e.trafficPct||0)/totalW : 1/down.length;
          const flow = fwd * w;
          eFlowNew[e.id] = flow;
          incoming[e.tgt] = (incoming[e.tgt] || 0) + flow;
        });
      }
    });

    if (!Object.keys(eFlowNew).some(k => Math.abs((eFlowNew[k]||0)-(prevFlow[k]||0)) > 0.5)) break;
  }

  // Load per node
  Object.values(nodes).forEach(n => {
    if (SOURCE_DEFS.has(n.defId)) {
      simLoad[n.id] = { incoming: sourceRate(n), capacity: '∞', loadPct: 0, status: 'source' }; return;
    }
    if (n.defId === 'autoscaler') {
      const mx = Math.max(0, ...edges.filter(e=>e.src===n.id&&e.dashed).map(e=>simLoad[e.tgt]?.loadPct||0));
      simLoad[n.id] = { incoming:0, capacity:'—', loadPct:mx, status: mx>(n.props.scaleUpThreshold||80)?'scaling ↑':'watching' }; return;
    }
    const inn = incoming[n.id] || 0;
    const cap = n.props.capacity || n.props.maxConnections || 10000;
    let pct = (inn / cap) * 100, status = pct>85?'critical':pct>60?'warning':'ok';
    let scaledCap=null, replicas=null, scaling=false;

    const asEdge = edges.find(e => e.dashed && (
      (e.tgt===n.id && nodes[e.src]?.defId==='autoscaler') ||
      (e.src===n.id && nodes[e.tgt]?.defId==='autoscaler')));
    const asNode = asEdge ? (nodes[asEdge.src]?.defId==='autoscaler' ? nodes[asEdge.src] : nodes[asEdge.tgt]) : null;
    const selfScale = n.props.autoScale;
    const threshold = asNode?.props.scaleUpThreshold ?? n.props.scaleUpAt    ?? 80;
    const maxRep    = asNode?.props.maxReplicas       ?? n.props.maxReplicas ?? 5;

    if ((asNode || selfScale) && pct > threshold) {
      replicas  = Math.min(maxRep, Math.ceil(inn / (cap * (threshold / 100))));
      scaledCap = cap * replicas;
      pct       = (inn / scaledCap) * 100;
      status    = pct>85?'critical':pct>60?'warning':'ok (scaled)';
      scaling   = true;
    }

    const visualReplicas = Object.values(nodes).filter(r => r.props._replicaOf === n.id).length;
    const dbReplicas = n.props.readReplicas > 0 ? n.props.readReplicas : visualReplicas;
    if (n.defId==='database' && dbReplicas>0) {
      const tc = cap*(1+dbReplicas);
      pct=inn/tc*100; status=pct>85?'critical':pct>60?'warning':`ok (×${dbReplicas+1} nodes)`;
    }
    // ── Error rate: retry amplification increases effective incoming ──────
    const errRate = n.props.errorRate || 0;
    const retries = n.props.retries || 2;
    const retriedIncoming = errRate > 0 ? inn * (1 + retries * errRate / 100) : inn;
    if (errRate > 0 && retriedIncoming > inn) {
      // Re-evaluate load with retry amplification
      const retriedPct = (retriedIncoming / cap) * 100;
      if (retriedPct > pct) {
        pct = retriedPct;
        status = pct > 85 ? 'critical' : pct > 60 ? 'warning' : 'ok';
      }
    }

    // ── Database connection pool exhaustion ────────────────────────────────
    let poolExhausted = false;
    if (n.defId === 'database' && n.props.maxConnections && inn > n.props.maxConnections) {
      poolExhausted = true;
      status = 'pool exhausted';
      pct = Math.min(999, pct); // clip display but keep it red
    }

    // ── Latency model ──────────────────────────────────────────────────────
    const effLatMs = effectiveLatency(n.defId, n.props, pct);
    const p95Ms    = p95Latency(effLatMs);

    // ── Serverless cold start (first tick > 0 incoming) ───────────────────
    const coldStart = n.defId === 'serverless' && inn > 0 && !n._hadTraffic;
    if (inn > 0) n._hadTraffic = true;

    // ── SLA estimate ───────────────────────────────────────────────────────
    const slaBase   = pct > 85 ? 98.0 : pct > 60 ? 99.5 : 99.95;
    const slaAdj    = errRate > 5 ? Math.max(95, slaBase - errRate * 0.3) : slaBase;
    const sla       = slaAdj.toFixed(2) + '%';

    simLoad[n.id] = { incoming:inn, capacity:cap, loadPct:pct, status, scaledCap, replicas, scaling,
                      latencyMs:effLatMs, p95Ms, errorRate:errRate, coldStart, poolExhausted, sla };
  });

  return { simLoad, eFlow: eFlowNew };
}

// ── Short-link helpers (Supabase via env vars) ─────────────────────────────
function getSB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return (url && key) ? { url, key } : null;
}

function getSBConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return (url && anonKey) ? { url, anonKey, serviceKey } : null;
}

async function sbFetch(sb, path, method = 'GET', body, authKey = sb.key) {
  const res = await fetch(`${sb.url}/rest/v1${path}`, {
    method,
    headers: {
      'apikey':        sb.key,
      'Authorization': `Bearer ${authKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

function bearerToken(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : '';
}

async function verifySupabaseUser(sb, token) {
  if (!token) return null;
  const res = await fetch(`${sb.url}/auth/v1/user`, {
    headers: {
      apikey: sb.anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function diagramStats(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload?.edges) ? payload.edges : [];
  return { node_count: nodes.length, edge_count: edges.length };
}

function validDiagramPayload(payload) {
  return payload && typeof payload === 'object' && Array.isArray(payload.nodes) && Array.isArray(payload.edges);
}

async function requireDiagramUser(req, res) {
  const sb = getSBConfig();
  if (!sb) { json(res, 503, { error: 'Supabase not configured' }); return null; }
  const token = bearerToken(req);
  const user = await verifySupabaseUser(sb, token);
  if (!user?.id) { json(res, 401, { error: 'Authentication required' }); return null; }
  return { sb, user, dbKey: sb.serviceKey || token };
}

function genShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ── API route handler ──────────────────────────────────────────────────────
async function handleAPI(pathname, method, req, res) {
  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type,Authorization' });
    res.end(); return true;
  }

  // GET /api/components
  if (pathname === '/api/components' && method === 'GET') {
    const mod = await import(`${__dir}/src/components.js`);
    json(res, 200, { defs: mod.COMPONENT_DEFS||[], categories: mod.CATEGORIES||[] });
    return true;
  }

  // GET /api/rules
  if (pathname === '/api/rules' && method === 'GET') {
    const mod = await import(`${__dir}/src/rules.js`);
    json(res, 200, { rules: mod.ARCH_RULES||{} });
    return true;
  }

  // GET /api/examples
  if (pathname === '/api/examples' && method === 'GET') {
    const mod = await import(`${__dir}/src/examples.js`);
    json(res, 200, { examples: mod.EXAMPLES||[] });
    return true;
  }

  // POST /api/simulate
  if (pathname === '/api/simulate' && method === 'POST') {
    try {
      const { nodes, edges } = await readBody(req);
      if (!nodes || !edges) { json(res, 400, { error: 'nodes and edges required' }); return true; }
      json(res, 200, runSimTick(nodes, edges));
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  // GET /api/shortlink?id=
  if (pathname === '/api/shortlink' && method === 'GET') {
    const id = new URL(req.url, `http://localhost`).searchParams.get('id');
    if (!id || !/^[a-z0-9]{8}$/i.test(id)) { json(res, 400, { error: 'Invalid id' }); return true; }
    const sb = getSB();
    if (!sb) { json(res, 503, { error: 'Supabase not configured' }); return true; }
    const { ok, data } = await sbFetch(sb, `/diagrams?id=eq.${id}&select=payload,title`);
    if (!ok || !data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    json(res, 200, data[0]);
    return true;
  }

  // Private user diagram library. Requires Supabase Auth bearer token.
  if (pathname === '/api/diagrams' && method === 'GET') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const params = new URL(req.url, `http://localhost`).searchParams;
    const limit = Math.max(1, Math.min(100, Number(params.get('limit') || 50)));
    const query = (params.get('query') || '').trim();
    let path = `/user_diagrams?user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,created_at,updated_at&order=updated_at.desc&limit=${limit}`;
    if (query) path += `&title=ilike.*${encodeURIComponent(query)}*`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'GET', null, ctx.dbKey);
    json(res, ok ? 200 : status, ok ? { diagrams: data || [] } : { error: 'Could not list diagrams' });
    return true;
  }

  if (pathname === '/api/diagrams' && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    try {
      const { title, payload, thumbnail_svg } = await readBody(req);
      if (!validDiagramPayload(payload)) { json(res, 400, { error: 'valid payload with nodes and edges required' }); return true; }
      const stats = diagramStats(payload);
      const row = {
        user_id: ctx.user.id,
        title: String(title || payload.title || 'Untitled Architecture').trim() || 'Untitled Architecture',
        payload,
        thumbnail_svg: thumbnail_svg || null,
        ...stats,
      };
      const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/user_diagrams?select=id,title,node_count,edge_count,created_at,updated_at', 'POST', row, ctx.dbKey);
      json(res, ok ? 201 : status, ok ? data?.[0] || {} : { error: 'Could not save diagram' });
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  const diagMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})$/i);
  if (diagMatch && method === 'GET') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = diagMatch[1];
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,payload,node_count,edge_count,created_at,updated_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'GET', null, ctx.dbKey);
    if (!ok) { json(res, status, { error: 'Could not load diagram' }); return true; }
    if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    json(res, 200, data[0]);
    return true;
  }

  if (diagMatch && method === 'PUT') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = diagMatch[1];
    try {
      const body = await readBody(req);
      const patch = { updated_at: new Date().toISOString() };
      if (body.title != null) patch.title = String(body.title).trim() || 'Untitled Architecture';
      if (body.payload != null) {
        if (!validDiagramPayload(body.payload)) { json(res, 400, { error: 'valid payload with nodes and edges required' }); return true; }
        patch.payload = body.payload;
        Object.assign(patch, diagramStats(body.payload));
      }
      const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,created_at,updated_at`;
      const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'PATCH', patch, ctx.dbKey);
      if (!ok) { json(res, status, { error: 'Could not update diagram' }); return true; }
      if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
      json(res, 200, data[0]);
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  if (diagMatch && method === 'DELETE') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = diagMatch[1];
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}`;
    const { ok, status } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'DELETE', null, ctx.dbKey);
    json(res, ok ? 200 : status, ok ? { ok: true } : { error: 'Could not delete diagram' });
    return true;
  }

  // POST /api/shortlink
  if (pathname === '/api/shortlink' && method === 'POST') {
    const sb = getSB();
    if (!sb) { json(res, 503, { error: 'Supabase not configured' }); return true; }
    try {
      const { title, payload } = await readBody(req);
      if (!payload) { json(res, 400, { error: 'payload required' }); return true; }
      const id = genShortId();
      const { ok } = await sbFetch(sb, '/diagrams', 'POST', { id, title: title||'Untitled', payload });
      if (!ok) { json(res, 500, { error: 'Could not save' }); return true; }
      json(res, 201, { id });
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  return false; // not an API route
}

// ── Static file server ─────────────────────────────────────────────────────
createServer(async (req, res) => {
  const url      = new URL(req.url || '/', `http://localhost:${port}`);
  const pathname = url.pathname;
  const method   = (req.method || 'GET').toUpperCase();

  // API routes
  if (pathname.startsWith('/api/')) {
    const handled = await handleAPI(pathname, method, req, res).catch(err => {
      console.error('[API]', err);
      if (!res.headersSent) json(res, 500, { error: 'Internal server error' });
      return true;
    });
    if (handled) return;
  }

  // SPA fallback: /s/* → index.html
  const isShortPath = /^\/s\/[a-z0-9]{8}$/i.test(pathname);
  const requested   = (pathname === '/' || isShortPath) ? '/index.html' : decodeURIComponent(pathname);
  const file        = normalize(join(root, requested));

  if (!file.startsWith(root)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  try {
    statSync(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Archi-Flow running at http://localhost:${port}`);
  console.log(`  API routes: /api/simulate  /api/components  /api/rules  /api/shortlink  /api/diagrams`);
});
