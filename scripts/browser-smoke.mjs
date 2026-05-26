import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 3461;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

const server = spawn(process.execPath, ['server.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let browser;
let context;

try {
  await waitForServer(BASE);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1365, height: 820 },
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    localStorage.removeItem('archviz.theme');
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.themeMode === 'system');

  const darkCanvas = await page.locator('#canvas-wrap').evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      imageLayers: cs.backgroundImage.split('),').length,
      size: cs.backgroundSize,
      theme: document.body.dataset.theme,
      themeMode: document.body.dataset.themeMode,
      themeButton: document.getElementById('btn-theme')?.textContent?.trim(),
    };
  });

  assert.equal(darkCanvas.theme, 'dark');
  assert.equal(darkCanvas.themeMode, 'system');
  assert.match(darkCanvas.themeButton, /Theme: System/);
  assert.equal(darkCanvas.imageLayers, 4, 'canvas should use minor and major grid layers');
  assert.match(darkCanvas.size, /10px 10px/);
  assert.match(darkCanvas.size, /40px 40px/);

  await page.locator('#btn-more').click();
  await page.locator('#btn-theme').click();

  const lightCanvas = await page.locator('#canvas-wrap').evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      theme: document.body.dataset.theme,
      themeButton: document.getElementById('btn-theme')?.textContent?.trim(),
    };
  });

  assert.equal(lightCanvas.theme, 'light');
  assert.equal(lightCanvas.bg, 'rgb(255, 255, 255)');
  assert.match(lightCanvas.themeButton, /Theme: Light/);

  const ringState = await page.locator('.health-ring').evaluate(el => {
    const cs = getComputedStyle(el);
    const span = el.querySelector('span');
    const spanCs = getComputedStyle(span);
    return {
      backgroundImage: cs.backgroundImage,
      label: span?.textContent?.trim(),
      labelColor: spanCs.color,
      labelDisplay: spanCs.display,
    };
  });
  assert.match(ringState.backgroundImage, /radial-gradient/, 'health ring should have a solid readable center');
  assert.match(ringState.backgroundImage, /conic-gradient/, 'health ring should retain percent ring fill');
  assert.ok(ringState.label, 'health ring should show a visible label');

  const notifBadgeState = await page.locator('#btn-notif').evaluate(btn => {
    const badge = document.getElementById('notif-badge');
    badge.style.display = 'block';
    badge.textContent = '6';
    const bell = btn.querySelector('svg').getBoundingClientRect();
    const bb = badge.getBoundingClientRect();
    const bellCenter = { x: bell.left + bell.width / 2, y: bell.top + bell.height / 2 };
    return {
      badgeTop: bb.top,
      bellTop: bell.top,
      bellCenterCovered:
        bellCenter.x >= bb.left && bellCenter.x <= bb.right &&
        bellCenter.y >= bb.top && bellCenter.y <= bb.bottom,
    };
  });
  assert.ok(notifBadgeState.badgeTop < notifBadgeState.bellTop, 'notification badge should sit above the bell icon');
  assert.equal(notifBadgeState.bellCenterCovered, false, 'notification badge should not cover the bell center');

  await page.locator('#btn-more').click();
  const menuState = await page.locator('#more-menu').evaluate(el => {
    const cs = getComputedStyle(el);
    const item = el.querySelector('.more-item');
    const itemCs = getComputedStyle(item);
    return {
      bg: cs.backgroundColor,
      backdrop: cs.backdropFilter,
      width: Math.round(el.getBoundingClientRect().width),
      itemColor: itemCs.color,
    };
  });
  assert.equal(menuState.bg, 'rgb(255, 255, 255)');
  assert.ok(menuState.width >= 232, 'More menu should be wide enough for labels');
  assert.equal(menuState.itemColor, 'rgb(51, 65, 85)');

  await page.locator('#btn-share').click();
  await page.locator('.share-box').waitFor({ state: 'visible', timeout: 5000 });
  const shareState = await page.locator('.share-box').evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      title: el.querySelector('.share-title')?.textContent?.trim(),
      copy: el.querySelector('#sh-copy')?.textContent?.trim(),
    };
  });
  assert.equal(shareState.bg, 'rgb(255, 255, 255)');
  assert.equal(shareState.title, 'Share Architecture');
  assert.match(shareState.copy, /Copy full URL/);
  await page.locator('#sh-close').click();

  const authProbe = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'auth-gate-card';
    el.style.position = 'absolute';
    el.style.left = '-10000px';
    document.body.appendChild(el);
    const bg = getComputedStyle(el).backgroundColor;
    el.remove();
    return bg;
  });
  assert.equal(authProbe, 'rgb(255, 255, 255)', 'auth/login card should follow light theme tokens');

  await page.locator('#btn-more').click();
  const pdfPromise = page.waitForEvent('popup', { timeout: 5000 });
  await page.locator('#btn-export-pdf').click();
  const pdfPage = await pdfPromise;
  await pdfPage.waitForLoadState('domcontentloaded');
  await pdfPage.locator('text=Architecture Diagram').waitFor({ state: 'visible', timeout: 5000 });
  await pdfPage.locator('text=Component Performance').waitFor({ state: 'visible', timeout: 5000 });
  await pdfPage.close();

  assert.deepEqual(consoleErrors, []);

  console.log('Browser smoke passed: grid, theme, share popup, login theme token, and PDF export are working.');
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
