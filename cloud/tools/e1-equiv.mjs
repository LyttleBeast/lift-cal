// E1 scratch check: rack.css + auth.css in a tree resolve, rule for rule and
// declaration for declaration, to what 928a65e's do. var() is substituted on
// both sides (from :root, then from the rule's own custom properties, to a
// fixed point), colours are canonicalised to rgba numbers, whitespace and
// leading zeros normalised. Anything left different is printed.
//   node e1-equiv.mjs <tree> [base-sha]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const TREE = process.argv[2];
const BASE = process.argv[3] || '928a65e';
const show = f => execFileSync('git', ['-C', TREE, 'show', `${BASE}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
const now = f => readFileSync(join(process.env.NOW_DIR || TREE, f), 'utf8');   // NOW_DIR: a canary copy

function parse(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const rules = [];
  const block = from => { let d = 0; for (let j = from; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) return j; } } return src.length; };
  const walk = (s, e, ctx) => {
    let k = s;
    while (k < e) {
      const open = src.indexOf('{', k); if (open < 0 || open >= e) break;
      const head = src.slice(k, open).trim().replace(/^;+/, '').trim().replace(/\s+/g, ' ');
      const close = block(open);
      if (/^@(media|supports|keyframes)/.test(head)) walk(open + 1, close, (ctx ? ctx + ' ' : '') + head);
      else {
        const decls = [];
        // split on ; outside parens
        let depth = 0, cur = '';
        for (const ch of src.slice(open + 1, close)) {
          if (ch === '(') depth++; else if (ch === ')') depth--;
          if (ch === ';' && !depth) { decls.push(cur); cur = ''; } else cur += ch;
        }
        decls.push(cur);
        const out = [];
        for (const d of decls) { const c = d.indexOf(':'); if (c < 0) continue; out.push([d.slice(0, c).trim(), d.slice(c + 1).trim().replace(/\s+/g, ' ')]); }
        rules.push({ ctx, sel: head, decls: out });
      }
      k = close + 1;
    }
  };
  walk(0, src.length, '');
  return rules;
}

function rootOf(rules) { const r = {}; for (const x of rules) if (x.sel === ':root' && !x.ctx) for (const [p, v] of x.decls) if (p.startsWith('--')) r[p] = v; return r; }

function resolve(v, env) {
  for (let i = 0; i < 10; i++) {
    const nv = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (all, n, fb) => (n in env ? env[n] : fb !== undefined ? fb.trim() : all));
    if (nv === v) break; v = nv;
  }
  return v;
}
const hex2 = h => { h = h.slice(1); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function canon(v) {
  v = v.toLowerCase();
  v = v.replace(/#[0-9a-f]{3,6}\b/g, h => `rgba(${hex2(h).join(',')},1)`);
  v = v.replace(/rgba?\(([^()]*)\)/g, (all, inner) => {
    const p = inner.split(',').map(s => s.trim());
    if (p.length < 3) return all;
    const a = p[3] === undefined ? 1 : +p[3];
    return `rgba(${+p[0]},${+p[1]},${+p[2]},${a})`;
  });
  v = v.replace(/(^|[^\d.])0+(\.\d)/g, '$1$2');
  v = v.replace(/\s*([,()])\s*/g, '$1').replace(/\s+/g, ' ').trim();
  return v;
}

let diffs = 0, compared = 0;
const report = [];
for (const f of ['rack.css', 'auth.css']) {
  const A = parse(show(f)), B = parse(now(f));
  const rootA = rootOf(f === 'rack.css' ? A : parse(show('rack.css')));
  const rootB = rootOf(f === 'rack.css' ? B : parse(now('rack.css')));
  if (A.length !== B.length) { report.push(`${f}: ${A.length} rules at base, ${B.length} now`); diffs++; }
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    const a = A[i], b = B[i];
    if (a.sel !== b.sel || a.ctx !== b.ctx) { report.push(`${f} rule ${i}: selector "${a.ctx} ${a.sel}" became "${b.ctx} ${b.sel}"`); diffs++; continue; }
    const isRoot = a.sel === ':root' && !a.ctx;
    const da = a.decls.filter(([p]) => !(isRoot && p.startsWith('--')));
    const db = b.decls.filter(([p]) => !(isRoot && p.startsWith('--')));
    if (da.length !== db.length) { report.push(`${f} ${a.sel}: ${da.length} declarations at base, ${db.length} now`); diffs++; continue; }
    const envA = { ...rootA, ...Object.fromEntries(a.decls.filter(([p]) => p.startsWith('--'))) };
    const envB = { ...rootB, ...Object.fromEntries(b.decls.filter(([p]) => p.startsWith('--'))) };
    for (let j = 0; j < da.length; j++) {
      compared++;
      const [pa, va] = da[j], [pb, vb] = db[j];
      const ra = canon(resolve(va, envA)), rb = canon(resolve(vb, envB));
      if (pa !== pb || ra !== rb) { diffs++; report.push(`${f} ${a.ctx ? a.ctx + ' ' : ''}${a.sel} { ${pa}: ${va} }  ->  { ${pb}: ${vb} }\n      base: ${ra}\n      now:  ${rb}`); }
    }
  }
  // the :root tokens that existed at base keep their values
  for (const [k, v] of Object.entries(rootA)) { compared++; if (rootB[k] !== v) { diffs++; report.push(`${f === 'rack.css' ? '' : '(via rack.css) '}:root ${k}: "${v}" became "${rootB[k]}"`); } }
}
const line1 = (t) => t.split('\n')[0];
compared++;
if (line1(show('rack.css')) !== line1(now('rack.css'))) { diffs++; report.push('rack.css line 1 changed'); }
console.log(report.join('\n'));
console.log(`\n${compared} declarations compared, ${diffs} differences`);
process.exit(diffs ? 1 : 0);
