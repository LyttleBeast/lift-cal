#!/usr/bin/env node
//
// Verifier for every weight Coach prints. THE IMPORTANT ONE.
//
//   node tools-check/coach-units.mjs
//
// Pounds and inches are the single stored unit and always will be. units.js
// converts at the display edge and nowhere else, which means every sentence
// Coach builds that names a load, a body weight or a rate has to route through
// it — and a sentence is a much easier place to forget than a set row, because
// nothing about a string looks like a number until somebody on kilos reads it.
// A draft of the intent catalog this ship came from had roughly twenty-five
// sentences printing converted weights with no units call in sight.
//
// So this file does not scan for a call and call it done. It RENDERS every
// sentence the engine can produce, twice — once imperial, once metric — and
// asserts the two differ wherever a weight is in them, that each carries its
// own unit word and never the other's, and that the imperial rendering is
// character for character what an imperial account has always been shown.
//
// There is a second trap and it is subtler than the first. An English phrase
// can secretly be a pounds threshold. "Rounded down to the nearest 5" and "the
// next 5 up is 230" are FALSE SENTENCES on a metric account, because five
// pounds is 2.27 kilos and nothing about it is round. insights.js:598-603
// already hit this. No conversion fixes it — only a different phrasing does —
// so section C refuses the phrasing outright: no sentence in Coach may name a
// rounding, a step size or a unit word at all.
//
//   A  the vocabulary       no unit word, no pound figure, in any template
//   B  rendered twice       every weight sentence differs between lb and kg
//   C  no secret thresholds no rounding, no step size, no named bar
//   D  the facts declare it  every fact carrying pounds says so, and every
//                            response that quotes one calls a formatter
//   E  the greeting          five words, no exclamation, and never a weight
//   F  the constants         the pound bands exist and are never printed

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-units-'));
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
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const U = await import(pathToFileURL(join(ROOT, 'units.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join('\n         ') + (xs.length > 6 ? '\n         … (' + xs.length + ')' : '');

const RAW = src('coach.js');
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
/* Every single-quoted string literal that is COPY — something a person reads.
   Three kinds of quoted string in coach.js are not copy and are stripped first,
   because a verifier that flagged them would only teach the next pass to write
   the unit word by hand somewhere it really is copy:

     the unit token      `u === 'kg' ? 'kg' : 'lb'` — a selector, never printed
     the unit column     `unit: 'lb'` on a fact — metadata the verifier itself
                         reads in section D
     the date parts      padStart(2, '0') and the 'T12:00:00' noon anchor —
                         ui.js parseKey()'s, restated in coach.js because a
                         pure module cannot import it, and a date key parsed
                         bare lands on the previous day west of Greenwich

   Everything left inside a quote can reach a screen. */
const COPY = CODE
  .replace(/=== '(kg|lb)' \? '(kg|lb)' : '(kg|lb)'/g, '')
  .replace(/=== '(kg|lb)'/g, '')
  .replace(/unit: '(lb|lbWk|kg)'/g, '')
  .replace(/padStart\(2, '0'\)/g, '')
  .replace(/'T12:00:00'/g, '');
const STRINGS = [...COPY.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]);

/* One fact's source, from its id to the next one's. Facts all sit at the same
   indentation in the table, which is what makes this exact rather than a window
   of N characters that happens to be long enough today. */
function factBody(id) {
  const at = CODE.indexOf("id: '" + id + "'");
  if (at === -1) return '';
  const next = CODE.indexOf("\n    id: '", at + 1);
  return CODE.slice(at, next === -1 ? CODE.length : next);
}

/* ================= THE FIXTURES =================
   One fixed epoch, and every session below is an offset from it, so this file
   answers the same at 2 AM in Auckland as at noon in New York. A verifier that
   files a fixture under "today" while the code files it under the day the
   session started fails between midnight and 3 AM and nowhere else. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench:  { group: 'chest',     equipment: 'barbell' },
  row:    { group: 'back',      equipment: 'barbell' },
  squat:  { group: 'legs',      equipment: 'barbell' },
  press:  { group: 'shoulders', equipment: 'barbell' },
  curl:   { group: 'arms',      equipment: 'dumbbell' }
};
const NAMES = { bench: 'Barbell Bench Press', row: 'Barbell Row', squat: 'Back Squat (High Bar)',
                press: 'Overhead Press', curl: 'Dumbbell Curl' };
const sets = rows => rows.map(([w, r]) => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows) => ({
  id: 's' + ago + '-' + Math.round(rows.length), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, setRows]) => ({
    exId: ex, name: NAMES[ex], group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(setRows)
  }))
});
const base = extra => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: [], lib: LIB, routines: [], live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
  summaries: {}, steps: { days: {} },
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' },
  ...extra
});
const sort = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);

const three = (w, r) => [[w, r], [w, r], [w, r]];

// A twelve-week log with chest deliberately stale.
const regular = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) regular.push(sess(w * 7 + 2, [['bench', three(185 + w, 5)], ['press', three(95, 8)]]));
  regular.push(sess(w * 7 + 4, [['row', three(155, 8)], ['curl', three(40, 10)]]));
  regular.push(sess(w * 7 + 6, [['squat', three(245, 5)]]));
}

const summaries = {};
for (let i = 1; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2450, p: 120, c: 300, f: 92 };
summaries[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };

const FIXTURES = {
  rich: base({
    sessions: sort(regular), summaries,
    steps: { days: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i =>
      [key(NOW - i * DAY), { steps: i === 0 ? 4200 : 9000 + i * 50 }])) },
    weight: { latestLb: 186.4, latestAt: NOW - 2 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 }
  }),
  // A lift whose best is behind it: four entries, nothing recent beating it.
  stalled: base({
    sessions: sort([
      sess(40, [['bench', three(225, 5)]]),
      sess(30, [['bench', three(215, 5)]]),
      sess(20, [['bench', three(210, 5)]]),
      sess(10, [['bench', three(205, 5)]]),
      sess(4,  [['bench', three(200, 5)]])
    ])
  }),
  // Three entries, the last of them the best — a record inside the week.
  pr: base({
    sessions: sort([
      sess(20, [['squat', three(275, 3)]]),
      sess(13, [['squat', three(285, 3)]]),
      sess(2,  [['squat', three(315, 3)]])
    ])
  }),
  /* Three entries exactly, so the stall rule's four-entry gate cannot claim it,
     and a last set that matches the standing best to the pound: one more rep at
     that same load would beat it, and none of the three record kinds moved. */
  proximity: base({
    sessions: sort([
      sess(24, [['row', [[200, 8], [200, 8]]]]),
      sess(16, [['row', [[200, 6], [200, 6]]]]),
      sess(3,  [['row', [[200, 8], [200, 8]]]])
    ])
  }),
  // Falling far faster than the goal that was set. The magnitude guard's branch.
  fast: base({
    sessions: sort(regular),
    weight: { latestLb: 171.2, latestAt: NOW - DAY, rateWk: -2.4, rateDays: 21, goalDir: -1, goalRateWk: -1 }
  }),
  gaining: base({
    sessions: sort(regular),
    weight: { latestLb: 201.8, latestAt: NOW, rateWk: 2.9, rateDays: 21, goalDir: 1, goalRateWk: null }
  }),
  stale: base({
    sessions: sort(regular),
    weight: { latestLb: 193.75, latestAt: NOW - 12 * DAY, rateWk: 0.3, rateDays: 18, goalDir: 0, goalRateWk: null }
  }),
  layoff: base({
    sessions: sort(regular.filter(s => s.startedAt < NOW - 31 * DAY).concat([sess(31, [['bench', three(185, 5)]])]))
  }),
  overused: base({
    sessions: sort(regular.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', three(185, 5)]]))))
  })
};

/* Render everything the engine can say, in one unit. */
function renderAll(fixture, u) {
  const out = [];
  const c = C.coach({ ...fixture, u });
  const push = (where, id, v) => { if (v) out.push({ where, id, text: v.text || '', reason: v.reason || '' }); };
  push('you', c.you.id, c.you);
  push('train', c.train.id, c.train);
  push('greet', c.greet.id, { text: c.greet.text, reason: '' });
  C.ROUTE_IDS.forEach(r => { const a = c.ask(r); push('ask:' + r, a.id, a); });
  return out;
}

/* ================= A. THE VOCABULARY ================= */
section('A. no template writes a unit word or a pound figure of its own');
{
  const BANNED = [/\blbs?\b/i, /\bpounds?\b/i, /\bkgs?\b/i, /\bkilo/i, /\bkilogram/i, /\bstone\b/i];
  const bad = STRINGS.filter(s => BANNED.some(re => re.test(s)));
  check('no string literal in coach.js contains lb, lbs, pound, kg or kilo — unitW() is the only source of the word',
        !bad.length, list(bad));

  // The word arrives through units.js or it does not arrive.
  check('units.js is where every unit word and every converted number comes from',
        /from '\.\/units\.js'/.test(RAW));
  const named = (/import \{([^}]*)\} from '\.\/units\.js'/.exec(RAW) || [, ''])[1]
    .split(',').map(s => s.trim()).filter(Boolean);
  check('and coach.js imports real formatters from it, not just the constants',
        named.some(n => ['labelW', 'labelRate', 'fmtW', 'fmtRate', 'labelVol', 'fmtVol'].includes(n)),
        named.join(', '));
  check('it never imports the raw conversion factors, which would be a conversion written by hand',
        !named.includes('LB_PER_KG') && !named.includes('IN_PER_CM') && !/2\.2046/.test(CODE));
}

/* ================= B. RENDERED TWICE ================= */
section('B. every sentence, built imperial and metric, and compared');
{
  const seen = new Set();
  const mismatched = [], crossed = [], identical = [];

  Object.keys(FIXTURES).forEach(name => {
    const lb = renderAll(FIXTURES[name], 'lb');
    const kg = renderAll(FIXTURES[name], 'kg');
    check('fixture "' + name + '" renders the same set of answers in both units',
          lb.length === kg.length && lb.every((r, i) => r.where === kg[i].where && r.id === kg[i].id));

    lb.forEach((L, i) => {
      const K = kg[i];
      if (!K) return;
      seen.add(L.id);
      [['text', L.text, K.text], ['reason', L.reason, K.reason]].forEach(([part, a, b]) => {
        const at = name + ' ' + L.where + '/' + part + ': ';
        // A sentence that names lb must name kg on the other side, and neither
        // may ever carry the other's word.
        const aLb = /\blb\b/.test(a), aKg = /\bkg\b/.test(a);
        const bLb = /\blb\b/.test(b), bKg = /\bkg\b/.test(b);
        if (aKg || bLb) crossed.push(at + '\n           lb: ' + a + '\n           kg: ' + b);
        if (aLb !== bKg) mismatched.push(at + '\n           lb: ' + a + '\n           kg: ' + b);
        // And where a weight really is in the sentence, the NUMBER has to move
        // too — a formatter called on the wrong argument would print the same
        // figure under a different word.
        if (aLb && bKg && a.replace(/lb/g, '') === b.replace(/kg/g, '')) {
          identical.push(at + '\n           lb: ' + a + '\n           kg: ' + b);
        }
      });
    });
  });

  check('no imperial sentence carries "kg", and no metric one carries "lb"', !crossed.length, list(crossed));
  check('a sentence that says lb in one unit says kg in the other, and never neither',
        !mismatched.length, list(mismatched));
  check('and the NUMBER moves with the word — a formatter on the wrong argument would not',
        !identical.length, list(identical));

  /* Coverage. Without this the three checks above pass on an engine that says
     nothing at all, which is the failure mode that would matter most. */
  const WEIGHT_INTENTS = ['stalled_lift', 'recent_pr', 'pr_proximity',
                          'weight_rate_vs_goal', 'weight_no_recent_weighin'];
  const missed = WEIGHT_INTENTS.filter(id => !seen.has(id));
  check('every intent that prints a weight was actually rendered above', !missed.length, list(missed));
  check('and the fixtures reach most of the registry (' + seen.size + ' of ' + C.INTENTS.length + ' intents)',
        seen.size >= 12, [...seen].join(', '));
}

/* ================= C. NO SECRET THRESHOLDS ================= */
section('C. no English phrase that is really a pounds threshold');
{
  // "the nearest 5", "the next 5 up", "round it to 10" — every one of these is
  // a pound figure wearing words, and a conversion cannot rescue any of them.
  const TRAPS = [
    /\bnearest\b/i, /\bround(ed|s)?\s+(it\s+)?(up|down|to)\b/i, /\bthe next \d/i,
    /\bin (fives|tens|twos)\b/i, /\bstep of \d/i, /\bincrements? of \d/i,
    /\bplates?\b/i, /\badd \d+\b/i, /\bby \d+ a week\b/i
  ];
  const bad = STRINGS.filter(s => TRAPS.some(re => re.test(s)));
  check('no template names a rounding, a step size or a plate jump', !bad.length, list(bad));

  /* A typed number in a template is the other shape of the same bug: every
     figure Coach prints has to have been computed from the log. The one class
     that is allowed is a COUNT OF DAYS OR WEEKS, because a day is a day in both
     units and the window has to be nameable — "in the last 7 days" is the
     denominator the sentence exists to state. Strip those, and anything left
     holding a digit is a number somebody typed. */
  const bareNum = STRINGS.filter(s =>
    / /.test(s) &&                                        // prose, not a fact id like session.last7
    /\d/.test(s.replace(/\b\d+ (day|days|week|weeks)\b/g, '')) && !/%/.test(s));
  check('no template contains a typed number — every figure is computed, bar the day window',
        !bareNum.length, list(bareNum));

  // The one number that IS typed into a sentence is the day window, and it is a
  // count of days rather than a measurement, so it converts to nothing.
  check('the day windows are written as words ("the last 7 days", "twelve weeks") and are not weights',
        STRINGS.some(s => /twelve weeks/.test(s)) && STRINGS.some(s => /last 7 days/.test(s)));
}

/* ================= D. THE FACTS DECLARE THEIR UNIT ================= */
section('D. every fact that carries pounds says so, and every response quoting one converts');
{
  const poundFacts = C.FACTS.filter(f => f.unit === 'lb' || f.unit === 'lbWk').map(f => f.id);
  check('the pound-carrying facts are declared (' + poundFacts.length + ')',
        poundFacts.length >= 5, poundFacts.join(', '));

  // Every response that quotes one of them has to call a formatter, and the
  // source of that response is where it has to happen.
  const bodies = {};
  Object.keys(C.RESPONSES).forEach(id => {
    // The padding between the key and its brace varies — several one-line
    // responses are column-aligned — so the opening is matched rather than
    // spelled out.
    const m = new RegExp('^\\s*' + id + ':\\s*\\{', 'm').exec(CODE);
    if (!m) return;
    let depth = 0, end = -1;
    for (let j = CODE.indexOf('{', m.index); j < CODE.length; j++) {
      if (CODE[j] === '{') depth++;
      else if (CODE[j] === '}' && --depth === 0) { end = j; break; }
    }
    bodies[id] = CODE.slice(m.index, end + 1);
  });
  check('every response body was located in the source', Object.keys(bodies).length === Object.keys(C.RESPONSES).length,
        Object.keys(C.RESPONSES).filter(k => !bodies[k]).join(', '));

  const FORMATTERS = /\b(labelW|labelRate|labelVol|fmtW|fmtRate|fmtVol|fmtSetW|fmtSetLoad|unitW)\s*\(/;
  const missing = [];
  C.INTENTS.forEach(i => {
    const quotes = (i.factsNeeded || []).some(f => poundFacts.includes(f));
    if (!quotes) return;
    const body = bodies[i.response] || '';
    // Either the template converts, or its reason is composed from a `because`
    // that does — both are checked, because the reason line is a sentence too.
    const inline = FORMATTERS.test(body);
    const viaBecause = (i.factsNeeded || []).some(f => FORMATTERS.test(factBody(f)));
    if (!inline && !viaBecause) missing.push(i.id + ' -> ' + i.response);
  });
  check('every response quoting a pound fact routes through units.js', !missing.length, list(missing));

  // And the two `because` strings that print a load really do convert, because
  // a reason line is as visible as the finding above it.
  ['lift.recentPr', 'lift.proximity'].forEach(id => {
    check(id + '’s because converts its load rather than printing stored pounds',
          FORMATTERS.test(factBody(id)));
  });
}

/* ================= E. THE ROTATING LINE ================= */
section('E. the greeting — five words, no exclamation, and never a weight');
{
  const long = [], shouty = [], weighted = [];
  Object.keys(FIXTURES).forEach(name => {
    ['lb', 'kg'].forEach(u => {
      // Every gate, driven, rather than only the one that happens to win.
      const c = C.coach({ ...FIXTURES[name], u });
      const texts = [c.greet.text];
      C.GREETINGS.forEach(g => {
        try { const t = g.text({ f: () => null, input: FIXTURES[name] }); if (t) texts.push(t); } catch {}
      });
      texts.filter(Boolean).forEach(t => {
        if (t.trim().split(/\s+/).length > 5) long.push(name + '/' + u + ': ' + t);
        if (t.includes('!')) shouty.push(name + '/' + u + ': ' + t);
        if (/\b(lb|kg)\b/.test(t)) weighted.push(name + '/' + u + ': ' + t);
      });
    });
  });
  check('no rotating line runs past five words', !long.length, list(long));
  check('no rotating line has an exclamation mark in it', !shouty.length, list(shouty));
  check('and none of them prints a weight — there is no room for the number AND its unit word',
        !weighted.length, list(weighted));

  // The line must never cheer over a caution. Driven on the fixture whose
  // finding really is one.
  const caution = C.coach({ ...FIXTURES.overused, u: 'lb' });
  if (caution.you.tone === 'caution') {
    const g = C.GREETINGS.find(x => x.id === caution.greet.id);
    check('when the finding counsels caution, the greeting is not a warm one',
          g && g.tone !== 'warm', caution.greet.id + ' / ' + caution.greet.text);
  } else {
    check('the caution fixture produced a caution finding to test the greeting against',
          false, 'got ' + caution.you.id + ' tone=' + caution.you.tone);
  }
}

/* ================= F. THE BANDS ARE POUNDS AND STAY OFF THE SCREEN ================= */
section('F. the thresholds are pounds, they never move, and they are never printed');
{
  check('the rate band is a pound constant, named so and commented as such',
        /const RATE_BAND_LB = [\d.]+;/.test(CODE));
  const band = Number((/const RATE_BAND_LB = ([\d.]+);/.exec(CODE) || [, '0'])[1]);
  check('and it is a sane weekly figure well inside LIMITS.rateWk', band > 0 && band < 5, String(band));

  // The number itself must never reach a sentence. Rendered, not scanned: a
  // conversion of it would not look like the constant in the source.
  const printed = [];
  Object.keys(FIXTURES).forEach(name => ['lb', 'kg'].forEach(u => {
    renderAll(FIXTURES[name], u).forEach(r => {
      const both = r.text + ' ' + r.reason;
      if (both.includes(String(band)) && !/a week/.test(both)) printed.push(name + '/' + u + ': ' + both);
    });
  }));
  check('the band itself never appears in a sentence in either unit', !printed.length, list(printed));

  /* The magnitude guard, driven. insights.js rateVerdict() calls ANY rate in
     the goal's direction 'good', unbounded, and LIMITS.rateWk allows five a
     week — so an account shedding weight very fast gets a green number and an
     approving sentence today. Coach must report the figure and decline. */
  ['fast', 'gaining'].forEach(name => {
    ['lb', 'kg'].forEach(u => {
      const a = C.coach({ ...FIXTURES[name], u }).ask('ask_rate');
      const both = (a.text + ' ' + a.reason).toLowerCase();
      check(name + '/' + u + ': a rate past the band is reported and not called good',
            !/\bon track\b(?!,)|\bgood\b|\bgreat\b|\bwell done\b|\bnicely\b/.test(both.replace('won’t call a rate that size on track', '')),
            a.text + ' // ' + a.reason);
      check(name + '/' + u + ': and the number is still there, in the reader’s unit',
            new RegExp('\\b' + u + '\\b').test(a.text), a.text);
    });
  });

  // And inside the band it is allowed to say the rate agrees with the goal.
  const ok = C.coach({ ...FIXTURES.rich, u: 'lb' }).ask('ask_rate');
  check('inside the band, it may say the rate is going the way the goal points',
        /goal points/.test(ok.text), ok.text);

  /* The imperial rendering is what an imperial account has always been shown,
     to the character. Eight live accounts are imperial and this ship has to be
     invisible to every one of them. */
  /* The imperial figure is read OUT of the sentence and put back through
     units.js, rather than being restated here. That way this check drives the
     real formatter against the real number the engine computed — an estimated
     max, not a set weight — instead of asserting a figure a later change to the
     e1rm formula would make wrong in the verifier rather than in the app. */
  const lbStall = C.coach({ ...FIXTURES.stalled, u: 'lb' }).ask('ask_stall').text;
  const kgStall = C.coach({ ...FIXTURES.stalled, u: 'kg' }).ask('ask_stall').text;
  const lbNum = Number((/([\d.]+) lb/.exec(lbStall) || [, NaN])[1]);
  check('the imperial sentence carries a real figure', Number.isFinite(lbNum) && lbNum > 50, lbStall);
  check('imperial weights print exactly as units.js prints them everywhere else',
        lbStall.includes(U.labelW(lbNum, 'lb')), lbStall);
  check('and the same figure through units.js is what the metric sentence says',
        kgStall.includes(U.labelW(lbNum, 'kg')), kgStall + ' // expected ' + U.labelW(lbNum, 'kg'));
  check('a rate prints through labelRate, which keeps two decimals on kilos',
        C.coach({ ...FIXTURES.rich, u: 'kg' }).ask('ask_rate').text.includes(U.labelRate(0.8, 'kg')),
        C.coach({ ...FIXTURES.rich, u: 'kg' }).ask('ask_rate').text);
  // A double conversion is the one units bug that is silent: 263 becomes 119
  // becomes 54 and all three look like a weight.
  check('nothing is converted twice — the metric figure is one conversion from the stored one',
        !kgStall.includes(U.labelW(U.wOut(lbNum, 'kg'), 'kg')),
        'a second pass would have read ' + U.labelW(U.wOut(lbNum, 'kg'), 'kg'));
}

/* ---------- report ---------- */
console.log('\nevery weight Coach prints goes through units.js\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
