// The v1 proof (V59 §7.1): does a tree look exactly like another, to the pixel
// and to the computed style? Two trees are served side by side, each on its own
// python http.server, and one headless Chrome walks every scene in
// scenes.json at 390 and 320px on each: boot A, run the scene's steps, capture;
// boot B the same way, capture; compare. Everything the app could vary on is
// held fixed and identical on both sides (see HOLDS below), so the control —
// one tree served on both ports — has to come out 0 and 0.
//
//   # once: the seed, at the same NOW the page gets (never written into a tree)
//   TZ=America/New_York SEED_NOW=2026-09-25T19:30:00-04:00 \
//     SEED_OUT=~/dev/vibes-night/proof/seed/seed.json node report/btn-44/seed.mjs
//   (the night froze node's whole clock instead, with
//   node --import ~/dev/vibes-night/tools/freeze-clock.mjs: the same bytes,
//   sha256 7482e80d…). prove.mjs refuses a seed whose `now` is not its NOW.
//
//   # prove (the default mode): A against B
//   node report/btn-44/prove.mjs --a <treeA> --b <treeB> --expect-vibe 404,200 --run <name>
//        [--vibe <id>] [--data-vibe <v>] [--widths 390,320] [--groups you,train] [--scenes you,summary]
//        [--against <baselineDir>]   # A from a stored baseline instead of a served tree
//   --vibe <id> puts <id> in localStorage 'rack:vibe' (the device hint) right
//   after the harness clears it, AND in the seeded account's settings/vibe (the
//   account value wins, V59 §8.1). --data-vibe <v> forces <html data-vibe="v">
//   from the first byte of the document and again before every capture (the
//   P gate's "data-vibe=v1" run). Both apply to both sides; both are inert on base.
//   A difference in pixels alone (no computed-style, rect, SVG, text, value or
//   structure difference) is re-booted up to --pixel-retries (4) times a side
//   and is forgiven only if the two sides produce one byte-identical PNG, every
//   PNG B produced is one A produced or one the base tree produced on record
//   (--known-states <dir>[,<dir>…] where to look, default the night's proof
//   runs; none for this run's A alone), every other PNG either side produced
//   differs from it only as the dock's known raster states do, and no
//   re-boot's dump differs: see "raster" and "backstop" in HOLDS.
//   Scenes: scenes.json (the btn-44 set, which measure.mjs shares) and
//   scenes-cover.json (the fixture, and the call sites no btn-44 scene
//   reaches). --safe-area <w:top,right,bottom,left/…> or none (default: an
//   installed iPhone, 390 → 47,0,34,0 and 320 → 20,0,0,0).
//   --allow-dirty: a tree that serves files not at its HEAD, has a tracked file
//   modified, or is not a git tree, is reported, not a DIRTY verdict; a WIP
//   run, never a proof.
//   Exit: 0 IDENTICAL, 3 DIFFERENT, 4 INCOMPLETE or UNSTEADY, 5 DIRTY (a tree
//   served something that is not its commit, or is not its commit), 1 a setup
//   failure, 2 usage.
//   The run also compares, beyond each capture: the stylesheets as text with
//   var() resolved (checks.css; totals.cssDiffs), each :active/:focus rule's
//   elements with the state forced (stateDiffs), every @keyframes sampled on
//   probes (keyframeDiffs), every attribute but style (attrDiffs), the head
//   but its scripts, and each stylesheet link both sides have with every
//   attribute it carries, in its order (headDiffs), what each boot asked
//   off this machine, query and all (requestDiffs), and, byte for byte, every
//   file the site ships that no capture measures — manifest.json, sw.js,
//   404.html, the icons (checks.files; fileDiffs). summary.coverage says
//   which rules that differ in text between A and B were in effect with an
//   element on the page, in which scene, and which only the fixture or the
//   text reached (a rule in an @media no capture was inside, and a declaration
//   Chrome drops, are the text's alone).
//   # keep the A side of one or more clean control runs as the baseline
//   node report/btn-44/prove.mjs baseline --from <runDir>[,<runDir>…] --to <dir>
//   # shoot: one tree, PNGs of a scene list (default: the gallery list in shoot.json)
//   node report/btn-44/prove.mjs shoot --repo <tree> --out <dir> [--vibe <id>] [--scenes …] [--widths 390] [--full]
//   # fit: one tree, overflow / clipped text / small targets, at 320 and 390
//   node report/btn-44/prove.mjs fit --repo <tree> --run <name> [--vibe <id>] [--compare <v1 fit.json>]
//
// Output goes to ~/dev/vibes-night/proof/<run>/ (summary.json, run.log, the
// gzipped dumps and PNGs) — never under report/, which Pages publishes.
// summary.json names the harness commit that measured (harness), and lists
// every URL each side asked for, with what only one side asked for (requests:
// information, not a gate — the engine adds modules of its own). Runs
// are serialised through ~/dev/vibes-night/harness.lock. Not a tools-check: it
// needs Chrome and python3.
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  HERE, NIGHT, sleep, sha256, parseArgs, list, logger, onCleanup, rmScratch, assertOutside, acquireLock,
  startServer, startChrome, CDP, pageClockScript, intercept, loadFakes, diffPNG, hashDump, writeGz, readGz,
  compareDumps, gitHead, PINNED_FONT_URL, CHROME_FLAGS, DUMP_FORMAT, DIFF_KINDS, servedCheck, servedFile, headBlobs, blobSha, backstopDecide,
  renderConditions, knownBaseStates
} from './harness-lib.mjs';
import { compareSheets, linkedSheets, testable, contextOf } from './css-static.mjs';

const argv = process.argv.slice(2);
const MODE = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'prove';
const { flags } = parseArgs(argv, ['full', 'help', 'single-shot', 'no-relayer', 'allow-dirty']);
const ALLOW_DIRTY = !!flags['allow-dirty'];
if (flags.help || !['prove', 'shoot', 'fit', 'baseline'].includes(MODE)) {
  const src = readFileSync(new URL(import.meta.url)).toString().split('\n');
  console.log(src.slice(0, src.findIndex(l => !l.startsWith('//'))).join('\n'));
  process.exit(flags.help ? 0 : 2);
}

const NOW_ISO = flags.now || '2026-09-25T19:30:00-04:00';
const NOW = Date.parse(NOW_ISO);
const TZ = flags.tz || 'America/New_York';
const LOCALE = flags.locale || 'en-US';
const SCHEME = flags['color-scheme'] || 'dark';
const HEIGHT = +(flags.height || 844), DPR = +(flags.dpr || 3);
const FONT_PATH = flags.font || join(NIGHT, 'tools', 'fonts', 'archivo', 'Archivo-wdth-wght.ttf');
const FONT_SHA = flags['font-sha256'] || '0e094a7d3c7c4c25cf1310c4b30014f1dae9332220b1c2c88f4fa996f0b05053';
const SEED_PATH = resolve(flags.seed || join(NIGHT, 'proof', 'seed', 'seed.json'));
const CDP_PORT = +(flags['cdp-port'] || process.env.CDP_PORT || 9333);
const VIBE = flags.vibe === undefined ? null : String(flags.vibe);
const DATA_VIBE = flags['data-vibe'] === undefined ? null : String(flags['data-vibe']);
// A capture is taken again until two in a row are byte-identical (at most
// MAX_SHOTS): a raster still in flight never passes as the page.
const MAX_SHOTS = flags['single-shot'] ? 1 : +(flags['max-shots'] || 5);
// How many times a pixel-only difference is re-booted on each side before it
// counts (confirmPixels). 0 turns the confirmation off.
const RETRIES = flags['pixel-retries'] === undefined ? 4 : +flags['pixel-retries'];
// The dock's layer made again before every screenshot (HOLDS, "raster
// states"). --no-relayer turns it off, for diagnosis only: a baseline and a run
// against it must agree on it.
const RELAYER = !flags['no-relayer'];
// env(safe-area-inset-*) as an installed iPhone has them, so the dock, the
// header and every sheet's bottom padding are measured at the size they are on
// the phone, not at headless Chrome's 0: a 390px iPhone (47 top, 34 for the home
// indicator) and a 320px SE (20, the status bar). Per width; --safe-area none
// for zeros.
const SAFE_AREA = (() => {
  const v = flags['safe-area'];
  const z = { top: 0, right: 0, bottom: 0, left: 0 };
  if (v === 'none' || v === '0') return { map: {}, dflt: z };
  const map = { 390: { top: 47, right: 0, bottom: 34, left: 0 }, 320: { top: 20, right: 0, bottom: 0, left: 0 } };
  if (v) for (const part of String(v).split('/')) {
    const [w, vals] = part.split(':');
    const [top, right, bottom, left] = String(vals || '').split(',').map(Number);
    if (!(+w > 0) || [top, right, bottom, left].some(x => !Number.isInteger(x) || x < 0)) throw new Error('--safe-area takes w:top,right,bottom,left[/w:…] or none, not ' + v);
    map[+w] = { top, right, bottom, left };
  }
  return { map, dflt: { top: 47, right: 0, bottom: 34, left: 0 } };
})();
const insetsFor = w => SAFE_AREA.map[w] || SAFE_AREA.dflt;
// The forced-state pass: how many elements per selector are forced and read.
const STATE_K = +(flags['state-k'] || 3);
// The backstop's signature of the dock icons' raster states (HOLDS): every
// case on record is 7–16 pixels, ±1–2 levels, inside the box of one of the
// dock's icons (36 flips replayed in the P review, round 2: every raster flip
// sits in the You, Steps or Weight icon; the dock's label row and ground are
// not the icons, and a first-load change there is not noise). A pixel-only
// difference is forgiven only when it looks like that.
const SIG = { maxPixels: 48, maxDelta: 4 };
// Where the backstop looks for the raster states the base tree produced on
// record (harness-lib knownBaseStates): the night's proof runs, or none.
const KNOWN_ROOTS = flags['known-states'] === 'none' ? [] : (list(flags['known-states']) || [join(NIGHT, 'proof')]).map(p => resolve(p));
const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const HOLDS = [
  'clock: Date / Date.now / new Date() / Intl format() frozen at NOW, performance.now() frozen, injected with Page.addScriptToEvaluateOnNewDocument before the app runs (timers still fire on wall time; nothing the app shows moves with them)',
  'Math.random: seeded mulberry32, reset per document; crypto.getRandomValues / randomUUID drawn from it',
  'time zone: Emulation.setTimezoneOverride ' + TZ + '; locale: Emulation.setLocaleOverride ' + LOCALE,
  'media: prefers-reduced-motion no-preference and prefers-color-scheme ' + SCHEME + ' emulated explicitly (the Mac\'s own settings never leak in); focus emulated',
  'animations: before each capture every finite animation and transition is finished and every infinite one paused at its first frame (Web Animations API), so the page is captured at rest — reduced motion is NOT emulated, because rack.css has a reduced-motion block and emulating it would prove the wrong variant',
  'caret: the focused element is blurred and the selection cleared before each capture',
  'order: settle → computed-style dump → settle again → re-make the dock (see raster states) → settle → +150ms → screenshot, so any repaint the dump sets off has finished before the capture',
  'stable screenshot: the capture is repeated until two in a row are byte-identical (at most ' + MAX_SHOTS + '), so a raster still in flight is never what gets compared; a scene that never steadies is reported (unstableShots), not hidden',
  'raster states: ' + (RELAYER ? '' : '(OFF in this run: --no-relayer) ') + 'before every screenshot the dock is taken out of the render tree and put back (a harness <style> with .dock{display:none!important}, two frames, removed, two frames, then settle again), so its composited layer and tilings are made again and rastered from the final display list; the DOM is left as it was. Why: Chrome 153\'s software raster (--disable-gpu) leaves the dock\'s SVG icons in one of two byte-exact states per page load, at random — ±1–2 levels on 6–17 anti-aliased pixels of the You and Steps icons (You and Weight at 320px), every computed style and rect identical, repeat captures of one load identical; which state a load gets follows its timing (1 in 30 boots of You at 390px, 2 in 30 of the drop scene, 19 in 60 of the drop scene with Archivo installed before the first layout). Re-making the dock removes one source of it — that last condition gave one PNG in 40 of 40 boots — but not every one: in the two full controls with it, 0 and then 3 of 120 scene×widths (session and peek at 390, peek at 320) still differed at the first attempt, each settled by one re-boot (see backstop). Each of these left it in place: --disable-partial-raster, a full repaint (a visibility toggle on <html>), a DSF round trip, font-display: block, installing Archivo before the first layout, and the compositor determinism flags (--run-all-compositor-stages-before-draw, --disable-threaded-animation, --disable-checker-imaging, --num-raster-threads=1 and two more: 9 first-attempt differences in a 120-pair control, against 0–3 without them)',
  'backstop: a pixel-only difference (0 style, rect, SVG, text, value, structure, attribute, head, state and keyframe differences) is re-booted up to ' + RETRIES + ' times a side with the same capture, and is forgiven only if (1) both sides produced one byte-identical PNG, (2) every PNG B produced is one A produced in this run, or one the base tree produced on record — the same bytes, for the same scene and width, on a side of an earlier prove run that was a clean tree at A\'s sha (not dirty, every file it served at its HEAD), under the same conditions (clock, zone, locale, scheme, DPR, height, safe area, seed, font, Chrome and its flags, relayer, vibe, data-vibe), measured by a clean harness this one descends from, whose base side also produced one of this run\'s A PNGs for that scene (the same page); while B has a state that is neither, A alone is booted again — (3) every other PNG either side produced differs from the shared one only as the dock icons\' raster states do (at most ' + SIG.maxPixels + ' pixels, at most ' + SIG.maxDelta + ' levels in any channel, every region inside the box of one of the dock\'s icons — its <svg>s, 2 device px of margin — not merely inside the dock, whose label row and ground are not the icons), and (4) every re-boot\'s dump equals A\'s first. A difference that shows on some loads and not others is not noise, even inside an icon, unless the base tree itself has shown those very bytes: it counts. Every case is reported (totals.pixelOnlyAtFirst, resolvedByReboot, notForgiven, rebootDiffs; per scene firstAttempt, rasterStates with the record each state of B\'s was found in, pixelRetries, backstop), and a baseline keeps every state the base tree produced in its control runs. Where the record was looked for: ' + (KNOWN_ROOTS.length ? KNOWN_ROOTS.join(', ') : 'nowhere (--known-states none: this run\'s A alone)'),
  'scrollbars: --hide-scrollbars',
  'font: the Archivo css2 request — the one URL rack.css line 1 names, byte for byte — answered with a local @font-face (weight 300 900, stretch 62% 125%) whose src (' + PINNED_FONT_URL + ') is answered with the pinned TTF, identically on both sides; any other fonts.googleapis.com request fails and is counted; guarded after boot by document.fonts.load(\'700 16px Archivo\') and a loaded Archivo FontFace',
  'network: the Firebase SDK → fakes/, sw.js emptied, service workers disabled and bypassed, the HTTP cache disabled, every other off-machine request failed; every URL each boot asked off this machine, query included, compared A against B (requestDiffs)',
  'seed: one seed.json, generated once with the clock frozen at the same NOW, injected into both sides',
  'viewport: ' + HEIGHT + 'px tall at DPR ' + DPR + ', mobile; screenshots are full-page (Page.captureScreenshot, captureBeyondViewport, clip = the CSS content size)',
  'safe area: env(safe-area-inset-*) set with Emulation.setSafeAreaInsetsOverride, per width, as an installed iPhone has them (' + JSON.stringify(SAFE_AREA.map) + ', else ' + JSON.stringify(SAFE_AREA.dflt) + ')',
  'after the screenshot (so it touches no pixel): every @keyframes sampled on probes of its own; every :active / :focus / :focus-visible / :focus-within / :hover rule\'s elements (the first ' + STATE_K + ' per selector) forced into the state with CSS.forcePseudoState, transitions finished, read, and released'
];
const NOTES = [
  'SVG: geometry attributes (d, points, x, y, cx, cy, r, rx, width, height, viewBox, transform, stroke-width, …) are compared RAW; paint (fill, stroke, stop-color, flood-color, lighting-color, color and the opacities) is compared by its COMPUTED value, not the attribute, because the engine may move a hex from an attribute into a style.',
  'Computed style: every property getComputedStyle enumerates except custom properties (--*), for every element under <html> except <head>\'s subtree, and its ::before and ::after (plus ::placeholder on inputs and textareas, ::marker on list items). <head> and <html>\'s attributes are reported under info, not counted as differences.',
  'Screenshots are compared byte-for-byte first; only when the bytes differ are both PNGs decoded (a zlib-only reader) and every differing pixel clustered into regions.',
  'Pixels are not device-pixel identity on their own: at the emulated DPR 3, headless Chrome drew a 0.5 CSS px move of the fixed dock\'s icons and labels (1.5 device px on a 3x iPhone) byte-identical to the unmoved dock. Rects are compared at full float precision (getBoundingClientRect) and computed styles value by value, so such a move is DIFFERENT all the same; a scene×width whose PNGs are byte-identical while its dump differs in style, rect, SVG, text, value or structure is marked unseenInPixels and counted (totals.unseenInPixels) — the dump saw what the screenshot did not.',
  'The proof used the pinned Archivo file named under font, not whatever Google Fonts serves tonight.',
  'Attributes: every attribute of every element but style (computed style covers it: the engine moves hexes into var() there) — aria-label, title, alt, placeholder, href, role, class, id, data-* — compared raw (attrDiffs). The head: every entry but scripts and preloads, with all its attributes, and document.title (headDiffs). A stylesheet link is compared whole — media, disabled, title, rel, any attribute: each is a condition on the entire sheet that a capture, run under one condition, cannot see — for every sheet both sides link, and in its order among them; a sheet only B links (a vibe\'s) is listed under info.headSheetsOnlyB, and css-static checks its rules are scoped.',
  'Stylesheets as text (checks.css, css-static.mjs): every rule of every stylesheet both sides link, with var() resolved, compared in order — the rules in each file and the declarations in each rule — with custom property names, strings, url() bodies and identifiers (animation names) kept in their case and strings\' inner whitespace kept; only whitespace elsewhere, a leading zero, and the case of hex colours, function names, units and !important are normalised. This is what reaches -webkit-backdrop-filter (Chrome drops it; iOS paints the dock and the workout bar with it), rules no scene renders, and @media blocks this viewport never enters (min-width: 900px, prefers-reduced-motion: reduce).',
  'Coverage (summary.coverage): a rule that differs in text counts as measured in a scene only when, at that capture, every @media around it matched and every @supports held (a rule in @media (min-width: 900px) styles nothing at 390 or 320, however many elements match its selector); a declaration Chrome drops at parse time (CSS.supports false for its value, e.g. -webkit-backdrop-filter) is measured by the text comparison alone, wherever its rule was measured (textOnlyDecls).',
  'The fixture (scenes-cover.json): every style rule in effect built as a small chain of elements in a zero-height, contained box, so its computed style is measured even when no scene reaches it (what could not be built is in info.fixture).',
  'Files no capture measures (checks.files, fileDiffs): every file the site ships (tracked at HEAD — every file, when the tree is not git — but the docs, report/ and tools-check/), fetched from each side\'s server and compared byte for byte, except the scripts, stylesheets and index.html that both sides\' pages loaded, whose effect the captures measure. So manifest.json (Chrome asks for it; nothing reads it), sw.js (the harness answers it with an empty worker), 404.html (no scene opens it) and the icons are compared as bytes. A file only A ships counts; one only B ships is listed (the engine adds its own).',
  'Provenance: every local file each side served, and every shipped file the file comparison fetched, is checked against the blob at that tree\'s HEAD, and a tree with a tracked file modified is not its commit either (summary.provenance: DIRTY unless --allow-dirty); /vibe.js must be served exactly when HEAD has it, with HEAD\'s bytes.'
];

// Chrome's own traffic off (nothing to do with the page), plus whatever
// --chrome-flags adds for an experiment.
const PROOF_FLAGS = ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps'];

// scenes.json is the btn-44 set (measure.mjs reads it too); scenes-cover.json
// adds the fixture and the call sites no btn-44 scene reaches (the P review).
const SCENES = [...JSON.parse(readFileSync(join(HERE, 'scenes.json'), 'utf8')),
  ...(existsSync(join(HERE, 'scenes-cover.json')) ? JSON.parse(readFileSync(join(HERE, 'scenes-cover.json'), 'utf8')) : [])];
const HELPERS = readFileSync(join(HERE, 'helpers.js'), 'utf8');
const CAPTURE = readFileSync(join(HERE, 'capture.js'), 'utf8');

if (MODE === 'baseline') { makeBaseline(); process.exit(0); }

/* ---------- which scenes ---------- */
function plan(groupsWanted, scenesWanted, extra = {}, { proveOnly = true } = {}) {
  const groups = SCENES.map(g => ({ ...g, scenes: [...g.scenes, ...(extra[g.group] || [])] }));
  const out = [];
  for (const g of groups) {
    if (groupsWanted && !groupsWanted.includes(g.group)) continue;
    // The fixture is for the proof; fit and shoot leave it out unless asked for.
    if (g.proveOnly && !proveOnly && !groupsWanted && !(scenesWanted && g.scenes.some(s => scenesWanted.includes(s.name)))) continue;
    const sel = new Set(g.scenes.filter(s => !scenesWanted || scenesWanted.includes(s.name)).map(s => s.name));
    if (sel.size) out.push({ g, sel });
  }
  if (scenesWanted) {
    const known = new Set(groups.flatMap(g => g.scenes.map(s => s.name)));
    const unknown = scenesWanted.filter(s => !known.has(s));
    if (unknown.length) throw new Error('unknown scene(s): ' + unknown.join(', '));
  }
  return out;
}

/* ---------- the session: lock, servers, Chrome ---------- */
let c = null, chrome = null, chromeArgs = [], seedFile = null, fontBytes = null, stats = {}, log = console.log, lockAt = null;
const loadWaiters = [];
let bootScriptId = null;
// The Archivo css2 URL rack.css line 1 names: the only one answered with the
// pinned face (harness-lib intercept). Set before the first boot.
let FONT_CSS_URL = null;
const fontCssUrlOf = line => { const m = String(line).match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/); return m ? m[1] : null; };
// Every URL each side's pages asked for, query kept: a local one by the port in
// it, one off this machine by the port being booted when it was asked for. A
// tree that fetches something the other does not shows up here even when it
// changes no pixel (summary.requests, information: the engine adds modules of
// its own). What each boot asked OFF this machine is also kept in order, by
// boot (bootRequests), and compared A against B: that is counted.
const requested = new Map();   // port -> Set of '/path?query' or 'https://host/path?query'
const bootRequests = new Map(); // 'port|group@width|attempt' -> [off-machine URLs]
let bootingPort = null, bootKey = null;
function noteRequest(u) {
  let x;
  try { x = new URL(u); } catch { return; }
  if (!/^https?:$/.test(x.protocol)) return;
  const local = x.hostname === '127.0.0.1';
  const port = local ? +x.port : bootingPort;
  if (port == null) return;
  if (!requested.has(port)) requested.set(port, new Set());
  requested.get(port).add(local ? x.pathname + x.search : x.origin + x.pathname + x.search);
  if (!local && bootKey) { if (!bootRequests.has(bootKey)) bootRequests.set(bootKey, []); bootRequests.get(bootKey).push(x.origin + x.pathname + x.search); }
}
// What one boot asked off this machine; A against B as multisets.
function requestDiff(a = [], b = []) {
  const left = [...b], onlyA = [];
  for (const u of a) { const i = left.indexOf(u); if (i >= 0) left.splice(i, 1); else onlyA.push(u); }
  return { onlyA, onlyB: left };
}

async function setup({ run, outDir, serve }) {
  mkdirSync(outDir, { recursive: true });
  log = logger(join(outDir, 'run.log'));
  log('harness ' + MODE + ' run ' + run + ' (pid ' + process.pid + ')');
  fontBytes = readFileSync(FONT_PATH);
  const fsha = sha256(fontBytes);
  if (fsha !== FONT_SHA) throw new Error('pinned Archivo sha256 is ' + fsha + ', expected ' + FONT_SHA + ' (' + FONT_PATH + ')');
  log('font ' + FONT_PATH + ' sha256 ' + fsha);
  if (!RELAYER) log('--no-relayer: the dock is NOT re-made before screenshots (diagnosis only)');
  if (!Number.isFinite(NOW)) throw new Error('--now does not parse');
  const raw = readFileSync(SEED_PATH);
  seedFile = JSON.parse(raw);
  if (seedFile.now !== NOW) throw new Error('seed ' + SEED_PATH + ' was generated at ' + seedFile.now + ', not NOW ' + NOW + ' — regenerate it (see the header)');
  if (!seedFile.liveDrop) throw new Error('seed has no liveDrop — regenerate it with this seed.mjs');
  seedFile.sha256 = sha256(raw);
  log('seed ' + SEED_PATH + ' sha256 ' + seedFile.sha256);
  await acquireLock({ log });
  lockAt = Date.now();
  log('lock held');
  const servers = [];
  for (const s of serve) servers.push(await startServer(s.repo, s.port, log));
  const profile = join(NIGHT, 'tmp', run, 'chrome');
  onCleanup(() => { try { rmScratch(join(NIGHT, 'tmp', run)); } catch {} });
  chromeArgs = [...CHROME_FLAGS, ...PROOF_FLAGS, ...(list(flags['chrome-flags']) || [])];
  chrome = await startChrome({ cdpPort: CDP_PORT, profile, flags: chromeArgs.slice(CHROME_FLAGS.length), log });
  log('chrome flags: ' + chromeArgs.join(' '));
  c = new CDP(chrome.target.webSocketDebuggerUrl);
  await c.open();
  await c.send('Page.enable'); await c.send('Runtime.enable');
  // DOM and CSS: the forced-state pass (CSS.forcePseudoState) after each screenshot.
  await c.send('DOM.enable'); await c.send('CSS.enable');
  await c.send('Network.enable');
  await c.send('Network.setBypassServiceWorker', { bypass: true });
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await c.send('Emulation.setTimezoneOverride', { timezoneId: TZ });
  await c.send('Emulation.setLocaleOverride', { locale: LOCALE });
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: SCHEME }] });
  await c.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  c.on('Page.loadEventFired', () => { while (loadWaiters.length) loadWaiters.shift()(); });
  stats = intercept(c, { ports: serve.map(s => s.port), fakes: loadFakes(), font: fontBytes, stats: {}, onRequest: noteRequest, fontCssUrl: () => FONT_CSS_URL });
  return servers;
}

async function shutdown() {
  try { chrome && chrome.proc.kill(); } catch {}
  if (chrome) await Promise.race([new Promise(r => chrome.proc.exitCode !== null ? r() : chrome.proc.once('exit', r)), sleep(5000)]);
}

async function vibeStatus(port) {
  const r = await fetch('http://127.0.0.1:' + port + '/vibe.js');
  const bytes = Buffer.from(await r.arrayBuffer());
  return { status: r.status, bytes };
}
// /vibe.js tells base (404) from engine (200), but only if the file served is
// the tree's own: a stray untracked vibe.js in a base tree answers 200 too. So
// it has to be served exactly when HEAD has it, with HEAD's bytes. Null when
// that holds (or the tree is not git: provenance reports that at the end).
function vibeProvenance(repo, { status, bytes }) {
  const blobs = headBlobs(repo);
  if (!blobs) return null;
  const at = blobs.get('vibe.js');
  if (status === 200 && !at) return 'serves /vibe.js, but its HEAD has none: an untracked (or ignored) vibe.js is being served';
  if (status === 200 && blobSha(bytes) !== at) return 'serves a /vibe.js that is not the one at its HEAD (modified)';
  if (status !== 200 && at) return 'has vibe.js at HEAD, but answers /vibe.js with ' + status;
  return null;
}
// The stylesheets a port's index.html links (and its inline <style>s), as served.
async function sheetsOf(port) {
  const base = 'http://127.0.0.1:' + port + '/';
  const html = await (await fetch(base + 'index.html')).text();
  const { links, styles } = linkedSheets(html);
  const out = {};
  for (const l of links) { const r = await fetch(base + l); out[l] = r.status === 200 ? await r.text() : ''; }
  for (const s of styles) out[s.name] = s.text;
  return out;
}
function saveSheets(dir, sheets) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sheets.json'), JSON.stringify(sheets));
}
async function cssLine1(port) {
  const r = await fetch('http://127.0.0.1:' + port + '/rack.css');
  const b = Buffer.from(await r.arrayBuffer());
  const nl = b.indexOf(10);
  return nl < 0 ? b : b.subarray(0, nl);
}

/* ---------- boot one tree into one scene group ---------- */
async function boot(port, width, cfg, key = null) {
  bootingPort = port;
  bootKey = key;
  await c.send('Emulation.setDeviceMetricsOverride', { width, height: HEIGHT, deviceScaleFactor: DPR, mobile: true });
  await c.send('Emulation.setSafeAreaInsetsOverride', { insets: insetsFor(width) });
  if (bootScriptId) await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: bootScriptId });
  const { UID, seed, live, liveDrop } = seedFile;
  const user = cfg.user === undefined ? { uid: UID, email: 'm@example.test', displayName: 'Micah' } : cfg.user;
  const s = JSON.parse(JSON.stringify(seed));
  if (cfg.onboarding === false) delete s.users[UID].onboarding;
  if (cfg.approve && cfg.user) s.access.approved[cfg.user.uid] = { at: NOW - 60e3, via: 'invite', code: 'CDEFGHJKMN', name: cfg.user.displayName, email: cfg.user.email, ...(cfg.approveExtra || {}) };
  if (cfg.tour) s.users[UID].onboarding = { done: true, tourDone: false, at: NOW - 864e5, version: 3 };
  const session = cfg.liveDrop ? liveDrop : cfg.live ? live : null;
  // The account value wins over the device hint (§8.1), so --vibe goes in both.
  // Only the seeded account has a node to hold it: the gate's stranger and the
  // onboarding newbie get the device hint alone, as a real new account would.
  if (VIBE !== null && s.users[UID]) (s.users[UID].settings = s.users[UID].settings || {}).vibe = VIBE;
  const forceAttr = DATA_VIBE === null ? '' : `
    window.__FORCE_DATA_VIBE = ${JSON.stringify(DATA_VIBE)};
    (() => { const put = () => { const h = document.documentElement; if (h && h.getAttribute('data-vibe') !== window.__FORCE_DATA_VIBE) h.setAttribute('data-vibe', window.__FORCE_DATA_VIBE); return !!h; };
      if (!put()) new MutationObserver((m, o) => { if (put()) o.disconnect(); }).observe(document, { childList: true }); })();`;
  const src = pageClockScript({ now: NOW }) + forceAttr + `
    try { localStorage.clear(); } catch {}
    ${VIBE !== null ? `try { localStorage.setItem('rack:vibe', ${JSON.stringify(VIBE)}); } catch {}` : ''}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.reject(new Error('no sw in harness')), controller: null, addEventListener() {}, ready: new Promise(() => {}) }, configurable: true }); } catch {}
    window.__FAKE_USER = ${JSON.stringify(user)};
    window.__SEED = ${JSON.stringify(s)};
    ${session ? `localStorage.setItem(${JSON.stringify('rack:' + UID + ':activeSession')}, ${JSON.stringify(JSON.stringify(session))});` : ''}`;
  bootScriptId = (await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src })).identifier;
  const before = { css: stats.fontCss || 0, file: stats.fontFile || 0 };
  const loaded = new Promise(r => { loadWaiters.push(r); });
  await c.send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/index.html' });
  await Promise.race([loaded, sleep(15000)]);
  await c.ev(`(async () => { for (let i = 0; i < 200; i++) { if (document.readyState === 'complete' && document.querySelector('.dock') && document.fonts.status === 'loaded') break; await new Promise(r => setTimeout(r, 50)); } await document.fonts.ready; return true; })()`);
  const where = await c.ev(`location.href + ' dock=' + !!document.querySelector('.dock') + ' fonts=' + document.fonts.status + ' now=' + Date.now() + ' vibe=' + (document.documentElement.getAttribute('data-vibe'))`);
  if (!/dock=true/.test(where)) throw new Error('not booted: ' + where);
  if (!where.includes(' now=' + NOW + ' ')) throw new Error('clock not frozen: ' + where);
  // fonts.check() alone passes when nothing loaded: ask for the face, and see it loaded.
  const f = await c.ev(`(async () => { const load = (await document.fonts.load('700 16px Archivo')).length > 0;
    const faces = [...document.fonts].filter(f => f.family.replace(/["']/g, '') === 'Archivo');
    return { load, loaded: faces.some(f => f.status === 'loaded'), faces: faces.map(f => f.status) }; })()`);
  if (!f.load || !f.loaded) throw new Error('Archivo guard failed: ' + JSON.stringify(f));
  if ((stats.fontCss || 0) === before.css) throw new Error('the Archivo css2 request never reached the harness — the font did not come from the pinned file');
  if ((stats.fontFile || 0) === before.file) throw new Error('the pinned Archivo file was never requested in this boot — the face did not come from the pinned bytes');
  if (DATA_VIBE !== null && !where.endsWith(' vibe=' + DATA_VIBE)) throw new Error('data-vibe not forced: ' + where);
  await c.ev(HELPERS);
  await c.ev(CAPTURE);
  await c.ev(`__h.settle(${cfg.wait || 1500})`);
  return where;
}

async function screenshot(full) {
  if (!full) return Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  const m = await c.send('Page.getLayoutMetrics');
  const cs = m.cssContentSize || m.contentSize;
  const clip = { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 };
  const png = Buffer.from((await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })).data, 'base64');
  // A capture Chrome clamped (a very tall page) must not pass as a whole page.
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (Math.abs(w - clip.width * DPR) > 1 || Math.abs(h - clip.height * DPR) > 1) throw new Error('screenshot is ' + w + '×' + h + ', expected ' + clip.width * DPR + '×' + clip.height * DPR + ' — truncated');
  return png;
}

// Boot, then run a group's scenes in order up to its last selected one, calling
// onScene for each selected scene. A scene's error ends the group unless the
// scene says fatal: false (as measure.mjs does); an optional scene that cannot
// run is marked skipped. `attempt` names the boot for bootRequests ('first',
// or the backstop's 'r1'…).
async function runGroup(port, width, g, sel, onScene, attempt = 'first') {
  const res = [];
  const t0 = Date.now();
  try { await boot(port, width, g.cfg || {}, port + '|' + g.group + '@' + width + '|' + attempt); }
  catch (e) { for (const s of g.scenes) if (sel.has(s.name)) res.push({ scene: s.name, error: 'boot: ' + e.message.slice(0, 300) }); return res; }
  let last = -1;
  g.scenes.forEach((s, i) => { if (sel.has(s.name)) last = i; });
  for (let i = 0; i <= last; i++) {
    const s = g.scenes[i];
    try { await c.ev(`(async () => { ${s.js} })()`); }
    catch (e) {
      if (s.optional) { if (sel.has(s.name)) res.push({ scene: s.name, skipped: 'absent: ' + e.message.slice(0, 160) }); continue; }
      if (sel.has(s.name)) res.push({ scene: s.name, error: e.message.slice(0, 300) });
      if (s.fatal !== false) {
        for (let j = i + 1; j <= last; j++) if (sel.has(g.scenes[j].name)) res.push({ scene: g.scenes[j].name, error: 'not reached: ' + s.name + ' failed' });
        break;
      }
      continue;
    }
    if (!sel.has(s.name)) continue;
    try { res.push({ scene: s.name, ...(await onScene(s)) }); }
    catch (e) { res.push({ scene: s.name, error: 'capture: ' + e.message.slice(0, 300) }); }
  }
  log('  ' + g.group + '@' + width + ' on :' + port + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  return res;
}

// Settle, dump, settle again, shoot. The second settle is a determinism fix:
// the first dump in a document (a few MB of computed style) was followed, in
// about one boot in four, by a repaint of the dock's icons that a capture taken
// straight after could catch half done — ~16 anti-aliasing pixels on the You and
// Steps icons, and nothing in any computed style (reproduced and fixed with
// ~/dev/vibes-night/tools/raster-stress.mjs). The dump reads the page before the
// capture's own viewport resize can touch it.
//
// After the screenshot, so no pixel can move: every @keyframes on probes
// (dump.kf), the state rules' elements forced and read (dump.states), and, for
// the coverage report, how many elements each rule that differs in text
// between A and B styles here — none when an @media around it does not match
// (cover).
let TOUCHED = [];   // the rules whose text differs (prove): { key, sel, media, supports, other }
async function capture() {
  const settled = await c.ev('__cap.settle()', 30000);
  const dump = hashDump(JSON.parse(await c.ev('__cap.dump()', 180000)));
  const again = await c.ev('__cap.settle()', 30000);
  if (again.forced) settled.forcedAfterDump = again.forced;
  await relayer();
  await sleep(150);
  const dock = await c.ev('__cap.dockBox()');
  const { png, shots, stable } = await stableShot();
  dump.kf = await c.ev('__cap.keyframes()', 30000);
  const sp = await statesPass();
  dump.states = sp.states;
  dump.statesInfo = sp.info;
  const cover = TOUCHED.length ? await c.ev('__cap.count(' + JSON.stringify(TOUCHED.map(({ sel, media, supports, other }) => ({ sel, media, supports, other }))) + ')', 30000) : null;
  return { dump, png, dock, cover, settled: { ...settled, shots, ...(stable ? {} : { unstable: true }) } };
}

// Force each state on the first STATE_K elements of each selector that holds
// it, read the rules' elements with it forced (transitions finished), release.
async function statesPass() {
  const { plan, unreachable } = await c.ev('__cap.statePlan()', 30000);
  const states = {}, info = { unreachable, forced: {} };
  let doc = null;
  for (const kind of Object.keys(plan).sort()) {
    const p = plan[kind];
    if (!doc) doc = (await c.send('DOM.getDocument', { depth: 0 })).root;
    const nodes = [];
    for (const sel of p.force) {
      let r;
      try { r = await c.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: sel }); } catch { continue; }
      for (const n of r.nodeIds.slice(0, STATE_K)) if (!nodes.includes(n)) nodes.push(n);
    }
    info.forced[kind] = nodes.length;
    if (!nodes.length) continue;
    try {
      for (const n of nodes) await c.send('CSS.forcePseudoState', { nodeId: n, forcedPseudoClasses: [kind] });
      states[kind] = await c.ev('__cap.quiet(); __cap.stateDump(' + JSON.stringify([...p.force, ...p.subj]) + ', ' + STATE_K + ')', 60000);
    } finally {
      for (const n of nodes) { try { await c.send('CSS.forcePseudoState', { nodeId: n, forcedPseudoClasses: [] }); } catch {} }
      try { await c.ev('__cap.quiet()'); } catch {}
    }
  }
  return { states, info };
}

// The determinism fix for the dock icons' raster states (HOLDS): the dock's
// layer made again from the final display list, then settled again, because
// putting it back restarts its marker's animation.
async function relayer() {
  if (!RELAYER) return;
  if (!(await c.ev('__cap.relayer()', 30000))) throw new Error('relayer: no .dock to re-make');
  await c.ev('__cap.settle()', 30000);
}

// Full-page captures until two in a row are byte-identical. A second capture of
// a page at rest is the same bytes; one that differs caught a raster in flight.
async function stableShot() {
  let prev = await screenshot(true), shots = 1;
  while (shots < MAX_SHOTS) {
    await sleep(100);
    const png = await screenshot(true);
    shots++;
    if (png.equals(prev)) return { png, shots, stable: true };
    prev = png;
  }
  return { png: prev, shots, stable: MAX_SHOTS === 1 };
}

/* ---------- prove ---------- */
async function prove() {
  const against = flags.against ? resolve(flags.against) : null;
  const A = against ? null : resolve(flags.a || '');
  const B = resolve(flags.b || '');
  if ((!against && !flags.a) || !flags.b) throw new Error('prove needs --a <tree> (or --against <baseline>) and --b <tree>');
  const run = flags.run || 'prove-' + STAMP;
  const outDir = join(resolve(flags['out-root'] || join(NIGHT, 'proof')), run);
  assertOutside(outDir, [A, B, join(HERE, '..', '..')]);
  // A and B's /vibe.js status; against a baseline only B is served, so one
  // status (or the last of two) is B's.
  const ev = String(flags['expect-vibe'] || (against ? '404' : '404,404')).split(',').map(Number);
  if (!against && ev.length !== 2) throw new Error('--expect-vibe takes two statuses, A,B (e.g. 404,200)');
  const [expA, expB] = against ? [null, ev[ev.length - 1]] : ev;
  const portA = +(flags['port-a'] || 8765), portB = +(flags['port-b'] || 8766);
  const widths = (list(flags.widths) || ['390', '320']).map(Number);
  const todo = plan(list(flags.groups), list(flags.scenes));
  const dirA = against || join(outDir, 'A'), dirB = join(outDir, 'B');
  let manifest = null;
  if (against) {
    manifest = JSON.parse(readFileSync(join(against, 'manifest.json'), 'utf8'));
    if (manifest.dumpFormat !== DUMP_FORMAT) throw new Error('baseline ' + against + ' holds dumps of format ' + (manifest.dumpFormat || 1) + '; this harness writes format ' + DUMP_FORMAT + ' (attributes, states, keyframes, the head) — make the baseline again from control runs of this harness');
    if (!manifest.files || !manifest.loaded) throw new Error('baseline ' + against + ' keeps no shas of the files the site ships (checks.files) — the files no capture measures cannot be compared against it; make the baseline again from control runs of this harness');
  }
  const t0 = Date.now();
  const serve = against ? [{ repo: B, port: portB }] : [{ repo: A, port: portA }, { repo: B, port: portB }];
  await setup({ run, outDir, serve });
  const safeArea = Object.fromEntries(widths.map(w => [w, insetsFor(w)]));
  const summary = { run, mode: against ? 'prove-against-baseline' : 'prove', startedAt: new Date(t0).toISOString(),
    harness: gitHead(join(HERE, '..', '..')), dumpFormat: DUMP_FORMAT,
    A: against ? { baseline: against, sha: manifest.sha } : { repo: A, port: portA, ...gitHead(A) },
    B: { repo: B, port: portB, ...gitHead(B) },
    now: NOW_ISO, nowMs: NOW, tz: TZ, locale: LOCALE, colorScheme: SCHEME, dpr: DPR, height: HEIGHT, widths, safeArea, vibe: VIBE, dataVibe: DATA_VIBE, maxShots: MAX_SHOTS, stateK: STATE_K, allowDirty: ALLOW_DIRTY,
    font: { path: FONT_PATH, sha256: FONT_SHA }, relayer: RELAYER, seed: { path: SEED_PATH, sha256: seedFile.sha256 }, knownStates: KNOWN_ROOTS,
    chrome: chrome.version && chrome.version.Browser, chromeFlags: chromeArgs, holds: HOLDS, notes: NOTES, checks: {}, scenes: {}, groups: {}, bootRequests: {}, coverage: null, provenance: null, totals: null, verdict: null };
  // Which tree is on which port: /vibe.js is a 404 on base and a 200 on the
  // engine — and the file served has to be the tree's own (vibeProvenance).
  const vibeCheck = (side, repo, port, got, exp) => {
    if (got.status !== exp) throw new Error('port ' + port + ' (' + side + ', ' + repo + ') answers /vibe.js with ' + got.status + ', expected ' + exp);
    const bad = vibeProvenance(repo, got);
    if (bad && !ALLOW_DIRTY) throw new Error('port ' + port + ' (' + side + ', ' + repo + ') ' + bad + ' — the tree is not the commit it claims (pass --allow-dirty for a WIP run)');
    if (bad) log('WARNING (--allow-dirty): ' + side + ' ' + bad);
    return bad;
  };
  if (!against) {
    const sA = await vibeStatus(portA);
    summary.checks.vibeA = sA.status;
    summary.checks.vibeAProvenance = vibeCheck('A', A, portA, sA, expA);
  }
  const sB = await vibeStatus(portB);
  summary.checks.vibeB = sB.status;
  summary.checks.vibeBProvenance = vibeCheck('B', B, portB, sB, expB);
  log('/vibe.js: A ' + (summary.checks.vibeA ?? 'baseline') + ', B ' + sB.status + ' — as expected');
  // rack.css line 1, the Archivo @import, byte for byte.
  const l1B = await cssLine1(portB);
  const l1A = against ? Buffer.from(manifest.rackCssLine1, 'utf8') : await cssLine1(portA);
  summary.checks.rackCssLine1 = { A: l1A.toString('utf8'), B: l1B.toString('utf8'), identical: l1A.equals(l1B) };
  if (!l1A.equals(l1B)) throw new Error('rack.css line 1 differs: A ' + JSON.stringify(l1A.toString()) + ' B ' + JSON.stringify(l1B.toString()));
  log('rack.css line 1 identical: ' + l1A.toString());
  FONT_CSS_URL = fontCssUrlOf(l1A.toString('utf8'));
  summary.checks.fontCssUrl = FONT_CSS_URL;
  if (against) {
    const want = { chrome: summary.chrome, chromeFlags: chromeArgs.join(' '), archivoSha256: FONT_SHA, relayer: RELAYER, nowMs: NOW, tz: TZ, dpr: DPR, height: HEIGHT, seedSha256: seedFile.sha256, locale: LOCALE, colorScheme: SCHEME, stateK: STATE_K };
    const bad = Object.entries(want).filter(([k, v]) => manifest[k] !== v).map(([k, v]) => k + ': baseline ' + manifest[k] + ' vs now ' + v);
    for (const w of widths) if (JSON.stringify((manifest.safeArea || {})[w]) !== JSON.stringify(insetsFor(w))) bad.push('safe area at ' + w + ': baseline ' + JSON.stringify((manifest.safeArea || {})[w]) + ' vs now ' + JSON.stringify(insetsFor(w)));
    if (bad.length) throw new Error('baseline was captured under different conditions — ' + bad.join('; '));
  }
  // The stylesheets as text, var() resolved (css-static.mjs): what no capture
  // reaches. Kept beside the dumps (a baseline keeps A's).
  const sheetsB = await sheetsOf(portB);
  const sheetsA = against ? JSON.parse(readFileSync(join(against, 'sheets.json'), 'utf8')) : await sheetsOf(portA);
  if (!against) saveSheets(dirA, sheetsA);
  saveSheets(dirB, sheetsB);
  const css = compareSheets(sheetsA, sheetsB);
  summary.checks.css = { count: css.count, first: css.first, files: css.files, onlyA: css.onlyA, onlyB: css.onlyB, tokensOnlyB: css.tokensOnlyB, rulesDifferingInText: css.touched.length };
  log('stylesheets as text: ' + Object.entries(css.files).map(([n, f]) => n + ' ' + f.declsEqual + '/' + f.declsCompared + ' declarations equal').join(', ') + '; differences ' + css.count + (css.onlyB.length ? '; only B links ' + css.onlyB.map(x => x.file).join(', ') : ''));
  // Coverage: the rules whose text differs between A and B, each by its own
  // key (a .sheet in @media (min-width: 900px) is not the top-level .sheet),
  // with the selector its element can be found by, the at-rule conditions it is
  // in effect under, and the declarations that differ in text.
  const touched = css.touched.map(r => ({ file: r.file, key: r.key, sel: r.sel, ctx: r.ctx, cond: contextOf(r.ctx), decls: r.decls || [], test: testable(r.sel, r.ctx),
    state: /:(hover|active|focus)/.test(r.sel), keyframes: (r.ctx.find(x => /^@(-webkit-)?keyframes/i.test(x)) || '').replace(/^@(-webkit-)?keyframes\s+/i, '') || null }));
  const conditional = c => c.media.length + c.supports.length + c.other.length > 0;
  TOUCHED = touched.filter(t => t.test).map(t => ({ key: t.key, sel: t.test, media: t.cond.media, supports: t.cond.supports, other: t.cond.other }));
  const cover = new Map(TOUCHED.map(t => [t.key, { scenes: [], fixture: 0 }]));
  const kfSeen = new Set();
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));

  for (const width of widths) {
    mkdirSync(join(dirB, String(width)), { recursive: true });
    if (!against) mkdirSync(join(dirA, String(width)), { recursive: true });
    for (const { g, sel } of todo) {
      const tg = Date.now();
      let resA;
      if (!against) {
        resA = await runGroup(portA, width, g, sel, async s => {
          const { dump, png, settled } = await capture();
          writeGz(join(dirA, String(width), s.name + '.dump.json.gz'), dump);
          writeFileSync(join(dirA, String(width), s.name + '.png'), png);
          return { pngSha: sha256(png), elements: dump.els.length, styles: dump.styles.length, settled };
        });
      } else {
        resA = [...sel].map(name => {
          const m = manifest.scenes[name + '@' + width];
          return m ? { scene: name, pngSha: m.pngSha, elements: m.elements, states: m.states || null } : { scene: name, error: 'not in the baseline' };
        });
      }
      const byA = new Map(resA.map(r => [r.scene, r]));
      const resB = await runGroup(portB, width, g, sel, async s => {
        const { dump, png, settled, dock, cover: counts } = await capture();
        const a = byA.get(s.name);
        writeGz(join(dirB, String(width), s.name + '.dump.json.gz'), dump);
        if (counts) counts.forEach(([real, fix], i) => { const c0 = cover.get(TOUCHED[i].key); if (real > 0) c0.scenes.push(s.name + '@' + width); if (fix > 0) c0.fixture++; });
        Object.keys(dump.kf || {}).forEach(n => kfSeen.add(n));
        const out = { pngSha: sha256(png), elements: dump.els.length, styles: dump.styles.length, settled, dock };
        if (!a || a.error) return out;
        // Against a baseline, any raster state the base tree produced counts.
        const hit = a.states ? a.states.find(x => x.sha === out.pngSha) : (out.pngSha === a.pngSha ? { sha: a.pngSha } : null);
        const cmp = { pixelsEqual: !!hit, diffRegions: [], diffPixels: 0, ...(hit && a.states && hit.sha !== a.pngSha ? { matchedState: hit.file } : {}) };
        if (!cmp.pixelsEqual) {
          writeFileSync(join(dirB, String(width), s.name + '.png'), png);
          const d = diffPNG(readFileSync(join(dirA, String(width), s.name + '.png')), png, DPR);
          Object.assign(cmp, { diffPixels: d.diffPixels, diffRegionCount: d.regionCount, diffRegions: d.regions, sizeA: d.sizeA, sizeB: d.sizeB, sizeMismatch: d.sizeMismatch });
        }
        const dA = readGz(join(dirA, String(width), s.name + '.dump.json.gz'));
        Object.assign(cmp, compareDumps(dA, dump));
        return { ...out, cmp };
      });
      const byB = new Map(resB.map(r => [r.scene, r]));
      for (const name of sel) {
        const a = byA.get(name) || { error: 'no result' }, b = byB.get(name) || { error: 'no result' };
        const errors = [a.error && 'A: ' + a.error, b.error && 'B: ' + b.error].filter(Boolean);
        const cm = b.cmp;
        summary.scenes[name + '@' + width] = cm && !errors.length ? {
          scene: name, group: g.group, width, pixelsEqual: cm.pixelsEqual, diffPixels: cm.diffPixels, diffRegions: cm.diffRegions,
          ...(cm.sizeMismatch ? { sizeA: cm.sizeA, sizeB: cm.sizeB } : {}),
          ...Object.fromEntries(DIFF_KINDS.map(k => [k, cm[k]])),
          elements: cm.elements, pngSha: [a.pngSha, b.pngSha], dock: b.dock || null, info: cm.info, ...(cm.matchedState ? { matchedState: cm.matchedState } : {}),
          // The PNGs byte-identical while the dump differs where it renders:
          // the screenshot did not show it (NOTES, pixels at DPR 3).
          ...(cm.pixelsEqual && RENDERED_KINDS.some(k => cm[k] && cm[k].count) ? { unseenInPixels: true } : {}),
          shots: [a.settled ? a.settled.shots : null, b.settled ? b.settled.shots : null],
          ...((a.settled && a.settled.unstable) || (b.settled && b.settled.unstable) ? { unstable: [!!(a.settled && a.settled.unstable), !!(b.settled && b.settled.unstable)] } : {}),
          ...((a.settled && a.settled.forced) || (b.settled && b.settled.forced) ? { dataVibeReasserted: [a.settled && a.settled.forced || 0, b.settled && b.settled.forced || 0] } : {}),
          errors: []
        } : { scene: name, group: g.group, width, errors };
      }
      // A difference in pixels alone — every computed style, rect, SVG
      // attribute, text and value equal — counts only if it reproduces.
      const pixelOnly = [...sel].filter(name => { const x = summary.scenes[name + '@' + width]; return x && !x.errors.length && !x.pixelsEqual && stylesClean(x); });
      if (pixelOnly.length && RETRIES > 0) await confirmPixels({ g, width, names: pixelOnly, portA, portB, against, dirA, dirB, summary, manifest, outDir });
      // What this group's first boot on each side asked off this machine.
      const gk = g.group + '@' + width;
      const qA = against ? ((manifest.bootRequests || {})[gk] || null) : (bootRequests.get(portA + '|' + gk + '|first') || []);
      const qB = bootRequests.get(portB + '|' + gk + '|first') || [];
      summary.bootRequests[gk] = qA === null ? { A: null, B: qB, onlyA: [], onlyB: [], note: 'not in the baseline' } : { A: qA, B: qB, ...requestDiff(qA, qB) };
      summary.groups[gk] = +((Date.now() - tg) / 1000).toFixed(1);
      const s = Object.values(summary.scenes).filter(x => x.group === g.group && x.width === width);
      const rq = summary.bootRequests[gk];
      log(gk + ': ' + s.map(x => x.scene + (x.errors.length ? ' ERR' : sceneClean(x) ? ' =' : ' ≠(' + ['px ' + x.diffPixels, ...DIFF_KINDS.filter(k => x[k].count).map(k => k.replace('Diffs', '') + ' ' + x[k].count), ...(x.rebootDiffs ? ['reboot ' + x.rebootDiffs] : []), ...(x.backstop && !x.backstop.forgiven ? ['not forgiven'] : [])].join(', ') + ')')).join(', ')
        + (rq.onlyA.length || rq.onlyB.length ? ' | requests only A ' + JSON.stringify(rq.onlyA) + ' only B ' + JSON.stringify(rq.onlyB) : ''));
      finish(summary, t0, todo.reduce((n, t) => n + t.sel.size, 0) * widths.length);
      writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
    }
  }
  summary.fetch = { ...stats, failed: undefined, failedSample: stats.failed || [] };
  // What each side asked the network for, query kept. Information: the engine
  // adds its own modules. (What each boot asked OFF this machine is counted:
  // bootRequests, totals.requestDiffs.)
  const asked = port => [...(requested.get(port) || [])].sort();
  const rA = against ? null : asked(portA), rB = asked(portB);
  summary.requests = against ? { B: rB } : { A: rA, B: rB, onlyA: rA.filter(u => !rB.includes(u)), onlyB: rB.filter(u => !rA.includes(u)) };
  if (!against) log('requests: A ' + rA.length + ', B ' + rB.length + ' distinct; only A ' + JSON.stringify(summary.requests.onlyA) + '; only B ' + JSON.stringify(summary.requests.onlyB));
  // The files the site ships that no capture measures, byte for byte (NOTES).
  const files = await filesCheck({ A, B, portA, portB, against, manifest });
  summary.checks.files = { ...files, shippedA: files.shippedA.length, shippedB: files.shippedB.length };
  log('files no capture measures: ' + files.compared + ' compared byte for byte, ' + files.measuredByCaptures + ' loaded by both sides\' pages (the captures measure them), differences ' + files.diffs.length
    + (files.diffs.length ? ' ' + JSON.stringify(files.diffs.map(d => d.path + ': ' + d.why)) : '') + (files.onlyB.length ? '; only B ships ' + files.onlyB.length : ''));
  // Provenance: every local file each side served, and every shipped file the
  // file comparison fetched, against its HEAD; and a tree with a tracked file
  // modified (now, or when the run began) is not its commit either.
  const localOf = port => [...(requested.get(port) || [])].filter(u => u.startsWith('/'));
  const pv = { A: against ? { baseline: against } : servedCheck(A, [...localOf(portA), ...files.shippedA.map(p => '/' + p)]), B: servedCheck(B, [...localOf(portB), ...files.shippedB.map(p => '/' + p)]) };
  pv.dirty = { A: against ? !!manifest.dirty : !!(summary.A.dirty || gitHead(A).dirty), B: !!(summary.B.dirty || gitHead(B).dirty) };
  pv.clean = !(pv.A.notAtHead && pv.A.notAtHead.length) && !pv.B.notAtHead.length && !pv.dirty.A && !pv.dirty.B;
  summary.provenance = pv;
  if (!pv.clean) log((ALLOW_DIRTY ? 'WARNING (--allow-dirty): ' : 'DIRTY: ') + 'not the commit it claims — A ' + JSON.stringify(pv.A.notAtHead || []) + (pv.dirty.A ? ' (a tracked file modified)' : '') + '; B ' + JSON.stringify(pv.B.notAtHead) + (pv.dirty.B ? ' (a tracked file modified)' : ''));
  // Coverage: which rules that differ in text were in effect with an element
  // in some scene; and which of their declarations Chrome drops, so no computed
  // style ever held them (the text comparison alone measured those).
  const declList = touched.flatMap(t => t.decls.map(d => ({ key: t.key, prop: d.prop, A: d.A, B: d.B })));
  let drops = [];
  if (declList.length) {
    try { drops = await c.ev('(' + DROPPED + ')(' + JSON.stringify(declList) + ')', 30000); }
    catch (e) { throw new Error('coverage: could not ask the page which declarations Chrome drops: ' + e.message); }
  }
  const dropped = new Set(declList.filter((d, i) => drops[i]).map(d => d.key + '\u0001' + d.prop));
  const covRules = touched.map(t => {
    const c0 = t.test ? cover.get(t.key) : null;
    // A @keyframes probed by name is this rule's only when no @media /
    // @supports stands around it (the probes read the frames in effect).
    const how = t.keyframes ? (kfSeen.has(t.keyframes) && !conditional(t.cond) ? 'keyframe probes' : 'text only') : !t.test ? 'text only' : c0.scenes.length ? (t.state ? 'scenes, state forced' : 'scenes') : c0.fixture ? (t.state ? 'fixture, state forced' : 'fixture') : 'text only';
    const textOnlyDecls = how === 'text only' ? t.decls.map(d => d.prop) : t.decls.filter(d => dropped.has(t.key + '\u0001' + d.prop)).map(d => d.prop);
    return { file: t.file, rule: t.key, measured: how, scenes: c0 ? c0.scenes.length : 0, firstScene: c0 && c0.scenes[0] || null,
      ...(conditional(t.cond) ? { context: t.cond } : {}), ...(textOnlyDecls.length ? { textOnlyDecls } : {}) };
  });
  const by = k => covRules.filter(r => r.measured === k).length;
  const tod = covRules.flatMap(r => (r.textOnlyDecls || []).map(p => r.rule + ' ' + p));
  summary.coverage = { rulesDifferingInText: covRules.length, inScenes: by('scenes') + by('scenes, state forced'), onlyFixture: by('fixture') + by('fixture, state forced'), keyframeProbes: by('keyframe probes'), textOnly: by('text only'),
    textOnlyRules: covRules.filter(r => r.measured === 'text only').map(r => r.rule),
    declsDifferingInText: declList.length, textOnlyDecls: tod.length, textOnlyDeclList: tod, droppedByChrome: dropped.size, rules: covRules };
  log('coverage of the ' + covRules.length + ' rules that differ in text: in scenes ' + summary.coverage.inScenes + ', only the fixture ' + summary.coverage.onlyFixture + ', keyframe probes ' + summary.coverage.keyframeProbes + ', text only ' + summary.coverage.textOnly
    + (summary.coverage.textOnly ? ' ' + JSON.stringify(summary.coverage.textOnlyRules) : '') + '; of their ' + declList.length + ' declarations that differ in text, ' + tod.length + ' measured by the text alone' + (tod.length ? ' ' + JSON.stringify(tod) : '') + ' (' + dropped.size + ' dropped by Chrome)');
  finish(summary, t0, todo.reduce((n, t) => n + t.sel.size, 0) * widths.length);
  summary.finishedAt = new Date().toISOString();
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
  const T = summary.totals;
  log('TOTALS ' + JSON.stringify(T));
  log('VERDICT ' + summary.verdict + ' — ' + T.compared + '/' + T.expected + ' scene×width compared, pixel-different ' + T.pixelDifferent + ', ' + DIFF_KINDS.map(k => k.replace('Diffs', '') + ' ' + T[k]).join(', ') + ', css (text) ' + T.cssDiffs + ', files ' + T.fileDiffs + ', requests ' + T.requestDiffs + ', reboot dumps ' + T.rebootDiffs + ', unseen in pixels ' + T.unseenInPixels + ', errors ' + T.errors + ', unstable shots ' + T.unstableShots + ' (extra captures ' + T.extraShots + '), pixel-only at first ' + T.pixelOnlyAtFirst + ' (resolved by re-boot ' + T.resolvedByReboot + ', not forgiven ' + T.notForgiven + ', reproduced ' + T.reproducedPixelOnly + '), matched an alternate baseline state ' + T.matchedAltState + ', provenance ' + (summary.provenance.clean ? 'clean' : 'NOT clean') + ', ' + T.runSeconds + 's run (' + T.seconds + 's with the wait for the lock)');
  log('summary: ' + join(outDir, 'summary.json'));
  return EXIT[summary.verdict] ?? 1;
}
const EXIT = { IDENTICAL: 0, DIFFERENT: 3, INCOMPLETE: 4, UNSTEADY: 4, DIRTY: 5 };
// The dump's kinds that paint: a difference in one of these that the PNGs do
// not show is marked unseenInPixels.
const RENDERED_KINDS = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs'];
// Which declarations Chrome drops at parse time: CSS.supports(prop, value) is
// false for either side's value (!important aside). Evaluated in the page;
// CSS.supports needs no particular document.
const DROPPED = `list => list.map(d => [d.A, d.B].some(v => v != null && !CSS.supports(d.prop, String(v).replace(/\\s*!important$/i, ''))))`;

/* ---------- the files no capture measures ---------- */
// Every file the site ships: tracked at HEAD (every file under the tree when
// it is not a git tree), less the docs (*.md), report/ and tools-check/.
function shipped(repo) {
  const blobs = headBlobs(repo);
  let all = [];
  if (blobs) all = [...blobs.keys()];
  else {
    const walk = (dir, rel) => {
      for (const f of readdirSync(dir)) {
        if (f === '.git' || f === 'node_modules') continue;
        const p = join(dir, f), r = rel ? rel + '/' + f : f;
        let st; try { st = statSync(p); } catch { continue; }
        if (st.isDirectory()) walk(p, r); else if (st.isFile()) all.push(r);
      }
    };
    walk(repo, '');
  }
  return all.filter(f => !/\.md$/i.test(f) && !/^(report|tools-check)\//.test(f)).sort();
}
// The scripts, stylesheets and pages a side's pages loaded: their effect is
// what the captures measure. sw.js never counts (the harness answers it with an
// empty worker).
const loadedBy = port => new Set([...(requested.get(port) || [])].filter(u => u.startsWith('/')).map(servedFile).filter(p => /\.(m?js|css|html?)$/i.test(p) && p !== 'sw.js'));
async function servedBytes(port, p) {
  const r = await fetch('http://127.0.0.1:' + port + '/' + p.split('/').map(encodeURIComponent).join('/'));
  const b = Buffer.from(await r.arrayBuffer());
  return r.status === 200 ? b : null;
}
// Where two texts first differ: the line, and each side's line around the first
// differing character (sw.js is one long line).
function firstLineDiff(a, b) {
  const la = a.split('\n'), lb = b.split('\n');
  let i = 0;
  while (i < la.length && i < lb.length && la[i] === lb[i]) i++;
  const x = la[i] ?? '', y = lb[i] ?? '';
  let k = 0;
  while (k < x.length && k < y.length && x[k] === y[k]) k++;
  const cut = s => s.slice(Math.max(0, k - 60), k + 140);
  return { line: i + 1, column: k + 1, A: i < la.length ? cut(x) : '(end of file)', B: i < lb.length ? cut(y) : '(end of file)' };
}
// Every shipped file both sides have, byte for byte as each server serves it,
// but the ones both sides' pages loaded. A file only A ships is a difference;
// one only B ships is listed. Against a baseline, A's side is its shas.
async function filesCheck({ A, B, portA, portB, against, manifest }) {
  const shippedB = shipped(B), shippedA = against ? Object.keys(manifest.files).sort() : shipped(A);
  const loadedA = against ? new Set(manifest.loaded || []) : loadedBy(portA), loadedB = loadedBy(portB);
  const inA = new Set(shippedA), inB = new Set(shippedB);
  const bodyA = new Map(), bodyB = new Map(), shaA = {}, shaB = {};
  for (const p of shippedB) { const b = await servedBytes(portB, p); bodyB.set(p, b); shaB[p] = b ? sha256(b) : 'not served'; }
  for (const p of shippedA) {
    if (against) { shaA[p] = manifest.files[p]; continue; }
    const b = await servedBytes(portA, p); bodyA.set(p, b); shaA[p] = b ? sha256(b) : 'not served';
  }
  const diffs = [], measured = [];
  let compared = 0;
  for (const p of shippedA) {
    if (!inB.has(p)) { diffs.push({ path: p, why: 'A ships it, B does not' }); continue; }
    if (loadedA.has(p) && loadedB.has(p)) { measured.push(p); continue; }
    compared++;
    if (shaA[p] === shaB[p]) continue;
    const d = { path: p, why: 'differs' + (loadedA.has(p) || loadedB.has(p) ? ' (loaded by one side only)' : ', and no capture measures it'), A: String(shaA[p]).slice(0, 16), B: String(shaB[p]).slice(0, 16) };
    const a = bodyA.get(p), b = bodyB.get(p);
    if (a && b && /\.(m?js|css|html?|json|webmanifest|txt|svg|xml)$/i.test(p) || a && b && !/\.[^/]+$/.test(p)) Object.assign(d, firstLineDiff(a.toString('utf8'), b.toString('utf8')));
    diffs.push(d);
  }
  return { compared, measuredByCaptures: measured.length, diffs, onlyB: shippedB.filter(p => !inA.has(p)), shaA, shaB, loadedA: [...loadedA].sort(), shippedA, shippedB };
}
const sceneClean = x => x.pixelsEqual && stylesClean(x) && !x.rebootDiffs && !(x.backstop && !x.backstop.forgiven);

const stylesClean = x => DIFF_KINDS.every(k => !x[k].count);


// Confirm a pixel-only difference by re-booting (see HOLDS, "raster states"
// and "backstop"). Chrome left the dock's SVG icons in one of two byte-exact
// states per page load, at random; re-making the dock's layer before each
// screenshot fixed that, and this stays as the backstop: each side's group is
// booted again, up to RETRIES times, the capture repeated exactly (settle,
// dump, settle, stable shot, then the passes), and every distinct PNG kept.
// The scene is forgiven — pixel-equal — only if (1) both sides produced one
// byte-identical PNG, (2) every PNG B produced is one A produced in this run
// or one the base tree produced on record (knownBaseStates), (3) every other
// PNG either side produced differs from the shared one only in the dock's
// raster-state signature, and (4) every re-boot's dump equals A's first dump.
// Without (3) and (4), a change that shows on some loads only (a first launch,
// a race) passed as noise the moment one re-boot came up clean; without (2),
// one that fit the signature (a first-load shadow inside an icon's box) did.
// While B has a state that is neither A's nor on record, A alone is booted
// again, to see whether the base tree produces it. Against a baseline, A's
// states are the ones the base tree produced in the control runs.
async function confirmPixels({ g, width, names, portA, portB, against, dirA, dirB, summary, manifest, outDir }) {
  const W = String(width);
  const st = {};
  for (const n of names) {
    const x = summary.scenes[n + '@' + width];
    const A = new Map(), B = new Map();
    if (against) for (const s of manifest.scenes[n + '@' + width].states || [{ sha: x.pngSha[0], file: n + '.png' }]) A.set(s.sha, join(dirA, W, s.file));
    else A.set(x.pngSha[0], join(dirA, W, n + '.png'));
    B.set(x.pngSha[1], join(dirB, W, n + '.png'));
    st[n] = { A, B, rounds: 0, dumpDiffs: [], dock: x.dock, firstA: hashDump(readGz(join(dirA, W, n + '.dump.json.gz'))), known: new Map(), lookup: null };
  }
  // The base tree's states on record, looked up for each state B produced
  // that A has not, with this run's A states as the witnesses of the page.
  const baseSha = against ? manifest.sha : summary.A.sha;
  const cond = renderConditions(summary, width);
  const hasShared = n => [...st[n].B.keys()].some(k => st[n].A.has(k));
  const unknownB = n => {
    const s = st[n], need = [...s.B.keys()].filter(k => !s.A.has(k) && !s.known.has(k));
    if (!need.length || !KNOWN_ROOTS.length) return need;
    const r = knownBaseStates({ roots: KNOWN_ROOTS, skip: [outDir], sha: baseSha, cond, width, scene: n, witnesses: new Set(s.A.keys()) });
    s.known = r.known;
    s.lookup = { runsRead: r.runs, runsCounted: r.admissible };
    return need.filter(k => !s.known.has(k));
  };
  const open = () => names.filter(n => !hasShared(n) || (!against && unknownB(n).length));
  for (let r = 1; r <= RETRIES && open().length; r++) {
    const want = new Set(open());
    const wantB = new Set([...want].filter(n => !hasShared(n)));
    const shoot = (side, dir, port, want) => runGroup(port, width, g, want, async s => {
      const { png, dump } = await capture();
      const sha = sha256(png), m = st[s.name][side];
      if (!m.has(sha)) { const f = join(dir, W, s.name + '.' + side + '-r' + r + '.png'); writeFileSync(f, png); m.set(sha, f); }
      // The re-boot's dump against A's first: a difference here is a
      // difference, whichever side and whichever load it came from.
      const d = compareDumps(st[s.name].firstA, dump);
      const n0 = DIFF_KINDS.reduce((k, t) => k + d[t].count, 0);
      if (n0) st[s.name].dumpDiffs.push({ side, round: r, count: n0, ...Object.fromEntries(DIFF_KINDS.filter(t => d[t].count).map(t => [t, { count: d[t].count, first: d[t].first.slice(0, 5) }])) });
      return { sha };
    }, 'r' + r);
    if (!against) await shoot('A', dirA, portA, want);
    if (wantB.size) await shoot('B', dirB, portB, wantB);
    for (const n of want) st[n].rounds = r;
  }
  for (const n of names) {
    const x = summary.scenes[n + '@' + width], s = st[n];
    const shared = [...s.B.keys()].filter(k => s.A.has(k));
    unknownB(n);
    const onRecord = [...s.B.keys()].filter(k => !s.A.has(k) && s.known.has(k));
    x.pixelRetries = s.rounds;
    x.rasterStates = { A: [...s.A.keys()].map(k => k.slice(0, 16)), B: [...s.B.keys()].map(k => k.slice(0, 16)), shared: shared.map(k => k.slice(0, 16)),
      ...(onRecord.length ? { bOnRecord: onRecord.map(k => ({ state: k.slice(0, 16), from: s.known.get(k) })) } : {}), ...(s.lookup ? { lookup: s.lookup } : {}) };
    x.firstAttempt = { diffPixels: x.diffPixels, diffRegions: x.diffRegions };
    if (s.dumpDiffs.length) { x.rebootDiffs = s.dumpDiffs.reduce((k, d) => k + d.count, 0); x.rebootDumpDiffs = s.dumpDiffs; }
    const dec = backstopDecide({ A: s.A, B: s.B, load: f => readFileSync(f), dock: s.dock, dpr: DPR, sig: SIG, rebootDiffs: s.dumpDiffs.length, known: s.known });
    const { forgiven, why = null, worst = null, unknown = null } = dec;
    x.backstop = { forgiven, ...(why ? { why } : {}), ...(unknown ? { unknown: unknown.map(k => k.slice(0, 16)) } : {}) };
    if (forgiven) { x.pixelsEqual = true; x.diffPixels = 0; x.diffRegions = []; x.pixelsConfirmedBy = 'reboot'; }
    else if (!shared.length) {
      // Reproduced: report the closest pair of states the two sides produced.
      let best = null;
      for (const fa of s.A.values()) for (const fb of s.B.values()) { const d = diffPNG(readFileSync(fa), readFileSync(fb), DPR); if (!best || d.diffPixels < best.diffPixels) best = d; }
      x.diffPixels = best.diffPixels; x.diffRegions = best.regions; x.diffRegionCount = best.regionCount; x.pixelsReproduced = true;
    } else if (worst) { x.diffPixels = worst.diffPixels; x.diffRegions = worst.regions; x.diffRegionCount = worst.regionCount; }
    log('  ' + n + '@' + width + ': pixel-only difference ' + (forgiven ? 'forgiven — both sides produced the same bytes, every state B produced is one A produced' + (onRecord.length ? ' or the base tree produced on record (' + onRecord.map(k => k.slice(0, 16) + ' in ' + s.known.get(k)).join('; ') + ')' : '') + ', every other state is the dock\'s raster signature' : shared.length ? 'NOT forgiven — ' + why : 'REPRODUCED') + ' after ' + s.rounds + ' re-boot(s); states A ' + s.A.size + ', B ' + s.B.size);
  }
}

function finish(summary, t0, expected) {
  const v = Object.values(summary.scenes);
  const ok = v.filter(x => !x.errors.length);
  const sum = k => ok.reduce((n, x) => n + x[k].count, 0);
  const rq = Object.values(summary.bootRequests || {});
  const css = summary.checks && summary.checks.css;
  const files = summary.checks && summary.checks.files;
  const T = { expected, compared: ok.length, errors: v.filter(x => x.errors.length).length, pixelDifferent: ok.filter(x => !x.pixelsEqual).length,
    diffPixels: ok.reduce((n, x) => n + x.diffPixels, 0), ...Object.fromEntries(DIFF_KINDS.map(k => [k, sum(k)])),
    cssDiffs: css ? css.count : 0, fileDiffs: files ? files.diffs.length : 0, requestDiffs: rq.reduce((n, x) => n + x.onlyA.length + x.onlyB.length, 0), rebootDiffs: ok.reduce((n, x) => n + (x.rebootDiffs || 0), 0),
    unseenInPixels: ok.filter(x => x.unseenInPixels).length,
    unstableShots: ok.filter(x => x.unstable).length, extraShots: ok.reduce((n, x) => n + (x.shots || []).reduce((m, k) => m + Math.max(0, (k || 2) - 2), 0), 0),
    pixelOnlyAtFirst: ok.filter(x => x.firstAttempt).length, resolvedByReboot: ok.filter(x => x.pixelsConfirmedBy === 'reboot').length,
    notForgiven: ok.filter(x => x.backstop && !x.backstop.forgiven && !x.pixelsReproduced).length,
    reproducedPixelOnly: ok.filter(x => x.pixelsReproduced).length, matchedAltState: ok.filter(x => x.matchedState).length,
    // seconds counts the wait for harness.lock too; runSeconds starts when the lock was held.
    seconds: Math.round((Date.now() - t0) / 1000), runSeconds: lockAt ? Math.round((Date.now() - lockAt) / 1000) : null };
  summary.totals = T;
  const clean = !T.pixelDifferent && DIFF_KINDS.every(k => !T[k]) && !T.cssDiffs && !T.fileDiffs && !T.requestDiffs && !T.rebootDiffs;
  // UNSTEADY: nothing differed, but some capture never repeated itself, so
  // "equal" there was not measured on a page at rest. DIRTY: a tree served
  // files that are not its commit, so whatever was measured was not <sha>.
  const pv = summary.provenance;
  const dirty = pv && !pv.clean && !ALLOW_DIRTY;
  summary.verdict = T.errors || T.compared < expected ? (clean ? (dirty ? 'DIRTY' : 'INCOMPLETE') : 'DIFFERENT') : !clean ? 'DIFFERENT' : dirty ? 'DIRTY' : T.unstableShots ? 'UNSTEADY' : 'IDENTICAL';
}

/* ---------- baseline: keep the A side of clean control runs ----------
   --from takes one or more control runs (one clean tree served on both sides,
   IDENTICAL, no --vibe / --data-vibe, the same conditions). The first run's A
   side is the baseline: its dumps and PNGs. Every other raster state the base
   tree produced for a scene in those runs (either side, first attempt or
   re-boot) is kept beside it as <scene>.alt-<sha>.png and listed in `states`.
   The runs' A-side dumps must be identical to each other, scene by scene. */
function makeBaseline() {
  const froms = (list(flags.from) || []).map(p => resolve(p)), to = resolve(flags.to || '');
  if (!froms.length || !flags.to) throw new Error('baseline needs --from <runDir>[,<runDir>…] --to <dir>');
  const runs = froms.map(dir => ({ dir, s: JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8')) }));
  const cond = s => JSON.stringify([s.A.sha, s.font.sha256, s.relayer, s.nowMs, s.tz, s.locale, s.colorScheme, s.dpr, s.height, s.widths, s.chrome, (s.chromeFlags || []).join(' '), s.seed.sha256, Object.keys(s.scenes).sort(), s.dumpFormat, s.safeArea, s.stateK]);
  for (const { dir, s } of runs) {
    if (s.mode !== 'prove') throw new Error('refusing: ' + dir + ' is not a two-tree prove run');
    if (s.dumpFormat !== DUMP_FORMAT) throw new Error('refusing: ' + dir + ' was measured by a harness whose dumps are format ' + (s.dumpFormat || 1) + ', not ' + DUMP_FORMAT);
    if (s.verdict !== 'IDENTICAL') throw new Error('refusing: ' + dir + ' is ' + s.verdict + ', not IDENTICAL');
    if (!s.provenance || !s.provenance.clean) throw new Error('refusing: ' + dir + ' served files that are not its commit');
    if (!s.A.sha || s.A.sha !== s.B.sha || s.A.repo !== s.B.repo || s.A.dirty || s.B.dirty) throw new Error('refusing: ' + dir + ' is not a control (one clean tree on both sides)');
    if (s.vibe !== null && s.vibe !== undefined || s.dataVibe !== null && s.dataVibe !== undefined) throw new Error('refusing: ' + dir + ' ran with --vibe/--data-vibe; a baseline is v1 as it ships');
    if (!s.checks || !s.checks.files || !s.checks.files.shaA) throw new Error('refusing: ' + dir + ' compared no shipped files (a harness before checks.files)');
    if (cond(s) !== cond(runs[0].s)) throw new Error('refusing: ' + dir + ' ran under different conditions (or scenes) from ' + runs[0].dir);
  }
  const s = runs[0].s, from = runs[0].dir;
  if (existsSync(join(to, 'manifest.json'))) throw new Error('refusing to overwrite the baseline at ' + to);
  assertOutside(to, [s.A.repo, join(HERE, '..', '..')]);
  mkdirSync(to, { recursive: true });
  const scenes = {};
  let alts = 0;
  for (const [k, v] of Object.entries(s.scenes)) {
    const at = k.lastIndexOf('@'), name = k.slice(0, at), W = k.slice(at + 1);
    mkdirSync(join(to, W), { recursive: true });
    const dump0 = join(from, 'A', W, name + '.dump.json.gz');
    for (const r of runs.slice(1)) {
      const d = compareDumps(hashDump(readGz(dump0)), hashDump(readGz(join(r.dir, 'A', W, name + '.dump.json.gz'))));
      const n = DIFF_KINDS.reduce((k, t) => k + d[t].count, 0);
      if (n) throw new Error('refusing: ' + k + ' dumps differ between ' + from + ' and ' + r.dir + ' (' + n + ' differences)');
    }
    cpSync(dump0, join(to, W, name + '.dump.json.gz'));
    cpSync(join(from, 'A', W, name + '.png'), join(to, W, name + '.png'));
    const states = [{ sha: v.pngSha[0], file: name + '.png', from: from + ' A' }];
    for (const r of runs) for (const side of ['A', 'B']) {
      let files = [];
      try { files = readdirSync(join(r.dir, side, W)); } catch {}
      for (const f of files) {
        if (f !== name + '.png' && !(f.startsWith(name + '.') && /^\.[AB]-r\d+\.png$/.test(f.slice(name.length)))) continue;
        const b = readFileSync(join(r.dir, side, W, f)), sha = sha256(b);
        if (states.some(x => x.sha === sha)) continue;
        const alt = name + '.alt-' + sha.slice(0, 12) + '.png';
        writeFileSync(join(to, W, alt), b);
        states.push({ sha, file: alt, from: r.dir + ' ' + side + ' ' + f });
        alts++;
      }
    }
    scenes[k] = { pngSha: v.pngSha[0], elements: v.elements[0], states };
  }
  // A's stylesheets as served (the text comparison) and what each of A's first
  // boots asked off this machine (requestDiffs), from the first run.
  cpSync(join(from, 'A', 'sheets.json'), join(to, 'sheets.json'));
  const bootRequestsA = Object.fromEntries(Object.entries(s.bootRequests || {}).map(([k, x]) => [k, x.A]));
  const manifest = {
    what: 'The web v1 baseline (V59 §7.1): the A side of clean control runs of the base tree — per scene and width, a full-page PNG, every other raster state the base tree produced for it, and a gzipped dump (computed styles, rects, attributes, the head, forced states, keyframe probes); the stylesheets as served; what each boot asked off this machine.',
    sha: s.A.sha, dirty: s.A.dirty, repo: s.A.repo, fromRuns: froms, createdAt: new Date().toISOString(), dumpFormat: s.dumpFormat, harness: s.harness,
    archivoSha256: s.font.sha256, archivoPath: s.font.path, relayer: s.relayer, nowIso: s.now, nowMs: s.nowMs, tz: s.tz, locale: s.locale, colorScheme: s.colorScheme,
    dpr: s.dpr, height: s.height, widths: s.widths, safeArea: s.safeArea, stateK: s.stateK, chrome: s.chrome, chromeFlags: (s.chromeFlags || []).join(' '), seedSha256: s.seed.sha256, seedPath: s.seed.path,
    rackCssLine1: s.checks.rackCssLine1.A, bootRequests: bootRequestsA, holds: s.holds, notes: s.notes,
    // The files the site ships (sha256 as served) and the ones A's pages
    // loaded, for the byte comparison of what no capture measures.
    files: s.checks.files.shaA, loaded: s.checks.files.loadedA,
    controls: runs.map(r => ({ run: r.dir, verdict: r.s.verdict, totals: r.s.totals, startedAt: r.s.startedAt, finishedAt: r.s.finishedAt })), scenes
  };
  writeFileSync(join(to, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('baseline: ' + Object.keys(scenes).length + ' scene×width, ' + alts + ' alternate raster state(s), from ' + runs.length + ' control run(s) → ' + to + ' (sha ' + manifest.sha + ')');
}

/* ---------- shoot: PNGs for the gallery and the judges ---------- */
async function shoot() {
  const repo = resolve(flags.repo || '');
  if (!flags.repo || !flags.out) throw new Error('shoot needs --repo <tree> --out <dir>');
  const outDir = resolve(flags.out);
  assertOutside(outDir, [repo, join(HERE, '..', '..')]);
  const SH = JSON.parse(readFileSync(join(HERE, 'shoot.json'), 'utf8'));
  const names = list(flags.scenes) || SH.gallery;
  const widths = (list(flags.widths) || ['390']).map(Number);
  const port = +(flags.port || 8765);
  const run = flags.run || 'shoot-' + STAMP;
  const todo = plan(null, names, SH.extra, { proveOnly: false });
  await setup({ run, outDir, serve: [{ repo, port }] });
  const vs = (await vibeStatus(port)).status;
  if (flags['expect-vibe'] && vs !== +flags['expect-vibe']) throw new Error('/vibe.js answers ' + vs + ', expected ' + flags['expect-vibe']);
  FONT_CSS_URL = fontCssUrlOf((await cssLine1(port)).toString('utf8'));
  const t0 = Date.now(), shots = [];
  for (const width of widths) for (const { g, sel } of todo) {
    const res = await runGroup(port, width, g, sel, async s => {
      await c.ev('__cap.settle()', 30000);
      await relayer();
      const png = await screenshot(!!flags.full);
      const file = join(outDir, s.name + (widths.length > 1 ? '@' + width : '') + '.png');
      writeFileSync(file, png);
      return { file, bytes: png.length };
    });
    res.forEach(r => shots.push({ width, group: g.group, ...r }));
  }
  const order = new Map(names.map((n, i) => [n, i]));
  shots.sort((a, b) => a.width - b.width || order.get(a.scene) - order.get(b.scene));
  const out = { run, mode: 'shoot', harness: gitHead(join(HERE, '..', '..')), repo, ...gitHead(repo), vibe: VIBE, vibeJs: vs, widths, safeArea: Object.fromEntries(widths.map(w => [w, insetsFor(w)])), full: !!flags.full, dpr: DPR, now: NOW_ISO, tz: TZ, relayer: RELAYER, chrome: chrome.version && chrome.version.Browser, seconds: Math.round((Date.now() - t0) / 1000), shots };
  writeFileSync(join(outDir, 'shots.json'), JSON.stringify(out, null, 1));
  log('shot ' + shots.filter(s => s.file).length + ', skipped ' + shots.filter(s => s.skipped).length + ', errors ' + shots.filter(s => s.error).length + ' → ' + outDir);
  shots.filter(s => s.error || s.skipped).forEach(s => log('  ' + s.scene + '@' + s.width + ' ' + (s.error ? 'ERR ' + s.error : 'skipped ' + s.skipped)));
}

/* ---------- fit: does this tree fit the phone? ---------- */
async function fit() {
  const repo = resolve(flags.repo || '');
  if (!flags.repo) throw new Error('fit needs --repo <tree>');
  const run = flags.run || 'fit-' + STAMP;
  const outDir = join(resolve(flags['out-root'] || join(NIGHT, 'proof')), run);
  assertOutside(outDir, [repo, join(HERE, '..', '..')]);
  const widths = (list(flags.widths) || ['320', '390']).map(Number);
  const port = +(flags.port || 8765);
  const todo = plan(list(flags.groups), list(flags.scenes), {}, { proveOnly: false });
  const safeArea = Object.fromEntries(widths.map(w => [w, insetsFor(w)]));
  // A fit is compared with a reference only under the same safe area: the
  // insets move the dock, the header and every sheet's bottom padding.
  const ref = flags.compare ? JSON.parse(readFileSync(resolve(flags.compare), 'utf8')) : null;
  if (ref && JSON.stringify(ref.safeArea || null) !== JSON.stringify(safeArea)) throw new Error('--compare ' + flags.compare + ' was read under safe area ' + JSON.stringify(ref.safeArea || '(none recorded: 0)') + ', this run is ' + JSON.stringify(safeArea) + ' — read the reference again with this harness, or pass the same --safe-area');
  await setup({ run, outDir, serve: [{ repo, port }] });
  const vs = (await vibeStatus(port)).status;
  if (flags['expect-vibe'] && vs !== +flags['expect-vibe']) throw new Error('/vibe.js answers ' + vs + ', expected ' + flags['expect-vibe']);
  FONT_CSS_URL = fontCssUrlOf((await cssLine1(port)).toString('utf8'));
  const t0 = Date.now(), scenes = {};
  for (const width of widths) for (const { g, sel } of todo) {
    const res = await runGroup(port, width, g, sel, async () => {
      await c.ev('__cap.settle()', 30000);
      return { fit: await c.ev('__cap.fit()', 60000) };
    });
    res.forEach(r => { scenes[r.scene + '@' + width] = r.fit ? r.fit : { error: r.error || r.skipped }; });
  }
  const v = Object.entries(scenes).filter(([, x]) => !x.error);
  const totals = { scenes: Object.keys(scenes).length, errors: Object.values(scenes).filter(x => x.error).length,
    docOverflow: v.filter(([, x]) => x.docOverflow).map(([k]) => k), overflowEls: v.reduce((n, [, x]) => n + x.overflow.length, 0),
    clipped: v.reduce((n, [, x]) => n + x.clipped.filter(y => y.how === 'clipped').length, 0), spills: v.reduce((n, [, x]) => n + x.clipped.filter(y => y.how === 'spills').length, 0),
    smallTargets: v.reduce((n, [, x]) => n + x.small.length, 0) };
  const out = { run, mode: 'fit', harness: gitHead(join(HERE, '..', '..')), repo, ...gitHead(repo), vibe: VIBE, vibeJs: vs, widths, safeArea, now: NOW_ISO, chrome: chrome.version && chrome.version.Browser, seconds: Math.round((Date.now() - t0) / 1000), totals, scenes };
  if (ref) {
    // What this tree has that the reference (v1) does not, keyed by scene, width, kind and element path.
    const keys = (sc) => {
      const k = new Set();
      for (const [id, x] of Object.entries(sc)) {
        if (x.error) continue;
        if (x.docOverflow) k.add(id + '|docOverflow');
        x.overflow.forEach(y => k.add(id + '|overflow|' + y.path));
        x.clipped.forEach(y => k.add(id + '|' + y.how + '|' + y.path));
        x.small.forEach(y => k.add(id + '|small|' + y.path));
      }
      return k;
    };
    const mine = keys(scenes), theirs = keys(ref.scenes);
    out.compare = { reference: resolve(flags.compare), refVibe: ref.vibe, new: [...mine].filter(k => !theirs.has(k)), gone: [...theirs].filter(k => !mine.has(k)).length };
    log('fit vs reference: ' + out.compare.new.length + ' new finding(s)');
    out.compare.new.slice(0, 40).forEach(k => log('  NEW ' + k));
  }
  writeFileSync(join(outDir, 'fit.json'), JSON.stringify(out, null, 1));
  log('fit ' + JSON.stringify(totals));
  log('fit: ' + join(outDir, 'fit.json'));
}

// prove exits by its verdict (EXIT): 0 only for IDENTICAL, so a gate can read
// the exit code. shoot and fit exit 0 when they ran.
try {
  let code = 0;
  if (MODE === 'prove') code = await prove();
  else if (MODE === 'shoot') await shoot();
  else if (MODE === 'fit') await fit();
  await shutdown();
  process.exit(code);
} catch (e) {
  log('FAILED: ' + (e && e.stack || e));
  await shutdown();
  process.exit(1);
}
