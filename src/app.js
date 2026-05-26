// Component definitions, categories, examples and rules are loaded from the
// server API at boot time — they are never bundled into the client JS file.
// This prevents the palette schema, connection rules, and example blueprints
// from being downloaded directly by visitors.

let COMPONENT_DEFS = [];
let CATEGORIES     = [];
let EXAMPLES       = [];
let _ARCH_RULES    = {};

async function _loadServerData() {
  try {
    const [compRes, rulesRes, exRes] = await Promise.all([
      fetch('/api/components'),
      fetch('/api/rules'),
      fetch('/api/examples'),
    ]);
    if (compRes.ok)  { const d = await compRes.json();  COMPONENT_DEFS = d.defs || [];  CATEGORIES = d.categories || []; }
    if (rulesRes.ok) { const d = await rulesRes.json(); _ARCH_RULES    = d.rules || {}; }
    if (exRes.ok)    { const d = await exRes.json();    EXAMPLES       = d.examples || []; }
  } catch (e) {
    console.warn('Failed to load server data, falling back to static imports', e);
    // Fallback for local dev without the server running
    try {
      const [cm, em, rm] = await Promise.all([
        import('./components.js'), import('./examples.js'), import('./rules.js')
      ]);
      COMPONENT_DEFS = cm.COMPONENT_DEFS || [];
      CATEGORIES     = cm.CATEGORIES     || [];
      EXAMPLES       = em.EXAMPLES       || [];
      _ARCH_RULES    = rm.ARCH_RULES     || {};
    } catch { console.error('Static import fallback also failed'); }
  }
}

function validateConnection(sourceDef, targetDef) {
  if (!sourceDef || !targetDef) return { ok: false, message: 'Unknown component type.' };
  const allowed = _ARCH_RULES[sourceDef] || [];
  if (allowed.includes(targetDef)) return { ok: true };
  if (targetDef === 'autoscaler' && ['appserver', 'vm', 'pod'].includes(sourceDef)) {
    return { ok: true, dashed: true };
  }
  return {
    ok: false,
    message: `${sourceDef} → ${targetDef} is not a standard architecture pattern.`
  };
}

// ══ STATE ════════════════════════════════════════════════════════════════════
let S = {
  nodes:   {},          // id → { id, defId, x, y, w:160, h:88, props }
  edges:   [],          // { id, src, tgt, animated, dashed }
  eFlow:   {},          // edgeId → req/s
  simLoad: {},          // nodeId → { incoming, capacity, loadPct, status, scaledCap?, replicas?, scaling? }
  sel:     null,        // selected node id
  selEdge: null,        // selected edge id
  zoom:    1,
  panX:    40,
  panY:    40,
  simOn:   false,
  simTick: null,
  simSpeed: (() => { try { return localStorage.getItem('archviz.simspeed') || 'normal'; } catch { return 'normal'; } })(),
  snapGrid: (() => { try { return localStorage.getItem('archviz.snap') !== 'off'; } catch { return true; } })(),
  theme: (() => {
    try {
      const saved = localStorage.getItem('archviz.theme');
      return ['system', 'light', 'dark'].includes(saved) ? saved : 'system';
    } catch { return 'system'; }
  })(),
  sidebarOpen: (() => { try { return localStorage.getItem('archviz.sidebar') !== 'closed'; } catch { return true; } })(),
  gridSize: 40,
  title: 'Untitled Architecture',
  suggestionsOn: (() => {
    try { return localStorage.getItem('archviz.suggestions') !== 'off'; }
    catch { return true; }
  })(),
  activeExample: '',
  hist:    [],
  histPos: -1,
  nSeq:    0,
  eSeq:    0,
  reservedPricing: (() => { try { return localStorage.getItem('archviz.reserved') === 'on'; } catch { return false; } })(),
  serviceMeshOn:   false,
};

// interaction
let G = {
  drag:        null,   // { id, sx, sy, ox, oy }
  pan:         null,   // { sx, sy, ox, oy }
  conn:        null,   // { srcId, srcSide } — active drag-connect or pending-click
  pendingConn: null,   // { srcId, srcSide } — click mode: waiting for target click
  dragDef:     null,   // defId being dragged from palette
  portDragStart: null, // { x, y } for distinguishing click vs drag on port
};

// DOM
const cWrap   = document.getElementById('canvas-wrap');
const cSvg    = document.getElementById('canvas-svg');
const cNodes  = document.getElementById('canvas-nodes');
const edgesG  = document.getElementById('edges-g');
const labelsG = document.getElementById('labels-g');
const particlesG = document.getElementById('particles-g');
const connPrev = document.getElementById('conn-preview');
const minimapSvg = document.getElementById('minimap-svg');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function snapVal(v) {
  return S.snapGrid ? Math.round(v / S.gridSize) * S.gridSize : v;
}

function clearPendingConn() {
  G.pendingConn = null;
  G.conn = null;
  G.portDragStart = null;
  connPrev.style.display = 'none';
  document.querySelectorAll('.port.pending-src').forEach(el => el.classList.remove('pending-src'));
}

function updateCanvasGrid() {
  const major = S.gridSize * S.zoom;
  const minor = Math.max(5, major / 4);
  const pos = `${S.panX}px ${S.panY}px`;
  cWrap.style.backgroundSize = `${minor}px ${minor}px, ${minor}px ${minor}px, ${major}px ${major}px, ${major}px ${major}px`;
  cWrap.style.backgroundPosition = `${pos}, ${pos}, ${pos}, ${pos}`;
}

function systemTheme() {
  try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

function effectiveTheme() {
  return S.theme === 'system' ? systemTheme() : S.theme;
}

const _THEME_ICONS = {
  system: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>',
  light:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  dark:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 7.5A8.5 8.5 0 1 1 12 3z"/></svg>',
};
function updateThemeButton() {
  const mode = S.theme;
  const eff = effectiveTheme();
  const titleStr = mode === 'system'
    ? `Using system theme (${eff}) — click for light`
    : mode === 'light' ? 'Light theme — click for dark' : 'Dark theme — click for system';
  // Update both the ··· menu button and the inline toolbar button
  ['btn-theme', 'btn-theme-toolbar'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('active', mode !== 'system');
    btn.title = titleStr;
    if (id === 'btn-theme') {
      btn.innerHTML = `${_THEME_ICONS[mode]}Theme: ${mode[0].toUpperCase()}${mode.slice(1)}`;
    } else {
      btn.innerHTML = _THEME_ICONS[mode];
    }
  });
}

function setTheme(theme) {
  S.theme = ['system', 'light', 'dark'].includes(theme) ? theme : 'system';
  const themeValue = effectiveTheme();
  document.body.dataset.theme = themeValue;
  document.documentElement.dataset.theme = themeValue;
  document.body.dataset.themeMode = S.theme;
  document.documentElement.dataset.themeMode = S.theme;
  try { localStorage.setItem('archviz.theme', S.theme); } catch {}
  updateThemeButton();
  updateCanvasGrid();
  renderAll();
}

function updateSnapButton() {
  const btn = document.getElementById('btn-snap');
  if (!btn) return;
  btn.classList.toggle('active', S.snapGrid);
  btn.title = S.snapGrid ? 'Snap to grid ON (G to toggle)' : 'Snap to grid OFF (G to toggle)';
}

function setSnapGrid(on) {
  S.snapGrid = !!on;
  try { localStorage.setItem('archviz.snap', S.snapGrid ? 'on' : 'off'); } catch {}
  updateSnapButton();
  updateCanvasGrid();
}

function updateSidebarToggle() {
  document.getElementById('body').classList.toggle('palette-collapsed', !S.sidebarOpen);
  const btn = document.getElementById('btn-sidebar-toggle');
  if (!btn) return;
  btn.title = S.sidebarOpen ? 'Hide component sidebar' : 'Show component sidebar';
  btn.setAttribute('aria-label', btn.title);
  btn.innerHTML = S.sidebarOpen
    ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
}

function setSidebarOpen(open) {
  S.sidebarOpen = !!open;
  try { localStorage.setItem('archviz.sidebar', S.sidebarOpen ? 'open' : 'closed'); } catch {}
  updateSidebarToggle();
  requestAnimationFrame(() => { renderAll(); updateCanvasGrid(); updateEmptyPanel(); });
}

function getDiagramTitle() {
  return document.getElementById('diagram-title')?.value || 'Untitled Architecture';
}

// ── Title input behaviour ─────────────────────────────────────────────────
(function wireTitleInput() {
  const inp = document.getElementById('diagram-title');
  const badge = document.getElementById('title-saved-badge');
  if (!inp) return;
  let _savedTimer = null;

  function flashSaved() {
    if (!badge) return;
    badge.classList.add('visible');
    clearTimeout(_savedTimer);
    _savedTimer = setTimeout(() => badge.classList.remove('visible'), 1800);
  }

  inp.addEventListener('input', () => {
    S.title = inp.value;
    document.title = (inp.value || 'Untitled') + ' — Archi-Flow';
    autoSave();
  });

  inp.addEventListener('blur', () => {
    if (!inp.value.trim()) inp.value = 'Untitled Architecture';
    S.title = inp.value;
    document.title = inp.value + ' — Archi-Flow';
    autoSave();
    flashSaved();
  });

  // Select all on focus for easy rename
  inp.addEventListener('focus', () => inp.select());

  // Confirm with Enter
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { inp.blur(); }
  });
})();

function setExampleSelect(id) {
  const sel = document.getElementById('example-sel');
  const idx = [...sel.options].findIndex(o => o.value === (id || ''));
  sel.selectedIndex = idx >= 0 ? idx : 0;
}

// ══ HISTORY ══════════════════════════════════════════════════════════════════
function snapshot() {
  const st = { nodes: JSON.parse(JSON.stringify(S.nodes)), edges: JSON.parse(JSON.stringify(S.edges)), activeExample: S.activeExample };
  S.hist = S.hist.slice(0, S.histPos + 1);
  S.hist.push(st); S.histPos++;
  if (S.hist.length > 60) { S.hist.shift(); S.histPos--; }
}
function undo() {
  if (S.histPos <= 0) return;
  S.histPos--;
  restore(S.hist[S.histPos]);
}
function redo() {
  if (S.histPos >= S.hist.length - 1) return;
  S.histPos++;
  restore(S.hist[S.histPos]);
}
function restore(st) {
  S.nodes = JSON.parse(JSON.stringify(st.nodes));
  S.edges = JSON.parse(JSON.stringify(st.edges));
  S.activeExample = st.activeExample || '';
  setExampleSelect(S.activeExample);
  S.sel = null; S.selEdge = null;
  renderAll(); updateStats(); updateCost(); showProps(null);
}

// ══ PALETTE ══════════════════════════════════════════════════════════════════
const CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

// which sections are expanded — all collapsed by default except first category
const openSections = new Set(['source']);

function makePalItem(def) {
  const el = document.createElement('div');
  el.className = 'pal-item'; el.draggable = true; el.dataset.defId = def.id;
  el.innerHTML = `<div class="pal-icon" style="background:${def.color}1a;box-shadow:inset 0 0 0 1px ${def.color}33">${def.icon}</div><div class="pal-text"><div class="name">${def.name}</div></div>`;
  el.addEventListener('dragstart', e => {
    G.dragDef = def.id;
    const gh = document.getElementById('drag-ghost');
    gh.innerHTML = `${def.icon} <span>${def.name}</span>`;
    gh.style.display = 'flex';
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  });
  return el;
}

// ── Collapsible pal-foot sections ────────────────────────────────────────
const PAL_FOOT_IDS = ['tips-section', 'legend-section'];
function togglePalFootSection(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  const willOpen = !sec.classList.contains('open');
  // Accordion: close all siblings first
  PAL_FOOT_IDS.forEach(otherId => {
    if (otherId === id) return;
    const other = document.getElementById(otherId);
    if (!other) return;
    other.classList.remove('open');
    const otherBtn = other.querySelector('.pal-foot-hdr');
    if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
    try { localStorage.setItem('archviz.palfoot.' + otherId, '0'); } catch {}
  });
  sec.classList.toggle('open', willOpen);
  const btn = sec.querySelector('.pal-foot-hdr');
  if (btn) btn.setAttribute('aria-expanded', String(willOpen));
  try { localStorage.setItem('archviz.palfoot.' + id, willOpen ? '1' : '0'); } catch {}
}
window.togglePalFootSection = togglePalFootSection;

function initPalFootSections() {
  ['tips-section', 'legend-section'].forEach(id => {
    const sec = document.getElementById(id);
    if (!sec) return;
    const btn = sec.querySelector('.pal-foot-hdr');
    if (btn) btn.addEventListener('click', () => togglePalFootSection(id));
    // Restore persisted open state
    try {
      if (localStorage.getItem('archviz.palfoot.' + id) === '1') {
        sec.classList.add('open');
        btn?.setAttribute('aria-expanded', 'true');
      }
    } catch {}
  });
}

function initPalette() {
  document.getElementById('pal-search').addEventListener('input', renderPalette);
  renderPalette();
  initPalFootSections();
}

function renderPalette() {
  const list = document.getElementById('pal-list');
  const q = document.getElementById('pal-search').value.toLowerCase().trim();
  list.innerHTML = '';

  if (q) {
    // Search mode: flat filtered list with category shown
    const wrap = document.createElement('div');
    wrap.className = 'pal-search-results';
    const matches = COMPONENT_DEFS.filter(c =>
      c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.includes(q)
    );
    if (matches.length === 0) {
      wrap.innerHTML = `<div style="padding:16px 8px;text-align:center;color:var(--muted);font-size:11px">No components match "${esc(q)}"</div>`;
    } else {
      matches.forEach(def => {
        const el = makePalItem(def);
        // show category in search results
        el.querySelector('.pal-text').innerHTML += `<div class="cat">${def.category}</div>`;
        wrap.appendChild(el);
      });
    }
    list.appendChild(wrap);
    return;
  }

  // Accordion mode: one section per category (skip "all")
  CATEGORIES.filter(c => c.id !== 'all').forEach(cat => {
    const defs = COMPONENT_DEFS.filter(c => c.category === cat.id);
    if (!defs.length) return;

    const section = document.createElement('div');
    section.className = 'pal-section' + (openSections.has(cat.id) ? ' open' : '');

    const header = document.createElement('div');
    header.className = 'pal-section-header';
    header.innerHTML = `
      <div class="pal-section-hicon" style="background:${defs[0].color}22">${cat.icon}</div>
      <span class="pal-section-label">${cat.label}</span>
      <span class="pal-section-count">${defs.length}</span>
      <span class="pal-section-chevron">${CHEVRON}</span>`;
    header.onclick = () => {
      const isOpen = section.classList.toggle('open');
      if (isOpen) openSections.add(cat.id); else openSections.delete(cat.id);
    };

    const body = document.createElement('div');
    body.className = 'pal-section-body';
    defs.forEach(def => body.appendChild(makePalItem(def)));

    section.appendChild(header);
    section.appendChild(body);
    list.appendChild(section);
  });
}

// ══ EXAMPLES ═════════════════════════════════════════════════════════════════
function initExamples() {
  const sel = document.getElementById('example-sel');
  EXAMPLES.forEach(ex => {
    const o = document.createElement('option');
    o.value = ex.id; o.textContent = ex.name + ' — ' + ex.description;
    sel.appendChild(o);
  });
  sel.onchange = () => { if (sel.value) loadExample(sel.value); };
}

function loadExample(id) {
  const ex = EXAMPLES.find(e => e.id === id); if (!ex) return;
  track('example_loaded', { example_id: id, example_name: ex.name || id });
  clearCanvas(true);
  S.activeExample = id;
  setExampleSelect(id);
  ex.nodes.forEach(n => {
    const def = COMPONENT_DEFS.find(d => d.id === n.data.defId);
    const num = parseInt(n.id.replace(/\D/g,'')) || 0;
    S.nSeq = Math.max(S.nSeq, num);
    S.nodes[n.id] = { id: n.id, defId: n.data.defId, x: n.position.x + 20, y: n.position.y + 20, w: def.size?.w || 160, h: def.size?.h || 88, props: { ...def.defaults, ...n.data.props } };
  });
  ex.edges.forEach(e => {
    const num = parseInt(e.id.replace(/\D/g,'')) || 0;
    S.eSeq = Math.max(S.eSeq, num);
    S.edges.push({ id: e.id, src: e.source, tgt: e.target, animated: e.animated !== false, dashed: !!(e.style?.strokeDasharray) });
  });
  snapshot(); renderAll(); updateStats(); updateCost();
  syncSlider(computeTotalRPS());
  document.getElementById('canvas-empty').style.display = 'none';
  setTimeout(fitView, 50);
}

// ══ NODE MANAGEMENT ═══════════════════════════════════════════════════════════
function addNode(defId, x, y) {
  snapshot();
  S.activeExample = '';
  setExampleSelect('');
  const def = COMPONENT_DEFS.find(d => d.id === defId);
  const id  = 'n' + (++S.nSeq);
  S.nodes[id] = { id, defId, x, y, w: def.size?.w || 160, h: def.size?.h || 88, props: { ...def.defaults } };
  track('node_added', { component_type: defId, component_name: def?.name || defId });
  autoSave();
  renderNode(id);
  // Pop-in animation for newly dropped nodes
  const newEl = document.getElementById('node-' + id);
  if (newEl) { newEl.classList.add('node-pop-in'); setTimeout(() => newEl.classList.remove('node-pop-in'), 400); }
  updateStats(); updateCost();
  document.getElementById('canvas-empty').style.display = 'none';
  return id;
}

function deleteNode(id) {
  const defId = S.nodes[id]?.defId;
  track('node_deleted', { component_type: defId });
  snapshot();
  delete S.nodes[id];
  S.edges = S.edges.filter(e => e.src !== id && e.tgt !== id);
  document.getElementById('node-' + id)?.remove();
  if (S.sel === id) { S.sel = null; showProps(null); }
  renderEdges(); updateStats(); updateCost(); buildSuggestions();
  if (!Object.keys(S.nodes).length) document.getElementById('canvas-empty').style.display = '';
}

// ══ NODE RENDER ═══════════════════════════════════════════════════════════════
const NODE_W = 160, NODE_H = 88;
const SOURCE_DEFS = new Set(['users', 'cdcsource', 'eventsource']);

function compactNum(value, digits = 1) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K']
  ];
  for (const [scale, suffix] of units) {
    if (abs >= scale) {
      const v = n / scale;
      const fixed = v >= 100 ? v.toFixed(0) : v.toFixed(digits);
      return fixed.replace(/\.0$/, '') + suffix;
    }
  }
  return String(Math.round(n));
}

function formatFlow(value, unit = 'e/s') {
  return `${compactNum(value)} ${unit}`;
}

function compactMoney(value) {
  return '$' + compactNum(value);
}

function nodeScreenPos(n) {
  return { x: n.x * S.zoom + S.panX, y: n.y * S.zoom + S.panY };
}

function renderNode(id) {
  const n = S.nodes[id]; if (!n) return;
  const def = COMPONENT_DEFS.find(d => d.id === n.defId);
  let el = document.getElementById('node-' + id);
  if (!el) {
    el = document.createElement('div');
    el.id = 'node-' + id;
    el.className = 'a-node';
    cNodes.appendChild(el);
    el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('port')) return;
      e.stopPropagation();
      // If clicking a node already in the multi-selection (without shift),
      // keep the group intact so the drag moves all of them.
      // Only re-select (and clear the group) if clicking outside current selection.
      if (!e.shiftKey && S.selSet.size > 1 && S.selSet.has(id)) {
        // just focus props on this node without disturbing the set
        S.sel = id;
      } else {
        select(id, e.shiftKey);
      }
      // Group drag: record start positions for all selected nodes
      const origins = {};
      S.selSet.forEach(nid => {
        const nd = S.nodes[nid];
        if (nd) origins[nid] = { ox: nd.x, oy: nd.y };
      });
      G.drag = { id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, group: origins };
    });
  }

  const { x, y } = nodeScreenPos(n);
  const sim   = S.simLoad[id];
  const pct   = sim?.loadPct ?? 0;
  const scl   = sim?.scaling;
  const sCls  = !S.simOn ? '' : scl ? 'status-scaling' : pct > 85 ? 'status-crit' : pct > 60 ? 'status-warn' : 'status-ok';

  // Note tone theming
  const TONE_THEME = {
    'Neutral':  { bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.35)',   accent: '#facc15', text: '#fef08a' },
    'Decision': { bg: 'rgba(90,167,255,0.09)',   border: 'rgba(90,167,255,0.38)',   accent: '#5aa7ff', text: '#bae0ff' },
    'Risk':     { bg: 'rgba(248,81,73,0.09)',    border: 'rgba(248,81,73,0.38)',    accent: '#f85149', text: '#fca5a5' },
    'TODO':     { bg: 'rgba(188,140,255,0.09)',  border: 'rgba(188,140,255,0.38)', accent: '#bc8cff', text: '#ddd6fe' },
    'SLA':      { bg: 'rgba(63,185,80,0.09)',    border: 'rgba(63,185,80,0.38)',    accent: '#3fb950', text: '#86efac' },
  };
  const noteCls = n.defId === 'textnote' ? ' note-node' : '';
  el.className = 'a-node ' + sCls + noteCls + (S.selSet.has(id) ? ' selected' : '');
  const baseColor = n.props._isReplica ? '#a855f7' : def.color;
  // Left-border color: load-aware during sim, component color at rest
  const borderColor = (S.simOn && sim && sim.status !== 'source')
    ? (pct > 85 ? '#f66060' : pct > 60 ? '#f5b731' : '#34d058')
    : baseColor;
  const w = n.w || 172;

  if (n.defId === 'textnote') {
    const tone = TONE_THEME[n.props.tone] || TONE_THEME['Neutral'];
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${n.h}px;transform:scale(${S.zoom});transform-origin:top left;background:${tone.bg};border-color:var(--node-border);border-left-color:${tone.accent};`;
  } else {
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${n.h}px;transform:scale(${S.zoom});transform-origin:top left;border-left-color:${borderColor};background:var(--node-bg);box-shadow:var(--node-shadow),inset 3px 0 22px ${baseColor}14;`;
  }

  const label = n.props.label || def.name;
  const safeLabel = esc(label);
  const safeType = esc(def.name);
  const safeIcon = def.icon;
  const barColor = pct > 85 ? '#f66060' : pct > 60 ? '#f5b731' : '#34d058';
  const accentColor = baseColor; // kept for icon bg usage

  // Badges
  let badges = '';
  if (n.props._isReplica) badges += `<span class="badge" style="background:#a855f722;color:#a855f7;border:1px solid #a855f744">📖 Read Replica</span>`;
  if (n.defId === 'users') badges += `<span class="badge badge-info">${esc(compactNum(n.props.userCount || 0))} users</span>`;
  if (n.defId === 'eventsource') badges += `<span class="badge badge-info">${esc(formatFlow(n.props.eventRate || 0))}</span>`;
  if (n.defId === 'deviceapp') badges += `<span class="badge badge-info">×${esc(n.props.eventsPerInput || 1)} emit</span>`;
  if (n.defId === 'cdcsource') badges += `<span class="badge badge-info">${esc(formatFlow(n.props.changeRate || 0, 'CDC/s'))}</span>`;
  if (S.simOn && sim) {
    if (scl) badges += `<span class="badge badge-scale">⚡ ×${esc(sim.replicas)}</span>`;
    if (n.props.autoScale && !scl) badges += `<span class="badge badge-info">AutoScale ✓</span>`;
    if (sim.coldStart) badges += `<span class="badge" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44">❄ Cold Start</span>`;
    if (sim.poolExhausted) badges += `<span class="badge badge-err">Pool Full</span>`;
    if ((sim.errorRate||0) > 0) badges += `<span class="badge badge-err">${sim.errorRate}% err</span>`;
    if (sim.latencyMs != null && n.defId !== 'textnote') badges += `<span class="badge badge-info">${sim.latencyMs}ms</span>`;
    if (n.defId === 'database' && n.props.readReplicas > 0 && !n.props._isReplica) {
      const vr = Object.values(S.nodes).filter(r => r.props._replicaOf === n.id).length;
      badges += `<span class="badge badge-info">+${esc(vr)} replicas</span>`;
    }
  } else {
    if (n.props.autoScale) badges += `<span class="badge badge-scale">AutoScale</span>`;
    if (n.defId === 'database' && n.props.readReplicas > 0 && !n.props._isReplica) {
      const vr = Object.values(S.nodes).filter(r => r.props._replicaOf === n.id).length;
      if (vr > 0) badges += `<span class="badge badge-info">+${esc(vr)} replicas</span>`;
    }
  }

  const noteAccent = n.defId === 'textnote' ? (TONE_THEME[n.props.tone] || TONE_THEME['Neutral']).accent : null;
  const noteToneLabel = n.defId === 'textnote' ? (n.props.tone || 'Neutral') : null;
  const noteTextColor = n.defId === 'textnote' ? 'var(--text)' : null;
  const toolName = n.defId === 'textnote' ? esc(noteToneLabel) : safeType;
  const toolTitle = n.defId === 'textnote' ? `Note type: ${esc(noteToneLabel)}` : `Tool: ${safeType}`;

  el.innerHTML = `
    <div class="node-accent" style="background:${n.defId === 'textnote' ? noteAccent : accentColor}"></div>
    <div class="node-body">
      <div class="node-header">
        <div class="node-icon-wrap" style="background:${n.defId === 'textnote' ? noteAccent + '22' : accentColor + '1e'};box-shadow:inset 0 0 0 1px ${n.defId === 'textnote' ? noteAccent : accentColor}33,0 2px 10px ${n.defId === 'textnote' ? noteAccent : accentColor}18">${safeIcon}</div>
        <div class="node-titles">
          <div class="node-label" title="${safeLabel}">${safeLabel}</div>
          <div class="node-type" title="${toolTitle}">
            <span class="node-tool-dot" style="background:${n.defId === 'textnote' ? noteAccent : accentColor}"></span>
            <span class="node-tool-name" ${n.defId === 'textnote' ? `style="color:${noteAccent}"` : ''}>${toolName}</span>
          </div>
        </div>
      </div>
      ${badges ? `<div class="node-badges">${badges}</div>` : ''}
      ${n.defId === 'textnote' ? `<div class="note-text" style="color:${noteTextColor}">${esc(n.props.text || '')}</div>` : ''}
    </div>
    ${S.simOn && sim && sim.loadPct > 0 ? `<div class="node-load-bar"><div class="node-load-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div></div>` : ''}
    ${n.defId === 'textnote' ? '' : `
      <div class="port port-r" data-node="${id}" data-side="r"></div>
      <div class="port port-l" data-node="${id}" data-side="l"></div>
      <div class="port port-t" data-node="${id}" data-side="t"></div>
      <div class="port port-b" data-node="${id}" data-side="b"></div>`}`;

  // Port events
  el.querySelectorAll('.port').forEach(p => {
    p.onmousedown = e => {
      e.stopPropagation();
      G.portDragStart = { x: e.clientX, y: e.clientY };

      // If there is already a pending click-connection, complete it on this port
      if (G.pendingConn) {
        if (G.pendingConn.srcId !== id) {
          addEdge(G.pendingConn.srcId, id, { userInitiated: true });
        }
        clearPendingConn();
        e.preventDefault();
        return;
      }

      // Start a new connection (drag or click)
      G.conn = { srcId: id, srcSide: p.dataset.side };
      connPrev.style.display = '';
    };

    p.onmouseenter = () => {
      if (G.conn && G.conn.srcId !== id) {
        const srcDef = S.nodes[G.conn.srcId]?.defId;
        const tgtDef = S.nodes[id]?.defId;
        const verdict = validateConnection(srcDef, tgtDef);
        p.classList.add(verdict.ok ? 'port-snap-valid' : 'port-snap-warn');
      }
    };
    p.onmouseleave = () => { p.classList.remove('port-snap-valid', 'port-snap-warn'); };

    p.onmouseup = e => {
      e.stopPropagation();
      p.classList.remove('port-snap-valid', 'port-snap-warn');
      if (!G.conn) return;

      const dist = G.portDragStart
        ? Math.hypot(e.clientX - G.portDragStart.x, e.clientY - G.portDragStart.y)
        : 999;
      G.portDragStart = null;

      if (G.conn.srcId !== id) {
        // Dragged from another port → complete edge
        addEdge(G.conn.srcId, id, { userInitiated: true });
        clearPendingConn();
      } else if (dist < 6) {
        // Clicked own port (not dragged) → enter pending click mode
        G.pendingConn = { srcId: id, srcSide: p.dataset.side };
        // Keep G.conn alive so preview line keeps following the cursor
        // Highlight the source port
        document.querySelectorAll('.port.pending-src').forEach(el => el.classList.remove('pending-src'));
        p.classList.add('pending-src');
      } else {
        // Dragged from own port but released on canvas → cancel
        clearPendingConn();
      }
    };
  });

  // Context menu
  el.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); select(id); _nodeContextMenu(id, e.clientX+4, e.clientY+4); };

  const labelEl = el.querySelector('.node-label');
  labelEl.ondblclick = e => {
    e.stopPropagation();
    beginLabelEdit(id, labelEl);
  };
}

function beginLabelEdit(id, labelEl) {
  const n = S.nodes[id]; if (!n) return;
  const input = document.createElement('input');
  input.className = 'node-label-input';
  input.value = n.props.label || '';
  labelEl.replaceWith(input);
  input.focus();
  input.select();
  input.onmousedown = e => e.stopPropagation();
  const commit = () => {
    const next = input.value.trim() || COMPONENT_DEFS.find(d => d.id === n.defId)?.name || 'Node';
    if (next !== n.props.label) {
      snapshot();
      n.props.label = next;
      if (S.sel === id) showProps(id);
    }
    renderNode(id);
    buildSuggestions();
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') renderNode(id);
  };
  input.onblur = commit;
}

// ── Region colors ─────────────────────────────────────────────────────────────
const REGION_PALETTE = {
  'us-east-1':      { border: 'rgba(79,156,249,0.35)',  bg: 'rgba(79,156,249,0.04)',  label: 'US East 1',      dot: '#4f9cf9' },
  'us-west-2':      { border: 'rgba(52,208,88,0.35)',   bg: 'rgba(52,208,88,0.04)',   label: 'US West 2',      dot: '#34d058' },
  'eu-west-1':      { border: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.04)', label: 'EU West 1',      dot: '#a78bfa' },
  'eu-central-1':   { border: 'rgba(232,121,249,0.35)', bg: 'rgba(232,121,249,0.04)', label: 'EU Central 1',   dot: '#e879f9' },
  'ap-southeast-1': { border: 'rgba(245,158,11,0.35)',  bg: 'rgba(245,158,11,0.04)',  label: 'AP Southeast 1', dot: '#f59e0b' },
  'ap-northeast-1': { border: 'rgba(251,113,133,0.35)', bg: 'rgba(251,113,133,0.04)', label: 'AP Northeast 1', dot: '#fb7185' },
  'global':         { border: 'rgba(100,116,139,0.3)',  bg: 'rgba(100,116,139,0.03)', label: 'Global',         dot: '#64748b' },
};
const PAD_REGION = 28;

function renderRegionGroups() {
  // Remove old region divs
  document.querySelectorAll('.region-group').forEach(e => e.remove());
  const nodesByRegion = {};
  Object.values(S.nodes).forEach(n => {
    const r = n.props?.region;
    if (!r || r === '' || n.defId === 'textnote') return;
    if (!nodesByRegion[r]) nodesByRegion[r] = [];
    nodesByRegion[r].push(n);
  });
  // Only show regions with 2+ nodes (single node regions are noisy)
  Object.entries(nodesByRegion).forEach(([region, nodes]) => {
    if (nodes.length < 1) return;
    const palette = REGION_PALETTE[region];
    if (!palette) return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    nodes.forEach(n => {
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+n.h);
    });
    const sx = minX*S.zoom+S.panX-PAD_REGION*S.zoom;
    const sy = minY*S.zoom+S.panY-PAD_REGION*S.zoom;
    const sw = (maxX-minX+PAD_REGION*2)*S.zoom;
    const sh = (maxY-minY+PAD_REGION*2)*S.zoom;
    const div = document.createElement('div');
    div.className = 'region-group';
    div.style.cssText = `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;border-color:${palette.border};background:${palette.bg};color:${palette.dot};`;
    div.innerHTML = `<span style="background:${palette.bg};border:1px solid ${palette.border};border-radius:4px;padding:2px 6px;">${esc(palette.label)}</span>`;
    cWrap.prepend(div);
  });
}

function renderAll() {
  cNodes.querySelectorAll('.a-node').forEach(el => {
    if (!S.nodes[el.id.replace('node-', '')]) el.remove();
  });
  Object.keys(S.nodes).forEach(id => renderNode(id));
  renderEdges();
  renderRegionGroups();
  renderMiniMap();
}

function renderMiniMap() {
  if (!minimapSvg) return;
  const ids = Object.keys(S.nodes);
  minimapSvg.innerHTML = '';
  if (!ids.length) return;

  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  ids.forEach(id => {
    const n = S.nodes[id];
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  });
  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const vw = 170, vh = 76;
  const scale = Math.min(vw / bw, vh / bh);
  const ox = (vw - bw * scale) / 2;
  const oy = (vh - bh * scale) / 2;
  const sx = x => ox + (x - minX) * scale;
  const sy = y => oy + (y - minY) * scale;

  // Edges — color by sim status
  S.edges.forEach(e => {
    const a = S.nodes[e.src], b = S.nodes[e.tgt];
    if (!a || !b) return;
    const tgtSim = S.simLoad[e.tgt];
    const edgeColor = S.simOn && tgtSim
      ? (tgtSim.loadPct > 85 ? 'rgba(248,81,73,0.7)' : tgtSim.loadPct > 60 ? 'rgba(245,183,49,0.65)' : 'rgba(52,208,88,0.55)')
      : 'rgba(79,156,249,0.25)';
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', sx(a.x + a.w / 2)); line.setAttribute('y1', sy(a.y + a.h / 2));
    line.setAttribute('x2', sx(b.x + b.w / 2)); line.setAttribute('y2', sy(b.y + b.h / 2));
    line.setAttribute('stroke', edgeColor);
    line.setAttribute('stroke-width', e.dashed ? '0.5' : '1');
    if (e.dashed) line.setAttribute('stroke-dasharray', '2,2');
    minimapSvg.appendChild(line);
  });

  // Nodes — color by sim status, rounded rects
  ids.forEach(id => {
    const n = S.nodes[id];
    const def = COMPONENT_DEFS.find(d => d.id === n.defId);
    const sim = S.simLoad[id];
    // Border color = sim status; fill = component color (dimmed)
    const borderColor = S.simOn && sim && sim.status !== 'source'
      ? (sim.loadPct > 85 ? '#f85149' : sim.loadPct > 60 ? '#f5b731' : '#34d058')
      : (def?.color || '#58a6ff');
    const fillColor = (def?.color || '#58a6ff') + '40'; // 25% opacity
    const isSelected = S.sel === id;
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', sx(n.x) + 0.5); rect.setAttribute('y', sy(n.y) + 0.5);
    rect.setAttribute('width', Math.max(5, n.w * scale - 1));
    rect.setAttribute('height', Math.max(4, n.h * scale - 1));
    rect.setAttribute('rx', '2');
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('stroke', isSelected ? '#58a6ff' : borderColor);
    rect.setAttribute('stroke-width', isSelected ? '1.5' : '1');
    minimapSvg.appendChild(rect);
  });

  const canvasRect = cWrap.getBoundingClientRect();
  const viewX = (-S.panX) / S.zoom;
  const viewY = (-S.panY) / S.zoom;
  const viewW = canvasRect.width / S.zoom;
  const viewH = canvasRect.height / S.zoom;
  const view = document.createElementNS('http://www.w3.org/2000/svg','rect');
  view.setAttribute('class', 'mini-view');
  view.setAttribute('x', sx(viewX));
  view.setAttribute('y', sy(viewY));
  view.setAttribute('width', Math.max(6, viewW * scale));
  view.setAttribute('height', Math.max(5, viewH * scale));
  minimapSvg.appendChild(view);
}

// ══ EDGE MANAGEMENT ══════════════════════════════════════════════════════════
function addEdge(src, tgt, opts = {}) {
  if (S.edges.find(e => e.src === src && e.tgt === tgt)) return;
  const srcNode = S.nodes[src];
  const tgtNode = S.nodes[tgt];
  const verdict = validateConnection(srcNode?.defId, tgtNode?.defId);
  // Always connect when the user explicitly drags/clicks ports,
  // but flag the edge as an architectural warning so it renders differently.
  if (!opts.skipRules && !opts.userInitiated && !verdict.ok) {
    pushToast(verdict.message, 'warn');
    return;
  }
  const hasWarn = !verdict.ok && !opts.skipRules;
  if (hasWarn) {
    // Show warning in notification bell with details
    pushToast(`⚠️ Unusual connection: ${verdict.message} (edge created anyway)`, 'warn');
  }
  const isDash  = srcNode?.defId === 'autoscaler' || opts.dashed || verdict.dashed;
  snapshot();
  S.activeExample = '';
  setExampleSelect('');
  const newEdge = { id: 'e' + (++S.eSeq), src, tgt, animated: !isDash, dashed: isDash, _new: true, _warn: hasWarn };
  S.edges.push(newEdge);
  track('edge_created', { source_type: srcNode?.defId, target_type: tgtNode?.defId, is_dashed: isDash, has_warn: hasWarn });
  autoSave();
  renderEdges(); updateStats();
  setTimeout(() => { newEdge._new = false; }, 500);
}

function deleteEdge(id) {
  snapshot();
  S.edges = S.edges.filter(e => e.id !== id);
  if (S.selEdge === id) S.selEdge = null;
  renderEdges(); updateStats();
}

function pushToast(message, type = 'info') {
  addNotification(message, type);
}

// ── Notification panel ────────────────────────────────────────────────
let _notifCount = 0;

function addNotification(message, type = 'info', title = null) {
  const list = document.getElementById('notif-list');
  const empty = document.getElementById('notif-empty');
  if (!list) return;
  if (empty) empty.style.display = 'none';

  const icon = type === 'warn' ? '⚠️' : type === 'crit' || type === 'error' ? '🔴' : 'ℹ️';
  const cls  = type === 'error' ? 'crit' : type;

  const card = document.createElement('div');
  card.className = `notif-card ${cls}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  card.innerHTML = `
    <div class="notif-card-icon">${icon}</div>
    <div class="notif-card-body">
      ${title ? `<div class="notif-card-title">${esc(title)}</div>` : ''}
      <div class="notif-card-msg">${esc(message)}</div>
      <div class="notif-card-time">${timeStr}</div>
    </div>
    <button class="notif-card-close" title="Dismiss">×</button>`;

  card.querySelector('.notif-card-close').onclick = () => {
    card.style.opacity = '0';
    card.style.transform = 'translateX(12px)';
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => { card.remove(); _updateNotifBadge(); }, 200);
  };

  list.prepend(card);
  _notifCount++;
  _updateNotifBadge();
}

function _updateNotifBadge() {
  const list  = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  const empty = document.getElementById('notif-empty');
  if (!list || !badge) return;
  const count = list.querySelectorAll('.notif-card').length;
  _notifCount = count;
  if (count === 0) {
    badge.style.display = 'none';
    if (empty) empty.style.display = '';
  } else {
    badge.style.display = '';
    badge.textContent = count > 99 ? '99+' : String(count);
  }
}

function _openNotifPanel() {
  document.getElementById('notif-panel')?.classList.add('open');
  document.getElementById('notif-backdrop')?.classList.add('visible');
}

function _closeNotifPanel() {
  document.getElementById('notif-panel')?.classList.remove('open');
  document.getElementById('notif-backdrop')?.classList.remove('visible');
}

function _initNotifPanel() {
  document.getElementById('btn-notif')?.addEventListener('click', e => {
    e.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (panel?.classList.contains('open')) _closeNotifPanel();
    else _openNotifPanel();
  });
  document.getElementById('notif-close')?.addEventListener('click', _closeNotifPanel);
  document.getElementById('notif-backdrop')?.addEventListener('click', _closeNotifPanel);
  document.getElementById('notif-clear-all')?.addEventListener('click', () => {
    const list = document.getElementById('notif-list');
    list?.querySelectorAll('.notif-card').forEach(c => c.remove());
    _updateNotifBadge();
  });
}
_initNotifPanel();

// ══ PORT POSITIONS ════════════════════════════════════════════════════════════
function portXY(nodeId, side) {
  const port = document.querySelector(`#node-${CSS.escape(nodeId)} .port-${side}`);
  if (port) {
    const pr = port.getBoundingClientRect();
    const cr = cWrap.getBoundingClientRect();
    return { x: pr.left - cr.left + pr.width / 2, y: pr.top - cr.top + pr.height / 2 };
  }
  const n = S.nodes[nodeId]; if (!n) return { x: 0, y: 0 };
  const sx = n.x * S.zoom + S.panX;
  const sy = n.y * S.zoom + S.panY;
  const w  = n.w * S.zoom;
  const h  = n.h * S.zoom;
  const cx = sx + w / 2, cy = sy + h / 2;
  if (side === 'r') return { x: sx + w, y: cy };
  if (side === 'l') return { x: sx,     y: cy };
  if (side === 't') return { x: cx,     y: sy };
  if (side === 'b') return { x: cx,     y: sy + h };
  return { x: cx, y: cy };
}

function bestSides(srcId, tgtId) {
  const s = S.nodes[srcId], t = S.nodes[tgtId];
  if (!s || !t) return { ss: 'r', ts: 'l' };
  const scx = s.x + s.w/2, scy = s.y + s.h/2;
  const tcx = t.x + t.w/2, tcy = t.y + t.h/2;
  const dx = tcx - scx, dy = tcy - scy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { ss:'r', ts:'l' } : { ss:'l', ts:'r' };
  } else {
    return dy >= 0 ? { ss:'b', ts:'t' } : { ss:'t', ts:'b' };
  }
}

// ss/ts = source/target port side: 'r','l','t','b'
// Control point distance scales with actual screen distance so curves stay natural at any zoom
function bezier(x1,y1,x2,y2,ss,ts) {
  const dist = Math.hypot(x2-x1, y2-y1) * 0.4;
  const sideOff = { r:[dist,0], l:[-dist,0], b:[0,dist], t:[0,-dist] };
  const [o1x,o1y] = sideOff[ss] || [dist,0];
  const [o2x,o2y] = sideOff[ts] || [-dist,0];
  return `M${x1},${y1} C${x1+o1x},${y1+o1y} ${x2+o2x},${y2+o2y} ${x2},${y2}`;
}

// ══ EDGE RENDER ═══════════════════════════════════════════════════════════════
function edgeStatus(srcId, tgtId) {
  if (!S.simOn) return { cls:'edge-idle', marker:'arr' };
  // Color by target load — edge is red/yellow only if the destination is stressed
  const tgt = S.simLoad[tgtId];
  if (tgt && tgt.status !== 'source') {
    if (tgt.loadPct > 85) return { cls:'edge-crit', marker:'arr-crit' };
    if (tgt.loadPct > 60) return { cls:'edge-warn', marker:'arr-warn' };
  }
  return { cls:'edge-ok', marker:'arr-ok' };
}

function renderEdges() {
  edgesG.innerHTML = '';
  labelsG.innerHTML = '';
  particlesG.innerHTML = '';
  // Scale visual elements proportionally with zoom — same visual size as node labels
  const z = S.zoom;
  // Edge stroke: thin at zoom-out, proportional at zoom-in
  const strokeW = Math.max(0.5, Math.min(1.8, 1.2 * z));
  // Label font: slightly smaller than node-label so it's subordinate; no floor so it naturally disappears at low zoom
  const labelFs = Math.round(10 * z);
  // Pill: compact proportions
  const pillH  = Math.max(8, Math.round(labelFs * 1.6));
  const pillRx = Math.round(pillH / 2);
  const labelScale = z; // keep for stroke-width calcs
  S.edges.forEach(edge => {
    const { ss, ts } = bestSides(edge.src, edge.tgt);
    const s = portXY(edge.src, ss);
    const t = portXY(edge.tgt, ts);
    const sn = S.nodes[edge.src], tn = S.nodes[edge.tgt];
    if (!sn || !tn) return;
    const d = bezier(s.x,s.y,t.x,t.y,ss,ts);
    const { cls, marker } = edgeStatus(edge.src, edge.tgt);
    const isSelected = S.selEdge === edge.id;

    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','edge-group');
    g.dataset.edgeId = edge.id;

    // Invisible wide hit area
    const hit = document.createElementNS('http://www.w3.org/2000/svg','path');
    hit.setAttribute('class','edge-hit');
    hit.setAttribute('d',d);
    hit.style.pointerEvents = 'stroke';
    hit.style.cursor = 'pointer';
    hit.onclick = e => { e.stopPropagation(); selectEdge(edge.id); };
    // Hover tooltip showing traffic info
    hit.addEventListener('mouseenter', () => {
      const flow = S.eFlow[edge.id] || 0;
      const pctVal = edge.trafficPct != null ? edge.trafficPct : null;
      let tip = `${S.nodes[edge.src]?.props?.label || edge.src} → ${S.nodes[edge.tgt]?.props?.label || edge.tgt}`;
      if (edge._warn) tip += '\n⚠️ Unusual architecture pattern';
      if (S.simOn && flow > 0) tip += `\n${formatFlow(flow)}`;
      if (pctVal != null) tip += `  ${pctVal}%`;
      hit.setAttribute('title', tip);
    });
    g.appendChild(hit);

    // Visual path
    const vis = document.createElementNS('http://www.w3.org/2000/svg','path');
    vis.setAttribute('id', 'edge-path-' + edge.id);
    const animClass = edge._warn ? '' : (edge.dashed ? 'edge-dash' : (S.simOn && edge.animated ? 'edge-anim' : ''));
    const newClass  = edge._new ? 'edge-draw-in' : '';
    vis.setAttribute('class', `edge-vis ${animClass} ${newClass} ${isSelected ? 'edge-ok' : cls}`);
    vis.setAttribute('d', d);
    vis.setAttribute('stroke-width', String(strokeW));
    vis.setAttribute('marker-end', `url(#${isSelected ? 'arr-blue' : marker})`);
    if (edge._warn && !isSelected) { vis.style.stroke = '#f5b731'; vis.style.strokeDasharray = '5,4'; vis.style.opacity = '0.85'; }
    if (edge.replication) { vis.style.stroke = '#a855f7'; vis.style.strokeWidth = String(strokeW * 0.9); vis.style.opacity = '0.7'; vis.style.filter = 'drop-shadow(0 0 4px rgba(168,85,247,0.5))'; }
    if (isSelected) { vis.style.stroke = '#58a6ff'; vis.style.strokeWidth = String(Math.min(2.8, strokeW * 1.4)); vis.style.filter = 'drop-shadow(0 0 6px rgba(88,166,255,0.7))'; }
    // Service mesh: color edges by circuit breaker state based on target load
    if (S.serviceMeshOn && S.simOn) {
      const tgtSim = S.simLoad[edge.tgt];
      if (tgtSim) {
        const meshColor = tgtSim.loadPct > 85 ? '#f85149' : tgtSim.loadPct > 60 ? '#f5b731' : '#34d058';
        if (!isSelected) { vis.style.stroke = meshColor; vis.style.opacity = '0.85'; }
      }
    }
    g.appendChild(vis);

    // Delete button at midpoint
    const mx = (s.x + t.x) / 2 + (s.y !== t.y ? (t.x-s.x)*0.1 : 0);
    const my = (s.y + t.y) / 2 + (s.x !== t.x ? (t.y-s.y)*0.1 : 0) - 10;

    const delG = document.createElementNS('http://www.w3.org/2000/svg','g');
    delG.setAttribute('class','edge-del-btn');
    delG.setAttribute('transform', `translate(${mx},${my})`);
    delG.onclick = e => { e.stopPropagation(); deleteEdge(edge.id); };
    const delBg = document.createElementNS('http://www.w3.org/2000/svg','circle');
    delBg.setAttribute('r','8'); delBg.setAttribute('fill','#1c2128'); delBg.setAttribute('stroke','#f85149'); delBg.setAttribute('stroke-width','1.5');
    const delTxt = document.createElementNS('http://www.w3.org/2000/svg','text');
    delTxt.setAttribute('text-anchor','middle'); delTxt.setAttribute('dominant-baseline','middle');
    delTxt.setAttribute('font-size','11'); delTxt.setAttribute('fill','#f85149'); delTxt.textContent = '×';
    delG.appendChild(delBg); delG.appendChild(delTxt);
    g.appendChild(delG);
    edgesG.appendChild(g);

    // Warning badge for unusual connections
    if (edge._warn && z >= 0.4) {
      const wx = (s.x + t.x) / 2, wy = (s.y + t.y) / 2 - 16;
      const warnG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      warnG.setAttribute('transform', `translate(${wx},${wy})`);
      warnG.style.cursor = 'pointer';
      warnG.setAttribute('title', 'Unusual architecture pattern');
      const wBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      wBg.setAttribute('x','-10'); wBg.setAttribute('y','-9'); wBg.setAttribute('width','20'); wBg.setAttribute('height','16'); wBg.setAttribute('rx','4');
      wBg.setAttribute('fill','rgba(245,183,49,0.18)'); wBg.setAttribute('stroke','#f5b731'); wBg.setAttribute('stroke-width','1');
      const wTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      wTxt.setAttribute('text-anchor','middle'); wTxt.setAttribute('dominant-baseline','middle');
      wTxt.setAttribute('font-size','11'); wTxt.setAttribute('fill','#f5b731'); wTxt.textContent = '⚠';
      warnG.appendChild(wBg); warnG.appendChild(wTxt);
      labelsG.appendChild(warnG);
    }

    // Traffic % label (shown even when sim is off, if set)
    const hasPct = edge.trafficPct != null;
    if (hasPct && !S.simOn && z >= 0.4) {
      const midX = (s.x + t.x) / 2;
      const midY = (s.y + t.y) / 2;
      const liftY = Math.round(14 * z);
      const lx = midX, ly = midY - liftY;
      const pctLabel = edge.trafficPct + '%';
      const charW = labelFs * 0.62;
      const tw = Math.max(labelFs * 2.4, pctLabel.length * charW) + labelFs * 1.2;
      const halfH = pillH / 2;
      const bg2 = document.createElementNS('http://www.w3.org/2000/svg','rect');
      bg2.setAttribute('x', lx - tw/2); bg2.setAttribute('y', ly - halfH);
      bg2.setAttribute('width', tw); bg2.setAttribute('height', pillH); bg2.setAttribute('rx', pillRx);
      bg2.setAttribute('fill', 'rgba(8,12,17,0.78)'); bg2.setAttribute('stroke', '#4f9cf9');
      bg2.setAttribute('stroke-width', String(Math.max(0.4, labelScale * 0.7)));
      labelsG.appendChild(bg2);
      const txt2 = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt2.setAttribute('x', lx); txt2.setAttribute('y', ly + 0.5);
      txt2.setAttribute('class','flow-pill-txt');
      txt2.setAttribute('text-anchor','middle'); txt2.setAttribute('dominant-baseline','middle');
      txt2.setAttribute('fill', '#4f9cf9'); txt2.setAttribute('font-size', String(labelFs));
      txt2.setAttribute('font-weight', '700'); txt2.textContent = pctLabel;
      labelsG.appendChild(txt2);
    }

    // Flow label
    const flow = S.eFlow[edge.id];
    if (S.simOn && !edge._warn && (flow > 0 || hasPct) && !edge.dashed && z >= 0.4) {
      // Label sits ABOVE the edge midpoint — clear vertical separation from the line
      const midX = (s.x * 0.5 + t.x * 0.5);
      const midY = (s.y * 0.5 + t.y * 0.5);
      // Lift scales with zoom so label stays proportionally positioned
      const liftY = Math.round(14 * z);
      const lx = midX;
      const ly = midY - liftY;
      // At lower zoom use compact label (number only); at higher zoom show full label
      const flowBase = flow > 0 ? formatFlow(flow) : '';
      const flowLabel = hasPct && z >= 0.75 ? (flowBase ? `${edge.trafficPct}% · ${flowBase}` : `${edge.trafficPct}%`) : flowBase || (hasPct ? `${edge.trafficPct}%` : '0');
      const charW = labelFs * 0.62;
      const tw = Math.max(labelFs * 3.2, flowLabel.length * charW) + labelFs * 1.4;
      const pillColor = cls === 'edge-crit' ? '#f85149' : cls === 'edge-warn' ? '#f0a732' : '#3fb950';
      // Solid dark background — always readable regardless of edge color beneath
      const halfH = pillH / 2;
      const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
      bg.setAttribute('x', lx - tw/2); bg.setAttribute('y', ly - halfH);
      bg.setAttribute('width', tw); bg.setAttribute('height', pillH); bg.setAttribute('rx', pillRx);
      bg.setAttribute('fill', 'rgba(8,12,17,0.88)');           // solid dark, never transparent
      bg.setAttribute('stroke', pillColor);
      bg.setAttribute('stroke-width', String(Math.max(0.4, labelScale * 0.7)));
      labelsG.appendChild(bg);
      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', lx); txt.setAttribute('y', ly + 0.5);
      txt.setAttribute('class','flow-pill-txt');
      txt.setAttribute('text-anchor','middle'); txt.setAttribute('dominant-baseline','middle');
      txt.setAttribute('fill', pillColor);
      txt.setAttribute('font-size', String(labelFs));
      txt.setAttribute('font-weight', '700');
      txt.textContent = flowLabel;
      labelsG.appendChild(txt);

      // Particles: only show when zoomed in enough and only for valid flow edges
      if (!edge._warn) {
        const particleColor = cls === 'edge-crit' ? '#f85149' : cls === 'edge-warn' ? '#f0a732' : '#4f9cf9';
        // Max 2 particles per edge — more than that is visual noise
        const count = z < 0.35 ? 0 : Math.max(1, Math.min(2, Math.ceil(flow / 800)));
        const dur = Math.max(1.8, 4.0 - Math.min(flow, 1600) / 800);
        for (let i = 0; i < count; i++) {
          const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
          dot.setAttribute('class', 'flow-particle');
          // Small crisp dots — readable without overwhelming the edge
          const baseR = 2.8;
          dot.setAttribute('r', String(Math.max(1.0, baseR * Math.max(0.45, z))));
          dot.setAttribute('fill', particleColor);
          dot.style.color = particleColor;
          const anim = document.createElementNS('http://www.w3.org/2000/svg','animateMotion');
          anim.setAttribute('dur', dur + 's');
          anim.setAttribute('begin', (i * dur / count).toFixed(2) + 's');
          anim.setAttribute('repeatCount', 'indefinite');
          anim.setAttribute('rotate', 'auto');
          const mpath = document.createElementNS('http://www.w3.org/2000/svg','mpath');
          mpath.setAttributeNS('http://www.w3.org/1999/xlink','href', '#edge-path-' + edge.id);
          mpath.setAttribute('href', '#edge-path-' + edge.id);
          anim.appendChild(mpath);
          dot.appendChild(anim);
          particlesG.appendChild(dot);
        }
      }
    }
  });
}

// ══ SELECTION ════════════════════════════════════════════════════════════════
// S.selSet — multi-select set (Set of node ids). S.sel is still single-focus for props panel.
if (!S.selSet) S.selSet = new Set();

function select(id, addToSet) {
  if (addToSet) {
    // Shift+click: toggle in the multi-select set
    if (S.selSet.has(id)) { S.selSet.delete(id); }
    else { S.selSet.add(id); }
    S.sel = id; S.selEdge = null;
  } else {
    // Normal click: clear set, select just this one
    S.selSet.clear();
    S.selSet.add(id);
    S.sel = id; S.selEdge = null;
  }
  renderAll(); showProps(id);
}

function selectEdge(id) {
  S.selEdge = id; S.sel = null;
  renderAll(); showEdgeProps(id);
}

// ── Edge properties panel ─────────────────────────────────────────────────────
function showEdgeProps(id) {
  const panel = document.getElementById('props-panel');
  const empty = document.getElementById('props-empty');
  const cont  = document.getElementById('props-content');
  const econt = document.getElementById('edge-props-content');
  if (!id) {
    if (econt) { econt.style.display = 'none'; econt.innerHTML = ''; }
    panel.classList.add('collapsed');
    empty.style.display = ''; cont.classList.remove('show');
    updateEmptyPanel(); return;
  }
  const edge = S.edges.find(e => e.id === id);
  if (!edge) { showEdgeProps(null); return; }
  panel.classList.remove('collapsed');
  empty.style.display = 'none';
  cont.classList.remove('show');
  if (econt) { econt.style.display = 'flex'; _renderEdgePanel(edge); }
}

function _renderEdgePanel(edge) {
  const econt = document.getElementById('edge-props-content');
  if (!econt) return;
  const srcNode = S.nodes[edge.src], tgtNode = S.nodes[edge.tgt];
  const srcDef  = COMPONENT_DEFS.find(d => d.id === srcNode?.defId);
  const tgtDef  = COMPONENT_DEFS.find(d => d.id === tgtNode?.defId);
  const srcLabel = srcNode?.props?.label || srcDef?.name || edge.src;
  const tgtLabel = tgtNode?.props?.label || tgtDef?.name || edge.tgt;
  const flow = S.eFlow[edge.id];
  const flowStr = S.simOn && flow > 0 ? formatFlow(flow) : null;
  const pctVal  = edge.trafficPct != null ? edge.trafficPct : '';
  econt.innerHTML = `
    <div class="props-head">
      <div class="props-head-icon" style="background:#1f6feb22">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/><path d="M15 8l4 4-4 4"/></svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="props-head-title">Connection</div>
        <div class="props-head-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(srcLabel)} → ${esc(tgtLabel)}</div>
      </div>
    </div>
    <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;flex:1;overflow-y:auto">
      <div class="section-title" style="margin:-4px -2px 2px">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        Traffic Routing
      </div>
      <div class="prop-row">
        <div class="prop-lbl">Traffic %</div>
        <input id="edge-traffic-pct" class="prop-inp" type="number" min="0" max="100" step="1" value="${esc(String(pctVal))}" placeholder="Auto"/>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:-4px;line-height:1.4">Set an explicit split for this connection. Blank connections share the remaining traffic. If no split is set, traffic is divided equally.</div>
      ${flowStr ? `
      <div style="background:rgba(79,156,249,0.07);border:1px solid rgba(79,156,249,0.2);border-radius:8px;padding:10px 12px;margin-top:4px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Live Flow</div>
        <div style="font-size:18px;font-weight:800;color:#4f9cf9;letter-spacing:-.02em">${esc(flowStr)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${Math.round(outgoingSplitPercent(edge) * 10) / 10}% effective upstream split</div>
      </div>` : ''}
    </div>
    <div style="padding:10px 14px;border-top:1px solid var(--border)">
      <button class="btn-del" id="btn-del-edge-panel">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        Delete Connection
      </button>
    </div>`;
  const pctInp = document.getElementById('edge-traffic-pct');
  if (pctInp) {
    pctInp.oninput = () => {
      const raw = pctInp.value.trim();
      edge.trafficPct = raw === '' ? null : Math.max(0, Math.min(100, parseFloat(raw) || 0));
      renderEdges();
      if (S.simOn) runTick();
      snapshot();
    };
  }
  const delBtn = document.getElementById('btn-del-edge-panel');
  if (delBtn) delBtn.onclick = () => deleteEdge(edge.id);
}

function deselect() {
  S.sel = null; S.selEdge = null;
  S.selSet.clear();
  renderAll(); showProps(null); showEdgeProps(null);
}

// ══ PROPERTIES PANEL ══════════════════════════════════════════════════════════
// Track which sections are collapsed
const sectionState = { props: false, scale: false, sim: false };
function toggleSection(key) {
  sectionState[key] = !sectionState[key];
  const title = document.getElementById(`sec-${key}-title`) || document.getElementById('sim-section-title');
  const body  = document.getElementById(`sec-${key}-body`);
  if (!body) return;
  const open = !sectionState[key];
  // Animate max-height for smooth collapse
  body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
  body.classList.toggle('collapsed', !open);
  if (title) title.classList.toggle('collapsed', !open);
  // After open animation, remove explicit max-height so content can grow
  if (open) { setTimeout(() => { body.style.maxHeight = ''; }, 240); }
}
// Init section bodies with maxHeight so CSS transition works
function initSections() {
  ['props','scale','sim'].forEach(k => {
    const b = document.getElementById(`sec-${k}-body`);
    if (b) b.style.maxHeight = '';
  });
}

function showProps(id) {
  const panel = document.getElementById('props-panel');
  const empty = document.getElementById('props-empty');
  const cont  = document.getElementById('props-content');
  const econt = document.getElementById('edge-props-content');
  if (econt) { econt.style.display = 'none'; econt.innerHTML = ''; }
  // Multi-select summary
  if (S.selSet.size > 1) {
    panel.classList.remove('collapsed');
    empty.style.display = 'none'; cont.classList.remove('show');
    let ms = document.getElementById('multisel-panel');
    if (!ms) { ms = document.createElement('div'); ms.id = 'multisel-panel'; panel.appendChild(ms); }
    ms.style.display = '';
    ms.innerHTML = `<div class="multisel-summary">
      <div class="multisel-icon">⊞</div>
      <div class="multisel-count">${S.selSet.size} nodes selected</div>
      <div class="multisel-hint">Drag to move · Delete to remove · ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+D to duplicate</div>
      <button class="multisel-desel-btn" id="multisel-desel">Deselect all</button>
    </div>`;
    document.getElementById('multisel-desel').onclick = deselect;
    return;
  } else {
    const ms = document.getElementById('multisel-panel');
    if (ms) ms.style.display = 'none';
  }
  if (!id || !S.nodes[id]) {
    panel.classList.add('collapsed');
    empty.style.display = ''; cont.classList.remove('show'); updateEmptyPanel(); return;
  }
  panel.classList.remove('collapsed');
  const n   = S.nodes[id];
  const def = COMPONENT_DEFS.find(d => d.id === n.defId);
  empty.style.display = 'none'; cont.classList.add('show');

  document.getElementById('ph-icon').style.background = def.color + '22';
  document.getElementById('ph-icon').innerHTML = def.icon;
  document.getElementById('ph-title').textContent = def.name;
  document.getElementById('ph-desc').textContent  = def.description;

  // Properties
  buildFields('props-fields', def.properties, n, id);

  // Auto-scale section
  const asSection = document.getElementById('autoscale-section');
  if (def.scaleProps) {
    asSection.style.display = '';
    buildFields('autoscale-fields', def.scaleProps, n, id);
  } else {
    asSection.style.display = 'none';
  }

  refreshSimStats(id);
}

const COMPUTE_CATS = new Set(['compute','network']);
function _reservedDiscount(cat) { return S.reservedPricing && COMPUTE_CATS.has(cat) ? 0.65 : 1; }

function _costBreakdownHtml() {
  const costNodes = Object.values(S.nodes).filter(n => !n.props?._isReplica && Number(n.props?.cost) > 0);
  if (!costNodes.length) return '';
  const byCategory = {};
  costNodes.forEach(n => {
    const def = COMPONENT_DEFS.find(d => d.id === n.defId);
    const cat = def?.category || 'other';
    const rawCost = Number(n.props.cost) * _reservedDiscount(cat);
    byCategory[cat] = (byCategory[cat] || 0) + rawCost;
  });
  const total = Object.values(byCategory).reduce((s,v)=>s+v, 0);
  // Egress cost estimate from sim flow
  let egressCost = 0;
  if (S.simOn && Object.keys(S.eFlow).length) {
    S.edges.forEach(e => {
      const flow = S.eFlow[e.id];
      if (!flow) return;
      const srcNode = S.nodes[e.src], tgtNode = S.nodes[e.tgt];
      if (!srcNode || !tgtNode) return;
      // Estimate payload 5KB per req, 730hr/mo → GB/mo
      const gbPerMonth = flow * 5 * 1024 * 3600 * 730 / (1024 * 1024 * 1024 * 1024);
      egressCost += gbPerMonth * 0.09; // $0.09/GB AWS egress
    });
    egressCost = Math.round(egressCost * 100) / 100;
  }
  const catRows = Object.entries(byCategory).sort(([,a],[,b])=>b-a).map(([cat,c])=>
    `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px">
      <span style="color:var(--muted);text-transform:capitalize">${esc(cat)}</span>
      <span style="color:var(--text2);font-weight:600">$${Math.round(c).toLocaleString()}</span>
    </div>`).join('');
  const egressRow = egressCost > 0.01
    ? `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px">
        <span style="color:var(--muted)">Egress (est.)</span>
        <span style="color:var(--text2);font-weight:600">$${egressCost.toFixed(2)}</span>
      </div>` : '';
  const reservedChip = S.reservedPricing
    ? `<span style="background:#34d05822;color:#34d058;border:1px solid #34d05844;border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700">Reserved −35%</span>`
    : '';
  const grandTotal = total + egressCost;
  return `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:9.5px;font-weight:700;color:var(--muted);letter-spacing:.07em;text-transform:uppercase">Monthly Cost</div>
        ${reservedChip}
      </div>
      ${catRows}${egressRow}
      <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:11px;font-weight:700">
        <span style="color:var(--muted)">Total</span>
        <span style="color:#34d058">$${Math.round(grandTotal).toLocaleString()}/mo</span>
      </div>
    </div>`;
}

function updateEmptyPanel() {
  const hud = document.getElementById('canvas-hud');
  if (S.sel || S.selEdge) { hud.style.display = 'none'; return; }
  hud.style.display = '';
  const nodeCount = Object.keys(S.nodes).length;
  const edgeCount = S.edges.length;
  const loads = Object.values(S.simLoad).filter(x => typeof x.loadPct === 'number');
  const critical = loads.filter(x => x.loadPct > 85).length;
  const warning = loads.filter(x => x.loadPct > 60 && x.loadPct <= 85).length;
  const totalRps = computeTotalRPS();
  // Ring shows MAX load % — so the fill amount and color always agree
  const maxLoad = loads.length ? Math.max(...loads.map(x => x.loadPct)) : 0;
  const ringPct  = S.simOn && loads.length ? Math.min(100, maxLoad) : 0;
  const ringColor = critical ? '#f85149' : warning ? '#f5b731' : S.simOn && loads.length ? '#34d058' : '#2a3a50';
  const title = S.simOn
    ? (critical ? 'Critical pressure' : warning ? 'High load' : loads.length ? 'System healthy' : 'Simulation running')
    : 'Architecture cockpit';
  const sub = nodeCount
    ? (S.simOn ? 'Click any node to inspect its current load and adjust capacity.' : 'Click any node to tune its properties. Run the simulation to see live traffic.')
    : 'Load an example or drag components from the sidebar to start designing.';
  const ringLabel = S.simOn && loads.length ? Math.round(maxLoad) + '%' : nodeCount ? '—' : 'SIM';
  hud.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <div class="health-ring" style="--health:${ringPct}%;--ring-color:${ringColor}">
        <span>${esc(ringLabel)}</span>
      </div>
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;font-weight:700;color:${ringColor};margin-bottom:3px;line-height:1.2">${esc(title)}</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.45">${esc(sub)}</div>
      </div>
    </div>
    <div class="metric-grid">
      <div class="metric"><strong>${nodeCount}</strong><span>Nodes</span></div>
      <div class="metric"><strong>${edgeCount}</strong><span>Edges</span></div>
      <div class="metric"><strong>${esc(compactNum(totalRps))}</strong><span>Events/s</span></div>
      <div class="metric" style="${critical > 0 ? 'border-color:rgba(248,81,73,0.4);background:rgba(248,81,73,0.08)' : warning > 0 ? 'border-color:rgba(245,183,49,0.4);background:rgba(245,183,49,0.08)' : ''}"><strong style="color:${critical > 0 ? '#f85149' : warning > 0 ? '#f5b731' : 'var(--text)'}">${critical || warning || 0}</strong><span>${critical > 0 ? 'Critical' : warning > 0 ? 'Warning' : 'Issues'}</span></div>
    </div>
    ${_costBreakdownHtml()}`;
  requestAnimationFrame(positionSugTray);
}

// ── Latency + error model (mirrors server.mjs) ───────────────────────────────
const DEFAULT_LATENCY_MS = {
  appserver:50, vm:50, pod:20, serverless:100, database:10, cache:1,
  apigateway:5, loadbalancer:2, cdn:15, queue:5, eventbus:3, pubsub:3,
  kafkatopic:3, streamprocessor:20, bgworker:500, graphqlapi:30,
  websocket:5, searchengine:20, ratelimiter:2,
};
function _effectiveLatency(defId, props, loadPct) {
  const base = props.latencyMs || DEFAULT_LATENCY_MS[defId] || 50;
  const f = Math.max(0, Math.min(loadPct, 100)) / 100;
  return Math.round(base * (1 + 4 * f * f));
}

// ── Hardware → Capacity / Cost auto-compute ───────────────────────────────────
function _parseVCores(cpuStr) {
  if (!cpuStr) return 1;
  const m = String(cpuStr).match(/[\d.]+/);
  const v = m ? parseFloat(m[0]) : 1;
  // "1000m" = 1 core, "250m" = 0.25 core
  return String(cpuStr).endsWith('m') ? v / 1000 : v;
}
function _parseGB(memStr) {
  if (!memStr) return 1;
  const m = String(memStr).match(/[\d.]+/);
  const v = m ? parseFloat(m[0]) : 1;
  const u = String(memStr).toLowerCase();
  if (u.includes('mi') || u.includes('mb')) return v / 1024;
  if (u.includes('gi') || u.includes('gb')) return v;
  if (u.includes('tb')) return v * 1024;
  return v;
}

const RPS_PER_CORE  = { 'Node.js':800, 'Go':2000, 'Java':600, 'Python':200, 'Ruby':150, 'PHP':300, '.NET':700 };
const TPS_PER_CORE  = { 'PostgreSQL':500, 'MySQL':400, 'MongoDB':800, 'Redis':50000, 'DynamoDB':3000, 'CockroachDB':600, 'Cassandra':1200, 'SQLite':200 };
const DB_COST_CORE  = { 'PostgreSQL':90, 'MySQL':80, 'MongoDB':100, 'Redis':0, 'DynamoDB':0, 'CockroachDB':110, 'Cassandra':95, 'SQLite':0 };

function autoCapacityFromHW(defId, props) {
  if (['appserver','vm'].includes(defId)) {
    const cores = _parseVCores(props.cpu);
    const rps   = RPS_PER_CORE[props.runtime] || 500;
    return Math.round(cores * rps);
  }
  if (defId === 'pod') {
    const cores = _parseVCores(props.cpuRequest);
    const rps   = RPS_PER_CORE[props.runtime] || 500;
    return Math.max(1, Math.round(cores * rps));
  }
  if (defId === 'serverless') {
    const conc      = props.concurrency || 1000;
    const latMs     = props.avgLatencyMs || 100;
    return Math.round(conc * (1000 / Math.max(1, latMs)));
  }
  if (defId === 'database') {
    const cores = _parseVCores(props.cpu);
    return Math.round(cores * (TPS_PER_CORE[props.type] || 500));
  }
  if (defId === 'cache') {
    const ramGB = _parseGB(props.memory);
    return Math.round(ramGB * 50000);
  }
  return null;
}

function autoCostFromHW(defId, props) {
  if (['appserver','vm'].includes(defId)) {
    const cores = _parseVCores(props.cpu);
    const ramGB  = _parseGB(props.memory);
    return Math.round(cores * 35 + ramGB * 4);
  }
  if (defId === 'pod') {
    const cores = _parseVCores(props.cpuRequest);
    const ramGB  = _parseGB(props.memoryRequest);
    return Math.max(1, Math.round(cores * 8 + ramGB * 1.5));
  }
  if (defId === 'serverless') {
    const exec = props.executions || 1000000;
    return Math.round(exec * 0.0000002 * 100) / 100;
  }
  if (defId === 'database') {
    const cores    = _parseVCores(props.cpu);
    const storageGB = _parseGB(props.storage);
    const cpm      = DB_COST_CORE[props.type] || 90;
    return Math.round(cores * cpm + storageGB * 0.115);
  }
  if (defId === 'cache') {
    const ramGB = _parseGB(props.memory);
    return Math.round(ramGB * 16.2);
  }
  if (defId === 'loadbalancer') return 22;
  if (defId === 'apigateway')   return 35;
  if (defId === 'cdn')          return 18;
  return null;
}

const HW_KEYS = new Set(['cpu','memory','runtime','cpuRequest','memoryRequest','type','storage','concurrency','avgLatencyMs','executions']);

function buildFields(containerId, props, n, nodeId) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  props.forEach(p => {
    if (p.type === 'boolean') {
      const row = document.createElement('div');
      row.className = 'toggle-row';
      row.innerHTML = `<label>${p.label}</label>`;
      const tog = document.createElement('label'); tog.className = 'toggle';
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!n.props[p.key];
      const track = document.createElement('div'); track.className = 'toggle-track';
      const thumb = document.createElement('div'); thumb.className = 'toggle-thumb';
      tog.appendChild(inp); tog.appendChild(track); tog.appendChild(thumb);
      inp.onchange = () => { n.props[p.key] = inp.checked; renderNode(nodeId); if (S.simOn) runTick(); buildSuggestions(); };
      row.appendChild(tog); el.appendChild(row); return;
    }
    const row = document.createElement('div'); row.className = 'prop-row';
    const lbl = document.createElement('div'); lbl.className = 'prop-lbl'; lbl.textContent = p.label;
    row.appendChild(lbl);
    let inp;
    if (p.type === 'select') {
      inp = document.createElement('select'); inp.className = 'prop-inp';
      p.options.forEach(o => { const opt = document.createElement('option'); opt.value=o; opt.textContent=o; if(n.props[p.key]===o) opt.selected=true; inp.appendChild(opt); });
    } else if (p.type === 'textarea') {
      inp = document.createElement('textarea'); inp.className = 'prop-inp';
      inp.value = n.props[p.key] ?? '';
    } else {
      inp = document.createElement('input'); inp.className = 'prop-inp';
      inp.type = p.type === 'number' ? 'number' : 'text'; inp.value = n.props[p.key] ?? '';
      if (p.min !== undefined) inp.min = p.min; if (p.max !== undefined) inp.max = p.max;
      if (p.step) inp.step = p.step;
    }
    inp.dataset.key = p.key;
    inp.oninput = () => {
      const v = p.type === 'number' ? (parseFloat(inp.value)||0) : inp.value;
      n.props[p.key] = v;
      if (p.key === 'cost') updateCost();
      if (p.key === 'readReplicas') syncDbReplicas(nodeId, Math.round(v));
      // Auto-compute capacity + cost from hardware specs
      const def2 = COMPONENT_DEFS.find(d => d.id === n.defId);
      if (def2 && HW_KEYS.has(p.key)) {
        const newCap = autoCapacityFromHW(def2.id, n.props);
        if (newCap !== null) {
          n.props.capacity = newCap;
          const capEl = el.querySelector('[data-key="capacity"]');
          if (capEl) capEl.value = newCap;
        }
        const newCost = autoCostFromHW(def2.id, n.props);
        if (newCost !== null) {
          n.props.cost = newCost;
          const costEl = el.querySelector('[data-key="cost"]');
          if (costEl) costEl.value = newCost;
          updateCost();
        }
      }
      renderNode(nodeId);
      if (S.simOn) runTick();
      if (p.key === 'userCount' || p.key === 'requestsPerUser' || p.key === 'eventRate') {
        const tot = computeTotalRPS(); syncSlider(tot);
      }
      buildSuggestions();
      autoSave();
    };
    row.appendChild(inp); el.appendChild(row);
  });
}

function refreshSimStats(id) {
  const sim = id ? S.simLoad[id] : null;
  const card = document.getElementById('ss-load-card');
  const bar  = document.getElementById('ss-load-bar');

  if (sim && S.simOn && sim.status !== 'source') {
    card.style.display = '';
    const pct = Math.min(sim.loadPct, 100);
    const pctLabel = sim.loadPct >= 1000 ? '>' + Math.floor(sim.loadPct/100)*100 + '%' : Math.round(sim.loadPct) + '%';
    const barColor = sim.loadPct > 85 ? '#f66060' : sim.loadPct > 60 ? '#f5b731' : '#34d058';
    document.getElementById('ss-pct').textContent = pctLabel;
    document.getElementById('ss-pct').style.color = barColor;
    bar.style.width = pct + '%';
    bar.style.background = barColor;
    bar.style.boxShadow = `0 0 8px ${barColor}66`;
  } else {
    card.style.display = 'none';
    document.getElementById('ss-pct').textContent = '—';
  }

  const capStr = sim
    ? (sim.scaledCap
        ? `${formatFlow(sim.capacity)} → ${formatFlow(sim.scaledCap)}`
        : (typeof sim.capacity === 'number' ? formatFlow(sim.capacity) : String(sim.capacity || '—')))
    : '—';
  document.getElementById('ss-in').textContent  = sim ? formatFlow(sim.incoming) : '—';
  document.getElementById('ss-cap').textContent = capStr;
  document.getElementById('ss-rep').textContent = sim?.replicas ? sim.replicas + '×' : '—';

  const stEl = document.getElementById('ss-st');
  const statusText = sim ? (sim.coldStart ? '⚡ cold start' : sim.poolExhausted ? '🔴 pool exhausted' : sim.status) : '—';
  stEl.textContent = statusText;
  stEl.style.color = sim?.status === 'critical' || sim?.poolExhausted ? '#f66060' : sim?.status === 'warning' ? '#f5b731' : sim?.status?.startsWith('ok') ? '#34d058' : 'var(--text2)';

  // Latency rows
  const latEl = document.getElementById('ss-latency');
  const p95El = document.getElementById('ss-p95');
  const errEl = document.getElementById('ss-errrate');
  const slaEl = document.getElementById('ss-sla');
  if (latEl) latEl.textContent = sim?.latencyMs != null ? sim.latencyMs + ' ms' : '—';
  if (p95El) p95El.textContent = sim?.p95Ms != null ? sim.p95Ms + ' ms' : '—';
  if (errEl) {
    errEl.textContent = sim?.errorRate != null ? sim.errorRate + '%' : '—';
    if (errEl) errEl.style.color = (sim?.errorRate || 0) > 5 ? '#f66060' : (sim?.errorRate || 0) > 0 ? '#f5b731' : 'var(--text2)';
  }
  if (slaEl) {
    slaEl.textContent = sim?.sla || '—';
    if (slaEl) slaEl.style.color = sim?.sla?.startsWith('99.9') ? '#34d058' : sim?.sla?.startsWith('99') ? '#f5b731' : '#f66060';
  }
}

document.getElementById('btn-del-node').onclick = () => { if (S.sel) deleteNode(S.sel); };

// ══ READ REPLICA VISUAL SYNC ══════════════════════════════════════════════════
function syncDbReplicas(dbId, targetCount) {
  const dbNode = S.nodes[dbId]; if (!dbNode) return;
  const dbDef  = COMPONENT_DEFS.find(d => d.id === 'database');

  // Find current managed replicas
  const existing = Object.values(S.nodes).filter(n => n.props._replicaOf === dbId);
  const curr = existing.length;
  if (curr === targetCount) return;

  if (targetCount > curr) {
    // Spawn new replicas to the right of the DB, stacked vertically
    for (let i = curr; i < targetCount; i++) {
      const repId = 'n' + (++S.nSeq);
      S.nodes[repId] = {
        id: repId, defId: 'database',
        x: dbNode.x + 200,
        y: dbNode.y + i * 110,
        w: 160, h: 88,
        props: {
          ...dbDef.defaults,
          label: `DB Replica ${i + 1}`,
          capacity: dbNode.props.capacity,
          type:     dbNode.props.type,
          cost:     Math.round((dbNode.props.cost || 80) * 0.6),
          _replicaOf: dbId,
          _isReplica: true,
        }
      };
      // Replication edge: dashed purple, from primary → replica
      S.edges.push({ id: 'e'+(++S.eSeq), src: dbId, tgt: repId, animated: false, dashed: true, replication: true });
    }
  } else {
    // Remove excess replicas
    existing.slice(targetCount).forEach(rep => {
      S.edges = S.edges.filter(e => e.src !== rep.id && e.tgt !== rep.id);
      document.getElementById('node-' + rep.id)?.remove();
      delete S.nodes[rep.id];
    });
  }
  renderAll(); updateStats(); updateCost(); buildSuggestions();
}

// ══ SIMULATION ════════════════════════════════════════════════════════════════
function computeTotalRPS() {
  return Object.values(S.nodes).reduce((a,n) => {
    if (n.defId === 'users') return a + (n.props.userCount || 100) * (n.props.requestsPerUser || 1);
    if (n.defId === 'cdcsource') return a + (n.props.changeRate || n.props.capacity || 0);
    if (n.defId === 'eventsource') return a + (n.props.eventRate || 0);
    return a;
  }, 0) || 100;
}

function sourceRate(n) {
  if (n.defId === 'cdcsource') return n.props.changeRate || n.props.capacity || 100;
  if (n.defId === 'eventsource') return n.props.eventRate || 100;
  return (n.props.userCount || 100) * (n.props.requestsPerUser || 1);
}

function outgoingSplitDetails(srcId) {
  const down = S.edges.filter(e => e.src === srcId && !e.dashed && !e._warn && S.nodes[e.tgt]);
  if (!down.length) return [];
  const explicit = down.filter(e => e.trafficPct != null);
  if (!explicit.length) {
    const pct = 100 / down.length;
    return down.map(edge => ({ edge, pct, mode: 'equal' }));
  }
  const explicitTotal = explicit.reduce((sum, e) => sum + Math.max(0, Number(e.trafficPct) || 0), 0);
  const implicit = down.filter(e => e.trafficPct == null);
  if (implicit.length) {
    const remaining = Math.max(0, 100 - explicitTotal);
    const autoPct = remaining / implicit.length;
    return down.map(edge => ({
      edge,
      pct: edge.trafficPct == null ? autoPct : Math.max(0, Number(edge.trafficPct) || 0),
      mode: edge.trafficPct == null ? 'remainder' : 'explicit'
    }));
  }
  const total = explicitTotal || down.length;
  return down.map(edge => ({
    edge,
    pct: (Math.max(0, Number(edge.trafficPct) || 0) / total) * 100,
    mode: explicitTotal === 100 ? 'explicit' : 'normalised'
  }));
}

function outgoingSplitPercent(edge) {
  const found = outgoingSplitDetails(edge.src).find(x => x.edge.id === edge.id);
  return found?.pct ?? 0;
}

// ── Remote simulation (serverless) ───────────────────────────────────────────
// Calls /api/simulate with the current graph; falls back to local tick if the
// request fails (e.g. dev server without Netlify Functions running).
let _simPending = false;
async function runTickRemote() {
  if (_simPending) return;       // skip if a request is already in-flight
  _simPending = true;
  try {
    const resp = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: S.nodes, edges: S.edges }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const { simLoad, eFlow } = await resp.json();
    S.simLoad = simLoad;
    S.eFlow   = eFlow;
    renderAll();
    if (S.sel) refreshSimStats(S.sel);
    if (S.selEdge) { const ed = S.edges.find(e=>e.id===S.selEdge); if (ed) _renderEdgePanel(ed); }
    buildSuggestions();
    updateEmptyPanel();
  } catch (err) {
    console.warn('[runTick] remote failed, falling back to local:', err.message);
    runTickLocal();
  } finally {
    _simPending = false;
  }
}

function runTick() {
  // Use serverless when available (production / netlify dev), local otherwise
  if (typeof fetch !== 'undefined') { runTickRemote(); return; }
  runTickLocal();
}

function runTickLocal() {
  const incoming = {}; const eFlowNew = {};
  Object.keys(S.nodes).forEach(id => { incoming[id] = 0; });

  // Seed sources
  Object.values(S.nodes).forEach(n => {
    if (!SOURCE_DEFS.has(n.defId)) return;
    incoming[n.id] = sourceRate(n);
  });

  // Multi-pass propagation — iterate until values converge (handles merge paths)
  const MAX_PASSES = 8;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const prevFlow = { ...eFlowNew };
    // Process nodes in topological order approximation: by BFS layer from sources
    const order = [];
    const inDeg = {};
    Object.keys(S.nodes).forEach(id => { inDeg[id] = 0; });
    S.edges.forEach(e => { if (!e.dashed && S.nodes[e.src] && S.nodes[e.tgt]) inDeg[e.tgt]++; });
    const q = Object.keys(S.nodes).filter(id => inDeg[id] === 0 || SOURCE_DEFS.has(S.nodes[id]?.defId));
    const seen = new Set(q);
    let head = [...q];
    while (head.length) {
      const nxt = [];
      head.forEach(id => {
        order.push(id);
        S.edges.filter(e => e.src === id && !e.dashed && S.nodes[e.tgt]).forEach(e => {
          if (!seen.has(e.tgt)) { seen.add(e.tgt); nxt.push(e.tgt); }
        });
      });
      head = nxt;
    }
    // Any unvisited nodes (cycles/disconnected)
    Object.keys(S.nodes).forEach(id => { if (!seen.has(id)) order.push(id); });

    // Reset non-source incoming for this pass
    Object.keys(S.nodes).forEach(id => { if (!SOURCE_DEFS.has(S.nodes[id]?.defId)) incoming[id] = 0; });

    order.forEach(cur => {
      const n = S.nodes[cur]; if (!n) return;
      const inn = incoming[cur] || 0;
      let fwd = inn;
      if (n.defId==='cdn')        fwd = inn*(1-(n.props.cacheHitRate||85)/100);
      else if (n.defId==='cache') fwd = inn*(1-(n.props.hitRate||80)/100);
      else if (n.defId==='firewall') fwd = inn*(1-(n.props.blockRate||5)/100);
      else if (n.defId==='deviceapp') fwd = inn*(n.props.eventsPerInput||1);
      const splits = outgoingSplitDetails(cur);
      if (splits.length && fwd > 0) {
        splits.forEach(({ edge, pct }) => {
          const w = pct / 100;
          const flow = fwd * w;
          eFlowNew[edge.id] = flow;
          incoming[edge.tgt] = (incoming[edge.tgt] || 0) + flow;
        });
      }
    });

    // Check convergence
    const changed = Object.keys(eFlowNew).some(k => Math.abs((eFlowNew[k]||0) - (prevFlow[k]||0)) > 0.5);
    if (!changed) break;
  }
  S.eFlow = eFlowNew;

  // Load per node
  Object.values(S.nodes).forEach(n => {
    if (SOURCE_DEFS.has(n.defId)) {
      const rps = sourceRate(n);
      S.simLoad[n.id]={incoming:rps,capacity:'∞',loadPct:0,status:'source'}; return;
    }
    if (n.defId==='autoscaler') {
      const watched=S.edges.filter(e=>e.src===n.id&&e.dashed).map(e=>S.simLoad[e.tgt]?.loadPct||0);
      const mx=watched.length?Math.max(...watched):0;
      S.simLoad[n.id]={incoming:0,capacity:'—',loadPct:mx,status:mx>(n.props.scaleUpThreshold||80)?'scaling ↑':'watching'}; return;
    }

    const inn = incoming[n.id]||0;
    const cap = n.props.capacity || n.props.maxConnections || 10000;
    let pct=((inn/cap)*100), status=pct>85?'critical':pct>60?'warning':'ok';
    let scaledCap=null, replicas=null, scaling=false;

    // AutoScaler node — detect edge in EITHER direction
    const asEdge = S.edges.find(e => e.dashed && (
      (e.tgt === n.id && S.nodes[e.src]?.defId === 'autoscaler') ||
      (e.src === n.id && S.nodes[e.tgt]?.defId === 'autoscaler')
    ));
    const asNode = asEdge
      ? (S.nodes[asEdge.src]?.defId === 'autoscaler' ? S.nodes[asEdge.src] : S.nodes[asEdge.tgt])
      : null;

    // Node's own autoScale property?
    const selfScale = n.props.autoScale;

    const threshold = asNode?.props.scaleUpThreshold ?? n.props.scaleUpAt ?? 80;
    const maxRep    = asNode?.props.maxReplicas      ?? n.props.maxReplicas ?? 5;

    if ((asNode || selfScale) && pct > threshold) {
      // Scale to bring load BELOW threshold, up to maxReplicas
      const neededReplicas = Math.ceil(inn / (cap * (threshold / 100)));
      replicas  = Math.min(maxRep, neededReplicas);
      scaledCap = cap * replicas;
      pct       = (inn / scaledCap) * 100;
      status    = pct > 85 ? 'critical' : pct > 60 ? 'warning' : 'ok (scaled)';
      scaling   = true;
    }

    // Database read replicas — also count spawned visual replicas
    const visualReplicas = Object.values(S.nodes).filter(r => r.props._replicaOf === n.id).length;
    const dbReplicas = n.props.readReplicas > 0 ? n.props.readReplicas : visualReplicas;
    if (n.defId === 'database' && dbReplicas > 0) {
      const totalCap = cap * (1 + dbReplicas);
      pct    = (inn / totalCap) * 100;
      status = pct > 85 ? 'critical' : pct > 60 ? 'warning' : `ok (×${dbReplicas+1} nodes)`;
    }

    // Error rate retry amplification
    const errRate = n.props.errorRate || 0;
    if (errRate > 0) {
      const retriedPct = ((inn * (1 + 2 * errRate / 100)) / cap) * 100;
      if (retriedPct > pct) { pct = retriedPct; status = pct>85?'critical':pct>60?'warning':'ok'; }
    }
    // DB pool exhaustion
    if (n.defId === 'database' && n.props.maxConnections && inn > n.props.maxConnections) {
      status = 'pool exhausted';
    }
    // Latency model
    const effLatMs = _effectiveLatency(n.defId, n.props, pct);
    const p95Ms    = Math.round(effLatMs * 2.5);
    // SLA estimate
    const slaBase  = pct > 85 ? 98.0 : pct > 60 ? 99.5 : 99.95;
    const sla      = (errRate > 5 ? Math.max(95, slaBase - errRate * 0.3) : slaBase).toFixed(2) + '%';
    // Cold start
    const coldStart = n.defId === 'serverless' && inn > 0 && !n._hadTraffic;
    if (inn > 0) n._hadTraffic = true;

    S.simLoad[n.id] = { incoming: inn, capacity: cap, loadPct: pct, status, scaledCap, replicas, scaling,
                        latencyMs: effLatMs, p95Ms, errorRate: errRate, coldStart, sla };
  });

  renderAll();
  if (S.sel) refreshSimStats(S.sel);
  if (S.selEdge) { const ed = S.edges.find(e=>e.id===S.selEdge); if (ed) _renderEdgePanel(ed); }
  buildSuggestions();
  updateEmptyPanel();
}

// ══ SUGGESTIONS ═══════════════════════════════════════════════════════════════
let dismissedSugs = new Set();

function clearSuggestionCards() {
  document.querySelectorAll('#suggestions .sug-card:not(.toast-card)').forEach(el => el.remove());
}

const HINTS_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" stroke-width="3"/></svg>`;
function updateSuggestionsToggle() {
  const btn = document.getElementById('btn-suggestions');
  if (!btn) return;
  btn.classList.toggle('active', S.suggestionsOn);
  btn.innerHTML = HINTS_SVG + (S.suggestionsOn ? ' Hints' : ' Hints Off');
  btn.title = S.suggestionsOn ? 'Hide live recommendation cards' : 'Show live recommendation cards';
}

function setSuggestionsOn(on) {
  S.suggestionsOn = !!on;
  try { localStorage.setItem('archviz.suggestions', S.suggestionsOn ? 'on' : 'off'); }
  catch {}
  updateSuggestionsToggle();
  if (!S.suggestionsOn) clearSuggestionCards();
  else buildSuggestions();
}

function buildSuggestions() {
  const panel = document.getElementById('suggestions');
  if (!S.suggestionsOn || !S.simOn) { clearSuggestionCards(); return; }

  const cards = [];
  Object.values(S.nodes).forEach(n => {
    const sim = S.simLoad[n.id]; if (!sim) return;
    const def = COMPONENT_DEFS.find(d=>d.id===n.defId);
    const label = n.props.label || def.name;
    if (n.props._isReplica) return;

    if (sim.loadPct > 85 && !sim.scaling) {
      const key = n.id + '-crit';
      if (!dismissedSugs.has(key)) {
        let fix = 'Add a Load Balancer upstream to distribute traffic, or enable ⚡ Auto Scaling in the properties panel.';

        if (n.defId === 'cache') {
          // Check if cache is wired correctly: App Server → Cache → Database (pass-through)
          const hasDownstreamDB = S.edges.some(e => e.src === n.id && S.nodes[e.tgt]?.defId === 'database');
          const upstreamAppDirect = S.edges.some(e => e.tgt === n.id);
          if (!hasDownstreamDB) {
            fix = 'Wire Cache → Database so cache misses flow through (only ~20% at 80% hit rate reaches DB). Delete any direct App Server → Database edge. Current topology bypasses the cache.';
          } else {
            fix = 'Cache is absorbing all reads. Increase Capacity in properties (Redis cluster handles 100K+ req/s), or add a second Cache node behind a Load Balancer for horizontal scaling.';
          }
        }
        else if (n.defId === 'database') {
          const repCount = Object.values(S.nodes).filter(r => r.props._replicaOf === n.id).length;
          const hasCacheUpstream = S.edges.some(e => e.tgt === n.id && S.nodes[e.src]?.defId === 'cache');
          const hasDirectAppServer = S.edges.some(e => e.tgt === n.id && ['appserver','vm','pod'].includes(S.nodes[e.src]?.defId));
          if (hasDirectAppServer && !hasCacheUpstream) {
            fix = `App Server is hitting the DB directly. Add a Cache node between them: App Server → Cache → Database. With 80% hit rate, only 20% of reads reach the DB — a 5× reduction in load.`;
          } else if (hasCacheUpstream && repCount === 0) {
            fix = 'Cache is in place. Now set "Read Replicas" > 0 in DB properties — replicas appear automatically and split read load.';
          } else if (repCount > 0) {
            fix = `${repCount} replica(s) added. If still overloaded, increase each replica's capacity or add more replicas. Consider connection pooling (PgBouncer/RDS Proxy) to reduce connection overhead.`;
          } else {
            fix = 'Set "Read Replicas" > 0 in properties — replicas appear automatically. Add a Cache layer upstream to absorb repeated reads before they reach the DB.';
          }
        }
        else if (n.defId === 'loadbalancer') {
          fix = 'Increase throughput capacity in properties, or add more downstream servers connected to this Load Balancer.';
        }
        else if (['appserver','vm','pod'].includes(n.defId)) {
          fix = 'Enable ⚡ Auto Scaling in this node\'s properties panel, or drag a Load Balancer upstream and add more instances behind it.';
        }
        else if (n.defId === 'queue') {
          fix = 'Increase consumer count in properties, or add more worker nodes (App Server / Pod) downstream. Queues absorb spikes — make sure consumers can drain fast enough.';
        }
        else if (n.defId === 'apigateway') {
          fix = 'API Gateway is the bottleneck. Increase capacity or add a Load Balancer with multiple API Gateway instances. Consider rate-limiting upstream (CDN / WAF) to protect it.';
        }

        const pct = sim.loadPct;
        const pctLabel = pct >= 1000 ? `>${Math.floor(pct/100)*100}%` : `${Math.round(pct)}%`;
        cards.push({ key, type:'crit', icon:'🔴', title:`${label} overloaded — ${pctLabel} load`, msg: fix });
      }
    } else if (sim.loadPct > 60 && sim.loadPct <= 85) {
      const key = n.id + '-warn';
      if (!dismissedSugs.has(key)) {
        let warn = 'Approaching capacity. Enable Auto Scaling or add capacity before traffic peaks.';
        if (n.defId === 'database') warn = 'DB nearing capacity. Pre-emptively add Read Replicas or a Cache layer before load spikes.';
        if (n.defId === 'cache') warn = 'Cache nearing capacity. Consider upgrading to a Redis cluster or adding a second cache node.';
        cards.push({ key, type:'warn', icon:'🟡', title:`${label} — ${Math.round(sim.loadPct)}% load`, msg: warn });
      }
    }

    if (n.defId === 'database' && !n.props._isReplica && sim.loadPct <= 85) {
      const repCount = Object.values(S.nodes).filter(r => r.props._replicaOf === n.id).length;
      if (sim.loadPct > 60 && repCount === 0) {
        const key = n.id + '-db-rep';
        if (!dismissedSugs.has(key))
          cards.push({ key, type:'info', icon:'💡', title:`${label}: Add Read Replicas`, msg: 'Set "Read Replicas" > 0 in the properties panel — replica nodes will appear on canvas automatically and split read load.' });
      }
    }
  });

  // Topology: compute node hit directly by a source without a Load Balancer
  const computeDefs = new Set(['appserver','vm','pod']);
  Object.values(S.nodes).forEach(n => {
    if (!computeDefs.has(n.defId)) return;
    const sim = S.simLoad[n.id]; if (!sim || sim.loadPct <= 60) return;
    const srcEdges = S.edges.filter(e => e.tgt === n.id && SOURCE_DEFS.has(S.nodes[e.src]?.defId));
    const hasLBUpstream = S.edges.some(e => e.tgt === n.id && S.nodes[e.src]?.defId === 'loadbalancer');
    if (srcEdges.length > 0 && !hasLBUpstream) {
      const key = n.id + '-no-lb';
      const label = n.props.label || COMPONENT_DEFS.find(d=>d.id===n.defId)?.name;
      if (!dismissedSugs.has(key))
        cards.push({ key, type:'info', icon:'💡', title:`Add a Load Balancer before ${label}`, msg: `Traffic hits ${label} directly from the source. Add a Load Balancer between them: Users → Load Balancer → ${label}. This lets you run multiple ${label} instances and distributes load evenly.` });
    }
  });

  const isolated = Object.values(S.nodes).filter(n => {
    if (SOURCE_DEFS.has(n.defId) || n.defId === 'textnote' || n.props._isReplica) return false;
    return !S.edges.some(e => e.src === n.id || e.tgt === n.id);
  });
  if (isolated.length) {
    const key = 'isolated';
    if (!dismissedSugs.has(key)) {
      const names = isolated.slice(0,2).map(n => n.props.label || COMPONENT_DEFS.find(d=>d.id===n.defId)?.name).join(', ');
      cards.push({ key, type:'info', icon:'🔗', title:`${isolated.length} unconnected node(s)`, msg: `${names} — hover a node to see its ports, then drag to connect.` });
    }
  }

  const visible = cards.slice(0, 6);

  // Sync with notification panel — keyed cards so we don't duplicate
  const notifList = document.getElementById('notif-list');
  if (notifList) {
    // Remove hint cards that are no longer relevant
    [...notifList.querySelectorAll('.notif-card[data-sug-key]')].forEach(el => {
      if (!visible.find(c => c.key === el.dataset.sugKey)) {
        el.remove();
      }
    });
    // Add new hint cards
    visible.forEach(c => {
      if (notifList.querySelector(`.notif-card[data-sug-key="${c.key}"]`)) return;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const card = document.createElement('div');
      card.className = `notif-card ${c.type}`;
      card.dataset.sugKey = c.key;
      card.innerHTML = `
        <div class="notif-card-icon">${c.icon}</div>
        <div class="notif-card-body">
          <div class="notif-card-title">${esc(c.title)}</div>
          <div class="notif-card-msg">${esc(c.msg)}</div>
          <div class="notif-card-time">${timeStr}</div>
        </div>
        <button class="notif-card-close" title="Dismiss">×</button>`;
      card.querySelector('.notif-card-close').onclick = () => {
        dismissedSugs.add(c.key);
        card.style.opacity = '0';
        card.style.transform = 'translateX(12px)';
        card.style.transition = 'opacity 0.2s, transform 0.2s';
        setTimeout(() => { card.remove(); _updateNotifBadge(); }, 200);
      };
      notifList.appendChild(card);
    });
    _updateNotifBadge();
  }

  // Keep legacy #suggestions empty (no overlay cards)
  [...panel.querySelectorAll('.sug-card:not(.toast-card)')].forEach(el => el.remove());
}

// Swipe-right to dismiss (mouse + touch)
function attachSwipeToDismiss(el, onDismiss) {
  let startX = null, startY = null, dragging = false;
  const onStart = e => {
    const t = e.touches?.[0] || e;
    startX = t.clientX; startY = t.clientY; dragging = true;
  };
  const onMove = e => {
    if (!dragging || startX === null) return;
    const t = e.touches?.[0] || e;
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);
    if (dy > 18) { dragging = false; return; }     // vertical scroll — ignore
    if (dx < 0) return;                              // left drag — ignore
    el.style.transition = 'none';
    el.style.transform  = `translateX(${dx}px)`;
    el.style.opacity    = String(Math.max(0, 1 - dx / 140));
    if (e.cancelable) e.preventDefault();
  };
  const onEnd = e => {
    if (!dragging) return; dragging = false;
    const t = e.changedTouches?.[0] || e;
    const dx = t.clientX - startX;
    el.style.transition = '';
    if (dx > 80) { onDismiss(); }
    else { el.style.transform = ''; el.style.opacity = ''; }
    startX = null;
  };
  el.addEventListener('mousedown',  onStart);
  el.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('mousemove', onMove);
  el.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  el.addEventListener('touchend', onEnd);
}

function swipeOutCard(el) {
  el.classList.add('swiping-out');
  setTimeout(() => { el.remove(); updateSugTray(); }, 230);
}

// Position the tray below the HUD widget
function positionSugTray() {
  const hud = document.getElementById('canvas-hud');
  const panel = document.getElementById('suggestions');
  if (!hud || !panel) return;
  const hudBottom = hud.offsetTop + hud.offsetHeight;
  panel.style.top = (hudBottom + 8) + 'px';
}

// Update the collapsed badge state
function updateSugTray() {
  const panel  = document.getElementById('suggestions');
  const badge  = document.getElementById('sug-tray-badge');
  const cards  = [...panel.querySelectorAll('.sug-card:not(.toast-card)')];
  const hasCrit = cards.some(c => c.classList.contains('crit'));
  if (cards.length === 0) {
    badge.style.display = 'none';
    return;
  }
  badge.classList.toggle('has-crit', hasCrit);
  const txt = document.getElementById('sug-badge-txt');
  if (txt) txt.textContent = cards.length === 1 ? '1 alert' : `${cards.length} alerts`;
}

function expandSugTray() {
  const panel = document.getElementById('suggestions');
  const cards = [...panel.querySelectorAll('.sug-card:not(.toast-card)')];
  cards.forEach(c => { c.style.display = ''; });
  const badge = document.getElementById('sug-tray-badge');
  if (badge) badge.style.display = 'none';
}

// Reposition tray whenever HUD size changes (e.g. when sim starts)
let _sugTrayRO;
function initSugTrayObserver() {
  const hud = document.getElementById('canvas-hud');
  if (!hud || typeof ResizeObserver === 'undefined') return;
  _sugTrayRO = new ResizeObserver(() => positionSugTray());
  _sugTrayRO.observe(hud);
}

// ══ SIM CONTROLS ══════════════════════════════════════════════════════════════
const slider = document.getElementById('users-slider');
const uInp   = document.getElementById('users-input');
const dot    = document.getElementById('sim-dot');
const flowReadout = document.getElementById('flow-readout') || { textContent: '', style: {} };

function fmtComma(n) {
  return Math.round(n).toLocaleString('en-US');
}
function parseComma(s) {
  return Number(String(s).replace(/,/g, '')) || 0;
}
// Logarithmic slider: pos 0–1000 maps to 1–10B (10^0 to 10^10)
function sliderPosToUsers(pos) { return Math.max(1, Math.round(Math.pow(10, pos / 100))); }
function usersToSliderPos(v)   { return Math.max(0, Math.min(1000, Math.round(Math.log10(Math.max(1, v)) * 100))); }

function syncSlider(v) {
  const next = Math.max(1, Math.round(v || 1));
  slider.value = usersToSliderPos(next);
  uInp.value = fmtComma(next);
  flowReadout.textContent = formatFlow(next);
}
function applyUsers(v) {
  Object.values(S.nodes).forEach(n => { if (n.defId==='users') n.props.userCount = v; });
  if (S.sel && S.nodes[S.sel]?.defId==='users') showProps(S.sel);
  if (S.simOn) runTick();
  flowReadout.textContent = formatFlow(computeTotalRPS());
}
slider.oninput = () => { const v = sliderPosToUsers(+slider.value); syncSlider(v); applyUsers(v); };
uInp.oninput = () => {
  const raw = parseComma(uInp.value);
  if (raw > 0) { syncSlider(raw); applyUsers(raw); }
};
uInp.onblur = () => {
  const raw = parseComma(uInp.value);
  uInp.value = fmtComma(Math.max(1, raw));
};
uInp.onkeydown = e => {
  if (e.key === 'Enter') uInp.blur();
};

document.getElementById('btn-sim').onclick = () => {
  S.simOn = !S.simOn;
  const btn = document.getElementById('btn-sim');
  if (S.simOn) {
    track('simulation_started', {
      node_count: Object.keys(S.nodes).length,
      edge_count: S.edges.length,
      example: S.activeExample || 'custom',
      speed: S.simSpeed || 'normal'
    });
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg><span>Stop</span>`;
    btn.classList.add('running');
    dot.classList.add('on');
    if (flowReadout.style) flowReadout.style.display = '';
    dismissedSugs.clear();
    const speedMs = { slow: 2500, normal: 1600, fast: 800 }[S.simSpeed || 'normal'] || 1600;
    runTick(); S.simTick = setInterval(runTick, speedMs);
  } else {
    const loads = Object.values(S.simLoad).filter(x => typeof x.loadPct === 'number');
    const maxLoad = loads.length ? Math.max(...loads.map(x => x.loadPct)) : 0;
    const criticalCount = loads.filter(x => x.loadPct > 85).length;
    track('simulation_stopped', {
      node_count: Object.keys(S.nodes).length,
      edge_count: S.edges.length,
      max_load_pct: Math.round(maxLoad),
      critical_nodes: criticalCount,
      example: S.activeExample || 'custom'
    });
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Run Sim</span>`;
    btn.classList.remove('running');
    dot.classList.remove('on');
    if (flowReadout.style) { flowReadout.style.display = 'none'; flowReadout.textContent = ''; }
    clearInterval(S.simTick); S.simLoad={}; S.eFlow={};
    clearSuggestionCards();
    renderAll(); updateEmptyPanel();
  }
};

// ══ AUTO LAYOUT ═══════════════════════════════════════════════════════════════
function autoLayout() {
  const ids = Object.keys(S.nodes); if (!ids.length) return;
  snapshot();

  const mainIds = ids.filter(id => !S.nodes[id].props._isReplica);
  const outEdges = {}; const inEdges = {}; const inDeg = {};
  mainIds.forEach(id => { outEdges[id] = []; inEdges[id] = []; inDeg[id] = 0; });
  S.edges.forEach(e => {
    if (e.dashed || !outEdges[e.src] || !inEdges[e.tgt]) return;
    outEdges[e.src].push(e.tgt);
    inEdges[e.tgt].push(e.src);
    inDeg[e.tgt]++;
  });

  // Longest-path layering
  const layer = {};
  const remainingInDeg = { ...inDeg };
  const queue = mainIds.filter(id => inDeg[id] === 0 || SOURCE_DEFS.has(S.nodes[id]?.defId));
  const processed = new Set();
  queue.forEach(id => { layer[id] = 0; });
  while (queue.length) {
    const id = queue.shift();
    if (processed.has(id)) continue;
    processed.add(id);
    outEdges[id].forEach(tid => {
      layer[tid] = Math.max(layer[tid] ?? 0, (layer[id] ?? 0) + 1);
      remainingInDeg[tid]--;
      if (remainingInDeg[tid] <= 0) queue.push(tid);
    });
  }
  // Assign disconnected / cyclic nodes
  mainIds.forEach(id => {
    if (layer[id] === undefined) {
      const up = inEdges[id].map(s => layer[s]).filter(Number.isFinite);
      layer[id] = up.length ? Math.max(...up) + 1 : 0;
    }
  });

  const byLayer = {};
  mainIds.forEach(id => { (byLayer[layer[id]] = byLayer[layer[id]] || []).push(id); });
  const layerNums = Object.keys(byLayer).map(Number).sort((a,b) => a - b);

  const typeRank = {
    users: 0, deviceapp: 1, eventsource: 1, cdcsource: 1,
    cdn: 2, firewall: 3, apigateway: 4, loadbalancer: 5,
    appserver: 6, vm: 6, pod: 6,
    cache: 7, queue: 8, database: 9,
    debezium: 10, kafkatopic: 11, streamwindow: 12, streamprocessor: 13,
    objectstorage: 14, datalake: 14, tableformat: 15, metastore: 16,
    queryengine: 17, warehouse: 18, appinsights: 19, logging: 20,
    textnote: 99
  };
  const rankOf = id => typeRank[S.nodes[id]?.defId] ?? 50;

  // Virtual position table — tracks fractional row index per node for barycenter math.
  // Using indices (not old canvas px) means the barycenter is actually meaningful.
  const vpos = {}; // id → fractional row index
  layerNums.forEach(l => byLayer[l].sort((a,b) => rankOf(a) - rankOf(b)));
  layerNums.forEach(l => byLayer[l].forEach((id, i) => { vpos[id] = i; }));

  // 6 passes of barycenter heuristic (forward + backward each pass)
  for (let pass = 0; pass < 6; pass++) {
    // Forward pass: sort each layer by avg vpos of in-neighbors
    layerNums.forEach(l => {
      byLayer[l].sort((a, b) => {
        const av = inEdges[a].length
          ? inEdges[a].reduce((s, src) => s + (vpos[src] ?? 0), 0) / inEdges[a].length
          : vpos[a] ?? rankOf(a);
        const bv = inEdges[b].length
          ? inEdges[b].reduce((s, src) => s + (vpos[src] ?? 0), 0) / inEdges[b].length
          : vpos[b] ?? rankOf(b);
        return av - bv || rankOf(a) - rankOf(b);
      });
      byLayer[l].forEach((id, i) => { vpos[id] = i; });
    });
    // Backward pass: sort by avg vpos of out-neighbors
    [...layerNums].reverse().forEach(l => {
      byLayer[l].sort((a, b) => {
        const av = outEdges[a].length
          ? outEdges[a].reduce((s, tgt) => s + (vpos[tgt] ?? 0), 0) / outEdges[a].length
          : vpos[a] ?? rankOf(a);
        const bv = outEdges[b].length
          ? outEdges[b].reduce((s, tgt) => s + (vpos[tgt] ?? 0), 0) / outEdges[b].length
          : vpos[b] ?? rankOf(b);
        return av - bv || rankOf(a) - rankOf(b);
      });
      byLayer[l].forEach((id, i) => { vpos[id] = i; });
    });
  }

  const NODE_W   = 160;
  const NODE_H   = 88;
  const COL_GAP  = NODE_W + 140; // 300px between column left edges
  const ROW_GAP  = NODE_H + 60;  // 148px between row top edges — no overlap
  const LEFT     = 80;
  const TOP      = 80;
  const maxRows  = Math.max(...layerNums.map(l => byLayer[l].length), 1);
  const canvasMid = Math.max(TOP + ((maxRows - 1) * ROW_GAP) / 2, 300);

  layerNums.forEach(l => {
    const layerIds = byLayer[l];
    const colH     = (layerIds.length - 1) * ROW_GAP;
    const startY   = Math.max(TOP, canvasMid - colH / 2);
    layerIds.forEach((id, i) => {
      S.nodes[id].x = snapVal(LEFT + l * COL_GAP);
      S.nodes[id].y = snapVal(startY + i * ROW_GAP);
    });
  });

  // Reposition replicas relative to their parent DB
  Object.values(S.nodes).filter(n => n.props._isReplica).forEach(rep => {
    const parent = S.nodes[rep.props._replicaOf];
    if (parent) {
      const siblings = Object.values(S.nodes).filter(r => r.props._replicaOf === rep.props._replicaOf);
      const idx = siblings.indexOf(rep);
      rep.x = parent.x + NODE_W + 70;
      rep.y = parent.y + idx * ROW_GAP;
    }
  });

  renderAll(); setTimeout(fitView, 50);
}

// ══ CANVAS INTERACTIONS ════════════════════════════════════════════════════════
document.addEventListener('dragover', e => {
  e.preventDefault();
  const gh = document.getElementById('drag-ghost');
  gh.style.left = (e.clientX+14)+'px'; gh.style.top = (e.clientY+14)+'px';
});
document.addEventListener('dragend', () => { document.getElementById('drag-ghost').style.display='none'; G.dragDef=null; });

cWrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
cWrap.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file && file.name.toLowerCase().endsWith('.json')) {
    file.text()
      .then(text => importArchitecture(JSON.parse(text)))
      .catch(err => alert('Could not import JSON: ' + err.message));
    return;
  }
  if (!G.dragDef) return;
  document.getElementById('drag-ghost').style.display='none';
  const rect = cWrap.getBoundingClientRect();
  const cx = snapVal((e.clientX - rect.left - S.panX) / S.zoom - 80);
  const cy = snapVal((e.clientY - rect.top  - S.panY) / S.zoom - 44);

  // Check if dropping onto an existing edge (split it)
  const hitEdge = findEdgeNear(e.clientX - rect.left, e.clientY - rect.top);
  const newId = addNode(G.dragDef, cx, cy);
  if (hitEdge) {
    // Split: src→hitEdge.src, old edge tgt→new, new→old tgt
    const oldEdge = S.edges.find(e2=>e2.id===hitEdge);
    if (oldEdge) {
      const { src: oSrc, tgt: oTgt, dashed } = oldEdge;
      deleteEdge(hitEdge);
      addEdge(oSrc, newId, { dashed });
      addEdge(newId, oTgt, { dashed });
    }
  }
  G.dragDef = null;
});

function findEdgeNear(px, py) {
  let best = null, bestD = 30;
  S.edges.forEach(edge => {
    const { ss, ts } = bestSides(edge.src, edge.tgt);
    const s = portXY(edge.src, ss), t = portXY(edge.tgt, ts);
    const mx=(s.x+t.x)/2, my=(s.y+t.y)/2;
    const d = Math.hypot(px-mx, py-my);
    if (d < bestD) { bestD=d; best=edge.id; }
  });
  return best;
}

window.addEventListener('mousemove', e => {
  // Node drag (single or group)
  if (G.drag) {
    const dx = (e.clientX - G.drag.sx) / S.zoom;
    const dy = (e.clientY - G.drag.sy) / S.zoom;
    // Move all nodes in the group
    Object.entries(G.drag.group).forEach(([nid, o]) => {
      const nd = S.nodes[nid]; if (!nd) return;
      nd.x = snapVal(o.ox + dx);
      nd.y = snapVal(o.oy + dy);
      const el2 = document.getElementById('node-' + nid);
      if (el2) { const p = nodeScreenPos(nd); el2.style.left = p.x + 'px'; el2.style.top = p.y + 'px'; }
    });
    renderEdges(); return;
  }
  // Canvas pan
  if (G.pan) {
    S.panX = G.pan.ox + (e.clientX-G.pan.sx);
    S.panY = G.pan.oy + (e.clientY-G.pan.sy);
    renderAll(); updateZoomLabel(); updateCanvasGrid(); return;
  }
  // Rubber-band selection
  if (G.rubber) {
    const rect = cWrap.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const x = Math.min(G.rubber.rx, cx), y = Math.min(G.rubber.ry, cy);
    const w = Math.abs(cx - G.rubber.rx), h = Math.abs(cy - G.rubber.ry);
    const rb = document.getElementById('rubber-band');
    if (rb) rb.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;display:block`;
    return;
  }
  // Connection preview
  if (G.conn) {
    const s = portXY(G.conn.srcId, G.conn.srcSide);
    const rect = cWrap.getBoundingClientRect();
    const tx = e.clientX-rect.left, ty = e.clientY-rect.top;
    // Guess opposite side for cursor end based on drag direction
    const dx=tx-s.x, dy=ty-s.y;
    const tsSide = Math.abs(dx)>=Math.abs(dy) ? (dx>=0?'l':'r') : (dy>=0?'t':'b');
    connPrev.setAttribute('d', bezier(s.x,s.y,tx,ty,G.conn.srcSide,tsSide));
  }
});

window.addEventListener('mouseup', e => {
  if (G.drag) { snapshot(); autoSave(); G.drag=null; }
  G.pan=null;
  // Rubber-band: finalize selection
  if (G.rubber) {
    const rb = document.getElementById('rubber-band');
    if (rb) {
      const rbRect = rb.getBoundingClientRect();
      Object.keys(S.nodes).forEach(nid => {
        const el = document.getElementById('node-' + nid);
        if (!el) return;
        const nr = el.getBoundingClientRect();
        const overlaps = nr.left < rbRect.right && nr.right > rbRect.left &&
                         nr.top < rbRect.bottom && nr.bottom > rbRect.top;
        if (overlaps) { S.selSet.add(nid); S.sel = nid; }
      });
      rb.style.display = 'none';
      if (S.selSet.size > 0) renderAll();
    }
    G.rubber = null;
  }
  // Don't clear conn if we're in pending click-connect mode
  if (!G.pendingConn) { G.conn=null; connPrev.style.display='none'; }
});

cWrap.addEventListener('mousedown', e => {
  if (e.target===cWrap || e.target===cSvg || e.target.id==='canvas-nodes') {
    if (G.pendingConn) { clearPendingConn(); return; }
    if (!e.shiftKey) deselect();
    if (e.shiftKey) {
      // Shift+drag on canvas = rubber-band add to selection
      const rect = cWrap.getBoundingClientRect();
      G.rubber = { sx: e.clientX, sy: e.clientY, rx: e.clientX - rect.left, ry: e.clientY - rect.top };
      let rb = document.getElementById('rubber-band');
      if (!rb) { rb = document.createElement('div'); rb.id = 'rubber-band'; cWrap.appendChild(rb); }
      rb.style.cssText = `left:${G.rubber.rx}px;top:${G.rubber.ry}px;width:0;height:0;display:block`;
    } else {
      G.pan = { sx:e.clientX, sy:e.clientY, ox:S.panX, oy:S.panY };
    }
  }
});

// Scroll = zoom
cWrap.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = cWrap.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const delta = e.deltaY<0 ? 1.1 : 0.9;
  const nz = Math.max(0.25, Math.min(2.5, S.zoom*delta));
  S.panX = mx-(mx-S.panX)*(nz/S.zoom);
  S.panY = my-(my-S.panY)*(nz/S.zoom);
  S.zoom = nz; renderAll(); updateZoomLabel();
}, { passive:false });

// ══ KEYBOARD SHORTCUTS ════════════════════════════════════════════════════════
// ── Context menu ──────────────────────────────────────────────────────────────
const _ctxMenu = document.getElementById('ctx-menu');
function _showCtxMenu(x, y, items) {
  if (!_ctxMenu) return;
  _ctxMenu.innerHTML = items.map(it =>
    it === '-' ? `<div class="ctx-sep"></div>` :
    `<div class="ctx-item" data-action="${esc(it.action)}">${esc(it.label)}</div>`
  ).join('');
  _ctxMenu.style.display = '';
  _ctxMenu.style.left = Math.min(x, window.innerWidth - 160) + 'px';
  _ctxMenu.style.top  = Math.min(y, window.innerHeight - (_ctxMenu.childElementCount * 32 + 8)) + 'px';
  _ctxMenu.querySelectorAll('.ctx-item').forEach(el => {
    el.onclick = () => { _hideCtxMenu(); window._ctxActions[el.dataset.action]?.(); };
  });
}
function _hideCtxMenu() { if (_ctxMenu) { _ctxMenu.style.display = 'none'; _ctxMenu.innerHTML = ''; } }
document.addEventListener('click', _hideCtxMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') _hideCtxMenu(); }, true);

window._ctxActions = {};

function _nodeContextMenu(id, x, y) {
  const n = S.nodes[id]; if (!n) return;
  const def = COMPONENT_DEFS.find(d => d.id === n.defId);
  window._ctxActions = {
    duplicate: () => {
      snapshot();
      const newId = 'n' + (++S.nSeq);
      S.nodes[newId] = {
        id: newId, defId: n.defId,
        x: n.x + 24, y: n.y + 24,
        w: n.w, h: n.h,
        props: { ...n.props, label: (n.props.label || def?.name || '') + ' (copy)' }
      };
      renderAll(); updateStats(); updateCost(); select(newId);
    },
    rename: () => {
      const el = document.getElementById('node-' + id);
      const labelEl = el?.querySelector('.node-label');
      if (labelEl) beginLabelEdit(id, labelEl);
    },
    delete: () => { deleteNode(id); },
    copyid: () => { try { navigator.clipboard.writeText(n.props.label || n.id); pushToast('Copied to clipboard', 'info'); } catch {} },
  };
  _showCtxMenu(x, y, [
    { label: '⧉ Duplicate', action: 'duplicate' },
    { label: '✏ Rename',    action: 'rename' },
    '-',
    { label: '📋 Copy Label', action: 'copyid' },
    '-',
    { label: '🗑 Delete',   action: 'delete' },
  ]);
}

// Attach contextmenu to node elements (called after render)
function _attachCtxMenu(id) {
  const el = document.getElementById('node-' + id);
  if (!el) return;
  el.oncontextmenu = e => {
    e.preventDefault(); e.stopPropagation();
    select(id);
    _nodeContextMenu(id, e.clientX + 4, e.clientY + 4);
  };
}

window.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA') return;
  if ((e.key==='Delete'||e.key==='Backspace') && !e.metaKey) {
    if (S.selSet.size > 1) {
      snapshot();
      const ids = [...S.selSet];
      // Use window.deleteNode so the collab wrapper fires for each deletion,
      // then do one final full sync to catch all removed edges at once
      ids.forEach(nid => { if (S.nodes[nid]) _origDeleteNode(nid); });
      if (C.active) pushToY(null);
    } else if (S.sel) { window.deleteNode(S.sel); }
    else if (S.selEdge) { deleteEdge(S.selEdge); }
    e.preventDefault();
  }
  if (e.key==='Escape') {
    if (_presentMode) { exitPresentMode(); return; }
    const sc = document.getElementById('shortcuts-modal');
    if (sc) { sc._close(); return; }
    clearPendingConn(); deselect(); _hideCtxMenu();
  }
  if (e.key==='?' || e.key==='/') { showShortcutsModal(); e.preventDefault(); return; }
  if (e.key==='g' || e.key==='G') { setSnapGrid(!S.snapGrid); e.preventDefault(); }
  if (e.key==='f' || e.key==='F') { fitView(); e.preventDefault(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { undo(); e.preventDefault(); }
  if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { redo(); e.preventDefault(); }
  if ((e.ctrlKey||e.metaKey) && e.key==='a') { fitView(); e.preventDefault(); }
  // Ctrl+D: duplicate selected node(s)
  if ((e.ctrlKey||e.metaKey) && e.key==='d' && (S.sel || S.selSet.size)) {
    e.preventDefault();
    snapshot();
    const newSelSet = new Set();
    let lastNewId = null;
    const toDup = S.selSet.size > 0 ? [...S.selSet] : (S.sel ? [S.sel] : []);
    // Build id map so internal edges between copies can be recreated
    const idMap = {};
    toDup.forEach(nid => { idMap[nid] = 'n' + (++S.nSeq); });
    toDup.forEach(nid => {
      const n = S.nodes[nid]; if (!n) return;
      const def2 = COMPONENT_DEFS.find(d => d.id === n.defId);
      const newId = idMap[nid];
      S.nodes[newId] = { id: newId, defId: n.defId, x: n.x+28, y: n.y+28, w: n.w, h: n.h,
        props: { ...n.props, label: (n.props.label || def2?.name || '') + ' copy' } };
      newSelSet.add(newId); lastNewId = newId;
    });
    // Recreate internal edges between duplicated nodes
    Object.values(S.edges).forEach(ed => {
      if (idMap[ed.src] && idMap[ed.tgt]) {
        const eid = 'e' + (++S.eSeq);
        S.edges[eid] = { id: eid, src: idMap[ed.src], srcSide: ed.srcSide,
          tgt: idMap[ed.tgt], tgtSide: ed.tgtSide, props: { ...ed.props } };
      }
    });
    S.selSet = newSelSet; S.sel = lastNewId;
    renderAll(); updateStats(); updateCost();
  }
});

// ══ VIEW HELPERS ══════════════════════════════════════════════════════════════
function fitView() {
  const ids = Object.keys(S.nodes); if (!ids.length) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  ids.forEach(id => { const n=S.nodes[id]; minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+n.h); });
  const rect=cWrap.getBoundingClientRect();
  const pw=rect.width-80, ph=rect.height-80;
  const nw=maxX-minX, nh=maxY-minY;
  S.zoom=Math.min(1.5, pw/(nw||1), ph/(nh||1));
  S.panX=(pw-nw*S.zoom)/2+40-minX*S.zoom;
  S.panY=(ph-nh*S.zoom)/2+40-minY*S.zoom;
  renderAll(); updateZoomLabel();
}

function updateZoomLabel() {
  const zEl = document.getElementById('sb-zoom');
  zEl.textContent = Math.round(S.zoom*100)+'%';
  zEl.title = 'Click to fit all in view (F)';
  zEl.style.cursor = 'pointer';
  updateCanvasGrid();
}
document.getElementById('sb-zoom').addEventListener('click', fitView);

function updateStats() {
  document.getElementById('sb-nodes').textContent = Object.keys(S.nodes).length;
  document.getElementById('sb-edges').textContent = S.edges.length;
  updateEmptyPanel();
  renderMiniMap();
}
// Status bar: click nodes chip → select all; click edges chip → (no-op or future)
document.getElementById('sb-nodes')?.closest('.sb-stat')?.addEventListener('click', () => {
  const ids = Object.keys(S.nodes);
  if (!ids.length) return;
  ids.forEach(id => S.selSet.add(id));
  S.sel = ids[ids.length - 1];
  renderAll(); showProps();
  pushToast(`${ids.length} node${ids.length!==1?'s':''} selected`, 'info');
});
function updateCost() {
  let t = 0;
  Object.values(S.nodes).forEach(n => {
    const def2 = COMPONENT_DEFS.find(d => d.id === n.defId);
    const cat = def2?.category || 'other';
    t += (n.props.cost || 0) * _reservedDiscount(cat);
  });
  document.getElementById('cost-badge').textContent = '$' + Math.round(t).toLocaleString() + ' / mo';
  if (S.reservedPricing) {
    document.getElementById('cost-badge').style.borderColor = '#34d058';
    document.getElementById('cost-badge').style.color = '#34d058';
  } else {
    document.getElementById('cost-badge').style.borderColor = '';
    document.getElementById('cost-badge').style.color = '';
  }
}

function clearCanvas(silent) {
  if (!silent && !confirm('Clear the canvas?')) return;
  S.nodes={}; S.edges=[]; S.eFlow={}; S.simLoad={}; S.sel=null; S.selEdge=null;
  S.activeExample='';
  S.nSeq=0; S.eSeq=0;
  setExampleSelect('');
  cNodes.innerHTML=''; edgesG.innerHTML=''; labelsG.innerHTML=''; particlesG.innerHTML='';
  minimapSvg.innerHTML='';
  document.getElementById('suggestions').innerHTML='';
  document.getElementById('canvas-empty').style.display='';
  showProps(null); updateStats(); updateCost();
}

function normalizeImportedArchitecture(payload) {
  const rawNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const rawEdges = Array.isArray(payload.edges) ? payload.edges : [];
  const nextNodes = {};
  let maxNode = 0, maxEdge = 0;

  rawNodes.forEach(item => {
    const defId = item.defId || item.data?.defId || item.type;
    const def = COMPONENT_DEFS.find(d => d.id === defId);
    if (!def || !item.id) return;
    const pos = item.position || {};
    const x = Number.isFinite(item.x) ? item.x : Number(pos.x || 80);
    const y = Number.isFinite(item.y) ? item.y : Number(pos.y || 80);
    const props = item.props || item.data?.props || {};
    nextNodes[item.id] = {
      id: item.id,
      defId,
      x,
      y,
      w: Number(item.w || 160),
      h: Number(item.h || 88),
      props: { ...def.defaults, ...props }
    };
    maxNode = Math.max(maxNode, parseInt(String(item.id).replace(/\D/g, ''), 10) || 0);
  });

  const nextEdges = rawEdges
    .map(edge => ({
      id: edge.id || 'e' + (++maxEdge),
      src: edge.src || edge.source,
      tgt: edge.tgt || edge.target,
      animated: edge.animated !== false,
      dashed: !!edge.dashed || !!edge.style?.strokeDasharray,
      replication: !!edge.replication
    }))
    .filter(edge => nextNodes[edge.src] && nextNodes[edge.tgt])
    .map(edge => {
      maxEdge = Math.max(maxEdge, parseInt(String(edge.id).replace(/\D/g, ''), 10) || 0);
      return edge;
    });

  return {
    nodes: nextNodes,
    edges: nextEdges,
    nSeq: maxNode,
    eSeq: maxEdge,
    view: payload.view || {},
    users: payload.users,
    title: payload.title || '',
    activeExample: payload.activeExample || ''
  };
}

function importArchitecture(payload) {
  const next = normalizeImportedArchitecture(payload);
  snapshot();
  S.nodes = next.nodes;
  S.edges = next.edges;
  S.eFlow = {};
  S.simLoad = {};
  S.sel = null;
  S.selEdge = null;
  S.nSeq = next.nSeq;
  S.eSeq = next.eSeq;
  S.activeExample = next.activeExample;
  if (Number.isFinite(next.view?.zoom)) S.zoom = next.view.zoom;
  if (Number.isFinite(next.view?.panX)) S.panX = next.view.panX;
  if (Number.isFinite(next.view?.panY)) S.panY = next.view.panY;
  if (Number.isFinite(next.users)) {
    syncSlider(next.users);
  }
  if (next.title) {
    const titleEl = document.getElementById('diagram-title');
    if (titleEl) titleEl.value = next.title;
    document.title = next.title + ' — Archi-Flow';
  }
  setExampleSelect(S.activeExample);
  cNodes.innerHTML = '';
  edgesG.innerHTML = '';
  labelsG.innerHTML = '';
  particlesG.innerHTML = '';
  document.getElementById('canvas-empty').style.display = Object.keys(S.nodes).length ? 'none' : '';
  renderAll(); updateStats(); updateCost(); showProps(null);
  if (!Number.isFinite(next.view?.zoom)) setTimeout(fitView, 50);
}

function architecturePayload() {
  return {
    version: 1,
    title: getDiagramTitle(),
    activeExample: S.activeExample,
    users: Number(uInp.value || computeTotalRPS()),
    view: { zoom: S.zoom, panX: S.panX, panY: S.panY },
    nodes: Object.values(S.nodes),
    edges: S.edges
  };
}

function diagramBounds(pad = 90) {
  const nodes = Object.values(S.nodes);
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 900, maxY: 560, width: 900, height: 560, pad };
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  });
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, pad };
}

function modelPortXY(nodeId, side) {
  const n = S.nodes[nodeId]; if (!n) return { x: 0, y: 0 };
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  if (side === 'r') return { x: n.x + n.w, y: cy };
  if (side === 'l') return { x: n.x, y: cy };
  if (side === 't') return { x: cx, y: n.y };
  if (side === 'b') return { x: cx, y: n.y + n.h };
  return { x: cx, y: cy };
}

function svgWrapText(text, maxChars) {
  if (!text) return [];
  const lines = [];
  const words = text.replace(/\r\n?/g, '\n').split(/(\s+)/);
  let current = '';
  for (const token of words) {
    if (token === '\n') {
      lines.push(current.trim());
      current = '';
      continue;
    }
    if (current.length + token.length > maxChars && current.trim()) {
      lines.push(current.trim());
      current = token.trim();
    } else {
      current += token;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function exportNodeHtml(id) {
  const n = S.nodes[id];
  const live = document.getElementById('node-' + id);
  if (!n || !live) return '';
  const clone = live.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.remove('selected', 'node-pop-in');
  clone.classList.add('export-node');
  clone.querySelectorAll('.port, .node-label-input').forEach(el => el.remove());
  clone.setAttribute('style', `${live.getAttribute('style') || ''};position:relative!important;left:0!important;top:0!important;width:${n.w}px!important;height:${n.h}px!important;transform:none!important;transform-origin:top left!important;pointer-events:none!important;`);
  return new XMLSerializer().serializeToString(clone);
}

function exportNodeCss() {
  const isLight = effectiveTheme() === 'light';
  return `
    .export-html, .export-node { box-sizing: border-box; font-family: Inter, Arial, sans-serif; letter-spacing: 0; }
    .export-html {
      --text:${isLight ? '#172033' : '#f7fbff'};
      --text2:${isLight ? '#334155' : '#dbe7f3'};
      --muted:${isLight ? '#6b7788' : '#93a2b5'};
      --surface3:${isLight ? '#edf2f7' : '#223044'};
      --border2:${isLight ? '#c8d2de' : '#405268'};
      --node-bg:${isLight ? 'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)' : 'linear-gradient(160deg,#131c28 0%,#0d1520 100%)'};
      --node-border:${isLight ? 'rgba(51,65,85,0.16)' : 'rgba(100,130,165,0.22)'};
      --node-shadow:${isLight ? '0 6px 18px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' : '0 4px 22px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)'};
    }
    .export-node {
      overflow: visible;
      border-radius: 13px;
      border: 1px solid var(--node-border);
      background: var(--node-bg);
      color: var(--text);
      box-shadow: var(--node-shadow);
    }
    .export-node .node-accent { height: 4px; width: 100%; border-radius: 13px 13px 0 0; }
    .export-node .node-body { padding: 10px 12px 9px; }
    .export-node .node-header { display: flex; align-items: flex-start; gap: 9px; }
    .export-node .node-icon-wrap {
      width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .export-node .node-icon-wrap svg { width: 18px; height: 18px; display: block; }
    .export-node .node-titles { min-width: 0; flex: 1; overflow: hidden; }
    .export-node .node-label {
      font-size: 12px; line-height: 1.25; font-weight: 700; color: var(--text); overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .export-node .node-type {
      display: inline-flex; align-items: center; gap: 4px; max-width: 100%; width: fit-content; margin-top: 4px; padding: 2px 6px;
      border-radius: 999px; background: ${isLight ? '#f8fafc' : 'color-mix(in srgb, var(--surface3) 76%, transparent)'};
      border: 1px solid ${isLight ? '#dbe4ee' : 'color-mix(in srgb, var(--border2) 72%, transparent)'};
      color: var(--text2); font-size: 9.5px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .export-node .node-tool-kicker { color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    .export-node .node-tool-dot { width: 5px; height: 5px; border-radius: 999px; flex: 0 0 auto; }
    .export-node .node-tool-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .export-node .node-badges { display: flex; flex-wrap: wrap; margin-top: 7px; gap: 4px; }
    .export-node .badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 5px; line-height: 1.35; letter-spacing: 0.01em; }
    .export-node .badge-info { background: rgba(79,156,249,0.14); color: ${isLight ? '#2563eb' : '#9ccfff'}; border: 1px solid rgba(79,156,249,0.32); }
    .export-node .badge-scale { background: rgba(132,204,22,0.14); color: ${isLight ? '#3f6212' : '#bef264'}; border: 1px solid rgba(132,204,22,0.35); }
    .export-node .badge-err { background: rgba(248,81,73,0.14); color: ${isLight ? '#dc2626' : '#fca5a5'}; border: 1px solid rgba(248,81,73,0.35); }
    .export-node .note-text { margin-top: 10px; font-size: 11px; line-height: 1.45; white-space: pre-wrap; overflow: hidden; }
    .export-node .node-load-bar { height: 3px; background: rgba(0,0,0,0.16); margin: 7px -12px -9px; border-radius: 0 0 13px 13px; overflow: hidden; }
    .export-node .node-load-fill { height: 100%; }
  `;
}

function ellipsize(text, maxChars) {
  const s = String(text ?? '');
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
}

function iconSvgForExport(def, x = 22, y = 34) {
  return String(def.icon || '').replace('<svg ', `<svg x="${x}" y="${y}" color="${esc(def.color)}" `);
}

function nativeExportNodes(b, T) {
  return Object.values(S.nodes).map(n => {
    const def = COMPONENT_DEFS.find(d => d.id === n.defId);
    const sim = S.simLoad[n.id];
    const pct = sim?.loadPct ?? 0;
    const status = !S.simOn ? def.color : pct > 85 ? '#f85149' : pct > 60 ? '#e3b341' : '#3fb950';
    const x = n.x - b.minX, y = n.y - b.minY;
    const label = ellipsize(n.props.label || def.name, Math.max(8, Math.floor((n.w - 66) / 7)));
    const type = n.defId === 'textnote' ? (n.props.tone || 'Neutral') : def.name;
    const shortType = ellipsize(type, Math.max(7, Math.floor((n.w - 108) / 5.4)));
    const toolKicker = n.defId === 'textnote' ? 'NOTE' : 'TOOL';
    const typeW = Math.min(n.w - 66, Math.max(54, 28 + shortType.length * 5.3 + toolKicker.length * 4.7));
    const noteLines = n.defId === 'textnote'
      ? svgWrapText(n.props.text || '', Math.max(24, Math.floor((n.w - 32) / 7))).slice(0, 5)
      : [];
    const noteTextSvg = noteLines.length
      ? noteLines.map((line, idx) => `
          <text x="18" y="${88 + idx * 16}" fill="${T.nodeLabel}" font-size="11" font-family="Inter, Arial, sans-serif" xml:space="preserve">${esc(line)}</text>`).join('')
      : '';
    const badge = n.defId === 'users' ? compactNum(n.props.userCount || 0) + ' users'
      : S.simOn && sim ? Math.round(Math.min(pct, 999)) + '% load'
      : n.defId === 'deviceapp' ? '×' + (n.props.eventsPerInput || 1) + ' emit'
      : '';
    const badgeSvg = badge
      ? `<rect x="14" y="67" width="${Math.max(54, badge.length*6+18)}" height="18" rx="5" fill="${T.badgeFill}" stroke="${T.badgeStroke}"/><text x="22" y="80" fill="${T.badgeText}" font-size="9" font-weight="700" font-family="Inter, Arial, sans-serif">${esc(badge)}</text>`
      : '';
    const loadBar = S.simOn && sim && pct > 0
      ? `<rect x="0" y="${n.h - 3}" width="${n.w}" height="3" rx="1.5" fill="rgba(0,0,0,0.16)"/><rect x="0" y="${n.h - 3}" width="${Math.min(n.w, n.w * Math.min(pct, 100) / 100)}" height="3" rx="1.5" fill="${status}"/>`
      : '';
    return `
      <g transform="translate(${x},${y})" filter="url(#card-shadow)">
        <rect width="${n.w}" height="${n.h}" rx="13" fill="${T.nodeFill}" stroke="${T.nodeStroke}" stroke-width="1"/>
        <rect width="${n.w}" height="4" rx="2" fill="${status}"/>
        <rect x="14" y="26" width="34" height="34" rx="9" fill="${def.color}1e" stroke="${def.color}55"/>
        ${iconSvgForExport(def)}
        <text x="62" y="39" fill="${T.nodeLabel}" font-size="12" font-weight="700" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
        <rect x="62" y="47" width="${typeW}" height="16" rx="8" fill="${T.toolFill}" stroke="${T.toolStroke}"/>
        <text x="68" y="58.4" fill="${T.nodeType}" font-size="8" font-weight="800" letter-spacing=".6" font-family="Inter, Arial, sans-serif">${toolKicker}</text>
        <circle cx="${70 + toolKicker.length * 4.6 + 8}" cy="55" r="2.5" fill="${def.color}"/>
        <text x="${70 + toolKicker.length * 4.6 + 15}" y="58.4" fill="${T.nodeLabel}" font-size="9.5" font-weight="700" font-family="Inter, Arial, sans-serif">${esc(shortType)}</text>
        ${badgeSvg}
        ${noteTextSvg}
        ${loadBar}
      </g>`;
  }).join('');
}

function diagramSvgString({ htmlNodes = true } = {}) {
  const b = diagramBounds();
  const title = getDiagramTitle();
  const isLight = effectiveTheme() === 'light';

  // Theme tokens
  const T = isLight ? {
    bg:          '#f7f9fc',
    gridMinor:   '#edf2f7',
    gridMajor:   '#cdd7e3',
    gridOpacity: '1',
    nodeFill:    '#ffffff',
    nodeStroke:  '#d0daea',
    titleText:   '#172033',
    subtitleText:'#64748b',
    nodeLabel:   '#172033',
    nodeType:    '#64748b',
    toolFill:    '#f8fafc',
    toolStroke:  '#dbe4ee',
    badgeFill:   '#eff6ff',
    badgeStroke: '#93c5fd',
    badgeText:   '#2563eb',
    edgeStroke:  '#3b82f6',
    labelFill:   '#e0f0ff',
    labelText:   '#1d4ed8',
    shadowOp:    '.10',
  } : {
    bg:          '#0a0f16',
    gridMinor:   '#151e29',
    gridMajor:   '#263545',
    gridOpacity: '1',
    nodeFill:    '#121b26',
    nodeStroke:  '#405268',
    titleText:   '#f7fbff',
    subtitleText:'#93a2b5',
    nodeLabel:   '#f7fbff',
    nodeType:    '#93a2b5',
    toolFill:    '#1a2635',
    toolStroke:  '#33445c',
    badgeFill:   '#1f6feb22',
    badgeStroke: '#58a6ff55',
    badgeText:   '#9ccfff',
    edgeStroke:  '#7dbbff',
    labelFill:   '#0d1117cc',
    labelText:   '#d8e7f7',
    shadowOp:    '.32',
  };

  const gridLines = (step, stroke, opacity, width = 1) => {
    const startX = Math.floor(b.minX / step) * step;
    const startY = Math.floor(b.minY / step) * step;
    const vertical = [];
    const horizontal = [];
    for (let x = startX; x <= b.maxX; x += step) vertical.push(`<path d="M${Math.round(x - b.minX)} 0V${b.height}"/>`);
    for (let y = startY; y <= b.maxY; y += step) horizontal.push(`<path d="M0 ${Math.round(y - b.minY)}H${b.width}"/>`);
    return `<g opacity="${opacity}" stroke="${stroke}" stroke-width="${width}">${vertical.join('')}${horizontal.join('')}</g>`;
  };

  const defs = `
    <defs>
      <marker id="snap-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,1 L0,7 L7,4z" fill="${T.edgeStroke}"/></marker>
      <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="${T.shadowOp}"/></filter>
    </defs>`;
  const grid = `<rect width="100%" height="100%" fill="${T.bg}"/>${gridLines(10, T.gridMinor, isLight ? 0.82 : 0.48)}${gridLines(40, T.gridMajor, isLight ? 0.88 : 0.75)}`;

  const edges = Object.values(S.edges).map(edge => {
    const { ss, ts } = bestSides(edge.src, edge.tgt);
    const s = modelPortXY(edge.src, ss);
    const t = modelPortXY(edge.tgt, ts);
    const d = bezier(s.x - b.minX, s.y - b.minY, t.x - b.minX, t.y - b.minY, ss, ts);
    const stroke = edge.replication ? '#a855f7' : T.edgeStroke;
    const dash = edge.dashed ? ' stroke-dasharray="8 7"' : '';
    const flow = S.eFlow[edge.id];
    const label = S.simOn && flow > 0 && !edge.dashed
      ? `<text x="${((s.x+t.x)/2)-b.minX}" y="${((s.y+t.y)/2)-b.minY-10}" fill="${T.labelText}" font-size="12" text-anchor="middle" font-family="Inter, Arial">${esc(formatFlow(flow))}</text>`
      : '';
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" marker-end="url(#snap-arr)"${dash}/>${label}`;
  }).join('');

  const nodes = htmlNodes ? Object.values(S.nodes).map(n => {
    const x = n.x - b.minX, y = n.y - b.minY;
    const html = exportNodeHtml(n.id);
    if (!html) return '';
    return `
      <foreignObject x="${x}" y="${y}" width="${n.w}" height="${n.h}" overflow="visible">
        <div xmlns="http://www.w3.org/1999/xhtml" class="export-html" data-theme="${isLight ? 'light' : 'dark'}">
          ${html}
        </div>
      </foreignObject>`;
  }).join('') : nativeExportNodes(b, T);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${b.width}" height="${b.height}" viewBox="0 0 ${b.width} ${b.height}" role="img" aria-label="${esc(title)}">
      ${defs}
      <style>${exportNodeCss()}</style>
      ${grid}
      <g>${edges}</g>
      <g>${nodes}</g>
      <text x="18" y="${b.height - 18}" fill="${T.subtitleText}" font-size="11" font-family="Inter, Arial">${esc(`Archi-Flow architecture snapshot • ${new Date().toLocaleString()}`)}</text>
    </svg>`;
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1200);
}

function exportDiagramSvg() {
  downloadBlob(new Blob([diagramSvgString()], { type: 'image/svg+xml;charset=utf-8' }), 'archi-flow-diagram.svg');
}

async function shareDiagram() {
  const url = updateShareHash();
  const svgBlob = new Blob([diagramSvgString()], { type: 'image/svg+xml' });
  const file = new File([svgBlob], 'archi-flow-diagram.svg', { type: 'image/svg+xml' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ title: getDiagramTitle(), text: 'Archi-Flow architecture diagram', url, files: [file] });
    return 'shared';
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/svg+xml': svgBlob,
        'text/plain': new Blob([url], { type: 'text/plain' })
      })
    ]);
    return 'image';
  } catch {
    await navigator.clipboard.writeText(url);
    return 'link';
  }
}

function toExportValue(key, value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'autoScale') return value ? 'Enabled' : 'Disabled';
  if (['cacheHitRate','hitRate','blockRate','errorRate','samplingRate','rejectionRate'].includes(key)) return `${value}%`;
  if (key === 'cost' && typeof value === 'number') return `$${compactNum(value)}/mo`;
  if (typeof value === 'number') {
    const compactKeys = new Set([
      'capacity','maxConnections','userCount','eventRate','changeRate','throughput','maxMessages',
      'storageTB','sizeGB','storageGB','iops','executions','ingestGBDay'
    ]);
    if (compactKeys.has(key) || Math.abs(value) >= 1000) return compactNum(value);
    return Number.isInteger(value) ? value.toLocaleString('en-US') : String(value);
  }
  return String(value);
}

function componentPropDefs(def) {
  const seen = new Set();
  return [...(def?.properties || []), ...(def?.scaleProps || [])].filter(p => {
    if (!p?.key || seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
}

function propLabel(def, key) {
  return componentPropDefs(def).find(p => p.key === key)?.label || ({
    label: 'Label', region: 'Region', zone: 'Zone', runtime: 'Runtime', cpu: 'CPU', cpuRequest: 'CPU Request',
    memory: 'Memory', memoryRequest: 'Memory Request', storage: 'Storage', storageTB: 'Storage (TB)',
    capacity: 'Capacity', maxConnections: 'Max connections', userCount: 'Users', requestsPerUser: 'Events/User/s',
    eventRate: 'Event rate', changeRate: 'Change rate', readReplicas: 'Read replicas', autoScale: 'Auto-scale',
    scaleUpAt: 'Scale-up threshold', scaleUpThreshold: 'Scale-up threshold', maxReplicas: 'Max replicas',
    cost: 'Cost', errorRate: 'Error rate', latencyMs: 'Base latency', avgLatencyMs: 'Avg latency',
    concurrency: 'Concurrency', cacheHitRate: 'Cache hit rate', hitRate: 'Hit rate', blockRate: 'Block rate'
  }[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()));
}

function visiblePropRows(n) {
  const props = n.props || {};
  const def = COMPONENT_DEFS.find(d => d.id === n.defId) || {};
  const keys = componentPropDefs(def).map(p => p.key);
  Object.keys(props).forEach(key => {
    if (!key.startsWith('_') && !keys.includes(key)) keys.push(key);
  });
  return keys
    .filter(key => key !== 'label' && !key.startsWith('_') && props[key] != null && props[key] !== '')
    .map(key => ({ label: propLabel(def, key), value: toExportValue(key, props[key]), key }));
}

function compactPropList(n, limit = 6) {
  const rows = visiblePropRows(n).filter(r => !['cost'].includes(r.key));
  return rows.slice(0, limit).map(r => `<span class="mini-chip"><strong>${esc(r.label)}:</strong> ${esc(r.value)}</span>`).join('');
}

function nodeTrafficProfile(n) {
  const sim = S.simLoad[n.id];
  const outgoing = S.edges.filter(e => e.src === n.id && !e.dashed && !e._warn && S.nodes[e.tgt]);
  const outFlow = outgoing.reduce((sum, e) => sum + (S.eFlow[e.id] || 0), 0);
  const incoming = sim?.incoming ?? (SOURCE_DEFS.has(n.defId) ? sourceRate(n) : 0);
  const props = n.props || {};
  const def = COMPONENT_DEFS.find(d => d.id === n.defId) || {};
  const reads = ['database','cache','queryengine','searchengine','vectordb','objectstorage','datalake','tableformat'].includes(n.defId) ? incoming : null;
  const writes = ['database','queue','kafkatopic','eventbus','pubsub','objectstorage','datalake','warehouse','logging','appinsights'].includes(n.defId) ? incoming : null;
  const assumptions = [];
  if (n.defId === 'users') assumptions.push(`${compactNum(props.userCount || 100)} users × ${props.requestsPerUser || 1} events/user/s`);
  if (n.defId === 'deviceapp') assumptions.push(`Emits ×${props.eventsPerInput || 1} events per upstream event`);
  if (n.defId === 'eventsource') assumptions.push(`${formatFlow(props.eventRate || 0)} source event rate`);
  if (n.defId === 'cdcsource') assumptions.push(`${formatFlow(props.changeRate || props.capacity || 0)} database changes`);
  if (n.defId === 'cdn') assumptions.push(`${props.cacheHitRate || 85}% cache hit; forwards ${100 - (props.cacheHitRate || 85)}%`);
  if (n.defId === 'cache') assumptions.push(`${props.hitRate || 80}% cache hit; forwards ${100 - (props.hitRate || 80)}% misses`);
  if (n.defId === 'firewall' || n.defId === 'waf') assumptions.push(`${props.blockRate || 5}% blocked before downstream`);
  if (n.defId === 'database' && props.readReplicas > 0) assumptions.push(`${props.readReplicas} read replica(s); read capacity treated as primary + replicas`);
  if (outgoing.length) {
    const splitText = outgoingSplitDetails(n.id).map(({ edge, pct, mode }) => {
      const tgt = S.nodes[edge.tgt];
      const tgtDef = COMPONENT_DEFS.find(d => d.id === tgt?.defId);
      const label = tgt?.props?.label || tgtDef?.name || edge.tgt;
      return `${Math.round(pct * 10) / 10}% → ${label}${mode === 'remainder' ? ' (remaining)' : mode === 'equal' ? ' (equal)' : ''}`;
    }).join('; ');
    assumptions.push(`Outgoing split: ${splitText}`);
  }
  return {
    incoming,
    outgoing: outFlow,
    reads,
    writes,
    assumptions: assumptions.length ? assumptions.join('. ') : `${def.name || n.defId} uses configured capacity/cost properties.`
  };
}

function nodeSettingsHtml(n) {
  const props = n.props || {};
  const def = COMPONENT_DEFS.find(d => d.id === n.defId) || {};
  const traffic = nodeTrafficProfile(n);
  const lines = [];
  lines.push({ label: 'Tool', value: esc(def.name || n.defId) });
  lines.push({ label: 'Category', value: esc(def.category || '—') });
  lines.push({ label: 'Traffic in', value: esc(formatFlow(traffic.incoming)) });
  if (traffic.outgoing > 0) lines.push({ label: 'Traffic out', value: esc(formatFlow(traffic.outgoing)) });
  if (traffic.reads != null) lines.push({ label: 'Read ops', value: esc(formatFlow(traffic.reads, 'reads/s')) });
  if (traffic.writes != null) lines.push({ label: 'Write ops', value: esc(formatFlow(traffic.writes, 'writes/s')) });
  visiblePropRows(n).forEach(row => lines.push({ label: row.label, value: esc(row.value) }));
  if (def.description) lines.push({ label: 'Cost basis', value: esc(def.description.slice(0, 180) + (def.description.length > 180 ? '…' : '')) });
  lines.push({ label: 'Assumptions', value: esc(traffic.assumptions) });
  if (n.defId === 'textnote' && props.text) {
    lines.push({ label: 'Text', value: esc(props.text.slice(0, 150) + (props.text.length > 150 ? '…' : '')) });
  }
  return `<div class="setting-card"><div class="setting-card-title">${esc(props.label || def.name || n.id)}</div>${lines.map((row, idx) => `
      <div class="setting-row"${idx===0?' style="font-weight:800;color:#111"':''}><div>${row.label}</div><div>${row.value}</div></div>`).join('')}</div>`;
}

function exportPdfReport() {
  const payload = architecturePayload();
  const svg     = diagramSvgString();
  const win = window.open('', '_blank');
  if (!win) { pushToast('Popup blocked — allow popups and try again.', 'warn'); return; }

  const realNodes = payload.nodes.filter(n => !n.props?._isReplica);
  const totalCost = realNodes.reduce((s, n) => s + Number(n.props?.cost || 0), 0);
  const loads     = Object.values(S.simLoad).filter(x => typeof x.loadPct === 'number');
  const critical  = loads.filter(x => x.loadPct > 85).length;
  const warning   = loads.filter(x => x.loadPct > 60 && x.loadPct <= 85).length;
  const healthy   = loads.filter(x => x.loadPct <= 60 && x.status !== 'source').length;
  const simActive = S.simOn || loads.length > 0;

  const ts     = new Date().toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
  const tsISO  = new Date().toISOString().slice(0,10);

  // ── helpers ────────────────────────────────────────────────────────────────
  const statusBadge = (sim, inline) => {
    if (!sim || !simActive || sim.status === 'source') return inline
      ? '<span class="pill pill-idle">—</span>'
      : '<span class="pill pill-idle">—</span>';
    if (sim.poolExhausted) return `<span class="pill pill-crit">Pool Exhausted</span>`;
    if (sim.loadPct > 85)  return `<span class="pill pill-crit">${Math.round(sim.loadPct)}% Critical</span>`;
    if (sim.loadPct > 60)  return `<span class="pill pill-warn">${Math.round(sim.loadPct)}% High</span>`;
    return `<span class="pill pill-ok">${Math.round(sim.loadPct)}% Healthy</span>`;
  };

  // load bar SVG (mini horizontal bar)
  const loadBar = (pct) => {
    if (pct == null) return '';
    const w = Math.min(100, Math.round(pct));
    const col = pct > 85 ? '#f85149' : pct > 60 ? '#f5b731' : '#34d058';
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:6px;background:#e8ecf2;border-radius:3px;overflow:hidden;min-width:60px">
        <div style="width:${w}%;height:100%;background:${col};border-radius:3px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${col};min-width:32px;text-align:right">${Math.round(pct)}%</span>
    </div>`;
  };

  // cost bar for cost breakdown chart
  const costCategories = {};
  realNodes.forEach(n => {
    const def = COMPONENT_DEFS.find(d => d.id === n.defId);
    const cat = def?.category || 'other';
    costCategories[cat] = (costCategories[cat] || 0) + Number(n.props?.cost || 0);
  });
  const catColors = { compute:'#4f9cf9', network:'#a78bfa', storage:'#34d058', data:'#f5b731', messaging:'#f97316', observability:'#64748b', security:'#ec4899', 'ai/ml':'#06b6d4', other:'#94a3b8' };
  const maxCatCost = Math.max(...Object.values(costCategories), 1);
  const costChartBars = Object.entries(costCategories).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([cat,v]) => {
    const pct = Math.round((v / maxCatCost) * 100);
    const col = catColors[cat] || '#94a3b8';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <div style="width:72px;font-size:10px;font-weight:600;color:#5a6a80;text-align:right;text-transform:capitalize">${cat}</div>
      <div style="flex:1;height:18px;background:#f1f5f9;border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:4px;display:flex;align-items:center;padding-left:6px">
          <span style="font-size:9.5px;font-weight:700;color:#fff;white-space:nowrap">${compactMoney(v)}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  const topCostNodes = realNodes
    .map(n => ({ n, def: COMPONENT_DEFS.find(d => d.id === n.defId), cost: Number(n.props?.cost || 0) }))
    .filter(x => x.cost > 0)
    .sort((a,b) => b.cost - a.cost)
    .slice(0, 5);

  const topCostHtml = topCostNodes.length ? topCostNodes.map(({ n, def, cost }, idx) => `
    <div class="rank-row">
      <div class="rank-num">${idx + 1}</div>
      <div class="rank-main">
        <div class="rank-title">${esc(n.props.label || def?.name || n.id)}</div>
        <div class="rank-sub">${esc(def?.name || n.defId)}${n.props.region ? ` · ${esc(n.props.region)}` : ''}</div>
      </div>
      <div class="rank-val">${compactMoney(cost)}<span>/mo</span></div>
    </div>`).join('') : `<div class="empty-note">No monthly cost values configured yet.</div>`;

  // ── component table rows ────────────────────────────────────────────────────
  const rows = realNodes.map(n => {
    const def  = COMPONENT_DEFS.find(d => d.id === n.defId);
    const sim  = S.simLoad[n.id];
    const cost = Number(n.props?.cost || 0);
    const traffic = nodeTrafficProfile(n);
    const lat  = sim?.latencyMs;
    const p95  = sim?.p95Ms;
    const err  = sim?.errorRate;
    const slaRaw = sim?.sla;  // stored as "99.50%" string
    const slaNum = slaRaw != null ? parseFloat(slaRaw) : null;
    const region = n.props?.region || '';
    return `<tr>
      <td>
        <div style="font-weight:700;color:#1a2030;font-size:12px">${esc(n.props.label || def?.name || n.id)}</div>
        <div style="font-size:10px;color:#8896a5;margin-top:1px">${esc(def?.name || n.defId)}${region ? ` · ${region}` : ''}</div>
      </td>
      <td>${compactPropList(n, 5) || '<span class="dim">—</span>'}</td>
      <td>${sim ? loadBar(sim.loadPct) : '<span class="dim">—</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">${sim ? esc(formatFlow(sim.incoming)) : '<span class="dim">—</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">${traffic.outgoing > 0 ? esc(formatFlow(traffic.outgoing)) : '<span class="dim">—</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">
        ${traffic.reads != null ? `<div>${esc(formatFlow(traffic.reads, 'read/s'))}</div>` : ''}
        ${traffic.writes != null ? `<div>${esc(formatFlow(traffic.writes, 'write/s'))}</div>` : ''}
        ${traffic.reads == null && traffic.writes == null ? '<span class="dim">—</span>' : ''}
      </td>
      <td style="font-variant-numeric:tabular-nums">${sim && typeof sim.capacity==='number' ? esc(formatFlow(sim.capacity)) : '<span class="dim">—</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">${lat != null ? lat+'<span class="unit">ms</span>' : '<span class="dim">—</span>'}</td>
      <td style="font-variant-numeric:tabular-nums">${p95 != null ? p95+'<span class="unit">ms</span>' : '<span class="dim">—</span>'}</td>
      <td>${err != null ? `<span style="color:${err>5?'#f85149':err>1?'#f5b731':'#34d058'};font-weight:700">${err}%</span>` : '<span class="dim">—</span>'}</td>
      <td>${slaNum != null ? `<span style="font-weight:700;color:${slaNum>=99.9?'#34d058':slaNum>=99?'#f5b731':'#f85149'}">${slaNum.toFixed(2)}%</span>` : '<span class="dim">—</span>'}</td>
      <td style="font-weight:700;color:#1a2030;font-variant-numeric:tabular-nums">${cost > 0 ? compactMoney(cost) : '<span class="dim">—</span>'}</td>
    </tr>`;
  }).join('');

  const assumptionRows = realNodes.map(n => {
    const def = COMPONENT_DEFS.find(d => d.id === n.defId);
    const traffic = nodeTrafficProfile(n);
    return `<tr>
      <td>
        <div style="font-weight:750;color:#1a2030">${esc(n.props.label || def?.name || n.id)}</div>
        <div style="font-size:10px;color:#8896a5">${esc(def?.name || n.defId)}</div>
      </td>
      <td style="font-variant-numeric:tabular-nums">${esc(formatFlow(traffic.incoming))}</td>
      <td style="font-variant-numeric:tabular-nums">${traffic.outgoing > 0 ? esc(formatFlow(traffic.outgoing)) : '<span class="dim">—</span>'}</td>
      <td>${esc(traffic.assumptions)}</td>
    </tr>`;
  }).join('');

  // ── bottleneck analysis ────────────────────────────────────────────────────
  const bottlenecks = realNodes
    .map(n => ({ n, sim: S.simLoad[n.id], def: COMPONENT_DEFS.find(d=>d.id===n.defId) }))
    .filter(({sim}) => sim && sim.loadPct > 60 && sim.status !== 'source')
    .sort((a,b) => b.sim.loadPct - a.sim.loadPct)
    .slice(0, 5);

  const bottleneckCards = bottlenecks.length ? bottlenecks.map(({n, sim, def}) => {
    const isCrit = sim.loadPct > 85;
    const bg  = isCrit ? '#fff1f0' : '#fffbeb';
    const bdr = isCrit ? '#fecaca' : '#fde68a';
    const ico = isCrit ? '🔴' : '🟡';
    const rec = sim.poolExhausted
      ? 'Increase <code>maxConnections</code> or add a connection pool / caching layer in front.'
      : sim.loadPct > 150
        ? 'Traffic far exceeds capacity. Scale horizontally or increase capacity significantly.'
        : 'Consider increasing capacity, enabling auto-scaling, or distributing load with a load balancer.';
    return `<div style="background:${bg};border:1px solid ${bdr};border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span>${ico}</span>
        <strong style="font-size:13px">${esc(n.props.label || def?.name || n.id)}</strong>
        <span style="font-size:10px;color:#8896a5;margin-left:auto">${esc(def?.name||n.defId)}</span>
        ${statusBadge({...sim})}
      </div>
      <div style="font-size:11px;color:#556070;line-height:1.6">
        Receiving <strong>${formatFlow(sim.incoming)}</strong> against capacity of <strong>${formatFlow(sim.capacity)}</strong>
        (${Math.round(sim.loadPct)}% utilisation${sim.errorRate ? `, ${sim.errorRate}% error rate` : ''}).
        ${sim.latencyMs ? `Avg latency <strong>${sim.latencyMs}ms</strong> / P95 <strong>${sim.p95Ms}ms</strong>.` : ''}
        <br><span style="color:#7c8fa0">💡 Recommendation:</span> ${rec}
      </div>
    </div>`;
  }).join('') : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;color:#15803d;font-size:12px;font-weight:500">
    ✅ All components within healthy load thresholds — no bottlenecks detected.
  </div>`;

  // ── summary KPI cards ─────────────────────────────────────────────────────
  const avgSLA  = simActive && loads.length ? (loads.reduce((s,l)=>s+(parseFloat(l.sla)||99.95),0)/loads.length).toFixed(2) : null;
  const avgLat  = simActive && loads.length ? Math.round(loads.reduce((s,l)=>s+(l.latencyMs||0),0)/loads.length) : null;
  const totalTraffic = computeTotalRPS();
  const systemPosture = critical > 0 ? 'Critical pressure' : warning > 0 ? 'Watch list' : simActive ? 'Healthy under current assumptions' : 'Simulation not run';
  const systemPostureClass = critical > 0 ? 'crit' : warning > 0 ? 'warn' : 'ok';
  const topRiskItems = bottlenecks.length
    ? bottlenecks.map(({ n, sim, def }) => `<li><strong>${esc(n.props.label || def?.name || n.id)}</strong> is at ${Math.round(sim.loadPct)}% load with ${esc(formatFlow(sim.incoming))} incoming.</li>`).join('')
    : `<li>No current component is above 60% load under the exported assumptions.</li>`;
  const recommendedActions = [];
  if (!simActive) recommendedActions.push('Run simulation before exporting when you need capacity, latency, SLA, and bottleneck evidence.');
  if (critical > 0) recommendedActions.push('Address critical components first by increasing capacity, adding replicas, or routing through cache/load-balancing layers.');
  if (warning > 0 && critical === 0) recommendedActions.push('Review high-load components before peak traffic; they are close enough to capacity to deserve a scaling plan.');
  if (topCostNodes.length) recommendedActions.push(`Review the largest cost driver: ${topCostNodes[0].n.props.label || topCostNodes[0].def?.name || topCostNodes[0].n.id} at ${compactMoney(topCostNodes[0].cost)}/mo.`);
  if (!recommendedActions.length) recommendedActions.push('Add traffic, capacity, and cost properties to more components to make the report more decision-ready.');
  const actionItemsHtml = recommendedActions.map(x => `<li>${esc(x)}</li>`).join('');
  const kpiCards = [
    { label:'Components', value: realNodes.length,                        color:'#4f9cf9', sub: `${payload.edges.length} connections` },
    { label:'Monthly Cost', value: totalCost > 0 ? compactMoney(totalCost) : '—', color:'#34d058', sub: S.reservedPricing ? 'Reserved −35%' : 'On-demand pricing' },
    { label:'System Health', value: critical > 0 ? `${critical} Critical` : warning > 0 ? `${warning} Warning` : 'All Clear', color: critical>0?'#f85149':warning>0?'#f5b731':'#34d058', sub: `${healthy} healthy · ${warning} warn · ${critical} crit` },
    { label:'Avg Latency',   value: avgLat != null ? `${avgLat}ms` : '—', color:'#a78bfa', sub: avgSLA != null ? `Est. SLA ${avgSLA}%` : 'Run sim for data' },
  ].map(c => `<div class="kpi-card">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8896a5;margin-bottom:6px">${c.label}</div>
    <div style="font-size:20px;font-weight:800;letter-spacing:-.02em;color:${c.color};margin-bottom:3px">${c.value}</div>
    <div style="font-size:10px;color:#9aabb8">${c.sub}</div>
  </div>`).join('');

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#fff;color:#1a2030;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}

    /* ── Cover / Header ── */
    .cover{background:linear-gradient(135deg,#060d18 0%,#0d1a2e 55%,#111e35 100%);color:#fff;padding:0;position:relative;overflow:hidden;page-break-after:avoid}
    .cover-grid{position:absolute;inset:0;background-image:radial-gradient(rgba(79,156,249,0.08) 1px,transparent 1px);background-size:28px 28px;pointer-events:none}
    .cover-glow{position:absolute;top:-80px;right:-80px;width:360px;height:360px;background:radial-gradient(circle,rgba(79,156,249,0.18) 0%,transparent 70%);pointer-events:none}
    .cover-inner{position:relative;padding:32px 36px 28px;display:flex;justify-content:space-between;align-items:flex-start}
    .brand{display:flex;align-items:center;gap:8px;margin-bottom:14px}
    .settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px}
    .setting-card{background:#fff;border:1px solid #e8ecf2;border-radius:16px;padding:16px;box-shadow:0 8px 22px rgba(15,23,42,0.05);}
    .setting-card-title{font-size:12px;font-weight:800;color:#1f2937;margin-bottom:10px}
    .setting-row{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#475569;line-height:1.4;border-top:1px solid #e5e7eb;padding:8px 0 0}
    .setting-row:first-child{border-top:0;padding-top:0}
    .brand-icon{width:28px;height:28px;background:linear-gradient(135deg,#4f9cf9,#a78bfa);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0}
    .brand-name{font-size:13px;font-weight:700;color:#e2eaf8;letter-spacing:-.01em}
    .cover h1{font-size:26px;font-weight:900;color:#f0f6ff;letter-spacing:-.03em;margin-bottom:5px;line-height:1.15}
    .cover .sub{font-size:11px;color:#6b7f96;margin-bottom:16px}
    .cover-chips{display:flex;gap:6px;flex-wrap:wrap}
    .chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#a0b5cc}
    .chip.chip-sim{background:rgba(52,208,88,0.12);border-color:rgba(52,208,88,0.3);color:#34d058}
    .chip.chip-crit{background:rgba(248,81,73,0.12);border-color:rgba(248,81,73,0.3);color:#f85149}
    .cover-right{text-align:right;flex-shrink:0}
    .cover-right .date-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#4f6580;margin-bottom:3px}
    .cover-right .date-val{font-size:11px;font-weight:600;color:#8ba3bc}
    .cover-right .url{font-size:10px;color:#4f9cf9;margin-top:5px}

    /* ── KPI bar ── */
    .kpi-bar{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #e8ecf2}
    .kpi-card{padding:16px 20px;border-right:1px solid #e8ecf2}
    .kpi-card:last-child{border-right:none}

    /* ── Sections ── */
    .section{padding:22px 28px}
    .section+.section{padding-top:0}
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#8896a5;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .sec-title::after{content:'';flex:1;height:1px;background:#e8ecf2}
    .sec-title .sec-icon{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}

    /* ── Diagram ── */
    .diagram-wrap{border:1px solid #dce3ec;border-radius:12px;overflow:hidden;background:#f7f9fc;padding:4px}
    .diagram-wrap svg{display:block;width:100%;height:auto;max-height:400px}

    /* ── 2-column layout ── */
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}

    /* ── Health summary ── */
    .health-box{background:#f8fafc;border:1px solid #e8ecf2;border-radius:10px;padding:14px 16px}
    .health-row{display:flex;align-items:center;gap:6px;font-size:11px;color:#556070;font-weight:500;margin-bottom:4px}
    .health-row:last-child{margin-bottom:0}
    .h-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
    .h-count{font-weight:800;font-size:14px;min-width:24px;text-align:right}

    /* ── Cost chart ── */
    .cost-box{background:#f8fafc;border:1px solid #e8ecf2;border-radius:10px;padding:14px 16px}
    .cost-total{font-size:22px;font-weight:900;color:#1a2030;letter-spacing:-.02em;margin-bottom:2px}
    .cost-sub{font-size:10px;color:#8896a5;margin-bottom:12px}
    .exec-grid{display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:14px}
    .exec-card{background:#fff;border:1px solid #e8ecf2;border-radius:14px;padding:16px;box-shadow:0 8px 22px rgba(15,23,42,0.04);min-height:128px}
    .exec-kicker{font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8896a5;margin-bottom:7px}
    .posture{font-size:19px;font-weight:900;letter-spacing:-.02em;margin-bottom:6px}
    .posture.ok{color:#15803d}.posture.warn{color:#a16207}.posture.crit{color:#dc2626}
    .exec-meta{font-size:11px;color:#64748b;line-height:1.6}
    .exec-list{margin-left:16px;color:#475569;font-size:11px;line-height:1.55}
    .exec-list li{margin-bottom:5px}
    .rank-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #edf2f7}
    .rank-row:first-child{border-top:0;padding-top:0}
    .rank-num{width:20px;height:20px;border-radius:6px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0}
    .rank-main{flex:1;min-width:0}.rank-title{font-size:11px;font-weight:800;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rank-sub{font-size:9.5px;color:#8896a5}
    .rank-val{font-size:12px;font-weight:900;color:#15803d;white-space:nowrap}.rank-val span{font-size:9px;color:#8896a5;font-weight:600}
    .empty-note{font-size:11px;color:#8896a5;background:#f8fafc;border:1px dashed #d8e2ee;border-radius:10px;padding:12px}

    /* ── Table ── */
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    thead tr{background:linear-gradient(90deg,#f8fafc,#f1f5f9)}
    thead th{padding:9px 11px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8896a5;border-bottom:2px solid #e3e8ef;white-space:nowrap}
    tbody tr{border-bottom:1px solid #f0f3f7}
    tbody tr:nth-child(even){background:#fafbfd}
    tbody tr:last-child{border-bottom:none}
    td{padding:9px 11px;vertical-align:middle}
    .unit{font-size:9px;color:#8896a5;margin-left:1px}
    .dim{color:#b0bec8}
    .mini-chip{display:inline-block;margin:0 4px 4px 0;padding:2px 6px;border-radius:7px;background:#eef4fb;border:1px solid #d9e3ef;color:#334155;font-size:9.5px;line-height:1.35;white-space:nowrap}
    .mini-chip strong{color:#64748b;font-weight:800}

    /* ── Pills ── */
    .pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap}
    .pill-ok{background:#eafbf0;color:#1a7a40;border:1px solid #b7e5cb}
    .pill-warn{background:#fffbeb;color:#92600a;border:1px solid #fde68a}
    .pill-crit{background:#fff1f0;color:#c0392b;border:1px solid #fecaca}
    .pill-idle{background:#f3f5f8;color:#8896a5;border:1px solid #e3e8ef}

    /* ── Footer ── */
    .footer{border-top:2px solid #e8ecf2;padding:13px 28px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc}
    .footer-left{font-size:10px;color:#a0aab5}
    .footer-left a{color:#4f9cf9;text-decoration:none;font-weight:600}
    .footer-right{font-size:10px;color:#b0bec8;text-align:right}

    /* ── Print toolbar ── */
    .print-bar{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(90deg,#060d18,#0d1a2e);padding:13px 28px;display:flex;align-items:center;justify-content:space-between;z-index:999;box-shadow:0 -4px 24px rgba(0,0,0,.25);border-top:1px solid rgba(79,156,249,0.2)}
    .print-bar-left{display:flex;align-items:center;gap:10px}
    .print-bar-left svg{color:#4f9cf9}
    .print-bar-left span{color:#8b949e;font-size:12px}
    .print-bar-left strong{color:#c9d4e0}
    .print-actions{display:flex;gap:10px;align-items:center}
    .print-btn{background:linear-gradient(135deg,#4f9cf9,#3b82f6);color:#fff;border:none;padding:9px 22px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 12px rgba(79,156,249,0.35);transition:all .15s}
    .print-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(79,156,249,0.5)}
    .close-btn{background:rgba(255,255,255,0.06);color:#8b949e;border:1px solid rgba(255,255,255,0.1);padding:9px 16px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer}

    @media print{
      .print-bar{display:none!important}
      body{padding-bottom:0}
      .diagram-wrap svg{max-height:360px}
      .section{padding:14px 22px}
      tr{break-inside:avoid}
      .exec-card,.setting-card,.health-box,.cost-box{break-inside:avoid}
      .two-col{gap:12px}
      .exec-grid{grid-template-columns:1fr 1fr 1fr;gap:10px}
      .cover{page-break-after:avoid}
    }
  `;

  // ── HTML ──────────────────────────────────────────────────────────────────
  const isDarkPdf = effectiveTheme() === 'dark';
  const darkCss = isDarkPdf ? `
    body{background:#0d1117;color:#c9d1d9}
    .kpi-bar,.kpi-card{border-color:#21262d}
    .kpi-card .sub{color:#8b949e}
    .sec-title{color:#8b949e}.sec-title::after{background:#21262d}
    .health-box,.cost-box{background:#161b22;border-color:#30363d}
    .exec-card{background:#161b22;border-color:#30363d;box-shadow:none}.exec-meta,.exec-list{color:#c9d1d9}.rank-row{border-color:#21262d}.rank-title{color:#f8fafc}.rank-num{background:#1f6feb22;color:#58a6ff}.empty-note{background:#0b1118;border-color:#30363d;color:#8b949e}
    .health-row{color:#8b949e}.cost-total{color:#e6edf3}.cost-sub{color:#8b949e}
    .diagram-wrap{border-color:#30363d;background:#0d1117}
    table thead tr{background:#161b22}
    thead th{color:#8b949e;border-bottom-color:#30363d}
    tbody tr{border-color:#21262d}
    tbody tr:nth-child(even){background:#161b22}
    td{color:#c9d1d9}.unit,.dim{color:#8b949e}
    .mini-chip{background:#161b22;border-color:#30363d;color:#c9d1d9}.mini-chip strong{color:#8b949e}
    .pill-idle{background:#21262d;color:#8b949e;border-color:#30363d}
    .settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px}
    .setting-card{background:#0b1118;border:1px solid #21262d;border-radius:16px;padding:16px}
    .setting-card-title{font-size:12px;font-weight:800;color:#f8fafc;margin-bottom:10px}
    .setting-row{display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#c9d1d9;line-height:1.4;border-top:1px solid #161b22;padding:8px 0 0}
    .setting-row:first-child{border-top:0;padding-top:0}
    .pill-ok{background:#0f2a1a;color:#3fb950;border-color:#1a4731}
    .pill-warn{background:#2a1f00;color:#f5b731;border-color:#4a3500}
    .pill-crit{background:#2a0f0e;color:#f85149;border-color:#4a1f1d}
  ` : '';

  const html = `<!doctype html><html lang="en"><head>
    <meta charset="UTF-8"/>
    <title>${esc(payload.title || 'Architecture')} — Archi-Flow Report</title>
    <style>${css}${darkCss}</style>
  </head><body>

    <!-- ▸ COVER ─────────────────────────────────────────── -->
    <div class="cover">
      <div class="cover-grid"></div>
      <div class="cover-glow"></div>
      <div class="cover-inner">
        <div>
          <div class="brand">
            <div class="brand-icon">A</div>
            <span class="brand-name">Archi-Flow</span>
          </div>
          <h1>${esc(payload.title || 'Architecture Report')}</h1>
          <div class="sub">${realNodes.length} components &middot; ${payload.edges.length} connections${simActive ? ' &middot; Live simulation data' : ''}</div>
          <div class="cover-chips">
            ${simActive ? `<span class="chip chip-sim">● Simulation Active</span>` : '<span class="chip">No sim data</span>'}
            ${critical > 0 ? `<span class="chip chip-crit">⚠ ${critical} Critical</span>` : ''}
            ${totalCost > 0 ? `<span class="chip">${compactMoney(totalCost)}/mo</span>` : ''}
            ${S.reservedPricing ? '<span class="chip chip-sim">Reserved −35%</span>' : ''}
          </div>
        </div>
        <div class="cover-right">
          <div class="date-label">Generated</div>
          <div class="date-val">${ts}</div>
          <div class="url">archi-flow.onrender.com</div>
        </div>
      </div>
    </div>

    <!-- ▸ KPI BAR ────────────────────────────────────────── -->
    <div class="kpi-bar">${kpiCards}</div>

    <!-- ▸ EXECUTIVE SUMMARY ──────────────────────────────── -->
    <div class="section">
      <div class="sec-title"><span class="sec-icon" style="background:#eef2ff">✦</span>Executive Summary</div>
      <div class="exec-grid">
        <div class="exec-card">
          <div class="exec-kicker">System posture</div>
          <div class="posture ${systemPostureClass}">${esc(systemPosture)}</div>
          <div class="exec-meta">
            Traffic assumption: <strong>${esc(formatFlow(totalTraffic))}</strong><br>
            Components: <strong>${realNodes.length}</strong> · Connections: <strong>${payload.edges.length}</strong><br>
            Cost model: <strong>${totalCost > 0 ? compactMoney(totalCost) + '/mo' : 'not fully configured'}</strong>
          </div>
        </div>
        <div class="exec-card">
          <div class="exec-kicker">Top risks</div>
          <ul class="exec-list">${topRiskItems}</ul>
        </div>
        <div class="exec-card">
          <div class="exec-kicker">Recommended actions</div>
          <ul class="exec-list">${actionItemsHtml}</ul>
        </div>
      </div>
    </div>

    <!-- ▸ DIAGRAM ──────────────────────────────────────────── -->
    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#e8f0fe">🗺</span>Architecture Diagram</div>
      <div class="diagram-wrap">${svg}</div>
    </div>

    <!-- ▸ HEALTH + COST (2-col) ──────────────────────────── -->
    ${simActive || totalCost > 0 ? `
    <div class="section" style="padding-top:0">
      <div class="two-col">
        ${simActive ? `
        <div>
          <div class="sec-title" style="margin-bottom:10px"><span class="sec-icon" style="background:#f0fdf4">❤️</span>System Health</div>
          <div class="health-box">
            <div class="health-row"><div class="h-dot" style="background:#34d058"></div><span style="flex:1">Healthy</span><span class="h-count" style="color:#34d058">${healthy}</span></div>
            <div class="health-row"><div class="h-dot" style="background:#f5b731"></div><span style="flex:1">High Load</span><span class="h-count" style="color:#f5b731">${warning}</span></div>
            <div class="health-row"><div class="h-dot" style="background:#f85149"></div><span style="flex:1">Critical</span><span class="h-count" style="color:#f85149">${critical}</span></div>
            ${avgSLA ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e8ecf2;font-size:10px;color:#8896a5">
              Est. System SLA: <strong style="color:${Number(avgSLA)>=99.9?'#34d058':Number(avgSLA)>=99?'#f5b731':'#f85149'}">${avgSLA}%</strong>
              &nbsp;·&nbsp; Avg latency: <strong>${avgLat}ms</strong>
            </div>` : ''}
          </div>
        </div>` : '<div></div>'}
        ${totalCost > 0 ? `
        <div>
          <div class="sec-title" style="margin-bottom:10px"><span class="sec-icon" style="background:#f0fdf4">💰</span>Monthly Cost Breakdown</div>
          <div class="cost-box">
            <div class="cost-total">${compactMoney(totalCost)}<span style="font-size:13px;font-weight:500;color:#8896a5">/mo</span></div>
            <div class="cost-sub">${S.reservedPricing ? 'Reserved pricing applied (−35% on compute & network)' : 'On-demand pricing'}</div>
            ${costChartBars}
          </div>
        </div>` : '<div></div>'}
      </div>
    </div>` : ''}

    ${topCostNodes.length ? `
    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#f0fdf4">💵</span>Top Cost Drivers</div>
      <div class="exec-card" style="min-height:0">${topCostHtml}</div>
    </div>` : ''}

    <!-- ▸ BOTTLENECK ANALYSIS ────────────────────────────── -->
    ${simActive && bottlenecks.length >= 0 ? `
    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#fff1f0">⚡</span>Bottleneck Analysis</div>
      ${bottleneckCards}
    </div>` : ''}

    <!-- ▸ COMPONENT PERFORMANCE TABLE ───────────────────── -->
    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#f0f4ff">📊</span>Component Performance</div>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th style="min-width:160px">Config / Cost Drivers</th>
            <th style="min-width:90px">Load</th>
            <th>Traffic In</th>
            <th>Traffic Out</th>
            <th>Read / Write</th>
            <th>Capacity</th>
            <th>Avg Lat</th>
            <th>P95 Lat</th>
            <th>Err %</th>
            <th>SLA</th>
            <th>Cost/mo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${totalCost > 0 ? `
      <div style="display:flex;justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px solid #e8ecf2">
        <div style="text-align:right">
          <div style="font-size:10px;color:#8896a5;margin-bottom:2px">Total Monthly Estimate</div>
          <div style="font-size:18px;font-weight:900;color:#1a2030">${compactMoney(totalCost)}<span style="font-size:12px;font-weight:500;color:#8896a5">/mo</span></div>
          ${S.reservedPricing ? '<div style="font-size:10px;color:#34d058;margin-top:2px">✓ Reserved pricing active (−35% on compute & network)</div>' : ''}
        </div>
      </div>` : ''}
    </div>

    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#fff7ed">🧮</span>Traffic & Cost Assumptions</div>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Input</th>
            <th>Output</th>
            <th>Assumption / Split Logic</th>
          </tr>
        </thead>
        <tbody>${assumptionRows}</tbody>
      </table>
    </div>

    <div class="section" style="padding-top:0">
      <div class="sec-title"><span class="sec-icon" style="background:#eefcfd">🛠</span>Component Configuration</div>
      <div class="settings-grid">
        ${realNodes.map(nodeSettingsHtml).join('')}
      </div>
    </div>

    <!-- ▸ FOOTER ─────────────────────────────────────────── -->
    <div class="footer">
      <div class="footer-left">Generated with <a href="https://archi-flow.onrender.com">Archi-Flow</a> by <a href="https://ballavamsi.com">ballavamsi.com</a></div>
      <div class="footer-right">${ts} &nbsp;·&nbsp; ${realNodes.length} components &nbsp;·&nbsp; ${payload.edges.length} connections</div>
    </div>

    <!-- ▸ PRINT BAR ──────────────────────────────────────── -->
    <div class="print-bar">
      <div class="print-bar-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span><strong>${esc(payload.title || 'Architecture')}</strong> — Ready to save</span>
      </div>
      <div class="print-actions">
        <button class="close-btn" onclick="window.close()">✕ Close</button>
        <button class="print-btn" onclick="window.print()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Save as PDF
        </button>
      </div>
    </div>

    ${'<scr'+'ipt>setTimeout(()=>window.print(),800)</'+'script>'}
  </body></html>`;

  win.document.write(html);
  win.document.close();
}

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function utf8Bytes(str) {
  const bytes = [];
  for (const ch of str) {
    let cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return bytes;
}
function utf8String(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCodePoint(b);
    else if (b < 0xe0) out += String.fromCodePoint(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0) out += String.fromCodePoint(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else out += String.fromCodePoint(((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
  }
  return out;
}
function encodeState(payload) {
  const bytes = utf8Bytes(JSON.stringify(payload));
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64URL[(n >> 18) & 63] + B64URL[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64URL[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64URL[n & 63];
  }
  return out;
}
function decodeState(raw) {
  const clean = String(raw || '').replace(/=+$/,'');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64URL.indexOf(clean[i]), b = B64URL.indexOf(clean[i + 1]);
    const c = B64URL.indexOf(clean[i + 2]), d = B64URL.indexOf(clean[i + 3]);
    const n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    bytes.push((n >> 16) & 255);
    if (c >= 0) bytes.push((n >> 8) & 255);
    if (d >= 0) bytes.push(n & 255);
  }
  return JSON.parse(utf8String(bytes));
}

function updateShareHash() {
  const encoded = encodeState(architecturePayload());
  history.replaceState(null, '', '#arch=' + encoded);
  return location.href;
}

// ══ LOCAL PERSISTENCE ══════════════════════════════════════════════════════════
// Auto-save to localStorage every time the diagram changes meaningfully.
// Keeps last 20 diagrams. Each entry: { id, name, ts, payload }
const LS_KEY  = 'archviz.saved';
const LS_AUTO = 'archviz.autosave';
let _autoSaveTimer = null;

function lsGetSaved() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSetSaved(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

function autoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    if (!Object.keys(S.nodes).length) return; // nothing to save
    const payload = architecturePayload();
    try { localStorage.setItem(LS_AUTO, JSON.stringify({ ts: Date.now(), payload })); } catch {}
    updateDiagramsPanel();
  }, 1800);
}

function loadAutoSavedDiagram() {
  const auto = (() => { try { return JSON.parse(localStorage.getItem(LS_AUTO) || 'null'); } catch { return null; } })();
  if (!auto || !auto.payload) return false;
  importArchitecture(auto.payload);
  return true;
}

function saveNamedDiagram(name) {
  const list = lsGetSaved();
  const id   = 'diag_' + Date.now();
  list.unshift({ id, name: name || getDiagramTitle() || 'Untitled', ts: Date.now(), payload: architecturePayload() });
  lsSetSaved(list.slice(0, 20)); // keep last 20
  updateDiagramsPanel();
  pushToast(`"${name}" saved to browser.`, 'info');
  track('diagram_saved_local', { name });
}

function deleteSavedDiagram(id) {
  lsSetSaved(lsGetSaved().filter(d => d.id !== id));
  updateDiagramsPanel();
}

function loadSavedDiagram(d) {
  importArchitecture(d.payload);
  pushToast(`Loaded "${d.name}".`, 'info');
  track('diagram_loaded_local', { name: d.name });
}

function updateDiagramsPanel() {
  const panel = document.getElementById('my-diagrams-list');
  if (!panel) return;
  const list   = lsGetSaved();
  const auto   = (() => { try { return JSON.parse(localStorage.getItem(LS_AUTO)||'null'); } catch { return null; } })();
  const fmt    = ts => new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

  let html = '';
  if (auto && auto.ts) {
    html += `<div class="diag-row auto-row" data-autosave="1">
      <div class="diag-icon">⏱</div>
      <div class="diag-info"><div class="diag-name">Auto-save</div><div class="diag-ts">${fmt(auto.ts)}</div></div>
      <button class="diag-btn" onclick="loadSavedDiagram(JSON.parse(localStorage.getItem('archviz.autosave')).payload && {payload:JSON.parse(localStorage.getItem('archviz.autosave')).payload,name:'Auto-save'})">Load</button>
    </div>`;
  }
  if (!list.length && !auto) {
    html = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:18px 0">No saved diagrams yet.<br>Build something and click Save.</div>';
  }
  list.forEach(d => {
    html += `<div class="diag-row" data-id="${esc(d.id)}">
      <div class="diag-icon">📐</div>
      <div class="diag-info"><div class="diag-name">${esc(d.name)}</div><div class="diag-ts">${fmt(d.ts)}</div></div>
      <button class="diag-btn" onclick="loadSavedDiagram(lsGetSaved().find(x=>x.id==='${esc(d.id)}'))">Load</button>
      <button class="diag-btn del" onclick="if(confirm('Delete?')){deleteSavedDiagram('${esc(d.id)}')}" title="Delete">×</button>
    </div>`;
  });
  panel.innerHTML = html;
}

function shareToLinkedIn() {
  const url = updateShareHash();
  const title = encodeURIComponent(getDiagramTitle() + ' — Architecture Diagram (Archi-Flow)');
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${title}`;
  window.open(liUrl, '_blank', 'noopener,width=600,height=600');
  pushToast('LinkedIn share window opened. The link lets viewers resume this exact architecture.', 'info');
}

async function shareArchitecture() {
  const url = updateShareHash();
  // Show share options modal
  const overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.innerHTML = `
    <div class="share-box">
      <div class="share-title">Share Architecture</div>
      <div class="share-copy">The architecture is <b>encoded in the URL</b> — no server, no account needed.</div>
      ${sbReady() ? `
      <div class="shortlink-box" id="sh-short-box">
        <div class="sl-label">✦ Permanent short link</div>
        <div id="sh-short-state" class="sl-saving"><div class="sl-spinner"></div> Saving to cloud…</div>
        <div class="shortlink-row" id="sh-short-row" style="display:none">
          <input id="sh-short-url" readonly/>
          <button id="sh-short-copy">Copy</button>
        </div>
        <div style="font-size:10px;color:#6b7f96">Short link never expires · stored on Supabase free tier</div>
      </div>` : `
      <div class="share-warn">
        <span style="color:#f5b731">⚠ Short links not configured.</span> The link below encodes the full diagram — may be long.
      </div>`}
      <button id="sh-copy" class="share-action">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy full URL
      </button>
      <button id="sh-linkedin" class="share-action linkedin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        Share on LinkedIn
      </button>
      <button id="sh-native" class="share-action" style="display:${navigator.share ? 'flex' : 'none'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share via…
      </button>
      <button id="sh-close" class="share-close">Close</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('sh-close').onclick = close;

  // Kick off short-link save in background immediately
  initShortLink();

  document.getElementById('sh-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(url); pushToast('Share link copied!', 'info'); }
    catch { prompt('Copy this share link', url); }
    track('share_link_copied', { node_count: Object.keys(S.nodes).length });
    close();
  };

  document.getElementById('sh-linkedin').onclick = () => {
    track('share_linkedin_clicked', { node_count: Object.keys(S.nodes).length });
    shareToLinkedIn();
    close();
  };

  if (navigator.share) {
    document.getElementById('sh-native').onclick = async () => {
      try { await shareDiagram(); pushToast('Share sheet opened.', 'info'); }
      catch { await navigator.clipboard.writeText(url); pushToast('Share link copied!', 'info'); }
      track('share_native', { node_count: Object.keys(S.nodes).length });
      close();
    };
  }
}

function loadFromHash() {
  const match = location.hash.match(/arch=([^&]+)/);
  if (!match) return false;
  try {
    importArchitecture(decodeState(match[1]));
    return true;
  } catch (err) {
    console.warn('Could not load shared architecture', err);
    return false;
  }
}

// ══ TOOLBAR WIRING ════════════════════════════════════════════════════════════
document.getElementById('btn-undo').onclick   = undo;
document.getElementById('btn-redo').onclick   = redo;
document.getElementById('btn-layout').onclick = autoLayout;
document.getElementById('btn-fit').onclick    = fitView;

// Empty state CTA buttons
document.getElementById('btn-empty-example')?.addEventListener('click', () => {
  // Open the example dropdown and load the first example
  const sel = document.getElementById('example-sel');
  if (sel && sel.options.length > 1) {
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
  }
});
document.getElementById('btn-empty-tour')?.addEventListener('click', () => {
  localStorage.removeItem(TOUR_KEY);
  setTimeout(startTour, 100);
});
document.getElementById('cc-fit').onclick     = fitView;
document.getElementById('cc-zoomin').onclick  = () => { S.zoom=Math.min(2.5,S.zoom*1.2); renderAll(); updateZoomLabel(); };
document.getElementById('cc-zoomout').onclick = () => { S.zoom=Math.max(0.25,S.zoom/1.2); renderAll(); updateZoomLabel(); };
document.getElementById('btn-my-diagrams').onclick = () => {
  updateDiagramsPanel();
  document.getElementById('my-diagrams-modal').classList.add('open');
  document.getElementById('more-menu').style.display = 'none';
};
document.getElementById('my-diagrams-modal').addEventListener('click', e => { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('btn-clear').onclick  = () => {
  track('canvas_cleared', { node_count: Object.keys(S.nodes).length, edge_count: S.edges.length });
  clearCanvas(false);
};
document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = async e => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    importArchitecture(JSON.parse(await file.text()));
    track('diagram_imported', { file_name: file.name });
  } catch (err) {
    alert('Could not import JSON: ' + err.message);
  } finally {
    e.target.value = '';
  }
};
document.getElementById('btn-export').onclick = () => {
  track('diagram_exported', { format: 'json', node_count: Object.keys(S.nodes).length, edge_count: S.edges.length });
  const blob=new Blob([JSON.stringify(architecturePayload(),null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='architecture.json'; a.click();
};
document.getElementById('btn-export-svg').onclick = () => {
  track('diagram_exported', { format: 'svg', node_count: Object.keys(S.nodes).length });
  exportDiagramSvg();
};
document.getElementById('btn-export-pdf').onclick = () => {
  track('diagram_exported', { format: 'pdf', node_count: Object.keys(S.nodes).length });
  exportPdfReport();
};
document.getElementById('btn-share').onclick = () => {
  track('share_opened', { node_count: Object.keys(S.nodes).length, edge_count: S.edges.length });
  shareArchitecture();
};
document.getElementById('btn-suggestions').onclick = () => setSuggestionsOn(!S.suggestionsOn);

// ── PNG Export ────────────────────────────────────────────────────────────
document.getElementById('btn-export-png').onclick = () => {
  track('diagram_exported', { format: 'png', node_count: Object.keys(S.nodes).length });
  exportDiagramPng();
};

function exportDiagramPng() {
  const svgStr = diagramSvgString({ htmlNodes: false });
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const scale = 2; // 2× for crisp retina output
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth  * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = effectiveTheme() === 'light' ? '#f7f9fc' : '#0a0f16';
    ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(pngBlob => {
      downloadBlob(pngBlob, `archi-flow-${getDiagramTitle().replace(/\s+/g,'-').toLowerCase()}.png`);
    }, 'image/png');
  };
  img.onerror = () => { URL.revokeObjectURL(url); pushToast('PNG export failed — try SVG instead', 'warn'); };
  img.src = url;
}

// ── Presentation Mode ─────────────────────────────────────────────────────
let _presentMode = false;
function enterPresentMode() {
  _presentMode = true;
  document.body.classList.add('present-mode');
  document.getElementById('btn-present-exit').style.display = '';
  pushToast('Presentation mode — press Esc to exit', 'info');
}
function exitPresentMode() {
  _presentMode = false;
  document.body.classList.remove('present-mode');
  document.getElementById('btn-present-exit').style.display = 'none';
}
document.getElementById('btn-present').onclick = () => { enterPresentMode(); };
document.getElementById('btn-present-exit').onclick = () => exitPresentMode();

// ── Keyboard Shortcuts Modal ──────────────────────────────────────────────
function showShortcutsModal() {
  if (document.getElementById('shortcuts-modal')) return;
  const isMac = navigator.platform.includes('Mac');
  const mod = isMac ? '⌘' : 'Ctrl';
  const shortcuts = [
    { group: 'Canvas',    keys: [`${mod}+Z`, `${mod}+Shift+Z`, `F`, `G`],                  labels: ['Undo', 'Redo', 'Fit all in view', 'Toggle grid snap'] },
    { group: 'Selection', keys: ['Click', 'Delete / ⌫', `${mod}+D`],                        labels: ['Select node or edge', 'Delete selected', 'Duplicate selected node'] },
    { group: 'Canvas Nav',keys: ['Scroll', 'Drag canvas'],                                   labels: ['Zoom in / out', 'Pan'] },
    { group: 'Nodes',     keys: ['Hover → port dots', 'Drag port → node', 'Right-click'],   labels: ['Show connection ports', 'Draw a connection', 'Context menu (duplicate, delete, replica)'] },
    { group: 'Misc',      keys: ['Esc', '?'],                                                labels: ['Deselect / close menus', 'Show this help'] },
  ];

  const rows = shortcuts.map(s => `
    <div class="sc-group">${s.group}</div>
    ${s.keys.map((k,i) => `
      <div class="sc-row">
        <kbd class="sc-key">${k}</kbd>
        <span class="sc-label">${s.labels[i]}</span>
      </div>`).join('')}
  `).join('');

  const modal = document.createElement('div');
  modal.id = 'shortcuts-modal';
  modal.innerHTML = `
    <div class="sc-backdrop"></div>
    <div class="sc-card">
      <div class="sc-header">
        <div class="sc-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M8 14h8"/></svg>
          Keyboard Shortcuts
        </div>
        <button class="sc-close" id="sc-close-btn">✕</button>
      </div>
      <div class="sc-body">${rows}</div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('sc-fade-out');
    setTimeout(() => modal.parentNode && modal.parentNode.removeChild(modal), 250);
  };
  document.getElementById('sc-close-btn').onclick = close;
  modal.querySelector('.sc-backdrop').onclick = close;
  modal._close = close;
  requestAnimationFrame(() => modal.classList.add('sc-visible'));
}

document.getElementById('btn-shortcuts').onclick = showShortcutsModal;

// ── Restart Tour ──────────────────────────────────────────────────────────
document.getElementById('btn-restart-tour').onclick = () => {
  localStorage.removeItem(TOUR_KEY);
  const existing = document.getElementById('tour-overlay');
  if (existing) existing.parentNode.removeChild(existing);
  startTour();
};

// ── Reserved Pricing toggle ────────────────────────────────────────────────
const _btnReserved = document.getElementById('btn-reserved');
function _updateReservedBtn() {
  if (!_btnReserved) return;
  _btnReserved.classList.toggle('active', S.reservedPricing);
  _btnReserved.title = S.reservedPricing ? 'Reserved pricing active — click to switch to on-demand' : 'Switch to reserved pricing (saves ~35% on compute)';
}
_updateReservedBtn();
if (_btnReserved) _btnReserved.onclick = () => {
  S.reservedPricing = !S.reservedPricing;
  try { localStorage.setItem('archviz.reserved', S.reservedPricing ? 'on' : 'off'); } catch {}
  _updateReservedBtn(); updateCost(); updateEmptyPanel();
  pushToast(S.reservedPricing ? 'Reserved pricing: compute costs −35%' : 'On-demand pricing restored', 'info');
};

// ── Service Mesh toggle ───────────────────────────────────────────────────
const _btnMesh = document.getElementById('btn-service-mesh');
function _updateMeshBtn() {
  if (!_btnMesh) return;
  _btnMesh.classList.toggle('active', S.serviceMeshOn);
}
_updateMeshBtn();
if (_btnMesh) _btnMesh.onclick = () => {
  S.serviceMeshOn = !S.serviceMeshOn;
  _updateMeshBtn(); renderEdges();
  pushToast(S.serviceMeshOn ? 'Service mesh mode on — edges show circuit breaker state' : 'Service mesh mode off', 'info');
};
document.getElementById('btn-snap').onclick = () => setSnapGrid(!S.snapGrid);
document.getElementById('btn-sidebar-toggle').onclick = () => setSidebarOpen(!S.sidebarOpen);
const _cycleTheme = () => { setTheme(S.theme === 'system' ? 'light' : S.theme === 'light' ? 'dark' : 'system'); };
document.getElementById('btn-theme').onclick = _cycleTheme;
const _btnThemeToolbar = document.getElementById('btn-theme-toolbar');
if (_btnThemeToolbar) _btnThemeToolbar.onclick = _cycleTheme;

// More menu toggle
const moreMenu = document.getElementById('more-menu');
document.getElementById('btn-more').onclick = e => {
  e.stopPropagation();
  moreMenu.style.display = moreMenu.style.display === 'none' ? 'flex' : 'none';
  if (moreMenu.style.display === 'flex') moreMenu.style.flexDirection = 'column';
};
document.addEventListener('click', () => { moreMenu.style.display = 'none'; });

// Speed selector
const speedSel = document.getElementById('sim-speed-sel');
speedSel.value = S.simSpeed;
speedSel.onchange = () => {
  S.simSpeed = speedSel.value;
  try { localStorage.setItem('archviz.simspeed', S.simSpeed); } catch {}
  // Restart tick at new speed if sim is running
  if (S.simOn) {
    clearInterval(S.simTick);
    const speedMs = { slow: 2500, normal: 1600, fast: 800 }[S.simSpeed] || 1600;
    S.simTick = setInterval(runTick, speedMs);
  }
};

// ══ BOOT SEQUENCE ═════════════════════════════════════════════════════════════
// Single async IIFE — loads server data first, then handles auth, then boots.
// Never uses top-level await (confuses obfuscator + some older runtimes).
(async () => {
  // 1. Load component defs, rules and examples from server before rendering
  await _loadServerData();

  // 2. Boot the app immediately so palette/canvas appear
  initPalette();
  initExamples();
  snapshot();
  updateSuggestionsToggle();
  updateSnapButton();
  setTheme(S.theme);
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (S.theme === 'system') setTheme('system');
    });
  } catch {}
  updateSidebarToggle();
  updateZoomLabel();
  updateCanvasGrid();
  syncSlider(Number(uInp.value || 100));
  updateEmptyPanel();
  positionSugTray();
  initSugTrayObserver();

  // 3. Load saved diagram from URL (short path or hash), otherwise restore autosave
  const loaded = await loadFromShortPath();
  if (!loaded) {
    const hashLoaded = loadFromHash();
    if (!hashLoaded) {
      loadAutoSavedDiagram();
    }
  }

  const _collabParam = new URLSearchParams(location.search).get('collab');
  if (_collabParam) setTimeout(() => showCollabInvite(_collabParam), 700);

  // 4. Auth gate — Google SSO (skipped if Supabase not configured)
  const sb = getSB();
  if (!sb) return;

  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    // Already logged in — set up user profile immediately
    _onUserLoggedIn(session.user);
    return;
  }

  // Guest mode — user previously skipped login
  if (localStorage.getItem('archviz.guest') === '1') return;

  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.innerHTML = `
    <div class="auth-gate-card">
      <div class="auth-gate-logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </div>
      <h1 class="auth-gate-title">Archi-Flow</h1>
      <p class="auth-gate-sub">Visual architecture simulation</p>
      <button id="auth-google-btn" class="auth-google-btn">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>
      <button id="auth-guest-btn" class="auth-guest-btn">Continue as Guest</button>
      <p class="auth-gate-footer">By continuing you agree to the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.</p>
    </div>`;
  document.body.appendChild(gate);

  document.getElementById('auth-google-btn').onclick = async () => {
    const btn = document.getElementById('auth-google-btn');
    btn.disabled = true;
    btn.textContent = 'Redirecting…';
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin },
    });
  };

  document.getElementById('auth-guest-btn').onclick = () => {
    localStorage.setItem('archviz.guest', '1');
    const el = document.getElementById('auth-gate');
    if (el) el.remove();
  };

  // Listen for auth state change (OAuth redirect back)
  sb.auth.onAuthStateChange((event, sess) => {
    if (sess) {
      const el = document.getElementById('auth-gate');
      if (el) el.remove();
      _onUserLoggedIn(sess.user, event === 'SIGNED_IN');
    }
  });
})();

// ── User session helpers ───────────────────────────────────────────────────
function _onUserLoggedIn(user, isNewLogin = false) {
  const name   = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'there';
  const avatar = user.user_metadata?.avatar_url || null;
  const firstName = name.split(' ')[0];

  // Pre-populate collab display name from Google account
  if (!localStorage.getItem('archviz.collab.name')) {
    saveCollabName(name);
    ME.name = name;
  }
  // Also fill the collab name input if it exists
  const nameInp = document.getElementById('collab-name-inp');
  if (nameInp && !nameInp.value) nameInp.value = ME.name || name;

  // Inject user avatar + sign-out into toolbar
  _injectUserChip(name, firstName, avatar, user.email);

  // Show welcome toast / popup on first login
  if (isNewLogin) {
    setTimeout(() => _showWelcomePopup(firstName), 600);
  }
}

function _injectUserChip(name, firstName, avatar, email) {
  if (document.getElementById('user-chip')) return; // already injected
  const chip = document.createElement('div');
  chip.id = 'user-chip';
  chip.title = `${name}\n${email}`;
  chip.innerHTML = avatar
    ? `<img src="${avatar}" class="user-avatar" referrerpolicy="no-referrer"/>`
    : `<div class="user-avatar-initials">${(firstName[0]||'?').toUpperCase()}</div>`;

  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.innerHTML = `
    <div class="user-menu-name">${name}</div>
    <div class="user-menu-email">${email}</div>
    <hr class="user-menu-divider"/>
    <button id="user-signout-btn" class="user-menu-item user-menu-signout">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Sign out
    </button>`;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;display:flex;align-items:center;margin-left:4px';
  wrap.appendChild(chip);
  wrap.appendChild(menu);

  // Toggle menu on chip click
  chip.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
  document.addEventListener('click', () => menu.classList.remove('open'), { capture: false });

  // Sign out
  document.getElementById && setTimeout(() => {
    const signOutBtn = menu.querySelector('#user-signout-btn');
    if (signOutBtn) signOutBtn.onclick = async () => {
      const sb = getSB();
      if (sb) await sb.auth.signOut();
      location.reload();
    };
  }, 100);

  // Insert before the notifications bell
  const toolbar = document.getElementById('btn-notif')?.closest('div')?.parentElement;
  if (toolbar) toolbar.insertBefore(wrap, document.getElementById('btn-notif').closest('div'));
}

function _showWelcomePopup(firstName) {
  // If cookie consent is already decided, skip the consent section
  const consentSaved = localStorage.getItem('archiviz.cookie.consent');
  // Also suppress the standalone cookie banner — we handle it here
  const existingBanner = document.getElementById('cookie-banner');
  if (existingBanner) existingBanner.remove();

  const showConsent = !consentSaved;

  const pop = document.createElement('div');
  pop.id = 'welcome-popup';
  pop.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-emoji">👋</div>
      <h2 class="welcome-title">Welcome, ${firstName}!</h2>
      <p class="welcome-body">You're now inside <strong>Archi-Flow</strong> — a visual simulator for designing and stress-testing system architectures.</p>
      <div class="welcome-tips">
        <div class="welcome-tip"><span class="tip-icon">🧩</span><span>Drag components from the left palette onto the canvas</span></div>
        <div class="welcome-tip"><span class="tip-icon">🔗</span><span>Hover a node edge to draw connections</span></div>
        <div class="welcome-tip"><span class="tip-icon">⚡</span><span>Hit <strong>Simulate</strong> to send traffic and watch bottlenecks appear</span></div>
        <div class="welcome-tip"><span class="tip-icon">📐</span><span>Try an example from the <strong>Examples</strong> dropdown to get started fast</span></div>
      </div>
      ${showConsent ? `
      <div class="welcome-consent">
        <span class="welcome-consent-icon">🍪</span>
        <div class="welcome-consent-text">
          Allow analytics cookies to help improve Archi-Flow?
          <a href="/privacy" target="_blank" class="cb-link">Privacy policy</a>
        </div>
        <div class="welcome-consent-btns">
          <button id="welcome-deny-btn"   class="cb-btn cb-deny">Decline</button>
          <button id="welcome-accept-btn" class="cb-btn cb-accept">Accept</button>
        </div>
      </div>` : ''}
      <button id="welcome-close-btn" class="welcome-close-btn">Start building →</button>
    </div>`;
  document.body.appendChild(pop);

  const close = () => { pop.style.animation = 'fadeOut 0.2s forwards'; setTimeout(() => pop.remove(), 200); };

  if (showConsent) {
    document.getElementById('welcome-accept-btn').onclick = () => { window._grantConsent?.(); };
    document.getElementById('welcome-deny-btn').onclick   = () => { window._denyConsent?.(); };
  }

  document.getElementById('welcome-close-btn').onclick = close;
  pop.addEventListener('click', e => { if (e.target === pop) close(); });
}

// (boot moved into the IIFE above)

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE SHORT LINKS
// ══════════════════════════════════════════════════════════════════════════════

function sbReady() {
  const env = window.__ENV__ || {};
  return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

let _sb = null;
function getSB() {
  if (_sb) return _sb;
  const env = window.__ENV__ || {};
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    _sb = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  } catch(e) { console.warn('Supabase init failed', e); }
  return _sb;
}

// Generate a random 8-char alphanumeric ID
function genShortId() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // no confusable chars (0/O, 1/l)
  let id = '';
  const arr = crypto.getRandomValues(new Uint8Array(8));
  arr.forEach(b => { id += chars[b % chars.length]; });
  return id;
}

// Save diagram to Supabase, return short URL
async function saveShortLink(payload) {
  const title = getDiagramTitle() || 'Untitled';
  // Use serverless endpoint — keeps Supabase service key off the client
  const resp = await fetch('/api/shortlink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, payload }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const { id } = await resp.json();
  const shortUrl = `${location.origin}/s/${id}`;
  track('short_link_created', { id, node_count: Object.keys(S.nodes).length });
  return shortUrl;
}

// Load diagram by short ID via serverless endpoint
async function loadShortLink(id) {
  try {
    const resp = await fetch(`/api/shortlink?id=${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

// Check URL on load: /s/[id] → load from Supabase
async function loadFromShortPath() {
  const m = location.pathname.match(/^\/s\/([a-z0-9]{8})$/i);
  if (!m) return false;
  const id = m[1];
  try {
    const data = await loadShortLink(id);
    if (data) {
      importArchitecture(data.payload);
      pushToast(`Loaded shared diagram${data.title ? ': "' + data.title + '"' : ''}.`, 'info');
      // Replace URL so reloads don't re-fetch but the path stays clean
      history.replaceState(null, '', location.pathname);
      return true;
    }
  } catch(e) { console.warn('Short link load failed', e); }
  pushToast('Could not load shared diagram — link may be invalid.', 'warn');
  return false;
}

// Wire up short link saving inside share modal
async function initShortLink() {
  if (!sbReady()) return;
  const stateEl = document.getElementById('sh-short-state');
  const rowEl   = document.getElementById('sh-short-row');
  const urlInp  = document.getElementById('sh-short-url');
  const copyBtn = document.getElementById('sh-short-copy');
  if (!stateEl) return;
  try {
    const shortUrl = await saveShortLink(architecturePayload());
    stateEl.style.display = 'none';
    if (rowEl) rowEl.style.display = 'flex';
    if (urlInp) urlInp.value = shortUrl;
    if (copyBtn) copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(shortUrl); pushToast('Short link copied!', 'info'); }
      catch { prompt('Copy this short link:', shortUrl); }
      track('short_link_copied', {});
    };
  } catch(e) {
    if (stateEl) stateEl.innerHTML = '<span style="color:var(--red);font-size:11px">⚠ Could not save — check Supabase config</span>';
    console.warn('Short link save failed', e);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-TIME COLLABORATION  (Y.js + y-webrtc, 100% free P2P)
// ══════════════════════════════════════════════════════════════════════════════

const COLLAB_COLORS = ['#f87171','#fb923c','#facc15','#4ade80','#34d399','#38bdf8','#818cf8','#e879f9','#f472b6','#a78bfa'];
function collabColor(seed) {
  let h = 0; for (let i=0; i<seed.length; i++) h = (h*31+seed.charCodeAt(i))>>>0;
  return COLLAB_COLORS[h % COLLAB_COLORS.length];
}
function collabInitials(name) {
  return name.trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||'').join('').slice(0,2) || '?';
}

// Persisted identity
function getCollabIdentity() {
  try {
    let id = localStorage.getItem('archviz.collab.id');
    let name = localStorage.getItem('archviz.collab.name') || '';
    if (!id) { id = Math.random().toString(36).slice(2,10); localStorage.setItem('archviz.collab.id',id); }
    return { id, name };
  } catch { return { id: Math.random().toString(36).slice(2,10), name: '' }; }
}
function saveCollabName(n) { try { localStorage.setItem('archviz.collab.name', n); } catch {} }

const ME = getCollabIdentity();

// Pre-populate name input
const _nameInp = document.getElementById('collab-name-inp');
if (_nameInp && ME.name) _nameInp.value = ME.name;

const C = {          // collab runtime state
  active: false,
  roomId: null,
  doc: null,
  provider: null,
  yNodes: null,      // Y.Map  nodeId → node JSON
  yEdges: null,      // Y.Array of edge JSON
  awareness: null,
  _applying: false,  // guard re-entrant sync
};

// ── Apply remote Y.js state into S ─────────────────────────────────
function applyYState() {
  if (C._applying) return;
  C._applying = true;
  try {
    // ── Nodes ──────────────────────────────────────────────────────────
    const remoteNodes = {};
    C.yNodes.forEach((val, key) => { remoteNodes[key] = val; });

    // Remove nodes that disappeared remotely (remove DOM element too)
    Object.keys(S.nodes).forEach(id => {
      if (!remoteNodes[id]) {
        const el = document.getElementById('node-' + id);
        if (el) el.remove();
        delete S.nodes[id];
      }
    });

    // Add / update nodes — always overwrite so property edits (label, rps…) show
    let changed = false;
    Object.entries(remoteNodes).forEach(([id, data]) => {
      const existing = S.nodes[id];
      if (!existing || JSON.stringify(existing) !== JSON.stringify(data)) {
        S.nodes[id] = { ...data };   // spread so it's a new object reference
        S.nSeq = Math.max(S.nSeq, parseInt(id.replace(/\D/g,'')) || 0);
        changed = true;
      }
    });

    // ── Edges ──────────────────────────────────────────────────────────
    const remoteEdges = C.yEdges.toArray();
    // Always replace edges list so additions / deletions are reflected
    S.edges = remoteEdges.map(e => ({ ...e }));
    S.eSeq  = S.edges.reduce((m, e) => Math.max(m, parseInt(e.id?.replace(/\D/g,'') || 0)), S.eSeq);

    // Re-render everything — positions, labels, edges, stats
    renderAll();
    updateStats();
    updateCost();
    if (S.sel) refreshSimStats(S.sel);
    buildSuggestions();

    // Hide/show empty state based on whether we have nodes
    document.getElementById('canvas-empty').style.display =
      Object.keys(S.nodes).length ? 'none' : '';

    // Keep props panel in sync if the selected node was updated
    if (S.sel && remoteNodes[S.sel]) selectNode(S.sel);
  } finally {
    C._applying = false;
  }
}

// ── Push local S into Y.js ──────────────────────────────────────────
function pushToY(nodeId) {
  if (!C.active || C._applying) return;
  C.doc.transact(() => {
    if (nodeId) {
      // Single node update
      if (S.nodes[nodeId]) C.yNodes.set(nodeId, JSON.parse(JSON.stringify(S.nodes[nodeId])));
      else C.yNodes.delete(nodeId);
    } else {
      // Full sync (edges changed, or initial push)
      // Nodes
      const existingKeys = new Set(); C.yNodes.forEach((_,k) => existingKeys.add(k));
      Object.entries(S.nodes).forEach(([id,n]) => { C.yNodes.set(id, JSON.parse(JSON.stringify(n))); existingKeys.delete(id); });
      existingKeys.forEach(k => C.yNodes.delete(k));
      // Edges
      C.yEdges.delete(0, C.yEdges.length);
      C.yEdges.insert(0, S.edges.map(e => JSON.parse(JSON.stringify(e))));
    }
  });
}

// Wait for ESM collab libs to finish loading (they load async in a module script)
function waitForCollabLibs() {
  if (window._collabLibsReady === true)  return Promise.resolve(true);
  if (window._collabLibsReady === false) return Promise.resolve(false);
  return new Promise(resolve => {
    const done = ok => resolve(ok);
    window.addEventListener('collab-libs-ready',  () => done(true),  { once: true });
    window.addEventListener('collab-libs-failed', () => done(false), { once: true });
    setTimeout(() => done(false), 12000); // 12s hard timeout
  });
}

// ── Join / create a session ─────────────────────────────────────────
async function joinCollab(roomId) {
  if (C.active) leaveCollab();
  const btn = document.getElementById('btn-collab');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  const loaded = await waitForCollabLibs();
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  if (!loaded || typeof window.Y === 'undefined' || typeof window.WebrtcProvider === 'undefined') {
    pushToast('Could not load collaboration library — check your network and try again.', 'warn'); return;
  }

  const signalingUrl = window.__ENV__?.SIGNALING_URL;
  if (!signalingUrl) {
    pushToast('Collaboration is not configured — SIGNALING_URL missing.', 'warn'); return;
  }

  const Y = window.Y;
  const WebrtcProvider = window.WebrtcProvider;

  C.roomId = roomId;
  C.doc    = new Y.Doc();
  C.yNodes = C.doc.getMap('nodes');
  C.yEdges = C.doc.getArray('edges');

  try {
    C.provider = new WebrtcProvider('archiviz-' + roomId, C.doc, {
      signaling: [signalingUrl],
      maxConns: 12,
    });
  } catch(e) {
    pushToast('Could not connect — check your network.', 'warn'); return;
  }

  C.awareness = C.provider.awareness;

  const name  = document.getElementById('collab-name-inp')?.value.trim() || ME.name || 'Guest';
  const color = collabColor(ME.id);
  saveCollabName(name);
  ME.name = name;

  C.awareness.setLocalStateField('user', { id: ME.id, name, color, initials: collabInitials(name) });

  // Observe remote changes — use observeDeep so property edits (label, rps, etc.) propagate
  C.yNodes.observeDeep(() => { if (!C._applying) applyYState(); });
  C.yEdges.observeDeep(() => { if (!C._applying) applyYState(); });

  // Smart initial push:
  // - If WE have a diagram, push it after a short delay (lets WebRTC connect first).
  //   If peer already had data, Y.js CRDT merges both — no data is lost.
  // - If WE have nothing, don't push at all; we'll receive the peer's state via observe.
  const hasLocalDiagram = Object.keys(S.nodes).length > 0;
  if (hasLocalDiagram) {
    // Wait ~1.5 s for initial WebRTC sync, then push our content
    setTimeout(() => { if (C.active) pushToY(null); }, 1500);
  }
  // Either way, apply whatever arrived from peers after connection settles
  setTimeout(() => { if (C.active && !C._applying) applyYState(); }, 2500);

  // Observe peer presence
  C.awareness.on('change', updateCollabPresence);

  // Track local mouse for remote cursors
  document.getElementById('canvas-wrap').addEventListener('mousemove', onLocalCursorMove);

  C.active = true;
  updateCollabUI();
  updateCollabPresence();
  pushToast(`Live session started — share the link!`, 'info');
  track('collab_session_started', { room: roomId });
}

function leaveCollab() {
  if (!C.active) return;
  document.getElementById('canvas-wrap').removeEventListener('mousemove', onLocalCursorMove);
  C.awareness?.destroy();
  C.provider?.destroy();
  C.doc?.destroy();
  C.active=false; C.roomId=null; C.doc=null; C.provider=null; C.yNodes=null; C.yEdges=null; C.awareness=null;
  document.getElementById('remote-cursors').innerHTML = '';
  updateCollabUI();
  // Clean up URL
  const u = new URL(location.href);
  u.searchParams.delete('collab');
  history.replaceState(null,'', u.toString());
  pushToast('Left collaboration session.','info');
  track('collab_session_left', {});
}

// ── Cursor broadcast ───────────────────────────────────────────────
function onLocalCursorMove(e) {
  if (!C.awareness) return;
  const rect = document.getElementById('canvas-wrap').getBoundingClientRect();
  // Canvas coordinates (not screen)
  const cx = (e.clientX - rect.left - S.panX) / S.zoom;
  const cy = (e.clientY - rect.top  - S.panY) / S.zoom;
  C.awareness.setLocalStateField('cursor', { cx, cy });
}

// ── Render remote cursors ──────────────────────────────────────────
function renderRemoteCursors(states) {
  const container = document.getElementById('remote-cursors');
  if (!container) return;
  const seen = new Set();
  states.forEach((state, clientId) => {
    if (clientId === C.awareness.clientID) return;
    const user   = state.user;
    const cursor = state.cursor;
    if (!user || !cursor) return;
    seen.add(String(clientId));
    // Screen position
    const sx = cursor.cx * S.zoom + S.panX;
    const sy = cursor.cy * S.zoom + S.panY;
    let el = container.querySelector(`[data-client="${clientId}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'remote-cursor';
      el.dataset.client = clientId;
      el.innerHTML = `
        <svg width="14" height="20" viewBox="0 0 14 20" fill="${user.color}"><path d="M0 0L0 16L4 12L7 19L9 18L6 11L11 11Z" stroke="#000" stroke-width="0.8"/></svg>
        <div class="remote-cursor-label" style="background:${user.color}">${esc(user.name || '?')}</div>`;
      container.appendChild(el);
    }
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
  });
  // Remove stale cursors
  [...container.querySelectorAll('.remote-cursor')].forEach(el => {
    if (!seen.has(el.dataset.client)) el.remove();
  });
}

// ── Update presence UI ─────────────────────────────────────────────
function updateCollabPresence() {
  if (!C.awareness) return;
  const states   = C.awareness.getStates();
  const peers    = [];
  states.forEach((state, clientId) => {
    if (clientId === C.awareness.clientID) return;
    if (state.user) peers.push({ ...state.user, clientId });
  });
  const myState  = states.get(C.awareness.clientID);
  const me       = myState?.user;
  const allUsers = me ? [{ ...me, self: true }, ...peers] : peers;

  // Toolbar avatars
  const bar = document.getElementById('collab-users');
  if (bar) {
    bar.innerHTML = allUsers.slice(0,5).map(u =>
      `<div class="collab-avatar" style="background:${u.color}" title="${esc(u.name||'?')}${u.self?' (you)':''}">${esc(collabInitials(u.name||'?'))}</div>`
    ).join('');
  }

  // Peer count in modal
  const countEl = document.getElementById('collab-peer-count');
  if (countEl) countEl.textContent = allUsers.length;

  // Peer list in modal
  const listEl = document.getElementById('collab-peers-list');
  if (listEl) {
    listEl.innerHTML = allUsers.map(u =>
      `<div class="collab-peer-row"><div class="collab-peer-dot" style="background:${u.color}"></div><span style="flex:1">${esc(u.name||'?')}</span>${u.self?'<span style="font-size:10px;color:var(--muted)">(you)</span>':''}</div>`
    ).join('') || '<div style="font-size:11px;color:var(--muted)">Waiting for others to join…</div>';
  }

  // Render remote cursors
  renderRemoteCursors(states);
}

// ── Collab UI state ────────────────────────────────────────────────
function updateCollabUI() {
  const btn  = document.getElementById('btn-collab');
  const dot  = document.getElementById('collab-indicator');
  const txt  = document.getElementById('btn-collab-txt');
  if (C.active) {
    btn.classList.add('live');
    if (dot) dot.style.display = '';
    if (txt) txt.textContent = 'Live';
    // Update modal link
    const u = new URL(location.href);
    u.searchParams.set('collab', C.roomId);
    const link = u.toString();
    history.replaceState(null,'', link);
    const out = document.getElementById('collab-link-out');
    if (out) out.value = link;
    document.getElementById('collab-start-panel').style.display = 'none';
    document.getElementById('collab-live-panel').style.display  = '';
  } else {
    btn.classList.remove('live');
    if (dot) dot.style.display = 'none';
    if (txt) txt.textContent = 'Live';
    document.getElementById('collab-start-panel').style.display = '';
    document.getElementById('collab-live-panel').style.display  = 'none';
  }
}

// ── Modal wiring ───────────────────────────────────────────────────
document.getElementById('btn-collab').onclick = () => {
  document.getElementById('collab-modal').classList.add('open');
  if (C.active) updateCollabPresence();
};
document.getElementById('collab-btn-close').onclick = () => document.getElementById('collab-modal').classList.remove('open');
document.getElementById('collab-modal').addEventListener('click', e => { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('collab-btn-start').onclick = () => {
  const room = Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,6);
  joinCollab(room);
  document.getElementById('collab-modal').classList.remove('open');
  // Re-open to show live panel
  setTimeout(() => document.getElementById('collab-modal').classList.add('open'), 200);
};

document.getElementById('collab-btn-join').onclick = () => {
  const raw = document.getElementById('collab-join-inp').value.trim();
  if (!raw) { pushToast('Paste a session link or room ID.','warn'); return; }
  let roomId = raw;
  try {
    const u = new URL(raw);
    roomId = u.searchParams.get('collab') || raw;
  } catch {}
  joinCollab(roomId);
  document.getElementById('collab-modal').classList.remove('open');
  setTimeout(() => document.getElementById('collab-modal').classList.add('open'), 200);
};

document.getElementById('collab-btn-copy').onclick = async () => {
  const link = document.getElementById('collab-link-out').value;
  try { await navigator.clipboard.writeText(link); pushToast('Session link copied!','info'); }
  catch { prompt('Copy this link:', link); }
  track('collab_link_copied', { room: C.roomId });
};

document.getElementById('collab-btn-leave').onclick = () => {
  leaveCollab();
  document.getElementById('collab-modal').classList.remove('open');
};

// ── Hook mutations to broadcast ────────────────────────────────────
// Wrap addNode
const _origAddNode = addNode;
window.addNode = function(defId, x, y) {
  const id = _origAddNode(defId, x, y);
  if (C.active) pushToY(id);
  return id;
};

// Wrap deleteNode
const _origDeleteNode = deleteNode;
window.deleteNode = function(id) {
  _origDeleteNode(id);
  // Full sync — node is gone AND its edges are removed, both must sync
  if (C.active) pushToY(null);
};

// Wrap addEdge
const _origAddEdge = addEdge;
window.addEdge = function(src, tgt, opts) {
  _origAddEdge(src, tgt, opts);
  if (C.active) pushToY(null);
};

// Helper for scripts: connect two nodes by their label text
window.connectByLabel = function(srcLabel, tgtLabel) {
  const nodes = Object.values(S.nodes);
  const s = nodes.find(n => n.props.label === srcLabel);
  const t = nodes.find(n => n.props.label === tgtLabel);
  if (!s || !t) { console.warn('connectByLabel: node not found', srcLabel, tgtLabel); return false; }
  _origAddEdge(s.id, t.id, { skipRules: true });
  renderEdges(); updateStats();
  return true;
};

// Helper: get all nodes as [{id, label, defId}]
window.getNodes = function() {
  return Object.values(S.nodes).map(n => ({ id: n.id, label: n.props.label, defId: n.defId }));
};

// Helper: force re-render edges
window.forceRenderEdges = function() { renderEdges(); updateStats(); };

// Helper: rename a node by ID
window.renameNodeById = function(id, label) {
  const n = S.nodes[id];
  if (!n) return false;
  n.props.label = label;
  renderNode(id);
  autoSave();
  return true;
};

// Helper: set any node prop by key
window.setNodeProp = function(id, key, value) {
  const n = S.nodes[id];
  if (!n) return false;
  n.props[key] = value;
  renderNode(id);
  if (S.simOn) runTick();
  autoSave();
  return true;
};

// Wrap deleteEdge
const _origDeleteEdge = deleteEdge;
window.deleteEdge = function(id) {
  _origDeleteEdge(id);
  if (C.active) pushToY(null);
};

// Wrap clearCanvas
const _origClearCanvas = clearCanvas;
window.clearCanvas = function(silent) {
  _origClearCanvas(silent);
  if (C.active) pushToY(null);
};

// Hook prop changes — patch buildFields to broadcast after oninput
const _origBuildFields = buildFields;
window.buildFields = function(containerId, props, n, nodeId) {
  _origBuildFields(containerId, props, n, nodeId);
  // After original builds fields, wrap each oninput to also push
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll('.prop-inp').forEach(inp => {
    const origHandler = inp.oninput;
    const origChange  = inp.onchange;
    if (origHandler) inp.oninput = function(e) { origHandler.call(this,e); if(C.active) pushToY(nodeId); };
    if (origChange)  inp.onchange = function(e) { origChange.call(this,e); if(C.active) pushToY(nodeId); };
  });
};

// Hook drag end to broadcast moved node positions (single or group)
document.addEventListener('mouseup', () => {
  if (!C.active) return;
  // Capture the dragged set BEFORE G.drag is cleared by the main mouseup handler.
  // We use a short timeout so the positions are already committed into S.nodes.
  if (G.drag) {
    const movedIds = G.drag.group ? Object.keys(G.drag.group) : [G.drag.id];
    setTimeout(() => {
      if (movedIds.length === 1) {
        pushToY(movedIds[0]);
      } else {
        // Group move — push all moved nodes in one transaction
        if (!C.active || C._applying) return;
        C.doc.transact(() => {
          movedIds.forEach(nid => {
            if (S.nodes[nid]) C.yNodes.set(nid, JSON.parse(JSON.stringify(S.nodes[nid])));
          });
        });
      }
    }, 30);
  }
});

// ── Cursor refresh loop ────────────────────────────────────────────
setInterval(() => {
  if (C.active && C.awareness) renderRemoteCursors(C.awareness.getStates());
}, 80);

// (startup moved into the boot IIFE above)

function showCollabInvite(roomId) {
  // If already active in this room skip
  if (C.active && C.roomId === roomId) return;

  const overlay = document.createElement('div');
  overlay.id = 'collab-invite-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)';
  overlay.innerHTML = `
    <div style="background:#0f1520;border:1px solid rgba(168,85,247,0.35);border-radius:18px;padding:28px 26px;width:360px;max-width:94vw;box-shadow:0 24px 64px rgba(0,0,0,0.7),0 0 0 1px rgba(168,85,247,0.12)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#eaf0fb">You're invited to collaborate!</div>
          <div style="font-size:11px;color:#6b7f96;margin-top:1px">Live session · peer-to-peer · free</div>
        </div>
      </div>
      <p style="font-size:12px;color:#8b949e;line-height:1.6;margin:12px 0 16px">Someone shared a live diagram session with you. Enter your name to join and edit together in real-time.</p>
      <div style="font-size:10px;font-weight:600;color:#6b7f96;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Your display name</div>
      <input id="invite-name-inp" class="collab-input" placeholder="e.g. Alex" autofocus style="margin-bottom:14px"/>
      <button id="invite-join-btn" class="collab-btn primary" style="margin-bottom:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Join session
      </button>
      <button id="invite-skip-btn" class="collab-btn secondary" style="font-size:11px;opacity:0.7">Just view without joining</button>
    </div>`;
  document.body.appendChild(overlay);

  // Pre-fill saved name
  const nameInp = document.getElementById('invite-name-inp');
  if (ME.name) nameInp.value = ME.name;
  nameInp.focus();
  nameInp.select();

  const close = () => { if (overlay.parentNode) document.body.removeChild(overlay); };

  document.getElementById('invite-join-btn').onclick = () => {
    const name = nameInp.value.trim() || 'Guest';
    saveCollabName(name);
    ME.name = name;
    // Pre-fill the main collab modal name input too
    const mainInp = document.getElementById('collab-name-inp');
    if (mainInp) mainInp.value = name;
    close();
    joinCollab(roomId);
    // Show live panel after join
    setTimeout(() => document.getElementById('collab-modal').classList.add('open'), 800);
  };

  document.getElementById('invite-skip-btn').onclick = () => {
    close();
    // Remove collab param from URL so reload doesn't re-prompt
    const u = new URL(location.href);
    u.searchParams.delete('collab');
    history.replaceState(null, '', u.toString());
  };

  // Enter key submits
  nameInp.onkeydown = e => { if (e.key === 'Enter') document.getElementById('invite-join-btn').click(); };
}

// ── Remote cursors container (injected here since the script is a module) ──
document.getElementById('canvas-wrap').insertAdjacentHTML(
  'beforeend',
  '<div id="remote-cursors" style="position:absolute;inset:0;pointer-events:none;z-index:490;overflow:hidden"></div>'
);

// ── First-time user tour ──────────────────────────────────────────────────
const TOUR_KEY = 'archviz.tour.done';

const TOUR_STEPS = [
  {
    target: '#sidebar',
    title: 'Component Palette',
    icon: '🧱',
    body: 'Browse 39+ cloud components — servers, load balancers, databases, CDNs, queues, AI models and more. <strong>Drag any component onto the canvas</strong> to add it to your architecture.',
    position: 'right',
    highlight: true,
  },
  {
    target: '#canvas-wrap',
    title: 'Connecting Components',
    icon: '🔗',
    body: '<strong>Hover over any node</strong> to reveal its blue port dots on the edges. Then <strong>drag from one port to another node</strong> to draw a traffic connection. That\'s how traffic flows between services.',
    position: 'center',
    highlight: false,
  },
  {
    target: '#example-sel',
    title: 'Start from an Example',
    icon: '⚡',
    body: 'New to cloud architecture? <strong>Pick a pre-built example</strong> from this dropdown — Microservices, Event-Driven, Data Pipeline and more — to instantly load a working diagram you can explore and edit.',
    position: 'bottom',
    highlight: true,
  },
  {
    target: '#btn-sim',
    title: 'Run the Simulation',
    icon: '▶',
    body: 'Hit <strong>Run Sim</strong> to push live traffic through your design. Every node shows real-time load %, latency, P95 and error rate. Overloaded nodes turn orange or red — that\'s a bottleneck.',
    position: 'bottom',
    highlight: true,
  },
  {
    target: '#props-panel',
    title: 'Properties & Live Stats',
    icon: '📊',
    body: '<strong>Click any node</strong> to edit its capacity, traffic, region and cost here. While simulation is running you\'ll also see live latency, P95, SLA % and error rate. <strong>Right-click</strong> a node for quick actions like duplicate, delete or add a read replica.',
    position: 'left',
    highlight: true,
  },
  {
    target: '#suggestions',
    title: 'Auto-Fix Suggestions',
    icon: '💡',
    body: 'Archi-Flow analyses your design as you build. <strong>This panel surfaces architecture problems</strong> — overloaded nodes, missing load balancers, single points of failure — with <strong>one-click fixes</strong> that apply the change instantly.',
    position: 'left',
    highlight: true,
  },
  {
    target: '#btn-more',
    title: 'Export, Share & More',
    icon: '✨',
    body: 'Open <strong>⋯</strong> to export a professional PDF report with bottleneck analysis, toggle dark/light theme, enable reserved pricing (−35% discount), or <strong>share a live link</strong> so teammates can view your architecture instantly.',
    position: 'bottom',
    highlight: true,
  },
];

function startTour() {
  if (localStorage.getItem(TOUR_KEY) === '1') return;
  let step = 0;

  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  document.body.appendChild(overlay);

  function getTargetRect(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  function renderStep(idx) {
    overlay.innerHTML = '';
    const s = TOUR_STEPS[idx];
    const rect = getTargetRect(s.target);

    // Spotlight cutout
    if (rect && s.highlight) {
      const pad = 8;
      const spot = document.createElement('div');
      spot.className = 'tour-spotlight';
      spot.style.cssText = `left:${rect.left - pad}px;top:${rect.top - pad}px;width:${rect.width + pad*2}px;height:${rect.height + pad*2}px`;
      overlay.appendChild(spot);
    }

    // Card
    const card = document.createElement('div');
    card.className = 'tour-card';

    // Progress dots
    const dots = TOUR_STEPS.map((_, i) =>
      `<span class="tour-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');

    card.innerHTML = `
      <div class="tour-header">
        <div class="tour-step-label">Step ${idx + 1} of ${TOUR_STEPS.length}</div>
        <button class="tour-skip-btn" id="tour-skip">Skip tour</button>
      </div>
      <div class="tour-title">${s.icon ? `<span class="tour-icon">${s.icon}</span>` : ''}${s.title}</div>
      <div class="tour-body">${s.body}</div>
      <div class="tour-footer">
        <div class="tour-dots">${dots}</div>
        <div class="tour-nav">
          ${idx > 0 ? `<button class="tour-btn secondary" id="tour-back">← Back</button>` : ''}
          <button class="tour-btn primary" id="tour-next">
            ${idx === TOUR_STEPS.length - 1 ? '🚀 Get started!' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    // Position card
    if (rect && s.position !== 'center') {
      positionCard(card, rect, s.position);
    } else {
      card.classList.add('tour-center');
    }

    overlay.appendChild(card);

    document.getElementById('tour-skip').onclick = endTour;
    document.getElementById('tour-next').onclick = () => {
      if (idx === TOUR_STEPS.length - 1) endTour();
      else renderStep(idx + 1);
    };
    const backBtn = document.getElementById('tour-back');
    if (backBtn) backBtn.onclick = () => renderStep(idx - 1);
  }

  function positionCard(card, rect, pos) {
    // Temporarily append off-screen to measure
    card.style.visibility = 'hidden';
    card.style.position = 'fixed';
    document.body.appendChild(card);
    const cw = card.offsetWidth || 320;
    const ch = card.offsetHeight || 180;
    document.body.removeChild(card);
    card.style.visibility = '';

    const margin = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top, left;

    if (pos === 'right') {
      left = rect.right + margin;
      top = rect.top + rect.height / 2 - ch / 2;
    } else if (pos === 'left') {
      left = rect.left - cw - margin;
      top = rect.top + rect.height / 2 - ch / 2;
    } else if (pos === 'bottom') {
      left = rect.left + rect.width / 2 - cw / 2;
      top = rect.bottom + margin;
    } else {
      left = rect.left + rect.width / 2 - cw / 2;
      top = rect.top - ch - margin;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - cw - margin));
    top = Math.max(margin, Math.min(top, vh - ch - margin));

    card.style.position = 'fixed';
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function endTour() {
    localStorage.setItem(TOUR_KEY, '1');
    overlay.classList.add('tour-fade-out');
    setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 350);
  }

  renderStep(0);
}

// Launch tour after a short delay so the app finishes rendering
setTimeout(startTour, 1200);
