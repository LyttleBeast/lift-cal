// ev3x: the pure files. (1) every file under web vibes/defs and vibes/icons is
// byte-identical to native src/pure/vibes/<same>, and the sets match; (2) the
// 18 pinned pure modules are unchanged from each main in each tree; (3) every
// sha256 pin in native tools/verify-vibes-verbatim.mjs is the file's real sha.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev3';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-ev3';
const sha = b => createHash('sha256').update(b).digest('hex');
const walk = (d, rel = '') => readdirSync(join(d, rel)).flatMap(f => statSync(join(d, rel, f)).isDirectory() ? walk(d, join(rel, f)) : [join(rel, f)]);
let bad = 0;
for (const sub of ['defs', 'icons']) {
  const wf = walk(join(W, 'vibes', sub)).sort(), nf = walk(join(N, 'src/pure/vibes', sub)).sort();
  if (JSON.stringify(wf) !== JSON.stringify(nf)) { bad++; console.log('SET DIFFERS', sub, wf, nf); }
  for (const f of wf) {
    const a = sha(readFileSync(join(W, 'vibes', sub, f)));
    const b = existsSync(join(N, 'src/pure/vibes', sub, f)) ? sha(readFileSync(join(N, 'src/pure/vibes', sub, f))) : 'missing';
    console.log(a === b ? 'same' : 'DIFF', sub + '/' + f, a.slice(0, 12), b.slice(0, 12));
    if (a !== b) bad++;
  }
}
const PINNED = ['exercises', 'analytics', 'tdee', 'units', 'accounts', 'insights', 'estimate-origin', 'estimate-ask', 'coach', 'coach-build', 'coach-live', 'coach-prog', 'coach-goal', 'coach-overlap', 'coach-ready', 'coach-fuel', 'coach-volume', 'coach-tags'];
const show = (tree, rev, p) => { try { return execFileSync('git', ['-C', tree, 'show', rev + ':' + p]); } catch { return null; } };
for (const m of PINNED) {
  const wp = m + '.js';
  const wNow = existsSync(join(W, wp)) ? readFileSync(join(W, wp)) : null;
  const wMain = show(W, '53600fa', wp);
  const np = ['src/pure/' + m + '.js', 'src/' + m + '.js'].find(p => existsSync(join(N, p)));
  const nNow = np ? readFileSync(join(N, np)) : null;
  const nMain = np ? show(N, '9446f76', np) : null;
  const wOk = wNow && wMain && sha(wNow) === sha(wMain), nOk = nNow && nMain && sha(nNow) === sha(nMain);
  if (!wOk || !nOk) bad++;
  console.log('pinned', m, 'web', wOk ? 'unchanged' : 'CHANGED', 'native', np, nOk ? 'unchanged' : 'CHANGED', 'cross', wNow && nNow && sha(wNow) === sha(nNow) ? 'same' : 'differs');
}
// (3) pins
const V = readFileSync(join(N, 'tools/verify-vibes-verbatim.mjs'), 'utf8');
const re = /['"]([\w./-]+\.js)['"]\s*[:,]\s*['"]([0-9a-f]{64})['"]/g;
let m, pins = 0;
while ((m = re.exec(V))) {
  pins++;
  const cands = [join(N, m[1]), join(N, 'src/pure/vibes', m[1]), join(N, 'src/pure', m[1])].filter(existsSync);
  const real = cands.length ? sha(readFileSync(cands[0])) : 'missing';
  if (real !== m[2]) bad++;
  console.log(real === m[2] ? 'pin ok' : 'PIN WRONG', m[1], cands[0], m[2].slice(0, 12), real.slice(0, 12));
}
console.log('pins found', pins, 'bad', bad);
process.exit(bad ? 1 : 0);
