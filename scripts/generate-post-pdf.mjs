/**
 * Generates a polished LinkedIn-ready PDF from post/images/
 * Output: post/archi-flow-linkedin-post.pdf
 */
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const postDir = fileURLToPath(new URL('../post/', import.meta.url));

const toBase64 = async (file) => {
  const buf = await readFile(file);
  return 'data:image/png;base64,' + buf.toString('base64');
};

const imgs = {
  img1: await toBase64(path.join(postDir, 'images/01-architecture-diagram.png')),
  img2: await toBase64(path.join(postDir, 'images/02-simulation-running.png')),
  img3: await toBase64(path.join(postDir, 'images/03-1m-users-overloaded.png')),
  img4: await toBase64(path.join(postDir, 'images/04-autoscaling-recovery.png')),
  img5: await toBase64(path.join(postDir, 'images/05-microservices-sim.png')),
  img6: await toBase64(path.join(postDir, 'images/06-cdc-kafka-pipeline.png')),
};

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#080d14; color:#eaf0fb; }

  /* ── Cover Page ── */
  .cover {
    width:210mm; height:297mm;
    background: linear-gradient(135deg, #080d14 0%, #0e1a2e 50%, #111827 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    page-break-after:always; position:relative; overflow:hidden;
    padding: 40px;
  }
  .cover::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(79,156,249,0.12) 0%, transparent 70%);
  }
  .cover-logo { display:flex; align-items:center; gap:14px; margin-bottom:48px; z-index:1; }
  .cover-logo svg { filter: drop-shadow(0 0 20px rgba(79,156,249,0.5)); }
  .cover-brand { font-size:38px; font-weight:800; letter-spacing:-0.03em;
    background:linear-gradient(90deg,#f0f6ff,#a0c4ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .cover-tagline { font-size:16px; color:#6b8aad; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; z-index:1; margin-bottom:64px; }
  .cover-headline { font-size:36px; font-weight:900; line-height:1.2; text-align:center; z-index:1; margin-bottom:24px;
    background:linear-gradient(135deg,#ffffff,#c8d8f0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .cover-sub { font-size:15px; color:#8aa4c8; text-align:center; line-height:1.7; z-index:1; max-width:480px; margin-bottom:56px; }
  .cover-stats { display:flex; gap:40px; z-index:1; margin-bottom:56px; }
  .stat { text-align:center; }
  .stat-num { font-size:32px; font-weight:900; color:#4f9cf9; letter-spacing:-0.03em; }
  .stat-label { font-size:11px; color:#6b8aad; text-transform:uppercase; letter-spacing:0.1em; margin-top:4px; }
  .cover-url { font-size:14px; color:#4f9cf9; text-decoration:none; z-index:1; border:1px solid rgba(79,156,249,0.3);
    padding:10px 28px; border-radius:24px; background:rgba(79,156,249,0.08); }
  .cover-chips { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; z-index:1; margin-bottom:40px; }
  .chip { font-size:11px; padding:5px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);
    color:#8aa4c8; background:rgba(255,255,255,0.04); font-weight:500; }

  /* ── Content Pages ── */
  .page {
    width:210mm; min-height:297mm;
    background: linear-gradient(180deg, #080d14 0%, #0a1120 100%);
    padding:40px; page-break-after:always; position:relative;
  }
  .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
  .page-num { font-size:11px; color:#3d5a80; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; }
  .page-brand { font-size:12px; color:#3d5a80; font-weight:600; }
  .slide-num { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#1e3a5f,#2d5986);
    display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:#4f9cf9; flex-shrink:0; }
  .slide-title { font-size:22px; font-weight:800; color:#eaf0fb; margin-bottom:8px; line-height:1.25; }
  .slide-desc { font-size:13px; color:#8aa4c8; line-height:1.65; margin-bottom:20px; }
  .img-wrap { border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.07);
    box-shadow:0 8px 40px rgba(0,0,0,0.5); margin-bottom:20px; }
  .img-wrap img { width:100%; display:block; }
  .caption { font-size:11.5px; color:#4f9cf9; font-weight:600; text-transform:uppercase; letter-spacing:0.08em;
    display:flex; align-items:center; gap:8px; }
  .caption::before { content:''; width:24px; height:2px; background:#4f9cf9; border-radius:2px; }
  .badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
  .badge-green  { background:rgba(52,208,88,0.12);  border:1px solid rgba(52,208,88,0.3);  color:#34d058; }
  .badge-red    { background:rgba(248,81,73,0.12);  border:1px solid rgba(248,81,73,0.3);  color:#f85149; }
  .badge-blue   { background:rgba(79,156,249,0.12); border:1px solid rgba(79,156,249,0.3); color:#4f9cf9; }
  .badge-purple { background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa; }
  .badge-yellow { background:rgba(245,183,49,0.12); border:1px solid rgba(245,183,49,0.3); color:#f5b731; }
  .badges { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }

  /* ── Final CTA Page ── */
  .cta-page {
    width:210mm; min-height:297mm;
    background: linear-gradient(135deg, #080d14 0%, #0a1020 60%, #0d1528 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:50px; text-align:center; position:relative; overflow:hidden;
  }
  .cta-page::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(167,139,250,0.1) 0%, transparent 70%);
  }
  .cta-eyebrow { font-size:11px; color:#7c5af6; text-transform:uppercase; letter-spacing:0.15em; font-weight:700; z-index:1; margin-bottom:20px; }
  .cta-title { font-size:34px; font-weight:900; line-height:1.2; z-index:1; margin-bottom:20px;
    background:linear-gradient(135deg,#ffffff,#c8d8f0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .cta-sub { font-size:15px; color:#8aa4c8; line-height:1.7; z-index:1; max-width:440px; margin-bottom:40px; }
  .cta-url { font-size:18px; font-weight:700; color:#4f9cf9; z-index:1; margin-bottom:40px;
    border:1px solid rgba(79,156,249,0.4); padding:14px 36px; border-radius:32px; background:rgba(79,156,249,0.08); }
  .cta-hashtags { font-size:12px; color:#3d5a80; z-index:1; line-height:2; }
  .features { display:grid; grid-template-columns:1fr 1fr; gap:16px; z-index:1; margin-bottom:40px; width:100%; max-width:460px; }
  .feature { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:16px; text-align:left; }
  .feature-icon { font-size:20px; margin-bottom:8px; }
  .feature-title { font-size:13px; font-weight:700; color:#eaf0fb; margin-bottom:4px; }
  .feature-desc { font-size:11px; color:#6b8aad; line-height:1.5; }
</style>
</head>
<body>

<!-- ════════════════════ COVER PAGE ════════════════════ -->
<div class="cover">
  <div class="cover-logo">
    <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="3" fill="#4f9cf9" opacity="0.9"/>
      <rect x="16" y="2" width="10" height="10" rx="3" fill="#a78bfa" opacity="0.8"/>
      <rect x="16" y="16" width="10" height="10" rx="3" fill="#34d058" opacity="0.8"/>
      <rect x="2" y="16" width="10" height="10" rx="3" fill="#f5b731" opacity="0.8"/>
    </svg>
    <span class="cover-brand">Archi-Flow</span>
  </div>
  <div class="cover-tagline">Live Architecture Simulator</div>
  <div class="cover-headline">What happens when<br/>1,000,000 users hit<br/>your system at once?</div>
  <div class="cover-sub">Most engineers find out at 3 AM. I built a free tool so you can find out at 3 PM — before it ever reaches production.</div>
  <div class="cover-stats">
    <div class="stat"><div class="stat-num">28</div><div class="stat-label">Components</div></div>
    <div class="stat"><div class="stat-num">1M+</div><div class="stat-label">Users/sec sim</div></div>
    <div class="stat"><div class="stat-num">100%</div><div class="stat-label">Free</div></div>
    <div class="stat"><div class="stat-num">P2P</div><div class="stat-label">Collab</div></div>
  </div>
  <div class="cover-chips">
    <span class="chip">No login</span>
    <span class="chip">No install</span>
    <span class="chip">Runs in browser</span>
    <span class="chip">Real-time collab</span>
    <span class="chip">Open source</span>
  </div>
  <a class="cover-url">archi-flow.netlify.app</a>
</div>

<!-- ════════════════════ SLIDE 1: Architecture ════════════════════ -->
<div class="page">
  <div class="page-header"><span class="page-num">Slide 1 of 5</span><span class="page-brand">Archi-Flow</span></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <div class="slide-num">1</div>
    <div>
      <div class="slide-title">Design any cloud architecture</div>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-blue">28 components</span>
    <span class="badge badge-purple">Drag & drop</span>
    <span class="badge badge-blue">AWS / GCP style</span>
  </div>
  <div class="slide-desc">Drag Load Balancers, Kafka, Redis, Flink, RDS, CDN and more onto the canvas. Connect them like a real system. The Mobile Event Streaming example below shows a full billion-scale data pipeline — built in minutes.</div>
  <div class="img-wrap"><img src="${imgs.img1}"/></div>
  <div class="caption">Mobile Event Streaming — 11 nodes, 9 edges, $2,393/mo estimated</div>
</div>

<!-- ════════════════════ SLIDE 2: Sim Running ════════════════════ -->
<div class="page">
  <div class="page-header"><span class="page-num">Slide 2 of 5</span><span class="page-brand">Archi-Flow</span></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <div class="slide-num">2</div>
    <div>
      <div class="slide-title">Hit Run Sim — watch traffic flow live</div>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-green">Healthy</span>
    <span class="badge badge-blue">Live particles</span>
    <span class="badge badge-blue">5,000 users/sec</span>
  </div>
  <div class="slide-desc">Click Run Sim. Particles flow along every edge — you can see exactly how traffic moves through your system. Green nodes are healthy. This is your architecture breathing.</div>
  <div class="img-wrap"><img src="${imgs.img2}"/></div>
  <div class="caption">Simulation running — live traffic particles, all nodes healthy at 5K users</div>
</div>

<!-- ════════════════════ SLIDE 3: 1M Overload ════════════════════ -->
<div class="page">
  <div class="page-header"><span class="page-num">Slide 3 of 5</span><span class="page-brand">Archi-Flow</span></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <div class="slide-num">3</div>
    <div>
      <div class="slide-title">Crank to 1,000,000 users/sec</div>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-red">Critical load</span>
    <span class="badge badge-yellow">Bottlenecks found</span>
    <span class="badge badge-red">1M users/sec</span>
  </div>
  <div class="slide-desc">Drag the users slider to 1,000,000. Watch nodes turn yellow, then red. The simulation shows you exactly which component breaks first — before it ever reaches your users at 3 AM.</div>
  <div class="img-wrap"><img src="${imgs.img3}"/></div>
  <div class="caption">1M users/sec — bottlenecks exposed, critical nodes highlighted in red</div>
</div>

<!-- ════════════════════ SLIDE 4: Autoscaling ════════════════════ -->
<div class="page">
  <div class="page-header"><span class="page-num">Slide 4 of 5</span><span class="page-brand">Archi-Flow</span></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <div class="slide-num">4</div>
    <div>
      <div class="slide-title">Enable Auto Scaling — watch it recover</div>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-green">Auto-scaled</span>
    <span class="badge badge-green">Stable at 1M</span>
    <span class="badge badge-purple">Replicas scaling</span>
  </div>
  <div class="slide-desc">Add an Auto Scaler node and connect it to the bottleneck. Now at 1M users — the system automatically spins up replicas. The node goes green. Crisis averted. This is the difference between a 3 AM incident and a boring Tuesday.</div>
  <div class="img-wrap"><img src="${imgs.img4}"/></div>
  <div class="caption">Auto Scaler active — app server scales to meet 1M users, system stabilises</div>
</div>

<!-- ════════════════════ SLIDE 5: Microservices ════════════════════ -->
<div class="page">
  <div class="page-header"><span class="page-num">Slide 5 of 5</span><span class="page-brand">Archi-Flow</span></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <div class="slide-num">5</div>
    <div>
      <div class="slide-title">Any architecture. Any complexity.</div>
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-purple">Microservices</span>
    <span class="badge badge-blue">CDC Pipeline</span>
    <span class="badge badge-blue">Real-time collab</span>
  </div>
  <div class="slide-desc">From simple 3-tier web apps to full Kafka/Flink/Lakehouse pipelines — 7 built-in examples, 28 components. Share a live collab link and design together in real-time. Free. No account needed.</div>
  <div class="img-wrap"><img src="${imgs.img5}"/></div>
  <div class="caption">Microservices at 50K users — API Gateway routing to independent services</div>
</div>

<!-- ════════════════════ CTA PAGE ════════════════════ -->
<div class="cta-page">
  <div class="cta-eyebrow">Try it free — no account needed</div>
  <div class="cta-title">Your architecture<br/>shouldn't break<br/>in production first.</div>
  <div class="cta-sub">Archi-Flow lets you simulate, stress-test and collaborate on your system design — entirely in the browser, completely free.</div>
  <div class="features">
    <div class="feature"><div class="feature-icon">🏗️</div><div class="feature-title">28 Components</div><div class="feature-desc">Load balancers, Kafka, Redis, Flink, CDN and more</div></div>
    <div class="feature"><div class="feature-icon">⚡</div><div class="feature-title">Live Simulation</div><div class="feature-desc">Real traffic particles, load %, capacity warnings</div></div>
    <div class="feature"><div class="feature-icon">📈</div><div class="feature-title">Auto Scaling</div><div class="feature-desc">Watch replicas spin up under load in real-time</div></div>
    <div class="feature"><div class="feature-icon">👥</div><div class="feature-title">P2P Collab</div><div class="feature-desc">Share a link — no server, no account, always free</div></div>
  </div>
  <div class="cta-url">archi-flow.netlify.app</div>
  <div class="cta-hashtags">#SystemDesign &nbsp;·&nbsp; #SoftwareArchitecture &nbsp;·&nbsp; #BuildInPublic &nbsp;·&nbsp; #AWS &nbsp;·&nbsp; #Kafka &nbsp;·&nbsp; #OpenSource</div>
</div>

</body>
</html>`;

const htmlPath = path.join(postDir, '_post.html');
await writeFile(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

const pdfPath = path.join(postDir, 'archi-flow-linkedin-post.pdf');
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();

// Clean up temp html
await import('node:fs/promises').then(fs => fs.unlink(htmlPath).catch(() => {}));

console.log('✅ PDF saved:', pdfPath);
