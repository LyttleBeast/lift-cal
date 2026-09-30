// ev3m: the pins in native tools/verify-vibes-verbatim.mjs against the actual
// sha256 of every pure vibes file in both trees; the pinned pure modules
// against main; the fenced files against main.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev3';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-ev3';
const sha = b => createHash('sha256').update(b).digest('hex');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name).map(p => e.name + '/' + p) : [e.name]);
const vw = walk(W + '/vibes').filter(p => p.startsWith('defs/') || p.startsWith('icons/'));
const vn = walk(N + '/src/pure/vibes');
console.log('web vibes pure files', vw.length, 'native', vn.length);
let bad = 0;
for (const p of new Set([...vw, ...vn])) {
  const a = existsSync(W + '/vibes/' + p) ? sha(readFileSync(W + '/vibes/' + p)) : null;
  const b = existsSync(N + '/src/pure/vibes/' + p) ? sha(readFileSync(N + '/src/pure/vibes/' + p)) : null;
  if (a !== b) bad++;
  console.log(a === b ? 'SAME' : 'DIFF', p, a, b);
}
const src = readFileSync(N + '/tools/verify-vibes-verbatim.mjs', 'utf8');
const pinBlock = src.slice(src.indexOf('const PINNED'), src.indexOf('};', src.indexOf('const PINNED')));
for (const m of pinBlock.matchAll(/'([^']+)':\s*'([0-9a-f]{64})'/g)) {
  const actual = sha(readFileSync(N + '/src/pure/vibes/' + m[1]));
  if (actual !== m[2]) bad++;
  console.log(actual === m[2] ? 'PIN-OK ' : 'PIN-BAD', m[1], m[2], actual);
}
const git = (t, ...a) => execFileSync('git', ['-C', t, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const PINNED_PURE = ['exercises.js', 'analytics.js', 'tdee.js', 'units.js', 'accounts.js', 'insights.js', 'estimate-origin.js', 'estimate-ask.js', 'coach.js', 'coach-build.js', 'coach-live.js', 'coach-prog.js', 'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach-tags.js'];
const wd = git(W, 'diff', '--name-only', '10fe73b', 'HEAD').split('\n').filter(Boolean);
const nd = git(N, 'diff', '--name-only', 'main', 'HEAD').split('\n').filter(Boolean);
console.log('web changed vs 10fe73b:', wd.length);
console.log('nat changed vs main:', nd.length, 'main=', git(N, 'rev-parse', '--short', 'main').trim());
const fence = f => PINNED_PURE.includes(f.split('/').pop()) || /database\.rules/.test(f) || /^package(-lock)?\.json$/.test(f) || f === 'app.json' || f.startsWith('ios/') || f.includes('node_modules');
for (const f of [...wd.map(f => 'web ' + f), ...nd.map(f => 'nat ' + f)]) if (fence(f.slice(4))) { bad++; console.log('FENCE', f); }
console.log('web diff files:', wd.join(' '));
console.log('nat diff files:', nd.join(' '));
console.log(bad ? 'BAD ' + bad : 'ALL OK');
