/**
 * record-demo.mjs — Records an Archi-Flow walkthrough video + generates SRT subtitles
 *
 * Usage:  node scripts/record-demo.mjs
 * Output:
 *   social-screenshots/archi-flow-demo.webm   (raw recording, ~1280×720)
 *   social-screenshots/archi-flow-demo.mp4    (2× speed, if ffmpeg found)
 *   social-screenshots/archi-flow-demo.srt    (subtitle file)
 */
import { chromium }               from 'playwright';
import { mkdir, rename, rm }      from 'node:fs/promises';
import { execSync }               from 'node:child_process';
import { fileURLToPath }          from 'node:url';
import { createWriteStream }      from 'node:fs';
import path                       from 'node:path';

const BASE_URL  = process.env.APP_URL || 'http://localhost:3456';
const OUT_DIR   = fileURLToPath(new URL('../social-screenshots/', import.meta.url));
const VIDEO_TMP = path.join(OUT_DIR, '_video_tmp');
await mkdir(OUT_DIR,   { recursive: true });
await mkdir(VIDEO_TMP, { recursive: true });

const VP = { width: 1280, height: 720 };

// ── SRT subtitle builder ──────────────────────────────────────────────
// Each cue: { start, end (ms from recording start), text }
const cues = [];
let recStart = null;

function addCue(text, durationMs = 3500) {
  if (!recStart) recStart = Date.now();
  const start = Date.now() - recStart;
  cues.push({ start, end: start + durationMs, text });
}

function msToSrtTime(ms) {
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const s  = Math.floor((ms % 60_000) / 1_000);
  const cs = Math.floor((ms % 1_000) / 10);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(cs * 10).padStart(3,'0')}`;
}

function writeSrt(filePath) {
  const ws = createWriteStream(filePath);
  cues.forEach((c, i) => {
    ws.write(`${i + 1}\n`);
    ws.write(`${msToSrtTime(c.start)} --> ${msToSrtTime(c.end)}\n`);
    ws.write(`${c.text}\n\n`);
  });
  ws.end();
}

// ── Playwright helpers ────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── MAIN ──────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({
  viewport: VP,
  colorScheme: 'dark',
  recordVideo: { dir: VIDEO_TMP, size: VP },
});
const page = await ctx.newPage();
page.on('console', () => {});
page.on('pageerror', () => {});

// Inject a visible mouse cursor overlay so it shows in the recording
await page.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div');
    cursor.style.cssText = `
      position:fixed;z-index:99999;pointer-events:none;
      width:18px;height:18px;border-radius:50%;
      background:rgba(255,255,255,0.9);
      box-shadow:0 0 0 3px rgba(79,156,249,0.7),0 2px 12px rgba(0,0,0,0.5);
      transform:translate(-50%,-50%);left:-40px;top:-40px;
      transition:transform 0.08s ease;`;
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    });
    document.addEventListener('mousedown', () => cursor.style.transform = 'translate(-50%,-50%) scale(0.75)');
    document.addEventListener('mouseup',   () => cursor.style.transform = 'translate(-50%,-50%) scale(1)');
  });
});

const moveTo = async (x, y) => { await page.mouse.move(x, y, { steps: 30 }); await wait(80); };

async function clickEl(selector) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 8000 });
  const box = await el.boundingBox();
  await moveTo(box.x + box.width / 2, box.y + box.height / 2);
  await wait(150);
  await el.click();
}

// ── Scene 1: App loads ────────────────────────────────────────────────
console.log('\n🎬 Recording demo…');
recStart = Date.now();
addCue('Welcome to Archi-Flow — a live architecture simulator', 3500);

await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await wait(800);

// Dismiss cookie / tour
await page.evaluate(() => {
  document.querySelector('#cookie-banner button:last-child')?.click();
  localStorage.setItem('archviz.tour.done', '1');
  document.getElementById('tour-overlay')?.remove();
});
// Wait for examples to load from server
await page.waitForFunction(
  () => typeof window.getExamplesCount === 'function' && window.getExamplesCount() > 5,
  { timeout: 10000 }
).catch(() => wait(3000));
await wait(600);

// ── Scene 2: Open Menu → Load Example ────────────────────────────────
addCue('Open the Menu to browse 13 pre-built architectures', 3000);
await clickEl('#btn-more');
await wait(700);

// hover Load Example
await moveTo(0, 0);
const exBtn = page.locator('#btn-examples');
const exBox  = await exBtn.boundingBox();
await moveTo(exBox.x + exBox.width / 2, exBox.y + exBox.height / 2);
await wait(500);
await exBtn.click();
await wait(900);

// ── Scene 3: Examples modal open ─────────────────────────────────────
addCue('Browse examples by category — from Microservices to AI/RAG', 3500);
await wait(1200);

// click Microservices card
addCue('Loading the Microservices example with one click', 2500);
await page.evaluate(() => {
  document.querySelector('.ex-card-load-btn[data-id="microservices"]')?.click();
});
await wait(900);

// ── Scene 4: Canvas with diagram ─────────────────────────────────────
addCue('The canvas instantly populates with the full architecture', 3000);
await page.evaluate(() => window.fitView?.());
await wait(1200);

// ── Scene 5: Run simulation ───────────────────────────────────────────
addCue('Hit Run Sim — live traffic flows through every node', 3500);
await clickEl('#btn-sim');
await wait(2500);

// ── Scene 6: Show live stats (healthy) ───────────────────────────────
addCue('Green nodes: healthy. See real-time latency, load %, and events/s', 4000);
await wait(2000);
// click a node to show properties
addCue('Click any node to inspect live stats: latency, P95, SLA, error rate', 3500);
await page.evaluate(() => {
  const node = document.querySelector('.a-node');
  if (node) node.click();
});
await wait(1500);

// ── Scene 7: Ramp up traffic until overload ───────────────────────────
addCue('Ramp traffic to 50,000 users — watch nodes turn red under pressure', 4000);
await page.evaluate(() => {
  const slider = document.getElementById('users-slider');
  if (slider) { slider.value = 50000; slider.dispatchEvent(new Event('input')); }
});
await wait(3000);

// ── Scene 8: Suggestions panel ───────────────────────────────────────
addCue('The Suggestions panel auto-detects bottlenecks and offers one-click fixes', 4000);
// click suggestion toggle if hidden
await page.evaluate(() => {
  const panel = document.getElementById('suggestions');
  if (panel) panel.style.display = '';
});
await wait(2000);

// ── Scene 9: Load another example — AI/RAG ───────────────────────────
addCue('Switch to the AI / RAG System example instantly', 3000);
await page.evaluate(() => window.loadExample?.('ai-rag-system'));
await wait(600);
await page.evaluate(() => window.fitView?.());
await wait(800);
addCue('AI pipeline: embedding, vector store, model-serving — all wired up', 3500);
await wait(2000);

// ── Scene 10: Multi-region ────────────────────────────────────────────
addCue('Or explore Multi-Region HA for global failover planning', 3500);
await page.evaluate(() => window.loadExample?.('multi-region-ha'));
await wait(600);
await page.evaluate(() => window.fitView?.());
await wait(800);
await wait(2000);

// ── Scene 11: Export PDF ──────────────────────────────────────────────
addCue('Export a professional PDF report with bottleneck analysis', 3500);
await clickEl('#btn-more');
await wait(800);
// hover pdf button — only if visible after menu opens
try {
  const pdfBtn = page.locator('#btn-export-pdf');
  await pdfBtn.waitFor({ state: 'visible', timeout: 3000 });
  const pdfBox = await pdfBtn.boundingBox();
  if (pdfBox) await moveTo(pdfBox.x + pdfBox.width / 2, pdfBox.y + pdfBox.height / 2);
  await wait(800);
} catch {}
// close menu
await page.keyboard.press('Escape');
await wait(600);

// ── Scene 12: Notification bell ──────────────────────────────────────
addCue('All alerts logged to the notification bell — filterable by type', 3500);
await clickEl('#btn-notif');
await wait(1500);
await clickEl('#notif-close');
await wait(600);

// ── Scene 13: Outro ───────────────────────────────────────────────────
addCue('Archi-Flow — design, simulate, and present cloud architectures instantly', 4500);
await page.evaluate(() => window.fitView?.());
await wait(3000);

// ── Finish ────────────────────────────────────────────────────────────
await ctx.close();
await wait(2000); // let video flush to disk
await browser.close();

// Write SRT
const srtPath = path.join(OUT_DIR, 'archi-flow-demo.srt');
writeSrt(srtPath);
console.log('✅ SRT saved:', srtPath);

// Move video
const { readdir } = await import('node:fs/promises');
const files = await readdir(VIDEO_TMP);
const webm  = files.find(f => f.endsWith('.webm'));
if (!webm) { console.error('❌ No webm found'); process.exit(1); }

const rawWebm = path.join(VIDEO_TMP, webm);
const outWebm = path.join(OUT_DIR, 'archi-flow-demo.webm');
await rename(rawWebm, outWebm);
console.log('✅ WebM saved:', outWebm);

// Optional: encode to MP4 at 2× speed with ffmpeg
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
  console.log('ℹ️  ffmpeg not in PATH — skipping MP4 encode. Use the .webm directly.');
}

await rm(VIDEO_TMP, { recursive: true, force: true });
console.log('\n🎉 Done! Files in:', OUT_DIR);
