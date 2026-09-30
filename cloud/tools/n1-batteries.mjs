// Scratch (N1): print the pass/fail summary lines of the held batteries from a
// run-verifiers output directory, per zone.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
const names = ['verify-coach-prog', 'verify-coach-overlap', 'verify-coach-ready', 'verify-coach-fuel', 'verify-finish', 'verify-coach-volume', 'verify-vibe-v1', 'verify-theme-build'];
for (const z of readdirSync(dir).filter(d => !d.endsWith('.json'))) {
  console.log('== ' + z);
  for (const n of names) {
    const f = join(dir, z, n + '.mjs.log');
    if (!existsSync(f)) { console.log('  ' + n + ': (no log)'); continue; }
    const lines = readFileSync(f, 'utf8').split('\n').filter(l => /\bpassed\b|\bfailed\b|\bPASS\b|\bFAIL\b|\d+\s*\/\s*\d+/.test(l)).slice(-4);
    console.log('  ' + n + ': ' + lines.map(s => s.trim()).join(' | '));
  }
}
