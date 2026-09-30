// Round-3: every STRING LITERAL / template chunk in the engine's app/, src/ui,
// src/state and src/pure that names a colour (copy a vibe cannot change),
// with file:line, so each can be matched to the role the thing it names draws.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
const ROOT = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const require = createRequire('/Users/micahflunker/dev/rack-mobile/package.json');
const { parse } = require('@babel/parser');
const HUE = /\b(yellow|green|red|blue|amber|white|grey|gray|orange|gold|black|chalk|colou?red)\b/i;
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === 'node_modules') continue; const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(f)) files.push(p); } };
['app', 'src'].forEach(d => walk(join(ROOT, d)));
const out = [];
for (const f of files) {
  const code = readFileSync(f, 'utf8');
  let ast;
  try { ast = parse(code, { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { out.push('PARSE ' + f + ' ' + e.message); continue; }
  const visit = n => {
    if (!n || typeof n.type !== 'string') return;
    let s = null;
    if (n.type === 'StringLiteral') s = n.value;
    else if (n.type === 'TemplateElement') s = n.value.cooked;
    else if (n.type === 'JSXText') s = n.value;
    if (s && HUE.test(s) && !/^#|^rgba?\(/.test(s) && s.trim().includes(' ')) out.push(relative(ROOT, f) + ':' + n.loc.start.line + '  ' + s.replace(/\s+/g, ' ').trim().slice(0, 200));
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(ast.program);
}
console.log(out.join('\n'));
