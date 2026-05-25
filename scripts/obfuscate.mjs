/**
 * Standalone JS obfuscation step.
 * Called from build-static.mjs after Terser minification.
 *
 * Usage:  node scripts/obfuscate.mjs <input.js> <output.js>
 */
import { readFile, writeFile } from 'node:fs/promises';
import pkg from 'javascript-obfuscator';
const { obfuscate } = pkg;

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node obfuscate.mjs <input.js> <output.js>');
  process.exit(1);
}

const src    = await readFile(inputPath, 'utf8');
const result = obfuscate(src, {
  compact: true,

  // ── Identifier renaming ────────────────────────────────────────────────
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,      // keep window.addNode / window.setNodeProp etc. intact

  // ── String array encoding ──────────────────────────────────────────────
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 10,

  // ── Control flow ──────────────────────────────────────────────────────
  // Keep off — control-flow flattening adds significant size and can break
  // ES-module top-level await patterns.
  controlFlowFlattening: false,
  deadCodeInjection: false,

  // ── Anti-tamper / debug ────────────────────────────────────────────────
  // selfDefending uses eval-like constructs that some CSP configs block.
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,

  unicodeEscapeSequence: false,
  target: 'browser',
});

await writeFile(outputPath, result.getObfuscatedCode(), 'utf8');
console.log(`  ✓ Obfuscated → ${outputPath}`);
