// sampleall.mjs — run scanlab colour sampling over the track-7 PNGs, one process per file (keeps memory low).
import { execFileSync } from 'node:child_process';
const P = '/Users/micahflunker/dev/vibes-night/research/iron-age-period/png/';
const jobs = [
  ['colour', 'sandow1897-n12.png'],               // text page, Introduction
  ['colour', 'sandow1897-n40.png'],               // line-block plate page
  ['colour', 'sandow1897-n6.png'],                // title page
  ['colour', 'pc1908-n5.png', '0.2,0.1,0.9,0.9'], // blank leaf (avoid binding at left)
  ['colour', 'pc1908-iiif6-1400.png', '0.2,0.1,0.9,0.9'],
  ['colour', 'pc1908-n6.png'],                    // editorial page
  ['colour', 'pc1908-iiif200-1400.png'],          // text page 192
  ['colour', 'pc1908-n33.png'],                   // two-column text page 28
  ['colour', 'saxon1908-n7.png', '0.15,0.1,0.9,0.5'], // flyleaf above the library label
  ['colour', 'saxon1908-n15.png'],                // text page 14
  ['region', 'sandow1897-n0.png', '0.93,0.3,0.975,0.7'], // cover ground, right margin strip
  ['colour', 'sandow1897-n0.png', '0.06,0.2,0.9,0.85'],  // cover: darkest = black ink on red
  ['region', 'pc1908-n0.png', '0.2,0.2,0.8,0.8'],
  ['region', 'saxon1908-n0.png', '0.2,0.2,0.8,0.8'],
];
for (const [mode, f, box] of jobs) {
  try {
    const args = ['/Users/micahflunker/dev/vibes-night/tools/scanlab.mjs', mode, P + f]; if (box) args.push(box);
    process.stdout.write(f + ' ' + mode + (box ? ' ' + box : '') + ' => ' + execFileSync('node', args).toString());
  } catch (e) { console.log(f, 'FAILED', String(e.message).slice(0, 120)); }
}
