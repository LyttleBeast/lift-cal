// Fixture re-alignment for a vibe's own rules (V59 §13.4, Chalk, gate v1 rs9).
// capture.js buildFixture() makes one wrap per style rule; a vibe's
// `[data-vibe="<id>"] …` rules become wraps whose first element carries
// data-vibe="<id>" (its `:root[data-vibe=…]` rules are skipped as root rules).
// This drops every B wrap with any element carrying that attribute value,
// renumbers, and compares the rest (and the page outside the fixture) with A:
// style (and ::before/::after), rect, attributes, text/svg/value.
// Usage: node chalk-rs9-fixture.mjs <A.dump.json.gz> <B.dump.json.gz> <vibeId> [classRegex]
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [fa, fb, vibe, clsRe] = process.argv.slice(2);
const CRE = clsRe ? new RegExp(clsRe) : null; // optional: also drop B wraps whose classes match (the engine's own vibe-sheet rules)
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
const A = load(fa), B = load(fb);
const fxPath = d => (d.els.find(e => e.at && e.at.id === '__fx') || {}).p;
function split(d) {
  const fx = fxPath(d);
  const page = d.els.filter(e => !(e.p === fx || e.p.startsWith(fx + '>')));
  const wraps = [];
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
const isVibe = w => w.els.some(x => x.e.at && x.e.at['data-vibe'] === vibe) || (CRE && CRE.test(w.els.map(x => (x.e.at && x.e.at.class) || '').join(' ')));
const dropped = b.wraps.filter(isVibe), keptB = b.wraps.filter(w => !isVibe(w));
const droppedA = a.wraps.filter(isVibe);
console.log(`fixture: A ${a.wraps.length} wraps (${droppedA.length} carry data-vibe=${vibe}), B ${b.wraps.length}; dropped from B ${dropped.length} (${dropped.reduce((n, w) => n + w.els.length, 0)} elements)`);
const COMMON = new Set(A.props.filter(p => B.props.includes(p)));
const onlyProps = [...A.props.filter(p => !COMMON.has(p)).map(p => 'A:' + p), ...B.props.filter(p => !COMMON.has(p)).map(p => 'B:' + p)];
if (onlyProps.length) console.log('properties one dump alone enumerates (not compared): ' + onlyProps.join(', '));
const style = (d, i) => { const v = d.styles[i]; return v ? Object.fromEntries(d.props.map((p, k) => [p, v[k]])) : {}; };
function diff(ea, eb) {
  const out = [];
  for (const [key, pseudo] of [['s', ''], ['b', '::before'], ['a', '::after']]) {
    const sa = ea[key] == null ? {} : style(A, ea[key]), sb = eb[key] == null ? {} : style(B, eb[key]);
    // Across two runs Chrome may enumerate a property one side's build lacks
    // (frame-sizing); only the properties both dumps enumerate are compared.
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (COMMON.has(k) && sa[k] !== sb[k]) out.push(pseudo + k + ': ' + sa[k] + ' → ' + sb[k]);
  }
  if (JSON.stringify(ea.r) !== JSON.stringify(eb.r)) {
    const onlyY = ea.r && eb.r && ea.r[0] === eb.r[0] && ea.r[2] === eb.r[2] && ea.r[3] === eb.r[3];
    out.push(onlyY ? 'dy ' + Math.round((eb.r[1] - ea.r[1]) * 1000) / 1000 : 'rect ' + JSON.stringify(ea.r) + ' → ' + JSON.stringify(eb.r));
  }
  if (JSON.stringify(ea.at || {}) !== JSON.stringify(eb.at || {})) out.push('attrs ' + JSON.stringify(ea.at) + ' → ' + JSON.stringify(eb.at));
  if (ea.t !== eb.t || JSON.stringify(ea.svg) !== JSON.stringify(eb.svg) || ea.v !== eb.v || JSON.stringify(ea.x) !== JSON.stringify(eb.x)) out.push('text/svg/value');
  return out;
}
let same = 0; const bad = [];
const pb = new Map(b.page.map(e => [e.p, e]));
for (const e of a.page) { const o = pb.get(e.p); if (!o) { bad.push('page only A ' + e.p); continue; } const d = diff(e, o); if (d.length) bad.push('page ' + e.p + ': ' + d.slice(0, 4).join('; ')); else same++; }
if (b.page.length !== a.page.length) bad.push(`page: A ${a.page.length} elements, B ${b.page.length}`);
if (keptB.length !== a.wraps.length) bad.push(`fixture: A ${a.wraps.length} wraps, B ${keptB.length} after dropping`);
for (let i = 0; i < Math.min(a.wraps.length, keptB.length); i++) {
  const wa = a.wraps[i], wb = keptB[i];
  if (wa.els.length !== wb.els.length || wa.els.some((x, k) => x.rel !== wb.els[k].rel)) { bad.push('wrap ' + i + ' shape: ' + cls(wa) + ' / ' + cls(wb)); continue; }
  wa.els.forEach((x, k) => { const d = diff(x.e, wb.els[k].e); if (d.length) bad.push('wrap ' + i + ' (' + cls(wa) + ')' + x.rel + ': ' + d.slice(0, 4).join('; ')); else same++; });
}
const shifted = bad.filter(x => /: dy [-\d.]+$/.test(x));
const dys = new Map(); shifted.forEach(x => { const d = x.split(': dy ')[1]; dys.set(d, (dys.get(d) || 0) + 1); });
const rest = bad.filter(x => !shifted.includes(x));
console.log(`identical after re-alignment: ${same} elements`);
console.log(`moved only in y, nothing else different: ${shifted.length} — ${[...dys].map(([d, n]) => d + 'px ×' + n).join(', ')}`);
console.log(`anything else: ${rest.length}`);
rest.slice(0, 40).forEach(x => console.log('  ' + x.slice(0, 500)));
process.exit(rest.length ? 3 : 0);
