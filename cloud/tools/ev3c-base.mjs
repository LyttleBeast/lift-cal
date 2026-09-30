// ev3c-base.mjs <repo> <rev> <regex> <file>... : print matches in files at a revision (read-only, git show).
import { execFileSync } from 'node:child_process';
const [repo, rev, re, ...files] = process.argv.slice(2);
const rx = new RegExp(re);
for (const f of files) {
  let t; try { t = execFileSync('git', ['-C', repo, 'show', `${rev}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch { console.log(`${f}: not at ${rev}`); continue; }
  t.split('\n').forEach((l, i) => { if (rx.test(l)) console.log(`${f}:${i + 1}: ${l.length > 200 ? l.slice(0, 200) + '…' : l}`); });
}
