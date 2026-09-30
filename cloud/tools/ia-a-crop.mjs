// Concept A (iron-age): crop a PNG band (y0..y1) with pngjs, for viewing only.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');
const [src, out, y0s, y1s] = process.argv.slice(2);
const img = PNG.sync.read(fs.readFileSync(src));
const y0 = Number(y0s), y1 = Math.min(Number(y1s), img.height);
const o = new PNG({ width: img.width, height: y1 - y0 });
img.data.copy(o.data, 0, y0 * img.width * 4, y1 * img.width * 4);
fs.writeFileSync(out, PNG.sync.write(o));
console.log('wrote', out, img.width, 'x', y1 - y0);
