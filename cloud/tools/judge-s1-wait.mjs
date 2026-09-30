// Waits until the given pid exits, printing the last line of a log every 60s.
import fs from 'node:fs';
const [pid, log] = [Number(process.argv[2]), process.argv[3]];
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
let last = '';
const tick = () => {
  let t = '';
  try { t = fs.readFileSync(log, 'utf8').trim().split('\n').pop(); } catch {}
  if (t !== last && !t.startsWith('lock: waiting')) { console.log(t); last = t; }
  if (!alive()) { console.log('EXITED'); process.exit(0); }
  setTimeout(tick, 15000);
};
tick();
