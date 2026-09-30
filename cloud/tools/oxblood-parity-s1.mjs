// Parity gate s1 for oxblood: pure-file byte identity web<->native, and a
// spot-check of roles between the web's generated CSS block and native build().
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
for (const f of ['defs/oxblood.js', 'icons/oxblood.js', 'defs/index.js', 'defs/vocab.js', 'defs/v1.js', 'defs/chalk.js', 'icons/chalk.js']) {
  const a = W + '/vibes/' + f, b = N + '/src/pure/vibes/' + f;
  const ha = existsSync(a) ? sha(a) : 'MISSING', hb = existsSync(b) ? sha(b) : 'MISSING';
  console.log((ha === hb ? 'SAME ' : 'DIFF ') + f + ' ' + ha.slice(0, 16) + ' ' + hb.slice(0, 16));
}
const css = readFileSync(W + '/vibes/oxblood.css', 'utf8');
// Print the generated token block
const s = css.indexOf('/* BEGIN'), e = css.indexOf('END', s + 10);
console.log('--- css head (first 200 lines) ---');
console.log(css.split('\n').slice(0, 200).join('\n'));
