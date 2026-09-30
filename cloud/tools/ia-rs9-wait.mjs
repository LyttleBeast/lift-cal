// Wait until each given file contains its marker (file=marker), or the
// time limit (seconds, first arg) passes. Prints the tail of each file.
import fs from 'node:fs';
const [limit, ...pairs] = process.argv.slice(2);
const until = Date.now() + Number(limit) * 1000;
// a marker may list alternatives separated by '|'
const done = () => pairs.every(p => { const [f, m] = p.split('='); try { const s = fs.readFileSync(f, 'utf8'); return m.split('|').some(x => s.includes(x)); } catch { return false; } });
while (!done() && Date.now() < until) await new Promise(r => setTimeout(r, 5000));
for (const p of pairs) {
  const f = p.split('=')[0];
  let s = ''; try { s = fs.readFileSync(f, 'utf8'); } catch {}
  console.log('== ' + f + '\n' + s.split('\n').slice(-25).join('\n'));
}
