// Round-3 theme lens: a SENTINEL vibe — v1's definition with every colour a
// distinct hex, every `exact` legacy string dropped so each tint follows its
// role, and every data table entry its own hex. Writes the definition and the
// reverse map (hex / rgb -> role) the analysis reads.
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ENG = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const OUT = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent';
mkdirSync(OUT, { recursive: true });
const V1 = (await import(pathToFileURL(ENG + '/src/pure/vibes/defs/v1.js').href)).default;
const d = JSON.parse(JSON.stringify(V1));
d.id = 'zz-sentinel';

const map = {};           // '#rrggbb' -> name
let i = 0;
const next = name => {
  // distinct, never a v1 hex: r = 0x31.., g encodes the index, b = 0x7b
  i++;
  const r = 0x30 + (i >> 6), g = 0x40 + ((i * 3) & 0xbf), b = 0x7b;
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  if (map[hex]) throw new Error('clash ' + hex);
  map[hex] = name;
  return hex;
};
for (const k of Object.keys(d.colors)) d.colors[k] = next('colors.' + k);
for (const k of Object.keys(d.tint)) delete d.tint[k].exact;
for (const k of Object.keys(d.kpi)) delete d.kpi[k].exact;
delete d.scrim.tour.native.exact;
for (const k of Object.keys(d.groups)) d.groups[k] = next('groups.' + k);
for (const k of Object.keys(d.groupPlates)) d.groupPlates[k] = next('groupPlates.' + k).toUpperCase();
d.plates = d.plates.map((_, j) => next('plates.' + j));
for (const k of Object.keys(d.signIn)) d.signIn[k] = next('signIn.' + k);
for (const k of Object.keys(d.banner)) d.banner[k] = next('banner.' + k);
d.chrome.shadow = next('chrome.shadow');
d.chrome.camera = next('chrome.camera');
// upper-case group plates map back too
for (const [h, n] of Object.entries({ ...map })) map[h.toUpperCase()] = n;

writeFileSync(OUT + '/sentinel-def.json', JSON.stringify(d, null, 1));
writeFileSync(OUT + '/sentinel-map.json', JSON.stringify(map, null, 1));
console.log('roles', i, '->', OUT + '/sentinel-def.json');
