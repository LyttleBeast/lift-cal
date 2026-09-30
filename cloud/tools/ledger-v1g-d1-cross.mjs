// Ledger v1 gate (d1): this run's dumps side by side with two reference runs
// made by the same harness (fd610e2) under the same conditions:
//   A (web-base 928a65e) against a reference A that also served web-base
//     (Oxblood's r2b-s1 run) — must be identical;
//   B (vibes/ledger) against a reference B that served web main a78ec39's tree
//     (ev3x-*'s web-ev3 0b743d3, tree 11b51d6) — the claim is Ledger adds to
//     v1 nothing beyond main, except its own @keyframes (declared, inert unless
//     a rule names them) and the fixture's wraps for its own rules.
// Also each scene's B PNG against the PNGs the references and this run's A
// produced (sha256): a pixel difference is told as a raster state known to main.
// Usage: node ledger-v1g-d1-cross.mjs <refA runDir> <refB runDir> <runDir> [vibe=ledger]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [refA, refB, run, vibe = 'ledger'] = process.argv.slice(2);
const sha = f => existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
let pairs = 0, bad = 0, kfOnly = 0, fixture = 0, same = 0;
const pxNotes = [];
for (const side of ['A', 'B']) {
  const ref = side === 'A' ? refA : refB;
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
      else if (side === 'B' && scene === 'fixture') { fixture++; console.log('fixture', w, JSON.stringify(Object.fromEntries(kinds.map(k => [k, r[k].count]))));
             for (const k of kinds) console.log('   ', k, JSON.stringify(r[k].first).slice(0, 700)); }
      else { bad++; console.log('BAD', side, w, scene, JSON.stringify(Object.fromEntries(kinds.map(k => [k, r[k].count]))));
             for (const k of kinds) console.log('   ', k, JSON.stringify(r[k].first).slice(0, 1500)); }
      const png = sha(join(dn, scene + '.png'));
      const seen = { refB: sha(join(refB, 'B', w, scene + '.png')), refA: sha(join(refA, 'A', w, scene + '.png')), runA: sha(join(run, 'A', w, scene + '.png')) };
      if (png && !Object.values(seen).includes(png)) pxNotes.push(side + ' ' + w + ' ' + scene + ' png ' + png.slice(0, 12) + ' matches none of refB/refA/runA');
    }
  }
}
console.log('pairs ' + pairs + ': identical ' + same + ', only this vibe\'s own @keyframes declared ' + kfOnly + ', fixture ' + fixture + ', anything else ' + bad);
console.log('PNGs not byte-identical to the reference B, reference A or this run\'s A (' + pxNotes.length + '):');
for (const p of pxNotes) console.log('  ' + p);
process.exit(bad ? 3 : 0);
