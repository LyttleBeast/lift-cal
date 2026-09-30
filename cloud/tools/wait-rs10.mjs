// wait until a file exists (or a process is gone), up to a timeout in seconds
// usage: node wait-rs10.mjs <file> [timeoutSec=1700]
import { existsSync } from 'node:fs';
const [file, t = '1700'] = process.argv.slice(2);
const end = Date.now() + +t * 1000;
while (Date.now() < end) {
  if (existsSync(file)) { console.log('present ' + file); process.exit(0); }
  await new Promise(r => setTimeout(r, 5000));
}
console.log('timeout waiting for ' + file);
process.exit(1);
