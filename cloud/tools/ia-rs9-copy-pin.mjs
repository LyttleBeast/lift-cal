// Iron Age: copy the web definition (and vocab.js) byte for byte into the
// native tree and re-pin their sha256 in tools/verify-vibes-verbatim.mjs.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/src/pure/vibes/';
const PIN = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/tools/verify-vibes-verbatim.mjs';
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['defs/iron-age.js', 'defs/vocab.js', 'icons/iron-age.js'];
let pins = fs.readFileSync(PIN, 'utf8');
for (const rel of files) {
  const buf = fs.readFileSync(WEB + rel);
  const before = fs.existsSync(NAT + rel) ? fs.readFileSync(NAT + rel) : null;
  if (!before || !before.equals(buf)) fs.writeFileSync(NAT + rel, buf);
  const sha = createHash('sha256').update(buf).digest('hex');
  const re = new RegExp("('" + rel.replace(/[.\/]/g, m => '\\' + m) + "':\\s*')([0-9a-f]{64})(')");
  const m = pins.match(re);
  if (!m) { console.error('no pin for ' + rel); process.exit(1); }
  pins = pins.replace(re, '$1' + sha + '$3');
  console.log(rel, before && before.equals(buf) ? 'same' : 'copied', m[2] === sha ? 'pin same' : 'pin ' + m[2].slice(0, 8) + ' -> ' + sha.slice(0, 8));
}
fs.writeFileSync(PIN, pins);
