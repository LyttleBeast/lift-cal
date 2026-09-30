// Round-3: print one scene's hosts from a dump (compact).
// usage: node pnat-r3-scene.mjs <dump file> '<scene name>'
import { readFileSync } from 'node:fs';
const [file, name] = process.argv.slice(2);
let on = false;
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line) continue;
  const o = JSON.parse(line);
  if (o && typeof o.name === 'string' && 'errors' in o && !('t' in o)) { on = o.name === name; if (on) console.log('SCENE', JSON.stringify(o).slice(0, 300)); continue; }
  if (on) console.log('  '.repeat(Math.min(o.d, 12)) + o.t + (o.x != null ? ' "' + o.x + '"' : '') + ' ' + JSON.stringify({ s: o.s, p: o.p, sn: o.sn }).slice(0, 200));
}
