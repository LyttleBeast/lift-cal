// Pweb round-2 adversarial review, CSS lens. An independent resolver:
// parse rack.css + auth.css in two trees, pair every rule (with its full
// at-rule context), and compare every declaration with var() substituted
// from the cascade-effective custom properties. Written from scratch; it
// shares nothing with e1-equiv.mjs or the harness's css-static.mjs.
//
// usage: node r2css-resolve.mjs <baseTree> <engineTree> [--json out]
import fs from 'node:fs';
import path from 'node:path';

const [,, BASE, ENG, ...rest] = process.argv;
const jsonOut = rest[0] === '--json' ? rest[1] : null;

function stripComments(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) { out += c; if (c === '\\') { out += s[i + 1] || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) throw new Error('unterminated comment'); out += ' '; i = e + 2; continue; }
    out += c; i++;
  }
  return out;
}

// Returns [{ctx:[...], sel, decls:[{prop,value,important,raw}], idx}]
function parse(css, file) {
  const s = stripComments(css);
  const rules = [];
  const atStatements = [];
  let i = 0;
  function skipWs() { while (i < s.length && /\s/.test(s[i])) i++; }
  function readUntil(stops) { // top-level, respects strings and parens
    let out = '', depth = 0, q = null;
    while (i < s.length) {
      const c = s[i];
      if (q) { out += c; if (c === '\\') { out += s[i + 1]; i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
      if (c === '(' || c === '[') depth++;
      if (c === ')' || c === ']') depth--;
      if (depth === 0 && stops.includes(c)) return out;
      out += c; i++;
    }
    return out;
  }
  function readBlockBody() { // after '{', returns body text up to matching '}'
    let depth = 1, out = '', q = null;
    while (i < s.length) {
      const c = s[i];
      if (q) { out += c; if (c === '\\') { out += s[i + 1]; i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
      if (c === '{') depth++;
      if (c === '}') { depth--; if (depth === 0) { i++; return out; } }
      out += c; i++;
    }
    throw new Error(file + ': unbalanced block');
  }
  function parseDecls(body) {
    const out = [];
    let j = 0, cur = '', depth = 0, q = null;
    const push = () => {
      const t = cur.trim(); cur = '';
      if (!t) return;
      const k = t.indexOf(':');
      if (k < 0) { out.push({ prop: '(junk)', value: t, important: false, raw: t }); return; }
      let prop = t.slice(0, k).trim();
      let value = t.slice(k + 1).trim();
      let important = false;
      const m = /!\s*important\s*$/i.exec(value);
      if (m) { important = true; value = value.slice(0, m.index).trim(); }
      out.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, important, raw: t });
    };
    for (; j < body.length; j++) {
      const c = body[j];
      if (q) { cur += c; if (c === '\\') { cur += body[j + 1]; j++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(' || c === '[') depth++;
      if (c === ')' || c === ']') depth--;
      if (c === '{') throw new Error(file + ': nested block in declarations: ' + body.slice(0, 80));
      if (c === ';' && depth === 0) { push(); continue; }
      cur += c;
    }
    push();
    return out;
  }
  function parseList(end, ctx) {
    while (true) {
      skipWs();
      if (i >= s.length) { if (end) throw new Error(file + ': eof in block'); return; }
      if (s[i] === '}') { if (!end) throw new Error(file + ': stray }'); i++; return; }
      if (s[i] === '@') {
        const pre = readUntil(['{', ';']).trim();
        if (s[i] === ';') { i++; atStatements.push({ ctx: [...ctx], text: pre }); continue; }
        i++; // {
        const name = /^@[\w-]+/.exec(pre)[0].toLowerCase();
        if (name === '@media' || name === '@supports' || name === '@layer' || name === '@container') {
          parseList(true, [...ctx, pre.replace(/\s+/g, ' ')]);
        } else if (name === '@keyframes' || name === '@-webkit-keyframes') {
          parseList(true, [...ctx, pre.replace(/\s+/g, ' ')]);
        } else { // @font-face, @page ...
          const body = readBlockBody();
          rules.push({ ctx: [...ctx], sel: pre.replace(/\s+/g, ' '), decls: parseDecls(body), file });
        }
        continue;
      }
      const sel = readUntil(['{', '}']);
      if (s[i] !== '{') throw new Error(file + ': selector without block: ' + sel.slice(0, 80));
      i++;
      const body = readBlockBody();
      rules.push({ ctx: [...ctx], sel: sel.trim().replace(/\s+/g, ' '), decls: parseDecls(body), file });
    }
  }
  parseList(false, []);
  return { rules, atStatements };
}

function load(tree) {
  const out = { rules: [], at: [] };
  for (const f of ['rack.css', 'auth.css']) {
    const p = parse(fs.readFileSync(path.join(tree, f), 'utf8'), f);
    out.rules.push(...p.rules.map(r => ({ ...r })));
    out.at.push(...p.atStatements.map(a => ({ ...a, file: f })));
  }
  out.rules.forEach((r, k) => r.idx = k);
  return out;
}

// custom properties: root-level (selector exactly :root or html, no ctx) and local
function customProps(rules) {
  const root = new Map(), local = [];
  for (const r of rules) {
    for (const d of r.decls) {
      if (!d.prop.startsWith('--')) continue;
      if (r.ctx.length === 0 && (r.sel === ':root' || r.sel === 'html')) root.set(d.prop, { value: d.value, rule: r });
      else local.push({ sel: r.sel, ctx: r.ctx, prop: d.prop, value: d.value, file: r.file });
    }
  }
  return { root, local };
}

function substitute(value, env, stack = []) {
  // replace var(--x[, fallback]) recursively
  let out = '', i = 0;
  while (i < value.length) {
    const k = value.indexOf('var(', i);
    if (k < 0) { out += value.slice(i); break; }
    // make sure 'var(' is a function token start
    out += value.slice(i, k);
    let j = k + 4, depth = 1;
    while (j < value.length && depth) { if (value[j] === '(') depth++; else if (value[j] === ')') depth--; j++; }
    const inner = value.slice(k + 4, j - 1);
    const comma = (() => { let d = 0; for (let t = 0; t < inner.length; t++) { if (inner[t] === '(') d++; else if (inner[t] === ')') d--; else if (inner[t] === ',' && d === 0) return t; } return -1; })();
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fb = comma < 0 ? null : inner.slice(comma + 1);
    if (stack.includes(name)) return { value: null, err: 'cycle ' + name };
    let v;
    if (env.has(name)) {
      const r = substitute(env.get(name), env, [...stack, name]);
      if (r.value === null) return r;
      v = r.value.trim();
    } else if (fb !== null) {
      const r = substitute(fb, env, stack);
      if (r.value === null) return r;
      v = r.value.trim();
    } else return { value: null, err: 'undefined ' + name };
    out += v;
    i = j;
  }
  return { value: out };
}

const norm = v => v == null ? v : v.replace(/\s+/g, ' ').replace(/\s*([,()\/])\s*/g, '$1').replace(/#[0-9a-fA-F]{3,8}\b/g, h => h.toLowerCase()).trim();

const A = load(BASE), B = load(ENG);
const cpA = customProps(A.rules), cpB = customProps(B.rules);
const envOf = cp => new Map([...cp.root].map(([k, v]) => [k, v.value]));
const envA = envOf(cpA), envB = envOf(cpB);

const report = { counts: {}, ruleSeq: [], declDiffs: [], rootChanged: [], localCustom: { A: cpA.local, B: cpB.local }, at: { A: A.at, B: B.at }, undefinedRefs: [] };

// 1. root tokens that existed in base: same value in engine?
for (const [k, v] of cpA.root) {
  const w = cpB.root.get(k);
  if (!w) report.rootChanged.push({ prop: k, A: v.value, B: null });
  else if (norm(v.value) !== norm(w.value)) report.rootChanged.push({ prop: k, A: v.value, B: w.value });
}
const newTokens = [...cpB.root.keys()].filter(k => !cpA.root.has(k));

// 2. rule sequence (non-root)
const key = r => r.file + ' | ' + r.ctx.join(' > ') + ' | ' + r.sel;
const seqA = A.rules.filter(r => r.sel !== ':root').map(key);
const seqB = B.rules.filter(r => r.sel !== ':root').map(key);
report.counts.rulesA = seqA.length; report.counts.rulesB = seqB.length;
for (let k = 0; k < Math.max(seqA.length, seqB.length); k++) if (seqA[k] !== seqB[k]) { report.ruleSeq.push({ k, A: seqA[k], B: seqB[k] }); if (report.ruleSeq.length > 20) break; }

// 3. declarations, pairwise
const rA = A.rules.filter(r => r.sel !== ':root'), rB = B.rules.filter(r => r.sel !== ':root');
let nDecl = 0, nChangedText = 0, nVarB = 0;
const changed = [];
for (let k = 0; k < Math.min(rA.length, rB.length); k++) {
  const a = rA[k], b = rB[k];
  // local custom props in this rule override root for resolution of this rule's declarations
  const la = new Map(envA), lb = new Map(envB);
  for (const d of a.decls) if (d.prop.startsWith('--')) la.set(d.prop, d.value);
  for (const d of b.decls) if (d.prop.startsWith('--')) lb.set(d.prop, d.value);
  if (a.decls.length !== b.decls.length) { report.declDiffs.push({ rule: key(a), kind: 'count', A: a.decls.map(d => d.raw), B: b.decls.map(d => d.raw) }); continue; }
  for (let t = 0; t < a.decls.length; t++) {
    const da = a.decls[t], db = b.decls[t];
    nDecl++;
    if (da.prop !== db.prop || da.important !== db.important) { report.declDiffs.push({ rule: key(a), kind: 'prop/important', A: da.raw, B: db.raw }); continue; }
    if (da.value !== db.value) { nChangedText++; changed.push({ rule: key(a), prop: da.prop, A: da.value, B: db.value }); }
    if (/var\(/.test(db.value)) nVarB++;
    const ra = substitute(da.value, la), rb = substitute(db.value, lb);
    if (ra.value === null || rb.value === null) { report.undefinedRefs.push({ rule: key(a), prop: da.prop, A: ra.err, B: rb.err }); if ((ra.err || '') !== (rb.err || '')) report.declDiffs.push({ rule: key(a), kind: 'resolve', prop: da.prop, A: ra.err || ra.value, B: rb.err || rb.value }); continue; }
    if (norm(ra.value) !== norm(rb.value)) report.declDiffs.push({ rule: key(a), kind: 'value', prop: da.prop, A: norm(ra.value), B: norm(rb.value), rawA: da.value, rawB: db.value });
  }
}
report.counts.decls = nDecl; report.counts.changedText = nChangedText; report.counts.withVarB = nVarB;
report.counts.rootA = cpA.root.size; report.counts.rootB = cpB.root.size; report.counts.newTokens = newTokens.length;
report.newTokens = newTokens.map(k => [k, cpB.root.get(k).value]);
report.changed = changed;

console.log(JSON.stringify(report.counts));
console.log('rootChanged', JSON.stringify(report.rootChanged));
console.log('ruleSeq diffs', JSON.stringify(report.ruleSeq));
console.log('declDiffs', report.declDiffs.length);
for (const d of report.declDiffs) console.log('  ', JSON.stringify(d));
console.log('undefinedRefs', JSON.stringify(report.undefinedRefs));
console.log('local custom props A', JSON.stringify(cpA.local));
console.log('local custom props B', JSON.stringify(cpB.local));
console.log('at statements A', JSON.stringify(A.at));
console.log('at statements B', JSON.stringify(B.at));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
