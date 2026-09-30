// Waits on the oxblood review prove run: prints a line when it takes the lock,
// then exits when its output file shows an exit / verdict.
import { readFileSync } from 'node:fs';
const f = process.argv[2];
let took = false;
const t0 = Date.now();
while (Date.now() - t0 < 29 * 60e3) {
  let s = '';
  try { s = readFileSync(f, 'utf8'); } catch {}
  if (!took && /lock: (acquired|held|took)|scene|→/i.test(s.split('lock: waiting').pop())) { took = true; console.log('lock taken, running'); }
  if (/\[exited with code|IDENTICAL|DIFFERENT|INCOMPLETE|UNSTEADY|DIRTY|Error/.test(s)) { console.log('done'); process.exit(0); }
  await new Promise(r => setTimeout(r, 15000));
}
console.log('still running after 29 min');
