// N4 scratch: every style object that paints a card's ground — backgroundColor
// T.colors.bar — with what else it carries (a collar border, a radius), and
// every T.cardSkin() call. Read-only. usage: node n4-cards.mjs <tree>
import fs from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
const tree = process.argv[2];
const req = createRequire(join(tree, 'package.json'));
const { parse } = req('@babel/parser');
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx?)$/.test(e.name)) files.push(p); } };
walk(join(tree, 'app')); walk(join(tree, 'src'));
const src = (code, n) => code.slice(n.start, n.end).replace(/\s+/g, ' ');
const rows = [], skins = [];
for (const f of files) {
  if (/src\/ui\/theme\.js$/.test(f)) continue;
  const code = fs.readFileSync(f, 'utf8');
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
  const visit = n => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'ObjectExpression') {
      const prop = k => n.properties.find(p => p.type === 'ObjectProperty' && (p.key.name || p.key.value) === k);
      const bg = prop('backgroundColor');
      if (bg && /T\.colors\.bar\b/.test(src(code, bg.value))) {
        const bw = prop('borderWidth'), bc = prop('borderColor'), br = prop('borderRadius');
        rows.push([relative(tree, f) + ':' + n.loc.start.line,
          'bg=' + src(code, bg.value).slice(0, 40),
          'bw=' + (bw ? src(code, bw.value) : '-'), 'bc=' + (bc ? src(code, bc.value).slice(0, 40) : '-'),
          'br=' + (br ? src(code, br.value) : '-')]);
      }
    }
    if (n.type === 'CallExpression' && /^T\.cardSkin$/.test(src(code, n.callee))) {
      skins.push(relative(tree, f) + ':' + n.loc.start.line + '  ' + src(code, n));
    }
    for (const k of Object.keys(n)) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v); }
  };
  visit(ast.program);
}
console.log(rows.length + ' objects painting T.colors.bar');
rows.forEach(r => console.log('  ' + r.join('  |  ')));
console.log(skins.length + ' T.cardSkin() calls');
skins.forEach(s => console.log('  ' + s));
