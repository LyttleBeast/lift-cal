// hx-stress: run prove.mjs (base vs base) N times on a small scene set and count
// pixel-different scene×widths — the determinism experiment for V59 §7.1.
//   node hx-stress.mjs <n> <label> [groups=drop] [widths=390] [chromeFlags=''] [extra prove args, space-separated]
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [nArg, label, groups = 'drop', widths = '390', cflags = '', ...extra] = process.argv.slice(2);
const N = +(nArg || 8);
const PROVE = '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/prove.mjs';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base';
const ROOT = '/Users/micahflunker/dev/vibes-night/tmp/hx-stress-out';
mkdirSync(ROOT, { recursive: true });
let bad = 0, total = 0, px = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const run = 'hxs-' + label + '-' + i;
  const args = [PROVE, '--a', BASE, '--b', BASE, '--run', run, '--out-root', ROOT, '--groups', groups, '--widths', widths, ...(cflags ? ['--chrome-flags', cflags] : []), ...extra];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  let s;
  try { s = JSON.parse(readFileSync(join(ROOT, run, 'summary.json'), 'utf8')); } catch { console.log(i, 'no summary; exit', r.status, (r.stdout + r.stderr).slice(-400)); continue; }
  const diffs = Object.values(s.scenes).filter(x => !x.errors.length && !x.pixelsEqual);
  total += Object.keys(s.scenes).length; bad += diffs.length; px += diffs.reduce((n, x) => n + x.diffPixels, 0);
  console.log(i, s.verdict, 'pixel-different', diffs.map(x => x.scene + '@' + x.width + ':' + x.diffPixels + 'px').join(' ') || '-', 'style', s.totals.styleDiffs, 'extraShots', s.totals.extraShots, 'errors', s.totals.errors, 'pixelOnlyAtFirst', s.totals.pixelOnlyAtFirst, 'resolvedByReboot', s.totals.resolvedByReboot, 'reproduced', s.totals.reproducedPixelOnly);
}
console.log('STRESS', label, 'runs', N, 'scene×widths', total, 'pixel-different', bad, 'pixels', px, Math.round((Date.now() - t0) / 1000) + 's');
