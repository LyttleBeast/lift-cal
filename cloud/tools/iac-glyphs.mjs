// Concept C: glyphs a hero figure or a Coach line may carry, in the faces that would set them.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js');
const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const F = {
  'Besley-ExtraBold': load('/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley-ExtraBold.ttf'),
  'BesleyCondensed-Black': load('/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/BesleyCondensed-Black.ttf'),
  'OldStandard-Regular': load('/Users/micahflunker/dev/vibes-night/research/fonts/oldstandardtt/OldStandard-Regular.ttf')
};
const set = '≈±÷×−–—%°·•…’“”‹›→←↑↓+=<>/#&@';
for (const [k, f] of Object.entries(F)) {
  const miss = [...set].filter(ch => !f.charToGlyph(ch).index);
  console.log(`${k}: missing ${miss.length ? miss.join(' ') : 'none'} (of ${set})`);
}
