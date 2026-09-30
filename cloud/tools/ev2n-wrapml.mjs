// Wrap a (possibly multi-line) JSX <Text …>…</Text> child as
// {glyph(<expr>, <Text …>…</Text>)} for every line containing <anchor>:
// the element runs from the nearest line at or above the anchor whose trimmed
// text starts with '<Text' down to the first line at or below it containing
// '</Text>'. Usage: node ev2n-wrapml.mjs <file> <expr> <anchor> [expectCount]
import { readFileSync, writeFileSync } from 'node:fs';
const [file, expr, anchor, expect] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
const done = [];
for (let i = 0; i < L.length; i++) {
  if (!L[i].includes(anchor)) continue;
  let a = i; while (a >= 0 && !L[a].trim().startsWith('<Text')) a--;
  let b = i; while (b < L.length && !L[b].includes('</Text>')) b++;
  if (a < 0 || b >= L.length || i - a > 6 || b - i > 6) { console.log('SKIP (no element) at', i + 1); continue; }
  if (L[a].includes('glyph(')) continue;
  const ind = L[a].slice(0, L[a].length - L[a].trimStart().length);
  L[a] = ind + '{glyph(' + expr + ', ' + L[a].trimStart();
  L[b] = L[b].replace('</Text>', '</Text>)}');
  done.push((a + 1) + '-' + (b + 1));
  i = b;
}
writeFileSync(file, L.join('\n'));
console.log(file.split('/').slice(-2).join('/'), expr, 'wrapped', done.join(', ') || 'NOTHING');
if (expect && +expect !== done.length) { console.log('EXPECTED ' + expect); process.exit(1); }
