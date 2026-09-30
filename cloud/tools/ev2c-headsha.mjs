// ev2c-headsha.mjs <repo> <rev> <prefix> — sha256 of the four contract
// modules at a revision (read-only git show). Scratch helper.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [repo, rev, prefix] = process.argv.slice(2);
for (const f of ['defs/v1.js', 'defs/index.js', 'icons/v1.js', 'defs/vocab.js']) {
  const b = execFileSync('git', ['-C', repo, 'show', `${rev}:${prefix}${f}`], { maxBuffer: 1 << 26 });
  console.log(f.padEnd(14), createHash('sha256').update(b).digest('hex'));
}
