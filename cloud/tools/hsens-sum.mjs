// Print the verdict and the non-zero counters of every prove run under a directory
// (or of the run directories given). Scratch tool for the harness-sensitivity review.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const dirs = [];
for (const a of args) {
  if (existsSync(join(a, 'summary.json'))) dirs.push(a);
  else for (const d of readdirSync(a)) if (existsSync(join(a, d, 'summary.json'))) dirs.push(join(a, d));
}
for (const d of dirs) {
  let s;
  try { s = JSON.parse(readFileSync(join(d, 'summary.json'), 'utf8')); } catch (e) { console.log(d, 'unreadable', e.message); continue; }
  const T = s.totals || {};
  const nz = Object.entries(T).filter(([k, v]) => typeof v === 'number' && v && !/seconds|expected|compared/i.test(k)).map(([k, v]) => k + '=' + v).join(' ');
  const scenes = Object.keys(s.scenes || {}).join(',');
  console.log(d.split('/').pop(), '|', s.verdict, '|', (T.compared ?? '?') + '/' + (T.expected ?? '?'), '|', nz, '| harness', s.harness && s.harness.sha && s.harness.sha.slice(0, 7), '| B', s.B && s.B.repo, s.B && s.B.dirty ? 'dirty' : '', '| scenes', scenes.slice(0, 120), '| dataVibe', s.dataVibe, '| started', s.startedAt);
}
