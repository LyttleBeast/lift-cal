// pagenums.mjs — print where printed page numbering restarts or is absent in an IA page_numbers.json.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pages = j.pages || [];
let prev = null; const out = [];
pages.forEach((p, i) => {
  const n = parseInt(p.pageNumber, 10);
  if (!Number.isFinite(n)) { out.push(`leaf${p.leafNum} n${i}: (no number)`); }
  else if (prev !== null && n < prev) out.push(`leaf${p.leafNum} n${i}: restart at ${n}`);
  if (Number.isFinite(n)) prev = n;
});
console.log(pages.length, 'leaves');
console.log(out.join('\n'));
