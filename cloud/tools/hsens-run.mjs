// Harness-sensitivity review, round 2 (Pweb §7.7, harness lens). Plants ONE small
// real difference at a time in the scratch worktree wt/web-hmut (detached
// 928a65e), runs prove.mjs A=wt/web-base B=wt/web-hmut on the scenes the plant
// affects, records verdict/exit/counters, and restores the file bytes exactly.
//
//   node ~/dev/vibes-night/tools/hsens-run.mjs [--only id,id] [--harness <dir with report/btn-44/prove.mjs>]
//
// Output: ~/dev/vibes-night/proof/hsens/<id>/ (prove's own run dir) and
// ~/dev/vibes-night/proof/hsens/results.json + hsens.log. prove.mjs takes the
// night's harness.lock for every run; runs are strictly one after another.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const BASE = join(NIGHT, 'wt', 'web-base');
const HMUT = join(NIGHT, 'wt', 'web-hmut');
const ENGINE = join(NIGHT, 'wt', 'web-engine');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const HARNESS = opt('harness') || join(NIGHT, 'wt', 'web-harness');
const PROVE = join(HARNESS, 'report', 'btn-44', 'prove.mjs');
const OUT = join(NIGHT, 'proof', 'hsens');
mkdirSync(OUT, { recursive: true });
const log = (...a) => { const l = new Date().toISOString().slice(11, 19) + ' ' + a.join(' '); console.log(l); appendFileSync(join(OUT, 'hsens.log'), l + '\n'); };
const blobSha = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');

// The dock label highlight plants (first load of each origin in the tab only).
const hl = (name, css) => "<script>try { if (!sessionStorage.getItem('" + name + "')) { sessionStorage.setItem('" + name + "', '1'); const s = new CSSStyleSheet(); s.replaceSync('::highlight(" + name + ") { " + css + " }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; document.addEventListener('DOMContentLoaded', () => { const b = document.querySelector('#dock button[data-view=\"workout\"]'); if (!b) return; for (const n of b.childNodes) { if (n.nodeType === 3) { const i = n.data.indexOf('i'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); CSS.highlights.set('" + name + "', new Highlight(r)); break; } } } }); } } catch (e) {}</script>\n";
const LINK = '<link rel="stylesheet" href="rack.css">';

const PLANTS = [
  { id: 'm1-token', what: ':root token --steel #8d939f -> #8d93a0 (1 unit, blue)', edits: [{ file: 'rack.css', find: '--steel:   #8d939f;', replace: '--steel:   #8d93a0;' }], scenes: ['you'] },
  { id: 'm2-padding', what: '.card padding-bottom 14px -> 15px', edits: [{ file: 'rack.css', find: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px;', replace: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px 14px 15px;' }], scenes: ['you'] },
  { id: 'm2b-half-pixel', what: '.card padding-bottom 14px -> 14.5px (everything under the first card moves 0.5 CSS px = 1.5 device px on a 3x iPhone)', edits: [{ file: 'rack.css', find: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px;', replace: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px 14px 14.5px;' }], scenes: ['you'] },
  { id: 'm2c-third-pixel', what: '.card padding-bottom 14px -> 14.34px (1 device px on a 3x iPhone)', edits: [{ file: 'rack.css', find: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px;', replace: '.card {\n  background: var(--bar);\n  border: 1px solid var(--collar);\n  border-radius: var(--r);\n  padding: 14px 14px 14.34px;' }], scenes: ['you'] },
  { id: 'm3-svgpath', what: 'dock You icon: one character of the head path (8.2 -> 8.3)', edits: [{ file: 'index.html', find: '<path d="M8.4 8.2a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0z"/>', replace: '<path d="M8.4 8.3a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0z"/>' }], scenes: ['you'] },
  { id: 'm4-letterspacing', what: '.kpi-prev letter-spacing .02em -> .021em', edits: [{ file: 'rack.css', find: '.kpi-prev { font-size: 10.5px; color: var(--dim); margin-top: 4px; letter-spacing: .02em; }', replace: '.kpi-prev { font-size: 10.5px; color: var(--dim); margin-top: 4px; letter-spacing: .021em; }' }], scenes: ['you'] },
  { id: 'm5-before', what: '.dock button.active::before background var(--p-yellow) -> #f0be1f', edits: [{ file: 'rack.css', find: '  width: 26px; height: 2px; background: var(--p-yellow);', replace: '  width: 26px; height: 2px; background: #f0be1f;' }], scenes: ['you'] },
  { id: 'm6-active', what: '.btn:active scale(.97) -> scale(.971) (an :active-only change)', edits: [{ file: 'rack.css', find: '.btn:active { transform: scale(.97); }', replace: '.btn:active { transform: scale(.971); }' }], scenes: ['auth'] },
  { id: 'm7-only320', what: 'auth.css @media (max-width: 380px) .person-acts width 100% -> calc(100% - 1px)', edits: [{ file: 'auth.css', find: '  .person-acts { width: 100%; }', replace: '  .person-acts { width: calc(100% - 1px); }' }], scenes: ['admin'], widths: '390,320' },
  { id: 'm8-datavibe', what: 'a rule only for data-vibe="v1": :root[data-vibe="v1"] { --steel: #8d93a0 }, run with --data-vibe v1', edits: [{ file: 'rack.css', append: '\n:root[data-vibe="v1"] { --steel: #8d93a0; }\n' }], scenes: ['you'], extra: ['--data-vibe', 'v1'] },
  { id: 'm9-unrequested', what: 'files the phone loads that no scene requests: manifest.json theme_color/background_color, sw.js cache logic, 404.html — run WITHOUT --allow-dirty', edits: [
    { file: 'manifest.json', find: '"background_color": "#14161a",\n  "theme_color": "#14161a",', replace: '"background_color": "#14161b",\n  "theme_color": "#14161b",' },
    { file: 'sw.js', find: "if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;", replace: "return r;" },
    { file: '404.html', append: '\n<!-- hsens m9 -->\n' }], scenes: ['you'], allowDirty: false },
  { id: 'm10a-dock-glyph-firstload', what: 'first load of the origin only: the I of TRAIN in the dock painted rgb(92,98,113) instead of --dim rgb(92,98,112) (custom highlight, pixels only)', edits: [{ file: 'index.html', find: LINK, replace: hl('hsa', 'color: rgb(92, 98, 113);') + LINK }], scenes: ['you'] },
  { id: 'm10b-dock-underline-firstload', what: 'first load of the origin only: a 1px underline 3 levels off the dock ground under the I of TRAIN (custom highlight, pixels only)', edits: [{ file: 'index.html', find: LINK, replace: hl('hsb', 'text-decoration: underline; text-decoration-color: rgb(23, 25, 29); text-decoration-thickness: 1px;') + LINK }], scenes: ['you'] },
  { id: 'm10c-dock-underline-always', what: 'the same underline on every load (deterministic): must be REPRODUCED, not forgiven', edits: [{ file: 'index.html', find: LINK, replace: hl('hsc', 'text-decoration: underline; text-decoration-color: rgb(23, 25, 29); text-decoration-thickness: 1px;').replace("if (!sessionStorage.getItem('hsc')) { sessionStorage.setItem('hsc', '1');", 'if (true) {') + LINK }], scenes: ['you'] },
  { id: 'm9b-manifest-committed', what: 'manifest.json theme_color/background_color #14161a -> #14161b, --allow-dirty (as if committed: provenance is then clean by construction)', edits: [
    { file: 'manifest.json', find: '"background_color": "#14161a",\n  "theme_color": "#14161a",', replace: '"background_color": "#14161b",\n  "theme_color": "#14161b",' }], scenes: ['you'] },
  { id: 'm9c-sw-404-unrequested', what: 'sw.js stops caching (the offline copy) and 404.html changes; WITHOUT --allow-dirty', edits: [
    { file: 'sw.js', find: "if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;", replace: "return r;" },
    { file: '404.html', append: '\n<!-- hsens m9c -->\n' }], scenes: ['you'], allowDirty: false },
  { id: 'm11-keyframe-mid', what: '@keyframes coachPulse 50% rgba(240,190,30,.38) -> .39 (a frame no capture shows)', edits: [{ file: 'rack.css', find: '  50%      { background: rgba(240,190,30,.38); }', replace: '  50%      { background: rgba(240,190,30,.39); }' }], scenes: ['you'] },
  { id: 'm12-webkit-backdrop', what: '.dock -webkit-backdrop-filter saturate(140%) -> saturate(141%) (Chrome drops it; iOS paints the dock with it)', edits: [{ file: 'rack.css', find: '  backdrop-filter: blur(18px) saturate(140%);\n  -webkit-backdrop-filter: blur(18px) saturate(140%);', replace: '  backdrop-filter: blur(18px) saturate(140%);\n  -webkit-backdrop-filter: blur(18px) saturate(141%);' }], scenes: ['you'] },
  { id: 'm13-theme-color', what: '<meta name=theme-color> #14161a -> #14161b', edits: [{ file: 'index.html', find: '<meta name="theme-color" content="#14161a">', replace: '<meta name="theme-color" content="#14161b">' }], scenes: ['you'] },
  { id: 'm14-aria-label', what: 'dock Steps aria-label "Steps" -> "Step count"', edits: [{ file: 'index.html', find: '<button data-view="steps" aria-label="Steps">', replace: '<button data-view="steps" aria-label="Step count">' }], scenes: ['you'] },
  { id: 'm15-safe-area', what: '.dock padding-bottom env(safe-area-inset-bottom) -> calc(env(safe-area-inset-bottom) - 1px) (0 at 320, where the inset is 0)', edits: [{ file: 'rack.css', find: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom));\n  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom));\n  padding-bottom: calc(env(safe-area-inset-bottom) - 1px);\n  background: rgba(20,22,26,.82);' }], scenes: ['you'], widths: '390,320' },
  { id: 'm15c-dock-pad-literal', what: '.dock padding-bottom env(safe-area-inset-bottom) -> 33px (a literal; 34 at 390)', edits: [{ file: 'rack.css', find: '  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  padding-bottom: 33px;\n  background: rgba(20,22,26,.82);' }], scenes: ['you'] },
  { id: 'm15d-dock-gap', what: '.dock button gap 3px -> 4px', edits: [{ file: 'rack.css', find: '  align-items: center; justify-content: center;\n  gap: 3px;\n  color: var(--dim);', replace: '  align-items: center; justify-content: center;\n  gap: 4px;\n  color: var(--dim);' }], scenes: ['you'] },
  { id: 'm15e-dock-height', what: '.dock height calc(var(--dock-h) + inset) -> + 1px more (the dock 1px taller, its top 1px higher)', edits: [{ file: 'rack.css', find: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom));\n  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  height: calc(var(--dock-h) + env(safe-area-inset-bottom) + 1px);\n  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);' }], scenes: ['you'] },
  { id: 'm16-font-request', what: 'a second Archivo css2 request (wght@400) prepended to auth.css', edits: [{ file: 'auth.css', prepend: "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400&display=swap');\n" }], scenes: ['auth'] },
  { id: 'v1-stale-key', what: 'base vs ENGINE on a device whose rack:vibe (and settings/vibe) holds an id this build does not know ("foo"): must still be v1', custom: ['--a', BASE, '--b', ENGINE, '--expect-vibe', '404,200', '--vibe', 'foo'], scenes: ['you', 'auth', 'gate', 'vibe-reapply'] },
  { id: 't1-swapped', what: 'wrong tree: A=web-engine, B=web-base with --expect-vibe 404,200', custom: ['--a', ENGINE, '--b', BASE, '--expect-vibe', '404,200'], scenes: ['auth'] },
  { id: 't2-stray-vibejs', what: 'wrong tree: web-hmut (HEAD 928a65e) plus an untracked vibe.js copied from the engine, --expect-vibe 404,200', stray: true, scenes: ['auth'] },
  { id: 't3-comment-only', what: 'a served tracked file modified (rack.css, a comment only), no --allow-dirty: DIRTY expected', edits: [{ file: 'rack.css', append: '\n/* hsens t3 */\n' }], scenes: ['auth'], allowDirty: false }
];

function applyEdit(e) {
  const p = join(HMUT, e.file);
  let s = readFileSync(p, 'utf8');
  if (e.append) s += e.append;
  else if (e.prepend) s = e.prepend + s;
  else {
    const n = s.split(e.find).length - 1;
    if (n !== 1) throw new Error('anchor in ' + e.file + ' found ' + n + ' times: ' + JSON.stringify(e.find.slice(0, 80)));
    s = s.replace(e.find, () => e.replace);
  }
  writeFileSync(p, s);
}
function headBlob(file) {
  const r = spawnSync('git', ['-C', HMUT, 'rev-parse', 'HEAD:' + file], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}
function runProve(argv, logFile) {
  return new Promise(res => {
    const p = spawn(process.execPath, [PROVE, ...argv], { cwd: HARNESS, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => { writeFileSync(logFile, out); res({ code, out }); });
  });
}

const only = (opt('only') || '').split(',').filter(Boolean);
const todo = PLANTS.filter(p => !only.length || only.includes(p.id));
const resultsFile = join(OUT, 'results.json');
const results = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, 'utf8')) : {};
const st = spawnSync('git', ['-C', HMUT, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
if (st) { log('REFUSING: web-hmut is not clean before the run: ' + st); process.exit(2); }
for (const pl of todo) {
  const t0 = Date.now();
  const saved = new Map();
  let stray = null;
  const r = { id: pl.id, what: pl.what, scenes: pl.scenes, harness: HARNESS };
  try {
    for (const e of pl.edits || []) { if (!saved.has(e.file)) saved.set(e.file, readFileSync(join(HMUT, e.file))); applyEdit(e); }
    let argv;
    if (pl.custom) argv = [...pl.custom];
    else if (pl.stray) {
      stray = join(HMUT, 'vibe.js');
      if (existsSync(stray)) throw new Error('vibe.js already in web-hmut');
      writeFileSync(stray, readFileSync(join(ENGINE, 'vibe.js')));
      argv = ['--a', BASE, '--b', HMUT, '--expect-vibe', '404,200'];
    } else {
      argv = ['--a', BASE, '--b', HMUT, '--expect-vibe', '404,404'];
      if (pl.allowDirty !== false) argv.push('--allow-dirty');
    }
    argv.push('--scenes', pl.scenes.join(','), '--widths', pl.widths || '390', '--run', pl.id, '--out-root', OUT, ...(pl.extra || []));
    r.argv = argv;
    log('[' + pl.id + '] ' + pl.what);
    const { code, out } = await runProve(argv, join(OUT, pl.id + '.prove.log'));
    r.exit = code;
    const failed = (out.match(/FAILED: (.*)/) || [])[1];
    if (failed) r.failed = failed.slice(0, 400);
    let S = null;
    try { S = JSON.parse(readFileSync(join(OUT, pl.id, 'summary.json'), 'utf8')); } catch {}
    if (S) {
      r.verdict = S.verdict;
      r.totals = Object.fromEntries(Object.entries(S.totals || {}).filter(([k, v]) => typeof v === 'number' && v));
      r.provenance = S.provenance && { clean: S.provenance.clean, notAtHeadB: S.provenance.B && S.provenance.B.notAtHead };
      r.Bdirty = S.B && S.B.dirty;
      r.scenesOut = Object.fromEntries(Object.entries(S.scenes || {}).map(([k, x]) => [k, {
        pixelsEqual: x.pixelsEqual, diffPixels: x.diffPixels, regions: (x.diffRegions || []).slice(0, 4).map(g => g.css),
        counts: Object.fromEntries(['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs', 'structDiffs', 'valueDiffs'].filter(k => x[k] && x[k].count).map(k => [k, x[k].count])),
        firstAttempt: x.firstAttempt ? { diffPixels: x.firstAttempt.diffPixels, regions: (x.firstAttempt.diffRegions || []).slice(0, 4).map(g => g.css) } : undefined,
        backstop: x.backstop, rasterStates: x.rasterStates, pixelRetries: x.pixelRetries, dock: x.dock, errors: x.errors }]));
      r.css = S.checks && S.checks.css && { count: S.checks.css.count, first: (S.checks.css.first || []).slice(0, 3) };
      r.requests = S.requests && { onlyA: S.requests.onlyA, onlyB: S.requests.onlyB };
      r.fetch = S.fetch && { fontCss: S.fetch.fontCss, fontFile: S.fetch.fontFile, fontCssUnexpected: S.fetch.fontCssUnexpected };
    }
  } catch (e) {
    r.error = String(e && e.stack || e).slice(0, 400);
  } finally {
    for (const [f, b] of saved) writeFileSync(join(HMUT, f), b);
    if (stray) { try { unlinkSync(stray); } catch {} }
    for (const f of saved.keys()) { const h = headBlob(f); const now = blobSha(readFileSync(join(HMUT, f))); if (h !== now) { r.restoreError = (r.restoreError || '') + f + ' '; } }
    const st2 = spawnSync('git', ['-C', HMUT, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
    r.cleanAfter = !st2;
    if (st2) r.statusAfter = st2;
  }
  r.seconds = Math.round((Date.now() - t0) / 1000);
  results[pl.id] = r;
  writeFileSync(resultsFile, JSON.stringify(results, null, 1));
  log('[' + pl.id + '] exit ' + r.exit + ' verdict ' + r.verdict + ' totals ' + JSON.stringify(r.totals || {}) + (r.failed ? ' FAILED ' + r.failed.slice(0, 200) : '') + (r.error ? ' ERROR ' + r.error : '') + ' clean-after ' + r.cleanAfter + ' (' + r.seconds + 's)');
  if (!r.cleanAfter) { log('STOP: web-hmut not clean after ' + pl.id); process.exit(3); }
}
log('done');
