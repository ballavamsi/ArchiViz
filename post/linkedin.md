# LinkedIn Post — Archi-Flow Launch

---

## Post (Option A — Story-first, ~1200 chars)

I've been in too many architecture review meetings where someone says "it's hard to explain" — and then spends 10 minutes drawing boxes and arrows on a whiteboard that nobody photographs.

So I built something. 👇

**Archi-Flow** is a browser-based architecture diagramming tool that simulates **live traffic** as you design.

You drag components (Load Balancer, App Server, Database, CDN, Queue…), connect them, then hit ▶ **Run Simulation** — and watch real-time events/sec flow through your diagram. Components turn yellow when load hits 60%, red when they're overwhelmed, and auto-scalers kick in dynamically.

**Why I built it:**
→ Architecture diagrams are usually static. They show *what* you built, not *how it behaves under load*.
→ Most tools require accounts, installs, or subscriptions just to sketch an idea.
→ I wanted something I could open in 2 seconds, draw a system, and immediately ask: "where does this break?"

**What it does:**
✅ Live traffic simulation — see bottlenecks in real-time
✅ Auto-scaling visualization — watch replicas spin up
✅ Export / share diagrams as JSON
✅ 20+ components: microservices, databases, queues, CDNs, caches
✅ Zero install. No login. Runs 100% in the browser.

Try it here 👉 [https://ballavamsi.github.io/ArchiViz/](https://ballavamsi.github.io/ArchiViz/)

Would love your feedback — what component or feature would make this useful in your day-to-day?

#SystemDesign #SoftwareArchitecture #WebDev #OpenSource #JavaScript #SideProject

---

## Post (Option B — Short punchy, ~600 chars)

What if your architecture diagram could *show* you where it breaks — before you ship?

I built **Archi-Flow**: a live architecture simulator you can open right now, no login needed.

Design your system → hit Play → watch traffic flow in real time. Components light up green, yellow, red based on load. Auto-scalers kick in. Bottlenecks become obvious in seconds.

Perfect for:
• System design prep / interviews
• Architecture reviews
• Explaining microservices to stakeholders

🔗 Try it: [https://ballavamsi.github.io/ArchiViz/](https://ballavamsi.github.io/ArchiViz/)

Open source | Zero install | 100% browser

What would you add? Drop a comment 👇

#SystemDesign #Architecture #OpenSource #SideProject

---

## Suggested images / screenshots to attach
- Animated GIF of running the simulation (traffic flowing, nodes turning red)
- Screenshot of a complex diagram (microservices + DB + cache + queue)
- Side-by-side: zoomed-out view vs. zoomed-in inspection view

---

## Metrics & Analytics Setup

### Option 1: Google Analytics 4 (free, full featured)
Add this to `<head>` in `index.html`:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX'); // Replace with your Measurement ID
</script>
```
Replace `G-XXXXXXXXXX` with your GA4 Measurement ID from [analytics.google.com](https://analytics.google.com).

Track custom events (simulations run, diagrams shared, etc.):
```js
// Add these anywhere in your JS where actions happen
gtag('event', 'simulation_started');
gtag('event', 'diagram_shared');
gtag('event', 'example_loaded', { example_name: name });
```

### Option 2: Plausible (privacy-first, simpler, $9/mo or self-host)
```html
<script defer data-domain="ballavamsi.github.io" src="https://plausible.io/js/script.js"></script>
```

### Option 3: Umami (open source, self-hostable, free on Vercel/Railway)
```html
<script async src="https://analytics.umami.is/script.js" data-website-id="YOUR-UUID"></script>
```

### GitHub Traffic
GitHub automatically shows you:
- Unique visitors per day/week
- Clone counts
- Referring sites

Check: `github.com/ballavamsi/ArchiViz` → **Insights** → **Traffic**

### What to track
| Event | Why |
|---|---|
| Page views | Total reach |
| Simulation started | Core engagement |
| Diagram shared (JSON exported) | High-value usage |
| Example loaded | Onboarding flow |
| Node added | Feature adoption |
| Time on page | Depth of engagement |
