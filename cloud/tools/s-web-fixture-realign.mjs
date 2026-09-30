// The fixture scene (capture.js buildFixture): one wrap per style rule's selector
// inside div#__fx, in stylesheet order, paired by position by the harness — so
// rules added in B shift every later wrap. This drops each B wrap whose chain
// names a class matching <classRegex>, renumbers the rest, and compares every
// element (the page and the fixture) with A: style (and ::before/::after),
// rect, attributes, text.
// Usage: node s-web-fixture-realign.mjs <A.dump.json.gz> <B.dump.json.gz> <classRegex>
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [fa, fb, cre] = process.argv.slice(2);
const re = new RegExp(cre);
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const A = load(fa), B = load(fb);
const fxPath = d => (d.els.find(e => e.at && e.at.id === '__fx') || {}).p;
function split(d) {
  const fx = fxPath(d);
  const page = d.els.filter(e => !(e.p === fx || e.p.startsWith(fx + '>')));
  const wraps = [];      // [{ idx, els: [{ rel, e }] }]
  for (const e of d.els) {
    if (!e.p.startsWith(fx + '>')) continue;
    const rest = e.p.slice(fx.length + 1), seg = rest.split('>')[0];
    const n = +seg.split(':')[1];
    let w = wraps.find(x => x.idx === n);
    if (!w) { w = { idx: n, els: [] }; wraps.push(w); }
    w.els.push({ rel: rest.slice(seg.length), e });
  }
  wraps.sort((x, y) => x.idx - y.idx);
  return { fx, page, wraps };
}
const a = split(A), b = split(B);
const cls = w => w.els.map(x => (x.e.at && x.e.at.class) || '').join(' ');
const dropped = b.wraps.filter(w => re.test(cls(w)));
const keptB = b.wraps.filter(w => !re.test(cls(w)));
console.log(`fixture: A ${a.wraps.length} wraps, B ${b.wraps.length}; B wraps naming ${re}: ${dropped.length} (${dropped.reduce((n, w) => n + w.els.length, 0)} elements)`);
dropped.forEach(w => console.log('  dropped: ' + w.els.map(x => x.rel.replace(/^>/, '') + '.' + ((x.e.at && x.e.at.class) || '').replace(/ /g, '.')).join(' | ')));
const style = (d, i) => { const v = d.styles[i]; return v ? Object.fromEntries(d.props.map((p, k) => [p, v[k]])) : {}; };
function diff(ea, eb) {
  const out = [];
  for (const [key, pseudo] of [['s', ''], ['b', '::before'], ['a', '::after']]) {
    const sa = ea[key] == null ? {} : style(A, ea[key]), sb = eb[key] == null ? {} : style(B, eb[key]);
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (sa[k] !== sb[k]) out.push(pseudo + k + ': ' + sa[k] + ' → ' + sb[k]);
  }
  if (JSON.stringify(ea.r) !== JSON.stringify(eb.r)) {
    const onlyY = ea.r && eb.r && ea.r[0] === eb.r[0] && ea.r[2] === eb.r[2] && ea.r[3] === eb.r[3];
    out.push(onlyY ? 'dy ' + Math.round((eb.r[1] - ea.r[1]) * 1000) / 1000 : 'rect ' + JSON.stringify(ea.r) + ' → ' + JSON.stringify(eb.r));
  }
  if (JSON.stringify(ea.at || {}) !== JSON.stringify(eb.at || {})) out.push('attrs ' + JSON.stringify(ea.at) + ' → ' + JSON.stringify(eb.at));
  if (ea.t !== eb.t || JSON.stringify(ea.svg) !== JSON.stringify(eb.svg) || ea.v !== eb.v) out.push('text/svg/value');
  return out;
}
let same = 0; const bad = [];
// the page outside the fixture box
const pb = new Map(b.page.map(e => [e.p, e]));
for (const e of a.page) { const o = pb.get(e.p); if (!o) { bad.push('page only A ' + e.p); continue; } const d = diff(e, o); if (d.length) bad.push('page ' + e.p + ': ' + d.slice(0, 4).join('; ')); else same++; }
if (b.page.length !== a.page.length) bad.push(`page: A ${a.page.length} elements, B ${b.page.length}`);
// the fixture, wrap by wrap in order
if (keptB.length !== a.wraps.length) bad.push(`fixture: A ${a.wraps.length} wraps, B ${keptB.length} after dropping`);
for (let i = 0; i < Math.min(a.wraps.length, keptB.length); i++) {
  const wa = a.wraps[i], wb = keptB[i];
  if (wa.els.length !== wb.els.length || wa.els.some((x, k) => x.rel !== wb.els[k].rel)) { bad.push('wrap ' + i + ' shape: ' + cls(wa) + ' / ' + cls(wb)); continue; }
  wa.els.forEach((x, k) => { const d = diff(x.e, wb.els[k].e); if (d.length) bad.push('wrap ' + i + ' (' + cls(wa) + ')' + x.rel + ': ' + d.slice(0, 4).join('; ')); else same++; });
}
const shifted = bad.filter(x => /: dy [-\d.]+$/.test(x));
const dys = new Map(); shifted.forEach(x => { const d = x.split(': dy ')[1]; dys.set(d, (dys.get(d) || 0) + 1); });
const rest = bad.filter(x => !shifted.includes(x));
console.log(`identical after re-alignment: ${same} elements (page ${a.page.length}, fixture ${a.wraps.reduce((n, w) => n + w.els.length, 0)})`);
console.log(`moved only in y, nothing else different: ${shifted.length} — ${[...dys].map(([d, n]) => d + 'px ×' + n).join(', ')}` +
  (shifted.length ? ` (${shifted[0].split(':')[0]} … ${shifted[shifted.length - 1].split(':')[0]})` : ''));
console.log(`anything else: ${rest.length}`);
rest.slice(0, 40).forEach(x => console.log('  ' + x.slice(0, 500)));
