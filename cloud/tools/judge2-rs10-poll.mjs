// Waits for the judge screenshots to land, then prints the listing and the log tail.
import fs from 'fs';
const d = '/Users/micahflunker/dev/vibes-night/proof/v-iron-age/judge-rs10-r3-rs10';
const maxMs = Number(process.argv[2] || 540000);
const t0 = Date.now();
let lastSig = '', stableSince = 0;
function snap() {
  let files = [];
  try { files = fs.readdirSync(d); } catch (e) { return { files: [], log: '' }; }
  let log = '';
  try { log = fs.readFileSync(d + '/run.log', 'utf8'); } catch (e) {}
  return { files, log };
}
while (Date.now() - t0 < maxMs) {
  const { files, log } = snap();
  const pngs = files.filter(f => f.endsWith('.png'));
  const done = /\b(done|finished|complete|released|exit)\b/i.test(log.split('\n').slice(-3).join('\n'));
  const sig = pngs.map(f => { try { return f + fs.statSync(d + '/' + f).size; } catch (e) { return f; } }).join('|');
  if (sig !== lastSig) { lastSig = sig; stableSince = Date.now(); }
  if (pngs.length && (done || Date.now() - stableSince > 60000)) break;
  await new Promise(r => setTimeout(r, 10000));
}
const { files, log } = snap();
console.log(files.join('\n'));
console.log('----');
console.log(log.split('\n').slice(-25).join('\n'));
