/**
 * capture-screenshots.mjs — Social-media screenshot capture for Archi-Flow
 * Usage:  node scripts/capture-screenshots.mjs
 * Output: social-screenshots/  (1280×720 PNG, dark mode)
 */
import { chromium } from 'playwright';
import { mkdir }    from 'node:fs/promises';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.APP_URL || 'http://localhost:3456';
const OUT_DIR  = fileURLToPath(new URL('../social-screenshots/', import.meta.url));
await mkdir(OUT_DIR, { recursive: true });

const VP = { width: 1280, height: 720 };

const SHOTS = [
  // id, filename, userCount, runSim, waitAfterSim (ms)
  { id: 'microservices',   file: '01-microservices-live-traffic.png',     users: 1000,    sim: true,  wait: 2200 },
  { id: 'saas-web-app',    file: '02-saas-web-app-sim.png',               users: 5000,    sim: true,  wait: 2200 },
  { id: 'ai-rag-system',   file: '03-ai-rag-system.png',                  users: 800,     sim: true,  wait: 2200 },
  { id: 'multi-region-ha', file: '04-multi-region-ha.png',                users: 20000,   sim: true,  wait: 2200 },
  { id: 'event-streaming', file: '05-event-streaming-platform.png',       users: 50000,   sim: true,  wait: 2200 },
  { id: 'lakehouse',       file: '06-lakehouse-analytics.png',            users: 10000,   sim: true,  wait: 2200 },
  { id: 'cdc-streaming',   file: '07-cdc-kafka-pipeline.png',             users: 200000,  sim: true,  wait: 2200 },
  { id: 'microservices',   file: '08-microservices-overloaded.png',       users: 500000,  sim: true,  wait: 2500 },
  // No-sim shots
  { id: null,              file: '09-examples-modal.png',                 users: null,    sim: false, modal: true  },
  { id: null,              file: '10-empty-canvas.png',                   users: null,    sim: false, empty: true  },
];

const wait = ms => new Promise(r => setTimeout(r, ms));

async function setup(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    // Accept cookies, skip tour
    document.querySelector('#cookie-banner button:last-child')?.click();
    localStorage.setItem('archviz.tour.done', '1');
    document.getElementById('tour-overlay')?.remove();
  });
  await wait(400);
}

async function clearCanvas(page) {
  await page.evaluate(() => {
    if (typeof clearCanvas === 'function') clearCanvas(true);
    // also close any open panels
    document.getElementById('tour-overlay')?.remove();
    document.getElementById('examples-modal')?.classList.remove('open');
    document.getElementById('examples-modal').style.display = 'none';
  });
  await wait(200);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const shot of SHOTS) {
    console.log(`\n📸  ${shot.file}`);

    const ctx  = await browser.newContext({ viewport: VP, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('console', () => {}); // silence
    page.on('pageerror', () => {});

    await setup(page);

    if (shot.empty) {
      // Just the blank canvas welcome screen
      await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
      await ctx.close();
      console.log(`   ✅ saved`);
      continue;
    }

    if (shot.modal) {
      await page.evaluate(() => window.openExamplesModal?.());
      await wait(800);
      await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
      await ctx.close();
      console.log(`   ✅ saved`);
      continue;
    }

    // Wait until EXAMPLES are loaded (getExamplesCount exposed on window)
    await page.waitForFunction(
      () => typeof window.getExamplesCount === 'function' && window.getExamplesCount() > 5,
      { timeout: 10000 }
    ).catch(() => wait(3000));

    // Load example
    await page.evaluate(id => window.loadExample(id), shot.id);
    await wait(900);

    // Set user count via slider / state
    if (shot.users) {
      await page.evaluate(u => {
        // Set S.userCount via the slider input if it exists, otherwise tweak directly
        const slider = document.getElementById('users-slider');
        if (slider) {
          slider.value = u;
          slider.dispatchEvent(new Event('input'));
        }
      }, shot.users);
      await wait(300);
    }

    // Fit view
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

    // Stop sim
    if (shot.sim) {
      await page.evaluate(() => document.getElementById('btn-stop')?.click());
    }

    await ctx.close();
  }

  await browser.close();
  console.log(`\n🎉 All screenshots saved to: ${OUT_DIR}`);
})();
