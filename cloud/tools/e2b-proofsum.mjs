// e2b-proofsum.mjs <runDir> — print a prove.mjs run's verdict and each scene's errors.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const s = JSON.parse(readFileSync(join(process.argv[2], 'summary.json'), 'utf8'));
console.log('keys: ' + Object.keys(s).join(', '));
console.log('verdict: ' + s.verdict);
const scenes = s.scenes || s.results || [];
for (const x of (Array.isArray(scenes) ? scenes : Object.values(scenes)).slice(0, 40)) {
  console.log((x.scene || x.name) + '@' + x.width + ': ' + (x.errors && x.errors.length ? JSON.stringify(x.errors).slice(0, 400) : 'ok'));
}
