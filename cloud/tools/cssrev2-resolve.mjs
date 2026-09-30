// cssrev2-resolve.mjs <baseTree> <engineTree> [file ...]
// Independent static resolver for the Pweb css-lens review, round 2.
// Parses each stylesheet into (context, selector, [decls]) in source order,
// resolves var() against that file set's :root (recursively, with fallbacks),
// canonicalises colours/numbers/whitespace, then compares base vs engine rule by
// rule and declaration by declaration, in order. It also reports what a
// literal->var() rewrite can change even when the substituted text is equal:
//   - a declaration invalid at parse time in base (dropped, the earlier one
//     wins) becomes invalid at computed-value time with var() (-> unset);
//   - duplicate properties in one block where a later one gained var();
//   - var() inside places it does not work (media queries, url(), @import,
//     selectors, @font-face, @supports conditions);
//   - tokens the engine declares that are also set on elements (inheritance).
import fs from 'node:fs';
import path from 'node:path';

const [baseTree, engTree, ...files0] = process.argv.slice(2);
const files = files0.length ? files0 : ['rack.css', 'auth.css'];

function stripComments(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) { out += c; if (c === '\\') { out += s[i + 1] ?? ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) throw new Error('unterminated comment'); out += ' '; i = e + 2; continue; }
    out += c; i++;
  }
  return out;
}

// Returns a flat list of rules: {ctx:[preludes], sel, decls:[{prop,value,imp,raw}], line}
function parse(src, file) {
  const s = stripComments(src);
  const rules = [], stmts = [];
  let i = 0;
  const lineAt = (k) => src.slice(0, k).split('\n').length; // approximate (comments replaced by ' ')
  function readUntil(stops) {
    let buf = '', q = null, depth = 0;
    while (i < s.length) {
      const c = s[i];
      if (q) { buf += c; if (c === '\\') { buf += s[i + 1]; i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; buf += c; i++; continue; }
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (depth === 0 && stops.includes(c)) return [buf, c];
      buf += c; i++;
    }
    return [buf, null];
  }
  function block(ctx) {
    for (;;) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i >= s.length) return;
      if (s[i] === '}') { i++; return; }
      const start = i;
      const [pre, stop] = readUntil(['{', ';', '}']);
      const prelude = pre.trim().replace(/\s+/g, ' ');
      if (stop === ';') { i++; stmts.push({ ctx: [...ctx], text: prelude }); continue; }
      if (stop === '}') { if (prelude) throw new Error(file + ': stray text ' + prelude); i++; return; }
      if (stop === null) throw new Error(file + ': eof in prelude');
      i++; // past {
      if (prelude.startsWith('@') && !/^@(font-face|page)/.test(prelude)) {
        block([...ctx, prelude]);
      } else {
        // declaration block; detect nesting
        const decls = [];
        for (;;) {
          while (i < s.length && /\s/.test(s[i])) i++;
          if (s[i] === '}') { i++; break; }
          const [d, st] = readUntil([';', '}', '{']);
          if (st === '{') throw new Error(file + ': nested rule inside ' + prelude + ' near line ' + lineAt(start));
          const t = d.trim();
          if (t) {
            const k = t.indexOf(':');
            if (k < 0) decls.push({ prop: '?', value: t, imp: false, raw: t, bad: 'no colon' });
            else {
              let prop = t.slice(0, k).trim();
              let value = t.slice(k + 1).trim();
              let imp = false;
              const m = value.match(/!\s*important\s*$/i);
              if (m) { imp = true; value = value.slice(0, m.index).trim(); }
              decls.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, imp, raw: t });
            }
          }
          if (st === ';') i++;
          else if (st === '}') { i++; break; }
          else break;
        }
        rules.push({ ctx: [...ctx], sel: prelude, decls, line: lineAt(start) });
      }
    }
  }
  block([]);
  return { rules, stmts };
}

// ---- value canonicalisation ----
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0], red: [255, 0, 0, 1] };
function hexTo(h) {
  h = h.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}
const fmt = (n) => { const x = +n; return Number.isInteger(x) ? String(x) : String(+x.toFixed(6)); };
function col(c) { return `rgba(${fmt(c[0])},${fmt(c[1])},${fmt(c[2])},${fmt(c[3])})`; }
function canon(v) {
  let s = v.replace(/\s+/g, ' ').trim();
  // protect strings
  const strs = [];
  s = s.replace(/"[^"]*"|'[^']*'/g, (m) => { strs.push(m.slice(1, -1)); return `\u0000${strs.length - 1}\u0000`; });
  s = s.toLowerCase();
  s = s.replace(/\s*([(),\/])\s*/g, '$1');
  s = s.replace(/#[0-9a-f]{3,8}\b/g, (h) => ([3, 4, 6, 8].includes(h.length - 1) ? col(hexTo(h)) : h));
  s = s.replace(/\brgba?\(([^()]*)\)/g, (m, inner) => {
    let parts = inner.includes(',') ? inner.split(',') : inner.replace('/', ' / ').split(/\s+/).filter(x => x && x !== '/');
    parts = parts.map(p => p.trim());
    if (parts.length < 3 || parts.some(p => !/^-?[\d.]+%?$/.test(p))) return m;
    const nums = parts.map((p, k) => p.endsWith('%') ? (k < 3 ? parseFloat(p) * 2.55 : parseFloat(p) / 100) : parseFloat(p));
    if (nums.length === 3) nums.push(1);
    return col(nums);
  });
  s = s.replace(/(^|[\s(,])(white|black|transparent)(?=$|[\s),])/g, (m, pre, n) => pre + col(NAMED[n]));
  // numbers: .5 -> 0.5, 0.50 -> 0.5, 1.0 -> 1
  s = s.replace(/(^|[^\w.#-])(-?)(\d*\.\d+|\d+)(?=[a-z%]|\b|$)/g, (m, pre, sign, n) => pre + sign + fmt(parseFloat(n)));
  s = s.replace(/\u0000(\d+)\u0000/g, (m, k) => `"${strs[+k]}"`);
  return s;
}

function rootMap(parsed) {
  const map = new Map();
  for (const r of parsed.rules) if (r.ctx.length === 0 && r.sel === ':root') for (const d of r.decls) if (d.prop.startsWith('--')) map.set(d.prop, d.value);
  return map;
}
function findVar(s, from = 0) { const k = s.indexOf('var(', from); if (k < 0) return null; let depth = 0; for (let j = k + 3; j < s.length; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') { depth--; if (depth === 0) return [k, j + 1]; } } throw new Error('unbalanced var in ' + s); }
function resolve(value, root, seen = new Set(), notes = []) {
  let out = value, from = 0;
  for (let guard = 0; guard < 500; guard++) {
    const f = findVar(out, from);
    if (!f) break;
    const inner = out.slice(f[0] + 4, f[1] - 1);
    const c = inner.indexOf(',');
    const name = (c < 0 ? inner : inner.slice(0, c)).trim();
    const fb = c < 0 ? null : inner.slice(c + 1);
    let rep;
    if (root.has(name) && !seen.has(name)) { rep = resolve(root.get(name), root, new Set([...seen, name]), notes); notes.push(name); }
    else if (fb !== null) { rep = resolve(fb, root, seen, notes); notes.push(name + '(fallback)'); }
    else { from = f[1]; notes.push(name + '(unresolved)'); continue; }
    out = out.slice(0, f[0]) + rep + out.slice(f[1]);
    from = f[0];
  }
  return out;
}

function load(tree) {
  const out = {};
  for (const f of files) {
    const p = path.join(tree, f);
    out[f] = parse(fs.readFileSync(p, 'utf8'), f);
  }
  return out;
}
const A = load(baseTree), B = load(engTree);
// :root is shared across rack.css + auth.css (both linked by index.html)
const rootA = new Map(), rootB = new Map();
for (const f of files) { for (const [k, v] of rootMap(A[f])) rootA.set(k, v); for (const [k, v] of rootMap(B[f])) rootB.set(k, v); }

const report = { differences: [], ruleOrder: [], tokenised: [], rootChanged: [], dupWithVar: [], varInBadPlace: [], stats: {} };

// custom props present in base :root: any value change?
for (const [k, v] of rootA) {
  if (!rootB.has(k)) report.rootChanged.push({ k, base: v, eng: '(absent)' });
  else if (canon(resolve(v, rootA)) !== canon(resolve(rootB.get(k), rootB))) report.rootChanged.push({ k, base: v, eng: rootB.get(k) });
}
const newTokens = [...rootB.keys()].filter(k => !rootA.has(k));
report.stats.newTokens = newTokens.length;

function key(r) { return r.ctx.join(' >> ') + ' || ' + r.sel.replace(/\s+/g, ' '); }
function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let x = n - 1; x >= 0; x--) for (let y = m - 1; y >= 0; y--) dp[x][y] = a[x] === b[y] ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
  const pairs = []; let x = 0, y = 0;
  while (x < n && y < m) { if (a[x] === b[y]) { pairs.push([x, y]); x++; y++; } else if (dp[x + 1][y] >= dp[x][y + 1]) x++; else y++; }
  return pairs;
}

let declsCompared = 0, declsTokenised = 0;
for (const f of files) {
  const ra = A[f].rules.filter(r => !(r.ctx.length === 0 && r.sel === ':root'));
  const rb = B[f].rules.filter(r => !(r.ctx.length === 0 && r.sel === ':root'));
  const ka = ra.map(key), kb = rb.map(key);
  const pairs = lcs(ka, kb);
  const ma = new Set(pairs.map(p => p[0])), mb = new Set(pairs.map(p => p[1]));
  ra.forEach((r, x) => { if (!ma.has(x)) report.ruleOrder.push({ f, side: 'base-only', key: ka[x], line: r.line }); });
  rb.forEach((r, y) => { if (!mb.has(y)) report.ruleOrder.push({ f, side: 'engine-only', key: kb[y], line: r.line }); });
  // statements (@import etc.)
  const sa = A[f].stmts.map(s => s.ctx.join('>>') + s.text), sb = B[f].stmts.map(s => s.ctx.join('>>') + s.text);
  if (JSON.stringify(sa) !== JSON.stringify(sb)) report.differences.push({ f, what: 'statements', base: sa, eng: sb });
  for (const [x, y] of pairs) {
    const a = ra[x], b = rb[y];
    // custom properties declared outside :root
    const da = a.decls, db = b.decls;
    const la = da.map(d => d.prop + (d.imp ? '!' : '')), lb = db.map(d => d.prop + (d.imp ? '!' : ''));
    if (la.join('|') !== lb.join('|')) { report.differences.push({ f, rule: ka[x], lineA: a.line, lineB: b.line, what: 'property list/order/importance', base: la, eng: lb }); continue; }
    const propsSeen = new Map();
    for (let k = 0; k < da.length; k++) {
      declsCompared++;
      const notesA = [], notesB = [];
      const va = canon(resolve(da[k].value, rootA, new Set(), notesA)), vb = canon(resolve(db[k].value, rootB, new Set(), notesB));
      const tok = da[k].value !== db[k].value;
      if (tok) { declsTokenised++; report.tokenised.push({ f, rule: ka[x], lineB: b.line, prop: db[k].prop, imp: db[k].imp, base: da[k].value, eng: db[k].value, resolved: vb, same: va === vb, unresolvedB: notesB.filter(n => n.includes('unresolved') || n.includes('fallback')) }); }
      if (va !== vb) report.differences.push({ f, rule: ka[x], lineA: a.line, lineB: b.line, prop: da[k].prop, base: da[k].value, eng: db[k].value, resolvedA: va, resolvedB: vb });
      if (propsSeen.has(db[k].prop) && /var\(/.test(db[k].value) && !/var\(/.test(da[k].value)) report.dupWithVar.push({ f, rule: ka[x], prop: db[k].prop, earlier: propsSeen.get(db[k].prop), eng: db[k].value });
      propsSeen.set(db[k].prop, db[k].value);
    }
  }
  // var() in contexts where it never works
  for (const r of B[f].rules) {
    if (/var\(/.test(r.sel) || r.ctx.some(c => /var\(/.test(c) && !c.startsWith('@keyframes'))) report.varInBadPlace.push({ f, where: 'selector/prelude', key: key(r) });
    for (const d of r.decls) if (/url\([^)]*var\(/.test(d.value) || (/^@font-face/.test(r.sel) && /var\(/.test(d.value))) report.varInBadPlace.push({ f, where: 'url()/font-face', key: key(r), d: d.raw });
  }
  for (const s of B[f].stmts) if (/var\(/.test(s.text)) report.varInBadPlace.push({ f, where: 'statement', text: s.text });
}
report.stats.declsCompared = declsCompared;
report.stats.declsTokenised = declsTokenised;
report.stats.rules = Object.fromEntries(files.map(f => [f, [A[f].rules.length, B[f].rules.length]]));
const outDir = '/Users/micahflunker/dev/vibes-night/proof/cssrev2';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'resolve.json'), JSON.stringify({ report, newTokens, rootB: Object.fromEntries(rootB) }, null, 1));
console.log(JSON.stringify({ stats: report.stats, differences: report.differences.length, ruleOrder: report.ruleOrder, rootChanged: report.rootChanged, dupWithVar: report.dupWithVar, varInBadPlace: report.varInBadPlace }, null, 1));
for (const d of report.differences.slice(0, 60)) console.log('DIFF', JSON.stringify(d));
