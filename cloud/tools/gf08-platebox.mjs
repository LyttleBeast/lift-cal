// gf08-platebox.mjs — measure a halftone plate's box on a cream book page (study only).
// Converts the page to a 1000 px PNG with sips, then finds the rows/columns where most pixels are
// neutral grey (|R-B| small) rather than cream paper (R well above B). Prints fractions of the page.
// Usage: node gf08-platebox.mjs <file> [minFrac=0.5] [neutralTol=14]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [f, minF = '0.5', tolA = '14'] = process.argv.slice(2);
const tmp = '/Users/micahflunker/dev/vibes-night/research/scratch-gf08/pb-tmp.png';
execFileSync('sips', ['-Z', '1000', '-s', 'format', 'png', f, '--out', tmp], { stdio: 'ignore' });
const im = PNG.sync.read(readFileSync(tmp));
const { width: W, height: H, data } = im;
const tol = Number(tolA), mf = Number(minF);
const neutral = (x, y) => { const i = (y * W + x) * 4; const r = data[i], b = data[i + 2]; return (r - b) < tol; };
const colF = [], rowF = [];
for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < H; y++) n += neutral(x, y); colF.push(n / H); }
for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) n += neutral(x, y); rowF.push(n / W); }
const span = (arr, thr) => { let a = arr.findIndex(v => v >= thr), b = arr.length - 1 - [...arr].reverse().findIndex(v => v >= thr); return [a, b]; };
// columns are judged against the plate's height share, rows against its width share
const [x0, x1] = span(colF, mf * 0.6), [y0, y1] = span(rowF, mf);
const r = v => Math.round(v * 1000) / 1000;
console.log(f.split('/').pop(), `${W}x${H}`, 'plate x', r(x0 / W), r((x1 + 1) / W), 'y', r(y0 / H), r((y1 + 1) / H));
