// gf-getleaf.mjs — gap-fill (critic round, 08b): download one Internet Archive page as its processed JP2 (the
// item's own page image, no re-encode) into research/iron-age/originals/, via tools/fetch.mjs (host-checked).
// Writes a full-size PNG into scratch-gf for crop measurement (study only, never committed).
// Usage: node gf-getleaf.mjs <identifier> <zipbase> <leaf 4-digit> <slug>
import { execFileSync } from 'node:child_process';
const [id, zb, leaf, slug] = process.argv.slice(2);
const ROOT = '/Users/micahflunker/dev/vibes-night';
const out = `${ROOT}/research/iron-age/originals/eng-${slug}.jp2`;
const url = `https://archive.org/download/${id}/${encodeURIComponent(zb)}_jp2.zip/${encodeURIComponent(zb + '_jp2/' + zb + '_' + leaf + '.jp2')}`;
const r = execFileSync('node', [`${ROOT}/tools/fetch.mjs`, url, out]).toString().trim();
console.log(r);
const dims = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', out]).toString();
console.log(dims.replace(/\n\s*/g, ' '));
const S = `${ROOT}/research/iron-age/scratch-gf`;
execFileSync('sips', ['-s', 'format', 'png', out, '--out', `${S}/full-${slug}.png`], { stdio: 'ignore' });
console.log('ok ' + slug);
