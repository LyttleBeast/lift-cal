// Pweb round-2: the harness's coverage claim vs my own touched-rule list.
import fs from 'node:fs';
const mine = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const s = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const norm = k => k.replace(/\s*#\d+$/, '').replace(/\s*([>+~,])\s*/g, '$1').replace(/\s+/g, ' ').replace(/ \| /g, '|').replace(/\|$/, '').trim();
const theirs = new Map(s.coverage.rules.map(r => [norm(r.rule), r]));
const mineKeys = new Set(mine.changed.map(c => { const [f, ctx, sel] = c.rule.split(' | '); return norm(f + ' | ' + (ctx ? ctx + ' > ' : '') + sel); }));
console.log('theirs', theirs.size, 'mine', mineKeys.size);
for (const k of theirs.keys()) if (!mineKeys.has(k)) console.log('only theirs:', k, JSON.stringify(theirs.get(k)));
for (const k of mineKeys) if (!theirs.has(k)) console.log('only mine:', k);
for (const [k, r] of theirs) if (/@media|keyframes|prefers/.test(k)) console.log('ctx rule:', JSON.stringify(r));
const counts = {};
for (const r of s.coverage.rules) counts[r.measured] = (counts[r.measured] || 0) + 1;
console.log(counts);
