// Parity spot-check (gate "parity", navy, round 1-s1): web's generated CSS
// block vs native's built theme, for chosen roles; plus byte-identity of the
// pure files between the two worktrees. Read-only.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-navy/';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-navy/';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

for (const f of ['defs/navy.js', 'icons/navy.js', 'defs/index.js', 'defs/vocab.js', 'defs/v1.js', 'defs/chalk.js', 'icons/chalk.js', 'icons/v1.js']) {
  const a = sha(WEB + 'vibes/' + f), b = sha(NAT + 'src/pure/vibes/' + f);
  ok(a === b, f + ' web ' + a.slice(0, 12) + ' native ' + b.slice(0, 12));
}

const css = readFileSync(WEB + 'vibes/navy.css', 'utf8');
const block = css.slice(0, css.indexOf('vibes-css:end'));
const vars = {};
for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();

const { open } = await import(NAT + 'tools/lib/vibe-snap.mjs');
const H = await open(NAT.replace(/\/$/, ''));
const V = H.R.load('src/state/vibe.js');
const T = V.previewTheme('navy');
ok(!!T, 'native previewTheme(navy) builds');
const C = T.colors || T.c || T;
const norm = s => String(s).toLowerCase().replace(/\s+/g, '');
const hexRgba = s => { const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(norm(s)); return m ? m.slice(1).map(Number) : null; };
const pairs = [
  ['rack', 'rack'], ['bar', 'bar'], ['collar', 'collar'], ['knurl', 'knurl'], ['chalk', 'chalk'],
  ['steel', 'steel'], ['dim', 'dim'], ['accent', 'accent'], ['p-red', 'pRed'], ['p-blue', 'pBlue'],
  ['p-yellow', 'pYellow'], ['p-green', 'pGreen'], ['raised', 'raised'], ['grip', 'grip'], ['done', 'done'],
  ['on-danger', 'onDanger'], ['ink', 'onAccent'], ['cal-mark', 'calMark'], ['well', 'well'], ['focus', 'focus']
];
for (const [cv, nk] of pairs) {
  const w = vars[cv], n = C[nk];
  ok(w != null && n != null && norm(w) === norm(n), `--${cv} ${w}  vs native colors.${nk} ${n}`);
}
const R = T.radius || {};
for (const [cv, nk] of [['r', 'r'], ['r-sm', 'sm'], ['r-tile', 'tile'], ['r-chip', 'chip'], ['r-idx', 'idx'], ['r-plate', 'plate']]) {
  const w = parseFloat(vars[cv]); ok(w === R[nk], `--${cv} ${vars[cv]} vs native radius.${nk} ${R[nk]}`);
}
// tints
const tn = T.tint || {};
for (const [k, want] of [['setDone', 'rgba(60, 196, 160, 0.1)'], ['dropRail', 'rgba(102, 166, 255, 0.7)'], ['backdrop', 'rgba(0, 0, 0, 0.6)'], ['dockGlass', 'rgba(10, 24, 59, 0.82)']]) {
  const a = hexRgba(tn[k]), b = hexRgba(want);
  ok(a && b && a.every((x, i) => Math.abs(x - b[i]) < 1e-9), `tint.${k} native ${tn[k]} vs def ${want}`);
}
// web tokens for a few tints
for (const k of ['tint-set-done', 'tint-drop-rail', 'tint-backdrop', 'tint-dock-glass', 'tint-runway']) console.log('info  --' + k + ' = ' + vars[k]);
console.log('info  native fonts', JSON.stringify(T.fonts && T.fonts.keys), 'web --font', vars.font);
console.log('info  native type.body', JSON.stringify(T.type && T.type.body), 'type.eyebrow', JSON.stringify(T.type && T.type.eyebrow));
console.log('info  web tag-ink', vars['tag-ink-w'], vars['tag-ink-f'], vars['tag-ink-d'], ' native tagInk', JSON.stringify(T.tagInk));
console.log(fails ? fails + ' FAILED' : 'all spot-checks agree');
process.exit(fails ? 1 : 0);
