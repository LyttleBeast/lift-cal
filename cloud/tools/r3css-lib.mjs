// r3 css-lens reviewer: a small, independent CSS parser + var() resolver.
// Not shared with e1-equiv.mjs or css-static.mjs on purpose.
import fs from 'node:fs';

export function stripComments(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) { out += c; if (c === '\\') { out += s[i + 1] ?? ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 2; out += ' '; continue; }
    out += c; i++;
  }
  return out;
}

// split at top level on a char (not in parens/strings)
export function splitTop(s, ch) {
  const parts = []; let depth = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === '\\') { cur += s[++i] ?? ''; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ch && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function findBlockEnd(s, i) { // s[i] === '{'
  let depth = 0, q = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  throw new Error('unbalanced');
}

function findStop(s, i) { // next top-level '{' or ';'
  let q = null, depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    else if ((c === '{' || c === ';') && depth === 0) return i;
  }
  return -1;
}

export function parseDecls(body) {
  const decls = [];
  for (const raw of splitTop(body, ';')) {
    const t = raw.trim(); if (!t) continue;
    const k = t.indexOf(':'); if (k < 0) { decls.push({ bad: t }); continue; }
    let prop = t.slice(0, k).trim();
    let value = t.slice(k + 1).trim();
    let important = false;
    const m = value.match(/!\s*important\s*$/i);
    if (m) { important = true; value = value.slice(0, m.index).trim(); }
    decls.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), rawProp: prop, value, important });
  }
  return decls;
}

// returns flat list of rules: {ctx:[at-preludes], sel, decls, kind}
export function parse(src, file = '') {
  const s = stripComments(src);
  const rules = [];
  function walk(str, ctx) {
    let i = 0;
    while (i < str.length) {
      while (i < str.length && /\s/.test(str[i])) i++;
      if (i >= str.length) break;
      const stop = findStop(str, i);
      if (stop < 0) { const rest = str.slice(i).trim(); if (rest) rules.push({ ctx, kind: 'junk', text: rest }); break; }
      const prelude = str.slice(i, stop).trim();
      if (str[stop] === ';') { rules.push({ ctx, kind: 'stmt', text: prelude }); i = stop + 1; continue; }
      const end = findBlockEnd(str, stop);
      const body = str.slice(stop + 1, end);
      if (/^@(media|supports|layer|container|document)\b/i.test(prelude)) walk(body, [...ctx, prelude.replace(/\s+/g, ' ')]);
      else if (/^@(-webkit-)?keyframes\b/i.test(prelude)) {
        const name = prelude.replace(/\s+/g, ' ');
        // frames
        let j = 0;
        while (j < body.length) {
          while (j < body.length && /\s/.test(body[j])) j++;
          if (j >= body.length) break;
          const st = body.indexOf('{', j); const en = findBlockEnd(body, st);
          rules.push({ ctx: [...ctx, name], kind: 'frame', sel: body.slice(j, st).trim().replace(/\s+/g, ' '), decls: parseDecls(body.slice(st + 1, en)) });
          j = en + 1;
        }
      } else if (/^@/.test(prelude)) rules.push({ ctx, kind: 'at', sel: prelude.replace(/\s+/g, ' '), decls: parseDecls(body) });
      else rules.push({ ctx, kind: 'style', sel: prelude.replace(/\s+/g, ' '), decls: parseDecls(body) });
      i = end + 1;
    }
  }
  walk(s, []);
  rules.forEach((r, n) => { r.file = file; r.n = n; });
  return rules;
}

export function load(path, file) { return parse(fs.readFileSync(path, 'utf8'), file); }

// root custom property map: only top-level rules whose selector is exactly :root
export function rootMap(rules) {
  const m = new Map();
  for (const r of rules) if (r.kind === 'style' && r.ctx.length === 0 && r.sel === ':root')
    for (const d of r.decls) if (d.prop && d.prop.startsWith('--')) m.set(d.prop, d.value);
  return m;
}

// substitute var() given lookup(name) -> value|undefined. Returns {value, invalid, refs}
export function subst(value, lookup, depth = 0, refs = []) {
  if (depth > 20) return { value, invalid: true, refs, cycle: true };
  let out = '', i = 0, invalid = false;
  while (i < value.length) {
    const k = value.indexOf('var(', i);
    if (k < 0) { out += value.slice(i); break; }
    // ensure not part of identifier
    if (k > 0 && /[a-zA-Z0-9_-]/.test(value[k - 1])) { out += value.slice(i, k + 4); i = k + 4; continue; }
    out += value.slice(i, k);
    // find matching paren
    let d = 0, j = k + 3, q = null;
    for (; j < value.length; j++) {
      const c = value[j];
      if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '(') d++; else if (c === ')') { d--; if (d === 0) break; }
    }
    const inner = value.slice(k + 4, j);
    const parts = splitTop(inner, ',');
    const name = parts[0].trim();
    const fb = parts.length > 1 ? inner.slice(inner.indexOf(',') + 1) : undefined;
    refs.push(name);
    let v = lookup(name);
    if (v === undefined) {
      if (fb !== undefined) { const r = subst(fb.trim(), lookup, depth + 1, refs); v = r.value; if (r.invalid) invalid = true; }
      else { invalid = true; v = `<<UNDEF ${name}>>`; }
    } else { const r = subst(v, lookup, depth + 1, refs); v = r.value; if (r.invalid) invalid = true; }
    out += v;
    i = j + 1;
  }
  return { value: out, invalid, refs };
}

// token normalisation: whitespace only; strings kept
export function normWS(v) {
  let out = '', q = null;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (q) { out += c; if (c === '\\') { out += v[++i]; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; out += c; continue; }
    if (/\s/.test(c)) { if (!out.endsWith(' ')) out += ' '; continue; }
    out += c;
  }
  out = out.trim();
  // spaces around , ( ) / are insignificant in the values we deal with
  out = out.replace(/ ?([,()/]) ?/g, '$1');
  return out;
}
