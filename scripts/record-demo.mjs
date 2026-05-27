/**
 * record-demo.mjs — Archi-Flow comprehensive walkthrough
 *
 * Scene breakdown:
 *   1.  Welcome — empty canvas, palette intro
 *   2.  Load Example — open modal, pick "SaaS Web App"
 *   3.  Clear canvas — transition to manual build
 *   4.  Drag 6 components (Users → LB → App1 + App2 → DB → Cache)
 *   5.  Wire 6 connections
 *   6.  Run Sim — healthy green at 100 users
 *   7.  Click node — live stats (load %, latency, P95, SLA)
 *   8.  Click edge — traffic % panel
 *   9.  Collapse / expand overview minimap
 *  10.  Toggle HUD cockpit compact ↔ full
 *  11.  Reserved Instance pricing — toggle on, show −35% cost
 *  12.  Change theme — dark → light → back to dark
 *  13.  Ramp to 10,000 users — nodes turn red
 *  14.  Suggestions panel fires — one-click fixes listed
 *  15.  Enable auto-scaling → replicas spin up → back to green
 *  16.  Live Share — open share panel, show short link
 *  17.  Outro — Menu (export PDF / present)
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
// Clamp each cue's end to next cue's start minus a small gap (no overlap)
function trimCues() {
  return cues.map((c, i) => {
    const nextStart = cues[i + 1]?.start;
    const end = nextStart != null ? Math.min(c.end, nextStart - 80) : c.end;
    return { ...c, end: Math.max(c.start + 200, end) };
  });
}

function writeSrt(fp, trimmedCues) {
  const ws = createWriteStream(fp);
  trimmedCues.forEach((c, i) => {
    ws.write(`${i + 1}\n${msToSrt(c.start)} --> ${msToSrt(c.end)}\n${c.text}\n\n`);
  });
  ws.end();
}

// Generate TTS audio via macOS `say`, place each cue at its exact timestamp,
// then mux into the MP4 so voice + video + subtitles are all in sync.
async function generateTTSAndMux(trimmedCues, videoPath, outputPath, tmpDir) {
  try { execSync('which say', { stdio: 'ignore' }); }
  catch { console.log('ℹ️  `say` not found — skipping TTS'); return; }

  console.log('\n🎙  Generating TTS audio…');
  const ttsDir = path.join(tmpDir, 'tts');
  await mkdir(ttsDir, { recursive: true });

  const wavFiles = [];
  for (let i = 0; i < trimmedCues.length; i++) {
    const c    = trimmedCues[i];
    const aiff = path.join(ttsDir, `cue_${i}.aiff`);
    const wav  = path.join(ttsDir, `cue_${i}.wav`);
    // Escape quotes and special chars for shell
    const txt  = c.text.replace(/"/g, '\\"').replace(/'/g, "\\'");
    execSync(`say -v Samantha -r 160 -o "${aiff}" "${txt}"`, { stdio: 'ignore' });
    execSync(`ffmpeg -y -i "${aiff}" -ar 44100 -ac 2 "${wav}"`, { stdio: 'ignore' });
    wavFiles.push({ wav, startMs: c.start });
    process.stdout.write(`   [${i + 1}/${trimmedCues.length}] ✓\r`);
  }
  console.log(`\n   ✅ ${wavFiles.length} cues generated`);

  // Place each wav at its exact timestamp using adelay, then amix all together
  const inputs    = wavFiles.map(f => `-i "${f.wav}"`).join(' ');
  const delays    = wavFiles.map((f, i) => `[${i}]adelay=${f.startMs}|${f.startMs}[a${i}]`).join(';');
  const mixInputs = wavFiles.map((_, i) => `[a${i}]`).join('');
  const filter    = `${delays};${mixInputs}amix=inputs=${wavFiles.length}:normalize=0:dropout_transition=0[aout]`;
  const mixedWav  = path.join(ttsDir, 'mixed.wav');

  console.log('   Mixing audio tracks…');
  execSync(
    `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[aout]" -ar 44100 "${mixedWav}"`,
    { stdio: 'ignore' }
  );

  console.log('   Muxing audio into video…');
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${mixedWav}" ` +
    `-c:v copy -c:a aac -b:a 128k -shortest "${outputPath}"`,
    { stdio: 'inherit' }
  );

  console.log('✅ Video with TTS audio saved:', outputPath);
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

// White dot cursor overlay
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.style.cssText = [
      'position:fixed','z-index:99999','pointer-events:none',
      'width:16px','height:16px','border-radius:50%',
      'background:rgba(255,255,255,0.92)',
      'box-shadow:0 0 0 3px rgba(79,156,249,0.8),0 2px 10px rgba(0,0,0,0.55)',
      'transform:translate(-50%,-50%)','left:-40px','top:-40px',
      'transition:transform 0.07s ease',
    ].join(';');
    document.body.appendChild(dot);
    document.addEventListener('mousemove', e => { dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px'; });
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
  const cx = b.x + b.width/2, cy = b.y + b.height/2;
  await moveTo(cx, cy);
  await wait(120);
  await page.mouse.click(cx, cy);
  await wait(250);
}

// Visual-only drag from palette → canvas; window.dropNodeAt is the sole node placer
async function dragFromPalette(defId, searchTerm, tx, ty) {
  await page.fill('#pal-search', searchTerm);
  await wait(300);

  const item = page.locator(`.pal-item[data-def-id="${defId}"]`).first();
  await item.waitFor({ state: 'visible', timeout: 5000 });
  const src = await item.boundingBox();
  const sx = src.x + src.width/2, sy = src.y + src.height/2;

  await moveTo(sx, sy, 20);
  await wait(250);

  for (let i = 1; i <= 32; i++) {
    await page.mouse.move(sx + (tx - sx)*(i/32), sy + (ty - sy)*(i/32), { steps: 1 });
    await wait(18);
  }
  await wait(150);

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

// Visual cursor arc + connectByLabel as sole wirer
async function connectNodes(srcLabel, tgtLabel) {
  const pos = await page.evaluate(({ s, t }) => {
    const find = lbl => [...document.querySelectorAll('.a-node')]
      .find(el => el.querySelector('.node-label')?.textContent?.trim() === lbl);
    const se = find(s), te = find(t);
    if (!se || !te) return null;
    const sr = se.getBoundingClientRect(), tr = te.getBoundingClientRect();
    return { sx: sr.right-6, sy: sr.top+sr.height/2, tx: tr.left+6, ty: tr.top+tr.height/2 };
  }, { s: srcLabel, t: tgtLabel });

  if (pos) {
    await moveTo(pos.sx-20, pos.sy, 14);
    await wait(180);
    await moveTo(pos.sx, pos.sy, 10);
    await wait(200);
    for (let i = 1; i <= 28; i++) {
      await page.mouse.move(
        pos.sx + (pos.tx-pos.sx)*(i/28),
        pos.sy + (pos.ty-pos.sy)*(i/28),
        { steps: 1 }
      );
      await wait(16);
    }
    await wait(200);
  }

  await page.evaluate(({ s, t }) => window.connectByLabel(s, t), { s: srcLabel, t: tgtLabel });
  await page.evaluate(() => window.forceRenderEdges());
  await wait(250);
}

async function clickNode(label) {
  const pos = await page.evaluate(lbl => {
    const el = [...document.querySelectorAll('.a-node')]
      .find(e => e.querySelector('.node-label')?.textContent?.trim() === lbl);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left+r.width/2, y: r.top+r.height/2 };
  }, label);
  if (!pos) { console.warn('node not found:', label); return; }
  await moveTo(pos.x, pos.y, 22);
  await wait(120);
  await page.mouse.click(pos.x, pos.y);
  await wait(700);
}

async function deselect(canvasBox) {
  await page.mouse.click(canvasBox.x + 80, canvasBox.y + 40);
  await wait(400);
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
  window.toggleMinimap?.(true);
  window.setTheme?.('dark');
});

await page.waitForFunction(
  () => typeof window.dropNodeAt === 'function' &&
        typeof window.getExamplesCount === 'function' &&
        window.getExamplesCount() > 5,
  { timeout: 12000 }
).catch(() => wait(4000));
await wait(600);

// ─── Scene 2: Load Example ────────────────────────────────────────────────────
addCue('Start fast — browse 13+ pre-built architectures in Load Examples', 4000);
await click('#btn-more');
await wait(600);
await click('#btn-examples');
await wait(1000);

// Hover over a few cards to show the modal
const modalVisible = await page.locator('#examples-modal.open').isVisible().catch(() => false);
if (modalVisible) {
  addCue('Filter by category — Web Apps, Data, AI, Multi-Region and more', 3500);
  // Move cursor across cards
  const cards = await page.locator('.ex-card').all();
  for (let i = 0; i < Math.min(3, cards.length); i++) {
    const cb = await cards[i].boundingBox();
    if (cb) await moveTo(cb.x + cb.width/2, cb.y + cb.height/2, 18);
    await wait(400);
  }

  addCue('Click any example to instantly load it onto your canvas', 3000);
  // Load "saas-web-app" example
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.ex-card')]
      .find(c => c.dataset.id === 'saas-web-app')
      ?.querySelector('.ex-load-btn');
    btn?.click();
  });
  await wait(1200);
} else {
  // Fallback: load directly
  await page.evaluate(() => window.loadExample('saas-web-app'));
  await wait(1200);
}

await page.evaluate(() => window.fitView?.());
await wait(800);
addCue('Loaded: SaaS Web App — 8-node production architecture, ready to simulate', 3500);
await wait(2000);

// ─── Scene 3: Clear & build manually ─────────────────────────────────────────
addCue('Or build from scratch — clear the canvas and design your own', 3500);

// Close examples modal if still open before touching the canvas
await page.evaluate(() => {
  window.closeExamplesModal?.();
  const modal = document.getElementById('examples-modal');
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
});
await wait(400);

await page.evaluate(() => window.clearCanvas?.(true));
await wait(600);
await page.evaluate(() => window.fitView?.());
await wait(500);

// ─── Scene 4: Drag components ─────────────────────────────────────────────────
addCue('Drag components from the palette — every major cloud service is here', 4000);
await wait(600);

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
const idUsers = await dragFromPalette('users',        'users',    C.users.x, C.users.y);
await wait(300);

addCue('Add a Load Balancer to distribute traffic evenly', 2500);
const idLB    = await dragFromPalette('loadbalancer', 'load bal', C.lb.x,    C.lb.y);
await wait(300);

addCue('Two App Servers for horizontal scaling', 2500);
const idApp1  = await dragFromPalette('appserver',    'app serv', C.app1.x,  C.app1.y);
await wait(250);
const idApp2  = await dragFromPalette('appserver',    'app serv', C.app2.x,  C.app2.y);
await wait(300);

addCue('A Database and Cache to complete the tier', 2500);
const idDB    = await dragFromPalette('database',     'database', C.db.x,    C.db.y);
await wait(300);
const idCache = await dragFromPalette('cache',        'cache',    C.cache.x, C.cache.y);
await wait(400);

await page.evaluate(({ a1, a2 }) => {
  window.renameNodeById(a1, 'App Server 1');
  window.renameNodeById(a2, 'App Server 2');
}, { a1: idApp1, a2: idApp2 });

await page.evaluate(() => window.fitView?.());
await wait(600);

// ─── Scene 5: Connect ─────────────────────────────────────────────────────────
addCue('Connect components by dragging from port dots — rules are enforced automatically', 4000);
await wait(600);

await connectNodes('Users',         'Load Balancer');
await wait(200);
addCue('Load Balancer distributes traffic to both App Servers', 2500);
await connectNodes('Load Balancer', 'App Server 1');
await wait(150);
await connectNodes('Load Balancer', 'App Server 2');
await wait(200);
addCue('App Servers hit Cache first, then fall back to the Database', 2500);
await connectNodes('App Server 1',  'Cache');
await wait(150);
await connectNodes('App Server 2',  'Cache');
await wait(150);
await connectNodes('Cache',         'Database');
await wait(400);

await page.evaluate(() => { window.forceRenderEdges(); window.fitView?.(); });
await wait(700);

addCue('Architecture wired — 6 components, 6 connections', 3000);
await wait(1500);

// ─── Scene 6: Run simulation (green) ─────────────────────────────────────────
addCue('Hit Run Sim — live traffic flows through your design instantly', 4000);
await wait(500);
await click('#btn-sim');
await wait(2500);

addCue('All green — healthy system at 100 users, latency well within SLA', 4000);
await wait(1800);

// ─── Scene 7: Node stats panel ───────────────────────────────────────────────
addCue('Click any node to inspect live stats: load %, latency, P95, and SLA status', 4000);
await clickNode('Load Balancer');
await wait(1000);
addCue('Metrics update tick-by-tick as traffic flows through the node', 3500);
await wait(2000);
await deselect(canvasBox);

// ─── Scene 8: Edge traffic % panel ───────────────────────────────────────────
addCue('Click an edge to see live throughput and set custom traffic split percentages', 4000);
// Move to midpoint of Users→LB edge and click
const usersPos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.a-node')]
    .find(e => e.querySelector('.node-label')?.textContent?.trim() === 'Users');
  const r = el?.getBoundingClientRect();
  return r ? { x: r.right, y: r.top + r.height/2 } : null;
});
const lbPos = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.a-node')]
    .find(e => e.querySelector('.node-label')?.textContent?.trim() === 'Load Balancer');
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top + r.height/2 } : null;
});
if (usersPos && lbPos) {
  const mx = (usersPos.x + lbPos.x) / 2, my = (usersPos.y + lbPos.y) / 2;
  await moveTo(mx, my, 20);
  await wait(400);
  await page.mouse.click(mx, my);
  await wait(800);
}
addCue('Set explicit split ratios or let Archi-Flow auto-balance across all downstream edges', 4000);
await wait(2200);
await deselect(canvasBox);

// ─── Scene 9: Collapse overview ───────────────────────────────────────────────
addCue('The Overview minimap shows your full architecture at a glance', 3500);
const mmBox = await page.locator('#minimap').boundingBox().catch(() => null);
if (mmBox) await moveTo(mmBox.x + mmBox.width/2, mmBox.y + mmBox.height/2, 20);
await wait(600);

addCue('Collapse it with one click to reclaim canvas space', 3000);
await click('#minimap-toggle');
await wait(1200);

addCue('Expand it again whenever you need it', 2500);
await click('#minimap-toggle');
await wait(900);

// ─── Scene 10: HUD cockpit toggle ─────────────────────────────────────────────
const hudBox = await page.locator('#canvas-hud').boundingBox().catch(() => null);
if (hudBox) {
  addCue('The Architecture Cockpit shows real-time cost, health score, and node counts', 4000);
  await moveTo(hudBox.x + hudBox.width/2, hudBox.y + 30, 20);
  await wait(700);

  addCue('Minimize to a compact ring indicator for more canvas space', 3000);
  await page.evaluate(() => window.toggleCockpitCompact?.(true));
  await wait(1500);

  addCue('Expand back to the full cockpit to see the complete breakdown', 3000);
  await page.evaluate(() => window.toggleCockpitCompact?.(false));
  await wait(1200);
}

// ─── Scene 11: Reserved Instance pricing ─────────────────────────────────────
addCue('Toggle Reserved Instance pricing — saves ~35% on all compute costs', 4000);
await click('#btn-more');
await wait(600);

// Move cursor to btn-reserved inside menu
const reservedBtn = await page.locator('#btn-reserved').boundingBox().catch(() => null);
if (reservedBtn) {
  await moveTo(reservedBtn.x + reservedBtn.width/2, reservedBtn.y + reservedBtn.height/2, 18);
  await wait(300);
  await page.mouse.click(reservedBtn.x + reservedBtn.width/2, reservedBtn.y + reservedBtn.height/2);
  await wait(400);
}
await wait(800);

addCue('Cost drops instantly — Reserved pricing applied across all compute nodes', 3500);
await wait(1800);

// Toggle it back off for clarity
await click('#btn-more');
await wait(400);
const reservedBtn2 = await page.locator('#btn-reserved').boundingBox().catch(() => null);
if (reservedBtn2) {
  await page.mouse.click(reservedBtn2.x + reservedBtn2.width/2, reservedBtn2.y + reservedBtn2.height/2);
  await wait(300);
}
await page.keyboard.press('Escape');
await wait(500);

// ─── Scene 12: Change theme ───────────────────────────────────────────────────
addCue('Switch between Dark and Light themes — pick the look that suits you', 4000);
// Open Menu and hover over theme button so viewer can see it
await click('#btn-more');
await wait(500);
const themeBtn = await page.locator('#btn-theme').boundingBox().catch(() => null);
if (themeBtn) {
  await moveTo(themeBtn.x + themeBtn.width/2, themeBtn.y + themeBtn.height/2, 18);
  await wait(400);
}
await page.keyboard.press('Escape');
await wait(300);

// Switch to light via window.setTheme (reliable, no cycle-counting needed)
await page.evaluate(() => window.setTheme('light'));
await wait(900);

addCue('Light theme — clean and bright for presentations and daytime work', 3500);
await wait(2200);

// Switch back to dark
await page.evaluate(() => window.setTheme('dark'));
await wait(600);

addCue('Back to Dark theme — designed for deep focus sessions', 2500);
await wait(1200);

// ─── Scene 13: Ramp to 10K users ─────────────────────────────────────────────
addCue('Now stress-test it — ramp to 10,000 users and watch the system respond', 4000);
await page.evaluate(() => {
  const sl = document.getElementById('users-slider');
  if (sl) {
    sl.value = Math.round(Math.log10(10000) * 100); // log-scale: 10k = pos 400
    sl.dispatchEvent(new Event('input'));
  }
});
await wait(2800);

addCue('App Servers turn red — overloaded! The bottleneck is crystal clear', 4000);
await wait(1500);

// ─── Scene 14: Suggestions panel ─────────────────────────────────────────────
addCue('Suggestions panel auto-detects the problem and proposes targeted fixes', 3500);
await deselect(canvasBox);
const sugBox = await page.locator('#suggestions').boundingBox().catch(() => null);
if (sugBox) {
  await moveTo(sugBox.x + sugBox.width/2, sugBox.y + 70, 20);
  await wait(800);
}
addCue('One-click fixes: increase capacity, add replicas, or enable auto-scaling', 4000);
await wait(2000);

// ─── Scene 15: Auto-scale ─────────────────────────────────────────────────────
addCue('Enable auto-scaling on App Server 1 — replicas spin up automatically', 4000);
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

addCue('Replicas spin up — load distributes, system returns to healthy green', 4000);
await page.evaluate(() => window.fitView?.());
await wait(2200);
await deselect(canvasBox);

// ─── Scene 16: Live Share ─────────────────────────────────────────────────────
addCue('Share your architecture — generate a permanent link anyone can view live', 4000);
await click('#btn-share');
await wait(1200);

const sharePanel = await page.locator('.share-panel, #share-overlay, [class*="share"]').first().boundingBox().catch(() => null);
if (sharePanel) {
  await moveTo(sharePanel.x + sharePanel.width/2, sharePanel.y + 80, 20);
  await wait(600);
}
addCue('Copy the link — viewers get a live read-only preview of your architecture', 3500);
await wait(2000);

// Close share panel
await page.keyboard.press('Escape');
await wait(500);
// Try clicking close button if escape didn't work
await page.evaluate(() => {
  document.getElementById('sh-close')?.click();
  document.querySelector('.share-close')?.click();
});
await wait(500);

// ─── Scene 17: Outro ──────────────────────────────────────────────────────────
addCue('Export a PDF report, present in full-screen, or save to the cloud', 3500);
await click('#btn-more');
await wait(700);
const menu = await page.locator('#more-menu').boundingBox().catch(() => null);
if (menu) await moveTo(menu.x + 40, menu.y + 60, 14);
await wait(1200);
await page.keyboard.press('Escape');
await wait(500);

addCue('Archi-Flow — design, simulate, and present cloud architectures in minutes', 5000);
await page.evaluate(() => window.fitView?.());
await wait(3800);

// ── Save ──────────────────────────────────────────────────────────────────────
await ctx.close();
await wait(2000);
await browser.close();

// Trim cues once — shared by SRT writer and TTS generator
const trimmedCues = trimCues();

const srtPath = path.join(OUT_DIR, 'archi-flow-demo.srt');
writeSrt(srtPath, trimmedCues);
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

  // Step 1: encode video-only MP4
  const mp4Silent = path.join(OUT_DIR, 'archi-flow-demo-silent.mp4');
  execSync(
    `ffmpeg -y -i "${outWebm}" -vf "scale=1280:720:flags=lanczos" ` +
    `-c:v libx264 -crf 18 -preset fast -pix_fmt yuv420p -movflags +faststart "${mp4Silent}"`,
    { stdio: 'ignore' }
  );
  console.log('✅ Silent MP4 encoded');

  // Step 2: generate TTS audio and mux into final MP4
  const mp4Final = path.join(OUT_DIR, 'archi-flow-demo.mp4');
  await generateTTSAndMux(trimmedCues, mp4Silent, mp4Final, VIDEO_TMP);

  // Clean up silent intermediary
  await rm(mp4Silent, { force: true });

} catch (e) {
  console.log('ℹ️  ffmpeg not found — use the .webm directly');
  console.error(e.message);
}

await rm(VIDEO_TMP, { recursive: true, force: true });
console.log('\n🎉 Done! Output in:', OUT_DIR);
