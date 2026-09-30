// Read-only judge helper (iron-age slot, judge 2): recompute the concepts' key numbers
// with track 4's colour library. Prints to stdout only.
import { contrast, dE, simulate, over, MACHADO } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';

const kinds = ['normal', ...Object.keys(MACHADO).filter(k => /deut|prot/.test(k))];
const f = x => x.toFixed(2);

function groupsReport(name, g) {
  const keys = Object.keys(g);
  for (const k of kinds) {
    let worst = [1e9, ''];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const d = dE(simulate(g[keys[i]], k), simulate(g[keys[j]], k));
      if (d < worst[0]) worst = [d, keys[i] + '/' + keys[j]];
    }
    console.log(`  ${name} ${k.padEnd(14)} worst ${f(worst[0])} ${worst[1]}`);
  }
}
function nearest(name, hex, g) {
  for (const k of kinds) {
    let best = [1e9, ''];
    for (const [n, h] of Object.entries(g)) { const d = dE(simulate(hex, k), simulate(h, k)); if (d < best[0]) best = [d, n]; }
    console.log(`  ${name} accent nearest ${k.padEnd(14)} ${f(best[0])} ${best[1]}`);
  }
}
function pairs(label, fgs, bgs) {
  for (const [fn, fh] of Object.entries(fgs)) {
    console.log('  ' + label + ' ' + fn.padEnd(9) + Object.entries(bgs).map(([bn, bh]) => `${bn} ${f(contrast(fh, bh))}`).join('  '));
  }
}

console.log('MACHADO kinds:', Object.keys(MACHADO).join(', '));

// ---- A
const A = { chest: '#82180c', back: '#1f4a72', legs: '#8b6600', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' };
console.log('\nA (manual page)');
groupsReport('A', A);
nearest('A', '#a1374f', { ...A, good: '#0e5f40', warn: '#6e4d08', bad: '#82180c' });
pairs('A', { accent: '#a1374f', dim: '#5f5343', pYellow: '#8b6600', pChrome: '#6a6d6c', good: '#0e5f40', warn: '#6e4d08' },
  { rack: '#e6dec9', bar: '#ebe4ce', raised: '#d2cab7', grainDk: '#e0d8c4', setDone: over('#0e5f40', 0.07, '#e6dec9') });
console.log('  A kpi pill good text on good.10/bar', f(contrast('#0e5f40', over('#0e5f40', 0.10, '#ebe4ce'))), ' bad', f(contrast('#82180c', over('#82180c', 0.10, '#ebe4ce'))));
console.log('  A knockout on inverse', f(contrast('#ebe4ce', '#1c1712')), ' onPlate on pYellow', f(contrast('#f6efdd', '#8b6600')), ' on pChrome', f(contrast('#f6efdd', '#6a6d6c')));

// ---- B
const B = { chest: '#772020', back: '#2b6189', legs: '#785c00', shoulders: '#016d50', arms: '#181412', core: '#3a4450' };
console.log('\nB (measurement form)');
groupsReport('B', B);
nearest('B', '#a1374f', { ...B, good: '#016d50', warn: '#6e4d08', bad: '#772020' });
pairs('B', { accent: '#a1374f', dim: '#5a554d', pYellow: '#785c00', pBlue: '#2b6189', good: '#016d50', warn: '#6e4d08', pChrome: '#3a4450' },
  { rack: '#e6dec9', bar: '#ebe4ce', well: '#e8ddd1', raised: '#dad4bf', grainDk: '#e3dcc7', setDone: over('#fffcf2', 0.5, '#e6dec9') });
console.log('  B arms vs chalk dE', f(dE('#181412', '#1c1712')), ' done row strip vs rack', f(contrast(over('#fffcf2', 0.5, '#e6dec9'), '#e6dec9')));
console.log('  B good vs bad deut/prot', kinds.map(k => k + ' ' + f(dE(simulate('#016d50', k), simulate('#772020', k)))).join('  '));

// ---- C
const C = { chest: '#82180c', back: '#1f4a72', legs: '#90620b', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' };
console.log('\nC (apparatus catalogue)');
groupsReport('C', C);
nearest('C', '#a1374f', { ...C, good: '#0e5f40', warn: '#6e4d08', bad: '#82180c' });
pairs('C', { accent: '#a1374f', dim: '#5f5343', steel: '#4a3f31', pYellow: '#90620b', pChrome: '#6a6d6c', knurl: '#84775f', grip: '#7a6d56' },
  { rack: '#e6dec9', bar: '#ebe4ce', well: '#e0d7c0', raised: '#dbd1b8', grainDk: '#e4dcc7', setDone: over('#0e5f40', 0.10, '#e6dec9') });
console.log('  C knockout(#e6dec9) on ink', f(contrast('#e6dec9', '#1c1712')));

// ---- shared: distance of the three stocks from AI creams and v1
const creams = ['#F4F1EA', '#F7F1E4', '#F5F1E8', '#FAF8F5', '#F0EBE0'];
console.log('\nstock #e6dec9 vs AI creams', creams.map(c => f(dE('#e6dec9', c))).join(' '), ' vs v1 rack', f(dE('#e6dec9', '#14161a')));
console.log('accent vs Claude clay', f(dE('#a1374f', '#d97757')), ' vs Chalk mulberry', f(dE('#a1374f', '#6c3058')));
