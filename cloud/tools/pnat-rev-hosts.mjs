// Print hosts of the BASE render whose value at `prop` follows `role` in the
// sentinel render, with their style, to judge each site's job.
// Usage: node pnat-rev-hosts.mjs <role hex in sentinel> <prop path e.g. s.backgroundColor> [filterRegexOnScene]
import { readFileSync } from 'node:fs';
const BASE = '/Users/micahflunker/dev/vibes-night/proof/pnat/render-base-by-proofcopy.txt';
const SENT = '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/render-sentinel.txt';
const [hex, prop, filt] = process.argv.slice(2);
function parse(file) {
  const scenes = []; let cur = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if ('name' in o && 'errors' in o && !('t' in o)) { cur = { name: o.name, hosts: [] }; scenes.push(cur); } else cur.hosts.push(o);
  }
  return scenes;
}
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const B = parse(BASE), S = new Map(parse(SENT).map(s => [s.name, s]));
const seen = new Map();
for (const sb of B) {
  if (filt && !new RegExp(filt).test(sb.name)) continue;
  const ss = S.get(sb.name);
  sb.hosts.forEach((h, i) => {
    const v = get(ss.hosts[i], prop);
    if (typeof v !== 'string' || v.toLowerCase() !== hex.toLowerCase()) return;
    // context: the next few hosts' text
    let ctx = '';
    for (let j = i; j < Math.min(sb.hosts.length, i + 12) && ctx.length < 60; j++) if (sb.hosts[j].x) ctx += sb.hosts[j].x + ' | ';
    const par = [];
    for (let j = i - 1, d = h.d; j >= 0 && par.length < 3; j--) if (sb.hosts[j].d < d) { d = sb.hosts[j].d; par.push(sb.hosts[j].t + (sb.hosts[j].p && sb.hosts[j].p.accessibilityLabel ? '(' + sb.hosts[j].p.accessibilityLabel + ')' : '')); }
    const k = h.t + ' ' + JSON.stringify(h.s || {}) + ' ' + JSON.stringify(h.p || {}).slice(0, 160);
    if (!seen.has(k)) seen.set(k, { n: 0, ex: sb.name + ' #' + i, ctx, par: par.join(' < ') });
    seen.get(k).n++;
  });
}
for (const [k, v] of seen) console.log(v.n + 'x ' + v.ex + '\n   ' + k.slice(0, 400) + '\n   parents: ' + v.par + '\n   ctx: ' + v.ctx.slice(0, 120));
