// For a prove.mjs run: list captures whose pixels differ, their PNG shas, and
// whether each side's PNG sha appears anywhere in a reference run's same
// capture (A or B) — the dock's known raster states. Also print the fixture's
// struct/state diff samples.
// Usage: node ia-v1-px-ar1x-rs9.mjs <runDir> <refRunDir>[,<refRunDir>…]
import { readFileSync } from 'node:fs';
const [run, refs] = process.argv.slice(2);
const S = JSON.parse(readFileSync(run + '/summary.json', 'utf8'));
const refSums = refs.split(',').map(r => JSON.parse(readFileSync(r + '/summary.json', 'utf8')));
const capsOf = s => { const c = s.scenes || []; return Array.isArray(c) ? c : Object.values(c); };
const all = capsOf(S);
console.log('captures', all.length);
const refShas = new Map();
for (const rs of refSums) for (const c of capsOf(rs)) {
  const k = c.key || (c.scene + '@' + c.width);
  if (!refShas.has(k)) refShas.set(k, new Set());
  for (const x of [].concat(c.pngSha || [], c.pngShas || [], c.shots || [])) if (typeof x === 'string') refShas.get(k).add(x);
}
for (const c of all) {
  const k = c.key || (c.scene + '@' + c.width);
  if (c.pixelsEqual === false || c.diffPixels > 0) {
    const shas = [].concat(c.pngSha || []);
    const known = refShas.get(k) || new Set();
    console.log('PX', k, 'diffPixels', c.diffPixels, 'regions', JSON.stringify(c.diffRegions).slice(0, 300));
    shas.forEach((s, i) => console.log('   side', i ? 'B' : 'A', s, known.has(s) ? 'SEEN in a reference run' : 'not seen in reference'));
    const other = Object.keys(c).filter(x => /png|shot|state|alt|backstop/i.test(x));
    console.log('   keys', other.join(','), JSON.stringify(Object.fromEntries(other.map(x => [x, c[x]]))).slice(0, 700));
  }
  if (c.scene === 'fixture') {
    for (const kind of ['structDiffs', 'stateDiffs', 'styleDiffs']) console.log('FIX', k, kind, c[kind] && c[kind].count, JSON.stringify(c[kind] && c[kind].first).slice(0, 1400));
  }
}
