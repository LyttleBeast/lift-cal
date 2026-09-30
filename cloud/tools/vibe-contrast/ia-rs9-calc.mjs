// Iron Age contrast gate (rs9): pair arithmetic the render walks cannot read —
// :active / :focus grounds the collector mis-resolved, native Switch, the
// swipe hint, the heat strip's floor, the peak label, the disabled buttons.
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const D = (await import(pathToFileURL(TREE + '/vibes/defs/iron-age.js').href)).default;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default;
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const hx = v => (typeof v === 'string' ? v : v.native || v.web);
const GRAIN = '#e0d8c4';
for (const [n, c] of [['iron-age', D.colors], ['v1', V.colors]]) {
  const bar = hx(c.bar), rack = hx(c.rack), acc = hx(c.accent);
  console.log(`\n[${n}] rack ${rack} bar ${bar}`);
  const nav = mix(hx(c.lift), n === 'v1' ? 0.04 : 0.04, rack);
  console.log(`  .set-row-nav:active ground ${nav}: chalk ${CR(hx(c.chalk), nav)} steel ${CR(hx(c.steel), nav)} dim ${CR(hx(c.dim), nav)}; on grain ${mix(hx(c.lift), .04, GRAIN)} dim ${CR(hx(c.dim), mix(hx(c.lift), .04, GRAIN))}`);
  const foc = mix(acc, 0.06, rack), focD = mix(acc, 0.06, mix(hx(c.done), 0.07, rack));
  console.log(`  set input :focus ground ${foc}: chalk ${CR(hx(c.chalk), foc)}, underline accent ${CR(acc, foc)}; on a done row ${focD}: chalk ${CR(hx(c.chalk), focD)} accent ${CR(acc, focD)}`);
  console.log(`  field :focus edge accent on bar ${CR(acc, bar)}, on rack ${CR(acc, rack)}, on grain ${CR(acc, GRAIN)}; on raised ${CR(acc, hx(c.raised))}`);
  console.log(`  :active raised ${hx(c.raised)}: chalk ${CR(hx(c.chalk), hx(c.raised))} steel ${CR(hx(c.steel), hx(c.raised))} dim ${CR(hx(c.dim), hx(c.raised))} accent ${CR(acc, hx(c.raised))}`);
  const on = mix(acc, 0.28, bar);
  console.log(`  Switch off: thumb steel ${hx(c.steel)} on grip ${hx(c.grip)} ${CR(hx(c.steel), hx(c.grip))}; grip track on bar ${CR(hx(c.grip), bar)}, on rack ${CR(hx(c.grip), rack)}`);
  console.log(`  Switch on: track accent .28 ${on} on bar ${CR(on, bar)}; thumb accent on it ${CR(acc, on)}; thumb accent on bar ${CR(acc, bar)}`);
  const hint = mix(hx(c.dim), 0.65, rack), hintB = mix(hx(c.dim), 0.65, bar);
  console.log(`  swipe hint dim .65: on rack ${hint} ${CR(hint, rack)}, on bar ${hintB} ${CR(hintB, bar)}; at 1: ${CR(hx(c.dim), rack)} / ${CR(hx(c.dim), bar)}`);
  for (const a of [0.28, 0.4, 0.5, 0.6]) { const cell = mix(hx(c.pYellow), a, rack); console.log(`  heat cell pYellow ${a} ${cell}: vs rack ${CR(cell, rack)}, vs collar ${CR(cell, hx(c.collar))}`); }
  console.log(`  peak label pYellow 11/800 on rack ${CR(hx(c.pYellow), rack)}; through inkOf (warn) ${CR(hx(c.warn), rack)}`);
  const dis = mix(hx(c.inverse || c.chalk), 0.4, bar);
  console.log(`  disabled primary .4: knockout on ${dis} ${CR(mix(hx(c.knockout || c.bar), 0.4, bar), dis)}`);
  const cf = mix(hx(c.pYellow), 0.92, hx(c.track));
  console.log(`  native cal fill pYellow .92 on track ${cf} ${CR(cf, hx(c.track))}; at 1 ${CR(hx(c.pYellow), hx(c.track))}; pBlue .92 ${CR(mix(hx(c.pBlue), .92, hx(c.track)), hx(c.track))}; pRed .92 ${CR(mix(hx(c.pRed), .92, hx(c.track)), hx(c.track))}`);
  for (const k of ['pYellow', 'pBlue', 'pRed']) { const s = mix(hx(c[k]), 0.38, rack); console.log(`  native stacked dim bar .38 ${k} ${s} on rack ${CR(s, rack)}`); }
  console.log(`  water vessel pBlue on rack at full ${CR(hx(c.pBlue), rack)}`);
  console.log(`  Pro pill pYellow 9/700 on rack ${CR(hx(c.pYellow), rack)}; through inkOf warn ${CR(hx(c.warn), rack)}`);
}
