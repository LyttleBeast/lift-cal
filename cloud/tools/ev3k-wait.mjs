// ev3k: print a line when each awaited file appears; exit when all have.
import { existsSync } from 'node:fs';
const want = process.argv.slice(2);
const seen = new Set();
const t0 = Date.now();
const tick = () => {
  for (const f of want) if (!seen.has(f) && existsSync(f)) { seen.add(f); console.log('ready ' + f + ' after ' + Math.round((Date.now() - t0) / 1000) + 's'); }
  if (seen.size === want.length) process.exit(0);
};
tick();
setInterval(tick, 5000);
