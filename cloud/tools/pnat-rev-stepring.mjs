// Draw steps.jsx's StepRing past the goal (frac 1.3) in a tree, under v1 or the
// sentinel vibe, and print each Circle's stroke. Usage: node pnat-rev-stepring.mjs <root> [sentinel]
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const [root, mode] = process.argv.slice(2);
const R = await import(pathToFileURL(join(root, 'tools/lib/rn-render.mjs')).href);
R.restoreConsole();
const TH = R.load('src/ui/theme.js');
let legend = {};
if (mode === 'sentinel') {
  const { makeSentinel } = await import('/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/sentinel/tools/sentinel-def.mjs');
  const s = makeSentinel(R.load('src/pure/vibes/defs/v1.js').default);
  TH.applyTheme(TH.build(s.def)); legend = s.legend;
}
const req = createRequire(join(root, 'package.json'));
const SVG = req('react-native-svg');
const F = R.load('src/pure/format.js');
const StepRing = R.bindCut(R.cut('app/(app)/(tabs)/steps.jsx', 'StepRing'), 'StepRing',
  { React: R.React, View: R.RN.View, Svg: SVG.default, Circle: SVG.Circle, SvgText: SVG.Text, T: TH.default, fmtInt: F.fmtInt, compact: F.compact });
const m = R.mount(R.h(StepRing, { frac: 1.3, n: 13000, g: 10000 }));
const circles = R.hosts(m.box).filter(x => x.t === 'Circle');
console.log(root.replace(/.*\//, '') + (mode ? ' [' + mode + ']' : ' [v1]') + ':');
circles.forEach((c, i) => console.log('  circle ' + i + ' stroke ' + c.p.stroke + (legend[c.p.stroke] ? '  = ' + legend[c.p.stroke] : '') +
  (c.p.strokeDasharray ? '  dash ' + JSON.stringify(c.p.strokeDasharray) : '')));
