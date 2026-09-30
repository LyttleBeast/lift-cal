// Iron Age panel round 2: screenHeader · masthead's look text names where
// the head rule sits under shape.rule.place. Applies to the file given.
import fs from 'node:fs';
const f = process.argv[2];
let s = fs.readFileSync(f, 'utf8');
const a = "masthead: { grade: 'deep', look: 'a larger title over a full-width head rule (shape.rule.head), the eyebrow above it; the nav buttons keep their place'";
const b = "masthead: { grade: 'deep', look: 'a larger title and a full-width head rule (shape.rule.head) placed by shape.rule.place — under the title, or between the eyebrow and the title, which hangs from it — the eyebrow above both; the nav buttons keep their place'";
const n = s.split(a).length - 1;
if (n !== 1) { console.error('matches: ' + n); process.exit(1); }
s = s.replace(a, b);
fs.writeFileSync(f, s);
const m = await import(f + '?' + Date.now());
console.log(m.default.blocks.screenHeader.looks.masthead.look);
