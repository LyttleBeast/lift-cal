// ev3x: the fixture scene lays one chain of elements per style rule, in rule
// order, under html>body>div:6. Between web main 53600fa (A) and engine v3 (B)
// the rule lists differ both ways: B's chalk.css gains one rule
// ([data-vibe="chalk"] .cal-day.today) and B's oxblood.css loses one
// ([data-vibe="oxblood"] .tog:not(.on)::after). A generalisation of
// ev3m-fixture-realign.mjs (one insertion only): the chains are aligned by the
// longest common subsequence of their class signatures; each chain one side
// alone has is reported and taken out; B's remaining chains are renumbered to
// A's; a rect that sits exactly as far lower (or higher) as the chains taken
// out before it add up to is moved back; and the harness's own compareDumps
// runs again. Whatever remains is a real difference.
//   node ev3x-fixture-realign.mjs <runName> <width>
import { readGz, hashDump, compareDumps } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const [run, width] = process.argv.slice(2);
const dir = `/Users/micahflunker/dev/vibes-night/proof/${run}`;
const A = readGz(`${dir}/A/${width}/fixture.dump.json.gz`);
const B = readGz(`${dir}/B/${width}/fixture.dump.json.gz`);
const ROOT = 'html:1>body:1>div:6>div:';
const idx = p => { if (!p || !p.startsWith(ROOT)) return null; const m = p.slice(ROOT.length).match(/^(\d+)/); return m ? +m[1] : null; };
const chains = D => {
  const m = new Map();
  for (const e of D.els) { const i = idx(e.p); if (i === null) continue; if (!m.has(i)) m.set(i, []); m.get(i).push(e); }
  return m;
};
const cA = chains(A), cB = chains(B);
const sig = list => list.map(e => e.p.slice(ROOT.length).replace(/^\d+/, '') + '.' + ((e.at && e.at.class) || '')).join('|');
const ia = [...cA.keys()].sort((x, y) => x - y), ib = [...cB.keys()].sort((x, y) => x - y);
const sa = ia.map(i => sig(cA.get(i))), sb = ib.map(i => sig(cB.get(i)));
// LCS
const n = sa.length, m = sb.length;
const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = sa[i] === sb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const pairs = [], onlyA = [], onlyB = [];
for (let i = 0, j = 0; i < n || j < m;) {
  if (i < n && j < m && sa[i] === sb[j]) { pairs.push([ia[i], ib[j]]); i++; j++; }
  else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { onlyB.push(ib[j]); j++; }
  else { onlyA.push(ia[i]); i++; }
}
const top = (D, i) => D.els.find(e => e.p === ROOT + i);
const S = (D, e) => Object.fromEntries(D.props.map((p, k) => [p, D.styles[e.s][k]]));
const describe = (D, cmap, i, side) => {
  const t = top(D, i);
  console.log(`only ${side}: chain ${i}, ${cmap.get(i).length} elements, box ${JSON.stringify(t && t.r)}, classes ${cmap.get(i).map(e => (e.at && e.at.class) || e.p.split('>').pop()).join(' / ')}`);
};
console.log('run', run, 'width', width, 'chains A', n, 'B', m, 'matched', pairs.length);
for (const i of onlyA) describe(A, cA, i, 'A');
for (const i of onlyB) describe(B, cB, i, 'B');
// The flow offset each matched B chain carries: heights of B-only chains
// above it, less heights of A-only chains above its A partner.
const h = (D, i) => { const t = top(D, i); return t ? t.r[3] : 0; };
const offB = new Map();
for (const [a, b] of pairs) {
  const plus = onlyB.filter(x => x < b).reduce((s, x) => s + h(B, x), 0);
  const minus = onlyA.filter(x => x < a).reduce((s, x) => s + h(A, x), 0);
  offB.set(b, { a, off: plus - minus });
}
const renum = p => { const i = idx(p); if (i === null) return p; const o = offB.get(i); return o ? ROOT + o.a + p.slice(ROOT.length + String(i).length) : p; };
const mapA = new Map(A.els.map(e => [e.p, e]));
let shifted = 0;
const dropA = new Set(onlyA), dropB = new Set(onlyB);
A.els = A.els.filter(e => !dropA.has(idx(e.p)));
B.els = B.els.filter(e => !dropB.has(idx(e.p))).map(e => {
  const i = idx(e.p), p = renum(e.p), r = [...e.r], a = mapA.get(p), o = i === null ? null : offB.get(i);
  if (a && o && o.off && Math.abs(r[1] - o.off - a.r[1]) < 1e-6) { r[1] -= o.off; shifted++; }
  return { ...e, p, r };
});
for (const st of Object.values(A.states || {})) st.els = st.els.filter(e => !dropA.has(idx(e.p)));
for (const st of Object.values(B.states || {})) st.els = st.els.filter(e => !dropB.has(idx(e.p))).map(e => ({ ...e, p: renum(e.p), k: renum(e.k) }));
console.log('A elements', A.els.length, 'B elements', B.els.length, '; rects moved back by their flow offset:', shifted);
hashDump(A); hashDump(B);
const res = compareDumps(A, B, 100000);
const out = {};
for (const kind of ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs']) out[kind] = res[kind].count;
console.log('after realignment', JSON.stringify(out));
const sg = new Map();
for (const a of res.attrDiffs.first) { const s = a.attr + ' A=' + JSON.stringify(a.A) + ' B=' + JSON.stringify(a.B); sg.set(s, (sg.get(s) || 0) + 1); }
for (const [s, k] of sg) console.log('  attr', k, s);
for (const kind of ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'stateDiffs', 'keyframeDiffs', 'headDiffs'])
  for (const d of res[kind].first.slice(0, 15)) console.log('  !', kind, JSON.stringify(d).slice(0, 400));
// The toggle chains: the off knob's ::after background on each side.
for (const [D, name] of [[A, 'A'], [B, 'B']]) for (const e of D.els) if (e.at && /(^| )tog( |$)/.test(e.at.class || '') && e.a !== undefined) {
  const st = Object.fromEntries(D.props.map((p, k) => [p, D.styles[e.a][k]]));
  console.log(`  ${name} ${e.p.slice(ROOT.length - 4)} .${e.at.class}::after background-color ${st['background-color']}`);
}
