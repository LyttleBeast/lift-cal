// Parity gate (chalk, round reproof-rs9). Read-only.
// A: every colour/tagInk/runway tint/radius/ring token in the web's generated block vs native build().
// B: ten picked roles three ways: the pure definition (valueOf), the web block, native T.
// C: the round-1 must-fix sites, drawn under chalk and under v1 (v1 must be unchanged).
import { readFileSync } from 'node:fs';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const IDX = await import(WEB + '/vibes/defs/index.js');
const DEF = (await import(WEB + '/vibes/defs/chalk.js')).default;
const { open, dump } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const V = R.load('src/state/vibe.js');
const wear = id => { const e = V.VIBE_DEFS[id]; THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart })); };
const css = readFileSync(WEB + '/vibes/chalk.css', 'utf8');
const toks = {};
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in toks)) toks[m[1]] = m[2].trim();
const kebab = s => s.replace(/([A-Z])/g, '-$1').toLowerCase();
const norm = s => String(s).replace(/\s+/g, '').replace(/,0\./g, ',.').replace(/,1\)$/, ',1)').toLowerCase();

wear('chalk');
console.log('A. web generated block vs native T');
let agree = 0, diff = 0; const miss = [];
const cmp = (role, web, nat) => {
  if (web == null) { miss.push(role); return; }
  const ok = norm(web) === norm(nat) || norm(web) === norm(nat) + 'px';
  ok ? agree++ : diff++;
  if (!ok) console.log('  DIFF', role, 'web', web, 'nat', JSON.stringify(nat));
};
for (const [k, v] of Object.entries(T.colors)) cmp('colors.' + k, toks['--' + kebab(k)], v);
for (const [k, v] of Object.entries(T.tagInk || {})) cmp('tagInk.' + k, toks['--tag-ink-' + k.toLowerCase()], v);
for (const k of ['runway', 'runwayEdge']) cmp('tint.' + k, toks['--tint-' + kebab(k)], T.tint[k]);
for (const [k, v] of Object.entries(T.radius)) cmp('radius.' + k, toks[k === 'r' ? '--r' : '--r-' + kebab(k)], v);
for (const k of ['calHead', 'calTarget', 'calTick']) {
  const w = toks['--shadow-' + kebab(k)], n = T.ring && T.ring[k];
  const m = w && w.match(/0 0 0 (\d+)px (rgba\([^)]+\))/);
  const ok = m && n && +m[1] === n.borderWidth && norm(m[2]) === norm(n.borderColor);
  ok ? agree++ : diff++; if (!ok) console.log('  DIFF shadow.' + k, w, JSON.stringify(n));
}
console.log('  agree', agree, 'diff', diff, 'no web token (native-only or web-literal):', miss.join(' '));

console.log('B. ten roles: definition | web | native');
const tri = (role, d, w, n, ok) => console.log('  ' + (ok ? 'AGREE' : 'DIFF ') + ' ' + role + ' | def ' + JSON.stringify(d) + ' | web ' + w + ' | nat ' + JSON.stringify(n));
const hexRole = (path, tok, nat) => { const d = IDX.valueOf(DEF, path); tri(path, d, toks[tok], nat, norm(d) === norm(toks[tok]) && norm(d) === norm(nat)); };
hexRole('colors.rack', '--rack', T.colors.rack);
hexRole('colors.accent', '--accent', T.colors.accent);
hexRole('colors.knurl', '--knurl', T.colors.knurl);
hexRole('colors.well', '--well', T.colors.well);
hexRole('colors.raised', '--raised', T.colors.raised);
{ const d = IDX.valueOf(DEF, 'tagInk.W'); const rv = IDX.valueOf(DEF, 'colors.' + d); tri('tagInk.W (-> colors.' + d + ')', rv, toks['--tag-ink-w'], T.tagInk.W, norm(rv) === norm(toks['--tag-ink-w']) && norm(rv) === norm(T.tagInk.W)); }
{ const d = IDX.valueOf(DEF, 'radius.plate'); tri('radius.plate', d, toks['--r-plate'], T.radius.plate, toks['--r-plate'] === d + 'px' && T.radius.plate === d); }
{ const d = IDX.valueOf(DEF, 'radius.r'); tri('radius.r', d, toks['--r'], T.radius.r, toks['--r'] === d + 'px' && T.radius.r === d); }
{ const d = IDX.valueOf(DEF, 'shadow.calTick'); tri('shadow.calTick', d, toks['--shadow-cal-tick'], T.ring.calTick, /0 0 0 1px rgba\(17,20,22,\.7\)/.test(toks['--shadow-cal-tick']) && T.ring.calTick && T.ring.calTick.borderWidth === 1 && norm(T.ring.calTick.borderColor) === norm('rgba(17,20,22,.7)')); }
{ const d = IDX.valueOf(DEF, 'type.fieldLbl'); const n = T.text.fieldLbl;
  const webRule = /\.field :where\(label\) \{\s*font-size: 13px; letter-spacing: 0; text-transform: none; color: var\(--steel\);\s*font-variation-settings: 'wght' 600;/.test(css);
  tri('type.fieldLbl', d, webRule ? '13px ls0 none steel wght600' : 'RULE NOT FOUND', { fontSize: n.fontSize, letterSpacing: n.letterSpacing, textTransform: n.textTransform, color: n.color, fontFamily: n.fontFamily },
      webRule && n.fontSize === d.size && (n.letterSpacing || 0) === 0 && n.textTransform !== 'uppercase' && norm(n.color) === norm(T.colors.steel)); }
{ const d = IDX.valueOf(DEF, 'variants'); console.log('  variants (def):', JSON.stringify(d)); }

console.log('C. round-1 sites, chalk then v1');
const Field = R.load('src/ui/Field.jsx');
const Card = R.load('src/ui/Card.jsx');
for (const id of ['chalk', 'v1']) {
  wear(id);
  const m = R.mount(R.h(Field.default, { label: 'Name', value: 'Oats', onChangeText: () => {} }));
  await R.act(async () => { await new Promise(r => setTimeout(r, 0)); });
  const d = dump(R, m.box);
  const lbl = d.find(x => x.t === 'Text' && x.x === 'Name');
  const inp = d.find(x => x.t === 'TextInput');
  m.unmount();
  console.log('  [' + id + '] Field label', JSON.stringify(lbl && { ff: lbl.s.fontFamily, fs: lbl.s.fontSize, ls: lbl.s.letterSpacing, tt: lbl.s.textTransform, c: lbl.s.color }));
  console.log('  [' + id + '] Field input', JSON.stringify(inp && { bc: inp.s.borderColor, br: inp.s.borderRadius, bg: inp.s.backgroundColor }));
  console.log('  [' + id + '] inCardEdge()', JSON.stringify(Field.inCardEdge()), ' capsTrack(1.6)', Field.capsTrack(1.6), ' capsTrack(1.4)', Field.capsTrack(1.4));
  console.log('  [' + id + '] cardSkin()+cardEdge()', JSON.stringify({ ...T.cardSkin(), ...Card.cardEdge() }));
}
