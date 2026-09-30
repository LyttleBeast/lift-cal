// Byte-for-byte copy of the shared pure files into the native Iron Age tree.
// node ian-copy.mjs [--def-from <path>] [--index-from <path>]
// Default def source: the web vibe branch if it has one, else wt/web-design.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt';
const NAT = W + '/nat-v-iron-age/src/pure/vibes';
const a = process.argv.slice(2);
const opt = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const webDef = W + '/web-v-iron-age/vibes/defs/iron-age.js';
const def = opt('--def-from', existsSync(webDef) ? webDef : W + '/web-design/vibes/defs/iron-age.js');
const icons = opt('--icons-from', W + '/web-v-iron-age/vibes/icons/iron-age.js');
const index = opt('--index-from', null);
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const pairs = [[def, NAT + '/defs/iron-age.js'], [icons, NAT + '/icons/iron-age.js']];
if (index) pairs.push([index, NAT + '/defs/index.js']);
for (const [s, d] of pairs) {
  copyFileSync(s, d);
  console.log(sha(d) === sha(s) ? 'ok  ' : 'BAD ', sha(d), d, '<-', s);
}
