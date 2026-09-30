// Round-2 review: var() where CSS does not substitute it — at-rule preludes
// (@media, @supports, @container), @font-face / @page / @property descriptors —
// and var() inside a custom-property value that is itself a shorthand-ish list
// read elsewhere. Also: tokens whose value is used inside url() or a string.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { parseCss } = await import(pathToFileURL('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs').href);
const B = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';
for (const f of ['rack.css', 'auth.css']) {
  const rules = parseCss(readFileSync(B + f, 'utf8'));
  for (const r of rules) {
    for (const c of r.ctx) if (/var\(/.test(c)) console.log('PRELUDE', f, c);
    if (/^@/.test(r.sel) && r.decls.some(([k, v]) => /var\(/.test(v))) console.log('AT-RULE DESCRIPTOR', f, r.sel, JSON.stringify(r.decls));
    if (/var\(/.test(r.sel)) console.log('SELECTOR', f, r.sel);
    for (const [k, v] of r.decls) if (/url\([^)]*var\(|["'][^"']*var\(/.test(v)) console.log('URL/STRING', f, r.sel, k, v);
  }
}
console.log('done');
