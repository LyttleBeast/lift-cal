// Re-prove Chalk helper: print the top-level shape of a JSON file and its first row-like entries.
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const show = (o, d = 0) => {
  if (Array.isArray(o)) { console.log(' '.repeat(d) + `[${o.length}]`); if (o.length) console.log(' '.repeat(d) + JSON.stringify(o[0]).slice(0, 600)); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { console.log(' '.repeat(d) + k + ': ' + (Array.isArray(v) ? `[${v.length}]` : typeof v)); if (d < 2 && v && typeof v === 'object') show(v, d + 2); }
};
show(j);
