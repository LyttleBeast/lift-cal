// r3: every rule prelude (selector / at-rule / keyframe selector), byte for
// byte, base against engine, with comments removed and nothing else touched.
import fs from 'node:fs';
import { stripComments } from './r3css-lib.mjs';
const pre = t => { const s = stripComments(t); const out = []; let buf = '', q = null, d = 0;
  for (const ch of s) {
    if (q) { buf += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
    if (ch === '(') d++; if (ch === ')') d--;
    if (ch === '{' && !d) { out.push(buf.trim()); buf = ''; continue; }
    if ((ch === '}' || ch === ';') && !d) { buf = ''; continue; }
    buf += ch;
  }
  return out; };
for (const f of ['rack.css', 'auth.css']) {
  const a = pre(fs.readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-base/' + f, 'utf8'));
  const b = pre(fs.readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-engine/' + f, 'utf8'));
  let diff = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { diff++; if (diff < 5) console.log(f, i, JSON.stringify(a[i]), JSON.stringify(b[i])); }
  console.log(f, 'preludes', a.length, b.length, 'byte differences', diff);
}
