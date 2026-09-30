// Iron Age panel round 2: card · ruled's look text says what the native and
// web looks now draw for a hero-slot card with no photo. Applies to the file
// given (web or native copy); the two copies stay byte-identical.
import fs from 'node:fs';
const f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const a = "The tab\\'s lead card — its one hero box: Fuel\\'s summary, Weight\\'s log, Steps\\' today — keeps a box (bar ground, radius.r, no border; the keyline, shape.keyline, when shape.lead.keyline), so the page is never boxes-nowhere (R6.1, R6.10)";
const b = "The tab\\'s lead card keeps a box (bar ground, radius.r, no border; the keyline, shape.keyline, when shape.lead.keyline), so the page is never boxes-nowhere (R6.1, R6.10): Fuel\\'s summary always, and a hero-slot card (Weight\\'s log, Steps\\' today) while the vibe draws its photo. A hero-slot card with no photo in the vibe is the open lead: no ground, no sides, the head rule (shape.rule.head) across its top";
const n = s.split(a).length - 1;
if (n !== 1) { console.error('matches: ' + n); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(f, s);
const m = await import(f + '?' + Date.now());
console.log(m.default.blocks.card.looks.ruled.look);
