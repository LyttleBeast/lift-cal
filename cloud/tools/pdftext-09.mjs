// Track 9 helper: crude text pull from a FlateDecode PDF (no deps), then print
// the paragraphs around a search phrase. Usage: node pdftext-09.mjs <pdf> <phrase> [chars]
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const [, , file, phrase, span = '2500'] = process.argv;
const buf = readFileSync(file);
const s = buf.toString('latin1');
let out = '';
let i = 0;
while ((i = s.indexOf('stream', i)) !== -1) {
  let start = i + 6;
  if (s[start] === '\r') start++;
  if (s[start] === '\n') start++;
  const end = s.indexOf('endstream', start);
  if (end === -1) break;
  const raw = buf.subarray(start, end);
  let txt = '';
  try { txt = inflateSync(raw).toString('latin1'); } catch { i = end; continue; }
  // pull strings from Tj / TJ operators
  const parts = [];
  const re = /\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj|(T\*|Td|TD|ET)/gs;
  let m;
  while ((m = re.exec(txt))) {
    if (m[1] !== undefined) {
      const inner = m[1];
      const r2 = /\(((?:\\.|[^\\)])*)\)|(-?\d+(?:\.\d+)?)/g; let k;
      while ((k = r2.exec(inner))) {
        if (k[1] !== undefined) parts.push(k[1]);
        else if (Number(k[2]) < -200) parts.push(' ');
      }
    } else if (m[2] !== undefined) parts.push(m[2]);
    else parts.push(m[3] === 'ET' ? '\n' : ' ');
  }
  out += parts.join('').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  i = end;
}
const flat = out.replace(/[ \t]+/g, ' ');
const lower = flat.toLowerCase();
let at = lower.indexOf(phrase.toLowerCase());
if (at === -1) { console.log('NOT FOUND; extracted chars:', flat.length); console.log(flat.slice(0, 600)); }
let n = 0;
while (at !== -1 && n < 3) {
  console.log('----- hit at', at);
  console.log(flat.slice(Math.max(0, at - 300), at + Number(span)));
  at = lower.indexOf(phrase.toLowerCase(), at + 1); n++;
}
