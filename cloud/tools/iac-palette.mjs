// Concept C (iron-age, "The Apparatus Catalogue"): every colour role, every text-on-surface pair the
// looks actually produce, CVD (Machado 2009) for the six groups, and the guards (Tailwind v3 full list,
// the corrected cream band). Deterministic; writes design/iron-age/concept-C/palette-check.md.
// node iac-palette.mjs
import { contrast, dE, simulate, over, lum, hexToRgb, rgbToHex } from './colour/colour-lib.mjs';
import { nearestTW } from './colour/tailwind.mjs';
import { writeFileSync } from 'node:fs';

const C = {
  rack: '#e6dec9', bar: '#ebe4ce', well: '#e0d7c0', raised: '#dbd1b8', grip: '#7a6d56', track: '#d3c8ad',
  tileHero: '#e6dec9', tileLit: '#e6dec9',
  collar: '#cfc4a9', knurl: '#84775f',
  chalk: '#1c1712', steel: '#4a3f31', dim: '#5f5343', faint: '#5f5343',
  inverse: '#1c1712', knockout: '#e6dec9', calMark: '#ffffff',
  accent: '#a1374f', accentPressed: '#8e3548', onAccent: '#f7f2e4', focus: '#a1374f',
  danger: '#82180c', onDanger: '#f7f2e4', done: '#0e5f40', onDone: '#f7f2e4',
  good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', onWarn: '#f7f2e4',
  pRed: '#82180c', pBlue: '#1f4a72', pYellow: '#90620b', pGreen: '#0e5f40', pWhite: '#2a241d', pChrome: '#6a6d6c',
  onPlate: '#f7f2e4', shade: '#1c1712', lift: '#1c1712',
  // legacy aliases, filled by build()
  onYellow: '#f7f2e4', onGreen: '#f7f2e4', white: '#f7f2e4', pYellowPressed: '#8e3548', fallback: '#4a3f31'
};
const PROPOSED = { band: '#1c1712' };
const TINT = {
  setDone: ['done', 0.10], setFlash: ['accent', 0.14], tagW: ['warn', 0.10], tagF: ['bad', 0.10], tagD: ['pBlue', 0.10],
  dropRail: ['pBlue', 0.72], dropAdd: ['pBlue', 0.35], pickSel: ['accent', 0.08], block: ['accent', 0],
  coachBase: ['accent', 0.14], coachLow: ['accent', 0.07], coachHigh: ['accent', 0.38],
  reviewBg: ['accent', 0.06], reviewBorder: ['accent', 0.78], rowPress: ['lift', 0.06], pillBase: ['lift', 0],
  pillUp: ['good', 0], pillDown: ['bad', 0], pillWarn: ['warn', 0],
  zoneCut: ['pBlue', 0.14], zoneHold: ['pYellow', 0.18], zoneGain: ['pRed', 0.12],
  dockGlass: ['rack', 1], wkBarGlass: ['rack', 1], backdrop: ['shade', 0.45],
  trajGood: ['good', 0.14], trajWarn: ['warn', 0.14], trajBad: ['bad', 0.14]
};
const tint = (k, bg) => over(C[TINT[k][0]], TINT[k][1], bg);

// Paper grain (T7 G.2): the 'book' tile's darkest pixel on r2g is #ddd5c1 (SYNTHESIS §5.8 extras).
// Concept C ships the 'fresh' preset (sigma 0.30 %, PC 1908) — scale book's darkest excursion by 0.30/1.14.
// ESTIMATE: Phase Q renders the real tile on this stock and re-measures the darkest pixel.
const bookDark = '#ddd5c1';
const kFresh = 0.30 / 1.14;
const freshDark = rgbToHex(hexToRgb(C.rack).map((v, i) => v - (v - hexToRgb(bookDark)[i]) * kFresh));

const rows = [];
const pair = (fg, bg, need, where) => {
  const fgHex = C[fg] || PROPOSED[fg] || fg, bgHex = bg.startsWith('#') ? bg : (C[bg] || PROPOSED[bg]);
  const r = contrast(fgHex, bgHex);
  rows.push({ fg, bg, fgHex, bgHex, r, need, where, ok: r >= need });
};
const S = { rack: 'rack', grain: freshDark, bar: 'bar', well: 'well', raised: 'raised' };

// --- text on the page and the plate paper (every text role) ---
for (const [sn, s] of Object.entries(S)) {
  pair('chalk', s, 4.5, 'body, heads, figures on ' + sn);
  pair('steel', s, 4.5, 'secondary text, labels, notes on ' + sn);
  pair('dim', s, 4.5, 'placeholders, dock rest labels, meta on ' + sn);
}
for (const s of ['rack', freshDark, 'bar']) {
  pair('accent', s, 4.5, 'Coach title / link / PR text');
  for (const k of ['good', 'warn', 'bad', 'danger', 'pRed', 'pBlue', 'pGreen', 'pWhite'])
    pair(k, s, 4.5, k + ' as small text (deltas, status, group values, errors)');
  pair('pYellow', s, 3, 'pYellow as LARGE text only (>=18 pt / 14 pt bold), e.g. Weight figure; small text uses warn (inkOf)');
  pair('pChrome', s, 3, 'pChrome as LARGE text / graphic only; small text uses steel (inkOf)');
}
// --- ink on fills ---
pair('knockout', 'inverse', 4.5, 'primary button, chosen chip / segment, toast, FAB (inverse looks)');
pair('#ffffff', 'band', 4.5, 'web status-bar text on the dark band (proposed role `band`)');
pair('onAccent', 'accent', 4.5, '.badge / any accent fill with words');
pair('onAccent', 'accentPressed', 4.5, 'accent fill pressed');
pair('onDanger', 'danger', 4.5, 'swipe-to-delete label');
pair('onDone', 'done', 3, 'the drawn tick on a done set check (graphic)');
pair('onWarn', 'warn', 4.5, 'native trial banner');
for (const p of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome']) pair('onPlate', p, 4.5, 'figure on a filled plate (v1-look sites, admin bars)');
// --- tints under text ---
for (const [k, bg] of [['setDone', 'rack'], ['setFlash', 'rack'], ['pickSel', 'bar'], ['pickSel', 'rack'], ['rowPress', 'rack'], ['rowPress', 'bar'], ['reviewBg', 'bar']]) {
  const t = tint(k, C[bg]);
  pair('chalk', t, 4.5, `ink on ${k} over ${bg}`);
  pair('steel', t, 4.5, `steel on ${k} over ${bg}`);
  pair('dim', t, 4.5, `dim on ${k} over ${bg}`);
}
// The coach pulse fills the 30 x 30 set check only (no words sit on it); its edge is what must show.
pair('knurl', tint('coachHigh', C.rack), 1, 'set-check edge at the coach pulse peak (information: the pulse is a fill, the knurl edge stays)');
pair('warn', tint('tagW', C.rack), 4.5, 'W letter on its (unused) tag wash');
// --- graphics (3:1) ---
for (const s of ['rack', 'bar']) {
  pair('knurl', s, 3, 'control edge: set check, sheet top, peek bar / rest pill keyline');
  pair('grip', s, 3, 'grab handle (R8.5), toggle off track');
  pair('focus', s, 3, 'focus ring / focused field rule');
  pair('chalk', s, 3, 'rules and keylines (shape.rule.ink, shape.keyline)');
  for (const p of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome']) pair(p, s, 3, 'chart mark / plate keyline / group tag');
}
pair('focus', 'well', 3, 'focus ring on a well control');
pair(tint('dropRail', C.rack), 'rack', 3, 'drop-set rail (pBlue .72)');
pair(tint('reviewBorder', C.bar), 'bar', 3, 'estimator review row border (accent .78)');
pair('calMark', 'track', 1, 'calorie head on the track: WHITE (HUE_NAMED) — carried by its 1 pt ink keyline, see next row');
pair('chalk', 'track', 3, 'the ink keyline around every calMark mark, against the track');
pair('chalk', 'calMark', 3, 'the ink keyline against the white head it rings');
pair('pYellow', 'collar', 3, 'heat strip: trained (pYellow) against untrained (collar) — PINNED_PAINT');
pair('pYellow', 'knurl', 1, 'sparkline: lit (pYellow) against unlit bars (knurl) — PINNED_PAINT; see dE below');

// --- CVD ---
const groups = { chest: C.pRed, back: C.pBlue, legs: C.pYellow, shoulders: C.pGreen, arms: C.pWhite, core: C.pChrome };
const sims = {}; const kinds = ['normal', 'deutan', 'protan'];
for (const k of kinds) sims[k] = Object.fromEntries(Object.entries(groups).map(([g, h]) => [g, simulate(h, k)]));
const gk = Object.keys(groups); const pairs = [];
for (let i = 0; i < gk.length; i++) for (let j = i + 1; j < gk.length; j++)
  pairs.push({ a: gk[i], b: gk[j], ...Object.fromEntries(kinds.map(k => [k, dE(sims[k][gk[i]], sims[k][gk[j]])])) });
pairs.sort((x, y) => Math.min(x.deutan, x.protan) - Math.min(y.deutan, y.protan));
const worst = Object.fromEntries(kinds.map(k => [k, Math.min(...pairs.map(p => p[k]))]));

// accent distance from data and status, and the guards
const dataStatus = { ...groups, good: C.good, warn: C.warn, bad: C.bad };
const accNear = kinds.map(k => { const a = simulate(C.accent, k); const d = Object.entries(dataStatus).map(([n, h]) => [n, dE(a, simulate(h, k))]).sort((x, y) => x[1] - y[1])[0]; return `${k} ${d[0]} ${d[1].toFixed(2)}`; });
const guard = ['rack', 'bar', 'well', 'raised', 'accent', 'accentPressed'].map(k => { const t = nearestTW(C[k]); return `${k} ${C[k]}: nearest ${t[0]} ${t[1].toFixed(2)}`; });
const creamBand = h => { const [r, g, b] = hexToRgb(h); return Math.min(r, g, b) >= 0xe0 && r - b >= 5 && r - b <= 24; };
const AI = ['#f4f1ea', '#f7f1e4', '#f5f1e8', '#faf8f5', '#f0ebe0'];
const creams = ['rack', 'bar', 'well'].map(k => `${k} ${C[k]}: in band ${creamBand(C[k])}; nearest AI cream ${AI.map(c => [c, dE(C[k], c)]).sort((x, y) => x[1] - y[1])[0].map(v => typeof v === 'number' ? v.toFixed(2) : v).join(' ')}`);
const v1 = { rack: '#14161a' };

// --- write ---
const f = n => n.toFixed(2);
let md = `# Concept C palette check (generated by tools/iac-palette.mjs; do not hand-edit)\n\n`;
md += `Stock r2g ${C.rack}; paper grain preset 'fresh' darkest pixel (estimate) ${freshDark}. WCAG 2.x contrast; Machado 2009 CVD at severity 1.0 in linear RGB; CIEDE2000. Library: tools/colour/colour-lib.mjs (selftest passes).\n\n`;
md += `## Pairs (${rows.length}; failures: ${rows.filter(r => !r.ok).length})\n\n| fg | on | ratio | needs | where |\n|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.fg} \`${r.fgHex}\` | ${r.bg.startsWith('#') ? '' : r.bg + ' '}\`${r.bgHex}\` | ${f(r.r)}${r.ok ? '' : ' **FAIL**'} | ${r.need} | ${r.where} |\n`;
md += `\n## Six group colours under colour-vision deficiency\n\n| group | normal | deuteranopia | protanopia |\n|---|---|---|---|\n`;
for (const g of gk) md += `| ${g} | \`${groups[g]}\` | \`${sims.deutan[g]}\` | \`${sims.protan[g]}\` |\n`;
md += `\n| pair | normal | deutan | protan |\n|---|---|---|---|\n`;
for (const p of pairs) md += `| ${p.a}/${p.b} | ${f(p.normal)} | ${f(p.deutan)} | ${f(p.protan)} |\n`;
md += `\n**Worst pairwise ΔE00:** normal ${f(worst.normal)}, deuteranopia ${f(worst.deutan)}, protanopia ${f(worst.protan)}.\n\n`;
md += `good vs bad: normal ${f(dE(C.good, C.bad))}, deutan ${f(dE(simulate(C.good, 'deutan'), simulate(C.bad, 'deutan')))}, protan ${f(dE(simulate(C.good, 'protan'), simulate(C.bad, 'protan')))}.\n\n`;
md += `Sparkline lit (pYellow) vs unlit (knurl): normal ${f(dE(C.pYellow, C.knurl))}, deutan ${f(dE(simulate(C.pYellow, 'deutan'), simulate(C.knurl, 'deutan')))}, protan ${f(dE(simulate(C.pYellow, 'protan'), simulate(C.knurl, 'protan')))}; luminance ratio ${f(contrast(C.pYellow, C.knurl))}.\n\n`;
md += `Accent's nearest data/status colour: ${accNear.join('; ')}. Accent vs danger: normal ${f(dE(C.accent, C.danger))}.\n\n`;
md += `## Guards\n\n- Tailwind v3 (full 242, tailwindcss@3.4.17), R2.7 wants ≥ 5: ${guard.join('; ')}.\n- Cream band (R3.5): ${creams.join('; ')}.\n- Distance from v1's ground: ΔE00 ${f(dE(C.rack, v1.rack))}.\n- Luminance steps: bar/rack ${f(contrast(C.bar, C.rack))}, rack/well ${f(contrast(C.rack, C.well))}, rack/raised ${f(contrast(C.rack, C.raised))}, rack/track ${f(contrast(C.rack, C.track))}, rack/collar ${f(contrast(C.rack, C.collar))}, bar/collar ${f(contrast(C.bar, C.collar))}.\n`;
md += `\n## Tints, flattened\n\n| tint | role · α | over rack | over bar |\n|---|---|---|---|\n`;
for (const [k, [r, a]] of Object.entries(TINT)) md += `| ${k} | ${r} · ${a} | \`${over(C[r], a, C.rack)}\` | \`${over(C[r], a, C.bar)}\` |\n`;
writeFileSync('/Users/micahflunker/dev/vibes-night/design/iron-age/concept-C/palette-check.md', md);
console.log(`pairs ${rows.length}, failures ${rows.filter(r => !r.ok).length}`);
for (const r of rows.filter(r => !r.ok)) console.log('  FAIL', r.fg, r.fgHex, 'on', r.bgHex, f(r.r), 'needs', r.need, '-', r.where);
console.log('worst CVD', JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(2)]))), 'lowest pairs:', pairs.slice(0, 3).map(p => `${p.a}/${p.b} d${f(p.deutan)} p${f(p.protan)}`).join(', '));
console.log('fresh grain darkest (estimate)', freshDark);
console.log('guards:', guard.join(' | '));
console.log('creams:', creams.join(' | '));
console.log('accent nearest:', accNear.join(' | '));
console.log('spark lit/unlit dE normal', f(dE(C.pYellow, C.knurl)), 'deutan', f(dE(simulate(C.pYellow, 'deutan'), simulate(C.knurl, 'deutan'))), 'protan', f(dE(simulate(C.pYellow, 'protan'), simulate(C.knurl, 'protan'))));
