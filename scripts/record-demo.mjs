/**
 * Records a demo video of Archi-Flow:
 * Clean diagram → Run Sim → 1M users overload → Auto-scale recovery
 * Output: post/archi-flow-demo.webm (auto-converted to mp4 if ffmpeg available)
 */
import { chromium } from 'playwright';
import { mkdir, rename, access } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const postDir  = fileURLToPath(new URL('../post/', import.meta.url));
const videoDir = path.join(postDir, '_video_tmp');
await mkdir(videoDir, { recursive: true });

const SITE = 'https://archi-flow.netlify.app';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1600, height: 900 } },
});
const page = await ctx.newPage();

const wait  = (ms) => page.waitForTimeout(ms);
const users = async (n) => {
  await page.fill('#users-input', String(n));
  await page.dispatchEvent('#users-input', 'change');
};

console.log('🎬 Starting recording...');

// ── 1. Land on the app (2s) ──────────────────────────────────────────
await page.goto(SITE);
await page.waitForLoadState('networkidle');
await wait(2000);

// ── 2. Load Mobile Event Streaming example ───────────────────────────
await page.selectOption('#example-sel', 'mobile-events');
await wait(1500);
await page.click('#btn-fit');
await wait(1500);

// ── 3. Show the architecture — pan across slowly ─────────────────────
await wait(2500);

// ── 4. Start sim at 1K users — healthy green flow ────────────────────
await users(1000);
await page.selectOption('#sim-speed-sel', 'fast');
await page.click('#btn-sim');
await wait(3000);

// ── 5. Ramp to 50K — things start warming up ─────────────────────────
await users(50000);
await wait(2500);

// ── 6. Ramp to 500K — yellow/orange warnings ─────────────────────────
await users(500000);
await wait(2500);

// ── 7. Blast to 1M — full red overload 🔴 ────────────────────────────
await users(1000000);
await wait(4000);

// ── 8. Switch to auto-scaled example ─────────────────────────────────
await page.click('#btn-sim'); // stop
await wait(500);
await page.selectOption('#example-sel', 'auto-scaled');
await wait(1200);
await page.click('#btn-fit');
await wait(800);

// ── 9. Start sim at 1M — watch autoscaler kick in ────────────────────
await users(1000000);
await page.selectOption('#sim-speed-sel', 'fast');
await page.click('#btn-sim');
await wait(5000);   // let autoscaler stabilise

// ── 10. Click the autoscaler node to show properties ─────────────────
const autoscalerNode = page.locator('.arch-node').filter({ hasText: 'Auto Scaler' }).first();
await autoscalerNode.click().catch(() => {});
await wait(2500);

// ── 11. Zoom out for a final wide shot ───────────────────────────────
await page.click('#btn-fit');
await wait(3000);

console.log('⏹  Stopping recording...');
await ctx.close();
await browser.close();

// Rename the auto-named webm to a fixed name
const { readdir } = await import('node:fs/promises');
const files = await readdir(videoDir);
const webm = files.find(f => f.endsWith('.webm'));
if (webm) {
  const src = path.join(videoDir, webm);
  const dst = path.join(postDir, 'archi-flow-demo.webm');
  await rename(src, dst);
  console.log('✅ Video saved:', dst);

  // Try to convert to mp4 with ffmpeg (better LinkedIn compatibility)
  try {
    execSync(`which ffmpeg`, { stdio: 'ignore' });
    const mp4 = path.join(postDir, 'archi-flow-demo.mp4');
    execSync(`ffmpeg -y -i "${dst}" -c:v libx264 -crf 23 -preset fast -movflags +faststart "${mp4}"`, { stdio: 'inherit' });
    console.log('✅ MP4 saved:', mp4);
  } catch {
    console.log('ℹ️  ffmpeg not found — upload the .webm to LinkedIn (or convert at cloudconvert.com)');
  }
} else {
  console.error('❌ No video file found');
}

// Cleanup temp dir
await import('node:fs/promises').then(fs => fs.rm(videoDir, { recursive: true, force: true }));
