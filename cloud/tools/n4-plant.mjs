// N4 scratch: plant one fault in a scratch copy of the engine tree and run
// verify-vibe-seams against it (--root), to prove its checks can fail.
// usage: node n4-plant.mjs <plant name>   (or "control" for an unplanted copy)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENGINE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const name = process.argv[2];
const PLANTS = {
  control: [],
  // a photo layer that is not nothing when there is no photo
  'empty-layer': [['src/ui/HeroPhoto.jsx', 'return img ? <PhotoLayer img={img} radius={radius} bleed={bleed} /> : null;',
                   'return img ? <PhotoLayer img={img} radius={radius} bleed={bleed} /> : <ImageBackground source={null} />;']],
  // a block's switch gone
  'no-chip-switch': [['src/ui/Chip.jsx', "  switch (variantOf('chip')) {\n    case 'v1':\n    default:\n      break;\n  }\n", '']],
  // a v1 case that does something of its own
  'v1-returns': [['src/ui/Stat.jsx', "  switch (variantOf('statRow')) {\n    // a vibe's branch returns here, above v1's; every name no vibe draws yet is v1\n    case 'v1':\n    default:\n      break;\n  }\n  return <View",
                  "  switch (variantOf('statRow')) {\n    case 'v1':\n      return <View style={style}>{children}</View>;\n    default:\n      break;\n  }\n  return <View"]],
  // a branch drawn for a name the block does not take
  'foreign-case': [['src/ui/Btn.jsx', "  switch (variantOf('btn')) {\n    case 'v1':", "  switch (variantOf('btn')) {\n    case 'ledger': return null;\n    case 'v1':"]],
  // a switch above a hook
  'hook-after': [['src/ui/Dock.jsx', "  useSyncExternalStore(subscribeTour, getTourVersion);\n  const lit = tourLitView();\n\n", "  const lit = tourLitView();\n\n"],
                 ['src/ui/Dock.jsx', "      break;\n  }\n\n  return (", "      break;\n  }\n  useSyncExternalStore(subscribeTour, getTourVersion);\n\n  return ("]],
  // variantOf that trusts any name
  'trusting-variantof': [['src/ui/variant.js', "return names && names.includes(v) ? v : 'v1';", "return typeof v === 'string' ? v : 'v1';"]],
  // a reserved name that draws something else at runtime (a real branch, but under a name the switch has no case for)
  'sneaky-branch': [['src/ui/Card.jsx', "export function Eyebrow({ children, style }) {\n", "export function Eyebrow({ children, style }) {\n  if (T.variant.eyebrow === 'tag') return <Text style={[T.text.eyebrow, style, { opacity: 0.5 }]}>{children}</Text>;\n"]],
  // a hero slot moved to another box
  'slot-moved': [['app/(app)/(tabs)/steps.jsx', '<Card photo="stepsToday">', '<Card photo="weightLog">']],
  // a hand-rolled card again
  'hand-card': [['src/ui/Stat.jsx', "...T.cardSkin({ radius: 'sm' }),", "backgroundColor: T.colors.bar, borderWidth: 1, borderColor: T.colors.collar, borderRadius: T.radius.sm,"]],
  // a system-font site that lost its spread
  'sf-dropped': [['src/ui/chart/EmptyChart.jsx', '<Text style={{ ...T.systemFace, textAlign', '<Text style={{ textAlign']],
  // the system face as an array entry
  'sf-array': [['src/ui/Swipe.jsx', '<Text style={{ ...T.systemFace, fontSize: 10,', '<Text style={[T.systemFace, { fontSize: 10,'],
               ['src/ui/Swipe.jsx', 'paddingLeft: 26, paddingRight: T.space.m12 }}>', 'paddingLeft: 26, paddingRight: T.space.m12 }]}>']],
  // a photo layer that moves the card's own box
  'layer-moves-box': [['src/ui/Card.jsx', '      {heroPhoto(photo, { radius: T.radius.r - 1 })}', "      {heroPhoto(photo, { radius: T.radius.r - 1 })}{photo && T.image(photo) ? <View style={{ height: 1 }} /> : null}"]],
  // a crop that centres the picture and forgets the focal point
  'centre-crop': [['src/ui/HeroPhoto.jsx', 'const fx = focal && Number.isFinite(focal.x) ? focal.x : 0.5;', 'const fx = 0.5;']]
};
if (!PLANTS[name]) { console.log('unknown plant; one of ' + Object.keys(PLANTS).join(', ')); process.exit(2); }
const dst = '/Users/micahflunker/dev/vibes-night/tmp/n4-plant-' + name;
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(join(dst, 'tools'), { recursive: true });
for (const d of ['app', 'src']) fs.cpSync(join(ENGINE, d), join(dst, d), { recursive: true });
fs.cpSync(join(ENGINE, 'tools/lib'), join(dst, 'tools/lib'), { recursive: true });
fs.copyFileSync(join(ENGINE, 'package.json'), join(dst, 'package.json'));
for (const [f, from, to] of PLANTS[name]) {
  const p = join(dst, f);
  const s = fs.readFileSync(p, 'utf8');
  if (s.split(from).length !== 2) { console.log('PLANT MISSED: ' + f + ' has ' + (s.split(from).length - 1) + ' of ' + JSON.stringify(from)); process.exit(2); }
  fs.writeFileSync(p, s.replace(from, to));
}
const r = spawnSync(process.execPath, [join(ENGINE, 'tools/verify-vibe-seams.mjs'), '--root', dst],
                    { env: { ...process.env, NODE_PATH: NM }, encoding: 'utf8', maxBuffer: 1 << 26 });
const lines = (r.stdout + '\n' + r.stderr).split('\n');
console.log('plant ' + name + ': exit ' + r.status);
lines.filter(l => /✗|passed, |Error/.test(l)).slice(0, 30).forEach(l => console.log('  ' + l.slice(0, 240)));
