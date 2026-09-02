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

import { el, sheet, toast, noteEl, confirmSheet, segmented } from './ui.js';
import { LS, uid, readExact, currentEmail, write, purgeDevice, logout } from './store.js';
import { openTargets, openAiSettings, openRecallList, openImportPaste,
         foodTargets, latestLb } from './food.js';
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
  navRow(rowList(you), 'Your details', null, () => { close(); openProfile(onEdit); });

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
  navRow(fuel, 'Daily targets', targetPill(), () => { close(); openTargets(); });
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
  restIn.onchange = e => { LS.set('restDefault', parseInt(e.target.value) || 150); toast('Rest updated'); };
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
