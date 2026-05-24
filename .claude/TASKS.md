# Task Tracker

## Status Legend
- ✅ Done  |  🔄 In Progress  |  ⏳ Pending  |  ❌ Blocked

## To Run
```bash
# Start the dev server:
node server.mjs

# If npm is installed, this also works:
npm start

# Or fallback: python3 -m http.server 3456
# Then open: http://localhost:3456
# Or use .claude/launch.json with Claude Code's preview server
```

---

## Completed Tasks

### Task 1 — Project Setup
**Status:** ✅ Done
**What:** Static HTML + vanilla JS, CDN imports (Tailwind, ES modules). No build step — open index.html.

### Task 2 — .claude Init
**Status:** ✅ Done
**What:** PLAN.md + TASKS.md created with full project context and architecture decisions.

### Task 3 — Component Definitions
**Status:** ✅ Done
**What:** `src/components.js` — 33 architecture components as JSON with typed properties.
**Components:** Users, Device/App, Event Source, Text Note, VM, Pod, App Server, Load Balancer, Database, Cache, Queue, CDN, Auto-Scaler, Task Scheduler, API Gateway, Firewall/WAF, CDC Source DB, Debezium, Kafka Topic, Stream Processor, Stream Window, Hook/Webhook, Data Lake, Data Warehouse, Object Storage, Lake Table Format, Data Catalog, Batch Processor, Query Engine, Orchestrator, Data Quality, App Insights, Log Analytics
**Key detail:** Compute nodes (VM, Pod, AppServer) have `scaleProps` for auto-scaling config. LB has `capacity:50000` default (required or it shows as overloaded).

### Task 4 — Canvas + Sidebar + Drag-Drop
**Status:** ✅ Done
**What:** Left sidebar with search + category filters. Drag component → drop on canvas creates node. Click output port + drag to input port creates edge. 4-directional ports (top/right/bottom/left) chosen via `bestSides()` based on relative node position.

### Task 5 — Simulation Engine
**Status:** ✅ Done
**What:** BFS-based traffic propagation from source nodes. Load% per node. Green (<60%) / Yellow (60–85%) / Red (>85%) color states. Animated dashed edges with per-edge flow labels (req/s). CDN/Cache/Firewall apply pass-through reduction.

### Task 6 — Smart Behaviors
**Status:** ✅ Done
**What:**
- **Auto-scaler:** `replicas = ceil(incoming / (capacity × threshold%))` — scales to bring load BELOW threshold, not just to 100%. Works bidirectionally (edge from autoscaler→node OR node→autoscaler both detected).
- **Load Balancer:** splits traffic evenly across all downstream nodes (`share = passThru / downEdges.length`)
- **Zoom** (scroll wheel), **Pan** (drag canvas), **Fit View** button

### Task 7 — Properties Panel + Examples
**Status:** ✅ Done
**What:**
- Right panel: click node → edit all properties live (number, text, select, boolean inputs)
- Simulation stats panel (incoming req/s, capacity, load %, status, replicas)
- 7 example templates: Simple Web App, Load Balanced, Auto-Scaled, CDN+Cache, Microservices, Mobile Event Streaming, CDC Streaming Platform
- Export JSON button, cost tracker in toolbar

### Task 8 — UI Polish + Edge Fixes
**Status:** ✅ Done
**What:**
- Draw.io-style dark theme (GitHub dark color scheme)
- Edge delete via hover × button on edge midpoint
- Drop component onto existing edge → auto-splits and re-wires
- DB read replicas: setting `readReplicas > 0` spawns real canvas nodes with purple dashed replication edges
- Auto-layout (BFS layering, no overlaps), replica nodes positioned relative to parent DB
- Undo/Redo (snapshot-based history)
- Keyboard shortcuts: Delete (node/edge), Escape (deselect), Ctrl+Z/Y (undo/redo)
- Suggestions panel: dismissible cards, diff-based (no DOM flash on each tick)

### Task 9 — Arrow / Edge Bug Fixes
**Status:** ✅ Done (this session)
**Bugs fixed:**
1. **Coordinate space mismatch** — `bezier()` was called with node-space `dx/dy` but screen-space `x1,y1`. Fixed: now passes `t.x-s.x, t.y-s.y` (screen-space delta from actual port positions).
2. **Wrong curve direction at any zoom** — bezier control points now driven by port side (`r/l/t/b`) not `|dx| vs |dy|`. Each port side maps to a fixed offset direction so curves always exit/enter correctly.
3. **U-shape curves when zoomed in** — control point distance was capped at 220px. Removed cap: `dist = hypot(dx,dy) * 0.4` scales proportionally with screen distance at any zoom level.
4. **Suggestion panel flash every tick** — `buildSuggestions()` was wiping `innerHTML` each simulation tick. Fixed: diff-based approach — only adds/removes cards when the set changes. Existing DOM elements are kept in place.
5. **"Add Read LB" suggestion creates messy topology** — replaced with actionable "Add a Cache layer" suggestion (only when DB is still >85% loaded after replicas are added). Read replica LB is handled internally at the DB/proxy level, not via visible nodes.

### Task 10 — Interactive Wow Pass
**Status:** ✅ Done (this session)
**What:**
- Escaped user-controlled node labels and suggestion text before rendering through `innerHTML`
- Inline label editing: double-click any node label to rename in place
- JSON import: toolbar file picker plus drag/drop `.json` onto the canvas
- Live SVG traffic particles move along active edges during simulation
- Right panel empty state upgraded into a compact architecture health cockpit

### Task 11 — Productization + Shareable Architecture State
**Status:** ✅ Done (this session)
**What:**
- Added `package.json` and `server.mjs`; app now runs as a simple Node app via `npm start`
- Fixed arrow anchoring by reading actual DOM port centers for edge endpoints
- Example dropdown now keeps the loaded example selected until the diagram is modified
- Export/import now includes active example, user slider value, and viewport state
- Share button creates a resumable `#arch=` URL hash and copies the link
- Added `src/rules.js` with architecture connection validation

### Task 12 — Data Engineering + Observability Domain
**Status:** ✅ Done (this session)
**What:**
- Added Data category: CDC Source DB, Debezium Connector, Stream Processor, Data Lake, Data Warehouse, Object Storage, Lake Table Format, Data Catalog, Batch Processor, Query Engine, Data Quality
- Added Ops data orchestration component: Orchestrator
- Added Kafka Topic as a first-class messaging component
- Added Observability category: App Insights, Log Analytics
- Added CDC/event simulation source using `changeRate`, so pipelines animate without a Users node
- Added CDC Streaming Platform example: DB → Debezium → Kafka topics → Flink/Spark → Object Storage → Hudi/Iceberg-style table layer → Catalog/Query/Warehouse plus logs/APM
- Extended connection business rules for data, Kafka, warehouse/lake, and telemetry paths

### Task 13 — Lucid-Style UI Polish
**Status:** ✅ Done (this session)
**What:**
- Restyled toolbar, palette, status bar, node cards, ports, edges, HUD, and property panel for a cleaner product feel
- Added a canvas minimap/overview that renders nodes, edges, and current viewport
- Increased palette width and density so 33 components remain scannable
- Moved canvas controls above the minimap and refined visual hierarchy

### Task 14 — Suggestions Toggle
**Status:** ✅ Done (this session)
**What:**
- Added a toolbar toggle to turn live simulation recommendation cards on/off
- Persisted the preference in `localStorage` under `archviz.suggestions`
- Kept architecture-rule toasts visible even when suggestions are off, so invalid connection feedback still appears
- Changed suggestion cleanup to remove only recommendation cards, not transient toast cards

### Task 15 — Whiteboard + Billion-Scale Event Modeling
**Status:** ✅ Done (this session)
**What:**
- Added Device/App, Event Source, Text Note, Task Scheduler, Hook/Webhook, and Stream Window components
- Added textarea-backed whiteboard notes that render as note cards on the canvas
- Added compact number formatting for huge rates (`1.3B events/s`, `5.2B events/s`) in nodes, HUD, sim stats, and edge labels
- Raised user/event source limits into the billions/trillions where appropriate
- Added Mobile Event Streaming example: Users → Device/App emits 4 events/sec/user → Hook → Kafka → Window → Flink → Object Storage/Table Format
- Extended connection rules for app/device emitters, scheduler/hook triggers, Kafka/windowing, and event-stream paths

### Task 16 — UI/UX Stabilization + Agent Handoff
**Status:** ✅ Done
**What:**
- Added professional SVG icons across components and toolbar controls
- Added accordion palette and close/open sidebar toggle
- Fixed zoom to behave like Lucid/draw.io: nodes keep internal size and scale via CSS transform
- Added click-to-connect ports
- Fixed toolbar/status bar wrapping issues
- Added `run.sh` and `run.bat` launchers
- Updated `HANDOFF.md` and `.claude/PLAN.md` around the 10/10 direction: Lucid-grade editing, presentation-ready sharing, explainable diagnostics, one-click fixes, and formula-based cost modeling

### Task 17 — Testability Baseline
**Status:** ✅ Done
**What:**
- Added `test/smoke.test.mjs`
- Added `npm test`
- Smoke test covers component/rule/example consistency, required app DOM hooks, Lucid-style zoom invariant, and run script presence

**Verification:** `npm test` passes — 6 tests, 0 failures.

---

## Pending Tasks (Next Phases)

### Iteration 1 — Explainable Diagnostics (Next)
| ID | Task | Priority | Test Gate |
|----|------|----------|-----------|
| 1a | Add `diagnoseNode(nodeId)` with status reason, incoming, capacity, upstream contributors, downstream split, and fix hints | Very High | `npm test` + selected-node manual check |
| 1b | Add `diagnoseEdge(edgeId)` for edge flow, target pressure, and hot-path reason | Very High | `npm test` + selected-edge manual check |
| 1c | Render Diagnostics section in the properties panel | Very High | Browser check on red/yellow node |
| 1d | Make suggestion cards consume diagnostics instead of duplicating ad hoc logic | High | Existing examples still show sane hints |

### Iteration 2 — One-Click Fixes
| ID | Task | Priority | Test Gate |
|----|------|----------|-----------|
| 2a | Add suggestion action framework with undo snapshots | Very High | Apply action then undo |
| 2b | Insert Load Balancer before overloaded compute | Very High | Users → App becomes Users → LB → App |
| 2c | Route DB reads through Cache | Very High | App → DB + App → Cache becomes App → Cache → DB |
| 2d | Add compute replicas behind LB | High | New nodes and edges generated safely |
| 2e | Increase capacity to recommended target | High | Capacity changes and cost updates |

### Iteration 3 — Presentation/Access
| ID | Task | Priority | Test Gate |
|----|------|----------|-----------|
| 3a | PNG/SVG export | Very High | Export file opens correctly |
| 3b | Presentation mode / hide editor chrome | High | Clean view for screenshots/demo |
| 3c | Share-link robustness for larger diagrams | High | Import from generated URL |
| 3d | Keyboard shortcut modal | Medium | `?` opens modal |

### Phase 9 — Core UX
| ID | Task | Priority |
|----|------|----------|
| 9a | Multi-select — shift-click + rubber-band drag, group move/delete | High |
| 9b | Node duplication — Ctrl+D | Medium |
| 9c | PNG export — serialize canvas to image for sharing | High |
| 9d | Diagram title — editable in toolbar, saved in JSON export | Low |

### Phase 10 — Power Features
| ID | Task | Priority |
|----|------|----------|
| 10a | 6 new components: Lambda, S3, DNS, Monitoring, Service Mesh, Elasticsearch | High |
| 10b | Failure/chaos mode — "Take Offline" toggle per node, cascade visualization | Very High |
| 10c | Visual group containers — VPC / Region / AZ boundary boxes | High |
| 10d | Edge annotations — latency (ms), protocol labels on edges | Medium |
| 10e | Always-visible port dots — small/subtle, grow on hover | Medium |

### Phase 11 — Advanced Simulation
| ID | Task | Priority |
|----|------|----------|
| 11a | Latency modeling — response time (ms), end-to-end P95 | Very High |
| 11b | Burst spike button — 3× traffic for 3s to expose failure modes | High |
| 11c | Per-node sparklines — load-over-time graph in right panel | Medium |
| 11d | Queue overflow backpressure visualization | Medium |
| 11e | Cost-optimization suggestion cards | Low |

### Phase 12 — Sharing & Polish
| ID | Task | Priority |
|----|------|----------|
| 12a | URL-based state sharing — serialize to gzip URL hash | High |
| 12b | Minimap — small overview, click-to-pan | Medium |
| 12c | Keyboard shortcut modal — press `?` to show | Low |
| 12d | Grid snapping toggle | Low |
| 12e | Simulation propagation upgrade for complex merge-heavy graphs | Medium |

---

## Key Implementation Notes (for future sessions)

### State object (`S` in index.html)
```js
let S = {
  nodes: {},      // id → { id, defId, x, y, w:160, h:88, props }
  edges: [],      // { id, src, tgt, animated, dashed, replication? }
  eFlow: {},      // edgeId → req/s on that edge
  simLoad: {},    // nodeId → { incoming, capacity, loadPct, status, scaledCap?, replicas?, scaling? }
  sel: null,      // selected node id
  selEdge: null,  // selected edge id
  zoom: 1, panX: 40, panY: 40,
  simOn: false, simTick: null,
  suggestionsOn: true, // persisted in localStorage as archviz.suggestions
  hist: [], histPos: -1,
  nSeq: 0, eSeq: 0,
};
```

### Bezier edge formula (FIXED)
```js
function bezier(x1,y1,x2,y2,ss,ts) {
  // ss/ts = port sides: 'r','l','t','b'
  // dist scales with screen-space distance (no cap) — correct at any zoom
  const dist = Math.hypot(x2-x1, y2-y1) * 0.4;
  const sideOff = { r:[dist,0], l:[-dist,0], b:[0,dist], t:[0,-dist] };
  const [o1x,o1y] = sideOff[ss] || [dist,0];
  const [o2x,o2y] = sideOff[ts] || [-dist,0];
  return `M${x1},${y1} C${x1+o1x},${y1+o1y} ${x2+o2x},${y2+o2y} ${x2},${y2}`;
}
```

### Auto-scaler scaling formula (FIXED)
```js
// Scales to bring load BELOW threshold, not just to 100%
const neededReplicas = Math.ceil(inn / (cap * (threshold / 100)));
replicas = Math.min(maxRep, neededReplicas);
scaledCap = cap * replicas;
```

### Read replicas
- Tracked via `n.props._replicaOf = parentDbId` and `n.props._isReplica = true`
- Managed by `syncDbReplicas(dbId, targetCount)` — called whenever `readReplicas` property changes
- Replica nodes excluded from auto-layout; repositioned relative to parent (x+220, y+idx*120)
- Replication edges have `edge.replication = true` and are drawn as purple dashed lines

### Suggestions panel (diff-based)
- `dismissedSugs` is a `Set` of dismissed card keys, cleared on sim restart
- `buildSuggestions()` diffs by `data-key` attribute — never wipes innerHTML during simulation
- `S.suggestionsOn` controls live recommendation cards and persists to `localStorage`
- Rule/validation messages use `.toast-card` and remain visible even when live suggestions are off
- Cards: `crit` (red left border), `warn` (yellow), `info` (blue accent)
