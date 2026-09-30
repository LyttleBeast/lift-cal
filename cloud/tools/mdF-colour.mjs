// mdF-colour.mjs — Meet Day final (Phase D): every contrast and colour-vision
// figure the spec quotes, computed from vibes/defs/meet-day.js itself.
// Read-only; prints only. Colour maths: track 4's colour-lib.mjs (WCAG 2.2
// contrast, sRGB compositing, Machado 2009 severity 1.0 in linear RGB,
// CIEDE2000), and its Tailwind v3 table.
// Usage: node mdF-colour.mjs [--all]   (exit 1 if a pair that occurs fails)
import { contrast as C, over, simulate, dE } from './colour/colour-lib.mjs';
import { nearestTW } from './colour/tailwind.mjs';

const WT = '/Users/micahflunker/dev/vibes-night/wt/';
const MD = (await import(WT + 'web-design2/vibes/defs/meet-day.js')).default;
const V1 = (await import(WT + 'web-design2/vibes/defs/v1.js')).default;
const c = MD.colors;
const t = k => MD.tint[k];
const tint = (k, bg) => over(c[t(k).color], t(k).a, bg);
const f2 = x => x.toFixed(2);
let fails = 0;
const lines = [];
const out = s => { lines.push(s); console.log(s); };

/* ---------- 1. text: every ink on every surface ---------- */
const surfaces = {
  rack: c.rack, bar: c.bar, raised: c.raised, well: c.well, track: c.track
};
const inks = ['chalk', 'steel', 'dim', 'faint', 'good', 'warn', 'bad', 'danger', 'accent',
  'pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'];
// Where text actually sits in Meet Day (from the looks, spec §6): every ink on
// the board, a panel (and the sheet), the band / attempt box / cell button, and
// the well. The unlit track carries no text: meters, unlit lamps and the
// empty part of a bar hold no words (the calorie band labels sit under the
// track, food.js:819-832), so its column is reported, not gated.
const TEXT_SURFACES = ['rack', 'bar', 'raised', 'well'];
out('== 1. Text, every ink on every surface (4.5:1; track reported, not gated) ==');
out('ink'.padEnd(9) + Object.keys(surfaces).map(s => s.padStart(8)).join(''));
const under = [];
for (const k of inks) {
  const row = Object.entries(surfaces).map(([s, bg]) => {
    const r = C(c[k], bg);
    if (r < 4.5) under.push([k, s, r]);
    return (f2(r) + (r < 4.5 ? '*' : ' ')).padStart(8);
  });
  out(k.padEnd(9) + row.join(''));
}
out('pairs under 4.5 (* above):');
for (const [k, s, r] of under) {
  const gated = TEXT_SURFACES.includes(s);
  if (gated) fails++;
  out(`  ${k} on ${s} ${f2(r)} — ${gated ? 'FAIL (text sits here)' : 'no text sits on the track in Meet Day; not a text pair'}`);
}
if (!under.length) out('  none');

/* ---------- 2. text over the washes ---------- */
out('\n== 2. Text over tints and washes (4.5:1) ==');
const washes = [
  [`set flash peak (accent ${t('setFlash').a} over panel)`, tint('setFlash', c.bar), ['chalk', 'steel', 'dim']],  ['picker selection (accent .10 over panel)', tint('pickSel', c.bar), ['chalk', 'steel', 'dim']],
  ['pressed row (lift .05 over panel)', tint('rowPress', c.bar), ['chalk', 'steel', 'dim']],
  ['"Next week" callout (accent .07 over panel)', tint('reviewBg', c.bar), ['chalk', 'steel', 'dim', 'warn', 'good']],
  ['estimator notice .ai-warn (warn .07 over sheet)', over(c.warn, 0.07, c.bar), ['warn', 'chalk']],
  ['trial bar .trial-bar (warn .10 over board)', over(c.warn, 0.10, c.rack), ['warn']],
  ['calorie cut zone (pBlue .16 over track)', tint('zoneCut', c.track), ['steel']],
  ['calorie hold zone (pYellow .18 over track)', tint('zoneHold', c.track), ['steel']],
  ['calorie gain zone (pRed .16 over track)', tint('zoneGain', c.track), ['steel']]
];
for (const [name, bg, ks] of washes) {
  const zone = /zone/.test(name);
  out(`  ${name} = ${bg}: ` + ks.map(k => {
    const r = C(c[k], bg);
    if (r < 4.5 && !zone) fails++;
    return `${k} ${f2(r)}${r < 4.5 ? (zone ? ' (no text here: labels sit under the track)' : ' FAIL') : ''}`;
  }).join(', '));
}

/* ---------- 3. ink on its own fill ---------- */
out('\n== 3. Ink on its own fill (4.5:1) ==');
const fills = [
  ['onAccent on accent (primary, FAB, chosen chip/segment, active dock cell, current attempt box, toast)', c.onAccent, c.accent],
  ['knockout on inverse', c.knockout, c.inverse],
  ['onAccent on accentPressed', c.onAccent, c.accentPressed],
  ['onDone on done', c.onDone, c.done],
  ['onDanger on danger (swipe-to-delete)', c.onDanger.native, c.danger],
  ['onWarn on warn (native trial bar)', c.onWarn, c.warn],
  ['banner.devText on pRed', MD.banner.devText, c.pRed],
  ['banner.guardText on pGreen', MD.banner.guardText, c.pGreen],
  ['shape.band.ink on shape.band.fill (a card head)', c[MD.shape.band.ink], c[MD.shape.band.fill]],
  ['steel meta in the band', c.steel, c[MD.shape.band.fill]],
  ['dim in the band', c.dim, c[MD.shape.band.fill]],
  ['tagInk W on the attempt box', c[MD.tagInk.W], tint('tagW', c.bar)],
  ['tagInk F on the attempt box', c[MD.tagInk.F], tint('tagF', c.bar)],
  ['tagInk D on the attempt box', c[MD.tagInk.D], tint('tagD', c.bar)],
  ['accent (COACH, the mark) on the Coach band', c.accent, c.raised],
  ['warn caution line on the Coach panel', c.warn, c.bar],
  ['steel add-tile tag on raised (addTile · flat, decision b)', c.steel, c.raised],
  ['chalk add-tile tag on raised', c.chalk, c.raised],
  ['dim dock label (not used) / steel dock label on a dock cell (bar)', c.steel, c.bar],
  ['knockout icon and label on the active dock cell (inverse)', c.knockout, c.inverse],
  ['calendar: an untrained day number (dim) on its cell (bar)', c.dim, c.bar],
  ['calendar: a trained day number (chalk) on its cell (raised)', c.chalk, c.raised],
  ['calendar: today, board figure on its lamp tab', c.knockout, c.inverse],
  ['lamp words on the "Next week" callout (reviewBg over a panel)', c.chalk, tint('reviewBg', c.bar)],
  ['a set input figure (chalk) in its well', c.chalk, c.well],
  ['a grey target placeholder (dim) in its well', c.dim, c.well],
  ['the e1RM (steel) on a set row (panel)', c.steel, c.bar],
  ['the e1RM (steel) at the tick flash peak', c.steel, tint('setFlash', c.bar)],
  ['the e1RM (steel) on a chosen picker row (pickSel)', c.steel, tint('pickSel', c.bar)],
  ['pChrome small text (inkOf) on the band', c[MD.inkOf.pChrome], c.raised],
  ['pRed small text (inkOf) on the band', c[MD.inkOf.pRed], c.raised]
];
for (const [i, pc] of MD.plates.entries()) fills.push([`onPlate on plate ${['45', '35', '25', '10', '5', '2.5'][i]} lb`, c.onPlate, pc]);
for (const [name, fg, bg] of fills) {
  const r = C(fg, bg);
  if (r < 4.5) fails++;
  out(`  ${name}: ${f2(r)}${r < 4.5 ? ' FAIL' : ''}`);
}

/* ---------- 4. graphics (3:1) ---------- */
out('\n== 4. Graphics and control edges (3:1) ==');
const g = [];
const G = (name, a, b, gate = true) => { const r = C(a, b); g.push([name, r, gate]); if (gate && r < 3) fails++; out(`  ${name}: ${f2(r)}${gate && r < 3 ? ' FAIL' : gate ? '' : ' (reported)'}`); };
G('knurl control edge on a panel', c.knurl, c.bar);
G('knurl control edge on the board', c.knurl, c.rack);
G('knurl control edge on the band / a cell', c.knurl, c.raised);
G('grab handle (grip) on the sheet', c.grip, c.bar);
G('focus ring (lamp) on a panel', c.focus, c.bar);
G('focus ring (lamp) on the well (set inputs)', c.focus, c.well);
G('lit panel / primary (inverse) on a panel', c.inverse, c.bar);
G('active dock cell (inverse) on the board', c.inverse, c.rack);
G('current attempt box (inverse) against its row (panel)', c.inverse, c.bar);
G('lit lamp (done) on a panel', c.done, c.bar);
G('lit lamp (done) against an unlit lamp disc (track)', c.done, c.track);
G('unlit lamp ring (grip) on a panel', c.grip, c.bar);
G('unlit lamp ring (grip) on the band', c.grip, c.raised);
G('unlit lamp ring (grip) against its disc (track): the ring is judged on its ground', c.grip, c.track, false);
G('toggle, off: lamp knob on the grip track (spec E1)', c.inverse, c.grip);
G("toggle, off: v1's steel knob on the grip track (what E1 replaces)", c.steel, c.grip, false);
G('toggle, on: lamp knob on the accent .28 track over a panel', c.accent, over(c.accent, 0.28, c.bar));
G('toggle, on track against off track (panel)', over(c.accent, 0.28, c.bar), c.bar, false);
G('drop rail (pBlue at ' + t('dropRail').a + ') on a panel', tint('dropRail', c.bar), c.bar);
G('+ Drop edge (pBlue .5) on a panel', tint('dropAdd', c.bar), c.bar, false);
G('KPI day lamp unlit bezel (knurl) on the well', c.knurl, c.well);
G('KPI today ring (steel) on the well', c.steel, c.well);
for (const s of ['pYellow', 'pBlue', 'pWhite']) G(`KPI day lamp lit (${s}) on the well`, c[s], c.well);
for (const k of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome', 'good', 'warn', 'bad'])
  G(`${k} as a meter fill against the empty track`, c[k], c.track);
for (const k of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'])
  G(`${k} as a mark on a panel (calendar sliver, exercise tag, chart)`, c[k], c.bar);
G('pChrome as a mark on a trained calendar cell (raised)', c.pChrome, c.raised);
G('the 5 lb (pWhite) plate edge (grip) against the lamp-white...', c.grip, c.pWhite, false);
out('  -- the lamp tick at a meter target and the calorie marks, in the 1px board notch / ring --');
G('lamp tick against the board notch', c.calMark, c.rack);
for (const k of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome', 'good'])
  G(`board notch against a ${k} fill`, c.rack, c[k]);
for (const k of ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'])
  G(`(bare, no notch) lamp tick against a ${k} fill`, c.calMark, c[k], false);
G('white head / target against its board ring (shadow.calHead / calTarget)', c.calMark, c[MD.shadow.calHead.web[0].color]);
// The head (and the dashed target, and a tick) is a lamp-white mark with a
// 1px board ring. It stands clear of whatever it sits on when EITHER edge
// reaches 3:1 there: its lamp body on the dark grounds, its ring on the light
// fills. What it can sit on: the bare track, a zone wash over the track, or
// the eaten fill (the zone's plate colour at .92, rack.css .cal-fill).
const ring = c[MD.shadow.calHead.web[0].color];
const heads = [['the bare track', c.track]];
for (const [z, k, p] of [['cut', 'zoneCut', 'pBlue'], ['hold', 'zoneHold', 'pYellow'], ['gain', 'zoneGain', 'pRed']]) {
  heads.push([`the ${z} zone wash`, tint(k, c.track)]);
  heads.push([`the eaten fill in the ${z} zone (${p} at .92)`, over(c[p], 0.92, tint(k, c.track))]);
}
for (const [where, bg] of heads) {
  const body = C(c.calMark, bg), edge = C(ring, bg), best = Math.max(body, edge);
  if (best < 3) fails++;
  out(`  white head on ${where} ${bg}: lamp body ${f2(body)}, board ring ${f2(edge)} → ${f2(best)}${best < 3 ? ' FAIL' : ''}`);
}
out('  -- the Coach pulse on the set check (warn), the unlit lamp inside it --');
for (const k of ['coachLow', 'coachBase', 'coachHigh']) {
  const bg = tint(k, c.bar);
  G(`unlit lamp ring (grip) on the check washed ${k} (warn ${t(k).a})`, c.grip, bg, k === 'coachBase');
}
G('the check box edge in warn on a panel', c.warn, c.bar);
G('the check box edge in warn on its own coachBase wash', c.warn, tint('coachBase', c.bar));
G("what A's lamp .38 pulse did to the ring (for the record)", c.grip, over(c.accent, 0.38, c.bar), false);
out('  -- structure only (reported, not gated: never the only cue) --');
G('gutter: panel against the board', c.bar, c.rack, false);
G('band against its panel', c.raised, c.bar, false);
G('attempt box against its row', c.raised, c.bar, false);
G('track against a panel', c.track, c.bar, false);
G('collar hairline on a panel', c.collar, c.bar, false);
out(`  gutter dE00 (panel vs board): ${f2(dE(c.bar, c.rack))}; band vs panel dE00 ${f2(dE(c.raised, c.bar))}`);

/* ---------- 5. colour vision ---------- */
out('\n== 5. Colour vision (Machado 2009, severity 1, linear RGB; CIEDE2000) ==');
const groups = { chest: c.pRed, back: c.pBlue, legs: c.pYellow, shoulders: c.pGreen, arms: c.pWhite, core: c.pChrome };
const modes = ['normal', 'deutan', 'protan', 'tritan'];
out('group'.padEnd(10) + modes.map(m => m.padStart(10)).join(''));
for (const [n, h] of Object.entries(groups)) out(n.padEnd(10) + modes.map(m => simulate(h, m).padStart(10)).join(''));
const names = Object.keys(groups);
for (const m of modes) {
  const pairs = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++)
    pairs.push([names[i] + '/' + names[j], dE(simulate(groups[names[i]], m), simulate(groups[names[j]], m))]);
  pairs.sort((a, b) => a[1] - b[1]);
  const gate = m !== 'tritan';
  if (gate && pairs[0][1] < 12) fails++;
  out(`  ${m}: worst ${pairs[0][0]} ${f2(pairs[0][1])}; next ${pairs[1][0]} ${f2(pairs[1][1])}, ${pairs[2][0]} ${f2(pairs[2][1])}` +
    (gate ? (pairs[0][1] >= 12 ? '  (>= 12 ok)' : '  FAIL') : '  (information only)'));
  if (process.argv.includes('--all')) out('    ' + pairs.map(([p, d]) => p + ' ' + f2(d)).join(' · '));
}
const pair = (a, b, name) => out(`  ${name}: ` + modes.slice(0, 3).map(m => m + ' ' + f2(dE(simulate(a, m), simulate(b, m)))).join(' / '));
pair(c.good, c.bad, 'good / bad');
pair(c.good, c.warn, 'good / warn (the weight rate\'s "green … amber")');
pair(c.warn, c.bad, 'warn / bad (meet only at the worded confidence dot)');
pair(c.warn, c.pYellow, 'warn / legs yellow (MD-1 had 0.00)');
pair(c.done, c.track, 'lit lamp / unlit lamp');
pair(c.done, c.pWhite, 'lamp white / arms white');
pair(c.good, c.pGreen, 'good / shoulders green');
const v1g = { chest: V1.colors.pRed, back: V1.colors.pBlue, legs: V1.colors.pYellow, shoulders: V1.colors.pGreen, arms: V1.colors.pWhite, core: V1.colors.pChrome };
const worst = (gs, m) => { const n = Object.keys(gs); let w = 1e9; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) w = Math.min(w, dE(simulate(gs[n[i]], m), simulate(gs[n[j]], m))); return w; };
out(`  v1 for reference: worst group pair normal ${f2(worst(v1g, 'normal'))} / deutan ${f2(worst(v1g, 'deutan'))} / protan ${f2(worst(v1g, 'protan'))}; good/bad deutan ${f2(dE(simulate(V1.colors.good, 'deutan'), simulate(V1.colors.bad, 'deutan')))}`);

/* ---------- 6. hues the copy names, the guard, the lineup ---------- */
out('\n== 6. Hues the copy names (index.js HUE_NAMED), OKLCH ==');
const oklch = hex => {
  const lin = [1, 3, 5].map(i => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const [r, gg, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const Cc = Math.hypot(A, B); let h = Math.atan2(B, A) * 180 / Math.PI; if (h < 0) h += 360;
  return [L, Cc, h];
};
for (const [role, hue] of [['pBlue', 'blue'], ['pYellow', 'yellow'], ['pRed', 'red'], ['calMark', 'white'], ['good', 'green'], ['bad', 'red'], ['dim', 'grey'], ['warn', 'amber']]) {
  const [L, Cc, h] = oklch(c[role]);
  out(`  ${role} ${c[role]} (copy: ${hue}): L ${L.toFixed(3)} C ${Cc.toFixed(3)} h ${h.toFixed(1)}`);
}
out('\n== 7. The Tailwind v3 guard (R2.7) and neutrality ==');
for (const k of ['rack', 'bar', 'raised', 'track', 'accent', 'accentPressed', 'warn']) {
  const [, Cc] = oklch(c[k]); const [n, d] = nearestTW(c[k]);
  out(`  ${k} ${c[k]}: OKLCH C ${Cc.toFixed(3)}${Cc < 0.015 ? ' (neutral: R3.1 governs)' : ''}; nearest ${n} ${f2(d)}`);
}
out('\n== 8. The lamp: Q-P5 options (the AI-cream #F7F1E4, the arms white, text on a panel) ==');
for (const h of ['#f5f0e3', '#f3f0e8', '#f0eee8', '#eeeeea']) {
  const [n, d] = nearestTW(h);
  out(`  ${h}: dE00 to #F7F1E4 ${f2(dE(h, '#f7f1e4'))}; to arms ${c.pWhite} ${f2(dE(h, c.pWhite))}; on a panel ${f2(C(h, c.bar))}; nearest ${n} ${f2(d)}`);
}
out('\n== 9. Distance from the lineup (dE00: ground / panel / accent) ==');
const lineup = [['v1', V1]];
for (const id of ['chalk', 'navy', 'oxblood', 'iron-age']) {
  try { lineup.push([id, (await import(WT + 'web-design/vibes/defs/' + id + '.js')).default]); } catch {}
}
// The two deep vibes, being designed beside this one (read only if present).
for (const id of ['ledger', 'clear-sky']) {
  try { lineup.push([id + ' (draft)', (await import(WT + 'web-design2/vibes/defs/' + id + '.js')).default]); } catch {}
}
for (const [id, d] of lineup) out(`  ${id}: ${f2(dE(c.rack, d.colors.rack))} / ${f2(dE(c.bar, d.colors.bar))} / ${f2(dE(c.accent, d.colors.accent))}`);

out(`\n${fails ? fails + ' FAILURES' : 'no failure in any pair that occurs'}`);
if (fails) for (const l of lines) if (/FAIL/.test(l) && !/^== /.test(l)) console.log('  > ' + l.trim());
// The report beside the spec (the script writes it; nothing is redirected).
const { writeFileSync } = await import('node:fs');
writeFileSync('/Users/micahflunker/dev/vibes-night/design/meet-day/mdF-colour-report.txt', lines.join('\n') + '\n');
process.exit(fails ? 1 : 0);
