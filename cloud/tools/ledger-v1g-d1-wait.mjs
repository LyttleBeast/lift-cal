// Ledger v1 gate (d1): wait until a file exists (or maxMs), then print the
// last lines of a log. Usage: node ledger-v1g-d1-wait.mjs <file> <log> [maxMs=590000]
import { existsSync, readFileSync } from 'node:fs';
const [f, logf, max = '590000'] = process.argv.slice(2);
const t0 = Date.now();
while (!existsSync(f) && Date.now() - t0 < +max) await new Promise(r => setTimeout(r, 10000));
console.log(existsSync(f) ? 'EXISTS' : 'TIMEOUT');
try { console.log(readFileSync(logf, 'utf8').split('\n').filter(l => !/lock: waiting/.test(l)).slice(-6).join('\n')); } catch (e) { console.log(e.code); }
try { const l = readFileSync(logf, 'utf8').split('\n').filter(Boolean); console.log('last: ' + l[l.length - 1]); } catch {}
