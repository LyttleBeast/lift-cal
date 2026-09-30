// r02-text.mjs — research track 2: strip a saved HTML page to text and print the
// lines that mention any keyword. Local file only; no network.
import { readFileSync } from 'node:fs';
const [file, kw = '', startWord = ''] = process.argv.slice(2);
let h = readFileSync(file, 'utf8');
h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
h = h.replace(/<(br|\/p|\/li|\/h\d|\/div|\/tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
h = h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"');
const lines = h.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 2);
let from = 0;
if (startWord) { const i = lines.findIndex(l => l.includes(startWord)); if (i >= 0) from = i; }
const words = kw.split(',').filter(Boolean).map(w => w.toLowerCase());
const out = [];
for (let i = from; i < lines.length && out.length < 80; i++) {
  if (!words.length || words.some(w => lines[i].toLowerCase().includes(w))) out.push(lines[i].slice(0, 400));
}
console.log(out.join('\n'));
