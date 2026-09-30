#!/usr/bin/env node
/* r2-card-children — Pnat round-2 coverage reviewer's scratch tool.
 * Card.jsx at the engine draws `{heroPhoto(photo)}{children}` where build 58
 * drew `{children}`, so Card's host View now holds [null, children]: when
 * `children` is an ARRAY it becomes a nested array (a Fragment fiber at index
 * 1) instead of the View's own child list. The two reconcile the same while
 * `children` keeps its shape; they differ only when one Card's children flip
 * between a single element and an array across renders. This lists every
 * <Card> use whose children are ONE expression container (the only JSX shape
 * whose array-ness can change at run time), with the expression, so each can
 * be judged. usage: node r2-card-children.mjs <tree> */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const tree = process.argv[2];
const req = createRequire(join(tree, 'package.json'));
const { parse } = req('@babel/parser');
const traverse = req('@babel/traverse').default;
const files = execFileSync('git', ['-C', tree, 'ls-files', '--', 'app', 'src'], { encoding: 'utf8' }).split('\n').filter(f => /\.jsx?$/.test(f));
let uses = 0; const one = [];
for (const f of files) {
  const code = readFileSync(join(tree, f), 'utf8');
  if (!/<Card[\s>]/.test(code)) continue;
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch { continue; }
  traverse(ast, {
    JSXElement(p) {
      const n = p.node.openingElement.name;
      if (n.type !== 'JSXIdentifier' || n.name !== 'Card') return;
      uses++;
      const kids = p.node.children.filter(c => !(c.type === 'JSXText' && !c.value.trim()));
      const real = kids.filter(c => !(c.type === 'JSXExpressionContainer' && c.expression.type === 'JSXEmptyExpression'));
      if (real.length === 1 && real[0].type === 'JSXExpressionContainer') {
        one.push(f + ':' + p.node.loc.start.line + '  {' + code.slice(real[0].expression.start, real[0].expression.end).replace(/\s+/g, ' ').slice(0, 220) + '}');
      }
    }
  });
}
console.log(uses + ' <Card> uses; ' + one.length + ' with a single expression child:');
one.forEach(x => console.log('  ' + x));
