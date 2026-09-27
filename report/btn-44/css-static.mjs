// The stylesheets, compared as text with every var() resolved: the half of the
// proof that no scene has to reach. prove.mjs runs it on the bytes each port
// serves (the stylesheets index.html links, and index.html's own <style>s).
//
// Why: a computed style is measured only where an element is on the page, in
// the state it is in, at the frame captured, for the properties Chrome knows.
// That leaves rules no scene renders, :active / :focus rules, @keyframes frames
// other than the one captured, @media blocks no capture is inside (min-width:
// 900px, prefers-reduced-motion: reduce), and declarations Chrome drops at
// parse time — -webkit-backdrop-filter, which is the one iOS Safari paints the
// dock and the workout bar with. Here every declaration of every rule is
// compared, after resolution, rule by rule, and in order: the rules in each
// file, and the declarations in each rule (border then border-color is not
// border-color then border — the later one wins).
//
// Resolution: a var() takes the rule's own custom property if it declares one,
// else the one :root declares (top level, outside any at-rule), else its
// fallback; otherwise it stays as var(--name), so it still has to be spelled
// the same on both sides. Custom property names keep their case (--a and --A
// are two properties). Values are compared after normalisation, and only what
// CSS itself does not tell apart is normalised: whitespace, the spacing around
// , / ( ), a leading zero (rgba(240,190,30,.28) = rgba(240, 190, 30, 0.28)),
// and the case of hex colours, function names, units and !important. Strings
// and url() bodies are kept byte for byte (case and inner whitespace both
// render), and identifiers keep their case (an animation, counter or grid-area
// name is case-sensitive; a keyword whose case alone changed is counted, which
// errs toward "different").
// :root's custom properties: every token A declares must resolve to the same
// value in B; tokens only B declares are the engine's own and are listed, not
// counted. A stylesheet only one side links has to be scoped under
// [data-vibe="<id>"] rule by rule, and may not reuse a @keyframes name or a
// @font-face family the other side declares.
//
// No npm, no browser: a small tokenizer that knows strings, comments and
// nesting, which is all rack.css and auth.css use.

export function parseCss(src) {
  src = stripComments(src);
  const rules = [], stack = [];
  let buf = '', i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'") { const j = endOfString(src, i); buf += src.slice(i, j); i = j; continue; }
    if (ch === '(') { const j = endOfParens(src, i); buf += src.slice(i, j); i = j; continue; }
    if (ch === '{') {
      const prelude = squash(buf);
      buf = ''; i++;
      if (isGroupingAt(prelude)) { stack.push(prelude); continue; }
      // A rule (style rule, keyframe, @font-face, …): its body up to the matching '}'.
      let depth = 0, j = i;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === '"' || c === "'") { j = endOfString(src, j) - 1; continue; }
        if (c === '{') depth++;
        else if (c === '}') { if (depth === 0) break; depth--; }
      }
      rules.push({ ctx: stack.slice(), sel: prelude, decls: splitDecls(src.slice(i, j)) });
      i = j + 1; continue;
    }
    if (ch === '}') { stack.pop(); buf = ''; i++; continue; }
    if (ch === ';' && !stack.length) { const at = squash(buf); if (at) rules.push({ ctx: [], sel: at, decls: [] }); buf = ''; i++; continue; }
    buf += ch; i++;
  }
  return rules;
}
const isGroupingAt = p => /^@(media|supports|layer|container|document|-moz-document|keyframes|-webkit-keyframes)\b/i.test(p) || /^@scope\b/i.test(p);
const squash = s => s.trim().replace(/\s+/g, ' ');
// f applied to the text outside quoted strings; the strings kept as they are.
function outsideStrings(s, f) {
  let out = '', buf = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'") { out += f(buf); buf = ''; const j = endOfString(s, i); out += s.slice(i, j); i = j; continue; }
    buf += ch; i++;
  }
  return out + f(buf);
}
// A value's whitespace squashed outside its strings ("a  b" keeps its two spaces).
const squashValue = s => outsideStrings(s.trim(), t => t.replace(/\s+/g, ' '));
function stripComments(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'") { const j = endOfString(s, i); out += s.slice(i, j); i = j; continue; }
    if (ch === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); i = j < 0 ? s.length : j + 2; out += ' '; continue; }
    out += ch; i++;
  }
  return out;
}
function endOfString(s, i) {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) { if (s[j] === '\\') { j++; continue; } if (s[j] === q) return j + 1; }
  return s.length;
}
function endOfParens(s, i) {
  let d = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'") { j = endOfString(s, j) - 1; continue; }
    if (c === '(') d++;
    else if (c === ')') { d--; if (!d) return j + 1; }
  }
  return s.length;
}
// A property's name: lower case (CSS folds it), except a custom property's,
// which is case-sensitive.
const propName = p => (p.startsWith('--') ? p : p.toLowerCase());
function splitDecls(body) {
  const out = [];
  let cur = '', i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '"' || ch === "'") { const j = endOfString(body, i); cur += body.slice(i, j); i = j; continue; }
    if (ch === '(') { const j = endOfParens(body, i); cur += body.slice(i, j); i = j; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map(d => {
    const k = d.indexOf(':');
    return k < 0 ? [squashValue(d), ''] : [propName(d.slice(0, k).trim()), squashValue(d.slice(k + 1))];
  });
}

export function resolveVars(v, vars, depth = 0) {
  if (depth > 24 || !v.includes('var(')) return v;
  let out = '', i = 0;
  while (i < v.length) {
    const j = v.indexOf('var(', i);
    if (j < 0) { out += v.slice(i); break; }
    out += v.slice(i, j);
    const k = endOfParens(v, j + 3);
    const inner = v.slice(j + 4, k - 1);
    let c = -1, d = 0;
    for (let x = 0; x < inner.length; x++) { if (inner[x] === '(') d++; else if (inner[x] === ')') d--; else if (inner[x] === ',' && !d) { c = x; break; } }
    const name = (c < 0 ? inner : inner.slice(0, c)).trim(), fb = c < 0 ? null : inner.slice(c + 1).trim();
    const got = vars.has(name) ? vars.get(name) : fb !== null ? fb : null;
    out += got === null ? 'var(' + name + ')' : resolveVars(got, vars, depth + 1);
    i = k;
  }
  return out;
}
// Outside strings and url(): whitespace, the spacing around , / ( ), a leading
// zero, and the case of hex colours, function names and units. Identifiers
// keep their case.
const normPlain = t => t.replace(/\s*,\s*/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ')
  .replace(/(^|[^\w.])0+(\.\d)/g, '$1$2')
  .replace(/#[0-9a-f]{3,8}(?![\w-])/gi, h => h.toLowerCase())
  .replace(/(^|[^\w-])(-?[a-z_][\w-]*)\(/gi, (m, pre, f) => pre + f.toLowerCase() + '(')
  .replace(/(^|[^\w.#-])([+-]?(?:\d+\.?\d*|\.\d+))([a-z]+)(?![\w-])/gi, (m, pre, num, unit) => pre + num + unit.toLowerCase());
export function normValue(v) {
  let s = String(v), imp = false;
  const m = s.match(/\s*!\s*important\s*$/i);
  if (m) { imp = true; s = s.slice(0, m.index); }
  let out = '', buf = '', i = 0;
  const flush = () => { out += normPlain(buf); buf = ''; };
  while (i < s.length) {
    const ch = s[i];
    // A string: byte for byte.
    if (ch === '"' || ch === "'") { flush(); const j = endOfString(s, i); out += s.slice(i, j); i = j; continue; }
    // url(…): the function name folded, its body byte for byte (trimmed).
    if ((ch === 'u' || ch === 'U') && /^url\(/i.test(s.slice(i, i + 4)) && !/[\w-]/.test(s[i - 1] || '')) {
      flush();
      const j = endOfParens(s, i + 3);
      out += 'url(' + s.slice(i + 4, j - 1).trim() + ')';
      i = j; continue;
    }
    buf += ch; i++;
  }
  flush();
  out = out.trim();
  return imp ? out + ' !important' : out;
}
const normSel = s => s.replace(/\s*([>+~,])\s*/g, '$1').replace(/\s+/g, ' ').trim();

// A stylesheet's own :root custom properties (top level, outside any at-rule).
export function rootOf(text) {
  const root = new Map();
  for (const r of parseCss(text)) if (!r.ctx.length && normSel(r.sel) === ':root') for (const [k, v] of r.decls) if (k.startsWith('--')) root.set(k, v);
  return root;
}
// One stylesheet's rules keyed by where they sit (file, at-rule context,
// selector, and which occurrence of that key), with each declaration resolved
// against `rootAll` — the :root tokens of every stylesheet the page links, in
// link order, as the cascade has them (auth.css spends rack.css's tokens).
export function loadSheet(name, text, rootAll = null) {
  const rules = parseCss(text);
  const root = new Map();
  for (const r of rules) if (!r.ctx.length && normSel(r.sel) === ':root') for (const [k, v] of r.decls) if (k.startsWith('--')) root.set(k, v);
  const base = rootAll || root;
  const keyed = [], seen = new Map();
  for (const r of rules) {
    const key0 = name + ' | ' + [...r.ctx.map(squash), normSel(r.sel)].join(' > ');
    const n = seen.get(key0) || 0;
    seen.set(key0, n + 1);
    const vars = new Map(base);
    for (const [k, v] of r.decls) if (k.startsWith('--')) vars.set(k, v);
    const isRoot = !r.ctx.length && normSel(r.sel) === ':root';
    const decls = r.decls.filter(([k]) => !(isRoot && k.startsWith('--'))).map(([k, v]) => [k, normValue(resolveVars(v, vars)), normValue(v)]);
    keyed.push({ key: key0 + ' #' + n, ctx: r.ctx, sel: r.sel, decls });
  }
  return { name, rules: keyed, root, keyframes: rules.filter(r => /^@(-webkit-)?keyframes\b/i.test(r.ctx[r.ctx.length - 1] || '')).map(r => squash(r.ctx[r.ctx.length - 1]).replace(/^@(-webkit-)?keyframes\s+/i, '')),
    faces: rules.filter(r => /^@font-face$/i.test(squash(r.sel))).map(r => (r.decls.find(([k]) => k === 'font-family') || [, ''])[1].replace(/['"]/g, '').trim().toLowerCase()) };
}

// Compare two sides' stylesheets. sheetsA / sheetsB: { name: text }.
// res.touched: every rule whose text differs, with the declarations that differ
// in text (decls: { prop, A, B }, resolved; null where a side lacks it) — what
// prove.mjs's coverage asks the page about.
export function compareSheets(sheetsA, sheetsB, { first = 60 } = {}) {
  const res = { count: 0, first: [], files: {}, onlyA: [], onlyB: [], tokensOnlyB: 0, touched: [] };
  const push = d => { res.count++; if (res.first.length < first) res.first.push(d); };
  const both = Object.keys(sheetsA).filter(n => n in sheetsB);
  // Each side's tokens: every linked sheet's :root, in link order (a vibe's
  // sheet declares under :root[data-vibe=…], never :root, so it adds none).
  const rootAll = sheets => { const m = new Map(); for (const t of Object.values(sheets)) for (const [k, v] of rootOf(t)) m.set(k, v); return m; };
  const RA = rootAll(sheetsA), RB = rootAll(sheetsB);
  const A = Object.fromEntries(Object.entries(sheetsA).map(([n, t]) => [n, loadSheet(n, t, RA)]));
  const B = Object.fromEntries(Object.entries(sheetsB).map(([n, t]) => [n, loadSheet(n, t, RB)]));
  const pn = p => p.replace(/#\d+$/, '');
  for (const n of both) {
    const a = A[n], b = B[n];
    const f = res.files[n] = { rulesA: a.rules.length, rulesB: b.rules.length, declsCompared: 0, declsEqual: 0 };
    // :root tokens: every one A declares, resolved, the same in B.
    for (const [k, v] of a.root) {
      if (!b.root.has(k)) { push({ file: n, rule: ':root', prop: k, A: v, B: '(not declared)' }); continue; }
      const va = normValue(resolveVars(v, RA)), vb = normValue(resolveVars(b.root.get(k), RB));
      if (va !== vb) push({ file: n, rule: ':root', prop: k, A: va, B: vb });
    }
    for (const k of b.root.keys()) if (!a.root.has(k)) res.tokensOnlyB++;
    // Rules: the same keys, in the same order, with the same resolved declarations.
    const mb = new Map(b.rules.map(r => [r.key, r]));
    const ka = a.rules.map(r => r.key).filter(k => mb.has(k)), kbSet = new Set(a.rules.map(r => r.key));
    const kb = b.rules.map(r => r.key).filter(k => kbSet.has(k));
    const firstOut = ka.findIndex((k, i) => k !== kb[i]);
    if (firstOut >= 0) push({ file: n, rule: ka[firstOut], prop: '(order)', A: 'rule #' + firstOut + ' is ' + ka[firstOut], B: 'rule #' + firstOut + ' is ' + kb[firstOut] });
    for (const ra of a.rules) {
      const rb = mb.get(ra.key);
      if (!rb) { push({ file: n, rule: ra.key, prop: '*', A: 'present', B: 'absent' }); continue; }
      const da = occ(ra.decls), db = occ(rb.decls);
      let touched = false;
      const tdecls = [];
      for (const [p, [vr, raw]] of da) {
        f.declsCompared++;
        if (!db.has(p)) { push({ file: n, rule: ra.key, prop: p, A: vr, B: '(not declared)' }); touched = true; tdecls.push({ prop: pn(p), A: vr, B: null }); continue; }
        const [wr, wraw] = db.get(p);
        if (vr !== wr) push({ file: n, rule: ra.key, prop: p, A: vr, B: wr });
        else f.declsEqual++;
        if (raw !== wraw) { touched = true; tdecls.push({ prop: pn(p), A: vr, B: wr }); }
      }
      for (const [p, [wr]] of db) if (!da.has(p)) { push({ file: n, rule: ra.key, prop: p, A: '(not declared)', B: wr }); touched = true; tdecls.push({ prop: pn(p), A: null, B: wr }); }
      // The declarations both sides have, in the order each writes them: the
      // later of two that set the same thing wins.
      const oa = [...da.keys()].filter(k => db.has(k)), ob = [...db.keys()].filter(k => da.has(k));
      if (oa.some((k, i) => k !== ob[i])) { push({ file: n, rule: ra.key, prop: '(declaration order)', A: oa.join(' '), B: ob.join(' ') }); touched = true; }
      if (touched) res.touched.push({ file: n, key: ra.key, ctx: ra.ctx, sel: ra.sel, decls: tdecls });
    }
    for (const rb of b.rules) if (!kbSet.has(rb.key)) push({ file: n, rule: rb.key, prop: '*', A: 'absent', B: 'present' });
  }
  // A stylesheet only one side links: scoped rule by rule, no shared names.
  for (const [side, mine, other, list] of [['A', A, B, res.onlyA], ['B', B, A, res.onlyB]]) {
    for (const n of Object.keys(mine).filter(n => !(n in other))) {
      const s = mine[n];
      const kf = new Set(Object.values(other).flatMap(o => o.keyframes)), ff = new Set(Object.values(other).flatMap(o => o.faces));
      let unscoped = 0;
      for (const r of s.rules) {
        const at = r.ctx.length ? squash(r.ctx[r.ctx.length - 1]) : '';
        if (/^@(-webkit-)?keyframes\b/i.test(at)) continue;
        if (/^@font-face$/i.test(squash(r.sel)) || /^@(import|charset|namespace)/i.test(r.sel)) continue;
        const sels = splitTop(r.sel);
        if (!sels.every(x => /^(:root|html)?\[data-vibe=(["']?)[\w-]+\2\]/.test(x.trim()) && !/\[data-vibe=(["']?)v1\1\]/.test(x))) {
          unscoped++;
          push({ file: n, side, rule: r.key, prop: '(scope)', A: side === 'A' ? 'unscoped rule in a sheet only A links' : '', B: side === 'B' ? 'unscoped rule in a sheet only B links' : '' });
        }
      }
      for (const k of new Set(s.keyframes)) if (kf.has(k)) push({ file: n, side, rule: '@keyframes ' + k, prop: '(name)', A: side === 'A' ? 'reuses a name the other side declares' : '', B: side === 'B' ? 'reuses a name the other side declares' : '' });
      for (const f of new Set(s.faces)) if (ff.has(f)) push({ file: n, side, rule: '@font-face ' + f, prop: '(family)', A: side === 'A' ? 'reuses a family the other side declares' : '', B: side === 'B' ? 'reuses a family the other side declares' : '' });
      list.push({ file: n, rules: s.rules.length, unscoped });
    }
  }
  return res;
}
function occ(decls) {
  const m = new Map(), n = new Map();
  for (const [p, v, raw] of decls) { const i = n.get(p) || 0; n.set(p, i + 1); m.set(p + '#' + i, [v, raw]); }
  return m;
}
export function splitTop(sel) {
  const out = []; let cur = '', d = 0, q = null;
  for (const ch of sel) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') d++;
    else if (ch === ')' || ch === ']') d--;
    if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// The stylesheets a page links, from its index.html: local <link rel=stylesheet>
// hrefs, in order, and its inline <style> blocks (named index.html<style#n>).
export function linkedSheets(html) {
  const links = [], styles = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const t = m[0];
    if (!/\brel\s*=\s*["']?stylesheet/i.test(t)) continue;
    const h = (t.match(/\bhref\s*=\s*"([^"]*)"|\bhref\s*=\s*'([^']*)'|\bhref\s*=\s*([^\s>]+)/i) || []).slice(1).find(Boolean);
    if (h && !/^[a-z]+:/i.test(h) && !h.startsWith('//')) links.push(h.replace(/^\.\//, '').replace(/^\//, ''));
  }
  let n = 0;
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) styles.push({ name: 'index.html<style#' + n++ + '>', text: m[1] });
  return { links, styles };
}

// The selector a page can test for a rule: pseudo-elements and the state
// pseudo-classes (:hover, :active, :focus…) taken out. Null for rules that
// have no element (:root tokens, @keyframes frames, @font-face, at-rules).
export function testable(sel, ctx = []) {
  const at = ctx.length ? squash(ctx[ctx.length - 1]) : '';
  if (/^@(-webkit-)?keyframes\b/i.test(at) || /^@/.test(sel)) return null;
  const s = splitTop(sel).map(x => x.replace(/::?(before|after|placeholder|marker|first-letter|first-line|selection|backdrop|-webkit-[\w-]+|-moz-[\w-]+)(\([^)]*\))?/g, '')
    .replace(/:(hover|active|focus-visible|focus-within|focus|visited|target)(?![\w-])/g, '').trim() || '*').join(', ');
  return s === ':root' ? null : s;
}

// The conditions a rule is in effect under, from the at-rules around it: the
// @media queries (all must match) and @supports conditions (all must hold) the
// page can test, @layer (always in effect), and anything else (@container,
// @scope, @document…), which the coverage cannot test and so never credits.
export function contextOf(ctx = []) {
  const media = [], supports = [], other = [];
  for (const x of ctx) {
    const s = squash(x);
    let m;
    if ((m = s.match(/^@media\s+([\s\S]+)$/i))) media.push(m[1]);
    else if ((m = s.match(/^@supports\s+([\s\S]+)$/i))) supports.push(m[1]);
    else if (/^@layer\b/i.test(s) || /^@(-webkit-)?keyframes\b/i.test(s)) continue;
    else other.push(s);
  }
  return { media, supports, other };
}
