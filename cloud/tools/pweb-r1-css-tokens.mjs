// touch-target's cascade rules, checked on the engine's own text: every :root
// token new since 928a65e is a one-level literal (no var() inside), and every
// property a new token is spent in is a colour / radius / shadow / filter /
// font-family / background one — never a width, padding, margin, flex, gap,
// inset, height, font-size or border width, which touch-target resolves.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';
const baseCss = execFileSync('git', ['-C', ENG, 'show', '928a65e:rack.css'], { encoding: 'utf8' });
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rootOf = css => { const m = /(^|\n):root\s*\{([\s\S]*?)\n\}/.exec(strip(css)); const o = {}; for (const d of m[2].split(';')) { const c = d.indexOf(':'); if (c < 0) continue; const k = d.slice(0, c).trim(); if (k.startsWith('--')) o[k] = d.slice(c + 1).trim(); } return o; };
const rootA = rootOf(baseCss), rootB = rootOf(readFileSync(ENG + 'rack.css', 'utf8'));
const fresh = Object.keys(rootB).filter(k => !(k in rootA));
const bad = [];
for (const k of fresh) if (/var\(/.test(rootB[k])) bad.push('token ' + k + ' is not a literal: ' + rootB[k]);
for (const k of Object.keys(rootA)) if (rootA[k] !== rootB[k]) bad.push('base token ' + k + ' respelt: ' + rootA[k] + ' -> ' + rootB[k]);
const uses = {};
for (const f of ['rack.css', 'auth.css']) {
  const src = strip(readFileSync(ENG + f, 'utf8'));
  // every declaration outside :root
  const re = /([\w-]+)\s*:\s*([^;{}]*var\(--[\w-]+[^;{}]*)[;}]/g; let m;
  while ((m = re.exec(src))) {
    const prop = m[1];
    for (const v of m[2].matchAll(/var\((--[\w-]+)/g)) if (fresh.includes(v[1]) && !prop.startsWith('--')) (uses[prop] = uses[prop] || new Set()).add(v[1]);
    if (prop.startsWith('--') && fresh.includes(prop)) continue;
  }
}
const SIZE = /^(width|min-width|max-width|height|min-height|max-height|padding|padding-\w+|margin|margin-\w+|flex|flex-basis|gap|row-gap|column-gap|inset|top|right|bottom|left|font-size|line-height|border-width|border-\w+-width|font)$/;
for (const [p, s] of Object.entries(uses)) {
  if (SIZE.test(p)) bad.push('new token spent in a size property ' + p + ': ' + [...s].join(','));
  if (/^border(-top|-right|-bottom|-left)?$/.test(p)) for (const t of s) if (/^\s*[\d.]+px/.test(rootB[t])) bad.push('border width via token ' + t);
}
console.log('new :root tokens: ' + fresh.length);
for (const [p, s] of Object.entries(uses).sort()) console.log('  ' + p + ': ' + [...s].sort().join(' '));
console.log(bad.length ? bad.join('\n') : 'no violations');
process.exit(bad.length ? 1 : 0);
