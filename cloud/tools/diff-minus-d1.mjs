// Print the removed lines (and their hunk headers) of one file in a unified diff.
import { readFileSync } from 'node:fs';
const [,, path, file] = process.argv;
let on = false;
for (const l of readFileSync(path, 'utf8').split('\n')) {
  if (l.startsWith('diff --git')) { on = l.includes(file); continue; }
  if (!on) continue;
  if (l.startsWith('@@') || (l.startsWith('-') && !l.startsWith('---'))) console.log(l);
}
