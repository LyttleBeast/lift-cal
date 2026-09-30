// Iron Age A: repeat a texture tile n x n into one PNG, to judge the mottle and the repeat by eye.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [src, out, nS] = process.argv.slice(2); const N = Number(nS || 4);
const t = PNG.sync.read(fs.readFileSync(src));
const o = new PNG({ width: t.width * N, height: t.height * N });
for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) {
  const si = ((y % t.height) * t.width + (x % t.width)) * 4, di = (y * o.width + x) * 4;
  o.data[di] = t.data[si]; o.data[di + 1] = t.data[si + 1]; o.data[di + 2] = t.data[si + 2]; o.data[di + 3] = 255;
}
fs.writeFileSync(out, PNG.sync.write(o)); console.log('wrote', out, o.width, o.height);
