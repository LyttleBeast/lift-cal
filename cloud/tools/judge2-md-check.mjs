// Judge 2 of 2, meet-day: re-check the numbers in concept A and B that the
// judge doubted. Read-only; prints only. Uses track 4's colour library.
import { contrast as C, over, simulate, dE } from './colour/colour-lib.mjs';

const f = x => x.toFixed(2);
const row = (label, v) => console.log(label.padEnd(64), typeof v === 'number' ? f(v) : v);

const lamp = '#f5f0e3';
const plates = { pRed: '#ff5a3c', pBlue: '#4d97ff', pYellow: '#ffe14d', pGreen: '#3cc4a0', pWhite: '#f2f2f2', pChrome: '#858c96' };
const A = { rack: '#07080a', bar: '#16181d', collar: '#26292f', knurl: '#70767f', raised: '#202329', track: '#2a2d33', steel: '#a8a295', dim: '#9097a3', warn: '#ffe14d', good: '#4be38a', bad: '#ff5a3c' };
const B = { rack: '#07080a', bar: '#111317', collar: '#1d2026', knurl: '#666c77', raised: '#1d2026', track: '#23262d', grip: '#6f7580', steel: '#a8a295', dim: '#9097a3', warn: '#ffa42e', good: '#4be38a', bad: '#ff5a3c' };
const v1 = { rack: '#14161a', bar: '#1c1f26' };

console.log('== Grounds and gutters ==');
row('A bar on board (contrast)', C(A.bar, A.rack));
row('A bar vs board dE00 (2px gutter)', dE(A.bar, A.rack));
row('A raised band on bar (contrast)', C(A.raised, A.bar));
row('B tile on floor (contrast)', C(B.bar, B.rack));
row('B tile vs floor dE00 (4pt seam)', dE(B.bar, B.rack));
row('B raised on tile (contrast)', C(B.raised, B.bar));
row('A bar vs v1 bar dE00', dE(A.bar, v1.bar));
row('B bar vs v1 bar dE00', dE(B.bar, v1.bar));
row('board vs v1 rack dE00', dE(A.rack, v1.rack));

console.log('\n== Control edges (3:1) ==');
row('A knurl on raised', C(A.knurl, A.raised));
row('A knurl on bar', C(A.knurl, A.bar));
row('B knurl on raised', C(B.knurl, B.raised));
row('B knurl on bar', C(B.knurl, B.bar));
row('B grip on bar (grab handle)', C(B.grip, B.bar));

console.log('\n== Lamp tick at a meter target, touching the fill (3:1 graphic) ==');
for (const [k, h] of Object.entries(plates)) row(`lamp tick vs ${k} fill`, C(lamp, h));
row('lamp tick vs good fill', C(lamp, A.good));
row('lamp tick vs A track', C(lamp, A.track));

console.log('\n== Calorie head (lamp) against the eaten fill in a zone colour ==');
row('head vs pBlue fill (cut)', C(lamp, plates.pBlue));
row('head vs pYellow fill (hold)', C(lamp, plates.pYellow));
row('head vs pRed fill (gain)', C(lamp, plates.pRed));
for (const [z, h, a] of [['cut', plates.pBlue, 0.16], ['hold', plates.pYellow, 0.18], ['gain', plates.pRed, 0.16]]) {
  row(`head vs A ${z} wash over track`, C(lamp, over(h, a, A.track)));
}

console.log('\n== Text over washes ==');
row('A lamp text over coach pulse .38 on bar', C(lamp, over(lamp, 0.38, A.bar)));
row('A lamp text over set flash .28 on bar', C(lamp, over(lamp, 0.28, A.bar)));
row('B steel on hold wash .18 over tile', C(B.steel, over(plates.pYellow, 0.18, B.bar)));
row('A steel on hold wash .18 over bar', C(A.steel, over(plates.pYellow, 0.18, A.bar)));
row('A pRed on flap top half (large text)', C(plates.pRed, A.track));
row('A pChrome on raised', C(plates.pChrome, A.raised));
row('A dim on track', C(A.dim, A.track));
row('B tag F (pRed) on raised', C(plates.pRed, B.raised));
row('A tag F (pRed) on raised', C(plates.pRed, A.raised));

console.log('\n== Status and one-colour-one-meaning ==');
row('A warn = pYellow dE00 (legs, carbs, warn share)', dE(A.warn, plates.pYellow));
row('B warn amber vs pYellow dE00', dE(B.warn, plates.pYellow));
for (const k of ['normal', 'deutan', 'protan']) {
  row(`good/bad ${k}`, dE(simulate(A.good, k), simulate(A.bad, k)));
  row(`B warn/bad ${k}`, dE(simulate(B.warn, k), simulate(B.bad, k)));
  row(`A warn/bad ${k}`, dE(simulate(A.warn, k), simulate(A.bad, k)));
  row(`B good/warn ${k}`, dE(simulate(B.good, k), simulate(B.warn, k)));
  row(`good vs pGreen ${k}`, dE(simulate(A.good, k), simulate(plates.pGreen, k)));
}

console.log('\n== Six groups, worst pair per vision ==');
for (const k of ['normal', 'deutan', 'protan']) {
  const e = Object.entries(plates); let worst = [1e9, ''];
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    const d = dE(simulate(e[i][1], k), simulate(e[j][1], k));
    if (d < worst[0]) worst = [d, `${e[i][0]}/${e[j][0]}`];
  }
  row(`worst ${k} (${worst[1]})`, worst[0]);
}

console.log('\n== The lamp as a fill: distance from known defaults ==');
for (const [n, h] of [['Claude cream #F4F1EA', '#f4f1ea'], ['#F7F1E4', '#f7f1e4'], ['#F5F1E8', '#f5f1e8'], ['#FAF8F5', '#faf8f5'],
                      ['shadcn dark primary #fafafa (zinc-50)', '#fafafa'], ['neutral-50 #fafafa', '#fafafa'], ['stone-100 #f5f5f4', '#f5f5f4'],
                      ['amber-50 #fffbeb', '#fffbeb'], ['pWhite (arms)', plates.pWhite]]) {
  row(`lamp vs ${n}`, dE(lamp, h));
}
row('shadcn-dark bg zinc-950 #09090b vs board dE00', dE('#09090b', A.rack));
row('shadcn-dark card zinc-900 #18181b vs A bar dE00', dE('#18181b', A.bar));
row('shadcn-dark card zinc-900 #18181b vs B bar dE00', dE('#18181b', B.bar));
row('zinc-800 #27272a vs A raised dE00', dE('#27272a', A.raised));
