// Provenance gate rs9: hashes every Iron Age asset in both trees against the
// JSON records, and the originals / traced crops under vibes-night.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age';
const V = '/Users/micahflunker/dev/vibes-night';
const sha = p => existsSync(p) ? createHash('sha256').update(readFileSync(p)).digest('hex') : 'MISSING';
const size = p => existsSync(p) ? readFileSync(p).length : -1;
const out = [];
const log = (...a) => out.push(a.join(' '));
// JSON mirrors
for (const [w, n] of [
  ['vibes/iron-age/PROVENANCE.json', 'assets/vibes/iron-age/PROVENANCE.json'],
  ['vibes/iron-age/icons/PROVENANCE.json', 'assets/vibes/iron-age/icons/PROVENANCE.json'],
  ['vibes/iron-age/fonts/FONTS.json', 'assets/vibes/iron-age/FONTS.json'],
  ['vibes/iron-age/textures/TEXTURES.json', 'assets/vibes/iron-age/textures/TEXTURES.json'],
  ['vibes/iron-age/fonts/OFL.txt', 'assets/fonts/Besley/OFL.txt'],
  ['vibes/defs/iron-age.js', 'src/pure/vibes/defs/iron-age.js'],
  ['vibes/icons/iron-age.js', 'src/pure/vibes/icons/iron-age.js'],
]) log('MIRROR', sha(join(W, w)) === sha(join(N, n)) ? 'same' : 'DIFF', w, n);
const prov = JSON.parse(readFileSync(join(W, 'vibes/iron-age/PROVENANCE.json')));
for (const e of prov.entries) {
  const pw = join(W, e.paths.web), pn = join(N, e.paths.native);
  const hw = sha(pw), hn = sha(pn);
  log('PHOTO', e.file, 'web', hw === e.sha256 ? 'ok' : 'BAD ' + hw, 'nat', hn === e.sha256 ? 'ok' : 'BAD ' + hn, 'bytes', size(pw), e.bytes);
  const po = join(V, e.original_file);
  log('  ORIG', e.original_file, sha(po) === e.original_sha256 ? 'ok' : 'BAD ' + sha(po));
}
const ic = JSON.parse(readFileSync(join(W, 'vibes/iron-age/icons/PROVENANCE.json')));
for (const e of ic.entries) {
  const po = join(V, e.original_file);
  const crop = e.sha256_of.match(/icons-ia\/src\/[\w.-]+\.png/);
  const pc = crop ? join(V, crop[0]) : '';
  log('ICON', e.drawings.join('+'), 'orig', sha(po) === e.original_sha256 ? 'ok' : 'BAD ' + sha(po), 'crop', crop ? (sha(pc) === e.sha256 ? 'ok' : 'BAD ' + sha(pc)) : 'n/a');
}
const tx = JSON.parse(readFileSync(join(W, 'vibes/iron-age/textures/TEXTURES.json')));
for (const f of tx.files) {
  const hw = sha(join(W, 'vibes/iron-age/textures', f.file)), hn = sha(join(N, 'assets/vibes/iron-age/textures', f.file));
  log('TEX', f.file, hw === f.sha256 ? 'ok' : 'BAD ' + hw, hn === f.sha256 ? 'ok' : 'BAD ' + hn);
}
const fo = JSON.parse(readFileSync(join(W, 'vibes/iron-age/fonts/FONTS.json')));
for (const fam of fo.families) for (const f of fam.files) {
  const p = join(f.client === 'web' ? W : N, f.path);
  log('FONT', f.path, sha(p) === f.sha256 ? 'ok' : 'BAD ' + sha(p), size(p), f.bytes);
}
log('OFL web sha', sha(join(W, 'vibes/iron-age/fonts/OFL.txt')), 'recorded', fo.families[0].licence_confirmed_from[0].sha256);
const ofl = readFileSync(join(W, 'vibes/iron-age/fonts/OFL.txt'), 'utf8');
log('OFL head:', JSON.stringify(ofl.slice(0, 400)));
log('OFL has v1.1:', /Version 1\.1/.test(ofl), 'mentions Reserved:', (ofl.match(/Reserved Font Name[^\n]*/g) || []).slice(0, 3).join(' | '));
// font name tables
const opentype = (await import('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.module.js').catch(() => import('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js'))).default;
for (const f of ['assets/fonts/Besley/Besley-SemiBold.ttf', 'assets/fonts/Besley/Besley-ExtraBold.ttf', 'assets/fonts/Besley/Besley-Italic.ttf']) {
  try {
    const b = readFileSync(join(N, f));
    const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
    const n = font.names;
    const g = k => n[k] ? (n[k].en || Object.values(n[k])[0]) : undefined;
    log('NAME', f, '|cr', g('copyright'), '|lic', g('license'), '|licURL', g('licenseURL'), '|ver', g('version'));
  } catch (e) { log('NAME', f, 'ERR', e.message); }
}
console.log(out.join('\n'));
