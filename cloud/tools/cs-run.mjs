// Clear sky native build agent (-d1): run named verifiers in a tree under a TZ,
// save each output under vibes-night/tmp/cs-d1/, print exit code and FAIL lines.
// usage: node cs-run.mjs <tree> <TZ> <name> [name…]   (name without .mjs, under tools/)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [tree, tz, ...names] = process.argv.slice(2);
const out = '/Users/micahflunker/dev/vibes-night/tmp/cs-d1';
mkdirSync(out, { recursive: true });
const maxFail = +(process.env.MAXFAIL || 25);
for (const n of names) {
  const [file, ...args] = n.split(' ');
  const r = spawnSync('node', [join(tree, 'tools', file + '.mjs'), ...args], { cwd: tree, env: { ...process.env, TZ: tz }, maxBuffer: 1 << 28, encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || '');
  writeFileSync(join(out, file + '.out'), text);
  const lines = text.split('\n');
  const fails = lines.filter(l => /FAIL|Error|error:|✗/.test(l));
  console.log(r.status + ' ' + file + (fails.length ? '  (' + fails.length + ' fail lines)' : ''));
  for (const l of fails.slice(0, maxFail)) console.log('   ' + l.slice(0, 400));
  if (r.status !== 0 && !fails.length) console.log(lines.slice(-12).join('\n'));
}
