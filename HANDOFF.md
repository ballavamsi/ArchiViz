# Archi-Flow — Agent Handoff

**Date:** 2026-05-24  
**Repo:** `/Users/ballavamsi/Downloads/ArchiViz/ArchiViz`  
**Primary server:** `node server.mjs`  
**Default URL:** `http://localhost:3456`  
**Important:** port `3456` is often already in use on this machine. Use `PORT=3457 node server.mjs` or Claude/Codex preview auto-port if needed.

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

---

## File Map

| File | Purpose |
|---|---|
| `index.html` | Entire app UI, state, rendering, simulation, canvas behavior |
| `src/components.js` | Component definitions, SVG icons, defaults, capacities, costs, properties |
| `src/rules.js` | Architecture connection validation rules |
| `src/examples.js` | Built-in example architectures |
| `server.mjs` | Static Node.js server |
| `package.json` | `npm start` wrapper |
| `run.sh` | macOS/Linux launcher |
| `run.bat` | Windows launcher |
| `.claude/PLAN.md` | Current roadmap and 10/10 iteration plan |
| `.claude/TASKS.md` | Historical task tracker and implementation notes |
| `.claude/launch.json` | Preview server config |

---

## Current App Status

**Overall status:** strong prototype, roughly 8/10. The UI/canvas foundation is solid, but it is not yet 10/10 because diagnostics, one-click fixes, formula cost modeling, multi-select, and presentation export are still pending.

**Last completed iteration:** Iteration 0 — status + testability baseline (`npm test` passes).

**Current/next iteration:** Iteration 1 — explainable diagnostics.

### Built And Working

| Area | Status |
|---|---|
| Drag/drop canvas | Done |
| 33 architecture/data/observability components | Done |
| Professional inline SVG icons | Done |
| Accordion component sidebar | Done |
| Sidebar close/open toggle | Done |
| Click-to-connect ports | Done |
| Edge drag connect | Done |
| Drop component onto edge to insert | Done |
| Bezier edges with arrow markers | Done |
| Live flow labels and traffic particles | Done |
| Multi-pass traffic propagation | Done |
| Simulation speed selector | Done |
| Load balancer traffic splitting | Done |
| Cache/CDN hit-rate pass-through | Done |
| Firewall block-rate pass-through | Done |
| Auto-scaler support | Done |
| DB read replicas as visible managed nodes | Done |
| Properties panel with live editing | Done |
| Simulation stats per selected node | Done |
| Suggestions panel with diff-based rendering | Done |
| Undo/redo | Done |
| Auto-layout | Done |
| Lucid-style zoom/pan/fit | Done |
| Grid snapping toggle | Done |
| Editable diagram title | Done |
| JSON import/export | Done |
| SVG diagram image export | Done |
| Printable PDF report export | Done |
| Shareable `#arch=` URL state | Done |
| Cost badge | Done |
| Minimap/overview | Done |
| Whiteboard text notes | Done |
| Billion-scale number formatting | Done |
| Realistic baseline cost defaults | Done |

### Most Recent Fixes

1. **Lucid-style zoom behavior**
   - Nodes now keep fixed internal size (`160x88`) and use CSS `transform: scale(...)`.
   - This prevents labels, badges, ports, and layout from reflowing while zooming.

2. **Collapsible sidebar**
   - Canvas edge button hides/shows the component palette.
   - Preference persists in `localStorage` as `archviz.sidebar`.

3. **Button wrapping**
   - `Run Sim` / `Stop` and `Delete Node` are inline-flex, one-line controls.

4. **Presentation export/share**
   - Share creates a resumable link and attempts to include a generated SVG diagram image.
   - More -> Export Image downloads a clean SVG snapshot.
   - More -> Export PDF opens a printable report with diagram, node capacity/cost summary, and full JSON config.

5. **Topology rules**
   - `Load Balancer -> Database`, `Load Balancer -> Cache`, microservice-to-microservice, Kafka consumers, stream sinks, query paths, and other real-world patterns are allowed.

6. **Edge coloring**
   - Edges color by destination node health, not source node health.
   - Healthy targets stay green even if their source is overloaded.

7. **Warning color**
   - Yellow was updated to be visually distinct from critical red.

---

## Important Implementation Details

### State Object

`index.html` owns state in `S`:

```js
let S = {
  nodes: {},
  edges: {},
  eFlow: {},
  simLoad: {},
  sel: null,
  selEdge: null,
  zoom: 1,
  panX: 40,
  panY: 40,
  simOn: false,
  simTick: null,
  snapGrid: true,
  sidebarOpen: true,
  gridSize: 40,
  title: 'Untitled Architecture',
  suggestionsOn: true,
  simSpeed: 'normal',
  activeExample: '',
  hist: [],
  histPos: -1,
  nSeq: 0,
  eSeq: 0
};
```

Note: the comment above is conceptual. Check the live object in `index.html` before editing because it may use `{}`/arrays and additional fields.

### Zoom Model

Do not resize nodes directly based on zoom. The current correct pattern is:

```js
el.style.cssText = `
  left:${x}px;
  top:${y}px;
  width:${n.w}px;
  height:${n.h}px;
  transform:scale(${S.zoom});
  transform-origin:top left;
`;
```

Edges use actual DOM port centers via `getBoundingClientRect()`, so transformed nodes still anchor correctly.

### Simulation

Simulation is multi-pass. It iterates propagation and stops when edge flows converge.

Important pass-through behaviors:

- CDN forwards `incoming * (1 - cacheHitRate%)`
- Cache forwards `incoming * (1 - hitRate%)`
- Firewall forwards `incoming * (1 - blockRate%)`
- Device/App multiplies incoming by `eventsPerInput`
- Load Balancer splits equally to downstream targets

Cache must be wired **between app and database** to reduce DB pressure:

```text
App Server -> Cache -> Database
```

Not:

```text
App Server -> Cache
App Server -> Database
```

### Read Replicas

Managed by `syncDbReplicas(dbId, targetCount)`.

Replica nodes:

- `props._replicaOf = parentDbId`
- `props._isReplica = true`
- purple dashed replication edges
- excluded from suggestions as independent DBs

### Suggestions

`buildSuggestions()` currently produces recommendation cards. It is diff-based and should not wipe `innerHTML` every tick.

Next iteration should replace most ad hoc suggestion logic with a diagnostics engine:

```js
diagnoseNode(nodeId)
diagnoseEdge(edgeId)
```

Then suggestions become thin views over diagnostics.

---

## Known Issues / Not Yet 10-10

These are the important next problems. Do not spend time redoing already-solved items like title, grid, minimap, sidebar, SVG icons, or share links.

1. **Why-is-this-red confusion**
   - Users still need clearer explanations for red/yellow nodes and edges.
   - Need selected node/edge diagnostics: incoming, capacity, load, top upstream contributors, downstream split, and reason.

2. **Suggestions are text-only**
   - Suggestions should include buttons that apply safe fixes with undo snapshots.

3. **Topology intelligence is incomplete**
   - Detect:
     - Users hitting App Server directly while LB exists
     - LB placed after compute
     - Cache wired parallel to DB instead of between app and DB
     - Read replicas exist but are not reducing the modeled bottleneck
     - Queue with no consumers
     - Object Storage used as hot request path

4. **Cost model is still mostly static**
   - Costs are better baseline defaults now, but not fully formula-based.
   - Need S3/object storage cost from storage TB + GET/PUT + egress.
   - Need CDN cost from requests + bandwidth.
   - Need DB/cache/compute cost from replicas/instance profile/storage.

5. **Canvas productivity**
   - No multi-select.
   - No rubber-band selection.
   - No duplicate selection.
   - No PNG/SVG visual export.

---

## Recommended Next Iteration

Start with **Iteration 1: Explainable Diagnostics**.

### Goal

Every warning/critical node or edge should explain itself clearly and numerically.

### Deliverables

1. Add `diagnoseNode(nodeId)`
   - Return:
     - label/component type
     - status
     - incoming flow
     - effective capacity
     - load percent
     - top upstream contributors
     - downstream split
     - reason string
     - fix suggestions

2. Add `diagnoseEdge(edgeId)`
   - Return:
     - source/target labels
     - flow on edge
     - target load
     - whether target is bottleneck
     - reason string

3. Add Diagnostics UI
   - In properties panel under Simulation.
   - Show plain English first, numbers second.
   - For selected edge, show edge diagnostics in the right panel.

4. Rewrite suggestion cards to consume diagnostics
   - Avoid duplicate vague advice.
   - Use exact topology/traffic facts.

### Example Diagnostic Copy

```text
App Server is critical because it receives 100,000 events/s but has 25,000 events/s effective capacity after 5 replicas.

Top contributor:
Users -> 100,000 events/s

Recommended fix:
Route Users through a Load Balancer and add more App Server replicas, or increase App Server capacity to 125,000 events/s for 80% target load.
```

---

## Iteration After That

**Iteration 2: One-Click Fixes**

Add action buttons to suggestion cards:

- `Insert Load Balancer before App Server`
- `Route DB reads through Cache`
- `Add 3 App Server replicas`
- `Increase Cache capacity to 100K`
- `Add Queue Consumer`

Every action must:

1. call `snapshot()` before mutating
2. preserve existing node labels where possible
3. update edges safely
4. call `renderAll()`, `updateStats()`, `updateCost()`, `buildSuggestions()`

---

## Verification Checklist For Future Agents

After changes:

0. Run automated smoke tests:
   ```bash
   npm test
   ```
1. Start server:
   ```bash
   PORT=3457 node server.mjs
   ```
2. Load app.
3. Check browser console for errors.
4. Load "Simple Web App" example.
5. Zoom in/out. Node internal layout must not reflow.
6. Run simulation. Flow labels and node stats should update.
7. Select a node. Properties panel should show icon, properties, simulation stats.
8. Try sidebar collapse/open.
9. Try connecting:
   - click source port, click target port
   - drag source port to target port
10. Export/import JSON or Share link if state format changed.

---

## Current Best Mental Model

Archi-Flow should not become just "draw.io with traffic animation." The winning product shape is:

```text
Draw rough architecture -> enter traffic -> Run Sim ->
Archi-Flow explains bottlenecks -> applies safe fixes -> shows cost impact
```

Build toward that.
