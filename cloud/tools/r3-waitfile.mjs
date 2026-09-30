#!/usr/bin/env node
/* r3-waitfile — wait (polling, at most N minutes) until a file exists, then print it.
 *   node r3-waitfile.mjs <file> [maxMinutes=9]
 */
import { existsSync, readFileSync } from 'node:fs';
const [f, max = '9'] = process.argv.slice(2);
const until = Date.now() + +max * 60e3;
const tick = () => {
  if (existsSync(f)) { console.log(readFileSync(f, 'utf8')); return; }
  if (Date.now() > until) { console.log('timed out waiting for ' + f); process.exit(1); }
  setTimeout(tick, 5000);
};
tick();
