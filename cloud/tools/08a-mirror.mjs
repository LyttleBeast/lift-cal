// 08a-mirror.mjs — tile.loc.gov served the cph/ masters at ~19 KB/s and stalled tonight, so these four LoC
// masters are fetched (via fetch.mjs) from their Wikimedia Commons copies, then proven byte-identical to the
// LoC file: size must equal LoC's listed size AND sha1 must equal the sha1 Commons reports for its copy.
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
const OUT = '/Users/micahflunker/dev/vibes-night/research/iron-age/originals';
const LOG = '/Users/micahflunker/dev/vibes-night/research/scratch-08a/downloads.jsonl';
const U = 'https://upload.wikimedia.org/wikipedia/commons';
const list = [
  { name: 'sandow-falk-leotard-1894.tif', loc: 'https://tile.loc.gov/storage-services/master/pnp/cph/3c00000/3c04000/3c04500/3c04521u.tif', locSize: 13141900,
    url: `${U}/1/15/Eugene_Sandow%2C_full-length_portrait%2C_standing%2C_leaning_on_column%2C_facing_left%2C_wearing_wrestling_leotard%2C_Roman_sandles%2C_and_six_pointed_star_pendant_LCCN91480334.tif`, sha1: '4ae486373c870912721e751cdb3e86517b7f5057' },
  { name: 'sandow-falk-no43-1895.tif', loc: 'https://tile.loc.gov/storage-services/master/pnp/cph/3b20000/3b22000/3b22600/3b22615u.tif', locSize: 1593506,
    url: `${U}/8/8d/Eugen_Sandow%2C_1867-1925_LCCN2002697564.tif`, sha1: '1d83817342a57ee74fa6fd2a3241792750d6933f' },
  { name: 'western-hs-dumbbells-1899.tif', loc: 'https://tile.loc.gov/storage-services/master/pnp/cph/3a00000/3a08000/3a08800/3a08812u.tif', locSize: 1733330,
    url: `${U}/9/9e/Female_students_exercising_with_dumbbells%2C_Western_High_School%2C_Washington%2C_D.C._LCCN2001699136.tif`, sha1: 'e7819f8703556576ebad4dbbaaed1f708ed94cc9' },
  { name: 'western-hs-gym-1899.tif', loc: 'https://tile.loc.gov/storage-services/master/pnp/cph/3g00000/3g09000/3g09600/3g09678u.tif', locSize: 54274622,
    url: `${U}/6/63/Female_students_exercising_in_a_gymnasium%2C_Western_High_School%2C_Washington%2C_D.C._LCCN2002695164.tif`, sha1: '7491177f8867cb93820ee89c857d8a257a5acfa5' },
];
for (const it of list) {
  const out = `${OUT}/${it.name}`;
  if (existsSync(out)) { console.log('have', it.name); continue; }
  const r = JSON.parse(execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', it.url, out], { encoding: 'utf8', timeout: 900000 }).trim());
  const buf = readFileSync(out);
  const sha1 = createHash('sha1').update(buf).digest('hex');
  const ok = buf.length === it.locSize && sha1 === it.sha1;
  if (!ok) { unlinkSync(out); console.log('MISMATCH, removed', it.name, buf.length, sha1); continue; }
  appendFileSync(LOG, JSON.stringify({ name: it.name, ...r, requested_loc_master: it.loc, mirror_check: `size ${buf.length} == LoC listed size; sha1 ${sha1} == Commons-reported sha1`, retrieved: new Date().toISOString() }) + '\n');
  console.log('ok', it.name, buf.length, sha1);
}
