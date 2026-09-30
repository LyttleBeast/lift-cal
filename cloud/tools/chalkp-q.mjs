// chalk polish helper: `lines <file> <a> <b>` prints a range; `grep <regex> <file...>` prints matches with 1 line of context if -C given
import fs from 'node:fs';
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'lines') {
  const [f, s, e] = a; const L = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = +s; i <= +e && i <= L.length; i++) console.log(i + ': ' + L[i - 1]);
} else if (cmd === 'grep') {
  let ctx = 0; if (a[0] === '-C') { ctx = +a[1]; a.splice(0, 2); }
  const re = new RegExp(a[0]);
  for (const f of a.slice(1)) {
    let L; try { L = fs.readFileSync(f, 'utf8').split('\n'); } catch { continue; }
    L.forEach((l, i) => { if (re.test(l)) { for (let j = Math.max(0, i - ctx); j <= Math.min(L.length - 1, i + ctx); j++) console.log(f + ':' + (j + 1) + ': ' + L[j]); if (ctx) console.log('--'); } });
  }
}
