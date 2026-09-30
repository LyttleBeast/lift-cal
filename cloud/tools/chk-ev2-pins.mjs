// chk-ev2-pins.mjs — the contract's pure files: sha256 in both engine-v2 trees,
// and every place either tree pins a 64-hex sha next to their names.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev2', N = '/Users/micahflunker/dev/vibes-night/wt/nat-ev2';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = ['defs/v1.js', 'defs/index.js', 'defs/vocab.js', 'icons/v1.js'];
const shas = {};
for (const f of files) {
  const a = sha(`${W}/vibes/${f}`), b = sha(`${N}/src/pure/vibes/${f}`);
  shas[a] = f;
  console.log(f.padEnd(14), a === b ? 'SAME' : 'DIFFER', a, b === a ? '' : b);
}
// Any 64-hex string in the verifiers that names one of these files
for (const p of [`${N}/tools/verify-vibes-verbatim.mjs`, `${W}/tools-check/vibes-contract.mjs`, `${N}/tools/verify-vibes-contract.mjs`, `${W}/tools-check/vibe-js.mjs`]) {
  let t; try { t = readFileSync(p, 'utf8'); } catch { continue; }
  const lines = t.split('\n');
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/[0-9a-f]{64}/g)) {
      const hit = shas[m[0]];
      if (hit || /vibes\/(defs|icons)/.test(l)) console.log(p.replace(/.*wt\//, ''), i + 1, hit ? 'pins ' + hit + ' (current)' : 'STALE? ' + m[0].slice(0, 12), '|', l.trim().slice(0, 140));
    }
  });
}
