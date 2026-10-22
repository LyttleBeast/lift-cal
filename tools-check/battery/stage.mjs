// Stage Coach's pure modules from a given repo path, the way every verifier
// in tools-check/ stages them: each file copied into a temp dir with its
// relative imports repointed, analytics.js over a stubbed store. No copy of
// any rule lives here — the real files are driven.
//
//   const C = await stageCoach('/path/to/lift-cal');     // the repo root (tools-check/battery/../..)
//   C.coach, C.prog.targetFor, C.overlap.nextSetFor, C.volume.volumeRead, …
//
// The temp dir is left behind (it is small, and a crash mid-run should leave
// the staged files inspectable).

import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function stageCoach(root) {
  const src = p => readFileSync(join(root, p), 'utf8');
  const real = p => JSON.stringify(pathToFileURL(join(root, p)).href);
  for (const f of ['coach.js', 'coach-prog.js', 'coach-overlap.js', 'coach-volume.js', 'analytics.js', 'units.js', 'exercises.js']) {
    if (!existsSync(join(root, f))) throw new Error('stageCoach: ' + f + ' not found under ' + root);
  }
  const dir = mkdtempSync(join(tmpdir(), 'coach-v2-battery-'));
  const local = f => JSON.stringify(pathToFileURL(join(dir, f)).href);

  writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
  // analytics.js imports ui.js for its charts; ui.js imports nothing and runs
  // in Node (coach-pure.mjs does the same).
  writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js')));

  // Every pure Coach module, each relative import repointed: a sibling Coach
  // module to its staged copy, analytics.js to the staged one, and the leaf
  // modules (units, exercises, tags, goal, blocks) to the real files.
  const COACH = ['coach-ramp.js', 'coach-prog.js', 'coach-build.js', 'coach-live.js', 'coach-overlap.js', 'coach-fuel.js',
                 'coach-ready.js', 'coach-volume.js', 'coach.js'];
  const LEAF = ['units.js', 'exercises.js', 'coach-tags.js', 'coach-goal.js', 'blocks.js'];
  const repoint = text => text.replace(/from\s+'\.\/([\w-]+\.js)'/g, (m, f) => {
    if (f === 'analytics.js') return 'from ' + local('analytics.mjs');
    if (COACH.includes(f)) return 'from ' + local(f.replace(/\.js$/, '.mjs'));
    if (LEAF.includes(f)) return 'from ' + real(f);
    throw new Error('stageCoach: unexpected import ' + f);
  });
  for (const f of COACH) {
    if (!existsSync(join(root, f))) continue;
    writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), repoint(src(f)));
  }
  const load = f => import(pathToFileURL(join(dir, f)).href);
  const [coach, prog, overlap, volume, live, build] = await Promise.all(
    ['coach.mjs', 'coach-prog.mjs', 'coach-overlap.mjs', 'coach-volume.mjs', 'coach-live.mjs', 'coach-build.mjs'].map(load));
  const units = await import(pathToFileURL(join(root, 'units.js')).href);
  const exercises = await import(pathToFileURL(join(root, 'exercises.js')).href);
  return { dir, root, coach, prog, overlap, volume, live, build, units, exercises };
}
