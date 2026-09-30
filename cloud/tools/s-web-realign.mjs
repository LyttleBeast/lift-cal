// Re-align a prove.mjs A/B dump pair around one inserted subtree, and say what
// else differs. The harness pairs elements by positional path (div:8 in A with
// div:8 in B), so one inserted section shows up as "A's App section differs
// from B's Look section, and B has an extra App section". This drops B's
// inserted subtree, renumbers its later same-tag siblings (and their
// descendants), and compares every remaining element with A: computed style,
// rect, attributes, text hash. It prints the inserted subtree in full, and every
// remaining difference grouped by kind — a rect that moved only in y by one
// constant is reported as "shifted".
// Usage: node s-web-realign.mjs <A.dump.json.gz> <B.dump.json.gz> <parentPath> <insertedPath>
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [fa, fb, parent, ins] = process.argv.slice(2);
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const A = load(fa), B = load(fb);
const style = (d, e) => { const v = d.styles[e.s]; return v ? Object.fromEntries(d.props.map((p, i) => [p, v[i]])) : {}; };
const insTag = ins.slice(parent.length + 1).split(':')[0], insIdx = +ins.split(':').pop();
const inserted = B.els.filter(e => e.p === ins || e.p.startsWith(ins + '>'));
console.log('inserted subtree in B (' + inserted.length + ' elements):');
for (const e of inserted) console.log('  ' + e.p.slice(parent.length) + '  class="' + ((e.at && e.at.class) || '') + '"  rect ' + JSON.stringify(e.r) + (e.t !== undefined ? '  text ' + JSON.stringify(e.t) : ''));
// Renumber: parent>TAG:n with n > insIdx becomes TAG:n-1.
const renum = p => {
  if (!p.startsWith(parent + '>')) return p;
  const rest = p.slice(parent.length + 1);
  const seg = rest.split('>')[0], [tag, n] = seg.split(':');
  if (tag !== insTag || +n <= insIdx) return p;
  return parent + '>' + tag + ':' + (+n - 1) + rest.slice(seg.length);
};
const Bm = new Map(B.els.filter(e => !inserted.includes(e)).map(e => [renum(e.p), e]));
const Am = new Map(A.els.map(e => [e.p, e]));
const onlyA = [...Am.keys()].filter(p => !Bm.has(p)), onlyB = [...Bm.keys()].filter(p => !Am.has(p));
console.log('\nafter re-alignment: A ' + Am.size + ' elements, B ' + Bm.size + '; only in A ' + onlyA.length + ', only in B ' + onlyB.length);
onlyA.slice(0, 10).forEach(p => console.log('  only A ' + p)); onlyB.slice(0, 10).forEach(p => console.log('  only B ' + p));
const kinds = { same: 0, shifted: [], styleOnly: [], other: [] };
const shifts = new Map();
for (const [p, a] of Am) {
  const b = Bm.get(p); if (!b) continue;
  const sd = [];
  for (const [key, pseudo] of [['s', ''], ['b', '::before'], ['a', '::after']]) {
    const sa = a[key] == null ? {} : style(A, { s: a[key] }), sb = b[key] == null ? {} : style(B, { s: b[key] });
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (sa[k] !== sb[k]) sd.push(pseudo + k + ': ' + sa[k] + ' → ' + sb[k]);
  }
  const at = JSON.stringify(a.at || {}) !== JSON.stringify(b.at || {});
  const tx = a.t !== b.t || JSON.stringify(a.svg) !== JSON.stringify(b.svg) || a.v !== b.v || JSON.stringify(a.x) !== JSON.stringify(b.x);
  const ra = a.r || [], rb = b.r || [];
  const rectSame = JSON.stringify(ra) === JSON.stringify(rb);
  const dy = rb[1] - ra[1];
  const onlyY = !rectSame && ra[0] === rb[0] && ra[2] === rb[2] && ra[3] === rb[3];
  if (!sd.length && !at && !tx && rectSame) { kinds.same++; continue; }
  if (!sd.length && !at && !tx && onlyY) { kinds.shifted.push([p, dy]); shifts.set(dy, (shifts.get(dy) || 0) + 1); continue; }
  kinds.other.push({ p, style: sd, attrs: at ? [a.at, b.at] : undefined, text: tx ? [a.t, b.t] : undefined, rect: rectSame ? undefined : [ra, rb] });
}
console.log('identical in style, rect, attributes and text: ' + kinds.same);
console.log('moved only in y: ' + kinds.shifted.length + ' — by ' + [...shifts].map(([d, n]) => d + 'px ×' + n).join(', '));
if (kinds.shifted.length) console.log('  first ' + kinds.shifted[0][0] + ', last ' + kinds.shifted[kinds.shifted.length - 1][0]);
console.log('anything else: ' + kinds.other.length);
for (const o of kinds.other) console.log('  ' + JSON.stringify(o).slice(0, 900));
