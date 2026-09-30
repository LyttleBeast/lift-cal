#!/usr/bin/env node
/* r3-hunks — Pnat round-3 coverage reviewer's scratch tool.
 * Prints the engine's app/ and src/ hunks that are NOT a plain same-hex token
 * swap: each - / + pair is normalised (the §6.2 role names mapped back to the
 * build-58 token they split from, `...T.systemFace, ` dropped, comments
 * dropped) and a hunk whose pairs all match is hidden. What is left is every
 * structural change, for reading.
 *   node r3-hunks.mjs <engineTree> <outFile> [paths...]
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [ENG, OUT, ...paths] = process.argv.slice(2);
const diff = execFileSync('git', ['-C', ENG, 'diff', '-U2', '1cb6498..HEAD', '--', ...(paths.length ? paths : ['app', 'src', ':!src/pure/vibes', ':!src/ui/theme.js', ':!src/pure/coach-view.js', ':!src/pure/recap-view.js'])], { encoding: 'utf8', maxBuffer: 1 << 29 });
const MAP = [
  [/T\.colors\.accentPressed\b/g, 'T.colors.pYellowPressed'],
  [/T\.colors\.(accent|focus)\b/g, 'T.colors.pYellow'], [/T\.colors\.(well|knockout)\b/g, 'T.colors.rack'],
  [/T\.colors\.(raised|track)\b/g, 'T.colors.collar'], [/T\.colors\.(grip|faint)\b/g, 'T.colors.knurl'],
  [/T\.colors\.danger\b/g, 'T.colors.pRed'], [/T\.colors\.done\b/g, 'T.colors.pGreen'], [/T\.colors\.onDone\b/g, 'T.colors.onGreen'],
  [/T\.colors\.(onAccent|onWarn)\b/g, 'T.colors.onYellow'], [/T\.colors\.onDanger\b/g, 'T.colors.white'],
  [/T\.colors\.(inverse|calMark)\b/g, 'T.colors.chalk'],
  [/T\.alpha\.(accent|warn)\(/g, 'T.alpha.yellow('], [/T\.alpha\.danger\(/g, 'T.alpha.red('],
  [/T\.fit\.type\(/g, 'T.type('], [/T\.fit\.face\(/g, 'T.face('], [/T\.fit\.archivo\.type\(/g, 'T.type('], [/T\.fit\.archivo\.face\(/g, 'T.face('],
  [/\.\.\.T\.systemFace,\s*/g, ''], [/\{\s*\.\.\.T\.systemFace\s*\}/g, '{}']
];
const norm = s => { let t = s.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, ''); for (const [re, to] of MAP) t = t.replace(re, to); return t.replace(/\s+/g, ' ').trim(); };
const isComment = s => /^\s*(\/\/|\/\*|\*|\*\/)/.test(s) || /^\s*$/.test(s);
const out = [];
let file = null, hunk = null, shown = 0, hidden = 0;
const flush = () => {
  if (!hunk) return;
  const minus = hunk.lines.filter(l => l[0] === '-' && !isComment(l.slice(1))).map(l => norm(l.slice(1)));
  const plus = hunk.lines.filter(l => l[0] === '+' && !isComment(l.slice(1))).map(l => norm(l.slice(1)));
  const same = minus.join('\n') === plus.join('\n');
  if (same) hidden++; else { shown++; out.push('\n### ' + file + '  ' + hunk.head, ...hunk.lines); }
  hunk = null;
};
for (const line of diff.split('\n')) {
  if (line.startsWith('diff --git')) { flush(); file = line.split(' b/')[1]; continue; }
  if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('index ') || line.startsWith('new file')) continue;
  if (line.startsWith('@@')) { flush(); hunk = { head: line, lines: [] }; continue; }
  if (hunk) hunk.lines.push(line);
}
flush();
writeFileSync(OUT, 'shown ' + shown + ', hidden as same-hex swaps ' + hidden + '\n' + out.join('\n') + '\n');
console.log('shown ' + shown + ', hidden as same-hex swaps ' + hidden + ' -> ' + OUT);
