// Print the shape of a prove.mjs dump (gzipped JSON): top-level keys, and a sample element.
// Usage: node s-web-dumpshape.mjs <dump.json.gz>
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const d = JSON.parse(gunzipSync(readFileSync(process.argv[2])).toString('utf8'));
console.log('keys:', Object.keys(d).join(', '));
for (const [k, v] of Object.entries(d)) {
  const t = Array.isArray(v) ? 'array ' + v.length : typeof v === 'object' && v ? 'object ' + Object.keys(v).length + ' keys' : typeof v;
  console.log(' ', k, t, JSON.stringify(Array.isArray(v) ? v[0] : (v && typeof v === 'object' ? Object.entries(v)[0] : v)).slice(0, 700));
}
