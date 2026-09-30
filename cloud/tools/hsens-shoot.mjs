// Shoot one scene of web-base and of web-hmut with a plant applied (prove.mjs
// shoot, full page and viewport), restore web-hmut, and diff the PNGs. For the
// question: does the screenshot see what the dump sees?
//   node hsens-shoot.mjs <plant id> <scene> <width>
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { diffPNG, sha256 } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const HMUT = join(NIGHT, 'wt', 'web-hmut'), BASE = join(NIGHT, 'wt', 'web-base');
const PROVE = join(NIGHT, 'wt', 'web-harness', 'report', 'btn-44', 'prove.mjs');
const [id, scene, width] = process.argv.slice(2);
const PLANTS = {
  'm15-safe-area': [{ file: 'rack.css', find: '  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  padding-bottom: calc(env(safe-area-inset-bottom) - 1px);\n  background: rgba(20,22,26,.82);' }],
  'm15b-dock-pad-plain': [{ file: 'rack.css', find: '  padding-bottom: env(safe-area-inset-bottom);\n  background: rgba(20,22,26,.82);', replace: '  padding-bottom: calc(env(safe-area-inset-bottom) + 1px);\n  background: rgba(20,22,26,.82);' }],
  'none': []
};
const OUT = join(NIGHT, 'proof', 'hsens', 'shoot-' + id + '-' + scene + '-' + width);
mkdirSync(OUT, { recursive: true });
const shoot = (repo, name, full) => {
  const out = join(OUT, name + (full ? '-full' : '-vp'));
  const r = spawnSync(process.execPath, [PROVE, 'shoot', '--repo', repo, '--out', out, '--scenes', scene, '--widths', width, '--run', 'hsens-shoot-' + name + (full ? '-full' : '-vp'), ...(full ? ['--full'] : [])], { encoding: 'utf8' });
  if (r.status !== 0) console.log(name, 'shoot failed', r.stdout.slice(-400), r.stderr.slice(-400));
  return readFileSync(join(out, scene + '.png'));
};
const saved = new Map();
let res = {};
try {
  for (const e of PLANTS[id]) { const p = join(HMUT, e.file); const s = readFileSync(p, 'utf8'); saved.set(e.file, s); if (s.split(e.find).length !== 2) throw new Error('anchor'); writeFileSync(p, s.replace(e.find, () => e.replace)); }
  const hFull = shoot(HMUT, 'hmut', true), hVp = shoot(HMUT, 'hmut', false);
  for (const [f, s] of saved) writeFileSync(join(HMUT, f), s);
  saved.clear();
  const bFull = shoot(BASE, 'base', true), bVp = shoot(BASE, 'base', false);
  for (const [k, a, b] of [['full', bFull, hFull], ['viewport', bVp, hVp]]) {
    const d = diffPNG(a, b, 3);
    res[k] = { base: sha256(a).slice(0, 16), hmut: sha256(b).slice(0, 16), diffPixels: d.diffPixels, maxDelta: d.maxDelta, size: [d.sizeA, d.sizeB], regions: d.regions.slice(0, 6).map(r => r.css) };
  }
} finally {
  for (const [f, s] of saved) writeFileSync(join(HMUT, f), s);
}
const st = spawnSync('git', ['-C', HMUT, 'status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
res.hmutCleanAfter = !st;
writeFileSync(join(OUT, 'result.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
