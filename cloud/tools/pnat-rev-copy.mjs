// Copy the proof's verify-vibe-v1 and its two libs into a scratch dir, so a
// patched copy can render the engine tree under a sentinel vibe. Read-only on
// the worktrees; writes only under ~/dev/vibes-night/tmp.
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const SRC = '/Users/micahflunker/dev/vibes-night/wt/nat-proof';
const DST = '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/sentinel';
mkdirSync(join(DST, 'tools/lib'), { recursive: true });
for (const f of ['tools/verify-vibe-v1.mjs', 'tools/lib/vibe-snap.mjs', 'tools/lib/vibe-seed.mjs']) {
  copyFileSync(join(SRC, f), join(DST, f));
  console.log('copied', f);
}
