// iav-check.mjs <iron-age icons module> <v1 icons module> — the icon set's shape, against v1's:
// v1's icon names in v1's order, each { viewBox, stroke, fill, linecap, linejoin, els } with els only
// path/circle/rect (rect with rx), square caps and miter joins, every coordinate inside the 24 grid with
// half a stroke to spare, glyph keys = v1's, the vessel's fields, ornaments' drawings, frozen, no import.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { flatten } from './iav-raster-lib.mjs';
const [ia, v1p] = process.argv.slice(2);
const S = (await import(pathToFileURL(ia).href)).default, V = (await import(pathToFileURL(v1p).href)).default;
const src = readFileSync(ia, 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const frozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(frozen));
ok(frozen(S), 'frozen all the way down');
ok(!/^\s*import\b|\bimport\(|require\(/m.test(src), 'imports nothing');
ok(S.id === 'iron-age', 'id');
ok(JSON.stringify(Object.keys(S.icons)) === JSON.stringify(Object.keys(V.icons)), 'icon names are v1\'s, in v1\'s order');
ok(JSON.stringify(Object.keys(S.glyphs)) === JSON.stringify(Object.keys(V.glyphs)), 'glyph names are v1\'s, in v1\'s order');
const KEYS = { path: ['tag', 'd'], circle: ['tag', 'cx', 'cy', 'r'], rect: ['tag', 'x', 'y', 'width', 'height', 'rx'] };
function bounds(el) {
  if (el.tag === 'circle') return [el.cx - el.r, el.cy - el.r, el.cx + el.r, el.cy + el.r];
  if (el.tag === 'rect') return [el.x, el.y, el.x + el.width, el.y + el.height];
  const pts = flatten(el.d).flatMap(s => s.pts); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function drawing(name, ic, isIcon) {
  const want = isIcon ? ['viewBox', 'stroke', 'fill', 'linecap', 'linejoin', 'els'] : ['viewBox', 'stroke', 'linecap', 'linejoin', 'els'];
  ok(JSON.stringify(Object.keys(ic)) === JSON.stringify(want), name + ' keys ' + Object.keys(ic));
  if (isIcon) ok(ic.viewBox === '0 0 24 24' && ic.fill === 'none', name + ' 24 grid, unfilled');
  ok(ic.linecap === 'square' && ic.linejoin === 'miter', name + ' square caps, miter joins');
  ok(typeof ic.stroke === 'number' && ic.stroke > 0, name + ' stroke');
  const [, , W, H] = ic.viewBox.split(' ').map(Number), h = ic.stroke / 2;
  for (const el of ic.els) {
    ok(!!KEYS[el.tag] && JSON.stringify(Object.keys(el)) === JSON.stringify(KEYS[el.tag]), name + ' element ' + JSON.stringify(el).slice(0, 60));
    const [x0, y0, x1, y1] = bounds(el);
    ok(x0 - h >= -0.01 && y0 - h >= -0.01 && x1 + h <= W + 0.01 && y1 + h <= H + 0.01, name + ' inside its box with the stroke: ' + [x0, y0, x1, y1].map(v => v.toFixed(2)).join(','));
  }
}
for (const [k, ic] of Object.entries(S.icons)) drawing('icons.' + k, ic, true);
for (const [k, ic] of Object.entries(S.glyphs)) if (ic !== null) drawing('glyphs.' + k, ic, true);
for (const k of ['up', 'down', 'flat']) ok(S.glyphs[k] === null, 'glyphs.' + k + ' stays text');
const Vs = S.vessel;
ok(JSON.stringify(Object.keys(Vs)) === JSON.stringify(Object.keys(V.vessel)) && Vs.viewBox === V.vessel.viewBox && Vs.insideBottom > Vs.insideTop && Vs.cap === null, 'vessel');
{ const pts = flatten(Vs.d).flatMap(s => s.pts), ys = pts.map(p => p[1]);
  ok(Math.min(...ys) < Vs.insideTop && Math.max(...ys) > Vs.insideBottom, 'the vessel\'s outline holds insideTop..insideBottom');
  ok(/Z\s*$/.test(Vs.d) && (Vs.d.match(/M/g) || []).length === 1, 'the vessel is one closed outline (it is the clip)'); }
ok(JSON.stringify(Object.keys(S.ornaments)) === JSON.stringify(['you', 'workout', 'food', 'weight', 'recap', 'steps']) && S.ornaments.steps === null, 'ornaments: five, none on Steps');
for (const [k, o] of Object.entries(S.ornaments)) if (o) drawing('ornaments.' + k, o, false);
ok(!!S.sources && Object.keys(S.icons).every(k => typeof S.sources[k] === 'string'), 'every icon names its source');
console.log(bad ? bad + ' failed' : 'ok: ' + Object.keys(S.icons).length + ' icons, ' + Object.values(S.glyphs).filter(Boolean).length + ' glyphs, vessel, ' + Object.values(S.ornaments).filter(Boolean).length + ' ornaments');
process.exit(bad ? 1 : 0);
