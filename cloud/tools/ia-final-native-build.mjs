// Iron Age final (Phase D): does native's build() take the definition?
// Reads rack-mobile's src/ui/theme.js at HEAD (read-only, through git show),
// stubs its one import (react-native's Platform), stages the copy under
// design/iron-age/final/probe/, and builds Iron Age with a source for every
// image slot. Prints the faces each preset resolves to, T.fonts.keys, the
// picker face (loadNum(40), as src/state/vibe.js pickerFace reads it), a few
// line heights, the image scrims, and every tint — the way native will see it.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const OUT = '/Users/micahflunker/dev/vibes-night/design/iron-age/final/probe/native/';
mkdirSync(OUT, { recursive: true });
const src = execFileSync('git', ['-C', '/Users/micahflunker/dev/rack-mobile', 'show', 'HEAD:src/ui/theme.js'], { encoding: 'utf8' });
const stub = "const Platform = { OS: 'ios', select: o => (o && 'ios' in o ? o.ios : o && o.default) };";
if (!src.includes("import { Platform } from 'react-native';")) throw new Error('theme.js import moved');
writeFileSync(OUT + 'theme.mjs', src.replace("import { Platform } from 'react-native';", stub));
const { build } = await import(pathToFileURL(OUT + 'theme.mjs').href);
const IA = (await import(pathToFileURL('/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs/iron-age.js').href)).default;
const images = Object.fromEntries(Object.keys(IA.images).map(k => [k, 1]));
const T = build(IA, { images });
console.log('built:', T.id, T.scheme);
console.log('faces:', Object.entries(T.text).map(([k, s]) => k + '=' + s.fontFamily + (s.lineHeight ? '/' + s.lineHeight : '')).join(' '));
console.log('fonts.keys:', T.fonts.keys.join(', '));
console.log('picker face (loadNum(40)):', T.loadNum(40).fontFamily, 'lineHeight', T.loadNum(40).lineHeight);
console.log('coach card fit: metrics', T.fit.metrics, '| fit face', T.fit.face(100, 800), '| archivo', T.fit.archivo.face(100, 600));
console.log('images:', Object.entries(T.images).map(([k, v]) => k + ' ' + JSON.stringify(v.scrim.colors) + ' focal ' + JSON.stringify(v.focal)).join(' | '));
console.log('tints:', Object.entries(T.tint).map(([k, v]) => k + '=' + v).join(' '));
console.log('tour scrim:', JSON.stringify(T.scrim.tour));
console.log('chrome:', JSON.stringify(T.chrome), 'pickerTheme', JSON.stringify(T.pickerTheme));
console.log('shadow.fab:', JSON.stringify(T.shadow.fab), '| radius', JSON.stringify(T.radius));
console.log('group(legs)', T.group('legs'), 'plate(2)', T.plate(2), 'subject(fuel)', T.subject('fuel'), 'kpi(fuel)', T.kpi('fuel'), 'conf', JSON.stringify(T.conf));
console.log('variant:', JSON.stringify(T.variant));
