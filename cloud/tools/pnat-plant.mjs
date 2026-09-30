// pnat-plant.mjs — a scratch copy of a tree's app/ and src/, with one violation planted.
// The worktree is never touched: the copy lives under ~/dev/vibes-night/tmp/.
//
//   node pnat-plant.mjs <fromTree> <scratchDir> [<rel file> <exact old> <exact new>]
// With no plant arguments it makes a clean control copy.
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const [from, dest, rel, oldS, newS] = process.argv.slice(2);
const NIGHT_TMP = '/Users/micahflunker/dev/vibes-night/tmp/';
const d = resolve(dest);
if (!d.startsWith(NIGHT_TMP)) { console.error('refused: scratch must live under ' + NIGHT_TMP); process.exit(2); }
if (existsSync(d)) rmSync(d, { recursive: true });
for (const sub of ['app', 'src']) cpSync(join(from, sub), join(d, sub), { recursive: true });
if (rel) {
  const f = join(d, rel);
  const src = readFileSync(f, 'utf8');
  const n = src.split(oldS).length - 1;
  if (n !== 1) { console.error(`refused: "${oldS}" occurs ${n} times in ${rel}, not once`); process.exit(2); }
  const out = src.replace(oldS, newS);
  writeFileSync(f, out);
  const line = src.slice(0, src.indexOf(oldS)).split('\n').length;
  console.log(`planted in ${rel}:${line}`);
  console.log(`  - ${oldS}`);
  console.log(`  + ${newS}`);
  const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 12);
  console.log(`  engine ${sha(readFileSync(join(from, rel)))} -> scratch ${sha(out)}`);
} else console.log('clean copy of app/ and src/ at ' + d);
