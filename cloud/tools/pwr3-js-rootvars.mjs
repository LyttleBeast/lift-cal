// pwr3 js-lens reviewer: list every custom-property declaration in a tree's
// rack.css/auth.css, with the selector it sits under, and flag any that is not
// a plain top-level :root. Usage: node pwr3-js-rootvars.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';

const tree = process.argv[2];
const out = { root: {}, nonRoot: [] };
for (const f of ['rack.css', 'auth.css']) {
  const src = fs.readFileSync(path.join(tree, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  // A tiny tokenizer: track a stack of preludes.
  const stack = [];
  let buf = '';
  let line = 1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\n') line++;
    if (ch === '{') { stack.push(buf.trim()); buf = ''; continue; }
    if (ch === '}') {
      handle(buf, stack, f, line);
      stack.pop(); buf = ''; continue;
    }
    if (ch === ';') { handle(buf, stack, f, line); buf = ''; continue; }
    buf += ch;
  }
}
function handle(decl, stack, f, line) {
  const d = decl.trim();
  const m = /^(--[\w-]+)\s*:\s*([\s\S]*)$/.exec(d);
  if (!m) return;
  const sel = stack[stack.length - 1] || '';
  const ctx = stack.slice(0, -1).join(' >> ');
  if (sel === ':root' && !ctx) {
    if (out.root[m[1]] !== undefined && out.root[m[1]] !== m[2].trim()) out.root[m[1] + '@dup@' + line] = m[2].trim();
    else out.root[m[1]] = m[2].trim();
  } else out.nonRoot.push({ file: f, line, ctx, sel, name: m[1], value: m[2].trim() });
}
console.log(JSON.stringify(out, null, 1));
