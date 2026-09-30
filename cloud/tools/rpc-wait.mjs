// Re-prove Chalk helper: wait until a file exists and is newer than a given ISO time, polling every 20 s; max minutes.
//   node rpc-wait.mjs <file> <sinceISO> [maxMinutes=28]
import { statSync } from 'node:fs';
const [file, since, max = '28'] = process.argv.slice(2);
const t0 = Date.now(), s = Date.parse(since);
const tick = () => {
  try { if (statSync(file).mtimeMs > s) { console.log('READY ' + file); process.exit(0); } } catch {}
  if (Date.now() - t0 > +max * 60000) { console.log('TIMEOUT ' + file); process.exit(0); }
  setTimeout(tick, 20000);
};
tick();
