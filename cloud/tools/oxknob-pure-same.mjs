// oxknob-pure-same.mjs — every pure file shared by the two trees is byte-identical
// between the web worktree and the native worktree, and the pinned pure modules
// are unchanged from the web main commit 53600fa.
//   node oxknob-pure-same.mjs <webWt> <natWt>
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const [WEB, NAT] = process.argv.slice(2);
const sha = b => createHash('sha256').update(b).digest('hex');
const PINNED = ['exercises.js', 'analytics.js', 'tdee.js', 'units.js', 'accounts.js', 'insights.js', 'estimate-origin.js', 'estimate-ask.js',
  'coach.js', 'coach-build.js', 'coach-live.js', 'coach-prog.js', 'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js',
  'coach-volume.js', 'coach-tags.js'];
let bad = 0;
for (const f of PINNED) {
  const w = readFileSync(join(WEB, f)), n = readFileSync(join(NAT, 'src/pure', f));
  const m = execFileSync('git', ['-C', WEB, 'show', '53600fa:' + f]);
  const nm = execFileSync('git', ['-C', NAT, 'show', '9446f76:src/pure/' + f]);
  // unchanged in each tree from its main; and across the trees, equal now exactly when they were equal at the mains
  const ok = w.equals(m) && n.equals(nm) && (w.equals(n) === m.equals(nm));
  if (!ok) bad++;
  console.log((ok ? 'ok   ' : 'BAD  ') + f + ' web ' + sha(w).slice(0, 16) + (w.equals(n) ? ' = native' : ' native ' + sha(n).slice(0, 16) + ' (differs, as at the mains: ' + !m.equals(nm) + ')') +
    (w.equals(m) ? '' : ' WEB MOVED from 53600fa') + (n.equals(nm) ? '' : ' NATIVE MOVED from 9446f76'));
}
const walk = d => readdirSync(d).flatMap(x => { const p = join(d, x); return statSync(p).isDirectory() ? walk(p).map(y => x + '/' + y) : [x]; });
for (const f of walk(join(WEB, 'vibes')).filter(x => /^(defs|icons)\/.*\.js$/.test(x))) {
  const n = join(NAT, 'src/pure/vibes', f);
  const ok = existsSync(n) && readFileSync(join(WEB, 'vibes', f)).equals(readFileSync(n));
  if (!ok) bad++;
  console.log((ok ? 'same ' : 'DIFF ') + 'vibes/' + f + ' ' + sha(readFileSync(join(WEB, 'vibes', f))));
}
console.log(bad ? bad + ' differ' : 'all byte-identical');
process.exit(bad ? 1 : 0);
