// For every scene both sides dumped: the dock's buttons (rect, order, words)
// in A against B, and every button / input / [role=button] that is 44px tall
// or more in A but under 44 in B (the §2 floor). Read-only over the run's dumps.
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const P = '/Users/micahflunker/dev/vibes-night/proof/v-oxblood-review-s1-r1-b/';
const load = f => JSON.parse(gunzipSync(readFileSync(f)).toString());
let shown = false;
const out = { dockMoved: [], shrunk: [] };
for (const w of ['390', '320']) {
  for (const f of readdirSync(P + 'B/' + w).filter(x => x.endsWith('.dump.json.gz'))) {
    let a, b;
    try { a = load(P + 'A/' + w + '/' + f); b = load(P + 'B/' + w + '/' + f); } catch { continue; }
    if (!shown) { shown = true; console.log('dump keys', Object.keys(b).join(' ')); const el = (b.elements || b.els || b.nodes || [])[0]; console.log('element keys', el && Object.keys(el).join(' ')); }
    const list = d => d.elements || d.els || d.nodes || [];
    const ma = new Map(list(a).map(e => [e.p, e])), mb = new Map(list(b).map(e => [e.p, e]));
    const dockPaths = new Set(list(a).filter(e => /(^| )dock( |$)/.test((e.at || {}).class || '')).map(e => e.p));
    for (const [path, ea] of ma) {
      const eb = mb.get(path); if (!eb) continue;
      const ra = ea.r, rb = eb.r; if (!ra || !rb) continue;
      const tag = path.split('>').pop().replace(/:\d+$/, '').toLowerCase();
      const cls = String((ea.at || {}).class || '');
      const inDock = [...dockPaths].some(d => path.startsWith(d + '>'));
      if (inDock && /button/.test(tag) && (Math.abs(ra[0] - rb[0]) > .5 || Math.abs(ra[1] - rb[1]) > .5 || Math.abs(ra[2] - rb[2]) > .5 || Math.abs(ra[3] - rb[3]) > .5))
        out.dockMoved.push(w + ' ' + f + ' ' + path + ' ' + JSON.stringify(ra) + ' -> ' + JSON.stringify(rb));
      const ctrl = /^(button|input|select|textarea)$/.test(tag) || (ea.at || {}).role === 'button';
      if (ctrl && ra[3] >= 44 && rb[3] < 44 && rb[3] > 0) out.shrunk.push(w + ' ' + f + ' ' + path + ' ' + cls + ' h ' + ra[3].toFixed(1) + ' -> ' + rb[3].toFixed(1));
    }
  }
}
console.log('dock buttons moved:', out.dockMoved.length); console.log(out.dockMoved.slice(0, 20).join('\n'));
console.log('controls under 44 in B, 44+ in A:', out.shrunk.length); console.log(out.shrunk.slice(0, 40).join('\n'));
