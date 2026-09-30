// Emits each new line of a file that matches a pattern; exits when the end pattern appears.
// node ev3w-watch.mjs <file> <matchRegex> <endRegex>
import { readFileSync, existsSync } from 'node:fs';
const [file, m, e] = process.argv.slice(2);
const M = new RegExp(m), E = new RegExp(e);
let seen = 0;
for (;;) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
  for (; seen < lines.length - 1; seen++) if (M.test(lines[seen])) console.log(lines[seen].slice(0, 300));
  if (lines.some(l => E.test(l))) process.exit(0);
  await new Promise(r => setTimeout(r, 5000));
}
