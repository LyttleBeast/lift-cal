// Mutation runs for the native engine-v2 checks: plant one mistake in a
// worktree file, run the verifier that should catch it, restore the file byte
// for byte (checked by sha256), and report which checks went red.
// Usage: node ev2n-mutate.mjs <nat-wt>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const WT = process.argv[2];
const sha = b => createHash('sha256').update(b).digest('hex');
const TB = 'tools/verify-theme-build.mjs', SE = 'tools/verify-vibe-seams.mjs', ID = 'tools/verify-theme-identity.mjs';
const FOOD = 'app/(app)/(tabs)/food.jsx';
const ONLY = process.argv[3] ? new RegExp(process.argv[3]) : null;
const runs0 = [
  ['build(): tagInk from the module table, not the def', 'src/ui/theme.js', s => s.replace("tagInk[k] = role(own(TI, k) ? TI[k] : TAG_INK[k], 'tagInk.' + k);", "tagInk[k] = role(TAG_INK[k], 'tagInk.' + k);"), TB],
  ['build(): inkOf ignores the def', 'src/ui/theme.js', s => s.replace("inkOf[k] = role(own(IO, k) ? IO[k] : k, 'inkOf.' + k);", "inkOf[k] = role(k, 'inkOf.' + k);"), TB],
  ['build(): the ring drops its alpha', 'src/ui/theme.js', s => s.replace('borderColor: layer.a == null ? hex : rgba(hex, layer.a)', 'borderColor: hex'), TB],
  ['build(): a shape default drifts from vocab.js (rule.hair 2)', 'src/ui/theme.js', s => s.replace("rule: { ink: 'knurl', hair: 1,", "rule: { ink: 'knurl', hair: 2,"), TB],
  ['build(): a shape colour param left as its role name', 'src/ui/theme.js', s => s.replace("const SHAPE_COLORS = ['rule.ink', 'leader.ink', 'band.fill', 'band.ink', 'keyline.ink'];", "const SHAPE_COLORS = ['rule.ink', 'leader.ink', 'band.fill', 'band.ink'];"), TB],
  ['build(): type.meta without the note fallback', 'src/ui/theme.js', s => s.replace("if (!own(text, 'meta') && d.type && own(d.type, 'note')) text.meta", "if (false) text.meta"), TB],
  ['build(): colors.band kept on native', 'src/ui/theme.js', s => s.replace('const WEB_ONLY_COLORS = [\'band\'];', 'const WEB_ONLY_COLORS = [];'), TB],
  ['build(): band honoured on a non-hero slot', 'src/ui/theme.js', s => s.replace('const band = HERO_SLOTS.includes(slot) && Number.isFinite(o.band)', 'const band = Number.isFinite(o.band)'), TB],
  ['build(): face.bands ignored', 'src/ui/theme.js', s => s.replace('const bands = (F.bands || []).map(b => ({ ...b }));', 'const bands = [];'), ID],
  ['SetTypeBadge: the letter back on the plate colour', 'src/ui/train/SetRow.jsx', s => s.replace('T.tagInk[inkName]', "T.colors[{ W: 'pYellow', F: 'pRed', D: 'pBlue' }[inkName]]"), SE],
  ['CalMeter: the hatch in the wash, not the zone colour', FOOD, s => s.replace('{hatched ? <Hatch color={ink} /> : null}', '{hatched ? <Hatch color={bg} /> : null}'), SE],
  ['CalMeter: the head ring not drawn', FOOD, s => s.replace('{headRing ? (', '{false ? ('), SE],
  ['HeroPhoto: band mode still draws the scrim', 'src/ui/HeroPhoto.jsx', s => s.replace('const LinearGradient = img.scrim && !banded ? gradient() : null;', 'const LinearGradient = img.scrim ? gradient() : null;'), SE],
  ['Card: the padding does not grow', 'src/ui/Card.jsx', s => s.replace('...(band ? { paddingTop: T.space.m14 + band } : null),', ''), SE],
  ['icons.jsx: Icon always draws v1', 'src/ui/icons.jsx', s => s.replace('if (s.icons && own(s.icons, name) && isDrawing(s.icons[name])) return s.icons[name];', ''), SE],
  ['Hero: the gear drawn by hand again', 'src/ui/you/Hero.jsx', s => s.replace('return <Icon name="gearYou" size={17} color={T.colors.steel} />;', 'return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={T.colors.steel} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" /></Svg>;').replace("import { Icon } from '../icons';", "import { Icon } from '../icons';\nimport Svg, { Path } from 'react-native-svg';"), SE],
  ['meals.jsx: one glyph site unrouted', 'src/ui/food/meals.jsx', s => s.replace("{glyph('close', <Text style={{ ...T.systemFace, fontSize: 12, color: T.colors.dim }}>✕</Text>)}", "<Text style={{ ...T.systemFace, fontSize: 12, color: T.colors.dim }}>✕</Text>"), SE],
  ['food.jsx: the water − button loses its glyph name', FOOD, s => s.replace('<Btn kind="ghost" style={{ flex: 0, minWidth: 48 }} glyph="minus"', '<Btn kind="ghost" style={{ flex: 0, minWidth: 48 }}'), SE],
  ['weight.jsx: no tailpiece', 'app/(app)/(tabs)/weight.jsx', s => s.replace('<Tailpiece screen="weight" />', ''), SE],
  ['bits.jsx: pillShown always true', 'src/ui/you/bits.jsx', s => s.replace('return !(a === 0);', 'return true;'), SE],
  ['Vessel: the level ignores the set\'s inside top', FOOD, s => s.replace('const bottom = v.insideBottom, top = v.insideTop;', 'const bottom = v.insideBottom, top = 22;'), SE],
  ['icons.jsx: glyph() draws even in v1 (wraps every text)', 'src/ui/icons.jsx', s => s.replace("return s.glyphs && own(s.glyphs, name) && isDrawing(s.glyphs[name]) ? s.glyphs[name] : null;", "return V1.icons.plus;"), SE]
];
const runs = runs0.filter(r => !ONLY || ONLY.test(r[0]));
let caught = 0;
for (const [label, rel, edit, verifier] of runs) {
  const p = join(WT, rel);
  const orig = readFileSync(p);
  const s = orig.toString('utf8'), t = edit(s);
  if (t === s) { console.log('## ' + label + ': EDIT DID NOT APPLY'); continue; }
  let r;
  try {
    writeFileSync(p, t);
    r = spawnSync(process.execPath, [verifier, ...(verifier === ID ? ['--require-build'] : [])], { cwd: WT, encoding: 'utf8', maxBuffer: 1 << 28 });
  } finally {
    writeFileSync(p, orig);
  }
  if (sha(readFileSync(p)) !== sha(orig)) { console.log('!! RESTORE FAILED for ' + rel); process.exit(2); }
  const out = (r.stdout || '') + (r.stderr || '');
  const bad = out.split('\n').filter(l => l.includes('✗'));
  const threw = r.status !== 0 && !bad.length ? out.split('\n').filter(l => /Error/.test(l)).slice(0, 1) : [];
  if (r.status !== 0) caught++;
  console.log('## ' + label + ' → ' + verifier.split('/').pop() + ': exit ' + r.status + ', ' + bad.length + ' red');
  for (const l of [...bad, ...threw].slice(0, 4)) console.log('   ' + l.trim().slice(0, 200));
}
console.log('\n' + caught + ' of ' + runs.length + ' planted mistakes caught');
