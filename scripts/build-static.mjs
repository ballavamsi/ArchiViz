import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

const outDir = new URL('../dist/', import.meta.url);
const root   = new URL('../',     import.meta.url);

await rm(outDir,   { recursive: true, force: true });
await mkdir(outDir,{ recursive: true });

// ── Copy static assets ────────────────────────────────────────────
const dirs = ['src'];
for (const dir of dirs) {
  await cp(new URL(dir, root), new URL(dir, outDir), { recursive: true });
}
await cp(new URL('README.md', root), new URL('README.md', outDir));

// ── Inject runtime env vars into index.html ───────────────────────
// Netlify exposes SUPABASE_URL and SUPABASE_ANON_KEY as build env vars.
// We embed them as a small window.__ENV__ shim so the static file can
// use them without a server or API route.
const supabaseUrl     = process.env.SUPABASE_URL     || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let html = await readFile(new URL('index.html', root), 'utf8');

const envScript = `<script>
window.__ENV__ = {
  SUPABASE_URL:      ${JSON.stringify(supabaseUrl)},
  SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)},
};
</script>`;

// Insert right after <head> so it's available before any other script
html = html.replace('<head>', `<head>\n${envScript}`);

await writeFile(new URL('index.html', outDir), html, 'utf8');

console.log('Static site built to dist/');
if (!supabaseUrl)     console.warn('⚠  SUPABASE_URL not set — short links disabled');
if (!supabaseAnonKey) console.warn('⚠  SUPABASE_ANON_KEY not set — short links disabled');
