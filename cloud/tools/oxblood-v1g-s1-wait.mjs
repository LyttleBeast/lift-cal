// Wait until every given file matches its pattern, or maxMinutes pass.
// Usage: node oxblood-v1g-s1-wait.mjs <maxMinutes> <file>::<regex> [...]
import { readFileSync } from 'node:fs';
const [max, ...pairs] = process.argv.slice(2);
const want = pairs.map(p => { const i = p.indexOf('::'); return [p.slice(0, i), new RegExp(p.slice(i + 2))]; });
const t0 = Date.now();
for (;;) {
  const left = want.filter(([f, re]) => { try { return !re.test(readFileSync(f, 'utf8')); } catch { return true; } });
  if (!left.length) { console.log('all matched'); break; }
  if (Date.now() - t0 > max * 60e3) { console.log('timeout; waiting on ' + left.map(x => x[0]).join(', ')); break; }
  await new Promise(r => setTimeout(r, 15000));
}
