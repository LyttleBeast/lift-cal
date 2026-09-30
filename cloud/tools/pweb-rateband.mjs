// pweb-rateband.mjs <outDir> <tz> <verifier> <treeA> [<treeB> …] — run one
// tools-check verifier in each tree, back to back, under one zone, cwd = the
// tree (as run-verifiers.mjs does). Saves each output, prints the exit code,
// the pass/fail line and every failing (✗) line, and whether the trees failed
// the same checks. No shell: spawns node directly.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
const [outDir, tz, verifier, ...trees] = process.argv.slice(2);
if (!outDir || !tz || !verifier || !trees.length) { console.error('usage: pweb-rateband.mjs <outDir> <tz> <verifier> <tree>…'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const res = [];
for (const t of trees) {
  const at = new Date().toISOString();
  const r = spawnSync(process.execPath, [verifier], { cwd: t, env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 9 * 60e3 });
  const out = (r.stdout || '') + (r.stderr || '');
  const file = join(outDir, basename(t) + '-' + basename(verifier) + '.log');
  writeFileSync(file, out);
  const lines = out.split('\n');
  const fails = lines.filter(l => /^\s*✗/.test(l)).map(l => l.trim());
  const tally = lines.filter(l => /\d+ passed, \d+ failed/.test(l)).pop() || null;
  res.push({ tree: t, at, tz, code: r.status, tally, fails, log: file });
  console.log(t + ' @' + at + ' TZ=' + tz + ': exit ' + r.status + ', ' + tally + (fails.length ? '\n  ' + fails.join('\n  ') : ''));
}
const same = res.every(x => x.code === res[0].code && JSON.stringify(x.fails) === JSON.stringify(res[0].fails));
console.log('same result in every tree: ' + same);
writeFileSync(join(outDir, 'rateband-' + tz.replace(/\//g, '_') + '.json'), JSON.stringify({ tz, verifier, same, res }, null, 1));
