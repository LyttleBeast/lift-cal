// Oxblood v1 gate (round 2-s1, fresh): this run's dumps against a reference
// run whose B served web main's tree (v-chalk-v1-*-g3-rs9: B 0af4b19, tree =
// b99ec9d's), A with A and B with B, classified. The claim: Oxblood adds to v1
// nothing beyond what main has, except its own @keyframes (declared, global
// names, inert unless a rule names them) and the fixture's wraps for its own
// rules. Also: each scene's B PNG against the PNGs the reference and this run
// produced (sha256), so a pixel difference can be told as a raster state main
// also produces.
// Usage: node oxblood-v1g3-s1-crosscheck.mjs <refRunDir> <runDir> [vibeId=oxblood]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [ref, run, vibe = 'oxblood'] = process.argv.slice(2);
const sha = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
let pairs = 0, bad = 0, kfOnly = 0, fixture = 0, same = 0;
const pxNotes = [];
for (const side of ['A', 'B']) {
  for (const w of ['390', '320']) {
    const dr = join(ref, side, w), dn = join(run, side, w);
    const names = readdirSync(dn).filter(f => f.endsWith('.dump.json.gz'));
    const refNames = readdirSync(dr).filter(f => f.endsWith('.dump.json.gz'));
    for (const n of refNames) if (!names.includes(n)) { console.log('BAD', side, w, n, 'ONLY IN REF'); bad++; }
    for (const n of names) {
      if (!refNames.includes(n)) { console.log('BAD', side, w, n, 'NOT IN REF'); bad++; continue; }
      pairs++;
      const r = H.compareDumps(H.readGz(join(dr, n)), H.readGz(join(dn, n)), 50);
      const kinds = H.DIFF_KINDS.filter(k => r[k] && r[k].count);
      const scene = n.replace('.dump.json.gz', '');
      if (!kinds.length) { same++; }
      else if (side === 'B' && kinds.length === 1 && kinds[0] === 'keyframeDiffs' &&
               r.keyframeDiffs.first.every(k => k.name.startsWith(vibe + '-') && k.A === 'absent' && k.B === 'declared')) { kfOnly++; }
      else if (side === 'B' && scene === 'fixture') { fixture++; console.log('fixture', w, JSON.stringify(Object.fromEntries(kinds.map(k => [k, r[k].count])))); }
      else { bad++; console.log('BAD', side, w, scene, JSON.stringify(Object.fromEntries(kinds.map(k => [k, r[k].count]))));
             for (const k of kinds) console.log('   ', k, JSON.stringify(r[k].first).slice(0, 1500)); }
      // pixels
      const png = sha(join(dn, scene + '.png'));
      const seen = { refB: sha(join(ref, 'B', w, scene + '.png')), refA: sha(join(ref, 'A', w, scene + '.png')), runA: sha(join(run, 'A', w, scene + '.png')) };
      if (png && !Object.values(seen).includes(png)) pxNotes.push(side + ' ' + w + ' ' + scene + ' png ' + png.slice(0, 12) + ' matches none of refB/refA/runA');
    }
  }
}
console.log('pairs ' + pairs + ': identical ' + same + ', only this vibe\'s own @keyframes declared ' + kfOnly + ', fixture ' + fixture + ', anything else ' + bad);
console.log('PNGs not byte-identical to the reference B, reference A or this run\'s A (' + pxNotes.length + '):');
for (const p of pxNotes) console.log('  ' + p);
process.exit(bad ? 3 : 0);
