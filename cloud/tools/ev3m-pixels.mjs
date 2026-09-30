// ev3m: every pixel-different scene of a run, against the dock raster
// signature (inside a dock icon, <= 48 px, <= 4 levels) and against the record:
// has an A side (a base tree) on record produced B's exact PNG?
//   node ev3m-pixels.mjs <runName>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');
const run = process.argv[2];
const root = '/Users/micahflunker/dev/vibes-night/proof';
const s = JSON.parse(readFileSync(`${root}/${run}/summary.json`, 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
for (const [k, r] of Object.entries(s.scenes)) {
  if (r.pixelsEqual) continue;
  const [scene, w] = k.split('@');
  const a = PNG.sync.read(readFileSync(`${root}/${run}/A/${w}/${scene}.png`)), b = PNG.sync.read(readFileSync(`${root}/${run}/B/${w}/${scene}.png`));
  let n = 0, max = 0, outside = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]));
    if (!d) continue;
    n++; max = Math.max(max, d);
    const p = i / 4, x = (p % a.width) / 3, y = Math.floor(p / a.width) / 3;
    if (!r.dock.icons.some(ic => x >= ic.left - 0.5 && x <= ic.right + 0.5 && y >= ic.top - 0.5 && y <= ic.bottom + 0.5)) outside++;
  }
  const bSha = sha(`${root}/${run}/B/${w}/${scene}.png`);
  const byA = [];
  for (const other of readdirSync(root)) {
    let o = null; try { o = JSON.parse(readFileSync(`${root}/${other}/summary.json`, 'utf8')); } catch {}
    // A is a base tree; so is B in a control (the same repo and commit on both sides)
    const sides = ['A'];
    if (o && o.A && o.B && o.A.repo === o.B.repo && o.A.sha === o.B.sha) sides.push('B');
    for (const side of sides) {
      const d = `${root}/${other}/${side}/${w}`;
      if (!existsSync(d)) continue;
      for (const f of readdirSync(d)) if (f.endsWith('.png') && (f === scene + '.png' || f.startsWith(scene + '.')) && sha(`${d}/${f}`) === bSha) {
        const aRepo = o ? o.A.repo.split('/').pop() + '@' + o.A.sha.slice(0, 7) + (o.vibe ? ' vibe ' + o.vibe : '') + (o.dataVibe ? ' data-vibe ' + o.dataVibe : '') : '?';
        byA.push(`${other}/${side}/${f} (${aRepo})`);
      }
    }
  }
  console.log(`${k}: ${n} px, max ±${max}, outside dock icons ${outside}; attr ${r.attrDiffs.count}, style ${r.styleDiffs.count}; B png ${bSha.slice(0, 16)} produced by an A side on record: ${byA.length ? byA.join('; ') : 'NONE'}`);
}
