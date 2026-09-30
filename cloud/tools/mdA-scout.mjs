// Meet Day concept A: scout panel / band / track steps on the board, and the
// text inks on each. Read-only arithmetic (tools/colour/colour-lib.mjs).
import { contrast, dE, lab } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';
const rack = '#07080a';
const inks = { chalk: '#f5f0e3', steel: '#a8a295', dim: '#9097a3', knurl: '#666c77' };
const cands = process.argv.slice(2).length ? process.argv.slice(2) : ['#111317', '#131519', '#15171b', '#16181d', '#181a1f', '#1a1c22', '#1d2026', '#202329', '#23262d', '#26292f', '#2a2d33'];
for (const c of cands) {
  const row = [c, 'vs rack ' + contrast(c, rack).toFixed(3), 'dE ' + dE(c, rack).toFixed(1), 'L* ' + lab(c)[0].toFixed(1)];
  for (const [k, v] of Object.entries(inks)) row.push(k + ' ' + contrast(v, c).toFixed(2));
  console.log(row.join('  '));
}
