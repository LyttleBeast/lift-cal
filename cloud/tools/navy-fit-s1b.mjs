// Scratch: distinct spill classes (>3px or x) in Navy; the two clipped ones in v1's run.
import { readFileSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const N = JSON.parse(readFileSync(P + (process.argv[2] || 'v-navy-fit-s1') + '/fit.json', 'utf8'));
const R = JSON.parse(readFileSync(P + 'v-chalk-fit-v1ref-rs9/fit.json', 'utf8'));
const d = new Map();
for (const [sc, s] of Object.entries(N.scenes)) for (const c of s.clipped || []) {
  const ax = c.axis === 'x' ? 0 : 1, ex = c.content[ax] - c.box[ax];
  if (c.how === 'spills' && (ex > 3 || c.axis === 'x')) { const k = c.cls + ' ' + c.axis + ' ' + ex; if (!d.has(k)) d.set(k, [sc, c.text.slice(0, 40), c.overflow]); }
}
for (const [k, v] of d) console.log(k, JSON.stringify(v));
for (const sc of ['admin-person-trial@320', 'vibe-reapply@320', 'vibe-reapply@390']) {
  const s = R.scenes[sc]; if (!s) { console.log('no ref', sc); continue; }
  for (const c of s.clipped || []) if (/adm-uid|mini-stat/.test(c.cls)) console.log('v1', sc, JSON.stringify(c));
}
