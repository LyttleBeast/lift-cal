// ev2c-copy.mjs <web-wt> <nat-wt> — copy the four contract modules from the
// web worktree to the native one byte for byte, and print each sha256 (the
// pins verify-vibes-verbatim holds). Scratch helper for the engine-v2 job.
import { copyFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const [WEB, NAT] = process.argv.slice(2);
for (const f of ['defs/v1.js', 'defs/index.js', 'icons/v1.js', 'defs/vocab.js']) {
  copyFileSync(join(WEB, 'vibes', f), join(NAT, 'src/pure/vibes', f));
  const a = readFileSync(join(WEB, 'vibes', f)), b = readFileSync(join(NAT, 'src/pure/vibes', f));
  console.log(f.padEnd(14), createHash('sha256').update(b).digest('hex'), a.equals(b) ? 'identical' : 'DIFFERS', b.length + ' bytes');
}
