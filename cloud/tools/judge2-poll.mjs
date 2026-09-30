// Judge 2 poll: waits until the judge-r1 shoot has finished (lock released or a
// terminal line in run.log), up to a limit, then prints the directory listing.
import fs from 'node:fs';
const dir = '/Users/micahflunker/dev/vibes-night/proof/cal-v1/judge-r1';
const lock = '/Users/micahflunker/dev/vibes-night/harness.lock';
const limit = Number(process.argv[2] || 540) * 1000;
const t0 = Date.now();
function state() {
  let files = [];
  try { files = fs.readdirSync(dir); } catch {}
  let log = '';
  try { log = fs.readFileSync(dir + '/run.log', 'utf8'); } catch {}
  const pngs = files.filter(f => f.endsWith('.png'));
  const done = /lock released|done|finished|exit/i.test(log.split('\n').slice(-4).join('\n'));
  return { files, pngs, done, log };
}
while (Date.now() - t0 < limit) {
  const s = state();
  if (s.done) break;
  await new Promise(r => setTimeout(r, 10000));
}
const s = state();
console.log('elapsed', Math.round((Date.now() - t0) / 1000), 's; done=', s.done, '; lock exists=', fs.existsSync(lock));
console.log(s.files.join('\n'));
console.log('--- log tail');
console.log(s.log.split('\n').slice(-12).join('\n'));
