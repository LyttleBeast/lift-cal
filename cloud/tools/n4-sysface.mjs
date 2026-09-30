// N4 scratch: the <Text>/<TextInput> sites that draw in the system font — no
// Archivo face in their style, and not nested inside another Text (a nested
// Text inherits its parent's face). Read-only.
// usage: node n4-sysface.mjs <tree> [--all]
import fs from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
const tree = process.argv[2];
const all = process.argv.includes('--all');
const req = createRequire(join(tree, 'package.json'));
const { parse } = req('@babel/parser');
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(e.name)) files.push(p); } };
walk(join(tree, 'app')); walk(join(tree, 'src'));
const FACE = /\bT\.(text\.\w+|type\(|face\(|loadNum\(|fit\.|systemFace)|fontFamily|\bslot\(|\bnote\(/;
const nameOf = n => n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? nameOf(n.object) + '.' + n.property.name : '?';
const rows = [];
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
  const visit = (n, inText) => {
    if (!n || typeof n.type !== 'string') return;
    let here = inText;
    if (n.type === 'JSXElement') {
      const o = n.openingElement, nm = nameOf(o.name);
      const isText = /^(Animated\.)?(Text|TextInput)$/.test(nm);
      if (isText) {
        const st = o.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'style');
        const src = st && st.value ? code.slice(st.value.start, st.value.end) : '(no style)';
        const has = FACE.test(src);
        if (all || !has) {
          const kind = !st ? 'none' : /^\{\{/.test(src) ? 'object' : /^\{\[/.test(src) ? 'array' : 'opaque';
          rows.push([relative(tree, f) + ':' + o.loc.start.line, nm, kind, inText ? 'NESTED' : 'top', has ? 'face' : 'SF', src.replace(/\s+/g, ' ').slice(0, 100)]);
        }
        here = true;
      }
      // a function child (Pressable's render prop) or an expression container stays inside
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'openingElement' && false) continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(x => visit(x, here)); else if (v && typeof v === 'object') visit(v, here);
    }
  };
  visit(ast.program, false);
}
const by = {};
rows.forEach(r => { const k = r[2] + '/' + r[3]; by[k] = (by[k] || 0) + 1; });
console.log(rows.length + ' sites', JSON.stringify(by));
rows.forEach(r => console.log(r.join('  |  ')));
