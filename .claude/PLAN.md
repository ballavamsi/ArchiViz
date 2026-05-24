# Archi-Flow — Architecture Simulator

## Goal
Interactive drag-and-drop architecture visualization with real-time traffic simulation.
Modeled after draw.io / Lucidchart — professional, fast, zero-install, runs in the browser.

## Product North Star
Make Archi-Flow feel like a **Lucid/draw.io-grade architecture workspace** that anyone can open, present, and understand:

1. **Easy access:** one command locally, shareable URL state, and eventually hosted/static deploy.
2. **Presentation-ready:** clean chrome, image export, readable diagrams, and no visual glitches during zoom/pan.
3. **Architecture-aware:** the app explains bottlenecks and bad topology, not just colors them red.
4. **Actionable:** suggestions should become one-click fixes with cost impact.
5. **Trustworthy:** every iteration must have a runnable test or verification checklist.

## Tech Stack
- **Pure HTML + vanilla JS** (no build step) — open index.html via static HTTP server
- No frameworks — direct DOM for nodes/edges, SVG for edges/arrows
- **Tailwind** via CDN for utility classes
- Node.js static server app (`node server.mjs`; `npm start` when npm is installed) on port 3456

## Architecture Decisions
1. No build tool — zero friction, edit and refresh
2. All component definitions in `src/components.js` as JSON-serializable objects
3. Simulation runs on a user-selectable tick loop (Slow/Normal/Fast) with multi-pass propagation from source nodes
4. Color thresholds: green (<60%), yellow (60–85%), red (>85%)
5. Bezier edges: control points scale with screen-space distance, port-side-aware
6. Auto-scaler: `replicas = ceil(incoming / (capacity × threshold%))` — scales below threshold
7. Load balancer: splits traffic equally to all downstream nodes
8. Read replicas: spawn real canvas nodes with purple replication edges
9. Edge endpoints anchor to actual DOM port centers, not guessed model dimensions
10. Share links encode the architecture state in `#arch=...` URL hash

---

## Current Feature Status

| Feature | Status | Notes |
|---|---|---|
| Drag-drop canvas | ✅ Done | |
| Bezier edges, animated flow | ✅ Done | Port-side-aware, zoom-scaling fixed |
| BFS traffic simulation | ✅ Done | Multi-pass propagation, speed selector |
| Load balancer splitting | ✅ Done | |
| Auto-scaler (node property + standalone) | ✅ Done | |
| DB read replicas (visual spawn) | ✅ Done | |
| Properties panel | ✅ Done | |
| Suggestions panel (diff-based, no flash) | ✅ Done | Toolbar toggle persists preference |
| Undo / Redo | ✅ Done | Snapshot-based |
| Auto-layout (BFS layering) | ✅ Done | |
| Zoom / Pan / Fit | ✅ Done | Lucid-style transform scaling; node layout does not reflow on zoom |
| Keyboard shortcuts (Del, Esc, Ctrl+Z/Y) | ✅ Done | |
| Edge delete (hover × button) | ✅ Done | |
| Drop-onto-edge to insert | ✅ Done | |
| 7 example templates | ✅ Done | Includes Mobile Event Streaming and CDC Streaming Platform |
| Export JSON | ✅ Done | |
| Cost tracker | ✅ Done | |
| Accordion component sidebar + search | ✅ Done | Collapsible categories, close/open sidebar toggle |
| Inline label editing | ✅ Done | Double-click node label |
| JSON import | ✅ Done | Toolbar file picker or drag .json onto canvas |
| SVG diagram export | ✅ Done | Clean generated architecture snapshot |
| PDF report export | ✅ Done | Printable report with diagram, capacity/cost summary, and JSON config |
| Shareable resume links | ✅ Done | URL hash contains nodes, edges, users, view, selected example |
| Live traffic particles | ✅ Done | SVG animateMotion particles on active simulated edges |
| Right panel health cockpit | ✅ Done | Empty panel shows node/edge/traffic/critical stats |
| Connection business rules | ✅ Done | `src/rules.js` validates direct links |
| Data engineering components | ✅ Done | CDC, Debezium, Kafka, stream/batch processing, object storage, table formats, catalog, query engine, quality, lake, warehouse |
| Observability components | ✅ Done | App Insights and Log Analytics |
| CDC/event source simulation | ✅ Done | CDC Source DB uses `changeRate` as source flow |
| Lucid-style UI polish | ✅ Done | Cleaner chrome, node cards, floating HUD, minimap overview |
| Whiteboard notes | ✅ Done | Text Note component with textarea properties |
| Billion-scale event modeling | ✅ Done | Compact `K/M/B/T` flow labels and mobile event streaming example |
| Grid snapping | ✅ Done | Toggle button and `G` shortcut |
| Diagram title | ✅ Done | Editable toolbar title, persisted in import/export/share |
| Professional SVG icons | ✅ Done | Component and toolbar icons use inline stroke SVGs |
| Realistic baseline pricing | ✅ Done | Cloud-inspired monthly defaults for major components |

---

## 10/10 Gap Analysis — What's Missing Now

Archi-Flow is past the "diagram prototype" stage. The next jump is to make it feel like an architecture copilot: explain why a design is failing, offer safe fixes, estimate cost impact, and keep canvas work fast.

### Critical Product Gaps
1. **Explainable diagnostics** — users still ask "why is this red?" Nodes and edges need a diagnostic breakdown: incoming, capacity, upstream contributors, downstream split, status reason, and suggested fix.
2. **Actionable suggestions** — recommendation cards should include buttons that modify the diagram: insert LB, route through cache, add replicas, increase capacity, fix bad topology.
3. **Topology intelligence** — detect patterns such as Users hitting App Server directly, LB placed after compute, Cache wired in parallel with DB, unused read replicas, queues with no consumers, and object storage used as a hot request path.
4. **Cost model must be formula-based** — static `cost` defaults are useful, but S3/object storage, CDN, DB, Kafka, warehouse, and compute costs should derive from traffic, storage, replicas, and throughput.
5. **Canvas productivity** — still missing multi-select, rubber-band select, group move, duplicate, and export image.

### High-Value Simulation Gaps
1. **Latency modeling** — add per-node base latency and load penalty, then calculate approximate end-to-end P95.
2. **Queue depth / backpressure** — queues should accumulate backlog when consumers cannot drain fast enough.
3. **Failure mode** — mark a node offline and show reroute, overload, queue buildup, or failure cascade.
4. **Burst testing** — temporary traffic spike to test whether the architecture survives 3x or 10x load.
5. **Historical traces** — per-node load sparkline and recent max load in the properties panel.

---

## Iteration Roadmap

### Iteration 1 — Explainable Diagnostics (next)
**Goal:** Every red/yellow state should answer "why?" without the user guessing.

| ID | Task | Outcome |
|---|---|---|
| 1a | Add `diagnoseNode(nodeId)` | Returns status reason, incoming, effective capacity, top upstream contributors, downstream split, and fixes |
| 1b | Add `diagnoseEdge(edgeId)` | Explains flow amount, source, target, target load, and whether the edge is on the hot path |
| 1c | Add Diagnostics section in properties panel | Selected node/edge shows plain-English explanation and numeric breakdown |
| 1d | Rewrite suggestion cards from diagnostics | No duplicate vague advice; cards become grounded in exact topology and load math |

### Iteration 2 — One-Click Fixes
**Goal:** Suggestions become actions.

| ID | Task | Outcome |
|---|---|---|
| 2a | Add fix action framework | Suggestion cards can run safe graph mutations with undo snapshots |
| 2b | `Insert Load Balancer before compute` | Rewires source → compute into source → LB → compute |
| 2c | `Route DB reads through Cache` | Rewires app → DB + app → cache into app → cache → DB |
| 2d | `Add app replicas behind LB` | Duplicates compute nodes and connects them to an upstream LB |
| 2e | `Increase capacity to recommended value` | Sets component capacity based on current flow and target load threshold |

### Iteration 3 — Real Cost Engine
**Goal:** Cost changes as architecture and traffic change.

| ID | Task | Outcome |
|---|---|---|
| 3a | Add cost model per component type | Static defaults replaced by formulas where possible |
| 3b | Object Storage/S3 formula | Storage TB + PUT/GET requests + data transfer estimate |
| 3c | CDN formula | Requests + bandwidth + regional multiplier |
| 3d | Compute/DB/Cache formula | Replicas × instance profile + storage/IOPS where relevant |
| 3e | Cost delta on fixes | Suggestion button previews `+$X/mo` or `-$X/mo` before applying |

### Iteration 4 — Canvas Productivity
**Goal:** Make editing feel like a real diagramming tool.

| ID | Task | Outcome |
|---|---|---|
| 4a | Multi-select and shift-click | Select multiple nodes |
| 4b | Rubber-band selection | Drag empty canvas to select nodes in a rectangle |
| 4c | Group move/delete | Move and delete selections together |
| 4d | Duplicate selection (`Ctrl+D`) | Copy selected nodes and internal edges |
| 4e | PNG/SVG export | Share visual diagrams without JSON |

### Iteration 5 — Advanced Simulation
**Goal:** Turn throughput simulation into capacity planning.

| ID | Task | Outcome |
|---|---|---|
| 5a | Latency model | Base latency + load penalty + end-to-end P95 |
| 5b | Queue backlog | Queue depth grows when incoming > consumer drain |
| 5c | Failure mode | Take node offline and show cascade |
| 5d | Burst test | Apply 3x/10x traffic pulse for a fixed duration |
| 5e | Sparklines | Mini load history in node/properties panel |

## Immediate Implementation Order

0. **Testability baseline** — keep `npm test` green before and after each iteration.
1. **Diagnostics engine first** — highest leverage because it fixes user confusion and feeds better suggestions.
2. **One-click topology fixes second** — turns the app from advisor into assistant.
3. **Formula cost engine third** — makes architecture tradeoffs credible.
4. **Multi-select/export fourth** — improves diagramming workflow after the core intelligence is trustworthy.

## Iteration Status

| Iteration | Status | Test Gate |
|---|---|---|
| 0 — Status + testability baseline | ✅ Done | `npm test` passes |
| 1 — Explainable diagnostics | 🔄 Next | `npm test` + manual node/edge diagnostic check |
| 2 — One-click fixes | ⏳ Pending | `npm test` + undo/redo fix action check |
| 3 — Real cost engine | ⏳ Pending | `npm test` + cost formula scenario checks |
| 4 — Lucid-style canvas productivity | ⏳ Pending | `npm test` + browser editing checklist |
| 5 — Presentation/access polish | 🔄 Started | SVG export and printable PDF report done; hosted/share polish continues |

---

## Simulation Flow
```
Users (N req/s)
  └─→ [CDN: cacheHit% pass-through]
        └─→ [Firewall: (1-blockRate%) pass-through]
              └─→ API Gateway / Load Balancer
                    ├─→ App Server 1  ←─ AutoScaler watches
                    ├─→ App Server 2
                    └─→ [Cache: (1-hitRate%) pass-through to DB]
                              └─→ Database ──> Read Replicas
```

## Component Property Schema
```json
{
  "id": "vm",
  "name": "Virtual Machine",
  "icon": "🖥️",
  "category": "compute",
  "color": "#3b82f6",
  "defaults": { "capacity": 500, "cost": 50, "autoScale": false },
  "properties": [...],
  "scaleProps": [...],
  "behaviors": ["accepts_traffic", "scalable"]
}
```

## File Map
| File | Purpose |
|------|---------|
| `index.html` | Entire app — state, rendering, simulation, UI |
| `server.mjs` | Static Node app server |
| `package.json` | `npm start` / `npm run dev` scripts |
| `src/components.js` | 33 component JSON definitions |
| `src/examples.js` | 7 example diagram templates |
| `src/rules.js` | Architecture connection validation rules |
| `.claude/PLAN.md` | This file |
| `.claude/TASKS.md` | Task tracker |
| `.claude/launch.json` | Dev server config (port 3456) |
