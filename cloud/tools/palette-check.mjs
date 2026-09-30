// Palette checker for Phase R track 6 (gym visual language).
// WCAG 2.2 contrast (w3.org/TR/WCAG22 relative luminance), CVD simulation with
// Machado, Oliveira & Fernandes (2009) severity-1.0 matrices applied in linear
// sRGB, and pairwise OKLab distance (Ottosson 2020, x100) under each vision.
// Usage: node palette-check.mjs   (palettes are defined below)
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const L = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const LfromLin = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const cr = (a, b) => { const x = L(hex(a)), y = L(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const clamp = v => Math.min(1, Math.max(0, v));
const sim = (h, k) => { const l = hex(h).map(lin); if (k === 'normal') return l;
  return M[k].map(r => clamp(r[0] * l[0] + r[1] * l[1] + r[2] * l[2])); };
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
const dE = (a, b) => { const p = oklab(a), q = oklab(b); return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const f2 = x => x.toFixed(2), f1 = x => x.toFixed(1);

// Quick mode: node palette-check.mjs try <ground> <ink> [ink...]
if (process.argv[2] === 'try') {
  const [g, ...inks] = process.argv.slice(3);
  for (const c of inks) {
    const out = ['normal', 'protan', 'deutan', 'tritan'].map(k => {
      const a = LfromLin(sim(c, k)), b = LfromLin(sim(g, k));
      return `${k} ${f2((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05))}`; });
    console.log(`${c} on ${g}: ${out.join(', ')}`);
  }
  if (inks.length === 2) console.log('pair dE:', ['normal', 'protan', 'deutan', 'tritan'].map(k => `${k} ${f1(dE(sim(inks[0], k), sim(inks[1], k)))}`).join(', '));
  process.exit(0);
}

function contrastTable(title, grounds, inks) {
  console.log(`\n## ${title}`);
  console.log('| ink | ' + Object.keys(grounds).map(g => `on ${g} ${grounds[g]}`).join(' | ') + ' |');
  console.log('|---|' + Object.keys(grounds).map(() => '---').join('|') + '|');
  for (const [n, c] of Object.entries(inks))
    console.log(`| ${n} ${c} | ` + Object.values(grounds).map(g => f2(cr(c, g))).join(' | ') + ' |');
}
function cvdPairs(title, cols, ground) {
  console.log(`\n## ${title}: pairwise OKLab dE x100 (and ground contrast), by vision`);
  const names = Object.keys(cols);
  const kinds = ['normal', 'protan', 'deutan', 'tritan'];
  console.log('| pair | ' + kinds.join(' | ') + ' |');
  console.log('|---|' + kinds.map(() => '---').join('|') + '|');
  const rows = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = cols[names[i]], b = cols[names[j]];
    const vals = kinds.map(k => dE(sim(a, k), sim(b, k)));
    rows.push([`${names[i]}/${names[j]}`, vals]);
  }
  rows.sort((x, y) => Math.min(...x[1]) - Math.min(...y[1]));
  for (const [p, v] of rows) console.log(`| ${p} | ` + v.map(f1).join(' | ') + ' |');
  if (ground) {
    console.log(`\nLuminance contrast against ground ${ground} under each vision (non-text needs 3:1):`);
    for (const n of names) {
      const out = kinds.map(k => { const a = LfromLin(sim(cols[n], k)), g = LfromLin(sim(ground, k));
        return f2((Math.max(a, g) + 0.05) / (Math.min(a, g) + 0.05)); });
      console.log(`- ${n} ${cols[n]}: ` + kinds.map((k, i) => `${k} ${out[i]}`).join(', '));
    }
  }
}

// ---------- v1 (for reference) ----------
const v1 = { rack: '#14161a', bar: '#1c1f26', chalk: '#f2f0eb', steel: '#8d939f', dim: '#5c6270',
  red: '#d6252b', blue: '#2e7fd9', yellow: '#f0be1e', green: '#2aa85c', white: '#e8e5de', chrome: '#a8aeb8' };
contrastTable('v1 text and plates on v1 grounds', { rack: v1.rack, bar: v1.bar },
  { chalk: v1.chalk, steel: v1.steel, dim: v1.dim, red: v1.red, blue: v1.blue, yellow: v1.yellow, green: v1.green, white: v1.white, chrome: v1.chrome });
cvdPairs('v1 plate colours', { red: v1.red, blue: v1.blue, yellow: v1.yellow, green: v1.green, white: v1.white, chrome: v1.chrome }, v1.bar);

// ---------- Meet Day (proposed) ----------
const md = {
  board: '#0b0b0b', cell: '#161616', band: '#202020', rule: '#2c2c2c',
  lamp: '#f5f0e3', ink2: '#a8a295', ink3: '#7f796d', amber: '#ffb000',
  red: '#e0262c', blue: '#2f88ea', yellow: '#f5c518', green: '#20b861', white: '#ece7da', chrome: '#a9afb8',
  noLamp: '#ff3b30', unlit: '#2a2a2a',
};
contrastTable('Meet Day text, accent and plates on its grounds',
  { board: md.board, cell: md.cell, band: md.band },
  { lamp: md.lamp, ink2: md.ink2, ink3: md.ink3, amber: md.amber, red: md.red, blue: md.blue, yellow: md.yellow,
    green: md.green, white: md.white, chrome: md.chrome, noLamp: md.noLamp, unlit: md.unlit, rule: md.rule });
cvdPairs('Meet Day plate colours', { red: md.red, blue: md.blue, yellow: md.yellow, green: md.green, white: md.white, chrome: md.chrome }, md.cell);
cvdPairs('Meet Day state colours (lit / no-lift red / amber current / unlit)', { lit: md.lamp, noLamp: md.noLamp, amber: md.amber, unlit: md.unlit }, md.cell);
cvdPairs('Up/down pair: v1 good/bad vs lamp white/red', { v1good: v1.green, v1bad: v1.red, lamp: md.lamp, noLamp: md.noLamp }, md.cell);

// ---------- Attempt card paper (sheets) ----------
const paper = { paper: '#efe7d3', paper2: '#e4d9bf', ink: '#171512', ink2: '#57503f', ink3: '#7a7160', rule: '#c7b995', stamp: '#b0171c',
  red: '#c21f25', blue: '#1f67c2', yellow: '#b88a00', green: '#157a42', amberInk: '#8a5a00' };
contrastTable('Attempt-card paper inks', { paper: paper.paper, paper2: paper.paper2 },
  { ink: paper.ink, ink2: paper.ink2, ink3: paper.ink3, rule: paper.rule, stamp: paper.stamp, red: paper.red, blue: paper.blue,
    yellow: paper.yellow, green: paper.green, amberInk: paper.amberInk });
