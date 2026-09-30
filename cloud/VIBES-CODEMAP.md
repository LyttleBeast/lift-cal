# VIBES-CODEMAP.md: Cowork's read-only map of Rack for the Vibes night

Made 25 Sep 2026 (night) by six read-only mapping agents: web at lift-cal `928a65e` (rack-v58) and native at rack-mobile `1cb6498` (buildNumber 58).
Companion to `VIBES-PROMPT.md`. **Line numbers drift, so re-verify before you edit. Where this map and the code disagree, the code wins.** Where this map and the prompt disagree, **the prompt wins**, because Micah decided several things after these maps were written:
- the vibe is saved **per account** at `settings/vibe`, with a device hint (not device-only);
- **light vibes are allowed**, not dark-only;
- **both clients** get the engine and all vibes tonight.

The maps also disagree with each other on some counts (e.g. native module-scope theme captures: 14 files / 76 refs vs ~22 files / ~97 refs vs 28 constants). Count for yourself.

Sections: Web styling · Native styling · Screens · Settings and storage · Tooling and fences · Assets and licensing.



---

# Web styling

## Rack web styling surface: rack-v58 (`/home/claude/lift-cal`, read-only)

### 0. Constraints the prompt has to state

- **The repo has no build step and no framework.** It is `index.html` plus ES modules plus two stylesheets. The house rule is no npm packages.
- **Two files are copied into the native app byte for byte.** `exercises.js` and `analytics.js` are hash-pinned in `NEXT-NATIVE-V58.md:44-60`, and the native iOS port copies them verbatim. Both hold muscle-group hex colours (`exercises.js:6-11`, `analytics.js:615-619`). Editing them breaks the pin, and a `'var(--x)'` string means nothing in native. **Do not touch these two files.** Map their colours at the web call sites instead.
- **`tools-check/touch-target.mjs` runs its own small CSS cascade over the real `rack.css` and `auth.css`.** It has 408 checks and passes today. It compares resolved strings against `touch-target.snapshot.json` (for example `"letter-spacing": ".02em"`, `"font-variation-settings": "'wdth' 92, 'wght' 700"`, `"padding-left": "18px"`).
  - It resolves `var()` **only from `:root`, in one pass** (`touch-target.mjs:215-240, 415`).
  - So any token used for button size, padding, border width, font size, letter-spacing or font-variation must be a **single-level literal in `:root`** with the exact same spelling (`.02em`, not `0.02em`). A token that points at another token fails, unless the verifier is taught to follow the chain.
  - A border width written as a token becomes `medium` in its parser (`:198`).
  - Rules scoped to vibes that sit outside `rack.css` and `auth.css` are invisible to it (`SHEETS=['rack.css','auth.css']`, `:60`).
- **Other verifiers regex-match literal source text.** These lines must stay textually intact:
  - `rack.css`: `.set-row.drop .set-idx { margin-left: 10px; }` (drop-sets.mjs:378)
  - `rack.css`: `.qty-row .btn { flex: 0 0 54px; padding: 0; }` (tick-targets.mjs:457)
  - `rack.css`: `.ask-opt {…min-height: 44px` and `.ask-opt .ob-choice-t {…overflow-wrap: anywhere` (estimate-ask.mjs:360)
  - `rack.css`: `.coach-nudge-t {…white-space: nowrap;…text-overflow: ellipsis;` (coach-surface.mjs:1136)
  - `auth.css`: `.ob-choice {…width: 100%` (estimate-ask.mjs:361)
  - `index.html`: the Train dock button markup regex (custom-movement.mjs:499)
- **Version bump.** Any change to a phone-loaded file needs `sw.js` `CACHE` and `usage.js:45` `VERSION` bumped together, to `rack-v59` (checked by `tools-check/version-match.mjs`). There are 52 verifiers in `tools-check/` and all must exit 0.
- **Plugging in a new font is not a one-line change.** Weight is set **only** through `font-variation-settings`. There are **0** `font-weight` declarations in either stylesheet and no `<b>`/`<strong>` in the JS. Width comes from Archivo's `wdth` axis, and the rules use values 78–118.
  - A static font, or a variable font without a `wght` axis, renders nearly everything at 400. The exception is h1–h3, which get the browser's default bold.
  - A font without a `wdth` axis loses the condensed headings and the wide numerals.
- **"Byte-identical" is not possible, because the DOM strings change** (`#d6252b` becomes `var(--p-red)`). The provable bar is **pixel-identical and computed-style-identical**. Section 9 describes how to prove it.

---

### 1. `rack.css` (2,314 lines, 100,170 bytes) and `auth.css` (297 lines, 10,668 bytes)

`CLAUDE.md` still says rack.css is 62KB. That is out of date.

| | rack.css | auth.css |
|---|---|---|
| style rules / selectors / declarations | 720 / 748 / 2,621 | 82 / 85 / 319 |
| @keyframes | 12 (viewIn 106, dockMark 151, plateDrop 227, plateIn 321, fadeIn 330, sheetUp 344, pillIn 444, setFlash 475, coachPulse 529, summaryIn 858, fabIn 1540, aiSpin 1653) | 4 (gatePulse 102, obFade 139, obRise 155, tourPulse 267) |
| @media | 3: reduced-motion (80, 533), `min-width: 900px` desktop (688) | 1: `max-width: 380px` (293) |
| @import | line 1, Google Fonts Archivo | none |
| `var(--…)` uses | 587 | 83 |
| colour literals outside `:root` | **80** (79 raw plus 1 already tokenised `rgba(var(--kpi-rgb),.14)`), 52 distinct | **4** (lines 24, 134 ×2, 153) |
| gradients | 9 (lines 895, 960, 1454, 1588, 1593, 1894, 1915, 1968, 1977) | 1 (line 134) |
| box-shadow | 16 | 2 |
| backdrop-filter | dock 122-123, sheet-backdrop 327, wk-bar 407-408 | 0 |
| `!important` | 3 (reduced-motion only) | 0 |
| `prefers-color-scheme`, `color-scheme`, `color-mix`, `@supports`, `@font-face` | none | none |

auth.css describes itself as "rack.css owns the tokens; this file only ever spends them" (auth.css:1-7).

#### `:root` tokens (rack.css:4-49): 26 in total

| token | value | CSS uses | JS mentions | role |
|---|---|---|---|---|
| `--rack` | #14161a | 28 | 1 | page background (html/body 53, #auth, kpi tile) |
| `--bar` | #1c1f26 | 24 | 0 | card, sheet and input surface |
| `--collar` | #262a33 | 97 | 4 | borders, secondary button bg, `.has-work` day |
| `--knurl` | #333844 | 25 | 4 | stronger borders, grab handle, pressed |
| `--chalk` | #f2f0eb | 58 | 5 | primary text |
| `--steel` | #8d939f | 66 | 3 | secondary text |
| `--dim` | #5c6270 | 88 | 8 | tertiary text and labels |
| `--p-red` | #d6252b | 8 | 6 | chest plate, protein, gain zone, danger |
| `--p-blue` | #2e7fd9 | 11 | 14 | back plate, fat, water, training, cut zone, drop set |
| `--p-yellow` | #f0be1e | 56 | 19 | **overloaded**: legs plate, carbs, fuel/weight subject, maintain zone, AND the app accent (btn-primary 204, focus ring 77, dock mark 147, today 303, input focus 245/497, fab 1520, accent-color 720) |
| `--p-green` | #2aa85c | 3 | 12 | shoulders plate, steps, set-done, rest line |
| `--p-white` | #e8e5de | **0** | 3 | arms plate, steps subject |
| `--p-chrome` | #a8aeb8 | **0** | 2 | core plate |
| `--good` / `--warn` / `--bad` | same hex as green / yellow / red | 9 / 7 / 7 | 15 / 5 / 4 | verdicts |
| `--dock-h` | 64px | 7 | 0 | dock height |
| `--safe-top` | env(safe-area-inset-top,0px) | 7 | 0 | notch |
| `--top-gap` | 10px | 1 | 0 | |
| `--app-top` | calc(var(--safe-top)+var(--top-gap)) | 3 | 0 | |
| `--pad` | 16px | 5 | 0 | screen gutter |
| `--r` / `--r-sm` | 12px / 8px | 11 / 35 (26 in rack.css + 9 in auth.css) | 0 | radii |
| `--ease` / `--fast` / `--med` | cubic-bezier(.22,.61,.36,1) / 140ms / 240ms | 54 / 48 / 10 | 0 | motion |

Two more custom properties are declared outside `:root`:
- `--kpi-rgb: 141,147,159` on `.kpi` (1913). you.js:464 overrides it.
- `--fill`, used at 1157 and set by water.js:171.

#### Raw colours outside `:root`, grouped by the colour they derive from

| colour family | rack.css count | lines |
|---|---|---|
| `rgba(240,190,30,a)` (p-yellow tints) | **39** | 476, 486, 526, 530, 531, 561, 642, 680, 681, 894, 895, 960, 1064, 1238, 1290, 1291, 1446, 1453, 1454×2, 1587, 1588×2, 1592, 1593×2, 1602, 1603, 1712, 1926, 1960, 2007, 2023×2, 2159, 2160, 2175, 2176, 2284 |
| `rgba(0,0,0,a)` (shadows, scrim) | 7 | 326, 377, 442, 658, 1526×2, 1536 |
| `rgba(214,37,43,a)` (red) | 7 | 487, 1065, 1440, 1627, 1925, 1961, 2008 |
| `rgba(46,127,217,a)` (blue) | 6 | 488, 549, 553, 1063, 1445, 1959 |
| `rgba(20,22,26,a)` (translucent `--rack`) | 5 | 121 (dock .82), 406 (wk-bar .9), 1077, 1894, 1895 |
| `rgba(42,168,92,a)` (green) | 5 | 473, 477, 1439, 1924, 2006 |
| `#141414` (ink on yellow) | 3 | 204 (.btn-primary), 1521 (.fuel-fab), 1590 |
| `rgba(255,255,255,a)` | 2 | 1398, 1922 |
| one-offs | 5 | #0d1a11 at 509 (ink on the green check), #14161a at 597 (plate-chip text), #000 at 729 (scan video), #fff at 807 (swipe-delete text), #d9a90f at 1535 (fab pressed) |

auth.css: `#141414` (24), `rgba(20,22,26,.55/.94)` (134), `rgba(0,0,0,.55)` (153).

Colour literals per line: lines 1454, 1526, 1588, 1593 and 2023 have 2 each; every other line has 1.

#### Radius, spacing and type (none of it is tokenised except as noted)

- **border-radius: 104 declarations in rack.css.** 36 use tokens (var(--r-sm) ×26, var(--r) ×10). The literals are:
  - 999px ×16 (pills)
  - 2px ×14 and 50% ×14
  - 3px ×5, 4px ×5, 1px ×4
  - 18px for the sheet (`18px 18px 0 0` at 337, desktop 691)
  - chat bubbles `14px 14px 14px 4px` and `14px 14px 4px 14px`
  - 10px, 5px, and others once each

  auth.css has 12 (8 use tokens).
- **Spacing: 420 padding, margin and gap declarations in rack.css with 121 distinct values. Only 7 use var().** The most common are 10px (42), 6px (40), 8px (38), 12px (27), 2px (25), 4px (23) and 14px (19). auth.css has 62 declarations, of which 3 use var().
- **font-size: 218 declarations in rack.css with 28 distinct px values, none tokenised.** The most common are 12px (38), 11px (31), 10px (30), 13px (27), 14px (16), 15px (15) and 9px (13). The smallest is 7.5px and the largest 34px. The base is `body` 15px/1.45 (63-66), with h1 26px and h2 18px. auth.css has 27.
- **font-variation-settings: 113 in rack.css with 29 distinct combinations, plus 13 in auth.css.**
  - The most common are `'wdth' 88,'wght' 700` ×24 (labels and eyebrows), `92/700` ×10, `108/800` ×9, `100/700` ×9, `92/600` ×8 and `104/800` ×5.
  - `wdth` values in use run from 78 (h1–h3, line 154) to 118 (`.load-num`, "the signature numeral…stamped like a plate", 165). `wght` values run from 400 to 900. Odd weights: 650, 750.
  - One rule sets only `'wght' 400` (placeholder, 498).
- **font-family:** set once, `'Archivo', system-ui, -apple-system, sans-serif` on html/body (57). There are 10 `inherit` and 2 `ui-monospace, monospace` (725 paste box, 1424 admin).
- **letter-spacing:** 61 in rack.css, 7 in auth.css. All em-based except one `0`. The most common are .1em ×16 and .04em ×9. The 16 negative ones sit on headings and numerals.
- **Uppercase:** 36 `text-transform: uppercase` in rack.css, 4 in auth.css. The recurring label recipe is `.eyebrow` (158-162): 10px, .16em, uppercase, --dim, wdth 88 / wght 700.
- **Boxes with a fixed height that a wider font can overflow** (63 px heights in total):
  - `.coach-card` height 190px (2062) and `.tight` 164px (2075)
  - `.cal-nav button` 34px (270)
  - `.qty-row .btn` 54px
  - touch-target sections F, G and H measure labels with **Archivo's advance widths**, so they only prove the fit for v1.

---

### 2. Inline styling in JS

The DOM is built with `el()` and `svgEl()` (`ui.js:8-19`). There are **no `style="` strings in the JS**. Non-empty `innerHTML` is used only for icons and one "‹ Back" (section 4).

| file | `.style.x=` | raw hex | `'var(--…)'` strings | notes |
|---|---|---|---|---|
| access.js | 6 | **12** | 0 | plate mark ×2, 315 and 389: `['#d6252b',…].forEach(c=>b.style.background=c)` |
| admin.js | 17 | 0 | 10 | series colours 57-60 and 72-86, lineChart 570 |
| analytics.js (pinned) | 3 | **7** | 8 | `PALETTE` 615-617, `groupColor()` fallback `'#8d939f'` at 619. Chart defaults `var(--p-yellow)` / `var(--chalk)` / `var(--p-blue)` at 660, 662, 791, 893, 940. Gradient `stop-color` from colour at 674-675 and 1006-1007 |
| coach-ui.js | 12 | 0 | 1 | GROUPS colour at 803 |
| exercises.js (pinned) | 0 | **6** | 0 | `GROUPS.*.color` in uppercase hex, 6-11 |
| food.js | 106 (75 of them marginTop) | 0 | 18 | macros 615-617, `zoneColor` 635-638, confidence 2156-2158. fontSize 591 ('40px') and 3272 ('30px'). cssText 1895 (off-screen input) |
| importer.js | 6 | 0 | 7 | its own group map 99-100, already var() |
| picker.js | 13 | 0 | 1 | 285 `GROUPS[x.group].color`, 397 |
| routines.js | 15 | 0 | 3 | 136, 186, 385 (GROUPS) |
| settings.js | 14 | 0 | 0 | cssText 272, padding 341 |
| stats.js | 6 | 0 | 6 | groupColor at 168, 173, 214, 248, 351, 382 |
| steps.js | 11 | 0 | 21 | ring stroke 227-246, fontSize 192 |
| store.js | 2 cssText | **4 + 1 rgba** | 0 | write-refused alert banner, 518-529: `#7f1d1d`, `#fff`, system-ui font. Deliberately off-theme |
| ui.js | 4 | 0 | 0 | |
| water.js | 8 (+1 setProperty) | 0 | 7 | vessel SVG fills 220-241, fontSize 152 |
| weight.js | 13 | 0 | 5 | fontSize 336 and 396, borderTop 457 |
| workout.js | 19 | **6** | 2 | `PLATES` 1385-1388 (hex, used at 1407). GROUPS at 434, 457, 595, 1201, 1204. groupColor at 632, 2078, 2158 |
| you.js | 24 (+1 setProperty) | 0 | 16 | `C_*` subject constants 100-109 (var). **RGB channel strings for the KPI tint**: `'240,190,30'` at 868 and 877, `'46,127,217'` at 884, `'232,229,222'` at 891, fed to `--kpi-rgb` at 464. groupColor at 1250, 1256, 1284 |
| **Total** | **281** (marginTop 180, background 37, color 14, width 12, display 7, left 6, fontSize 6, cssText 4, …) | **35 plus 5** | **105** | |

- **Muscle-group colour flow.** There are about 21 web call sites that bake hex from `GROUPS[g].color` or `groupColor(g)` into inline style or SVG attributes. They include the calendar plates (workout.js:434), exercise tags, donut and legend segments, and the picker dots.
- **SVG attributes.**
  - Charts put the colour in presentation attributes: `stroke: color`, `fill: p.color||color` at analytics.js:835, 843, 903, 911 and 1060.
  - Text styling comes from CSS classes (`.chart-axis`, `.donut-top` and others, rack.css:981-1044).
  - `var()` inside SVG attributes is already in production (water.js:220), so it works on iOS.
- **Canvas.** Used only for photo compression (ai.js:72, settings.js:585). No UI is drawn on canvas.
- **theme-color.** No JS sets it.
- **Text measurement.** None: no `measureText`, `offsetWidth` or `getBoundingClientRect`. Layout is pure CSS.
- **One JS number is tied to CSS:** `swipeToDelete` width=88 in ui.js:231 must equal `.swipe-del` width 88px (rack.css:806).

---

### 3. Fonts

- **Only Archivo is used.** It loads via `@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap')` at **rack.css:1**. The loading chain is HTML → rack.css → Google CSS → gstatic woff2, with no preconnect. `display=swap` means a flash of system-ui first.
- 404.html has its own copy of the `@import` (404.html:9). The only other font is `ui-monospace` in two places.
- **Offline behaviour.**
  - `sw.js` **skips every hostname containing `googleapis.com`**, so the Google Fonts CSS never enters Cache Storage and relies on the browser's HTTP cache.
  - The woff2 from `fonts.gstatic.com` does go through the worker's network-first handler and is cached in `rack-vNN`. It is evicted on every version bump by `activate`.
  - Likely result: an offline cold start after the HTTP cache expires falls back to system-ui even though the woff2 is cached. This is inferred from the code, not observed.
- **License.** Google Fonts are SIL Open Font License. Linking from Google has no obligation. Self-hosting woff2 means shipping the license text, which is a small obligation.

---

### 4. Icons (there is no icon module)

**Inline SVG, 24×24 viewBox, `stroke=currentColor`, round caps and joins:**
- **Dock, 5 icons**, static markup in `index.html:98-130`: You (person), Train (barbell), Fuel (fork and glass), Weight (line chart), Steps (footprints). Stroke 1.9 and size 22px come from CSS (rack.css:142).
- **`food.js` `ICON_PATHS` (1158-1168) plus `icon(name,width)` (1170-1177):** plus, camera, pen, barcode, keypad, book, stack, spark. Used by the FAB (568, stroke 2.6), the add tiles (1215, 1789), the estimator notices (1234, 1239), and the Foods/Meals buttons (1250, 1254).
- **Gear:** one path is duplicated in `food.js:529` and `steps.js:159` (stroke 1.6). A **different** gear path is at `you.js:694` (stroke 1.8, the only way into settings).
- **Calendar:** `workout.js:1013` (stroke 1.7).
- **Coach:** `bubbleIcon()` at `coach-ui.js:37` and `lockIcon(pro)` (open or closed) at `coach-ui.js:54`, both stroke 1.9. The comment there says "the app has no icon system".
- **Total: 19 distinct SVG icons.**

**Unicode glyphs used as icons (text, styled by class):**

| glyph | use | where |
|---|---|---|
| `›` `‹` | chevrons and day/month navigation | settings.js:55, admin.js:719, you.js:1705, picker.js:408, routines.js:148, coach-ui.js:244, food.js:537/538/1552, workout.js:398/399 |
| `✕` | delete | food.js:1321/1562/1653/2288/2414/3127, routines.js:350, workout.js:1168, weight.js:525 |
| `⋯` | menu | food.js:580/900, routines.js:388, water.js:190, workout.js:1207, you.js:377 |
| `✓` | set done, at goal | workout.js:1143/1347, you.js:1552, weight.js:211 |
| `↳` | drop set | workout.js:1307, routines.js:414 |
| `✎` | edit | food.js:1312 |
| `↑↓→` | delta arrows | you.js:442 |
| `⚠` | warning | food.js:3293 |
| `⚙` | gear, only inside prose | 10+ places |
| `&#8249;` | "‹ Back" | admin.js:1562, stats.js:62 |

- **Emoji:** none anywhere.
- **Marks drawn in CSS:** the six-plate auth mark (rack.css:219-229), the dock active bar (144-151), the calendar plate stack (315-321), the exercise tag bar (`.ex-tag`), and the check box (502-510).

---

### 5. Images and assets

| file | where it is used | content |
|---|---|---|
| icon-180.png | `index.html:11` apple-touch-icon | six plate bars on #14161a (checked pixel colours) |
| icon-192.png, icon-512.png | `manifest.json:12-13`, `"any maskable"` | same design |

- There is no favicon link and no `apple-touch-startup-image` (no iOS splash images).
- No other static image is loaded by the app.
- User content only: profile photo (settings.js:449, you.js:662) and food photos (food.js:1931), both as data URLs.
- `report/*.png` are developer screenshots and are not loaded by the app.
- The barcode library loads from jsdelivr (food.js:2798).
- **Installed PWA icons cannot change per vibe at runtime.**

---

### 6. `index.html` and `manifest.json`

- `index.html:6` has `theme-color #14161a`. Line 8 has `apple-mobile-web-app-status-bar-style black-translucent`, together with `viewport-fit=cover`. Stylesheets are linked at 12-13.
- **Status-bar consequence.** On an installed iOS PWA the status bar text is always **white over page content**. A light-background vibe would have an unreadable status bar. As far as I know iOS reads this meta only at launch; confirm on a device.
- `index.html:27-32` is the auth mark: six `<i style="background:#hex;animation-delay:…">`.
- `manifest.json` has `background_color` and `theme_color` both `#14161a`. Both are static.
- `404.html` is standalone: its own `:root` copy of 12 colour tokens (11-16), inline hex marks (93-98), and its own `@import`.

---

### 7. `sw.js` (one line of code, 18 lines in all)

- `const CACHE='rack-v58'`.
- **Nothing is precached.** `install` only calls `skipWaiting()`.
- `activate` deletes every cache not named `CACHE`.
- The fetch handler is network-first. For same-origin, non-navigation requests it uses `cache:'no-cache'`, then retries plainly, and stores any 200 response in `CACHE`. Offline it falls back to `caches.match`, and for navigations to `./index.html`.
- It bypasses firebaseio.com, googleapis.com and workers.dev.
- **What this means for new fonts, images and vibe CSS:**
  - They are cached only after they have been fetched once while online, and they are wiped on every version bump.
  - A vibe file or Iron Age photo never requested online will not be there offline.
  - Options: link every vibe stylesheet from `index.html` (each launch then fetches and caches them), or add a small install-time precache list to `sw.js`. The second is new behaviour for this worker.
  - GitHub Pages already serves subfolders (`.nojekyll`).

---

### 8. What makes a runtime switch hard

1. **Hex values baked into inline styles when a screen renders.** A token swap does not reach them:
   - GROUPS and groupColor sites (about 21, from pinned files)
   - workout.js `PLATES`
   - access.js marks ×2
   - `index.html` auth mark
   - you.js RGB channel strings
2. **79 + 4 literal `rgba()` colours in CSS.** 39 of them are yellow-accent tints, which would stay yellow after an accent change.
3. **`--p-yellow` is used for too many jobs.** It is both the accent and a data colour (legs, carbs, fuel/weight, maintain). A vibe cannot change the accent without also recolouring the data.
4. **About 180 inline `marginTop` values and 6 inline `fontSize` values** (food 591/3272, steps 192, water 152, weight 336/396). A layout vibe cannot override these without `!important`.
5. **Weight and width live only in `font-variation-settings`** (see section 0).
6. **Fixed-height boxes plus Archivo-tuned letter-spacing.** A wider font overflows them.
7. **Dock SVGs are static HTML.** Icon swaps need JS.
8. **Re-rendering after a switch is cheap.**
   - Every tab's `render()` rebuilds from scratch: you.js:519, workout.js:333, food.js:510, weight.js:70, steps.js:144. Sheets are built when opened.
   - `switchView()` (app.js:241-252) re-renders on every tab change.
   - `location.reload()` would trip the live-workout `beforeunload` prompt (app.js:307).
9. **Status-bar and manifest colours are fixed** (see section 6).
10. **`color-scheme` is not set.** Native pickers and selects use the default. Adding it to v1 would change v1.

---

### 9. Engine seam for web (recommendation)

**Principle.** v1 is the stylesheet as it is today, tokenised. Every value moves into literal, single-level `:root` tokens with **identical spellings**. Vibes live only in separate files, scoped to `:root[data-vibe="id"]`. With the attribute absent (or set to `v1`), nothing a vibe file contains matches.

#### Engine phase: must render v1 identically

1. **`rack.css`**
   - Add channel tokens: `--rack-rgb:20,22,26`, `--p-yellow-rgb:240,190,30`, `--p-red-rgb:214,37,43`, `--p-blue-rgb:46,127,217`, `--p-green-rgb:42,168,92`, `--p-white-rgb:232,229,222`, `--shade-rgb:0,0,0`, `--lift-rgb:255,255,255`. Rewrite all 79 literals as `rgba(var(--x-rgb), a)`, the pattern `.kpi` already uses (1913-1915). The computed values come out identical.
   - Name the one-offs: `--ink:#141414`, `--ink-plate:#14161a`, `--ink-go:#0d1a11`, `--accent-press:#d9a90f`, `--on-danger:#fff`, `--video-bg:#000`.
   - Split roles: `--accent`, `--accent-rgb` and `--focus` as literal copies of the yellow values, pointed at from the accent uses only (204, 77, 147, 245, 303, 497, 720, 1520 and the accent tints). `--p-yellow` then stays the data colour.
   - Fonts: `--font` (Archivo stack) and `--font-mono`.
   - Named font-variation roles (for example `--fv-label: 'wdth' 88, 'wght' 700`) covering the 29 distinct combinations.
   - Radius tokens (`--r-pill:999px`, `--r-xs:2px`, `--r-sheet:18px`), plus shadow and scrim tokens.
   - **Leave spacing literal** except for a handful of structural knobs. Deep vibes should override components with scoped rules instead.
   - Do not edit the regex-asserted lines listed in section 0. Put no `[data-vibe]` rules in this file.
2. **`auth.css`**: its 4 literals become tokens.
3. **`index.html`**
   - A synchronous inline `<script>` in `<head>`, **before** the stylesheet links: `try{var v=localStorage.getItem('rack:vibe');if(v&&v!=='v1')document.documentElement.dataset.vibe=v}catch(e){}`.
     - The key is global rather than per-account, following the `rack:migrated` precedent at store.js:131. `purgeDevice` and `lsKey` never touch it, and it applies before sign-in with no flash.
   - The auth mark's inline hex becomes `var(--p-…)`.
   - Static `<link>`s to every `vibes/*.css`: inert unless the vibe is active, and cached by the worker on every launch.
   - Leave the dock markup byte-identical.
4. **New `vibe.js`** (imports nothing, like ui.js):
   - `VIBES` registry: id, name, swatch, theme-color, icon set. `v1` is the first entry.
   - `currentVibe()` and `applyVibe(id)`: set `data-vibe`, write `rack:vibe`, update the theme-color meta, swap the dock SVGs when not v1, then re-render the current view through a callback.
   - `paint(c)`: maps the 6 plate hexes (any case) plus `#8d939f` to `var(--p-*)` / `var(--steel)`.
   - `icon(name)`: a registry. v1 entries are exact copies of today's paths and stroke widths.
5. **Hex call sites wrapped in `paint()`, without touching the pinned files:**
   - access.js:315, 389
   - workout.js:434, 457, 595, 632, 1204, 1407, 2078, 2158
   - picker.js:285, 397
   - routines.js:136, 186, 385
   - coach-ui.js:803
   - stats.js:168, 173, 214, 248, 351, 382
   - you.js:1250, 1256, 1284
   - you.js:868-891 channel strings become `var(--p-yellow-rgb)` and the like. This works because `--kpi-rgb` accepts a var() chain.
6. **Icons (optional in this phase, but must stay v1-identical):**
   - food.js `ICON_PATHS` / `icon()`
   - the gear and calendar `innerHTML` in food.js:529, steps.js:159, you.js:694, workout.js:1013
   - coach-ui.js:37 and 54

   All of these route through `vibe.js` `icon()`. Glyph icons stay as text in v1; vibes restyle them by class (`.set-row-x`, `.ex-menu`, `.ex-del`, `.set-check`, `.rt-go`, `.coach-go-x`).
7. **`settings.js`**: the App section (about lines 244-250) gets `navRow(appList, 'Vibe', currentName, () => { close(); openVibes(onEdit); })`.
   - Optionally mirror the choice to `users/{uid}/settings/vibe`. It is a child of the already-granted `settings`, which has no `$other` deny at its own level, so the **published rules need no change**. Document it in AGENTS.md. The native port's PROPOSED rules may need an entry.
8. **`sw.js` and `usage.js`** go to `rack-v59`. Update the docs: the CLAUDE.md layout table, README, AGENTS.md, and a NEXT-NATIVE note saying this is web only.

**Leave alone:** `exercises.js`, `analytics.js`, the store.js alert banner, and `404.html`.

#### Vibe phases

- **One file per vibe: `vibes/<id>.css`.** Each has a `:root[data-vibe=id]{…tokens…}` block, and deep vibes add `[data-vibe=id] .component{…}` rules. Specificity must match or exceed the base rule; for example `.set-row.drop .set-idx` is (0,3,0).
- **Assets:** `vibes/<id>/` for icons and photos, compressed JPEG or WebP. Public-domain photos only, no generated imagery.
- **Parallel agents do not collide:** the only shared hotspot is the `:root` block in rack.css, which the engine phase finishes first.
- **Each vibe's font must be variable with a `wght` axis**, and a `wdth` axis wherever the vibe keeps condensed and wide styles. The vibe redefines the font-variation role tokens for its own axes.
- **Dark tops only**, because of the status-bar constraint.
- **Check every vibe at 320px** for the fixed-height boxes: coach card 190/164px, and the chips and buttons that touch-target measures.

#### Proving v1 is identical

- **Reuse `report/btn-44/measure.mjs`.** It is headless Chrome over CDP with fake Firebase modules (`report/btn-44/fakes/`), 58 scenes in `scenes.json` including auth, gate, onboarding and tour, at 390 and 320px.
  - It needs `seed.json` from `seed.mjs` and a `CHROME=` path; the default is macOS.
  - It intercepts only `rack.css` today. Serve the v58 tree and the engine tree on two ports instead.
- **Add two checks per scene:** a `Page.captureScreenshot` pixel diff, and a `getComputedStyle` dump of every element. Both must show 0 differences.
- **Plus** all 52 verifiers under `tools-check/` exiting 0, and the `node --check --input-type=module` loop.


---

# Native styling

## rack-mobile (native): map of the styling surface for the Vibes engine


**Repo facts.** Expo SDK 57, RN 0.86.3, React 19.2.3, plain JS, expo-router ~57, reanimated ^4.5.1 with react-native-worklets ^0.10.1, react-native-svg 15.15.4, expo-blur, expo-linear-gradient, expo-font, @expo-google-fonts/archivo ^0.4.2. `app/` + `src/` hold 142 JS/JSX files (50,221 lines). `/ios` is gitignored (generated by prebuild), though a local copy exists. HEAD is `1cb6498` (buildNumber 58). CLAUDE.md house style says state lives in hand-rolled module stores (`subscribe`/`getVersion` + `useSyncExternalStore`, with `src/state/weight.js` as the pattern), no state library, and no direct AsyncStorage.

### 1. `src/ui/theme.js` (333 lines, single file, only import is `Platform` at :11)

| Section | Lines | Contents |
|---|---|---|
| `colors` | :14-43 | 22 keys. Surfaces: `rack #14161a` (page), `bar #1c1f26` (card/sheet/field), `collar #262a33` (border/track), `knurl #333844` (raised border). Text: `chalk #f2f0eb`, `steel #8d939f`, `dim #5c6270`. Plates/muscle groups: `pRed #d6252b` chest, `pBlue #2e7fd9` back, `pYellow #f0be1e` legs **and the app accent**, `pGreen #2aa85c` shoulders, `pWhite #e8e5de` arms, `pChrome #a8aeb8` core. Status: `good/warn/bad` reuse the green/yellow/red hexes. Text on colour: `onYellow #141414`, `onGreen #0d1a11`, `onPlate #14161a`. Also `white #ffffff`, `pYellowPressed #d9a90f`, `fallback #8d939f`. |
| `rgba()` helper | :47-50 | `parseInt(hex.slice(1),16)`, so it **only works on 6-digit hex**. Vibe palettes must use 6-digit hex. |
| `alpha` | :51-56 | `yellow/red/blue/green/ground(a)`: functions that close over the module-level `colors`. |
| `tint` | :58-85 | 23 rgba strings **computed once at load**: setDone, setFlash, tagW/F/D, dropRail, dropAdd, pickSel, block, coachBase/Low/High, rowPress, pillBase/Up/Down/Warn, zoneCut/Hold/Gain, dockGlass `rgba(20,22,26,.82)`, wkBarGlass `.90`, backdrop `rgba(0,0,0,.6)`. |
| `space` | :87-89 | 21 keys, 2px grid: xxs 2 … pad 16 … xl30 30, empty 44. |
| `radius` | :92-100 | r 12, sm 8, sheet 18, tile 10, pill 999, plate 2, chip 3, mark 4, idx 5. |
| `layout` | :124-156 | dockH 64, topGap 10, maxWidth 560/720, dockIcon 22, tapMin 44, sheet pcts. Inset functions `appTop`, `appBottom`, `dockHeight`, `aboveDock`, `sheetPadBottom`, `sheetMaxH`, `syncPipTop`. `sheetMaxH` self-references `layout.*`. |
| `motion` | :158-166 | fast 140, med 240, bezier [.22,.61,.36,1], press scales, fill 500, spin 850, pulse 1800/1600. |
| Fonts | :204 / :215 | `FAMILY()` always returns `'Archivo'` and ignores wdth. `face(wdth,wght)` returns `` `Archivo_${w}` `` with 650→700, 750→800, otherwise rounded to the nearest 100. |
| `MIN_LH` | :235 | 1.088, from Archivo's hhea metrics. The line-height clamp depends on it. |
| `type()` | :264-294 | Defaults `color = colors.chalk` (this is the RN no-inheritance fix, see M7-M10 §14). Converts ls em→pt, clamps lh, supports `upper` and `tnum`. It closes over the module-level `colors`. |
| `loadNum(size)` | :297 | Width 118, weight 800, tabular numerals. |
| `text` | :305-331 | 20 presets **built at load with the colour baked in**: body, h1-3, eyebrow, btn, btnLg, dockLbl, fieldLbl, note, statVal, statLbl, timer, kpiVal, headline, youGreet, chip, segBtn, setInput, and mono (Menlo). |
| default export | :333 | `{colors, alpha, tint, space, radius, layout, motion, face, type, text, loadNum}` |

- **Every one of the 80 theme importers uses `import T from '…/theme'`.** There are no named imports of theme anywhere.
- **Fonts load in `app/_layout.jsx`.**
  - :19-22 imports 4 TTFs by path (400/600/700/800). Importing the package root would ship 2.2MB of fonts.
  - :200-208 `useFonts({Archivo_400…Archivo_800})`. These keys must equal what `face()` returns.
  - :300 `ready = user !== undefined && fontsLoaded` gates the first render. :49 `SplashScreen.preventAutoHideAsync()`.
- **Width is not emulated at all.** The package ships the weight axis only, all at wdth 100. All 29 wdth combinations (78–118) collapse to 100, and only weight is honoured. The wdth arguments are kept at every call site on purpose (theme.js:168-213) so a condensed or expanded face can later be swapped in through `FAMILY()` alone.
- **`fontWeight` is used only in `sign-in.jsx:79,121`.**

### 2. How components consume the theme (critical)

- **`StyleSheet.create` has 0 call sites.** The only `StyleSheet` use is `absoluteFill` at Dock.jsx:59.
- **Styles are inline literals built at render.** There are 1,176 `style=` attributes, and 803 of them are inline `{{…}}` objects.
- **AST scan with @babel/parser over all files.** There are 1,898 `T.*` reads in 80 files.
  - 1,822 (96%) happen inside functions, so they are read at render.
  - 76 happen at **module scope in 14 files**. These are evaluated once at import and go stale after a vibe switch:

| File | Refs | Lines | What |
|---|---|---|---|
| src/ui/you/bits.jsx | 22 | 114-117, 407-412, 416-423 | `DELTA_FG`, `PILL_BG`, exported `SUBJECT_COLOR` and `C_FUEL…C_FAT` (used 27× in you/cards.jsx, 2× in verdicts.jsx) |
| src/ui/admin/sheets.jsx | 10 | 74-77, 83-88 | exported `AI_SPLIT`, `PILL` |
| src/ui/Btn.jsx | 8 | 21-36 | `BG`/`FG`/`BORDER` per kind |
| src/ui/Splash.jsx | 6 | 19-24 | `PLATES` |
| src/ui/train/SetRow.jsx | 6 | 83-85 | `TINT` W/F/D |
| app/(app)/(tabs)/you/admin.jsx | 4 | 78, 82, 87, 92 | `FAMILIES` |
| src/ui/chart/BarChart.jsx | 4 | 33-37 | `AXIS`, `BARVAL` |
| src/ui/chart/Donut.jsx | 4 | 21-24 | `TOP`, `SUB` |
| src/ui/chart/Ring.jsx | 4 | 26-29 | `TOP`, `SUB` |
| src/ui/food/estimator.jsx | 3 | 118-120 | `CONF` |
| app/(auth)/sign-in.jsx | 2 | 12, 14 | `layout = T.layout`, `BG` (its `s` style object at :133-137 is also module-scope, with raw hex) |
| app/(app)/(tabs)/workout/index.jsx | 1 | 110 | `PAIR` (tapMin) |
| app/_layout.jsx | 1 | 42 | `BG = T.colors.rack` (root View, Stack contentStyle, pre-ready View) |
| src/ui/Dock.jsx | 1 | 21 | exported `DOCK_H` (unused elsewhere) |

**Moving to render-time reads is not enough on its own.** Three more problems:
- **(a) theme.js freezes values at load.** `tint` and `text` are precomputed. `type`, `alpha`, `face`, `loadNum` and `layout.sheetMaxH` close over module bindings. A vibe has to **rebuild every one of them**, not just swap `colors`. Otherwise every `T.type({...})` call (158 sites) keeps v1 chalk as its default colour.
- **(b) React will not re-render screens when a parent re-renders.**
  - expo-router wraps every screen in `StaticContainer` (node_modules/expo-router/build/react-navigation/core/SceneView.js:134), which only updates when route or navigation props change.
  - `CoachCard` is `memo()`'d (src/ui/coach/Card.jsx:249).
  - No theme context exists; `AuthContext` is the only context. 251 of the 294 top-level component functions in the 80 files read `T`.
  - Only a context consumer or a `key` remount reaches them.
- **(c) Reanimated worklets capture `T`.**
  - The two sites: SetRow.jsx:206-208 (`interpolateColor(… [T.tint.coachLow, T.tint.coachHigh])`) and :219-222 (`T.tint.setFlash` / `setDone`).
  - In dev, `freezeObjectInDev` (node_modules/react-native-worklets/src/memory/serializable.native.ts:679) turns captured objects into frozen getters and calls `preventExtensions`, so later writes only log a warning and are dropped.
  - Clones are also cached by object identity (:483), so the UI thread keeps stale values even in release builds.
  - **Rule:** never mutate `T` or its nested objects in place. Reassign fresh objects instead, and hoist `const low = T.tint.coachLow` etc. into render scope so the worklet captures plain strings.

### 3. Raw colour literals outside theme.js

- **Hex, 45 quoted literals in 12 files:**
  - `app/(auth)/sign-in.jsx` (15): `#fff` at 79/120/121/135, `#8b929c` at 80/125/133, `#5a616b` placeholders at 94/107, `#ff6b6b` 113, `#6fcf97` 114, `#2b6b45`/`#2aa85c` 117, `#1c1f25` and `#2a2e36` at 135-137. These are not theme values; the screen was never moved onto the theme.
  - `src/pure/analytics.js:652-655` (7): the `PALETTE` and `groupColor` fallback.
  - `src/state/workout.js:1773-1774` (6): `PLATES` (§7.11 says "do not merge" with GROUPS).
  - `src/pure/exercises.js:14-19` (6): `GROUPS[..].color`, written in **uppercase** hex.
  - `app/_layout.jsx:72, 92, 93`: `#fff` in the dev/guard banners.
  - `src/ui/food/common.jsx:411`: `#1e1f1e` / `#17181a` (hero/lit tiles).
  - `shadowColor '#000'` in food.jsx:729, RestOverlay:129, PeekBar:68, ToastHost:50 and TourOverlay:78.
  - `app/(app)/scan.jsx:93`: `#000` camera background.
- **rgba, 9 real sites:**
  - `you/verdicts.jsx:151-153` (green/red/yellow at .18) and :330-331 (yellow .07/.18).
  - `onboarding/TourOverlay.jsx:66`: gradient `rgba(20,22,26,.55/.94/.94)`.
  - `you/cards.jsx:163`: `rgba(232,229,222,0.14)` (pWhite at .14).
- **Named colours:** only `'transparent'` (23 uses in 13 files), which is fine.
- **Colour props that aren't styles:**
  - `placeholderTextColor={T.colors.dim}` ×12.
  - `keyboardAppearance="dark"` ×14. The 2 TextInputs in sign-in don't set it.
  - `selectionColor`/`cursorColor` appear nowhere, so the caret uses the iOS system tint.
  - Switch at coach/settings.jsx:125-129 is themed.
  - `ActivityIndicator` at waiting.jsx:207 (steel), estimator.jsx:568 (pYellow), sign-in:120 (`#fff`).
  - `DateTimePicker` at weight.jsx:225 has no `themeVariant`; it relies on the app-wide dark mode.
- **System-font text:** 76 of the 405 Text/TextInput sites have no Archivo face in their style, so they render in SF. These include the glyph icons, small meta labels, sign-in, the banners, and lines like `{fontSize:12,color:T.colors.dim}`. For v1 they must stay SF.
- **How much layout is tokenised:**

| Property | Raw numbers | Via `T.` |
|---|---|---|
| fontSize | 166 | 0 |
| lineHeight | 68 | 0 |
| letterSpacing | 34 | 0 |
| borderWidth | 108 | 0 |
| padding | 135 | 164 |
| margin | 214 | 293 |
| gap | 89 | 84 |
| borderRadius | 62 | 96 |

  Spacing and shape are only about half tokenised.
- **Shared components are where a deep layout change has the most reach:** Btn (206 uses), Note (198), Field (69), Stat (53), Card (31), Chip (23), Segmented (14), plus the Sheet host and Dock. But 22 hand-rolled "card" Views use `backgroundColor: T.colors.bar` directly and bypass Card.
- **Colour tokens do double duty:**
  - `pYellow` (79 uses) is both the accent and the legs/15kg plate colour.
  - `#14161a` is both the page (`rack`) and `onPlate`.
  - New vibes need separate semantic tokens for these.
- **`T.colors` usage:** dim 146, collar 127, chalk 124, steel 87, pYellow 79, rack 59, knurl 33, pBlue 26, bar 25, good 22, pGreen 20, pRed 18, warn 13, bad 9, pWhite 6, onYellow 6, pChrome 4, onGreen 2, white/pYellowPressed/onPlate 1 each.

### 4. Charts (`src/ui/chart/`, 9 files, 905 lines)

- **All import `T` directly.**
- **Series colours arrive as props with `T` defaults.** Defaults are evaluated per call, so they are fine:
  - `BarChart color=pBlue`
  - `LineChart color=pYellow`, `color2=chalk`
  - `Ring color=pYellow`
  - `Sparkline color=pYellow`
  - `HeatStrip color=pYellow`
  - `Donut` takes `segments[].color`
  - `Legend` takes `items[].color`
- **Grid, track and label colours are hard-referenced:** `T.colors.collar`, `knurl`, `steel`, `dim`, `chalk`.
- **Module-scope text styles (stale):** BarChart:33-37, Donut:21-24, Ring:26-29.
- **SVG gradients:** react-native-svg `LinearGradient`/`Stop` with the series colour at opacity .28/.32 (LineChart:96, Sparkline:109).
- **Group colours come from three tables:**
  - `groupColor()` (analytics.js:651-655), called in workout/summary:273, stats/index:212/216, coach/sheets:578, train/stats:119/160/196/374, DayEx:40, you/cards:539/544/573.
  - `GROUPS[g].color` (exercises.js), used in workout/index:238/274/432, session:642, picker:620, routines:133/225/516. verify-record-groups:228 reads it.
  - Plate chips: `PLATES[].c` → SetRow.jsx:346.
- **Subject and admin maps:** bits.jsx:406-423 and admin/sheets.jsx:73.

### 5. Icons

- **No icon library.** Icons are inline react-native-svg paths on a 24-unit viewBox, stroke-only, round caps and joins.
  - `src/ui/Dock.jsx:23-33` `ICONS`: you, workout, food, weight, steps (stroke 1.9, 22pt, "index.html:100-126 verbatim").
  - `src/ui/food/common.jsx:357-367` `ICON_PATHS`: plus, camera, pen, barcode, keypad, book, stack, spark. The `FoodIcon` component is at :370 (default stroke 1.8, 19pt). This is the only reusable icon component.
  - `src/ui/coach/Card.jsx:64-77`: chat bubble, and lock/unlock (Rect + Path).
  - `src/ui/you/Hero.jsx:40-44`: settings gear (17pt).
  - `app/(app)/(tabs)/steps.jsx:113-117`: gear (Circle + Path, 16pt). :291-302 is the progress ring.
  - `app/(app)/(tabs)/workout/session.jsx:320-324`: calendar.
  - `app/(app)/(tabs)/food.jsx:957-981`: water-bottle illustration (clip path + waves). :260 and barGuide.jsx:194 are marker lines.
- **Unicode glyphs used as icons (these render in SF):**
  - `⚙` Fuel NavBtn at food.jsx:1628.
  - `‹ ›` day/month nav at food.jsx:1629/1632 and workout/index.jsx:179/183; "‹ Back" at admin:154 and train/stats:62.
  - `›` row chevrons at settings/Row.jsx:41, admin:560, meals:150, picker:630, routines:152.
  - `✕` at food:1111/1271, weight:728, session:565, common:564/858, waterSettings:197, meals:157, routines:475.
  - `⋯` at food:435/939/1664, session:654, routines:528, bits:90.
  - `✓` at session:551, SetRow:292, common:733.
  - `✎` at common:547; `↳` at SetRow:106; `▴▾` at coach/goal:258; `⚠` at food:1520 and _layout:73; `↑↓` in bits.
- **No bitmap UI art exists.** `<Image>` is only used for user photos (Hero:96, settings/index:571, estimator:464). Iron Age images would be the first bundled pictures. There is no expo-image; RN `Image` with `require()` works.

### 6. Chrome, status bar and assets

- **StatusBar:** `<StatusBar style="light"/>` at app/_layout.jsx:316 and ErrorScreen.jsx:76 only.
- **app.json:**
  - `userInterfaceStyle:"dark"` (this forces the dark keyboard, date picker and alerts).
  - `backgroundColor` and `splash.backgroundColor` are `#14161a`, with no splash image. `splash-icon.png` exists but nothing references it.
  - `icon: ./assets/icon.png` (1024², RGB).
  - The `expo-splash-screen` and `expo-font` plugins have no options.
- **Generated Info.plist:** `UIUserInterfaceStyle Dark`, `UIStatusBarStyleDefault`, VC-based status bar `false`.
- **Native changes need prebuild plus a new binary.** No installed module supports per-vibe app icons (alternate icons).
- **useAppTop.js:** `T.layout.appTop(useSafeAreaInsets())` = top inset + 10. verify-top-inset.mjs holds every screen to it.
- **expo-blur:** Dock.jsx:45 `BlurView intensity={40} tint="dark"`, with the `T.tint.dockGlass` underlay at :59.
- **expo-linear-gradient:** train/stats.jsx:257 (PR row, `T.alpha.yellow(.09→0)`) and TourOverlay.jsx:65 (raw rgba).
- **JS splash:** `src/ui/Splash.jsx` (six animated plate bars, `T.motion.bezier`). It is shown by `app/(app)/index.jsx` and during `(app)/_layout` boot.
- **Sheets:** `SheetHost` (src/ui/Sheet.jsx:23) is mounted at the root (_layout:345), **outside the Stack**. It keeps the stack of open sheets in its own state; `sheet.js` stores render functions.
- **Other root siblings:** TopBars (:318; includes the trial banner in pYellow/onYellow), SyncPip, ToastHost (chalk background, rack text), KeypadDoneBar.
- **`assets/`:** icon.png, splash-icon.png, favicon.png, three android-icon PNGs, rest-done.wav. No fonts folder.
- **Settings hub (`src/ui/settings/index.jsx`):** sections You, Fuel, Steps, Train, Coach, App. Vibes fits under App. It is opened from the You-tab gear (you/index.jsx:135/174).
- **Persistence:** LS keys are `rack:<uid|anon>:<k>` (src/data/ls.js:23) and are hydrated only after auth. So sign-in, the gate screens and the splash render before the vibe is known; use v1 there, or an `anon` key. Adding a synced account-level setting would need a new database node and a rules change. CLAUDE.md says the port adds neither and needs neither, so make vibe device-local.

### 7. Existing verifiers that touch the theme

- **These four parse theme.js as text and break if its shape changes:**

| Verifier | How it reads theme.js | What it checks |
|---|---|---|
| `tools/verify-text-color.mjs:52-68` | Regex-replaces the exact line `import { Platform } from 'react-native';` with a stub, writes `tools/.theme-resolved-<uuid>.mjs`, then dynamic-imports it | (1) every `text` preset and `loadNum(n)` has a `color` at runtime; (2) every `<Text>`/`<TextInput>` style expression names a colour. Nested Text is exempt. Has a `--canary` mode. |
| `tools/verify-coach-surface.mjs:562-572` | Same stub, copied into a tmpdir | Theme values; also :2407-2413 checks `CARD_FACE` advances against the Archivo TTFs |
| `tools/sweep-text-metrics.mjs:91-107` | Regex `export const text = \{([\s\S]*?)\n\};` plus per-line `name: type({...})`; hardcodes `MIN_LH=1.088` at :46 | Text metrics against the source CSS |
| `tools/verify-keypad-done.mjs:114-131` | Slices the text of `export const layout = {` and `export const space = {`, then evals it with `new Function` | Keypad bar arithmetic with the real layout/space numbers |

  They stop working if theme.js stops being one self-contained file with those literal shapes, or if it gains a relative import (the stubbed copy lives in `tools/` or a tmpdir, so `./vibes/x` won't resolve).
- **These load the real module and survive a refactor:** they use `R.load('src/ui/theme.js')` via `tools/lib/rn-render.mjs`, which compiles the source with babel. verify-top-inset, verify-error-boundary (:232, and :387 asserts rack/chalk/yellow), verify-usda-desc, verify-your-goal, verify-custom-movement, verify-drop-sets, verify-estimate-row, verify-fuel-note, lib/food-render.
- **Reusable for the zero-visual-diff proof:**
  - `tools/lib/rn-render.mjs` runs React 19's reconciler over a stand-in DOM. Every RN and svg host records its props: the `HOST` map, `hosts()`, and `styleOf()` to flatten styles.
  - `tools/verify-top-inset.mjs:161-196` already mounts 12 screens against the real store.js over a Firebase stub: You, Train, Fuel, Weight, Steps, Stats, one-lift Stats, Admin, Summary, Session idle, Session live, Recap.
  - Gaps to close:
    - `Tabs` and `Stack` are stubbed to null, so the Dock and the tabs layout are never drawn.
    - "Native" packages (expo-blur, expo-linear-gradient, DateTimePicker) are drawn as nothing.
    - No sheets are drawn.
- **Text fitting is tied to Archivo:**
  - `src/pure/coach-view.js:1487-1500` hardcodes `CARD_FACE`, the advance widths for Archivo 600 and 400. `textLines` and `finishFit` use it, and so does :1008-1042.
  - Constants `CARD_PAD 14`, `CARD_BORDER 1` (:1401-1402), `CARD_GUTTER 16` (:1484).
  - verify-custom-movement:594 and verify-estimate-row also use Archivo 600 advances (via tools/lib/ttf-advance.mjs).
  - **A vibe that changes the font or the card padding breaks Coach-card fitting** unless it keeps Archivo on those surfaces or generates its own advance tables with ttf-advance.

### Engine seam for native: recommendation

1. **Keep theme.js as the one self-contained module and the only import** (`import T`).
   - Leave the v1 literal tables exactly where they are, so the four text-parsing verifiers keep working (or update those four loaders in the same commit).
   - Add `build(vibe)`. It returns a complete object: `colors`, `alpha`, `tint`, `space`, `radius`, `layout`, `motion`, `face`, `type`, `text`, `loadNum`, plus new semantic slots. Every function in it must close over the vibe it is given, never over module bindings.
   - `T` stays a stable default-export object. Switching does `Object.assign(T, build(next))`: its top-level properties are reassigned to fresh objects, and nothing nested is ever mutated (because of the worklet freeze and clone cache).
   - Verifier: `JSON(build(V1))` deep-equals today's exports, including sampled function outputs such as `type(...)`, `face(88,650)` and `alpha.yellow(.16)`.
2. **Add new tokens first, with v1 values identical to today.**
   - Separate accent from legs, and page from onPlate.
   - `T.group(g)`, `T.plate(i)` and `T.subject(k)` replace `groupColor`, `GROUPS[].color`, `PLATES[].c` and `SUBJECT_COLOR`/`C_*` at the call sites. Leave the pure modules untouched, since verifiers read them. Note the uppercase hex in exercises.js: normalise case in the diff, or keep the original strings for v1.
   - Chrome tokens: statusBar `'light'`, keyboard `'dark'`, blurTint `'dark'`, shadow `'#000'`, datePicker variant, and a "system font" value for the 76 SF text sites (v1 = no fontFamily).
   - Add the sign-in palette as its own v1 token set.
3. **Mechanical fixes:**
   - The 14 files with module-scope reads (76 refs) become functions or render-scope reads.
   - SetRow's two worklets capture hoisted strings instead of `T`.
   - About 10 files of raw literals become tokens, and about 10 group-colour call-site files switch to `T.group(g)`.
   - New static verifiers: no module-scope `T.` reads (AST), no `T.` inside `useAnimatedStyle`, and no colour literal outside theme.js except `'transparent'`.
4. **Switching mechanism (trade-offs):**

   | Approach | Good | Bad |
   |---|---|---|
   | **Keyed remount (recommended)** | Reliable: nothing is missed. Module stores survive: workout session, food day, rest timer, sheets. The Vibes sheet stays open and repaints live. | Resets local component state (scroll position, calendar month, open disclosures). Brief re-mount. |
   | Live re-render via context (`const T = useT()` or a subscribe hook in each component) | No navigation reset. Context gets through StaticContainer and memo. | Touches all 80 theme importers and 251 components. Any one missed stays stale. |
   | Root key (app/_layout.jsx:323, already `key={uid}`) | One-line change. | Re-runs `(app)/_layout` `boot()` (init*, JS Splash) and `restoreRoute`, which lands on openOn/lastView/session rather than where the user was. |
   | Reload / apply on next launch | Zero risk. | Poor UX. `expo-updates` isn't installed, so there's no `reloadAsync`; `DevSettings.reload` is dev-only. |

   How the keyed remount works:
   - A new `src/state/vibe.js` store in the house pattern, with an LS key `vibe` (device-local, per uid).
   - `app/(app)/_layout.jsx:212` gets `<Stack key={vibeVersion}>`.
   - On a switch, capture `usePathname()` and feed it through the existing `target`/`router.replace` effect (:175-184) so the user lands back on the same route.
   - The root siblings outside that Stack subscribe to the store with `useSyncExternalStore`: TopBars, SyncPip, SheetHost, ToastHost, KeypadDoneBar, the root View BG (:42) and StatusBar (:316).
5. **Fonts.**
   - `face()` returns `<Family>_<wght>`, and the useFonts keys must match.
   - Either load every vibe's faces at boot, which adds startup time and bundle size (the team already cut 2.2MB to 480KB), or `Font.loadAsync` on selection and gate the switch on that promise.
   - Weight snapping has to be per family.
   - Coach-card advance tables have to be per font.
   - Google-font packages are OFL, the same licence as the Archivo already shipped.
6. **Zero-diff proof.**
   - Build a snapshot verifier on rn-render plus the verify-top-inset screen list.
   - Add the Dock/TabsLayout, SheetHost with the Settings hub, and BlurView/LinearGradient/StatusBar as prop-recording stubs.
   - Before the engine lands, dump every host's type, flattened style and colour/svg props (fill, stroke, stopColor, placeholderTextColor, trackColor, etc.) to committed JSON.
   - After it lands, require byte-identical output for v1.
7. **Rough file count.**
   - Engine plus v1 with the keyed remount: about 35–45 files. That covers theme.js, the new state/vibe.js, both layouts, the 14 module-scope files, about 10 literal files, about 10 group-colour call sites, settings/index.jsx plus a new Vibes sheet, up to 4 verifier loaders, and the new verifiers.
   - The live-context approach touches all 80 theme importers.
   - The two deep-layout vibes additionally go through the 9 shared components and the 22 hand-rolled card Views.


---

# Screens

## Rack Vibes: code map for the overnight prompt (web rack-v58 + native rack-mobile)

### 0. How the look is wired today (what the engine has to replace)

**Web (`/home/claude/lift-cal`)**
- Colour and shape tokens live on `:root` in `rack.css:4-49`: surfaces `--rack/--bar/--collar/--knurl`, text `--chalk/--steel/--dim`, plates `--p-red/blue/yellow/green/white/chrome`, `--good/warn/bad`, `--r:12px`, `--r-sm:8px`, `--pad:16px`, `--ease/--fast/--med`, `--dock-h:64px`.
- The font comes from a Google Fonts `@import` of Archivo with variable `wdth` and `wght` axes (`rack.css:1`). The family is set on `html, body` (`rack.css:~55`). There are **126 `font-variation-settings` declarations** across 29 wdth/wght combinations. The most common is `'wdth' 88,'wght' 700` (26 times).
- Colour that bypasses the tokens:
  - `rack.css`: 8 hex literals outside `:root` (`#141414`×3, `#fff`, `#d9a90f`, `#14161a`, `#0d1a11`, `#000`).
  - `rack.css` + `auth.css`: 74 `rgba()` literals. 39 of them are the yellow accent as `240,190,30`, then 8 black, 7 red, 7 ground, 6 blue, 5 green, 2 white.
  - JS inline hex:
    - `exercises.js:6-11`: GROUPS muscle colours.
    - `analytics.js:616-619`: PALETTE / `groupColor`.
    - `workout.js:1386-1387`: plate colours.
    - `access.js:315,389`: auth-mark plates.
    - `store.js:520,528`: error banner `#7f1d1d`.
  - `index.html:5` sets `theme-color #14161a`, and `index.html:26-33` has inline plate colours.
  - `manifest.json` sets background and theme colour to `#14161a`.
  - `you.js:868-891` passes bare rgb channels (`rgb:'240,190,30'`) into `--kpi-rgb` (`rack.css:1913-1915`).
- JS reads `var(--…)` 110 times in inline styles (steps 21, food 18, you 16, admin 10, …). The subject colour constants are `you.js:100-109` (`C_FUEL = 'var(--p-yellow)'` and so on).
- There is no screenshot harness in the repo (no puppeteer or playwright). `report/` holds loose before/after PNGs only (`you-before.png`, `dock-320-*.png`).
- Six `tools-check/*.mjs` files read `rack.css` text: coach-surface, drop-sets, estimate-ask, recap, tick-targets, touch-target. Renaming classes or tokens will break them.

**Native (`$HOME/mnt/dev/rack-mobile`)**
- `src/ui/theme.js` (333 lines) is one **static default-exported object `T`**: `colors, alpha, tint, space, radius, layout, motion, face, type, text, loadNum`. It is imported by **80 files**. There are 0 `StyleSheet.create` calls; every style is an inline object built at render time.
- Reference counts:

  | Group | Refs | Breakdown |
  |---|---|---|
  | `T.colors.*` | 809 | dim 146, collar 127, chalk 124, steel 87, pYellow 79, rack 59, knurl 33, pBlue 26, bar 25, … |
  | `T.type(` inline | 155 | |
  | `T.face(` | 71 | |
  | `T.text.*` presets | ~115 | |
  | `T.radius` | 97 | sm 54, r 16, pill 13, … |
  | `T.tint`/`T.alpha` | ~60 | |

- **28 module-level constants capture colours at import time.** They will not react to a runtime theme switch unless they become functions or hooks:
  - `Btn.jsx:20,26,35` (BG/FG/BORDER)
  - `chart/Ring.jsx:26,28`, `chart/Donut.jsx:21,23`, `chart/BarChart.jsx:33,36`
  - `you/bits.jsx:114,116` (DELTA_FG, PILL_BG), `bits.jsx:406` (SUBJECT_COLOR), `bits.jsx:416-423` (C_FUEL…C_FAT)
  - `train/SetRow.jsx:82` (TINT), `Splash.jsx:18` (PLATES), `food/estimator.jsx:117` (CONF)
  - `admin/sheets.jsx:73,82`, `you/admin.jsx:77`, `app/_layout.jsx:42` and `(auth)/sign-in.jsx:14` (BG)
- Pure and state layers hardcode palettes: `src/pure/analytics.js:652-655`, `src/pure/exercises.js:14-19`, `src/state/workout.js:1773-1774`.
- Hardcoded hex or rgba inside UI:
  - `(auth)/sign-in.jsx:79-137` is **entirely off-theme**: `#fff`, `#8b929c`, `#5a616b`, `#ff6b6b`, `#6fcf97`, `#2aa85c`, `#1c1f25`, `#2a2e36`, `fontWeight:'700'` (system font, not Archivo).
  - `app/_layout.jsx:72,92,93` (`#fff` banners)
  - `food/common.jsx:411` (`#1e1f1e`, `#17181a`, add-menu tiles)
  - `you/verdicts.jsx:151-153,330-331` (rgba status tints)
  - `you/cards.jsx:163` (`rgba(232,229,222,0.14)`)
  - `onboarding/TourOverlay.jsx:66` (gradient)
  - Shadows `#000`: `food.jsx:729`, `RestOverlay.jsx:129`, `PeekBar.jsx:68`, `ToastHost.jsx:50`, `TourOverlay.jsx:78`
- Fonts:
  - Only Archivo 400/600/700/800 are loaded, from `@expo-google-fonts/archivo` (`app/_layout.jsx:19-22,200-207`).
  - `face(wdth,wght)` returns `Archivo_<wght>`; wdth is ignored (`theme.js:~203`), and 650/750 snap up.
  - `type()` defaults colour to chalk. The comment at `theme.js:~245` records an earlier black-text-on-black ship bug.
  - Line height is clamped to ≥1.088 (`MIN_LH`).
- Other native facts:
  - `app.json`: `userInterfaceStyle: dark`, splash `#14161a`; `StatusBar style="light"` (`app/_layout.jsx:316`).
  - `expo-blur`, `expo-linear-gradient`, `react-native-svg` and reanimated are installed. **`expo-image` is not.** RN `Image` is used only for the avatar and the meal photo.
  - `assets/` holds only app icons, the splash icon and `rest-done.wav`. **No bundled images or fonts beyond npm Archivo.**
- Verifiers that parse `theme.js` or style source (will break on a refactor): `tools/verify-text-color.mjs`, `verify-coach-surface.mjs`, `verify-top-inset.mjs`, `sweep-text-metrics.mjs`, plus 8 more that grep `T.colors` (custom-movement, drop-sets, error-boundary, estimate-row, fuel-note, keypad-done, usda-desc, your-goal).
- **Coach card height is load-bearing.** It is 190pt on You and 164pt on Train, computed by `cardLayout()` in `src/pure/coach-view.js:1401-1427` (`CARD_PAD=14`, `CARD_BORDER=1`, `CARD_TYPE`) at the live Dynamic Type size, and checked by `verify-coach-surface.mjs`. Any vibe that changes coach padding, border or type sizes has to go through that function.

---

### 1. Native inventory

#### 1a. Routes (15 screens, 8 layouts)

| Route file | Shows | Main visual elements | Hero boxes | Dense boxes |
|---|---|---|---|---|
| `app/_layout.jsx` (359) | Root: auth/gate/app switch | StatusBar, TopBars (owner/dev banner `:72`, red "why" bar `:92`), TrialBanner `:133`, SyncPip, SheetHost, ToastHost, KeypadDoneBar, ErrorScreen boundary | none | banners |
| `app/(app)/_layout.jsx` (232) | Boot phases; Setup rendered directly (`:206`); Stack with `scan` as fullScreenModal (`:222`) | Splash while booting | Splash | none |
| `app/(app)/index.jsx` (8) | `<Splash/>` | six animated plate bars | Splash | none |
| `(tabs)/_layout.jsx` (58) | Tabs You/Train/Fuel/Weight/Steps with custom `Dock`; siblings PeekBar, RestOverlay, TourOverlay | dock | none | none |
| `(tabs)/you/index.jsx` (219) | You tab | `Hero` (avatar 52, greeting with yellow first name, date, gear) → CoachCard → Sections "How you're doing" (AssessCard wins/improve), "Goal" (TrajectoryCard), "This week" (WeekCard 2×2 Kpi), "Rack noticed" (InsightsCard), "Trends" (WeightCard, FuelCard, TrainingCard, Steps+Water GoalCard pair `:178`), "Weekly review" (ReviewCard), "App" (Admin row) | Hero greeting block (`Hero.jsx:54-150`); CoachCard (fixed 190); Section header strips; AssessCard tops; Steps/Water pair (Ring 84) | Kpi tiles, FindingRows, VolRows, MiniStats, charts, StatRows |
| `(tabs)/you/admin.jsx` (744) | Owner analytics | Sections: At a glance (two 3-StatRows `:215,:220`), Feature usage (YouCard, BarChart, Donut, Legend), counter table, usage over time (LineChart), Accounts (search, Chip filter, AccountRow), Quota (StatRow `:592`), People & access | none (tool screen) | everything |
| `(tabs)/workout/index.jsx` (512) | Train calendar | Eyebrow "Training log" + h1 month + ‹ › NavBtn; DOW strip; month grid DayCell with plate bars; legend; 3-Stat month row `:253`; "Last 7 days — working sets" Card with volume bars; CoachCard tight (164) `:297`; Start workout / Continue (primary large); Routines + Exercises ghost pair; Statistics ghost; DaySheet `:448` | header block; CoachCard; Start-workout zone | calendar grid (muscle-colour data), stat row, volume bars |
| `(tabs)/workout/session.jsx` (744) | Live or edit session | TopBar `:270` (clock, LiveChip, calendar SVG `:324`, Finish/Save primary); EditMeta Card `:420`; LiftingBlock `:483` (superset blocks); ExerciseBlock `:587` (bar card, 4×30 group rail, name, ⋯, previous-sets line); SetTable header + SetRow per set in Swipe; PlateStrip; DropAdd; "+ Set"; NudgeLine; empty-session Card; danger discard | empty-session card only | **set rows, set table, plate strip, top bar** |
| `(tabs)/workout/summary.jsx` (324) | Post-workout recap | hero block (eyebrow + h1 headline `:100-101`), FeelCard with FeelChips `:169`, Wins (PRs/milestones/firsts PbRows `:263-307`), 3-Stat row `:111`, "did"/"like" Cards, primary Done, ghost Save-as-routine, ghost Stats | summary hero (headline); Wins card top | PbRows, stat row, exercise list |
| `(tabs)/workout/stats/index.jsx` (304) | Stats overview | PageHead, Segmented range, **three 3-StatRows** `:156,:161,:192`, BarChart ×2, HeatStrip, Donut + Legend, RankCards, primary button `:295` | PageHead | all |
| `(tabs)/workout/stats/[exId].jsx` (230) | One exercise | PageHead, two 3-StatRows `:146,:151` (best e1RM in yellow), Segmented, LineChart ×2, BarChart, SessRows | PageHead | all |
| `(tabs)/food.jsx` (1691) | Fuel day | header (Eyebrow "Fuel", h1 Today/date, **⚙ text glyph NavBtn** `:1628`, ‹ ›); summary Card (loadNum 40 kcal left, sub line, ⋯, CalMeter `:194`, 3 MacroRow `:159`); 4 MealCards `:391` with EntryRows `:447`; WaterCard `:855` with Vessel SVG `:952`; MicroCard `:484` (3-col grid `:498`); floating Fab `:713` | summary card top (big number); WaterCard vessel; empty meal cards | meter, macro rows, entry rows, micros grid |
| `(tabs)/weight.jsx` (734) | Weight | header (Body weight / Weight); log Card (TextInput + primary Log + DateTimePicker); Headline 3-StatRow `:278`; TrendCard with range Chips + adjusted Chips + LineChart `:298-363`; TimeOfDayCard (3-Stat buckets or LearnedCurve loadNum 28); MaintenanceCard (loadNum 32, ± eyebrow, MaintAsk); RecentCard (rows with ✕ `:728`) | log card; maintenance number block | stat row, chart, recent rows |
| `(tabs)/steps.jsx` (631) | Steps | header (Movement / Steps + SVG gear `:98-118`); TodayCard `:124` (StepRing SVG `:281`, loadNum 26, ghost + increments, primary Set); HealthLine `:208`; TrendCard (Chips, BarChart); StatsCard (two 3-StatRows `:420,:426`); Streak; Consistency (HeatStrip); By-day (BarChart); Recent rows | TodayCard (ring + number) | stats, charts, recent rows |
| `app/(app)/scan.jsx` (116) | Barcode camera (fullScreenModal) | black camera, torch, Btn ×3, Note | camera frame | none |
| `app/(auth)/sign-in.jsx` (139) | Sign in only (no sign-up mode) | "Rack" 34pt system font, 2 inputs, green button, forgot link, **all hardcoded** | title block | fields |
| `app/(gate)/waiting.jsx` (276) | Waiting / "One more step" | eyebrow, h1, Field ×3 (name, note, **invite code** `CodeField :83`), Btn ×3 | h1 block | form |
| `app/(gate)/paused.jsx` (147) | Account paused | eyebrow "Rack", h1, Note, sign-out link | h1 block | none |
| Layouts: `(auth)/_layout`, `(gate)/_layout`, `workout/_layout` (Stack: index, session, summary, stats), `stats/_layout`, `you/_layout` (Stack for admin) | | | | |

#### 1b. Chrome and overlays
- `Dock.jsx` (129): BlurView intensity 40, rgba under-layer, 5 SVG icons at `:23-31`, 26×2 yellow active mark.
- `PeekBar.jsx` (86): parked-workout glass bar.
- `RestOverlay.jsx` (144): rest pill.
- `LiveChrome.jsx` (77): session clock.
- `TourOverlay.jsx` (135): gradient scrim + card, "Tab n of 5".
- `SyncPip.jsx` (40), `ToastHost.jsx` (57, pill toast with shadow), `KeypadDone.jsx` (146, keyboard accessory, native-only).
- `ErrorScreen.jsx` (88): error boundaries for Fuel, Weight, Steps, You, Train.
- `Splash.jsx` (58).
- `Placeholder.jsx` (41): **dead, unused**.

#### 1c. Sheets
- API: `src/ui/sheet.js` has `sheet(render,{tall,scroll,dismissible})` at `:63`, `confirmSheet` at `:125` and `SheetTitle` (h2) at `:35`. The host is `Sheet.jsx` (114): backdrop `rgba(0,0,0,.6)`, `bar` panel, top radius 18, `knurl` top border and grab handle, max height 86% (92% for coach).
- Counts: **53 `sheet()` call sites in 20 files, 25 `confirmSheet`, 49 `<SheetTitle>`.**

Sheet openers by file:
- `food.jsx` (7): Entry, Add, Water, FuelSettings, RecallList, Targets, plus one more.
- `food/common.jsx`: ItemEdit, Library, Portion, Manual.
- `food/estimator.jsx` (7): DescribeFlow, RecallHit, Estimator, ProposedEdit, and others.
- `food/meals.jsx` (5): Meals, MealBuilder, Ingredient, and others.
- `food/paste.jsx` (2), `food/barGuide.jsx`, `food/waterSettings.jsx`, `food/aiSettings.jsx`.
- `settings/index.jsx` (3): Hub `:109`, Profile `:421`, Goal `:608`. `settings/refused.jsx`.
- `steps/sheets.jsx` (4): SetSteps, StepSettings, AutoGuide (IosPane/AndroidPane), AutoDetails.
- `train/picker.jsx` (4): Picker (FlatList), Manager, ExerciseEdit, Custom.
- `train/routines.jsx` (4): List, Detail, Editor, SaveAs.
- `train/stats.jsx`: PickerSheet.
- `coach/sheets.jsx`: CoachSheet (tall): Question, Proposal, ProPanel.
- `coach/goal.jsx`: YourGoalSheet, GoalChips, LiftTarget.
- `coach/live.jsx`: LiveSheet.
- `admin/sheets.jsx` (2): AccountSheet, AllowanceSheet.
- `you/bits.jsx`: whySheet.
- `workout/index.jsx`: DaySheet.

#### 1d. Shared components (`src/ui`)

| Component | Line count | What it draws |
|---|---|---|
| `Card.jsx` | 35 | `Card`, `CardHead`, `Eyebrow`: bar bg, 1px collar border, r12, pad 14, mb 12 |
| `Stat.jsx` | 26 | `StatRow` (row gap 8) + `Stat` (bar, r8, pad 10, statVal 20/800, statLbl 9pt uppercase) |
| `Chip.jsx` | 48 | pill; `on` is inverted chalk-on-rack; `ChipRow` is a horizontal scroller |
| `Segmented.jsx` | 57 | pill track; selected segment inverted |
| `Btn.jsx` | 102 | plain, primary (yellow on #141414), ghost, danger; `large` = uppercase .06em |
| `Note.jsx` | 12 | 12pt dim |
| `Field.jsx` | 71 | uppercase 10pt label over input on bar |
| `Swipe.jsx` | 116 | swipe to delete |
| `settings/Row.jsx` | 44 | `SettingsRow` label / value / › with hairline divider |
| `chart/` | | `LineChart` (189, gradient fill), `BarChart` (172), `Donut` (68), `Ring` (65), `Sparkline` (166), `HeatStrip` (75), `Legend` (100, inline or grid), `AxisLabel`, `EmptyChart` |
| `you/bits.jsx` | 423 | `Section` (uppercase + hairline `:42`), `YouCard` (duplicate of Card + eyebrow + sub + ⋯ why + optional 3px left accent `:61`), `ChartSub`, `Delta`/`Arrow` pills, `Headline`/`HeadlineV` (34pt)/`HeadlineU`, `Kpi` `:209` (radial-glow corner replaced by a flat tint block), `FindingRow`, `GoBtn`, `VolRow`, `MiniStats` `:380` (8.5pt labels) |
| `you/cards.jsx` | 712 | WeekCard, FuelCard, WeightCard, TrainingCard, GoalCard (Ring + BarChart + MiniStats), StepsCard, WaterCard |
| `you/verdicts.jsx` | 358 | AssessCard, TrajectoryCard (3-Stat rows `:199`, `:349`), InsightsCard, ReviewCard |
| `you/Hero.jsx` | 150 | You tab header (avatar, greeting, date, gear) |
| `coach/Card.jsx` | 249 | fixed-height card: speech-bubble `Mark` `:62`, `Lock` `:71`, COACH label, line, reason, COACH ME row |
| `coach/live.jsx` | | `LiveChip`, `NudgeLine` |
| `coach/settings.jsx` | | `ToggleRow` with RN `Switch` |
| `train/SetRow.jsx` | 356 | `SetTable`, `SetTypeBadge` (W/F/D tints), `SetNumInput`, `SetRow` (reanimated `interpolateColor` flash, green done tint, coach pulse), `DropAdd`, `PlateStrip` |
| `train/` (other) | | `DayEx.jsx` (day-sheet exercise line), `stats.jsx` (PageHead, StatsCard, EmptyState, GroupPill, RankCard, PrRow, PbRow, SessRow), `picker.jsx` (Search, ExRow, GroupChips, EquipChips, MoveChip/MoveRow), `routines.jsx` (RoutineRow, PreviewRow, EditorBlock, EditorExercise) |
| `food/common.jsx` | 987 | add-menu `ICON_PATHS` at `:357-367` (plus, camera, pen, barcode, keypad, book, stack, spark); add tiles `:395-420` with a "hero" Photo tile; Stepper; LibraryRow; proposed rows |
| `food/estimator.jsx` | 970 | estimator |
| `food/barGuide.jsx` | 227 | gradient swatches |
| `onboarding/Setup.jsx` | 575 | 8 steps `:54` (welcome, units, aboutYou, weighIn, goal, aim, activity, numbers), progress bar, `Choice` cards `:89` |

---

### 2. Web inventory

Routing is `app.js:220-235` `switchView()` toggling 5 `<section class="view">` from `index.html:88-94`. Dock markup with 5 inline SVGs is at `index.html:97-127`. Stats and Admin are not routes: they take over `#view-workout` (`stats.js:~50`) and `#view-you` (`admin.js:142-160`) in place.

The sheet primitive is `ui.js:24` `sheet(onClose)`, plus `confirmSheet` `ui.js:183`, `segmented` `ui.js:209`, `swipeToDelete` `ui.js:231`, `toast` `ui.js:42`, `noteEl` `ui.js:85`. Counts: **56 `sheet()`, 27 `confirmSheet`**.

| View | Web file:line | Contents (same shape as native unless noted) |
|---|---|---|
| Auth | `index.html:22-73`, `app.js:40-118`, `auth.css` | `.auth-mark` 6 plate bars; **sign-in AND sign-up with invite code** (native has sign-in only; code entry is on the gate) |
| Gate / Paused / Trial | `access.js:374` renderGate, `:298` renderPaused, `:355` mountTrialBanner | |
| Setup / Tour / Install guide | `onboarding.js:233` runSetup (steps array `:268`), `:700` runTour (TOUR `:682`), `:216` openInstallGuide | install guide is **web-only** |
| You | `you.js:519` render, `:553` build, `:650` hero | sections `:589-628`, cards `:796` week, `:907` fuel, `:1062` weight, `:1195` training, `:1317` goalCard, `:1455` assess, `:1485` trajectory, `:1592` insights, `:1607` review, `:1678` installCard (**web-only**), `:1698` adminRow; `kpi()` `:462` with radial-glow `--kpi-rgb` |
| Coach | `coach-ui.js:84` coachCard, `:262` openCoachSheet, `:888/995` toggle/answer rows, `:1146` openGoalSheet, `:1186` liveChip, `:1220` openLiveSheet, `:1383` nudgeLine | |
| Settings | `settings.js:119` openSettings | section order **You, Fuel, Train, Coach, Steps, App** (native: You, Fuel, Steps, Train, Coach, App); `:203` "Import workout history" (**web-only**, `importer.js:8`); `:240` refused-saves row; `:550` pickProfilePhoto; `:634` openGoal |
| Admin | `admin.js:142` (1609 lines) | same sections as native; own `statRow` `:1596` |
| Train calendar | `workout.js:384` renderCalendar, `:542` month stats, `:563` week volume, `:608` openDay | |
| Session | `workout.js:981` renderSession (`wk-bar` `:986`, calendar SVG `:1014`), `:1127` block, `:1199` exercise, `:1301` set, `:1397` plates, `:1456` rest pill, `:360` peek bar | |
| Summary | `workout.js:2045` (`summary-hero` `:2056`), `:1935` feelCard | |
| Stats | `stats.js:96` overview, `:370` detail, `:238` rankCard, `:308` picker, own `statRow` `:82` | |
| Picker / Routines | `picker.js:192` openPicker, `:334` manager, `:496` edit, `:644` custom; `routines.js:115` list, `:166` detail, `:259` editor, `:531` save-as | |
| Fuel | `food.js:510` render (SVG gear `:530`), `:562` FAB, `:574` summary, `:761` cal meter, `:889` meal, `:919` entry, `:931` micros | sheets from `:960` to `:3574`: entry, add menu (`ICON_PATHS` `:1158-1167`), library, item edit, meals, builder, ingredient, photo, describe, which-one, estimating, AI error/review, recall, proposed edit, AI settings, portion, manual, **scanner as a sheet `:2857`** (native uses a route), fuel settings, recall list, targets `:3161`, paste `:3448`, bar guide `:3574` |
| Water | `water.js:134` renderWater, `:262` sheet, `:332` settings | |
| Weight | `weight.js:70` render, `:228` chart, `:297` time of day, `:450` maint ask, `:506` recent | |
| Steps | `steps.js:144` render, `:179` today (ring), `:262`–`:437` cards, `:484` set steps, `:527` settings (goal only) | |

**On one client only**
- **Web only:** sign-up form, install card and install guide, Import workout history (Liftoff), desktop ≥900px width rule (`rack.css:688`).
- **Native only:** Splash; barcode as a full-screen route (`scan.jsx`); KeypadDone bar; ErrorScreen boundaries; HealthKit "Log steps automatically" guide and details sheets plus the HealthLine (`steps/sheets.jsx:233-420`, `steps.jsx:208`); "Refused saves" as its own sheet (`settings/refused.jsx`; web shows a row).
- Native sign-in is visually off-brand compared with the web auth box.

---

### 3. Shared UI vocabulary (the types a vibe must restyle)

| Type | Web (class / helper, count) | Native (component, count) |
|---|---|---|
| Card | `.card` 33 direct + `card()` helpers 22 (you, stats, admin) | `Card` 31, `YouCard` 31, `StatsCard`/`RankCard` 15, ExerciseBlock inline card, CoachCard 2 |
| Card head / eyebrow | `'eyebrow'` 92, `.card-hd` 27 | `Eyebrow` 78, `T.text.eyebrow` 25 |
| Section header (uppercase + hairline) | `section()` 22 (`.you-sec-t`) | `Section`/`Sec` 22 |
| Screen header (eyebrow + h1) | h1 20 | 5 tabs + PageHead + gates + summary |
| Sheet title (h2) | h2 50 | `SheetTitle` 49 |
| Stat tile / stat row | `.stat-row` about 22 sites, 3 duplicate `statRow()` helpers | `Stat` 53 in 19 `StatRow`s |
| KPI tile | `kpi()` 5 (4 on You) | `Kpi` 4 |
| Mini stat | `.mini-stats` (`you.js:1354`) | `MiniStats` 1 (2 cards) |
| Headline number | `load-num` 6, `.headline` | `loadNum` 6, `HeadlineV` |
| Chip | `'chip'` 21, `.filter-row` 17 | `Chip` 23 plus FeelChip, GoalChip, MoveChip |
| Segmented | `segmented()` 18 | `Segmented` 14 |
| Primary yellow button | `btn-primary` 59 | `Btn kind="primary"` 60 |
| Ghost button | `btn-ghost` 130 | 127 |
| Danger button | `btn-danger` 12 | 12 |
| Large uppercase button | `btn-lg` 27 | `large` 32 |
| Text field | `.field` 36 | `Field` 69 |
| Note | `noteEl` 183 | `Note` 198 |
| Toast | `toast(` 144 | `toast(` 148 |
| Sheet | 56 + 27 confirm | 53 + 25 confirm |
| Settings nav row | `navRow`/`.set-row-nav` 18 | `SettingsRow` 14 |
| List rows | entry, recent, PR/PB, session, rank, ex-item, routine, account rows | EntryRow, RecentRow, PrRow, PbRow ×5, SessRow, ExRow ×2, RoutineRow, PreviewRow ×2, AccountRow, PickerRow, FindingRow ×3, VolRow |
| Set row | `.set-row` (`rack.css:472-551`; **name clash** with `.set-row-nav` settings rows) | `SetRow` + `SetTable` + `SetTypeBadge` + `PlateStrip` |
| Swipe to delete | 5 | 3 |
| Line / bar chart | `lineChart` 5, `barChart` 9 | 5, 9 |
| Donut / ring / sparkline / heat strip / legend | donut 3, ring 3, sparkline 1, heatStrip 2, `legendRow`/`legendGrid` 5 | Donut 2, Ring 1 + StepRing, Sparkline 1, HeatStrip 3, Legend 5 |
| Calendar grid | `.cal-*` | DayCell |
| Dock | 1 | 1 |
| FAB | `.fuel-fab` | `Fab` |
| Add tiles | `.add-tile` | `food/common.jsx:395` |
| Rest pill / peek bar / live chip / sync pip / trial bar / tour card | 1 each | 1 each |
| Avatar, gear, ⋯ "why" button | | |

**Icon set to redraw for Iron Age: about 20 SVG icons plus 8 text glyphs**
- SVG icons:
  - Dock: you, workout, food, weight, steps.
  - Gear: `you.js:695`/`Hero.jsx:38`, a different path at `steps.js:160`/`steps.jsx:113`, `food.js:530`.
  - Calendar: `workout.js:1014`/`session.jsx:324`.
  - Coach bubble and lock: `coach-ui.js:47,64`/`coach/Card.jsx:62-77`.
  - Add-menu set of 8.
  - Water vessel.
- Text glyphs: ⋯ ‹ › ✕ ✓ ↳ ✎ ⚙ (native Fuel only).

---

### 4. "AI-made tells" census

1. **Tiny uppercase letter-spaced labels: pervasive.**
   - Web: 36 `text-transform:uppercase` rules in `rack.css` (dock `:137`, `.eyebrow :159`, `.btn-lg :208`, `.field label :234`, `.cal-dow :283`, `.stat-lbl :354`, `.set-hd :468`, `.seg-btn :787`, `.kpi-lbl :1752`, `.you-since :1350`, `.you-sec-t :1381`, `.coach-ttl :2092`, `.mini-stat-l :1885`, …) plus 4 in `auth.css`. Letter-spacing runs .1–.16em on 26 rules. `.eyebrow` is 10px/.16em (`rack.css:158-162`) and is used 92 times.
   - Native: presets `eyebrow`, `statLbl` (9pt), `fieldLbl`, `dockLbl`, `segBtn` and `btnLg` are all uppercase (`theme.js:~305-318`), plus 33 inline `upper:1` outside `theme.js`.
   - Rendered sites on native: about 78 Eyebrow + 25 eyebrow preset + 53 stat labels + 69 field labels + 22 section headers + 14 segmented + 32 large buttons + 5 dock labels.
   - Smallest sizes: 7.5pt `Ring.jsx:28`, 8.5pt `bits.jsx:392`, 9pt stat label.
2. **Middle-dot separators.**
   - Web: about 93 in non-comment lines (food 32, workout 10, stats 8, you 8, admin 7, weight 5, steps 4, …). Examples: `coach-ui.js:1390` `'Coach · '`, `admin.js:715`.
   - Native: 108, including pure/state strings that reach the UI. Examples:
     - `Hero.jsx:73` "Member since … · N days"
     - `food.jsx:1651` "eaten · target"
     - `food.jsx:1147-1149` "kcal · P · C · F · maint"
     - `weight.jsx:427` "Morning · 3"
     - `steps.jsx:164,177`
     - `workout.js`/`state/workout.js` 10
     - `coach-view.js` 8
3. **Rows of three stat tiles.**
   - Web: `.stat-row` is hard-wired `repeat(3,1fr)` at `rack.css:351`, plus `.micro-grid` (`:708`), `.you-grid-3` (`:1374`) and `auth.css:209`.
   - Native: all **19 StatRows are exactly 3 tiles**. Stacked double or triple rows appear at `stats/index.jsx:156,161,192`, `[exId].jsx:146,151`, `steps.jsx:420,426` and `admin.jsx:215,220`. MicroCard is also 3 columns (`food.jsx:498`).
4. **Identical rounded cards everywhere.**
   - Every card is `#1c1f26` bg, 1px `#262a33` border, radius 12, padding 14, margin-bottom 12 (`rack.css:173-179`, `Card.jsx:24-33`, duplicated in `YouCard` `bits.jsx:63-70`).
   - Web has 18 rules with `background:var(--bar)` and 31 with `border:1px solid var(--collar)`. Native has about 80 card instances in source.
   - The only variation is a 3px coloured left rule (`rack.css:2001-2002`, `bits.jsx:70`).
   - Each tab is eyebrow + H1, then a vertical stack of identical cards.
   - Other generic patterns: a section title with a trailing hairline (`bits.jsx:42`, `settings/index.jsx:329`); a radial corner glow on KPI tiles (`rack.css:1915`); a frosted-glass dock (5 `backdrop-filter`s, `BlurView`); a single yellow accent carried in 39 rgba literals.
5. **Emoji.** No pictographic emoji (U+1F300 and up) in either client. Dingbat and symbol glyphs stand in for icons:
   - ✕: native 9 rendered, web `food.js:2288,2414,3127`, `workout.js:1168`, `routines.js:350`, `weight.js:525`.
   - ✓: set check `workout.js:1347`, `SetRow.jsx:292`; "/ week ✓".
   - ⚠: `app/_layout.jsx:73`, `food.jsx:1520`.
   - ✎: `common.jsx:547`.
   - ⚙: rendered as a button only at native `food.jsx:1628`; elsewhere in note text.
   - On iOS, ⚙ and ⚠ may be drawn as colour emoji without a U+FE0E selector. There are 0 FE0E in either repo. **Unverified on device.**

---

### 5. Unknown or not checked
- Exact rendered look on device or browser (no screenshots taken; no harness exists in the web repo).
- Whether the Dynamic Type Coach layout tolerates a different font's metrics (`MIN_LH`/`CARD_TYPE` assume Archivo's hhea 878/-210).
- Web chart SVG text fonts (they inherit; not traced).
- Native HealthKit screens only partly read.
- Every sheet's inner layout was mapped by title and component census, not line by line.

---

### 6. Summary table

| Screen | Web file | Native file | Hero boxes (image-friendly) | Dense boxes (no images) |
|---|---|---|---|---|
| Sign-in / sign-up | `index.html:22`, `app.js:40`, `auth.css` | `(auth)/sign-in.jsx` | plate mark + title; whole backdrop | form fields |
| Gate / invite / paused | `access.js:374,:298` | `(gate)/waiting.jsx`, `paused.jsx` | h1 block, backdrop | form, code field |
| Splash | (auth-mark only) | `Splash.jsx`, `(app)/index.jsx` | full screen | none |
| Setup (8 steps) | `onboarding.js:233`, `auth.css .ob-*` | `onboarding/Setup.jsx` | welcome step, step kicker/title, Choice cards | numbers step, inputs |
| Tour | `onboarding.js:700` | `TourOverlay.jsx` | tour card | none |
| You | `you.js:553` | `you/index.jsx`, `you/*` | Hero greeting/avatar; Section headers; AssessCard head; Goal (Trajectory) head; Steps/Water pair | Kpi 2×2, FindingRows, charts, StatRows, MiniStats, VolRows |
| Coach card / sheets | `coach-ui.js:84,262,1146,1220` | `coach/Card.jsx`, `sheets.jsx`, `goal.jsx`, `live.jsx` | Coach card background/mark (fixed height, text must stay legible) | proposal lists, question rows, live chip |
| Settings hub + profile/goal | `settings.js:119,550,634` | `settings/index.jsx` | sheet header, avatar preview | SettingsRows, Segmented, fields |
| Admin (owner) | `admin.js:142` | `you/admin.jsx`, `admin/sheets.jsx` | none | all |
| Train calendar | `workout.js:384` | `workout/index.jsx` | month header; CoachCard tight; Start-workout zone; empty week-volume card | calendar grid, 3-stat row, volume bars |
| Day sheet | `workout.js:608` | `workout/index.jsx:448` | date header | exercise lines |
| Live session / edit | `workout.js:981` | `workout/session.jsx`, `train/SetRow.jsx`, `LiveChrome`, `RestOverlay`, `PeekBar` | empty-session card; rest pill face | **set table, set rows, plate strip, top bar, exercise card header** |
| Summary | `workout.js:2045` | `workout/summary.jsx` | summary hero headline; Wins head | PbRows, 3-stat row, did/like lists |
| Stats overview | `stats.js:96` | `workout/stats/index.jsx` | PageHead | 3×3 stat rows, charts, rank rows |
| Exercise detail | `stats.js:370` | `stats/[exId].jsx` | PageHead | 2×3 stats, charts, session rows |
| Picker / manager / custom | `picker.js:192,334,644` | `train/picker.jsx` | empty state | search, chip rows, exercise rows |
| Routines | `routines.js:115,166,259,531` | `train/routines.jsx` | empty list state | routine/editor rows |
| Fuel day | `food.js:510` | `food.jsx` | summary card top strip (big kcal); empty meal cards; water vessel card; FAB | cal meter, macro rows, entry rows, micros grid |
| Add food / estimator / library / meals / barcode | `food.js:1197-3574` | `food/*.jsx`, `scan.jsx` | add-menu tiles (Photo hero tile); estimator intro; camera | library rows, portion, manual, proposed rows, targets form |
| Water sheets | `water.js:262,332` | `food.jsx:1007`, `waterSettings.jsx` | vessel | presets list |
| Weight | `weight.js:70` | `weight.jsx` | log card; maintenance number block | 3-stat headline, trend chart, time-of-day, recent rows |
| Steps | `steps.js:144` | `steps.jsx`, `steps/sheets.jsx` | Today card (ring + number) | trend and weekday bars, 2×3 stats, heat strip, recent rows |
| Import history | `importer.js:8` | (none) | none | preview stat row |
| Install card / guide | `you.js:1678`, `onboarding.js:216` | (none) | card | none |
| HealthKit auto-steps guide | (none) | `steps/sheets.jsx:233-420` | pane header | settings blocks |
| Toast / sync pip / trial bar | `ui.js:42`, `index.html:85`, `access.js:355` | `ToastHost`, `SyncPip`, `app/_layout.jsx:133` | none | none |
| Dock | `index.html:97` | `Dock.jsx` | icons (Iron Age redraw) | labels |


---

# Settings and storage

## Vibes storage and apply map: web (rack-v58) and native (build 58)

### 1. Web: how settings are stored, cached and applied

**Local cache (`store.js`)**
- Every localStorage key goes through `lsKey(k)`, which returns `'rack:' + (UID || 'anon') + ':' + k` (store.js:106). `LS.get/set/del` are at store.js:108-116.
- Before auth resolves, UID is null, so any read lands in the `anon` namespace. **No per-account key can be read before auth.**
- There is already one precedent for a key outside the per-account namespace: `rack:migrated` (store.js:131, 137).
- `purgeDevice()` (store.js:147-160) only deletes keys starting `rack:<uid>:`, so a device-level key would survive "erase this device".

**Mirror**
- `read(path)` (store.js:725-737) does a live GET, stores the result in `LS 'mirror:'+path`, and falls back to the mirror when offline or on error. A vibe would live at `rack:<uid>:mirror:settings/vibe`.
- `write(path,value,intent)` (store.js:672-705):
  1. writes the mirror first, then does `set()`;
  2. queues when offline;
  3. on a rules refusal, rolls the mirror back, shows the red bar and **throws**.
- `settings/*` is deliberately left out of `CONTAINERS` (store.js:425 comment, list at :435-445). A settings write is a plain PUT with no destructive-write guard.

**`settings/units`**
- `let UNITS = normUnits(null)` (store.js:826).
- `initUnits()` (store.js:828-832) runs `read('settings/units')` then normalises.
- `wu()`/`hu()` answer synchronously.
- `setUnits()` (store.js:841-846) updates the cache first, then awaits `write`. The comment explains why: an offline change still repaints.

**`settings/coach`**
- `coach-data.js:219` reads it with `readExact('settings/coach')` in the first wave of `initCoachData`.
- `patch()` → `patchNow()` (coach-data.js:498-527) is a serialised read-merge-write. Module state is assigned only after `write` resolves.
- coach-data.js:481-485 says it plainly: *"The node needs no rules change: `settings` carries a section-level .write and the `$other` deny is nested inside `units`."*

**Boot order and first paint (index.html, then app.js)**
1. index.html:6 has `<meta theme-color #14161a>` and :8 sets the status bar to `black-translucent`.
2. The render-blocking stylesheets load at :12-13. rack.css:1 `@import`s Google Fonts Archivo.
3. **First paint is the `#auth` overlay** (index.html:24; rack.css:211 makes it fixed, z-index 200, background `var(--rack)`). `#app` and `#dock` are painted underneath it. The auth mark's six plates have inline hex colours at index.html:26-31.
4. The module `app.js` (index.html:132) is deferred, so it runs after parsing, likely after first paint.
5. `watchAuth` (app.js:125) hides `#auth` at :127. The empty `#app` and the dock are then visible while `accessState` awaits (:131).
6. Then `initCapabilities` (:159) → `boot` (:166/183) → `flushQueue` (:196) → **`await initUnits()` (:202)** → onboarding (:208-211) → `initYou` skeleton (:226) → tab inits (:228+) → `restoreView` (:235).

**Can a stored vibe be applied before first paint? Yes, but only from a device-level key.**
- A classic, non-module inline `<script>` in `<head>`, placed after the stylesheet links, can read `localStorage['rack:vibe']` and set `<html data-vibe>`. It can also update the theme-color meta.
- There is no CSP meta, and GitHub Pages sends none, so inline script is allowed.
- The per-account mirror becomes readable synchronously the moment `UID` is set (store.js:78). So `watchAuth`'s callback can reconcile to the account's cached vibe at app.js:126, before `#auth` is hidden.
- A precise per-uid read before auth would mean parsing Firebase's `firebase:authUser:<apiKey>:[DEFAULT]` key. `login`/`signup` call `setPersistence(browserLocalPersistence)` (store.js:51, 62). This is possible but fragile; I don't recommend it.

**Colour, font and icon sources the engine must absorb (web)**
- **`rack.css` tokens:** the `:root` block at rack.css:4-49 has 16 colour tokens plus radii, pad and motion. There are 458 `var(--` uses.
- **`rack.css` hard-coded values:** 8 hex outside the tokens (lines 204, 509, 597, 729, 807, 1521, 1535, 1590) and 67 `rgba(...)`.
- **`auth.css`:** 1 hex, 2 rgba, 66 var().
- **JS hex:**
  - exercises.js:6-11 (GROUPS colours)
  - analytics.js:616-619 (`PALETTE`/`groupColor`)
  - access.js:315 and :389 (plates on the gate and paused screens)
  - workout.js:1386-1387 (plate loader)
  - exercises.js and analytics.js are pure files mirrored in native `src/pure/`.
- **JS custom properties:** you.js:464 sets `--kpi-rgb`; water.js:171 sets `--fill`.
- **Fonts:** rack.css:1 `@import` of Archivo (variable wdth 62..125, wght 300..900), rack.css:57 family, and 126 `font-variation-settings`.
- **`404.html`** has its own `:root` copy (lines 11-16).
- **`manifest.json`** colours are static.
- **Icons:** the 5 dock icons are inline SVG in index.html:97-129. JS files with inline SVG: coach-ui, food, steps, ui, workout, you. There are no `<img>` assets besides the icons and profile photos.
- **iOS PWA constraint:** `black-translucent` (index.html:8) means **white status-bar text always**. It can't be changed at runtime, which matters for any light-background vibe.

**Service worker (`sw.js`)**
- It is a runtime cache with no precache list. New vibe CSS, images and fonts are cached only after their first fetch.
- `fonts.googleapis.com` bypasses the service worker (`includes('googleapis.com')`); `fonts.gstatic.com` is cached.
- CLAUDE.md:56-76: `CACHE` must be bumped together with `usage.js VERSION`, and `tools-check/version-match.mjs` enforces it.

### 2. Native: storage, boot and whether a vibe can be read before first render

**There is no MMKV.** It isn't in package.json, and coachData.js:111 says *"This tree has no MMKV"* (also ls.js:96). The store is AsyncStorage plus an in-memory Map.

**`src/data/ls.js`**
- `lsKey` = `rack:<uid|anon>:k` (:22).
- `hydrate(u)` (:32-63) loads only the `rack:<who>:` prefix into the Map.
- `LS.get` is synchronous and warns in dev before hydrate (:67).
- Writes are debounced 250ms (:96-104).
- ls.js:10-12: *no screen may import AsyncStorage directly.* A device-level key would therefore have to be added to ls.js, for example by also hydrating a `rack:device:` prefix.

**`src/data/store.js`**
- `watchAuth` (:446-451) is `onAuthStateChanged` → `await hydrate(UID)` → `cb(u)`.
- `write` (:742-785) mirrors, sets, and on refusal rolls back, dead-letters and throws.
- `read` (:788-800) behaves like web.
- `settings/*` is not in `CONTAINERS` (:586-602).

**`src/state/units.js`** is the pattern to copy.
- `let current` plus `subscribe`/`getVersion`/`notify` (:56-61).
- `initUnits` (:65-68).
- `setUnits` sets the cache and notifies before it writes (:79-85).
- `useUnits` uses `useSyncExternalStore` (:97-102).
- It is awaited at `app/(app)/_layout.jsx:59`, after `flushQueue` at :44.

**`app/_layout.jsx` (root)**
1. `SplashScreen.preventAutoHideAsync()` at module scope (:49).
2. `useFonts` registers only `Archivo_400/600/700/800` (:200-208).
3. The `watchAuth` callback starts at :218. `initCapabilities` runs at :253, then `setUser(u)` at :255.
4. `ready = user !== undefined && fontsLoaded` (:300). `hideAsync` runs when ready (:303). Before that it returns a plain `View` with the background colour (:305).
5. `<StatusBar style="light">` (:316).
6. `<Stack key={uid|'anon'}>` (:323).
7. `const BG = T.colors.rack` is captured at module scope (:42).
8. `(app)/_layout.jsx` shows `<Splash/>` during checking and booting (:198) and `<Setup>` during the setup phase (:204-206).

**Can the vibe id be read synchronously before first render? Yes, for a signed-in account.**
- `hydrate` has finished before `cb(u)`. So inside the callback at :218, `LS.get('mirror:settings/vibe')` is synchronous and correct.
- Apply it there, before `setUser(u)` at :255. The native splash is still held, so no wrong-vibe frame is shown.
- **Signed out:** `hydrate(null)` loads only `rack:anon:`, so a device-level key in ls.js is needed. It could also be loaded while fonts load.

**The engine blocker: theme values are frozen when modules load.**
- `src/ui/theme.js` exports mutable objects: `colors` (:14), `alpha` (:51), `tint` (:58) and `text` (:305). The default export at :333 holds the same object references.
- `tint` and `alpha` are computed from hex values when the module loads.
- `text` presets bake in `colors.chalk/dim/steel` when the module loads.
- `type()`'s default `color = colors.chalk` (:264-265) is evaluated at call time, so it is live.
- `FAMILY()` (:204) is the single font-family hook; `face()` (:215) returns `${FAMILY}_${wght}`.
- Modules are evaluated before auth, so the engine needs two things:
  - **(a)** rebuild `colors`, `tint`, `alpha` and `text` in place (`Object.assign`) before first render;
  - **(b)** move module-scope captures into render.
- **Module-scope captures:** about 22 files and about 97 references. The biggest:
  - you/bits.jsx: 18, including exported `C_FUEL…C_PROT` at :416-421
  - admin/sheets.jsx: 10
  - workout/index.jsx: 9
  - Btn.jsx: 8 (`BG/FG/BORDER`, :20-35)
  - Splash.jsx: 6 (`PLATES`, :18-25)
  - steps/sheets: 5
  - Ring, Placeholder, you/admin: 4 each
  - also `const BG` in `_layout.jsx:42` and `(auth)/sign-in.jsx:14`
- **Scale:** 80 files import theme. There are 809 `T.colors.*`, 38 `T.tint.*`, 22 `T.alpha.*` and 117 `T.text.*` references. There are **0 `StyleSheet.create`** calls; everything is an inline style evaluated at render, so in-place mutation plus a re-render propagates.
- **Other hard-coded colours:**
  - 29 hex literals outside theme.js: sign-in.jsx 12, state/workout.js 6, _layout.jsx 3, food/common.jsx 2, and one each in RestOverlay, PeekBar, TourOverlay, ToastHost, scan.jsx and food.jsx
  - 14 `rgba` literals
  - `groupColor` in `src/pure/analytics.js:655`
- **To re-render after a switch:** either use a `useVibe` subscription, or re-key the root Stack on uid+vibe. Re-keying remounts every route; a live session comes back via `hasActiveSession()`/`restoreRoute`.
- **Fixed at build time, so a vibe can't change them without a rebuild:**
  - app.json `backgroundColor` and `splash.backgroundColor` `#14161a`
  - `userInterfaceStyle: "dark"`
  - the app icon (no alternate-icon module is installed)
- **Changeable at runtime:**
  - `StatusBar style` (_layout.jsx:316, ErrorScreen.jsx:76)
  - `keyboardAppearance="dark"` (14 sites in 10 files)
- **Fonts:** new faces need bundled `.ttf` files registered in `useFonts`, which gates `ready`, or a `Font.loadAsync` for the selected vibe inside `watchAuth` before `setUser`.
- **Tests:** `tools/verify-text-color.mjs` imports theme.js with RN stubbed and evaluates the presets, so `T.text.*` must stay plain objects. `tools/verify-imperial-unchanged.mjs` is the precedent for an "invisible until switched" verifier.
- **Reset:** `resetAll()` (src/state/reset.js:41) does not reset units today. Vibe state should be reset on sign-out.
- **Images:** native `assets/` has only icon, splash and a wav file. `expo-image` is not installed; RN `<Image>` with `require()` works. `react-native-svg` is present and used in 18 files, including Dock.jsx `ICONS` at :7.

### 3. Firebase rules

**Live rules (web `database.rules.json`, lines 33-50)**
- `users/$uid/settings` has a **section-level `.write`**.
- Its only child rules are `units.weight`, `units.height` and `units.$other:false`, nested inside `units` (:44-46).
- ⇒ **`settings/vibe` needs no live rules change and no publish.**
- `database.rules.OPTIONAL-LOCK.json:32-45` has the same shape with a stricter `.write` expression.
- CLAUDE.md rule 2 ("a new top-level node needs rules") doesn't apply, because vibe sits under `settings`.
- Nothing on either client reads the whole `settings` node, so a new child is safe.

**Proposed rules (native `web-patches/database.rules.PROPOSED.json`, from :562)**
- `settings` children: `steps.goal` (number 0..1e7), `units` (hasChildren weight/height + enums + `$other:false`), `water` (hasChildren + enums + `presets.$i` + `$other:false`), and `coach` (`v`, `mute.$cat`, `on.$cat`, `answers.$q`, `asked.$q`, `goalLift{exId,lb,reps,at,$other:false}`, `marks.$sid{r,d,$other:false}`, `$other:false`).
- The `.OPTIONAL-LOCK` and `.numchildren` variants have identical settings children.
- There is **no `$other` at the settings level**, on purpose (build.mjs:500-503), so an unvalidated `vibe` would still land after the proposed rules are published.

**These files are generated; don't edit them by hand.**
- Source: `tools/rules/build.mjs`, settings block at :499. Helpers `str()` at :95 and `enumOf()` at :97.
- Byte-pinned by `tools/rules/verify-generator-level.mjs`.

**What to add in `build.mjs` `settings:`**
```js
vibe: { '.validate': `newData.isString() && newData.val().length <= 32 && newData.val().matches(/^[a-z0-9][a-z0-9-]*$/)` },
```
- The regex matches the one already used for `coach.goalLift.exId`.
- Don't use `enumOf(ids)`: every new vibe would then need a rules republish.
- Regenerate all three files afterwards.

**Caveat about the generator's input.**
- build.mjs:75 reads `homedir()+'/dev/rack-web-ref/database.rules.json'`.
- On the Mac that folder is a stale web copy: its sw.js says `rack-v31`, the md5 differs from v58's rules, and it lacks the approval keys `type`, `trialEndsAt`, `customCaps` and `subStatus`. build.mjs transcribes those blocks itself, so this is tolerated.
- It must be run on the Mac. In the Cowork VM, `homedir()` isn't `/Users/...`.

### 4. Settings screens

**Web `settings.js`**
- `openSettings(onEdit)` at :119 builds one sheet from these helpers:
  - `section(host,title)` (:36): `.you-sec` / `.you-sec-t`
  - `rowList` (:43): `.set-list`
  - `navRow(list,label,value,onTap)` (:51): `.set-row-nav`, label, optional value, chevron
- Sections in order:
  - **You** (:125): Goal, Your details, **Units** inline `segmented` → `setUnits` (:137-152), "Open the app on" segmented stored in the `LS openOn` key (:154-169)
  - **Fuel** (:176)
  - **Train** (:184)
  - **Coach** (:211-219): `coachToggleRows` (coach-ui.js:888) and `coachAnswerRows` (:995) drawn inline, plus a navRow for "Ask Coach something"
  - **Steps** (:222)
  - **App** (:226): Add to Home Screen, Replay walkthrough, refused-saves row, Sign out, erase
- It is opened from the You gear (you.js:706, :935).
- Sheets never nest (:16): a row closes the hub, then opens its own sheet.
- **Picker-sheet pattern to copy:** `openGoal` (:634-712), which uses `sheet()`, `.ob-choices` / `.ob-choice` buttons, a note, Save and Cancel.
- **Natural spot:** a new **"Look"** section between Steps and App, or a row at the top of App: `navRow(list,'Vibe',label,()=>{close();openVibes(onEdit);})`.

**Native `src/ui/settings/index.jsx`**
- `openSettings` (:105) → `sheet(({close})=><Hub/>)` (:109).
- `Sec` (:329) is the section heading.
- `SettingsList` and `SettingsRow` come from `Row.jsx`. The `first` prop suppresses the top border, so moving the first row means moving `first` too.
- Sections: **You** (:125), **Units** `Segmented` + `setUnits` (:147-160), Open the app on (:173), Fuel (:183), Steps (:196), Train (:209), **Coach** (:229-230, rendered inline by `<CoachSettings go={go}/>` from `src/ui/coach/settings.jsx`), **App** (:233, with `first` on "Replay the walkthrough" at :242).
- **Sub-sheet pattern:** `openGoal` (:604) / `GoalSheet` (:608).
- **Sheet API:** `src/ui/sheet.js` `sheet(render,{onClose,dismissible})`.
- It is opened from `app/(app)/(tabs)/you/index.jsx:135, 174`.

### 5. Onboarding (notes only)

**Web `onboarding.js`**
- `runSetup` (:233) builds a steps array at :268: `[welcome, unitsStep, aboutYou, weighIn, goalStep, aimStep, activityStep, ...install, numbers]`.
- `unitsStep` is at :356. Writes happen at the end; `setUnits` is at :638.
- It runs inside `#onboard` (auth.css `.ob-*`) before the tabs initialise.
- `onboardingState` (:51) reads only `done`. `ONBOARDING_VERSION = 1` is never read (:38-42). ⇒ **only new accounts would ever see an added step.**

**Native**
- `src/ui/onboarding/Setup.jsx` defines `STEPS` at :54 (`welcome, units, aboutYou, weighIn, goal, aim, activity, numbers`), `UnitsStep` at :362 and the render switch at :244-253.
- Writes are in `src/state/onboarding.js` (`setUnits` at :260). `onboardingState` is at :46.
- On both clients the progress bar divides by `steps.length - 1`.
- A "vibe" step, for example after welcome, could be added later.

### 6. Tier and owner gating

- `accounts.js` `capabilitiesFor` (:171) returns features `{advanced}` only (:62-64). Native `src/pure/accounts.js` is a verbatim copy (`verify-accounts-verbatim.mjs`).
- **Only consumer is Coach Pro:**
  - web: `coach-data.js:466-477 coachPro()`, used at coach-ui.js:1001 and :1190, and coach.js:4880 (tier lock)
  - native: `coachData.js:529-540`, used at coach/live.jsx:55, goal.jsx:76 and settings.jsx:66
- Separately, `isAccessPaused` shows the paused screen for locked accounts and expired trials.
- **Nothing visual is gated.**
- SHIP-V54-PROMPT.md:56-64: Pro and Basic were scrapped on 25 Sep; it's one plan now. Removing the gates is the paywall ship's job (Oct 5-14), and the rule is "Add no new kind of gate." ⇒ **vibes need no gating.**

### Storage + apply plan

**1. Data shape**
- Store `users/{uid}/settings/vibe` as a **plain string id** (`"v1"`, `"iron-age"`, …).
- An absent, unknown or garbage value normalises to `"v1"` via `normVibe()`. That means every existing account stays v1 without a byte being written.
- It is not a container. Use a plain `write()`.
- No live rules change is needed. The proposed-rules addition in section 3 is optional.

**2. Web**
- **Registry:** a new pure `vibes.js` holding ids, labels and token maps.
- **Store functions:** in `store.js`, add `VIBE`, `initVibe()`, `vibe()` and `setVibe()`, modelled on `initUnits`/`setUnits` at :826-846.
  - `setVibe`: apply and update the device key first, then `await write('settings/vibe', id)`; on a throw, revert.
- **Before first paint:** an inline classic `<script>` in `<head>`, after index.html:13, reads the device key `localStorage['rack:vibe']` in a try/catch. It sets `document.documentElement.dataset.vibe` and the `theme-color` meta.
- **Account reconcile in `watchAuth`:** at app.js:126, before `#auth` is hidden, read `LS.get('mirror:settings/vibe')` synchronously and re-apply if it differs.
- **Boot:** `await initVibe()` next to `await initUnits()` at app.js:202, which is after `flushQueue`. It does a live read, re-applies if the value changed, and refreshes the device key.
- **v1 must be pixel-identical:** v1 means the existing `:root` block unchanged. Other vibes are `html[data-vibe="x"]{…}` overrides, or a per-vibe stylesheet.
- **JS-baked colours** (exercises.js, analytics.js, access.js, workout.js, index.html auth mark) must read from the engine. After a switch, re-render the active view with `switchView(current)`.
- **Ship rules:** bump `sw.js CACHE` together with `usage.js VERSION`. Prefetch the chosen vibe's assets on selection so they work offline.

**3. Native**
- **State module:** `src/state/vibe.js` cloned from `state/units.js` (`current`, `notify`, `useVibe`, `initVibe`, `setVibe`).
- **Theme rebuild:** add `applyVibe(id)` to theme.js. It rebuilds `colors`, `alpha`, `tint`, `text` (and `FAMILY`) **in place**, so the 809 render-time `T.colors.X` reads follow automatically.
- **Module-scope captures:** convert the roughly 22 files that capture theme values at module scope into render-time reads.
- **Device key:** add a `rack:device:` prefix to `ls.js` `hydrate`, with `deviceGet`/`deviceSet` helpers.
- **Before first render:** apply the vibe in root `_layout.jsx` inside the `watchAuth` callback, before `setUser(u)` at :255. Use `LS.get('mirror:settings/vibe')` for a signed-in account, or the device key when signed out. The native splash is still held there, so there's no flash.
- **Boot reconcile:** `await initVibe()` next to `initUnits` at `(app)/_layout.jsx:59`.
- **Reset:** add `resetVibe` to `resetAll`.
- **Status bar and keyboard:** drive `StatusBar style` and `keyboardAppearance` from the vibe.
- **Accepted static items:** the native splash and the app icon stay at v1's `#14161a`.

**4. Precedence**
- The account value (server read, else mirror) wins.
- The device key is only a first-paint hint.
- The default is `v1`.

**5. Unknowns and open decisions**
- I couldn't render screens to confirm pixels, and the VM has no simulator.
- Whether a light vibe is acceptable given the iOS PWA's always-white status bar is a design decision.
- Whether the device key should reset to v1 on sign-out is a design decision.


---

# Tooling and fences

### 1. Standing rules (CLAUDE.md / AGENTS.md, both repos)

**Web `lift-cal/CLAUDE.md` (146 lines):**
- :17-28: the Worker is not in this repo (it lives in `~/dev/rack-worker`). Nothing here deploys it.
- :58-75: **bump the SW on any change to `*.js`, `*.css`, `index.html` or `404.html`.**
  - `sw.js` `const CACHE='rack-vNN'` and `usage.js:45` `const VERSION='rack-vNN'` move together.
  - `tools-check/version-match.mjs` enforces it. Currently `rack-v58`.
  - Doc-only changes need no bump.
- :77-81: a new top-level node under `users/{uid}` needs a rules change. `database.rules.json` is only a copy; Micah pastes it into the console.
- :99-112 house style:
  - vanilla ES modules; no `package.json`, no npm, no bundler;
  - match the surrounding file; small diffs;
  - read narrowly. The sizes quoted there are stale: `rack.css` is now 100,321 B and `food.js` 157,339 B;
  - comments explain *why*.
- :114-129 verifying:
  - `for f in *.js; do node --check --input-type=module < "$f" || echo "FAIL $f"; done`
  - `for f in tools-check/*.mjs; do node "$f" >/dev/null 2>&1; echo "$? $f"; done`
  - All must exit 0. Plain `node --check` silently passes broken ES modules.
- :131-146: a five-line handoff: **Shipped / Service worker / Before it's live / To check it worked** (close from the app switcher, open, close, open again) / **Risk**.

**Web `AGENTS.md` (965 lines):**
- It is a schema reference. Read it only when data is touched.
- House rules (:943-965):
  - confirm numbers before logging;
  - never PUT a container node;
  - update `daySummaries`;
  - don't invent library items;
  - never assume a weight on screen is in pounds (convert with `units.js`);
  - a new top-level section needs rules. A new child of an already-granted section usually doesn't.
- **Rules fact for storing the Vibe:**
  - Live `database.rules.json` → `users/$uid/settings` has the write grant and only `units` beneath it. The `$other:false` sits inside `units`, not at the `settings` level.
  - So `settings/<newKey>` lands on the live rules with no rules change.
  - Native's proposed rules also deliberately leave `settings` open (`tools/rules/build.mjs:499-503`).
  - `settings/units` is the precedent for a display preference.

**Native `rack-mobile/CLAUDE.md` (117 lines):**
- Stack: Expo SDK 57, RN 0.86.3, React 19.2.3, plain JS (no TypeScript). `PORT-BRIEF.md` is the spec.
- Hard rules:
  1. Never run `wrangler`, `firebase`, `eas`, `gh` or `gh-pages`.
  2. Push only to `origin`. `web` is fetch-only, with its push URL set to `DISABLED`.
  3. Never create or restore `worker/`, `database.rules.json`, `firebase.json`, `.firebaserc` or `wrangler.toml`.
  4. Never sign in as micahflunker@gmail.com; use the dev account. Nothing in code enforces this any more (`WRITE_MODE='anyone'`).
  5. Never delete a guard.
  6. Unsure whether something touches live → stop and ask.
- **Canaries:** `echo GUARDTEST ping` and `echo GUARDTEST-MOBILE ping` must both be refused.
- House style:
  - state is hand-rolled (`subscribe`/`getVersion`/`useSyncExternalStore`); no state library;
  - small commits;
  - no screen imports AsyncStorage or builds `users/{uid}` paths.
- Finish with: **What changed / What it touched / Which account it was tested on / What you wanted to run and didn't / Risk**.
- Native `AGENTS.md` (1069 lines) is the same schema. Its house rules (:1056-1069) are 1–4 as on web, plus the rules-for-new-sections rule.

**Micah's rules, carried in every brief:**
- A wrong number or an untrue sentence is worse than none.
- Web first; web is the guinea pig and native is the destination.
- Logic goes in pure modules that native copies verbatim (sha256-pinned).
- Every change gets a line in `NEXT-NATIVE-VNN.md`.
- Add no gate and remove none.

### 2. Prompt templates

**Web `SHIP-V58-PROMPT.md` (133 lines).** A copy is committed in lift-cal (in the Docs commit `928a65e`), and a byte-identical copy sits at `~/dev/SHIP-V58-PROMPT.md`.

- **Title:** `# SHIP-VNN-PROMPT.md: <plain outcome> (rack-vNN)`.
- **Line 3 onward:**
  - "Commissioned <date>, <time>. This is the build brief for one Claude Code run in `~/dev/ship-vNN`, a fenced clone of lift-cal at `<sha>` (**rack-vNN-1**, live). Nobody is watching. Micah reads your summary before he pushes."
  - The bigger V54 version adds a "## 1. The situation" section with Micah's words quoted.
- **§0 Ground rules (:7-20):**
  - no push/deploy/publish;
  - commit through the hooks, never `--no-verify`;
  - `echo GUARDTEST ping` must be refused, or stop;
  - Read/Edit/Write/Grep for files. Bash runs only node, the verifiers and read-only git. No `sed`, `awk`, `cat`, `wc`, pipes into grep/head/tail, heredocs, `tee` or `git clone`. Commit messages go via `-m`, or `-F` with a file written by Write;
  - never open `~/dev/rack-mobile`, `rack-worker`, `rack-food`, `~/live`, or any other `ship-v*`;
  - `database.rules.json` unchanged by one byte;
  - the clone must be at `<sha>`, or stop. Stale `.git` lock → stop. Delete nothing.
- **Micah's rules (:22-26).**
- **Read list and verifier rules (:28-30):** read `CLAUDE.md`, `AGENTS.md` and BACKLOG's previous section. **Count the verifiers, run all of them in the three time zones first. Commit per phase.**
- **Lettered phases A–D.** Each has Micah's quote, "what's happening", the fix, every place it applies, 320/390 px constraints, and which verifier to extend (plus its snapshot).
- **Finish (:114-133):**
  - `rack-vNN` as its own commit;
  - docs last (`NEXT-NATIVE-VNN.md` with the new pins, BACKLOG vNN section);
  - summary: plain words first, then green (counts before and after), new, listed-not-fixed, unsure. Anything red goes at the top;
  - **his push command, in "Terminal tab 2 at `~/dev/ship-vNN`": `git push --no-verify origin main`**;
  - a numbered walkthrough on the website once `sw.js` says `rack-vNN`.
- **V54 adds a partial-stop rule (:535-538):** "each phase leaves every verifier green… if Phase D can't be finished to this standard, stop after Phase C, leave D uncommitted".
- V54 §10 also details the doc shapes.
- **No prior prompt uses subagents or parallel agents.** That would be new.

**Web commit shape:**
1. One plain-sentence commit per phase (`434b2a9 The estimate rows line up`, …).
2. README.
3. `rack-v58` (only `sw.js` and `usage.js`).
4. `Docs for rack-v58: …` (NEXT-NATIVE, BACKLOG, the SHIP prompt).

**Native `PORT-V58-PROMPT.md` (106 lines):**
- **Title:** `# PORT-VNN-PROMPT.md: bring native up to rack-vNN`, "Commissioned…, run in `~/dev/rack-mobile`, unattended."
- **Fence bullets:**
  - no `wrangler`, `firebase`, `eas`, `gh`, `npx expo run:ios`, `expo prebuild` or `pod install`;
  - hooks only;
  - GUARDTEST must be refused;
  - **"Open this file with Read, not `cat`"**;
  - the same no-sed/awk/cat/pipes/heredocs/redirects rule;
  - read web only via `git show web/main:<file>`; never open `ship-v*`.
- **§0 The situation:**
  - HEAD `<sha>` with `"buildNumber": "NN-1"`; confirm it, or stop;
  - what web shipped, and Micah's check;
  - "Read IN FULL" `NEXT-NATIVE-VNN.md` and the SHIP prompt;
  - Cowork's native notes: verbatim copies, the "diff of diffs is empty" proof, moving the pins.
- **§1 Blocking check:** `git fetch web`, then `git log web/main --oneline -1` must be `<sha>`, or stop. Stale lock → stop.
- **§2 Verifiers:** the port's new checks; the held batteries unchanged:
  - coach-prog 57+16;
  - overlap 24;
  - ready 46;
  - fuel 16;
  - finish 12;
  - volume 72, all /0/0;
  - every verifier exits 0 in NY, UTC and Auckland, counted before and after.
- **§3 Finish:**
  - **`buildNumber` → NN, alone and last** (Admin reads `rack-v10NN`);
  - prepend tonight to `NIGHT-LOG.md`;
  - Micah's commands in **Terminal tab 1 at `~/dev/rack-mobile`**: `git push origin main` / `npx expo prebuild --platform ios --no-clean --no-install` / `npx expo run:ios --device --configuration Release`;
  - walkthrough: force-quit and relaunch twice;
  - state green, new, listed-not-fixed, unsure.
- **Native commit shape:**
  1. `engine: …`, `food: …` commits, each citing `(V58 §x)`;
  2. `docs: NIGHT-LOG for rack-vNN, and the prompt`;
  3. `version: buildNumber NN — native is level with rack-vNN`.

**`NIGHT-LOG.md` (500 KB, newest entry prepended):**
- Title: `# NIGHT-LOG — <date> (night): rack-vNN — <summary>`.
- **"Nothing is red"**.
- A "Never run" list, the canaries refused, the starting HEAD and buildNumber, which web refs were read, what was off limits.
- A commit block, then "Admin should read `rack-v10NN`".
- Verifiers: start and end counts, the baseline reds explained, "After: N of N, exit 0" in three zones, new verifiers with their check counts, the batteries.
- Mutation testing (v58: 46 mutations, 45 red, 1 equivalent).
- "Tested on which account: none".
- `# ▶ WHAT ONLY MICAH CAN DO`: §0 build commands, §1 walkthrough, §2 decisions left to you, §3 nothing else.
- `# WHAT WAS PORTED — verbatim` (file / lines / sha256 / was), then `# WHAT WAS WRITTEN, AND WHY — with file:lines`, then decisions left to me, then the verifier list.

**`NEXT-NATIVE-VNN.md` (web):**
- "Porting rack-vNN to rack-mobile", a lettered summary, and the brief's name.
- "`rack-mobile` was NOT read… say **the native run maps this**".
- `## ⚠ THE PINS`: sha256 of unchanged and changed pure modules, plus import edges.
- Numbered sections per change (file:line on web, what native must do).
- "Things this ship did not change".
- `## The verifiers`: a table with counts (vNN-1 in brackets).
- `## What to run`, then `## If the port reads one thing in this file`.

**`BACKLOG.md`:** `## What vNN left open in its own work`, newest first.

### 3. Web verifiers (`tools-check/`, 52 `.mjs` + `touch-target.snapshot.json`)
- **No runner script.** Use the CLAUDE.md loop, run three times: `TZ=America/New_York`, `UTC`, `Pacific/Auckland`. All 52 exit 0 at rack-v58 (51 at v57).
- Several read old revisions via `git show <sha>:file` (maintenance, touch-target, usda-desc, coach-*), so a **full clone** is required.
- **What each checks:**
  - **Account and access:** accounts, destructive-write, refused-write, month-erasure, merge-invariant.
  - **Coach:** coach-boot, -build, -fuel, -goal, -hype, -live, -overlap, -pace, -patterns, -prog, -pure (verbatim guarantee), -rank, -ready, -registry, -rotation, -silence, -state, -surface, -tags, -units, -voice, -volume.
  - **Training:** blocks, bodyweight-sets, custom-movement, drop-sets, effort, feel, finish, frequent, grey-last, recap, record-groups, tick-targets.
  - **Food:** estimate-ask, estimate-origin, recall-matcher, save-as-meal, scanner-offline, usda-desc.
  - **Maintenance and units:** maintenance, rate-band, units.
  - **Other:** version-match (sw.js CACHE == usage.js VERSION), weigh-time, you-reads.
- **Which read CSS or HTML:**
  - `rack.css`/`auth.css`: coach-surface, drop-sets, estimate-ask, recap, tick-targets, touch-target;
  - `index.html`: custom-movement, month-erasure, touch-target.
- **`touch-target.mjs` (841 lines) is the most theme-sensitive:**
  - It is an in-node CSS cascade over the real `rack.css` and `auth.css` at 390 and 320 px.
  - `var()` is resolved **only from a plain `html` node's `:root` cascade** (:215, :235-238, :415). Vibe overrides under `[data-vibe=…]` attribute selectors would be invisible to it; it measures v1 only.
  - Width properties are pinned to `touch-target.snapshot.json`; regenerate with `SNAPSHOT=1`.
  - Sweep **D**: no rule reaching `.btn` may set height, min-height or max-height except the v47 one.
  - F/G/H use **Archivo's** advance widths and metrics (asc .878 / desc .210, :244-246).
- **Headless browser:**
  - No Playwright or Puppeteer anywhere.
  - **`report/btn-44/measure.mjs`** is a raw-CDP harness. It spawns `python3 -m http.server 8765` and headless Chrome on 9333. The default path is `/Applications/Google Chrome.app/...`; the `CHROME` env var overrides it.
  - Firebase SDK modules are swapped for `report/btn-44/fakes/*` through the Fetch domain; all off-machine requests fail and service workers are disabled.
  - The seed comes from `seed.mjs` → `seed.json` (not committed). **58 scenes** (`scenes.json`), 390×844 at DPR 3, widths 390 and 320. It measures buttons into JSON, and `diff.mjs` compares two runs.
  - **It has no `captureScreenshot` call.** It is not a tools-check, because it needs Chrome and python3.
  - `report/you-gets/profile.mjs` is similar.
  - The PNGs committed in `report/` come from the **reverted** 3–4 Sep overnight pass.
  - Whether Chrome is still installed on the Mac is **unknown** from here.
- **Precedent:** `OVERNIGHT-REPORT.md:3-7`. The 3–4 Sep unattended "improvement pass" was **reverted in full at Micah's request**. It included re-tokenising colours (`--ok/--caution/--miss`, `--s-*`, `--dim-text`) and deployed per phase.

### 4. Native verifiers (`rack-mobile/tools/`)
- **79 `.mjs` at the root:** 78 `verify-*.mjs` plus `sweep-text-metrics.mjs`. Subfolders: `lib/`, `rules/`, `hermes-parity/`.
- **No runner script.** The suite is `tools/verify-*.mjs` plus `rules/prove`, `rules/verify-delete-coalescing` and `rules/verify-generator-level` = **81** (NIGHT-LOG:5531-5537 loop, `echo "$? $f"`), run in three time zones.
- The `*-verbatim` checks need `git fetch web` (they compare against `web/main:<file>` and pinned sha256s).
- **What each checks:**
  - **Verbatim pins:** accounts, coach, coach-build/fuel/goal/live/overlap/prog/ready/tags/volume, estimate-ask, estimate-origin, insights, tdee (two import lines differ), units.
  - **Behaviour, same names as web:** accounts, blocks, bodyweight-sets, coach-*, custom-movement, drop-sets, effort, feel, finish, grey-last, maintenance, merge-invariant, month-erasure, rate-band, recall-match, record-groups, save-as-meal, tick-targets, usda-desc, weigh-time, you-reads.
  - **Native-only:** container-guard, error-boundary, estimate-row, finish-survives-refusal, food-src, fuel-note, imperial-unchanged, keypad-done, named-imports, no-double-conversion, owner-gate, parses, refusal-visible, stats, text-color, top-inset, your-goal.
  - `sweep-text-metrics` is a report, not in the suite. It reads CSS from `~/live/lift-cal` (:45) and silently yields nothing if that's missing.
  - `lib/`:
    - `rn-render` renders real components under node; its header says **"WHAT IT CANNOT SEE: pixels"**;
    - `food-render`, `app-harness`, `coach-harness`, `load-pure` stage and render the real modules;
    - `ttf-advance` reads glyph widths from the TTFs.
  - `hermes-parity`: Mac-only (needs `ios/Pods`).
- **Theme coupling (these break if `src/ui/theme.js` is restructured):**
  - 12 verifiers plus `lib/food-render` read `src/ui/theme.js`.
  - `verify-text-color.mjs` regex-rewrites the exact line `import { Platform } from 'react-native';` and throws if it moved. It asserts every `text` preset and `loadNum()` returns a `color` key, because RN does not inherit colour. It has a `--canary` mode.
  - `verify-top-inset.mjs:231` regex-pins `appTop:\s+i => i\.top \+ 10,`.
  - `verify-estimate-row.mjs:56` and `verify-top-inset.mjs:125` load `theme.js`'s default export via rn-render.
  - `theme.js` is 333 lines of **static** exports: `colors` :14, `alpha` :51, `tint` :58, `space` :87, `radius` :92, `layout` :124, `motion` :158, `face` :215, `type` :264, `loadNum` :297, `text` :305, default :333.
- **No screenshot or snapshot tooling:** no jest, detox, maestro or playwright in `node_modules/.bin`; no e2e folders. The VM has no simulator.

### 5. The fences on the Mac
- **`~/dev/ship-v58`:**
  - HEAD `928a65e`; single remote `origin` = lift-cal.
  - `.git/hooks/pre-push`: `echo "refused: Micah ships this repo. use git push --no-verify"; exit 1`. It blocks every push, which is why Micah's command carries `--no-verify`. There is **no pre-commit hook**.
  - `.git/info/exclude` has `.claude/` plus the claude-code-runtime entries, so the fence is never committed.
  - `.claude/settings.json` has **79 deny entries**, no hooks:
    - wrangler, firebase, firebase-tools and eas in every npx/pnpm/yarn/bunx/`node_modules/.bin` form; `gh`, `gh-pages`;
    - `git push` and `git -C <each repo> push`; `git remote add` and `set-url`;
    - `git -C` or `cd` into `~/live/lift-cal`, `~/dev/rack-mobile` and `~/dev/rack-worker`;
    - `chflags`, `sudo`, `chmod -R`;
    - `cat >` or `tee` into `~/live`, `rack-mobile` or `rack-worker`;
    - `Edit(//Users/micahflunker/{live,dev/rack-mobile,dev/rack-worker,dev/rack-food}/**)`;
    - `Bash(echo GUARDTEST:*)`.
  - It does **not** deny curl, wget, WebFetch, or other `ship-v*` trees; those rules exist only in the prompt text.
  - It is identical to ship-v57's (ship-v52 to v58 all have 79 entries). The hook and settings are copied from clone to clone.
  - The clone itself is 11 MB.
- **`rack-mobile`:**
  - Remotes: `origin` = rack-mobile; `web` fetches lift-cal and pushes to `DISABLED`.
  - `pre-push` allows only URLs matching `*rack-mobile*`.
  - `pre-commit` refuses staged `worker/`, `database.rules.json`, `firebase.json`, `.firebaserc`, `wrangler.toml` and `.dev.vars`.
  - `.claude/settings.json` has **69 deny entries**: the same deploy and push set, `Edit` on the backend filenames and `~/live`, and GUARDTEST plus GUARDTEST-MOBILE. No hooks.
  - `settings.local.json` has 13 old allows.
- **`~/dev/deny-compound.mjs`:**
  - Present: 102 lines, dated 23 Sep. It is a PreToolUse Bash hook that exits 2 to block and fails closed.
  - It blocks, anywhere in a command: wrangler, firebase, eas, gh-pages, **curl, wget, httpie**, chflags, `sed -i`, `perl -i`, `ruby -i`, `git push`, `--no-verify`, `git commit -n`, `core.hooksPath`.
  - At a command's start it blocks gh, nc, sudo, chown, dd, truncate and nohup.
  - It also blocks redirects or `tee` into `~/live`, `rack-mobile`, `rack-food`, `.dev.vars`, `.claude/` and `tools/hooks/`.
  - **It is not referenced by any `settings*.json` under `~/dev`** (ship-v52 to v58, rack-mobile and rack-worker all have hooks=0). `~/.claude/settings.json` is not visible from the VM, so whether it's installed globally is **unknown**.

### 6. Native rebuild and buildNumber
- `buildNumber` lives in `app.json` → `expo.ios.buildNumber` (currently `"58"`).
- `ios/` is gitignored (`.gitignore:40`). The prebuild regenerates `CFBundleVersion` (currently 58 in `ios/*/Info.plist`).
- Admin reads `rack-v10NN` from `Constants.expoConfig.ios.buildNumber` (`src/data/usage.js:59-77`).
- `eas.json`: `appVersionSource: local`, `autoIncrement: false`.
- Micah's steps (PORT-V58 §3 and NIGHT-LOG "WHAT ONLY MICAH CAN DO §0"), in Terminal tab 1 at `~/dev/rack-mobile`:
  1. `git push origin main`
  2. `npx expo prebuild --platform ios --no-clean --no-install` (`--no-clean` keeps `ios/`; `--no-install` skips npm and pods)
  3. `npx expo run:ios --device --configuration Release`
- **Fonts:**
  - Native loads 4 Archivo TTFs, imported by file path from `@expo-google-fonts/archivo` (`app/_layout.jsx:13-22`) via `useFonts` (:200-204). The `expo-font` plugin is listed in `app.json`.
  - A new Google font package means an npm install, which the unattended runs don't do (they report "nothing in package.json/lock/plugins changed"). Vendored TTFs in `assets/` plus `useFonts` avoid that.
  - Web loads Archivo variable (wdth 62–125, wght 300–900) via `@import` at `rack.css:1` and `404.html:9`.

### 7. Disk
- `df -h ~/dev`: 229 GB total, 187 GB used, **43 GB free** (82% used).
- `ship-v31` to `ship-v58`: 23 folders, **149 MB total**. `rack-mobile`: 1.6 GB.
- Space is not a concern for an asset-heavy run.

---

### Conventions the Vibes prompt must follow
- [ ] Two briefs, the **web SHIP first, then the native PORT**:
  - web runs in a **fresh fenced clone `~/dev/ship-v59` at `928a65e` (rack-v58)**. Not ship-v58, which has my stale lock;
  - native runs in `~/dev/rack-mobile` at `1cb6498` (buildNumber 58).
- [ ] Headers match the templates (title, "Commissioned…", "Nobody is watching", base sha and live version).
- [ ] §0 fence copied verbatim:
  - no push, deploy or publish; hooks only, never `--no-verify`; the GUARDTEST canary (native: plus GUARDTEST-MOBILE);
  - Read/Edit/Write/Grep for files; Bash only for node, the verifiers and read-only git; no sed/awk/cat/pipes/heredocs/tee/redirects/clone;
  - no other repos or `ship-v*`; native reads web only via `git show web/main:`;
  - "open this file with Read, not cat".
- [ ] Stop conditions:
  - HEAD ≠ base sha;
  - `web/main` ≠ expected (native);
  - a stale `.git` lock;
  - GUARDTEST executes;
  - a phase can't meet the bar → stop after the last green phase, leaving it uncommitted (V54 pattern).
- [ ] Micah's rules restated: a wrong number or untrue sentence is worse than none; web first; add no gate and remove none; `database.rules.json` unchanged by one byte.
  - A vibe choice at `settings/<key>` needs **no rules change** (live and proposed rules leave `settings` open).
  - Whether it's per-account or per-device is a decision for Micah.
- [ ] Pure logic goes in a web module that native copies **verbatim**, sha256-pinned in `NEXT-NATIVE-V59.md`'s `⚠ THE PINS`, with a native `verify-<x>-verbatim.mjs`.
- [ ] Count the verifiers first, then run all of them in `America/New_York`, `UTC` and `Pacific/Auckland`:
  - web 52, via the `tools-check/*.mjs` loop plus `node --check --input-type=module`;
  - native 81 (78 `verify-*` + 3 rules);
  - held batteries unchanged: coach-prog 57+16, overlap 24, ready 46, fuel 16, finish 12, volume 72, all /0/0;
  - report counts before and after; **commit per phase, every phase green**.
- [ ] "v1 identical" needs its own proof. No pixel tooling exists:
  - web: extend the `report/btn-44` CDP harness (58 scenes, 390/320, fake Firebase, no network) with `Page.captureScreenshot` for before/after diffs, and say it needs Mac Chrome;
  - native: can only prove it structurally, e.g. every resolved `theme.js` value equals its pre-engine literal, plus Micah's eyes.
- [ ] Keep the verifier seams intact, or update them in the same commit with the reason stated:
  - web `touch-target.mjs` resolves `var()` only from `:root` and forbids `.btn` height rules; its snapshot holds v1 and F/G/H use Archivo metrics;
  - native `verify-text-color` (the `import { Platform }` line and a colour on every preset), `verify-top-inset:231` (`appTop` regex), and the rn-render loads of `theme.js` default.
- [ ] Assets must be licence-free: fonts OFL, photos public-domain pre-1931, no AI images.
  - **The fence forbids network in Bash** (curl/wget only prompt-banned; deny-compound would block them if it were installed).
  - So the prompt must name the image sourcing method explicitly (pre-staged by Micah or Cowork, or a permitted WebFetch).
  - Native: no npm install, so vendor the TTFs.
- [ ] Finish (web):
  - `rack-v59` as its own commit (`sw.js` CACHE + `usage.js` VERSION; `version-match` green);
  - README, CLAUDE.md and AGENTS.md only where made untrue;
  - docs last: `NEXT-NATIVE-V59.md` in V58's shape (write "the native run maps this" where native would be a guess), `BACKLOG.md` "What v59 left open", and the SHIP prompt committed.
- [ ] Finish (native):
  - code commits `area: … (V59 §x)`;
  - `docs: NIGHT-LOG for rack-v59, and the prompt` (NIGHT-LOG prepended in the full shape);
  - `version: buildNumber 59` **alone and last** (Admin reads `rack-v1059`).
- [ ] Summary: plain words first → green (counts before and after) → new → listed-not-fixed → unsure; red at the top.
  - Web push: **Terminal tab 2 at `~/dev/ship-v59`: `git push --no-verify origin main`**.
  - Native: **Terminal tab 1 at `~/dev/rack-mobile`**: push, `prebuild --no-clean --no-install`, `run:ios --device --configuration Release`.
  - Numbered walkthroughs: web once `sw.js` says `rack-v59` (close and open twice); native after force-quit and relaunch twice.
  - Native adds "tested on which account" (dev account, or none).
- [ ] Don't repeat the 3–4 Sep pass: it re-tokenised colours unattended and was reverted in full.


---

# Assets and licensing

---

### 1. Fonts and licences

#### Web (lift-cal @ rack-v58, 928a65e)
- **One family: Archivo, variable, from the Google Fonts CDN.** `rack.css:1` has `@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&display=swap')`. The body stack is at `rack.css:57`: `'Archivo', system-ui, -apple-system, sans-serif` plus `font-variation-settings: 'wdth' 100, 'wght' 400`.
- `404.html:9` has its own copy of the same @import and 20 hard-coded hex colours. It is a standalone page.
- **Weight is set only through the variation axis.** There are 126 `font-variation-settings` declarations (113 in rack.css, 13 in auth.css) and 31 distinct wdth/wght combinations. wdth ranges 78–120, and 88 is the most common (37 uses). wght ranges 400–800 (700 ×59, 800 ×40, 600 ×21), plus one-offs at 650 and 750. There are **zero `font-weight` declarations** in either CSS file. The only one anywhere is inline at `store.js:529`.
  - **This matters for vibe fonts.** A web vibe font must be a variable font with a `wght` axis. Otherwise the engine has to emit a `font-weight` alongside every declaration. Without one of these, a static font renders every heading at 400.
- Monospace is `ui-monospace, monospace` (`rack.css:725`, `:1424`). The refused-save banner uses a system-ui inline font (`store.js:521`).
- There are no `@font-face` rules and no self-hosted fonts. No JS sets fonts, except chart SVG text, which inherits.

#### Native (rack-mobile @ 1cb6498, buildNumber 58)
- **Four static TTFs are imported directly** at `app/_layout.jsx:19-22`: `@expo-google-fonts/archivo/{400Regular,600SemiBold,700Bold,800ExtraBold}/*.ttf`. They are 119,616 + 120,760 + 120,856 + 120,824 = **482,056 B**.
  - They are registered at runtime with `useFonts` at `_layout.jsx:200-209`, under the keys `Archivo_400/600/700/800`.
  - Fonts plus auth hold the splash screen.
  - The `expo-font` plugin is listed in `app.json`, but it has no fonts config and Info.plist has no `UIAppFonts`. So fonts are **JS assets loaded at runtime**, and adding more needs no native change.
- **Width axis is ignored on native.** In `src/ui/theme.js:163-196`, `FAMILY = () => 'Archivo'` ignores wdth, and `face(wdth,wght)` returns `Archivo_<snapped wght>` (650→700, 750→800). Native therefore renders **every width at 100**.
  - **For v1 to be pixel-identical on native, it must keep that collapsed width.** Restoring condensed or expanded cuts would change how the app looks.
  - The package ships the weight axis only.
- Call-site counts: 71 `T.face(`, 155 `T.type(`, 6 `loadNum(`, and 74 `fontFamily` sites. Mono is `Menlo` (system) via `theme.js` `text.mono`.

#### Licence (confirmed)
- `node_modules/@expo-google-fonts/archivo/` contains:
  - `LICENSE_FONT`: "Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo) … SIL Open Font License, Version 1.1". **It declares no Reserved Font Name.**
  - `LICENSE`: MIT, © 2020 Expo, covering the wrapper code only.
  - `package.json` licence field: `"MIT AND OFL-1.1"`.
- The upstream `google/fonts/ofl/archivo/METADATA.pb` also says `license: "OFL"`.

#### How licence texts ship today: they don't
- There is no licences, credits or about screen in either client, and no LICENSE, NOTICE or CREDITS file in either repo root.
- The Settings "App" section is the natural home for "Vibe" and "Licences" rows:
  - Web: `settings.js:226-232`. It has "Add to Home Screen" and "Replay the walkthrough", then Sign out.
  - Native: `src/ui/settings/index.jsx:233-250`.
- **There is already an unshipped third-party notice.** The gear icon at `food.js:532` and `steps.js:161` is **Feather's `settings` icon** (MIT, © 2013-2023 Cole Bemis). I checked the path numbers against `feathericons/feather/icons/settings.svg` and they match, arc-optimised. `you.js:695` is a scaled variant. Native copies it at `app/(app)/(tabs)/steps.jsx:113` and `src/ui/you/Hero.jsx:40`. MIT requires the notice to ship.

### 2. Image, icon and sound assets

#### Web: the app loads 3 bitmaps, 3.9 KB total
| file | bytes | dims |
|---|---|---|
| icon-180.png (apple-touch-icon) | 737 | 180² RGB |
| icon-192.png (manifest, "any maskable") | 784 | 192² |
| icon-512.png (manifest) | 2,393 | 512² |

- All three icons are the same design: six rounded plate bars (red, blue, yellow, green, white, chrome) on #14161a.
- Other shipped files: JS total 1,664,182 B, CSS 110,993 B, index.html + 404.html 10,704 B, manifest 485 B.
- `report/*.png` (611 KB) and `tools-check/` (2.1 MB) are served publicly by Pages but never loaded by the app.
- Hard-coded brand colours:
  - The auth-screen mark has six inline hex colours at `index.html:26-31` (`<i style="background:#d6252b…">`).
  - `<meta name="theme-color" content="#14161a">` is at `index.html:6`.
  - The manifest's `background_color` and `theme_color` are both #14161a. These, and the icon, are fixed at install time and cannot change per vibe.

#### Native `assets/` (180 KB on disk)
| file | bytes | dims | used? |
|---|---|---|---|
| icon.png | 9,351 | 1024² RGB, 7 colours, plate bars | yes, `app.json` "icon"; prebuild copies it to `ios/Rack/Images.xcassets/AppIcon.appiconset` |
| rest-done.wav | 35,324 | 0.4 s, 44.1 kHz mono, synthesised 760 Hz sine (`RestOverlay.jsx:27-30`) | yes, `RestOverlay.jsx:69` |
| splash-icon.png | 17,547 | 1024² | **no**, Expo template leftover |
| android-icon-foreground/background/monochrome.png | 78,796 / 17,549 / 4,140 | 512² / 512² / 432² | **no**, template |
| favicon.png | 1,129 | 48² | **no**, template |

- **Bundle-relevant assets today: 517,380 B** (4 TTFs + the wav), plus the app icon.
- **The UI draws zero bundled bitmaps.** The only `<Image>` uses are user photos: the profile photo at `Hero.jsx:96` and `settings/index.jsx:571`, and the estimator photo.
- Splash:
  - The JS splash is `src/ui/Splash.jsx`: six 7×40 bars from `T.colors`, fading in with a 60 ms stagger. It can follow the active vibe.
  - The native launch screen is baked into the build. `app.json` sets splash `backgroundColor #14161a`, but the local generated `ios/Rack/SplashScreen.storyboard:33` uses `systemBackgroundColor`, and there is no splash imageset or colorset. So the launch colour is probably system black. That is unverified on a device, and **it cannot vary per vibe**.
- No alternate app icons are configured.

#### Icon inventory (all hand-authored SVG paths or Unicode, no icon library)
- **Web:**
  - 5 dock icons at `index.html:100-126`.
  - Gears at `food.js:530`, `steps.js:160` and `you.js:695`.
  - Calendar at `workout.js:1014`.
  - Charts are built with `createElementNS` (`ui.js:16`, `coach-ui.js:39,55`).
- **Native:**
  - `src/ui/Dock.jsx:23` `ICONS`, copied verbatim from index.html.
  - `Hero.jsx:40` and `steps.jsx:113` gears.
  - `workout/session.jsx:320` calendar.
  - `coach/Card.jsx:64,73`, `food/common.jsx:372`, and `food.jsx:965` (a 104×168 illustration).
  - 9 chart components in `src/ui/chart/`.
- **Unicode glyphs in web string literals** (non-ASCII, 22 distinct): `’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − NBSP ‹ ↳ ↑ ↓ ÷ ±`. Every vibe font must cover these or iOS will fall back per glyph. Archivo probably lacks ⚙ ✕ ✓ ⋯ ↳ already (unverified).

### 3. Native packages (package.json, installed versions and Podfile.lock agree)

| need | package | version | natively linked? |
|---|---|---|---|
| image behind a box | `ImageBackground`, RN core (`node_modules/react-native/Libraries/Image/ImageBackground.js`) | RN 0.86.3 | yes |
| scrims | expo-linear-gradient | 57.0.1 | yes (pod ExpoLinearGradient 57.0.1); used by `train/stats.jsx:25` and `TourOverlay.jsx:28` |
| blur | expo-blur | 57.0.2 | yes; used by Dock |
| extra fonts | expo-font | 57.0.3 | yes (ExpoFont 57.0.3) |
| vector icons | react-native-svg | 15.15.4 | yes (RNSVG 15.15.4); `SvgXml`/`SvgUri` exported (`src/xml.tsx:67,82`) |
| asset loading | expo-asset | 57.0.16 | yes |
| file download (later packs) | expo-file-system | 57.0.6 | pod linked, but only nested under `node_modules/expo/node_modules`. **Not a direct dependency, so app code can't import it.** |
| SF Symbols | expo-symbols | 57.0.2 | transitive via expo-router. **Don't use for vibe icons** (Apple's licence limits them). |
| — | expo-image, @shopify/react-native-skia, expo-system-ui, @expo/vector-icons, expo-updates, any alternate-icon module | — | **not installed** |

- **Metro settings.** Metro's `assetExts` include png, jpg, jpeg, webp, gif, svg, ttf and otf. There is no svg-transformer, so `require('x.svg')` gives an asset id, not a component. Icons have to be `<Path d>` JSX (the Dock pattern) or `SvgXml` strings.
- **WebP.** The iOS deployment target is 16.4 (`ios/Podfile:25`, pbxproj), and ImageIO decodes WebP on iOS 14+. RN Image should therefore handle it, but that is unverified on device. JPEG or PNG is the safe choice.
- **Rebuild cost.**
  - `expo-updates` is absent, so there is no OTA path. **Every change, even JS-only, already reaches the phone only through a Release rebuild** (`npx expo run:ios --device --configuration Release`).
  - `/ios` is gitignored (continuous native generation) but exists locally with Pods. A **new** native dependency would add an npm install, a pod install or prebuild step, and risk to his working build.
  - **Nothing in the vibe work needs a new native dependency**: `ImageBackground`, `LinearGradient`, `BlurView`, `Svg` and `useFonts`/`Font.loadAsync` are all already linked.
  - A per-vibe **app icon** would need a new native module plus `CFBundleAlternateIcons`. Recommend leaving it out of scope.
- **System chrome is pinned dark:**
  - `UIUserInterfaceStyle Dark` (`ios/Rack/Info.plist:81-82`) and `app.json userInterfaceStyle "dark"`.
  - `<StatusBar style="light"/>` at `_layout.jsx:316`.
  - `keyboardAppearance="dark"` at 14 sites (there are 17 `<TextInput>`s).
  - `themeVariant="dark"` at `session.jsx:463`.
  - RN's `Appearance.setColorScheme` exists (`Libraries/Utilities/Appearance.js:96`) if a light vibe ever needs to override at runtime. **Recommend all vibes stay dark-ground.**
- **Storage.** Device storage is AsyncStorage hydrated into a synchronous per-account cache (`src/data/ls.js`, keys `rack:<uid|anon>:<k>`). A vibe read before sign-in lands in the `anon` namespace. The account setting `users/{uid}/settings/vibe` would write under the live rules today, because `settings.write` cascades and there is no `$other` at the settings level. The PROPOSED rules at `web-patches/database.rules.PROPOSED.json` also have no `settings.$other`.

**Theme-engine counts (useful context for the engine):**
- **Native:**
  - 80 files import theme; 809 `T.colors.` references, 38 `T.tint.`, 22 `T.alpha.`; **0 `StyleSheet.create`** (all styles are inline, which suits runtime switching).
  - **Module-scope snapshots will not re-theme:**
    - `_layout.jsx:42 BG` and `(auth)/sign-in.jsx:14 BG`
    - `chart/Ring.jsx:26,28`, `chart/BarChart.jsx:33,36`, `chart/Donut.jsx:21,23`
    - `Btn.jsx:35 BORDER`
    - `you/bits.jsx:114 DELTA_FG` and `:416-423 C_FUEL…C_FAT`
    - `Dock.jsx:21 DOCK_H`
  - Hex literals outside theme.js: `sign-in.jsx` 15, `pure/analytics.js` 7, `state/workout.js` 6, `pure/exercises.js` 6, `_layout.jsx` 3, `food/common.jsx` 2, and 1 each in RestOverlay, PeekBar, TourOverlay, ToastHost, scan.jsx and food.jsx. There are 11 `rgba(` outside theme.js.
- **Web:**
  - rack.css has 24 hex values (16 in `:root`, lines 4-49) and 72 `rgba(`.
  - auth.css has 1 hex, index.html 7 and 404.html 20.
  - JS hex literals: access.js 12, analytics.js 7, exercises.js 6, workout.js 6. JS uses `var(--` 105 times.
- **Verification tools:**
  - Native `tools/lib/rn-render.mjs` mounts real components and records every host prop (style snapshots are possible, pixels are not). `tools/lib/ttf-advance.mjs` measures text widths.
  - `tools/verify-text-color.mjs:53-58` string-stubs theme.js's react-native import and throws if that import moves, so the engine refactor must keep it working.
  - Web `tools-check/` uses a stand-in `globalThis.document` (19 files). There is no browser in this container.

### 4. Web: implications of the Google Fonts CDN
- **Offline gap already exists.** `sw.js` skips any host containing `googleapis.com`, so the `fonts.googleapis.com` CSS is **never** put in Cache Storage. The `fonts.gstatic.com` woff2 files are not excluded and do get cached. On an offline cold start after the browser's HTTP cache expires (Google sets about 1 day, from knowledge), the @import fails and the app falls back to system-ui. Because weights come only from `'wght'`, that fallback may lose all bold.
- **Privacy.** Every launch sends the user's IP address, user agent and referrer to Google. A German court (LG München I, 2022) ruled this a GDPR violation without consent (from knowledge).
- **The CSS chain is render-blocking:** rack.css → the @import CSS → woff2.
- **Options for new vibe fonts:**
  - **A. Add families to the same @import.** Same CDN, same offline gap.
  - **B. Self-host woff2** under e.g. `fonts/`, with `@font-face` and the OFL.txt beside it. `sw.js` has no precache list (it is runtime and network-first), so a vibe's fonts only work offline after one online fetch. Warm them when a vibe is selected, or add install-time precaching.
  - Reference size: `@fontsource-variable/archivo` 5.3.0 (OFL-1.1) is 90,104 B for the latin wdth+wght woff2 and 34,928 B for wght only.
- **For the v1 identity phase, leave the @import untouched.** Self-hosting may pull a different Archivo build, and that is its own separately verified change.

### 5. Research

**(a) US public domain in 2026.** Verified with Duke's Center for the Study of the Public Domain: on Jan 1, 2026, works from 1930 entered the US public domain, so **anything published before 1931 is PD in the US**. That includes foreign works, since the 95-year term also applies to works whose US copyright was restored.

Unverified points, from knowledge:
- Unpublished works are PD in the US at life+70 (author died before 1956), or 120 years from creation if anonymous.
- **The App Store is worldwide.** EU and UK terms are life+70 for the photographer or author, or 70 years from publication for anonymous works. So require **published before 1931 AND (creator died before 1956 OR anonymous)**. The subject's death date is irrelevant.
  - Examples: Napoleon Sarony (died 1896) and Sandow as author (died 1925) are safe. Hackenschmidt's own books are riskier in the EU, because he died in 1968.
- Faithful scans of PD works get no new copyright (US: Bridgeman v. Corel; EU: DSM Directive Art. 14).
- **Colorised, "restored" or AI-upscaled versions are new works.** Never use them.
- Avoid the nude or fig-leaf Sandow poses (Apple 1.1.4, from knowledge). For example, Commons LCCN90715315, 90715318 and 90715336 are nude. Clothed poses such as LCCN91480334 (leotard) are fine.

**(b) Sources for pre-1931 photos:**
- **Library of Congress Prints & Photographs.** Its standard statement is "No known restrictions on publication". Examples: [Sandow / Sarony](https://www.loc.gov/item/90713107/), [Sandow](https://www.loc.gov/pictures/collection/cph/item/2007681316/), and the [1894 Edison Kinetoscope strip](https://www.loc.gov/pictures/item/2013645430/). The loc.gov page returned 403 to my fetch, so the rights wording is from knowledge.
- **Wikimedia Commons** [Category:Eugen Sandow](https://commons.wikimedia.org/wiki/Category:Eugen_Sandow). Use only files tagged PD-US-expired plus PD-old-70 or PD-old-100, and trace each back to its LoC or original source.
- **Sandow, *Strength and How to Obtain It* (1897):**
  - Project Gutenberg [#65987](https://www.gutenberg.org/ebooks/65987), marked "Public domain in the USA", with illustrations.
  - Internet Archive scans: [strengthandhowt00sandgoog](https://archive.org/details/strengthandhowt00sandgoog) and [Strength_and_How_to_Obtain_It_Sandow](https://archive.org/details/Strength_and_How_to_Obtain_It_Sandow).
  - Cite the 1897 book as the source, not Project Gutenberg, which has a trademark licence.
- **Also usable (from knowledge, unverified):**
  - Arthur Saxon, *The Development of Physical Power* (1906; died 1921).
  - Louis Cyr photos (pre-1912).
  - Smithsonian Open Access, Met Open Access and Rijksmuseum (all CC0).
  - Wellcome Collection (Public Domain Mark items only).
  - British Library and Flickr Commons. "No known copyright restrictions" there is not a guarantee, so re-verify each item.
- **Never source from** Alamy, Getty, Shutterstock, Pinterest or colourisation sites.

**(c) SIL OFL 1.1 in a paid app** ([OFL FAQ](https://openfontlicense.org/ofl-faq/), verified):
- FAQ 1.4: fonts may be bundled and sold as part of software, including "mobile device applications".
- FAQ 1.20: "At a minimum you must include the copyright statement, the license notice and the license text". An "About box" is acceptable.
- FAQ 2.2.1: WOFF compression without other changes may keep the font name.
- FAQ 2.6: subsetting counts as a modification, which only matters for Reserved Font Names. **Archivo has none.** Check each new font's `OFL.txt` for "with Reserved Font Name".
- Never sell the font file on its own.
- Some Google Fonts are Apache-2.0 or UFL. Confirm the font sits in `google/fonts/ofl/…` and that its METADATA.pb says `license: "OFL"`.

**(d) Apple App Review Guidelines** ([guidelines](https://developer.apple.com/app-store/review/guidelines/)):
- **2.5.2, verbatim:** apps may not "download, install, or execute code which introduces or changes features or functionality of the app". **Vibe packs as data (images, JSON tokens, fonts) are content and fine. A vibe must never be downloaded JS.**
- **3.1.1, verbatim:** "If you want to unlock features or functionality within your app, (by way of example: subscriptions, … access to premium content…), you must use in-app purchase." If vibes are ever sold or become Pro-gated in a paid Pro tier, the unlock goes through in-app purchase.
- **2.3.8** mentions "alternate icons" must be similar to the app's metadata.
- **5.2.1** (third-party IP needs permission): the fetch was truncated, so this is from knowledge. PD provenance is the defence.

**Network reachability.** From **both** this container and Micah's Cowork VM, these hosts are **unreachable**: loc.gov, tile.loc.gov, commons.wikimedia.org, upload.wikimedia.org, archive.org, gutenberg.org, fonts.google.com, fonts.gstatic.com and the Met API. From the VM, these **work**: github.com, raw.githubusercontent.com (including the `google/fonts` repo) and registry.npmjs.org.

It is unknown whether Claude Code on his Mac has open network access. The overnight prompt needs a fallback: if image hosts fail, write a shopping list plus a fetch script for Micah, and make Iron Age render correctly with no photos.

### 6. Asset rules for the prompt
1. **No AI imagery or AI processing of any kind.**
   - No generated images, and no AI upscaling, "enhance", inpainting, colourisation, background removal, style transfer or AI "restoration" services.
   - Only deterministic operations are allowed: crop, resize (Lanczos), levels and curves, grayscale, duotone, grain, halftone, JPEG/WebP encode.
   - Every image op must be a recorded command, using ImageMagick (present on the VM) or `sips` on macOS.
2. **Allowed photo sources:**
   - LoC P&P items marked "No known restrictions".
   - Commons files carrying PD-US-expired **and** PD-old-70 or PD-old-100.
   - Internet Archive or HathiTrust scans of books published before 1931 by authors who died before 1956.
   - Smithsonian, Met or Rijksmuseum CC0 items.
   - Every item must pass: **published before 1931, AND creator died before 1956 or is anonymous**.
3. **Forbidden:**
   - Anything from 1931 or later.
   - Stock sites, Pinterest, "free wallpaper" sites, colourised or restored versions, social media.
   - Anything whose only claim is "found online".
   - Nude or fig-leaf poses.
   - Trademarks that are still live (e.g. Charles Atlas).
   - SF Symbols, and icon libraries whose licence notice we don't ship.
   - AI generators of any kind.
4. **Provenance file.** One `PROVENANCE.json` per vibe folder, mirrored in both repos. Each entry needs:
   - `file`, `sha256`, `bytes`, `dims`
   - `title`, `subject`, `creator`, `creator_died`, `created`, `first_published` (year and venue)
   - `source_institution`, `source_url` (the item page, not a CDN link), `source_id` (LCCN, Commons filename, IA id plus leaf)
   - `rights_statement_verbatim`, `pd_basis_us`, `pd_basis_worldwide`
   - `retrieved` (date), `original_sha256`, `original_dims`
   - `transforms` (each command with tool and version)
   - `nudity_check`
   - `micah_approved: false` until he views it
   - `credit_line`
5. **Font manifest.** A `FONTS.json` with family, files, version or commit, source URL, `license: "OFL-1.1"`, copyright line, RFN (or none), and sha256. Put `OFL-<Family>.txt` beside the font files.
   - Web vibe fonts must be **variable with a `wght` axis**; otherwise the engine emits `font-weight`.
   - Native vibe fonts must be **static TTF instances**, one file per weight used, named `<Family>_<wght>` so `face()` works.
   - Glyph coverage: every character listed in §2.
6. **Size budgets (suggested):**
   - Photos: JPEG q≈70, at most 1170 px on the long edge, ≤150 KB each.
   - Iron Age total imagery: ≤1.5 MB. Native bundles every vibe's assets into the binary; today's total is 517 KB.
   - Native fonts: ≤4 static TTFs per vibe (about 120 KB each).
   - Web fonts: ≤120 KB of latin woff2 per family.
   - Icons are SVG path data only, with no bitmaps.
7. **Icons.**
   - Hand-drawn paths in one **pure module** (e.g. `vibe-icons.js`), copied verbatim to `src/pure/` with a byte-identity verifier (house pattern).
   - Rendered as `innerHTML` SVG on web and `<Path d>` on native.
   - Stroke-based on a 24×24 viewBox, matching the existing dock.
8. **Licences screen, new, in both clients' Settings → App.** It lists:
   - the OFL text plus copyright for every bundled font;
   - the Feather MIT notice (an existing obligation);
   - the image credits from each PROVENANCE file;
   - ideally the npm dependency licences.
9. **v1 means byte-identical output.**
   - Keep the web `@import`, the 16 `:root` values, the auth-mark hexes and every wdth/wght pair.
   - Keep native's collapsed width, i.e. `face()` returning `Archivo_<wght>`.
   - Replace every module-scope `T.*` snapshot listed in §3 with a vibe-aware read.
10. **What vibes cannot change:** native launch screen, app icon, PWA manifest colours and icon, `UIUserInterfaceStyle`. All vibes should stay dark-ground.
11. **No new native dependencies, and never download code.** Remote vibe packs, if ever, are data only (2.5.2). A paid vibe unlock goes through in-app purchase (3.1.1).

Sources: [Duke Public Domain Day 2026](https://web.law.duke.edu/cspd/publicdomainday/2026/) · [Internet Archive PD Day 2026](https://blog.archive.org/public-domain-day-2026/) · [OFL FAQ](https://openfontlicense.org/ofl-faq/) · [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [LoC Sandow/Sarony](https://www.loc.gov/item/90713107/) · [LoC Sandow](https://www.loc.gov/pictures/collection/cph/item/2007681316/) · [LoC Kinetoscope strip](https://www.loc.gov/pictures/item/2013645430/) · [Commons Category:Eugen Sandow](https://commons.wikimedia.org/wiki/Category:Eugen_Sandow) · [Commons LCCN91480334](https://commons.wikimedia.org/wiki/File:Eugene_Sandow,_full-length_portrait,_standing,_leaning_on_column,_facing_left,_wearing_wrestling_leotard,_Roman_sandles,_and_six_pointed_star_pendant_LCCN91480334.jpg) · [Gutenberg #65987](https://www.gutenberg.org/ebooks/65987) · [IA strengthandhowt00sandgoog](https://archive.org/details/strengthandhowt00sandgoog) · [IA Strength_and_How_to_Obtain_It_Sandow](https://archive.org/details/Strength_and_How_to_Obtain_It_Sandow) · [Feather settings.svg](https://raw.githubusercontent.com/feathericons/feather/main/icons/settings.svg)


Paths referenced:
- Web: `/home/claude/lift-cal/rack.css`, `/home/claude/lift-cal/sw.js`, `/home/claude/lift-cal/index.html`, `/home/claude/lift-cal/settings.js`
- Native: `$HOME/mnt/dev/rack-mobile/src/ui/theme.js`, `$HOME/mnt/dev/rack-mobile/app/_layout.jsx`, `$HOME/mnt/dev/rack-mobile/src/ui/settings/index.jsx`
