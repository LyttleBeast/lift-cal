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
/* coach-build.js, the workout builder, is staged the same way: coach.js
   imports it, and it takes analytics.js's session math through the same stub. */
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
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
    const said = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).pop();
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
  check('present on Train, for Pro, with a log that builds — and it is the first bubble',
        labelsIn(pro)[0] === MAKE, list(labelsIn(pro)));

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
  const viaTopic = eng.ask('topic_train').followups.some(f => f.id === 'ask_build');
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
  const FOUR = ['Start it', 'Start with my last numbers', 'Save as routine', 'Change something'];
  const tap = (sh, label) => {
    const b = buttonsIn(sh).find(x => x.textContent === label);
    if (b) b.onclick();
    return !!b;
  };
  const boxes = sh => find(sh, 'coach-build').filter(b => b.parent);
  const actsIn = box => buttonsIn(box).filter(b => b.classList.contains('btn')).map(b => b.textContent);
  const namesIn = box => find(box, 'day-ex-name').map(n => n.textContent);

  state.input = BUILD; state.pro = true; state.logKnown = true; state.ready = true;
  const eng = engine(BUILD);
  const p = eng.build({});
  check('the fixture builds, with every follow-up on offer', !!p && p.focuses.length > 0 && !!p.fewer &&
        p.exercises.some(e => e.swaps.length), p ? p.key : 'null');

  let sh = open(UI, trainOpts).sh;
  tap(sh, MAKE);
  let box = boxes(sh);
  check('tapping "Make me a workout" draws the proposal at once — nothing is asked first',
        box.length === 1, String(box.length));
  box = box[0];
  const said = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).pop();
  check('under an answer that names the session it was built from',
        !!said && (find(said, 'coach-bub-t')[0] || {}).textContent === p.headline, p.headline);
  check('every exercise the engine built, in its order, under its own name',
        JSON.stringify(namesIn(box)) === JSON.stringify(p.exercises.map(e => e.name)), list(namesIn(box)));
  check('each with its sets exactly as the engine wrote them — the sheet invents no number',
        JSON.stringify(find(box, 'day-ex-sets').map(n => n.textContent)) === JSON.stringify(p.exercises.map(e => e.line)),
        list(find(box, 'day-ex-sets').map(n => n.textContent)));
  check('then EXACTLY four buttons, in order', JSON.stringify(actsIn(box)) === JSON.stringify(FOUR), list(actsIn(box)));

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
  sh = open(UI, trainOpts).sh; tap(sh, MAKE); tap(sh, 'Start with my last numbers');
  check('"Start with my last numbers" hands over the filled view, and closes the sheet',
        calls.length === 1 && JSON.stringify(calls[0][1]) === JSON.stringify(p.lastNumbers) &&
        !body.children.some(x => x.classList.contains('sheet')));
  check('with every set unticked', calls.length === 1 && calls[0][1].exercises.every(e => e.sets.every(x => x.done === false)));

  // Save as routine.
  calls.length = 0;
  sh = open(UI, trainOpts).sh; tap(sh, MAKE); tap(sh, 'Save as routine');
  check('"Save as routine" hands saveSessionAsRoutine the record, named for the shape',
        calls.length === 1 && calls[0][0] === 'save' && JSON.stringify(calls[0][1]) === JSON.stringify(p.record) &&
        calls[0][1].name === p.name, calls.length ? calls[0][1].name : 'not called');
  check('and leaves the sheet where it is', body.children.some(x => x.classList.contains('sheet')));

  // Change something.
  sh = open(UI, trainOpts).sh; tap(sh, MAKE);
  tap(sh, 'Change something');
  const changeRow = chipsIn(boxes(sh)[0]).map(b => b.textContent);
  check('"Change something" offers the three follow-ups the engine has', JSON.stringify(changeRow) ===
        JSON.stringify(['Train something else', 'Fewer exercises', 'Swap one']), list(changeRow));

  tap(sh, 'Fewer exercises');
  const fewer = eng.build(p.fewer);
  check('"Fewer exercises" re-runs the builder and redraws: one proposal, one fewer lift',
        boxes(sh).length === 1 && namesIn(boxes(sh)[0]).length === p.exercises.length - 1 &&
        JSON.stringify(namesIn(boxes(sh)[0])) === JSON.stringify(fewer.exercises.map(e => e.name)),
        list(namesIn(boxes(sh)[0])));
  check('with the four buttons again, on the new one', JSON.stringify(actsIn(boxes(sh)[0])) === JSON.stringify(FOUR));
  check('and the tap is said in the thread, as a follow-up rather than a question',
        find(sh, 'coach-bub').filter(b => b.classList.contains('you')).some(b => textOf(b) === 'Fewer exercises'));

  sh = open(UI, trainOpts).sh; tap(sh, MAKE); tap(sh, 'Change something'); tap(sh, 'Swap one');
  const swapRow = chipsIn(boxes(sh)[0]).map(b => b.textContent);
  // One chip per lift: a lift repeated in a duplicated block swaps as one.
  const swappable = p.exercises.filter((e, n) => e.swaps.length && p.exercises.findIndex(x => x.exId === e.exId) === n);
  check('"Swap one" asks which lift, offering only the ones with somewhere to go',
        JSON.stringify(swapRow) === JSON.stringify(swappable.map(e => e.name)), list(swapRow));
  const target = swappable[0];
  tap(sh, target.name);
  const altRow = chipsIn(boxes(sh)[0]).map(b => b.textContent);
  check('then offers its alternatives, the engine’s own, five at most',
        JSON.stringify(altRow) === JSON.stringify(target.swaps.map(x => x.name)) && altRow.length <= 5, list(altRow));
  tap(sh, target.swaps[0].name);
  const swapped = eng.build(target.swaps[0].opts);
  check('taking one redraws the workout with it in that lift’s place',
        boxes(sh).length === 1 && JSON.stringify(namesIn(boxes(sh)[0])) === JSON.stringify(swapped.exercises.map(e => e.name)) &&
        namesIn(boxes(sh)[0]).includes(target.swaps[0].name), list(namesIn(boxes(sh)[0])));
  calls.length = 0;
  tap(sh, 'Start it');
  check('and what starts is the swapped workout, not the one before it',
        calls.length === 1 && JSON.stringify(calls[0][1]) === JSON.stringify(swapped.placeholders));

  sh = open(UI, trainOpts).sh; tap(sh, MAKE); tap(sh, 'Change something'); tap(sh, 'Train something else');
  const focusRow = chipsIn(boxes(sh)[0]).map(b => b.textContent);
  check('"Train something else" offers the engine’s other options, only those that build',
        JSON.stringify(focusRow) === JSON.stringify(p.focuses.map(f => f.label)), list(focusRow));
  tap(sh, p.focuses[0].label);
  const other = eng.build(p.focuses[0].opts);
  const heads = find(sh, 'coach-bub').filter(b => b.classList.contains('coach')).map(b => (find(b, 'coach-bub-t')[0] || {}).textContent);
  check('and a new focus is a new workout, with its own first line naming its own session',
        heads.includes(other.headline) && other.base.id !== p.base.id &&
        JSON.stringify(namesIn(boxes(sh)[0])) === JSON.stringify(other.exercises.map(e => e.name)), other.headline);

  /* The layoff: no filled view exists, so there is no button for it — three,
     not four — and the line saying why is on the sheet. */
  state.input = { ...BUILD, now: NOW + 30 * DAY };
  const lay = engine(state.input).build({});
  sh = open(UI, trainOpts).sh; tap(sh, MAKE);
  check('after a layoff there is no "Start with my last numbers" at all',
        !!lay && lay.lastNumbers === null && boxes(sh).length === 1 &&
        JSON.stringify(actsIn(boxes(sh)[0])) === JSON.stringify(FOUR.filter(l => l !== 'Start with my last numbers')),
        boxes(sh).length ? list(actsIn(boxes(sh)[0])) : 'no proposal');
  check('and the sheet says how long it has been', !!lay && textOf(boxes(sh)[0]).includes(lay.layoffLine), lay && lay.layoffLine);

  /* What is left out is said, once, on the sheet. */
  state.input = { ...BUILD, hidden: ['press'], lib: Object.fromEntries(Object.entries(NAMED).filter(([k]) => k !== 'press')) };
  const lo = engine(state.input).build({});
  sh = open(UI, trainOpts).sh; tap(sh, MAKE);
  check('a hidden lift is left out and the sheet says so',
        !!lo && !!lo.leftOutLine && boxes(sh).length === 1 && textOf(boxes(sh)[0]).includes(lo.leftOutLine) &&
        !namesIn(boxes(sh)[0]).includes('Press'), lo ? String(lo.leftOutLine) : 'no proposal');

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

/* ---------- report ---------- */
console.log('\nthe lock means something, and the sheet knows which card opened it\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
