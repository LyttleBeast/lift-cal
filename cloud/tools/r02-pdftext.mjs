// r02-pdftext.mjs — research track 2: crude text pull from a PDF (inflate streams, read Tj/TJ).
// Local file only; no network. Prints lines containing any keyword, or everything if none.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const [file, kw = ''] = process.argv.slice(2);
const buf = readFileSync(file);
const s = buf.toString('latin1');
const words = kw.split(',').filter(Boolean).map(w => w.toLowerCase());
const texts = [];
let i = 0;
while ((i = s.indexOf('stream', i)) >= 0) {
  let st = i + 6; if (s[st] === '\r') st++; if (s[st] === '\n') st++;
  const end = s.indexOf('endstream', st); if (end < 0) break;
  const raw = buf.subarray(st, end);
  let out = null;
  try { out = inflateSync(raw).toString('latin1'); } catch { out = null; }
  if (out && /T[jJ]/.test(out)) {
    const parts = [];
    for (const m of out.matchAll(/\[((?:[^\]\\]|\\.)*)\]\s*TJ|\(((?:[^)\\]|\\.)*)\)\s*Tj/g)) {
      if (m[1] != null) { for (const p of m[1].matchAll(/\(((?:[^)\\]|\\.)*)\)/g)) parts.push(p[1]); }
      else parts.push(m[2]);
      parts.push(m[1] != null ? '' : '');
    }
    const t = parts.join('').replace(/\\([()\\])/g, '$1');
    if (t.trim()) texts.push(t.replace(/\s+/g, ' ').trim());
  }
  i = end + 9;
}
for (const t of texts) {
  if (!words.length || words.some(w => t.toLowerCase().includes(w))) console.log('--', t.slice(0, 700));
}
console.log('streams with text:', texts.length);
