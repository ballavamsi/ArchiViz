# Archi-Flow — Architecture Simulator

## Goal
Interactive drag-and-drop architecture visualization with real-time traffic simulation.
Modeled after draw.io / Lucidchart — professional, fast, zero-install, runs in the browser.

## Product North Star
Make Archi-Flow feel like a **Lucid/draw.io-grade architecture workspace** that anyone can open, present, and understand:

1. **Easy access:** one command locally, shareable URL state, hosted at archi-flow.onrender.com.
2. **Presentation-ready:** clean chrome, PDF/image export, readable diagrams, no visual glitches.
3. **Architecture-aware:** explains bottlenecks and bad topology, not just colors them red.
4. **Actionable:** suggestions should be one-click fixes with cost impact.
5. **Trustworthy:** every iteration must have a runnable test or verification checklist.

## Tech Stack
- **Pure HTML + vanilla JS** (no build step) — served via Node.js static server
- No frameworks — direct DOM for nodes/edges, SVG for edges/arrows
- Node.js static server (`node server.mjs`; serves from `dist/`) on port 3456
- **Production:** https://archi-flow.onrender.com (auto-deploys from `release/serverside` branch)

## Architecture Decisions
1. No build tool — zero friction, edit source and `cp` to `dist/`
2. All component definitions in `src/components.js` as JSON-serializable objects
3. Simulation runs on a tick loop (Slow/Normal/Fast) with multi-pass BFS propagation
4. Color thresholds: green (<60%), yellow (60–85%), red (>85%)
5. Bezier edges: control points scale with screen-space distance, port-side-aware
6. Auto-scaler: `replicas = ceil(incoming / (capacity × threshold%))` — scales below threshold
7. Load balancer: splits traffic equally to all downstream nodes
8. Read replicas: spawn real canvas nodes with purple replication edges
9. Edge endpoints anchor to actual DOM port centers, not guessed model dimensions
10. Share links encode architecture state in `#arch=...` URL hash
11. Server serves `dist/` — always sync source to dist after edits

---

## Iteration Status

| # | Iteration | Status | Summary |
|---|-----------|--------|---------|
| 0 | Testability baseline | ✅ Done | `npm test` passes, smoke tests |
| 1 | Explainable diagnostics | ✅ Done | Per-node latency/P95/SLA/err%, edge traffic panel |
| 2 | One-click topology fixes | ✅ Done | Suggestion action buttons with undo |
| 3 | New components (6) | ✅ Done | searchengine, emailsms, bgworker, graphqlapi, websocket, ratelimiter |
| 4 | Edge panel + right-click + regions | ✅ Done | Edge traffic %, context menu, region overlay |
| 5 | Reserved pricing + cost HUD | ✅ Done | −35% compute/network, breakdown by category |
| 6 | Professional PDF export | ✅ Done | Dark cover, bottleneck analysis, performance table, SLA fix |
| 7 | Multi-select + canvas productivity | ⏳ Next | Rubber-band, shift-click, group move/delete, Ctrl+D |
| 8 | Formula cost engine | ⏳ Pending | S3, CDN, compute, DB formulas; cost delta preview |
| 9 | Advanced simulation | ⏳ Pending | Queue backlog, failure mode, burst test, sparklines |
| 10 | Presentation polish | ⏳ Pending | PNG export, presentation mode, keyboard shortcut modal |

---

## Current Feature Status

| Feature | Status |
|---|---|
| Drag-drop canvas | ✅ |
| Bezier edges, animated flow particles | ✅ |
| BFS traffic simulation (multi-pass) | ✅ |
| Per-node sim stats: load%, latency, P95, error rate, SLA | ✅ |
| Edge traffic % panel | ✅ |
| Right-click context menu | ✅ |
| Region overlay visualization | ✅ |
| Load balancer splitting | ✅ |
| Auto-scaler | ✅ |
| DB read replicas (visual spawn) | ✅ |
| Properties panel (live edit) | ✅ |
| Suggestions panel (diff-based) | ✅ |
| One-click topology fix actions | ✅ |
| Reserved pricing toggle (−35%) | ✅ |
| Cost breakdown HUD by category | ✅ |
| 39 components across all categories | ✅ |
| Undo / Redo (snapshot-based) | ✅ |
| Auto-layout (BFS layering) | ✅ |
| Zoom / Pan / Fit (Lucid-style) | ✅ |
| Keyboard shortcuts (Del, Esc, Ctrl+Z/Y, G) | ✅ |
| Edge delete (hover × button) | ✅ |
| Drop-onto-edge to insert | ✅ |
| Inline label editing (double-click) | ✅ |
| 8 example templates | ✅ |
| JSON import/export | ✅ |
| SVG diagram export | ✅ |
| Professional PDF report export | ✅ |
| Shareable `#arch=` URL state | ✅ |
| Cost badge in toolbar | ✅ |
| Minimap/overview | ✅ |
| Whiteboard text notes | ✅ |
| Responsive toolbar (breakpoints at 860/780px) | ✅ |
| Grid snapping toggle | ✅ |
| Draw.io/Lucid-style canvas grid | ✅ |
| Dark / Light theme toggle | ✅ |
| Editable diagram title | ✅ |
| Multi-select / rubber-band | ⏳ Next |
| PNG export | ⏳ Next |
| Formula-based cost engine | ⏳ Pending |
| Queue backlog / failure mode | ⏳ Pending |

---

## Next Iteration: 7 — Multi-Select + Canvas Productivity

### Goal
Make editing feel like a real diagramming tool.

### Tasks
| ID | Task | Outcome |
|---|---|---|
| 7a | Rubber-band selection | Drag empty canvas draws selection rect, releases selects enclosed nodes |
| 7b | Shift+click to multi-select | Toggles node in/out of selection |
| 7c | Group move | Dragging any selected node moves all selected nodes |
| 7d | Group delete | `Delete` key removes all selected nodes + their edges |
| 7e | Ctrl+D duplicate | Copies selected nodes and internal edges, offset by 20px |
| 7f | PNG export | Serialize canvas to rasterized image download |

### Test Gate
- `npm test` still passes
- Manual: select 3 nodes → move together → undo → positions restore
- Manual: Ctrl+D → duplicated nodes appear, connections preserved
- Manual: PNG export downloads a readable image

---

## Simulation Flow
```
Users (N events/s)
  └─→ [CDN: cacheHit% pass-through]
        └─→ [Firewall: (1-blockRate%) pass-through]
              └─→ Rate Limiter → API Gateway / Load Balancer
                    ├─→ App Server 1  ←─ AutoScaler watches
                    ├─→ App Server 2
                    └─→ [Cache: (1-hitRate%) pass-through to DB]
                              └─→ Database ──> Read Replicas
                                        └─→ bgworker → emailsms
```

## File Map
| File | Purpose |
|------|---------|
| `src/app.js` | Main app — canvas, simulation, PDF export, all UI logic |
| `src/app.css` | All styles, responsive breakpoints, toolbar layout |
| `src/components.js` | 39 component JSON definitions |
| `src/examples.js` | 8 example diagram templates |
| `src/rules.js` | Architecture connection validation rules |
| `index.html` | App shell, toolbar HTML, modal scaffolding |
| `server.mjs` | Static Node.js server (serves `dist/`) |
| `package.json` | `npm start` / `npm test` scripts |
| `dist/` | Built/served files — sync from src after edits (gitignored) |
| `.claude/PLAN.md` | This file |
| `.claude/TASKS.md` | Detailed task tracker and implementation notes |
| `.claude/launch.json` | Dev server config (port 3456) |
| `HANDOFF.md` | Agent handoff document — current state, gotchas, verification checklist |
