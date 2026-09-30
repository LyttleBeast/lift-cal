// hx-sum: print a prove.mjs summary.json's totals and every scene that is not clean.
//   node hx-sum.mjs <summary.json>
import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ run: s.run, mode: s.mode, verdict: s.verdict, totals: s.totals, checks: s.checks, chrome: s.chrome, A: s.A, B: s.B, vibe: s.vibe, fetch: s.fetch && { ...s.fetch, failedSample: (s.fetch.failedSample || []).slice(0, 5) } }, null, 1));
console.log('groups', JSON.stringify(s.groups));
for (const [k, x] of Object.entries(s.scenes)) {
  const clean = !x.errors.length && x.pixelsEqual && !x.styleDiffs.count && !x.rectDiffs.count && !x.svgDiffs.count && !x.structDiffs.count && !x.textDiffs.count && !x.valueDiffs.count;
  if (clean) continue;
  console.log('--', k, JSON.stringify({ errors: x.errors, px: x.diffPixels, regions: (x.diffRegions || []).slice(0, 4).map(r => r.css ? { ...r.css, n: r.pixels } : r), style: x.styleDiffs && x.styleDiffs.count, styleFirst: x.styleDiffs && x.styleDiffs.first.slice(0, 5), rect: x.rectDiffs && x.rectDiffs.count, rectFirst: x.rectDiffs && x.rectDiffs.first.slice(0, 3), svg: x.svgDiffs && x.svgDiffs.count, text: x.textDiffs && x.textDiffs.count, textFirst: x.textDiffs && x.textDiffs.first.slice(0, 3), struct: x.structDiffs && x.structDiffs.count, structFirst: x.structDiffs && x.structDiffs.first.slice(0, 3), info: x.info }));
}
