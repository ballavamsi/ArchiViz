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
        const share = fwd / down.length;
        down.forEach(e => { eFlowNew[e.id] = share; incoming[e.tgt] = (incoming[e.tgt] || 0) + share; });
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
    simLoad[n.id] = { incoming:inn, capacity:cap, loadPct:pct, status, scaledCap, replicas, scaling };
  });

  return { simLoad, eFlow: eFlowNew };
}

// ── Short-link helpers (Supabase via env vars) ─────────────────────────────
function getSB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return (url && key) ? { url, key } : null;
}

async function sbFetch(sb, path, method = 'GET', body) {
  const res = await fetch(`${sb.url}/rest/v1${path}`, {
    method,
    headers: {
      'apikey':        sb.key,
      'Authorization': `Bearer ${sb.key}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
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
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' });
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
  console.log(`  API routes: /api/simulate  /api/components  /api/rules  /api/shortlink`);
});
