// rateband-same.mjs — the Auckland rate-band rule: a failure on a tree counts as
// pre-existing only if the untouched base fails the SAME checks at the same moment.
// Usage: node rateband-same.mjs <web|nat> <suiteLogFile>
// Runs the base's rate-band under TZ=Pacific/Auckland now, extracts failing lines
// (✗ / FAIL / "not ok") from both, prints both sets and SAME or DIFFERENT.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [kind, logFile] = process.argv.slice(2);
const base = kind === 'web' ? '/Users/micahflunker/dev/vibes-night/wt/web-base' : '/Users/micahflunker/dev/vibes-night/wt/nat-base';
const script = kind === 'web' ? 'tools-check/rate-band.mjs' : 'tools/verify-rate-band.mjs';
let out = '';
try { out = execFileSync(process.execPath, [script], { cwd: base, env: { ...process.env, TZ: 'Pacific/Auckland' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
const fails = s => s.split('\n').filter(l => /✗|\bFAIL\b|not ok|✘/i.test(l)).map(l => l.trim()).sort();
const a = fails(readFileSync(logFile, 'utf8')), b = fails(out);
const tally = s => (s.match(/\d+ passed[^\n]*\d+ failed/) || [''])[0];
console.log('tree :', tally(readFileSync(logFile, 'utf8')), a.length, 'failing lines');
console.log('base :', tally(out), b.length, 'failing lines', new Date().toISOString());
console.log(JSON.stringify(a) === JSON.stringify(b) ? 'SAME' : 'DIFFERENT');
if (JSON.stringify(a) !== JSON.stringify(b)) { console.log('tree only:', a.filter(x => !b.includes(x))); console.log('base only:', b.filter(x => !a.includes(x))); }
