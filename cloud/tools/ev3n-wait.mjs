// ev3n-wait.mjs — wait (up to N minutes) for a file to exist, then print it.
//   node ev3n-wait.mjs <file> [minutes=9]
import { existsSync, readFileSync } from 'node:fs';
const [f, m] = process.argv.slice(2);
const end = Date.now() + (+(m || 9)) * 60e3;
while (!existsSync(f) && Date.now() < end) await new Promise(r => setTimeout(r, 5000));
console.log(existsSync(f) ? readFileSync(f, 'utf8').slice(0, 6000) : 'not yet: ' + f);
