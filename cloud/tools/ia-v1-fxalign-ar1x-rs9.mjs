// Align two fixture dumps (capture.js buildFixture: one wrap per rule selector
// inside div#__fx) by each wrap's structural signature (tags, classes, every
// attribute but style/id-free paths), with an LCS, so wraps only one side has
// fall out, and compare every matched wrap element for element: computed
// style (and ::before/::after), rect relative to its wrap's first element,
// attributes, text, svg, value. The page outside #__fx is compared by path.
// Usage: node ia-v1-fxalign-ar1x-rs9.mjs <ref.dump.json.gz> <run.dump.json.gz>
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [fr, fn] = process.argv.slice(2);
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const R = load(fr), N = load(fn);
// Only the properties both dumps record (a newer Chrome lists more).
const BOTH = new Set(R.props.filter(p => N.props.includes(p)));
console.log('props: ref ' + R.props.length + ', run ' + N.props.length + ', only run: ' + N.props.filter(p => !R.props.includes(p)).join(',') + '; only ref: ' + R.props.filter(p => !N.props.includes(p)).join(','));
const style = (d, i) => { const v = i == null ? null : d.styles[i]; return v ? Object.fromEntries(d.props.map((p, k) => [p, v[k]])) : {}; };
const fxPath = d => (d.els.find(e => e.at && e.at.id === '__fx') || {}).p;
function split(d) {
  const fx = fxPath(d);
  const page = d.els.filter(e => !(e.p === fx || e.p.startsWith(fx + '>')));
  const map = new Map();
  for (const e of d.els) {
    if (!e.p.startsWith(fx + '>')) continue;
    const rest = e.p.slice(fx.length + 1), seg = rest.split('>')[0];
    if (!map.has(seg)) map.set(seg, { seg, els: [] });
    map.get(seg).els.push({ rel: rest.slice(seg.length), e });
  }
  const wraps = [...map.values()].sort((x, y) => +x.seg.split(':')[1] - +y.seg.split(':')[1]);
  for (const w of wraps) w.sig = w.els.map(({ rel, e }) => rel + JSON.stringify(Object.fromEntries(Object.entries(e.at || {}).filter(([k]) => k !== 'style')))).join('|');
  return { fx, page, wraps };
}
const r = split(R), n = split(N);
// LCS on signatures
const a = r.wraps, b = n.wraps, m = a.length, k = b.length;
const L = Array.from({ length: m + 1 }, () => new Uint16Array(k + 1));
for (let i = m - 1; i >= 0; i--) for (let j = k - 1; j >= 0; j--) L[i][j] = a[i].sig === b[j].sig ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const pairs = [], onlyR = [], onlyN = [];
for (let i = 0, j = 0; i < m || j < k;) {
  if (i < m && j < k && a[i].sig === b[j].sig) { pairs.push([a[i], b[j]]); i++; j++; }
  else if (j < k && (i >= m || L[i][j + 1] >= L[i + 1][j])) { onlyN.push(b[j]); j++; }
  else { onlyR.push(a[i]); i++; }
}
console.log('wraps: ref ' + m + ', run ' + k + ', matched ' + pairs.length + ', only ref ' + onlyR.length + ', only run ' + onlyN.length);
const showWrap = w => w.els.slice(0, 3).map(({ rel, e }) => rel + ' ' + JSON.stringify(e.at || {}).slice(0, 160)).join(' || ');
onlyR.slice(0, 8).forEach(w => console.log('  ONLY REF ' + w.seg + ' ' + showWrap(w)));
const vibeScoped = w => w.els.some(({ e }) => /iron-age/.test(JSON.stringify(e.at || {})));
console.log('only-run wraps carrying "iron-age" in an attribute: ' + onlyN.filter(vibeScoped).length + ' of ' + onlyN.length);
onlyN.filter(w => !vibeScoped(w)).slice(0, 12).forEach(w => console.log('  ONLY RUN, not iron-age ' + w.seg + ' ' + showWrap(w)));
onlyN.filter(vibeScoped).slice(0, 3).forEach(w => console.log('  e.g. ONLY RUN ' + w.seg + ' ' + showWrap(w)));
const cmpEl = (ea, eb, da, db, rel0a, rel0b) => {
  const out = [];
  for (const key of ['s', 'b', 'a']) {
    const sa = style(da, ea[key]), sb = style(db, eb[key]);
    for (const p of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (BOTH.has(p) && sa[p] !== sb[p]) out.push(key + ':' + p + ' ' + sa[p] + ' → ' + sb[p]);
  }
  const ra = (ea.r || []).slice(), rb = (eb.r || []).slice();
  if (rel0a && ra.length) { ra[1] -= rel0a[1]; ra[0] -= rel0a[0]; }
  if (rel0b && rb.length) { rb[1] -= rel0b[1]; rb[0] -= rel0b[0]; }
  if (JSON.stringify(ra.map(x => Math.round(x * 100) / 100)) !== JSON.stringify(rb.map(x => Math.round(x * 100) / 100))) out.push('rect ' + JSON.stringify(ra) + ' → ' + JSON.stringify(rb));
  const at = o => JSON.stringify(Object.fromEntries(Object.entries(o || {}).filter(([k]) => k !== 'style')));
  if (at(ea.at) !== at(eb.at)) out.push('attrs');
  if (ea.t !== eb.t) out.push('text ' + JSON.stringify(ea.t) + ' → ' + JSON.stringify(eb.t));
  if (JSON.stringify(ea.svg) !== JSON.stringify(eb.svg)) out.push('svg');
  if (ea.v !== eb.v) out.push('value');
  return out;
};
let wrapDiffs = 0, elDiffs = 0; const samples = [];
for (const [wa, wb] of pairs) {
  const r0a = wa.els[0].e.r, r0b = wb.els[0].e.r;
  let any = false;
  wa.els.forEach(({ rel, e }, i) => {
    const d = cmpEl(e, wb.els[i].e, R, N, r0a, r0b);
    if (d.length) { any = true; elDiffs++; if (samples.length < 12) samples.push(wa.seg + '/' + wb.seg + rel + ' ' + d.slice(0, 6).join('; ')); }
  });
  if (any) wrapDiffs++;
}
console.log('matched wraps differing: ' + wrapDiffs + ' (' + elDiffs + ' elements)');
samples.forEach(s => console.log('  ' + s));
// the page outside the fixture
const pm = new Map(r.page.map(e => [e.p, e]));
let pageDiff = 0; const ps = [];
for (const e of n.page) { const x = pm.get(e.p); if (!x) { pageDiff++; ps.push('only run ' + e.p); continue; } const d = cmpEl(x, e, R, N); if (d.length) { pageDiff++; if (ps.length < 8) ps.push(e.p + ' ' + d.slice(0, 5).join('; ')); } }
for (const e of r.page) if (!n.page.some(x => x.p === e.p)) { pageDiff++; ps.push('only ref ' + e.p); }
console.log('page outside the fixture: ref ' + r.page.length + ', run ' + n.page.length + ', differing ' + pageDiff);
ps.slice(0, 10).forEach(s => console.log('  ' + s));
