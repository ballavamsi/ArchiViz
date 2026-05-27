/**
 * capture-screenshots.mjs — Social-media screenshot capture for Archi-Flow
 *
 * Captures 10 dark-mode shots + 5 light-mode shots at 1280×720.
 *
 * Usage:  node scripts/capture-screenshots.mjs
 * Output: social-screenshots/  (PNG files)
 */
import { chromium } from 'playwright';
import { mkdir }    from 'node:fs/promises';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.APP_URL || 'http://localhost:3456';
const OUT_DIR  = fileURLToPath(new URL('../social-screenshots/', import.meta.url));
await mkdir(OUT_DIR, { recursive: true });

const VP = { width: 1280, height: 720 };

// ── Dark-mode shots ───────────────────────────────────────────────────────────
const DARK_SHOTS = [
  { id: 'microservices',   file: '01-microservices-live-traffic.png',   users: 1000,   sim: true,  wait: 2200 },
  { id: 'saas-web-app',    file: '02-saas-web-app-sim.png',             users: 5000,   sim: true,  wait: 2200 },
  { id: 'ai-rag-system',   file: '03-ai-rag-system.png',                users: 800,    sim: true,  wait: 2200 },
  { id: 'multi-region-ha', file: '04-multi-region-ha.png',              users: 20000,  sim: true,  wait: 2200 },
  { id: 'event-streaming', file: '05-event-streaming-platform.png',     users: 50000,  sim: true,  wait: 2200 },
  { id: 'lakehouse',       file: '06-lakehouse-analytics.png',          users: 10000,  sim: true,  wait: 2200 },
  { id: 'cdc-streaming',   file: '07-cdc-kafka-pipeline.png',           users: 200000, sim: true,  wait: 2200 },
  { id: 'microservices',   file: '08-microservices-overloaded.png',     users: 500000, sim: true,  wait: 2500 },
  { id: null,              file: '09-examples-modal.png',               users: null,   sim: false, modal: true },
  { id: null,              file: '10-empty-canvas.png',                 users: null,   sim: false, empty: true },
];

// ── Light-mode shots — best visual variety ────────────────────────────────────
const LIGHT_SHOTS = [
  { id: 'saas-web-app',    file: 'light-01-saas-web-app.png',           users: 5000,   sim: true,  wait: 2200 },
  { id: 'microservices',   file: 'light-02-microservices.png',          users: 1000,   sim: true,  wait: 2200 },
  { id: 'ai-rag-system',   file: 'light-03-ai-rag-system.png',          users: 800,    sim: true,  wait: 2200 },
  { id: 'multi-region-ha', file: 'light-04-multi-region-ha.png',        users: 20000,  sim: true,  wait: 2200 },
  { id: null,              file: 'light-05-examples-modal.png',         users: null,   sim: false, modal: true },
];

const wait = ms => new Promise(r => setTimeout(r, ms));

async function setup(page, theme = 'dark') {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(t => {
    document.querySelector('#cookie-banner button:last-child')?.click();
    localStorage.setItem('archviz.tour.done', '1');
    document.getElementById('tour-overlay')?.remove();
    // Force theme via app's setTheme function
    if (typeof setTheme === 'function') setTheme(t);
    else {
      document.documentElement.setAttribute('data-theme', t);
      document.body.classList.toggle('theme-light', t === 'light');
    }
  }, theme);
  await wait(500);
}

async function clearCanvas(page) {
  await page.evaluate(() => {
    if (typeof clearCanvas === 'function') clearCanvas(true);
    document.getElementById('tour-overlay')?.remove();
    const modal = document.getElementById('examples-modal');
    if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
  });
  await wait(200);
}

async function captureShot(browser, shot, theme = 'dark') {
  console.log(`\n📸  [${theme}] ${shot.file}`);
  const scheme = theme === 'light' ? 'light' : 'dark';
  const ctx  = await browser.newContext({ viewport: VP, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('console', () => {});
  page.on('pageerror', () => {});

  await setup(page, theme);

  if (shot.empty) {
    await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
    await ctx.close();
    console.log(`   ✅ saved`);
    return;
  }

  if (shot.modal) {
    await page.evaluate(() => window.openExamplesModal?.());
    await wait(800);
    await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
    await ctx.close();
    console.log(`   ✅ saved`);
    return;
  }

  // Wait for examples to load
  await page.waitForFunction(
    () => typeof window.getExamplesCount === 'function' && window.getExamplesCount() > 5,
    { timeout: 10000 }
  ).catch(() => wait(3000));

  await page.evaluate(id => window.loadExample(id), shot.id);
  await wait(900);

  if (shot.users) {
    await page.evaluate(u => {
      const slider = document.getElementById('users-slider');
      if (slider) {
        // log-scale: pos = log10(users) * 100
        slider.value = Math.round(Math.log10(Math.max(1, u)) * 100);
        slider.dispatchEvent(new Event('input'));
      }
    }, shot.users);
    await wait(300);
  }

  await page.evaluate(() => window.fitView?.());
  await wait(500);

  if (shot.sim) {
    await page.evaluate(() => document.getElementById('btn-sim')?.click());
    await wait(shot.wait);
    await page.evaluate(() => window.fitView?.());
    await wait(400);
  }

  await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
  console.log(`   ✅ saved`);

  if (shot.sim) {
    await page.evaluate(() => document.getElementById('btn-stop')?.click());
  }

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n🌑  Dark-mode screenshots…');
  for (const shot of DARK_SHOTS) {
    await captureShot(browser, shot, 'dark');
  }

  console.log('\n\n☀️   Light-mode screenshots…');
  for (const shot of LIGHT_SHOTS) {
    await captureShot(browser, shot, 'light');
  }

  await browser.close();
  console.log(`\n🎉 All screenshots saved to: ${OUT_DIR}`);
})();
