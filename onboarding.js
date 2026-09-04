// First run.
//
// Two halves that deliberately do not run at the same moment.
//
//   runSetup()  asks the handful of questions that turn an empty account into
//               a usable one, and writes the answers. It runs BEFORE the four
//               tabs initialise, because what it writes — targets, a first
//               weigh-in, a water goal, a step goal — is exactly what those
//               tabs read at boot.
//
//   runTour()   runs AFTER, over the real app. Each card switches the dock to
//               the tab it is describing and lights that button up, so the
//               thing being explained is on screen behind the card rather than
//               drawn as a picture of itself.
//
// Why ask at all instead of dropping someone straight in: an account with no
// targets falls back to constants that were tuned for one specific 215 lb
// powerlifter. A new user's first look at Fuel would be a calorie ring that is
// wrong for them in a way they have no reason to question. Four questions and
// thirty seconds fixes that, and the numbers are all editable afterwards.
//
// Everything here is skippable and everything it writes can be changed later
// from inside the app. The one thing it must never do is run twice: the flag
// lives in the database (users/{uid}/onboarding), not localStorage, so it
// follows the account to a new phone instead of greeting them again.

import { read, write, uid, todayKey } from './store.js';
import { autoTargets } from './tdee.js';
import { el, noteEl, segmented, sheet, r1, toast, LIMITS, within } from './ui.js';
import { isStandalone, platform } from './usage.js';

// Stays 1 on purpose. onboardingState() below reads `done` and never reads
// `version`, so bumping this re-runs nothing for anybody — it would only look
// from the outside like it had done something.
export const ONBOARDING_VERSION = 1;

/* ---------- has this account been through it? ----------
   The flag is the answer when it exists. When it doesn't, the account either
   is genuinely new, or predates this screen existing at all — and those two
   must not be treated the same. An account that already holds targets or
   weigh-ins has been in use for months; showing it "let's set you up" would
   offer to overwrite the numbers its owner has been eating to. So a missing
   flag on an account with data is backfilled as already-done, silently, once. */
export async function onboardingState() {
  const o = (await read('onboarding', null)) || {};

  if (o.done === true) {
    return { needsSetup: false, needsTour: o.tourDone !== true && o.skipped !== true };
  }

  if (await hasRealData()) {
    try {
      await write('onboarding', {
        done: true, at: Date.now(), version: ONBOARDING_VERSION,
        skipped: true, tourDone: true
      });
    } catch {}
    return { needsSetup: false, needsTour: false };
  }

  return { needsSetup: true, needsTour: false };
}

/* Two independent signals, either one sufficient. Targets exist as soon as
   somebody has opened the targets sheet once; weigh-ins exist for anyone who
   has stood on a scale. A brand-new account has neither. */
async function hasRealData() {
  try {
    const [targets, weights] = await Promise.all([
      read('food/targets', null),
      read('weight/entries', null)
    ]);
    if (targets && Number(targets.cal) > 0) return true;
    if (weights && Object.keys(weights).length > 0) return true;
  } catch {}
  return false;
}

async function markDone(patch) {
  const cur = (await read('onboarding', null)) || {};
  await write('onboarding', { ...cur, ...patch });
}

export function markTourDone() { return markDone({ tourDone: true }); }

/* ---------- the arithmetic ----------
   Mifflin-St Jeor, which is the least-bad of the resting-metabolism formulas
   for people who are not extremely lean or extremely heavy. It is a starting
   point and nothing more: after two weeks of real weigh-ins and real logging,
   Rack's own maintenance estimate is measured from what actually happened to
   the scale and quietly takes over. The point of this number is only that day
   one isn't a blank guess. */
const ACTIVITY = [
  ['sed',   'Mostly sitting',  1.20,  6000, 'Desk work, a lift, not much walking'],
  ['light', 'Lightly active',  1.375, 8000, 'On your feet some of the day'],
  ['mod',   'Active',          1.55, 10000, 'Moving most of the day, or training hard'],
  ['high',  'Very active',     1.725,12000, 'Physical job, or two sessions a day']
];

// Named the way people name them — cutting, maintaining, bulking — because
// that is the word the person already has for what they are doing, and the
// same word the Fuel bar uses for its bands. The rate is what the choice
// writes (food/targets.auto.rateWk) and its sign is what the Fuel bar and the
// You tab read the goal back from, so the three rates stay non-zero for the
// two that move and exactly zero for the one that doesn't.
const GOALS = [
  ['cut',  'Cutting',     -1,   'Lose fat, keep muscle — about a pound a week down'],
  ['hold', 'Maintaining',  0,   'Hold your weight and eat at maintenance'],
  ['gain', 'Bulking',     0.5,  'Build muscle — about half a pound a week up']
];

export function estimateMaintenance({ sex, heightIn, birthYear, lb, activity }) {
  const kg  = lb * 0.45359237;
  const cm  = heightIn * 2.54;
  const age = Math.max(14, Math.min(100, new Date().getFullYear() - birthYear));
  // The male and female constants differ by 166; 'x' sits between them rather
  // than silently picking one.
  const base = sex === 'm' ? 5 : sex === 'f' ? -161 : -78;
  const bmr  = 10 * kg + 6.25 * cm - 5 * age + base;
  const mult = (ACTIVITY.find(a => a[0] === activity) || ACTIVITY[1])[2];
  return Math.round(bmr * mult / 10) * 10;
}

export function waterGoalFor(lb) {
  // Half a fluid ounce per pound — the same rule the water settings screen
  // suggests, so the two never disagree.
  return Math.round(Math.max(1900, Math.min(4500, lb * 0.5 * 29.5735)));
}

/* ================= ADD TO HOME SCREEN ================= */

/* The taps are written once and shown in two places: as a setup step for
   somebody who is still in a browser tab, and as a sheet the You tab's card
   and the settings hub both open. Modelled on the steps walkthrough — same
   segmented control, because whoever is reading this is on one phone and may
   be setting up another.

   Detection is imported rather than repeated. `navigator.standalone` is the
   iOS-only truth and `matchMedia('(display-mode: standalone)')` is the
   standard signal Android answers; isStandalone() checks both. platform()
   only picks which set of taps to show first — the control overrides it. */

const INSTALL_WHY =
  'Added to the home screen it opens like any other app — no browser bar, the ' +
  'whole screen — and it keeps working when the signal doesn’t.';

const INSTALL_TAPS = {
  ios: [
    ['Tap Share', 'The square with the arrow coming out of it. In Safari it is in the bar at the bottom of the screen; other browsers keep it in their own menu.'],
    ['Scroll down to Add to Home Screen', 'It is in the list of actions under the row of apps.'],
    ['Tap Add', 'Top right. Rack lands on the home screen with everything else.']
  ],
  android: [
    ['Tap the three dots', 'Top right of Chrome.'],
    ['Tap Add to Home screen', 'Some versions call it Install app — same thing.'],
    ['Tap Install', 'Chrome sometimes offers a banner at the bottom of the page instead; that does the same job.']
  ]
};

const INSTALL_ELSE = {
  ios: 'Safari is the surest route, but Chrome, Edge and Firefox can add it too — ' +
       'the item sits in their own share menu rather than the bottom bar. If Add to ' +
       'Home Screen is not in the share list, scroll to the bottom of it and tap ' +
       'Edit Actions to put it back.',
  android: 'Firefox and Samsung Internet use the same menu. The item reads Install, ' +
           'or Add page to → Home screen.'
};

function installGuideInto(host) {
  host.appendChild(noteEl(INSTALL_WHY));

  const p = platform();
  let os = p === 'android' ? 'android' : 'ios';
  const body = el('div');

  const paint = () => {
    body.innerHTML = '';
    const list = el('div', 'install-steps');
    INSTALL_TAPS[os].forEach(([t, d], n) => {
      const r = el('div', 'install-step');
      r.appendChild(el('span', 'install-n num', String(n + 1)));
      const c = el('div');
      c.appendChild(el('div', null, t));
      c.appendChild(noteEl(d));
      r.appendChild(c);
      list.appendChild(r);
    });
    body.appendChild(list);
    body.appendChild(noteEl(INSTALL_ELSE[os]));
  };

  host.appendChild(segmented([['ios', 'iPhone'], ['android', 'Android']], os, v => { os = v; paint(); }));
  paint();
  host.appendChild(body);

  if (p !== 'ios' && p !== 'android') {
    host.appendChild(noteEl(
      'On a computer there is an install button at the end of the address bar, ' +
      'but the point of this one is the phone in your pocket.'));
  }
}

export function openInstallGuide() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'App'));
  sh.appendChild(el('h2', null, 'Add to Home Screen'));
  if (isStandalone()) {
    sh.appendChild(noteEl('This copy is already running from the home screen — these are the taps for another phone.'));
  }
  installGuideInto(sh);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '12px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= SETUP ================= */

export function runSetup(user) {
  return new Promise(resolve => {
    const host = document.getElementById('onboard');
    host.innerHTML = '';
    host.classList.remove('hidden');
    host.classList.remove('ob-tour');

    const a = {
      name: (user && user.displayName) || '',
      sex: 'm', heightIn: 70, birthYear: new Date().getFullYear() - 25,
      lb: 0, goal: 'cut', activity: 'light',
      cal: 0, p: 0, f: 0, maint: 0
    };

    const card = el('div', 'ob-card');
    const bar  = el('div', 'ob-bar');
    const fill = el('div', 'ob-fill');
    bar.appendChild(fill);
    const body = el('div', 'ob-body');
    const foot = el('div', 'ob-foot');
    card.append(bar, body, foot);
    host.appendChild(card);

    // The install step is built into the array rather than skipped when it is
    // drawn: the progress bar divides by steps.length - 1, so a step that comes
    // and goes has to change the length, never just be jumped over. `numbers`
    // stays last — its Continue is what writes everything.
    const steps = [welcome, aboutYou, weighIn, goalStep, activityStep,
                   ...(isStandalone() ? [] : [installStep]), numbers];
    let i = 0;
    draw();

    function draw() {
      fill.style.width = Math.round((i / (steps.length - 1)) * 100) + '%';
      body.innerHTML = '';
      foot.innerHTML = '';
      body.scrollTop = 0;
      steps[i]();
    }

    function nav({ nextLabel = 'Continue', canNext = () => true, onNext, back = true, skip = null }) {
      const go = el('button', 'btn btn-primary btn-block btn-lg', nextLabel);
      go.onclick = async () => {
        const why = canNext();
        if (why !== true) { flash(why); return; }
        if (onNext) { const ok = await onNext(); if (ok === false) return; }
        i = Math.min(steps.length - 1, i + 1);
        draw();
      };
      foot.appendChild(go);

      const row = el('div', 'ob-nav');
      if (back && i > 0) {
        const b = el('button', 'linkish', 'Back');
        b.onclick = () => { i = Math.max(0, i - 1); draw(); };
        row.appendChild(b);
      }
      if (skip) {
        const s = el('button', 'linkish', skip.label);
        s.onclick = skip.onClick;
        row.appendChild(s);
      }
      if (row.children.length) foot.appendChild(row);
    }

    function flash(msg) {
      let e = body.querySelector('.ob-err');
      if (!e) { e = el('div', 'ob-err'); body.appendChild(e); }
      e.textContent = msg;
    }

    function field(labelText, node) {
      const f = el('div', 'field');
      f.appendChild(el('label', null, labelText));
      f.appendChild(node);
      return f;
    }

    function numInput(value, attrs) {
      const n = el('input');
      n.type = 'number'; n.inputMode = 'decimal'; n.step = 'any';
      if (value) n.value = String(value);
      Object.assign(n, attrs || {});
      return n;
    }

    /* ---- 0. welcome ---- */
    function welcome() {
      body.appendChild(el('div', 'ob-kicker', 'Welcome to Rack'));
      body.appendChild(el('h1', 'ob-title', 'Hey' + (a.name ? ', ' + a.name.split(' ')[0] : '') + '.'));
      body.appendChild(noteEl('Rack keeps four things in one place: what you lifted, what you ate, what you weigh, and how much you moved. They talk to each other — that is the whole idea.'));

      const list = el('div', 'ob-list');
      [
        ['Train', 'Log sets as you do them. It remembers what you did last time on every exercise.'],
        ['Fuel',  'Photograph a plate or describe it and it fills in the macros. Or scan a barcode.'],
        ['Weight','Weigh in whenever. It works out your real maintenance calories from the trend.'],
        ['Steps', 'A daily count and a goal ring.']
      ].forEach(([t, d]) => {
        const r = el('div', 'ob-item');
        r.appendChild(el('div', 'ob-item-t', t));
        r.appendChild(el('div', 'ob-item-d', d));
        list.appendChild(r);
      });
      body.appendChild(list);
      body.appendChild(noteEl('Setting up takes about thirty seconds. Everything you pick can be changed later.'));

      nav({
        nextLabel: 'Set it up',
        back: false,
        skip: { label: 'Skip for now', onClick: () => finish(true) }
      });
    }

    /* ---- 1. about you ---- */
    function aboutYou() {
      body.appendChild(el('div', 'ob-kicker', 'About you'));
      body.appendChild(el('h1', 'ob-title', 'The basics'));
      body.appendChild(noteEl('Only used to work out a starting calorie estimate. It stays in your account and nobody else can see it.'));

      const nameIn = el('input');
      nameIn.type = 'text'; nameIn.autocomplete = 'name'; nameIn.value = a.name;
      nameIn.oninput = e => a.name = e.target.value;
      body.appendChild(field('Name', nameIn));

      const seg = segmented([['m', 'Male'], ['f', 'Female'], ['x', 'Rather not']], a.sex, v => a.sex = v);
      body.appendChild(field('Sex', seg));

      const hrow = el('div', 'ob-row');
      const ft = numInput(Math.floor(a.heightIn / 12), { min: 3, max: 8 });
      const inch = numInput(a.heightIn % 12, { min: 0, max: 11 });
      const syncH = () => a.heightIn = (parseFloat(ft.value) || 0) * 12 + (parseFloat(inch.value) || 0);
      ft.oninput = syncH; inch.oninput = syncH;
      hrow.append(field('Height (ft)', ft), field('in', inch));
      body.appendChild(hrow);

      const yr = numInput(a.birthYear, { min: 1920, max: new Date().getFullYear() - 12 });
      yr.oninput = e => a.birthYear = parseInt(e.target.value) || 0;
      body.appendChild(field('Birth year', yr));

      nav({
        canNext: () => {
          if (!a.name.trim()) return 'What should the app call you?';
          if (!(a.heightIn >= 36 && a.heightIn <= 96)) return 'That height doesn’t look right.';
          const y = new Date().getFullYear();
          if (!(a.birthYear >= 1920 && a.birthYear <= y - 12)) return 'Check the birth year.';
          return true;
        }
      });
    }

    /* ---- 2. weigh in ---- */
    function weighIn() {
      body.appendChild(el('div', 'ob-kicker', 'Weight'));
      body.appendChild(el('h1', 'ob-title', 'What do you weigh?'));
      body.appendChild(noteEl('This becomes your first weigh-in. Rack learns your real maintenance calories from how this number moves against what you eat, so the more often you step on the scale, the better every other number gets.'));

      const lb = numInput(a.lb || '', { min: LIMITS.lb[0], max: LIMITS.lb[1], placeholder: '185' });
      lb.oninput = e => a.lb = parseFloat(e.target.value) || 0;
      setTimeout(() => lb.focus(), 120);
      body.appendChild(field('Current weight (lb)', lb));

      nav({
        canNext: () => within(a.lb, LIMITS.lb) ? true : 'Enter your weight in pounds.'
      });
    }

    /* ---- 3. goal ---- */
    function goalStep() {
      body.appendChild(el('div', 'ob-kicker', 'Goal'));
      body.appendChild(el('h1', 'ob-title', 'Cutting, maintaining or bulking?'));

      const wrap = el('div', 'ob-choices');
      GOALS.forEach(([id, label, rate, sub]) => {
        const b = el('button', 'ob-choice' + (a.goal === id ? ' on' : ''));
        b.appendChild(el('div', 'ob-choice-t', label));
        b.appendChild(el('div', 'ob-choice-d', sub));
        b.onclick = () => { a.goal = id; wrap.querySelectorAll('.ob-choice').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      body.appendChild(noteEl('Pick roughly. It sets your starting calories and leans the Fuel bar toward the band you are aiming for; Rack nudges the numbers as it learns what your body actually does.'));
      nav({});
    }

    /* ---- 4. activity ---- */
    function activityStep() {
      body.appendChild(el('div', 'ob-kicker', 'Day to day'));
      body.appendChild(el('h1', 'ob-title', 'How much do you move?'));
      body.appendChild(noteEl('Outside of training. Be honest rather than aspirational — this only sets the starting point.'));

      const wrap = el('div', 'ob-choices');
      ACTIVITY.forEach(([id, label, , , sub]) => {
        const b = el('button', 'ob-choice' + (a.activity === id ? ' on' : ''));
        b.appendChild(el('div', 'ob-choice-t', label));
        b.appendChild(el('div', 'ob-choice-d', sub));
        b.onclick = () => { a.activity = id; wrap.querySelectorAll('.ob-choice').forEach(x => x.classList.remove('on')); b.classList.add('on'); };
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
      // Only promise the numbers when they are genuinely next. On a phone in a
      // browser tab the home-screen step sits in between, and a button that
      // says one thing and does another is worse than a plain Continue.
      nav({ nextLabel: steps[i + 1] === numbers ? 'See my numbers' : 'Continue' });
    }

    /* ---- home screen — only in the list when the app is in a browser tab ---- */
    function installStep() {
      body.appendChild(el('div', 'ob-kicker', 'Home screen'));
      body.appendChild(el('h1', 'ob-title', 'Put Rack on your home screen'));
      installGuideInto(body);
      body.appendChild(noteEl('Now or later — the same instructions live on the You tab. Adding it does not close this page, so finish setting up here first and then open it from the icon.'));
      nav({ nextLabel: 'See my numbers' });
    }

    /* ---- 5. the numbers ---- */
    function numbers() {
      const maint = estimateMaintenance(a);
      const rate  = (GOALS.find(g => g[0] === a.goal) || GOALS[1])[2];
      const t = autoTargets({ rateWk: rate, pPerLb: 1, fPerLb: 0.35, floor: 0 }, maint, a.lb)
             || { cal: maint, p: Math.round(a.lb), f: Math.round(a.lb * 0.35), c: 0 };

      if (!a.cal) { a.maint = maint; a.cal = t.cal; a.p = t.p; a.f = t.f; }

      body.appendChild(el('div', 'ob-kicker', 'Your start'));
      body.appendChild(el('h1', 'ob-title', 'Here’s where to begin'));
      body.appendChild(noteEl('An estimate from your height, weight, age and activity. After a couple of weeks of weigh-ins Rack replaces it with a number measured from your own data.'));

      const grid = el('div', 'ob-numbers');
      const cell = (label, value, sub) => {
        const c = el('div', 'ob-num');
        c.appendChild(el('div', 'ob-num-v num', value));
        c.appendChild(el('div', 'ob-num-l', label));
        if (sub) c.appendChild(el('div', 'ob-num-s', sub));
        return c;
      };
      grid.appendChild(cell('kcal a day', a.cal.toLocaleString(),
        rate === 0 ? 'maintenance' : (rate < 0 ? '−' : '+') + Math.abs(rate) + ' lb/wk'));
      grid.appendChild(cell('g protein', String(a.p), '1 g per lb'));
      grid.appendChild(cell('g fat', String(a.f), 'carbs are the rest'));
      body.appendChild(grid);

      const adj = el('details', 'ob-adjust');
      adj.appendChild(el('summary', null, 'Change these'));
      const cIn = numInput(a.cal, { min: LIMITS.cal[0], max: LIMITS.cal[1] });
      const pIn = numInput(a.p,   { min: LIMITS.targetG[0], max: LIMITS.targetG[1] });
      const fIn = numInput(a.f,   { min: LIMITS.targetG[0], max: LIMITS.targetG[1] });
      cIn.oninput = e => a.cal = parseInt(e.target.value) || a.cal;
      pIn.oninput = e => a.p   = parseInt(e.target.value) || a.p;
      fIn.oninput = e => a.f   = parseInt(e.target.value) || a.f;
      adj.append(field('Calories', cIn), field('Protein (g)', pIn), field('Fat (g)', fIn));
      body.appendChild(adj);

      body.appendChild(noteEl('Water goal ' + Math.round(waterGoalFor(a.lb) / 29.5735) +
        ' fl oz · step goal ' + (ACTIVITY.find(x => x[0] === a.activity) || ACTIVITY[1])[3].toLocaleString() +
        '. Both adjustable on their own tabs.'));

      nav({
        nextLabel: 'Start using Rack',
        canNext: () => {
          if (!within(a.cal, LIMITS.cal)) return 'Calories should be between ' + LIMITS.cal[0].toLocaleString() + ' and ' + LIMITS.cal[1].toLocaleString() + '.';
          if (!within(a.p, LIMITS.targetG) || !within(a.f, LIMITS.targetG)) return 'Check the protein and fat grams.';
          return true;
        },
        onNext: () => finish(false)
      });
    }

    /* ---- write everything ---- */
    async function finish(skipped) {
      const btn = foot.querySelector('.btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Setting up…'; }

      try {
        if (!skipped) {
          await write('profile', {
            name: a.name.trim().slice(0, 60),
            email: ((user && user.email) || '').slice(0, 120),
            sex: a.sex,
            heightIn: Math.round(a.heightIn),
            birthYear: a.birthYear,
            createdAt: Date.now()
          });

          // Everything below writes only into empty space. This screen should
          // never be reached by an account that already has these — but "should
          // never" is not a guarantee, and the failure mode is overwriting the
          // targets somebody has been eating to for months. Re-read and defer.
          const [priorWeights, priorTargets, priorWater, priorSteps] = await Promise.all([
            read('weight/entries',  null),
            read('food/targets',    null),
            read('settings/water',  null),
            read('settings/steps',  null)
          ]);

          if (a.lb > 0 && !(priorWeights && Object.keys(priorWeights).length)) {
            const entries = priorWeights || {};
            entries['wt' + Date.now().toString(36)] = { lb: r1(a.lb), t: Date.now() };
            await write('weight/entries', entries);
          }

          if (!(priorTargets && Number(priorTargets.cal) > 0)) {
            await write('food/targets', {
              cal: a.cal, p: a.p, f: a.f,
              maint: a.maint || null,
              auto: { on: false, rateWk: (GOALS.find(g => g[0] === a.goal) || GOALS[1])[2],
                      pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: 0 }
            });
          }

          if (!(priorWater && Number(priorWater.goalMl) > 0)) {
            await write('settings/water', { goalMl: waterGoalFor(a.lb), unit: 'floz', presets: null });
          }
          if (!(priorSteps && Number(priorSteps.goal) > 0)) {
            await write('settings/steps', { goal: (ACTIVITY.find(x => x[0] === a.activity) || ACTIVITY[1])[3] });
          }
        } else if (a.name.trim()) {
          await write('profile', { name: a.name.trim().slice(0, 60), createdAt: Date.now() });
        }

        await write('onboarding', {
          done: true, at: Date.now(), version: ONBOARDING_VERSION,
          skipped: !!skipped, tourDone: false
        });
      } catch (e) {
        // Never trap somebody on the setup screen because a write failed. They
        // land in the app with defaults, which is recoverable; a dead-end is not.
        toast('Saved what it could — check your connection.');
      }

      host.classList.add('hidden');
      host.innerHTML = '';
      resolve({ skipped: !!skipped });
      return true;
    }
  });
}

/* ================= TOUR ================= */

const TOUR = [
  { view: 'you', title: 'You',
    body: 'Everything the app knows about you, in one place — how the week went, what your numbers are doing, and how they pull on each other. Nothing is edited here; it just shows you where you stand.',
    tip: 'The gear in the top right is where every setting in the app now lives.' },
  { view: 'workout', title: 'Train',
    body: 'Start a session, add exercises, tap out your sets. Under every exercise it shows what you did last time, so you always know what to beat.',
    tip: 'Long sessions survive a locked phone — nothing is lost if you get interrupted.' },
  { view: 'food', title: 'Fuel',
    body: 'The big button is the fastest way in: photograph the plate or describe it in a sentence and Claude fills in the macros for you to check before it logs.',
    tip: 'Barcodes, your saved foods and plain typed numbers are all under the same button.' },
  { view: 'weight', title: 'Weight',
    body: 'Weigh in as often as you like — twice a day is better than once. Rack corrects each reading for what you had eaten and drunk beforehand, then fits a trend.',
    tip: 'After a couple of weeks it tells you your real maintenance calories, measured rather than guessed.' },
  { view: 'steps', title: 'Steps',
    body: 'Type the day’s count or push it in from a shortcut. The ring tracks your goal and the bars show the streak.',
    tip: 'Steps deliberately don’t feed the calorie maths — that estimate already has your activity in it.' }
];

export function runTour(switchView) {
  return new Promise(resolve => {
    const host = document.getElementById('onboard');
    host.innerHTML = '';
    host.classList.remove('hidden');
    host.classList.add('ob-tour');
    document.body.classList.add('tour-on');

    let i = 0;
    const card = el('div', 'ob-card ob-tour-card');
    host.appendChild(card);
    draw();

    function draw() {
      const t = TOUR[i];
      try { switchView(t.view); } catch {}
      highlight(t.view);

      card.innerHTML = '';
      const dots = el('div', 'ob-dots');
      TOUR.forEach((_, n) => dots.appendChild(el('i', n === i ? 'on' : null)));
      card.appendChild(dots);

      card.appendChild(el('div', 'ob-kicker', 'Tab ' + (i + 1) + ' of ' + TOUR.length));
      card.appendChild(el('h1', 'ob-title', t.title));
      card.appendChild(el('div', 'ob-tour-body', t.body));
      card.appendChild(el('div', 'ob-tip', t.tip));

      const go = el('button', 'btn btn-primary btn-block btn-lg',
        i === TOUR.length - 1 ? 'Start logging' : 'Next');
      go.onclick = () => {
        if (i === TOUR.length - 1) return done();
        i++; draw();
      };
      card.appendChild(go);

      const row = el('div', 'ob-nav');
      if (i > 0) {
        const b = el('button', 'linkish', 'Back');
        b.onclick = () => { i--; draw(); };
        row.appendChild(b);
      }
      const s = el('button', 'linkish', 'Skip the tour');
      s.onclick = done;
      row.appendChild(s);
      card.appendChild(row);
    }

    function highlight(view) {
      document.querySelectorAll('#dock button').forEach(b =>
        b.classList.toggle('tour-lit', b.dataset.view === view));
    }

    async function done() {
      document.querySelectorAll('#dock button').forEach(b => b.classList.remove('tour-lit'));
      document.body.classList.remove('tour-on');
      host.classList.add('hidden');
      host.classList.remove('ob-tour');
      host.innerHTML = '';
      try { await markTourDone(); } catch {}
      resolve();
    }
  });
}
