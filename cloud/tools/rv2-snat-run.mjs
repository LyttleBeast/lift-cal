#!/usr/bin/env node
/* rv2-snat-run — run one node script in a tree, save its whole output under
 * ~/dev/vibes-night/tmp/rv2-snat/, print the exit code and the last N lines.
 * Usage: node rv2-snat-run.mjs <cwd> <outname> <tailN> <script> [args...]
 * Env: RV2_TZ sets TZ for the child.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [cwd, outname, tailN, script, ...args] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/tmp/rv2-snat';
mkdirSync(dir, { recursive: true });
const env = { ...process.env };
if (process.env.RV2_TZ) env.TZ = process.env.RV2_TZ;
const r = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const all = (r.stdout || '') + (r.stderr ? '\n--- stderr ---\n' + r.stderr : '');
writeFileSync(join(dir, outname), all);
const lines = all.trimEnd().split('\n');
console.log(lines.slice(-Number(tailN || 20)).join('\n'));
console.log('EXIT ' + r.status + '  (' + lines.length + ' lines -> ' + join(dir, outname) + ')');
