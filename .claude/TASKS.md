# Task Tracker

## Status Legend
- ✅ Done  |  🔄 In Progress  |  ⏳ Pending  |  ❌ Blocked

## To Run
```bash
node server.mjs          # serves from dist/ on port 3456
PORT=3457 node server.mjs # alternate port

# After editing source files:
cp src/app.js dist/src/app.js
cp src/app.css dist/src/app.css
cp index.html dist/index.html
```

---

## Completed Tasks

### Task 1–16 — Foundation (pre-iteration)
**Status:** ✅ Done  
Setup, canvas, drag-drop, simulation engine, bezier edges, properties panel, cost tracker, examples, suggestions, undo/redo, auto-layout, zoom/pan/fit, grid snapping, sidebar, SVG icons, JSON import/export, sharing, whiteboard notes, billion-scale formatting, read replicas, CDC/Kafka/data engineering components, observability components, testability baseline (`npm test`), SVG export, basic PDF export.

---

### Iteration 0 — Testability Baseline
**Status:** ✅ Done  
- `test/smoke.test.mjs` covers component/rule/example consistency, required DOM hooks, zoom invariant, run script presence
- `npm test` passes — 6 tests, 0 failures

---

### Iteration 1 — Explainable Diagnostics
**Status:** ✅ Done  
- Per-node simulation stats panel: incoming traffic, capacity, load%, status
- `latencyMs`, `p95Ms`, `errorRate`, `sla` computed per node in simulation tick
- Properties panel shows sim stats when node selected
- Suggestions panel diff-based (no DOM flash)
- Edge traffic panel: click any edge → shows flow in events/s + % of source output
- `#ss-latency`, `#ss-p95`, `#ss-sla`, `#ss-err` elements populated on node select

---

### Iteration 2 — One-Click Topology Fixes
**Status:** ✅ Done  
- Suggestion cards with action buttons for safe topology mutations
- Each action calls `snapshot()` before mutating state
- Covers: insert LB before compute, route through cache, add replicas, increase capacity

---

### Iteration 3 — New Components
**Status:** ✅ Done  
Added 6 new components to `src/components.js` and `src/rules.js`:
- **Search Engine** (Elasticsearch/OpenSearch) — `searchengine`
- **Email / SMS Gateway** — `emailsms`
- **Background Worker** — `bgworker`
- **GraphQL API** — `graphqlapi`
- **WebSocket Server** — `websocket`
- **Rate Limiter** — `ratelimiter`

Total component count: **39** across Source, Network, Compute, Storage, Data, Messaging, Ops, AI/ML, Observability categories.

---

### Iteration 4 — Edge Traffic Panel + Right-Click Menu + Region Overlay
**Status:** ✅ Done  
- **Edge traffic % panel**: clicking any edge opens `#edge-props` panel showing traffic flow and % of source output. Fixed: `showEdgeProps()` sets `display: flex` (not `''` which falls back to CSS `display:none`).
- **Right-click context menu**: right-clicking a node shows a context menu with: Edit Properties, Duplicate, Delete, and (for DBs) Add Read Replica.
- **Region overlay**: nodes with a `region` property show a colored region badge + background grouping (US East, EU West, AP Southeast, etc.)

---

### Iteration 5 — Reserved Pricing + Cost Breakdown HUD
**Status:** ✅ Done  
- **Reserved Pricing toggle** (`S.reservedPricing`): button in ⋯ more-menu. Applies −35% discount to components in `compute` and `network` categories. Badge shows "Reserved −35%" in cost HUD when active.
- **Cost breakdown HUD**: right panel shows per-category cost breakdown (Storage, Compute, Messaging, Network, Egress) and total. Updates live as nodes are added/removed/edited.
- Toolbar responsive: `btn-reserved` and `btn-service-mesh` moved into more-menu to prevent overflow at small viewports.
- Added responsive CSS breakpoints at 860px and 780px.

---

### Iteration 6 — Professional PDF Export Redesign
**Status:** ✅ Done  
Complete rewrite of `exportPdfReport()` in `src/app.js`.

**Report sections:**
1. Dark cover — grid/glow background, brand logo, diagram title, status chips (Simulation Active, N Critical, $X/mo, Reserved −35%)
2. KPI bar — Components count, Monthly Cost, System Health (N Critical/Warning/Healthy), Avg Latency + Est. SLA
3. Architecture Diagram — embedded SVG snapshot with dark background
4. 2-column: System Health dot indicators + Cost breakdown bar chart by category
5. Bottleneck Analysis — top 5 nodes >60% load with traffic vs capacity, latency/P95, typed recommendation
6. Component Performance Table — Component | Load bar | Traffic In | Capacity | Avg Lat | P95 Lat | Err% | SLA | Cost/mo
7. Footer — total cost, reserved pricing note, brand
8. Print bar — sticky bottom: Close + Save as PDF buttons

**Bugs fixed in this iteration:**
- `sla` stored as `"99.50%"` string → was causing `NaN%` in KPI bar and `%%` in table. Fixed with `parseFloat(sla)` before math and display.
- `avgSLA` averaging now uses `parseFloat(l.sla)` instead of `l.sla` string concatenation.

---

### Iteration 6.1 — Canvas Theme Polish
**Status:** ✅ Done  
- Replaced decorative canvas glow background with a diagramming-tool grid: minor grid every 10px, major grid every 40px, aligned with pan/zoom and snap grid.
- Added persisted Dark/Light theme toggle in the More menu (`archviz.theme` in `localStorage`).
- Updated node/card/panel theme tokens so light mode is readable instead of only changing the canvas.
- Added smoke-test coverage for `#btn-theme` and `setTheme(theme)`.

---

## Pending Tasks

### Next — Multi-Select Canvas Productivity
| ID | Task | Priority |
|----|------|----------|
| A1 | Rubber-band selection (drag empty canvas to select) | High |
| A2 | Shift+click to add to selection | High |
| A3 | Group move (drag any selected node moves all) | High |
| A4 | Group delete (Delete key removes all selected) | High |
| A5 | Ctrl+D duplicate selected nodes + internal edges | Medium |

### Next — Formula-Based Cost Engine
| ID | Task | Priority |
|----|------|----------|
| B1 | Object Storage: storage TB + GET/PUT requests + egress | High |
| B2 | CDN: requests + bandwidth + region multiplier | High |
| B3 | Compute: instance profile × replicas | Medium |
| B4 | DB/Cache: replicas × storage/IOPS | Medium |
| B5 | Cost delta preview on suggestion actions (+$X/mo) | Medium |

### Next — Advanced Simulation
| ID | Task | Priority |
|----|------|----------|
| C1 | Queue backlog/depth — grows when incoming > drain | High |
| C2 | Failure / chaos mode — take node offline, cascade | High |
| C3 | Burst test button — 3x/10x traffic pulse | Medium |
| C4 | Per-node load sparklines in properties panel | Low |

### Next — Presentation & Access
| ID | Task | Priority |
|----|------|----------|
| D1 | PNG export (canvas to image) | High |
| D2 | Presentation mode (hide editor chrome) | Medium |
| D3 | Keyboard shortcut modal (`?` key) | Low |

---

## Key Implementation Notes

### S.nodes is a dict (not array)
```js
S.nodes[id]          // ✅ correct
S.nodes.find(...)    // ❌ wrong — will throw
```

### sla is stored as a string with %
```js
sim.sla              // "99.50%"
parseFloat(sim.sla)  // 99.5  ← use this for math
```

### Edge panel display fix
```js
econt.style.display = 'flex'   // ✅ correct
econt.style.display = ''       // ❌ wrong — CSS default is display:none
```

### dist/ sync (server serves dist/, not root)
```bash
cp src/app.js dist/src/app.js
cp src/app.css dist/src/app.css
cp index.html dist/index.html
```

### Reserved pricing categories
```js
const RESERVED_CATS = ['compute', 'network'];
const RESERVED_DISCOUNT = 0.35;
```

### Bezier edge formula
```js
function bezier(x1,y1,x2,y2,ss,ts) {
  const dist = Math.hypot(x2-x1, y2-y1) * 0.4;
  const sideOff = { r:[dist,0], l:[-dist,0], b:[0,dist], t:[0,-dist] };
  const [o1x,o1y] = sideOff[ss] || [dist,0];
  const [o2x,o2y] = sideOff[ts] || [-dist,0];
  return `M${x1},${y1} C${x1+o1x},${y1+o1y} ${x2+o2x},${y2+o2y} ${x2},${y2}`;
}
```

### Auto-scaler formula
```js
const neededReplicas = Math.ceil(inn / (cap * (threshold / 100)));
replicas = Math.min(maxRep, neededReplicas);
scaledCap = cap * replicas;
```

### Read replicas
- `n.props._replicaOf = parentDbId` and `n.props._isReplica = true`
- Managed by `syncDbReplicas(dbId, targetCount)`
- Excluded from PDF analysis, cost-per-component totals, and suggestion cards

### Simulation output per node (`S.simLoad[nodeId]`)
```js
{
  loadPct: 167,
  incoming: 333,       // events/s
  capacity: 200,
  latencyMs: 250,
  p95Ms: 625,
  errorRate: 0,
  sla: "98.00%",       // string — parseFloat before math
  status: "critical",  // "source" | "healthy" | "warning" | "critical"
  coldStart: false
}
```
