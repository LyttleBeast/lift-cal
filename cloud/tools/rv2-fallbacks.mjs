// Round-2 review: declarations whose base value is a literal and whose engine
// value holds var(), where (a) the same rule declares that property more than
// once (a progressive-enhancement fallback pair), or (b) the base literal uses
// a function an older Safari may drop at parse time. With var() the
// declaration is never dropped at parse time; an invalid substitution becomes
// 'unset' at computed-value time instead of falling back.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const H = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs';
const { parseCss } = await import(pathToFileURL(H).href);
const T = { A: '/Users/micahflunker/dev/vibes-night/wt/web-base/', B: '/Users/micahflunker/dev/vibes-night/wt/web-engine/' };
const NEWFN = /color-mix\(|oklch\(|oklab\(|\blab\(|\blch\(|hwb\(|\bfrom\s|rgba?\([^)]*\//i;
for (const f of ['rack.css', 'auth.css']) {
  const a = parseCss(readFileSync(T.A + f, 'utf8')), b = parseCss(readFileSync(T.B + f, 'utf8'));
  if (a.length !== b.length) console.log(f, 'rule count differs', a.length, b.length);
  let dup = 0, newfn = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const ra = a[i], rb = b[i];
    const count = new Map();
    for (const [k] of ra.decls) count.set(k, (count.get(k) || 0) + 1);
    ra.decls.forEach(([k, v], j) => {
      const w = rb.decls[j] ? rb.decls[j][1] : '(none)';
      const tok = !/var\(/.test(v) && /var\(/.test(w);
      if (!tok) return;
      if (count.get(k) > 1) { dup++; console.log('DUP ', f, ra.ctx.join(' > '), '|', ra.sel, '|', k, '|', v, '=>', w); }
      if (NEWFN.test(v)) { newfn++; console.log('NEWF', f, ra.ctx.join(' > '), '|', ra.sel, '|', k, '|', v, '=>', w); }
    });
  }
  console.log(f, 'tokenised in a duplicated property:', dup, '| tokenised newer-function literals:', newfn);
}
