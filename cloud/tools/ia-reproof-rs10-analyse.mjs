// Iron Age v1 gate, round reproof-rs10: one run's analysis — cross-run against
// main's reference run, the fixture LCS align at both widths, the settings-hub
// and fixture re-alignment, the pixel-different scenes with each PNG's sha and
// whether an earlier run produced it, and which B dumps name an iron-age file.
// Usage: node ia-reproof-rs10-analyse.mjs <runDir> <refRunDir> <outFile>
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const [run, ref, outFile] = process.argv.slice(2);
const T = '/Users/micahflunker/dev/vibes-night/tools/';
const out = [];
const node = (args) => { const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 28 }); return (r.stdout || '') + (r.stderr || ''); };
const cr = node([T + 'iron-age-v1gate-rs9-crossrun.mjs', ref, run, outFile.replace(/\.txt$/, '') + '-crossrun.txt']).split('\n');
const kfOnly = cr.filter(l => /^B \d+ .* \{"keyframeDiffs":1\}$/.test(l));
out.push('CROSSRUN: B scenes differing from main only by 1 keyframe: ' + kfOnly.length);
out.push(...cr.filter(l => l && !kfOnly.includes(l)));
for (const w of ['390', '320']) out.push('FXALIGN ' + w, node([T + 'ia-v1-fxalign-ar1x-rs9.mjs', ref + '/B/' + w + '/fixture.dump.json.gz', run + '/B/' + w + '/fixture.dump.json.gz']));
out.push('REALIGN', node([T + 's-web-realign-all.mjs', run]));
const S = JSON.parse(readFileSync(run + '/summary.json', 'utf8'));
for (const [k, s] of Object.entries(S.scenes)) {
  if (!s || !(s.diffPixels > 0)) continue;
  const sha = side => createHash('sha256').update(readFileSync(run + '/' + side + '/' + s.width + '/' + s.scene + '.png')).digest('hex');
  const b = sha('B');
  out.push('PIXELS ' + k + ' ' + s.diffPixels + 'px regions ' + JSON.stringify(s.diffRegions.map(r => r.css)) + ' A ' + sha('A').slice(0, 12) + ' B ' + b.slice(0, 12));
  const seen = node([T + 'ia-v1-pngseen-ar1x-rs9.mjs', s.scene, String(s.width), b]).split('\n').filter(l => /web-base/.test(l));
  out.push('  B png produced by the base tree 928a65e in ' + seen.length + ' earlier captures' + (seen[0] ? ', e.g. ' + seen[0].trim() : ''));
}
const hits = {};
for (const w of ['390', '320']) for (const f of readdirSync(run + '/B/' + w).filter(f => f.endsWith('.dump.json.gz'))) {
  const m = gunzipSync(readFileSync(run + '/B/' + w + '/' + f)).toString().match(/vibes\/iron-age\/[A-Za-z0-9@._\/-]+/g);
  if (m) hits[w + ' ' + f] = [...new Set(m)];
}
out.push('B DUMPS NAMING IRON-AGE FILES ' + JSON.stringify(hits));
out.push('REQUESTS only B ' + JSON.stringify((S.requests || {}).onlyB || (S.requests || {}).only_B || null));
writeFileSync(outFile, out.join('\n') + '\n');
console.log(out.join('\n'));
