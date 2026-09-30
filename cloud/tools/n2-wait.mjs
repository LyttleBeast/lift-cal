// N2: wait for a run-verifiers output dir to finish; print its summary and exit.
// Also exits if the given task output file shows the runner has stopped.
import { existsSync, readFileSync } from 'node:fs';
const [dir, outFile, maxMin = '28'] = process.argv.slice(2);
const t0 = Date.now();
let lastLen = 0;
for (;;) {
  if (outFile && existsSync(outFile)) {
    const s = readFileSync(outFile, 'utf8');
    if (s.length > lastLen) {
      const fresh = s.slice(lastLen).split('\n').filter(l => /zone|passed|failed|FAIL|summary|Error|error/i.test(l) && !/waiting for a verify slot/.test(l));
      fresh.forEach(l => console.log(l));
      lastLen = s.length;
    }
  }
  if (existsSync(dir + '/summary.json')) {
    let j = null;
    try { j = JSON.parse(readFileSync(dir + '/summary.json', 'utf8')); } catch {}
    if (j && Object.keys(j.zones || {}).length >= 3) {
      for (const [z, v] of Object.entries(j.zones)) console.log('DONE ' + z + ' ' + v.pass + '/' + v.total + ' fail ' + JSON.stringify(v.fail));
      process.exit(0);
    }
  }
  if (Date.now() - t0 > +maxMin * 60e3) { console.log('TIMEOUT waiting'); process.exit(0); }
  await new Promise(r => setTimeout(r, 5000));
}
