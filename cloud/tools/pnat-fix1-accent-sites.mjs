// List the native sites whose build-58 pYellow became accent on vibes/engine
// (paired -/+ lines in a -U0 diff), with the file and new line number.
import { execFileSync } from 'node:child_process';
const T = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const d = execFileSync('git', ['-C', T, 'diff', '-U0', '1cb6498..HEAD', '--', 'app', 'src'], { encoding: 'utf8', maxBuffer: 1 << 28 });
let file = null, newLine = 0;
const minus = [], out = [];
for (const l of d.split('\n')) {
  if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
  const m = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
  if (m) { newLine = +m[1]; minus.length = 0; continue; }
  if (l.startsWith('-') && !l.startsWith('---')) { minus.push(l); continue; }
  if (l.startsWith('+') && !l.startsWith('+++')) {
    const was = minus.shift();
    if (was && /pYellow|alpha\.yellow/.test(was) && /accent/.test(l)) out.push(file + ':' + newLine + '  ' + l.slice(1).trim().slice(0, 140));
    newLine++;
  }
}
console.log(out.length + ' sites');
console.log(out.join('\n'));
