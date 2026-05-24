# ArchViz — Handoff Document

**Date:** 2026-05-24  
**Server:** `http://localhost:3456` (see `.claude/launch.json`)  
**Entry point:** `index.html` — the entire app lives here, no build step needed.

---

## What This Is

A browser-based architecture diagramming + traffic simulation tool, modeled after draw.io / Lucidchart. You drag components onto a canvas, connect them with edges, and run a real-time simulation to see traffic load, auto-scaling, and bottlenecks.

---

## How to Run

```bash
# Option 1 — Node app, no dependencies
node server.mjs

# If npm is installed, this also works:
npm start

# Option 2 — Python fallback
python3 -m http.server 3456

# Option 3 — one-line Node fallback
node -e "const h=require('http'),fs=require('fs'),p=require('path');h.createServer((req,res)=>{let f=p.join('.',req.url==='/'?'index.html':req.url);fs.readFile(f,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':{'html':'text/html','js':'application/javascript'}[f.split('.').pop()]||'text/plain'});res.end(e?'404':d)});}).listen(3456);"

# Then open: http://localhost:3456
```

Or use the Claude Code preview with `.claude/launch.json`.

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Entire app — state, rendering, simulation, all UI |
| `server.mjs` / `package.json` | Node app wrapper, `npm start` runs the static server |
| `src/components.js` | 33 component definitions (JSON schema) |
| `src/rules.js` | Architecture connection rules used when linking nodes |
| `src/examples.js` | 7 example diagram templates |
| `.claude/PLAN.md` | Architecture decisions, feature status, full roadmap |
| `.claude/TASKS.md` | Task log with implementation notes and formulas |
| `.claude/launch.json` | Dev server config for Claude Code preview |

---

## What's Built

| Feature | Status |
|---------|--------|
| Drag-drop canvas with 33 components | ✅ |
| Bezier edges with animated flow labels | ✅ |
| BFS traffic simulation (700ms tick) | ✅ |
| Load Balancer — splits traffic evenly downstream | ✅ |
| Auto-Scaler — scales replicas to stay below threshold | ✅ |
| DB Read Replicas — spawn visual nodes + replication edges | ✅ |
| Properties panel — live edit all node properties | ✅ |
| Simulation stats per node (load %, replicas, status) | ✅ |
| Suggestions panel — diff-based, no flicker, toolbar toggle | ✅ |
| Undo / Redo (snapshot-based) | ✅ |
| Auto-layout (BFS layering, no overlaps) | ✅ |
| Zoom / Pan / Fit View | ✅ |
| Keyboard shortcuts (Del, Esc, Ctrl+Z/Y) | ✅ |
| Edge delete (hover × button) | ✅ |
| Drop component onto edge → auto-splits and re-wires | ✅ |
| 7 example templates | ✅ |
| Export JSON | ✅ |
| Cost tracker in toolbar | ✅ |
| Category filter + search in sidebar | ✅ |
| Inline node label editing | ✅ |
| JSON import via toolbar or drag-drop | ✅ |
| Shareable URL links that resume state | ✅ |
| Live traffic particles on active edges | ✅ |
| Diagram health cockpit in empty right panel | ✅ |
| Data engineering components: CDC Source DB, Debezium, Kafka Topic, Stream Processor, Object Storage, Table Format, Data Catalog, Batch Processor, Query Engine, Data Quality, Data Lake, Warehouse | ✅ |
| Observability components: App Insights, Log Analytics | ✅ |
| CDC/event-source simulation without a fake Users box | ✅ |
| Lucid-style UI polish: cleaner chrome, sleeker node cards, floating HUD, minimap overview | ✅ |
| Whiteboard text notes | ✅ |
| Billion-scale event/user flow labels (`1.3B`, `5.2B events/s`) | ✅ |
| Device/app emitters, event sources, hooks, schedulers, stream windows | ✅ |

---

## Bugs Fixed in Last Session

### 1. Arrows in wrong positions
**Root cause:** `bezier()` was receiving node-space `dx/dy` but screen-space port coordinates — so control points were calculated in mixed coordinate spaces, producing incorrect curves at any zoom or pan offset.

**Fix:** Pass port sides (`'r'/'l'/'t'/'b'`) instead of dx/dy. Control points now always exit/enter in the port's own direction.

```js
// BEFORE (broken)
const dx = tn.x - sn.x, dy = tn.y - sn.y;          // node-space
bezier(s.x, s.y, t.x, t.y, dx, dy)                   // mixed spaces ❌

// AFTER (fixed)
bezier(s.x, s.y, t.x, t.y, ss, ts)                   // port sides ✅
```

### 2. U-shape curves when zoomed in
**Root cause:** Control point distance was hard-capped at 220px. When zoomed in, nodes are far apart in screen pixels, making 220px proportionally tiny — curves pinched into U-shapes.

**Fix:** Removed the cap. Distance now scales with actual screen-space distance:
```js
const dist = Math.hypot(x2-x1, y2-y1) * 0.4;  // no cap — correct at any zoom
```

### 3. Suggestion cards flashing every 700ms
**Root cause:** `buildSuggestions()` was wiping `panel.innerHTML = ''` on every simulation tick, destroying and re-creating all DOM elements.

**Fix:** Diff-based approach — keeps existing cards in place, only adds/removes when the set of active suggestions changes. Cards are keyed by `data-key` attribute.

### 4. "Add Read Load Balancer" suggestion created messy topology
**Root cause:** Suggesting a visible LB node in front of read replicas created `DB→LB→Replica` edges everywhere, which is architecturally misleading (real-world read balancing is handled by DB proxies/connection pools, not visible topology nodes).

**Fix:** Removed that suggestion. If DB is still overloaded after replicas are added (>85% load), suggest adding a Cache layer instead.

---

## Key Technical Details

### State Object
```js
let S = {
  nodes: {},      // id → { id, defId, x, y, w:160, h:88, props }
  edges: [],      // { id, src, tgt, animated, dashed, replication? }
  eFlow: {},      // edgeId → req/s flowing on that edge
  simLoad: {},    // nodeId → { incoming, capacity, loadPct, status, scaledCap?, replicas?, scaling? }
  sel: null,      // selected node id
  selEdge: null,  // selected edge id
  zoom: 1, panX: 40, panY: 40,
  simOn: false, simTick: null,
  suggestionsOn: true,       // persisted as localStorage archviz.suggestions
  hist: [], histPos: -1,   // undo/redo snapshots
  nSeq: 0, eSeq: 0,        // id counters
};
```

### Suggestions Toggle
- Toolbar button `#btn-suggestions` turns live recommendation cards on/off.
- Preference is persisted in `localStorage` as `archviz.suggestions`.
- Architecture-rule toasts are marked `.toast-card` and still appear when live suggestions are disabled.

### Auto-Scaler Formula
```js
// Scales to bring load BELOW the threshold, not just to 100%
const neededReplicas = Math.ceil(incoming / (capacity * (threshold / 100)));
replicas  = Math.min(maxReplicas, neededReplicas);
scaledCap = capacity * replicas;
loadPct   = (incoming / scaledCap) * 100;
```

### Read Replica Tracking
- `n.props._replicaOf = parentDbId` — marks a node as a replica
- `n.props._isReplica = true` — excludes from auto-layout, suggestions, simulation source
- `syncDbReplicas(dbId, targetCount)` — call this whenever `readReplicas` property changes
- Replica edges: `edge.replication = true`, drawn as purple dashed lines

### Share / Import / Export
- `architecturePayload()` exports nodes, edges, active example, view state, and user slider value.
- `Share` writes dependency-free base64url JSON into `#arch=...` and copies the full link.
- Opening a URL with `#arch=` imports that architecture and resumes from the same point.

### Connection Rules
- Rules live in `src/rules.js`.
- `addEdge()` validates source/target component types before creating a connection.
- Invalid links show an architecture-rule suggestion instead of drawing misleading topology.

### Bezier Edge (correct formula)
```js
function bezier(x1, y1, x2, y2, ss, ts) {
  // ss/ts = source/target port side: 'r','l','t','b'
  const dist = Math.hypot(x2-x1, y2-y1) * 0.4;  // scales with zoom, no cap
  const sideOff = { r:[dist,0], l:[-dist,0], b:[0,dist], t:[0,-dist] };
  const [o1x,o1y] = sideOff[ss] || [dist,0];
  const [o2x,o2y] = sideOff[ts] || [-dist,0];
  return `M${x1},${y1} C${x1+o1x},${y1+o1y} ${x2+o2x},${y2+o2y} ${x2},${y2}`;
}
```

---

## What's Next (Priority Order)

### Phase 9 — Core UX (start here)
1. **Multi-select** — shift-click or rubber-band drag to select/move/delete multiple nodes
2. **Node duplication** — Ctrl+D
3. **PNG export** — serialize canvas to image for sharing with non-technical stakeholders
4. **Connection rule UI** — show allowed target hints while dragging from a port

### Phase 10 — Power Features
5. **Failure / chaos mode** — "Take Offline" toggle per node, traffic cascades visually ← _highest wow factor_
6. **6 new components** — Lambda, S3/Object Storage, DNS, Monitoring, Service Mesh, Elasticsearch
7. **Visual group containers** — VPC / Region / AZ boundary boxes that nodes sit inside
8. **Edge annotations** — click an edge to add latency (ms) or protocol label

### Phase 11 — Advanced Simulation
9. **Latency modeling** — response time in ms, end-to-end P95
10. **Burst spike button** — 3× traffic for 3 seconds to expose failure modes
11. **Per-node sparklines** — load-over-time graph in the right panel

### Phase 12 — Sharing & Polish
12. **Minimap** — small overview bottom-right, click to pan
13. **Keyboard shortcut modal** — press `?` to show all shortcuts

---

## Known Gaps Not Yet Addressed
- Node labels truncate past ~14 chars at default 160px node width
- Ports only appear on hover — new users don't discover how to connect nodes
- No diagram title (always shows "ArchViz" in the tab/toolbar)
- No grid snapping
- Simulation propagation is still single-pass BFS; complex graphs with late merge paths can under-propagate downstream load

---

## Components Available (src/components.js)

| Component | Category | Key Properties |
|-----------|----------|----------------|
| Users | Source | userCount, requestsPerUser |
| Device / App | Source | platform, eventsPerInput, batchingMs, offlineBuffer |
| Event Source | Source | eventRate, eventType, payloadKB |
| Text Note | Notes | label, text, tone |
| Virtual Machine | Compute | capacity, cpu, memory, autoScale |
| Pod / Container | Compute | capacity, image, cpuRequest, autoScale |
| App Server | Compute | capacity, runtime, workers, autoScale |
| Load Balancer | Network | capacity, algorithm, stickySession |
| Database | Storage | capacity, type, readReplicas, replication |
| Cache | Storage | capacity, type, hitRate, ttl |
| Message Queue | Messaging | capacity, type, consumers, maxMessages |
| CDN | Network | capacity, provider, cacheHitRate |
| Auto Scaler | Ops | scaleUpThreshold, scaleDownThreshold, maxReplicas |
| Task Scheduler | Ops | scheduleMode, frequency, timezone, maxConcurrency |
| API Gateway | Network | capacity, type, rateLimit, authType |
| Firewall / WAF | Security | capacity, type, blockRate |
| CDC Source DB | Data | engine, tables, changeRate, retentionHours |
| Debezium Connector | Data | connectorType, tasks, snapshotMode, heartbeatSeconds |
| Kafka Topic | Messaging | partitions, replicationFactor, retentionDays, cleanupPolicy |
| Stream Processor | Data | engine, parallelism, checkpointSeconds, stateBackend |
| Stream Window | Data | windowType, windowSize, slideEvery, allowedLateness |
| Hook / Webhook | Ops | trigger, delivery, retries, timeoutMs |
| Data Lake | Data | format, tableFormat, storageTB |
| Data Warehouse | Data | platform, computeSize, concurrency |
| Object Storage | Data | provider, storageTB, durability, versioning |
| Lake Table Format | Data | format, compaction, snapshotRetentionDays |
| Data Catalog | Data | catalog, schemas, lineage |
| Batch Processor | Data | engine, workers, schedule |
| Query Engine | Data | engine, concurrency, cacheEnabled |
| Orchestrator | Ops | tool, dags, retryPolicy |
| Data Quality | Data | tool, checks, failurePolicy |
| App Insights | Observability | provider, samplingRate, retentionDays, alertRules |
| Log Analytics | Observability | platform, ingestGBDay, retentionDays |
