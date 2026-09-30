#!/usr/bin/env node
// Review helper: every scene×width in a prove.mjs summary.json whose diff
// counts are not all zero, and which scenes they are.
import { readFileSync } from 'node:fs';
for (const dir of process.argv.slice(2)) {
  const s = JSON.parse(readFileSync(dir + '/summary.json', 'utf8'));
  console.log('\n== ' + dir + '  (A ' + JSON.stringify(s.A).slice(0, 120) + ' | B ' + JSON.stringify(s.B).slice(0, 120) + ')');
  const K = ['styleDiffs', 'rectDiffs', 'svgDiffs', 'textDiffs', 'valueDiffs', 'structDiffs', 'attrDiffs', 'headDiffs', 'stateDiffs', 'keyframeDiffs'];
  let zero = 0;
  const scenes = Array.isArray(s.scenes) ? s.scenes : Object.entries(s.scenes).map(([k, v]) => ({ key: k, ...v }));
  s.scenes = scenes;
  for (const r of scenes) {
    const c = Object.fromEntries(K.map(k => [k.replace('Diffs', ''), (r[k] && r[k].count) || 0]).filter(([, v]) => v));
    if (!r.pixelsEqual || r.diffPixels || Object.keys(c).length || (r.errors && r.errors.length)) console.log('  ' + r.key.padEnd(24) + ' px ' + (r.pixelsEqual ? 'equal' : r.diffPixels) + ' ' + JSON.stringify(c) + (r.errors && r.errors.length ? ' errors ' + JSON.stringify(r.errors).slice(0, 200) : ''));
    else zero++;
  }
  console.log('  all-zero scene×widths: ' + zero + ' of ' + s.scenes.length + '; cssDiffs ' + s.totals.cssDiffs + ', fileDiffs ' + s.totals.fileDiffs + ', requestDiffs ' + s.totals.requestDiffs + ', notForgiven ' + s.totals.notForgiven);
  const onlyB = (s.requests && s.requests.B || []).filter(x => !(s.requests.A || []).includes(x));
  console.log('  requests only in B: ' + JSON.stringify(onlyB));
}
