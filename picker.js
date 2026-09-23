// The exercise library and the sheets that pick from and manage it.
//
// This was inside workout.js. Routines need the same picker, and having
// routines.js import workout.js while workout.js imports routines.js is the
// cycle the README's import graph forbids. So the shared half moved down here
// and both import it. Nothing imports back.
//
//   exercises/custom    -> [ { id, name, group, equipment }, … ]
//   exercises/overrides -> { exId: { name, group, equipment } }
//   exercises/hidden    -> [ exId, … ]
//
// The last two are what make the 231 built-ins editable without editing code.
// An override changes what a built-in is called and where it is filed; hiding
// takes it out of the picker. Neither touches the id, which is the whole
// point — `history/{exId}` and every set you have ever logged are keyed on it,
// so renaming "Barbell Bench Press" to "Comp Bench" keeps the last-time line
// and the personal records intact. Deleting a built-in outright would not.

import { GROUPS, GROUP_ORDER, EXERCISES, EQUIPMENT, makeCustomExercise } from './exercises.js';
import { read, write } from './store.js';
// One way, like everything else this file imports: analytics.js reads the
// training log and knows nothing about the picker, so there is still no cycle.
import { allSessions, mergeSessionExercises } from './analytics.js';
import { bump } from './usage.js';
import { el, sheet, toast, noteEl, confirmSheet } from './ui.js';

let customEx  = [];
let overrides = {};
let hidden    = [];
// The cold-start stand-in for the Frequent chip, and the only thing that reads
// it. It is handed in by workout.js, which reads the same node a line earlier
// for the "last time" lines — this file cannot import that one back, and a
// second GET of the whole index on every launch is a real cost paid by everyone
// who never opens the picker. It goes stale after a finished session, and that
// costs nothing: the real counts come off the log and answer over the top of it.
let history   = {};
// Whether the three nodes above have been read at all. Before they have, the
// library is the built-ins alone and a custom exercise looks exactly like a
// deleted one — which is fine for a picker nobody has opened yet and is not
// fine for Coach's workout builder, which drops a deleted exercise and says so.
let loaded    = false;

export async function initPicker(seedHistory) {
  customEx  = (await read('exercises/custom',    null)) || [];
  overrides = (await read('exercises/overrides', null)) || {};
  hidden    = (await read('exercises/hidden',    null)) || [];
  history   = seedHistory || {};
  loaded    = true;
}

/* The two things coach-data.js asks of the library beyond allExercises(): what
   is hidden, because a hidden exercise is never proposed and is named when it
   is left out, and whether any of this has been read yet. Copies, so no caller
   can edit the picker's own list. */
export function hiddenIds()    { return hidden.slice(); }
export function libraryReady() { return loaded; }

function applyOverride(x) {
  const o = overrides[x.id];
  return o ? { ...x, ...o } : x;
}

/* Everything pickable: built-ins and customs, renamed where you renamed them,
   minus anything hidden. */
export function allExercises() {
  return [...EXERCISES, ...customEx]
    .filter(x => !hidden.includes(x.id))
    .map(applyOverride);
}

/* Everything at all, hidden included — the manager needs to see what it can
   put back. */
function everyExercise() {
  return [...EXERCISES, ...customEx].map(applyOverride);
}

function isHidden(id) { return hidden.includes(id); }
function isCustom(id) { return customEx.some(x => x.id === id); }

async function addCustom(x) {
  customEx.push(x);
  await write('exercises/custom', customEx);
}

/* ---------- Frequent ----------
   Ordering is by how many SESSIONS an exercise has been logged in — not sets,
   not occurrences — descending, all time.

   The source is the whole log, never `history/{exId}`: history keeps 20 rows
   per exercise, so the lifts this chip exists to put at the top would all
   saturate at 20 and tie with one another at exactly the place the ordering
   matters. Only the log can tell 43 sessions of bench from 40 of deadlift.

   Distinct sessions is the other half of it. A duplicated lifting block puts
   the same exId in one session several times, and counting occurrences would
   let the block feature inflate its own ordering. `mergeSessionExercises` is
   where that invariant lives — one logical entry per exId per session — so
   this counts merged entries rather than dedupe a second time here and risk
   the two drifting apart the way finishWorkout and rebuildHistoryFromLog did.

   Everything below is pure and takes its data as arguments, because the native
   picker has to order the list identically and copies these rather than being
   written a second time from the same description. */

export function sessionCounts(sessions) {
  const n = {};
  (sessions || []).forEach(s => {
    mergeSessionExercises(s && s.exercises).forEach(ex => {
      if (!ex.exId) return;
      n[ex.exId] = (n[ex.exId] || 0) + 1;
    });
  });
  return n;
}

/* The stand-in, capped at 20 per exercise and knowingly wrong at the top of the
   list — it only has to fill the first frame. RTDB hands an array back as an
   object once its keys stop being contiguous from 0, so the length is taken
   either way. */
export function historyCounts(history) {
  const n = {};
  Object.keys(history || {}).forEach(exId => {
    const rows = history[exId];
    n[exId] = Array.isArray(rows) ? rows.length : Object.keys(rows || {}).length;
  });
  return n;
}

/* Everything ever logged, most sessions first. No cap: the list is scrollable
   and searchable already. Ties break on name so two clients reading the same
   log show the same order, rather than whatever order the counts enumerated.

   `keep` is the ids that stay in the list at a count of zero — what is selected
   right now, which is how an exercise created from the New button is visible on
   the chip it was created from. Without it the one flow that exists BECAUSE the
   exercise has never been logged is the one flow whose result the default chip
   hides. They sort to the bottom, among themselves by name. */
export function frequentOrder(exercises, counts, keep) {
  const also = new Set(keep || []);
  return (exercises || [])
    .filter(x => (counts[x.id] || 0) > 0 || also.has(x.id))
    .sort((a, b) => ((counts[b.id] || 0) - (counts[a.id] || 0)) || a.name.localeCompare(b.name));
}

/* Frequent is the default chip, except on an account with nothing logged,
   where it would open on an empty screen — All takes the default there. Asked
   once with the stand-in counts when the picker opens, and again when the real
   ones land. */
export function frequentDefault(exercises, counts) {
  return frequentOrder(exercises, counts).length ? 'freq' : 'all';
}

/* The picker's chip row. Frequent leads because it is the default, the muscle
   groups keep the order they have always had between them, and All moves to
   the end. (The exercise manager's row is a different job and is untouched.) */
export const PICKER_FILTERS = [
  { id: 'freq', label: 'Frequent' },
  ...GROUP_ORDER.map(g => ({ id: g, label: GROUPS[g].label })),
  { id: 'all', label: 'All' }
];

/* "Frequent" is all that fits on a chip beside the muscle groups. The full
   phrase goes in the copy that has room for it. There is no second note for a
   search that finds nothing here: a search on this chip falls through to the
   whole library instead of explaining itself. */
export function frequentEmptyNote() {
  return 'Frequently performed fills in as you log workouts. Tap All to pick from the whole library.';
}

/* ================= PICKER ================= */
// Multi-select. Hands back [{ id, name, group, equipment }, …].
export function openPicker(onPick) {
  const { sh, close } = sheet();

  const selected = [];
  let counts  = historyCounts(history);
  let filter  = frequentDefault(allExercises(), counts), q = '';
  let touched = false;   // a chip has been tapped; stop choosing one for them
  let shown   = '';      // the chip and row order currently drawn
  // Ids that stay on the Frequent list at a count of zero. Once picked, never
  // unpicked: untick an exercise you have just created and the row vanishing
  // out from under the finger reads as the app losing it.
  const kept  = new Set();

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.placeholder = 'Search exercises';
  inp.type = 'search';
  search.appendChild(inp);

  const chips = el('div', 'filter-row');
  const mkChip = (id, label) => {
    const c = el('button', 'chip' + (filter === id ? ' on' : ''), label);
    c.onclick = () => { filter = id; touched = true; paint(); };
    return c;
  };
  search.appendChild(chips);
  sh.appendChild(search);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  const foot = el('div', 'picker-foot');
  const custom = el('button', 'btn btn-ghost', 'New');
  custom.onclick = () => openCustomExercise(async x => {
    await addCustom(x);
    selected.push(x);
    // Nothing made from in here has ever been logged, so on the default chip it
    // would be filtered straight back out — and this is the one flow somebody
    // takes BECAUSE the exercise is not in their history.
    kept.add(x.id);
    paint();
  });
  const addBtn = el('button', 'btn btn-primary', 'Add');
  addBtn.style.flex = '1';
  addBtn.onclick = () => { if (selected.length) { close(); onPick(selected); } };
  const closeBtn = el('button', 'btn btn-ghost', 'Cancel');
  closeBtn.onclick = () => close();
  foot.append(closeBtn, custom, addBtn);
  sh.appendChild(foot);

  /* What the list holds right now, separately from drawing it — the background
     read below needs to know whether the order it would paint is the order
     already on screen. */
  function poolFor() {
    const byName = (a, b) => a.name.localeCompare(b.name);
    const matches = allExercises()
      .filter(x => !q || x.name.toLowerCase().includes(q));
    if (filter !== 'freq') {
      return matches.filter(x => filter === 'all' || x.group === filter).sort(byName);
    }
    const freq = frequentOrder(matches, counts, kept);
    // A search that finds nothing in Frequent falls through to the whole
    // library rather than dead-ending on a note. This chip is a default nobody
    // chose, looking up an exercise you have never done is exactly why the
    // sheet gets opened mid-workout, and All is the last of eight chips and off
    // the end of the row on a phone. Un-searched the note stands, because
    // falling through there would only be All under another name.
    return (q && !freq.length) ? matches.slice().sort(byName) : freq;
  }

  function paint() {
    chips.innerHTML = '';
    PICKER_FILTERS.forEach(f => chips.appendChild(mkChip(f.id, f.label)));

    list.innerHTML = '';
    const pool = poolFor();
    shown = filter + '|' + pool.map(x => x.id).join(',');

    if (filter === 'freq' && !q && !pool.length) list.appendChild(noteEl(frequentEmptyNote()));

    pool.slice(0, 260).forEach(x => {
      const on = selected.some(s => s.id === x.id);
      const b = el('button', 'ex-item' + (on ? ' sel' : ''));
      const dot = el('i', 'dot'); dot.style.background = GROUPS[x.group].color;
      b.appendChild(dot);
      b.appendChild(el('span', 'nm', x.name));
      b.appendChild(el('span', 'eq', x.equipment));
      b.onclick = () => {
        const i = selected.findIndex(s => s.id === x.id);
        if (i >= 0) selected.splice(i, 1); else { selected.push(x); kept.add(x.id); }
        paint();
      };
      list.appendChild(b);
    });

    addBtn.textContent = selected.length ? `Add ${selected.length}` : 'Add';
    addBtn.disabled = !selected.length;
  }

  inp.oninput = e => { q = e.target.value.toLowerCase().trim(); paint(); };
  paint();

  /* Warmed behind the picker rather than awaited. This sheet opens mid workout
     and must not sit behind a spinner while the whole log is read; until the
     real counts land the capped history orders the list, which is close enough
     for one frame. Usually there is no wait at all — the You tab reads the
     whole log at every boot and analytics caches it — but a finished session
     invalidates that cache, so the one moment this really does go to the
     network is the picker opened during the next workout. */
  allSessions().then(sessions => {
    // An unreadable log is indistinguishable from an empty one here:
    // allSessions() resolves [] rather than rejecting when the read falls back,
    // so adopting it would replace a populated stand-in with nothing and tell
    // an account with 219 sessions that Frequent fills in as it logs workouts.
    // An account that really has logged nothing loses nothing by keeping the
    // stand-in, because the stand-in is empty too.
    if (!sessions.length) return;
    counts = sessionCounts(sessions);
    if (!touched) filter = frequentDefault(allExercises(), counts);
    // Only when it changes what is on screen. On a cold read this lands with
    // the sheet open and a finger already moving, and rebuilding the rows under
    // a tap hands that tap to whichever exercise the re-sort put there.
    if (filter + '|' + poolFor().map(x => x.id).join(',') !== shown) paint();
  }).catch(() => {});
}

/* ================= MANAGER =================
   The picker's job is to get an exercise into today's workout, so it does not
   want edit buttons on every row. This is the other job: the library itself —
   what is in it, what it is called, and what has no business being there.
   Nothing about how much you lift; that is what Statistics is for. */
export function openExerciseManager(onChange) {
  const { sh, close } = sheet(onChange);

  let filter = 'all', q = '';

  sh.appendChild(el('div', 'eyebrow', 'Train'));
  sh.appendChild(el('h2', null, 'Exercises'));

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.type = 'search';
  inp.placeholder = 'Search the library';
  search.appendChild(inp);

  const chips = el('div', 'filter-row');
  search.appendChild(chips);
  sh.appendChild(search);

  const count = el('div', 'note');
  sh.appendChild(count);

  const list = el('div', 'ex-list');
  sh.appendChild(list);

  const reopen = () => { close(); openExerciseManager(onChange); };

  function mkChip(id, label) {
    const c = el('button', 'chip' + (filter === id ? ' on' : ''), label);
    c.onclick = () => { filter = id; paint(); };
    return c;
  }

  function paint() {
    chips.innerHTML = '';
    chips.appendChild(mkChip('all', 'All'));
    chips.appendChild(mkChip('mine', 'Mine'));
    chips.appendChild(mkChip('hidden', 'Hidden'));
    GROUP_ORDER.forEach(g => chips.appendChild(mkChip(g, GROUPS[g].label)));

    const pool = everyExercise()
      .filter(x => {
        if (filter === 'mine')   return isCustom(x.id);
        if (filter === 'hidden') return isHidden(x.id);
        return !isHidden(x.id) && (filter === 'all' || x.group === filter);
      })
      .filter(x => !q || x.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    count.textContent = allExercises().length + ' in the picker · ' +
      customEx.length + ' yours · ' + hidden.length + ' hidden';

    list.innerHTML = '';
    if (!pool.length) {
      list.appendChild(noteEl(
        filter === 'hidden' ? 'Nothing hidden. Exercises you hide sit here until you put them back.'
        : filter === 'mine' ? 'You haven’t added any of your own yet.'
        : 'Nothing matches that.'));
      return;
    }

    pool.slice(0, 300).forEach(x => {
      const b = el('button', 'ex-item' + (isHidden(x.id) ? ' ex-off' : ''));
      const dot = el('i', 'dot');
      dot.style.background = (GROUPS[x.group] || {}).color || 'var(--dim)';
      b.appendChild(dot);

      const nm = el('span', 'nm', x.name);
      b.appendChild(nm);

      const tags = [];
      if (isCustom(x.id))    tags.push('yours');
      if (overrides[x.id])   tags.push('edited');
      if (isHidden(x.id))    tags.push('hidden');
      b.appendChild(el('span', 'eq', tags.length ? tags.join(' · ') : x.equipment));
      b.appendChild(el('span', 'eq ex-go', '›'));

      b.onclick = () => { close(); openExerciseEdit(x.id, reopen); };
      list.appendChild(b);
    });
  }

  inp.oninput = e => { q = e.target.value.toLowerCase().trim(); paint(); };
  paint();

  const add = el('button', 'btn btn-primary btn-block btn-lg', '+  New exercise');
  add.style.marginTop = '12px';
  add.onclick = () => openCustomExercise(async x => {
    await addCustom(x);
    reopen();
  });
  sh.appendChild(add);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ---------- one exercise ---------- */
function openExerciseEdit(id, onDone) {
  const x = everyExercise().find(e => e.id === id);
  if (!x) { toast('That exercise is gone'); return; }

  const mine = isCustom(id);
  const off  = isHidden(id);

  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', mine ? 'Your exercise' : 'Built in'));
  sh.appendChild(el('h2', null, x.name));

  const nameWrap = el('div', 'field');
  nameWrap.style.marginTop = '10px';
  nameWrap.appendChild(el('label', null, 'Name'));
  const nameIn = el('input');
  nameIn.type = 'text';
  nameIn.autocapitalize = 'words';
  nameIn.value = x.name;
  nameWrap.appendChild(nameIn);
  sh.appendChild(nameWrap);

  let group = x.group;
  sh.appendChild(el('div', 'field-lbl', 'Muscle group'));
  const gRow = el('div', 'filter-row');
  GROUP_ORDER.forEach(g => {
    const c = el('button', 'chip' + (g === group ? ' on' : ''), GROUPS[g].label);
    c.onclick = () => {
      group = g;
      gRow.querySelectorAll('.chip').forEach(n => n.classList.remove('on'));
      c.classList.add('on');
    };
    gRow.appendChild(c);
  });
  sh.appendChild(gRow);

  let equipment = x.equipment;
  sh.appendChild(el('div', 'field-lbl', 'Equipment'));
  const eRow = el('div', 'filter-row');
  EQUIPMENT.forEach(q => {
    const c = el('button', 'chip' + (q === equipment ? ' on' : ''), q.charAt(0).toUpperCase() + q.slice(1));
    c.onclick = () => {
      equipment = q;
      eRow.querySelectorAll('.chip').forEach(n => n.classList.remove('on'));
      c.classList.add('on');
    };
    eRow.appendChild(c);
  });
  sh.appendChild(eRow);

  sh.appendChild(noteEl(mine
    ? 'The name and group show up on every future session. Workouts you have already logged keep the name they were logged with.'
    : 'Renaming a built-in keeps its history — every set you have ever logged under it stays attached.'));

  const save = el('button', 'btn btn-primary btn-block btn-lg', 'Save changes');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const name = nameIn.value.trim();
    if (!name) { toast('Give it a name'); nameIn.focus(); return; }

    const clash = everyExercise().find(e => e.id !== id && e.name.toLowerCase() === name.toLowerCase());
    if (clash) { toast('“' + clash.name + '” already exists'); return; }

    if (mine) {
      const row = customEx.find(e => e.id === id);
      Object.assign(row, { name, group, equipment });
      await write('exercises/custom', customEx);
    } else {
      const base = EXERCISES.find(e => e.id === id);
      // Store an override only where it actually differs, so a built-in edited
      // back to its original stops being flagged as edited.
      if (base && base.name === name && base.group === group && base.equipment === equipment) {
        delete overrides[id];
      } else {
        overrides[id] = { name, group, equipment };
      }
      await write('exercises/overrides', overrides);
    }
    close();
    toast('Saved');
    if (onDone) onDone();
  };
  sh.appendChild(save);

  /* Hiding is the honest version of deleting a built-in: the id has to stay
     resolvable or every past session that used it loses its history. */
  const hide = el('button', 'btn btn-ghost btn-block', off ? 'Put it back in the picker' : 'Hide from the picker');
  hide.style.marginTop = '8px';
  hide.onclick = async () => {
    hidden = off ? hidden.filter(h => h !== id) : [...hidden, id];
    await write('exercises/hidden', hidden);
    close();
    toast(off ? 'Back in the picker' : 'Hidden');
    if (onDone) onDone();
  };
  sh.appendChild(hide);

  if (mine) {
    const del = el('button', 'btn btn-danger btn-block', 'Delete exercise');
    del.style.marginTop = '8px';
    del.onclick = () => confirmSheet({
      title: 'Delete this exercise?',
      body: '“' + x.name + '” leaves your library for good. Workouts you already did with it keep their sets and their numbers.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const wasHidden   = hidden.includes(id);
        const hadOverride = Object.prototype.hasOwnProperty.call(overrides, id);
        customEx = customEx.filter(e => e.id !== id);
        hidden = hidden.filter(h => h !== id);
        delete overrides[id];
        await write('exercises/custom', customEx);
        /* The other two nodes were only ever being narrowed in memory, which
           left this device holding one id fewer than the server for the rest of
           the session — and the next perfectly ordinary hide or rename then
           looks like a write that drops two things at once. Write what was
           actually changed. */
        if (wasHidden)   await write('exercises/hidden', hidden);
        if (hadOverride) await write('exercises/overrides', overrides);
        close();
        toast('Deleted');
        if (onDone) onDone();
      }
    });
    sh.appendChild(del);
  }

  const back = el('button', 'btn btn-ghost btn-block', 'Cancel');
  back.style.marginTop = '8px';
  back.onclick = close;
  sh.appendChild(back);
}

/* ---------- custom exercise ---------- */
// Replaces the old three-prompt() flow. Group and equipment are now chips, so
// there is nothing to spell and nothing to get the capitalisation wrong on.
export function openCustomExercise(onCreate) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'New exercise'));
  sh.appendChild(noteEl('It gets saved to your library and stays available for future workouts.'));

  const nameWrap = el('div', 'field');
  nameWrap.style.marginTop = '14px';
  nameWrap.appendChild(el('label', null, 'Name'));
  const nameIn = el('input');
  nameIn.type = 'text';
  nameIn.placeholder = 'e.g. the leg press by the window';
  nameIn.autocapitalize = 'words';
  nameWrap.appendChild(nameIn);
  sh.appendChild(nameWrap);

  let group = 'chest';
  sh.appendChild(el('div', 'field-lbl', 'Muscle group'));
  const gRow = el('div', 'filter-row');
  GROUP_ORDER.forEach(g => {
    const c = el('button', 'chip' + (g === group ? ' on' : ''), GROUPS[g].label);
    c.onclick = () => {
      group = g;
      gRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
    };
    gRow.appendChild(c);
  });
  sh.appendChild(gRow);

  let equipment = 'barbell';
  sh.appendChild(el('div', 'field-lbl', 'Equipment'));
  const eRow = el('div', 'filter-row');
  EQUIPMENT.forEach(q => {
    const label = q.charAt(0).toUpperCase() + q.slice(1);
    const c = el('button', 'chip' + (q === equipment ? ' on' : ''), label);
    c.onclick = () => {
      equipment = q;
      eRow.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
    };
    eRow.appendChild(c);
  });
  sh.appendChild(eRow);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Create');
  go.style.marginTop = '16px';
  go.onclick = () => {
    const name = nameIn.value.trim();
    if (!name) { toast('Give it a name'); nameIn.focus(); return; }
    const dupe = everyExercise().find(x => x.name.toLowerCase() === name.toLowerCase());
    if (dupe) { toast('“' + dupe.name + '” already exists'); return; }
    close();
    bump('exerciseCustom');
    onCreate(makeCustomExercise(name, group, equipment));
    toast('Added ' + name);
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);

  setTimeout(() => nameIn.focus(), 80);
}
