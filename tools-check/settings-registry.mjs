#!/usr/bin/env node
//
// Verifier for the Settings regroup (October 2026).
//
//   node tools-check/settings-registry.mjs
//
// The regroup moved every row and dropped none. This holds that promise from
// the pure table (settings-registry.js) and the hub's source:
//
//   A  the table      unique ids, every row in a known group, every `opens`
//                     names a handler the hub defines
//   B  nothing lost   every setting the hub had before is a row, once
//   C  the gates      Admin only for the owner, "N saves were refused" only
//                     while there are some — absent from search as well
//   D  search         word starts, folded; an empty group's heading goes too
//   E  Coach          every switch coach.js has lands in exactly one group
//   F  web-only       Import and Add to Home Screen are here; no Step
//                     automation row, no Dev group

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const R = await import(pathToFileURL(join(ROOT, 'settings-registry.js')).href);
// coach.js reaches Firebase through analytics.js, which a plain node cannot load,
// so its category table is read off the source instead (the same lines the app runs).
const COACH_SRC = readFileSync(join(ROOT, 'coach.js'), 'utf8');
const CATEGORIES = [...COACH_SRC.slice(COACH_SRC.indexOf('export const CATEGORIES')).split('\n]')[0]
  .matchAll(/\{ id: '(\w+)',[^\n]*?mutable: (true|false),(?:\s*note: '((?:[^'\\]|\\.)*)')?/g)]
  .map(m => ({ id: m[1], mutable: m[2] === 'true', note: m[3] }));
const HUB = readFileSync(join(ROOT, 'settings.js'), 'utf8');

let pass = 0, fail = 0;
const out = [];
const check = (label, ok, detail) => { if (ok) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const ids = list => list.map(r => r.id);
const flat = s => s.flatMap(x => x.rows);

section('A. the table');
{
  const seen = new Set(), dup = [];
  R.ROWS.forEach(r => { if (seen.has(r.id)) dup.push(r.id); seen.add(r.id); });
  check('row ids are unique', !dup.length, dup.join(', '));
  const gs = new Set(R.GROUPS.map(g => g.id));
  check('every row sits in a known group', R.ROWS.every(r => gs.has(r.group)), ids(R.ROWS.filter(r => !gs.has(r.group))).join(', '));
  check('the groups are drawn in the designed order',
    JSON.stringify(R.GROUPS.map(g => g.id)) === JSON.stringify(['you', 'plan', 'train', 'coach', 'look', 'tools', 'help', 'out']));
  const missing = R.ROWS.filter(r => !new RegExp('\\b' + r.opens + '\\s*:').test(HUB));
  check('every row `opens` an action the hub defines', !missing.length, ids(missing).join(', '));
}

section('B. nothing lost');
{
  // Every entry of the pre-regroup hub (rack-v65's openSettings), by id.
  const BEFORE = ['profile', 'goal', 'targets', 'water', 'steps', 'rest', 'library', 'coach', 'vibes', 'units', 'openOn',
                  'ai', 'recall', 'paste', 'import', 'tour', 'refused', 'admin', 'signOut', 'erase', 'install'];
  const have = ids(R.ROWS);
  check('every setting the hub had is a row', BEFORE.every(i => have.includes(i)), BEFORE.filter(i => !have.includes(i)).join(', '));
  check('and each is in exactly one group, once', BEFORE.every(i => R.ROWS.filter(r => r.id === i).length === 1));
  check('the two sign-outs are the unheaded red group at the foot',
    R.ROWS.filter(r => r.group === 'out').every(r => r.danger) && R.GROUPS.find(g => g.id === 'out').title === null);
}

section('C. the gates');
{
  const none = flat(R.sections({}, ''));
  check('a person who is not the owner sees no Admin', !ids(none).includes('admin'));
  check('the owner sees it, under Help', flat(R.sections({ owner: true }, '')).some(r => r.id === 'admin' && r.group === 'help'));
  check('"owner: \'true\'" or any non-true is not the owner', !ids(flat(R.sections({ owner: 'true' }, ''))).includes('admin') && !ids(flat(R.sections({ owner: 1 }, ''))).includes('admin'));
  check('no refused row while nothing was refused', !ids(none).includes('refused') && !ids(flat(R.sections({ refused: '' }, ''))).includes('refused'));
  const ref = flat(R.sections({ refused: '2 saves were refused' }, '')).find(r => r.id === 'refused');
  check('with some refused, the row says how many', !!ref && R.labelOf(ref, { refused: '2 saves were refused' }) === '2 saves were refused');
  check('searching "admin" does not answer the question the gate keeps', !ids(flat(R.sections({}, 'admin'))).includes('admin') && !ids(flat(R.sections({}, 'owner'))).includes('admin'));
  check('the owner can find it by searching', ids(flat(R.sections({ owner: true }, 'admin'))).includes('admin'));
}

section('D. search');
{
  const q = s => ids(flat(R.sections({}, s)));
  check('"rest" finds Default rest', q('rest').includes('rest'));
  check('and word starts only: "terest" finds nothing', q('terest').length === 0);
  check('accents, case and punctuation fold: "ERASE this devices"', q('ERASE this devices').includes('erase'));
  check('every word typed must match: "default rest" finds one, "default zzz" none', q('default rest').includes('rest') && q('default zzz').length === 0);
  check('a query that matches nothing leaves no groups, not empty headings', R.sections({}, 'qqqq').length === 0);
  check('a query that matches one row leaves only its group', R.sections({}, 'default rest').length === 1);
  check('the blank query shows every visible row', flat(R.sections({}, '')).length === R.ROWS.filter(r => !r.gate).length);
  check('`extra` words (the Coach switch names) are searchable on their row', ids(flat(R.sections({}, 'progression', { coach: 'progression volume' }))).includes('coach'));
}

section('E. Settings → Coach');
{
  const mutable = CATEGORIES.filter(c => c.mutable);
  check('the category table was read (14 switches, the number the Coach row quotes)', mutable.length >= 10, String(mutable.length));
  const rows = mutable.map(c => ({ id: c.id, label: c.label, note: c.note, on: true }));
  const groups = R.coachSections(rows);
  const placed = groups.flatMap(g => g.rows.map(r => r.id));
  check('every switch coach.js has is placed', mutable.every(c => placed.includes(c.id)), mutable.filter(c => !placed.includes(c.id)).map(c => c.id).join(', '));
  check('and placed once', new Set(placed).size === placed.length);
  const extra = R.coachSections([...rows, { id: 'brandNew', label: 'x', on: true }]);
  check('a switch the table does not know lands in Other, never unreachable', extra.find(g => g.group.id === 'other').rows.some(r => r.id === 'brandNew'));
  check('every switch has a tile icon', mutable.every(c => R.COACH_ICONS[c.id]), mutable.filter(c => !R.COACH_ICONS[c.id]).map(c => c.id).join(', '));
  check('"13 of 14 on" counts the ones on', R.coachCount([{ on: true }, { on: false }, { on: true }]) === '2 of 3 on' && R.coachCount([]) === null);
}

section('F. where the web differs from native, and only there');
{
  const have = ids(R.ROWS);
  check('Import workout history (tools) and Add to Home Screen (help) are here',
    R.ROWS.find(r => r.id === 'import').group === 'tools' && R.ROWS.find(r => r.id === 'install').group === 'help');
  check('no step-automation row and no Dev group', !have.includes('stepAuto') && !R.GROUPS.some(g => g.id === 'dev'));
  check('the registry imports nothing (pure)', !/^\s*import\s/m.test(readFileSync(join(ROOT, 'settings-registry.js'), 'utf8')));
}

console.log('\nSettings: regrouped, nothing dropped\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
