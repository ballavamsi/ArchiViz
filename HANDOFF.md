# Archi-Flow — Agent Handoff

**Date:** 2026-05-26  
**Repo:** `/Users/ballavamsi/Downloads/ArchiViz/ArchiViz`  
**Branch:** `release/serverside`  
**Primary server:** `node server.mjs`  
**Default URL:** `http://localhost:3456`  
**Production:** https://archi-flow.netlify.app/  
**Important:** Server serves from `dist/` — always run `cp src/app.js dist/src/app.js` (and css/html) after source edits.

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
cp src/app.js dist/src/app.js
cp src/app.css dist/src/app.css
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
Netlify auto-deploys on push to `release/serverside`. Takes ~2–3 min.

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
cp src/app.js dist/src/app.js
cp src/app.css dist/src/app.css
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

**Overall status:** 9/10 — all 6 iterations shipped and working.

**Last completed iteration:** Iteration 6 — PDF export redesign.

**Latest checkpoint:** 2026-05-26 — production URL aligned to Netlify (`https://archi-flow.netlify.app/`), PDF report footer/cover updated, `npm test` and `npm run build` passed.

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
cp src/app.js dist/src/app.js && cp src/app.css dist/src/app.css && cp index.html dist/index.html
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
