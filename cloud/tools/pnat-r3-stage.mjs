// Copies the engine's verify-vibe-v1 and its two libs into the round-3 scratch
// dir, so a sentinel hook can be added to the copy (the engine is not edited).
import { copyFileSync, mkdirSync } from 'node:fs';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/nat-engine/tools';
const OUT = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent/tools';
mkdirSync(OUT + '/lib', { recursive: true });
for (const f of ['verify-vibe-v1.mjs', 'lib/vibe-snap.mjs', 'lib/vibe-seed.mjs']) copyFileSync(ENG + '/' + f, OUT + '/' + f);
console.log('staged');
