// iav-grep.mjs <regex> <file...>  — line-numbered grep (no shell grep in this session)
import fs from 'fs';
const [re, ...files] = process.argv.slice(2);
const rx = new RegExp(re, 'i');
for (const f of files) {
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { console.log('!', f, e.message); continue; }
  t.split('\n').forEach((l, i) => { if (rx.test(l)) console.log((files.length > 1 ? f.split('/').pop() + ':' : '') + (i + 1) + ': ' + l.slice(0, 220)); });
}
