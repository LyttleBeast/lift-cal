// Read-only parity probe (chalk, rs9): every colour and tint token in the web's
// generated block against native build()'s T, by name; plus type presets'
// size/weight/tracking from the pure def against T.text.
import { readFileSync } from 'node:fs';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const V = R.load('src/state/vibe.js');
const e = V.VIBE_DEFS.chalk;
THEME.applyTheme(THEME.build(e.def, e));
const css = readFileSync(WEB + '/vibes/chalk.css', 'utf8');
// the generated token block: first :root[data-vibe="chalk"] { ... }
const i = css.indexOf(':root[data-vibe="chalk"]');
const blk = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
const toks = {};
for (const m of blk.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) toks[m[1]] = m[2].trim();
const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const norm = s => String(s).replace(/\s+/g, '').replace(/,0\./g, ',.').toLowerCase();
let agree = 0, diff = 0, skipped = [];
const rows = [];
for (const [k, v] of Object.entries(toks)) {
  let nat;
  if (k.startsWith('tint-')) nat = T.tint[camel(k.slice(5))];
  else if (/^r(-|$)/.test(k)) { const rk = k === 'r' ? 'r' : camel(k.slice(2)); nat = T.radius[rk] != null ? T.radius[rk] + 'px' : undefined; }
  else if (k.startsWith('tag-ink-')) nat = T.tagInk[k.slice(8).toUpperCase()];
  else if (k.endsWith('-rgb')) { const c = T.colors[camel(k.slice(0, -4))]; if (c) { const n = parseInt(c.slice(1), 16); nat = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); } }
  else nat = T.colors[camel(k)];
  if (nat === undefined) { skipped.push(k); continue; }
  const ok = norm(v) === norm(nat);
  ok ? agree++ : diff++;
  rows.push((ok ? 'AGREE ' : 'DIFF  ') + k + '  web ' + v + '  nat ' + nat);
}
console.log(rows.filter(r => r.startsWith('DIFF')).join('\n') || '(no diffs)');
console.log('agree', agree, 'diff', diff, 'not mapped', skipped.join(' '));
// ten roles picked for the report
for (const k of ['chalk', 'dim', 'well', 'p-blue', 'p-green', 'p-red', 'warn', 'done', 'shade', 'lift'])
  console.log('PICK', k, 'web', toks[k], 'nat', T.colors[camel(k)]);
const D = e.def;
for (const p of ['h2', 'fieldLbl', 'body', 'kpiVal', 'sheetTitle'])
  console.log('TYPE', p, 'def', JSON.stringify(D.type && D.type[p]), 'nat', JSON.stringify(T.text[p] && { f: T.text[p].fontFamily, s: T.text[p].fontSize, ls: T.text[p].letterSpacing, tt: T.text[p].textTransform, c: T.text[p].color }));
