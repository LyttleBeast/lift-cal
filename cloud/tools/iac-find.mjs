// Concept C (iron-age) search helper: node iac-find.mjs <regex> <file...>
// Prints file:line: text for every line matching the case-insensitive regex.
import { readFileSync } from 'node:fs';
const [pat, ...files] = process.argv.slice(2);
const re = new RegExp(pat, 'i');
for (const f of files) {
  let lines;
  try { lines = readFileSync(f, 'utf8').split('\n'); } catch (e) { console.log(`${f}: unreadable (${e.code})`); continue; }
  lines.forEach((l, i) => { if (re.test(l)) console.log(`${f.split('/').slice(-2).join('/')}:${i + 1}: ${l.slice(0, 260)}`); });
}
