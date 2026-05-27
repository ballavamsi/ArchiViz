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

function genPublicSlug(title = 'flow') {
  const base = String(title || 'flow')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34) || 'flow';
  return `${base}-${genShortId()}`;
}

async function createFlowVersion(ctx, flowId, title, payload) {
  if (!validDiagramPayload(payload)) return;
  const stats = diagramStats(payload);
  const versionPath = `/flow_versions?flow_id=eq.${encodeURIComponent(flowId)}&select=version_number&order=version_number.desc&limit=1`;
  const latest = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, versionPath, 'GET', null, ctx.dbKey);
  const version_number = ((latest.data?.[0]?.version_number || 0) + 1);
  await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/flow_versions', 'POST', {
    flow_id: flowId,
    user_id: ctx.user.id,
    version_number,
    title: title || payload.title || 'Untitled Architecture',
    payload,
    ...stats,
  }, ctx.dbKey);

  const oldPath = `/flow_versions?flow_id=eq.${encodeURIComponent(flowId)}&select=id&order=version_number.desc&offset=50`;
  const old = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, oldPath, 'GET', null, ctx.dbKey);
  const oldIds = (old.data || []).map(v => v.id).filter(Boolean);
  if (oldIds.length) {
    await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_versions?id=in.(${oldIds.join(',')})`, 'DELETE', null, ctx.dbKey);
  }
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
    let path = `/user_diagrams?user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,is_public,public_slug,published_at,last_opened_at,created_at,updated_at&order=updated_at.desc&limit=${limit}`;
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
      const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/user_diagrams?select=id,title,node_count,edge_count,is_public,public_slug,published_at,last_opened_at,created_at,updated_at', 'POST', row, ctx.dbKey);
      if (ok && data?.[0]?.id) await createFlowVersion(ctx, data[0].id, row.title, payload);
      json(res, ok ? 201 : status, ok ? data?.[0] || {} : { error: 'Could not save diagram' });
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  const publishMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/publish$/i);
  if (publishMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = publishMatch[1];
    const flowPath = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,public_slug`;
    const flow = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, flowPath, 'GET', null, ctx.dbKey);
    if (!flow.ok) { json(res, flow.status, { error: 'Could not publish flow' }); return true; }
    if (!flow.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const slug = flow.data[0].public_slug || genPublicSlug(flow.data[0].title);
    const patch = { is_public: true, public_slug: slug, published_at: new Date().toISOString(), published_by: ctx.user.id, updated_at: new Date().toISOString() };
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,is_public,public_slug,published_at,updated_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'PATCH', patch, ctx.dbKey);
    if (!ok || !data?.[0]) { json(res, status || 500, { error: 'Could not publish flow' }); return true; }
    json(res, 200, { ...data[0], public_url: `/view/${data[0].public_slug}` });
    return true;
  }

  const unpublishMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/unpublish$/i);
  if (unpublishMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = unpublishMatch[1];
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,is_public,public_slug,published_at,updated_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'PATCH', { is_public: false, published_at: null, published_by: null, updated_at: new Date().toISOString() }, ctx.dbKey);
    if (!ok || !data?.[0]) { json(res, status || 500, { error: 'Could not unpublish flow' }); return true; }
    json(res, 200, data[0]);
    return true;
  }

  const versionListMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/versions$/i);
  if (versionListMatch && method === 'GET') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = versionListMatch[1];
    const own = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id`, 'GET', null, ctx.dbKey);
    if (!own.ok) { json(res, own.status, { error: 'Could not load versions' }); return true; }
    if (!own.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const versions = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_versions?flow_id=eq.${encodeURIComponent(id)}&select=id,version_number,title,node_count,edge_count,created_at&order=version_number.desc&limit=50`, 'GET', null, ctx.dbKey);
    json(res, versions.ok ? 200 : versions.status, versions.ok ? { versions: versions.data || [] } : { error: 'Could not load versions' });
    return true;
  }

  const versionGetMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/versions\/([0-9a-f-]{36})$/i);
  if (versionGetMatch && method === 'GET') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const [_, id, versionId] = versionGetMatch;
    const path = `/flow_versions?id=eq.${encodeURIComponent(versionId)}&flow_id=eq.${encodeURIComponent(id)}&select=id,version_number,title,payload,node_count,edge_count,created_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'GET', null, ctx.dbKey);
    if (!ok) { json(res, status, { error: 'Could not load version' }); return true; }
    if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    json(res, 200, data[0]);
    return true;
  }

  const restoreMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/restore\/([0-9a-f-]{36})$/i);
  if (restoreMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const [_, id, versionId] = restoreMatch;
    const version = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_versions?id=eq.${encodeURIComponent(versionId)}&flow_id=eq.${encodeURIComponent(id)}&select=title,payload`, 'GET', null, ctx.dbKey);
    if (!version.ok) { json(res, version.status, { error: 'Could not restore version' }); return true; }
    if (!version.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const payload = version.data[0].payload;
    const title = version.data[0].title || payload.title || 'Untitled Architecture';
    const patch = { title, payload, updated_at: new Date().toISOString(), ...diagramStats(payload) };
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,payload,node_count,edge_count,is_public,public_slug,published_at,updated_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'PATCH', patch, ctx.dbKey);
    if (!ok || !data?.[0]) { json(res, status || 500, { error: 'Could not restore version' }); return true; }
    await createFlowVersion(ctx, id, title, payload);
    json(res, 200, data[0]);
    return true;
  }

  const duplicateMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})\/duplicate$/i);
  if (duplicateMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = duplicateMatch[1];
    const src = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=title,payload`, 'GET', null, ctx.dbKey);
    if (!src.ok) { json(res, src.status, { error: 'Could not duplicate flow' }); return true; }
    if (!src.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const title = `Copy of ${src.data[0].title || 'Untitled Architecture'}`;
    const payload = { ...src.data[0].payload, title };
    const row = { user_id: ctx.user.id, title, payload, ...diagramStats(payload) };
    const created = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/user_diagrams?select=id,title,node_count,edge_count,is_public,public_slug,published_at,last_opened_at,created_at,updated_at', 'POST', row, ctx.dbKey);
    if (created.ok && created.data?.[0]?.id) await createFlowVersion(ctx, created.data[0].id, title, payload);
    json(res, created.ok ? 201 : created.status, created.ok ? created.data?.[0] || {} : { error: 'Could not duplicate flow' });
    return true;
  }

  const publicFlowMatch = pathname.match(/^\/api\/public\/flows\/([a-z0-9-]{8,80})$/i);
  if (publicFlowMatch && method === 'GET') {
    const sb = getSB();
    if (!sb) { json(res, 503, { error: 'Supabase not configured' }); return true; }
    const slug = publicFlowMatch[1];
    const path = `/user_diagrams?public_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id,title,payload,node_count,edge_count,updated_at,published_at,public_slug`;
    const { ok, status, data } = await sbFetch(sb, path);
    if (!ok) { json(res, status, { error: 'Could not load public flow' }); return true; }
    if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const row = data[0];
    json(res, 200, { title: row.title, payload: row.payload, node_count: row.node_count, edge_count: row.edge_count, updated_at: row.updated_at, published_at: row.published_at, public_slug: row.public_slug });
    return true;
  }

  const publicDuplicateMatch = pathname.match(/^\/api\/public\/flows\/([a-z0-9-]{8,80})\/duplicate$/i);
  if (publicDuplicateMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const slug = publicDuplicateMatch[1];
    const src = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?public_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=title,payload`, 'GET', null, ctx.dbKey);
    if (!src.ok) { json(res, src.status, { error: 'Could not duplicate public flow' }); return true; }
    if (!src.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const title = `Copy of ${src.data[0].title || 'Public Flow'}`;
    const payload = { ...src.data[0].payload, title };
    const row = { user_id: ctx.user.id, title, payload, ...diagramStats(payload) };
    const created = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/user_diagrams?select=id,title,node_count,edge_count,created_at,updated_at', 'POST', row, ctx.dbKey);
    if (created.ok && created.data?.[0]?.id) await createFlowVersion(ctx, created.data[0].id, title, payload);
    json(res, created.ok ? 201 : created.status, created.ok ? created.data?.[0] || {} : { error: 'Could not duplicate public flow' });
    return true;
  }

  const publicCommentsMatch = pathname.match(/^\/api\/public\/flows\/([a-z0-9-]{8,80})\/comments$/i);
  if (publicCommentsMatch && method === 'GET') {
    const sb = getSB();
    if (!sb) { json(res, 503, { error: 'Supabase not configured' }); return true; }
    const slug = publicCommentsMatch[1];
    const comments = await sbFetch(sb, `/flow_comments?public_slug=eq.${encodeURIComponent(slug)}&resolved=eq.false&select=id,target_type,target_id,author_name,body,resolved,created_at,updated_at&order=created_at.asc`);
    json(res, comments.ok ? 200 : comments.status, comments.ok ? { comments: comments.data || [] } : { error: 'Could not load comments' });
    return true;
  }

  if (publicCommentsMatch && method === 'POST') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    try {
      const slug = publicCommentsMatch[1];
      const body = await readBody(req);
      const flow = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?public_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&select=id`, 'GET', null, ctx.dbKey);
      if (!flow.ok || !flow.data?.[0]) { json(res, 404, { error: 'Public flow not found' }); return true; }
      const row = {
        flow_id: flow.data[0].id,
        public_slug: slug,
        user_id: ctx.user.id,
        author_name: ctx.user.user_metadata?.full_name || ctx.user.email || 'Reviewer',
        target_type: ['flow','node','edge'].includes(body.target_type) ? body.target_type : 'flow',
        target_id: body.target_id || null,
        body: String(body.body || '').trim(),
      };
      if (!row.body) { json(res, 400, { error: 'Comment body required' }); return true; }
      const created = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, '/flow_comments?select=id,target_type,target_id,author_name,body,resolved,created_at,updated_at', 'POST', row, ctx.dbKey);
      json(res, created.ok ? 201 : created.status, created.ok ? created.data?.[0] || {} : { error: 'Could not add comment' });
    } catch (err) {
      json(res, err.message === 'Bad JSON' ? 400 : 500, { error: err.message });
    }
    return true;
  }

  const commentMatch = pathname.match(/^\/api\/comments\/([0-9a-f-]{36})$/i);
  if (commentMatch && (method === 'PATCH' || method === 'DELETE')) {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = commentMatch[1];
    const owned = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_comments?id=eq.${encodeURIComponent(id)}&select=id,flow_id`, 'GET', null, ctx.dbKey);
    if (!owned.ok || !owned.data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    const flow = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?id=eq.${encodeURIComponent(owned.data[0].flow_id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id`, 'GET', null, ctx.dbKey);
    if (!flow.ok || !flow.data?.[0]) { json(res, 403, { error: 'Only the flow owner can change comments' }); return true; }
    if (method === 'DELETE') {
      const deleted = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_comments?id=eq.${encodeURIComponent(id)}`, 'DELETE', null, ctx.dbKey);
      json(res, deleted.ok ? 200 : deleted.status, deleted.ok ? { ok: true } : { error: 'Could not delete comment' });
    } else {
      const patch = await readBody(req).catch(() => ({}));
      const updated = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/flow_comments?id=eq.${encodeURIComponent(id)}&select=id,target_type,target_id,author_name,body,resolved,created_at,updated_at`, 'PATCH', { resolved: !!patch.resolved, updated_at: new Date().toISOString() }, ctx.dbKey);
      json(res, updated.ok ? 200 : updated.status, updated.ok ? updated.data?.[0] || {} : { error: 'Could not update comment' });
    }
    return true;
  }

  const diagMatch = pathname.match(/^\/api\/diagrams\/([0-9a-f-]{36})$/i);
  if (diagMatch && method === 'GET') {
    const ctx = await requireDiagramUser(req, res); if (!ctx) return true;
    const id = diagMatch[1];
    const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,payload,node_count,edge_count,is_public,public_slug,published_at,last_opened_at,created_at,updated_at`;
    const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'GET', null, ctx.dbKey);
    if (!ok) { json(res, status, { error: 'Could not load diagram' }); return true; }
    if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
    await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}`, 'PATCH', { last_opened_at: new Date().toISOString() }, ctx.dbKey);
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
      const path = `/user_diagrams?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ctx.user.id)}&select=id,title,node_count,edge_count,is_public,public_slug,published_at,last_opened_at,created_at,updated_at`;
      const { ok, status, data } = await sbFetch({ url: ctx.sb.url, key: ctx.sb.anonKey }, path, 'PATCH', patch, ctx.dbKey);
      if (!ok) { json(res, status, { error: 'Could not update diagram' }); return true; }
      if (!data?.[0]) { json(res, 404, { error: 'Not found' }); return true; }
      if (body.payload != null) await createFlowVersion(ctx, id, data[0].title || patch.title, body.payload);
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

  // SPA fallback: /s/* legacy snapshots and /view/* public read-only flows.
  const isShortPath = /^\/s\/[a-z0-9]{8}$/i.test(pathname);
  const isPublicViewPath = /^\/view\/[a-z0-9-]{8,80}$/i.test(pathname);
  const requested   = (pathname === '/' || isShortPath || isPublicViewPath) ? '/index.html' : decodeURIComponent(pathname);
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
  console.log(`  API routes: /api/simulate  /api/components  /api/rules  /api/shortlink  /api/diagrams  /api/public/flows`);
});
