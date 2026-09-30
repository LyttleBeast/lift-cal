// Parity gate (chalk, reproof-rs9): every colour role, tagInk, tint, radius and ring in the web's
// generated block vs native build(), matched by name; plus a few hand rules.
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
THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart }));
const css = readFileSync(WEB + '/vibes/chalk.css', 'utf8');
const toks = {};
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!(m[1] in toks)) toks[m[1]] = m[2].trim();
const kebab = s => s.replace(/([A-Z])/g, '-$1').toLowerCase();
const norm = s => String(s).replace(/\s+/g, '').replace(/,0\./g, ',.').toLowerCase();
let agree = 0, diff = 0, miss = [];
const cmp = (role, web, nat) => {
  if (web == null) { miss.push(role); return; }
  const ok = norm(web) === norm(nat) || norm(web) === norm(nat) + 'px';
  ok ? agree++ : diff++;
  if (!ok) console.log('DIFF', role, 'web', web, 'nat', JSON.stringify(nat));
};
for (const [k, v] of Object.entries(T.colors)) cmp('colors.' + k, toks['--' + kebab(k)], v);
for (const [k, v] of Object.entries(T.tagInk || {})) cmp('tagInk.' + k, toks['--tag-ink-' + k.toLowerCase()], v);
for (const [k, v] of Object.entries(T.tint)) cmp('tint.' + k, toks['--tint-' + kebab(k)], v);
for (const [k, v] of Object.entries(T.radius)) cmp('radius.' + k, toks[k === 'r' ? '--r' : '--r-' + kebab(k)], v);
for (const k of ['calHead', 'calTarget', 'calTick']) {
  const w = toks['--shadow-' + kebab(k)], n = T.ring && T.ring[k];
  if (w == null) { miss.push('shadow.' + k); continue; }
  const m = w.match(/0 0 0 (\d+)px (rgba\([^)]+\))/);
  const ok = m && n && +m[1] === n.borderWidth && norm(m[2]) === norm(n.borderColor);
  ok ? agree++ : diff++; console.log(ok ? 'AGREE' : 'DIFF', 'shadow.' + k, w, JSON.stringify(n));
}
console.log('agree', agree, 'diff', diff, 'web-token-missing', miss.join(' '));
console.log('T.chart', JSON.stringify(T.chart));
console.log('dockLbl', JSON.stringify(T.text.dockLbl), '--dim', toks['--dim']);
console.log('chip', JSON.stringify(T.text.chip), 'segBtn', JSON.stringify(T.text.segBtn));
