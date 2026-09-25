#!/usr/bin/env node
//
// Verifier for Coach's four registries.
//
//   node tools-check/coach-registry.mjs
//
// coach.js is four tables and a sort. That is the whole design: adding to Coach
// has to mean adding a fact, a rule, a template or a phrasing, never editing a
// function that grows. The price of tables is that nothing in the language
// checks them — a fact id typed twice, an intent needing a fact nobody wrote, a
// category with no toggle behind it and a response two intents share all load
// perfectly well and go wrong on a phone.
//
// The draft of the intent catalog this ship was built from had THREE
// definitions of group.daysSinceLastTrained, three names for one
// log-confidence fact with one polarity inverted, and thirty-five category
// strings against eight toggles. Every check below is one of those, made
// impossible.
//
// Nothing here holds a copy of a registry. coach.js is imported for real, with
// store.js stubbed underneath analytics.js — which is itself a check: coach.js
// is only allowed to reach analytics for its session MATH, and a stub that
// answers nothing would fail loudly if it ever reached for a read.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-reg-'));
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
// v52: coach-fuel.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-fuel.mjs'), src('coach-fuel.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v52: coach-ready.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-ready.mjs'), src('coach-ready.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-fuel.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-fuel.mjs')).href))
  .replace("from './coach-ready.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-ready.mjs')).href))
  .replace("from './coach-volume.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-volume.mjs')).href))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v54: coach-volume.js, the whole week, staged the same way (the staging edit
// the brief allows everywhere): coach.js imports it.
writeFileSync(join(dir, 'coach-volume.mjs'), src('coach-volume.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ' total)' : '');

const FACTS = C.FACTS, INTENTS = C.INTENTS, RESPONSES = C.RESPONSES;
const QUESTIONS = C.QUESTIONS, CATEGORIES = C.CATEGORIES, GREETINGS = C.GREETINGS;
const factIds  = FACTS.map(f => f.id);
const factSet  = new Set(factIds);
const intentIds = INTENTS.map(i => i.id);
const intentSet = new Set(intentIds);

/* ================= A. FACT IDS ================= */
section('A. one fact, one id — the draft had three definitions of one of them');
{
  const dupes = factIds.filter((id, i) => factIds.indexOf(id) !== i);
  check('no fact id is registered twice (' + factIds.length + ' facts)', !dupes.length, list([...new Set(dupes)]));

  // v53 (on purpose): `feel`, his own rating after a workout — the three
  // energy patterns (Micah's decision, 24 Sep 2026) are facts about it.
  const NAMESPACES = ['log', 'session', 'group', 'lift', 'fuel', 'weight', 'steps', 'live', 'meta', 'coach', 'feel'];
  const off = factIds.filter(id => !NAMESPACES.includes(id.split('.')[0]));
  check('every id is dot-namespaced into one of the eleven families', !off.length, list(off));
  const shape = factIds.filter(id => !/^[a-z]+\.[a-zA-Z0-9]+$/.test(id));
  check('and every id is exactly family.name', !shape.length, list(shape));

  const noCompute = FACTS.filter(f => typeof f.compute !== 'function').map(f => f.id);
  check('every fact has a compute', !noCompute.length, list(noCompute));
  const noBecause = FACTS.filter(f => typeof f.because !== 'function').map(f => f.id);
  check('and every fact carries the short "because" it contributes to a reason line',
        !noBecause.length, list(noBecause));
  const badUnit = FACTS.filter(f => !('unit' in f)).map(f => f.id);
  check('and declares a unit (null is a unit — it means "this is not a measurement")',
        !badUnit.length, list(badUnit));
}

/* ================= B. REQUIRES ================= */
section('B. a fact that needs another fact names one that exists, and no ring of them');
{
  const dangling = [];
  FACTS.forEach(f => (f.requires || []).forEach(r => { if (!factSet.has(r)) dangling.push(f.id + ' -> ' + r); }));
  check('every `requires` resolves to a registered fact', !dangling.length, list(dangling));

  // A cycle would be answered null at runtime rather than blowing the stack,
  // which is safe and also completely silent. Catch it here instead.
  const cycles = [];
  const byId = Object.fromEntries(FACTS.map(f => [f.id, f]));
  factIds.forEach(start => {
    const seen = new Set(); const stack = [start];
    while (stack.length) {
      const id = stack.pop();
      if (id === start && seen.size) { cycles.push(start); break; }
      if (seen.has(id)) continue;
      seen.add(id);
      (byId[id] ? byId[id].requires || [] : []).forEach(r => stack.push(r));
    }
  });
  check('no fact requires itself, directly or round a ring', !cycles.length, list([...new Set(cycles)]));
}

/* ================= C. INTENTS ================= */
section('C. every intent carries the whole schema');
{
  const dupes = intentIds.filter((id, i) => intentIds.indexOf(id) !== i);
  check('no intent id is registered twice (' + intentIds.length + ' intents)', !dupes.length, list([...new Set(dupes)]));

  const KINDS = ['guard', 'state', 'finding', 'selector'];
  const SURFACES = ['you', 'train', 'sheet'];
  const bad = { kind: [], tier: [], band: [], sev: [], surf: [], gate: [], when: [], sup: [] };
  INTENTS.forEach(i => {
    if (!KINDS.includes(i.kind)) bad.kind.push(i.id);
    if (!['free', 'pro'].includes(i.tier)) bad.tier.push(i.id);
    if (!Number.isInteger(i.priorityBand) || i.priorityBand < 1 || i.priorityBand > 5) bad.band.push(i.id);
    if (!Number.isInteger(i.severity) || i.severity < 0 || i.severity > 99) bad.sev.push(i.id);
    if (!Array.isArray(i.surfaces) || i.surfaces.some(s => !SURFACES.includes(s))) bad.surf.push(i.id);
    if (typeof i.minData !== 'function') bad.gate.push(i.id);
    if (typeof i.when !== 'function') bad.when.push(i.id);
    if (!Array.isArray(i.supersedes)) bad.sup.push(i.id);
  });
  check('kind is one of guard|state|finding|selector', !bad.kind.length, list(bad.kind));
  check('tier is free or pro', !bad.tier.length, list(bad.tier));
  check('priorityBand is 1-5', !bad.band.length, list(bad.band));
  check('severity is 0-99', !bad.sev.length, list(bad.sev));
  check('surfaces are drawn from you|train|sheet', !bad.surf.length, list(bad.surf));
  check('every intent has a min-data gate and a condition', !bad.gate.length && !bad.when.length,
        list(bad.gate.concat(bad.when)));
  check('every intent has a supersedes array, empty or otherwise', !bad.sup.length, list(bad.sup));

  const badFacts = [];
  INTENTS.forEach(i => (i.factsNeeded || []).forEach(f => { if (!factSet.has(f)) badFacts.push(i.id + ' -> ' + f); }));
  check('every factsNeeded entry resolves to a registered fact', !badFacts.length, list(badFacts));

  const badSup = [];
  INTENTS.forEach(i => i.supersedes.forEach(x => { if (!intentSet.has(x)) badSup.push(i.id + ' -> ' + x); }));
  check('every supersedes entry names a registered intent', !badSup.length, list(badSup));
  const selfSup = INTENTS.filter(i => i.supersedes.includes(i.id)).map(i => i.id);
  check('nothing supersedes itself', !selfSup.length, list(selfSup));
  // A pair that each name the other would make the surviving one depend on the
  // order the filter happened to run in, which is the one thing ranking may not
  // depend on.
  const mutual = [];
  INTENTS.forEach(a => a.supersedes.forEach(bId => {
    const b = INTENTS.find(x => x.id === bId);
    if (b && b.supersedes.includes(a.id)) mutual.push(a.id + ' <-> ' + bId);
  }));
  check('no two intents supersede each other', !mutual.length, list([...new Set(mutual)]));
}

/* ================= D. RESPONSES ================= */
section('D. one response, one intent — a shared template is two findings saying one thing');
{
  const used = INTENTS.map(i => i.response);
  const dupes = used.filter((r, i) => used.indexOf(r) !== i);
  check('no two intents share a response', !dupes.length, list([...new Set(dupes)]));

  const missing = INTENTS.filter(i => !RESPONSES[i.response]).map(i => i.id + ' -> ' + i.response);
  check('every intent names a response that exists', !missing.length, list(missing));

  const orphan = Object.keys(RESPONSES).filter(r => !used.includes(r));
  check('and every response is named by an intent — no orphan templates', !orphan.length, list(orphan));

  const noText = Object.keys(RESPONSES).filter(r => typeof RESPONSES[r].text !== 'function');
  check('every response builds its text from the facts rather than holding a string',
        !noText.length, list(noText));
}

/* ================= E. CATEGORIES AND TOGGLES ================= */
section('E. every category maps to exactly one toggle');
{
  const ids = CATEGORIES.map(c => c.id);
  check('no category is declared twice', new Set(ids).size === ids.length,
        list(ids.filter((c, i) => ids.indexOf(c) !== i)));
  check('CATEGORY_IDS is the same list in the same order — it IS categoryIndex',
        C.CATEGORY_IDS.length === ids.length && C.CATEGORY_IDS.every((x, i) => x === ids[i]));

  const orphan = INTENTS.filter(i => !ids.includes(i.category)).map(i => i.id + ' -> ' + i.category);
  check('every intent names a category that has a row', !orphan.length, list(orphan));

  check('core and safety are declared NOT mutable — the card must always be able to say it cannot read the log',
        CATEGORIES.find(c => c.id === 'core').mutable === false &&
        CATEGORIES.find(c => c.id === 'safety').mutable === false);
  const noLabel = CATEGORIES.filter(c => !c.label || !c.note).map(c => c.id);
  check('every mutable category has a label and a line saying what it covers', !noLabel.length, list(noLabel));

  // Unused rows are the other direction of the same drift: a toggle in Settings
  // that switches nothing off.
  /* v53, one exemption, on purpose: `feel` is a SURFACE, not an intent — the
     recap's "How did that feel?" card, which its switch hides — so it
     switches something off without an intent behind it. It is free, so it
     adds nothing to PRO_ADDS either. */
  const SURFACES = ['feel'];
  const unused = ids.filter(id => !SURFACES.includes(id) && !INTENTS.some(i => i.category === id));
  check('every category is used by at least one intent — no toggle that switches nothing off',
        !unused.length, list(unused));
  check('and the one that is a surface is really read by one: workout.js draws the check-in behind isMuted(…, \'feel\')',
        /isMuted\(coachSettings\(\), 'feel'\)/.test(src('workout.js')) && !C.PRO_ADDS.some(a => a.id === 'feel'));
}

/* ================= F. QUESTIONS ================= */
section('F. Coach asks nothing whose answer changes nothing');
{
  const qIds = QUESTIONS.map(q => q.id);
  check('no question id is registered twice', new Set(qIds).size === qIds.length);
  check('every question id is shaped q_*', qIds.every(id => /^q_[a-z_]+$/.test(id)), list(qIds));

  const bad = QUESTIONS.filter(q =>
    !q.text || !Array.isArray(q.options) || q.options.length < 2 ||
    typeof q.when !== 'function' || !Array.isArray(q.changes) || !q.changes.length).map(q => q.id);
  check('every question has text, at least two options, a gate and a `changes` list', !bad.length, list(bad));

  // THE CHECK THE BRIEF ASKS FOR, in both directions.
  const unref = QUESTIONS.filter(q => !q.changes.every(x => intentSet.has(x))).map(q => q.id);
  check('every question names registered rules in `changes`', !unref.length, list(unref));
  const noFact = QUESTIONS.filter(q => !factSet.has(q.fact)).map(q => q.id);
  check('and names the registered fact its answer feeds', !noFact.length, list(noFact));
  const notDeclared = QUESTIONS.filter(q => {
    const f = FACTS.find(x => x.id === q.fact);
    return !f || !Array.isArray(f.usesAnswers) || !f.usesAnswers.includes(q.id);
  }).map(q => q.id);
  check('and that fact declares the question back, so the link cannot be one-way', !notDeclared.length, list(notDeclared));

  // The strongest form of "referenced by a rule": answering it really does move
  // the rule it claims to move. Driven, not asserted.
  QUESTIONS.forEach(q => {
    const f = FACTS.find(x => x.id === q.fact);
    const before = new Set(), after = new Set();
    q.options.forEach(op => {
      const d = { input: { settings: { answers: {} }, weight: {} } };
      before.add(JSON.stringify(f.compute(d)));
      const d2 = { input: { settings: { answers: { [q.id]: op.value } }, weight: {} } };
      after.add(JSON.stringify(f.compute(d2)));
    });
    check(q.id + ': answering it really changes ' + q.fact,
          before.size === 1 && [...before][0] === 'null' && after.size === q.options.length,
          'before ' + [...before].join('/') + ' after ' + [...after].join('/'));
  });

  const declared = FACTS.filter(f => Array.isArray(f.usesAnswers)).flatMap(f => f.usesAnswers);
  const ghost = declared.filter(id => !qIds.includes(id));
  check('no fact reads an answer to a question that was never registered', !ghost.length, list(ghost));
}

/* ================= G. GREETINGS ================= */
section('G. the rotating line — five words, no exclamation, never the same one twice');
{
  const ids = GREETINGS.map(g => g.id);
  check('no greeting id is registered twice', new Set(ids).size === ids.length,
        list(ids.filter((x, i) => ids.indexOf(x) !== i)));
  const bad = GREETINGS.filter(g => !['generic', 'data'].includes(g.kind) ||
                                    !['warm', 'neutral'].includes(g.tone) ||
                                    typeof g.text !== 'function').map(g => g.id);
  check('every line has a kind, a tone and a text function', !bad.length, list(bad));
  const gated = GREETINGS.filter(g => g.kind === 'data' && typeof g.gate !== 'function').map(g => g.id);
  check('every data-aware line has a gate — an ungated one is a generic line pretending', !gated.length, list(gated));
  const ungated = GREETINGS.filter(g => g.kind === 'generic' && g.gate).map(g => g.id);
  check('and no generic line has one', !ungated.length, list(ungated));
  const topics = GREETINGS.filter(g => g.topic && !C.CATEGORY_IDS.includes(g.topic)).map(g => g.id);
  check('every topic names a real category, so the stutter filter can compare them', !topics.length, list(topics));
  check('there are generic lines left over when every gate fails',
        GREETINGS.filter(g => g.kind === 'generic').length >= 3);
  check('and data-aware lines to prefer over them',
        GREETINGS.filter(g => g.kind === 'data').length >= 3);
}

/* ================= H. THE BANDS ================= */
section('H. band 1 belongs to step 0 and nothing else may occupy it');
{
  const band1 = INTENTS.filter(i => i.priorityBand === 1);
  check('no finding sits in band 1', !band1.some(i => i.kind === 'finding'),
        list(band1.filter(i => i.kind === 'finding').map(i => i.id)));
  check('every band-1 intent is a guard or a state', band1.every(i => ['guard', 'state'].includes(i.kind)));
  const findings = INTENTS.filter(i => i.kind === 'finding');
  check('every finding sits in bands 2-5', findings.every(i => i.priorityBand >= 2 && i.priorityBand <= 5),
        list(findings.filter(i => i.priorityBand < 2).map(i => i.id)));
  check('the three blocking states are all registered and all band 1',
        ['guard_log_unreadable', 'card_first_run', 'card_live_session'].every(id => {
          const i = INTENTS.find(x => x.id === id);
          return i && i.priorityBand === 1;
        }));
  check('the stopping bias: the caution findings outrank every do-more finding',
        Math.min(...INTENTS.filter(i => i.kind === 'finding' && i.category === 'safety').map(i => i.priorityBand)) <=
        Math.min(...INTENTS.filter(i => i.kind === 'finding' && i.category !== 'safety').map(i => i.priorityBand)));
  check('and name them in their supersedes rather than merely outranking them',
        INTENTS.filter(i => i.kind === 'finding' && i.category === 'safety')
               .every(i => i.supersedes.length >= 3));
}

/* ================= I. v49 ================= */
section('I. v49 — the rest category, the new intents and questions, and the card’s earned lines');
{
  const ids = CATEGORIES.map(c => c.id);
  check('category rest ("Rest and lighter weeks") sits directly after recency, mutable, and Patterns is still last',
        ids.indexOf('rest') === ids.indexOf('recency') + 1 && CATEGORIES.find(c => c.id === 'rest').mutable === true &&
        CATEGORIES.find(c => c.id === 'rest').label === 'Rest and lighter weeks' && ids[ids.length - 1] === 'patterns', ids.join(','));
  const want = { lift_status: 'selector', record_day: 'selector', lighter_week: 'finding', session_compare: 'selector',
                 next_targets: 'selector', goal_pace: 'selector' };
  const wrong = Object.entries(want).filter(([id, kind]) => {
    const i = INTENTS.find(x => x.id === id);
    return !i || i.kind !== kind || i.tier !== 'pro' || JSON.stringify(i.surfaces) !== '["sheet"]';
  }).map(([id]) => id);
  check('the six new intents are registered: Pro, sheet-only, lighter_week the one finding among them', !wrong.length, list(wrong));
  const lw = INTENTS.find(i => i.id === 'lighter_week');
  check('lighter_week is in rest and supersedes the record and near-record findings — the stopping bias',
        lw.category === 'rest' && lw.supersedes.includes('recent_pr') && lw.supersedes.includes('pr_proximity'));
  const routes = { ask_lifts: 'lift_status', ask_record_day: 'record_day', ask_lighter: 'lighter_week', ask_compare: 'session_compare',
                   ask_next: 'next_targets', ask_goal: 'goal_pace' };
  check('each is answered by its own route', Object.keys(routes).every(r => C.ROUTE_IDS.includes(r)));
  const st = INTENTS.find(i => i.id === 'stalled_lift');
  check('stalled_lift keeps its id and its fact, and now needs stage two’s reading of the same lift',
        !!st && st.factsNeeded[0] === 'lift.stalled' && st.factsNeeded.includes('lift.stallRead'));
  const q = id => QUESTIONS.find(x => x.id === id);
  const f = q('q_focus_group');
  check('q_focus_group: asked under the goal answer, shown in Your goal, six groups and "No focus", changing goal_pace',
        !!f && f.always === true && f.where === 'goal' && f.options.length === 7 && f.options[6].value === 'none' &&
        f.changes.includes('goal_pace') && f.fact === 'coach.focus');
  const checks = ['q_goal_check_weight', 'q_goal_check_targets'].map(q);
  check('the two goal-change questions: the sheet’s opener (no `where`), text a function of the log, stale-able, kept out of Settings',
        checks.every(x => x && !x.where && typeof x.text === 'function' && typeof x.stale === 'function' && x.settings === false &&
                          JSON.stringify(x.options.map(o => o.value)) === '["update","temp","keep"]'));
  // The card's earned lines.
  const H = C.HYPE;
  const hids = H.map(h => h.id);
  check('the HYPE registry: unique ids, all hype_*', new Set(hids).size === hids.length && hids.every(id => /^hype_[a-z0-9_]+$/.test(id)), list(hids));
  const badH = H.filter(h => !CATEGORIES.some(c => c.id === h.category) || !Array.isArray(h.facts) || !h.facts.length ||
    h.facts.some(fid => !factSet.has(fid)) || typeof h.gate !== 'function' || typeof h.text !== 'function' || typeof h.why !== 'function' ||
    !(h.aims === null || (Array.isArray(h.aims) && h.aims.every(a => ['strength', 'powerlifting', 'muscle', 'cut', 'recomp', 'maintain'].includes(a)))))
    .map(h => h.id);
  check('every line names a real category, registered facts, the aims it suits (or null), and its gate, text and why', !badH.length, list(badH));
  check('and the table is frozen', Object.isFrozen(H));
}

section('J. v52 — the readiness category, three new selectors, and a mark that is not a question');
{
  const ids = CATEGORIES.map(c => c.id);
  const rd = CATEGORIES.find(c => c.id === 'readiness');
  check('category readiness sits directly after rest, mutable, with its note — and Patterns is still last',
        ids.indexOf('readiness') === ids.indexOf('rest') + 1 && !!rd && rd.mutable === true && rd.label === 'Readiness' &&
        rd.note === 'Before a workout: what in your log is different from your normal today.' && ids[ids.length - 1] === 'patterns', ids.join(','));
  const want = { rest_day: 'rest', group_ready: 'rest', readiness: 'readiness' };
  const wrong = Object.entries(want).filter(([id, cat]) => {
    const i = INTENTS.find(x => x.id === id);
    return !i || i.kind !== 'selector' || i.tier !== 'pro' || JSON.stringify(i.surfaces) !== '["sheet"]' || i.category !== cat;
  }).map(([id]) => id);
  check('rest_day, group_ready and readiness are SELECTORS — Pro, sheet-only — so no card paint ranks them', !wrong.length, list(wrong));
  // Against rack-v51's own table, read out of git.
  const v51 = execFileSync('git', ['show', '99b49ea:coach.js'], { cwd: ROOT, encoding: 'utf8' });
  const v51Findings = [...v51.matchAll(/id: '([a-z_]+)', kind: 'finding'/g)].map(m => m[1]).sort();
  check('no finding was added: stage four competes for no card — the findings are rack-v51’s ' + v51Findings.length,
        v51Findings.length > 10 && JSON.stringify(INTENTS.filter(i => i.kind === 'finding').map(i => i.id).sort()) === JSON.stringify(v51Findings),
        INTENTS.filter(i => i.kind === 'finding').map(i => i.id).join(','));
  check('"Train anyway" is its own route, to the builder’s menu', C.ROUTE_IDS.includes('ask_build_anyway'));
  check('the Pro panel lists Readiness — derived from the table, not typed', C.PRO_ADDS.some(a => a.id === 'readiness' && a.label === 'Readiness'));
  // The mark under "How did today compare?" is not one of QUESTIONS: nothing
  // it stores is an answer, and "Nothing" stores nothing at all.
  check('the bad-day mark is not a question: no QUESTIONS entry carries its words or its reasons',
        !QUESTIONS.some(q => /can’t see/.test(typeof q.text === 'string' ? q.text : '') ||
                             q.options.some(o => ['sleep', 'stress', 'sore', 'unwell'].includes(o.value))));
  check('its options: four reasons and Nothing, each with the words it says back',
        C.MARK_ASK.options.map(o => o.value).join(',') === 'sleep,stress,sore,unwell,' &&
        C.MARK_ASK.options.every(o => typeof o.label === 'string' && typeof o.ack === 'string' && o.ack.startsWith('Noted.')));
  check('and the words a sentence uses for each reason are Coach’s, not the chip’s',
        JSON.stringify(C.MARK_WORDS) === JSON.stringify({ sleep: 'slept badly', stress: 'stressed', sore: 'sore', unwell: 'felt unwell' }));
  const n = C.normSettings({ marks: { ok1: { r: 'sleep', d: '2026-09-01' }, 'bad id!': { r: 'sleep', d: '2026-09-01' },
    ok2: { r: 'tired', d: '2026-09-01' }, ok3: { r: 'sore', d: 'yesterday' }, ok4: null } });
  check('normSettings keeps a mark only with an id’s shape, one of the four reasons and a date key', JSON.stringify(n.marks) === '{"ok1":{"r":"sleep","d":"2026-09-01"}}',
        JSON.stringify(n.marks));
  check('and a node with no mark that survives keeps the shipped shape — no `marks` key at all',
        !('marks' in C.normSettings({ marks: { x: { r: 'nope', d: '2026-09-01' } } })) && !('marks' in C.normSettings({})));
  const facts = ['session.rest', 'session.usualRun', 'session.buildFocus', 'session.readiness', 'session.diffs', 'session.replay'];
  check('the new facts are registered once each', facts.every(id => FACTS.filter(f => f.id === id).length === 1), list(facts.filter(id => !FACTS.some(f => f.id === id))));
}

section('K. v52, Phase B — "Am I fueled?": four selectors, and q_log_timing with its own fact');
{
  const want = ['fuel_empty', 'fuel_fueled', 'fuel_fed_unlogged', 'fuel_fed_none'];
  const bad = want.filter(id => { const i = INTENTS.find(x => x.id === id);
    return !i || i.kind !== 'selector' || i.tier !== 'pro' || i.category !== 'fuel' || JSON.stringify(i.surfaces) !== '["sheet"]'; });
  check('fuel_empty, fuel_fueled, fuel_fed_unlogged and fuel_fed_none: selectors, Pro, sheet-only, in Food', !bad.length, list(bad));
  const q = QUESTIONS.find(x => x.id === 'q_log_timing');
  check('q_log_timing: asked under "Am I fueled?" (where: fuel), As I go or Later, changing fuel_fueled, with its own fact',
        !!q && q.where === 'fuel' && q.text === 'Do you usually log food as you go, or later in the day?' &&
        JSON.stringify(q.options.map(o => [o.value, o.label])) === JSON.stringify([['live', 'As I go'], ['later', 'Later']]) &&
        JSON.stringify(q.changes) === '["fuel_fueled"]' && q.fact === 'coach.logTiming' &&
        q.ack === 'Noted. Coach reads your food by the hour when you log as you go, and by the day when you log later.');
  const f = FACTS.find(x => x.id === 'coach.logTiming');
  check('coach.logTiming reads the answer straight off settings/coach, and nothing else — so the registry can drive it',
        !!f && JSON.stringify(f.usesAnswers) === '["q_log_timing"]' &&
        f.compute({ input: { settings: { answers: { q_log_timing: 'later' } } } }) === 'later' &&
        f.compute({ input: { settings: { answers: {} } } }) === null && f.compute({ input: { settings: { answers: { q_log_timing: 'soon' } } } }) === null);
  check('"I haven’t eaten" is a route, never a question — its answer is used once and dropped (decision #9)',
        C.ROUTE_IDS.includes('ask_fed_none') && !QUESTIONS.some(x => x.options.some(o => /eaten/i.test(o.label))));
  // v53 (on purpose): ask_ready, the readiness list after a lighter-week
  // answer, whose fuel row reads the same log as ask_lighter's.
  check('the fuel routes are exported, for the sheet that reads first', JSON.stringify(C.FUEL_ROUTES) ===
        JSON.stringify(['ask_fueled', 'ask_fed_unlogged', 'ask_fed_none', 'ask_lighter', 'ask_compare', 'ask_ready']));
  check('and nothing in the food half stores anything: no new settings key but the mark', JSON.stringify(Object.keys(C.normSettings({
    marks: { a: { r: 'sleep', d: '2026-09-01' } }, fuel: { x: 1 }, fed: true, ate: 'no' })).sort()) === JSON.stringify(['answers', 'asked', 'marks', 'mute', 'on', 'v']));
}

/* ---------- report ---------- */
console.log('\nCoach’s registries agree with each other\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
