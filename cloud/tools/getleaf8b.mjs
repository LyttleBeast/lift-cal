// getleaf8b.mjs — track 8b: download one Internet Archive page as its processed JP2 (the item's own page
// image, no re-encode) into research/iron-age/originals/, via tools/fetch.mjs (host-checked).
// Also writes a full-size PNG and a 400px thumbnail into scratch-08b for crop measurement / checking.
// Usage: node getleaf8b.mjs <identifier> <zipbase> <leaf 4-digit> <slug>
import { execFileSync } from 'node:child_process';
const [id, zb, leaf, slug] = process.argv.slice(2);
const ROOT = '/Users/micahflunker/dev/vibes-night';
const out = `${ROOT}/research/iron-age/originals/eng-${slug}.jp2`;
const url = `https://archive.org/download/${id}/${encodeURIComponent(zb)}_jp2.zip/${encodeURIComponent(zb + '_jp2/' + zb + '_' + leaf + '.jp2')}`;
const r = execFileSync('node', [`${ROOT}/tools/fetch.mjs`, url, out]).toString().trim();
console.log(r);
const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', out]).toString();
console.log(dims.replace(/\n\s*/g, ' '));
const S = `${ROOT}/research/iron-age/scratch-08b`;
execFileSync('sips', ['-s', 'format', 'png', out, '--out', `${S}/full-${slug}.png`]);
execFileSync('sips', ['-s', 'format', 'png', '-Z', '400', out, '--out', `${S}/chk-${slug}.png`]);
console.log('ok ' + slug);
