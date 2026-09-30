// rv3-snat-cmp — byte-compare regenerated rules with the committed ones, and
// show the settings block's keys and the vibe rule. Read-only.
import { readFileSync } from 'node:fs';
const W = '/Users/micahflunker/dev/vibes-night/wt/nat-settings/web-patches/';
const T = '/Users/micahflunker/dev/vibes-night/tmp/rv3-snat/';
const pairs = [['p.json', 'database.rules.PROPOSED.json'], ['n.json', 'database.rules.PROPOSED.numchildren.json'], ['l.json', 'database.rules.PROPOSED.OPTIONAL-LOCK.json']];
for (const [a, b] of pairs) {
  const x = readFileSync(T + a, 'utf8'), y = readFileSync(W + b, 'utf8');
  console.log(b, x === y ? 'IDENTICAL to generator output' : 'DIFFERS');
  const j = JSON.parse(y);
  const s = j.rules.users.$uid.settings;
  console.log('  settings keys:', Object.keys(s).join(', '));
  console.log('  settings.vibe:', JSON.stringify(s.vibe));
}
const want = 'newData.isString() && newData.val().length <= 32 && newData.val().matches(/^[a-z0-9][a-z0-9-]*$/)';
const j = JSON.parse(readFileSync(W + 'database.rules.PROPOSED.json', 'utf8'));
console.log('exact expression:', j.rules.users.$uid.settings.vibe['.validate'] === want);
