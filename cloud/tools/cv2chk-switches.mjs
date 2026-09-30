import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/rack-mobile/package.json');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const WT = '/Users/micahflunker/dev/vibes-night/wt/nat-cv2';
const BASE = 'cb47196';
const git = (...a) => execFileSync('git', ['-C', WT, ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
const files = git('diff', '--name-only', BASE, 'HEAD').trim().split('\n').filter(f => /\.(jsx|js)$/.test(f) && /^(src\/ui|app)\//.test(f) && !/variant\.js$|theme\.js$/.test(f));
const { VARIANTS } = await (async () => {
  const src = readFileSync(WT + '/src/ui/variant.js', 'utf8');
  const m = src.match(/export const VARIANTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  const out = {};
  for (const l of m[1].split('\n')) { const k = l.match(/^\s*(\w+):\s*Object\.freeze\(\[(.*)\]\)/); if (k) out[k[1]] = k[2].split(',').map(s => s.trim().replace(/'/g, '')); }
  return { VARIANTS: out };
})();
const allowed = [
  /^\s*$/, /^\s*\/\*/, /^\s*\*/, /^\s*\/\//, /^[^\n]*\*\/\s*$/,
  /^\s*switch \(variantOf\('\w+'\)\) \{$/, /^\s*case 'v1':$/, /^\s*default:$/, /^\s*break;$/, /^\s*\}$/,
  /^import \{ variantOf \} from '[./]*(src\/ui\/|ui\/)?variant';$/, /^import \{ variantOf \} from '[^']*variant';$/,
];
let bad = 0, total = 0;
const perBlock = {};
for (const f of files) {
  const d = git('diff', '-U0', BASE, 'HEAD', '--', f);
  const lines = d.split('\n');
  let inComment = false;
  for (const l of lines) {
    if (l.startsWith('+++') || l.startsWith('---')) continue;
    if (l.startsWith('-')) { if (!/^-\s*(\/\/ accepts|\* VARIANTS\.statRow)/.test(l)) { console.log('DELETION', f, l); bad++; } continue; }
    if (!l.startsWith('+')) continue;
    const t = l.slice(1);
    if (inComment) { if (t.includes('*/')) inComment = false; continue; }
    if (/^\s*\/\*/.test(t) && !t.includes('*/')) { inComment = true; continue; }
    if (!allowed.some(r => r.test(t))) { console.log('ODD ADD', f, JSON.stringify(t)); bad++; }
  }
  // AST: every switch on variantOf
  const src = readFileSync(WT + '/' + f, 'utf8');
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  traverse(ast, {
    SwitchStatement(p) {
      const disc = p.node.discriminant;
      if (!(disc.type === 'CallExpression' && disc.callee.name === 'variantOf')) return;
      total++;
      const block = disc.arguments[0].value;
      const fn = p.getFunctionParent();
      const fname = fn.node.id?.name || fn.parentPath.node.id?.name || fn.parentPath.node.key?.name || '(anon@' + fn.node.loc.start.line + ')';
      (perBlock[block] ||= []).push(f + ' ' + fname);
      // cases
      const cs = p.node.cases.map(c => (c.test ? c.test.value : 'default') + ':' + c.consequent.map(s => s.type).join(','));
      if (JSON.stringify(cs) !== JSON.stringify(['v1:', 'default:BreakStatement'])) { console.log('CASES', f, fname, block, cs); }
      // accepts comment
      const cm = (p.node.cases[0].leadingComments || []).map(c => c.value).join('|');
      const acc = cm.match(/accepts ([^(]*)/);
      const want = (VARIANTS[block] || []).join(' | ');
      if (!acc || acc[1].trim() !== want) console.log('ACCEPTS', f, fname, block, JSON.stringify(acc && acc[1].trim()), 'want', want);
      if (!VARIANTS[block]) console.log('UNKNOWN BLOCK', f, block);
      // hooks after the switch in the same function (not nested functions)
      const swEnd = p.node.end;
      const hooksAfter = [];
      fn.traverse({
        Function(q) { q.skip(); },
        CallExpression(q) {
          const c = q.node.callee;
          const n = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property.name) || '';
          if (/^use[A-Z0-9]/.test(n) && q.node.start > swEnd) hooksAfter.push(n + '@' + q.node.loc.start.line);
        }
      });
      // is the switch a direct statement of the function body (top level)?
      const topLevel = p.parentPath.parentPath === fn || p.parentPath.node === fn.node.body;
      if (hooksAfter.length || !topLevel) console.log('PLACEMENT', f, fname, block, 'line', p.node.loc.start.line, 'hooksAfter', hooksAfter, 'topLevel', topLevel);
    }
  });
}
console.log('bad', bad, 'switches', total);
for (const [b, s] of Object.entries(perBlock)) console.log(b, s.length, JSON.stringify(s));
