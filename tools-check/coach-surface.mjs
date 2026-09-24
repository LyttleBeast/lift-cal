#!/usr/bin/env node
//
// Verifier for the two surfaces Coach is actually seen on.
//
//   node tools-check/coach-surface.mjs
//
// Every other file in here drives the ENGINE, and the engine was right about
// both of the defects this one exists for. coach.js already knew which findings
// a basic account may see, and it already knew Train wants a training-first set
// of topics. The card and the sheet simply never asked it:
//
//   THE TIER GATE WAS COSMETIC. The padlock drew correctly in the card's corner
//     from the first day and openCoachSheet() never once read `c.pro`, so a
//     basic account tapped the lock and got everything behind it. No amount of
//     asking the engine what a free account is entitled to finds that, because
//     the engine's answer was never the wrong one.
//   THE SHEET DID NOT KNOW WHICH CARD OPENED IT. Both surfaces built their
//     buttons from the same three topics, so the first thing under somebody's
//     thumb on the way into a workout was "How's my food?".
//
// Both were found by opening the live site. Neither was findable by reading
// coach.js, and that is the whole argument for this file: the wiring between a
// correct engine and a drawn screen is a surface of its own, and it needs a
// fence of its own.
//
// So coach-ui.js is driven for real, against a DOM shim — the trick
// refused-write.mjs plays on the browser, played on the document instead. The
// card is built, its onclick is called, the sheet lands in a fake body, and
// every button in it is enumerated and tapped. Nothing below holds a copy of a
// topic label, a Pro benefit or a route id: every expectation is read back out
// of the engine, so a table that changes moves both sides of the comparison at
// once and this file keeps meaning what it says.
//
// The coach-data stub is GENERATED from coach-ui.js's own import statement for
// the same reason. A hand-written export list dies with "does not provide an
// export named" the first time the card reaches for one more thing, which reads
// like a broken verifier rather than like the fence it is.
//
// WHAT IT CANNOT CHECK, and does not pretend to: there is no box model in here
// and rack.css is never loaded, so the card's fixed height and the 44-pixel tap
// targets are out of reach. This file proves what is in the card and what is
// not, never how large any of it is. That stays a thing to look at on a phone.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= THE FAKE DOCUMENT =================
   Enough of one for ui.js's el() and sheet() and for the two SVG marks, and
   not one property more. `tag` and `parent` are the two additions a browser
   would not need: they are what lets the checks below enumerate a sheet's
   buttons and tell an element that is still on screen from one that has been
   removed. */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '',
    children: [], parent: null, attrs: {}, style: {},
    disabled: false, onclick: null, scrollTop: 0, scrollHeight: 0,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      toggle(c, on) { on ? n.classList.add(c) : n.classList.remove(c); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; },
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); }
  };
  return n;
}
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }

const body = mkEl('body');
globalThis.document = {
  body,
  createElement: t => mkEl(t),
  createElementNS: (_ns, t) => mkEl(t),
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null,
  getElementById: () => null
};
globalThis.window = { addEventListener() {} };

/* ================= THE FIXTURE =================
   One account, driven every way. Fixed epoch, every session an offset from it,
   so this file answers the same in Auckland at 2 AM as in New York at noon. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench: { group: 'chest', equipment: 'barbell' }, row: { group: 'back', equipment: 'barbell' },
  squat: { group: 'legs', equipment: 'barbell' }, press: { group: 'shoulders', equipment: 'barbell' },
  curl:  { group: 'arms', equipment: 'dumbbell' }
};
const sets = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows, tag) => ({
  id: 's' + ago + (tag || ''), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, n, w, r]) => ({
    exId: ex, name: ex, group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(n, w, r || 5)
  }))
});
const training = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) training.push(sess(w * 7 + 2, [['bench', 3, 185 + w], ['press', 3, 95, 8]], 'p'));
  training.push(sess(w * 7 + 4, [['row', 3, 155, 8], ['curl', 3, 40, 10]], 'r'));
  training.push(sess(w * 7 + 6, [['squat', 3, 245]], 'l'));
}
const summaries = {};
for (let i = 1; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2450, p: 110, c: 310, f: 95 };
summaries[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };

const BASE = Object.freeze({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: training.slice().sort((a, b) => a.startedAt - b.startedAt),
  lib: LIB, routines: [], live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true, summaries,
  steps: { days: Object.fromEntries([0, 1, 2, 3, 4].map(i => [key(NOW - i * DAY), { steps: i ? 9100 : 4200 }])) },
  weight: { latestLb: 186.4, latestAt: NOW - 9 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 },
  settings: { v: 1, mute: {}, answers: {}, asked: {} }
});

/* The same account with no stated goal direction, which is the one state in
   which Coach has earned a question of its own. The free sheet's buttons are
   enumerated against THIS one, because "the only controls are Close and the
   question row" is a claim about a sheet that has a question row in it. */
const QUESTIONING = {
  ...BASE,
  targets: { cal: 2300, p: 210, f: 74 },
  weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null }
};

/* ================= THE STUB COACH-DATA =================
   coach-data.js is the impure half — the reads, the clock, the entitlement
   gate — so the card cannot be driven with the real one. What stands in for it
   is a dispatcher into `state` below, and its export list is PARSED out of
   coach-ui.js rather than typed: the list the card imports is the list that
   exists, always, without anybody remembering to come back here. */
const UI_SRC = src('coach-ui.js');
const IMPORTED = (UI_SRC.match(/import\s*\{([^}]*)\}\s*from\s*'\.\/coach-data\.js'/) || [, ''])[1]
  .split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);

/* THE HALF-LOADED SNAPSHOT IS A REAL MOMENT, not a hypothetical, and the stub
   has to model it or two of the checks below are about a state that never
   happens. The card paints as soon as the workouts read settles; food, weight,
   steps and targets are still at coach-data.js's initial values right then, and
   every rule that needs one of them has null facts and stays silent. */
const logPhase = i => ({
  ...i,
  targets: null, targetsSet: null, summaries: {}, routines: [], steps: { days: {} },
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }
});

const state = { logKnown: true, ready: true, pro: true, input: BASE, calls: [], unknown: [] };
const IMPL = {
  coachLogKnown:      () => state.logKnown,
  coachReady:         () => state.ready,
  coachSettingsKnown: () => true,
  coachSettings:      () => state.input.settings,
  /* The card hands coachInput() `{ live: bool }` and coach-data.js turns it
     into `live: { active }`. This stub used to spread the flag straight in,
     which the engine reads as NO session — so a live sheet was never really
     driven here until the builder needed one. It mirrors the real contract. */
  coachInput:         extra => ({ ...(state.ready ? state.input : logPhase(state.input)),
                                  live: { active: !!(extra && extra.live) }, tier: { pro: state.pro } }),
  liveSessionOnDevice: () => false,
  coachPro:           () => state.pro,
  rememberGreeting:   id => { state.calls.push(['rememberGreeting', id]); },
  setCategoryMuted:   (id, m) => { state.calls.push(['setCategoryMuted', id, m]); return Promise.resolve(true); },
  answerQuestion:     (id, v) => { state.calls.push(['answerQuestion', id, v]); return Promise.resolve(true); },
  markAsked:          id => { state.calls.push(['markAsked', id]); return Promise.resolve(true); }
};
globalThis.__coachData = (name, args) => {
  if (IMPL[name]) return IMPL[name](...args);
  // An import with nothing behind it means the shim is no longer standing in
  // for the real module, so it is reported rather than quietly guessed at.
  if (!state.unknown.includes(name)) state.unknown.push(name);
  return Promise.resolve(true);
};

/* ================= STAGING =================
   coach.js against a stubbed store, exactly as coach-rank.mjs stages it, then
   coach-ui.js on top of that and on the stub above. */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-surface-'));
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
/* coach-goal.js and coach-prog.js — v48's targets — are staged the same way:
   coach-build.js imports coach-prog.js, which takes the same session math
   through the stub, and coach-goal.js imports nothing at all. */
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-build.js, the workout builder, is staged the same way: coach.js
   imports it, and it takes analytics.js's session math through the same stub. */
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-overlap.js — v49's stage two, the plateau-or-cut call — is staged the
   same way: coach.js imports it, and it reads coach-prog.js's baselines and
   the same session math through the stub. */
writeFileSync(join(dir, 'coach-overlap.mjs'), src('coach-overlap.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
writeFileSync(join(dir, 'coach-data-stub.mjs'),
  IMPORTED.map(n => `export function ${n}(...a) { return globalThis.__coachData('${n}', a); }`).join('\n') + '\n');
writeFileSync(join(dir, 'coach-ui.mjs'), UI_SRC
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach.mjs')).href))
  .replace("from './coach-data.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-data-stub.mjs')).href)));

const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const UI_URL = pathToFileURL(join(dir, 'coach-ui.mjs')).href;
/* coach-ui.js pins the greeting in module state for the length of an app open,
   which is the point of section D — so an "open" here is a fresh instance of
   the module rather than a fresh call into it. */
let opens = 0;
const freshUI = () => import(UI_URL + '?open=' + (++opens));
const UI = await freshUI();

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(' | ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');

/* ---------- driving it ---------- */
const texts = n => [n].concat(walk(n)).map(x => x.textContent).filter(Boolean);
const textOf = n => texts(n).join(' ');
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const buttonsIn = n => walk(n).filter(x => x.tag === 'button');
const chipsIn = n => buttonsIn(n).filter(x => x.classList.contains('coach-chip'));
const J_ = v => JSON.stringify(v);

// A tap on the card, and whatever it put on the screen.
function open(ui, opts) {
  body.children.length = 0;
  const card = ui.coachCard(opts || {});
  card.onclick();
  return { card, sh: body.children.find(x => x.classList.contains('sheet')) || null };
}
// The Settings door: no card, no opts, straight into the sheet.
function openBare(ui, opts) {
  body.children.length = 0;
  opts === undefined ? ui.openCoachSheet() : ui.openCoachSheet(opts);
  return body.children.find(x => x.classList.contains('sheet')) || null;
}

/* Every label that IS a topic, whichever surface offers it. The tier checks ask
   whether a sheet is showing topics at all, and this is how they recognise one
   without a copy of the list. */
const TOPIC_LABELS = C.TOPICS.concat(C.TRAIN_TOPICS).map(t => t.label);
const TOPIC_ID = Object.fromEntries(C.TOPICS.concat(C.TRAIN_TOPICS).map(t => [t.label, t.id]));
const topicChipsIn = sh => chipsIn(sh).map(b => b.textContent).filter(l => TOPIC_LABELS.includes(l));
const engine = input => C.coach({ ...input, tier: { pro: state.pro } });

check('the coach-data stub answers everything coach-ui.js imports',
      !state.unknown.length && IMPORTED.length >= 5, list(state.unknown) || IMPORTED.length + ' imports');

/* ================= A. THE TIER GATE ================= */
section('A. the lock in the corner now means something behind it');
{
  state.input = QUESTIONING;

  state.pro = false;
  const free = engine(QUESTIONING);
  const freeSheet = open(UI, { go() {} }).sh;
  check('a basic account gets a sheet at all — the gate hides topics, not Coach',
        !!freeSheet && !!find(freeSheet, 'coach-thread').length);

  check('and NOT ONE topic button in it',
        !topicChipsIn(freeSheet).length, list(topicChipsIn(freeSheet)));

  const panel = find(freeSheet, 'coach-bub').filter(b => b.classList.contains('pro'));
  check('what stands where the topics were is the Pro panel', panel.length === 1, String(panel.length));

  // The free half is still delivered. A gate that leaves somebody looking at
  // nothing is not a tier, it is a broken screen.
  const bubbles = find(freeSheet, 'coach-bub-t').map(b => b.textContent);
  check('the one free finding is still the first thing in the sheet',
        bubbles.length > 0 && bubbles[0] === free.you.text, bubbles[0]);
  check('and it is a real finding rather than a lock standing in for one',
        free.you.state === 'finding', free.you.state + ' ' + free.you.id);

  /* THE PANEL IS DERIVED. PRO_ADDS comes off the intent table's own tiers, so a
     benefit that silently stops being listed fails here rather than going
     quietly untrue on somebody's screen. */
  const panelText = textOf(panel[0] || mkEl('div'));
  const missing = C.PRO_ADDS.filter(a => !panelText.includes(a.label));
  check('the panel names every category Pro adds, straight out of the engine',
        C.PRO_ADDS.length >= 3 && !missing.length, list(missing.map(a => a.label)));
  /* The wording is free to change; the fact is not. Rack is invite-only and
     there is no payment path, so a panel that stops saying so is a panel that
     has started implying one. */
  check('and it says plainly that there is nothing to buy',
        /not on sale|nothing to buy|invite-only|not for sale/i.test(panelText));

  /* NO PURCHASE FLOW, and this is the check that keeps the seam honest. Phase
     three brings RevenueCat; until it does, a button that goes nowhere turns a
     clear boundary into a broken feature. */
  const qLabels = free.question ? free.question.options.map(o => o.label) : [];
  check('the fixture put Coach’s own question in the sheet, so the question row is really here',
        qLabels.length >= 2, list(qLabels));
  const btns = buttonsIn(freeSheet);
  const sellish = btns.filter(b =>
    /upgrade|buy|subscribe|purchase|\$|price|trial/i.test(b.textContent + ' ' + (b.getAttribute('aria-label') || '')));
  check('not one button in the sheet sells anything', !sellish.length, list(sellish.map(b => b.textContent)));

  const others = btns.filter(b => !qLabels.includes(b.textContent));
  check('and beyond the question row there is exactly one control',
        others.length === 1, list(btns.map(b => b.textContent)));
  // Which one it is, proved by using it rather than by reading its label: it
  // dismisses the sheet. Nothing else in here is allowed to be interactive.
  if (others.length === 1) {
    others[0].onclick();
    check('and that control closes the sheet — it is the way out, not a way to pay',
          !body.children.some(x => x.classList.contains('sheet')), others[0].textContent);
  } else {
    check('and that control closes the sheet — it is the way out, not a way to pay', false, 'no single control');
  }

  /* THE OTHER DIRECTION. A gate that hid everything from everybody would pass
     every check above. */
  state.pro = true;
  const proSheet = open(UI, { go() {} }).sh;
  const proTopics = topicChipsIn(proSheet);
  check('a Pro account on the same log DOES get the topics',
        proTopics.length === engine(QUESTIONING).topicsFor('you').length && proTopics.length > 0,
        list(proTopics));
  check('and gets no Pro panel — nobody is sold what they already have',
        !find(proSheet, 'coach-bub').some(b => b.classList.contains('pro')));

  /* Settings → Ask Coach something calls this with no argument at all. It is
     the one caller with no card behind it, and it must land on the general
     set rather than on a crash. */
  let threw = null;
  let bare = null;
  try { bare = openBare(UI, undefined); } catch (e) { threw = String((e && e.message) || e); }
  check('openCoachSheet() with no opts at all does not throw', !threw, threw || '');
  check('and the Settings door opens on the general You set',
        !!bare && topicChipsIn(bare).join(',') === engine(QUESTIONING).topicsFor('you').map(t => t.label).join(','),
        bare ? list(topicChipsIn(bare)) : 'no sheet');
}

/* ================= B. WHICH CARD OPENED IT ================= */
section('B. the sheet takes its questions from the card that opened it');
{
  state.input = BASE;
  state.pro = true;
  const c = engine(BASE);
  const youSet   = c.topicsFor('you').map(t => t.label);
  const trainSet = c.topicsFor('train').map(t => t.label);

  const youSheet   = open(UI, { go() {} }).sh;
  const trainSheet = open(UI, { tight: true, live: false }).sh;

  check('the You card’s sheet offers the general set',
        topicChipsIn(youSheet).join(',') === youSet.join(','), list(topicChipsIn(youSheet)));
  check('the Train card’s sheet offers the training set',
        topicChipsIn(trainSheet).join(',') === trainSet.join(','), list(topicChipsIn(trainSheet)));
  /* The two checks that catch a scoping function ignoring its argument. Both of
     the ones above pass on an engine that hands one set to everybody, because
     both sides of those comparisons come from the same call. These do not: this
     log answers all three of Train's promotions, so nothing general belongs in
     that sheet. */
  check('and the two sheets are not showing the same three buttons',
        topicChipsIn(youSheet).join(',') !== topicChipsIn(trainSheet).join(','),
        list(topicChipsIn(trainSheet)));
  check('every one of Train’s buttons comes from Train’s own table, not the general one',
        topicChipsIn(trainSheet).length > 0 &&
        topicChipsIn(trainSheet).every(l => C.TRAIN_TOPICS.some(t => t.label === l)),
        list(topicChipsIn(trainSheet)));
  check('nothing about food or weight is under the thumb on the way into a workout',
        !topicChipsIn(trainSheet).some(l => /food|weight|eat|calorie|protein/i.test(l)),
        list(topicChipsIn(trainSheet)));

  // Every promotion is a route that already existed. A button with no rule
  // behind it is not constructible, and this is where that is proved from the
  // drawn sheet rather than from the table.
  const trainIds = topicChipsIn(trainSheet).map(l => TOPIC_ID[l]);
  check('every button in the Train sheet is an id the router already answers',
        trainIds.length > 0 && trainIds.every(id => C.ROUTE_IDS.includes(id)), list(trainIds));

  // And each one, tapped, says something. A fresh sheet per tap, because a
  // question already asked is never offered twice in one sitting.
  const dead = [];
  const stuck = [];
  trainIds.forEach(id => {
    const sh = open(UI, { tight: true, live: false }).sh;
    const chip = chipsIn(sh).find(b => TOPIC_ID[b.textContent] === id);
    chip.onclick();
    /* The answer is the first Coach bubble after his question. v49's answers
       can follow it with more — one bubble per lift under "How are my lifts
       moving?", the unseen line under "Good day for a record?" — so the last
       bubble is no longer the answer (updated deliberately, v49). */
    const bubs = find(sh, 'coach-bub');
    const asked = bubs.map(b => b.classList.contains('you')).lastIndexOf(true);
    const said = bubs.slice(asked + 1).find(b => b.classList.contains('coach'));
    const text = said ? (find(said, 'coach-bub-t')[0] || {}).textContent : '';
    if (!text || /^Nothing to say/.test(text) || text !== c.ask(id).text) dead.push(id + ': ' + text);
    // A tap that empties the sheet is a dead end: there has to be a way back to
    // the other questions, every time.
    if (!chipsIn(sh).length) stuck.push(id);
  });
  check('every Train button produces the engine’s real answer, not a “Nothing to say” fallback',
        !dead.length, list(dead));
  check('and every tap leaves a way back — the follow-up row is never empty', !stuck.length, list(stuck));

  /* No placeholder for anything. The builder is real now (section E), and a
     chip for anything else still to come would be a promise the sheet cannot
     keep. */
  const everyChip = chipsIn(youSheet).concat(chipsIn(trainSheet)).map(b => b.textContent);
  check('and no button anywhere promises something that is not built yet',
        !everyChip.some(l => /coming soon|not yet|soon/i.test(l)), list(everyChip));
}

/* ================= C. THE CARD ITSELF ================= */
section('C. the card says only what it knows yet');
{
  state.input = BASE;

  state.pro = false;
  state.logKnown = false;
  state.ready = false;
  const skeleton = UI.coachCard({});
  /* No lock while the log is still coming. Guessing one flashes the wrong tier
     for as long as the reads take, and the open padlock is the reassuring half
     to get wrong. */
  check('the skeleton draws no lock at all — a guessed tier is worse than none',
        !find(skeleton, 'coach-lock').length);
  check('and it cannot be tapped into a sheet it has no answer for', skeleton.disabled === true);

  /* THE COUNT WAITS FOR THE WHOLE SNAPSHOT. Three of the Pro findings read food
     and weight, so at the log phase it is genuinely "at least N" — and a number
     that goes UP a moment after somebody read it makes the rest of the card
     harder to believe. */
  state.logKnown = true;
  const half = UI.coachCard({});
  const halfRow = (find(half, 'coach-go-q')[0] || {}).textContent || '';
  check('a free card mid-load does not quote a Pro count it may still revise',
        !/\bPro\b/.test(halfRow), halfRow);
  check('and it is tappable by then — the log is the read that lets Coach speak',
        half.disabled !== true);

  state.ready = true;
  const loaded = UI.coachCard({});
  const fullRow = (find(loaded, 'coach-go-q')[0] || {}).textContent || '';
  const locked = engine(BASE).lockedCount;
  check('and once everything has landed it says exactly how much is behind the lock',
        locked > 0 && /\bPro\b/.test(fullRow) && fullRow.includes(String(locked)),
        fullRow + ' (locked ' + locked + ')');
  // And the other direction, on the same finished snapshot: nobody is told
  // about a lock they do not have.
  state.pro = true;
  const proRow = (find(UI.coachCard({}), 'coach-go-q')[0] || {}).textContent || '';
  check('a Pro card says nothing about a lock, because there is not one',
        !/\bPro\b/.test(proRow), proRow);
}

/* ================= D. ONE GREETING PER APP OPEN ================= */
section('D. the top line does not rewrite itself while somebody is reading it');
{
  /* The greeting is chosen from a pool whose membership depends on which reads
     have landed, so the honest answer genuinely differs between the log paint
     and the full one. coach-ui.js pins the first line it showed for the rest of
     the app open, and a fresh module instance is what an app open IS here. */
  state.input = BASE;
  state.pro = true;
  state.logKnown = true;

  const ui = await freshUI();
  state.ready = false;
  const first = (find(ui.coachCard({ go() {} }), 'coach-greet')[0] || {}).textContent || '';
  state.ready = true;
  const second = (find(ui.coachCard({ go() {} }), 'coach-greet')[0] || {}).textContent || '';
  check('the card greets at all', first.length > 0, first);
  check('and the second paint of one app open greets identically, later reads or not',
        first === second, first + ' → ' + second);

  // The line that was SHOWN is the line written down, so the next open avoids
  // the one they actually read rather than one that flashed.
  const wrote = state.calls.filter(c => c[0] === 'rememberGreeting').map(c => c[1]);
  check('and the line it remembers is one line, not one per paint',
        wrote.length > 0 && new Set(wrote.slice(-2)).size === 1, list(wrote.slice(-2)));

  // The other direction: a new app open is free to move, and does.
  const nextOpen = await freshUI();
  state.input = { ...BASE, opens: 1 };
  const later = (find(nextOpen.coachCard({ go() {} }), 'coach-greet')[0] || {}).textContent || '';
  check('the NEXT app open is free to say something else, and does', later !== first, later);
}

/* ================= E. "MAKE ME A WORKOUT" ================= */
section('E. the builder’s bubble — offered where it can be kept, nowhere else');
{
  /* The same rule as every Train bubble — no bubble without an answer behind
     it — plus the one the builder adds: no bubble without a way to START what
     it builds. The Train card is handed startWorkout the way Routines is; the
     You card is not, because you.js does not import workout.js (the README's
     invariant, and COACH-REPORT §3.10's bug when it was broken), so the You
     sheet does not offer the builder at all. Drawn, not declared. */
  const BUILD = { ...BASE, libReady: true, hidden: [] };
  const trainOpts = { tight: true, live: false, start() {}, save() {} };
  const MAKE = C.TRAIN_TOPICS.find(t => t.id === 'ask_build').label;
  const labelsIn = sh => chipsIn(sh).map(b => b.textContent);
  const builderIn = sh => labelsIn(sh).filter(l => l === MAKE || l === 'Build it');

  state.input = BUILD; state.pro = true; state.logKnown = true; state.ready = true;
  check('the fixture really builds a proposal', !!engine(BUILD).build({}));
  const pro = open(UI, trainOpts).sh;
  const SHAPE_Q = C.TRAIN_TOPICS.find(t => t.id === 'ask_shape').label;
  check('present on Train, for Pro, with a log that builds — the second bubble, after "What should I train today?"',
        labelsIn(pro)[0] === SHAPE_Q && labelsIn(pro)[1] === MAKE, list(labelsIn(pro)));

  state.pro = false;
  const basic = open(UI, trainOpts).sh;
  check('absent for a Basic account — no bubble, no follow-up', !builderIn(basic).length, list(labelsIn(basic)));
  const panel = find(basic, 'coach-bub').filter(b => b.classList.contains('pro'))[0];
  const buildCat = C.CATEGORIES.find(x => x.id === 'build');
  check('and the Pro panel names the builder — out of PRO_ADDS, with nothing in the panel edited for it',
        C.PRO_ADDS.some(a => a.id === 'build') && !!panel && textOf(panel).includes(buildCat.label),
        panel ? textOf(panel).slice(0, 120) : 'no panel');
  state.pro = true;

  state.input = { ...BUILD, sessions: BUILD.sessions.slice(-5) };
  check('absent with a log too thin to build from', !builderIn(open(UI, trainOpts).sh).length);
  state.input = BUILD;

  check('absent during a live session', !builderIn(open(UI, { ...trainOpts, live: true }).sh).length);

  const you = open(UI, { go() {} }).sh;
  check('absent on the You sheet — the You card has no way to start a workout',
        !builderIn(you).length, list(labelsIn(you)));
  // Tapped through, too: the engine offers "Build it" after the answer that
  // names what to train, and the You sheet must not pass it on.
  const eng = engine(BUILD);
  const viaTopic = eng.ask('topic_train').followups.some(f => f.id === 'ask_build' || f.id === 'ask_build_now');
  const chip = chipsIn(you).find(b => b.textContent === C.TOPICS.find(t => t.id === 'topic_train').label);
  if (chip) chip.onclick();
  check('including as a follow-up the engine would otherwise offer there',
        viaTopic && !builderIn(you).length, (viaTopic ? 'engine offers it; ' : 'engine does not; ') + list(labelsIn(you)));
  check('and a Train sheet with no start to call does not offer it either',
        !builderIn(open(UI, { tight: true, live: false }).sh).length);

  // On Train, "Build it" follows "What should I train today?" — once.
  const t = open(UI, trainOpts).sh;
  const shape = chipsIn(t).find(b => b.textContent === C.TRAIN_TOPICS.find(x => x.id === 'ask_shape').label);
  shape.onclick();
  const after = labelsIn(t);
  check('on Train, the answer to "What should I train today?" offers "Build it"', after.includes('Build it'), list(after));
  check('and does not also offer "Make me a workout" beside it — one route, one chip',
        !after.includes(MAKE), list(after));

  // Switched off in Settings → Coach: gone from the sheet entirely.
  state.input = { ...BUILD, settings: { ...BUILD.settings, mute: { build: true } } };
  const muted = open(UI, trainOpts).sh;
  check('switched off in Settings → Coach, it is gone', !builderIn(muted).length, list(labelsIn(muted)));
  state.input = BASE;
}

/* ================= F. THE PROPOSAL ON SCREEN ================= */
section('F. the workout on the sheet, and the four ways out of it');
{
  /* The card the Train tab draws hands in startWorkout and
     saveSessionAsRoutine; here they are recorders, so what each button hands
     over can be compared with what the engine built. A library with a second
     lift in two groups, so "Swap one" has somewhere to go, and names, as
     coach-data.js now supplies them. */
  const NAMED = {
    bench: { name: 'Bench', group: 'chest', equipment: 'barbell' }, row: { name: 'Row', group: 'back', equipment: 'barbell' },
    squat: { name: 'Squat', group: 'legs', equipment: 'barbell' }, press: { name: 'Press', group: 'shoulders', equipment: 'barbell' },
    curl: { name: 'Curl', group: 'arms', equipment: 'dumbbell' },
    incline: { name: 'Incline Press', group: 'chest', equipment: 'dumbbell' },
    lateral: { name: 'Lateral Raise', group: 'shoulders', equipment: 'dumbbell' }
  };
  const BUILD = { ...BASE, lib: NAMED, libReady: true, hidden: [] };
  const calls = [];
  const trainOpts = { tight: true, live: false,
    start: preset => calls.push(['start', preset]), save: record => calls.push(['save', record]) };
  const MAKE = C.TRAIN_TOPICS.find(t => t.id === 'ask_build').label;
  const PICK = 'Tell me what to train';
  const FOUR = ['Start it', 'Start with my last numbers', 'Save as routine', 'Change something'];
  /* v48: when the proposal has targets, "Start with Coach’s targets" leads,
     yellow, and "Start it" steps down to second, ghost. Micah's 23 Sep
     answer — the targets are the main way into a workout. With none, the row
     is the shipped four exactly. Which row a proposal gets is its own
     `targets`, read here rather than assumed. */
  const TARGETS = 'Start with Coach’s targets';
  const rowFor = pp => (pp && pp.targets ? [TARGETS].concat(FOUR) : FOUR);
  const yellow = box => buttonsIn(box).filter(b => b.classList.contains('btn') && b.classList.contains('btn-primary'))
    .map(b => b.textContent);
  const ghostStart = box => buttonsIn(box).some(b => b.textContent === 'Start it' && b.classList.contains('btn-ghost'));
  const tap = (sh, label) => {
    const b = buttonsIn(sh).find(x => x.textContent === label);
    if (b) b.onclick();
    return !!b;
  };
  // "Make me a workout" asks what to train first (v46); Coach's own pick is
  // the default proposal, which is what every check below is about.
  const toProposal = sh => tap(sh, MAKE) && tap(sh, PICK);
  const boxes = sh => find(sh, 'coach-build').filter(b => b.parent);
  // The drawn proposal, or an empty stand-in, so a flow that never reached one
  // fails the checks that follow with a reason instead of killing the file.
  const box0 = sh => boxes(sh)[0] || mkEl('div');
  const actsIn = box => buttonsIn(box).filter(b => b.classList.contains('btn')).map(b => b.textContent);
  const namesIn = box => find(box, 'day-ex-name').map(n => n.textContent);

  state.input = BUILD; state.pro = true; state.logKnown = true; state.ready = true;
  const eng = engine(BUILD);
  const p = eng.build({});
  check('the fixture builds, with every follow-up on offer', !!p && p.focuses.length > 0 && !!p.fewer &&
        p.exercises.some(e => e.swaps.length), p ? p.key : 'null');

  let sh = open(UI, trainOpts).sh;
  tap(sh, MAKE);
  const asked = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).pop();
  check('tapping "Make me a workout" asks what to train first — no proposal yet',
        !boxes(sh).length && !!asked && (find(asked, 'coach-bub-t')[0] || {}).textContent === 'What do you want to train?',
        asked ? (find(asked, 'coach-bub-t')[0] || {}).textContent : 'no answer');
  check('under it, exactly the engine’s choices, Coach’s own first — and nothing else to tap but Close',
        JSON.stringify(chipsIn(sh).map(b => b.textContent)) === JSON.stringify(eng.buildMenu().map(m => m.label)) &&
        chipsIn(sh)[0].textContent === PICK, list(chipsIn(sh).map(b => b.textContent)));
  tap(sh, PICK);
  let box = boxes(sh);
  check('"Tell me what to train" draws the proposal', box.length === 1, String(box.length));
  // An empty stand-in when there is none, so the checks below fail with a
  // reason rather than the file dying on the first of them.
  box = box[0] || mkEl('div');
  const said = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).pop();
  check('under an answer that names the session it was built from',
        !!said && (find(said, 'coach-bub-t')[0] || {}).textContent === p.headline, p.headline);
  check('every exercise the engine built, in its order, under its own name',
        JSON.stringify(namesIn(box)) === JSON.stringify(p.exercises.map(e => e.name)), list(namesIn(box)));
  check('each with its sets exactly as the engine wrote them — the sheet invents no number',
        JSON.stringify(find(box, 'day-ex-sets').map(n => n.textContent)) === JSON.stringify(p.exercises.map(e => e.line)),
        list(find(box, 'day-ex-sets').map(n => n.textContent)));
  check('the proposal has targets, so the row is the shipped four with "Start with Coach’s targets" in front',
        !!p.targets && JSON.stringify(actsIn(box)) === JSON.stringify([TARGETS].concat(FOUR)), list(actsIn(box)));
  check('and it is the one yellow button — "Start it" is second, and ghost',
        JSON.stringify(yellow(box)) === JSON.stringify([TARGETS]) && ghostStart(box), list(yellow(box)));

  // Start with Coach's targets.
  calls.length = 0;
  tap(sh, TARGETS);
  check('"Start with Coach’s targets" closes the sheet and hands startWorkout the targets view',
        !body.children.some(x => x.classList.contains('sheet')) && calls.length === 1 && calls[0][0] === 'start' &&
        JSON.stringify(calls[0][1]) === JSON.stringify(p.targets), calls.length ? calls[0][0] : 'not called');
  check('boxes empty and nothing ticked — the targets are ghost text until a tick adopts them',
        calls.length === 1 && calls[0][1].exercises.every(e => e.sets.every(x => x.w === '' && x.r === '' && x.done === false)));
  sh = open(UI, trainOpts).sh; toProposal(sh);

  // Start it.
  calls.length = 0;
  tap(sh, 'Start it');
  check('"Start it" closes the sheet', !body.children.some(x => x.classList.contains('sheet')));
  check('and hands startWorkout the placeholders — boxes empty, his numbers as ghost text',
        calls.length === 1 && calls[0][0] === 'start' && JSON.stringify(calls[0][1]) === JSON.stringify(p.placeholders),
        calls.length ? calls[0][0] : 'not called');
  /* As a COPY. The live session is edited in place, set by set, so a preset
     that shared objects with the proposal would carry the first session's
     typing into the next Start from the same sheet. Proved the only way it can
     be from out here: scribble on what was handed over, then start again from
     the very same drawn proposal and see whether the scribble came back. */
  if (calls.length === 1) calls[0][1].exercises[0].sets[0].w = 'SCRIBBLE';
  tap(sh, 'Start it');
  check('as a copy, so the live session shares nothing with the proposal it came from',
        calls.length === 2 && calls[1][1].exercises[0].sets[0].w === '' &&
        JSON.stringify(calls[1][1]) === JSON.stringify(p.placeholders),
        calls.length === 2 ? calls[1][1].exercises[0].sets[0].w : String(calls.length));

  // Start with my last numbers.
  calls.length = 0;
  sh = open(UI, trainOpts).sh; toProposal(sh); tap(sh, 'Start with my last numbers');
  check('"Start with my last numbers" hands over the filled view, and closes the sheet',
        calls.length === 1 && JSON.stringify(calls[0][1]) === JSON.stringify(p.lastNumbers) &&
        !body.children.some(x => x.classList.contains('sheet')));
  check('with every set unticked', calls.length === 1 && calls[0][1].exercises.every(e => e.sets.every(x => x.done === false)));

  // Save as routine.
  calls.length = 0;
  sh = open(UI, trainOpts).sh; toProposal(sh); tap(sh, 'Save as routine');
  check('"Save as routine" hands saveSessionAsRoutine the record, named for the shape',
        calls.length === 1 && calls[0][0] === 'save' && JSON.stringify(calls[0][1]) === JSON.stringify(p.record) &&
        calls[0][1].name === p.name, calls.length ? calls[0][1].name : 'not called');
  check('and leaves the sheet where it is', body.children.some(x => x.classList.contains('sheet')));

  // Change something.
  sh = open(UI, trainOpts).sh; toProposal(sh);
  tap(sh, 'Change something');
  const changeRow = chipsIn(box0(sh)).map(b => b.textContent);
  check('"Change something" offers the three follow-ups the engine has', JSON.stringify(changeRow) ===
        JSON.stringify(['Train something else', 'Fewer exercises', 'Swap one']), list(changeRow));

  tap(sh, 'Fewer exercises');
  const fewer = eng.build(p.fewer);
  check('"Fewer exercises" re-runs the builder and redraws: one proposal, one fewer lift',
        boxes(sh).length === 1 && namesIn(box0(sh)).length === p.exercises.length - 1 &&
        JSON.stringify(namesIn(box0(sh))) === JSON.stringify(fewer.exercises.map(e => e.name)),
        list(namesIn(box0(sh))));
  check('with its buttons again, on the new one — the targets button first when it has targets',
        JSON.stringify(actsIn(box0(sh))) === JSON.stringify(rowFor(fewer)), list(actsIn(box0(sh))));
  check('and the tap is said in the thread, as a follow-up rather than a question',
        find(sh, 'coach-bub').filter(b => b.classList.contains('you')).some(b => textOf(b) === 'Fewer exercises'));

  sh = open(UI, trainOpts).sh; toProposal(sh); tap(sh, 'Change something'); tap(sh, 'Swap one');
  const swapRow = chipsIn(box0(sh)).map(b => b.textContent);
  // One chip per lift: a lift repeated in a duplicated block swaps as one.
  const swappable = p.exercises.filter((e, n) => e.swaps.length && p.exercises.findIndex(x => x.exId === e.exId) === n);
  check('"Swap one" asks which lift, offering only the ones with somewhere to go',
        JSON.stringify(swapRow) === JSON.stringify(swappable.map(e => e.name)), list(swapRow));
  const target = swappable[0];
  tap(sh, target.name);
  const altRow = chipsIn(box0(sh)).map(b => b.textContent);
  check('then offers its alternatives, the engine’s own, five at most',
        JSON.stringify(altRow) === JSON.stringify(target.swaps.map(x => x.name)) && altRow.length <= 5, list(altRow));
  tap(sh, target.swaps[0].name);
  const swapped = eng.build(target.swaps[0].opts);
  check('taking one redraws the workout with it in that lift’s place',
        boxes(sh).length === 1 && JSON.stringify(namesIn(box0(sh))) === JSON.stringify(swapped.exercises.map(e => e.name)) &&
        namesIn(box0(sh)).includes(target.swaps[0].name), list(namesIn(box0(sh))));
  calls.length = 0;
  tap(sh, 'Start it');
  check('and what starts is the swapped workout, not the one before it',
        calls.length === 1 && JSON.stringify(calls[0][1]) === JSON.stringify(swapped.placeholders));

  sh = open(UI, trainOpts).sh; toProposal(sh); tap(sh, 'Change something'); tap(sh, 'Train something else');
  const focusRow = chipsIn(box0(sh)).map(b => b.textContent);
  check('"Train something else" offers the engine’s other options, only those that build',
        JSON.stringify(focusRow) === JSON.stringify(p.focuses.map(f => f.label)), list(focusRow));
  tap(sh, p.focuses[0].label);
  const other = eng.build(p.focuses[0].opts);
  const heads = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).map(b => (find(b, 'coach-bub-t')[0] || {}).textContent);
  check('and a new focus is a new workout, with its own first line naming its own session',
        heads.includes(other.headline) && other.base.id !== p.base.id &&
        JSON.stringify(namesIn(box0(sh))) === JSON.stringify(other.exercises.map(e => e.name)), other.headline);

  /* The layoff: no filled view exists, so there is no button for it — and
     the line saying why is on the sheet. With a re-entry target the row is
     four, "Start with Coach’s targets" first; without one, the shipped three. */
  state.input = { ...BUILD, now: NOW + 30 * DAY };
  const lay = engine(state.input).build({});
  sh = open(UI, trainOpts).sh; toProposal(sh);
  check('after a layoff there is no "Start with my last numbers" at all — and the re-entry targets lead',
        !!lay && lay.lastNumbers === null && boxes(sh).length === 1 && !!lay.targets &&
        lay.exercises.some(e => e.target && e.target.mode === 'reenter') &&
        JSON.stringify(actsIn(box0(sh))) === JSON.stringify(rowFor(lay).filter(l => l !== 'Start with my last numbers')),
        boxes(sh).length ? list(actsIn(box0(sh))) : 'no proposal');

  check('and the sheet says how long it has been', !!lay && textOf(box0(sh)).includes(lay.layoffLine), lay && lay.layoffLine);

  /* Switched off: Settings → Coach → Weight and rep targets. No targets, so
     the row is exactly the shipped four, "Start it" in yellow. Driven, not
     asserted. */
  state.input = { ...BUILD, settings: { ...BUILD.settings, mute: { targets: true } } };
  const offP = engine(state.input).build({});
  sh = open(UI, trainOpts).sh; toProposal(sh);
  check('targets switched off: no targets view, and EXACTLY the shipped four buttons, in order',
        !!offP && offP.targets === null && JSON.stringify(actsIn(box0(sh))) === JSON.stringify(FOUR), list(actsIn(box0(sh))));
  check('with "Start it" the yellow one again', JSON.stringify(yellow(box0(sh))) === JSON.stringify(['Start it']),
        list(yellow(box0(sh))));
  check('and no target line under any exercise', !find(box0(sh), 'coach-build-target').length);
  sh = open(UI, trainOpts).sh; toProposal(sh); tap(sh, 'Change something'); tap(sh, 'Fewer exercises');
  check('and after "Fewer exercises", the shipped four again', JSON.stringify(actsIn(box0(sh))) === JSON.stringify(FOUR),
        list(actsIn(box0(sh))));

  /* What is left out is said, once, on the sheet. */
  state.input = { ...BUILD, hidden: ['press'], lib: Object.fromEntries(Object.entries(NAMED).filter(([k]) => k !== 'press')) };
  const lo = engine(state.input).build({});
  sh = open(UI, trainOpts).sh; toProposal(sh);
  check('a hidden lift is left out and the sheet says so',
        !!lo && !!lo.leftOutLine && boxes(sh).length === 1 && textOf(box0(sh)).includes(lo.leftOutLine) &&
        !namesIn(box0(sh)).includes('Press'), lo ? String(lo.leftOutLine) : 'no proposal');

  /* A live session: one line, and only where the builder would have been. */
  state.input = BUILD;
  const liveSheet = open(UI, { ...trainOpts, live: true }).sh;
  const liveLine = engine(BUILD).build({}) && C.coach({ ...BUILD, live: { active: true }, tier: { pro: true } }).buildLive();
  check('during a live session the Train sheet says why there is no workout to build — in one line',
        !!liveLine && find(liveSheet, 'coach-bub-t').filter(n => n.textContent === liveLine).length === 1, String(liveLine));
  check('and draws no proposal and no builder chip', !boxes(liveSheet).length &&
        !chipsIn(liveSheet).some(b => b.textContent === MAKE || b.textContent === 'Build it'));
  state.pro = false;
  check('a Basic account is not told about a builder it does not have',
        !find(open(UI, { ...trainOpts, live: true }).sh, 'coach-bub-t').some(n => n.textContent === liveLine));
  state.pro = true;
  // The You card itself points at Train during a live session rather than
  // opening a sheet, so the You-surface sheet is opened directly.
  check('and the You sheet never says it', !find(openBare(UI, { live: true }), 'coach-bub-t').some(n => n.textContent === liveLine));
  state.input = { ...BUILD, settings: { ...BUILD.settings, mute: { build: true } } };
  check('nor does a sheet whose builder is switched off',
        !find(open(UI, { ...trainOpts, live: true }).sh, 'coach-bub-t').some(n => n.textContent === liveLine));
  state.input = BASE;

  /* THE WIRING, read from the files that do it, because a DOM shim can only
     drive the card it is handed. The builder is offered wherever a card hands
     in `start`, so the whole of "on Train, not on You" rests on these lines —
     and the whole of "no cycle" rests on coach-ui.js not reaching back. */
  const W = src('workout.js'), Y = src('you.js');
  const uiImports = [...UI_SRC.matchAll(/^import[^;]*from\s+'([^']+)'/gm)].map(m => m[1]);
  check('coach-ui.js imports neither workout.js nor routines.js — the dependency stays one-way',
        !uiImports.includes('./workout.js') && !uiImports.includes('./routines.js'), list(uiImports));
  check('the Train card is handed startWorkout and saveSessionAsRoutine, the way Routines is',
        /coachCard\(\{[\s\S]{0,200}start: preset =>[\s\S]{0,160}startWorkout\(preset\)[\s\S]{0,80}save: record => saveSessionAsRoutine\(record\)/.test(W));
  check('and refuses to start over a session that is already running',
        /start: preset => \{\s*if \(hasActiveSession\(\)\)/.test(W));
  check('the You card is handed no start, so the You sheet never offers the builder',
        /coachCard\(/.test(Y) && !/coachCard\(\{[^)]*\bstart\s*:/.test(Y));
}

/* ================= G. COACH IN THE GYM ================= */
section('G. in a live session: a chip when asked, one quiet line once, nothing for Basic or an edit');
{
  /* Mid-workout is the most sensitive place Coach speaks, so this section is
     about WHEN and WHERE as much as what: the chip is the only door to the
     sheet, the answer is the engine's word for word, "Add it" hands the
     picker's own callback exactly what the picker would, and the line under a
     finished exercise appears once, clears on the next tick, and is never
     drawn for a basic account or over an edit. The fixture is coach-live.mjs's
     twelve weeks of push, pull and leg days, so every answer here is one that
     file has already proved right. */
  const GL = {
    bench:    { name: 'Barbell Bench Press',          group: 'chest', equipment: 'barbell' },
    incline:  { name: 'Incline Dumbbell Bench Press', group: 'chest', equipment: 'dumbbell' },
    fly:      { name: 'Cable Crossover',              group: 'chest', equipment: 'cable' },
    curl:     { name: 'Barbell Curl',                 group: 'arms',  equipment: 'barbell' },
    pushdown: { name: 'Triceps Pushdown (Rope)',      group: 'arms',  equipment: 'cable' },
    row:      { name: 'Barbell Row',                  group: 'back',  equipment: 'barbell' },
    squat:    { name: 'Back Squat (High Bar)',        group: 'legs',  equipment: 'barbell' }
  };
  const W = { bench: '185', incline: '65', fly: '40', curl: '75', pushdown: '50', row: '155', squat: '245' };
  const R = { bench: 8, incline: 10, fly: 12, curl: 10, pushdown: 12, row: 8, squat: 5 };
  const lx = (id, c) => ({ exId: id, name: GL[id].name, group: GL[id].group, equipment: GL[id].equipment,
    sets: Array.from({ length: c }, () => ({ w: W[id], r: String(R[id]), type: 'N', done: true })) });
  const hist = [];
  for (let k = 0; k < 10; k++) {
    const at = (tag, ago, rows) => hist.push({ id: tag + ago, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: rows });
    at('push', 3 + 7 * k, k === 4 || k === 7
      ? [lx('bench', 4), lx('incline', 3), lx('pushdown', 3), lx('curl', 3)]
      : [lx('bench', 4), lx('incline', 3), lx('fly', 3), lx('curl', 3), lx('pushdown', 3)]);
    at('pull', 5 + 7 * k, [lx('row', 4), lx('curl', 3)]);
    at('legs', 1 + 7 * k, [lx('squat', 4)]);
  }
  const LIVEX = { ...BASE, lib: GL, hidden: [], libReady: true, sessions: hist.slice().sort((a, b) => a.startedAt - b.startedAt) };
  // A live session the way workout.js holds it. Rows: [exId, sets, ticked?]
  const liveS = (rows, extra) => ({ id: 'wlive', name: 'Live', startedAt: NOW - 1800000, ...(extra || null),
    exercises: rows.map(([id, c, ticked]) => ({ exId: id, name: GL[id].name, group: GL[id].group, equipment: GL[id].equipment,
      sets: Array.from({ length: c }, (_, j) => ({ w: W[id], r: String(R[id]), type: 'N',
        done: ticked === undefined ? true : j < ticked })) })) });
  const eng = () => C.coach({ ...LIVEX, live: { active: true }, tier: { pro: state.pro } });
  const sheetIn = () => body.children.find(x => x.classList.contains('sheet')) || null;
  const tapChip = chip => { body.children.length = 0; chip.onclick(); return sheetIn(); };
  const saidIn = sh => find(sh, 'coach-bub').map(b => ({ who: b.classList.contains('you') ? 'you' : 'coach',
    t: (find(b, 'coach-bub-t')[0] || {}).textContent, r: find(b, 'coach-bub-r').map(x => x.textContent) }));
  const btn = (sh, label) => buttonsIn(sh).find(b => b.textContent === label) || null;

  state.input = LIVEX; state.logKnown = true; state.ready = true; state.pro = true;

  /* ---- the chip ---- */
  const NEXT = liveS([['bench', 4], ['incline', 3]]);
  const adds = [];
  const add = chosen => adds.push(chosen);
  const chip = UI.liveChip({ session: NEXT, add });
  check('Pro, a live session: the header row gets a Coach chip',
        !!chip && chip.tag === 'button' && chip.classList.contains('wk-coach') && textOf(chip).includes('Coach'),
        chip ? chip.className : 'null');
  state.pro = false;
  check('Basic, the same session: no chip at all — not a lock, not a teaser', UI.liveChip({ session: NEXT, add }) === null);
  state.pro = true;
  check('an edit of a past session: no chip', UI.liveChip({ session: { ...NEXT, _edit: { mk: '2026-09', dd: '01' } }, add }) === null);
  check('no session: no chip', UI.liveChip({ add }) === null);

  /* ---- the sheet ---- */
  const want = eng().live(NEXT);
  let sh = tapChip(chip);
  const said = sh ? saidIn(sh) : [];
  check('the chip opens a sheet that asks "What should I do next?" and answers at once, in the engine’s words',
        !!sh && said.length === 2 && said[0].who === 'you' && said[0].t === 'What should I do next?' &&
        said[1].who === 'coach' && !!want && said[1].t === want.text, said.map(x => x.t).join(' / '));
  check('the answer here is the next exercise — the fixture’s true one', !!want && want.kind === 'next' && want.exId === 'fly',
        want && want.kind);
  check('and the sheet offers exactly Why?, Add it and Close — nothing else to tap',
        !!sh && J_(buttonsIn(sh).map(b => b.textContent)) === J_(['Why?', 'Add it', 'Close']), sh && list(buttonsIn(sh).map(b => b.textContent)));
  btn(sh, 'Why?').onclick();
  const why = saidIn(sh).pop();
  check('"Why?" shows the engine’s reasons, all of them, once',
        why && why.who === 'coach' && J_([why.t].concat(why.r)) === J_(want.why) && !btn(sh, 'Why?'),
        why && [why.t].concat(why.r).join(' / '));
  adds.length = 0;
  btn(sh, 'Add it').onclick();
  check('"Add it" closes the sheet', !sheetIn());
  check('and hands the picker’s callback exactly what the picker hands it: one library row, in an array',
        adds.length === 1 && J_(adds[0]) === J_([{ id: 'fly', name: 'Cable Crossover', group: 'chest', equipment: 'cable' }]),
        J_(adds));

  const ANOTHER = liveS([['bench', 3]]);
  sh = tapChip(UI.liveChip({ session: ANOTHER, add }));
  check('"one more set" is answered, with Why? and no Add it — the exercise is already in hand',
        saidIn(sh)[1].t === eng().live(ANOTHER).text && eng().live(ANOTHER).kind === 'another' &&
        !btn(sh, 'Add it') && !!btn(sh, 'Why?'));
  const SWITCH = liveS([['bench', 4], ['incline', 3], ['fly', 3]]);
  sh = tapChip(UI.liveChip({ session: SWITCH, add }));
  adds.length = 0;
  const sw = eng().live(SWITCH);
  check('a switch offers Add it for the exercise that usually opens the next group',
        sw && sw.kind === 'switch' && saidIn(sh)[1].t === sw.text && !!btn(sh, 'Add it'), sw && sw.kind);
  btn(sh, 'Add it').onclick();
  check('and adds it through the same callback',
        adds.length === 1 && Array.isArray(adds[0]) && !!adds[0][0] && adds[0][0].id === 'curl', J_(adds));
  const DONE = liveS([['bench', 4], ['incline', 3], ['fly', 3], ['curl', 3], ['pushdown', 3]]);
  sh = tapChip(UI.liveChip({ session: DONE, add }));
  check('"you’re probably good for today" has nothing to add', eng().live(DONE).kind === 'done' &&
        /^You’re probably good for today/.test(saidIn(sh)[1].t) && !btn(sh, 'Add it'));

  state.input = { ...LIVEX, sessions: LIVEX.sessions.slice(-4) };
  sh = tapChip(UI.liveChip({ session: NEXT, add }));
  const none = C.coach({ ...state.input, live: { active: true }, tier: { pro: true } }).live(NEXT);
  check('thin history: the sheet says it has nothing to add, and why — never a guess',
        none === null && saidIn(sh)[1].t === C.LIVE_NONE.text && !btn(sh, 'Add it') && !!btn(sh, 'Why?'),
        saidIn(sh)[1] && saidIn(sh)[1].t);
  state.input = LIVEX;
  state.logKnown = false;
  sh = tapChip(UI.liveChip({ session: NEXT, add }));
  check('the log not read yet: the sheet says so, and offers nothing it cannot back',
        /reading your log/.test(saidIn(sh)[1].t) && !btn(sh, 'Add it') && !btn(sh, 'Why?'), saidIn(sh)[1].t);
  state.logKnown = true;

  /* ---- the line under a finished exercise ---- */
  // Incline's last set has just been ticked; bench was finished before it.
  const s1 = liveS([['bench', 4], ['incline', 3]]);
  const before = J_(s1);
  const st1 = UI.noteLiveTick(s1, 1, 2);
  check('ticking the LAST set of an exercise raises one line, the engine’s short answer for it',
        !!st1.nudge && st1.nudge.short === eng().live(s1, { current: 1 }).short && st1.shown.includes('incline#0'),
        J_(st1));
  check('and noteLiveTick hands back a new state — the session it was given is untouched', J_(s1) === before);
  s1._coach = st1;
  const line = UI.nudgeLine(s1, 1, { open() { line.opened = true; }, dismiss() { line.dismissed = true; } });
  check('drawn under that exercise, in the swipe hint’s own box — same slot, same height, no row moves',
        !!line && line.classList.contains('swipe-hint') && line.classList.contains('coach-nudge') &&
        textOf(line).includes(st1.nudge.short), line ? line.className + ' · ' + textOf(line) : 'null');
  check('and under no other exercise', UI.nudgeLine(s1, 0, {}) === null);
  const [lt, lx_] = buttonsIn(line);
  lt.onclick(); lx_.onclick();
  check('tapping it opens the sheet, and × dismisses it', line.opened === true && line.dismissed === true);

  // Once per exercise, per session.
  const again = UI.noteLiveTick(s1, 1, 2);
  check('the same exercise finished again — an untick and a re-tick — raises nothing: once is once',
        again.nudge === null && again.shown.includes('incline#0'), J_(again));
  s1._coach = UI.dismissNudge(st1);
  check('dismissed, the line goes and the exercise stays counted', UI.nudgeLine(s1, 1, {}) === null &&
        s1._coach.shown.includes('incline#0'));
  // A tick that finishes nothing clears whatever line was up.
  const s2 = liveS([['bench', 4], ['incline', 3], ['fly', 3, 1]]);
  s2._coach = st1;
  const mid = UI.noteLiveTick(s2, 2, 0);
  check('a tick that does not finish an exercise clears the line, and remembers what was shown',
        mid.nudge === null && mid.shown.includes('incline#0'), J_(mid));
  // Another exercise finishing gets its own.
  const s3 = liveS([['bench', 4], ['incline', 3], ['fly', 3]]);
  s3._coach = mid;
  const st3 = UI.noteLiveTick(s3, 2, 2);
  check('a different exercise finishing gets its own line', !!st3.nudge && st3.nudge.key === 'fly#0' &&
        st3.shown.includes('incline#0') && st3.shown.includes('fly#0'), J_(st3));
  const dupe = liveS([['bench', 4], ['incline', 3], ['bench', 2]]);
  dupe._coach = { shown: ['bench#0'], nudge: null };
  check('the same lift again in a duplicated block is its own exercise, with its own line',
        UI.noteLiveTick(dupe, 2, 1).nudge && UI.noteLiveTick(dupe, 2, 1).nudge.key === 'bench#1');

  // Silence.
  state.pro = false;
  check('Basic: finishing an exercise raises no line', UI.noteLiveTick(liveS([['bench', 4], ['incline', 3]]), 1, 2).nudge === null);
  state.pro = true;
  const edit = { ...liveS([['bench', 4], ['incline', 3]]), _edit: { mk: '2026-09', dd: '01' } };
  check('an edit of a past session: no line raised', UI.noteLiveTick(edit, 1, 2).nudge === null);
  check('and none drawn, even over state left on it', UI.nudgeLine({ ...edit, _coach: st1 }, 1, {}) === null);
  state.input = { ...LIVEX, sessions: LIVEX.sessions.slice(-4) };
  const thin = UI.noteLiveTick(liveS([['bench', 4], ['incline', 3]]), 1, 2);
  check('nothing to say: no line, and the exercise is not marked shown — silence is not a use of its once',
        thin.nudge === null && !thin.shown.length, J_(thin));
  state.input = LIVEX;
  check('a set that is not the exercise’s last raises nothing',
        UI.noteLiveTick(liveS([['bench', 4, 3], ['incline', 3]]), 0, 2).nudge === null);
  check('and an untick raises nothing', UI.noteLiveTick(liveS([['bench', 4, 3]]), 0, 3).nudge === null);

  /* ---- the wiring, read from the file that does it ---- */
  const WS = src('workout.js');
  check('"+ Add exercise" and Coach’s Add it are the same function — the picker’s own path, never a parallel one',
        /add\.onclick = \(\) => openPicker\(addPicked\);/.test(WS) &&
        /liveChip\(\{ session, add: addPicked/.test(WS) && /openLiveSheet\(\{ session, add: addPicked/.test(WS));
  check('and that function appends at the end of the session, outside any block',
        /function addPicked\(chosen\) \{[\s\S]{0,200}session\.exercises\.push\(newExercise\(x, !!session\._edit\)\)/.test(WS));
  const tick = (WS.split('chk.onclick = () => {')[2] || WS.split('chk.onclick = () => {')[1] || '').split('\n  };')[0];
  check('the set tick raises the line only when it ticks ON and never in an edit, and the rest timer still follows',
        /if \(s\.done && !session\._edit\) session\._coach = noteLiveTick\(session, exIdx, i\);/.test(tick) &&
        tick.indexOf('noteLiveTick') < tick.indexOf('startRest()'), tick.slice(0, 80));
  check('the line takes the swipe hint’s place rather than adding a row',
        /if \(nudge\) block\.appendChild\(nudge\);\n  else if \(ex\.sets\.length\) block\.appendChild\(el\('div', 'swipe-hint'/.test(WS));
  const gym = (UI_SRC.split('/* ================= IN THE GYM =================')[1] || '');
  const raise = (gym.split('export function noteLiveTick')[1] || '').split('\nexport function nudgeLine')[0];
  check('nothing that raises or draws the line opens a sheet or a toast — it is inline, and nothing pops up',
        raise.length > 0 && !/\bsheet\(|\btoast\(/.test(raise + (gym.split('export function nudgeLine')[1] || '')));
  const css = src('rack.css');
  const rules = (css.split('/* ---------- Coach in a live session ----------')[1] || '').split('\n/*')[0] +
                (css.split('.swipe-hint.coach-nudge')[1] || '').slice(0, 800);
  check('its CSS positions nothing — no fixed or absolute box that could sit over the rest timer',
        rules.length > 0 && !/position:\s*(fixed|absolute|sticky)/.test(rules));
  check('and it is clipped to one line, which is what keeps the hint’s height',
        /\.coach-nudge-t \{[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/.test(css));
}

/* ================= H. PATTERNS ================= */
section('H. Patterns: a switch that starts off, and a bubble only when it is on and something clears');
{
  const PLIB = { bench: { name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
                 row:   { name: 'Barbell Row',         group: 'back',  equipment: 'barbell' } };
  const hourOn = (i, h, m = 0) => { const x = new Date(NOW - i * DAY); x.setHours(h, m, 0, 0); return x.getTime(); };
  const pset = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
  const PS = [], PSUM = {}, PSTEP = {}, PFOOD = {}, PWEIGH = [];
  for (let i = 1; i <= 181; i++) {
    const k = key(NOW - i * DAY);
    const quiet = Math.floor((i - 1) / 7) % 3 === 2;
    const trains = i % 7 === 1 || (!quiet && (i % 7 === 3 || i % 7 === 5));
    PSUM[k] = { cal: 2000 + (i % 3) * 300, p: i % 2 ? 190 : 150, c: 250, f: 70 };
    PSTEP[k] = { steps: (trains ? 9000 : 6000) + (i % 3) * 100 };
    PWEIGH.push({ lb: 180 + i * 0.05, t: hourOn(i, 6, 30) });
    if (!trains) continue;
    const am = i % 7 === 1;
    PS.push({ id: 'pp' + i, startedAt: hourOn(i, am ? 7 : 17), _date: k, exercises: [
      { exId: 'bench', ...PLIB.bench, sets: pset(4, 180 + (i % 4) * 10 + (am ? 0 : 5), 5) },
      { exId: 'row', ...PLIB.row, sets: pset(i % 2 ? 3 : 4, 155, 8) }] });
    PFOOD[k] = hourOn(i, i % 5 === 0 ? 20 : 6);
  }
  PS.sort((a, b) => a.startedAt - b.startedAt);
  const OFF = { v: 1, mute: {}, answers: {}, asked: {} };
  const ONS = { ...OFF, on: { patterns: true } };
  const PAT = settings => ({ ...BASE, sessions: PS, lib: PLIB, summaries: PSUM, steps: { days: PSTEP },
    weighIns: PWEIGH, foodFirst: PFOOD, targets: { cal: 2300, p: 170, f: 70 }, targetsSet: true, settings });
  const LABEL = C.PATTERN_TOPIC.label;
  state.pro = true; state.logKnown = true; state.ready = true;

  /* ---- the switch ---- */
  state.input = PAT(OFF);
  const host = mkEl('div');
  UI.coachToggleRows(host);
  const cat = C.CATEGORIES.find(c => c.id === 'patterns');
  const sw = buttonsIn(host).find(b => b.getAttribute('aria-label') === cat.label);
  check('Settings → Coach draws a Patterns switch, with its note', !!sw && textOf(host).includes(cat.note));
  check('and it starts OFF — absent means off, the reverse of every other switch',
        !!sw && sw.getAttribute('aria-checked') === 'false' &&
        buttonsIn(host).filter(b => b.classList.contains('tog') && b !== sw).every(b => b.getAttribute('aria-checked') === 'true'));
  state.calls.length = 0;
  sw.onclick();
  await new Promise(r => setTimeout(r, 0));
  check('tapped, it writes Patterns ON through the one settings writer',
        J_(state.calls.filter(c => c[0] === 'setCategoryMuted')) === J_([['setCategoryMuted', 'patterns', false]]),
        J_(state.calls));
  state.input = PAT(ONS);
  const host2 = mkEl('div');
  UI.coachToggleRows(host2);
  const sw2 = buttonsIn(host2).find(b => b.getAttribute('aria-label') === cat.label);
  check('and drawn from a node that says on, it shows on', !!sw2 && sw2.getAttribute('aria-checked') === 'true');

  /* ---- the bubble ---- */
  state.input = PAT(OFF);
  const offSheet = openBare(UI);
  check('off: the sheet has no Patterns bubble, on a log where all eight would clear',
        !chipsIn(offSheet).some(b => b.textContent === LABEL), list(chipsIn(offSheet).map(b => b.textContent)));
  state.input = PAT(ONS);
  const onSheet = openBare(UI);
  const chip = chipsIn(onSheet).find(b => b.textContent === LABEL);
  check('on: the Patterns bubble is there', !!chip, list(chipsIn(onSheet).map(b => b.textContent)));
  const before = find(onSheet, 'coach-bub').length;
  if (chip) chip.onclick();
  const eng = C.coach({ ...PAT(ONS), tier: { pro: true } }).ask('ask_patterns');
  const drawn = find(onSheet, 'coach-bub').slice(before).filter(b => b.classList.contains('coach'))
    .map(b => (find(b, 'coach-bub-t')[0] || {}).textContent);
  const want = [eng.text].concat((eng.more || []).map(m => m.text));
  check('tapped, it draws every pattern that clears — one bubble each, the engine’s words, in order',
        want.length === 8 && J_(drawn) === J_(want), drawn.length + ' drawn of ' + want.length);
  check('and each carries its own reason line', find(onSheet, 'coach-bub').slice(before)
        .filter(b => b.classList.contains('coach')).every(b => find(b, 'coach-bub-r').length === 1));
  const tr = open(UI, { tight: true, live: false }).sh;
  check('Train’s sheet does not offer it — it is not a training question', !chipsIn(tr).some(b => b.textContent === LABEL));
  state.pro = false;
  const basic = openBare(UI);
  check('Basic, on: no bubble, and the Pro panel names it among what Pro adds',
        !chipsIn(basic).some(b => b.textContent === LABEL) && textOf(basic).includes(cat.label));
  state.pro = true;
  state.input = BASE;
}

/* ================= I. AFTER WALKING THE BUILDER ================= */
section('I. v46 from the phone: the question first, "Build it" straight through, and a switch for the gym');
{
  const NAMED = {
    bench: { name: 'Bench', group: 'chest', equipment: 'barbell' }, row: { name: 'Row', group: 'back', equipment: 'barbell' },
    squat: { name: 'Squat', group: 'legs', equipment: 'barbell' }, press: { name: 'Press', group: 'shoulders', equipment: 'barbell' },
    curl: { name: 'Curl', group: 'arms', equipment: 'dumbbell' },
    incline: { name: 'Incline Press', group: 'chest', equipment: 'dumbbell' },
    lateral: { name: 'Lateral Raise', group: 'shoulders', equipment: 'dumbbell' }
  };
  const BUILD = { ...BASE, lib: NAMED, libReady: true, hidden: [] };
  const trainOpts = { tight: true, live: false, start() {}, save() {} };
  const MAKE = C.TRAIN_TOPICS.find(t => t.id === 'ask_build').label;
  const SHAPE_Q = C.TRAIN_TOPICS.find(t => t.id === 'ask_shape').label;
  const tap = (sh, label) => { const b = buttonsIn(sh).find(x => x.textContent === label); if (b) b.onclick(); return !!b; };
  const boxes = sh => find(sh, 'coach-build').filter(b => b.parent);
  const box0 = sh => boxes(sh)[0] || mkEl('div');
  const namesIn = box => find(box, 'day-ex-name').map(n => n.textContent);
  const lastCoach = sh => { const b = find(sh, 'coach-bub').filter(x => x.classList.contains('coach')).pop();
                            return b ? (find(b, 'coach-bub-t')[0] || {}).textContent : ''; };
  state.input = BUILD; state.pro = true; state.logKnown = true; state.ready = true;
  const eng = engine(BUILD);
  const menu = eng.buildMenu();
  const shapes = menu.filter(m => m.id.startsWith('shape:')), groups = menu.filter(m => m.id.startsWith('group:'));
  check('the fixture’s menu has Coach’s pick, at least one shape and at least one group',
        menu[0] && menu[0].id === 'pick' && shapes.length > 0 && groups.length > 0, list(menu.map(m => m.label)));
  check('in that order: the pick, then the shapes, then the groups',
        JSON.stringify(menu.map(m => m.id.split(':')[0])) ===
        JSON.stringify(['pick'].concat(shapes.map(() => 'shape'), groups.map(() => 'group'))));

  // Picking a shape, and picking a group: each is that focus's workout, drawn
  // as "Build it" would draw it, and the topics come back afterwards.
  [shapes[shapes.length - 1], groups[0]].forEach(item => {
    const sh = open(UI, trainOpts).sh;
    tap(sh, MAKE); tap(sh, item.label);
    const p = eng.build(item.opts);
    check('picking "' + item.label + '" shows that focus’s proposal — its first line and its exercises',
          !!p && lastCoach(sh) === p.headline && boxes(sh).length === 1 &&
          JSON.stringify(namesIn(box0(sh))) === JSON.stringify(p.exercises.map(e => e.name)), lastCoach(sh));
    check('and "' + item.label + '" is said in the thread, with the Train questions back underneath',
          find(sh, 'coach-bub').some(b => b.classList.contains('you') && textOf(b) === item.label) &&
          chipsIn(sh).some(b => b.textContent === SHAPE_Q) && !chipsIn(sh).some(b => b.textContent === MAKE),
          list(chipsIn(sh).map(b => b.textContent)));
  });

  // "Build it" after "What should I train today?": no question, the proposal.
  const sh = open(UI, trainOpts).sh;
  tap(sh, SHAPE_Q);
  check('after "What should I train today?" the row offers "Build it" and not "Make me a workout" beside it',
        chipsIn(sh).some(b => b.textContent === 'Build it') && !chipsIn(sh).some(b => b.textContent === MAKE),
        list(chipsIn(sh).map(b => b.textContent)));
  tap(sh, 'Build it');
  check('"Build it" goes straight to the proposal for that focus — no question, no choices',
        boxes(sh).length === 1 && lastCoach(sh) === eng.build({}).headline &&
        !find(sh, 'coach-bub-t').some(n => n.textContent === 'What do you want to train?') &&
        !chipsIn(sh).some(b => b.textContent === 'Tell me what to train'), lastCoach(sh));

  /* ---- the switch for the in-session read ---- */
  const cat = C.CATEGORIES.find(c => c.id === 'live');
  const host = mkEl('div');
  UI.coachToggleRows(host);
  const sw = buttonsIn(host).find(b => b.getAttribute('aria-label') === (cat && cat.label));
  check('Settings → Coach has an "In the gym" switch, and it starts ON — absent means on',
        !!cat && cat.mutable === true && !cat.optIn && !!sw && sw.getAttribute('aria-checked') === 'true');
  state.calls.length = 0;
  sw.onclick();
  await new Promise(r => setTimeout(r, 0));
  check('tapped, it writes mute.live through the one settings writer',
        JSON.stringify(state.calls.filter(c => c[0] === 'setCategoryMuted')) === JSON.stringify([['setCategoryMuted', 'live', true]]),
        JSON.stringify(state.calls));
  check('and the Pro panel names it among what Pro adds', C.PRO_ADDS.some(a => a.id === 'live'));

  // Switched off: no chip, no line — and the engine itself says nothing.
  const W = { bench: '185', incline: '65' };
  const liveS = { id: 'wl', startedAt: NOW - 1800000, exercises: [
    { exId: 'bench', name: 'Bench', group: 'chest', equipment: 'barbell',
      sets: Array.from({ length: 3 }, () => ({ w: W.bench, r: '5', type: 'N', done: true })) }] };
  const OFF = { ...BUILD, settings: { ...BUILD.settings, mute: { live: true } } };
  state.input = OFF;
  check('switched off: no chip in the header row', UI.liveChip({ session: liveS, add() {} }) === null);
  check('no line under a finished exercise, even one left up from before the switch',
        UI.noteLiveTick(liveS, 0, 2).nudge === null &&
        UI.nudgeLine({ ...liveS, _coach: { shown: ['bench#0'], nudge: { key: 'bench#0', kind: 'another', short: 'x' } } }, 0, {}) === null);
  check('and the engine answers nothing when asked — the gate is the engine’s, not only the screen’s',
        C.coach({ ...OFF, live: { active: true }, tier: { pro: true } }).live(liveS) === null);
  state.input = BUILD;
  check('switched back on (the key absent), the chip returns', !!UI.liveChip({ session: liveS, add() {} }));
  state.input = BASE;
}

/* ================= J. TWO MORE FROM THE PHONE ================= */
section('J. an answer that repeats the opening is not printed twice; "Something else…" opens the picker');
{
  const NAMED = {
    bench: { name: 'Bench', group: 'chest', equipment: 'barbell' }, row: { name: 'Row', group: 'back', equipment: 'barbell' },
    squat: { name: 'Squat', group: 'legs', equipment: 'barbell' }, press: { name: 'Press', group: 'shoulders', equipment: 'barbell' },
    curl: { name: 'Curl', group: 'arms', equipment: 'dumbbell' },
    incline: { name: 'Incline Press', group: 'chest', equipment: 'dumbbell' },
    lateral: { name: 'Lateral Raise', group: 'shoulders', equipment: 'dumbbell' },
    flye: { name: 'Pec Deck', group: 'chest', equipment: 'machine' },
    bike: { name: 'Bike', group: 'legs', equipment: 'cardio' }
  };
  const picks = [];
  const trainOpts = { tight: true, live: false, start() {}, save() {},
    pick: (spec, done) => picks.push({ spec, done }) };
  const tap = (sh, label) => { const b = buttonsIn(sh).find(x => x.textContent === label); if (b) b.onclick(); return !!b; };
  const boxes = sh => find(sh, 'coach-build').filter(b => b.parent);
  const box0 = sh => boxes(sh)[0] || mkEl('div');
  const namesIn = box => find(box, 'day-ex-name').map(n => n.textContent);
  const coachTexts = sh => find(sh, 'coach-bub').filter(b => b.classList.contains('coach'))
    .map(b => (find(b, 'coach-bub-t')[0] || {}).textContent);
  const youTexts = sh => find(sh, 'coach-bub').filter(b => b.classList.contains('you')).map(b => textOf(b));
  const SHAPE_Q = C.TRAIN_TOPICS.find(t => t.id === 'ask_shape').label;
  const MAKE = C.TRAIN_TOPICS.find(t => t.id === 'ask_build').label;
  state.pro = true; state.logKnown = true; state.ready = true;

  /* ---- 8. the answer that IS the opening bubble ----
     One recurring shape — the push day alone — so "What should I train
     today?" is answered by the headline finding, which is also the You card's
     finding the sheet opens on. */
  const ONE = { ...BASE, lib: NAMED, libReady: true, hidden: [],
    sessions: BASE.sessions.filter(x => x.id.endsWith('p')) };
  state.input = ONE;
  const e1 = engine(ONE);
  check('the fixture: the sheet opens on the headline finding, and "What should I train today?" repeats it',
        e1.opening.id === 'train_today_recommendation' && !!e1.ask('ask_shape').repeats, e1.opening.id);
  let sh = open(UI, trainOpts).sh;
  const openBub = find(sh, 'coach-bub').find(b => b.classList.contains('coach'));
  tap(sh, SHAPE_Q);
  check('tapped, the sentence is not printed twice — it is on the sheet once',
        coachTexts(sh).filter(t => t === e1.opening.text).length === 1, JSON.stringify(coachTexts(sh)));
  check('and the question is not printed as though it had a new answer', !youTexts(sh).includes(SHAPE_Q), list(youTexts(sh)));
  const underOpening = chipsIn(openBub).map(b => b.textContent);
  const wantFollow = e1.ask('ask_shape').followups.map(f => f.label);
  check('its follow-ups hang under the opening bubble instead — "Build it" first',
        underOpening.length > 0 && JSON.stringify(underOpening) === JSON.stringify(wantFollow) && underOpening[0] === 'Build it',
        list(underOpening));
  const inOpening = new Set(walk(openBub));
  const bottom = chipsIn(sh).filter(b => !inOpening.has(b)).map(b => b.textContent);
  check('the bottom row keeps the rest — not the question asked, not "Make me a workout" beside "Build it", nothing twice',
        !bottom.includes(SHAPE_Q) && !bottom.includes(MAKE) && !bottom.some(l => underOpening.includes(l)),
        list(bottom) + ' / under the opening: ' + list(underOpening));
  tap(sh, 'Build it');
  check('"Build it" there goes straight to the proposal', boxes(sh).length === 1 &&
        coachTexts(sh).includes(e1.build({}).headline) && !chipsIn(openBub).length, coachTexts(sh).slice(-1)[0]);
  // A question whose answer is NOT the opening is printed as it always was.
  sh = open(UI, trainOpts).sh;
  const other = C.TRAIN_TOPICS.find(t => t.id !== 'ask_shape' && t.id !== 'ask_build' &&
    e1.topicsFor('train').some(x => x.id === t.id) && !e1.ask(t.id).repeats);
  if (other) tap(sh, other.label);
  check('a question with its own answer is still asked and answered in the thread',
        !!other && youTexts(sh).includes(other.label) && coachTexts(sh).includes(e1.ask(other.id).text),
        other ? other.label : 'no such question on the fixture');

  /* ---- 9. "Something else…" ---- */
  const BUILD = { ...BASE, lib: NAMED, libReady: true, hidden: [] };
  state.input = BUILD;
  const eng = engine(BUILD);
  const p = eng.build({});
  sh = open(UI, trainOpts).sh;
  tap(sh, MAKE); tap(sh, 'Tell me what to train'); tap(sh, 'Change something'); tap(sh, 'Swap one');
  const lift = p.exercises.find(e => e.exId === 'bench');
  tap(sh, lift.name);
  const altRow = chipsIn(box0(sh)).map(b => b.textContent);
  check('the alternatives for a lift end with "Something else…"',
        JSON.stringify(altRow) === JSON.stringify(lift.swaps.map(x => x.name).concat('Something else…')), list(altRow));
  picks.length = 0;
  tap(sh, 'Something else…');
  check('which opens the picker the card handed in, on that lift’s group, with the workout’s own lifts left out',
        picks.length === 1 && picks[0].spec.group === 'chest' &&
        JSON.stringify(picks[0].spec.exclude) === JSON.stringify(lift.other.exclude) && /Bench/.test(picks[0].spec.title),
        picks.length ? JSON.stringify(picks[0].spec) : 'not opened');
  const row = { id: 'flye', ...NAMED.flye };
  if (picks.length) picks[0].done([row]);
  const next = eng.swapTo({}, lift.from, 'flye');
  const want = next.opts ? eng.build(next.opts) : null;
  check('picking one swaps it in exactly as a listed alternative — the engine’s own opts, the same proposal',
        !!want && boxes(sh).length === 1 && JSON.stringify(namesIn(box0(sh))) === JSON.stringify(want.exercises.map(e => e.name)) &&
        namesIn(box0(sh)).includes('Pec Deck') && !namesIn(box0(sh)).includes('Bench'), list(namesIn(box0(sh))));
  check('and the thread says so, the way a listed swap is said', youTexts(sh).includes('Swap Bench for Pec Deck'), list(youTexts(sh)));

  // A pick the engine refuses is said, with its reason, and changes nothing.
  sh = open(UI, trainOpts).sh;
  tap(sh, MAKE); tap(sh, 'Tell me what to train'); tap(sh, 'Change something'); tap(sh, 'Swap one'); tap(sh, 'Bench');
  picks.length = 0; tap(sh, 'Something else…');
  const before = namesIn(box0(sh));
  if (picks.length) picks[0].done([{ id: 'bike', ...NAMED.bike }]);
  check('cardio for a lift: refused in the thread with the engine’s reason, and the workout stays as it was',
        coachTexts(sh).includes('Coach can’t swap that one in.') &&
        find(sh, 'coach-bub-r').some(n => n.textContent === C.coach({ ...BUILD, tier: { pro: true } }).swapTo({}, 'bench', 'bike').why) &&
        JSON.stringify(namesIn(box0(sh))) === JSON.stringify(before), list(coachTexts(sh).slice(-2)));

  // A lift the engine found no alternative for is still offered, because the
  // picker is always there.
  const LONE = { ...BUILD, lib: Object.fromEntries(Object.entries(NAMED).filter(([k]) => k !== 'incline' && k !== 'flye')) };
  state.input = LONE;
  const pl = engine(LONE).build({});
  const lone = pl.exercises.find(e => !e.swaps.length);
  sh = open(UI, trainOpts).sh;
  tap(sh, MAKE); tap(sh, 'Tell me what to train'); tap(sh, 'Change something'); tap(sh, 'Swap one');
  check('a lift with no listed alternative is on Swap one’s list — "Something else…" is always somewhere to go',
        !!lone && chipsIn(box0(sh)).some(b => b.textContent === lone.name), lone ? lone.name : 'every lift had one');
  if (lone) tap(sh, lone.name);
  check('and its row is "Something else…" alone', !!lone &&
        JSON.stringify(chipsIn(box0(sh)).map(b => b.textContent)) === JSON.stringify(['Something else…']));
  // Without a picker handed in, there is no "Something else…".
  state.input = BUILD;
  sh = open(UI, { tight: true, live: false, start() {}, save() {} }).sh;
  tap(sh, MAKE); tap(sh, 'Tell me what to train'); tap(sh, 'Change something'); tap(sh, 'Swap one'); tap(sh, 'Bench');
  check('a card that hands in no picker offers no "Something else…"', !chipsIn(box0(sh)).some(b => b.textContent === 'Something else…'));
  const WS = src('workout.js');
  check('the Train card hands in the ordinary picker: that group, those left out, one tap',
        /pick: \(spec, done\) => openPicker\(done, \{ filter: spec\.group, exclude: spec\.exclude, single: true, title: spec\.title \}\)/.test(WS));
  state.input = BASE;
}

/* ================= K. THE PICKER, AS "SOMETHING ELSE…" OPENS IT ================= */
section('K. the real picker: opened on a group, the workout’s lifts and hidden ones out, one tap picks');
{
  /* picker.js, driven for real through this file's DOM shim: its store is a
     stub whose one answer is a hidden list, so a hidden exercise is really
     hidden, and the log it warms behind the sheet is empty. */
  writeFileSync(join(dir, 'picker-store.mjs'), `
export async function read(path, fallback) { return path === 'exercises/hidden' ? ['incline-dumbbell-bench-press'] : fallback; }
export async function write() {}
`);
  writeFileSync(join(dir, 'usage-stub.mjs'), 'export function bump() {}\n');
  writeFileSync(join(dir, 'picker.mjs'), src('picker.js')
    .replace("from './store.js'", "from './picker-store.mjs'")
    .replace("from './usage.js'", "from './usage-stub.mjs'")
    .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href))
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js')));
  const P = await import(pathToFileURL(join(dir, 'picker.mjs')).href);
  const { EXERCISES } = await import(real('exercises.js').slice(1, -1));
  const byName = Object.fromEntries(EXERCISES.map(x => [x.name, x]));
  await P.initPicker({});
  body.children.length = 0;
  const got = [];
  P.openPicker(chosen => got.push(chosen), { filter: 'chest', exclude: ['barbell-bench-press'], single: true,
    title: 'Swap Barbell Bench Press for…' });
  const sh = body.children.find(x => x.classList.contains('sheet'));
  const rows = find(sh, 'ex-item').map(b => (find(b, 'nm')[0] || {}).textContent);
  check('it opens on the chest chip', find(sh, 'chip').some(c => c.textContent === 'Chest' && c.classList.contains('on')));
  check('every row is a chest exercise', rows.length > 5 && rows.every(n => byName[n] && byName[n].group === 'chest'),
        list(rows.filter(n => !byName[n] || byName[n].group !== 'chest')));
  check('the lift on the workout is not among them, and neither is the hidden one',
        !rows.includes('Barbell Bench Press') && !rows.includes(EXERCISES.find(x => x.id === 'incline-dumbbell-bench-press').name));
  check('it says what the pick is for, and has no Add button to wait on',
        textOf(sh).includes('Swap Barbell Bench Press for…') && !buttonsIn(sh).some(b => /^Add/.test(b.textContent)));
  find(sh, 'ex-item')[0].onclick();
  check('one tap picks: the sheet closes and hands back that one exercise',
        !body.children.includes(sh) && got.length === 1 && got[0].length === 1 && got[0][0].name === rows[0], JSON.stringify(got));
  // And with nothing asked of it, it is the picker it always was.
  body.children.length = 0;
  P.openPicker(() => {});
  const plain = body.children.find(x => x.classList.contains('sheet'));
  check('opened plainly, it is the ordinary picker — multi-select, with its Add button',
        buttonsIn(plain).some(b => /^Add/.test(b.textContent)) &&
        find(plain, 'ex-item').map(b => (find(b, 'nm')[0] || {}).textContent).includes('Barbell Bench Press'));
  body.children.length = 0;
}

/* ================= L. v48 — THE TARGETS ON THE SCREEN ================= */
section('L. v48 — the target line, the goal question under its answer, and Your goal in Settings');
{
  const NAMED = {
    bench: { name: 'Bench', group: 'chest', equipment: 'barbell' }, row: { name: 'Row', group: 'back', equipment: 'barbell' },
    squat: { name: 'Squat', group: 'legs', equipment: 'barbell' }, press: { name: 'Press', group: 'shoulders', equipment: 'barbell' },
    curl: { name: 'Curl', group: 'arms', equipment: 'dumbbell' }
  };
  const BUILD = { ...BASE, lib: NAMED, libReady: true, hidden: [] };
  const tap = (sh, label) => { const b = buttonsIn(sh).find(x => x.textContent === label); if (b) b.onclick(); return !!b; };
  const trainOpts = { tight: true, live: false, start() {}, save() {} };
  const LIFT = C.TRAIN_TOPICS.find(t => t.id === 'ask_targets');
  state.input = BUILD; state.pro = true; state.logKnown = true; state.ready = true; state.calls.length = 0;
  const eng = engine(BUILD);
  const p = eng.build({});

  // The line under each exercise.
  let sh = open(UI, trainOpts).sh;
  tap(sh, C.TRAIN_TOPICS.find(t => t.id === 'ask_build').label); tap(sh, 'Tell me what to train');
  const box = find(sh, 'coach-build').filter(b => b.parent)[0] || mkEl('div');
  const lines = find(box, 'coach-build-target');
  const want = p.exercises.filter(e => e.target && e.target.line).map(e => e.target.line);
  check('every exercise with a target shows its line, word for word, under its note',
        want.length >= 2 && JSON.stringify(lines.map(l => l.textContent)) === JSON.stringify(want), list(lines.map(l => l.textContent)));
  const first = lines[0];
  const firstT = p.exercises.find(e => e.target && e.target.line === (first || {}).textContent).target;
  const dim = n => find(n.parent, 'coach-build-w').map(x => x.textContent);
  first.onclick();
  check('a tap on the line opens its evidence under it, every entry, in the note’s dim type',
        JSON.stringify(dim(first)) === JSON.stringify(firstT.why) && first.getAttribute('aria-expanded') === 'true',
        list(dim(first)));
  first.onclick();
  check('and a second tap puts it away — no new sheet either way',
        !dim(first).length && body.children.filter(x => x.classList.contains('sheet')).length === 1);

  // The Train bubble, and the question under its answer.
  sh = open(UI, trainOpts).sh;
  check('"What should I lift today?" is on the Train sheet, third', chipsIn(sh).map(b => b.textContent)[2] === LIFT.label,
        list(chipsIn(sh).map(b => b.textContent)));
  state.calls.length = 0;
  tap(sh, LIFT.label);
  const a = eng.ask('ask_targets');
  const said = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).map(b => (find(b, 'coach-bub-t')[0] || {}).textContent);
  check('its answer names the workout, then one bubble per lift with a target',
        a.id === 'lift_targets' && said.includes(a.text) && (a.more || []).length >= 2 && a.more.every(m => said.includes(m.text)),
        list(said));
  check('the answer carries the goal question, and the sheet draws it as the opening question is drawn — stamped as asked',
        !!a.question && a.question.id === 'q_goal_aim' &&
        find(sh, 'coach-bub').some(b => b.classList.contains('ask') && textOf(b).includes(a.question.text)) &&
        state.calls.some(x => x[0] === 'markAsked' && x[1] === 'q_goal_aim'), JSON.stringify(state.calls));
  const askBub = find(sh, 'coach-bub').find(b => b.classList.contains('ask'));
  const aims = askBub ? chipsIn(askBub).map(b => b.textContent) : [];
  check('with a chip for each of the six aims', JSON.stringify(aims) === JSON.stringify(a.question.options.map(o => o.label)) &&
        aims.length === 6, list(aims));
  tap(askBub || mkEl('div'), 'Powerlifting');
  check('tapping one saves it and answers with the question’s own acknowledgement, not the weight question’s',
        state.calls.some(x => x[0] === 'answerQuestion' && x[1] === 'q_goal_aim' && x[2] === 'powerlifting') &&
        find(sh, 'coach-bub-t').some(n => n.textContent === 'Noted. Coach sets your targets with that in mind.') &&
        !find(sh, 'coach-bub-t').some(n => n.textContent === 'Noted. That changes how Coach reads your weight.'));
  check('the goal question is never the sheet’s opening question', engine(BUILD).question === null ||
        !['q_goal_aim', 'q_experience'].includes(engine(BUILD).question.id));

  // The opening question keeps its own words.
  state.input = QUESTIONING; state.calls.length = 0;
  sh = open(UI, {}).sh;
  const opener = find(sh, 'coach-bub').find(b => b.classList.contains('ask'));
  if (opener) tap(opener, chipsIn(opener)[0].textContent);
  check('the weight question still answers with the shipped line',
        !!opener && find(sh, 'coach-bub-t').some(n => n.textContent === 'Noted. That changes how Coach reads your weight.'));

  // Switched off: no bubble.
  state.input = { ...BUILD, settings: { ...BUILD.settings, mute: { targets: true } } };
  check('targets switched off: no "What should I lift today?" bubble',
        !chipsIn(open(UI, trainOpts).sh).some(b => b.textContent === LIFT.label));

  // Settings → Coach → Your goal.
  const host = mkEl('div');
  state.input = BUILD; state.pro = true; state.calls.length = 0;
  UI.coachAnswerRows(host, () => {});
  const heads = find(host, 'you-sec-t').map(n => n.textContent);
  check('Settings shows a Your goal heading on a Pro account, before either question is answered',
        JSON.stringify(heads) === JSON.stringify(['Your goal']), list(heads));
  const labels = walk(host).filter(n => n.tag === 'label').map(n => n.textContent);
  check('with both goal questions under it', labels.includes('What are you training for right now?') &&
        labels.includes('How long have you been lifting consistently?'), list(labels));
  const rows = find(host, 'ob-choice');
  check('six aims as vertical choice rows, nothing selected', rows.length === 6 && !rows.some(r => r.classList.contains('on')),
        rows.length + ' rows');
  check('three experience answers on the segmented control, nothing selected',
        find(host, 'seg-btn').length === 3 && !find(host, 'seg-btn').some(b => b.classList.contains('on')));
  rows[4].onclick();
  check('a tap saves the answer and marks that row', rows[4].classList.contains('on') &&
        state.calls.some(x => x[0] === 'answerQuestion' && x[1] === 'q_goal_aim' && x[2] === 'recomp'), JSON.stringify(state.calls));
  const answered = mkEl('div');
  state.input = { ...BUILD, settings: { ...BUILD.settings, answers: { q_goal_aim: 'cut', q_experience: 'years' } } };
  UI.coachAnswerRows(answered, () => {});
  check('an answered goal shows its answers selected',
        find(answered, 'ob-choice').filter(r => r.classList.contains('on')).map(r => textOf(r)).join() === 'Lose fat, keep strength' &&
        find(answered, 'seg-btn').filter(b => b.classList.contains('on')).map(b => b.textContent).join() === 'Two years or more');
  state.pro = false;
  const basic = mkEl('div');
  state.input = BUILD;
  UI.coachAnswerRows(basic, () => {});
  check('a basic account sees no Your goal block — the goal turns the targets, and the targets are Pro',
        !find(basic, 'you-sec-t').length && !find(basic, 'ob-choice').length);
  state.pro = true; state.input = BASE; body.children.length = 0;
}

/* ---------- report ---------- */
console.log('\nthe lock means something, and the sheet knows which card opened it\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
