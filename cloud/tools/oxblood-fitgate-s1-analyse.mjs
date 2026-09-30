// Fit gate analysis (oxblood, s1): what the vibe's fit has that the v1 fit of the same tree does not.
import { readFileSync } from 'node:fs';
const [va, vb] = process.argv.slice(2);
const A = JSON.parse(readFileSync(va, 'utf8')), B = JSON.parse(readFileSync(vb, 'utf8'));
console.log('v1', JSON.stringify(A.totals), A.head || A.commit || '');
console.log('vibe', B.vibe, JSON.stringify(B.totals));
const idx = (sc, kind) => { const m = new Map(); for (const [id, x] of Object.entries(sc)) { if (x.error) continue; for (const y of x[kind]) m.set(id + '|' + (y.how || '') + '|' + y.path, { id, ...y }); } return m; };
const cA = idx(A.scenes, 'clipped'), cB = idx(B.scenes, 'clipped');
const newClipped = [...cB.entries()].filter(([k, y]) => y.how === 'clipped' && !cA.has(k));
console.log('\n== NEW clipped (overflow hidden, content past box) ==', newClipped.length);
for (const [, y] of newClipped) console.log(' ', y.id, y.cls, JSON.stringify(y.text), 'axis', y.axis, 'box', y.box, 'content', y.content, 'h', y.height, y.overflow, 'ellipsis', y.ellipsis);
const goneClipped = [...cA.entries()].filter(([k, y]) => y.how === 'clipped' && !cB.has(k));
console.log('\n== v1 clipped no longer clipped ==', goneClipped.length);
// v1 clipped that got worse
const worse = [...cB.entries()].filter(([k, y]) => y.how === 'clipped' && cA.has(k) && (y.content[0] - y.box[0] > cA.get(k).content[0] - cA.get(k).box[0] + 1 || y.content[1] - y.box[1] > cA.get(k).content[1] - cA.get(k).box[1] + 1));
console.log('\n== clipped in both, worse in vibe ==', worse.length);
for (const [k, y] of worse) console.log(' ', y.id, y.cls, JSON.stringify(y.text), 'vibe', y.box, y.content, 'v1', cA.get(k).box, cA.get(k).content);
// spills: new ones grouped by class and axis with max overshoot
const newSp = [...cB.entries()].filter(([k, y]) => y.how === 'spills' && !cA.has(k));
const g = new Map();
for (const [, y] of newSp) { const key = y.cls + ' ' + y.axis; const o = g.get(key) || { n: 0, maxX: 0, maxY: 0, ex: y }; o.n++; const dx = y.content[0] - y.box[0], dy = y.content[1] - y.box[1]; if (dx > o.maxX) o.maxX = dx; if (dy > o.maxY) { o.maxY = dy; o.ex = y; } g.set(key, o); }
console.log('\n== NEW spills (overflow visible) grouped ==', newSp.length, 'in', g.size, 'groups');
for (const [k, o] of [...g.entries()].sort((a, b) => Math.max(b[1].maxX, b[1].maxY) - Math.max(a[1].maxX, a[1].maxY))) console.log(' ', o.n, k, 'max +x', o.maxX, '+y', o.maxY, 'e.g.', o.ex.id, JSON.stringify(o.ex.text.slice(0, 40)), 'h', o.ex.height, 'box', o.ex.box, 'content', o.ex.content);
// x-axis spills specifically (text running out sideways)
const xsp = newSp.filter(([, y]) => /x/.test(y.axis));
console.log('\n== NEW x-axis spills ==', xsp.length);
const xg = new Map(); for (const [, y] of xsp) { const k = y.cls; const o = xg.get(k) || []; o.push(y); xg.set(k, o); }
for (const [k, ys] of xg) { const m = ys.sort((a, b) => (b.content[0] - b.box[0]) - (a.content[0] - a.box[0]))[0]; console.log(' ', ys.length, k, 'max +x', m.content[0] - m.box[0], m.id, JSON.stringify(m.text.slice(0, 50)), 'box', m.box, 'content', m.content, 'h', m.height); }
// small targets
const sA = idx(A.scenes, 'small'), sB = idx(B.scenes, 'small');
const newSmall = [...sB.entries()].filter(([k]) => !sA.has(k));
const shrunk = [...sB.entries()].filter(([k, y]) => sA.has(k) && y.h < sA.get(k).h - 0.01);
console.log('\n== NEW small targets (<44 in vibe, >=44 in v1) ==', newSmall.length);
const sg = new Map(); for (const [, y] of newSmall) { const o = sg.get(y.cls) || []; o.push(y); sg.set(y.cls, o); }
for (const [k, ys] of sg) console.log(' ', ys.length, k, 'h', ys.map(y => y.h).slice(0, 4), ys[0].id, JSON.stringify(ys[0].text));
console.log('\n== small in both, shorter in vibe ==', shrunk.length);
const hg = new Map(); for (const [k, y] of shrunk) { const o = hg.get(y.cls) || []; o.push([y, sA.get(k)]); hg.set(y.cls, o); }
for (const [k, ys] of hg) console.log(' ', ys.length, k, 'vibe h', ys[0][0].h, 'v1 h', ys[0][1].h, ys[0][0].id, JSON.stringify(ys[0][0].text));
// overflow
console.log('\n== docOverflow ==', B.totals.docOverflow.length, '; overflow els', B.totals.overflowEls);
// watch: coach card, btn, chip size changes
const wA = new Map(), wB = new Map();
for (const [id, x] of Object.entries(A.scenes)) if (!x.error) for (const y of x.watch) wA.set(id + '|' + y.path, y);
for (const [id, x] of Object.entries(B.scenes)) if (!x.error) for (const y of x.watch) wB.set(id + '|' + y.path, { id, ...y });
const coach = [...wB.values()].filter(y => /coach-card/.test(y.cls));
console.log('\n== coach cards ==', coach.length, 'heights', [...new Set(coach.map(y => y.h))].join(','), 'content>box', coach.filter(y => y.content[1] > y.box[1] || y.content[0] > y.box[0]).map(y => y.id + ' ' + y.cls + ' ' + y.box + ' ' + y.content).join('; '));
const moved = [...wB.entries()].filter(([k, y]) => wA.has(k) && (Math.abs(wA.get(k).h - y.h) > 0.01 || Math.abs(wA.get(k).w - y.w) > 0.01));
const mg = new Map(); for (const [k, y] of moved) { const a = wA.get(k); const key = y.cls + ' ' + a.w + 'x' + a.h + '→' + y.w + 'x' + y.h; mg.set(key, (mg.get(key) || 0) + 1); }
console.log('\n== watched boxes whose size changed (btn/chip/coach) ==', moved.length);
for (const [k, n] of [...mg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(' ', n, k);
const wOver = [...wB.values()].filter(y => y.content[0] > y.box[0] + 1 || y.content[1] > y.box[1] + 1);
const wOverA = new Set([...wA.entries()].filter(([, y]) => y.content[0] > y.box[0] + 1 || y.content[1] > y.box[1] + 1).map(([k]) => k));
console.log('\n== watched boxes whose content exceeds the box (new vs v1) ==');
for (const y of wOver) if (!wOverA.has(y.id + '|' + y.path)) console.log(' ', y.id, y.cls, 'box', y.box, 'content', y.content);
if (B.compare) console.log('\ncompare new', B.compare.new.length, 'gone', B.compare.gone);
