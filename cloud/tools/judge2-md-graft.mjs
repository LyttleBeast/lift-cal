// Judge 2 of 2, meet-day: do B's grafts hold on A's surfaces? Read-only.
import { contrast as C, over, simulate, dE } from './colour/colour-lib.mjs';
const f = x => x.toFixed(2);
const row = (l, v) => console.log(l.padEnd(56), typeof v === 'number' ? f(v) : v);

const A = { rack: '#07080a', bar: '#16181d', raised: '#202329', track: '#2a2d33', grip: '#70767f', steel: '#a8a295' };
const lamp = '#f5f0e3', amber = '#ffa42e', good = '#4be38a', bad = '#ff5a3c';

console.log('== B amber warn on A surfaces ==');
for (const [k, h] of Object.entries(A).filter(([k]) => k !== 'grip' && k !== 'steel')) row(`amber text on A ${k}`, C(amber, h));
row('board ink on amber (onWarn)', C(A.rack, amber));
row('amber over Next-week callout? (lamp .07 on bar)', C(amber, over(lamp, 0.07, A.bar)));
row('amber as meter fill vs A track', C(amber, A.track));

console.log('\n== Toggle off state on A (grip track) ==');
row('steel knob on A grip track', C(A.steel, A.grip));
row('lamp knob on A grip track', C(lamp, A.grip));
row('board knob on A grip track', C(A.rack, A.grip));
row('A grip track vs bar (off track edge)', C(A.grip, A.bar));

console.log('\n== B notch fix on A: lamp tick inside a 1pt board notch ==');
row('lamp tick vs board notch', C(lamp, A.rack));
row('board notch vs pYellow fill', C(A.rack, '#ffe14d'));
row('board notch vs pChrome fill', C(A.rack, '#858c96'));
row('board ring on the cal head vs lamp', C(A.rack, lamp));
