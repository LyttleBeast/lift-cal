// e2b-scenes.mjs — list the proof harness's scenes: group, name (from web-harness scenes.json).
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/scenes.json', 'utf8'));
for (const g of s) console.log(g.group + ': ' + (g.scenes || []).map(x => x.name + (/stats|split|donut|plate|cal/i.test(x.js || '') ? '*' : '')).join(', '));
