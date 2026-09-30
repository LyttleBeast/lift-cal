// Pnat round-2 theme lens: a STATIC check the snapshot cannot make — every
// hunk of `git diff 1cb6498 HEAD -- app src`, its removed and added lines'
// colour references resolved to v1's value (base tokens through build 58's
// theme, engine tokens through the engine's v1 T), compared as multisets. A
// hunk whose colours differ in v1 is printed, so a branch no scene draws is
// still read. Writes only under tmp.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/grid/';
const TB = (await import(pathToFileURL(TMP + 'base-theme.mjs').href)).default;
const TE = (await import(pathToFileURL(TMP + 'engine-theme.mjs').href)).default;
const ENG = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const diff = execFileSync('git', ['-C', ENG, 'diff', '-U0', '1cb6498', 'HEAD', '--', 'app', 'src',
  ':!src/ui/theme.js', ':!src/pure/vibes'], { encoding: 'utf8', maxBuffer: 64 << 20 });

// base-only tables, as build 58 held them
const SUBJ58 = { fuel: TB.colors.pYellow, weight: TB.colors.pYellow, train: TB.colors.pBlue, steps: TB.colors.pWhite,
  water: TB.colors.pBlue, all: TB.colors.chalk };
const C58 = { C_FUEL: TB.colors.pYellow, C_WEIGHT: TB.colors.pYellow, C_STEPS: TB.colors.pWhite, C_WATER: TB.colors.pBlue,
  C_TRAIN: TB.colors.pBlue, C_PROT: TB.colors.pRed, C_CARB: TB.colors.pYellow, C_FAT: TB.colors.pBlue };
const norm = v => (typeof v === 'string' ? v.toLowerCase().replace(/\s+/g, '') : String(v));

function resolve(line, T, side) {
  const out = [];
  const push = (v, tag) => out.push(norm(v) + '  <' + tag + '>');
  let m;
  const re = /T\.colors\.(\w+)|T\.alpha\.(\w+)\(([^)]*)\)|T\.tint\.(\w+)|T\.subject\('(\w+)'\)|T\.kpi\('(\w+)'\)|T\.signIn\.(\w+)|T\.banner\.(\w+)|T\.chrome\.(\w+)|(C_[A-Z]+)\b|SUBJECT_COLOR\.(\w+)|'(#[0-9a-fA-F]{3,8})'|'(rgba?\([^']*\))'|"(#[0-9a-fA-F]{3,8})"|keyboardAppearance="(\w+)"|tint="(\w+)"|themeVariant="(\w+)"|style="(\w+)"|intensity=\{(\d+)\}|shadowColor: '([^']*)'/g;
  while ((m = re.exec(line))) {
    if (m[1]) push(T.colors[m[1]], 'colors.' + m[1]);
    else if (m[2]) { const a = Number(m[3]); push(Number.isFinite(a) && T.alpha[m[2]] ? T.alpha[m[2]](a) : 'alpha.' + m[2] + '(' + m[3] + ')', 'alpha.' + m[2]); }
    else if (m[4]) push(T.tint[m[4]], 'tint.' + m[4]);
    else if (m[5]) push(side === 'engine' ? TE.subject(m[5]) : SUBJ58[m[5]], 'subject.' + m[5]);
    else if (m[6]) push(side === 'engine' ? TE.kpi(m[6]) : '?kpi', 'kpi.' + m[6]);
    else if (m[7]) push(TE.signIn[m[7]], 'signIn.' + m[7]);
    else if (m[8]) push(TE.banner[m[8]], 'banner.' + m[8]);
    else if (m[9]) push(TE.chrome[m[9]], 'chrome.' + m[9]);
    else if (m[10]) push(side === 'base' ? C58[m[10]] : '?' + m[10], m[10]);
    else if (m[11]) push(SUBJ58[m[11]], 'SUBJECT_COLOR.' + m[11]);
    else if (m[12] || m[14]) push(m[12] || m[14], 'literal');
    else if (m[13]) push(m[13], 'literal');
    else if (m[15]) push(m[15], 'keyboardAppearance');
    else if (m[16]) push(m[16], 'tint=');
    else if (m[17]) push(m[17], 'themeVariant=');
    else if (m[18]) push(m[18], 'style=');
    else if (m[19]) push(m[19], 'intensity');
    else if (m[20]) push(m[20], 'shadowColor');
  }
  return out;
}

const hunks = [];
let file = null, cur = null;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (line.startsWith('--- ')) continue;
  if (line.startsWith('@@')) { cur = { file, at: line, minus: [], plus: [] }; hunks.push(cur); continue; }
  if (!cur) continue;
  if (line.startsWith('-')) cur.minus.push(line.slice(1));
  else if (line.startsWith('+')) cur.plus.push(line.slice(1));
}
const report = [];
let checked = 0;
for (const h of hunks) {
  const a = h.minus.flatMap(l => resolve(l, TB, 'base')), b = h.plus.flatMap(l => resolve(l, TE, 'engine'));
  if (!a.length && !b.length) continue;
  checked++;
  const va = a.map(x => x.split('  <')[0]).sort(), vb = b.map(x => x.split('  <')[0]).sort();
  if (JSON.stringify(va) === JSON.stringify(vb)) continue;
  report.push('=== ' + h.file + ' ' + h.at + '\n  - ' + a.join(' | ') + '\n  + ' + b.join(' | ') +
    '\n' + h.minus.map(l => '    -' + l.trim()).join('\n') + '\n' + h.plus.map(l => '    +' + l.trim()).join('\n'));
}
writeFileSync('/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/tokdiff.txt', report.join('\n') + '\n');
console.log('hunks', hunks.length, 'with colour refs', checked, 'whose v1 colours differ as multisets', report.length);
