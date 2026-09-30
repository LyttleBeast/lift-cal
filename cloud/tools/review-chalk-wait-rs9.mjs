// Review scratch: wait until the prove run's output shows a verdict (or the
// process is gone), printing progress lines each poll.
import { readFileSync } from 'node:fs';
const [file, pid, maxMin] = process.argv.slice(2);
const until = Date.now() + (+maxMin || 25) * 60000;
let last = 0;
const alive = () => { try { process.kill(+pid, 0); return true; } catch { return false; } };
for (;;) {
  const s = readFileSync(file, 'utf8');
  const lines = s.split('\n');
  const scenes = lines.filter(l => /^\s+\S+@\d+ on :876/.test(l)).length;
  if (scenes !== last) { last = scenes; }
  if (/IDENTICAL|DIFFERENT|INCOMPLETE|UNSTEADY|DIRTY|verdict|Error|FAIL/.test(s.split('\n').slice(12).join('\n')) || !alive() || Date.now() > until) {
    console.log('captures', scenes, 'alive', alive());
    console.log(lines.slice(-25).join('\n'));
    process.exit(0);
  }
  await new Promise(r => setTimeout(r, 20000));
}
