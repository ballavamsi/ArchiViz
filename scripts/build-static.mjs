import { cp, mkdir, rm } from 'node:fs/promises';

const outDir = new URL('../dist/', import.meta.url);
const root = new URL('../', import.meta.url);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const files = ['index.html', 'README.md'];
const dirs = ['src'];

for (const file of files) {
  await cp(new URL(file, root), new URL(file, outDir));
}

for (const dir of dirs) {
  await cp(new URL(dir, root), new URL(dir, outDir), { recursive: true });
}

console.log('Static site built to dist/');
