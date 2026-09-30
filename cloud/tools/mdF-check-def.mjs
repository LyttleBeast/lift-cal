// mdF-check-def.mjs — Meet Day final (Phase D): hold vibes/defs/meet-day.js and
// vibes/icons/meet-day.js to the v2 contract, read-only.
//   1. every leaf key path of v1.js is present in meet-day.js (v1's legacy
//      `exact` strings excluded: no other vibe may hold them);
//   2. every colour is 6-digit hex; no rgba() string; no `exact` key anywhere;
//   3. the meta keys are set, experimental true, id valid;
//   4. every index.js ROLES entry resolves through valueOf() to a value of the
//      right shape (colour, role name, tint, shadow, type, …);
//   5. every variant names a look vocab.js accepts, at a grade the
//      experimental slot may use;
//   6. the hex tables follow their roles, the aliases equal their roles;
//   7. face: web families start with the vibe id; every preset's wdth lands
//      in the band meant for it; band keys are family_weight;
//   8. the icon set: imports nothing, frozen, every icon name is v1's,
//      `spark` defined and not v1's, glyph keys are v1's, els well-formed.
// Usage: node mdF-check-def.mjs   (exit 1 on any failure)
import { readFileSync } from 'node:fs';

const WT = '/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/';
const idx = await import(WT + 'defs/index.js');
const V1 = (await import(WT + 'defs/v1.js')).default;
const MD = (await import(WT + 'defs/meet-day.js')).default;
const VOCAB = (await import(WT + 'defs/vocab.js')).default;
const IC1 = (await import(WT + 'icons/v1.js')).default;
const ICM = (await import(WT + 'icons/meet-day.js')).default;
const { ROLES, LEGACY_EXACT, valueOf, at, validId, hexToRgb } = idx;

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('FAIL ' + msg); } };
const HEX = /^#[0-9a-fA-F]{6}$/;
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const COLORS = Object.keys(MD.colors);
const isRole = r => typeof r === 'string' && Object.prototype.hasOwnProperty.call(MD.colors, r);

/* 1. v1's leaf paths */
const leaves = (o, pre = '') => {
  if (!isObj(o) || Object.keys(o).length === 0) return [pre];
  return Object.entries(o).flatMap(([k, v]) => leaves(v, pre ? pre + '.' + k : k));
};
const exactPaths = LEGACY_EXACT.filter(p => /\.exact$/.test(p));
const v1Leaves = leaves(V1).filter(p => !exactPaths.some(e => p === e || p.startsWith(e + '.')));
let missing = 0;
for (const p of v1Leaves) { const has = at(MD, p) !== undefined || (p.split('.').length && hasPath(MD, p)); ok(has, 'missing v1 leaf ' + p); if (!has) missing++; }
function hasPath(o, p) { let x = o; for (const k of p.split('.')) { if (x == null || !Object.prototype.hasOwnProperty.call(x, k)) return false; x = x[k]; } return true; }
console.log(`v1 leaf paths: ${v1Leaves.length} (legacy exact excluded: ${exactPaths.length}); missing in meet-day: ${missing}`);

/* 2. colour spellings */
const strings = [];
const walk = (o, pre) => {
  if (typeof o === 'string') strings.push([pre, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => walk(v, pre + '.' + i));
  else if (isObj(o)) for (const [k, v] of Object.entries(o)) { ok(k !== 'exact', 'an exact key at ' + pre + '.' + k); walk(v, pre ? pre + '.' + k : k); }
};
walk(MD, '');
let hexCount = 0;
for (const [p, s] of strings) {
  if (s.startsWith('#')) { hexCount++; ok(HEX.test(s), 'not 6-digit hex at ' + p + ': ' + s); }
  ok(!/rgba?\(/.test(s), 'an rgb()/rgba() string at ' + p);
}
for (const p of LEGACY_EXACT) {
  const v = at(MD, p);
  if (/\.exact$/.test(p)) ok(v === undefined, 'holds legacy ' + p);
  else ok(typeof v === 'string' && HEX.test(v), 'legacy-spelled role ' + p + ' must be 6-digit here: ' + v);
}
console.log(`colour strings: ${hexCount}, all 6-digit hex; no rgba(), no exact key`);

/* 3. meta */
ok(MD.id === 'meet-day' && validId(MD.id), 'id');
ok(MD.name === 'Meet Day', 'name');
ok(typeof MD.feel === 'string' && MD.feel.length <= 28, 'feel ≤ 28 chars');
ok(MD.experimental === true, 'experimental true');
ok(MD.scheme === 'dark', 'scheme');
ok(MD.icons === 'meet-day', 'icons id');
ok(isObj(MD.images), 'images object');
ok(HEX.test(MD.themeColor), 'themeColor hex');
ok(isObj(MD.variants) && isObj(MD.shape), 'variants and shape set');
ok(Object.isFrozen(MD) && Object.isFrozen(MD.colors) && Object.isFrozen(MD.shadow.peek.web), 'frozen all the way down');
const src = readFileSync(WT + 'defs/meet-day.js', 'utf8');
ok(!/^\s*import\s/m.test(src) && !/\brequire\(/.test(src), 'def imports nothing');

/* 4. every ROLES entry */
const byKind = {};
const shapeOfType = v => isObj(v) && typeof v.size === 'number' && (v.color === undefined || isRole(v.color));
for (const r of ROLES) {
  const v = valueOf(MD, r.path);
  byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const where = `${r.kind} ${r.path}`;
  if (r.path === 'colors.band') { ok(v === null, where + ' null for a dark vibe'); continue; }
  if (r.path.startsWith('images.')) { ok(v === null || isObj(v) || typeof v === 'number', where); continue; }
  switch (r.kind) {
    case 'meta': ok(v !== undefined, where); break;
    case 'variant': ok(typeof v === 'string', where); break;
    case 'color':
      if (r.channel || r.ref === 'color') ok(isRole(v), where + ' names a colour role: ' + v);
      else if (r.path === 'colors.onDanger') ok(isObj(v) && HEX.test(v.web) && HEX.test(v.native), where);
      else ok(typeof v === 'string' && HEX.test(v), where + ': ' + v);
      break;
    case 'alpha': ok(isRole(v), where); break;
    case 'tint': ok(isObj(v) && isRole(v.color) && typeof v.a === 'number' && v.a >= 0 && v.a <= 1, where); break;
    case 'radius': ok(typeof v === 'number' || /^\d+%$/.test(v), where); break;
    case 'shadow': {
      const web = v && v.web;
      ok(Array.isArray(web) && web.every(l => isRole(l.color) && typeof l.blur === 'number'), where + ' web layers');
      if (v && v.native) ok(typeof v.native.opacity === 'number', where + ' native');
      break;
    }
    case 'scrim': ok(v !== undefined, where); break;
    case 'font': ok(v !== undefined, where); break;
    case 'type': ok(r.path === 'loadNum' ? isObj(v) : shapeOfType(v), where); break;
    case 'face': ok(v !== undefined, where); break;
    case 'chrome': ok(v !== undefined, where); break;
    case 'table': ok(v !== undefined, where); break;
    case 'shape': {
      if (r.path === 'shape') { ok(isObj(v), where); break; }
      if (r.ref === 'color') ok(isRole(v), where + ' names a role: ' + v);
      else ok(typeof v === 'number' || typeof v === 'boolean', where + ': ' + v);
      break;
    }
    case 'layout': case 'motion': ok(v === at(V1, r.path), where + " is v1's (fixed)"); break;
    default: ok(v !== undefined, where);
  }
  if (r.fixed) ok(JSON.stringify(v) === JSON.stringify(at(V1, r.path)), `fixed ${r.path} holds v1's value`);
}
console.log(`ROLES walked: ${ROLES.length} (${Object.entries(byKind).map(([k, n]) => k + ' ' + n).join(', ')})`);
// The engine-v2 roles (those carrying `or` or `dflt`): what valueOf() hands
// the engines and the generator for this definition, and whether the
// definition set it itself or the role's fallback supplied it.
const short = v => { const s = JSON.stringify(v); return s && s.length > 90 ? s.slice(0, 87) + '…' : s; };
let own2 = 0, fell = 0;
for (const r of ROLES.filter(r => r.or || Object.prototype.hasOwnProperty.call(r, 'dflt'))) {
  const mine = at(MD, r.path) !== undefined;
  mine ? own2++ : fell++;
  console.log(`  v2 ${r.path} = ${short(valueOf(MD, r.path))}${mine ? '' : '  (from ' + (r.or ? 'or ' + r.or : 'dflt') + ')'}`);
}
console.log(`engine-v2 roles: ${own2} set by meet-day.js, ${fell} resolved by the role's fallback`);

/* role names inside tables, tints, shadows, scrims */
for (const [k, t] of Object.entries(MD.tint)) ok(isRole(t.color), 'tint ' + k + ' role ' + t.color);
for (const [k, r] of Object.entries(MD.alpha)) ok(isRole(r), 'alpha ' + k);
for (const [k, s] of Object.entries(MD.shadow)) for (const l of s.web || []) ok(isRole(l.color), 'shadow ' + k + ' role ' + l.color);
for (const s of MD.scrim.tour.stops) ok(isRole(s.color), 'tour stop role');
for (const r of [...MD.mark, ...Object.values(MD.importGroups), ...Object.values(MD.subjects), ...Object.values(MD.conf),
  ...Object.values(MD.admin.aiSplit), ...MD.admin.families, ...Object.values(MD.admin.flag),
  ...Object.values(MD.admin.pill.native), ...Object.values(MD.kpi).map(x => x.color), ...Object.values(MD.tagInk),
  ...Object.values(MD.inkOf), ...Object.values(MD.web.rgb)]) ok(isRole(r), 'table role ' + r);
for (const [k, t] of Object.entries(MD.type)) ok(t.color === undefined || isRole(t.color), 'type ' + k + ' colour role');
for (const k of ['rule.ink', 'leader.ink', 'band.fill', 'band.ink', 'keyline.ink']) ok(isRole(at(MD.shape, k)), 'shape ' + k);

/* 5. variants */
const allowed = VOCAB.allowed.experimental;
for (const [block, look] of Object.entries(MD.variants)) {
  const b = VOCAB.blocks[block];
  ok(!!b, 'variant block ' + block + ' exists in vocab');
  const L = b && b.looks[look];
  ok(!!L, `variant ${block} · ${look} is a look vocab accepts`);
  if (L) ok(allowed.includes(L.grade), `${block} · ${look} grade ${L.grade} allowed for experimental`);
}
ok(Object.keys(MD.variants).length === Object.keys(V1.variants).length, 'all ' + Object.keys(V1.variants).length + ' blocks named');
const lookList = Object.entries(MD.variants).map(([b, l]) => `${b}·${l}(${VOCAB.blocks[b].looks[l].grade})`);
console.log(`variants: ${lookList.length} blocks, every look accepted; deep ${lookList.filter(x => /deep/.test(x)).length}, shape ${lookList.filter(x => /\(shape/.test(x)).length}, v1 ${lookList.filter(x => /\(v1/.test(x)).length}`);

/* 6. follows + aliases */
const GROUP_ROLES = { chest: 'pRed', back: 'pBlue', legs: 'pYellow', shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome' };
for (const [g, r] of Object.entries(GROUP_ROLES)) {
  ok(MD.groups[g] === MD.colors[r], 'groups.' + g + ' follows ' + r);
  ok(MD.groupPlates[g] === MD.colors[r].toUpperCase(), 'groupPlates.' + g + ' follows ' + r + ' (uppercase)');
}
ok(MD.groups.fallback === MD.colors.steel, 'groups.fallback follows steel');
['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].forEach((r, i) => ok(MD.plates[i] === MD.colors[r], 'plates.' + i + ' follows ' + r));
ok(MD.colors.onYellow === MD.colors.onAccent, 'onYellow = onAccent');
ok(MD.colors.onGreen === MD.colors.onDone, 'onGreen = onDone');
ok(MD.colors.white === MD.colors.onDanger.native, 'white = onDanger');
ok(MD.colors.pYellowPressed === MD.colors.accentPressed, 'pYellowPressed = accentPressed');
ok(MD.colors.fallback === MD.groups.fallback, 'fallback = groups.fallback');
ok(COLORS.length === Object.keys(V1.colors).length, 'colors key count ' + COLORS.length + ' = v1 ' + Object.keys(V1.colors).length);

/* 7. face */
const fams = ['font', 'display', 'italic', 'num'].map(k => valueOf(MD, 'face.web.' + k));
for (const s of fams) ok(typeof s === 'string' && s.split(',')[0].trim().replace(/'/g, '').startsWith('meet-day'), 'web family starts with the vibe id: ' + s);
ok(valueOf(MD, 'face.web.importUrl') === V1.face.web.importUrl, 'importUrl is v1 (rack.css line 1 untouched)');
const bandOf = w => MD.face.bands.find(b => (b.min == null || w >= b.min) && (b.max == null || w <= b.max)) || null;
const where = {};
for (const [k, t] of Object.entries({ ...MD.type, loadNum: MD.loadNum })) {
  if (t.wdth == null) continue;
  const b = bandOf(t.wdth);
  where[k] = (b ? b.family : MD.face.family) + '@' + t.wdth + '/' + t.wght;
  if (t.wdth <= 64) ok(b && b.family === 'ArchivoExtraCondensed' && t.wght === 800, k + ' figures in ExtraCondensed 800');
  else if (t.wdth === 75) ok(b && b.family === 'ArchivoCondensed' && t.wght === 700, k + ' heads in Condensed 700');
  else ok(t.wdth === 100 && !b, k + ' at wdth 100 in the package faces (parity: web draws what native draws)');
}
for (const b of MD.face.bands) ok(b.keys.length === 1 && b.keys[0] === b.family + '_' + b.weights[0], 'band key ' + b.keys[0]);
// v1's own presets and the one literal native width under 80 (ErrorScreen 78) must fall in no band
for (const w of [78, 88, 92, 100, 108, 112, 118]) ok(!bandOf(w), 'v1 width ' + w + ' falls in no band');
console.log('type → face:', JSON.stringify(where));

/* 8. icons */
const isrc = readFileSync(WT + 'icons/meet-day.js', 'utf8');
ok(!/^\s*import\s/m.test(isrc), 'icon set imports nothing');
ok(ICM.id === 'meet-day' && Object.isFrozen(ICM) && Object.isFrozen(ICM.icons.you.els), 'icon set id, frozen');
for (const n of Object.keys(ICM.icons)) ok(Object.prototype.hasOwnProperty.call(IC1.icons, n), 'icon ' + n + ' is a v1 name');
ok(!!ICM.icons.spark, 'spark defined');
ok(JSON.stringify(ICM.icons.spark.els) !== JSON.stringify(IC1.icons.spark.els), "spark is not v1's sparkle");
for (const n of Object.keys(ICM.glyphs || {})) ok(Object.prototype.hasOwnProperty.call(IC1.glyphs, n), 'glyph ' + n + ' is a v1 glyph key');
ok(ICM.glyphs.check === null, 'check stays text');
const allIcons = [...Object.entries(ICM.icons), ...Object.entries(ICM.glyphs).filter(([, v]) => v)];
for (const [n, ic] of allIcons) {
  ok(ic.viewBox === '0 0 24 24' && ic.fill === 'none' && ic.linecap === 'square' && ic.linejoin === 'miter' && typeof ic.stroke === 'number', n + ' shape');
  for (const e of ic.els) {
    ok(['path', 'circle', 'rect'].includes(e.tag), n + ' el tag ' + e.tag);
    if (e.tag === 'path') ok(typeof e.d === 'string' && /^M/.test(e.d), n + ' path d');
  }
}
// v1's path data kept point for point on every re-cut icon but spark
for (const [n, ic] of Object.entries(ICM.icons)) {
  if (n === 'spark') continue;
  const a = IC1.icons[n].els.map(e => e.tag === 'rect' ? { ...e, rx: 0 } : e);
  ok(JSON.stringify(ic.els) === JSON.stringify(a) && ic.stroke === IC1.icons[n].stroke, n + " keeps v1's geometry and stroke (rects square)");
}
console.log(`icons: ${Object.keys(ICM.icons).length} (v1 has ${Object.keys(IC1.icons).length}); glyphs drawn: ${Object.entries(ICM.glyphs).filter(([, v]) => v).map(([k]) => k).join(' ')}`);

console.log(`\n${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
