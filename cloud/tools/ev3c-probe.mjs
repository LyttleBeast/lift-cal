// ev3c-probe.mjs: read-only. Loads engine v3's contract (wt/web-ev3) and the three design defs
// (wt/web-design2) and reports: looks each def names that the vocabulary does not accept, shape keys
// it sets that the vocabulary lacks, and ROLES that resolve to undefined in it (valueOf).
import { pathToFileURL } from 'node:url';
const EV3 = '/Users/micahflunker/dev/vibes-night/wt/web-ev3/vibes/defs/';
const D2 = '/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/';
const I = await import(pathToFileURL(EV3 + 'index.js').href);
const VOC = (await import(pathToFileURL(EV3 + 'vocab.js').href)).default;
for (const id of ['ledger', 'clear-sky', 'meet-day', 'chalk']) {
  const def = (await import(pathToFileURL((id === 'chalk' ? EV3 : D2) + id + '.js').href)).default;
  const badLooks = Object.entries(def.variants || {}).filter(([b, n]) => !VOC.blocks[b] || !VOC.blocks[b].variants.includes(n)).map(([b, n]) => b + '=' + n);
  const badShape = Object.keys(def.shape || {}).filter(k => !(k in VOC.params));
  const unresolved = I.ROLES.filter(r => I.valueOf(def, r.path) === undefined).map(r => r.path);
  const v3 = ['colors.knob', 'colors.greetName', 'type.hero', 'type.tag', 'type.pill', 'shape.cue.ink'].map(p => p + '=' + JSON.stringify(I.valueOf(def, p) ?? null));
  console.log(id, '| looks not accepted:', badLooks.join(', ') || 'none', '| shape keys unknown:', badShape.join(', ') || 'none',
    '| unresolved roles:', unresolved.join(', ') || 'none', '| v3:', v3.join(' '), '| hair:', JSON.stringify((def.shape || {}).rule && def.shape.rule.hair));
}
