/**
 * LinkedIn carousel PDF — square 1080×1080px slides
 * Bold, mobile-readable, one idea per slide
 */
import { chromium } from 'playwright';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const postDir = fileURLToPath(new URL('../post/', import.meta.url));
const toB64 = async f => 'data:image/png;base64,' + (await readFile(f)).toString('base64');

const i1 = await toB64(path.join(postDir, 'images/01-architecture-diagram.png'));
const i2 = await toB64(path.join(postDir, 'images/02-simulation-running.png'));
const i3 = await toB64(path.join(postDir, 'images/03-1m-users-overloaded.png'));
const i4 = await toB64(path.join(postDir, 'images/04-autoscaling-recovery.png'));
const i5 = await toB64(path.join(postDir, 'images/05-microservices-sim.png'));

// Each slide is 1080×1080px (printed at 96dpi ≈ 285.75mm square)
// We'll use a viewport of 1080×1080 and print each page as a square
const S = 1080;

const slide = (bg, content) => `
<div class="slide" style="background:${bg}">
  ${content}
</div>`;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; -webkit-font-smoothing:antialiased; }
  body { font-family:'Inter',sans-serif; }

  .slide {
    width:${S}px; height:${S}px;
    position:relative; overflow:hidden;
    display:flex; flex-direction:column;
    page-break-after: always;
  }

  /* ── shared ── */
  .brand {
    position:absolute; top:36px; left:48px;
    display:flex; align-items:center; gap:10px;
    font-size:18px; font-weight:800; letter-spacing:-0.02em; color:#fff; opacity:0.7;
    z-index:10;
  }
  .brand svg { opacity:0.9; }
  .page-dot {
    position:absolute; bottom:36px; right:48px;
    font-size:15px; font-weight:600; color:rgba(255,255,255,0.35);
    z-index:10;
  }
  .swipe-hint {
    position:absolute; bottom:36px; left:48px;
    font-size:13px; color:rgba(255,255,255,0.35); font-weight:500;
    z-index:10;
  }

  /* ── SLIDE 1 — Cover ── */
  .cover-glow {
    position:absolute; width:700px; height:700px; border-radius:50%;
    background:radial-gradient(circle, rgba(79,156,249,0.25) 0%, transparent 65%);
    top:-100px; right:-100px;
  }
  .cover-glow2 {
    position:absolute; width:500px; height:500px; border-radius:50%;
    background:radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 65%);
    bottom:-80px; left:-80px;
  }
  .cover-inner {
    position:relative; z-index:2;
    display:flex; flex-direction:column;
    justify-content:center; height:100%; padding:80px 72px;
  }
  .cover-eyebrow {
    font-size:15px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.14em; color:#4f9cf9; margin-bottom:28px;
  }
  .cover-h1 {
    font-size:72px; font-weight:900; line-height:1.05; letter-spacing:-0.04em;
    color:#fff; margin-bottom:28px;
  }
  .cover-h1 span { color:#4f9cf9; }
  .cover-sub {
    font-size:20px; color:rgba(255,255,255,0.6); line-height:1.6;
    max-width:520px; margin-bottom:52px; font-weight:400;
  }
  .cover-cta {
    display:inline-flex; align-items:center; gap:10px;
    background:linear-gradient(135deg,#4f9cf9,#7c5af6);
    color:#fff; font-size:17px; font-weight:700;
    padding:16px 32px; border-radius:50px;
    letter-spacing:-0.01em; width:fit-content;
  }
  .cover-stats {
    position:absolute; bottom:80px; right:72px; z-index:2;
    display:flex; flex-direction:column; gap:20px; text-align:right;
  }
  .cs-num { font-size:36px; font-weight:900; color:#fff; line-height:1; letter-spacing:-0.03em; }
  .cs-label { font-size:12px; color:rgba(255,255,255,0.4); font-weight:600;
    text-transform:uppercase; letter-spacing:0.1em; }

  /* ── SLIDE 2 — Problem ── */
  .p2-inner {
    display:flex; flex-direction:column; justify-content:center;
    height:100%; padding:80px 72px; position:relative; z-index:2;
  }
  .big-num {
    font-size:160px; font-weight:900; line-height:1; letter-spacing:-0.06em;
    color:rgba(248,81,73,0.15); position:absolute; top:40px; right:40px;
  }
  .p2-label {
    font-size:14px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.14em; color:#f85149; margin-bottom:24px;
  }
  .p2-h { font-size:62px; font-weight:900; line-height:1.1;
    letter-spacing:-0.04em; color:#fff; margin-bottom:28px; }
  .p2-h em { font-style:italic; color:#f5b731; }
  .p2-body { font-size:19px; color:rgba(255,255,255,0.6); line-height:1.65; max-width:520px; }
  .p2-body strong { color:#fff; font-weight:700; }

  /* ── SLIDE 3 — What it does ── */
  .p3-inner {
    display:flex; flex-direction:column; justify-content:center;
    height:100%; padding:72px; position:relative; z-index:2;
  }
  .p3-label {
    font-size:14px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.14em; color:#34d058; margin-bottom:24px;
  }
  .p3-h { font-size:54px; font-weight:900; line-height:1.1;
    letter-spacing:-0.04em; color:#fff; margin-bottom:40px; }
  .steps { display:flex; flex-direction:column; gap:20px; }
  .step { display:flex; align-items:flex-start; gap:20px; }
  .step-num {
    width:40px; height:40px; border-radius:12px; flex-shrink:0;
    background:linear-gradient(135deg,#1e3a5f,#2d5986);
    display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:800; color:#4f9cf9;
  }
  .step-text { font-size:18px; color:rgba(255,255,255,0.75); line-height:1.45; padding-top:8px; }
  .step-text strong { color:#fff; font-weight:700; }

  /* ── SLIDE 4, 5, 6 — Screenshots ── */
  .ss-inner {
    display:flex; flex-direction:column;
    height:100%; padding:56px 56px 0; position:relative; z-index:2;
  }
  .ss-tag {
    font-size:13px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.14em; margin-bottom:14px;
  }
  .ss-h {
    font-size:44px; font-weight:900; line-height:1.1;
    letter-spacing:-0.03em; color:#fff; margin-bottom:12px;
  }
  .ss-sub {
    font-size:16px; color:rgba(255,255,255,0.55); line-height:1.5;
    margin-bottom:28px; max-width:680px;
  }
  .ss-img {
    flex:1; border-radius:16px 16px 0 0; overflow:hidden;
    border:1px solid rgba(255,255,255,0.08); border-bottom:none;
    box-shadow:0 -8px 40px rgba(0,0,0,0.5);
  }
  .ss-img img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }

  /* ── SLIDE 7 — CTA ── */
  .cta-glow {
    position:absolute; width:800px; height:800px; border-radius:50%;
    background:radial-gradient(circle, rgba(124,90,246,0.2) 0%, transparent 65%);
    top:50%; left:50%; transform:translate(-50%,-50%);
  }
  .cta-inner {
    position:relative; z-index:2;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    height:100%; padding:80px 72px; text-align:center;
  }
  .cta-label {
    font-size:14px; font-weight:700; text-transform:uppercase;
    letter-spacing:0.14em; color:#a78bfa; margin-bottom:24px;
  }
  .cta-h { font-size:58px; font-weight:900; line-height:1.1;
    letter-spacing:-0.04em; color:#fff; margin-bottom:20px; }
  .cta-h span { color:#a78bfa; }
  .cta-sub { font-size:18px; color:rgba(255,255,255,0.55); line-height:1.6;
    max-width:520px; margin-bottom:48px; }
  .cta-btn {
    background:linear-gradient(135deg,#7c5af6,#4f9cf9);
    color:#fff; font-size:20px; font-weight:800;
    padding:20px 52px; border-radius:50px;
    letter-spacing:-0.01em; margin-bottom:32px;
  }
  .cta-tags { font-size:13px; color:rgba(255,255,255,0.3); line-height:2.2; }
</style>
</head>
<body>

<!-- ═══ SLIDE 1 — COVER ═══ -->
${slide('linear-gradient(135deg,#06090f 0%,#0d1828 60%,#111827 100%)', `
  <div class="cover-glow"></div>
  <div class="cover-glow2"></div>
  <div class="brand">
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="3" fill="#4f9cf9"/>
      <rect x="16" y="2" width="10" height="10" rx="3" fill="#a78bfa"/>
      <rect x="16" y="16" width="10" height="10" rx="3" fill="#34d058"/>
      <rect x="2" y="16" width="10" height="10" rx="3" fill="#f5b731"/>
    </svg>
    Archi-Flow
  </div>
  <div class="cover-inner">
    <div class="cover-eyebrow">Free · No login · Runs in browser</div>
    <div class="cover-h1">Simulate<br/><span>1M users</span><br/>hitting your<br/>architecture.</div>
    <div class="cover-sub">Before it happens in production at 3 AM.</div>
    <div class="cover-cta">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Swipe to see how →
    </div>
  </div>
  <div class="cover-stats">
    <div><div class="cs-num">28</div><div class="cs-label">Components</div></div>
    <div><div class="cs-num">Free</div><div class="cs-label">Always</div></div>
    <div><div class="cs-num">P2P</div><div class="cs-label">Real-time collab</div></div>
  </div>
  <div class="page-dot">1 / 7</div>
`)}

<!-- ═══ SLIDE 2 — THE PROBLEM ═══ -->
${slide('linear-gradient(135deg,#0d0608 0%,#1a0a0a 60%,#160c10 100%)', `
  <div class="big-num">3AM</div>
  <div class="p2-inner">
    <div class="p2-label">The problem</div>
    <div class="p2-h">You find out<br/>your system<br/>breaks <em>live.</em></div>
    <div class="p2-body">
      50,000 users hit checkout.<br/>
      <strong>App server melted. Revenue gone. Sleep gone.</strong><br/><br/>
      Most engineers discover architectural flaws at 3 AM in production.<br/>
      There's a better way.
    </div>
  </div>
  <div class="swipe-hint">Keep swiping →</div>
  <div class="page-dot">2 / 7</div>
`)}

<!-- ═══ SLIDE 3 — HOW IT WORKS ═══ -->
${slide('linear-gradient(135deg,#060d14 0%,#0a1828 100%)', `
  <div class="p3-inner">
    <div class="p3-label">The solution</div>
    <div class="p3-h">Design. Simulate.<br/>Fix. Ship.</div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text"><strong>Drag components</strong> onto the canvas — Load Balancer, Kafka, Redis, RDS, CDN…</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text"><strong>Hit Run Sim</strong> — watch live traffic particles flow through your architecture</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text"><strong>Crank the load</strong> — watch which nodes turn yellow, then red</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-text"><strong>Fix it now</strong> — enable Auto Scaling, add replicas, rebalance — before production</div>
      </div>
    </div>
  </div>
  <div class="page-dot">3 / 7</div>
`)}

<!-- ═══ SLIDE 4 — DIAGRAM ═══ -->
${slide('linear-gradient(180deg,#060d14 0%,#080f1a 100%)', `
  <div class="ss-inner">
    <div class="ss-tag" style="color:#4f9cf9">Step 1</div>
    <div class="ss-h">Build your architecture</div>
    <div class="ss-sub">Drag, drop, connect. 28 components. Any topology.</div>
    <div class="ss-img"><img src="${i1}"/></div>
  </div>
  <div class="page-dot">4 / 7</div>
`)}

<!-- ═══ SLIDE 5 — OVERLOADED ═══ -->
${slide('linear-gradient(180deg,#0d0608 0%,#130a0c 100%)', `
  <div class="ss-inner">
    <div class="ss-tag" style="color:#f85149">Step 2</div>
    <div class="ss-h">Crank the load.<br/>Watch it break.</div>
    <div class="ss-sub">Bottlenecks turn red instantly — no guessing, no 3 AM surprises.</div>
    <div class="ss-img"><img src="${i3}"/></div>
  </div>
  <div class="page-dot">5 / 7</div>
`)}

<!-- ═══ SLIDE 6 — AUTOSCALING ═══ -->
${slide('linear-gradient(180deg,#060d0a 0%,#081410 100%)', `
  <div class="ss-inner">
    <div class="ss-tag" style="color:#34d058">Step 3</div>
    <div class="ss-h">Enable Auto Scaling.<br/>Back to green.</div>
    <div class="ss-sub">Replicas spin up in real-time. Crisis averted — before it ever reaches users.</div>
    <div class="ss-img"><img src="${i4}"/></div>
  </div>
  <div class="page-dot">6 / 7</div>
`)}

<!-- ═══ SLIDE 7 — CTA ═══ -->
${slide('linear-gradient(135deg,#07060f 0%,#0e0c1e 60%,#110c20 100%)', `
  <div class="cta-glow"></div>
  <div class="cta-inner">
    <div class="cta-label">Try it free — right now</div>
    <div class="cta-h">Stop guessing.<br/>Start <span>simulating.</span></div>
    <div class="cta-sub">No login. No install. No credit card.<br/>Just open the browser and build.</div>
    <div class="cta-btn">archi-flow.netlify.app</div>
    <div class="cta-tags">
      #SystemDesign &nbsp;·&nbsp; #SoftwareArchitecture &nbsp;·&nbsp; #BuildInPublic<br/>
      #AWS &nbsp;·&nbsp; #Kafka &nbsp;·&nbsp; #OpenSource &nbsp;·&nbsp; #Engineering
    </div>
  </div>
  <div class="page-dot">7 / 7</div>
`)}

</body>
</html>`;

const htmlPath = path.join(postDir, '_post.html');
await writeFile(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: S, height: S });
await page.goto('file://' + htmlPath);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

const pdfPath = path.join(postDir, 'archi-flow-linkedin-post.pdf');
await page.pdf({
  path: pdfPath,
  width: `${S}px`,
  height: `${S}px`,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
await unlink(htmlPath).catch(() => {});
console.log('✅ PDF saved:', pdfPath);
