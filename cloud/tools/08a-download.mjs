// 08a-download.mjs — run the night's downloader (fetch.mjs) once per Track 8a original, sequentially,
// and append each JSON result line to research/scratch-08a/downloads.jsonl. Skips files already present.
import { execFileSync } from 'node:child_process';
import { existsSync, appendFileSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/research/iron-age/originals';
const LOG = '/Users/micahflunker/dev/vibes-night/research/scratch-08a/downloads.jsonl';
const T = 'https://tile.loc.gov/storage-services/master/pnp';
const IA = 'https://archive.org/download/4908148.0001.001.umich.edu/4908148.0001.001.umich.edu_tif.zip/4908148.0001.001.umich.edu_tif%2F4908148.0001.001.umich.edu_';
const list = [
  ['sandow-falk-fur-1895.tif', `${T}/cph/3a20000/3a23000/3a23100/3a23125u.tif`],
  ['saxon-trio-1911.tif', `${IA}0388.tif`],
  ['cyr-and-manager-1894.tif', `${IA}0477.tif`],
  ['athleta-1911.tif', `${IA}0402.tif`],
  ['athleta-lille-1911.tif', `${IA}0399.tif`],
  ['apollon-portrait-1911.tif', `${IA}0421.tif`],
  ['gym-naval-academy.tif', `${T}/det/4a10000/4a15000/4a15000/4a15039u.tif`],
  ['house-gym-dumbbells-1920.tif', `${T}/npcc/01500/01517u.tif`],
  ['sandwina-three-men.tif', `${T}/ggbain/06800/06839u.tif`],
  ['sandwina-lady-hercules.tif', `${T}/ggbain/06800/06840u.tif`],
  ['hackenschmidt-bain-1908.tif', `${T}/ggbain/00700/00734u.tif`],
  ['joe-rogers-gym.tif', `${T}/ggbain/02300/02395u.tif`],
  ['jim-white-navy-1921.tif', `${T}/npcc/05100/05132u.tif`],
  ['ymca-gym.tif', `${T}/npcc/31800/31876u.tif`],
  ['strongman-acrobat-1923.tif', `${T}/stereo/1s50000/1s51000/1s51800/1s51836u.tif`],
  ['sikh-strongman-clubs-1907.tif', `${T}/stereo/1s20000/1s27000/1s27100/1s27102u.tif`],
  ['hine-gym-class-1910.tif', `${T}/nclc/04500/04577u.tif`],
  ['braddock-gym-1893.tif', `${T}/ppmsca/15300/15372u.tif`],
  ['tunney-pulleys-1926.tif', `${T}/ppmsca/19500/19506u.tif`],
  // cph masters stream at ~19 KB/s from tile.loc.gov tonight (measured) — last, so they cannot block the rest.
  ['sandow-falk-no43-1895.tif', `${T}/cph/3b20000/3b22000/3b22600/3b22615u.tif`],
  ['western-hs-dumbbells-1899.tif', `${T}/cph/3a00000/3a08000/3a08800/3a08812u.tif`],
  ['sandow-falk-leotard-1894.tif', `${T}/cph/3c00000/3c04000/3c04500/3c04521u.tif`],
  ['western-hs-gym-1899.tif', `${T}/cph/3g00000/3g09000/3g09600/3g09678u.tif`],
];
for (const [name, url] of list) {
  const out = `${OUT}/${name}`;
  if (existsSync(out)) { console.log('have', name); continue; }
  for (let a = 0; a < 3; a++) {
    try {
      const r = execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out], { encoding: 'utf8', maxBuffer: 1 << 20, timeout: 900000 });
      appendFileSync(LOG, JSON.stringify({ name, ...JSON.parse(r.trim()), retrieved: new Date().toISOString() }) + '\n');
      console.log('ok', name, r.trim().slice(0, 160));
      break;
    } catch (e) { console.log('retry', name, a, String(e.stdout || e.message).slice(0, 200)); }
  }
}
console.log('done');
