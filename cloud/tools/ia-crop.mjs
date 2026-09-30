// ia-crop.mjs <png> <outDir> [segH=2400] — cut a tall full-page PNG into
// segments with sips (crop only), named <base>-<i>.png.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
const [png, out, segArg] = process.argv.slice(2);
const seg = +(segArg || 2400);
mkdirSync(out, { recursive: true });
const info = execFileSync('sips', ['-g', 'pixelHeight', '-g', 'pixelWidth', png]).toString();
const H = +/pixelHeight: (\d+)/.exec(info)[1], W = +/pixelWidth: (\d+)/.exec(info)[1];
const base = basename(png, '.png');
for (let i = 0, y = 0; y < H; i++, y += seg) {
  const h = Math.min(seg, H - y);
  const o = join(out, base + '-' + i + '.png');
  execFileSync('sips', ['-c', String(h), String(W), '--cropOffset', String(y), '0', png, '--out', o], { stdio: 'ignore' });
  console.log(o, y, h);
}
