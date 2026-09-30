// Pweb round-2 review: every hex paint() maps must resolve, through the
// engine's rack.css :root, to the same colour; and every colour a pinned
// module can hand a call site must either map to such a token or pass through.
import fs from 'node:fs';
const ENG = process.argv[2];
globalThis.document = { documentElement: { dataset: {} } };
const vibe = await import(ENG + '/vibe.js');
const ex = await import(ENG + '/exercises.js');
const an = await import(ENG + '/analytics.js').catch(e => ({ err: String(e) }));

const css = fs.readFileSync(ENG + '/rack.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const root = /:root\s*\{([\s\S]*?)\}/.exec(css)[1];
const env = new Map();
for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) env.set(m[1], m[2].trim());
const res = v => v.replace(/var\((--[\w-]+)\)/g, (_, k) => env.has(k) ? res(env.get(k)) : '<undef ' + k + '>');

let bad = 0, n = 0;
const seen = new Set();
function check(label, hex) {
  if (typeof hex !== 'string') return;
  n++;
  const p = vibe.paint(hex);
  const r = p === hex ? hex : res(p);
  const ok = r.toLowerCase() === hex.toLowerCase();
  if (!ok || !seen.has(hex)) console.log((ok ? 'ok  ' : 'BAD ') + label + ' ' + hex + ' -> ' + p + ' -> ' + r);
  seen.add(hex);
  if (!ok) bad++;
}
for (const [g, v] of Object.entries(ex.GROUPS || {})) check('exercises.GROUPS.' + g, v.color);
if (an.err) console.log('analytics import failed:', an.err);
else {
  for (const k of Object.keys(an)) {
    const v = an[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [kk, vv] of Object.entries(v)) if (typeof vv === 'string' && /^#/.test(vv)) check('analytics.' + k + '.' + kk, vv);
  }
  if (typeof an.groupColor === 'function') for (const g of [...Object.keys(ex.GROUPS || {}), 'nosuch', undefined, null, '']) check('groupColor(' + g + ')', an.groupColor(g));
}
// case variants and pass-through
for (const h of ['#D6252B', '#d6252b', '#8D939F', '#8d939f', 'var(--dim)', undefined, 'constructor', '__proto__', 'toString'])
  console.log('paint(' + JSON.stringify(h) + ') =', JSON.stringify(vibe.paint(h)));
console.log(n + ' colours checked; ' + (bad ? bad + ' BAD' : 'all resolve to their own hex'));
