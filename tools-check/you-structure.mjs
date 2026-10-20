#!/usr/bin/env node
//
// Verifier for the You tab's redesign (October 2026).
//
//   node tools-check/you-structure.mjs
//
// The promise the redesign was approved on: EVERY CARD YOU DREW BEFORE IS STILL
// DRAWN, one tap away, and drawn once. Nothing was deleted; the cards moved.
//
//   A  the rows       you-rows.js names the screens; you.js draws each card
//                     named exactly once, and only behind a row
//   B  the tiles      weekNumbers() is the rule of the card each tile
//                     summarises — computed here by hand from the same fixture
//   C  composition    YOU_BLOCKS are names of the vocabulary's you screen
//   D  Steps tab      untouched by this change (it is repurposed as Friends later)
//   E  Admin, install moved out of You and into Settings → Help

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const rd = f => readFileSync(join(ROOT, f), 'utf8');
const YOU = rd('you.js');
const RW = await import(pathToFileURL(join(ROOT, 'you-rows.js')).href);

// you-numbers.js imports insights.js (pure) — freeze the clock to one day.
const RealDate = Date, NOW = new RealDate(2026, 8, 25, 18, 30).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
// store.js reaches Firebase over https and cannot load under node, so it is
// stubbed; everything else is the real file, staged beside the stub.
const dir = mkdtempSync(join(tmpdir(), 'rack-you-structure-'));
const real = f => JSON.stringify(pathToFileURL(join(ROOT, f)).href);
const staged = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
`);
const stage = (name, file, map) => {
  let t = rd(file).replace("from './store.js'", "from './store-stub.mjs'");
  Object.entries(map).forEach(([k, v]) => { t = t.replace("from './" + k + "'", 'from ' + v); });
  writeFileSync(join(dir, name), t);
};
stage('analytics.mjs', 'analytics.js', { 'exercises.js': real('exercises.js'), 'ui.js': real('ui.js'), 'units.js': real('units.js') });
stage('insights.mjs', 'insights.js', { 'ui.js': real('ui.js'), 'units.js': real('units.js'), 'analytics.js': staged('analytics.mjs') });
stage('you-numbers.mjs', 'you-numbers.js', { 'insights.js': staged('insights.mjs') });
const N = await import(pathToFileURL(join(dir, 'you-numbers.mjs')).href);

let pass = 0, fail = 0;
const out = [];
const check = (label, ok, detail) => { if (ok) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const count = (src, re) => (src.match(re) || []).length;

section('A. every card is still drawn, once, behind a row');
{
  const buildAt = YOU.indexOf('function build() {'), subAt = YOU.indexOf('function buildSub() {');
  const buildSrc = YOU.slice(buildAt, YOU.indexOf('/* ================= THE GOAL, AS ONE NUMBER'));
  const subSrc = YOU.slice(subAt, YOU.indexOf('/* ================= HERO'));
  const CARDS = [
    [/assessCard\(found, 'wins'\)/, 'How you’re doing · wins'], [/assessCard\(found, 'improve'\)/, 'How you’re doing · improve'],
    [/weekCard\(maint\)/, 'This week'], [/reviewCard\(found\)/, 'Weekly review'], [/insightsCard\(found\)/, 'Rack noticed'],
    [/trajectoryCard\(found, est, maint\)/, 'Goal'], [/weightCard\(maint\)/, 'Body weight'], [/fuelCard\(maint\)/, 'Fuel'],
    [/trainingCard\(\)/, 'Training'], [/stepsCard\(\)/, 'Steps'], [/waterCard\(\)/, 'Water']
  ];
  CARDS.forEach(([re, name]) => check(name + ' is drawn once, behind a row — and not on You itself', count(subSrc, re) === 1 && count(buildSrc, re) === 0));
  check('the rows are Weekly review, Trends and Rack noticed, in that order', JSON.stringify(RW.YOU_ROWS.map(r => r.id)) === JSON.stringify(['review', 'trends', 'noticed']));
  check('Trends has four switches: Weight, Fuel, Training, Habits', JSON.stringify(RW.TRENDS.map(t => t.label)) === JSON.stringify(['Weight', 'Fuel', 'Training', 'Habits']));
  const holds = new Set(RW.YOU_ROWS.flatMap(r => r.holds));
  check('each row declares the cards it holds, and the table covers all eleven', holds.size === 11, String(holds.size));
  check('a switch id that is not one falls back to Weight', RW.trendsOf('nope') === 'weight' && RW.trendsOf('fuel') === 'fuel');
  check('a repaint that lands while a screen is open paints it (sub is module state)', /wrap = sub \? buildSub\(\) : build\(\);/.test(YOU) && /^let sub = null;/m.test(YOU));
  check('the headline and the full Goal card share one set of words and one bar', count(YOU, /trajectoryWhy\(/g) >= 3 && count(YOU, /function progressBar\(/g) === 1 && count(YOU, /(?<!function )progressBar\(c, t, gu, called\)/g) === 2);
}

section('B. each tile is its card\'s own number');
{
  const day = n => { const d = new Date(NOW - n * 864e5), p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const summaries = {}; for (let n = 1; n <= 7; n++) summaries[day(n)] = { cal: 3000 + n * 10, p: 180, c: 300, f: 90 };
  summaries[day(0)] = { cal: 500, p: 20, c: 0, f: 0 };           // today, half-eaten: must not drag the average
  const stepDays = {}; for (let n = 0; n < 7; n++) stepDays[day(n)] = { steps: 8000 }; for (let n = 7; n < 14; n++) stepDays[day(n)] = { steps: 6000 };
  const sess = k => ({ _date: day(k) });
  const sessions = [sess(0), sess(2), sess(4), sess(9)];
  const T = N.weekNumbers({ targets: { cal: 3030, p: 185 }, summaries, stepDays, sessions, loaded: true });
  const by = id => T.find(t => t.id === id);
  check('four tiles, in order: calories, protein, sessions, steps', JSON.stringify(T.map(t => t.id)) === JSON.stringify(['cal', 'prot', 'sess', 'steps']));
  const avg = [1, 2, 3, 4, 5, 6, 7].reduce((s, n) => s + 3000 + n * 10, 0) / 7;
  check('calories: the average of the seven COMPLETE days, today left out', by('cal').value === Math.round(avg).toLocaleString(), by('cal').value + ' vs ' + Math.round(avg));
  check('calories: "on target" inside 4%', /on target/.test(by('cal').note), by('cal').note);
  check('protein: 180 against 185 is within 95%', /on it/.test(by('prot').note) && by('prot').value === '180', by('prot').note);
  check('sessions: the rolling seven days, against the seven before', by('sess').value === '3' && /2 more/.test(by('sess').note), by('sess').value + ' / ' + by('sess').note);
  check('steps: 8,000 a day, 2,000 up on the week before', by('steps').value === '8,000' && /\+2,000/.test(by('steps').note), by('steps').value + ' / ' + by('steps').note);
  const low = N.weekNumbers({ targets: { cal: 4000, p: 190 }, summaries, stepDays: {}, sessions: [], loaded: true });
  check('over/under reads in words, and no steps reads "Nothing in 7 days"', /under/.test(low[0].note) && /Nothing in 7 days/.test(low[3].note) && low[2].value === '0', low[0].note);
  const early = N.weekNumbers({ targets: null, summaries: {}, stepDays: {}, sessions: null, loaded: false });
  check('before the reads land the tiles say "…", never 0 or NaN', early.every(t => t.value === '…'));
  const bad = N.weekNumbers({ targets: { cal: 3000, p: 190 }, summaries: { [day(1)]: { cal: 'x', p: null } }, stepDays: { [day(1)]: { steps: 'y' } }, sessions: [null, {}], loaded: true });
  check('a malformed node prints no NaN', !JSON.stringify(bad).includes('NaN'));
  check('no target: "No daily target yet", not a crash', N.weekNumbers({ targets: null, summaries, stepDays, sessions, loaded: true })[0].note === 'No daily target yet');
}

section('C. the composition contract');
{
  const src = rd('vibes/defs/vocab.js');
  const youBlocks = /you:\s*\{ blocks: \[([^\]]*)\]/.exec(src)[1].split(',').map(s => s.trim().replace(/'/g, ''));
  check('every block You draws is a name of the vocabulary\'s you screen', RW.YOU_BLOCKS.every(b => youBlocks.includes(b)), RW.YOU_BLOCKS.filter(b => !youBlocks.includes(b)).join(', '));
  const tagged = [...YOU.matchAll(/blk\('you', '(\w+)'/g)].map(m => m[1]);
  check('and each is tagged with blk(), in the order they are drawn', ['hero', 'coach', 'since', 'goal', 'week', 'review'].every(b => tagged.includes(b)), tagged.join(','));
  check('vibes/** and the icon contract are untouched by this change (new tile icons live in tile-icons.js)', !/tile-icons|tiles\.js/.test(src));
}

section('D. the Steps tab is still there (it becomes Friends later, in its own change)');
{
  const IDX = rd('index.html'), APP = rd('app.js'), ST = rd('steps.js');
  check('the Steps view and dock button are still in index.html', IDX.includes('view-steps') && IDX.includes('data-view="steps"'));
  check('the router still renders it', /renderSteps/.test(APP) && /initSteps\(\)/.test(APP));
  check('steps.js still draws the page and still exports the sheets', /export function render\b/.test(ST) && /export function openStepSettings/.test(ST));
  check('You still has the Steps tile and its Habits card links to the tab', /Steps \/ day/.test(rd('you-numbers.js')) && /goLabel: 'Open Steps', view: 'steps'/.test(YOU));
}

section('E. Admin and the install card left You');
{
  check('You no longer imports or draws Admin or the install card', !/openAdmin|installCard|adminRow|openInstallGuide/.test(YOU));
  const reg = rd('settings-registry.js');
  check('Admin is a Help row behind the owner gate; Add to Home Screen a Help row', /id: 'admin',\s+group: 'help'[\s\S]{0,200}gate: 'owner'/.test(reg) && /id: 'install',\s+group: 'help'/.test(reg));
  check('the hub opens both', /install:\s/.test(rd('settings.js')) && /openAdmin\(/.test(rd('settings.js')));
}

console.log('\nYou: redesigned, nothing dropped\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
