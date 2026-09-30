// After applyTheme(build(oxblood)), does T carry id, so the off knob resolves to chalk?
const NROOT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood';
const { open } = await import(NROOT + '/tools/lib/vibe-snap.mjs');
const H = await open(NROOT);
const R = H.R;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const V = R.load('src/state/vibe.js');
for (const id of ['v1', 'chalk', 'oxblood']) {
  const e = V.VIBE_DEFS[id];
  THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart }));
  const ee = V.VIBE_DEFS[T.id];
  const r = ee && ee.toggle && ee.toggle.off;
  console.log(id, 'T.id=' + T.id, 'offKnob=' + ((r && T.colors[r]) || T.colors.steel), 'chalk=' + T.colors.chalk, 'grip=' + T.colors.grip);
}
process.exit(0);
