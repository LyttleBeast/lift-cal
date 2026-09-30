// r3: list every declaration the engine changed (text), grouped by property,
// with the base value, the engine value and the tokens it now depends on.
import { load } from './r3css-lib.mjs';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const byProp = {};
const rows = [];
for (const f of ['rack.css', 'auth.css']) {
  const b = load(`${BASE}/${f}`, f), e = load(`${ENG}/${f}`, f);
  for (let i = 0; i < b.length; i++) {
    if (!b[i].decls || (b[i].sel === ':root' && !b[i].ctx.length)) continue;
    b[i].decls.forEach((db, j) => {
      const de = e[i].decls[j];
      if (db.value === de.value) return;
      rows.push({ f, ctx: b[i].ctx.join(' / '), sel: b[i].sel, prop: de.prop, base: db.value, eng: de.value, imp: de.important });
      (byProp[de.prop] ||= 0); byProp[de.prop]++;
    });
  }
}
const mode = process.argv[2] || 'props';
if (mode === 'props') console.log(JSON.stringify(byProp, null, 1), rows.length);
else if (mode === 'prop') for (const r of rows.filter(r => r.prop === process.argv[3])) console.log(`${r.f} | ${r.ctx} | ${r.sel} | ${r.base} => ${r.eng}${r.imp ? ' !important' : ''}`);
else if (mode === 'all') for (const r of rows) console.log(`${r.f} | ${r.ctx} | ${r.sel} | ${r.prop}: ${r.base} => ${r.eng}${r.imp ? ' !important' : ''}`);
else if (mode === 'ctx') for (const r of rows.filter(r => r.ctx || /::|:hover|:active|:focus|:disabled|:checked|:not|:has/.test(r.sel))) console.log(`${r.f} | ${r.ctx} | ${r.sel} | ${r.prop}: ${r.base} => ${r.eng}`);
