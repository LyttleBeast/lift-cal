// Spot-check (parity gate, iron-age, rs9): the web's generated token block vs native's built T, 10+ roles;
// and the pure def/icon files byte for byte across the two worktrees.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
for (const f of ['defs/index.js', 'defs/iron-age.js', 'defs/v1.js', 'defs/vocab.js', 'icons/iron-age.js', 'icons/v1.js']) {
  const a = sha(WEB + '/vibes/' + f), b = sha(NAT + '/src/pure/vibes/' + f);
  console.log((a === b ? 'SAME ' : 'DIFF ') + f + ' ' + a.slice(0, 12) + ' ' + b.slice(0, 12));
}
const css = readFileSync(WEB + '/vibes/iron-age.css', 'utf8');
const block = css.slice(0, css.indexOf('/* vibes-css:end */'));
const V = {};
for (const m of block.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) V[m[1]] = m[2].trim();

const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const VS = R.load('src/state/vibe.js');
const e = VS.VIBE_DEFS['iron-age'];
THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit }));
const T = THEME.default;
const norm = s => String(s).replace(/\s+/g, '').toLowerCase();
const pairs = [
  ['--rack', T.colors.rack], ['--bar', T.colors.bar], ['--collar', T.colors.collar], ['--chalk', T.colors.chalk],
  ['--dim', T.colors.dim], ['--accent', T.colors.accent], ['--warn', T.colors.warn], ['--p-yellow', T.colors.pYellow],
  ['--inverse', T.colors.inverse], ['--cal-mark', T.colors.calMark], ['--raised', T.colors.raised], ['--track', T.colors.track],
  ['--ink-plate', T.colors.inkPlate], ['--focus', T.colors.focus],
  ['--r', T.radius.r + (T.radius.r ? 'px' : '')], ['--r-pill', T.radius.pill + 'px'], ['--r-sheet', T.radius.sheet + (T.radius.sheet ? 'px' : '')],
];
for (const [k, n] of pairs) console.log((norm(V[k]) === norm(n) ? 'OK   ' : 'DIFF ') + k + ' web=' + V[k] + ' native=' + n);
console.log('tint.runway native=' + (T.tint && T.tint.runway) + ' web=' + V['--tint-runway']);
console.log('tagInk native=' + JSON.stringify(T.tagInk || T.colors.tagInk || null) + ' web W/F/D=' + V['--tag-ink-w'] + '/' + V['--tag-ink-f'] + '/' + V['--tag-ink-d']);
console.log('inkOf native=' + JSON.stringify(T.inkOf || null) + ' web pYellow=' + V['--ink-of-p-yellow']);
console.log('shadow calHead native=' + JSON.stringify((T.shadow || {}).calHead) + ' web=' + V['--shadow-cal-head']);
console.log('chrome native=' + JSON.stringify(T.chrome || null));
console.log('T keys=' + Object.keys(T).join(','));
console.log('T.colors=' + JSON.stringify(T.colors));
console.log('T.shadow=' + JSON.stringify(T.shadow));
console.log('T.tint keys=' + Object.keys(T.tint || {}).join(','));
console.log('def.colors keys=' + Object.keys(e.def.colors).join(','));
console.log('def.tint tag=' + JSON.stringify([e.def.tint.tagW, e.def.tint.tagF, e.def.tint.tagD]) + ' def.tagInk=' + JSON.stringify(e.def.tagInk));
console.log('native tint tagW/zoneCut/backdrop=' + [T.tint.tagW, T.tint.zoneCut, T.tint.backdrop].join(' | '));
console.log('face=' + JSON.stringify(e.def.face && e.def.face.web) + ' nativeText.h1=' + JSON.stringify(T.text.h1 || Object.values(T.text)[0]));
process.exit(0);
