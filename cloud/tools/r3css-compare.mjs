// r3 css lens: compare base vs engine rule by rule, resolving var() from each
// tree's own top-level :root, then list hazards the static tools don't model.
import { load, rootMap, subst, normWS } from './r3css-lib.mjs';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const out = { diffs: [], ruleMismatch: [], localCustom: [], undefinedRefs: [], pseudoVar: [], keyframeVar: [], dupProps: [], counts: {} };

const files = ['rack.css', 'auth.css'];
const B = {}, E = {};
for (const f of files) { B[f] = load(`${BASE}/${f}`, f); E[f] = load(`${ENG}/${f}`, f); }
const bRoot = new Map([...rootMap(B['rack.css']), ...rootMap(B['auth.css'])]);
const eRoot = new Map([...rootMap(E['rack.css']), ...rootMap(E['auth.css'])]);
out.counts.bRoot = bRoot.size; out.counts.eRoot = eRoot.size;
// base :root tokens whose value changed
out.rootChanged = [];
for (const [k, v] of bRoot) if (eRoot.get(k) !== v) out.rootChanged.push([k, v, eRoot.get(k)]);

let nd = 0, nr = 0;
for (const f of files) {
  const b = B[f].filter(r => r.kind !== 'junk'), e = E[f].filter(r => r.kind !== 'junk');
  if (b.length !== e.length) out.ruleMismatch.push([f, 'count', b.length, e.length]);
  for (let i = 0; i < Math.max(b.length, e.length); i++) {
    const rb = b[i], re = e[i];
    if (!rb || !re) { out.ruleMismatch.push([f, i, rb?.sel, re?.sel]); continue; }
    nr++;
    if (rb.kind !== re.kind || rb.sel !== re.sel || rb.text !== re.text || JSON.stringify(rb.ctx) !== JSON.stringify(re.ctx)) {
      out.ruleMismatch.push([f, i, rb.kind, rb.sel ?? rb.text, re.kind, re.sel ?? re.text, rb.ctx, re.ctx]);
      continue;
    }
    if (!rb.decls) continue;
    const isRoot = rb.sel === ':root' && rb.ctx.length === 0;
    if (isRoot) continue; // compared through rootChanged
    if (rb.decls.length !== re.decls.length) out.ruleMismatch.push([f, i, rb.sel, 'decl count', rb.decls.length, re.decls.length]);
    for (let j = 0; j < Math.max(rb.decls.length, re.decls.length); j++) {
      const db = rb.decls[j], de = re.decls[j];
      nd++;
      if (!db || !de) { out.diffs.push([f, rb.sel, rb.ctx, db, de]); continue; }
      if (db.rawProp !== de.rawProp || db.important !== de.important) { out.diffs.push([f, rb.sel, rb.ctx, 'prop/important', db, de]); continue; }
      const sb = subst(db.value, n => bRoot.get(n));
      const se = subst(de.value, n => eRoot.get(n));
      if (se.invalid !== sb.invalid) out.undefinedRefs.push([f, rb.sel, de.prop, de.value, se.value]);
      if (normWS(sb.value) !== normWS(se.value)) out.diffs.push([f, rb.sel, rb.ctx, de.prop, db.value, de.value, normWS(sb.value), normWS(se.value)]);
      if (de.value.includes('var(')) {
        if (/::?(backdrop|-webkit-|selection|marker|file-selector|placeholder|first-letter|first-line|cue|highlight|spelling|grammar|target-text)/i.test(rb.sel))
          out.pseudoVar.push([f, rb.sel, de.prop, db.value, de.value]);
        if (rb.kind === 'frame') out.keyframeVar.push([f, rb.ctx, rb.sel, de.prop, db.value, de.value]);
      }
    }
    // duplicated props within a rule (fallback pattern) where the engine's copy has var()
    const seen = new Map();
    re.decls.forEach((d, j) => { if (!d.prop) return; if (seen.has(d.prop)) out.dupProps.push([f, rb.sel, d.prop, rb.decls[seen.get(d.prop)].value, rb.decls[j].value, re.decls[seen.get(d.prop)].value, d.value]); seen.set(d.prop, j); });
    // custom props set outside :root
    for (const d of re.decls) if (d.prop && d.prop.startsWith('--')) out.localCustom.push([f, rb.ctx, rb.sel, d.prop, d.value, eRoot.has(d.prop) ? 'SHADOWS-ROOT' : '']);
  }
}
out.counts.rules = nr; out.counts.decls = nd;
console.log(JSON.stringify(out, null, 1));
