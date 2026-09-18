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
// Imports coach.js, coach-data.js and ui.js. Nothing imports back.

import { el, sheet, noteEl, segmented, toast } from './ui.js';
import { coach, CATEGORIES, QUESTIONS } from './coach.js';
import { coachInput, coachReady, rememberGreeting, coachSettings, coachSettingsKnown,
         setCategoryMuted, answerQuestion, markAsked, liveSessionOnDevice } from './coach-data.js';

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

  if (!coachReady()) {
    card.classList.add('loading');
    card.appendChild(header(true));
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
    card.appendChild(header(true));
    card.appendChild(el('div', 'coach-greet', ''));
    card.appendChild(el('div', 'coach-line', 'Coach couldn’t read your log just now.'));
    card.appendChild(el('div', 'coach-why', 'Every tab below still works — the numbers live there.'));
    card.appendChild(goRow(null));
    card.disabled = true;
    return card;
  }

  const view = opts.tight ? c.train : c.you;

  // Written once per app open, and only from the You card — the surface that is
  // on screen first. Rotating on a Train paint as well would burn two lines per
  // open and make the pool feel half the size it is.
  if (!opts.tight && c.greet && c.greet.id) rememberGreeting(c.greet.id);

  card.appendChild(header(c.pro));
  card.appendChild(el('div', 'coach-greet', opts.tight ? '' : (c.greet ? c.greet.text : '')));
  card.appendChild(el('div', 'coach-line' + (view.tone === 'caution' ? ' caution' : ''), view.text));
  card.appendChild(el('div', 'coach-why', view.reason || ''));
  /* "Points at Train" is the whole of what the live-session card has to say, so
     it goes there rather than opening a sheet about a session that is not in
     the log yet. Only the You card can: on Train there is nowhere to point, and
     `go` is absent, which is what makes the tap fall back to the sheet. */
  const live = view.state === 'card_live_session' && typeof opts.go === 'function';
  card.appendChild(goRow(live ? 'Back to your session' : leadText(c)));
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

/* What the bottom row offers. On a free account with findings behind the tier
   it says how many rather than repeating a question — the lock in the corner
   says there is something there, and this is the only place with room to say
   how much. */
function leadText(c) {
  if (!c.pro && c.lockedCount > 0) {
    return c.lockedCount === 1 ? '1 more with Pro' : c.lockedCount + ' more with Pro';
  }
  return c.lead ? c.lead.label : 'What have you noticed?';
}

function header(pro) {
  const h = el('div', 'coach-hd');
  const mark = el('span', 'coach-mark');
  mark.appendChild(bubbleIcon());
  h.appendChild(mark);
  h.appendChild(el('span', 'coach-ttl', 'COACH'));
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
  const { sh, close } = sheet();
  sh.classList.add('coach-sheet');

  let c;
  try {
    c = coach(coachInput({ live: liveOf(opts) }));
  } catch {
    sh.appendChild(el('div', 'eyebrow', 'Coach'));
    sh.appendChild(el('h2', null, 'Coach'));
    sh.appendChild(noteEl('Coach couldn’t read your log just now. Every tab still works — the numbers live there.'));
    return;
  }

  sh.appendChild(el('div', 'eyebrow', 'Coach'));
  sh.appendChild(el('h2', null, 'What I can see'));

  const thread = el('div', 'coach-thread');
  sh.appendChild(thread);

  const asked = new Set();
  let buttons = null;

  const scroll = () => { try { sh.scrollTop = sh.scrollHeight; } catch {} };

  function bubble(who, text, reason) {
    const b = el('div', 'coach-bub ' + who);
    b.appendChild(el('div', 'coach-bub-t', text));
    if (reason) b.appendChild(el('div', 'coach-bub-r', reason));
    thread.appendChild(b);
    return b;
  }

  function showButtons(list) {
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
    }
    // Never offer the same question twice in one sitting, and always leave a
    // way back to the three topics.
    const next = ((a && a.followups) || []).filter(f => !asked.has(f.id));
    showButtons(next.concat(c.topics.filter(t => !asked.has(t.id))));
    scroll();
  }

  // The opening bubble is already on screen when the sheet opens: it is the
  // same finding the card that opened it is showing, so the two cannot
  // disagree in the half second between the tap and the paint.
  bubble('coach', c.opening.text, c.opening.reason);

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

  showButtons(c.topics.slice());

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
  let on = !coachSettings().mute[cat.id];
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
