import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-cv2/';
const voc = (await import(pathToFileURL(W + 'vibes/defs/vocab.js'))).default;
for (const [b, def] of Object.entries(voc.blocks)) {
  console.log('==', b, '| switches:', JSON.stringify(def.switches), '| add:', JSON.stringify(def.add || null).slice(0, 400));
}
