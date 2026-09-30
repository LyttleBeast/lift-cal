// Review helper: what differs in the prove.mjs "fixture" scene between A and B.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [fa, fb] = process.argv.slice(2);
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const A = load(fa), B = load(fb);
console.log('keys', Object.keys(A));
console.log('A els', A.els.length, 'B els', B.els.length);
const style = (d, s) => { const v = d.styles[s]; return v ? Object.fromEntries(d.props.map((p, i) => [p, v[i]])) : {}; };
// Key each element by its attributes (class + data-*) and text, ignoring position.
const sig = e => JSON.stringify([e.p.replace(/:\d+/g, ''), e.at || {}, e.t]);
const count = els => { const m = new Map(); for (const e of els) m.set(sig(e), (m.get(sig(e)) || 0) + 1); return m; };
const ca = count(A.els), cb = count(B.els);
const onlyB = [], onlyA = [];
for (const [k, n] of cb) if ((ca.get(k) || 0) < n) onlyB.push([k, n - (ca.get(k) || 0)]);
for (const [k, n] of ca) if ((cb.get(k) || 0) < n) onlyA.push([k, n - (cb.get(k) || 0)]);
console.log('signatures only/extra in B:', onlyB.length);
onlyB.slice(0, 80).forEach(x => console.log('  B+ ' + x[1] + ' ' + x[0].slice(0, 220)));
console.log('signatures only/extra in A:', onlyA.length);
onlyA.slice(0, 40).forEach(x => console.log('  A+ ' + x[1] + ' ' + x[0].slice(0, 220)));
// For elements matched by signature (unique in both), compare computed style.
const uniq = (els, m) => new Map(els.filter(e => m.get(sig(e)) === 1).map(e => [sig(e), e]));
const ua = uniq(A.els, ca), ub = uniq(B.els, cb);
let same = 0, diff = [];
for (const [k, a] of ua) {
  const b = ub.get(k); if (!b) continue;
  const sa = style(A, a.s), sb = style(B, b.s);
  const d = Object.keys({ ...sa, ...sb }).filter(p => sa[p] !== sb[p]);
  if (!d.length) same++; else diff.push([k, d.map(p => p + ': ' + sa[p] + ' -> ' + sb[p])]);
}
console.log('unique-signature pairs: same style', same, 'different', diff.length);
diff.slice(0, 30).forEach(([k, d]) => console.log('  ~ ' + k.slice(0, 160) + '\n      ' + d.slice(0, 6).join('\n      ')));
