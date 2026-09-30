// Print every native glyph site (icons/v1.js glyphs.native) with its line at
// the base commit, and each current line in the worktree holding that char.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const WT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-ev2';
const IC = (await import(pathToFileURL(join(WT, 'src/pure/vibes/icons/v1.js')).href)).default;
const base = new Map();
const show = f => { if (!base.has(f)) base.set(f, execFileSync('git', ['-C', WT, 'show', '1cb6498:' + f], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n')); return base.get(f); };
for (const [name, g] of Object.entries(IC.glyphs)) {
  for (const s of g.native) {
    const [f, l] = [s.slice(0, s.lastIndexOf(':')), +s.slice(s.lastIndexOf(':') + 1)];
    const bl = show(f)[l - 1];
    const cur = readFileSync(join(WT, f), 'utf8').split('\n');
    const hits = cur.map((x, i) => [i + 1, x]).filter(([, x]) => x.includes(g.char) && x.trim() === bl.trim());
    console.log(name.padEnd(8), g.char, s.padEnd(45), '| now', hits.map(h => h[0]).join(',') || '?', '|', bl.trim().slice(0, 150));
  }
}
