#!/usr/bin/env node
//
// Verifier for the page after Finish — workout.js's renderSummary() (v53).
//
//   node tools-check/recap.mjs
//
// Micah, 24 Sep 2026: "we really need to redo the page after you click finish
// … get rid of the %, like I did an amazing workout but the ending said -30%
// which was super discouraging. Showing the statistics of if you are down
// aren't bad but the main headlines should be more encouraging."
//
// So this file holds the recap to four things, on the page as it is drawn:
//
//   THE WIN FIRST.     The big line is finishRead()'s headline — "Great
//                      workout." or "Good work." — the same decision the Coach
//                      card and sheet read, with its true line under it.
//   NO PERCENTAGE.     Not one "%" anywhere on the page, in either unit —
//                      outside the feel card, whose chips and saved line are his
//                      own rating in his own words.
//   LIKE WITH LIKE.    The comparison is against sessions of this one's kind,
//                      by median: a chest day is never divided by leg days. It
//                      is drawn only with two such sessions or more, in two
//                      plain lines, and never leads the page.
//   IN ORDER.          SHIP-V53-PROMPT §5.1, top to bottom.
//
// WHAT THIS RUNS. renderSummary() is lifted verbatim out of ../workout.js — as
// month-erasure.mjs lifts runFinish() — and drawn into a DOM shim with the real
// ui.js, units.js, analytics.js and coach.js behind it. The finish line comes
// from coach.js's finishRead() for real: coach-data.js's coachFinishRead() is
// the one stand-in, and it does exactly what the real one does with a snapshot
// this file controls. rack.css is never loaded, so nothing here is about size.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '', value: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {},
    disabled: false, onclick: null,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      toggle(c, on) { (on === undefined ? !n.classList.contains(c) : on) ? n.classList.add(c) : n.classList.remove(c); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    replaceWith(x) { if (!n.parent) return; const p = n.parent; const i = p.children.indexOf(n); x.parent = p; p.children[i] = x; n.parent = null; },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; },
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); }
  };
  return n;
}
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }
const body = mkEl('body');
globalThis.document = {
  body, createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t),
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null,
  getElementById: () => null
};
globalThis.window = { addEventListener() {} };

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-recap-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
// v54: and coach-volume.js, which coach.js imports (the staging edit).
const COACH_DEPS = ['coach-prog', 'coach-overlap', 'coach-fuel', 'coach-ready', 'coach-build', 'coach-live', 'coach-volume'];
COACH_DEPS.concat(['coach']).forEach(name => writeFileSync(join(dir, name + '.mjs'), src(name + '.js')
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (n === 'analytics' || COACH_DEPS.includes(n) || n === 'coach'
    ? at(n + '.mjs') : real(n + '.js')))));
const C = await import(JSON.parse(at('coach.mjs')));
const A = await import(JSON.parse(at('analytics.mjs')));
const UI = await import(JSON.parse(real('ui.js')));
const U = await import(JSON.parse(real('units.js')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));

/* ---------- lifting the real renderSummary() out of workout.js ----------
   Top-level functions there close with a `}` in column one — the grammar
   month-erasure.mjs relies on too. A name that is gone throws, rather than
   quietly testing nothing. */
const WSRC = src('workout.js');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(WSRC);
  if (!m) throw new Error('recap: ' + name + '() is gone from workout.js — the recap or this check is stale');
  const end = WSRC.indexOf('\n}\n', m.index);
  return WSRC.slice(m.index, end + 2);
}
// renderSummary and whatever top-level helpers it calls that live in
// workout.js (the feel card, from Phase D, when it exists).
const LIFTED = ['renderSummary'].concat(['feelCard', 'saveFeel'].filter(n =>
  new RegExp('^(?:async )?function ' + n + '\\(', 'm').test(WSRC)));
const state = { input: null, u: 'lb', writes: [], marks: [], renders: 0, settings: null };
const STUBS = {
  el: UI.el, noteEl: UI.noteEl, toast: () => {}, fmtDateFull: UI.fmtDateFull, fmtDuration: UI.fmtDuration,
  todayKey: d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); },
  wu: () => state.u,
  groupColor: A.groupColor, prDetail: A.prDetail, isWorking: A.isWorking, sessionReps: A.sessionReps,
  sameKindComparison: A.sameKindComparison, normFeel: A.normFeel, FEEL_STRENGTH: A.FEEL_STRENGTH,
  // v55, on purpose: "What you did" draws a drop set as one group (setsText).
  setsText: A.setsText,
  wOut: U.wOut, fmtSetLoad: U.fmtSetLoad, fmtVol: U.fmtVol, unitW: U.unitW,
  // coach-data.js's coachFinishRead(), on this file's snapshot: finishRead()
  // on coachInput() — the one thing the real one does.
  coachFinishRead: (rec, extras) => C.finishRead(state.input, rec, extras),
  feelHarder: C.feelHarder, MARK_ASK: C.MARK_ASK, isMuted: C.isMuted, canMark: C.canMark, FEEL_S_WORDS: C.FEEL_S_WORDS,
  invalidate: () => {},
  coachSettings: () => state.settings || (state.input && state.input.settings) || {},
  markSession: (s, r) => { state.marks.push([s, r]); return Promise.resolve(true); },
  write: (p, v) => { state.writes.push([p, v]); return Promise.resolve(); },
  render: () => { state.renders++; },
  saveSessionAsRoutine: () => {}, refreshStats: async () => {}, openStats: async () => {},
  refreshCoachSessions: () => Promise.resolve(true), monthKey: () => '', LS: { get: (k, f) => f, set() {}, del() {} }
};
const NAMES = Object.keys(STUBS);
const make = () => new Function(...NAMES, `
let summary = null, monthCache = {};
${LIFTED.map(lift).join('\n')}
return { draw: s => { summary = s; return renderSummary(); }, summary: () => summary, cache: () => monthCache,
         setCache: c => { monthCache = c; } };`)(...NAMES.map(k => STUBS[k]));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(' | ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');
const texts = n => [n].concat(walk(n)).map(x => x.textContent).filter(Boolean);
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const eyebrows = n => find(n, 'eyebrow').map(x => x.textContent);

/* ================= FIXTURES ================= */
const DAY = 864e5;
const NOW = Date.now();
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const xN = (n, w, r, type) => Array.from({ length: n }, () => set(w, r, type));
let sid = 0;
const rec = (ago, rows, extra) => {
  const t = NOW - ago * DAY - 2 * 3600e3;
  const exercises = rows.map(([id, sets]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets }));
  return { id: 'r' + (++sid), name: 'Push day', startedAt: t, endedAt: t + 3600e3, durationSec: 3600, _date: key(t),
           volume: Math.round(exercises.reduce((a, e) => a + e.sets.filter(s => s.type !== 'W').reduce((b, s) => b + parseFloat(s.w) * parseInt(s.r, 10), 0), 0)),
           groups: [...new Set(exercises.map(e => e.group))], exercises, ...(extra || {}) };
};
const CHEST = ago => rec(ago, [['barbell-bench-press', xN(4, 185, 5)], ['incline-dumbbell-bench-press', xN(4, 60, 10)], ['triceps-pushdown-rope', xN(3, 50, 12)]]);
const LEGS = ago => rec(ago, [['back-squat-high-bar', xN(5, 275, 5)], ['leg-press', xN(4, 400, 10)], ['leg-extension', xN(4, 110, 12)]]);
const PULLUPS = (ago, reps) => rec(ago, [['pull-up', xN(3, 0, reps || 10)]]);
const inputOf = (sessions, u) => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: u || 'lb', log: 'readable', sessions, lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} }
});
// A recap, drawn the way runFinish() leaves it: the records worked out against
// every earlier session, and the Coach snapshot not yet holding this one.
function draw(prior, today, u) {
  state.u = u || 'lb';
  state.input = inputOf(prior.slice().sort((a, b) => a.startedAt - b.startedAt), state.u);
  const found = A.detectPRs(today, prior);
  const R = make();
  const page = R.draw({ record: today, prs: found.prs, firsts: found.firsts,
                        milestones: A.sessionMilestones(today, prior, state.u), prior });
  return { page, R, fin: C.finishRead(state.input, today, { prs: found.prs, firsts: found.firsts, milestones: A.sessionMilestones(today, prior, state.u) }) };
}
// Everything on the page but the feel card, which is his own rating in his own words.
const outsideFeel = page => { const skip = new Set(find(page, 'feel-card').flatMap(f => [f].concat(walk(f))));
  return [page].concat(walk(page)).filter(x => !skip.has(x)).map(x => x.textContent).filter(Boolean); };

/* ================= A. THE WIN FIRST ================= */
section('A. the hero is finishRead()’s headline, with its line under it, and then the session’s name and date');
{
  // A chest day that set a record: "Great workout."
  const prior = [7, 14, 21, 28].map(CHEST).concat([10, 17].map(LEGS));
  const today = rec(0, [['barbell-bench-press', xN(4, 195, 5)], ['incline-dumbbell-bench-press', xN(4, 60, 10)], ['triceps-pushdown-rope', xN(3, 50, 12)]]);
  const { page, fin } = draw(prior, today);
  const hero = find(page, 'summary-hero')[0];
  const h1 = walk(hero).find(x => x.tag === 'h1');
  check('the eyebrow reads "Session complete", and the big line is the finish line’s headline: ' + (h1 && h1.textContent),
        eyebrows(hero)[0] === 'Session complete' && h1 && h1.textContent === fin.headline && fin.headline === 'Great workout.');
  check('its line under it — ' + fin.line, (find(hero, 'summary-line')[0] || {}).textContent === fin.line);
  check('then the session’s name and date, smaller', /^Push day  ·  /.test((find(hero, 'summary-date')[0] || {}).textContent || ''),
        (find(hero, 'summary-date')[0] || {}).textContent);
  // A session with nothing to celebrate but itself: "Good work."
  const same = CHEST(0);
  const g = draw([7, 14, 21, 28].map(CHEST), same);
  const gh = walk(find(g.page, 'summary-hero')[0]).find(x => x.tag === 'h1');
  check('and on an ordinary day it is warm and true: ' + g.fin.headline + ' ' + g.fin.line,
        gh.textContent === 'Good work.' && g.fin.headline === 'Good work.' && /done: 11 sets\.$/.test(g.fin.line), g.fin.line);
}

/* ================= B. NO PERCENTAGE ================= */
section('B. not one "%" on the page, in either unit — outside his own rating');
{
  const scenes = [
    ['a record day', [7, 14, 21, 28].map(CHEST), rec(0, [['barbell-bench-press', xN(4, 195, 5)]])],
    ['a day down on his chest days', [7, 14, 21, 28].map(CHEST), rec(0, [['barbell-bench-press', xN(2, 135, 5)], ['incline-dumbbell-bench-press', xN(2, 40, 8)]])],
    ['a chest day after leg days', [2, 4, 6, 8].map(LEGS).concat([9, 16].map(CHEST)), CHEST(0)],
    ['pull-ups, bodyweight only', [3, 6, 9].map(a => PULLUPS(a, 8)), PULLUPS(0, 12)],
    ['a first session', [], CHEST(0)]
  ];
  const bad = [];
  scenes.forEach(([n, prior, today]) => ['lb', 'kg'].forEach(u => {
    const { page } = draw(prior, today, u);
    outsideFeel(page).filter(t => /%/.test(t)).forEach(t => bad.push(n + ' [' + u + ']: ' + t));
    if (/Against your last 4 weeks/.test(texts(page).join(' '))) bad.push(n + ': the old card');
  }));
  check('five recaps, both units: no percentage, and the old "Against your last 4 weeks" card is gone', !bad.length, list(bad));
  const down = draw(scenes[1][1], scenes[1][2]);
  const hero = find(down.page, 'summary-hero')[0];
  check('a smaller day than usual still leads warm, with nothing that stings in the headline or its line',
        !/(%|\bdown\b|\bunder\b|\bbelow\b|\blighter\b|\bonly\b|\bstill\b|!)/i.test(texts(hero).join(' ')), texts(hero).join(' / '));
}

/* ================= C. LIKE WITH LIKE ================= */
section('C. "Compared with sessions like this" — the same kind of day, by median, in two plain lines');
{
  const card = page => walk(page).find(x => x.classList.contains('summary-like')) || null;
  const rows = page => find(card(page) || mkEl('x'), 'summary-like-row').map(x => x.textContent);
  // Chest days of 11 sets at three volumes, leg days far heavier in between.
  const prior = [LEGS(2), LEGS(4), LEGS(6), CHEST(7), LEGS(9),
                 rec(14, [['barbell-bench-press', xN(4, 175, 5)], ['incline-dumbbell-bench-press', xN(4, 55, 10)], ['triceps-pushdown-rope', xN(3, 45, 12)]]),
                 rec(21, [['barbell-bench-press', xN(4, 195, 5)], ['incline-dumbbell-bench-press', xN(4, 65, 10)], ['triceps-pushdown-rope', xN(3, 55, 12)]])];
  const today = CHEST(0);
  const { page } = draw(prior, today);
  const chest = prior.filter(s => s.exercises[0].exId === 'barbell-bench-press').map(s => s.volume).sort((a, b) => a - b);
  const med = chest[1];
  const got = A.sameKindComparison(today, prior, NOW);
  check('it compares a chest day only with chest-type days — three of them, the leg days out',
        !!got && got.n === 3 && got.label === 'chest and arms days', JSON.stringify(got));
  check('against their median: ' + U.fmtVol(med, 'lb') + ' lb, never the mean with a leg day in it', got.usualVolume === med && got.usualSets === 11,
        JSON.stringify(got));
  check('drawn under its eyebrow as two plain lines, with the unit on the volume',
        eyebrows(card(page) || mkEl('x'))[0] === 'Compared with sessions like this' && rows(page).length === 2 &&
        rows(page)[0] === 'Volume: ' + U.fmtVol(today.volume, 'lb') + ' lb today, against a usual ' + U.fmtVol(med, 'lb') + ' on chest and arms days (3 sessions).' &&
        rows(page)[1] === 'Sets: 11 today, against a usual 11.', list(rows(page)));
  check('in body text: no colour on any of it, and no big number', !!card(page) && [card(page)].concat(walk(card(page))).every(x => !x.style.color && !x.classList.contains('load-num')));
  // On kilos, the same card in kilos.
  const kg = draw(prior, today, 'kg');
  check('on kilos, the volume in kilos', rows(kg.page)[0] === 'Volume: ' + U.fmtVol(today.volume, 'kg') + ' kg today, against a usual ' + U.fmtVol(med, 'kg') + ' on chest and arms days (3 sessions).',
        list(rows(kg.page)));
  // Only with two or more like it.
  const one = draw([LEGS(2), LEGS(4), CHEST(7)], today);
  check('with one chest day behind it, no card', !card(one.page));
  const none = draw([LEGS(2), LEGS(4), LEGS(6)], today);
  check('with none — only leg days — no card at all', !card(none.page));
  // A bodyweight session compares its sets.
  const bw = draw([3, 6, 9].map(a => PULLUPS(a, 8)), rec(0, [['pull-up', xN(4, 0, 12)]]));
  check('a bodyweight-only session compares its working sets, never a volume it never attempted',
        rows(bw.page).length === 1 && rows(bw.page)[0] === 'Sets: 4 today, against a usual 3 on back days (3 sessions).' &&
        !/Volume/.test(rows(bw.page).join(' ')), list(rows(bw.page)));
}

/* ================= D. IN ORDER ================= */
section('D. the order, top to bottom — the win, how it felt, the wins, the tiles, what you did, the comparison, the buttons');
{
  const prior = [7, 14, 21, 28].map(CHEST);
  const today = rec(0, [['barbell-bench-press', xN(5, 195, 5)], ['incline-dumbbell-bench-press', xN(4, 60, 10)], ['triceps-pushdown-rope', xN(3, 50, 12)],
                        ['cable-crunch', xN(3, 60, 15)]]);
  const { page } = draw(prior, today);
  const top = page.children.map(c => c.classList.contains('summary-hero') ? 'hero'
    : c.classList.contains('feel-card') ? 'feel'
    : c.classList.contains('pr-card') ? 'records'
    : c.classList.contains('stat-row') ? 'tiles'
    : c.classList.contains('summary-like') ? 'compared'
    : c.tag === 'button' ? 'button:' + c.textContent
    : (eyebrows(c)[0] || c.className));
  const want = ['hero', 'feel', 'records', 'Session milestones', 'First time logged', 'tiles', 'What you did',
    'compared', 'button:Done', 'button:Save as routine', 'button:See statistics'];
  check('§5.1’s order, exactly: ' + top.join(' → '), JSON.stringify(top) === JSON.stringify(want), JSON.stringify(want));
  check('the comparison never leads the page — it is below "What you did"', top.indexOf('compared') > top.indexOf('What you did'));
  // The Feel switch off: the same page without the check-in, nothing else moved.
  state.settings = { v: 1, mute: { feel: true }, answers: {}, asked: {} };
  const off = draw(prior, today).page;
  state.settings = null;
  check('with "After a workout: how it felt" switched off, the check-in is never drawn and nothing else moves',
        !find(off, 'feel-card').length && off.children.length === page.children.length - 1);
  // The one place a "%" may be: his own strength chips, in his words.
  const feelTexts = find(page, 'feel-card').flatMap(f => texts(f));
  check('and the check-in is where his own "%" lives — "80% or less" … "120%+" — which B leaves to him',
        ['80% or less', '90%', '100%', '110%', '120%+'].every(t => feelTexts.includes(t)), list(feelTexts));
}

/* ================= E. A DROP SET (v55) =================
   On purpose: SHIP-V55-PROMPT §3 — "What you did" draws a drop set as one
   group. tools-check/drop-sets.mjs holds the rest. */
section('E. v55 — a drop set in "What you did" is one group, "185×8 → 135×6 → 95×5"');
{
  const D = (w, r, dp) => ({ ...set(w, r, 'D'), ...(dp ? { dp: 1 } : null) });
  const today = rec(0, [['barbell-bench-press', [set(185, 8), set(185, 8), D(185, 8), D(135, 6, true), D(95, 5, true), D(185, 7), D(135, 5, true)]],
                        ['triceps-pushdown-rope', [set(50, 12), set(50, 12, 'F'), set(30, 12, 'D')]]]);
  const { page } = draw([7, 14, 21, 28].map(CHEST), today);
  const card = page.children.find(c => eyebrows(c)[0] === 'What you did');
  const lines = find(card || mkEl('x'), 'day-ex-sets').map(x => x.textContent);
  check('two drop sets stacked read as two groups, the type letter only outside one: ' + lines[0],
        lines[0] === '185×8   185×8   185×8 → 135×6 → 95×5   185×7 → 135×5', list(lines));
  check('and a D logged the way every one before v55 was — no drops under it — reads exactly as it did: ' + lines[1],
        lines[1] === '50×12   50×12F   30×12D', list(lines));
}

console.log('\nthe first thing after a workout is the win, and there is no percentage on the page\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
