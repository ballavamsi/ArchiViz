import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const outDir = new URL('../dist/', import.meta.url);
const root   = new URL('../',     import.meta.url);
const outPath = fileURLToPath(outDir);
const rootPath = fileURLToPath(root);

await rm(outDir,   { recursive: true, force: true });
await mkdir(outDir,{ recursive: true });
await mkdir(new URL('src/', outDir), { recursive: true });

// ── Inject runtime env vars into index.html ───────────────────────────────
// Netlify exposes these as build env vars (set in Site settings → Env vars).
const supabaseUrl     = process.env.SUPABASE_URL     || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const signalingUrl    = process.env.SIGNALING_URL    || '';   // wss://your-render-app.onrender.com

let html = await readFile(new URL('index.html', root), 'utf8');

const envScript = `<script>
window.__ENV__ = {
  SUPABASE_URL:      ${JSON.stringify(supabaseUrl)},
  SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)},
  SIGNALING_URL:     ${JSON.stringify(signalingUrl)},
};
</script>`;

// Insert right after <head> so it's available before any other script
html = html.replace('<head>', `<head>\n${envScript}`);

// Point the stylesheet and script tags at the hashed/minified outputs
html = html.replace('href="src/app.css"',  'href="src/app.min.css"');
html = html.replace('src="src/app.js"',    'src="src/app.min.js"');

await writeFile(new URL('index.html', outDir), html, 'utf8');

// ── Copy src JS modules (components, examples, rules) ─────────────────────
// These are imported by app.js — copy them as-is (they're small data files)
const srcFiles = ['components.js', 'examples.js', 'rules.js'];
for (const f of srcFiles) {
  await cp(
    new URL(`src/${f}`, root),
    new URL(`src/${f}`, outDir)
  );
}

// ── Minify CSS ────────────────────────────────────────────────────────────
console.log('Minifying CSS…');
execSync(
  `npx cleancss -o "${outPath}src/app.min.css" "${rootPath}src/app.css"`,
  { stdio: 'inherit' }
);

// ── Minify JS (app.js bundles imports from ./components.js etc.) ──────────
// terser can minify ES modules with --module flag
console.log('Minifying JS…');
execSync(
  `npx terser "${rootPath}src/app.js" \
    --module \
    --compress passes=2,drop_console=false,pure_getters=true \
    --mangle \
    --output "${outPath}src/app.min.js"`,
  { stdio: 'inherit' }
);

// ── Copy README ───────────────────────────────────────────────────────────
await cp(new URL('README.md', root), new URL('README.md', outDir));

console.log('\n✅ Built to dist/');
if (!supabaseUrl)     console.warn('⚠  SUPABASE_URL not set — short links disabled');
if (!supabaseAnonKey) console.warn('⚠  SUPABASE_ANON_KEY not set — short links disabled');
if (!signalingUrl)    console.warn('⚠  SIGNALING_URL not set — collab will use unreliable public server');
