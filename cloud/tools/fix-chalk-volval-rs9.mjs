// Fix scratch (chalk review r1): render native food.jsx MacroRow under v1 and
// under Chalk and read the figure's box. v1 must keep width 42 (today's JSX);
// Chalk must hold minWidth 42 + flexShrink 0 and no fixed width, so the
// 45.7pt Sofia figure sets on one line while the track gives the width back.
const NAT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk';
const R = await import(NAT + '/tools/lib/rn-render.mjs');
const RN = R.RN;
const themeMod = R.load('src/ui/theme.js');
const T = themeMod.default;
const { previewTheme } = R.load('src/state/vibe.js');
const FILE = 'app/(app)/(tabs)/food.jsx';
const MacroRow = R.bindCut(R.cut(FILE, 'MacroRow'), 'MacroRow',
  { T, View: RN.View, Text: RN.Text, trimNum: n => String(n) });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
for (const id of ['v1', 'chalk']) {
  themeMod.applyTheme(previewTheme(id));
  const m = R.mount(R.h(MacroRow, { name: 'Protein', val: 142, tgt: 200, color: T.colors.accent }));
  const hs = R.hosts(m.box).filter(x => x.t === 'Text');
  const fig = hs.find(x => x.text === '142/200');
  const s = fig ? R.styleOf(fig.p) : {};
  const box = JSON.stringify({ width: s.width, minWidth: s.minWidth, flexShrink: s.flexShrink, textAlign: s.textAlign, fontFamily: s.fontFamily });
  if (id === 'v1') check('v1: the figure keeps a fixed 42pt box', fig && s.width === 42 && s.minWidth === undefined && s.flexShrink === undefined, box);
  else check(id + ': the figure grows from 42pt and never shrinks', fig && s.width === undefined && s.minWidth === 42 && s.flexShrink === 0, box);
  m.unmount();
}
themeMod.applyTheme(previewTheme('v1'));
console.log(bad ? bad + ' FAILED' : 'all passed');
process.exit(bad ? 1 : 0);
