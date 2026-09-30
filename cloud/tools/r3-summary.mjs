// r3: read a prove summary.json and print coverage + state info compactly.
import fs from 'node:fs';
const p = process.argv[2];
const s = JSON.parse(fs.readFileSync(p, 'utf8'));
const mode = process.argv[3] || 'cov';
if (mode === 'keys') { console.log(Object.keys(s)); console.log(Object.keys(s.checks || {})); console.log(JSON.stringify(s.totals)); }
if (mode === 'cov') {
  const c = s.coverage;
  console.log(JSON.stringify({ ...c, rules: undefined }, null, 1));
  const by = {};
  for (const r of c.rules) (by[r.measured] ||= []).push(r.rule + (r.textOnlyDecls ? ' [' + r.textOnlyDecls.join(',') + ']' : '') + ' scenes=' + r.scenes);
  for (const [k, v] of Object.entries(by)) { console.log('== ' + k + ' ' + v.length); if (k !== 'scenes') v.forEach(x => console.log('  ' + x)); }
}
if (mode === 'states') {
  // per scene: statesInfo is in dumps, not summary; print scene info keys
  const one = Object.values(s.scenes)[0];
  console.log(Object.keys(one));
  console.log(JSON.stringify(one.info, null, 1).slice(0, 3000));
}
if (mode === 'scene') console.log(JSON.stringify(s.scenes[process.argv[4]], null, 1).slice(0, 6000));
