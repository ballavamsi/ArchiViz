# Archi-Flow — Agent Handoff

**Date:** 2026-05-27  
**Repo:** `/Users/ballavamsi/Downloads/ArchiViz/ArchiViz`  
**Branch:** `release/serverside`  
**Primary server:** `node server.mjs`  
**Default URL:** `http://localhost:3456`  
**Production:** https://archi-flow.onrender.com  
**Important:** Server serves from `dist/` — always run `npm run build` after source edits. This minifies CSS/JS and rewrites index.html to point at `app.min.css` / `app.min.js`. Do NOT just `cp` files — the build step is required for the server to pick up changes correctly.

---

## Latest Update

**Latest local iteration:** UX Polish — Menu, Edges, Auto-Save, Sim Fixes

Commit: `12378a6` on `release/serverside`

### ☰ Menu — moved to left, submenu hover fixed
- The `···` icon-only button is now a **☰ Menu** button on the far-left of the toolbar (before the logo).
- Submenus (Import/Export, View, Simulation) now open to the **right**.
- Added a CSS `::before` hover bridge on `.more-submenu` that fills the 4px gap between the parent item and the submenu panel — mouse can now move diagonally to a submenu item without it collapsing.
- `makeMoreGroup()` / `organizeMoreMenu()` in `src/app.js` unchanged — still auto-organizes buttons into groups at runtime.

### Port snap indicator (connection drag)
- Replaced single `port-snap` class with two context-aware classes:
  - `.port-snap-valid` → **green glow** — hovering a port that would create a valid connection
  - `.port-snap-warn` → **amber glow** — hovering a port that would be an unusual/invalid architecture pattern
- Logic in `p.onmouseenter`: calls `validateConnection(srcDef, tgtDef)` to decide which class to add.

### Warning edges no longer animate
- Edges with `_warn: true` (unusual architecture connections) skip the `edge-anim` class entirely — no moving blue dots on invalid connections during simulation.
- Line in `renderEdges`: `const animClass = edge._warn ? '' : (edge.dashed ? 'edge-dash' : (S.simOn && edge.animated ? 'edge-anim' : ''));`

### e/s readout restored in statusbar
- `flowReadout` was pointing to a fake `{ textContent: '' }` stub — now points to a real `<span id="flow-readout">` element in the statusbar.
- Shows `100 e/s` (green badge) only while simulation is running; hidden when stopped.

### Auto-save status badge
- `#title-saved-badge` replaced with a multi-state badge next to the diagram title:
  - `save-badge-unsaved` → `● Unsaved` (amber) — shown immediately on any change
  - `save-badge-saving` → `Saving…` (muted) — while localStorage write is in-flight
  - `save-badge-saved` → `✓ Saved` (green) — after localStorage save completes, stays for 4s then fades
  - `save-badge-saving-cloud` → `☁ Saving…` (blue) — cloud PUT in-flight
  - `save-badge-saved-cloud` → `☁ Saved` (blue) — after Supabase save completes
- `setSaveBadge(state)` function drives all transitions; exposed as `window._setSaveBadge`.

### Cloud auto-save (Supabase)
- `autoSave()` now schedules a **second timer** (`_cloudAutoSaveTimer`, 10s debounce) in addition to the 1.5s localStorage save.
- The cloud save only fires when: user is signed in (`hasCloudLibrary()` returns true) AND `S.currentDiagramId` is set (a cloud flow is open).
- On failure: falls back to showing `✓ Saved` (local) and logs a console warning — never blocks the user.
- Manual saves via My Flows also set the `saved-cloud` badge state.

### Edge visibility improvements
- Idle edges: opacity `0.3` → `0.8`, color brightened from `rgba(100,130,165)` to `rgba(160,185,220)`
- Stroke width: `1.6px` → `2.2px`
- Hover stroke width: `2.4px` → `3px`
- SVG arrowhead markers: size `6` → `7`, idle color `#4a5568` (nearly invisible on dark) → `#8ba8cc` (light blue-gray), stroke `1.4` → `1.6`
- Light mode idle edge: `rgba(100,116,139, 0.42)` → `rgba(71,85,105, 0.6)` for better contrast

---

## Previous Update

**Previous local iteration:** Public View-Only Sharing + Review Foundation

Implemented the first roadmap pass on top of the Supabase-backed My Flows library.

Public sharing:
- Saved cloud flows now have `is_public`, `public_slug`, `published_at`, `published_by`, and `last_opened_at` fields.
- Owners can publish/unpublish flows, copy `/view/:slug` links, and keep legacy `/s/:id` snapshot links intact.
- `/view/:slug` loads a read-only public canvas with editor chrome hidden, compact cockpit behavior, Comments, Export PDF, and signed-in `Duplicate to My Flows`.
- Public API route: `GET /api/public/flows/:slug`.

Private flow UX:
- My Flows rows now show Public/Private state.
- Row actions include Open, Rename, Duplicate, Versions, Publish/Unpublish, Copy Link, JSON, Delete.
- Opening a cloud flow updates `last_opened_at`.

Version history:
- New `flow_versions` table records a lightweight version on cloud create/update/restore.
- Latest 50 versions are kept per flow.
- API routes: `GET /api/diagrams/:id/versions`, `GET /api/diagrams/:id/versions/:versionId`, `POST /api/diagrams/:id/restore/:versionId`.
- UI exposes a Version History modal with restore.

Review comments:
- New `flow_comments` table with RLS.
- Public viewers can read unresolved comments on published flows.
- Signed-in users can comment on public flows.
- Flow owner can resolve/delete comments via API foundation.
- Public view includes a review drawer; node/edge clicks scope comments to that target.

Templates, explainability, reports:
- Starter gallery now includes SaaS Web App, Event Streaming, Lakehouse, Multi-Region HA, AI/RAG System, and Kubernetes Microservices.
- Examples now carry category, difficulty, tags, and summary metadata.
- Node properties include a `Why this status / cost?` explainability panel using current simulation/cost data.
- PDF export accepts report mode and includes Public View mode plus review comments when exporting from public review context.

Connector status:
- Magnetic endpoints + reconnect handles remain v1 complete.
- This pass only refined selected endpoint cursor/hit affordance; elbow/avoid-node routing remains deferred.

Verification:
```bash
node --check src/app.js
node --check server.mjs
npm test
npm run build
```

---

## Previous Update

**Previous local iteration:** Guest Sign-in Recovery + Compact Menu/Cockpit

Follow-up UI polish after the Cloud Diagram Library:
- Guest users now get a `Sign in with Google` action in the More menu when Supabase auth is configured, even if they previously chose guest mode.
- Guest mode now also injects a profile chip labeled `Guest`, with actions for `Sign in to save flows` and `My Flows`.
- The saved-file feature is branded as `My Flows` in the UI instead of `My Diagrams`.
- More menu is runtime-organized into hover submenus: `Import / Export`, `View`, and `Simulation`, with top-level `My Flows`, optional sign-in, `Clear Canvas`, and a compact About block.
- Architecture cockpit now defaults to compact mode and can expand/collapse. State persists in `localStorage` as `archviz.cockpit`.
- More → View includes an explicit `Cockpit: Compact / Full` switch for toggling between the collapsed and current full cockpit view.
- Regression tests now assert the guest sign-in recovery action, grouped More menu, and compact cockpit hooks.

Verification:
```bash
node --check src/app.js
npm test
npm run build
```

---

## Previous Update

**Previous local iteration:** Cloud Diagram Library

Implemented a Supabase-backed private “My Flows” library while keeping browser-only saves as the guest/offline fallback.

Current cloud library behavior:
- Signed-in users save flows to a new private `user_diagrams` table, separate from public short links.
- The modal supports save, save as, search, open, rename, delete, JSON download, JSON import, and moving browser saves to cloud.
- Frontend sends the Supabase access token as `Authorization: Bearer ...`.
- `server.mjs` validates the Supabase user before listing/loading/updating/deleting diagrams and scopes every operation by `user_id`.
- If `SUPABASE_SERVICE_ROLE_KEY` is present, the server uses it for DB access; otherwise it uses the signed-in user's bearer token so Supabase RLS still protects rows.
- Local autosave remains in localStorage for reload/crash recovery.
- Google Drive is intentionally deferred; current Google login is Supabase identity, not Drive file access.

Setup required in Supabase before production use:
```sql
-- Run this in Supabase SQL editor
-- Source file: supabase-user-diagrams.sql
```

Files changed:
- `server.mjs` — private `/api/diagrams` CRUD routes with Supabase Auth validation
- `src/app.js` — cloud/local library client, modal actions, current file tracking
- `src/app.css` — wider file-manager modal and cloud/local states
- `index.html` — file-manager controls
- `supabase-user-diagrams.sql` — table, indexes, and RLS policies
- `test/smoke.test.mjs` — regression checks for cloud library hooks

Verification to run:
```bash
npm test
npm run build
```

---

## Previous Update

**Previous local iteration:** PDF number formatting

PDF export was updated after the user reported unreadable raw billion-scale values in Component Performance chips.

Current PDF behavior:
- Large PDF values now use compact K/M/B/T formatting across component chips, config cards, costs, charts, recommendations, and totals.
- Browser smoke verifies the billion-scale Mobile Event Streaming report contains values like `1.3B` and `8B`, and does not expose raw values such as `1300000000`.
- Executive Summary now appears before the diagram, with system posture, traffic assumption, cost model, top risks, and recommended actions.
- Top Cost Drivers shows the most expensive components before detailed tables.
- Component Performance no longer includes node pixel size.
- It now includes Config / Cost Drivers, Traffic Out, and Read / Write columns.
- A new Traffic & Cost Assumptions section explains input/output rates, cache hit/miss behavior, read replicas, event rates, and effective edge split logic.
- Component Configuration exports all configured tool properties from `src/components.js`, including CPU, memory, DB type, replicas, storage, latency, capacity, and cost fields.
- Traffic split semantics were corrected: explicit edge percentages reserve that share, blank edges split the remaining traffic, and fully blank downstream edges split evenly.

Files changed:
- `src/app.js` — PDF executive summary, recommendations, top cost drivers, traffic assumptions, component configuration export, and split calculation
- `scripts/browser-smoke.mjs` — checks new PDF sections/columns
- `test/smoke.test.mjs` — PDF export regression checks
- `.claude/TASKS.md` — recorded as Iteration 6.5

Verification already completed:
```bash
npm test
npm run test:browser
```

---

## Copilot Quick Start

> Read this first if you're GitHub Copilot picking up from here.

### What to work on next
**Iteration 7 — Multi-Select + Canvas Productivity** (see `.claude/PLAN.md` for full spec)

Tasks in order:
1. Rubber-band selection — drag on empty canvas draws a rect; on mouseup select all nodes whose bounding box intersects
2. Shift+click to add/remove a node from selection
3. Group move — when dragging any selected node, translate all selected nodes by the same delta
4. Group delete — `Delete` key removes all selected nodes and all edges connected to them
5. Ctrl+D duplicate — copy selected nodes offset by 20px, recreate internal edges between copies

### Files to edit
- **`src/app.js`** — all canvas logic, mouse event handlers, sim, PDF export. This is the only file you'll need for iteration 7.
- **`src/app.css`** — add `.selected` ring style and rubber-band rect style here.
- **`index.html`** — only if you need new toolbar buttons.

### After every edit, sync to dist
```bash
cp src/app.js dist/src/app.min.js
cp src/app.css dist/src/app.min.css
# only if index.html changed:
cp index.html dist/index.html
```

### Key functions in src/app.js to know
| Function | What it does |
|---|---|
| `renderAll()` | Re-renders all nodes and edges |
| `snapshot()` | Push current state to undo history — call before any mutation |
| `deleteNode(id)` | Removes a node and all its edges, calls renderAll |
| `deleteEdge(id)` | Removes a single edge, calls renderAll |
| `addNode(defId, x, y)` | Creates a new node at canvas position x,y |
| `selectNode(id)` | Sets `S.sel`, updates properties panel |
| `updateCost()` | Recalculates cost badge and HUD |
| `buildSuggestions()` | Rebuilds suggestion cards |
| `S.nodes[id]` | Node dict lookup — `S.nodes` is a **dict**, not an array |
| `S.edges[id]` | Edge dict lookup |

### Canvas coordinate system
- `S.panX`, `S.panY` — canvas offset in px
- `S.zoom` — current zoom level (1 = 100%)
- To convert screen coords to canvas coords:
  ```js
  const cx = (screenX - S.panX) / S.zoom;
  const cy = (screenY - S.panY) / S.zoom;
  ```

### Current selection state
- `S.sel` — single selected node id (string or null)
- There is no multi-select state yet — you'll need to add `S.selSet = new Set()` for iteration 7

### Critical gotchas
- `S.nodes` is a **dict** (`{}`), not an array — never call `.find()`, `.map()`, `.filter()` on it directly. Use `Object.values(S.nodes)` or `Object.keys(S.nodes)`.
- `sla` in `S.simLoad[id].sla` is a **string** like `"99.50%"` — use `parseFloat(sla)` before any math.
- Edge panel needs `display: flex` not `display: ''` — CSS default for `#edge-props-content` is `display:none`.
- `dist/` is gitignored and served by the server. Source edits only take effect after the `cp` commands above.

### Commit and push
```bash
git add src/app.js src/app.css   # add index.html if changed
git commit -m "feat: iteration 7 — multi-select and canvas productivity"
git push origin release/serverside
```
Render auto-deploys on push to `release/serverside`. Takes ~2–3 min.

---

## Product Summary

Archi-Flow is a browser-based architecture diagramming and traffic simulation tool, modeled after draw.io/Lucidchart but specialized for cloud/system design.

Users drag components onto a canvas, connect ports, run traffic simulation, and inspect load, capacity, bottlenecks, auto-scaling, read replicas, flow labels, and estimated monthly cost.

The current direction is to evolve it from a diagramming prototype into an **architecture copilot**:

1. Explain exactly why nodes/edges are warning or critical.
2. Offer one-click topology fixes.
3. Estimate realistic cost impact.
4. Keep canvas editing polished and fast.

The product bar is **Lucid/draw.io-grade editing plus architecture intelligence**: easy to open, easy to present, and clear enough that non-authors can understand the design from a shared link.

---

## How To Run

```bash
# macOS/Linux
./run.sh

# or directly
node server.mjs

# if port 3456 is busy
PORT=3457 node server.mjs

# if npm is installed
npm start
```

Windows:

```bat
run.bat
```

Then open the printed local URL.

Claude/Codex preview config lives in `.claude/launch.json` and currently uses `/opt/homebrew/bin/node` with `autoPort: true`.

**IMPORTANT — dist/ sync:** The server serves `dist/` not root. After editing source files run:

```bash
cp src/app.js dist/src/app.min.js
cp src/app.css dist/src/app.min.css
cp index.html dist/index.html
```

---

## File Map

| File | Purpose |
|---|---|
| `src/app.js` | Main app logic — canvas, simulation, PDF export, all UI |
| `src/app.css` | All styles, responsive media queries, toolbar layout |
| `src/components.js` | Component definitions, SVG icons, defaults, capacities, costs, properties |
| `src/rules.js` | Architecture connection validation rules |
| `src/examples.js` | Built-in example architectures |
| `index.html` | App shell, toolbar HTML, modal scaffolding |
| `server.mjs` | Static Node.js server (serves from `dist/`) |
| `package.json` | `npm start` wrapper |
| `run.sh` | macOS/Linux launcher |
| `run.bat` | Windows launcher |
| `.claude/PLAN.md` | Current roadmap and iteration plan |
| `.claude/TASKS.md` | Historical task tracker and implementation notes |
| `.claude/launch.json` | Preview server config |

---

## Current App Status

**Overall status:** 9.5/10 — iterations 0–6.2 shipped and working.

**Last completed iteration:** Iteration 6.2 — Visible tool chip on node tiles.

**Latest checkpoint:** 2026-05-26 — added draw.io/Lucid-style canvas grid plus persisted Dark/Light theme toggle, production URL confirmed as Render (`https://archi-flow.onrender.com`), `npm test` and `npm run build` passed.

**Browser testing:** Playwright Chromium is available locally. Run `npm run test:browser` for the UI smoke test that opens the app, verifies the 4-layer canvas grid, System→Light theme behavior, share popup theming, login-card theme tokens, and PDF report popup export.

### Shipped Iterations

| Iteration | Feature | Status |
|---|---|---|
| 0 | Status + testability baseline | ✅ Done |
| 1 | Explainable diagnostics (sim stats per node: latency, P95, SLA, error rate) | ✅ Done |
| 2 | One-click topology fixes, suggestion cards | ✅ Done |
| 3 | New components: searchengine, emailsms, bgworker, graphqlapi, websocket, ratelimiter | ✅ Done |
| 4 | Edge traffic % panel, right-click context menu, region overlay | ✅ Done |
| 5 | Reserved pricing (−35% on compute+network), cost breakdown HUD by category | ✅ Done |
| 6 | Professional PDF export redesign (dark cover, bottleneck analysis, perf table) | ✅ Done |

### Built And Working

| Area | Status |
|---|---|
| Drag/drop canvas | ✅ |
| 39 architecture/data/observability/AI components | ✅ |
| Professional inline SVG icons | ✅ |
| Accordion component sidebar (collapsible) | ✅ |
| Click-to-connect and drag-to-connect ports | ✅ |
| Drop component onto edge to insert | ✅ |
| Bezier edges with arrow markers + traffic particles | ✅ |
| Live flow labels on edges | ✅ |
| Multi-pass BFS traffic propagation | ✅ |
| Simulation speed selector | ✅ |
| Per-node sim stats: load%, latency, P95, error rate, SLA | ✅ |
| Edge traffic % panel (click any edge) | ✅ |
| Right-click context menu on nodes | ✅ |
| Region overlay visualization (US East, EU West, etc.) | ✅ |
| Load balancer traffic splitting | ✅ |
| Cache/CDN hit-rate pass-through | ✅ |
| Firewall block-rate pass-through | ✅ |
| Auto-scaler support | ✅ |
| DB read replicas | ✅ |
| Properties panel with live editing | ✅ |
| Suggestions panel (diff-based, no full re-render) | ✅ |
| Reserved pricing toggle (−35% compute + network) | ✅ |
| Cost breakdown HUD by category | ✅ |
| Undo/redo | ✅ |
| Auto-layout | ✅ |
| Lucid-style zoom/pan/fit | ✅ |
| Grid snapping toggle | ✅ |
| Draw.io/Lucid-style canvas grid | ✅ |
| Dark / Light theme toggle | ✅ |
| Visible tool/component chip on node tiles | ✅ |
| Editable diagram title | ✅ |
| JSON import/export | ✅ |
| SVG diagram image export | ✅ |
| Professional PDF report export | ✅ |
| Shareable `#arch=` URL state | ✅ |
| Cost badge in toolbar | ✅ |
| Minimap/overview | ✅ |
| Whiteboard text notes | ✅ |
| Responsive toolbar (collapses at small viewports) | ✅ |

---

## PDF Export — Architecture

`exportPdfReport()` in `src/app.js` opens `window.open('', '_blank')` and writes full self-contained HTML.

### Sections

1. **Dark cover** — grid background, glow effect, brand, title, chips (Simulation Active, N Critical, $X/mo, Reserved −35%)
2. **KPI bar** — Components, Monthly Cost, System Health (critical/warn/healthy), Avg Latency + Est. SLA
3. **Architecture Diagram** — embedded SVG snapshot with dark background
4. **2-column row** — left: System Health dot indicators; right: Cost breakdown bar chart by category
5. **Bottleneck Analysis** — top 5 nodes above 60% load, with traffic vs capacity, latency/P95, typed recommendation
6. **Component Performance Table** — Component | Load bar | Traffic In | Capacity | Avg Lat | P95 Lat | Err% | SLA | Cost/mo
7. **Footer** — total cost, reserved pricing note, brand
8. **Print bar** — sticky bottom bar with Close + Save as PDF buttons

### Key Notes

- `sla` is stored as a **string** like `"99.50%"` in `simLoad`. Use `parseFloat(sla)` before numeric comparisons.
- `S.nodes` is a **dict** keyed by node ID — use `S.nodes[id]`, not `S.nodes.find(...)`.
- `realNodes = payload.nodes.filter(n => !n.props?._isReplica)` — exclude replica nodes from cost/analysis.
- Cost categories: compute, network, storage, data, messaging, observability, security, ai/ml, other.

---

## Important Implementation Details

### State Object (`S`)

```js
let S = {
  nodes: {},          // dict keyed by node id
  edges: {},          // dict keyed by edge id
  eFlow: {},          // edge flow amounts
  simLoad: {},        // per-node sim results { loadPct, latencyMs, p95Ms, errorRate, sla, incoming, capacity, status }
  sel: null,          // selected node id
  selEdge: null,      // selected edge id
  zoom: 1,
  panX: 40,
  panY: 40,
  simOn: false,
  simTick: null,
  snapGrid: true,
  sidebarOpen: true,
  gridSize: 40,
  title: 'Untitled Architecture',
  reservedPricing: false,   // toggles −35% on compute + network
  serviceMesh: false,
  suggestionsOn: true,
  simSpeed: 'normal',
  activeExample: '',
  hist: [],
  histPos: -1,
  nSeq: 0,
  eSeq: 0
};
```

### Simulation Output (`S.simLoad[nodeId]`)

```js
{
  loadPct: 167,          // percentage of capacity used
  incoming: 333,         // events/s received
  capacity: 200,         // effective capacity events/s
  latencyMs: 250,        // avg latency
  p95Ms: 625,            // P95 latency
  errorRate: 0,          // error %
  sla: "98.00%",         // SLA string (parse with parseFloat before math)
  status: "critical",    // "source" | "healthy" | "warning" | "critical"
  coldStart: false
}
```

### Zoom Model

Do not resize nodes directly based on zoom:

```js
el.style.cssText = `
  left:${x}px; top:${y}px;
  width:${n.w}px; height:${n.h}px;
  transform:scale(${S.zoom});
  transform-origin:top left;
`;
```

### Simulation

Multi-pass BFS propagation. Pass-through behaviors:
- CDN: `incoming * (1 - cacheHitRate%)`
- Cache: `incoming * (1 - hitRate%)`
- Firewall: `incoming * (1 - blockRate%)`
- Device/App: multiplies by `eventsPerInput`
- Load Balancer: splits equally to downstream targets

### Edge Traffic Panel

`showEdgeProps(edgeId)` — sets `#edge-props-content` to `display: flex` (NOT `''` — CSS default is `display:none`).

### Reserved Pricing

Toggled by `S.reservedPricing`. Applies −35% discount to components in categories `compute` and `network` when computing costs.

### Toolbar Layout

At small viewports the toolbar uses responsive CSS:
- `< 860px`: hides Share button, shrinks diagram title
- `< 780px`: hides Collab button and title entirely

Reserved Pricing and Service Mesh buttons are inside the `#more-menu` dropdown, not the main toolbar.

---

## Known Issues / Not Yet 10/10

1. **Multi-select** — no rubber-band selection, no duplicate selection.
2. **Cost model is static** — not formula-based (GB/requests). Fine for now.
3. **One-click topology fixes** — suggestion cards have actions but coverage is incomplete.
4. **Mobile/touch** — not optimized for touch devices.

---

## Verification Checklist For Future Agents

After changes, always sync dist:

```bash
cp src/app.js dist/src/app.min.js && cp src/app.css dist/src/app.min.css && cp index.html dist/index.html
```

Then verify:

0. `npm test` passes (smoke tests)
1. Load app at `http://localhost:3456`
2. No console errors
3. Load "Microservices — API Gateway" example
4. Zoom in/out — node internals must not reflow
5. Run simulation — flow labels update, node badges show load/latency
6. Click a node — sim stats panel shows latency, P95, SLA, error rate
7. Click an edge — edge traffic % panel appears
8. Right-click a node — context menu appears
9. Open ⋯ more menu → Reserved Pricing toggles, cost badge updates
10. Open ⋯ more menu → Export PDF → report opens in new tab, all sections visible, no NaN
11. Open ⋯ more menu → Export PDF → SLA column shows single `%` (not `%%`)

---

## Current Best Mental Model

Archi-Flow should not become just "draw.io with traffic animation." The winning product shape is:

```text
Draw rough architecture -> enter traffic -> Run Sim ->
Archi-Flow explains bottlenecks -> applies safe fixes -> shows cost impact
```

Build toward that.
