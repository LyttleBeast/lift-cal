// findpage.mjs — map printed page numbers to BookReader leaf indices (n = array index) using an IA page_numbers.json.
import { readFileSync } from 'node:fs';
const [f, ...want] = process.argv.slice(2);
const pages = JSON.parse(readFileSync(f, 'utf8')).pages || [];
for (const w of want) {
  const i = pages.findIndex(p => String(p.pageNumber) === w);
  console.log(w, '-> n' + i, i >= 0 ? `(leaf ${pages[i].leafNum})` : '(not found)');
}
