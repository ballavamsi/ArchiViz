/**
 * Netlify Function: POST /api/simulate
 * Runs the architecture simulation tick server-side.
 *
 * Request body: { nodes: Record<id, Node>, edges: Edge[] }
 *   Node: { id, defId, props: { label, capacity?, userCount?, requestsPerUser?,
 *            autoScale?, scaleUpAt?, maxReplicas?, readReplicas?, hitRate?,
 *            cacheHitRate?, blockRate?, eventsPerInput?, changeRate?, eventRate?,
 *            maxConnections?, _replicaOf?, _isReplica? } }
 *   Edge: { id, src, tgt, dashed? }
 *
 * Response body: { simLoad: Record<id, SimLoad>, eFlow: Record<edgeId, number> }
 *   SimLoad: { incoming, capacity, loadPct, status, scaledCap?, replicas?, scaling? }
 */

const SOURCE_DEFS = new Set(['users', 'cdcsource', 'eventsource']);

function sourceRate(n) {
  if (n.defId === 'cdcsource')  return n.props.changeRate || n.props.capacity || 100;
  if (n.defId === 'eventsource') return n.props.eventRate  || 100;
  return (n.props.userCount || 100) * (n.props.requestsPerUser || 1);
}

function runSimTick(nodes, edges) {
  const incoming  = {};
  const eFlowNew  = {};
  const simLoad   = {};

  Object.keys(nodes).forEach(id => { incoming[id] = 0; });

  // ── Seed sources ──────────────────────────────────────────────────────────
  Object.values(nodes).forEach(n => {
    if (!SOURCE_DEFS.has(n.defId)) return;
    incoming[n.id] = sourceRate(n);
  });

  // ── Multi-pass propagation ────────────────────────────────────────────────
  const MAX_PASSES = 8;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const prevFlow = { ...eFlowNew };

    // Topological order (BFS from sources / zero-in-degree nodes)
    const order  = [];
    const inDeg  = {};
    Object.keys(nodes).forEach(id => { inDeg[id] = 0; });
    edges.forEach(e => {
      if (!e.dashed && nodes[e.src] && nodes[e.tgt]) inDeg[e.tgt]++;
    });

    const q    = Object.keys(nodes).filter(id => inDeg[id] === 0 || SOURCE_DEFS.has(nodes[id]?.defId));
    const seen = new Set(q);
    let head   = [...q];

    while (head.length) {
      const nxt = [];
      head.forEach(id => {
        order.push(id);
        edges
          .filter(e => e.src === id && !e.dashed && nodes[e.tgt])
          .forEach(e => {
            if (!seen.has(e.tgt)) { seen.add(e.tgt); nxt.push(e.tgt); }
          });
      });
      head = nxt;
    }
    Object.keys(nodes).forEach(id => { if (!seen.has(id)) order.push(id); });

    // Reset non-source incoming for this pass
    Object.keys(nodes).forEach(id => {
      if (!SOURCE_DEFS.has(nodes[id]?.defId)) incoming[id] = 0;
    });

    order.forEach(cur => {
      const n = nodes[cur]; if (!n) return;
      const inn = incoming[cur] || 0;
      let fwd   = inn;

      if      (n.defId === 'cdn')       fwd = inn * (1 - (n.props.cacheHitRate || 85) / 100);
      else if (n.defId === 'cache')     fwd = inn * (1 - (n.props.hitRate      || 80) / 100);
      else if (n.defId === 'firewall')  fwd = inn * (1 - (n.props.blockRate    ||  5) / 100);
      else if (n.defId === 'deviceapp') fwd = inn * (n.props.eventsPerInput    ||  1);

      const down = edges.filter(e => e.src === cur && !e.dashed && nodes[e.tgt]);
      if (down.length && fwd > 0) {
        const share = fwd / down.length;
        down.forEach(edge => {
          eFlowNew[edge.id]    = share;
          incoming[edge.tgt]   = (incoming[edge.tgt] || 0) + share;
        });
      }
    });

    const changed = Object.keys(eFlowNew).some(
      k => Math.abs((eFlowNew[k] || 0) - (prevFlow[k] || 0)) > 0.5
    );
    if (!changed) break;
  }

  // ── Load per node ─────────────────────────────────────────────────────────
  Object.values(nodes).forEach(n => {
    // Sources
    if (SOURCE_DEFS.has(n.defId)) {
      const rps = sourceRate(n);
      simLoad[n.id] = { incoming: rps, capacity: '∞', loadPct: 0, status: 'source' };
      return;
    }

    // Autoscaler watcher node
    if (n.defId === 'autoscaler') {
      const watched = edges
        .filter(e => e.src === n.id && e.dashed)
        .map(e => simLoad[e.tgt]?.loadPct || 0);
      const mx = watched.length ? Math.max(...watched) : 0;
      simLoad[n.id] = {
        incoming: 0, capacity: '—', loadPct: mx,
        status: mx > (n.props.scaleUpThreshold || 80) ? 'scaling ↑' : 'watching',
      };
      return;
    }

    const inn = incoming[n.id] || 0;
    const cap = n.props.capacity || n.props.maxConnections || 10000;
    let pct    = (inn / cap) * 100;
    let status = pct > 85 ? 'critical' : pct > 60 ? 'warning' : 'ok';
    let scaledCap = null, replicas = null, scaling = false;

    // AutoScaler node attached via dashed edge (either direction)
    const asEdge = edges.find(e => e.dashed && (
      (e.tgt === n.id && nodes[e.src]?.defId === 'autoscaler') ||
      (e.src === n.id && nodes[e.tgt]?.defId === 'autoscaler')
    ));
    const asNode = asEdge
      ? (nodes[asEdge.src]?.defId === 'autoscaler' ? nodes[asEdge.src] : nodes[asEdge.tgt])
      : null;

    const selfScale = n.props.autoScale;
    const threshold = asNode?.props.scaleUpThreshold ?? n.props.scaleUpAt    ?? 80;
    const maxRep    = asNode?.props.maxReplicas       ?? n.props.maxReplicas ?? 5;

    if ((asNode || selfScale) && pct > threshold) {
      const neededReplicas = Math.ceil(inn / (cap * (threshold / 100)));
      replicas  = Math.min(maxRep, neededReplicas);
      scaledCap = cap * replicas;
      pct       = (inn / scaledCap) * 100;
      status    = pct > 85 ? 'critical' : pct > 60 ? 'warning' : 'ok (scaled)';
      scaling   = true;
    }

    // Database read replicas
    const visualReplicas = Object.values(nodes).filter(r => r.props._replicaOf === n.id).length;
    const dbReplicas     = n.props.readReplicas > 0 ? n.props.readReplicas : visualReplicas;
    if (n.defId === 'database' && dbReplicas > 0) {
      const totalCap = cap * (1 + dbReplicas);
      pct    = (inn / totalCap) * 100;
      status = pct > 85 ? 'critical' : pct > 60 ? 'warning' : `ok (×${dbReplicas + 1} nodes)`;
    }

    simLoad[n.id] = { incoming: inn, capacity: cap, loadPct: pct, status, scaledCap, replicas, scaling };
  });

  return { simLoad, eFlow: eFlowNew };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { nodes, edges } = body;
  if (!nodes || !edges) {
    return new Response(JSON.stringify({ error: 'nodes and edges are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = runSimTick(nodes, edges);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[/api/simulate]', err);
    return new Response(JSON.stringify({ error: 'Simulation failed', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/simulate' };
