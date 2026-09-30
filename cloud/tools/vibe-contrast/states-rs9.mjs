// List :focus / :active rule results from a web-*.json (vibe-contrast/web.mjs),
// grouped, with anything under threshold marked. node states-rs9.mjs <json> [--all]
import { readFileSync } from 'node:fs';
const J = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ALL = process.argv.includes('--all');
const g = new Map();
for (const r of J.results) {
  if (r.error || !r.states) continue;
  for (const s of r.states) {
    const bad = [];
    if (s.textRatio != null) { const large = s.fs >= 24 || (s.fs >= 18.66 && s.w >= 700); if (s.textRatio < (large ? 3 : 4.5)) bad.push('text ' + s.textRatio); }
    if (s.ringRatio != null && s.ringRatio < 3) bad.push('ring ' + s.ringRatio);
    if (s.edgeRatio != null && s.edgeRatio < 3) bad.push('edge ' + s.edgeRatio + (s.edgeVsFill != null ? ' (vs fill ' + s.edgeVsFill + ')' : ''));
    if (!ALL && !bad.length) continue;
    const k = [r.vibe, s.rule, s.text || '', s.bgState, s.ring || '', s.edge || '', bad.join(';')].join('|');
    const x = g.get(k) || { vibe: r.vibe, s, bad, scenes: new Set(), n: 0 };
    x.n++; x.scenes.add(r.scene + '@' + r.width); g.set(k, x);
  }
}
for (const x of [...g.values()].sort((a, b) => (a.vibe || '').localeCompare(b.vibe || ''))) {
  const s = x.s;
  console.log(`[${x.vibe}] ${s.rule}  el ${s.el.slice(0, 80)}`);
  console.log(`   under ${s.under} bgState ${s.bgState} text ${s.text || '-'} ${s.textRatio ?? ''} ring ${s.ring || '-'} ${s.ringRatio ?? ''} edge ${s.edge || '-'} ${s.edgeRatio ?? ''} stateVsUnder ${s.stateVsUnder ?? ''}  ${x.bad.length ? 'FAIL ' + x.bad.join('; ') : ''}  n${x.n} ${[...x.scenes].slice(0, 3).join(', ')}`);
}
