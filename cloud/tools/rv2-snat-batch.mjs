#!/usr/bin/env node
/* rv2-snat-batch — run several verifiers in a tree one after another, save each log under
 * ~/dev/vibes-night/tmp/rv2-snat/batch/, print exit code + last line of each.
 * Usage: node rv2-snat-batch.mjs <tree> <script[::arg1,arg2]>...
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
const [tree, ...scripts] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/tmp/rv2-snat/batch';
mkdirSync(dir, { recursive: true });
for (const spec of scripts) {
  const [script, a] = spec.split('::');
  const args = a ? a.split(',') : [];
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [script, ...args], { cwd: tree, env: process.env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const all = (r.stdout || '') + (r.stderr ? '\n--- stderr ---\n' + r.stderr : '');
  writeFileSync(join(dir, basename(script) + '.log'), all);
  const tail = all.trimEnd().split('\n').filter(l => l.trim()).slice(-2).join(' | ');
  console.log('EXIT ' + r.status + '  ' + script + ' ' + args.join(' ') + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)  ' + tail.slice(0, 220));
}
