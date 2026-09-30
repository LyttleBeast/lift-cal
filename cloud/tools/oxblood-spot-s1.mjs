// Spot-check: web generated CSS block vs native theme.js build() for oxblood.
import { readFileSync } from 'node:fs';
import { open } from '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood/tools/lib/vibe-snap.mjs';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood';
const css = readFileSync(W + '/vibes/oxblood.css', 'utf8');
const block = css.slice(0, css.indexOf('/* vibes-css:end */'));
const cssVar = n => { const m = block.match(new RegExp('--' + n + ':\\s*([^;]+);')); return m ? m[1].trim() : undefined; };
const H = await open(N);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const natDef = R.load('src/pure/vibes/defs/oxblood.js').default;
const webDef = (await import('data:text/javascript;base64,' + readFileSync(W + '/vibes/defs/oxblood.js').toString('base64'))).default;
const VS = R.load('src/state/vibe.js');
const entry = VS.VIBE_DEFS.oxblood;
const kebab = k => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const out = [];
for (const [label, def] of [['native def', natDef], ['web def', webDef]]) {
  THEME.applyTheme(THEME.build(def, { images: entry.images, fit: entry.fit, chart: entry.chart }));
  const rows = [];
  for (const k of ['rack', 'bar', 'collar', 'knurl', 'chalk', 'steel', 'accent', 'grip', 'well', 'raised', 'pBlue', 'danger', 'onAccent', 'inverse', 'knockout']) {
    const w = cssVar(kebab(k)); const n = T.colors[k];
    rows.push([k, w, n, w === undefined ? 'web-n/a' : (String(w).toLowerCase() === String(n).toLowerCase() ? 'EQ' : 'NE')]);
  }
  for (const [k, v] of [['r', 'r'], ['sm', 'r-sm'], ['tile', 'r-tile'], ['plate', 'r-plate'], ['chip', 'r-chip'], ['idx', 'r-idx']]) {
    const w = cssVar(k === 'r' ? 'r' : v); rows.push(['radius.' + k, w, T.radius[k], w === T.radius[k] + 'px' ? 'EQ' : 'NE']);
  }
  for (const k of ['W', 'F', 'D']) { const w = cssVar('tag-ink-' + k.toLowerCase()); rows.push(['tagInk.' + k, w, T.tagInk[k], w === T.tagInk[k] ? 'EQ' : 'NE']); }
  rows.push(['font', cssVar('font'), T.text.body && T.text.body.fontFamily, '-']);
  rows.push(['chrome', JSON.stringify(def.chrome), JSON.stringify(T.chrome), '-']);
  rows.push(['colors.band', String(def.colors.band), String(T.colors.band), '-']);
  out.push('== ' + label + ' ==', ...rows.map(r => r.join('  |  ')));
}
THEME.applyTheme(THEME.build(R.load('src/pure/vibes/defs/v1.js').default));
console.log(out.join('\n'));
process.exit(0);
