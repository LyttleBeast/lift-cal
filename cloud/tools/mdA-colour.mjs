// Meet Day concept A ("The board"): every colour it sets, the text and
// graphic pairs that actually occur in its looks, colour vision (Machado 2009,
// severity 1, linear RGB; CIEDE2000), the Tailwind v3 guard and the lineup.
// Read-only arithmetic on track 4's library. Writes a markdown report to
// ~/dev/vibes-night/design/meet-day/scratch-A/colour-report.md and prints a
// short summary. usage: node mdA-colour.mjs
import fs from 'node:fs';
import { contrast, over, simulate, dE, lab, hexToRgb } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';
import { nearestTW } from '/Users/micahflunker/dev/vibes-night/tools/colour/tailwind.mjs';

// ---- the palette (concept A) ----
export const C = {
  rack: '#07080a',      // scoreboard black: the board, the gutters (MD-1)
  bar: '#16181d',       // a panel / cell, the sheet, the field (MD-1's #111317, lifted so a 2px gutter reads)
  collar: '#26292f',    // hairlines inside a panel (decorative)
  knurl: '#70767f',     // control edges, 3:1 on bar, rack and raised
  chalk: '#f5f0e3',     // lamp white: every word and figure
  steel: '#a8a295',     // secondary ink (MD-1)
  dim: '#9097a3',       // tertiary ink (MD-1, track 4)
  pRed: '#ff5a3c', pBlue: '#4d97ff', pYellow: '#ffe14d', pGreen: '#3cc4a0', pWhite: '#f2f2f2', pChrome: '#858c96',
  good: '#4be38a', warn: '#ffe14d', bad: '#ff5a3c',
  onYellow: '#07080a', onGreen: '#07080a', onPlate: '#07080a', white: '#07080a', pYellowPressed: '#d9d3c4', fallback: '#a8a295',
  accent: '#f5f0e3', focus: '#f5f0e3', accentPressed: '#d9d3c4', onAccent: '#07080a',
  danger: '#ff5a3c', onDanger: '#07080a', done: '#f5f0e3', onDone: '#07080a',
  well: '#07080a', knockout: '#07080a', inverse: '#f5f0e3', calMark: '#f5f0e3',
  raised: '#202329',    // the header band, the attempt box, a cell button
  track: '#2a2d33',     // an unlit lamp, the empty part of a meter or bar
  grip: '#70767f',      // the grab handle, a toggle's off track, the unlit lamp's ring
  faint: '#9097a3', onWarn: '#07080a', shade: '#000000', lift: '#ffffff',
  tileHero: '#202329', tileLit: '#1b1d22', band: null
};

const r = n => n.toFixed(2);
const L = [];
const pair = (group, fg, bg, need, where) => {
  const f = C[fg] || fg, b = C[bg] || bg;
  L.push({ group, fg, bg, f, b, need, where, cr: contrast(f, b) });
};
// ---- text on every surface a look puts it on (4.5, or 3 where large) ----
const SURF = ['rack', 'bar', 'raised', 'track'];
for (const t of ['chalk', 'steel', 'dim']) for (const s of SURF) pair('text', t, s, 4.5, 'ink on ' + s);
pair('text', 'knockout', 'inverse', 4.5, 'inverted cell: chosen chip, segment, dock tab, primary, current attempt box, toast');
pair('text', 'onAccent', 'accentPressed', 4.5, 'primary / FAB pressed');
pair('text', 'onDanger', 'danger', 4.5, 'swipe-to-delete panel');
pair('text', 'onWarn', 'warn', 4.5, 'native trial banner');
for (const s of ['bar', 'rack', 'raised']) for (const t of ['good', 'bad', 'warn', 'danger']) pair('text', t, s, 4.5, 'status / danger words on ' + s);
for (const p of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome']) {
  pair('text', p, 'bar', 4.5, 'data colour as small text on a panel');
  pair('text', p, 'rack', 4.5, 'data colour as small text on the board');
  pair('text', p, 'raised', 4.5, 'W/F/D letter or group word on the band / attempt box');
  pair('text', 'onPlate', p, 4.5, 'plate chip figure');
}
pair('text', 'chalk', over(C.accent, 0.28, C.bar), 4.5, 'set flash peak (accent .28 over a panel)');
pair('text', 'chalk', over(C.accent, 0.38, C.bar), 4.5, 'coach pulse peak (accent .38 over a panel)');
pair('text', 'chalk', over(C.accent, 0.10, C.bar), 4.5, 'picker selection (pickSel .10)');
pair('text', 'chalk', over(C.lift, 0.05, C.bar), 4.5, 'pressed row (rowPress .05)');
// flap halves: the hero figure over the seam, in lamp or in its zone colour
for (const s of ['track', 'raised']) for (const t of ['chalk', 'pBlue', 'pYellow', 'pRed', 'pWhite', 'good']) pair('large', t, s, 3, 'hero figure (>= 36px) on the flap ' + (s === 'track' ? 'top' : 'bottom') + ' half');
// ---- graphics (3:1) ----
for (const s of ['bar', 'rack']) for (const g of ['knurl', 'focus', 'accent']) pair('ui', g, s, 3, g + ' against ' + s);
pair('ui', 'knurl', 'raised', 3, 'control edge on the band');
pair('ui', 'grip', 'bar', 3, 'grab handle on the sheet (decision c)');
pair('ui', 'grip', 'track', 1, 'unlit lamp ring against its own fill (info)');
pair('ui', 'grip', 'bar', 3, 'unlit lamp ring against the set row');
pair('ui', 'done', 'well', 3, 'lit lamp in the check box');
pair('ui', 'done', 'track', 3, 'lit lamp against an unlit one (state by brightness)');
pair('ui', 'inverse', 'rack', 3, 'the inverted dock cell against the dock board');
pair('ui', 'rack', 'bar', 1, 'gutter against a panel (info; the gutter is structure, the words carry the meaning)');
pair('ui', 'raised', 'bar', 1, 'band against its panel (info)');
for (const p of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome', 'good', 'warn', 'bad']) {
  pair('ui', p, 'bar', 3, 'mark on a panel (bar, dot, line, sliver)');
  pair('ui', p, 'track', 3, 'meter fill against its empty track');
  pair('ui', p, 'rack', 3, 'mark on the board');
}
pair('ui', 'calMark', over(C.pBlue, 0.16, C.track), 3, 'the white head on the cut zone');
pair('ui', 'calMark', over(C.pYellow, 0.18, C.track), 3, 'the white head on the hold zone');
pair('ui', 'calMark', over(C.pRed, 0.16, C.track), 3, 'the white head on the gain zone');
pair('ui', 'pBlue', 'bar', 3, 'drop rail (dropRail a 1) on a panel');

// ---- colour vision ----
const GROUPS = [['pRed', 'chest'], ['pBlue', 'back'], ['pYellow', 'legs'], ['pGreen', 'shoulders'], ['pWhite', 'arms'], ['pChrome', 'core']];
const KINDS = ['normal', 'deutan', 'protan', 'tritan'];
const cvd = {};
for (const k of KINDS) {
  const sim = GROUPS.map(([key, g]) => ({ key, g, hex: simulate(C[key], k) }));
  const prs = [];
  for (let i = 0; i < sim.length; i++) for (let j = i + 1; j < sim.length; j++) prs.push({ pair: sim[i].g + '/' + sim[j].g, de: dE(sim[i].hex, sim[j].hex) });
  prs.sort((a, b) => a.de - b.de);
  cvd[k] = { sim, prs, gb: dE(simulate(C.good, k), simulate(C.bad, k)), gw: dE(simulate(C.good, k), simulate(C.warn, k)), wb: dE(simulate(C.warn, k), simulate(C.bad, k)),
    lampBad: dE(simulate(C.done, k), simulate(C.bad, k)) };
}
// accent (the lamp) against data and status, for the inversion exemption
const accNear = KINDS.slice(0, 3).map(k => {
  const all = [...GROUPS, ['good', 'good'], ['warn', 'warn'], ['bad', 'bad']].map(([key, g]) => ({ g, de: dE(simulate(C.accent, k), simulate(C[key], k)) })).sort((a, b) => a.de - b.de);
  return k + ' ' + all.slice(0, 2).map(x => x.g + ' ' + r(x.de)).join(', ');
});
// ---- guard and lineup ----
const oklchC = hex => { // OKLab chroma, for the "chromatic" test (C >= 0.015)
  const [R, G, B] = hexToRgb(hex).map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, b = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return Math.hypot(a, b);
};
const guard = ['rack', 'bar', 'raised', 'track', 'accent', 'accentPressed', 'good', 'pRed', 'pBlue', 'pYellow', 'pGreen'].map(k => { const [n, d] = nearestTW(C[k]); return `${k} ${C[k]} C=${oklchC(C[k]).toFixed(3)} nearest ${n} ${r(d)}`; });
const LINEUP = { v1: ['#14161a', '#1c1f26', '#f0be1e'], 'iron-age': ['#ede3cc', '#f6efdd', '#a1374f'], chalk: ['#e8ebeb', '#f8fafa', '#6c3058'],
  navy: ['#0a183b', '#0f223f', '#acdc9c'], oxblood: ['#1a0f11', '#241518', '#a8d8ff'], ledger: ['#0e1813', '#15231b', '#ffb3c8'], 'clear-sky': ['#b1cfe5', '#f9fbfc', '#083366'] };
const lineup = Object.entries(LINEUP).map(([id, [g, c, a]]) => `${id}: ground ${r(dE(C.rack, g))}, panel ${r(dE(C.bar, c))}, accent ${r(dE(C.accent, a))}`);

// ---- report ----
const md = [];
md.push('<!-- generated by ~/dev/vibes-night/tools/mdA-colour.mjs; do not hand-edit -->');
for (const g of ['text', 'large', 'ui']) {
  md.push(`\n| ${g === 'ui' ? 'graphic' : g === 'large' ? 'large text (3:1)' : 'text'} | on | ratio | needs | where |`);
  md.push('|---|---|---|---|---|');
  for (const x of L.filter(y => y.group === g)) md.push(`| ${x.fg} \`${x.f}\` | ${C[x.bg] ? x.bg + ' ' : ''}\`${x.b}\` | ${r(x.cr)}${x.cr < x.need ? ' **FAIL**' : ''} | ${x.need} | ${x.where} |`);
}
md.push('\n| group | role | normal | L* | deuteranopia | protanopia |');
md.push('|---|---|---|---|---|---|');
GROUPS.forEach(([k, g], i) => md.push(`| ${g} | ${k} | \`${C[k]}\` | ${lab(C[k])[0].toFixed(1)} | \`${cvd.deutan.sim[i].hex}\` | \`${cvd.protan.sim[i].hex}\` |`));
md.push('\n| pair | normal | deutan | protan | tritan |');
md.push('|---|---|---|---|---|');
const byPair = {};
for (const k of KINDS) for (const x of cvd[k].prs) (byPair[x.pair] ||= {})[k] = x.de;
Object.entries(byPair).sort((a, b) => Math.min(a[1].deutan, a[1].protan) - Math.min(b[1].deutan, b[1].protan)).forEach(([p, v]) => md.push(`| ${p} | ${r(v.normal)} | ${r(v.deutan)} | ${r(v.protan)} | ${r(v.tritan)} |`));
md.push('\n' + KINDS.map(k => `${k}: worst group ${cvd[k].prs[0].pair} ${r(cvd[k].prs[0].de)}; good/bad ${r(cvd[k].gb)}; good/warn ${r(cvd[k].gw)}; warn/bad ${r(cvd[k].wb)}; lit lamp/bad ${r(cvd[k].lampBad)}`).join('  \n'));
md.push('\nAccent (the lamp) nearest data/status: ' + accNear.join(' | '));
md.push('\nGuard (Tailwind v3, 242):  \n' + guard.join('  \n'));
md.push('\nLineup (CIEDE2000):  \n' + lineup.join('  \n'));
fs.mkdirSync('/Users/micahflunker/dev/vibes-night/design/meet-day/scratch-A', { recursive: true });
fs.writeFileSync('/Users/micahflunker/dev/vibes-night/design/meet-day/scratch-A/colour-report.md', md.join('\n') + '\n');
const fails = L.filter(x => x.cr < x.need);
console.log('pairs', L.length, 'fails', fails.length);
for (const x of fails) console.log('  FAIL', x.group, x.fg, x.f, 'on', x.bg, x.b, r(x.cr), '<', x.need, '-', x.where);
for (const k of KINDS) console.log(k, 'worst', cvd[k].prs[0].pair, r(cvd[k].prs[0].de), cvd[k].prs[1].pair, r(cvd[k].prs[1].de), '| good/bad', r(cvd[k].gb), '| warn/bad', r(cvd[k].wb), '| lamp/bad', r(cvd[k].lampBad));
console.log('accent near:', accNear.join(' | '));
console.log(guard.join('\n'));
console.log(lineup.join('\n'));
const mins = L.filter(x => x.group === 'text').sort((a, b) => a.cr - b.cr).slice(0, 8).map(x => `${x.fg}/${x.bg} ${r(x.cr)}`);
console.log('lowest text:', mins.join(', '));
