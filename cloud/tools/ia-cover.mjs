// For every variantOf('<block>') switch in a native tree, report whether the
// switch has a case for Iron Age's look. usage: node ia-cover.mjs <tree>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = process.argv[2];
const def = (await import(join(root, 'src/pure/vibes/defs/iron-age.js'))).default;
const looks = def.variants;
const files = [];
const walk = d => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === 'pure' || n.startsWith('.')) continue; const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(n)) files.push(p); } };
walk(join(root, 'src')); walk(join(root, 'app'));
const rows = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  const rx = /switch\s*\(\s*variantOf\(\s*'(\w+)'\s*\)\s*\)\s*\{/g;
  let m;
  while ((m = rx.exec(src))) {
    const block = m[1];
    // find the matching close brace of the switch
    let i = m.index + m[0].length, depth = 1;
    while (i < src.length && depth) { const c = src[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
    const body = src.slice(m.index, i);
    const line = src.slice(0, m.index).split('\n').length;
    // enclosing function name: nearest preceding "function X" or "const X ="
    const before = lines.slice(0, line).reverse().find(l => /^\s*(export\s+)?(default\s+)?function\s+\w+|^\s*(export\s+)?const\s+\w+\s*=\s*(\(|memo|forwardRef|function)/.test(l)) || '';
    const fn = (before.match(/function\s+(\w+)|const\s+(\w+)/) || [])[1] || (before.match(/const\s+(\w+)/) || [])[1] || '?';
    const want = looks[block];
    const has = want === 'v1' || new RegExp("case\\s+'" + want + "'").test(body);
    rows.push({ file: relative(root, f), line, block, fn, want, has });
  }
}
const miss = rows.filter(r => !r.has);
for (const r of rows) console.log((r.has ? 'ok  ' : 'MISS') + ' ' + r.block.padEnd(14) + (r.want || '').padEnd(10) + r.file + ':' + r.line + ' ' + r.fn);
console.log('\n' + rows.length + ' switches, ' + miss.length + ' without an Iron Age case');
const blocks = Object.keys(looks).filter(b => looks[b] !== 'v1' && !rows.some(r => r.block === b));
if (blocks.length) console.log('blocks with a look and NO switch found: ' + blocks.join(', '));
