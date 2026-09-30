#!/usr/bin/env node
/* rev1-free — every free (undeclared) name each engine-changed file reads, set
 * against the same file at 1cb6498. A name the engine reads that nothing
 * declares is a ReferenceError on whatever path reaches it — and a path no
 * snapshot scene draws would never show it. (Pnat reviewer, coverage lens.)
 *
 * usage: node rev1-free.mjs <engine tree>
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const [ENG] = process.argv.slice(2);
const req = createRequire(join(ENG, 'package.json'));
const { parse } = req('@babel/parser');
const traverse = req('@babel/traverse').default;

const git = (...a) => execFileSync('git', ['-C', ENG, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const files = git('diff', '--name-only', '1cb6498..HEAD', '--', 'app', 'src').split('\n').filter(f => /\.(js|jsx)$/.test(f));

function globalsOf(code) {
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const out = new Map();
  traverse(ast, {
    Program(p) {
      for (const [name, node] of Object.entries(p.scope.globals)) out.set(name, node.loc ? node.loc.start.line : '?');
    }
  });
  // JSX element names that are identifiers and not bound (e.g. <Foo/> with Foo unimported)
  traverse(ast, {
    JSXOpeningElement(p) {
      const n = p.node.name;
      if (n.type === 'JSXIdentifier' && /^[A-Z]/.test(n.name) && !p.scope.hasBinding(n.name)) out.set(n.name, n.loc.start.line);
      if (n.type === 'JSXMemberExpression') {
        let o = n; while (o.object) o = o.object;
        if (o.type === 'JSXIdentifier' && !p.scope.hasBinding(o.name)) out.set(o.name, o.loc.start.line);
      }
    }
  });
  return out;
}

let bad = 0;
for (const f of files) {
  let base = null;
  try { base = git('show', '1cb6498:' + f); } catch {}
  const eng = readFileSync(join(ENG, f), 'utf8');
  const ge = globalsOf(eng), gb = base ? globalsOf(base) : new Map();
  const added = [...ge].filter(([n]) => !gb.has(n));
  if (added.length) { bad++; console.log(f + ': new free names ' + added.map(([n, l]) => n + '@' + l).join(', ')); }
}
console.log(files.length + ' files checked; ' + bad + ' with a free name build 58 did not read');
