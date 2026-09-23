// The two things Coach looks like: a card, and a sheet.
//
// One component, two callers. The You tab and the Train tab draw the same card
// — Train in a tighter form — because they are showing the same engine's answer
// and two copies of a card is two copies of a layout to keep in step. coach.js
// has already decided which finding each surface gets and has already made sure
// they are not the same one, so neither caller has anything to choose.
//
// THE CARD'S HEIGHT IS FIXED AND THAT IS LOAD-BEARING, not a style choice. Its
// content changes every day — a one-line finding today, a two-line one tomorrow
// — and on Train it sits directly above Start workout. A card that grew by a
// line would move the app's primary button under somebody's thumb between one
// day and the next. Everything inside is clamped and the box cannot resize.
//
// Nothing in the sheet persists. It rebuilds from the engine every time it
// opens, and Coach keeps no history of its own output: the log is the only
// state there is, which is also why closing and reopening it can never show
// something the card contradicts.
//
// Imports coach.js, coach-data.js, ui.js and exercises.js (for a group's
// colour, nothing more). Nothing imports back — workout.js imports THIS file,
// which is why starting a workout from the sheet is a function the Train card
// hands in rather than an import here, and why "Add it" in a live session is
// the picker's own callback handed in the same way.

import { el, sheet, noteEl, segmented, toast } from './ui.js';
import { GROUPS } from './exercises.js';
import { coach, CATEGORIES, QUESTIONS, PRO_ADDS, LIVE_NONE, isMuted } from './coach.js';
import { coachInput, coachReady, coachLogKnown, rememberGreeting, coachSettings, coachSettingsKnown,
         setCategoryMuted, answerQuestion, markAsked, liveSessionOnDevice, coachPro } from './coach-data.js';

/* The two marks. Inline rather than in a sprite because there are two of them
   and the app has no icon system — the gear on You is written out the same way. */
function bubbleIcon() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.9');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.6-.3L3 21l1.4-4.1A8.1 8.1 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>';
  return s;
}

/* Open and grey on Pro, shut and yellow without it. The shackle is the only
   thing that moves, which is what makes the two states readable at a glance in
   a 14-pixel box. */
function lockIcon(pro) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.9');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<rect x="4" y="10.5" width="16" height="10" rx="2"/>' +
    (pro ? '<path d="M8 10.5V7a4 4 0 0 1 7.5-1.9"/>' : '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>');
  return s;
}

/* The greeting this app open settled on. Module state on purpose — see the
   comment at its one assignment in coachCard(); the alternative is a card that
   rewrites its own top line as the later reads land. */
let shownGreet = null;

/* ================= THE CARD =================

   `opts.tight` is the Train form. `opts.live` is whether a workout is running
   on this device, which the CALLER answers — coach-data.js never imports
   workout.js, so the module graph stays one-way and there is no cycle between
   the tab and the card it draws.

   Returns a <button>: the whole card opens the sheet, because a 190-pixel box
   with one tap target in the bottom corner is a box most people will never
   tap. The bottom row is still drawn, because it is what says the box is
   tappable at all. */
export function coachCard(opts = {}) {
  const card = el('button', 'coach-card' + (opts.tight ? ' tight' : ''));
  card.setAttribute('aria-label', 'Coach');

  /* TWO READINESS LEVELS, NOT ONE. The card used to wait for every node Coach
     reads, which meant the first thing on the screen the app opens to sat on a
     skeleton until the slowest of seven reads came home. It waits on the log
     now — the read that decides whether Coach may speak at all, and the one
     every training finding hangs off — and takes food, weight and steps when
     they arrive. Nothing is fabricated in between: the rules that need those
     nodes have null facts and stay silent, which is the same silence they give
     a log that is simply too thin. */
  if (!coachLogKnown()) {
    card.classList.add('loading');
    // No lock while it is loading. Guessing one flashes the wrong tier at
    // somebody for as long as the reads take, and the open padlock is exactly
    // the reassuring half to get wrong.
    card.appendChild(header(null));
    card.appendChild(el('div', 'coach-greet', 'Reading your log…'));
    card.appendChild(el('div', 'coach-line', ''));
    card.appendChild(el('div', 'coach-why', ''));
    card.appendChild(goRow(null));
    card.disabled = true;
    return card;
  }

  let c;
  try {
    c = coach(coachInput({ live: liveOf(opts) }));
  } catch {
    // The engine is pure and every rule in it is wrapped, so this is
    // unreachable by construction — and it is caught anyway, because this card
    // sits at the top of the screen the app opens on and a throw here would
    // take the whole paint with it.
    card.classList.add('loading');
    card.appendChild(header(null));
    card.appendChild(el('div', 'coach-greet', ''));
    card.appendChild(el('div', 'coach-line', 'Coach couldn’t read your log just now.'));
    card.appendChild(el('div', 'coach-why', 'Every tab below draws from its own data.'));
    card.appendChild(goRow(null));
    card.disabled = true;
    return card;
  }

  let view = opts.tight ? c.train : c.you;

  /* The one substitution the half-loaded state needs. "Nothing notable" is a
     claim about everything Coach checked, and on a card painted before the
     food and weight nodes landed it would be a claim about checks that have
     not run. Every other state is honest at this point — an unreadable log, a
     new account, a live session, a thin log and a real finding all read only
     the log — so this is the single case that has to wait, and it waits by
     saying so rather than by going back to a spinner. */
  if (!coachReady() && view.state === 'card_state_clear') {
    view = { ...view, tone: 'neutral',
             text: 'Your training is in. Food and weight have not landed yet.',
             reason: 'Coach would rather say nothing than read half a number.' };
  }

  /* Pinned for the rest of the app open, and written down once.

     The greeting is chosen from a pool whose membership depends on which reads
     have landed — four of the lines gate on weigh-ins, food or steps, which
     arrive after the log does — so the honest answer genuinely differs between
     the log paint and the full one. It is not only that the pool is a
     different length: cross two qualifying data lines and the rotation moves
     out of the whole ordered pool and into the data lines alone, so the
     counter can land somewhere entirely unrelated. Left alone, the top line of
     the card changes under the reader's thumb half a second after it appears,
     and rememberGreeting() records the line that flashed rather than the one
     they read, so the NEXT open avoids the wrong id.

     So the first line chosen is the line, and it is the one written down. What
     that costs is worth naming: at the paint that pins it fewer data-aware
     lines have qualified, so an open that would have rotated inside them can
     pin a generic instead, and the card reads more generic on a cold start
     than the engine alone would make it. Still a much smaller cost than a card
     that rewrites its own greeting while somebody is reading it. */
  if (!opts.tight && c.greet && c.greet.id && !shownGreet) shownGreet = c.greet;
  const greet = opts.tight ? null : (shownGreet || c.greet);
  if (greet && greet.id) rememberGreeting(greet.id);

  card.appendChild(header(c.pro));
  card.appendChild(el('div', 'coach-greet', greet ? greet.text : ''));
  card.appendChild(el('div', 'coach-line' + (view.tone === 'caution' ? ' caution' : ''), view.text));
  card.appendChild(el('div', 'coach-why', view.reason || ''));
  /* "Points at Train" is the whole of what the live-session card has to say, so
     it goes there rather than opening a sheet about a session that is not in
     the log yet. Only the You card can: on Train there is nowhere to point, and
     `go` is absent, which is what makes the tap fall back to the sheet. */
  const live = view.state === 'card_live_session' && typeof opts.go === 'function';
  card.appendChild(goRow(live ? 'Back to your session' : leadText(c, !!opts.tight)));
  card.onclick = live ? () => opts.go('workout') : () => openCoachSheet(opts);
  return card;
}

/* The caller answers whether a workout is running, because coach-data.js must
   never import workout.js — that edge would close a ring between the tab and
   the card it draws. A caller with no opinion (the Settings row, which has no
   tab behind it) gets the device's own answer. */
function liveOf(opts) {
  if (typeof opts.live === 'boolean') return opts.live;
  try { return liveSessionOnDevice(); } catch { return false; }
}

/* What the bottom row offers.

   The lead question is the You card's third slot and stays there: on Train the
   card sits above Start workout and a prompt reading "How's my food?" beside
   that button is an invitation to somewhere nobody is going. The tighter card
   gets the bare row, which is all §8.1 asks of it.

   The Pro count appears on BOTH, because that is tier information rather than a
   question — the lock in the corner says there is something behind it and this
   is the only place with room to say how much. */
function leadText(c, tight) {
  /* The count waits for the whole snapshot. Three of the ten Pro findings read
     food and weight, so at the log phase this is genuinely "at least N" — and a
     number on a card that goes up a moment after somebody read it is the kind
     of small wrongness that makes the rest of the card harder to believe. */
  if (!c.pro && coachReady() && c.lockedCount > 0) {
    return c.lockedCount === 1 ? '1 more with Pro' : c.lockedCount + ' more with Pro';
  }
  if (tight) return '';
  // No topics means no data behind any of them — a brand-new account. The row
  // stays a bare COACH ME rather than inviting a question Coach would have to
  // answer with "nothing yet".
  return c.lead ? c.lead.label : '';
}

// `pro` null means "not known yet" and draws no lock at all.
function header(pro) {
  const h = el('div', 'coach-hd');
  const mark = el('span', 'coach-mark');
  mark.appendChild(bubbleIcon());
  h.appendChild(mark);
  h.appendChild(el('span', 'coach-ttl', 'COACH'));
  if (pro === null) return h;
  const lock = el('span', 'coach-lock' + (pro ? ' open' : ''));
  lock.appendChild(lockIcon(pro));
  lock.setAttribute('aria-label', pro ? 'Included on your account' : 'Part of Pro');
  h.appendChild(lock);
  return h;
}

function goRow(lead) {
  const r = el('div', 'coach-go');
  r.appendChild(el('span', 'coach-go-t', 'COACH ME'));
  if (lead) r.appendChild(el('span', 'coach-go-q', lead));
  r.appendChild(el('span', 'coach-go-x', '›'));
  return r;
}

/* ================= THE SHEET =================

   A bottom sheet, the way Log food is — not a route the way Start workout is.
   Coach is something you glance at and close, and a route would put it in the
   back-button's history where it does not belong.

   Every bubble is answered IMMEDIATELY. There is no submenu anywhere in here:
   a tap produces an answer and two or three follow-ups generated from that
   answer, and a follow-up that has nothing behind it is never offered — a
   button that opens on "Coach can't tell yet" is worse than one fewer button.

   No text box tonight. The router is already keyed on ids and is exercised by
   every one of these buttons, so ship three's box is a matcher in front of it
   and nothing behind it moves. */
export function openCoachSheet(opts = {}) {
  /* WHICH CARD OPENED THIS. `opts` arrives straight off the card, so `tight` is
     already the answer — the Train form is the tight one. Everything else in
     here is the same sheet; only the set of things it offers to be asked
     changes, and the engine decides that rather than this file. A caller with
     no card behind it (Settings → Ask Coach something) gets the You set, which
     is the general one. */
  const surface = opts.tight ? 'train' : 'you';

  const { sh, close } = sheet();
  sh.classList.add('coach-sheet');

  let c;
  try {
    c = coach(coachInput({ live: liveOf(opts) }));
  } catch {
    sh.appendChild(el('div', 'eyebrow', 'Coach'));
    sh.appendChild(el('h2', null, 'Coach'));
    sh.appendChild(noteEl('Coach couldn’t read your log just now. Every tab draws from its own data.'));
    return;
  }

  sh.appendChild(el('div', 'eyebrow', 'Coach'));
  sh.appendChild(el('h2', null, 'What I can see'));

  const thread = el('div', 'coach-thread');
  sh.appendChild(thread);

  /* THE BUILDER NEEDS A WAY TO START WHAT IT BUILDS. startWorkout is
     workout.js's, and this file must not import workout.js — workout.js imports
     this one, and that edge would close a ring the module graph cannot load.
     So the card that can start a workout hands the function in, the way
     openRoutines(preset => startWorkout(preset)) already does, and a sheet
     opened without one (the You card; Settings) never offers the builder at
     all. A proposal whose Start button can do nothing is worse than no
     proposal. */
  const canBuild = typeof opts.start === 'function';
  const offer = list => (canBuild ? list : list.filter(x => x.id !== 'ask_build'));

  const asked = new Set();
  const topics = offer(c.topicsFor(surface));
  let buttons = null;
  let chipList = [];
  // The builder's state for this sitting: the opts the proposal on screen was
  // built with, and the proposal's box. One proposal is live at a time — an
  // adjustment replaces it rather than stacking a second set of buttons.
  let buildOpts = {};
  let buildBox = null;

  const scroll = () => { try { sh.scrollTop = sh.scrollHeight; } catch {} };

  function bubble(who, text, reason) {
    const b = el('div', 'coach-bub ' + who);
    b.appendChild(el('div', 'coach-bub-t', text));
    if (reason) b.appendChild(el('div', 'coach-bub-r', reason));
    thread.appendChild(b);
    return b;
  }

  function showButtons(list) {
    chipList = list;
    if (buttons) buttons.remove();
    buttons = el('div', 'coach-chips');
    list.forEach(item => {
      const b = el('button', 'coach-chip', item.label);
      b.onclick = () => run(item.id, item.label);
      buttons.appendChild(b);
    });
    if (list.length) thread.appendChild(buttons);
    else buttons = null;
  }

  function run(id, label) {
    asked.add(id);
    if (buttons) { buttons.remove(); buttons = null; }
    bubble('you', label);
    let a;
    try { a = c.ask(id); } catch { a = null; }
    if (!a) {
      bubble('coach', 'Coach can’t answer that one.', 'It only says things it can back with a number from your own log.');
    } else {
      bubble('coach', a.text, a.reason);
      // An answer that says more than one thing — Patterns says every check
      // that clears — follows its first bubble with the rest, one each.
      (a.more || []).forEach(m => bubble('coach', m.text, m.reason));
      // The builder's answer is a bubble AND the workout under it. Nothing is
      // asked first: the default proposal is on screen the moment the chip is.
      if (a.id === 'build_workout' && canBuild) {
        const p = c.build(buildOpts);
        if (p) drawProposal(p);
      }
    }
    // Never offer the same question twice in one sitting, and always leave a
    // way back to this surface's own topics. A follow-up and a topic can be the
    // same route under two labels — "Build it" is "Make me a workout" — so a
    // topic already offered as a follow-up is not offered twice.
    const next = offer((a && a.followups) || []).filter(f => !asked.has(f.id));
    showButtons(next.concat(topics.filter(t => !asked.has(t.id) && !next.some(f => f.id === t.id))));
    scroll();
  }

  // The opening bubble is already on screen when the sheet opens: it is the
  // same finding the card that opened it is showing, so the two cannot
  // disagree in the half second between the tap and the paint.
  bubble('coach', c.opening.text, c.opening.reason);

  /* A session is running, so there is no "Make me a workout" — starting one
     would replace it. The sheet says so in one line, and only where the
     builder would otherwise have been offered: on Train, on Pro, and with a
     proposal the log could really build. */
  if (canBuild && c.pro) {
    let line = null;
    try { line = c.buildLive(); } catch { line = null; }
    if (line) bubble('coach', line);
  }

  /* THE WORKOUT, AND THE WAYS ON FROM IT. Every adjustment is a follow-up and
     never an interview: a tap is a new set of opts, the engine builds again
     from scratch, and the proposal on screen is replaced. The words on every
     button and chip come from proposalBlock() below; this is only the glue. */
  function drawProposal(p) {
    if (buildBox) buildBox.remove();
    buildBox = proposalBlock(p, {
      start: preset => {
        close();
        // A copy. The live session is edited in place, set by set, and must
        // share nothing with a proposal the engine is still holding.
        opts.start(JSON.parse(JSON.stringify(preset)));
      },
      // Saving leaves the sheet where it is: the routine sheet opens over it
      // and shows its own "Saved <name>" when it is done.
      save: typeof opts.save === 'function' ? record => opts.save(record) : null,
      adjust
    });
    thread.appendChild(buildBox);
  }
  function adjust(next, label, refocus) {
    buildOpts = next;
    if (buildBox) { buildBox.remove(); buildBox = null; }
    if (buttons) { buttons.remove(); buttons = null; }
    bubble('you', label);
    let p = null;
    try { p = c.build(next); } catch { p = null; }
    if (!p) {
      bubble('coach', BUILD_NONE, BUILD_NONE_WHY);
    } else {
      // A new focus is a new workout and gets its own first line; fewer and
      // swap are the same workout, redrawn.
      if (refocus) bubble('coach', p.headline, p.reason.join(' '));
      drawProposal(p);
    }
    showButtons(chipList);
    scroll();
  }

  /* Coach's one question, if it has earned the right to ask one. Three gates
     have already been passed inside the engine — the category is not muted,
     nothing is already waiting for an answer, and the answer really changes
     what a registered rule does. Answering writes it and the sheet closes on
     the next open with the rule live. */
  if (c.question) {
    /* Stamped as ASKED the moment it is on screen, not when it is answered.
       Somebody who opened this sheet looking for something else and closed it
       has not refused the question — so it goes quiet for a week and comes back
       rather than appearing every single time the sheet opens, which is the
       difference between being asked and being nagged. */
    markAsked(c.question.id).catch(() => {});
    const q = bubble('coach ask', c.question.text,
      'Coach asks at most one thing, and only something that changes what it can tell you.');
    const row = el('div', 'coach-chips');
    c.question.options.forEach(op => {
      const b = el('button', 'coach-chip', op.label);
      b.onclick = () => {
        row.remove();
        bubble('you', op.label);
        answerQuestion(c.question.id, op.value).catch(() => {});
        bubble('coach', 'Noted. That changes how Coach reads your weight.',
          'Nothing else about it is stored, and you can change it any time from Settings → Coach.');
        scroll();
      };
      row.appendChild(b);
    });
    q.appendChild(row);
  }

  /* THE TIER GATE, AND IT IS A REAL ONE NOW. The lock in the card's corner
     rendered correctly from the first day and the sheet behind it ignored it
     entirely — a basic account tapped the card and got every topic. What Pro
     buys is the comparisons; what a basic account gets is the one finding above
     and a straight account of what it is not seeing.

     This is a DISPLAY gate. Everything it hides is already in the bundle and
     anybody who opens the dev tools can read it. That is accepted: Coach costs
     nothing per use — no model call, no network, no per-account cost — so the
     worst case of somebody defeating it is a person seeing sentences that were
     free to produce. It is not pretended otherwise anywhere in this file. */
  if (c.pro) showButtons(topics.slice());
  else thread.appendChild(proPanel());

  sh.appendChild(noteEl(
    'Coach reads your own log and nothing else — your sessions, your food, your ' +
    'weigh-ins and your steps, against the targets you set. It is not medical or ' +
    'nutritional advice, it does not know anything about you that you have not ' +
    'logged, and it will say nothing rather than guess.'));

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '10px';
  done.onclick = close;
  sh.appendChild(done);
}

/* What Pro adds, said once and said straight.

   The list comes out of the engine (PRO_ADDS, derived from the intent table's
   own tiers) rather than being written here, because a hand-written list of
   what somebody is not getting is a list that goes quietly untrue the first
   time an intent changes tier — and an untrue sentence about what is behind a
   lock is worse than no lock.

   THERE IS NO BUY BUTTON, DELIBERATELY. Rack has no payment path: RevenueCat
   and Apple IAP are phase three and are not built, and the app is invite-only,
   so an Upgrade button would be a button that goes nowhere. One that does
   nothing is worse than none — it turns a clear boundary into a broken
   feature. The panel says what Pro is and that it is not on sale, and the seam
   for the real flow is marked below: when there is something to sell, a button
   goes where the comment is and nothing else in this file has to move. */
function proPanel() {
  const b = el('div', 'coach-bub pro');
  b.appendChild(el('div', 'coach-bub-t', 'What else Coach reads on Pro'));
  b.appendChild(el('div', 'coach-bub-r',
    'The finding above is the free half. Pro is the comparisons — your log ' +
    'against your own history rather than a readout of today.'));

  const list = el('div', 'coach-adds');
  PRO_ADDS.forEach(a => {
    const row = el('div', 'coach-add');
    row.appendChild(el('div', 'coach-add-t', a.label));
    row.appendChild(el('div', 'coach-add-n', a.note));
    list.appendChild(row);
  });
  b.appendChild(list);

  b.appendChild(el('div', 'coach-bub-r',
    'It is not on sale yet — Rack is invite-only and there is nothing to buy ' +
    'from here. Ask Micah if you want it turned on.'));

  /* ↓ THE SEAM. The purchase flow lands here and nowhere else: one button,
       appended to `b`, wired to whatever phase three brings. Nothing above it
       needs to change when it does. */

  return b;
}

/* ================= THE PROPOSAL =================
   What "Make me a workout" draws under its answer: his routine by his name if
   he has one for this, then the exercises — name, the sets as he did them,
   and one dim line of what the log shows — then what was left out and why,
   then exactly four buttons. Built from the recap's own list (.day-ex) and
   the workout screen's block label, because it is the same thing turned
   forward: what he did, about to be done again.

   Every string here is fenced by coach-voice.mjs section G, which reads this
   section of the file and nothing else of it.

     Start it                    the placeholders: his numbers as ghost text
     Start with my last numbers  the boxes filled and nothing ticked — absent
                                 after a layoff, when there is no such view
     Save as routine             saveSessionAsRoutine(record), named for the
                                 shape — absent if the card cannot save
     Change something            the follow-ups; absent if there are none */
const BUILD_NONE = 'Coach can’t build that one.';
const BUILD_NONE_WHY = 'Nothing in your log fits it, and Coach would rather say so than guess.';

function proposalBlock(p, on) {
  const box = el('div', 'coach-build');
  if (p.routineLine) box.appendChild(el('div', 'coach-build-note mine', p.routineLine));

  let inBlock = null;
  p.exercises.forEach(e => {
    if (e.block && e.block !== inBlock) box.appendChild(el('div', 'wk-block-title', 'Block ' + e.block));
    inBlock = e.block || null;
    const row = el('div', 'day-ex');
    const tag = el('i', 'day-ex-tag');
    tag.style.background = (GROUPS[e.group] || {}).color || 'var(--dim)';
    const body = el('div', 'day-ex-body');
    body.appendChild(el('div', 'day-ex-name', e.name));
    body.appendChild(el('div', 'day-ex-sets num', e.line));
    if (e.note) body.appendChild(el('div', 'coach-build-w', e.note));
    row.append(tag, body);
    box.appendChild(row);
  });
  if (p.leftOutLine) box.appendChild(el('div', 'coach-build-note', p.leftOutLine));
  if (p.layoffLine) box.appendChild(el('div', 'coach-build-note', p.layoffLine));

  const acts = el('div', 'coach-build-acts');
  const button = (label, primary, fn) => {
    const b = el('button', 'btn ' + (primary ? 'btn-primary' : 'btn-ghost') + ' btn-block', label);
    b.onclick = fn;
    acts.appendChild(b);
  };
  button('Start it', true, () => on.start(p.placeholders));
  if (p.lastNumbers) button('Start with my last numbers', false, () => on.start(p.lastNumbers));
  if (on.save) button('Save as routine', false, () => on.save(p.record));

  // The follow-ups, one row at a time inside the proposal, each chip either a
  // new set of opts or the next row down. The engine has already decided which
  // of these exist: every focus offered builds, every swap is a real lift.
  let row = null;
  const chips = items => {
    if (row) row.remove();
    row = el('div', 'coach-chips');
    items.forEach(it => {
      const b = el('button', 'coach-chip', it.label);
      b.onclick = it.run;
      row.appendChild(b);
    });
    box.appendChild(row);
  };
  const seen = new Set();
  const swappable = p.exercises.filter(e => e.swaps.length && !seen.has(e.exId) && seen.add(e.exId));
  const changes = [];
  if (p.focuses.length) {
    changes.push({ label: 'Train something else',
      run: () => chips(p.focuses.map(f => ({ label: f.label, run: () => on.adjust(f.opts, f.label, true) }))) });
  }
  if (p.fewer) changes.push({ label: 'Fewer exercises', run: () => on.adjust(p.fewer, 'Fewer exercises', false) });
  if (swappable.length) {
    changes.push({ label: 'Swap one',
      run: () => chips(swappable.map(e => ({ label: e.name,
        run: () => chips(e.swaps.map(x => ({ label: x.name,
          run: () => on.adjust(x.opts, 'Swap ' + e.name + ' for ' + x.name, false) }))) }))) });
  }
  if (changes.length) button('Change something', false, () => chips(changes));

  box.appendChild(acts);
  return box;
}

/* ================= THE SETTINGS SECTION =================
   Built here rather than in settings.js so the toggle list and the table it
   comes from cannot drift: CATEGORIES is the only place a category exists, and
   this walks it. settings.js owns where the section sits and nothing else
   about it. */
export function coachToggleRows(host, onChange) {
  if (!coachReady()) {
    host.appendChild(noteEl('Still reading Coach’s settings. Give it a moment and reopen this.'));
  } else if (!coachSettingsKnown()) {
    // Switches showing this file's defaults over a node nobody could read is a
    // screen that invites somebody to "fix" a setting that was never broken.
    host.appendChild(noteEl(
      'Coach’s settings couldn’t be read from this device just now. These are the ' +
      'defaults — a change made here won’t save until it can reach the database.'));
  }
  const list = el('div', 'set-list');
  CATEGORIES.filter(c => c.mutable).forEach(c => {
    const row = el('div', 'set-row-tog');
    const body = el('div', 'set-row-l');
    body.appendChild(el('span', null, c.label));
    body.appendChild(el('span', 'set-row-sub', c.note));
    row.appendChild(body);
    row.appendChild(toggle(c, onChange));
    list.appendChild(row);
  });
  host.appendChild(list);
  return list;
}

/* The one new component this ship adds, and it is added rather than reused
   because there was nothing to reuse: the app's only binary control is
   segmented(), and seven segmented pairs stacked in a sheet is a wall rather
   than a settings screen. ON is the absence of a stored key, so a fresh account
   sees every switch on without a single byte having been written.

   The switch flips FIRST and the write follows, so the control answers the
   thumb immediately — and it flips back if the write comes home refused, which
   is the only honest way to show a setting the database would not take. */
function toggle(cat, onChange) {
  const b = el('button', 'tog');
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-label', cat.label);
  // isMuted, not the mute map: Patterns is stored the other way round.
  let on = !isMuted(coachSettings(), cat.id);
  let busy = false;
  const paint = () => {
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  paint();
  b.onclick = () => {
    if (busy) return;
    busy = true;
    on = !on;
    paint();
    setCategoryMuted(cat.id, !on)
      .then(ok => {
        busy = false;
        if (ok === false) { on = !on; paint(); }
        else if (onChange) onChange();
      })
      .catch(() => { busy = false; on = !on; paint(); });
  };
  return b;
}

/* What Coach has been told, and the way to change it. Only questions that have
   actually been answered appear: a settings screen listing every question Coach
   might one day ask is a screen about Coach rather than about this account.

   It is here because the sheet promises it — "you can change it any time from
   Settings → Coach" — and a promise a screen does not keep is worse than one it
   never made. */
export function coachAnswerRows(host, onChange) {
  const answers = coachSettings().answers || {};
  const given = QUESTIONS.filter(q => answers[q.id] != null);
  if (!given.length) return null;

  given.forEach(q => {
    const f = el('div', 'field');
    f.style.marginTop = '14px';
    f.appendChild(el('label', null, q.text));
    f.appendChild(segmented(
      q.options.map(op => [op.value, op.label]),
      answers[q.id],
      v => {
        answerQuestion(q.id, v)
          .then(ok => {
            toast(ok === false ? 'Couldn’t save that' : 'Saved');
            if (ok !== false && onChange) onChange();
          })
          .catch(() => toast('Couldn’t save that'));
      }));
    host.appendChild(f);
  });
  return given.length;
}

/* ================= IN THE GYM =================
   Ship three, part one. During a live workout Coach can say what usually comes
   next, or that he is probably done — and the whole of this section is about
   WHEN it is allowed to, because mid-workout is the most sensitive place it
   will ever speak. He is under a bar. So:

     NOTHING POPS UP. There is a chip in the session's header row, and a tap
     on it is the only way the sheet opens.
     ONE QUIET LINE, ONCE. When a tick finishes an exercise — its last set —
     the answer may appear as one line in the slot under that exercise where
     the swipe hint sits. The same height, the same place, so no row moves;
     it is inline, so it covers nothing, least of all the rest timer; it is
     dismissible; and it is never shown for the same exercise twice in one
     session. The next tick anywhere clears it, because the moment it was
     about has passed.
     BASIC SEES NOTHING NEW. No chip, no line, no lock and no teaser —
     nobody is sold anything under a bar. And an EDIT of a past session is
     not a workout in progress: nothing appears over one.

   What to say is coach-live.js's, through coach.js's c.live(); the gates on it
   are the engine's too. This file decides only where and when it is drawn. */

/* The chip. Null for a basic account and during an edit, so the header row
   simply has no chip rather than a disabled one. `opts.session` is the live
   session; `opts.add` is the callback the picker hands chosen exercises to. */
export function liveChip(opts = {}) {
  const s = opts.session;
  if (!s || typeof s !== 'object' || s._edit) return null;
  let pro = false;
  try { pro = coachPro() === true; } catch { pro = false; }
  if (!pro) return null;
  const b = el('button', 'wk-coach');
  b.setAttribute('aria-label', 'Ask Coach what to do next');
  const mark = el('span', 'coach-mark');
  mark.appendChild(bubbleIcon());
  b.appendChild(mark);
  b.appendChild(el('span', 'coach-ttl', 'Coach'));
  b.onclick = () => openLiveSheet(opts);
  return b;
}

const LIVE_ASK = 'What should I do next?';
const LIVE_WAIT = 'Coach is reading your log — ask again in a moment.';

/* The compact sheet: the question, answered at once, and at most two ways on —
   the reasons behind the answer, and, when the answer names an exercise he
   has not got on today's list, a button that adds it. */
export function openLiveSheet(opts = {}) {
  const { sh, close } = sheet();
  sh.classList.add('coach-sheet', 'coach-live');
  sh.appendChild(el('div', 'eyebrow', 'Coach'));
  const thread = el('div', 'coach-thread');
  sh.appendChild(thread);
  const bubble = (who, text) => {
    const b = el('div', 'coach-bub ' + who);
    b.appendChild(el('div', 'coach-bub-t', text));
    thread.appendChild(b);
    return b;
  };

  bubble('you', LIVE_ASK);
  let a = null;
  const known = coachLogKnown();
  if (known) {
    try { a = coach(coachInput({ live: true })).live(opts.session, { current: opts.current }); } catch { a = null; }
  }
  bubble('coach', a ? a.text : known ? LIVE_NONE.text : LIVE_WAIT);

  const why = a ? a.why : known ? LIVE_NONE.why : [];
  const row = el('div', 'coach-chips');
  if (why.length) {
    const w = el('button', 'coach-chip', 'Why?');
    w.onclick = () => {
      w.remove();
      const b = bubble('coach', why[0]);
      why.slice(1).forEach(t => b.appendChild(el('div', 'coach-bub-r', t)));
      try { sh.scrollTop = sh.scrollHeight; } catch {}
    };
    row.appendChild(w);
  }
  thread.appendChild(row);

  /* ADD IT goes through the picker's own path — workout.js hands in the very
     function the "+ Add exercise" button hands openPicker — with the library
     row the picker would have handed back. So it lands where that button puts
     an exercise, at the end of the session and outside any block, with the
     sets that button gives one; nothing above it moves. */
  if (a && a.add && typeof opts.add === 'function') {
    const go = el('button', 'btn btn-primary btn-block', 'Add it');
    go.style.marginTop = '12px';
    go.onclick = () => { close(); opts.add([{ ...a.add }]); };
    sh.appendChild(go);
  }

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '10px';
  done.onclick = close;
  sh.appendChild(done);
}

/* Which exercise a line belongs to: its id and which occurrence of that id it
   is, so a block duplicated in one session is two exercises to a person and
   gets a line each, and removing an unrelated exercise above it cannot hand
   one exercise's line to another. */
function nudgeKey(session, exIdx) {
  const list = (session && session.exercises) || [];
  const ex = list[exIdx];
  if (!ex || !ex.exId) return null;
  let nth = 0;
  for (let k = 0; k < exIdx; k++) if (list[k] && list[k].exId === ex.exId) nth++;
  return ex.exId + '#' + nth;
}

function nudgeState(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    shown: Array.isArray(o.shown) ? o.shown.filter(x => typeof x === 'string') : [],
    nudge: o.nudge && typeof o.nudge === 'object' && typeof o.nudge.key === 'string' ? o.nudge : null
  };
}

/* After a tick: the live session's line state, as it should be now. Never
   mutates what it is handed — workout.js assigns the answer to the session,
   the way it assigns what every other helper returns. The line appears only
   when this tick finished the exercise (its LAST set, ticked on), only when
   the engine has something to say, and only if that exercise has not had a
   line already this session. Any other tick clears whatever line was up. */
export function noteLiveTick(session, exIdx, setIdx) {
  const was = nudgeState(session && session._coach);
  const quiet = { shown: was.shown, nudge: null };
  if (!session || typeof session !== 'object' || session._edit) return quiet;
  const ex = (session.exercises || [])[exIdx];
  const sets = ex && Array.isArray(ex.sets) ? ex.sets : [];
  const set = sets[setIdx];
  if (!set || !set.done || setIdx !== sets.length - 1) return quiet;
  const key = nudgeKey(session, exIdx);
  if (!key || was.shown.includes(key)) return quiet;
  if (!coachLogKnown()) return quiet;
  let a = null;
  try { a = coach(coachInput({ live: true })).live(session, { current: exIdx }); } catch { a = null; }
  if (!a || !a.short) return quiet;
  return { shown: was.shown.concat(key), nudge: { key, kind: a.kind, short: a.short } };
}

// Dismissed: the line goes, and the exercise stays counted as shown.
export function dismissNudge(state) {
  const was = nudgeState(state);
  return { shown: was.shown, nudge: null };
}

/* The line itself, or null — in which case the caller draws its swipe hint as
   it always has. Same class as the hint, so it is the same one-line box in the
   same place; the text is clipped to one line rather than wrapping, which is
   what keeps the height, and the rows under it, exactly where they were. */
export function nudgeLine(session, exIdx, on = {}) {
  if (!session || session._edit) return null;
  const st = nudgeState(session._coach);
  if (!st.nudge || st.nudge.key !== nudgeKey(session, exIdx)) return null;
  const line = el('div', 'swipe-hint coach-nudge');
  const t = el('button', 'coach-nudge-t', 'Coach · ' + st.nudge.short);
  t.setAttribute('aria-label', 'Coach: ' + st.nudge.short + ' Tap for why.');
  t.onclick = () => { if (typeof on.open === 'function') on.open(); };
  const x = el('button', 'coach-nudge-x', '×');
  x.setAttribute('aria-label', 'Dismiss');
  x.onclick = () => { if (typeof on.dismiss === 'function') on.dismiss(); };
  line.append(t, x);
  return line;
}
