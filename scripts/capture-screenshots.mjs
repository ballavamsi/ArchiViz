import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../post/images/', import.meta.url));
await mkdir(outDir, { recursive: true });

const SITE_URL = 'https://archi-flow.netlify.app';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 900 });

const shot = async (name) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('✅', name);
};

const loadExample = async (id) => {
  await page.selectOption('#example-sel', id);
  await page.waitForTimeout(1500);
  await page.click('#btn-fit');
  await page.waitForTimeout(500);
};

const setUsers = async (n) => {
  await page.fill('#users-input', String(n));
  await page.dispatchEvent('#users-input', 'change');
  await page.waitForTimeout(1200);
};

await page.goto(SITE_URL);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

// ── Image 1: Clean mobile-events architecture ─────────────────────────
await loadExample('mobile-events');
await shot('01-architecture-diagram.png');

// ── Image 2: Simulation running — healthy green state ─────────────────
await setUsers(5000);
await page.click('#btn-sim');
await page.waitForTimeout(3000);
await shot('02-simulation-running.png');

// ── Image 3: 1M users — nodes on fire (red) ───────────────────────────
await setUsers(1000000);
await page.waitForTimeout(4000);
await shot('03-1m-users-overloaded.png');

// ── Image 4: Autoscale example at 1M users — stable ───────────────────
await page.click('#btn-sim'); // stop
await page.waitForTimeout(500);
await loadExample('auto-scaled');
await page.click('#btn-sim'); // start
await setUsers(1000000);
await page.waitForTimeout(4000);
await shot('04-autoscaling-recovery.png');

// ── Image 5: Microservices at medium load ─────────────────────────────
await page.click('#btn-sim');
await page.waitForTimeout(500);
await loadExample('microservices');
await page.click('#btn-sim');
await setUsers(50000);
await page.waitForTimeout(3000);
await shot('05-microservices-sim.png');

// ── Image 6: CDC streaming — the big Kafka pipeline ───────────────────
await page.click('#btn-sim');
await page.waitForTimeout(500);
await loadExample('cdc-streaming');
await page.click('#btn-sim');
await setUsers(200000);
await page.waitForTimeout(3000);
await shot('06-cdc-kafka-pipeline.png');

await browser.close();
console.log('\n🎉 All images saved to post/images/');
