#!/usr/bin/env node
/* rt1-group-proto — Pnat adversarial review, runtime lens, round 1.
 *
 * build 58 paints a group's bar with analytics.js groupColor(g), which is
 * `PALETTE[g] || '#8d939f'` over a plain object; the engine paints it with
 * T.group(g), which is `own(G, g) && G[g] || G.fallback`. Each is loaded from
 * its own tree — build 58's analytics.js under the proof's vibe-snap stand-ins
 * (it imports store.js), the engine's theme.js through the engine's own
 * rn-render — in a child process each, and asked for every name a stored
 * exercise group could hold, including the ones a plain object inherits from
 * Object.prototype.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const SELF = fileURLToPath(import.meta.url);
const BASE = '/Users/micahflunker/dev/vibes-night/wt/nat-base';
const ENGINE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const NAMES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fallback', 'cardio', '', null,
               'constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'toLocaleString'];
const show = v => (typeof v === 'function' ? '[function ' + (v.name || 'anon') + ']' : v && typeof v === 'object' ? '[object ' + (v.constructor ? v.constructor.name : 'null-proto') + ']' : v);
const mode = process.argv[2];
if (mode === 'base') {
  const { open } = await import('/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/lib/vibe-snap.mjs');
  const H = await open(BASE);
  const A58 = H.R.load('src/pure/analytics.js');
  process.stdout.write('@@' + JSON.stringify(NAMES.map(g => show(A58.groupColor(g)))) + '\n');
  process.exit(0);
}
if (mode === 'engine') {
  const R = await import(pathToFileURL(ENGINE + '/tools/lib/rn-render.mjs').href);
  const T = R.load('src/ui/theme.js').default;
  process.stdout.write('@@' + JSON.stringify(NAMES.map(g => show(T.group(g)))) + '\n');
  process.exit(0);
}
const run = m => {
  const r = spawnSync(process.execPath, [SELF, m], { encoding: 'utf8', env: { ...process.env, TZ: 'America/New_York' } });
  const line = String(r.stdout || '').split('\n').find(l => l.startsWith('@@'));
  if (!line) { console.log(m + ' failed: ' + String(r.stderr || '').slice(0, 800)); process.exit(1); }
  return JSON.parse(line.slice(2));
};
const b = run('base'), e = run('engine');
let same = 0, diff = 0;
NAMES.forEach((g, i) => {
  const ok = b[i] === e[i];
  ok ? same++ : diff++;
  console.log((ok ? '  same  ' : '  DIFF  ') + JSON.stringify(g) + ': build 58 groupColor -> ' + JSON.stringify(b[i]) + '   engine T.group -> ' + JSON.stringify(e[i]));
});
console.log(same + ' same, ' + diff + ' differ');
