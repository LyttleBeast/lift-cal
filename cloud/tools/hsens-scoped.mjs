// css-static resolves var() against :root and the rule's own declarations only.
// List every custom property declared OUTSIDE :root (scoped), in base and
// engine, and any that shares a name with a :root token — where the text
// comparison's resolution and the cascade's could part ways.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCss, rootOf } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs';
const trees = { base: '/Users/micahflunker/dev/vibes-night/wt/web-base', engine: '/Users/micahflunker/dev/vibes-night/wt/web-engine' };
for (const [name, dir] of Object.entries(trees)) {
  const root = new Map();
  const scoped = [];
  const uses = new Map();
  for (const f of ['rack.css', 'auth.css']) {
    const t = readFileSync(join(dir, f), 'utf8');
    for (const [k, v] of rootOf(t)) root.set(k, v);
    for (const r of parseCss(t)) {
      const isRoot = !r.ctx.length && r.sel.trim() === ':root';
      for (const [k, v] of r.decls) {
        if (k.startsWith('--') && !isRoot) scoped.push({ f, ctx: r.ctx.join(' > '), sel: r.sel, k, v });
        for (const m of String(v).matchAll(/var\(\s*(--[\w-]+)/g)) uses.set(m[1], (uses.get(m[1]) || 0) + 1);
      }
    }
  }
  console.log('== ' + name + ': :root tokens ' + root.size + ', scoped custom property declarations ' + scoped.length);
  for (const s of scoped) console.log('  scoped ' + s.f + ' ' + (s.ctx ? s.ctx + ' > ' : '') + s.sel + ' { ' + s.k + ': ' + s.v + ' }' + (root.has(s.k) ? '   <-- ALSO a :root token (' + root.get(s.k) + ')' : ''));
  const undeclared = [...uses.keys()].filter(k => !root.has(k) && !scoped.some(s => s.k === k));
  console.log('  var() names used but declared nowhere in the stylesheets (set by JS or fallback): ' + undeclared.join(' '));
}
