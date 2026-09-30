// ev3m: every distinct PNG a scene produced, per run and side, over a set of runs.
//   node ev3m-states.mjs <width> <scene> <run>[,<run>…]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [w, scene, runs] = process.argv.slice(2);
const root = '/Users/micahflunker/dev/vibes-night/proof';
const states = new Map();
for (const run of runs.split(',')) for (const side of ['A', 'B']) {
  const d = `${root}/${run}/${side}/${w}`;
  if (!existsSync(d)) continue;
  let repo = '?'; try { const o = JSON.parse(readFileSync(`${root}/${run}/summary.json`, 'utf8')); repo = o[side].repo.split('/').pop() + '@' + o[side].sha.slice(0, 7); } catch {}
  for (const f of readdirSync(d)) if (f.endsWith('.png') && (f === scene + '.png' || f.startsWith(scene + '.'))) {
    const s = createHash('sha256').update(readFileSync(`${d}/${f}`)).digest('hex').slice(0, 16);
    if (!states.has(s)) states.set(s, []);
    states.get(s).push(`${run}/${side}/${f} [${repo}]`);
  }
}
for (const [s, where] of states) console.log(s, where.length, where.join('  '));
