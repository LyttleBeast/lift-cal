// Wait until a file exists (or a timeout in seconds), polling every 10s; print when it does.
import { existsSync } from 'node:fs';
const [file, secs] = process.argv.slice(2);
const end = Date.now() + (+secs || 1700) * 1000;
while (!existsSync(file) && Date.now() < end) await new Promise(r => setTimeout(r, 10000));
console.log(existsSync(file) ? 'READY ' + file : 'TIMEOUT ' + file);
