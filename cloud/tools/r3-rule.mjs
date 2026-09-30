// r3: one coverage rule's record (substring match on the rule key), plus totals.
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const r of s.coverage.rules.filter(r => r.rule.includes(process.argv[3]))) console.log(JSON.stringify(r));
console.log(JSON.stringify(s.totals));
console.log(JSON.stringify({ A: s.A, B: s.B, harness: s.harness, provenance: s.provenance && { clean: s.provenance.clean, dirty: s.provenance.dirty } }));
for (const [k, v] of Object.entries(s.scenes)) console.log(k, v.pixelsEqual, JSON.stringify(v.pngSha), v.elements);
