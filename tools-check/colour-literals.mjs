#!/usr/bin/env node
//
// Verifier that no colour is written down anywhere but in a theme or vibe
// file (V59 §7.5, the web half).
//
//   node tools-check/colour-literals.mjs
//
// A vibe can only recolour what spends a token. A hex baked into a JS style,
// an SVG attribute or a stylesheet rule stays v1's colour under every vibe,
// and nobody notices until someone picks one. So this reads every file the
// phone loads — the top-level .js, .css, .html and .json, bar the database
// rules — and fails on any colour literal outside the few places a literal
// is the point:
//
//   rack.css      inside the top-level :root rule, where v1's tokens are
//                 defined; nowhere else in the file
//   vibes/**      a vibe's generated block and its own rules (vibes/<id>.css),
//                 the pure definitions (vibes/defs/**) and icon sets
//                 (vibes/icons/**) — not scanned: they ARE the theme
//   vibe.js       inside `const PAINT = { … }`, the map from the hex the
//                 pinned modules bake to the token that paints it
//   the pinned pure modules (exercises.js, analytics.js, coach*.js, …): copied
//                 into native verbatim and never edited; their colours are
//                 mapped where they are spent (vibe.js paint())
//   store.js      showBlockBanner(), the write-refused banner — off-theme on
//                 purpose, so it is legible whatever a vibe does: exactly its
//                 five literals, #7f1d1d, #fff, rgba(0,0,0,.45), #fff and
//                 #7f1d1d (lines 520, 522 and 528 at rack-v58, 928a65e). The
//                 function is the anchor, not the line numbers, so an edit
//                 above it does not break this; a sixth literal in it does.
//   404.html      a standalone page with its own copy of the tokens
//   index.html    <meta name="theme-color">'s content, and hex inside the
//                 classic inline <script> in <head> (the first-paint script's
//                 per-vibe theme-color map). Nothing else: the auth mark's
//                 plates spend var(--p-…)
//   manifest.json "theme_color" and "background_color" — read once by an
//                 installed PWA, so static by nature; no token can reach them
//
// What counts as a colour literal: #rgb / #rgba / #rrggbb / #rrggbbaa, rgb(),
// rgba(), hsl() and hsla() with a number inside (rgba(var(--x-rgb), a) is a
// token, not a literal), a CSS named colour — except transparent,
// currentColor and inherit — and a bare channel list like '240,190,30' (the
// --kpi-rgb idiom). In JS and JSON it is looked for inside string literals;
// in CSS, in declaration values; in HTML, in attribute values, inline
// <style> and inline <script>. Comments are skipped everywhere.
//
//   A  the tree: every literal outside those places, file:line, listed
//   B  the store.js banner holds exactly its five
//   C  canaries: each allowed place passes and each other place fails

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PINNED = ['exercises.js', 'analytics.js', 'tdee.js', 'units.js', 'accounts.js', 'insights.js',
  'estimate-origin.js', 'estimate-ask.js', 'coach.js', 'coach-build.js', 'coach-live.js', 'coach-prog.js',
  'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach-tags.js'];
const BANNER = ['#7f1d1d', '#fff', 'rgba(0,0,0,.45)', '#fff', '#7f1d1d'];

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (c, m) => (c ? ok(m) : bad(m));
const section = t => console.log('\n' + t);

const NAMED = new Set('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peru pink plum powderblue purple rebeccapurple red rosybrown saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' '));
const CHANNELS = /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/;

// Colours in a run of text: [{ i, lit }], i relative to the text.
function colours(s) {
  const out = []; const re = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|\b(?:rgba?|hsla?)\(\s*[\d.][^)]*\)/g; let m;
  while ((m = re.exec(s))) {
    if (m[0][0] === '#' && (![4, 5, 7, 9].includes(m[0].length) || s[m.index - 1] === '&')) continue;
    out.push({ i: m.index, lit: m[0] });
  }
  return out;
}

/* CSS: every colour in a declaration value, with the rule it sits in. */
function scanCss(text, base = 0) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' '));
  const hits = []; const stack = [];
  let start = 0, head = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') { stack.push(head.trim().replace(/\s+/g, ' ')); head = ''; start = i + 1; }
    else if (c === '}' || c === ';') {
      const d = src.slice(start, i), k = d.indexOf(':');
      if (stack.length && k > 0 && !stack[stack.length - 1].startsWith('@')) {
        const v0 = start + k + 1, val = d.slice(k + 1);
        const where = { sel: stack[stack.length - 1], top: stack.length === 1 };
        for (const col of colours(val)) hits.push({ at: base + v0 + col.i, lit: col.lit, ...where });
        const noVar = val.replace(/var\([^)]*\)/g, m => ' '.repeat(m.length)).replace(/url\([^)]*\)|"[^"]*"|'[^']*'/g, m => ' '.repeat(m.length));
        for (const m of noVar.matchAll(/[A-Za-z][A-Za-z-]*/g)) if (NAMED.has(m[0].toLowerCase()) && noVar[m.index + m[0].length] !== '(') hits.push({ at: base + v0 + m.index, lit: m[0], ...where });
        if (CHANNELS.test(val)) hits.push({ at: base + v0 + val.search(/\d/), lit: val.trim(), ...where });
      }
      if (c === '}') stack.pop();
      start = i + 1; head = '';
    } else if (c !== '\n' || head) head += c;
  }
  return hits;
}

/* JS and JSON: every colour inside a string literal. */
function scanJs(text, base = 0) {
  const hits = []; let i = 0; const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c, start = ++i; let body = '';
      while (i < n && text[i] !== q) {
        if (text[i] === '\\') { body += text[i] + (text[i + 1] || ''); i += 2; continue; }
        if (q !== '`' && text[i] === '\n') break;
        if (q === '`' && text[i] === '$' && text[i + 1] === '{') { let dp = 0; while (i < n) { if (text[i] === '{') dp++; else if (text[i] === '}') { dp--; if (dp === 0) { body += ' '; i++; break; } } body += ' '; i++; } continue; }
        body += text[i]; i++;
      }
      i++;
      for (const col of colours(body)) hits.push({ at: base + start + col.i, lit: col.lit });
      if (NAMED.has(body.toLowerCase())) hits.push({ at: base + start, lit: body });
      if (CHANNELS.test(body)) hits.push({ at: base + start, lit: body });
      continue;
    }
    i++;
  }
  return hits;
}

/* HTML: attribute values, inline <style>, inline <script>. */
function scanHtml(text) {
  const src = text.replace(/<!--[\s\S]*?-->/g, s => s.replace(/[^\n]/g, ' '));
  const hits = [];
  const headEnd = (() => { const k = src.search(/<\/head>/i); return k < 0 ? 0 : k; })();
  const blocks = [];
  for (const m of src.matchAll(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const bodyAt = m.index + m[0].indexOf('>') + 1;
    blocks.push([m.index, m.index + m[0].length]);
    const tag = m[1].toLowerCase(), attrs = m[2];
    if (tag === 'style') for (const h of scanCss(m[3], bodyAt)) hits.push({ ...h, where: 'style' });
    else if (!/\bsrc\s*=/.test(attrs)) {
      const classic = !/type\s*=\s*["']?module/i.test(attrs);
      for (const h of scanJs(m[3], bodyAt)) hits.push({ ...h, where: classic && m.index < headEnd ? 'head-script' : 'script' });
    }
  }
  const inBlock = i => blocks.some(([a, b]) => i >= a && i < b);
  for (const m of src.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    if (inBlock(m.index)) continue;
    const tagAt = m.index, tag = m[1].toLowerCase(), attrs = m[2];
    for (const a of attrs.matchAll(/\s([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
      const v0 = tagAt + 1 + m[1].length + a.index + a[0].indexOf('"') + 1;
      const isThemeMeta = tag === 'meta' && /name\s*=\s*"theme-color"/.test(attrs) && a[1] === 'content';
      for (const col of colours(a[2])) hits.push({ at: v0 + col.i, lit: col.lit, where: isThemeMeta ? 'theme-meta' : 'attr:' + a[1] });
      if (a[1] === 'style') {
        const noVar = a[2].replace(/var\([^)]*\)/g, x => ' '.repeat(x.length));
        for (const w of noVar.matchAll(/[A-Za-z][A-Za-z-]*/g)) if (NAMED.has(w[0].toLowerCase())) hits.push({ at: v0 + w.index, lit: w[0], where: 'attr:style' });
      }
    }
  }
  return hits;
}

/* The [start, end) of the braces after the first match of `re`, or null. */
function bracedAfter(text, re) {
  const m = re.exec(text); if (!m) return null;
  const open = text.indexOf('{', m.index + m[0].length - 1); if (open < 0) return null;
  let d = 0;
  for (let j = open; j < text.length; j++) { if (text[j] === '{') d++; else if (text[j] === '}') { d--; if (!d) return [m.index, j + 1]; } }
  return null;
}

/* The disallowed literals in one file, and the allowed ones, by the rules in
   the header. */
function judge(file, text) {
  const lineOf = i => text.slice(0, i).split('\n').length;
  const out = { bad: [], allowed: [] };
  const put = (h, allowed, why) => (allowed ? out.allowed : out.bad).push({ file, line: lineOf(h.at), lit: h.lit, why });
  if (file.endsWith('.css')) {
    for (const h of scanCss(text)) put(h, file === 'rack.css' && h.top && h.sel === ':root', h.sel);
  } else if (file.endsWith('.html')) {
    for (const h of scanHtml(text)) {
      const allowed = file === '404.html' || h.where === 'theme-meta' || (file === 'index.html' && h.where === 'head-script' && h.lit[0] === '#');
      put(h, allowed, h.where);
    }
  } else if (file.endsWith('.json')) {
    for (const h of scanJs(text)) {
      const key = (/"([\w-]+)"\s*:\s*$/.exec(text.slice(Math.max(0, h.at - 60), h.at - 1)) || [])[1];
      put(h, file === 'manifest.json' && (key === 'theme_color' || key === 'background_color'), key || '');
    }
  } else if (file.endsWith('.js')) {
    const paint = file === 'vibe.js' ? bracedAfter(text, /\bconst\s+PAINT\s*=\s*\{/) : null;
    const banner = file === 'store.js' ? bracedAfter(text, /\bfunction\s+showBlockBanner\s*\([^)]*\)\s*\{/) : null;
    for (const h of scanJs(text)) {
      if (paint && h.at >= paint[0] && h.at < paint[1]) { put(h, true, 'PAINT'); continue; }
      if (banner && h.at >= banner[0] && h.at < banner[1]) { put(h, BANNER.includes(h.lit), 'showBlockBanner'); continue; }
      put(h, false, '');
    }
  }
  return out;
}

/* ================= A ================= */
section('A  no colour literal outside the theme and vibe files');
const files = readdirSync(ROOT).filter(f => /\.(js|css|html|json)$/.test(f) && !/^database\.rules/.test(f) && !PINNED.includes(f)).sort();
const all = { bad: [], allowed: [] };
for (const f of files) {
  const r = judge(f, readFileSync(join(ROOT, f), 'utf8'));
  all.bad.push(...r.bad); all.allowed.push(...r.allowed);
}
const srcLine = (f, n) => readFileSync(join(ROOT, f), 'utf8').split('\n')[n - 1].trim();
if (all.bad.length) {
  const byFile = new Map();
  for (const b of all.bad) { if (!byFile.has(b.file)) byFile.set(b.file, []); byFile.get(b.file).push(b); }
  for (const [f, list] of byFile) {
    bad(`${f}: ${list.length} colour literal${list.length === 1 ? '' : 's'} outside a theme file`);
    for (const b of list) console.log(`      ${f}:${b.line}  ${b.lit}${b.why ? '  [' + b.why + ']' : ''}  |  ${srcLine(f, b.line).slice(0, 110)}`);
  }
} else ok(`none in the ${files.length} phone-loaded files outside the pinned modules and vibes/`);
if (process.env.VERBOSE) {
  const tally = {};
  for (const a of all.allowed) tally[a.file + (a.why ? ' ' + a.why : '')] = (tally[a.file + (a.why ? ' ' + a.why : '')] || 0) + 1;
  console.log('    allowed, by place: ' + Object.entries(tally).map(([k, n]) => `${k} ×${n}`).join(', '));
}
const vibeFiles = existsSync(join(ROOT, 'vibes')) ? readdirSync(join(ROOT, 'vibes'), { recursive: true }).length : 0;
ok(`vibes/ (${vibeFiles} entries) is the theme itself and is not scanned; nor are the ${PINNED.length} pinned modules`);

/* ================= B ================= */
section('B  store.js\'s refusal banner holds exactly its five literals');
{
  const s = readFileSync(join(ROOT, 'store.js'), 'utf8');
  const r = judge('store.js', s);
  const inBanner = r.allowed.filter(a => a.why === 'showBlockBanner');
  expect(!!bracedAfter(s, /\bfunction\s+showBlockBanner\s*\([^)]*\)\s*\{/), 'store.js still has showBlockBanner()');
  expect(JSON.stringify(inBanner.map(a => a.lit)) === JSON.stringify(BANNER),
    `showBlockBanner() spends ${BANNER.join(', ')} and nothing else (lines ${[...new Set(inBanner.map(a => a.line))].join(', ')})`);
}

/* ================= C ================= */
section('C  canaries');
{
  const lits = r => r.bad.map(b => b.lit);
  const css = `:root { --a: #123456; --b-rgb: 1,2,3; }\n.x { color: #abcdef; background: rgba(1, 2, 3, .5); border-color: red; }\n` +
    `.y { background: rgba(var(--b-rgb), .5); color: transparent; fill: currentColor; font-family: 'Tan Sans'; }\n.k { --kpi-rgb: 4,5,6; }\n` +
    `@media (min-width: 1px) { :root { --c: #fff; } }\n`;
  const rc = judge('rack.css', css);
  expect(JSON.stringify(lits(rc)) === JSON.stringify(['#abcdef', 'rgba(1, 2, 3, .5)', 'red', '4,5,6', '#fff']),
    'rack.css: :root literals pass; a hex, an rgba(), a named colour, a channel list and a :root inside @media fail; tokens, transparent, currentColor and a font name do not — got ' + lits(rc).join(', '));
  expect(lits(judge('auth.css', ':root { --a: #123456; }')).length === 1, 'auth.css: even its :root may not define a colour');
  const js = `const PAINT = { '#D6252B': 'var(--p-red)', '#8d939f': 'var(--steel)' };\nx.style.background = '#d6252b';\n` +
    `s.setAttribute('fill', 'white');\nk.style.setProperty('--kpi-rgb', '240,190,30');\n// '#ffffff' in a comment\nconst ok = 'var(--accent)';\n`;
  expect(JSON.stringify(lits(judge('vibe.js', js))) === JSON.stringify(['#d6252b', 'white', '240,190,30']), 'vibe.js: PAINT passes, a hex, a named colour and a channel string outside it fail, comments are skipped');
  expect(lits(judge('workout.js', js)).length === 5, 'any other JS file: PAINT is no exception there');
  const store = `function showBlockBanner(why) { a = 'background:#7f1d1d;color:#fff'; b = 'box-shadow:0 8px 28px rgba(0,0,0,.45)'; c = 'color:#00ff00'; }\nconst z = '#7f1d1d';\n`;
  expect(JSON.stringify(lits(judge('store.js', store))) === JSON.stringify(['#00ff00', '#7f1d1d']), 'store.js: the banner\'s own literals pass; a new one in it, or one of them outside it, fails');
  const html = `<head><meta name="theme-color" content="#14161a"><script>var T={v1:'#14161a'};</script></head>\n` +
    `<body><i style="background:#d6252b"></i><i style="background:var(--p-red)"></i><svg fill="black"></svg><script>x='#010203'</script><script type="module">y='#040506'</script></body>`;
  expect(JSON.stringify(lits(judge('index.html', html))) === JSON.stringify(['#010203', '#040506', '#d6252b']),
    'index.html: the theme-color meta and the head script pass; an inline style hex, a body script and a module script fail — got ' + lits(judge('index.html', html)).join(', '));
  expect(lits(judge('404.html', html)).length === 0, '404.html: allowed whole');
  expect(JSON.stringify(lits(judge('manifest.json', '{ "theme_color": "#14161a", "background_color": "#14161a", "x": "#000000" }'))) === JSON.stringify(['#000000']),
    'manifest.json: theme_color and background_color pass, any other key fails');
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed (${all.bad.length} literal${all.bad.length === 1 ? '' : 's'} to move).`
  : `All checks passed. ${checks} checks. ${files.length} files read; ${all.allowed.length} literals, every one in a theme file.`));
process.exit(fails.length ? 1 : 0);
