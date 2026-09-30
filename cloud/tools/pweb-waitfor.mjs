// pweb-waitfor.mjs <maxSeconds> <file> <regex> [<file> <regex> …] — block until
// every file has a line matching its regex, or maxSeconds pass; print the
// matching lines (last 12 per file). Exit 0 when all matched, 1 on timeout.
import { readFileSync, existsSync } from 'node:fs';
const [max, ...pairs] = process.argv.slice(2);
const want = [];
for (let i = 0; i < pairs.length; i += 2) want.push({ file: pairs[i], re: new RegExp(pairs[i + 1]) });
const t0 = Date.now();
const hits = w => (existsSync(w.file) ? readFileSync(w.file, 'utf8').split('\n').filter(l => w.re.test(l)) : []);
for (;;) {
  const all = want.every(w => hits(w).length);
  if (all || Date.now() - t0 > +max * 1000) {
    for (const w of want) console.log(w.file + ':\n  ' + hits(w).slice(-12).map(l => l.slice(0, 400)).join('\n  '));
    console.log(all ? 'ALL MATCHED' : 'TIMEOUT after ' + max + 's');
    process.exit(all ? 0 : 1);
  }
  await new Promise(r => setTimeout(r, 2000));
}
