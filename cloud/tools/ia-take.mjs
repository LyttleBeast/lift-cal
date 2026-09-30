// Write files from another ref into a worktree, byte for byte.
// usage: node ia-take.mjs <repo> <ref> <worktree> <path>...
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
const [repo, ref, wt, ...paths] = process.argv.slice(2);
for (const p of paths) {
  const buf = execFileSync('git', ['-C', repo, 'show', ref + ':' + p], { maxBuffer: 1 << 26 });
  mkdirSync(dirname(join(wt, p)), { recursive: true });
  writeFileSync(join(wt, p), buf);
  console.log('wrote', p, buf.length);
}
