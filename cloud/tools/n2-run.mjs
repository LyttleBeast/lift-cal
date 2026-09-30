// n2-run.mjs — run one or more native verifiers from a tree, log each, print the tail.
//   node n2-run.mjs <tree> <tz> <tail> tools/verify-x.mjs [tools/verify-y.mjs …] [-- extra args]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const [tree, tz, tailN, ...rest] = process.argv.slice(2);
const dd = rest.indexOf('--');
const files = dd >= 0 ? rest.slice(0, dd) : rest;
const extra = dd >= 0 ? rest.slice(dd + 1) : [];
const OUT = '/Users/micahflunker/dev/vibes-night/tmp/n2-logs';
mkdirSync(OUT, { recursive: true });
let bad = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = await new Promise(res => {
    const p = spawn(process.execPath, [f, ...extra], { cwd: tree, env: { ...process.env, TZ: tz } });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => res({ code, out }));
  });
  const log = join(OUT, basename(f) + '.' + tz.replace(/\//g, '_') + '.log');
  writeFileSync(log, r.out);
  const lines = r.out.trimEnd().split('\n');
  console.log(`== ${f} [${tz}] exit ${r.code} in ${((Date.now() - t0) / 1000).toFixed(1)}s (log ${log})`);
  const n = +tailN;
  const fails = lines.filter(l => /✗|FAIL|Error|error:/.test(l)).slice(0, 25);
  if (r.code !== 0 && fails.length) console.log(fails.join('\n'));
  console.log(lines.slice(-n).join('\n'));
  if (r.code !== 0) bad++;
}
process.exit(bad ? 1 : 0);
