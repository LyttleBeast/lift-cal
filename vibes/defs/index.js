// The vibe registry, and the one map from a vibe's roles to where they land.
//
// Imports nothing — not even ./v1.js. A consumer imports this file for the
// registry and the map, and each vibe's definition directly
// (vibes/defs/<id>.js) for its values. That keeps every file here copyable
// byte for byte into rack-mobile's src/pure/vibes/, pinned by sha256, and it
// keeps the registry loadable before any vibe is.
//
// Everything exported is frozen, and at() reads own properties only: this
// module is shared by every caller in the app, and one caller pushing an id
// onto IDS, or a path like 'constructor' resolving to Object, would change
// what every other caller is told.
//
// What reads it:
//   - web: vibe.js (normVibe on the stored choice, hexToRgb for channel
//     tokens) and tools-check/vibes-css.mjs, which generates each non-v1
//     vibe's :root[data-vibe] block from ROLES' `web` names.
//   - native: src/state/vibe.js and theme.js build(), from ROLES' `native`
//     paths.
//   - the contract verifiers, which walk ROLES against v1 and against both
//     trees at their base commits.
//
// WHERE THE TREES DISAGREE TODAY. v1 keeps both sides of each; picking one
// would change the other client's v1, and "v1 is today" is the promise.
//   - colors.onDanger: web '#fff' (rack.css .swipe-del), native '#ffffff'
//     (T.colors.white). One colour, two spellings, each reaching its own
//     verbatim sink.
//   - admin.pill: a pro or custom account is BLUE on the web (.adm-flag.lit)
//     and YELLOW on native (admin/sheets.jsx PILL).
//   - The trial banner: web is a warn wash with warn ink (.trial-bar); native
//     is a solid pYellow bar with onYellow ink (app/_layout.jsx TrialBanner).
//     Its job is warn on both, so ROLES sends native's fill to warn and its
//     ink to onWarn (colors.pYellow / colors.onYellow `except`).
//   - A library row's ✎ / ✕ pressed: web accent .12 / danger .12
//     (.ex-edit:active, .ex-del:active); native pickSel, accent .08, for both
//     (food/common.jsx:546, :563).
//   - Shadows: native's shadowRadius is not one function of the web blur
//     (the toast 14 for 28px, the tour card 25 for 50px, the rest equal);
//     native draws only the FAB's first layer and no pressed-FAB shadow.
//   - Glass: web blurs the dock, the sheet backdrop (unprefixed only, so not
//     on Safari before 18 — scrim.sheet.webkit) and the workout bar;
//     native blurs only the dock (BlurView intensity 40). The tour scrim is two
//     stops on the web and three on native, the last holding .94 to the bottom.
//   - The KPI corner tint: a radial gradient on the web, steel by default; a
//     flat corner block at opacity .5 on native, with no default.
//   - The hero and lit add tiles: accent gradients over the well on the web,
//     flat tileHero / tileLit on native.
//   - Icons: native draws the Fuel gear as the ⚙ glyph, and no icon on the
//     Foods and Meals buttons (it does draw the book, like the web, on the
//     ingredient sheet's hero add tile). The water preset's remove button is
//     '×' on the web (glyphs.dismiss) and '✕' on native (glyphs.close).
//     vibes/icons/v1.js sites and glyphs.
//   - Sign-in: the web's is on the theme (#auth); native's has its own palette
//     (signIn) and system-font text.
//   - importGroups (the importer's bar) exists on the web only.

const deepFreeze = o => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

/* ---------- the registry ----------
   Ordered: the picker lists vibes in this order, v1 first. Only v1 exists
   until Phase V adds the rest. `scheme` is the ground a vibe paints on
   ('dark' | 'light') — V59 §10 allows light vibes. */
export const VIBES = deepFreeze([
  { id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' }
]);

export const IDS = Object.freeze(VIBES.map(v => v.id));

/* Folder names under vibes/ that sit beside the vibe folders (vibes/<id>/),
   so no vibe may be called one of them. */
export const RESERVED = Object.freeze(['defs', 'icons']);

export const DEFAULT = 'v1';
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
export const ID_MAX = 32;

/* A well-formed vibe id: lowercase letters, digits and hyphens, not starting
   with a hyphen, at most 32 long, and not a reserved folder name. Says
   nothing about whether the vibe exists — normVibe does that. */
export function validId(x) {
  return typeof x === 'string' && x.length <= ID_MAX && ID_RE.test(x) && !RESERVED.includes(x);
}

/* What a stored or synced choice means. Absent, unknown, the wrong type, the
   wrong case, padded, reserved or plain garbage all mean v1 — the one vibe
   that always exists — and it never throws: it reads whatever a device or the
   database hands it, inside renders that must not fall over. */
export function normVibe(x) {
  return validId(x) && IDS.includes(x) ? x : DEFAULT;
}

/* The registry's metadata, in order. Copies, so a caller that sorts or edits
   what it gets back cannot change what the next caller sees. */
export function list() {
  return VIBES.map(v => ({ ...v }));
}

/* '#rrggbb' (either case) -> [r, g, b]. Anything else — a 3-digit legacy
   spelling like '#fff', an rgba() string, a role name, undefined — returns
   null rather than throwing, because a render path calls this. Vibe colours
   are 6-digit precisely so this, and native's rgba(), can read them. */
export function hexToRgb(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* The value at a dot path ('tint.setDone.a', 'plates.2'), or undefined. Own
   properties only: 'constructor' or 'toString' is not a role. */
export function at(obj, path) {
  let o = obj;
  for (const k of String(path).split('.')) {
    if (o == null || typeof o !== 'object' || !Object.prototype.hasOwnProperty.call(o, k)) return undefined;
    o = o[k];
  }
  return o;
}

/* A role's value for one client. Where the trees disagree today a role holds
   { web, native } (colors.onDanger); everything else is the same for both. */
export function sideOf(value, side) {
  const split = value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length > 0 && Object.keys(value).every(k => k === 'web' || k === 'native');
  return split ? value[side] : value;
}

/* ---------- ROLES ----------
   Every role in a vibe definition: its key path, its kind, the web custom
   property it becomes (`web`), and the native T path it becomes (`native`).
   null means the role does not land on that client.

   kinds: color | alpha | tint | radius | shadow | scrim | font | type | face |
   chrome | table | image | variant | shape — plus meta (registry facts), and
   layout / motion for the web :root tokens §5.1 keeps literal.

   `fixed: true` marks a value no vibe can change at runtime — the :root
   layout and motion tokens, what app.json, manifest.json and the status-bar
   meta hold, which scrims rack.css gives a -webkit- twin. It is carried so
   the whole picture is representable, and every vibe holds v1's value.

   `web` is a custom property name ('--accent'), or for the roles that land
   elsewhere: 'meta:<name>' (a <meta> content), '@import' (rack.css line 1),
   'color-scheme' (the CSS property itself), and for the tables:
     'paint()' the pinned modules' v1 hex reaches the call site, and vibe.js
               paint() swaps it for var(<web of the role it `follows`>);
     'var()'   each entry names a colour role, and the site spends
               var(<that role's web>);
     'rgb()'   each entry names a colour role, and the site spends its
               channel token var(<web>-rgb) (the .kpi --kpi-rgb pattern).
   Only a name starting '--' is a custom property.

   `native` is where the role lands AFTER build() applies its kind: a color,
   chrome, radius or table is set as it is; a tint becomes rgba(color, a);
   an alpha a helper; a type T.type(args); face and minLh are inputs to the
   face() and type() functions, told apart by `input`. No two roles share a
   native path and input.

   `channel: true` marks a --*-rgb token: its value is a colour ROLE NAME and
   the CSS text is hexToRgb(colors[name]).join(',').
   `from` names the token a split role copies in v1 (its value must equal it).
   `alias` marks a legacy native key whose job is now the named role: native
   build() fills T.colors.<key> from that role, so a vibe sets one value per
   job. v1 holds both, equal.
   `except` lists sites that look like this role's job and are not, each
   naming the role whose job it is. native 'file:line': the line spends this
   role's key today, and the engine points it at the named role. web
   [file, selector, property]: the declaration spends the named role today,
   and the engine leaves it there.
   `follows` (the three hex tables): the colour role each entry is, in every
   vibe — its hex equals that role's, case aside.
   `ref: 'tint'` marks a value that names a T.tint entry; it lands through
   that tint's own role.
   `at` anchors a value that is not a :root token or a theme.js key to where
   it lives at the base commits: web [file, selector, property] (a
   stylesheet declaration, or for index.html a meta's attribute) or
   'file:line' (manifest.json), native 'file:line' — or a list of them where
   one role has several sites. Both verifiers read every anchor.

   ENGINE v2 (the asks the first four vibe specs share) added roles no vibe
   written before them holds. Each carries what a definition that leaves it
   out takes, so an older definition still means one thing, and valueOf()
   (below) is the one reading of it that the engines and the generator share:
   `dflt`  the value itself (null: nothing is drawn — the web emits no token
           and the site keeps v1's drawing);
   `or`    another path in the same definition, taken when this one is
           missing (type.meta takes the vibe's own type.note).
   `ref: 'color'` marks a value that NAMES a colour role (tagInk, inkOf, the
   shape params' inks and fills): the web token is that role's colour in the
   same definition, and native build() resolves it the same way.
   A list param (shape.rule.head / sub / total: line, gap, line) lands as one
   role per entry, '.0' '.1' '.2', each 0 when the list is shorter.

   A path covers everything under it: 'groups' covers groups.chest. The
   `shape` object and the photo slots are carried whole by one role each and
   have roles under them for the parts the web spends as tokens. */
const R = (path, kind, web, native, extra) =>
  Object.assign({ path, kind, web: web || null, native: native || null }, extra || null);

const COLOR = [
  // native T.colors, key for key, and the web :root colour tokens
  ['rack', '--rack'], ['bar', '--bar'], ['collar', '--collar'], ['knurl', '--knurl'],
  ['chalk', '--chalk'], ['steel', '--steel'], ['dim', '--dim'],
  ['pRed', '--p-red'], ['pBlue', '--p-blue'],
  // The trial banner's solid fill (native only; the web's .trial-bar is a
  // warn wash) is pYellow doing warn's job.
  ['pYellow', '--p-yellow', { except: [{ at: 'app/_layout.jsx:138', role: 'colors.warn' }] }],
  ['pGreen', '--p-green'],
  ['pWhite', '--p-white'], ['pChrome', '--p-chrome'],
  ['good', '--good'], ['warn', '--warn'], ['bad', '--bad'],
  ['onYellow', null, { alias: 'colors.onAccent', except: [{ at: 'app/_layout.jsx:140', role: 'colors.onWarn' }] }],
  ['onGreen', null, { alias: 'colors.onDone' }],
  ['onPlate', '--ink-plate'],
  ['white', null, { alias: 'colors.onDanger' }],
  ['pYellowPressed', null, { alias: 'colors.accentPressed' }],
  ['fallback', null, { alias: 'groups.fallback' }],
  // split out of double duty
  ['accent', '--accent', { from: { web: '--p-yellow', native: 'colors.pYellow' } }],
  // .wpe-row input:focus is an input:focus border in the water subject's
  // blue, not the focus colour: it stays --p-blue.
  ['focus', '--focus', { from: { web: '--p-yellow', native: 'colors.pYellow' },
    except: [{ at: ['rack.css', '.wpe-row input:focus', 'border-color'], role: 'colors.pBlue' }] }],
  ['accentPressed', '--accent-press', { from: { native: 'colors.pYellowPressed' } }],
  ['onAccent', '--ink', { from: { native: 'colors.onYellow' } }],
  ['danger', '--danger', { from: { web: '--p-red', native: 'colors.pRed' } }],
  ['onDanger', '--on-danger', { from: { native: 'colors.white' } }],
  ['done', '--done', { from: { web: '--p-green', native: 'colors.pGreen' } }],
  ['onDone', '--ink-go', { from: { native: 'colors.onGreen' } }],
  ['well', '--well', { from: { web: '--rack', native: 'colors.rack' } }],
  ['knockout', '--knockout', { from: { web: '--rack', native: 'colors.rack' } }],
  ['inverse', '--inverse', { from: { web: '--chalk', native: 'colors.chalk' } }],
  // the calorie bar's head, zone ticks and dashed target, and their guide swatches
  ['calMark', '--cal-mark', { from: { web: '--chalk', native: 'colors.chalk' },
    at: { web: [['rack.css', '.cal-tick', 'background'], ['rack.css', '.cal-head', 'background'],
                ['rack.css', '.cal-target', 'border-left'], ['rack.css', '.guide-sw.head::after', 'background'],
                ['rack.css', '.guide-sw.tick::after', 'background'], ['rack.css', '.guide-sw.target::after', 'border-left']],
          native: ['app/(app)/(tabs)/food.jsx:246', 'app/(app)/(tabs)/food.jsx:261', 'app/(app)/(tabs)/food.jsx:269',
                   'src/ui/food/barGuide.jsx:185', 'src/ui/food/barGuide.jsx:195'] } }],
  ['raised', '--raised', { from: { web: '--collar', native: 'colors.collar' } }],
  ['track', '--track', { from: { web: '--collar', native: 'colors.collar' } }],
  ['grip', '--grip', { from: { web: '--knurl', native: 'colors.knurl' } }],
  ['faint', '--faint', { from: { web: '--knurl', native: 'colors.knurl' } }],
  ['onWarn', null, { from: { native: 'colors.onYellow' }, at: { native: 'app/_layout.jsx:140' } }],
  ['shade', null],      // web: through --shade-rgb only
  ['lift', null],       // web: through --lift-rgb only
  ['tileHero', null],   // native only: the flat form of .add-tile.hero's wash
  ['tileLit', null]
].map(([k, web, x]) => R('colors.' + k, 'color', web, 'colors.' + k, x));

const TINTS = ['setDone', 'setFlash', 'tagW', 'tagF', 'tagD', 'dropRail', 'dropAdd', 'pickSel', 'block',
  'coachBase', 'coachLow', 'coachHigh', 'rowPress', 'pillBase', 'pillUp', 'pillDown', 'pillWarn',
  'zoneCut', 'zoneHold', 'zoneGain', 'dockGlass', 'wkBarGlass', 'backdrop',
  'trajGood', 'trajWarn', 'trajBad', 'reviewBg', 'reviewBorder'];

const TYPES = ['body', 'h1', 'h2', 'h3', 'eyebrow', 'btn', 'btnLg', 'dockLbl', 'fieldLbl', 'note',
  'statVal', 'statLbl', 'timer', 'kpiVal', 'headline', 'youGreet', 'chip', 'segBtn', 'setInput', 'mono'];

// The first seventeen are V59 §6.9's; the last twelve are the blocks Phase D's
// vocabulary added (vocab.js). The list only ever grows.
const VARIANTS = ['card', 'youCard', 'sectionHeader', 'eyebrow', 'statRow', 'btn', 'chip', 'segmented',
  'settingsRow', 'sheetHost', 'sheetTitle', 'dock', 'screenHeader', 'kpi', 'youHero', 'coachCard', 'chart',
  'headline', 'field', 'note', 'toast', 'listRow', 'setTable', 'setRow', 'plateStrip', 'calCell', 'fab',
  'addTile', 'sessionChrome'];

const RADIUS = [['r', '--r', 1], ['sm', '--r-sm', 1], ['sheet', '--r-sheet', 1], ['tile', '--r-tile', 1],
  ['pill', '--r-pill', 1], ['plate', '--r-plate', 1], ['chip', '--r-chip', 1], ['mark', '--r-mark', 1],
  ['idx', '--r-idx', 1], ['round', '--r-round', 0], ['hair', '--r-hair', 0], ['bubble', '--r-bubble', 0],
  ['badge', '--r-badge', 0]];

const SHADOW = [
  ['peek', ['rack.css', '.peek-bar', 'box-shadow'], 'src/ui/train/PeekBar.jsx:68'],
  ['rest', ['rack.css', '.rest-pill', 'box-shadow'], 'src/ui/train/RestOverlay.jsx:129'],
  ['toast', ['rack.css', '.toast', 'box-shadow'], 'src/ui/ToastHost.jsx:50'],
  ['fab', ['rack.css', '.fuel-fab', 'box-shadow'], 'app/(app)/(tabs)/food.jsx:729'],
  ['fabPressed', ['rack.css', '.fuel-fab:active', 'box-shadow']],
  ['tourCard', ['auth.css', '.ob-tour-card', 'box-shadow'], 'src/ui/onboarding/TourOverlay.jsx:78'],
  ['calTick', ['rack.css', '.cal-tick', 'box-shadow']],
  ['flame', ['rack.css', '.st-flame.on', 'box-shadow']],
  ['kpiDay', ['rack.css', '.kpi-days i', 'box-shadow']],
  ['kpiDayOn', ['rack.css', '.kpi-days i.on', 'box-shadow']],
  ['kpiToday', ['rack.css', '.kpi-days i.today', 'box-shadow']],
  ['kpiTodayOn', ['rack.css', '.kpi-days i.today.on', 'box-shadow']],
  ['guideEaten', ['rack.css', '.guide-sw.eaten', 'box-shadow']],
  ['trajGood', ['rack.css', '.traj-dot.good', 'box-shadow']],
  ['trajWarn', ['rack.css', '.traj-dot.warn', 'box-shadow']],
  ['trajBad', ['rack.css', '.traj-dot.bad', 'box-shadow']],
  ['tourLit', ['auth.css', '#dock button.tour-lit::after', 'box-shadow']]
].map(([k, w, n]) => R('shadow.' + k, 'shadow', '--shadow-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()),
  n ? 'shadow.' + k : null, { at: n ? { web: w, native: n } : { web: w } }));

const CHANNEL = [['rack', '--rack-rgb'], ['shade', '--shade-rgb'], ['lift', '--lift-rgb'],
  ['accent', '--accent-rgb'], ['pYellow', '--p-yellow-rgb'], ['warn', '--warn-rgb'],
  ['pRed', '--p-red-rgb'], ['bad', '--bad-rgb'], ['danger', '--danger-rgb'], ['pBlue', '--p-blue-rgb'],
  ['pGreen', '--p-green-rgb'], ['done', '--done-rgb'], ['good', '--good-rgb'], ['pWhite', '--p-white-rgb'],
  ['steel', '--steel-rgb']
].map(([k, web]) => R('web.rgb.' + k, 'color', web, null, { channel: true }));

const ROOT = [['dockH', '--dock-h', 'layout'], ['safeTop', '--safe-top', 'layout'], ['topGap', '--top-gap', 'layout'],
  ['appTop', '--app-top', 'layout'], ['pad', '--pad', 'layout'],
  ['ease', '--ease', 'motion'], ['fast', '--fast', 'motion'], ['med', '--med', 'motion']
].map(([k, web, kind]) => R('web.root.' + k, kind, web, null, { fixed: true }));

// The six muscle groups, in GROUPS order, and the colour role each one is.
const GROUP_ROLES = { chest: 'pRed', back: 'pBlue', legs: 'pYellow', shoulders: 'pGreen', arms: 'pWhite', core: 'pChrome' };

/* ---------- engine v2 ----------
   The look params (vocab.js `params`) the web spends as tokens: one custom
   property each, --shape-<path>, generated from the definition's `shape` (a
   key it leaves out takes vocab.js's default, which `dflt` repeats here —
   this file imports nothing — and the verifiers hold the two equal). A colour
   param names a colour role; a number is px; a list is its entries, 0 past
   its end; lead.keyline is 1 or 0. rule.place picks which rule a look draws,
   not a value a rule can spend, so it has no token: it reaches native through
   T.shape with the rest. v1 names no look, so nothing spends any of these in
   v1, and rack.css's :root holds the defaults. */
const SHAPE_PARAMS = [
  ['rule.ink', 'knurl'], ['rule.hair', 1], ['rule.head', [2]], ['rule.sub', [2]], ['rule.total', [2]],
  ['leader.ink', 'steel'], ['leader.dot', 1.5], ['leader.pitch', 4], ['leader.min', 16],
  ['band.fill', 'raised'], ['band.ink', 'chalk'], ['band.height', 30],
  ['gutter', 2],
  ['keyline.ink', 'chalk'], ['keyline.width', 1],
  ['lead.keyline', false]
];
const SHAPE_WEB = p => '--shape-' + p.split('.').map(s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase())).join('-');
const SHAPE = SHAPE_PARAMS.flatMap(([p, d]) => Array.isArray(d)
  ? [0, 1, 2].map(i => R(`shape.${p}.${i}`, 'shape', SHAPE_WEB(`${p}.${i}`), null, { dflt: i < d.length ? d[i] : 0 }))
  : [R('shape.' + p, 'shape', SHAPE_WEB(p), null, typeof d === 'string' ? { dflt: d, ref: 'color' } : { dflt: d })]);

/* The seven hero boxes (native theme.js HERO_SLOTS, V59 §11), whose photo a
   vibe may draw in BAND MODE: images.<slot>.band is a strip that many points
   tall across the top of the box, the box's own padding grown by as much, so
   no word, control or colour sits on the photo (Iron Age §10). null — every
   slot in v1, which has no photo — is no band: the slot's photo, if any, sits
   behind its scrim as before. */
const HERO = ['youHero', 'coachCard', 'startWorkout', 'summaryHero', 'fuelSummary', 'stepsToday', 'weightLog'];

/* Small text in a data colour. A site that sets SMALL text (under 18pt;
   under 14pt when bold) in a group or subject colour inks it through this
   map (inkOf); graphics and large text keep the role itself. Every plate
   inks itself in v1, as every such site does today. A key a vibe leaves out
   inks itself. */
const PLATE_ROLES = ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'];

export const ROLES = deepFreeze([
  // registry facts and the vibe's own switches
  R('id', 'meta'), R('name', 'meta'), R('feel', 'meta'), R('experimental', 'meta'), R('scheme', 'meta'),
  R('icons', 'meta', null, null, { note: 'the icon set id: vibes/icons/<set>.js' }),
  R('images', 'image', null, null, { note: 'slot -> file under vibes/<id>/, or { file, focal, scrim, band }; v1 has none' }),
  ...HERO.map(s => R(`images.${s}.band`, 'image', '--photo-band-' + s.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), null,
    { dflt: null, note: 'band mode, pt/px; native reaches it through T.image(slot).band' })),
  R('themeColor', 'color', 'meta:theme-color', null, { at: { web: ['index.html', 'meta[name=theme-color]', 'content'] } }),
  ...VARIANTS.map(k => R('variants.' + k, 'variant', null, 'variant.' + k)),
  // The params a look reads (vocab.js `params`: its keys, their defaults).
  // Native build() hands the whole object on as T.shape, each key the
  // definition leaves out at its default; the web spends the params as the
  // --shape-* tokens below. v1 names no look and holds none.
  R('shape', 'shape', null, 'shape', { note: 'vocab.js params; a key left out takes its default there; v1 is {}' }),
  ...SHAPE,

  ...COLOR,
  // The strip under the installed web app's status bar, whose text is always
  // white (index.html's black-translucent meta, fixed at launch): a light
  // vibe keeps it dark. null is no strip — v1, and any dark vibe. Native
  // ignores it: its <StatusBar style> is chrome.statusBar.
  R('colors.band', 'color', '--band', null, { dflt: null }),
  // AiWarn's border and wash (native only; the web's .ai-warn is warn at the
  // same alphas) are alpha.yellow doing warn's job.
  ...['yellow', 'red', 'blue', 'green', 'ground', 'accent', 'danger', 'warn'].map(k => R('alpha.' + k, 'alpha', null, 'alpha.' + k,
    k === 'yellow' ? { except: [{ at: 'src/ui/food/common.jsx:946', role: 'alpha.warn' },
                                { at: 'src/ui/food/common.jsx:947', role: 'alpha.warn' }] } : null)),
  ...TINTS.map(k => R('tint.' + k, 'tint', null, 'tint.' + k)),
  // The calorie bar's runway (.cal-runway, web only): its hatching and its
  // right edge. Tints that land on a web token, rgba() of the role at the
  // alpha, because a vibe changes both the colour and the alpha.
  R('tint.runway', 'tint', '--tint-runway', null, { dflt: { color: 'rack', a: 0.55 } }),
  R('tint.runwayEdge', 'tint', '--tint-runway-edge', null, { dflt: { color: 'rack', a: 0.7 } }),

  ...TYPES.map(k => R('type.' + k, 'type', null, 'text.' + k)),
  // The running meta (a card's "last 7 days", a date, "Member since …") as
  // one preset a look can set it in. No v1 site spends it: v1 sets each at
  // its own literal. A definition without one takes its own note.
  R('type.meta', 'type', null, 'text.meta', { or: 'type.note' }),
  R('loadNum', 'type', null, 'loadNum'),
  R('face.family', 'face', null, 'face', { input: 'family' }),
  R('face.keys', 'face', null, 'face', { input: 'keys', note: 'the useFonts keys in app/_layout.jsx; face() returns one of them' }),
  R('face.snap', 'face', null, 'face', { input: 'snap' }),
  R('face.step', 'face', null, 'face', { input: 'step' }),
  R('face.width', 'face', null, 'face', { input: 'width' }),
  R('face.minLh', 'face', null, 'type', { input: 'minLh', note: "MIN_LH, type()'s line-height floor" }),
  // A width range drawn in a family of its own: [{ min?, max?, family, keys,
  // snap, weights, minLh }], the first band holding a preset's wdth wins.
  // v1 has none. Native only: the web names a family by selector.
  R('face.bands', 'face', null, 'face', { input: 'bands', dflt: [] }),
  R('face.mono', 'font', null, 'text.mono.fontFamily', { note: 'Platform.select({ ios, android })' }),
  R('face.web.font', 'font', '--font', null, { at: { web: ['rack.css', 'html, body', 'font-family'] } }),
  R('face.web.mono', 'font', '--font-mono', null, { at: { web: ['rack.css', '.paste-box', 'font-family'] } }),
  // The web stacks a vibe's stylesheet sets its heads, its italic and its
  // numerals in (the parity check reads them here, not in the stylesheet);
  // num is also the face vibe.js prefetches for the Vibes card's figure. v1
  // sets all three in --font; a definition without one takes its own font.
  R('face.web.display', 'font', '--font-display', null, { or: 'face.web.font' }),
  R('face.web.italic', 'font', '--font-italic', null, { or: 'face.web.font' }),
  R('face.web.num', 'font', '--font-num', null, { or: 'face.web.font' }),
  R('face.web.importUrl', 'font', '@import', null, { note: 'rack.css line 1; stays there, byte-identical' }),

  ...RADIUS.map(([k, web, nat]) => R('radius.' + k, 'radius', web, nat ? 'radius.' + k : null)),

  ...SHADOW,
  // Rings round the calorie bar's head and dashed target (and their guide
  // swatches), for a page they would vanish on. rack-v58 draws none, so v1's
  // is []. Native CalMeter draws the first layer as a border of its spread in
  // its colour: T.ring.<k> is { borderWidth, borderColor }, or null.
  R('shadow.calHead', 'shadow', '--shadow-cal-head', 'ring.calHead', { dflt: { web: [] } }),
  R('shadow.calTarget', 'shadow', '--shadow-cal-target', 'ring.calTarget', { dflt: { web: [] } }),
  R('scrim.sheet.tint', 'scrim', null, null, { ref: 'tint', at: { web: ['rack.css', '.sheet-backdrop', 'background'] } }),
  R('scrim.sheet.filter', 'scrim', '--blur-sheet', null, { at: { web: ['rack.css', '.sheet-backdrop', 'backdrop-filter'] } }),
  R('scrim.sheet.webkit', 'scrim', null, null, { fixed: true, note: 'no -webkit-backdrop-filter twin in rack.css' }),
  R('scrim.dock.tint', 'scrim', null, null, { ref: 'tint', at: { web: ['rack.css', '.dock', 'background'] } }),
  R('scrim.dock.filter', 'scrim', '--blur-dock', null, { at: { web: ['rack.css', '.dock', 'backdrop-filter'] } }),
  R('scrim.dock.webkit', 'scrim', null, null, { fixed: true, note: 'rack.css writes the -webkit-backdrop-filter twin' }),
  R('scrim.dock.native.intensity', 'scrim', null, 'chrome.blurIntensity', { at: { native: 'src/ui/Dock.jsx:45' } }),
  R('scrim.wkBar.tint', 'scrim', null, null, { ref: 'tint', at: { web: ['rack.css', '.wk-bar', 'background'] } }),
  R('scrim.wkBar.filter', 'scrim', '--blur-wk-bar', null, { at: { web: ['rack.css', '.wk-bar', 'backdrop-filter'] } }),
  R('scrim.wkBar.webkit', 'scrim', null, null, { fixed: true, note: 'rack.css writes the -webkit-backdrop-filter twin' }),
  R('scrim.tour', 'scrim', '--scrim-tour', 'scrim.tour',
    { at: { web: ['auth.css', '#onboard.ob-tour', 'background'], native: 'src/ui/onboarding/TourOverlay.jsx:66' } }),

  R('chrome.statusBar', 'chrome', null, 'chrome.statusBar', { at: { native: 'app/_layout.jsx:316' } }),
  R('chrome.keyboard', 'chrome', null, 'chrome.keyboard'),
  R('chrome.blurTint', 'chrome', null, 'chrome.blurTint', { at: { native: 'src/ui/Dock.jsx:45' } }),
  R('chrome.shadow', 'chrome', null, 'chrome.shadow'),
  R('chrome.datePicker', 'chrome', null, 'chrome.datePicker', { at: { native: 'app/(app)/(tabs)/workout/session.jsx:463' } }),
  R('chrome.camera', 'chrome', '--video-bg', 'chrome.camera'),
  R('chrome.systemFace', 'chrome', null, 'chrome.systemFace'),
  R('chrome.appearance', 'chrome', null, null, { fixed: true, note: 'app.json userInterfaceStyle; needs a rebuild' }),
  R('chrome.launch', 'chrome', null, null, { fixed: true, at: { web: 'manifest.json:9', native: ['app.json:10', 'app.json:26'] },
    note: 'app.json expo.backgroundColor + expo.splash.backgroundColor (a rebuild), manifest.json background_color (an install)' }),
  R('chrome.manifestTheme', 'chrome', null, null, { fixed: true, at: { web: 'manifest.json:10' },
    note: 'manifest.json theme_color, read at install; themeColor is the <meta> the web can change' }),
  R('chrome.webStatusBar', 'chrome', 'meta:apple-mobile-web-app-status-bar-style', null, { fixed: true }),
  R('chrome.colorScheme', 'chrome', 'color-scheme', null),

  ...['title', 'sub', 'label', 'link', 'placeholder', 'error', 'ok', 'button', 'buttonBusy',
      'buttonText', 'spinner', 'fieldBg', 'fieldText', 'fieldBorder'].map(k => R('signIn.' + k, 'color', null, 'signIn.' + k)),
  ...['devText', 'guardText', 'guardNote'].map(k => R('banner.' + k, 'color', null, 'banner.' + k)),

  ...CHANNEL,
  ...ROOT,

  R('groups', 'table', 'paint()', 'group', { follows: { ...GROUP_ROLES, fallback: 'steel' },
    note: "analytics.js PALETTE + groupColor()'s fallback, lowercase" }),
  R('groupPlates', 'table', 'paint()', 'groupPlate', { follows: GROUP_ROLES, note: 'exercises.js GROUPS[g].color, uppercase' }),
  R('plates', 'table', 'paint()', 'plate', { follows: ['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'],
    note: 'PLATES[].c, web workout.js and native src/state/workout.js' }),
  R('importGroups', 'table', 'var()', null, { note: 'importer.js COLORS and its fallback; web only' }),
  R('mark', 'table', 'var()', 'mark', { note: 'index.html .auth-mark, access.js gate marks, Splash, gate Mark' }),
  R('subjects', 'table', 'var()', 'subject', { note: 'you.js C_* and SUBJECT_COLOR; native SUBJECT_COLOR + C_*; `fallback` is every lookup\'s ||' }),
  R('kpi', 'table', 'rgb()', 'kpi', { note: 'web --kpi-rgb (you.js, .kpi); native Kpi tint' }),
  R('admin', 'table', 'var()', 'admin', { note: 'AI_SPLIT, FAMILIES, the type pill, .adm-flag (pill.web holds class names)' }),
  R('conf', 'table', 'var()', 'conf', { note: 'the estimator confidence dot' }),

  // The set badge's letter, W / F / D (rack.css .set-idx.t-W/F/D, native
  // SetRow.jsx TINT): each names a colour role, so a vibe can ink W in warn
  // where its plate yellow is too light for 12pt text. Its wash is tint.tag*.
  ...['W', 'F', 'D'].map((k, i) => R('tagInk.' + k, 'color', '--tag-ink-' + k.toLowerCase(), 'tagInk.' + k,
    { ref: 'color', dflt: ['pYellow', 'pRed', 'pBlue'][i] })),
  ...PLATE_ROLES.map(k => R('inkOf.' + k, 'color', '--ink-of-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), 'inkOf.' + k,
    { ref: 'color', dflt: k }))
]);

/* A role's value in a definition, as every engine and the generator read it:
   the definition's own, else what the role says a definition that leaves it
   out takes — `or`, another path in the same definition, then `dflt`. So an
   older definition, written before a role existed, still means one thing.
   undefined when neither the definition nor a role says anything. */
const BY_PATH = new Map(ROLES.map(r => [r.path, r]));
export function valueOf(def, path) {
  const v = at(def, path);
  if (v !== undefined) return v;
  const r = BY_PATH.get(String(path));
  if (!r) return undefined;
  if (r.or) { const o = at(def, r.or); if (o !== undefined) return o; }
  return r.dflt;
}

/* ---------- legacy exact spellings ----------
   The only strings in any vibe that are not 6-digit hex where a colour goes.
   Each is v1's value today reaching something verbatim — a host prop, an
   inline style, a stylesheet declaration or a T value ('#fff', '#000', an
   unspaced rgba()) — so "v1 is today, to the prop" needs it spelled exactly
   so. Only v1 may hold them; every other vibe writes 6-digit hex and lets
   rgba() build the rest.
     web stylesheet:  colors.onDanger.web (rack.css .swipe-del), and
                      chrome.camera (rack.css .scan-video; scan.jsx on native)
     native props:    the rest — sign-in, the _layout banners, the five
                      shadowColors, the dock, the sheet backdrop, the
                      rowPress sites, bits.jsx, verdicts.jsx, cards.jsx,
                      TourOverlay
     T only:          tint.wkBarGlass.exact — theme.js:82, which nothing
                      reads at 1cb6498; kept so build(v1) is T as it is. */
export const LEGACY_EXACT = Object.freeze([
  'colors.onDanger.web',
  'chrome.shadow', 'chrome.camera',
  'signIn.title', 'signIn.buttonText', 'signIn.spinner', 'signIn.fieldText',
  'banner.devText', 'banner.guardText', 'banner.guardNote',
  'tint.rowPress.exact', 'tint.pillBase.exact', 'tint.dockGlass.exact', 'tint.wkBarGlass.exact',
  'tint.backdrop.exact', 'tint.trajGood.exact', 'tint.trajWarn.exact', 'tint.trajBad.exact',
  'tint.reviewBg.exact', 'tint.reviewBorder.exact',
  'kpi.steps.exact',
  'scrim.tour.native.exact'
]);

/* ---------- hues the copy names ----------
   Shipped sentences name some roles by their v1 hue: "Blue — cut", "green =
   goal met", "the white head", "amber the other way". Copy never changes
   with a vibe — vibes change how Rack looks, never what it says — so a vibe
   keeps each of these roles in the named hue family (a blue that still reads
   as blue), or the sentence turns false. The tints and shadows built from
   them (zoneCut, pillUp, trajWarn, …) inherit it. Sites are file:line at the
   base commits, on the line holding the hue word. Phase D reads this; Phase
   Q can hold a vibe to it. */
export const HUE_NAMED = deepFreeze([
  { role: 'colors.pBlue', hue: 'blue',
    web: ['food.js:752', 'food.js:3609', 'food.js:3612', 'food.js:3633'],
    native: ['src/state/foodTargets.js:259', 'src/ui/food/barGuide.jsx:74', 'src/ui/food/barGuide.jsx:77',
             'src/ui/food/barGuide.jsx:106'] },
  { role: 'colors.pYellow', hue: 'yellow',
    web: ['food.js:755', 'food.js:756', 'food.js:3614', 'food.js:3618', 'food.js:3633', 'you.js:1066'],
    native: ['src/state/foodTargets.js:262', 'src/state/foodTargets.js:263', 'src/ui/food/barGuide.jsx:85',
             'src/ui/food/barGuide.jsx:90', 'src/ui/food/barGuide.jsx:106', 'src/ui/you/cards.jsx:323'] },
  { role: 'colors.pRed', hue: 'red',
    web: ['food.js:753', 'food.js:3610', 'food.js:3615', 'food.js:3633'],
    native: ['src/state/foodTargets.js:260', 'src/ui/food/barGuide.jsx:75', 'src/ui/food/barGuide.jsx:86',
             'src/ui/food/barGuide.jsx:106'] },
  // "the white head": the calorie bar's head (.cal-head, the guide's head
  // swatch) — calMark, not chalk, so a light vibe can darken its ink
  { role: 'colors.calMark', hue: 'white',
    web: ['food.js:3607', 'food.js:3632'],
    native: ['src/ui/food/barGuide.jsx:72', 'src/ui/food/barGuide.jsx:105'] },
  // goal met, the pill and the arrows that move the way the goal wants, a macro on target
  { role: 'colors.good', hue: 'green',
    web: ['steps.js:306', 'you.js:801', 'you.js:921', 'you.js:1067'],
    native: ['app/(app)/(tabs)/steps.jsx:391', 'src/ui/you/cards.jsx:77', 'src/ui/you/cards.jsx:192',
             'src/ui/you/cards.jsx:324'] },
  { role: 'colors.bad', hue: 'red', web: ['you.js:801'], native: ['src/ui/you/cards.jsx:77'] },
  // .delta.flat, native DELTA_FG.flat
  { role: 'colors.dim', hue: 'grey', web: ['you.js:801'], native: ['src/ui/you/cards.jsx:77'] },
  { role: 'colors.warn', hue: 'amber', web: ['you.js:1067'], native: ['src/ui/you/cards.jsx:324'] }
]);

/* ---------- what the pinned modules paint ----------
   analytics.js is pinned — copied into native verbatim and never edited — so
   the var() colours it writes into its SVG are fixed text. On the web each
   one follows the role its custom property is, in every vibe, whatever a
   split role (accent, track, grip, faint) says about the job. Native draws
   the same marks from its own chart components, so each native mirror keeps
   spending that SAME role (its T key at 1cb6498): a vibe that parts track
   from collar moves the heat strip's empty days on neither client.
     reach 'fixed'    written unconditionally; no option reaches it.
     reach 'default'  an option's default. `takenBy` is every web call that
                      takes it (the option missing, and the option `when`
                      names present); a call the engine edits to pass the
                      option re-points it. [] means every call passes its own.
   These are every var() string in the pinned web modules at 928a65e (the
   web verifier surveys them). Sites are file:line at the base commits. */
export const PINNED_PAINT = deepFreeze([
  { web: 'analytics.js:1118', fn: 'heatStrip', paints: 'a trained day\'s cell', spends: '--p-yellow',
    role: 'colors.pYellow', reach: 'fixed', native: ['src/ui/chart/HeatStrip.jsx:24'] },
  { web: 'analytics.js:1118', fn: 'heatStrip', paints: 'an untrained day\'s cell', spends: '--collar',
    role: 'colors.collar', reach: 'fixed', native: ['src/ui/chart/HeatStrip.jsx:58'] },
  { web: 'analytics.js:965', fn: 'sparkline', paints: 'a bar before accentFrom, or an empty one (kind \'bars\')', spends: '--knurl',
    role: 'colors.knurl', reach: 'fixed', native: ['src/ui/chart/Sparkline.jsx:71'] },
  { web: 'analytics.js:662', fn: 'lineChart', opt: 'color2', when: 'line2', paints: 'the second line, over the measured one',
    spends: '--chalk', role: 'colors.chalk', reach: 'default', takenBy: ['you.js:1155'],
    native: ['src/ui/chart/LineChart.jsx:41'] },
  { web: 'analytics.js:660', fn: 'lineChart', opt: 'color', paints: 'the line and its area', spends: '--p-yellow',
    role: 'colors.pYellow', reach: 'default', takenBy: [], native: [] },
  { web: 'analytics.js:791', fn: 'barChart', opt: 'color', paints: 'a bar with no colour of its own', spends: '--p-blue',
    role: 'colors.pBlue', reach: 'default', takenBy: [], native: [] },
  { web: 'analytics.js:893', fn: 'ring', opt: 'color', paints: 'the arc', spends: '--p-yellow',
    role: 'colors.pYellow', reach: 'default', takenBy: [], native: [] },
  { web: 'analytics.js:940', fn: 'sparkline', opt: 'color', paints: 'the line, its end and the lit bars', spends: '--p-yellow',
    role: 'colors.pYellow', reach: 'default', takenBy: [], native: [] }
]);
