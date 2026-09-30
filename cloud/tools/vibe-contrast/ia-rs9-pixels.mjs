// Iron Age contrast gate (rs9): the pairs that sit on real pixels — the page
// grain (every text colour against the grain's darkest composited pixel) and
// the Vibes tile's `315` over the thumbnail under its .54 stock scrim.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/iron-age/';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/assets/vibes/iron-age/';
const D = (await import('/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/defs/iron-age.js')).default;
const C = D.colors;
const rgb = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16));
const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const load = f => PNG.sync.read(readFileSync(f));
const over = (px, a, bg) => px.map((v, i) => v * a + bg[i] * (1 - a));

for (const f of ['textures/grain-manual@2x.png', 'textures/grain-manual@3x.png', 'img/pick.png', 'img/you.png', 'img/recap.png', 'img/steps.png', 'img/weight.png'])
  console.log(f, 'web', sha(WEB + f), 'nat', sha(NAT + f), sha(WEB + f) === sha(NAT + f) ? 'same' : 'DIFFER');

const rack = rgb(C.rack);
for (const f of ['textures/grain-manual@2x.png', 'textures/grain-manual@3x.png']) {
  const p = load(WEB + f);
  let dark = null, dY = 9, light = null, lY = -1, amin = 255;
  for (let i = 0; i < p.data.length; i += 4) {
    const a = p.data[i + 3] / 255; amin = Math.min(amin, p.data[i + 3]);
    const c = over([p.data[i], p.data[i + 1], p.data[i + 2]], a, rack);
    const y = Y(c); if (y < dY) { dY = y; dark = c; } if (y > lY) { lY = y; light = c; }
  }
  console.log('\n' + f, p.width + 'x' + p.height, 'min alpha', amin, 'darkest', hex(dark), 'lightest', hex(light));
  const inks = ['chalk', 'steel', 'dim', 'faint', 'accent', 'warn', 'good', 'bad', 'danger', 'done', 'pRed', 'pBlue', 'pGreen', 'pWhite', 'pYellow', 'pChrome', 'knurl', 'grip'];
  console.log('  ' + inks.map(k => k + ' ' + C[k] + ' ' + CR(rgb(C[k]), dark).toFixed(2) + ' (flat ' + CR(rgb(C[k]), rack).toFixed(2) + ')').join('\n  '));
  // pill words over their tints on the darkest grain pixel
  for (const [pill, word] of [['pillUp', 'good'], ['pillDown', 'bad'], ['pillWarn', 'warn'], ['pillBase', 'dim']]) {
    const t = D.tint[pill]; const g = over(rgb(C[t.color]), t.a, dark);
    console.log('  ' + pill + ' ' + hex(g) + ' ' + word + ' ' + CR(rgb(C[word]), g).toFixed(2));
  }
  for (const [tn, word] of [['setDone', 'chalk'], ['setDone', 'dim'], ['setFlash', 'dim'], ['pickSel', 'chalk'], ['pickSel', 'dim'], ['tagW', 'warn'], ['tagF', 'pRed'], ['tagD', 'pBlue']]) {
    const t = D.tint[tn]; const g = over(rgb(C[t.color]), t.a, dark);
    console.log('  ' + tn + ' ' + hex(g) + ' ' + word + ' ' + CR(rgb(C[word]), g).toFixed(2));
  }
}

// the Vibes tile: `315` in ink over pick.png under rack at .54 (and .53, Chrome's loss)
for (const tree of [WEB, NAT]) {
  const p = load(tree + 'img/pick.png');
  for (const a of [0.54, 0.53]) {
    let worst = 99, wpx = null, n = 0, under3 = 0, under45 = 0;
    for (let i = 0; i < p.data.length; i += 4) {
      const px = over([p.data[i], p.data[i + 1], p.data[i + 2]], p.data[i + 3] / 255, rack);
      const s = over(rack, a, px);
      const r = CR(rgb(C.chalk), s); n++;
      if (r < worst) { worst = r; wpx = s; }
      if (r < 3) under3++; if (r < 4.5) under45++;
    }
    console.log('pick.png ' + (tree === WEB ? 'web' : 'nat') + ' ' + p.width + 'x' + p.height + ' scrim ' + a + ': ink on worst pixel ' + hex(wpx) + ' ' + worst.toFixed(2) + ':1; pixels under 4.5: ' + under45 + '/' + n + ', under 3: ' + under3);
    // the madder bar over the tile's ground, and knockout on it
  }
}
console.log('accent bar on rack ' + CR(rgb(C.accent), rack).toFixed(2) + ', on bar ' + CR(rgb(C.accent), rgb(C.bar)).toFixed(2));
