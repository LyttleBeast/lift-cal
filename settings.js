// The settings hub — every setting in the app, behind the gear on the You tab.
//
// Before this existed the controls were scattered by accident of history:
// targets, water and the estimator behind Fuel's gear, the step goal behind
// Steps', and everything else — people, default rest, the workout importer, the
// walkthrough and both ways of signing out — in a card at the bottom of the
// Weight tab that you had to scroll past a chart to find.
//
// Almost nothing is implemented here. The sheets this opens are the ones Fuel,
// Steps, Water, Train and onboarding already own; this file is a table of
// contents that knows where each of them lives. There are two exceptions, and
// both are here because they had nowhere else to be: the profile editor (no
// code has touched users/{uid}/profile since onboarding wrote it) and the two
// sign-out paths, which are the only controls in the app that can lose data.
//
// Sheets never nest. Every row that opens another sheet closes this one first.

import { el, sheet, toast, noteEl, confirmSheet, segmented, LIMITS, clamp, saveText } from './ui.js';
import { LS, uid, read, readExact, currentEmail, write, purgeDevice, logout } from './store.js';
import { openTargets, openAiSettings, openRecallList, openImportPaste,
         foodTargets, latestLb, goalId, previewGoal, setGoal, goalFits } from './food.js';
import { openWaterSettings, waterSettings, fmtWater } from './water.js';
import { openStepSettings, stepGoal, openAutoDetails } from './steps.js';
import { openImport } from './importer.js';
import { openExerciseManager } from './picker.js';
import { hasProxy } from './ai.js';
import { hasActiveSession } from './workout.js';
import { openInstallGuide } from './onboarding.js';

/* ---------- pieces ---------- */

function section(host, title) {
  const s = el('div', 'you-sec');
  s.appendChild(el('div', 'you-sec-t', title));
  host.appendChild(s);
  return s;
}

function rowList(s) {
  const list = el('div', 'set-list');
  s.appendChild(list);
  return list;
}

// A tappable row: label, an optional live value, and the chevron that is the
// row's only signal that it opens something.
function navRow(list, label, value, onTap) {
  const b = el('button', 'set-row-nav');
  b.appendChild(el('span', 'set-row-l', label));
  if (value) b.appendChild(el('span', 'set-row-v num', value));
  b.appendChild(el('span', 'set-row-x', '›'));
  b.onclick = onTap;
  list.appendChild(b);
  return b;
}

function field(label, node) {
  const f = el('div', 'field');
  f.appendChild(el('label', null, label));
  f.appendChild(node);
  return f;
}

function numIn(value) {
  const n = el('input');
  n.type = 'number';
  n.inputMode = 'numeric';
  n.step = 'any';
  n.value = String(value);
  return n;
}

/* ---------- the value pills ----------
   Every one of these comes from the owning module's getter, never from a fresh
   read of the database. food.js's applyAuto() moves the targets in memory the
   moment the weight trend says it should and writes them afterwards, so a read
   here would sometimes quote a number the Fuel tab has already stopped using.
   The same reasoning applies to the other three: the getter is the number on
   screen, which is the only one worth repeating. */
function targetPill() {
  const t = foodTargets();
  return t && t.cal > 0 ? t.cal.toLocaleString() + ' kcal' : null;
}

function waterPill() {
  const s = waterSettings();
  return s && s.goalMl > 0 ? fmtWater(s.goalMl) : null;
}

function stepPill() {
  const g = stepGoal();
  return g > 0 ? g.toLocaleString() : null;
}

// Deliberately not "On"/"Off". All the app can see is whether it has a Worker
// address to send to; whether that Worker will actually spend anything is
// aiAllow/{uid} and the rate limits, which only the Worker can answer. Saying
// "On" to somebody the owner has blocked would be a lie the app can't back up.
function aiPill() {
  return hasProxy() ? 'Connected' : 'Not set up';
}

/* ================= THE HUB ================= */

/* `onEdit` fires after a change that the screen behind this sheet may be
   quoting. It has to hang off the individual sheets rather than off this one,
   because every row closes the hub before opening its own — so by the time a
   goal is saved this sheet is long gone and has nothing left to tell anybody. */
export function openSettings(onEdit) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Rack'));
  sh.appendChild(el('h2', null, 'Settings'));

  /* ---- you ---- */
  const you = section(sh, 'You');
  const youList = rowList(you);
  navRow(youList, 'Goal', goalPill(), () => { close(); openGoal(onEdit); });
  navRow(youList, 'Your details', null, () => { close(); openProfile(onEdit); });

  const openOn = el('div', 'field');
  openOn.style.marginTop = '14px';
  openOn.appendChild(el('label', null, 'Open the app on'));
  // The middle value is 'workout', not 'train'. The label is the tab's name but
  // the value is the view id the dock router switches on (#view-workout), and
  // restoreView() would hand 'train' straight to a section that isn't there.
  openOn.appendChild(segmented(
    [['you', 'You'], ['workout', 'Train'], ['last', 'Last one']],
    LS.get('openOn', 'you'),
    v => { LS.set('openOn', v); toast('Saved'); }));
  you.appendChild(openOn);
  you.appendChild(noteEl(
    '“Last one” reopens whichever tab you closed on. A workout you never ' +
    'finished outranks all three — coming back to a parked session and landing ' +
    'anywhere but Train is how sets get lost.'));

  /* ---- fuel ---- */
  const fuel = rowList(section(sh, 'Fuel'));
  navRow(fuel, 'Daily targets', targetPill(), () => { close(); openTargets(onEdit); });
  navRow(fuel, 'Water goal and sizes', waterPill(), () => { close(); openWaterSettings(latestLb(), onEdit); });
  navRow(fuel, 'AI estimator', aiPill(), () => { close(); openAiSettings(); });
  navRow(fuel, 'Food memory', null, () => { close(); openRecallList(); });
  navRow(fuel, 'Paste food JSON', null, () => { close(); openImportPaste(); });

  /* ---- train ---- */
  const train = section(sh, 'Train');
  const restRow = el('div', 'field');
  const lab = el('label', null, 'Default rest (seconds)');
  lab.setAttribute('for', 'restDef');
  restRow.appendChild(lab);
  const restIn = el('input');
  restIn.id = 'restDef'; restIn.type = 'number'; restIn.inputMode = 'numeric';
  restIn.value = LS.get('restDefault', 150);
  restIn.min = LIMITS.rest[0]; restIn.max = LIMITS.rest[1];
  restIn.onchange = e => {
    const r = clamp(parseInt(e.target.value) || 150, LIMITS.rest);
    e.target.value = r;
    LS.set('restDefault', r); toast('Rest updated');
  };
  restRow.appendChild(restIn);
  train.appendChild(restRow);

  const trainList = rowList(train);
  navRow(trainList, 'Exercise library', null, () => { close(); openExerciseManager(); });
  navRow(trainList, 'Import workout history', null, () => { close(); openImport(); });

  /* ---- steps ---- */
  const steps = rowList(section(sh, 'Steps'));
  navRow(steps, 'Step goal', stepPill(), () => { close(); openStepSettings(onEdit); });
  // Named for what it opens, not for the feature: this is the API appendix, and
  // the walkthrough that explains it lives one tap inside Step goal.
  navRow(steps, 'Step automation: the exact settings', null, () => { close(); openAutoDetails(); });

  /* ---- app ---- */
  const app = section(sh, 'App');
  const appList = rowList(app);
  navRow(appList, 'Add to Home Screen', null, () => { close(); openInstallGuide(); });
  navRow(appList, 'Replay the walkthrough', null, () => {
    close();
    if (typeof window.__rackTour === 'function') window.__rackTour();
    else toast('Reload the app and try again');
  });
  navRow(appList, 'Export my data', null, () => { close(); openExport(); });

  const out = el('button', 'btn btn-danger btn-block', 'Sign out');
  out.style.marginTop = '16px';
  out.onclick = () => {
    close();
    if (hasActiveSession()) {
      confirmSheet({
        title: 'Workout in progress',
        body: 'You have a live session. Signing out keeps it saved on this device, but you’ll need to sign back in to finish it.',
        confirmLabel: 'Sign out anyway',
        danger: true,
        onConfirm: () => logout()
      });
      return;
    }
    logout();
  };
  app.appendChild(out);

  /* Signing out leaves this device's cached copy of the account behind. It is
     namespaced by uid, so no other account can reach it through the app — but
     on a shared or borrowed phone "unreachable through the app" is not the
     same as gone, and this is the button that makes it gone. It also clears
     any queued offline writes, which is the reason it is not the default. */
  const wipe = el('button', 'linkish', 'Sign out and erase this device’s copy');
  wipe.style.cssText = 'display:block;width:100%;text-align:center;margin-top:10px';
  wipe.onclick = () => {
    close();
    confirmSheet({
      title: 'Erase this device’s copy?',
      body: 'Everything stays in your account and comes back when you sign in again. Anything logged while offline and not yet synced is lost.',
      confirmLabel: 'Erase and sign out',
      danger: true,
      onConfirm: async () => {
        const u = uid();
        await logout();
        purgeDevice(u);
        location.reload();
      }
    });
  };
  app.appendChild(wipe);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '18px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= PROFILE =================
   users/{uid}/profile is written once, by onboarding, and until now was never
   edited again — so this is the first code that has to cope with what is
   actually in there. Setup that was skipped writes { name, createdAt } and
   nothing else, so every other field needs a sensible default rather than an
   empty box.

   Two failure modes are worth the extra lines, because both are silent. A field
   that parses to NaN makes set() throw, write() catch it and queue it, and
   flushQueue() retry the same impossible payload on every reconnect forever
   with nothing on screen — so every number is range-checked before the write is
   built. And the merge names its keys instead of spreading the old object: the
   published rules end this node with "$other": { ".validate": false }, so one
   stray key left by an older version would fail the whole write the same way. */
function openProfile(onEdit) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'You'));
  sh.appendChild(el('h2', null, 'Your details'));
  sh.appendChild(noteEl(
    'Sex, height and birth year were used for the calorie estimate at setup. ' +
    'Nothing recalculates from them now — your targets come from your weigh-ins ' +
    'and what you log. Correct them here anyway; it stays in your account and ' +
    'nobody else can see it.'));

  const thisYear = new Date().getFullYear();

  const body = el('div');
  body.appendChild(noteEl('One moment…'));
  sh.appendChild(body);

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.disabled = true;
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);

  // The form is built from the answer rather than before it: segmented() takes
  // the selected value when it is constructed, so there is nothing to set later.
  //
  // readExact() rather than read(), because the two answers read() folds
  // together mean opposite things here. A read that failed must not be saved
  // over: the merge below would drop the email and the join date with nothing
  // on screen to say so. But a profile that genuinely isn't there is the normal
  // state of every account older than onboarding — the owner's is one — and
  // treating that as "hasn't loaded" left those accounts unable to set a name
  // at all. So the failure is shown, once, up front, and null builds the form
  // with defaults and creates the node on save.
  readExact('profile').then(base => {
    const p = base || {};
    let sex = (p.sex === 'f' || p.sex === 'x') ? p.sex : 'm';
    const heightIn = p.heightIn > 0 ? p.heightIn : 70;
    const birthYear = p.birthYear > 0 ? p.birthYear : thisYear - 25;

    body.innerHTML = '';

    // The photo is saved the moment it is picked rather than on Save, because
    // the picker already wrote it (pickProfilePhoto) — but Save rebuilds the
    // node from named keys, so it has to carry the current one forward or
    // typing a new name would silently drop the face.
    let photo = typeof p.photo === 'string' ? p.photo : null;
    const prow = el('div', 'photo-row');
    const pv = el('div', 'photo-pv');
    const paint = () => {
      pv.innerHTML = '';
      if (photo) { const img = el('img'); img.src = photo; img.alt = ''; pv.appendChild(img); }
      else pv.textContent = '–';
      rm.hidden = !photo;
    };
    const ch = el('button', 'btn btn-ghost', 'Choose photo');
    ch.onclick = () => pickProfilePhoto(url => { photo = url; paint(); if (onEdit) onEdit(); });
    const rm = el('button', 'btn btn-ghost', 'Remove');
    rm.onclick = async () => { await savePhoto(null); photo = null; paint(); if (onEdit) onEdit(); toast('Removed'); };
    const pbtns = el('div', 'photo-btns');
    pbtns.append(ch, rm);
    prow.append(pv, pbtns);
    body.appendChild(field('Photo', prow));
    paint();

    const nameIn = el('input');
    nameIn.type = 'text';
    nameIn.autocomplete = 'name';
    nameIn.maxLength = 60;
    nameIn.value = typeof p.name === 'string' ? p.name : '';
    body.appendChild(field('Name', nameIn));

    body.appendChild(field('Sex', segmented(
      [['m', 'Male'], ['f', 'Female'], ['x', 'Rather not']], sex, v => { sex = v; })));

    const hrow = el('div', 'row-split');
    const ft = numIn(Math.floor(heightIn / 12));
    const inch = numIn(Math.round(heightIn % 12));
    hrow.append(field('Height (ft)', ft), field('in', inch));
    body.appendChild(hrow);

    const yr = numIn(birthYear);
    body.appendChild(field('Birth year', yr));

    save.disabled = false;
    save.onclick = async () => {
      const name = nameIn.value.trim().slice(0, 60);
      const hIn  = (parseFloat(ft.value) || 0) * 12 + (parseFloat(inch.value) || 0);
      const year = parseInt(yr.value, 10);
      if (!name) { toast('What should the app call you?'); return; }
      if (!(hIn >= 36 && hIn <= 96)) { toast('That height doesn’t look right.'); return; }
      if (!(year >= 1920 && year <= thisYear - 12)) { toast('Check the birth year.'); return; }

      // Whole inches, the way onboarding writes it — the two decimals a typed
      // "5.5 ft" would produce mean nothing to any of the three formulas.
      const next = { name, sex, heightIn: Math.round(hIn), birthYear: year };
      // A profile created here for the first time gets the email onboarding
      // would have written, but no createdAt: the account is older than this
      // node, and stamping today would print "Member since" as the day the name
      // was typed. You's since-line already falls back to the onboarding stamp.
      const email = typeof p.email === 'string' ? p.email : currentEmail();
      if (email) next.email = email.slice(0, 120);
      if (Number.isFinite(p.createdAt)) next.createdAt = p.createdAt;
      if (photo) next.photo = photo;

      await write('profile', next);
      close();
      if (onEdit) onEdit();
      toast('Saved');
    };
  }).catch(() => {
    body.innerHTML = '';
    body.appendChild(noteEl('Couldn’t reach your account just now. Check the connection, close this and try again.'));
  });
}

/* ================= PROFILE PHOTO =================
   A face on the You tab. There is no file storage behind this app and there
   is not going to be one for a 52-pixel circle, so the picture is shrunk on
   the phone to a small square JPEG and kept as a data URL on the profile
   node — a few kilobytes, mirrored with the rest of the profile, so it
   paints on a cold start beside the name. The published rules cap the string
   (AGENTS.md, `profile.photo`), so the resize is not a nicety: a photo written
   at camera size fails validation and is silently never saved, which is the
   one failure this app has no way to show. The quality steps down and then
   the size does until it fits, so the write can only ever be one the rules
   accept.

   Drawn through an <img> rather than createImageBitmap because the browser
   applies the camera's orientation tag to an <img> and older Safari does not
   apply it to a bitmap — a portrait selfie would land on its side. */
const PHOTO_PX  = 144;
const PHOTO_MAX = 24000;

export function pickProfilePhoto(onDone) {
  const inp = el('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async () => {
    const file = inp.files && inp.files[0];
    inp.remove();
    if (!file) return;
    let url = null;
    try { url = await shrinkPhoto(file); } catch {}
    if (!url) { toast('Couldn’t read that picture.'); return; }
    await savePhoto(url);
    toast('Photo saved');
    if (onDone) onDone(url);
  };
  // Has to happen inside the tap that asked for it — a picker opened later,
  // after an await, is blocked as a popup on iOS.
  inp.click();
}

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('decode')); };
    img.onload = () => {
      URL.revokeObjectURL(src);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!(side > 0)) { reject(new Error('empty')); return; }
      const sx = (img.naturalWidth - side) / 2, sy = (img.naturalHeight - side) / 2;
      let px = PHOTO_PX;
      let out = null;
      while (px >= 64 && !out) {
        const cv = document.createElement('canvas');
        cv.width = px; cv.height = px;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, px, px);
        for (const q of [0.82, 0.7, 0.58, 0.46]) {
          const d = cv.toDataURL('image/jpeg', q);
          if (d.length <= PHOTO_MAX) { out = d; break; }
        }
        px = Math.round(px * 0.75);
      }
      resolve(out);
    };
    img.src = src;
  });
}

/* The same rebuild-by-name the editor above does, for the same reason: the
   node ends in "$other": false, so the write names every key it keeps. A
   null removes the photo. Reads with readExact so a failed read stops here
   instead of writing a profile with nothing but a picture in it. */
async function savePhoto(url) {
  let p = null;
  try { p = (await readExact('profile')) || {}; }
  catch { toast('Couldn’t reach your account just now.'); return; }
  const next = {};
  if (typeof p.name === 'string')  next.name  = p.name.slice(0, 60);
  if (typeof p.email === 'string') next.email = p.email.slice(0, 120);
  if (p.sex === 'm' || p.sex === 'f' || p.sex === 'x') next.sex = p.sex;
  if (Number.isFinite(p.heightIn))  next.heightIn  = p.heightIn;
  if (Number.isFinite(p.birthYear)) next.birthYear = p.birthYear;
  if (Number.isFinite(p.createdAt)) next.createdAt = p.createdAt;
  if (url) next.photo = url;
  await write('profile', next);
}

/* ================= GOAL =================
   Cutting, maintaining or bulking — the one word the rest of the app reads
   the goal back from. It has its own row in the hub because it was first
   put inside Your details and nobody found it there: a goal is the thing
   people come to settings to change, not a detail about them. food.js owns
   the arithmetic (goalId / previewGoal / setGoal); this sheet asks which
   word and shows, in numbers, what saving will do to the calorie target,
   so nothing moves that the person did not see coming. */
const GOAL_LABEL = { cut: 'Cutting', hold: 'Maintaining', gain: 'Bulking' };

function goalPill() {
  try { return GOAL_LABEL[goalId()] || null; } catch { return null; }
}

export function openGoal(onEdit) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'You'));
  sh.appendChild(el('h2', null, 'What are you doing right now?'));

  const goal0 = goalId();
  let goal = goal0;
  const wrap = el('div', 'ob-choices');
  const choices = [
    ['cut',  'Cutting',     'Lose fat, keep muscle — about a pound a week down'],
    ['hold', 'Maintaining', 'Hold your weight and eat at maintenance'],
    ['gain', 'Bulking',     'Build muscle — about half a pound a week up']
  ];
  const note = noteEl('');
  // The word can be right while the number is wrong: setup writes calories
  // off a formula, the measured maintenance comes in lower, and the target
  // ends up in the hold band under a goal that says cut. Saving with the
  // same word selected fixes that too, and the note says so.
  const misfit = goalFits(goal0) === false;
  const paint = () => {
    wrap.querySelectorAll('.ob-choice').forEach(b => b.classList.toggle('on', b.dataset.id === goal));
    if (goal === goal0 && !misfit) { note.textContent = 'Your current goal. Pick another and the calorie target moves to match.'; return; }
    const p = previewGoal(goal);
    if (goal === goal0) {
      note.textContent = 'Your goal is ' + GOAL_LABEL[goal].toLowerCase() + ', but your calorie target, ' + foodTargets().cal.toLocaleString() +
        ', sits ' + (goal === 'cut' ? 'at or above' : goal === 'gain' ? 'at or below' : 'away from') + ' your maintenance of ' + p.maint.toLocaleString() +
        '. Save to move it to ' + p.cal.toLocaleString() + ' a day.';
      return;
    }
    note.textContent = p.maint
      ? (p.changed ? 'Calories will move to ' + p.cal.toLocaleString() + ' a day — maintenance ' + p.maint.toLocaleString() +
                     (p.rate ? (p.rate < 0 ? ' minus ' : ' plus ') + Math.abs(p.rate * 500).toLocaleString() : '') + '. Protein and fat stay where they are.'
                   : 'Your calorie target already fits that goal, so it stays at ' + p.cal.toLocaleString() + '.')
      : 'Calories stay where they are until Rack knows your maintenance — a week of food and weigh-ins, or a number under Daily targets.';
  };
  choices.forEach(([id, label, sub]) => {
    const b = el('button', 'ob-choice');
    b.dataset.id = id;
    b.appendChild(el('div', 'ob-choice-t', label));
    b.appendChild(el('div', 'ob-choice-d', sub));
    b.onclick = () => { goal = id; paint(); };
    wrap.appendChild(b);
  });
  sh.appendChild(wrap);
  sh.appendChild(note);
  paint();

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    if (goal !== goal0 || misfit) {
      const cal = await setGoal(goal);
      toast(GOAL_LABEL[goal] + (cal > 0 ? ' — ' + cal.toLocaleString() + ' kcal a day' : ''));
    }
    close();
    if (onEdit) onEdit();
  };
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= EXPORT =================
   Two ways in — the workout importer and pasted JSON — and until now no way
   out. Everything the account holds as one JSON file, and each log as a CSV a
   spreadsheet opens. Read fresh from the database rather than from the tabs'
   memory: the tabs hold the day and the month on screen, not the history. */
const EXPORT_NODES = [
  'profile', 'onboarding', 'food/targets', 'food/items', 'food/meals', 'food/log', 'food/daySummaries',
  'weight/entries', 'workouts', 'history', 'water/log', 'steps', 'routines', 'exercises', 'settings'
];

export async function readAllForExport() {
  const vals = await Promise.all(EXPORT_NODES.map(p => read(p, null)));
  const out = {};
  EXPORT_NODES.forEach((p, i) => {
    const parts = p.split('/');
    let n = out;
    for (let j = 0; j < parts.length - 1; j++) n = n[parts[j]] = n[parts[j]] || {};
    n[parts[parts.length - 1]] = vals[i];
  });
  return out;
}

const pad2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const hm  = t => (Number.isFinite(t) ? pad2(new Date(t).getHours()) + ':' + pad2(new Date(t).getMinutes()) : '');

// RFC 4180: quote a cell that holds a comma, a quote or a line break, and
// double the quotes inside it. CRLF line ends, which is what Excel expects.
function csv(rows) {
  const cell = v => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function buildExport(data) {
  const food = [['date', 'time', 'meal', 'name', 'qty', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'source']];
  const log = (data.food && data.food.log) || {};
  Object.keys(log).sort().forEach(d => Object.values(log[d] || {})
    .filter(e => e && e.name).sort((a, b) => (a.t || 0) - (b.t || 0))
    .forEach(e => food.push([d, hm(e.t), e.meal, e.name, e.qty, e.cal, e.p, e.c, e.f, e.src])));

  const weight = [['date', 'time', 'lb']];
  Object.values((data.weight && data.weight.entries) || {})
    .filter(e => e && e.lb > 0).sort((a, b) => (a.t || 0) - (b.t || 0))
    .forEach(e => weight.push([ymd(e.t), hm(e.t), e.lb]));

  const workouts = [['date', 'session', 'exercise', 'group', 'set', 'type', 'lb', 'reps']];
  const tree = data.workouts || {};
  Object.keys(tree).sort().forEach(mk => Object.keys(tree[mk] || {}).sort().forEach(dd =>
    Object.values(tree[mk][dd] || {}).forEach(s => (s && s.exercises || []).forEach(ex =>
      (ex.sets || []).forEach((st, i) => workouts.push([mk + '-' + dd, s.name, ex.name, ex.group, i + 1, st.type || 'N', st.w, st.r]))))));

  const water = [['date', 'time', 'ml', 'source']];
  const wl = (data.water && data.water.log) || {};
  Object.keys(wl).sort().forEach(d => Object.values(wl[d] || {})
    .filter(e => e && e.ml > 0).sort((a, b) => (a.t || 0) - (b.t || 0))
    .forEach(e => water.push([d, hm(e.t), e.ml, e.src])));

  const steps = [['date', 'steps', 'mi', 'source']];
  Object.keys(data.steps || {}).sort().forEach(d => { const s = data.steps[d]; if (s && s.steps > 0) steps.push([d, s.steps, s.mi, s.src]); });

  return {
    json: JSON.stringify({ app: 'Rack', exportedAt: new Date().toISOString(), ...data }, null, 2),
    csv: { food: csv(food), weight: csv(weight), workouts: csv(workouts), water: csv(water), steps: csv(steps) }
  };
}

export function openExport() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'App'));
  sh.appendChild(el('h2', null, 'Export my data'));
  sh.appendChild(noteEl('Everything in your account as one JSON file, or each log as a spreadsheet. On a phone the share sheet opens so it can go to Files, Mail or a computer. Nothing leaves the device unless you send it.'));

  const list = el('div', 'set-list');
  sh.appendChild(list);
  const stamp = ymd(Date.now());
  let built = null;
  const data = async () => built || (built = buildExport(await readAllForExport()));
  const row = (label, sub, name, mime, pick) => {
    const b = el('button', 'set-row-nav');
    b.appendChild(el('span', 'set-row-l', label));
    b.appendChild(el('span', 'set-row-v', sub));
    b.appendChild(el('span', 'set-row-x', '›'));
    b.onclick = async () => {
      b.disabled = true;
      try { const d = await data(); await saveText(name, pick(d), mime); }
      catch { toast('Couldn’t read your data just now'); }
      b.disabled = false;
    };
    list.appendChild(b);
  };
  row('Everything',  'JSON', 'rack-' + stamp + '.json',          'application/json', d => d.json);
  row('Food log',    'CSV',  'rack-food-' + stamp + '.csv',      'text/csv',         d => d.csv.food);
  row('Weigh-ins',   'CSV',  'rack-weight-' + stamp + '.csv',    'text/csv',         d => d.csv.weight);
  row('Workouts',    'CSV',  'rack-workouts-' + stamp + '.csv',  'text/csv',         d => d.csv.workouts);
  row('Water',       'CSV',  'rack-water-' + stamp + '.csv',     'text/csv',         d => d.csv.water);
  row('Steps',       'CSV',  'rack-steps-' + stamp + '.csv',     'text/csv',         d => d.csv.steps);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '16px';
  done.onclick = close;
  sh.appendChild(done);
}

/* The goal weight lives in Daily targets. You needs a way there that does
   not import food.js, and this is it. */
export function openDailyTargets(onEdit) { openTargets(onEdit); }
