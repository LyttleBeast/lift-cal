// Waits for the judge screenshot run to finish: exits when run.log mentions done/fail
// or when PNG count is stable for 60s after at least one PNG appears.
import fs from 'fs';
const d = '/Users/micahflunker/dev/vibes-night/proof/v-iron-age/judge-rs9-r1-rs9';
let last = -1, stableSince = Date.now();
const t0 = Date.now();
while (true) {
  let files = [];
  try { files = fs.readdirSync(d); } catch {}
  const pngs = files.filter(f => f.endsWith('.png'));
  let log = '';
  try { log = fs.readFileSync(d + '/run.log', 'utf8'); } catch {}
  const tail = log.trim().split('\n').slice(-2).join(' | ');
  if (pngs.length !== last) { last = pngs.length; stableSince = Date.now(); console.log(`pngs=${pngs.length} tail: ${tail}`); }
  if (/\b(done|finished|complete|FAIL|error|exit)\b/i.test(tail) && !/waiting/i.test(tail.split('|').pop())) { console.log('END ' + tail); break; }
  if (pngs.length > 0 && Date.now() - stableSince > 90000) { console.log('STABLE ' + pngs.length); break; }
  if (Date.now() - t0 > 1700000) { console.log('TIMEOUT ' + tail); break; }
  await new Promise(r => setTimeout(r, 3000));
}
