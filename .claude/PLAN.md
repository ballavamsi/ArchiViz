# ArchViz — Architecture Simulator

## Goal
Interactive drag-and-drop architecture visualization with real-time traffic simulation.
Modeled after draw.io / Lucidchart — professional, fast, zero-install, runs in the browser.

## Tech Stack
- **Pure HTML + vanilla JS** (no build step) — open index.html via static HTTP server
- No frameworks — direct DOM for nodes/edges, SVG for edges/arrows
- **Tailwind** via CDN for utility classes
- Node.js static server app (`node server.mjs`; `npm start` when npm is installed) on port 3456

## Architecture Decisions
1. No build tool — zero friction, edit and refresh
2. All component definitions in `src/components.js` as JSON-serializable objects
3. Simulation runs on 700ms tick loop, BFS propagation from source nodes
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
| BFS traffic simulation | ✅ Done | 700ms tick |
| Load balancer splitting | ✅ Done | |
| Auto-scaler (node property + standalone) | ✅ Done | |
| DB read replicas (visual spawn) | ✅ Done | |
| Properties panel | ✅ Done | |
| Suggestions panel (diff-based, no flash) | ✅ Done | Toolbar toggle persists preference |
| Undo / Redo | ✅ Done | Snapshot-based |
| Auto-layout (BFS layering) | ✅ Done | |
| Zoom / Pan / Fit | ✅ Done | |
| Keyboard shortcuts (Del, Esc, Ctrl+Z/Y) | ✅ Done | |
| Edge delete (hover × button) | ✅ Done | |
| Drop-onto-edge to insert | ✅ Done | |
| 7 example templates | ✅ Done | Includes Mobile Event Streaming and CDC Streaming Platform |
| Export JSON | ✅ Done | |
| Cost tracker | ✅ Done | |
| Category filter + search in sidebar | ✅ Done | |
| Inline label editing | ✅ Done | Double-click node label |
| JSON import | ✅ Done | Toolbar file picker or drag .json onto canvas |
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

---

## Gap Analysis — What's Missing

### 🔴 Critical UX Gaps (breaks the flow)
1. **Label truncation** — nodes are 160px fixed width, labels cut at 110px. Hard to read at any zoom.
2. **No multi-select** — can't shift-click or rubber-band multiple nodes to move/delete together.
3. **No node duplication** — no Ctrl+D or right-click → Duplicate.
4. **Node overlap after manual drag** — auto-layout runs once; manual drags can re-create overlap.

### 🟡 High-Value Features
7. **PNG / SVG export** — share a diagram as an image; JSON alone isn't shareable.
8. **Failure / chaos mode** — toggle a node offline, see how traffic cascades (retries, queue buildup, downstream failure).
9. **Diagram title** — editable name shown in toolbar; currently always "ArchViz".
10. **More components** — Lambda/Serverless, Object Storage (S3), DNS, Monitoring (Prometheus/Grafana), Service Mesh, Elasticsearch.
11. **Visual grouping containers** — VPC, Region, Availability Zone boundary boxes that nodes can sit inside.
12. **Edge annotations** — add latency (ms), protocol (HTTP/gRPC/TCP), or bandwidth labels directly on edges.

### 🟢 Polish & Discoverability
13. **Always-visible port dots** — ports only appear on hover; new users don't discover them.
14. **Minimap** — for large diagrams, a small overview map bottom-right for navigation.
15. **Right panel empty state** — "Click a node to edit" is bare; show a diagram-wide stats summary instead.
16. **Toolbar diagram name** — show/edit a diagram name next to the logo.
17. **Keyboard shortcut cheatsheet** — press `?` to show a modal with all shortcuts.
18. **Grid snapping** — optional snap-to-grid toggle for precise placement.
19. **Simulation propagation for merge-heavy graphs** — single-pass BFS can under-propagate late-arriving flow.

### 🔵 Advanced Simulation
20. **Latency modeling** — beyond throughput: response time (ms) per node, end-to-end P95 latency.
21. **Burst traffic spike** — a "spike" button that temporarily multiplies users 3× for 3 seconds to show failure modes.
22. **Per-node sparkline** — tiny load-over-time graph inside the node or in the right panel.
23. **Queue overflow visualization** — when a queue fills past maxMessages, show backpressure propagating upstream.
24. **Cost optimization suggestions** — "switching this DB to a smaller tier saves $X/mo" type hints.

---

## Roadmap

### Phase 9 — Core UX (next)
**Goal:** Fix the biggest friction points so the tool feels complete.

| # | Task | Impact |
|---|------|--------|
| 9a | Multi-select (shift-click + rubber-band drag) with group move/delete | High |
| 9b | Node duplication (Ctrl+D) | Medium |
| 9c | PNG export (html-to-canvas or SVG serialization) | High |
| 9d | Diagram title (editable in toolbar, persisted in export) | Low |

### Phase 10 — Power Features
**Goal:** Make diagrams richer and more realistic.

| # | Task | Impact |
|---|------|--------|
| 10a | 6 new components: Lambda, S3, DNS, Monitoring, Service Mesh, Elasticsearch | High |
| 10b | Failure / chaos mode — click node → "Take Offline" — see cascade | Very High |
| 10c | Visual group containers (VPC / Region / AZ boundary boxes) | High |
| 10d | Edge annotations (latency, protocol labels clickable on edge) | Medium |
| 10e | Always-visible port dots (small, subtle; grow on hover) | Medium |

### Phase 11 — Advanced Simulation
**Goal:** Turn ArchViz into a genuine capacity planning tool.

| # | Task | Impact |
|---|------|--------|
| 11a | Latency modeling (ms per node, end-to-end P95) | Very High |
| 11b | Burst spike button (3× traffic for 3s) | High |
| 11c | Per-node load sparkline in right panel | Medium |
| 11d | Queue overflow backpressure visualization | Medium |
| 11e | Cost-optimization suggestion cards | Low |

### Phase 12 — Sharing & Polish
**Goal:** Make it easy to share and discover.

| # | Task | Impact |
|---|------|--------|
| 12a | URL-based state sharing (serialize to URL hash / gzip) | High |
| 12b | Minimap (small overview, pan-to-click) | Medium |
| 12c | Keyboard shortcut modal (`?` key) | Low |
| 12d | Grid snapping toggle | Low |
| 12e | Simulation propagation upgrade for complex merge graphs | Medium |

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
