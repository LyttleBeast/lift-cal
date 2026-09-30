// ev3m: the fixture scene lays one chain of elements per style rule, in rule
// order, under html>body>div:6. B's chalk.css has one rule A's lacks
// ([data-vibe="chalk"] .cal-day.today), so B's fixture has one extra chain and
// every chain after it sits one index later (and, in flow, lower by its height).
// This takes B's extra chain out, renumbers the rest, undoes the flow shift,
// re-hashes, and compares again with the harness's own compareDumps: whatever
// remains is a real difference.
//   node ev3m-fixture-realign.mjs <runName> <width>
import { readGz, hashDump, compareDumps } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const [run, width] = process.argv.slice(2);
const dir = `/Users/micahflunker/dev/vibes-night/proof/${run}`;
const A = readGz(`${dir}/A/${width}/fixture.dump.json.gz`);
const B = readGz(`${dir}/B/${width}/fixture.dump.json.gz`);
const ROOT = 'html:1>body:1>div:6>div:';
const idx = p => { if (!p.startsWith(ROOT)) return null; const m = p.slice(ROOT.length).match(/^(\d+)/); return m ? +m[1] : null; };
// The inserted chain: the first top-level fixture index whose class chain in B
// differs from A's at the same index.
const topClass = (D, i) => D.els.filter(e => idx(e.p) === i).map(e => (e.at && e.at.class) || '').join('|');
let k = null;
for (let i = 1; i < 2000; i++) { if (topClass(A, i) !== topClass(B, i)) { k = i; break; } }
const ins = B.els.filter(e => idx(e.p) === k);
console.log('run', run, 'width', width, 'inserted B chain index', k, 'elements', ins.length, 'classes', ins.map(e => (e.at && e.at.class) || e.p.split('>').pop()).join(' / '));
const top = B.els.find(e => e.p === ROOT + k);
const H = top ? top.r[3] : 0, Y = top ? top.r[1] : 0;
console.log('its box', JSON.stringify(top && top.r), '— later in-flow chains sit', H, 'px lower in B');
// B's inserted element's computed border colours
const S = (D, e) => Object.fromEntries(D.props.map((p, i) => [p, D.styles[e.s][i]]));
for (const e of ins) if (e.at && /cal-day/.test(e.at.class || '')) { const st = S(B, e); console.log('  inserted', e.at.class, 'border-top-color', st['border-top-color'], 'border-top-width', st['border-top-width']); }
const renum = p => { const i = idx(p); return i !== null && i > k ? ROOT + (i - 1) + p.slice(ROOT.length + String(i).length) : p; };
const mapA = new Map(A.els.map(e => [e.p, e]));
let shifted = 0;
B.els = B.els.filter(e => idx(e.p) !== k).map(e => {
  const p = renum(e.p), a = mapA.get(p), r = [...e.r];
  if (a && idx(e.p) > k && r[1] >= Y + H - 0.001 && Math.abs(r[1] - H - a.r[1]) < 1e-6) { r[1] -= H; shifted++; }
  return { ...e, p, r };
});
for (const st of Object.values(B.states || {})) st.els = st.els.filter(e => idx(e.p) !== k).map(e => ({ ...e, p: renum(e.p), k: renum(e.k) }));
console.log('B elements renumbered', B.els.length, 'vs A', A.els.length, '; rects shifted back by', H, ':', shifted);
hashDump(A); hashDump(B);
const res = compareDumps(A, B, 100000);
const out = {};
for (const kind of ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs']) out[kind] = res[kind].count;
console.log('after realignment', JSON.stringify(out));
const sig = new Map();
for (const a of res.attrDiffs.first) { const s = a.attr + ' A=' + JSON.stringify(a.A) + ' B=' + JSON.stringify(a.B); sig.set(s, (sig.get(s) || 0) + 1); }
for (const [s, n] of sig) console.log('  attr', n, s);
for (const kind of ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'stateDiffs', 'keyframeDiffs', 'headDiffs'])
  for (const d of res[kind].first.slice(0, 15)) console.log('  !', kind, JSON.stringify(d).slice(0, 400));
