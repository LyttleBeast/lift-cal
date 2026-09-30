// iav-peek.mjs <original (relative to research/iron-age/ or absolute)> x y w h <out.png> [maxEdge]
// Crop a region of an original page with sips and scale it for looking at. Read-only on the original.
import { execFileSync } from 'node:child_process';
const [f, x, y, w, h, out, max = '900'] = process.argv.slice(2);
const inF = f.startsWith('/') ? f : '/Users/micahflunker/dev/vibes-night/research/iron-age/' + f;
execFileSync('sips', ['-s', 'format', 'png', '-c', h, w, '--cropOffset', y, x, inF, '--out', out], { stdio: 'ignore' });
execFileSync('sips', ['-Z', max, out], { stdio: 'ignore' });
console.log('wrote', out);
