// N3 scratch: list the <Text>/<TextInput> sites whose style names no face
// (the codemap's "76 system-font sites"), so the systemFace spread can be
// judged site by site. Read-only.
// usage: node n3-sysface-scan.mjs <tree>
import fs from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
const tree = process.argv[2];
const req = createRequire(join(tree, 'package.json'));
const { parse } = req('@babel/parser');
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(e.name)) files.push(p); } };
walk(join(tree, 'app')); walk(join(tree, 'src'));
const FACE = /\bT\.(text\.\w+|type\(|face\(|loadNum\(|systemFace)|fontFamily/;
const rows = [];
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
  const visit = n => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'JSXOpeningElement' && n.name.type === 'JSXIdentifier' && /^(Text|TextInput)$/.test(n.name.name)) {
      const st = n.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'style');
      const src = st && st.value ? code.slice(st.value.start, st.value.end) : '(no style)';
      if (!FACE.test(src)) {
        const kind = !st ? 'none' : /^\{\{/.test(src) ? 'object' : /^\{\[/.test(src) ? 'array' : 'opaque';
        rows.push([relative(tree, f) + ':' + n.loc.start.line, n.name.name, kind, src.replace(/\s+/g, ' ').slice(0, 110)]);
      }
    }
    for (const k of Object.keys(n)) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v); }
  };
  visit(ast.program);
}
const by = {};
rows.forEach(r => { by[r[2]] = (by[r[2]] || 0) + 1; });
console.log(rows.length + ' sites', JSON.stringify(by));
rows.forEach(r => console.log(r.join('  |  ')));
