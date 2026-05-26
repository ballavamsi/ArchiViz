import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 3461 + Math.floor(Math.random() * 600);
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assertContrast(name, ratio, min) {
  assert.ok(
    ratio >= min,
    `${name} contrast ${ratio.toFixed(2)} should be at least ${min}:1`
  );
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
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    localStorage.removeItem('archviz.theme');
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.goto(`${BASE}/?smoke=${Date.now()}`, { waitUntil: 'domcontentloaded' });
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
  await page.waitForTimeout(220);

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

  const contrastState = await page.evaluate(() => {
    function parseRgb(input) {
      const m = String(input).match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 1];
      const parts = m[1].split(',').map(v => Number(v.trim()));
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }
    function composite(fg, bg) {
      const a = fg[3];
      return [
        Math.round((fg[0] * a) + (bg[0] * (1 - a))),
        Math.round((fg[1] * a) + (bg[1] * (1 - a))),
        Math.round((fg[2] * a) + (bg[2] * (1 - a))),
      ];
    }
    function linear(v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    function lum(rgb) {
      const [r, g, b] = rgb.map(linear);
      return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
    }
    function ratio(fgCss, bgCss) {
      const bg = composite(parseRgb(bgCss), [255, 255, 255, 1]);
      const fg = composite(parseRgb(fgCss), [...bg, 1]);
      const a = lum(fg);
      const b = lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
    function pair(selector) {
      const el = document.querySelector(selector);
      const cs = getComputedStyle(el);
      return {
        color: cs.color,
        background: cs.backgroundColor,
        ratio: ratio(cs.color, cs.backgroundColor),
      };
    }
    return {
      cost: pair('#cost-badge'),
      share: pair('#btn-share'),
      live: pair('#btn-collab'),
      more: pair('#btn-more'),
      notif: pair('#btn-notif'),
    };
  });
  if (process.env.DEBUG_CONTRAST) console.log(JSON.stringify(contrastState, null, 2));
  assertContrast('Cost badge text', contrastState.cost.ratio, 4.5);
  assertContrast('Share button text', contrastState.share.ratio, 4.5);
  assertContrast('Live button text', contrastState.live.ratio, 4.5);
  assertContrast('More icon', contrastState.more.ratio, 3);
  assertContrast('Notification icon', contrastState.notif.ratio, 3);

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

  await page.selectOption('#example-sel', 'load-balanced');
  await page.locator('.a-node .node-tool-name').first().waitFor({ state: 'visible', timeout: 5000 });
  const exportDir = await mkdtemp(join(tmpdir(), 'archiflow-smoke-export-'));

  const svgDownloadPromise = page.waitForEvent('download', { timeout: 8000 });
  await page.evaluate(() => document.getElementById('btn-export-svg').click());
  const svgDownload = await svgDownloadPromise;
  const svgPath = join(exportDir, svgDownload.suggestedFilename());
  await svgDownload.saveAs(svgPath);
  const svgText = await readFile(svgPath, 'utf8');
  assert.match(svgText, /<foreignObject/, 'SVG export should use live HTML node tiles');
  assert.match(svgText, /node-tool-name/, 'SVG export should include visible tool chips');
  assert.doesNotMatch(svgText, /<circle cx="32" cy="44" r="8"/, 'SVG export should not use old generic placeholder icons');

  const pngDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.evaluate(() => document.getElementById('btn-export-png').click());
  const pngDownload = await pngDownloadPromise;
  const pngPath = join(exportDir, pngDownload.suggestedFilename());
  await pngDownload.saveAs(pngPath);
  const pngInfo = await stat(pngPath);
  assert.ok(pngInfo.size > 20000, 'PNG export should produce a non-empty rendered image');

  assert.deepEqual(consoleErrors, []);

  console.log('Browser smoke passed: grid, theme, share popup, login theme token, PDF export, and image exports are working.');
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
