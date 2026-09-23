#!/usr/bin/env node
//
// Verifier that the build an account reports is the build it is running.
//
//   node tools-check/version-match.mjs
//
// Two files carry the version and CLAUDE.md makes matching them a hard rule:
// sw.js's CACHE is what evicts the offline copy and what a phone fetches, and
// usage.js's VERSION is what each account reports to the admin panel as its
// build. Bump one without the other and nothing breaks where anybody can see
// it — the panel simply names the wrong build, which is the silent kind of
// wrong this repo keeps having to learn about. It was checked by hand every
// ship until now.
//
// Nothing is copied into this file: no version string, no rule about what one
// looks like. It reads both files and compares what they say.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

const cache   = (/const CACHE\s*=\s*'([^']*)'/.exec(read('sw.js')) || [])[1];
const version = (/const VERSION\s*=\s*'([^']*)'/.exec(read('usage.js')) || [])[1];

const ok = !!cache && cache === version;
console.log('\nsw.js CACHE   ' + (cache || '(not found)') +
            '\nusage.js VERSION ' + (version || '(not found)') +
            '\n\n' + (ok ? '  ✓ the same string — the build reported is the build shipped'
                         : '  ✗ they differ, or one is missing — bump both, together') + '\n');
process.exit(ok ? 0 : 1);
