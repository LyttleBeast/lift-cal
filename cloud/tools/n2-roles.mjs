// N2: list every role swap the engine branch made at a call site, from the
// diff 70b172f..HEAD (the contract commit to now), file:line old -> new.
import { execFileSync } from 'node:child_process';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const BASE = process.argv[2] || '1cb6498';
const diff = execFileSync('git', ['-C', TREE, 'diff', '-U0', BASE, 'HEAD', '--', 'app', 'src/ui', 'src/state', ':!src/ui/theme.js'], { encoding: 'utf8', maxBuffer: 64e6 });
const TOK = /T\.(colors|alpha|tint)\.(\w+)/g;
let file = null, line = 0, minus = [];
const out = {};
const add = (k, v) => { (out[k] = out[k] || []).push(v); };
for (const l of diff.split('\n')) {
  if (l.startsWith('+++ b/')) { file = l.slice(6); continue; }
  const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
  if (h) { line = +h[1]; minus = []; continue; }
  if (l.startsWith('-') && !l.startsWith('---')) { minus.push(l); continue; }
  if (l.startsWith('+') && !l.startsWith('+++')) {
    const olds = minus.length ? [...minus.shift().matchAll(TOK)].map(m => m[1] + '.' + m[2]) : [];
    const news = [...l.matchAll(TOK)].map(m => m[1] + '.' + m[2]);
    for (let i = 0; i < Math.max(olds.length, news.length); i++) {
      if (olds[i] && news[i] && olds[i] !== news[i]) add(olds[i] + ' -> ' + news[i], file + ':' + line);
    }
    line++;
  }
}
for (const k of Object.keys(out).sort()) console.log(k + '  (' + out[k].length + ')\n    ' + out[k].join('\n    '));
