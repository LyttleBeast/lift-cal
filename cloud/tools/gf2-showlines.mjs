// gf2-showlines.mjs — 08b gap-fill resume: print line ranges of files AT A COMMIT (read-only `git show`).
// Usage: node gf2-showlines.mjs <repo> <commit> <file:from-to> ...
import { execFileSync } from 'node:child_process';
const [repo, commit, ...specs] = process.argv.slice(2);
for (const s of specs) {
  const m = s.match(/^(.*):(\d+)-(\d+)$/);
  if (!m) { console.log('bad spec', s); continue; }
  let t;
  try { t = execFileSync('git', ['-C', repo, 'show', `${commit}:${m[1]}`], { encoding: 'utf8', maxBuffer: 64e6 }).split('\n'); }
  catch (e) { console.log('== ' + m[1] + ' ERR'); continue; }
  console.log(`== ${commit}:${m[1]} (${t.length} lines)`);
  for (let i = +m[2]; i <= +m[3] && i <= t.length; i++) console.log(i + ': ' + t[i - 1].slice(0, 150));
}
