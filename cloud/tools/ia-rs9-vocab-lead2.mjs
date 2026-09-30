// Iron Age panel round 2, second pass: the open lead carries no rule.
import fs from 'node:fs';
const f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const a = "A hero-slot card with no photo in the vibe is the open lead: no ground, no sides, the head rule (shape.rule.head) across its top";
const b = "A hero-slot card with no photo in the vibe is the open lead: it stands on the page under the tab\\'s title, no ground, no sides, no rule of its own";
const n = s.split(a).length - 1;
if (n !== 1) { console.error('matches: ' + n); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(f, s);
const m = await import(f + '?' + Date.now());
console.log(m.default.blocks.card.looks.ruled.look);
