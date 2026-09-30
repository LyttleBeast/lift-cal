// r02-pdffonts.mjs — list font names embedded in a PDF (raw + inflated object streams).
// Local file only; no network.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const buf = readFileSync(process.argv[2]);
const s = buf.toString('latin1');
const names = new Set();
const scan = t => { for (const m of t.matchAll(/\/(?:BaseFont|FontName)\s*\/([A-Za-z0-9+#_-]+)/g)) names.add(m[1]); };
scan(s);
let i = 0;
while ((i = s.indexOf('stream', i)) >= 0) {
  let st = i + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
  const end = s.indexOf('endstream', st); if (end < 0) break;
  try { scan(inflateSync(buf.subarray(st, end)).toString('latin1')); } catch {}
  i = end + 9;
}
console.log([...names].sort().join('\n'));
