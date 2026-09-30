// hx3-stress-sum: summarise the hx-stress-out runs (label → flags, pixel-different count).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/tmp/hx-stress-out';
const by = {};
for (const d of readdirSync(ROOT).sort()) {
  let s; try { s = JSON.parse(readFileSync(join(ROOT, d, 'summary.json'), 'utf8')); } catch { continue; }
  const label = d.replace(/-\d+$/, '');
  const b = by[label] = by[label] || { runs: 0, sceneWidths: 0, pxDiff: 0, firstAttempt: 0, resolved: 0, reproduced: 0, flags: new Set(), started: s.startedAt, verdicts: {} };
  b.runs++; b.flags.add((s.chromeFlags || []).join(' '));
  const v = Object.values(s.scenes);
  b.sceneWidths += v.length;
  b.pxDiff += v.filter(x => !x.errors.length && !x.pixelsEqual).length;
  b.firstAttempt += v.filter(x => x.firstAttempt).length;
  b.resolved += v.filter(x => x.pixelsConfirmedBy === 'reboot').length;
  b.reproduced += v.filter(x => x.pixelsReproduced).length;
  b.verdicts[s.verdict] = (b.verdicts[s.verdict] || 0) + 1;
}
for (const [k, b] of Object.entries(by)) console.log(k, JSON.stringify({ ...b, flags: [...b.flags] }));
