// Iron Age A: the remaining pairs the spec quotes (r2g stock).
import { contrast, over, hexToRgb, toLin } from './colour/colour-lib.mjs';
const rack = '#e6dec9', bar = '#ebe4ce', well = '#e8ddd1', ink = '#1c1712', darkGrain = '#e0d8c4';
const good = '#0e5f40', bad = '#82180c', warn = '#6e4d08', steel = '#4a3f31', accent = '#a1374f', pBlue = '#1f4a72', dim = '#5f5343';
const f = n => n.toFixed(2);
console.log('KPI delta pills (tile ground = well):');
for (const a of [0.10, 0.12, 0.16]) console.log(` a ${a}: good on pillUp ${f(contrast(good, over(good, a, well)))} | bad on pillDown ${f(contrast(bad, over(bad, a, well)))} | warn on pillWarn ${f(contrast(warn, over(warn, a, well)))} | steel on pillBase(ink .06) ${f(contrast(steel, over(ink, 0.06, well)))}`);
for (const a of [0.6, 0.7, 0.75, 0.8]) console.log(`dropRail pBlue ${a} over rack: ${f(contrast(over(pBlue, a, rack), rack))} | over bar ${f(contrast(over(pBlue, a, bar), bar))}`);
for (const c of ['#d6c8a8', '#cfc2a4', '#c9bda2', '#c4b79b', '#bdb094', '#b3a58a']) console.log(`collar ${c}: vs rack ${f(contrast(c, rack))} vs bar ${f(contrast(c, bar))} vs well ${f(contrast(c, well))}`);
console.log(`accent on pickSel over darkest grain ${f(contrast(accent, over(accent, 0.08, darkGrain)))}; chalk on setFlash .20 over darkest ${f(contrast(ink, over(accent, 0.20, darkGrain)))}; dim on pickSel ${f(contrast(dim, over(accent, 0.08, rack)))}`);
console.log(`picker '315' ink vs thumbnail worst pixel under stock .536: ${f(contrast(ink, over(rack, 0.536, ink)))}`);
console.log(`coach pulse: accent .30 over rack ${over(accent, 0.30, rack)} vs rack ${f(contrast(over(accent, 0.30, rack), rack))}; knurl check edge ${f(contrast('#7b6c52', rack))}`);
console.log(`tint trajectories .15: good ${over(good, .15, bar)} warn ${over(warn, .15, bar)} bad ${over(bad, .15, bar)}`);
console.log(`backdrop ink .45 over page: ${over(ink, 0.45, rack)}; sheet bar vs backdrop ${f(contrast(bar, over(ink, 0.45, rack)))}`);
console.log(`tour scrim ink .80 over page: ${over(ink, 0.8, rack)}; bar tour card vs it ${f(contrast(bar, over(ink, 0.8, rack)))}; madder ring vs it ${f(contrast(accent, over(ink, 0.8, rack)))}; madder ring vs bar dock ${f(contrast(accent, bar))}`);
console.log(`ai-warn box (warn .10 over bar): ${over(warn, .1, bar)}; chalk on it ${f(contrast(ink, over(warn, .1, bar)))}; warn on it ${f(contrast(warn, over(warn, .1, bar)))}`);
console.log(`trial bar web (warn .12 wash over rack) warn text ${f(contrast(warn, over(warn, .12, rack)))}`);
console.log(`onboarding chosen keyline ink 2pt vs rack ${f(contrast(ink, rack))}; unchosen keyline knurl ${f(contrast('#7b6c52', rack))}`);
