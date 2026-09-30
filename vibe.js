// The vibe: which look this device is painting in, and the four things the
// rest of the app asks of it.
//
//   paint(c)        a colour a pinned module bakes as hex -> the token that
//                   paints it. exercises.js GROUPS and analytics.js
//                   groupColor() are copied into the native app byte for byte,
//                   so their hex stays and is mapped where it is spent.
//                   paintSvg() does the same for an SVG a pinned module drew.
//   icon(name, o)   an icon from the active vibe's set, as an <svg> element;
//                   iconHtml() is the same drawing as markup, for the sites
//                   that write innerHTML. glyphed() draws a glyph site (‹ › ✕
//                   ⋯ ✓ …) from the set where it has a drawing, and leaves the
//                   character where it has none; vessel() is the water
//                   bottle's outline; tailpiece() the one ornament a vibe may
//                   hang at the foot of a screen.
//   applyVibe(id)   the switch: the attribute on <html>, this device's key,
//                   the theme-color meta, the dock, then the screen.
//   current()       the active vibe's id.
//   prefetchVibes() after boot: the vibes' photos and faces into the offline
//                   cache, where they are not there yet.
//
// Imports only the pure contract under vibes/ — the definitions and the icon
// sets, which are data and are copied into the native app verbatim — so this
// file can sit under every screen without dragging anything else in.
//
// V1 IS TODAY. With v1 active nothing here changes a pixel: paint() hands back
// a token whose value is the hex it replaced, icon() writes the markup each
// site wrote before (same attributes, same order, same children), glyphed()
// leaves every site's character as it is, vessel() is water.js's own bottle,
// tailpiece() is null, and nothing at all runs at boot — index.html's own
// dock and theme-color stand, and no pattern defs are added.
//
// WHERE THE CHOICE LIVES. <html data-vibe="<id>">, absent for v1, is the one
// switch the stylesheets read: every vibe's rules are scoped under it
// (vibes/<id>.css), so with it absent nothing a vibe file holds can match.
// index.html's head script sets it from this device's key before the first
// frame; applyVibe() sets it after. The key, rack:vibe, sits outside the
// per-account namespace like rack:migrated (store.js): it has to be readable
// before anyone is signed in, and purgeDevice() and lsKey() never touch it.
// v1 is its absence too. The account's own copy (settings/vibe) is store.js's.

import { normVibe, ROLES, DEFAULT, valueOf } from './vibes/defs/index.js';
import V1 from './vibes/defs/v1.js';
import V1_ICONS from './vibes/icons/v1.js';
import IRON_AGE from './vibes/defs/iron-age.js';
import IRON_AGE_ICONS from './vibes/icons/iron-age.js';
import CHALK from './vibes/defs/chalk.js';
import CHALK_ICONS from './vibes/icons/chalk.js';
import NAVY from './vibes/defs/navy.js';
import NAVY_ICONS from './vibes/icons/navy.js';
import OXBLOOD from './vibes/defs/oxblood.js';
import OXBLOOD_ICONS from './vibes/icons/oxblood.js';

/* Every vibe's definition and every icon set, by id. A new vibe adds its
   imports and its entries here, beside v1's. */
const DEFS = { v1: V1, 'iron-age': IRON_AGE, chalk: CHALK, navy: NAVY, oxblood: OXBLOOD };
const ICON_SETS = { v1: V1_ICONS, 'iron-age': IRON_AGE_ICONS, chalk: CHALK_ICONS, navy: NAVY_ICONS, oxblood: OXBLOOD_ICONS };

const KEY = 'rack:vibe';

/* ---------- which vibe ---------- */

function attr() {
  try { return document.documentElement.dataset.vibe; } catch { return undefined; }
}

/* The active vibe. The attribute is the source of truth — it is what the CSS
   reads — and anything it holds that is not a registered vibe means v1,
   because that is what the page is painting. */
export function current() { return normVibe(attr()); }

/* A vibe's definition (vibes/defs/<id>.js); the active one's by default. */
export function def(id) {
  return DEFS[id === undefined ? current() : normVibe(id)] || V1;
}

/* ---------- paint ---------- */

/* colors.<role> -> its custom property, from the contract's own map. */
const TOKEN = Object.fromEntries(ROLES
  .filter(r => r.kind === 'color' && r.path.startsWith('colors.') && typeof r.web === 'string' && r.web.startsWith('--'))
  .map(r => [r.path.slice(7), r.web]));

/* The hex the pinned modules bake, lower-cased, to the token that paints it.
   The contract's three hex tables (ROLES web 'paint()': analytics.js groups
   with groupColor()'s steel fallback, exercises.js GROUPS in upper case, the
   plates) each name the colour role every entry follows; v1's hex for an
   entry becomes var(<that role's token>). Built from the contract rather than
   written out, so there is one copy of each hex and it is the contract's. */
const PAINT = Object.create(null);   // no prototype: paint('constructor') is 'constructor'
for (const r of ROLES) {
  if (r.kind !== 'table' || r.web !== 'paint()' || !r.follows) continue;
  for (const [k, role] of Object.entries(r.follows)) {
    const hex = V1[r.path] && V1[r.path][k];
    const token = TOKEN[role];
    if (typeof hex === 'string' && token && !(hex.toLowerCase() in PAINT)) PAINT[hex.toLowerCase()] = 'var(' + token + ')';
  }
}

/* A colour, as the vibe paints it. One of the baked hexes, in any case,
   becomes its token — the same colour in v1, and whatever the vibe says in
   any other. Anything else (a var() already, undefined) comes back as it was. */
export function paint(c) {
  return (typeof c === 'string' && PAINT[c.toLowerCase()]) || c;
}

/* An SVG a pinned module drew, with a painted colour in a presentation
   attribute: analytics.js donut() writes each segment's colour as
   stroke="…". Each fill, stroke or stop-color attribute that is a token (or
   a baked hex, which paint() makes one) moves into the element's own style,
   so the colour is a style property, as it is everywhere else the vibe
   reaches. The computed colour is the attribute's in v1. Anything else
   (none, currentColor, a hex paint() does not know) stays where it was.
   Returns what it was given, so it wraps the call that drew it. */
const SVG_PAINT = ['fill', 'stroke', 'stop-color'];
export function paintSvg(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return root;
  for (const n of [root, ...root.querySelectorAll('*')]) {
    for (const p of SVG_PAINT) {
      const was = n.getAttribute(p);
      const now = was == null ? null : paint(was.trim());
      if (!now || !/^var\(--[\w-]+\)$/.test(now)) continue;
      n.style.setProperty(p, now);
      n.removeAttribute(p);
    }
  }
  return root;
}

/* ---------- icons ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
// Each element's attributes, in the order the sites have always written them.
const ATTRS = { path: ['d'], circle: ['cx', 'cy', 'r'], rect: ['x', 'y', 'width', 'height', 'rx'] };
// What food.js's icon() drew for a name it did not know: the frame, no paths.
const BLANK = { viewBox: '0 0 24 24', stroke: 1.8, fill: 'none', linecap: 'round', linejoin: 'round', els: [] };

/* An icon by name from a set, falling back to v1's drawing of it. */
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
function iconIn(setId, name) {
  const set = own(ICON_SETS, setId) ? ICON_SETS[setId] : V1_ICONS;
  return (own(set.icons, name) && set.icons[name]) || (own(V1_ICONS.icons, name) && V1_ICONS.icons[name]) || BLANK;
}

/* The <svg>'s attributes, in order. Options:
     stroke      the site's stroke width, where the site sets its own (the
                 Log food button's 2.6); otherwise the icon's
     cssStroke   no stroke-width attribute at all — the stylesheet sets it
                 (the dock)
     ariaHidden  aria-hidden="true", where the site has always said so
     innerHTML   icon() only: write the drawing into the <svg> as markup
                 rather than element by element — Coach's two marks have
                 always been built that way. The same DOM in a browser. */
function svgAttrs(ic, o) {
  const a = [['viewBox', ic.viewBox]];
  if (ic.fill != null) a.push(['fill', ic.fill]);
  a.push(['stroke', 'currentColor']);
  const w = o.stroke != null ? o.stroke : ic.stroke;
  if (!o.cssStroke && w != null) a.push(['stroke-width', String(w)]);
  if (ic.linecap) a.push(['stroke-linecap', ic.linecap]);
  if (ic.linejoin) a.push(['stroke-linejoin', ic.linejoin]);
  if (o.ariaHidden) a.push(['aria-hidden', 'true']);
  return a;
}

/* An icon from the active vibe's set, as an element. */
export function icon(name, o = {}) {
  return iconEl(iconIn(def().icons, name), o);
}

function iconEl(ic, o) {
  const s = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of svgAttrs(ic, o)) s.setAttribute(k, v);
  if (o.innerHTML) { s.innerHTML = drawing(ic); return s; }
  for (const e of ic.els) {
    const c = document.createElementNS(SVG_NS, e.tag);
    for (const k of ATTRS[e.tag] || []) if (e[k] != null) c.setAttribute(k, String(e[k]));
    s.appendChild(c);
  }
  return s;
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// An icon's elements as markup: <path d="…"/><circle cx="…" cy="…" r="…"/>…
const drawing = ic => ic.els.map(e => '<' + e.tag + ' ' + (ATTRS[e.tag] || []).filter(k => e[k] != null)
  .map(k => k + '="' + esc(e[k]) + '"').join(' ') + '/>').join('');

/* The same drawing as markup, character for character what the innerHTML
   sites (the gears, the calendar) wrote before. */
export function iconHtml(name, o = {}) {
  const ic = iconIn(def().icons, name);
  return '<svg ' + svgAttrs(ic, o).map(([k, v]) => k + '="' + esc(v) + '"').join(' ') + '>' + drawing(ic) + '</svg>';
}

/* ---------- glyphs, the vessel, tailpieces ----------
   The icon contract's other three fields (vibes/icons/v1.js). v1's set holds
   the survey of each and draws none of them differently: its glyphs are
   text, its vessel is water.js's bottle, and it has no tailpiece. */

const isDrawing = x => !!x && typeof x === 'object' && typeof x.viewBox === 'string' && Array.isArray(x.els);
const setOf = id => (own(ICON_SETS, id) ? ICON_SETS[id] : V1_ICONS);

/* A glyph site: an element whose whole text is one of the characters the
   contract lists (glyphs.<name>.char — ‹ › ✕ × ⋯ − + ✓ ↳ ✎ ⚠ ↑ ↓ →). Where
   the active set draws that glyph (glyphs.<name> an icon), the character is
   replaced by the drawing; where it does not (null, left out, and every
   glyph in v1), the element is handed back untouched, so a site written
   glyphed(el('button', cls, '‹'), 'prev') builds exactly what it did.
   The drawing keeps the character as its accessible name (role img, the
   character its label) — a button named by its glyph is still named — and is
   1em square, the size the character was; the vibe's stylesheet sizes it
   further by .glyph / .glyph-<name>. opts.lead: the character leads the
   element's first text ('⚠ That rate …'), and only it is replaced. Only for
   a site the contract lists: a character in a sentence is copy (`prose`). */
export function glyphed(node, name, opts = {}) {
  const set = setOf(def().icons);
  const ic = own(set.glyphs, name) ? set.glyphs[name] : null;
  if (!node || !isDrawing(ic) || !own(V1_ICONS.glyphs, name)) return node;
  const ch = V1_ICONS.glyphs[name].char;
  const svg = iconEl(ic, {});
  svg.setAttribute('class', 'glyph glyph-' + name);
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', ch);
  if (opts.lead) {
    const t = node.firstChild;
    if (!t || t.nodeType !== 3 || !t.data.startsWith(ch)) return node;
    t.data = t.data.slice(ch.length);
    node.insertBefore(svg, t);
    return node;
  }
  if (node.textContent !== ch) return node;
  node.textContent = '';
  node.appendChild(svg);
  return node;
}

/* The water bottle (icons.vessel): the active set's, else v1's. water.js
   draws it; the level stays linear in the day's fraction from insideBottom up
   to insideTop, so a vibe redraws the bottle, never what fills it. */
export function vessel() {
  const v = setOf(def().icons).vessel;
  return v && typeof v.d === 'string' && typeof v.viewBox === 'string' &&
    Number.isFinite(v.insideBottom) && Number.isFinite(v.insideTop) ? v : V1_ICONS.vessel;
}

/* The tailpiece for a screen (you, workout, food, weight, steps, recap): the
   active set's ornaments.<screen> as an <svg>, hidden from assistive tech,
   drawn at its own size and centred 32 under the screen's last box — or
   null, and the screen adds nothing (v1 has no ornaments). Its ink is the
   text colour it sits in; a vibe's stylesheet may restyle .tailpiece. */
export function tailpiece(screen) {
  const set = setOf(def().icons);
  const o = set.ornaments && own(set.ornaments, screen) ? set.ornaments[screen] : null;
  if (!isDrawing(o)) return null;
  const s = iconEl({ fill: 'none', ...o }, { ariaHidden: true });
  const [, , w, h] = o.viewBox.split(/[\s,]+/).map(Number);
  s.setAttribute('class', 'tailpiece tailpiece-' + screen);
  if (w > 0 && h > 0) { s.setAttribute('width', String(w)); s.setAttribute('height', String(h)); }
  s.style.display = 'block';
  s.style.margin = '32px auto 0';
  return s;
}

/* A screen's foot: its tailpiece appended to it, when the vibe has one. */
export function tail(parent, screen) {
  const t = parent ? tailpiece(screen) : null;
  if (t) parent.appendChild(t);
  return parent;
}

/* ---------- the dock ----------
   The dock is index.html's markup, drawn before any script runs. A vibe whose
   icons are not v1's swaps the five <svg>s here; the originals are kept, node
   for node, so going back to v1 puts index.html's own markup back rather than
   a copy of it. With v1 and nothing ever swapped, this never touches the DOM. */
let dockV1 = null;   // button -> the <svg> index.html gave it

function dock(id) {
  const set = def(id).icons || DEFAULT;
  if (set === DEFAULT && !dockV1) return;
  let bar = null;
  try { bar = document.getElementById('dock'); } catch {}
  if (!bar) return;
  const buttons = [...bar.querySelectorAll('button[data-view]')];
  if (!dockV1) dockV1 = new Map(buttons.map(b => [b, b.querySelector('svg')]));
  for (const b of buttons) {
    const was = b.querySelector('svg'), orig = dockV1.get(b);
    if (!was || !orig) continue;
    // The dock's icons are named for their views (vibes/icons/v1.js).
    const next = set === DEFAULT ? orig : iconEl(iconIn(set, b.dataset.view), { cssStroke: true });
    if (next !== was) b.replaceChild(next, was);
  }
}

/* ---------- chart patterns ----------
   analytics.js is pinned, so a chart look adds no geometry to what it draws:
   it restyles the elements (VOCAB §8.6). A hatched fill — chart · print's
   unfinished day and macro fills, chart · board's knurl days — is a fill:
   url(#…), and the <pattern> it names has to be in the page. So under a
   vibe whose chart look hatches, one hidden <svg id="vibe-patterns"> holds a
   hatch per colour role, id vibe-hatch-<token> (vibe-hatch-p-blue,
   vibe-hatch-knurl, …): lines 1 wide every 2.75 (Iron Age §11, T7 §7.3) at
   45°, stroked in the role's own token, so they follow the vibe. HTML the
   stylesheet can reach (the calorie bands, legend swatches) hatches in CSS
   and needs none of this. Any other vibe, v1 above all, adds nothing and
   touches nothing; switching away takes the defs out. */
const HATCH_LOOKS = ['print', 'board'];
const HATCH = { pitch: 2.75, line: 1, angle: 45 };
let hatchDefs = null;   // the <svg> this file put in the page, while one is there

function patterns(id) {
  if (!HATCH_LOOKS.includes(valueOf(def(id), 'variants.chart'))) {
    if (hatchDefs) { try { hatchDefs.remove(); } catch {} hatchDefs = null; }
    return;
  }
  if (hatchDefs && hatchDefs.isConnected) return;
  let body = null;
  try { body = document.body; } catch {}
  if (!body) return;
  const s = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['id', 'vibe-patterns'], ['aria-hidden', 'true'], ['width', '0'], ['height', '0'], ['focusable', 'false']]) s.setAttribute(k, v);
  s.style.position = 'absolute';
  s.style.pointerEvents = 'none';
  const defs = document.createElementNS(SVG_NS, 'defs');
  for (const token of new Set(Object.values(TOKEN))) {
    const p = document.createElementNS(SVG_NS, 'pattern');
    for (const [k, v] of [['id', 'vibe-hatch-' + token.slice(2)], ['patternUnits', 'userSpaceOnUse'], ['width', String(HATCH.pitch)],
      ['height', String(HATCH.pitch)], ['patternTransform', 'rotate(' + HATCH.angle + ')']]) p.setAttribute(k, v);
    const l = document.createElementNS(SVG_NS, 'path');
    l.setAttribute('d', 'M' + HATCH.line / 2 + ' 0V' + HATCH.pitch);
    l.setAttribute('stroke-width', String(HATCH.line));
    l.style.setProperty('stroke', 'var(' + token + ')');
    p.appendChild(l);
    defs.appendChild(p);
  }
  s.appendChild(defs);
  body.appendChild(s);
  hatchDefs = s;
}

/* ---------- theme-color ---------- */
function themeColor(id) {
  try {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', def(id).themeColor || V1.themeColor);
  } catch {}
}

/* ---------- offline ----------
   The service worker keeps every same-origin file it fetches (sw.js:
   network-first, each 200 into the build's cache), nothing it did not fetch,
   and a version bump empties it. A vibe's stylesheet and definition are
   fetched on every launch — index.html links every vibes/<id>.css, and this
   file imports every definition — but its photos and fonts only when a rule
   of that vibe first asks for them. Left at that, a vibe chosen online and
   opened offline on a screen not visited since would have no photo, and the
   Vibes sheet offline would draw its cards with no thumbnail and a stand-in
   face. So, after boot and never in its way, this asks for:
     - the active vibe's files: every image slot in its definition and every
       @font-face its stylesheet declares — when it becomes the vibe, and on
       each launch that opens in it;
     - every vibe's picker files, the two things a Vibes card draws that a
       launch in another vibe never fetches: its thumbnail (the definition's
       `images.thumb`) and the face its number is set in (the first family of
       its `face.web.num`, which a definition without one takes from its
       `face.web.font` — index.js valueOf()).
   A file is asked for only when Cache Storage does not already hold it, so
   the first online launch after a bump fetches them and the launches after it
   fetch nothing; only while online; and only when a service worker controls
   the page, because otherwise nothing would keep it. The budgets (§14: a
   vibe's web fonts at most 120 KB a family) are held on the files themselves,
   by tools-check/vibes-scope.mjs.
   v1 has no files. With v1 the only vibe, none of this touches the page, the
   network, Cache Storage or a timer. */
const THUMB = 'thumb';      // the image slot a Vibes card shows
const PREFETCH_MS = 1500;   // after the launch's own reads and first paint

const unquote = s => String(s == null ? '' : s).trim().replace(/^(['"])([\s\S]*)\1$/, '$2');

/* A vibe's image, by slot, as an absolute URL: vibes/<id>/<file>. A slot is
   a file name, or { file } where a later phase gives a slot more than that.
   Null for v1 (no images), an unknown vibe, or a slot it does not have.
   On a screen, a hero photo is its vibe's stylesheet's to draw (nothing here
   branches on a look, VOCAB §1): the box its slot names, and in band mode
   (images.<slot>.band) the strip --photo-band-<slot> tall across the box's
   top with the box's own padding grown by as much, so no word sits on the
   photo — the token is generated from the definition (vibes-css.mjs). The
   boxes, as v1's DOM has them: youHero .you-hero, summaryHero .summary-hero,
   fuelSummary .card.fuel-sum, coachCard .coach-card (fixed 190 / 164: a band
   would push its words out), and — with no class of their own, which v1's
   DOM keeps — stepsToday #view-steps .cal-hd + .card and weightLog
   #view-weight .cal-hd + .card; startWorkout is a button, not a box. Since
   engine v3 the three lead cards also say which they are, as
   .card[data-lead="fuelSummary" | "stepsToday" | "weightLog"]. */
export function imageUrl(id, slot) {
  if (!own(DEFS, id) || !own(DEFS[id].images, slot)) return null;
  const v = DEFS[id].images[slot];
  const f = typeof v === 'string' ? v : (v && typeof v.file === 'string' ? v.file : '');
  if (!f) return null;
  try { return new URL('vibes/' + id + '/' + f, document.baseURI).href; } catch { return null; }
}

/* The font files vibes/<id>.css declares, as absolute URLs — the first url()
   of each @font-face src, the one a browser that reads woff2 fetches. With a
   family, only that face's (family names match regardless of case, as in
   CSS). Read from the stylesheet itself (index.html links it), so the list
   can never drift from the CSS. */
function fontFiles(id, family) {
  const out = [];
  try {
    const sheet = [...document.styleSheets].find(s => s.href && new URL(s.href).pathname.endsWith('/vibes/' + id + '.css'));
    if (!sheet) return out;
    for (const r of sheet.cssRules) {
      if (!r || r.type !== 5) continue;   // CSSRule.FONT_FACE_RULE
      if (family !== undefined && unquote(r.style.getPropertyValue('font-family')).toLowerCase() !== family.toLowerCase()) continue;
      const m = /url\(\s*(['"]?)(.+?)\1\s*\)/.exec(r.style.getPropertyValue('src'));
      if (m) out.push(new URL(m[2], sheet.href).href);
    }
  } catch {}
  return out;
}

/* A vibe's files: all of them, or (picker) the thumbnail and the number's
   face. v1 and an unknown id have none. */
function filesOf(id, picker) {
  if (id === DEFAULT || !own(DEFS, id)) return [];
  if (!picker) {
    const imgs = DEFS[id].images;
    return [...Object.keys(imgs && typeof imgs === 'object' ? imgs : {}).map(k => imageUrl(id, k)), ...fontFiles(id)];
  }
  // The Vibes card's figure is set in the numeral face (vibes-sheet.js): a
  // vibe whose numbers are not its text face (Iron Age's Besley) names it.
  const font = valueOf(DEFS[id], 'face.web.num');
  const face = typeof font === 'string' ? unquote(font.split(',')[0]) : '';
  return [imageUrl(id, THUMB), ...(face ? fontFiles(id, face) : [])];
}

const asked = new Set();          // this launch: each file once
let queue = Promise.resolve();

/* Fetch each file the cache lacks, one at a time, after a pause. A file that
   could not be fetched (offline, no worker yet, the network dropped) is
   forgotten, so a later call tries it again. */
function keep(urls) {
  const todo = [...new Set(urls)].filter(u => typeof u === 'string' && /^https?:/.test(u) && !asked.has(u));
  if (!todo.length) return queue;
  todo.forEach(u => asked.add(u));
  queue = queue.then(() => new Promise(r => setTimeout(r, PREFETCH_MS))).then(async () => {
    let store = null;
    try {
      if (navigator.onLine !== false && navigator.serviceWorker && navigator.serviceWorker.controller) store = globalThis.caches || null;
    } catch {}
    if (!store) { todo.forEach(u => asked.delete(u)); return; }
    for (const u of todo) {
      try { if (!(await store.match(u))) await fetch(u); }
      catch { asked.delete(u); }
    }
  });
  return queue;
}

/* After boot: the active vibe's files, and every vibe's picker files, into
   the service worker's cache where they are not there yet. app.js does not
   wait for it; the promise is for a verifier. */
export function prefetchVibes() {
  const urls = filesOf(current());
  for (const id of Object.keys(DEFS)) urls.push(...filesOf(id, true));
  return keep(urls);
}

/* ---------- the switch ---------- */

let renderer = null;
const listeners = new Set();

/* What repaints the screen after a switch. app.js hands in its re-render of
   the current view. Never location.reload(): a live workout's beforeunload
   would stop to ask whether to leave. Open sheets need nothing — they spend
   the CSS variables, which change under them. */
export function setRenderer(fn) { renderer = typeof fn === 'function' ? fn : null; }

/* Told after every change of vibe, with (id, was). Returns the unsubscribe. */
export function onVibeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Switch to a vibe. Anything that is not a registered vibe means v1. The
   attribute, the device key and the meta are set every time (so it also
   repairs a device whose key and attribute disagree); the screen repaints and
   the listeners hear only when the vibe actually changed. opts.render false
   skips the repaint (boot, where nothing has been drawn yet). */
export function applyVibe(id, opts = {}) {
  const v = normVibe(id);
  const was = current();
  const root = document.documentElement;
  if (v === DEFAULT) delete root.dataset.vibe;
  else root.dataset.vibe = v;
  try {
    if (v === DEFAULT) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch {}
  themeColor(v);
  dock(v);
  patterns(v);
  if (v !== was) {
    if (opts.render !== false && renderer) { try { renderer(v); } catch {} }
    for (const fn of listeners) { try { fn(v, was); } catch {} }
    // Its photos and faces, for the next time this device is offline.
    keep(filesOf(v));
  }
  return v;
}

/* At boot. index.html's head script has already put this device's vibe on
   <html> before the first frame, so every colour was right from the start;
   what it could not do was draw, because it runs before the body exists. So
   the icons, and a check that the id is one this build knows, happen here.
   For v1 this does nothing at all — with no attribute, and with one that
   already says v1, which the head script never writes but a test page may:
   no rule anywhere matches [data-vibe="v1"], so the page paints v1 either way
   and there is nothing to correct. */
export function bootVibe() {
  const a = attr();
  if (a === undefined || a === DEFAULT) return DEFAULT;
  return applyVibe(a, { render: false });
}
