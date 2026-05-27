/**
 * record-demo.mjs — Archi-Flow comprehensive walkthrough
 *
 * Scene breakdown:
 *   1. Empty canvas — welcome + palette intro
 *   2. Drag 6 components onto canvas (Users, LB, 2× App Server, DB, Cache)
 *   3. Connect all nodes (6 edges)
 *   4. Run Sim — healthy green state at 100 users
 *   5. Click node — live stats panel (load %, latency, P95, SLA)
 *   6. Click edge — traffic % panel
 *   7. Collapse / expand overview minimap
 *   8. Toggle HUD cockpit compact ↔ full
 *   9. Ramp to 10,000 users — nodes turn red
 *  10. Suggestions panel fires — one-click fixes
 *  11. Enable auto-scaling on App Server 1 — replicas spin up, back to green
 *  12. Outro — Menu (export PDF / share / save)
 *
 * Usage:
 *   node scripts/record-demo.mjs
 *   APP_URL=http://localhost:58855 node scripts/record-demo.mjs
 *
 * Output:
 *   social-screenshots/archi-flow-demo.webm
 *   social-screenshots/archi-flow-demo.mp4   (2× speed, requires ffmpeg)
 *   social-screenshots/archi-flow-demo.srt
 */
import { chromium }          from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { execSync }          from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { fileURLToPath }     from 'node:url';
import path                  from 'node:path';

const BASE_URL  = process.env.APP_URL || 'http://localhost:3456';
const OUT_DIR   = fileURLToPath(new URL('../social-screenshots/', import.meta.url));
const VIDEO_TMP = path.join(OUT_DIR, '_video_tmp');
await mkdir(OUT_DIR,   { recursive: true });
await mkdir(VIDEO_TMP, { recursive: true });

const VP = { width: 1280, height: 720 };

// ── SRT builder ───────────────────────────────────────────────────────────────
const cues = [];
let recStart = null;
function addCue(text, durationMs = 3500) {
  if (!recStart) recStart = Date.now();
  const start = Date.now() - recStart;
  cues.push({ start, end: start + durationMs, text });
  console.log(`   💬 [${(start/1000).toFixed(1)}s] ${text}`);
}
function msToSrt(ms) {
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const s  = Math.floor((ms % 60_000) / 1_000);
  const cs = String(ms % 1_000).padStart(3, '0');
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${cs}`;
}
function writeSrt(fp) {
  const ws = createWriteStream(fp);
  cues.forEach((c, i) => {
    ws.write(`${i + 1}\n${msToSrt(c.start)} --> ${msToSrt(c.end)}\n${c.text}\n\n`);
  });
  ws.end();
}

// ── Playwright setup ──────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: VP,
  colorScheme: 'dark',
  recordVideo: { dir: VIDEO_TMP, size: VP },
});
const page = await ctx.newPage();
page.on('console', () => {});
page.on('pageerror', () => {});

// Inject a white dot cursor so it shows in the recording
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const dot = Object.assign(document.createElement('div'), {});
    dot.style.cssText = [
      'position:fixed', 'z-index:99999', 'pointer-events:none',
      'width:16px', 'height:16px', 'border-radius:50%',
      'background:rgba(255,255,255,0.92)',
      'box-shadow:0 0 0 3px rgba(79,156,249,0.8),0 2px 10px rgba(0,0,0,0.55)',
      'transform:translate(-50%,-50%)', 'left:-40px', 'top:-40px',
      'transition:transform 0.07s ease',
    ].join(';');
    document.body.appendChild(dot);
    document.addEventListener('mousemove', e => {
      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';
    });
    document.addEventListener('mousedown', () => dot.style.transform = 'translate(-50%,-50%) scale(0.7)');
    document.addEventListener('mouseup',   () => dot.style.transform = 'translate(-50%,-50%) scale(1)');
  });
});

const wait   = ms => new Promise(r => setTimeout(r, ms));
const moveTo = async (x, y, steps = 28) => { await page.mouse.move(x, y, { steps }); await wait(60); };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function bbox(selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 6000 });
  return page.locator(selector).first().boundingBox();
}

async function click(selector) {
  const b = await bbox(selector);
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await moveTo(cx, cy);
  await wait(120);
  await page.mouse.click(cx, cy);
  await wait(250);
}

// Drag palette item → canvas viewport position (tx, ty)
// Cursor animates the drag visually; window.dropNodeAt is the ONLY node placer
// (no real mousedown/up — that would double-place via the app's drag handler)
async function dragFromPalette(defId, searchTerm, tx, ty) {
  await page.fill('#pal-search', searchTerm);
  await wait(300);

  const item = page.locator(`.pal-item[data-def-id="${defId}"]`).first();
  await item.waitFor({ state: 'visible', timeout: 5000 });
  const src = await item.boundingBox();
  const sx  = src.x + src.width / 2;
  const sy  = src.y + src.height / 2;

  // Hover on palette item (no click / mousedown)
  await moveTo(sx, sy, 20);
  await wait(250);

  // Animate cursor from palette → drop point (purely visual — no drag events)
  const steps = 32;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      sx + (tx - sx) * (i / steps),
      sy + (ty - sy) * (i / steps),
      { steps: 1 }
    );
    await wait(18);
  }
  await wait(150);

  // Place the node via JS helper (single source of truth)
  const canvasBox = await page.locator('#canvas-wrap').boundingBox();
  const tf = await page.evaluate(() => window.getCanvasTransform());
  const cx = (tx - canvasBox.x - tf.panX) / tf.zoom - 80;
  const cy = (ty - canvasBox.y - tf.panY) / tf.zoom - 44;
  const id = await page.evaluate(
    ({ defId, cx, cy }) => window.dropNodeAt(defId, cx, cy),
    { defId, cx: Math.round(cx), cy: Math.round(cy) }
  );

  await page.fill('#pal-search', '');
  await wait(250);
  console.log(`     dropped ${defId} id=${id}`);
  return id;
}

// Animate cursor drag + wire edge via JS helper
// Cursor moves visually from source port → target; connectByLabel is the sole wirer
async function connectNodes(srcLabel, tgtLabel) {
  const pos = await page.evaluate(({ s, t }) => {
    const find = lbl => [...document.querySelectorAll('.a-node')]
      .find(el => el.querySelector('.node-label')?.textContent?.trim() === lbl);
    const se = find(s), te = find(t);
    if (!se || !te) return null;
    const sr = se.getBoundingClientRect();
    const tr = te.getBoundingClientRect();
    return { sx: sr.right - 6, sy: sr.top + sr.height/2, tx: tr.left + 6, ty: tr.top + tr.height/2 };
  }, { s: srcLabel, t: tgtLabel });

  if (pos) {
    // Visual-only cursor animation — no mousedown/up to avoid double-wiring
    await moveTo(pos.sx - 20, pos.sy, 14);
    await wait(180);
    await moveTo(pos.sx, pos.sy, 10);
    await wait(200);
    for (let i = 1; i <= 28; i++) {
      await page.mouse.move(
        pos.sx + (pos.tx - pos.sx) * (i / 28),
        pos.sy + (pos.ty - pos.sy) * (i / 28),
        { steps: 1 }
      );
      await wait(16);
    }
    await wait(200);
  }

  // Wire via JS helper (single source of truth)
  await page.evaluate(({ s, t }) => window.connectByLabel(s, t), { s: srcLabel, t: tgtLabel });
  await page.evaluate(() => window.forceRenderEdges());
  await wait(250);
}

// Click a canvas node by label
async function clickNode(label) {
  const pos = await page.evaluate(lbl => {
    const el = [...document.querySelectorAll('.a-node')]
      .find(e => e.querySelector('.node-label')?.textContent?.trim() === lbl);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  }, label);
  if (!pos) { console.warn('node not found:', label); return; }
  await moveTo(pos.x, pos.y, 22);
  await wait(120);
  await page.mouse.click(pos.x, pos.y);
  await wait(700);
}

// Click an edge by source→target label
async function clickEdge(srcLabel, tgtLabel) {
  await page.evaluate(({ s, t }) => {
    const nodes = window.getNodes?.() || {};
    const srcId = Object.values(nodes).find(n => n.label === s || n.id === s)?.id;
    const tgtId = Object.values(nodes).find(n => n.label === t || n.id === t)?.id;
    // find SVG edge path and click midpoint
    const edgePaths = document.querySelectorAll('.a-edge path.edge-hit');
    for (const p of edgePaths) {
      const edgeEl = p.closest('.a-edge');
      if (!edgeEl) continue;
      const id = edgeEl.dataset.edgeId;
      if (!id) continue;
      // Try clicking the midpoint of the path
      const len = p.getTotalLength();
      const mid = p.getPointAtLength(len / 2);
      const rect = document.getElementById('canvas-svg')?.getBoundingClientRect() || { x: 0, y: 0 };
      const evt = new MouseEvent('click', {
        bubbles: true, cancelable: true,
        clientX: mid.x + rect.x,
        clientY: mid.y + rect.y,
      });
      p.dispatchEvent(evt);
      break;
    }
  }, { s: srcLabel, t: tgtLabel });
  await wait(600);
}

// Hover over minimap area with cursor animation
async function hoverMinimap() {
  const mm = await page.locator('#minimap').boundingBox().catch(() => null);
  if (!mm) return;
  await moveTo(mm.x + mm.width / 2, mm.y + mm.height / 2, 20);
  await wait(500);
}

// ── SCRIPT START ──────────────────────────────────────────────────────────────
console.log('\n🎬  Recording Archi-Flow comprehensive demo…\n');
recStart = Date.now();

// ─── Scene 1: Welcome ─────────────────────────────────────────────────────────
addCue('Welcome to Archi-Flow — design cloud architectures with live simulation', 4000);
await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await wait(800);

await page.evaluate(() => {
  document.querySelector('#cookie-banner button:last-child')?.click();
  localStorage.setItem('archviz.tour.done', '1');
  document.getElementById('tour-overlay')?.remove();
  // Make sure minimap starts expanded
  window.toggleMinimap?.(true);
});

await page.waitForFunction(
  () => typeof window.dropNodeAt === 'function' &&
        typeof window.getExamplesCount === 'function' &&
        window.getExamplesCount() > 5,
  { timeout: 12000 }
).catch(() => wait(4000));
await wait(600);

// ─── Scene 2: Palette drag ────────────────────────────────────────────────────
addCue('Step 1 — Drag components from the palette onto the canvas', 4000);
await wait(800);

const canvasBox = await page.locator('#canvas-wrap').boundingBox();
const C = {
  users : { x: canvasBox.x + 130, y: canvasBox.y + 280 },
  lb    : { x: canvasBox.x + 340, y: canvasBox.y + 280 },
  app1  : { x: canvasBox.x + 560, y: canvasBox.y + 185 },
  app2  : { x: canvasBox.x + 560, y: canvasBox.y + 380 },
  db    : { x: canvasBox.x + 790, y: canvasBox.y + 280 },
  cache : { x: canvasBox.x + 790, y: canvasBox.y + 130 },
};

addCue('Drag "Users" — represents your user base', 2500);
const idUsers = await dragFromPalette('users', 'users', C.users.x, C.users.y);
await wait(350);

addCue('Add a Load Balancer to distribute traffic evenly', 2500);
const idLB    = await dragFromPalette('loadbalancer', 'load bal', C.lb.x, C.lb.y);
await wait(350);

addCue('Drop two App Servers for horizontal scaling', 2500);
const idApp1  = await dragFromPalette('appserver', 'app server', C.app1.x, C.app1.y);
await wait(250);
const idApp2  = await dragFromPalette('appserver', 'app server', C.app2.x, C.app2.y);
await wait(350);

addCue('Add a Database for persistent storage', 2500);
const idDB    = await dragFromPalette('database', 'database', C.db.x, C.db.y);
await wait(350);

addCue('And a Cache layer to reduce Database load', 2500);
const idCache = await dragFromPalette('cache', 'cache', C.cache.x, C.cache.y);
await wait(500);

await page.evaluate(({ a1, a2 }) => {
  window.renameNodeById(a1, 'App Server 1');
  window.renameNodeById(a2, 'App Server 2');
}, { a1: idApp1, a2: idApp2 });

await page.evaluate(() => window.fitView?.());
await wait(700);

// ─── Scene 3: Connect nodes ───────────────────────────────────────────────────
addCue('Step 2 — Connect components by dragging from port dots', 4000);
await wait(800);

addCue('Hover a node to reveal its blue port dots, then drag to connect', 3500);
await connectNodes('Users', 'Load Balancer');
await wait(250);

addCue('Load Balancer splits traffic equally to both App Servers', 3000);
await connectNodes('Load Balancer', 'App Server 1');
await wait(200);
await connectNodes('Load Balancer', 'App Server 2');
await wait(250);

addCue('App Servers read from Cache first, then fall back to Database', 3000);
await connectNodes('App Server 1', 'Cache');
await wait(200);
await connectNodes('App Server 2', 'Cache');
await wait(200);
await connectNodes('Cache', 'Database');
await wait(400);

await page.evaluate(() => { window.forceRenderEdges(); window.fitView?.(); });
await wait(700);

addCue('Architecture wired — 6 components, 6 connections', 3000);
await wait(1500);

// ─── Scene 4: Run Simulation ──────────────────────────────────────────────────
addCue('Step 3 — Hit Run Sim to push live traffic through the design', 4000);
await wait(600);

await click('#btn-sim');
await wait(2500);

addCue('Green nodes — system is healthy with 100 users at low latency', 4000);
await wait(1800);

// ─── Scene 5: Node stats panel ───────────────────────────────────────────────
addCue('Click any node to inspect live stats: load %, latency, P95, SLA', 4000);
await clickNode('Load Balancer');
await wait(1000);

addCue('Live metrics update in real-time as traffic flows through the node', 3500);
await wait(2000);

// Deselect
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + 50);
await wait(600);

// ─── Scene 6: Edge traffic % panel ───────────────────────────────────────────
addCue('Click an edge to inspect traffic flow and set custom split percentages', 4000);
// Click midpoint of canvas to deselect, then click an edge
await page.evaluate(() => {
  // Click the first edge path element found
  const hit = document.querySelector('.a-edge path.edge-hit, .a-edge line, .a-edge path');
  if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
await wait(800);
// Move cursor over the edge area (between Users and LB)
const usersPos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.a-node')]
    .find(e => e.querySelector('.node-label')?.textContent?.trim() === 'Users');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.right, y: r.top + r.height / 2 };
});
const lbPos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.a-node')]
    .find(e => e.querySelector('.node-label')?.textContent?.trim() === 'Load Balancer');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top + r.height / 2 };
});
if (usersPos && lbPos) {
  const midX = (usersPos.x + lbPos.x) / 2;
  const midY = (usersPos.y + lbPos.y) / 2;
  await moveTo(midX, midY, 20);
  await wait(400);
  await page.mouse.click(midX, midY);
  await wait(800);
}
addCue('Set custom traffic split percentages per edge — or let Archi-Flow auto-balance', 4000);
await wait(2200);

// Deselect edge
await page.mouse.click(canvasBox.x + 100, canvasBox.y + 50);
await wait(600);

// ─── Scene 7: Collapse overview ───────────────────────────────────────────────
addCue('The Overview minimap helps you navigate large architectures', 3500);
await hoverMinimap();
await wait(600);

addCue('Collapse it with one click to reclaim canvas space', 3000);
await click('#minimap-toggle');
await wait(1200);

addCue('Expand it again whenever you need it', 2500);
await click('#minimap-toggle');
await wait(1000);

// ─── Scene 8: HUD cockpit toggle ─────────────────────────────────────────────
const hudBox = await page.locator('#canvas-hud').boundingBox().catch(() => null);
if (hudBox) {
  addCue('The Architecture Cockpit shows real-time cost, health, and node counts', 4000);
  await moveTo(hudBox.x + hudBox.width / 2, hudBox.y + hudBox.height / 2, 20);
  await wait(600);

  addCue('Minimize it to a compact ring indicator — maximizing your canvas space', 3500);
  await page.evaluate(() => window.toggleCockpitCompact?.(true));
  await wait(1500);

  addCue('Expand back to full cockpit for the complete breakdown', 3000);
  await page.evaluate(() => window.toggleCockpitCompact?.(false));
  await wait(1200);
}

// ─── Scene 9: Ramp traffic ────────────────────────────────────────────────────
addCue('Now ramp to 10,000 users — watch the bottlenecks appear', 4000);
await page.evaluate(() => {
  const sl = document.getElementById('users-slider');
  if (sl) { sl.value = 10000; sl.dispatchEvent(new Event('input')); }
});
await wait(2800);

addCue('App Servers turn red — overloaded! The bottleneck is clear', 4000);
await wait(1500);

// ─── Scene 10: Suggestions panel ─────────────────────────────────────────────
addCue('The Suggestions panel auto-detects problems and proposes fixes', 3500);
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + 60);
await wait(600);

const sugBox = await page.locator('#suggestions').boundingBox().catch(() => null);
if (sugBox) {
  await moveTo(sugBox.x + sugBox.width / 2, sugBox.y + 70, 20);
  await wait(800);
}
addCue('One-click fixes: increase capacity, add replicas, or enable auto-scaling', 4000);
await wait(2000);

// ─── Scene 11: Enable auto-scale ─────────────────────────────────────────────
addCue('Enable auto-scaling on App Server 1 — watch replicas spin up automatically', 4000);
await clickNode('App Server 1');
await wait(600);

await page.evaluate(() => {
  const cb = document.querySelector('#autoscale-section input[type="checkbox"]');
  if (cb && !cb.checked) {
    cb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => cb.click(), 400);
  }
});
await wait(2800);

addCue('Replicas spin up — load distributes, nodes return to healthy green', 4000);
await page.evaluate(() => window.fitView?.());
await wait(2500);

// ─── Scene 12: Outro ──────────────────────────────────────────────────────────
addCue('Export a PDF report, share a live link, or save to the cloud', 3500);
await click('#btn-more');
await wait(600);
const moreMenu = await page.locator('#more-menu').boundingBox().catch(() => null);
if (moreMenu) await moveTo(moreMenu.x + 30, moreMenu.y + 50, 14);
await wait(1200);
await page.keyboard.press('Escape');
await wait(600);

addCue('Archi-Flow — design, simulate, and present cloud architectures in minutes', 5000);
await page.evaluate(() => window.fitView?.());
await wait(3500);

// ── Save ──────────────────────────────────────────────────────────────────────
await ctx.close();
await wait(2000);
await browser.close();

const srtPath = path.join(OUT_DIR, 'archi-flow-demo.srt');
writeSrt(srtPath);
console.log('\n✅ SRT saved:', srtPath);

const { readdir } = await import('node:fs/promises');
const files = await readdir(VIDEO_TMP);
const webm  = files.find(f => f.endsWith('.webm'));
if (!webm) { console.error('❌ No webm found'); process.exit(1); }

const outWebm = path.join(OUT_DIR, 'archi-flow-demo.webm');
await rename(path.join(VIDEO_TMP, webm), outWebm);
console.log('✅ WebM saved:', outWebm);

try {
  execSync('which ffmpeg', { stdio: 'ignore' });
  const mp4 = path.join(OUT_DIR, 'archi-flow-demo.mp4');
  execSync(
    `ffmpeg -y -i "${outWebm}" -vf "setpts=PTS/2.0,scale=1280:720:flags=lanczos" ` +
    `-c:v libx264 -crf 18 -preset fast -pix_fmt yuv420p -movflags +faststart "${mp4}"`,
    { stdio: 'inherit' }
  );
  console.log('✅ MP4 (2× speed) saved:', mp4);
} catch {
  console.log('ℹ️  ffmpeg not found — use the .webm directly');
}

await rm(VIDEO_TMP, { recursive: true, force: true });
console.log('\n🎉 Done! Output in:', OUT_DIR);
