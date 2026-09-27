// The harness's own regression checks (V59 §7.7: every accepted finding gets
// a regression check). Each plant is a copy of the base tree with ONE change
// the P review showed prove.mjs could not see; prove.mjs has to come out not
// IDENTICAL on it, with the counter that names what it saw, and exit non-zero.
// A control (the same copy, unchanged) has to come out IDENTICAL and exit 0,
// so a check cannot pass by prove.mjs failing at everything.
//
//   node report/btn-44/selftest.mjs --base <baseTree> [--only id,id] [--run <name>]
//
// Plants are copies of <baseTree>'s tracked app files under
// ~/dev/vibes-night/tmp/selftest/<id>/ (not git trees, so prove.mjs runs with
// --allow-dirty where it has it); the one plant about which tree is served
// (f9) writes an untracked vibe.js into THIS worktree for the length of its run
// and removes it after, and the two about a git tree that is not its commit
// (r2-dirty-*) change tracked files of THIS worktree (its app files are the
// base's) for the length of their run and put the bytes back after, checked
// against HEAD. Output: ~/dev/vibes-night/proof/<run>/ (selftest.json,
// one prove run per plant). Exit 0 only when every plant ran and did what it
// should. Needs Chrome and python3, like prove.mjs; runs one prove at a time.
// The unit plants (f8-backstop-unit, r2-*-unit) need no browser.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { HERE, NIGHT, parseArgs, list, rmScratch, onCleanup } from './harness-lib.mjs';
import { createHash } from 'node:crypto';

const { flags } = parseArgs(process.argv.slice(2), ['help']);
if (flags.help || !flags.base) {
  const src = readFileSync(new URL(import.meta.url)).toString().split('\n');
  console.log(src.slice(0, src.findIndex(l => !l.startsWith('//'))).join('\n'));
  process.exit(flags.help ? 0 : 2);
}
const BASE = resolve(flags.base);
const PROVE = join(HERE, 'prove.mjs');
const REPO = resolve(HERE, '..', '..');
const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const RUN = flags.run || 'selftest-' + STAMP;
const OUT = join(NIGHT, 'proof', RUN);
mkdirSync(OUT, { recursive: true });
const log = (...a) => { const l = a.join(' '); console.log(l); try { writeFileSync(join(OUT, 'selftest.log'), l + '\n', { flag: 'a' }); } catch {} };

// What this prove.mjs knows: an old harness has no --allow-dirty and fewer scenes.
const proveSrc = readFileSync(PROVE, 'utf8');
const HAS_ALLOW_DIRTY = proveSrc.includes("'allow-dirty'");
const sceneNames = new Set();
for (const f of ['scenes.json', 'scenes-cover.json']) {
  if (!existsSync(join(HERE, f))) continue;
  for (const g of JSON.parse(readFileSync(join(HERE, f), 'utf8'))) for (const s of g.scenes) sceneNames.add(s.name);
}

const INDEX_SCRIPT = `<script>try { if (!sessionStorage.getItem('hm')) { sessionStorage.setItem('hm', '1'); document.documentElement.classList.add('hm'); } } catch (e) {}</script>\n`;

// need: every inner list must have at least one counter above 0 in summary.totals.
const PLANTS = [
  { id: 'control', finding: 'none — an unchanged copy must come out IDENTICAL, exit 0', edits: [], scenes: ['you', 'train', 'tour-1', 'auth'], identical: true },
  { id: 'control-cover', finding: 'none — the cover scenes, unchanged, IDENTICAL, exit 0', edits: [], scenes: ['fixture', 'stats-picker', 'stats-detail', 'import-preview', 'paused', 'vibe-reapply'], identical: true },
  { id: 'f11-exit', finding: 'F11 prove.mjs exits 0 on DIFFERENT', edits: [{ file: 'rack.css', find: '--chalk:   #f2f0eb;', replace: '--chalk:   #f2f0ec;' }], scenes: ['you'], need: [['styleDiffs']] },
  { id: 'f2-active', finding: 'F2 :active never measured', edits: [{ file: 'rack.css', find: '.cal-nav button:active { background: var(--collar); color: var(--chalk); }', replace: '.cal-nav button:active { background: #262a34; color: var(--chalk); }' }], scenes: ['train'], need: [['stateDiffs'], ['cssDiffs']] },
  { id: 'f3-keyframe', finding: 'F3 keyframes other than the captured frame', edits: [{ file: 'auth.css', find: '@keyframes tourPulse { 0%,100% { opacity: .95; } 50% { opacity: .35; } }', replace: '@keyframes tourPulse { 0%,100% { opacity: .95; } 50% { opacity: .36; } }' }], scenes: ['tour-1'], need: [['keyframeDiffs'], ['cssDiffs']] },
  { id: 'f4-webkit-backdrop', finding: 'F4 -webkit-backdrop-filter', edits: [{ file: 'rack.css', find: '  -webkit-backdrop-filter: blur(18px) saturate(140%);', replace: '  -webkit-backdrop-filter: blur(18px) saturate(141%);' }], scenes: ['you'], need: [['cssDiffs']] },
  { id: 'f5-safe-area', finding: 'F5 env(safe-area-inset-*) is 0', edits: [{ file: 'rack.css', find: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom));\n  padding-bottom: env(safe-area-inset-bottom);', replace: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom) * 2);\n  padding-bottom: calc(env(safe-area-inset-bottom) * 2);' }], scenes: ['you'], need: [['pixelDifferent', 'rectDiffs', 'styleDiffs'], ['cssDiffs']] },
  { id: 'f6-theme-color', finding: 'F6 theme-color is information only', edits: [{ file: 'index.html', find: '<meta name="theme-color" content="#14161a">', replace: '<meta name="theme-color" content="#14161b">' }], scenes: ['you'], need: [['headDiffs']] },
  { id: 'f7-aria-label', finding: 'F7 HTML attributes not compared', edits: [{ file: 'index.html', find: '<button data-view="workout" aria-label="Training">', replace: '<button data-view="workout" aria-label="Nutrition" title="Nutrition">' }], scenes: ['you'], need: [['attrDiffs']] },
  { id: 'f8-first-load', finding: 'F8 the re-boot backstop forgives a difference that shows on some loads', edits: [
    { file: 'rack.css', append: '\nhtml.hm h1::first-letter { color: #f2f0ec; }\n' },
    { file: 'index.html', find: '<link rel="stylesheet" href="rack.css">', replace: INDEX_SCRIPT + '<link rel="stylesheet" href="rack.css">' }], scenes: ['auth'], need: [['pixelDifferent']] },
  // The same, but in pixels alone: no attribute, rule, computed style or
  // request moves. On the first load of each origin in the tab, the sign-in
  // title is painted through a custom highlight (CSS.highlights, styled by a
  // constructed sheet) one level off chalk. Only the backstop can see it, and
  // before the fix one clean re-boot of B forgave it.
  { id: 'f8b-first-load-pixels', finding: 'F8 the backstop, with a first-load change in pixels only', edits: [
    { file: 'index.html', find: '<link rel="stylesheet" href="rack.css">', replace: "<script>try { if (!sessionStorage.getItem('hm2')) { sessionStorage.setItem('hm2', '1'); const s = new CSSStyleSheet(); s.replaceSync('::highlight(hm2) { color: #f2f0ec; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; document.addEventListener('DOMContentLoaded', () => { const h = document.getElementById('auth'); if (h) { const r = document.createRange(); r.selectNode(h); CSS.highlights.set('hm2', new Highlight(r)); } }); } } catch (e) {}</script>\n" + '<link rel="stylesheet" href="rack.css">' }], scenes: ['auth'], need: [['pixelDifferent'], ['notForgiven', 'reproducedPixelOnly']] },
  // The backstop's decision on synthetic states, no browser: a dock-sized
  // flip is forgiven; a first-load change elsewhere, with a clean re-boot, is not.
  { id: 'f8-backstop-unit', finding: 'F8 the backstop decision, unit cases', unit: true, scenes: [] },
  { id: 'f9-stray-vibe-js', finding: 'F9 /vibe.js checked for presence only', stray: true, scenes: ['auth'] },
  { id: 'f10-font-request', finding: 'F10 a changed or extra Archivo request is invisible', edits: [{ file: 'auth.css', prepend: "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400&display=swap');\n" }], scenes: ['auth'], need: [['requestDiffs']] },
  { id: 'f1-unrendered-rule', finding: 'F1 a touched rule no scene renders (.rest-pill)', edits: [{ file: 'rack.css', find: '.rest-pill {\n  position: fixed; left: 50%; transform: translateX(-50%);\n  bottom: calc(var(--dock-h) + env(safe-area-inset-bottom) + 12px);\n  background: var(--collar);', replace: '.rest-pill {\n  position: fixed; left: 50%; transform: translateX(-50%);\n  bottom: calc(var(--dock-h) + env(safe-area-inset-bottom) + 12px);\n  background: #262a34;' }], scenes: ['fixture'], need: [['styleDiffs'], ['cssDiffs']] },
  { id: 'f1-picker-dot', finding: 'F1 stats.js exercise-picker dot never ran', edits: [{ file: 'stats.js', find: '      dot.style.background = groupColor(e.group);', replace: "      dot.style.opacity = '.99'; dot.style.background = groupColor(e.group);" }], scenes: ['stats-picker'], need: [['styleDiffs']] },
  { id: 'f1-import-bar', finding: 'F1 importer.js:105 never ran', edits: [{ file: 'importer.js', find: "seg.style.background = COLORS[g] || 'var(--knurl)';", replace: "seg.style.background = COLORS[g] || 'var(--collar)';" }], scenes: ['import-preview'], need: [['styleDiffs']] },
  { id: 'f1-paused-mark', finding: 'F1 access.js renderPaused never ran', edits: [{ file: 'access.js', find: "['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8']", nth: 1, of: 2, replace: "['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb9']" }], scenes: ['paused'], need: [['styleDiffs']] },

  // ---- the P review, round 2 ----
  // R2-1/R2-5: coverage credited a rule in @media (min-width: 900px) with every
  // scene that had a .sheet, though no capture at 390 or 320 was ever inside
  // it; and a declaration Chrome drops (-webkit-backdrop-filter) with the
  // scenes of its rule. Both rules below change in text only (var() of a new
  // token that resolves to the same value): IDENTICAL, exit 0, and the
  // coverage has to say the 900px rule was measured by the text comparison
  // alone, and so was .dock's -webkit-backdrop-filter.
  { id: 'r2-cov-context', finding: 'R2-1/R2-5 coverage ignores the @media a rule sits in, and declarations Chrome drops', edits: [
    { file: 'rack.css', find: '  --dock-h: 64px;', replace: '  --dock-h: 64px;\n  --r2-sheet: 18px;\n  --r2-blur: blur(18px) saturate(140%);' },
    { file: 'rack.css', find: '  .sheet { max-width: 720px; border-radius: 18px; bottom: 24px; }', replace: '  .sheet { max-width: 720px; border-radius: var(--r2-sheet); bottom: 24px; }' },
    { file: 'rack.css', find: '  -webkit-backdrop-filter: blur(18px) saturate(140%);', replace: '  -webkit-backdrop-filter: var(--r2-blur);' }],
    scenes: ['you-coach-sheet'], identical: true, check: S => {
      const cv = S.coverage || {};
      const rule = (cv.rules || []).find(r => r.rule === 'rack.css | @media (min-width: 900px) > .sheet #0');
      const dock = (cv.rules || []).find(r => r.rule === 'rack.css | .dock #0');
      const bad = [];
      if (!rule) bad.push('the 900px .sheet rule is not in coverage.rules');
      else if (rule.measured !== 'text only') bad.push('the 900px .sheet rule is "' + rule.measured + '" (' + rule.scenes + ' scenes), not text only');
      if (!(cv.textOnly >= 1)) bad.push('coverage.textOnly is ' + cv.textOnly);
      if (!dock) bad.push('.dock #0 is not in coverage.rules');
      else if (!(dock.textOnlyDecls || []).includes('-webkit-backdrop-filter')) bad.push('.dock #0 does not list -webkit-backdrop-filter as measured by the text alone (textOnlyDecls ' + JSON.stringify(dock.textOnlyDecls) + ')');
      if (!(cv.textOnlyDecls >= 2)) bad.push('coverage.textOnlyDecls is ' + cv.textOnlyDecls + ', expected at least 2');
      return bad.length ? { ok: false, why: bad.join('; ') } : { ok: true, why: 'the 900px rule is text only, .dock\'s -webkit-backdrop-filter is text only; textOnly ' + cv.textOnly + ', textOnlyDecls ' + cv.textOnlyDecls };
    } },
  // R2-2/R2-6: css-static.mjs, on pairs a browser renders differently (and on
  // pairs it renders the same, which must stay equal). No browser.
  { id: 'r2-css-static-unit', finding: 'R2-2/R2-6 the text comparison folds case, collapses strings, ignores declaration order', unit: 'css', scenes: [] },
  // R2-3: files the phone loads that no capture measures.
  { id: 'r2-files-manifest', finding: 'R2-3 manifest.json is never compared', edits: [{ file: 'manifest.json', find: '"background_color": "#14161a",\n  "theme_color": "#14161a",', replace: '"background_color": "#14161b",\n  "theme_color": "#14161b",' }], scenes: ['you'], need: [['fileDiffs']] },
  { id: 'r2-files-sw-404', finding: 'R2-3 sw.js (emptied by the harness) and 404.html are never compared', edits: [
    { file: 'sw.js', find: "if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;", replace: 'return r;' },
    { file: '404.html', append: '\n<!-- selftest r2 -->\n' }], scenes: ['you'], need: [['fileDiffs']] },
  // R2-3: a git tree whose tracked files are not its commit, no --allow-dirty.
  // sw.js and 404.html changed: not IDENTICAL, and provenance not clean.
  { id: 'r2-dirty-sw-404', finding: 'R2-3 sw.js/404.html modified in a git tree pass with no --allow-dirty', inPlace: [
    { file: 'sw.js', find: "if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;", replace: 'return r;' },
    { file: '404.html', append: '\n<!-- selftest r2 -->\n' }], scenes: ['auth'], check: (S, code) => {
      const ok = code !== 0 && ['DIRTY', 'DIFFERENT'].includes(S.verdict) && S.provenance && !S.provenance.clean && (S.totals.fileDiffs || 0) > 0;
      return { ok, why: 'verdict ' + S.verdict + ', exit ' + code + ', provenance ' + (S.provenance && S.provenance.clean ? 'clean' : 'NOT clean') + ', fileDiffs ' + S.totals.fileDiffs + (S.provenance && S.provenance.B ? ', B notAtHead ' + JSON.stringify((S.provenance.B.notAtHead || []).map(x => x.path)) : '') };
    } },
  // The same with a tracked file no page loads and the site does not ship
  // (README.md): only the tree's own dirty flag can see it. DIRTY, exit 5.
  { id: 'r2-dirty-doc', finding: 'R2-3 gitHead().dirty is recorded but never gates', inPlace: [{ file: 'README.md', append: '\n<!-- selftest r2 -->\n' }], scenes: ['auth'], check: (S, code) => {
      const ok = code === 5 && S.verdict === 'DIRTY';
      return { ok, why: 'verdict ' + S.verdict + ', exit ' + code + ', B.dirty ' + (S.B && S.B.dirty) + ', provenance ' + (S.provenance && S.provenance.clean ? 'clean' : 'NOT clean') };
    } },
  // R2-4: a first-load change inside the dock's box but outside its icons (a
  // 1px underline 3 levels off the dock's ground, under the I of TRAIN, on the
  // first load of each origin only): the whole-dock signature forgave it.
  { id: 'r2-dock-label-firstload', finding: 'R2-4 the backstop forgives a first-load change in the dock\'s label row', edits: [{ file: 'index.html', find: '<link rel="stylesheet" href="rack.css">', replace: "<script>try { if (!sessionStorage.getItem('r2u')) { sessionStorage.setItem('r2u', '1'); const s = new CSSStyleSheet(); s.replaceSync('::highlight(r2u) { text-decoration: underline; text-decoration-color: rgb(23, 25, 29); text-decoration-thickness: 1px; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; document.addEventListener('DOMContentLoaded', () => { const b = document.querySelector('#dock button[data-view=\"workout\"]'); if (!b) return; for (const n of b.childNodes) { if (n.nodeType === 3) { const i = n.data.indexOf('i'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); CSS.highlights.set('r2u', new Highlight(r)); break; } } } }); } } catch (e) {}</script>\n" + '<link rel="stylesheet" href="rack.css">' }], scenes: ['you'], need: [['pixelDifferent'], ['notForgiven', 'reproducedPixelOnly']] },
  { id: 'r2-backstop-icons-unit', finding: 'R2-4 the backstop decision, a change in the dock outside its icons', unit: 'backstop-icons', scenes: [] },
  // R2-7: a 0.5 CSS px move of the dock's contents (1.5 device px at DPR 3)
  // leaves the PNG byte-identical; the dump sees it. DIFFERENT, and the run
  // says the pixels did not show it (unseenInPixels).
  { id: 'r2-dock-subpixel', finding: 'R2-7 a sub-pixel move of the dock\'s contents is not in the pixels', edits: [{ file: 'rack.css', find: '  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  padding-bottom: 33px;\n  background: rgba(20,22,26,.82);' }], scenes: ['you'], need: [['rectDiffs'], ['unseenInPixels']] },

  // ---- the P review, round 3 ----
  // R3-1: the head comparison dropped every stylesheet link, attributes and
  // all, and the text comparison keeps only the href. rack.css linked with
  // media="(prefers-color-scheme: dark)" — a Light Mode iPhone gets no rack.css
  // at all — and auth.css with media="(max-height: 900px)" — a 430×932 phone
  // loses it — came out IDENTICAL, exit 0: the capture runs under one
  // condition, and it held.
  { id: 'r3-head-links-unit', finding: 'R3-1 a stylesheet link\'s attributes and order are not compared, unit cases', unit: 'head-links', scenes: [] },
  { id: 'r3-link-media', finding: 'R3-1 rack.css linked with a media query', edits: [{ file: 'index.html', find: '<link rel="stylesheet" href="rack.css">', replace: '<link rel="stylesheet" href="rack.css" media="(prefers-color-scheme: dark)">' }], scenes: ['you'], need: [['headDiffs']] },
  { id: 'r3-link-media-auth', finding: 'R3-1 auth.css linked with a media query', edits: [{ file: 'index.html', find: '<link rel="stylesheet" href="auth.css">', replace: '<link rel="stylesheet" href="auth.css" media="(max-height: 900px)">' }], scenes: ['auth'], need: [['headDiffs']] },
  // R3-2: the backstop forgave any state that fit the dock icons' signature,
  // whether or not the base tree ever produced it. On the first load of each
  // origin only, a faint shadow of TRAIN's I cast 12px up into the Train icon
  // (a custom highlight from a constructed sheet: pixels only, 37 device px, 1
  // level): one clean re-boot of B forgave it. A state B produced has to be one
  // A produced in this run, or one the base tree produced on record.
  { id: 'r3-backstop-known-unit', finding: 'R3-2 the backstop forgives a state the base tree never produced, unit cases', unit: 'backstop-known', scenes: [] },
  { id: 'r3-known-states-unit', finding: 'R3-2 the raster states the base tree produced on record, which runs count', unit: 'known-states', scenes: [] },
  { id: 'r3-icon-shadow-firstload', finding: 'R3-2 a first-load change inside a dock icon\'s box, in pixels only', edits: [{ file: 'index.html', find: '<link rel="stylesheet" href="rack.css">', replace: "<script>try { if (!sessionStorage.getItem('r3s')) { sessionStorage.setItem('r3s', '1'); const s = new CSSStyleSheet(); s.replaceSync('::highlight(r3s) { text-shadow: 0 -12px 4px rgba(255,255,255,.035); }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; document.addEventListener('DOMContentLoaded', () => { const b = document.querySelector('#dock button[data-view=\"workout\"]'); if (!b) return; for (const n of b.childNodes) { if (n.nodeType === 3) { const i = n.data.indexOf('i'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); CSS.highlights.set('r3s', new Highlight(r)); break; } } } }); } } catch (e) {}</script>\n" + '<link rel="stylesheet" href="rack.css">' }], scenes: ['you'], need: [['pixelDifferent'], ['notForgiven', 'reproducedPixelOnly']] }
];

const only = list(flags.only);
const todo = PLANTS.filter(p => !only || only.includes(p.id));
if (only) { const unknown = only.filter(i => !PLANTS.some(p => p.id === i)); if (unknown.length) throw new Error('unknown plant(s): ' + unknown.join(', ')); }

// The app's own files from the base tree: everything tracked but the docs,
// report/ and tools-check/ (nothing the page asks for).
function copyBase(to) {
  const r = spawnSync('git', ['-C', BASE, 'ls-files', '-z'], { encoding: 'utf8' });
  if (r.status) throw new Error('git ls-files failed in ' + BASE);
  const files = r.stdout.split('\0').filter(f => f && !/^(report|tools-check)\//.test(f) && !/\.md$/.test(f));
  for (const f of files) { mkdirSync(dirname(join(to, f)), { recursive: true }); copyFileSync(join(BASE, f), join(to, f)); }
  return files.length;
}
const blobOf = buf => createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
const headBlob = (repo, f) => { const r = spawnSync('git', ['-C', repo, 'rev-parse', 'HEAD:' + f], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
function applyEdit(tree, e) {
  const p = join(tree, e.file);
  let s = readFileSync(p, 'utf8');
  if (e.append) s += e.append;
  else if (e.prepend) s = e.prepend + s;
  else {
    const n = s.split(e.find).length - 1;
    if (n !== (e.of || 1)) throw new Error('plant anchor in ' + e.file + ' found ' + n + ' time(s), expected ' + (e.of || 1) + ': ' + JSON.stringify(e.find.slice(0, 80)));
    let at = -1;
    for (let k = 0; k < (e.nth || 1); k++) at = s.indexOf(e.find, at + 1);
    s = s.slice(0, at) + e.replace + s.slice(at + e.find.length);
  }
  writeFileSync(p, s);
}

function prove(args, logFile) {
  return new Promise(res => {
    const p = spawn(process.execPath, [PROVE, ...args], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => { writeFileSync(logFile, out); res({ code, out }); });
  });
}

// F8, no browser: backstopDecide on synthetic PNGs. A 60×100 page at DPR 1
// whose dock is its bottom 20 rows; s2 moves 10 dock pixels by 2 levels (the
// raster flip, as on record), s3 moves 300 pixels of "text" at the top by 40.
async function backstopUnit() {
  const lib = await import('./harness-lib.mjs');
  if (!lib.backstopDecide || !lib.encodePNG) return { ok: false, why: 'this harness has no backstopDecide: its backstop forgives on any PNG in common' };
  const W = 60, Hh = 100;
  const img = f => { const a = new Uint8Array(W * Hh * 4); for (let i = 0; i < W * Hh; i++) { a[i * 4] = 20; a[i * 4 + 1] = 22; a[i * 4 + 2] = 26; a[i * 4 + 3] = 255; } f(a); return lib.encodePNG(W, Hh, a); };
  const px = (a, x, y, d) => { const i = (y * W + x) * 4; a[i] += d; a[i + 1] += d; a[i + 2] += d; };
  const s1 = img(() => {}), s2 = img(a => { for (let k = 0; k < 10; k++) px(a, 5 + k, 88, 2); }), s3 = img(a => { for (let y = 10; y < 20; y++) for (let x = 10; x < 40; x++) px(a, x, y, 40); });
  // The dock's one icon (capture.js dockBox() icons) holds the flip's pixels.
  const dock = { left: 0, right: 60, top: 80, bottom: 100, scrollX: 0, scrollY: 0, icons: [{ left: 3, right: 17, top: 82, bottom: 92 }] };
  const sig = { maxPixels: 48, maxDelta: 4 };
  const M = o => new Map(Object.entries(o));
  // `known`: B's states the base tree produced on record (R3-2), so each case
  // below tests what it names and not the record.
  const dec = (A, B, rebootDiffs = 0, known = ['s2', 's3']) => lib.backstopDecide({ A: M(A), B: M(B), load: b => b, dock, dpr: 1, sig, rebootDiffs, known: new Set(known) }).forgiven;
  const cases = [
    ['a dock flip on B, cleared by a re-boot: forgiven', dec({ s1 }, { s2, s1 }), true],
    ['a dock flip on A, B clean: forgiven', dec({ s1, s2 }, { s1 }), true],
    ['a first-load change outside the dock, then a clean re-boot: NOT forgiven', dec({ s1 }, { s3, s1 }), false],
    ['the same on A: NOT forgiven', dec({ s1, s3 }, { s1 }), false],
    ['no PNG in common: NOT forgiven', dec({ s1 }, { s3 }), false],
    ['a dock flip, but a re-boot dump differed: NOT forgiven', dec({ s1 }, { s2, s1 }, 1), false]
  ];
  const bad = cases.filter(([, got, want]) => got !== want);
  return { ok: !bad.length, why: bad.length ? 'wrong: ' + bad.map(([n, g]) => n + ' (got ' + g + ')').join('; ') : cases.length + ' cases as they should be', cases: cases.map(([n, g]) => [n, g]) };
}

// R2-4, no browser: the signature is the dock's icons, not its whole box. The
// same 60×100 page; the dock (rows 80-100) has one icon (x 3-17, y 82-92) and
// a label row under it. A 10-pixel, 2-level change in the icon is the raster
// flip; the same change in the label row (y 96) is not, though it is in the dock.
async function backstopIconsUnit() {
  const lib = await import('./harness-lib.mjs');
  if (!lib.backstopDecide || !lib.encodePNG) return { ok: false, why: 'this harness has no backstopDecide' };
  const W = 60, Hh = 100;
  const img = f => { const a = new Uint8Array(W * Hh * 4); for (let i = 0; i < W * Hh; i++) { a[i * 4] = 20; a[i * 4 + 1] = 22; a[i * 4 + 2] = 26; a[i * 4 + 3] = 255; } f(a); return lib.encodePNG(W, Hh, a); };
  const px = (a, x, y, d) => { const i = (y * W + x) * 4; a[i] += d; a[i + 1] += d; a[i + 2] += d; };
  const s1 = img(() => {}), icon = img(a => { for (let k = 0; k < 10; k++) px(a, 5 + k, 88, 2); }), label = img(a => { for (let k = 0; k < 10; k++) px(a, 5 + k, 96, 2); });
  const withIcon = { left: 0, right: 60, top: 80, bottom: 100, scrollX: 0, scrollY: 0, icons: [{ left: 3, right: 17, top: 82, bottom: 92 }] };
  const noIcons = { ...withIcon, icons: [] };
  const sig = { maxPixels: 48, maxDelta: 4 };
  const M = o => new Map(Object.entries(o));
  // Every state here is one the base tree produced on record (R3-2): what is
  // tested is where it sits.
  const dec = (A, B, dock) => lib.backstopDecide({ A: M(A), B: M(B), load: b => b, dock, dpr: 1, sig, rebootDiffs: 0, known: new Set(['icon', 'label']) }).forgiven;
  const cases = [
    ['a flip inside the icon, cleared by a re-boot: forgiven', dec({ s1 }, { icon, s1 }, withIcon), true],
    ['a first-load change in the dock\'s label row, then a clean re-boot: NOT forgiven', dec({ s1 }, { label, s1 }, withIcon), false],
    ['the same on A: NOT forgiven', dec({ s1, label }, { s1 }, withIcon), false],
    ['a dock with no icons read: nothing forgiven', dec({ s1 }, { icon, s1 }, noIcons), false]
  ];
  const bad = cases.filter(([, got, want]) => got !== want);
  return { ok: !bad.length, why: bad.length ? 'wrong: ' + bad.map(([n, g]) => n + ' (got ' + g + ')').join('; ') : cases.length + ' cases as they should be', cases: cases.map(([n, g]) => [n, g]) };
}

// R2-2/R2-6, no browser: css-static.mjs compareSheets on pairs of sheets. The
// first list renders differently in a browser and has to be counted; the second
// renders the same (whitespace, a leading zero, hex and function-name case, a
// literal spelled as a token, a comment) and has to stay equal.
async function cssUnit() {
  const cs = await import('./css-static.mjs');
  const root = ':root { --chalk: #f2f0eb; }\n';
  const differ = [
    ['in-rule order: a shorthand after its longhand', '.x { border: 1px solid red; border-color: blue; }', '.x { border-color: blue; border: 1px solid red; }'],
    ['custom property names are case-sensitive', ':root { --a: #f0be1e; } .x { color: var(--a); }', ':root { --a: red; --A: #f0be1e; } .x { color: var(--a); }'],
    ['a string, case only (quote \')', ".x::before { content: 'A'; }", ".x::before { content: 'a'; }"],
    ['animation-name, case only (setFlash)', '@keyframes setFlash { 0% { opacity: 0; } } .x { animation: setFlash 1s; }', '@keyframes setFlash { 0% { opacity: 0; } } .x { animation: setflash 1s; }'],
    ['a string, case only (quote ")', '.x::before { content: "Rack"; }', '.x::before { content: "rack"; }'],
    ['a string, inner whitespace', '.x::after { content: "a  b"; white-space: pre; }', '.x::after { content: "a b"; white-space: pre; }'],
    ['animation-name, case only (coachPulse)', '@keyframes coachPulse { 0% { opacity: 0 } }\n.x { animation: coachPulse 1s; }', '@keyframes coachPulse { 0% { opacity: 0 } }\n.x { animation: coachpulse 1s; }'],
    ['url(), case only', '.x { background-image: url(img/Grain.png); }', '.x { background-image: url(img/grain.png); }'],
    ['a string, case only, inside @media (min-width: 900px)', '@media (min-width: 900px) { .x::before { content: "Rack"; } }', '@media (min-width: 900px) { .x::before { content: "RACK"; } }'],
    ['control: a colour', '.x { color: #f2f0eb; }', '.x { color: #f2f0ec; }']
  ];
  const same = [
    ['spacing and a leading zero', '.x { background: rgba(240,190,30,.28); }', '.x { background: rgba(240, 190, 30, 0.28); }'],
    ['hex case', '.x { color: #F0BE1E; }', '.x { color: #f0be1e; }'],
    ['function-name case', '.x { color: RGBA(1,2,3,.5); }', '.x { color: rgba(1,2,3,.5); }'],
    ['a literal spelled as the token', '.x { color: #f2f0eb; }', '.x { color: var(--chalk); }'],
    ['unit case', '.x { width: 10PX; }', '.x { width: 10px; }'],
    ['!important case and spacing', '.x { color: red!IMPORTANT; }', '.x { color: red !important; }'],
    ['layout of the rule, and a comment', '.x{color:red;margin:0 auto}', '.x {\n  color: red; /* why */\n  margin: 0  auto;\n}'],
    ['spacing around a string', '.x::before{content:"a b"}', '.x::before { content:  "a b" ; }']
  ];
  const bad = [];
  for (const [n, a, b] of differ) { const r = cs.compareSheets({ 'rack.css': root + a }, { 'rack.css': root + b }); if (!r.count) bad.push('not counted: ' + n); }
  for (const [n, a, b] of same) { const r = cs.compareSheets({ 'rack.css': root + a }, { 'rack.css': root + b }); if (r.count) bad.push('counted, though a browser renders it the same: ' + n + ' ' + JSON.stringify(r.first[0])); }
  return { ok: !bad.length, why: bad.length ? bad.length + ' wrong — ' + bad.join('; ') : differ.length + ' rendered changes counted, ' + same.length + ' equal pairs equal' };
}

// R3-1, no browser: compareDumps on the head alone, as capture.js writes it
// (each entry its tag and every attribute, in source order). A stylesheet link
// both sides have counts with every attribute it carries and in its place
// among them; a link only B has (a vibe's sheet, whose rules css-static checks
// are scoped), B's head script and a preload do not.
async function headLinksUnit() {
  const lib = await import('./harness-lib.mjs');
  const HEAD = ['meta charset=utf-8', 'meta name=theme-color content=#14161a', 'link rel=manifest href=manifest.json', 'link rel=apple-touch-icon href=icon-180.png', 'link rel=stylesheet href=rack.css', 'link rel=stylesheet href=auth.css', 'title text=Rack'];
  const RACK = 'link rel=stylesheet href=rack.css', AUTH = 'link rel=stylesheet href=auth.css';
  const dump = head => lib.hashDump({ props: [], styles: [], els: [], head });
  const n = b => lib.compareDumps(dump(HEAD), dump(b)).headDiffs.count;
  const swap = (from, to) => HEAD.map(x => (x === from ? to : x));
  const at = (i, ...add) => [...HEAD.slice(0, i), ...add, ...HEAD.slice(i)];
  const cases = [
    ['the same head: 0', n(HEAD), 0],
    ['rack.css media=(prefers-color-scheme: dark): counted', n(swap(RACK, RACK + ' media=(prefers-color-scheme: dark)')), 1],
    ['rack.css media=(display-mode: browser): counted', n(swap(RACK, RACK + ' media=(display-mode: browser)')), 1],
    ['auth.css media=(max-height: 900px): counted', n(swap(AUTH, AUTH + ' media=(max-height: 900px)')), 1],
    ['rack.css disabled: counted', n(swap(RACK, RACK + ' disabled=')), 1],
    ['rack.css with a title (a preferred set): counted', n(swap(RACK, RACK + ' title=Dark')), 1],
    ['auth.css linked before rack.css: counted', n([...HEAD.slice(0, 4), AUTH, RACK, HEAD[6]]), 1],
    ['auth.css not linked by B: counted', n(HEAD.filter(x => x !== AUTH)), 1],
    ['B\'s head script before the links (the engine\'s): 0', n(at(4, 'script')), 0],
    ['a sheet only B links (a vibe\'s): 0', n(at(6, 'link rel=stylesheet href=vibes/x.css')), 0],
    ['a preload only B has: 0', n(at(4, 'link rel=preload href=vibe.js as=script')), 0]
  ];
  const bad = cases.filter(([, got, want]) => (want ? got < want : got !== 0));
  return { ok: !bad.length, why: bad.length ? 'wrong: ' + bad.map(([c, g]) => c + ' (got ' + g + ')').join('; ') : cases.length + ' cases as they should be', cases: cases.map(([c, g]) => [c, g]) };
}

// R3-2, no browser: a state B produced is forgiven only if A produced it in
// this run or it is `known` (the base tree produced it on record), and only
// inside the icons' signature either way. A's own states need no record.
async function backstopKnownUnit() {
  const lib = await import('./harness-lib.mjs');
  if (!lib.backstopDecide || !lib.encodePNG) return { ok: false, why: 'this harness has no backstopDecide' };
  const W = 60, Hh = 100;
  const img = f => { const a = new Uint8Array(W * Hh * 4); for (let i = 0; i < W * Hh; i++) { a[i * 4] = 20; a[i * 4 + 1] = 22; a[i * 4 + 2] = 26; a[i * 4 + 3] = 255; } f(a); return lib.encodePNG(W, Hh, a); };
  const px = (a, x, y, d) => { const i = (y * W + x) * 4; a[i] += d; a[i + 1] += d; a[i + 2] += d; };
  const s1 = img(() => {}), icon = img(a => { for (let k = 0; k < 10; k++) px(a, 5 + k, 88, 1); }), label = img(a => { for (let k = 0; k < 10; k++) px(a, 5 + k, 96, 1); });
  const dock = { left: 0, right: 60, top: 80, bottom: 100, scrollX: 0, scrollY: 0, icons: [{ left: 3, right: 17, top: 82, bottom: 92 }] };
  const sig = { maxPixels: 48, maxDelta: 4 };
  const M = o => new Map(Object.entries(o));
  const dec = (A, B, known) => lib.backstopDecide({ A: M(A), B: M(B), load: b => b, dock, dpr: 1, sig, rebootDiffs: 0, ...(known ? { known: new Set(known) } : {}) }).forgiven;
  const cases = [
    ['a state inside an icon that B alone produced, on no record, then a clean re-boot: NOT forgiven', dec({ s1 }, { icon, s1 }), false],
    ['the same, with an empty record: NOT forgiven', dec({ s1 }, { icon, s1 }, []), false],
    ['the same state, one the base tree produced on record: forgiven', dec({ s1 }, { icon, s1 }, ['icon']), true],
    ['the same state, one A produced in this run too: forgiven', dec({ s1, icon }, { icon, s1 }), true],
    ['A alone produced it (B clean): forgiven', dec({ s1, icon }, { s1 }), true],
    ['on record, but in the dock\'s label row: NOT forgiven', dec({ s1 }, { label, s1 }, ['label']), false]
  ];
  const bad = cases.filter(([, got, want]) => got !== want);
  return { ok: !bad.length, why: bad.length ? 'wrong: ' + bad.map(([c, g]) => c + ' (got ' + g + ')').join('; ') : cases.length + ' cases as they should be', cases: cases.map(([c, g]) => [c, g]) };
}

// R3-2, no browser: knownBaseStates over a made-up proof directory. Only a side
// that is a clean tree at the base's sha, in a run under the same conditions,
// measured by a clean harness this one descends from, whose PNGs for the scene
// include one this run's A produced (the same page), counts.
async function knownStatesUnit() {
  const lib = await import('./harness-lib.mjs');
  if (!lib.knownBaseStates || !lib.renderConditions) return { ok: false, why: 'this harness has no knownBaseStates: a state B produced is forgiven whether or not the base tree ever produced it' };
  const root = join(NIGHT, 'tmp', 'selftest-known');
  try { rmScratch(root); } catch {}
  const png = t => Buffer.from('not really a PNG: ' + t);
  const sha = b => createHash('sha256').update(b).digest('hex');
  const BASE0 = 'b'.repeat(40), ENG = 'e'.repeat(40);
  const cond = { nowMs: 1, tz: 'America/New_York', locale: 'en-US', colorScheme: 'dark', dpr: 3, height: 844, safeArea: { 390: { top: 47, right: 0, bottom: 34, left: 0 } }, seed: { sha256: 's' }, font: { sha256: 'f' }, chrome: 'C/1', chromeFlags: ['--x'], relayer: true, vibe: null, dataVibe: null };
  const clean = x => ({ repo: '/t/' + x, sha: BASE0, dirty: false });
  const pv = (over = {}) => ({ A: { git: true, notAtHead: [] }, B: { git: true, notAtHead: [] }, dirty: { A: false, B: false }, clean: true, ...over });
  const W0 = png('witness'), F = k => png('flip ' + k);
  const run = (name, S, files) => {
    const d = join(root, name);
    for (const [f, b] of Object.entries(files)) { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), b); }
    mkdirSync(join(d, 'A'), { recursive: true });
    writeFileSync(join(d, 'summary.json'), JSON.stringify({ mode: 'prove', harness: { sha: 'h1', dirty: false }, ...cond, ...S }));
  };
  const sc = (a, b) => ({ scenes: { 'you@390': { pngSha: [sha(a), sha(b)] } } });
  // 1: a clean control; B's first load was the flip. Counts.
  run('r1-control', { A: clean('a'), B: clean('b'), provenance: pv(), ...sc(W0, F(1)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(1) });
  // 2: a plant, B dirty: B's states do not count (A's witness is W0 only).
  run('r2-plant', { A: clean('a'), B: { ...clean('b'), dirty: true }, provenance: pv({ dirty: { A: false, B: true }, clean: false }), ...sc(W0, F(2)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(2) });
  // 3: another safe area: not the same page.
  run('r3-safe-area', { A: clean('a'), B: clean('b'), provenance: pv(), safeArea: { 390: { top: 0, right: 0, bottom: 0, left: 0 } }, ...sc(W0, F(3)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(3) });
  // 4: no witness: the base side produced only a state this run never saw.
  run('r4-no-witness', { A: clean('a'), B: { repo: '/t/e', sha: ENG, dirty: false }, provenance: pv(), ...sc(F(4), W0) }, { 'A/390/you.png': F(4) });
  // 5: measured by a dirty harness.
  run('r5-harness-dirty', { harness: { sha: 'h1', dirty: true }, A: clean('a'), B: clean('b'), provenance: pv(), ...sc(W0, F(5)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(5) });
  // 6: the flip on the engine's side (another sha).
  run('r6-engine', { A: clean('a'), B: { repo: '/t/e', sha: ENG, dirty: false }, provenance: pv(), ...sc(W0, F(6)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(6) });
  // 7: the witness in a re-boot, the flip on the first load. Counts.
  run('r7-reboot-witness', { A: clean('a'), B: clean('b'), provenance: pv(), ...sc(F(7), F(7)) }, { 'A/390/you.png': F(7), 'A/390/you.A-r1.png': W0 });
  // 8: a harness this one does not descend from.
  run('r8-other-harness', { harness: { sha: 'h9', dirty: false }, A: clean('a'), B: clean('b'), provenance: pv(), ...sc(W0, F(8)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(8) });
  // 9: A served a file not at its HEAD.
  run('r9-not-at-head', { A: clean('a'), B: { repo: '/t/e', sha: ENG, dirty: false }, provenance: pv({ A: { git: true, notAtHead: [{ path: 'x.js', why: 'modified' }] }, clean: false }), ...sc(W0, W0) }, { 'A/390/you.png': W0, 'A/390/you.A-r1.png': F(9) });
  // 10: --data-vibe v1: another condition.
  run('r10-datavibe', { dataVibe: 'v1', A: clean('a'), B: clean('b'), provenance: pv(), ...sc(W0, F(10)) }, { 'A/390/you.png': W0, 'B/390/you.png': F(10) });
  let res;
  try {
    res = lib.knownBaseStates({ roots: [root], sha: BASE0, cond: lib.renderConditions(cond, 390), width: 390, scene: 'you', witnesses: new Set([sha(W0)]), harnessOk: h => h === 'h1' });
  } finally { try { rmScratch(root); } catch {} }
  const got = new Set(res.known.keys());
  const want = { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: true, 8: false, 9: false, 10: false };
  const bad = Object.entries(want).filter(([k, w]) => got.has(sha(F(k))) !== w).map(([k, w]) => 'flip ' + k + (w ? ' not known' : ' known'));
  return { ok: !bad.length, why: bad.length ? 'wrong: ' + bad.join('; ') : 'known: the clean control\'s flip and the re-boot-witnessed one; not: a dirty side, another safe area, no witness, a dirty harness, the engine\'s side, another harness, a tree not at HEAD, --data-vibe', known: [...res.known.values()] };
}

const results = [];
for (const pl of todo) {
  const t0 = Date.now();
  const r = { id: pl.id, finding: pl.finding, scenes: pl.scenes };
  if (pl.unit) {
    const units = { css: cssUnit, 'backstop-icons': backstopIconsUnit, 'head-links': headLinksUnit, 'backstop-known': backstopKnownUnit, 'known-states': knownStatesUnit };
    Object.assign(r, await (units[pl.unit] || backstopUnit)());
    log('[' + pl.id + '] ' + (r.ok ? 'OK' : 'FAIL') + ' — ' + r.why);
    results.push(r);
    continue;
  }
  const missing = pl.scenes.filter(s => !sceneNames.has(s));
  if (missing.length) {
    r.ok = false; r.why = 'this harness has no scene that reaches it (' + missing.join(', ') + ')';
    log('[' + pl.id + '] NOT DETECTED — ' + r.why); results.push(r); continue;
  }
  let tree, stray = null;
  const saved = new Map();
  const restore = () => { for (const [f, b] of saved) { try { writeFileSync(join(REPO, f), b); } catch {} } };
  const args = ['--a', BASE, '--widths', '390', '--scenes', pl.scenes.join(','), '--run', pl.id, '--out-root', OUT];
  try {
    if (pl.inPlace) {
      // Tracked files of this worktree (the base's app files at its HEAD),
      // changed for the run and put back after, byte for byte. No --allow-dirty.
      tree = REPO;
      for (const e of pl.inPlace) if (!saved.has(e.file)) saved.set(e.file, readFileSync(join(REPO, e.file)));
      for (const [f, b] of saved) if (headBlob(REPO, f) !== blobOf(b)) throw new Error(f + ' in ' + REPO + ' is not at HEAD before the plant — refusing to touch it');
      onCleanup(restore);
      for (const e of pl.inPlace) applyEdit(REPO, e);
      args.push('--b', tree, '--expect-vibe', '404,404');
    } else if (pl.stray) {
      // The base app plus one untracked vibe.js, in a git tree whose HEAD has
      // none: this worktree (its app files are the base's).
      tree = REPO;
      stray = join(REPO, 'vibe.js');
      if (existsSync(stray)) throw new Error(stray + ' already exists — refusing to touch it');
      const tracked = spawnSync('git', ['-C', REPO, 'cat-file', '-e', 'HEAD:vibe.js']).status === 0;
      if (tracked) throw new Error('this worktree tracks vibe.js; the f9 plant needs a tree whose HEAD has none');
      writeFileSync(stray, '// selftest f9: a stray, untracked vibe.js\nexport const stray = true;\n');
      args.push('--b', tree, '--expect-vibe', '404,200');
    } else {
      tree = join(NIGHT, 'tmp', 'selftest', pl.id);
      try { rmScratch(tree); } catch {}
      r.files = copyBase(tree);
      for (const e of pl.edits) applyEdit(tree, e);
      args.push('--b', tree, '--expect-vibe', '404,404');
      if (HAS_ALLOW_DIRTY) args.push('--allow-dirty');
    }
    const { code, out } = await prove(args, join(OUT, pl.id + '.prove.log'));
    r.exit = code;
    let S = null;
    try { S = JSON.parse(readFileSync(join(OUT, pl.id, 'summary.json'), 'utf8')); } catch {}
    r.verdict = S ? S.verdict : null;
    r.totals = S ? S.totals : null;
    const failed = (out.match(/FAILED: (.*)/) || [])[1] || null;
    if (failed) r.failed = failed.slice(0, 300);
    if (pl.identical) {
      r.ok = code === 0 && r.verdict === 'IDENTICAL';
      r.why = r.ok ? 'IDENTICAL, exit 0' : 'expected IDENTICAL and exit 0, got ' + r.verdict + ' exit ' + code + (failed ? ' (' + r.failed + ')' : '');
      if (pl.check) {
        const k = S ? pl.check(S, code) : { ok: false, why: 'no summary' };
        r.ok = r.ok && k.ok;
        r.why += '; ' + k.why;
      }
    } else if (pl.check) {
      const k = S ? pl.check(S, code) : { ok: false, why: 'no summary' + (failed ? ' (' + r.failed + ')' : '') };
      r.ok = k.ok; r.why = k.why;
    } else if (pl.stray) {
      r.ok = code !== 0 && (/untracked/i.test(failed || '') || r.verdict === 'DIRTY');
      r.why = r.ok ? 'refused: ' + (failed || r.verdict) : 'not refused: verdict ' + r.verdict + ', exit ' + code + (S ? ', B ' + JSON.stringify(S.B) : '');
    } else {
      const T = r.totals || {};
      const groups = (pl.need || []).map(g => g.filter(k => (T[k] || 0) > 0));
      const counters = (pl.need || []).map((g, i) => g.map(k => k + '=' + (T[k] === undefined ? 'n/a' : T[k])).join('|') + (groups[i].length ? ' ✓' : ' ✗')).join('; ');
      r.ok = code !== 0 && r.verdict === 'DIFFERENT' && groups.every(g => g.length > 0);
      r.why = (r.ok ? 'seen: ' : 'NOT seen as it should be: ') + 'verdict ' + r.verdict + ', exit ' + code + ', ' + counters + (failed ? ' (' + r.failed + ')' : '');
    }
  } catch (e) {
    r.ok = false; r.why = 'selftest error: ' + (e && e.message || e);
  } finally {
    if (stray) { try { unlinkSync(stray); } catch {} }
    if (saved.size) {
      restore();
      const off = [...saved.keys()].filter(f => headBlob(REPO, f) !== blobOf(readFileSync(join(REPO, f))));
      if (off.length) { r.ok = false; r.why = (r.why || '') + '; RESTORE FAILED: ' + off.join(', ') + ' not at HEAD'; }
    }
  }
  r.seconds = Math.round((Date.now() - t0) / 1000);
  log('[' + pl.id + '] ' + (r.ok ? 'OK' : 'FAIL') + ' — ' + r.why + ' (' + r.seconds + 's)');
  results.push(r);
  writeFileSync(join(OUT, 'selftest.json'), JSON.stringify({ run: RUN, base: BASE, prove: PROVE, harness: spawnSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), hasAllowDirty: HAS_ALLOW_DIRTY, results }, null, 1));
}
const bad = results.filter(r => !r.ok);
log('selftest: ' + (results.length - bad.length) + '/' + results.length + ' plants did what they should' + (bad.length ? '; failing: ' + bad.map(r => r.id).join(', ') : '') + ' → ' + join(OUT, 'selftest.json'));
process.exit(bad.length ? 1 : 0);
