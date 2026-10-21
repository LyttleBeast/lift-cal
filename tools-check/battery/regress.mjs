#!/usr/bin/env node
//
// Regression cases — one file per bug the battery found, re-run forever.
//
//   node regress.mjs [--repo <repo root>] [--add "<repro args>" --forbid CODE[,CODE] --note "…"]
//   (--repo defaults to the repo this file sits in)
//
// A case is a JSON file in regress/: { id, archetype, seed, session, exId,
// surface, forbid: [codes], note }. The lifter is regenerated from its seed
// (the generator is deterministic), the one cut-off is run, and the case
// fails if any forbidden code is recorded for that surface and lift. Every
// case must pass before Coach v2 ships; a case that starts failing again is a
// regression, by name.
//
// --add turns a line from the harness's "repro:" output into a case:
//   node regress.mjs --add "--archetype novice_linear --seed 2427868652 --session 21 --ex front-squat" --forbid N_WARMUP --note "45x5 quoted mid-ramp"

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageCoach } from './stage.mjs';
import { makeLifter } from './generator.mjs';
import { runCut, makeAcc } from './harness.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DIR = join(HERE, 'regress');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
mkdirSync(DIR, { recursive: true });

if (args.includes('--add')) {
  const a = opt('--add').split(/\s+/);
  const o = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const c = { id: o('--archetype') + '-' + o('--seed') + '-s' + o('--session') + (o('--ex') ? '-' + o('--ex') : ''),
              archetype: o('--archetype'), seed: Number(o('--seed')), session: Number(o('--session')), exId: o('--ex', null),
              surface: opt('--surface', null), forbid: String(opt('--forbid', '')).split(',').filter(Boolean), note: opt('--note', ''),
              added: new Date().toISOString().slice(0, 10) };
  if (!c.forbid.length) { console.error('--forbid CODE is required'); process.exit(2); }
  const p = join(DIR, c.id + '.json');
  writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
  console.log('added ' + p);
  process.exit(0);
}

const C = await stageCoach(opt('--repo', join(HERE, '..', '..')));
const files = readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
let pass = 0, fail = 0;
for (const f of files) {
  const c = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const L = makeLifter(c.seed, c.archetype);
  const acc = makeAcc();
  runCut(C, L, c.session, acc);
  const hits = acc.wrongs.concat(acc.misses).filter(r => (!c.exId || r.exId === c.exId) && (!c.surface || r.surface === c.surface) &&
                                                         r.codes.some(k => c.forbid.includes(k)));
  if (hits.length) { fail++; console.log('  ✗ ' + c.id + ' — ' + c.forbid.join(',') + ' still fires (' + hits.length + ')' + (c.note ? '  [' + c.note + ']' : '')); }
  else { pass++; console.log('  ✓ ' + c.id + (c.note ? '  [' + c.note + ']' : '')); }
}
console.log('\n' + pass + ' passed, ' + fail + ' failed of ' + files.length);
process.exit(fail ? 1 : 0);
