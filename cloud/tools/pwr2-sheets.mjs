// Pweb fixer round 2: the stylesheets as each tree serves them (index.html's
// links and <style>s, read from disk), through a css-static.mjs: base vs engine
// and base vs base. Prints the count, the first differences, per-file totals,
// and the touched rules whose context is an at-rule or whose declarations
// Chrome may drop.
//   node pwr2-sheets.mjs <css-static.mjs> <treeA> <treeB>
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [cssPath, A, B] = process.argv.slice(2);
const cs = await import(cssPath);
const sheets = tree => {
  const html = readFileSync(join(tree, 'index.html'), 'utf8');
  const { links, styles } = cs.linkedSheets(html);
  const out = {};
  for (const l of links) out[l] = existsSync(join(tree, l)) ? readFileSync(join(tree, l), 'utf8') : '';
  for (const s of styles) out[s.name] = s.text;
  return out;
};
const r = cs.compareSheets(sheets(A), sheets(B));
console.log('count ' + r.count + '; files ' + JSON.stringify(r.files) + '; tokensOnlyB ' + r.tokensOnlyB + '; onlyB ' + JSON.stringify(r.onlyB) + '; touched ' + r.touched.length);
for (const d of r.first.slice(0, 20)) console.log('  DIFF ' + JSON.stringify(d));
if (cs.contextOf) for (const t of r.touched) { const c = cs.contextOf(t.ctx); if (c.media.length || c.supports.length || c.other.length) console.log('  in context: ' + t.key + ' ' + JSON.stringify(c) + ' decls ' + JSON.stringify(t.decls)); }
for (const t of r.touched) for (const d of t.decls || []) if (/^-webkit-|^-moz-/.test(d.prop)) console.log('  prefixed: ' + t.key + ' ' + JSON.stringify(d));
