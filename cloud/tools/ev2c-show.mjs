// ev2c-show.mjs <repo> <rev> <file> <from> <to> — print lines of a file at a
// revision (read-only git show), numbered. Scratch helper for the engine-v2
// contract job: the shell here may not pipe or redirect.
import { execFileSync } from 'node:child_process';
const [repo, rev, file, from, to] = process.argv.slice(2);
const t = execFileSync('git', ['-C', repo, 'show', `${rev}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n');
const a = Math.max(1, +from || 1), b = Math.min(t.length, +to || t.length);
for (let i = a; i <= b; i++) console.log(String(i).padStart(5) + '  ' + t[i - 1]);
