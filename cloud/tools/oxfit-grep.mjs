// Print lines of a file matching a regex (case-insensitive), with line numbers; the last N lines with --tail N.
import { readFileSync } from 'node:fs';
const [file, pat, tailFlag, tailN] = process.argv.slice(2);
const lines = readFileSync(file, 'utf8').split('\n');
const re = new RegExp(pat || '.', 'i');
lines.forEach((l, i) => { if (re.test(l)) console.log((i + 1) + ': ' + l.slice(0, 400)); });
if (tailFlag === '--tail') console.log('--- tail ---\n' + lines.slice(-(+tailN || 10)).join('\n'));
