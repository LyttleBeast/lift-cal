// r3: print a selftest.json compactly.
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const show = (o, d = 0) => JSON.stringify(o).slice(0, 400);
if (Array.isArray(s)) s.forEach(x => console.log(show(x)));
else {
  console.log(Object.keys(s));
  for (const [k, v] of Object.entries(s)) {
    if (Array.isArray(v)) { console.log('== ' + k + ' (' + v.length + ')'); v.forEach(x => console.log('  ' + show(x))); }
    else console.log(k + ': ' + show(v));
  }
}
