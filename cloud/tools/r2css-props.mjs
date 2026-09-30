// Pweb round-2: which properties now spend a NEW token (one rack-v58's :root
// did not have), and do any of them touch-target's cascade reads?
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const newT = new Set(r.newTokens.map(([k]) => k));
const byProp = {};
for (const c of r.changed) {
  const toks = [...c.B.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]).filter(t => newT.has(t));
  if (!toks.length) continue;
  (byProp[c.prop] ||= new Set());
  toks.forEach(t => byProp[c.prop].add(t));
}
for (const [p, s] of Object.entries(byProp).sort()) console.log(p.padEnd(26), [...s].join(' '));
// tokens that are multi-valued or reference other tokens
for (const [k, v] of r.newTokens) {
  const flags = [];
  if (/var\(/.test(v)) flags.push('NESTED');
  if (/,/.test(v.replace(/\([^()]*\)/g, ''))) flags.push('list');
  if (/\s/.test(v.replace(/\([^()]*\)/g, '').trim())) flags.push('multi-token');
  if (flags.length) console.log('token', k, '=', v, flags.join(','));
}
// changed declarations where the property is not paint-only
const SIZE = /^(width|height|min-|max-|padding|margin|flex|inset|top|bottom|left|right|border(-top|-right|-bottom|-left)?(-width)?$|border$|outline$|font-size|line-height|gap|grid)/;
for (const c of r.changed) if (SIZE.test(c.prop)) console.log('size-ish changed:', c.rule, c.prop, '|', c.A, '=>', c.B);
