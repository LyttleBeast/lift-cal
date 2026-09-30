// Chalk v1 gate (g3-rs9): the chalk run against a reference run whose B is main
// (ev2-*: B 2645c53, tree-identical to main 58ac3be; A both web-base 928a65e).
// For every scene × width: B(run) vs B(ref), and A(run) vs A(ref). A B-vs-B
// difference is accounted for only if
//   - it is a keyframe a vibe stylesheet declares (name starts "<vibe>-"), or
//   - the same difference (path, prop, values) shows in A-vs-A (the run's
//     environment, not the tree), or
//   - it sits in the fixture and chalk-rs9-fixture.mjs is run separately.
// Everything else is printed as UNACCOUNTED. Also: PNG B(run) vs B(ref) sha.
// Usage: node chalk-g3-rs9-cross.mjs <refRunDir> <runDir> <vibe>
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [ref, run, vibe] = process.argv.slice(2);
const sha = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
const key = (k, d) => k + '|' + JSON.stringify(d);
let pairs = 0, clean = 0, unacc = 0, pngSame = 0, pngDiff = [];
const acc = { keyframe: 0, env: 0, fixture: 0 };
for (const w of ['390', '320']) {
  const names = readdirSync(join(run, 'B', w)).filter(f => f.endsWith('.dump.json.gz'));
  const refNames = new Set(readdirSync(join(ref, 'B', w)).filter(f => f.endsWith('.dump.json.gz')));
  for (const n of names) {
    if (!refNames.has(n)) { console.log('UNACCOUNTED', w, n, 'not in ref'); unacc++; continue; }
    pairs++;
    const scene = n.replace('.dump.json.gz', '');
    const rb = H.compareDumps(H.readGz(join(ref, 'B', w, n)), H.readGz(join(run, 'B', w, n)), 100000);
    const ra = H.compareDumps(H.readGz(join(ref, 'A', w, n)), H.readGz(join(run, 'A', w, n)), 100000);
    const envSet = new Set();
    for (const k of H.DIFF_KINDS) if (ra[k] && ra[k].first) for (const d of ra[k].first) envSet.add(key(k, d));
    const left = [];
    for (const k of H.DIFF_KINDS) {
      if (!rb[k] || !rb[k].count) continue;
      const list = rb[k].first || [];
      if (list.length < rb[k].count) left.push(k + ': ' + rb[k].count + ' but only ' + list.length + ' listed');
      for (const d of list) {
        if (k === 'keyframeDiffs' && d.name && d.name.startsWith(vibe + '-') && d.A === 'absent') { acc.keyframe++; continue; }
        if (envSet.has(key(k, d))) { acc.env++; continue; }
        if (scene === 'fixture') { acc.fixture++; continue; }
        left.push(k + ' ' + JSON.stringify(d).slice(0, 400));
      }
    }
    if (left.length) { unacc++; console.log('UNACCOUNTED', w, scene); left.slice(0, 8).forEach(x => console.log('    ' + x)); }
    else clean++;
  }
  for (const n of refNames) if (!names.includes(n)) { console.log('UNACCOUNTED', w, n, 'only in ref'); unacc++; }
}
console.log(`pairs ${pairs}; fully accounted ${clean}; unaccounted ${unacc}`);
console.log(`accounted: ${acc.keyframe} ${vibe}-* keyframes declared, ${acc.env} also in A-vs-A (environment), ${acc.fixture} in the fixture (see the fixture re-alignment)`);
// Pixels: the run's own A-vs-B capture comparison, per scene (summary.json).
const S = JSON.parse(readFileSync(join(run, 'summary.json'), 'utf8')).scenes;
const px = Object.entries(S).filter(([, v]) => !v.pixelsEqual);
console.log(`pixels, A vs B within the run: ${Object.keys(S).length - px.length} equal, ${px.length} differ` + px.map(([k, v]) => `\n    ${k}: ${v.diffPixels} px in ${JSON.stringify((v.diffRegions || []).map(r => r.css))}`).join(''));
process.exit(unacc ? 3 : 0);
