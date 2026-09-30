// For each file:line given, print the enclosing named function, its line
// range, the line of its last hook call (in its own scope) and its first
// return. Read-only; uses the tree's own lint-scan parser.
// usage: node cv2-enclosing.mjs <tree> <file:line> ...
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [tree, ...sites] = process.argv.slice(2);
const L = await import(pathToFileURL(join(tree, 'tools/lib/lint-scan.mjs')).href);
const { parseSource, readSource, walk, isFunction } = L;
const nameOf = (parents, i) => {
  const p = parents[i];
  if (p.type === 'FunctionDeclaration' && p.id) return p.id.name;
  const q = parents[i - 1];
  if (q && q.type === 'VariableDeclarator' && q.id.type === 'Identifier') return q.id.name;
  if (q && (q.type === 'ObjectProperty' || q.type === 'ObjectMethod')) return '(prop ' + (q.key.name || q.key.value) + ')';
  if (p.type === 'ObjectMethod') return '(method ' + (p.key.name || p.key.value) + ')';
  return null;
};
const isHook = n => n.type === 'CallExpression' && ((n.callee.type === 'Identifier' && /^use[A-Z]/.test(n.callee.name)) ||
  (n.callee.type === 'MemberExpression' && n.callee.property.type === 'Identifier' && /^use[A-Z]/.test(n.callee.property.name)));
for (const s of sites) {
  const i = s.lastIndexOf(':'); const rel = s.slice(0, i), line = +s.slice(i + 1);
  const code = readSource(tree, rel); const ast = parseSource(code);
  let best = null;
  walk(ast.program, (n, parents) => {
    if (n.loc && n.loc.start.line <= line && n.loc.end.line >= line && isFunction(n)) {
      const chain = [...parents, n];
      const named = [];
      for (let k = chain.length - 1; k >= 0; k--) if (isFunction(chain[k])) { const nm = nameOf(chain, k); named.push([nm, chain[k]]); }
      best = named;
    }
  });
  const out = (best || []).map(([nm, fn]) => {
    let lastHook = 0; const rets = [];
    walk(fn.body, (n) => {
      if (n !== fn.body && isFunction(n)) return false;
      if (isHook(n)) lastHook = Math.max(lastHook, n.loc.start.line);
      if (n.type === 'ReturnStatement') rets.push(n.loc.start.line);
    });
    return `${nm || '(anon)'} ${fn.loc.start.line}-${fn.loc.end.line} lastHook:${lastHook} returns:${rets.join(',')}`;
  });
  console.log(s + '\n   ' + out.join('\n   '));
}
