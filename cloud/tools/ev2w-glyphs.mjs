// ev2w-glyphs.mjs — list every web glyph site (vibes/icons/v1.js glyphs.*.web,
// file:line at 928a65e) with the line at base and where that line sits now in
// the worktree (first exact match, else the nearest line holding the char).
// Usage: node ev2w-glyphs.mjs <webTree>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const T = process.argv[2];
const IC = (await import(pathToFileURL(join(T, 'vibes/icons/v1.js')).href)).default;
const base = new Map(), cur = new Map();
const B = f => { if (!base.has(f)) base.set(f, execFileSync('git', ['-C', T, 'show', '928a65e:' + f], { encoding: 'utf8' }).split('\n')); return base.get(f); };
const C = f => { if (!cur.has(f)) cur.set(f, readFileSync(join(T, f), 'utf8').split('\n')); return cur.get(f); };
for (const [name, g] of Object.entries(IC.glyphs)) {
  for (const s of g.web) {
    const [f, l] = s.split(':');
    const bl = B(f)[+l - 1];
    const cl = C(f);
    let at = cl.findIndex(x => x === bl);
    const near = at < 0 ? cl.map((x, i) => [i, x]).filter(([, x]) => x.includes(g.char)).map(([i]) => i + 1) : [];
    console.log(`${name} ${JSON.stringify(g.char)} ${s} -> now ${at >= 0 ? f + ':' + (at + 1) : 'MOVED near ' + near.join(',')}\n    ${bl.trim().slice(0, 220)}`);
  }
}
