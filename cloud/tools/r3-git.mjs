#!/usr/bin/env node
/* r3-git — Pnat round-3 coverage reviewer's scratch tool.
 * Runs one READ-ONLY git command in a tree and writes its stdout to a file
 * (no shell, no redirect).
 *   node r3-git.mjs <tree> <outFile> <git args...>
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const [tree, out, ...args] = process.argv.slice(2);
const RO = new Set(['diff', 'show', 'log', 'ls-files', 'grep', 'rev-parse', 'status', 'cat-file', 'ls-tree', 'blame']);
if (!RO.has(args[0])) { console.error('refused: not a read-only git command: ' + args[0]); process.exit(2); }
const txt = execFileSync('git', ['-C', tree, ...args], { encoding: 'utf8', maxBuffer: 1 << 29 });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, txt);
console.log(out + ': ' + txt.length + ' bytes, ' + txt.split('\n').length + ' lines');
