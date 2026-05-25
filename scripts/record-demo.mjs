/**
 * Archi-Flow demo — drag & drop microservices from scratch, 3× speed
 *
 * Layout (matches screenshot):
 *   Users → API Gateway → Auth Service  → Main DB
 *                       → Order Service ↗
 *                       → Notif Service → Message Queue
 */
import { chromium } from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const postDir  = fileURLToPath(new URL('../post/', import.meta.url));
const videoDir = path.join(postDir, '_video_tmp');
await mkdir(videoDir, { recursive: true });

const SITE = 'http://localhost:3456';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 810 } },
});
const page = await ctx.newPage();

// ── Claude-style cursor ───────────────────────────────────────────────
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const mk = (css, html = '') => {
      const d = document.createElement('div');
      d.style.cssText = css; if (html) d.innerHTML = html;
      document.body.appendChild(d); return d;
    };
    const glow  = mk('position:fixed;z-index:999994;pointer-events:none;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle,rgba(255,160,50,0.2) 0%,transparent 70%);transform:translate(-50%,-50%);left:-300px;top:-300px;');
    const arrow = mk('position:fixed;z-index:999999;pointer-events:none;width:32px;height:32px;left:-300px;top:-300px;transform-origin:5px 3px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.6));transition:transform 0.07s ease;',
      '<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 4L6 25L11 19.5L15 28L18 26.5L14 18L21 18L6 4Z" fill="white" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>');
    const ripple = mk('position:fixed;z-index:999996;pointer-events:none;width:56px;height:56px;border-radius:50%;border:2.5px solid rgba(255,150,40,0.8);transform:translate(-50%,-50%) scale(0);opacity:0;left:-300px;top:-300px;');
    const dot    = mk('position:fixed;z-index:999998;pointer-events:none;width:9px;height:9px;border-radius:50%;background:#ff6b2b;box-shadow:0 0 0 2.5px rgba(255,107,43,0.3);transform:translate(-50%,-50%);left:-300px;top:-300px;transition:transform 0.08s ease;');
    const mv = (x, y) => [arrow, dot, glow, ripple].forEach(el => { el.style.left = x+'px'; el.style.top = y+'px'; });
    document.addEventListener('mousemove', e => mv(e.clientX, e.clientY));
    document.addEventListener('mousedown', e => {
      mv(e.clientX, e.clientY);
      arrow.style.transform = 'scale(0.80)'; dot.style.transform = 'translate(-50%,-50%) scale(1.5)';
      ripple.style.transition = 'none'; ripple.style.transform = 'translate(-50%,-50%) scale(0)'; ripple.style.opacity = '1';
      setTimeout(() => { ripple.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1),opacity 0.5s ease-out'; ripple.style.transform = 'translate(-50%,-50%) scale(2.6)'; ripple.style.opacity = '0'; }, 10);
    });
    document.addEventListener('mouseup', () => { arrow.style.transform = 'scale(1)'; dot.style.transform = 'translate(-50%,-50%) scale(1)'; });
  });
});

// ── Helpers ───────────────────────────────────────────────────────────
const wait   = ms => page.waitForTimeout(ms);
const moveTo = async (x, y, steps = 24) => { await page.mouse.move(x, y, { steps }); await wait(80); };

// Canvas origin (set after load)
let OX = 0, OY = 0;
// Canvas coords → viewport: initial panX=40, panY=40, zoom=1
const vp = (cx, cy) => ({ x: OX + 40 + cx, y: OY + 40 + cy });

// Drag a palette item onto the canvas.
// Uses Playwright's dragAndDrop for reliable HTML5 drag (sets G.dragDef, fires drop handler).
// Also animates the cursor visually over the same path.
const dropNode = async (defId, cx, cy, search) => {
  await page.fill('#pal-search', search);
  await wait(300);

  const item = page.locator(`.pal-item[data-def-id="${defId}"]`).first();
  await item.waitFor({ state: 'visible', timeout: 6000 });
  const src = await item.boundingBox();
  const sx = src.x + src.width / 2;
  const sy = src.y + src.height / 2;
  const dst = vp(cx, cy);

  // Read nSeq before drop so we know what ID will be assigned
  const seqBefore = await page.evaluate(() => {
    // nSeq is module-scoped; read from the most recent node ID
    const ids = Object.keys(window.getNodes ? window.getNodes().reduce((m,n)=>{m[n.id]=1;return m;},{}) : {});
    return ids.length ? Math.max(...ids.map(id => parseInt(id.replace('n',''))||0)) : 0;
  });

  // Visual cursor animation (runs alongside the actual drag)
  const animPromise = (async () => {
    await moveTo(sx, sy, 14);
    await wait(100);
    for (let i = 1; i <= 35; i++) {
      await page.mouse.move(sx + (dst.x - sx) * i / 35, sy + (dst.y - sy) * i / 35, { steps: 1 });
      await wait(14);
    }
  })();

  // Actual HTML5 drag-and-drop — creates the node via the app's drop handler
  const canvasBox = await page.locator('#canvas-wrap').boundingBox();
  await page.dragAndDrop(
    `.pal-item[data-def-id="${defId}"]:visible`,
    '#canvas-wrap',
    {
      targetPosition: {
        x: Math.round(dst.x - canvasBox.x),
        y: Math.round(dst.y - canvasBox.y),
      },
    }
  );

  await animPromise;
  await wait(350);

  // Get the new node's ID (highest nSeq after drop)
  const id = await page.evaluate((seqBefore) => {
    const nodes = window.getNodes();
    const newNode = nodes
      .filter(n => parseInt(n.id.replace('n','')) > seqBefore)
      .sort((a,b) => parseInt(b.id.replace('n','')) - parseInt(a.id.replace('n','')))[0];
    return newNode?.id || null;
  }, seqBefore);

  await page.fill('#pal-search', '');
  await wait(200);
  console.log(`    dropped ${defId} → id=${id}`);
  return id;
};

// Rename: animate cursor dblclick visually, then set label via JS helper
const renameNode = async (nodeId, newLabel) => {
  const lbl = page.locator(`#node-${nodeId} .node-label`);
  const box = await lbl.boundingBox().catch(() => null);
  if (box) {
    await moveTo(box.x + box.width / 2, box.y + box.height / 2, 14);
    await wait(150);
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await wait(250);
    // Type new name into the inline input that appears
    await page.keyboard.press('Control+a');
    await page.keyboard.type(newLabel);
    await page.keyboard.press('Enter');
    await wait(300);
  }
  // Always ensure the rename sticks via the JS helper
  await page.evaluate(({ id, label }) => window.renameNodeById(id, label), { id: nodeId, label: newLabel });
  await wait(200);
};

// Animate cursor drawing a connection line, then wire it for real via connectByLabel
const connectNodes = async (srcLabel, tgtLabel) => {
  // Get screen positions from rendered node elements
  const pos = await page.evaluate(({ s, t }) => {
    const find = label => [...document.querySelectorAll('.a-node')]
      .find(el => el.querySelector('.node-label')?.textContent?.trim() === label);
    const se = find(s), te = find(t);
    if (!se || !te) return null;
    const sr = se.getBoundingClientRect();
    const tr = te.getBoundingClientRect();
    return { sx: sr.right - 4, sy: sr.top + sr.height / 2, tx: tr.left + 4, ty: tr.top + tr.height / 2 };
  }, { s: srcLabel, t: tgtLabel });

  if (pos) {
    await moveTo(pos.sx - 24, pos.sy, 16);
    await wait(200);
    await moveTo(pos.sx, pos.sy, 10);
    await wait(180);
    await page.mouse.down();
    await wait(80);
    for (let i = 1; i <= 30; i++) {
      await page.mouse.move(
        pos.sx + (pos.tx - pos.sx) * i / 30,
        pos.sy + (pos.ty - pos.sy) * i / 30,
        { steps: 1 }
      );
      await wait(14);
    }
    await wait(100);
    await page.mouse.up();
    await wait(250);
  }

  // Wire the edge for real by label — no ID guessing
  const ok = await page.evaluate(
    ({ s, t }) => window.connectByLabel(s, t),
    { s: srcLabel, t: tgtLabel }
  );
  if (!ok) console.warn('  ⚠ connectByLabel failed:', srcLabel, '→', tgtLabel);
  await wait(300);
};

const setUsers = async (val) => {
  const box = await page.locator('#users-input').boundingBox();
  await moveTo(box.x + box.width / 2, box.y + box.height / 2);
  await page.click('#users-input', { clickCount: 3 });
  await page.keyboard.type(String(val));
  await page.keyboard.press('Enter');
  await wait(700);
};

const clickNodeByLabel = async (label) => {
  const pos = await page.evaluate(label => {
    const el = [...document.querySelectorAll('.a-node')]
      .find(e => e.querySelector('.node-label')?.textContent?.trim() === label);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, label);
  if (!pos) { console.warn('node not found:', label); return; }
  await moveTo(pos.x, pos.y, 26);
  await wait(100);
  await page.mouse.click(pos.x, pos.y);
  await wait(800);
};

const enableAutoscale = async () => {
  await page.evaluate(() => document.getElementById('autoscale-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await wait(450);
  const box = await page.locator('#autoscale-section').boundingBox().catch(() => null);
  if (box) await moveTo(box.x + box.width / 2, box.y + box.height / 2, 16);
  await page.evaluate(() => {
    const cb = document.querySelector('#autoscale-section input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await wait(2000);  // hold so viewer sees ×2 replica badge appear
};

// ── START ─────────────────────────────────────────────────────────────
console.log('🎬 Recording…');
await page.goto(SITE);
await page.waitForLoadState('networkidle');
await wait(1200);

const cwBox = await page.locator('#canvas-wrap').boundingBox();
OX = cwBox.x; OY = cwBox.y;

// Canvas coords — wide spacing so traffic particles are clearly visible
// zoom=1, panX=40, panY=40 at load time
const CX = { users: 40,  gw: 340,  auth: 660, order: 660, notif: 660, db: 980, queue: 980 };
const CY = { users: 320, gw: 320,  auth: 120, order: 320, notif: 520, db: 200, queue: 480 };

// ── 1. Drag all nodes from palette ───────────────────────────────────
console.log('  Dropping nodes…');
const idUsers = await dropNode('users',      CX.users,  CY.users,  'users');
const idGW    = await dropNode('apigateway', CX.gw,     CY.gw,     'gateway');
const idAuth  = await dropNode('appserver',  CX.auth,   CY.auth,   'app server');
const idOrder = await dropNode('appserver',  CX.order,  CY.order,  'app server');
const idNotif = await dropNode('appserver',  CX.notif,  CY.notif,  'app server');
const idDB    = await dropNode('database',   CX.db,     CY.db,     'database');
const idQueue = await dropNode('queue',      CX.queue,  CY.queue,  'queue');
await wait(400);

// ── 2. Rename nodes ───────────────────────────────────────────────────
console.log('  Renaming…');
await renameNode(idAuth,  'Auth Service');
await renameNode(idOrder, 'Order Service');
await renameNode(idNotif, 'Notif Service');
await renameNode(idDB,    'Main DB');
await renameNode(idQueue, 'Message Queue');

// API Gateway handles 25K req/s — not the bottleneck
await page.evaluate(({ id }) => window.setNodeProp(id, 'capacity', 25000), { id: idGW });
// Auth & Order capped at 500 req/s — go red under 10K load
await page.evaluate(({ id }) => window.setNodeProp(id, 'capacity', 500), { id: idAuth });
await page.evaluate(({ id }) => window.setNodeProp(id, 'capacity', 500), { id: idOrder });
// Notif Service capped at 1K req/s
await page.evaluate(({ id }) => window.setNodeProp(id, 'capacity', 1000), { id: idNotif });
// DB handles 20K req/s — not the bottleneck
await page.evaluate(({ id }) => window.setNodeProp(id, 'capacity', 20000), { id: idDB });
await wait(400);

// ── 3. Fit to view ────────────────────────────────────────────────────
console.log('  Fitting…');
const fitBtn = page.locator('#btn-fit');
const fitBox = await fitBtn.boundingBox();
await moveTo(fitBox.x + fitBox.width / 2, fitBox.y + fitBox.height / 2);
await fitBtn.click();
await wait(1800);

// Verify nodes are on screen
const nodeLabels = await page.evaluate(() => window.getNodes().map(n => n.label));
console.log('  Nodes on canvas:', nodeLabels);

// ── 4. Connect nodes (cursor animation + real edge) ───────────────────
console.log('  Connecting nodes…');
await connectNodes('Users',         'API Gateway');
await connectNodes('API Gateway',   'Auth Service');
await connectNodes('API Gateway',   'Order Service');
await connectNodes('API Gateway',   'Notif Service');
await connectNodes('Auth Service',   'Main DB');
await connectNodes('Order Service',  'Main DB');
await connectNodes('Notif Service',  'Message Queue');

// Force a full edge re-render to make sure all lines are visible
await page.evaluate(() => window.forceRenderEdges());
await wait(600);

// ── 5. Fit again after wiring ─────────────────────────────────────────
await moveTo(fitBox.x + fitBox.width / 2, fitBox.y + fitBox.height / 2);
await fitBtn.click();
await wait(2000);

// ── 6. Run Sim ────────────────────────────────────────────────────────
console.log('  Run Sim…');
const simBtn = page.locator('#btn-sim');
const simBox = await simBtn.boundingBox();
await moveTo(simBox.x + simBox.width / 2, simBox.y + simBox.height / 2);
await wait(350);
await simBtn.click();
await wait(2500);

// ── 7. Start at 500 — everything healthy ─────────────────────────────
console.log('  500 users (green)…');
await setUsers(500);
await wait(2500);

// ── 8. Ramp to 7000 — services go red ────────────────────────────────
console.log('  10K users (red)…');
await setUsers(10000);
await wait(3000);

// ── 9. Enable autoscale on each service ──────────────────────────────
console.log('  Autoscale Auth Service…');
await clickNodeByLabel('Auth Service');
await enableAutoscale();

console.log('  Autoscale Order Service…');
await clickNodeByLabel('Order Service');
await enableAutoscale();

console.log('  Autoscale Notif Service…');
await clickNodeByLabel('Notif Service');
await enableAutoscale();

// ── 10. Final fit — all green with ×2 replicas ───────────────────────
await moveTo(fitBox.x + fitBox.width / 2, fitBox.y + fitBox.height / 2);
await fitBtn.click();
await wait(4000);  // hold on the full green ×2 diagram

console.log('  Done!');
await wait(1500);

const sleep = ms => new Promise(r => setTimeout(r, ms));
await ctx.close();
await sleep(2000);   // let the video file finish writing to disk
await browser.close();

// ── Save & encode at 3× speed ─────────────────────────────────────────
const { readdir } = await import('node:fs/promises');
const files = await readdir(videoDir);
const webm  = files.find(f => f.endsWith('.webm'));
if (webm) {
  const src = path.join(videoDir, webm);
  const dst = path.join(postDir, 'archi-flow-demo.webm');
  await rename(src, dst);
  console.log('✅ WebM saved:', dst);
  try {
    execSync('which ffmpeg', { stdio: 'ignore' });
    const mp4 = path.join(postDir, 'archi-flow-demo.mp4');
    execSync(
      `ffmpeg -y -i "${dst}" -vf "setpts=PTS/3,scale=1440:810" -c:v libx264 -crf 20 -preset fast -movflags +faststart "${mp4}"`,
      { stdio: 'inherit' }
    );
    console.log('✅ MP4 (3× speed) saved:', mp4);
  } catch {
    console.log('ℹ️  ffmpeg not found — use archi-flow-demo.webm');
  }
}
await rm(videoDir, { recursive: true, force: true });
