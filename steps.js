// Steps — daily step count, however it gets there.
//
//   users/{uid}/steps/{YYYY-MM-DD} -> { steps, mi, t, src }
//   users/{uid}/settings/steps     -> { goal }
//
// Per-account for free: store.js prefixes every path with users/{uid}/, so
// nothing here needs to know more than one person exists.
//
// `src` says where a day came from — `manual` when typed in, `shortcut` /
// `hae` / `agent` when something pushed it. Every one of those is still read:
// days already logged from a phone automation render as "from your phone", and
// nothing about this node changed.
//
// What is gone is the WALKTHROUGH that told people how to set one up. It walked
// somebody through putting their Rack email and password into a third-party
// automation app, and printed the sign-in endpoint next to a Copy button. A
// password typed into MacroDroid is a password in MacroDroid, and no wording
// around it makes that a thing this app should be teaching. The REST door is
// still open to anyone who wants it — it is Firebase's, not ours — but the app
// no longer hands out the instructions.
//
// There is no Steps tab any more (rack-v67): its slot in the dock is Friends
// (friends.js), where steps are one of the three boards. The day's number
// lives on You (a tile, and the Habits card behind Trends, whose "Log today's
// steps" opens openSetSteps below) and what is left here is the data — the
// init that keeps the node subscribed, the goal, and the two sheets that
// write: set a day's total, and the goal (Settings → Step goal). Nothing in
// this file draws a page.
//
// Imports store.js, ui.js and usage.js. Nothing imports back.

import { read, write, watch, todayKey } from './store.js';
import { bump } from './usage.js';
import { el, sheet, toast, noteEl, compact, fmtDate, fmtDateFull, LIMITS, within } from './ui.js';

const DAY = 864e5;
const DEFAULTS = { goal: 10000 };

let settings = { ...DEFAULTS };
let days     = {};      // dateKey -> { steps, mi, t, src }
let unwatch  = null;

/* ================= INIT ================= */
export async function initSteps() {
  settings = { ...DEFAULTS, ...((await read('settings/steps', null)) || {}) };
  days = (await read('steps', null)) || {};
  if (unwatch) unwatch();
  // A whole year of days is a few tens of kilobytes, so the entire node stays
  // subscribed. That is also what makes an outside write — a phone automation
  // pushing today's count — land on screen without a refresh.
  unwatch = watch('steps', val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(days)) return;
    days = next;
  });
}

function stepsOn(k) { const d = days[k]; return d && d.steps > 0 ? d.steps : 0; }
function goal() { return settings.goal > 0 ? settings.goal : DEFAULTS.goal; }

// For the settings hub's live value pill — the number this tab is drawing
// with, so the two can never quote different goals.
export function stepGoal() { return goal(); }

/* ================= WRITES ================= */
async function setSteps(k, n, src = 'manual') {
  if (!(n >= 0)) return;
  const prev = days[k] || {};
  days[k] = { steps: Math.round(n), t: Date.now(), src, ...(prev.mi ? { mi: prev.mi } : {}) };
  await write('steps/' + k, days[k]);
}

async function removeDay(k) {
  delete days[k];
  await write('steps/' + k, null);
  toast('Cleared ' + fmtDate(k));
}

// `onSaved` is for the screen that opened this — You's Habits card quotes the
// week's steps, and a day saved here has to reach it.
export function openSetSteps(k = todayKey(), onSaved) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', k === todayKey() ? 'Today' : fmtDateFull(k)));
  sh.appendChild(el('h2', null, 'Set step total'));
  sh.appendChild(noteEl('The whole day’s number, not an amount to add. If your phone pushes steps later it will overwrite this.'));

  const row = el('div', 'qty-row');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '0'; inp.max = LIMITS.steps[1];
  inp.placeholder = String(goal());
  if (stepsOn(k)) inp.value = String(stepsOn(k));
  // No inline flex: `.qty-row .btn` gives this button 54px and zero padding,
  // the room "Save" needs. An inline `flex: 0 0 auto` over that zero padding
  // sized it to the word itself — the squash v46 took off Weight's Log.
  const go = el('button', 'btn btn-primary', 'Save');
  go.onclick = async () => {
    const n = parseInt(inp.value);
    if (!within(n, LIMITS.steps)) { toast(n > 0 ? 'That’s more than ' + LIMITS.steps[1].toLocaleString() + ' steps in a day' : 'Enter a step count'); return; }
    close();
    bump('stepsSet');
    await setSteps(k, n);
    if (onSaved) onSaved();
    toast(n.toLocaleString() + ' steps · ' + (k === todayKey() ? 'today' : fmtDate(k)));
  };
  row.append(inp, go);
  sh.appendChild(row);
  setTimeout(() => { inp.focus(); inp.select(); }, 80);

  if (stepsOn(k)) {
    const del = el('button', 'btn btn-danger btn-block', 'Clear this day');
    del.style.marginTop = '12px';
    del.onclick = async () => { close(); await removeDay(k); if (onSaved) onSaved(); };
    sh.appendChild(del);
  }

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= SETTINGS ================= */
// `onSaved` is for whoever opened this — Settings → Step goal, behind the You
// tab, which quotes the goal too, and a goal saved here has to reach it.
export function openStepSettings(onSaved) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Steps'));
  sh.appendChild(el('h2', null, 'Settings'));

  const gf = el('div', 'field');
  gf.style.marginTop = '12px';
  gf.appendChild(el('label', null, 'Daily goal'));
  const gi = el('input');
  gi.type = 'number'; gi.inputMode = 'numeric';
  gi.min = LIMITS.stepGoal[0]; gi.max = LIMITS.stepGoal[1];
  gi.value = String(goal());
  gf.appendChild(gi);
  sh.appendChild(gf);

  const quick = el('div', 'filter-row');
  quick.style.marginTop = '8px';
  [6000, 8000, 10000, 12000, 15000].forEach(n => {
    const c = el('button', 'chip', compact(n));
    c.onclick = () => { gi.value = String(n); };
    quick.appendChild(c);
  });
  sh.appendChild(quick);

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '10px';
  save.onclick = async () => {
    // Blank falls back to the default; a number has to be one a person could walk.
    const g = gi.value.trim() ? parseInt(gi.value) : DEFAULTS.goal;
    if (!within(g, LIMITS.stepGoal)) {
      toast('Pick a goal between ' + LIMITS.stepGoal[0].toLocaleString() + ' and ' + LIMITS.stepGoal[1].toLocaleString());
      return;
    }
    settings = { ...settings, goal: g };
    await write('settings/steps', settings);
    close();
    if (onSaved) onSaved();
    toast('Goal saved');
  };
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

