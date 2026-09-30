// Waits until a file exists (or a timeout), then exits.
import { existsSync } from 'node:fs';
const [, , f, secs = '1500'] = process.argv;
const end = Date.now() + (+secs) * 1000;
const tick = () => { if (existsSync(f)) { console.log('ready ' + f); process.exit(0); } if (Date.now() > end) { console.log('timeout'); process.exit(1); } setTimeout(tick, 5000); };
tick();
