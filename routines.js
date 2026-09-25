// Pre-planned workout routines.
//
//   users/{uid}/routines/{routineId} -> one routine
//
// `exercises` is exactly the live-session shape minus `done`, which is the
// whole trick: startWorkout(routine) already spreads `preset.exercises`, so
// starting a routine translates nothing. Target weights and reps ride along as
// `tw` / `tr` and show up as placeholders in the session — visible as a plan,
// never pre-filled as a lie about what you lifted.
//
// Lifting blocks are the same annotation here as in a session, drawn by the
// same pure functions out of blocks.js — so a block built on the workout screen
// and saved as a routine opens as a block, and one built here starts as one.
// The block ORDER is transient: the editor holds it in memory while the sheet
// is open and strips it on save, because the annotations already carry the
// fact and a stored `blocks` array would be a second source of truth for it.
//
// Imports picker.js, never workout.js. workout.js passes its startWorkout in
// as a callback, so the dependency only ever points one way.

import { read, write, watch, wu } from './store.js';
import { GROUPS, GROUP_ORDER } from './exercises.js';
import {
  blockOrder, sessionBlocks, normalizeBlocks, addBlock, addToBlock,
  duplicateBlock, deleteBlock, sessionLayout
} from './blocks.js';
import { openPicker } from './picker.js';
// v55: a drop set's grouping — the rule, and the two edits the editor makes.
import { retypeSet, removeSet } from './analytics.js';
import { bump } from './usage.js';
import { el, sheet, toast, noteEl, confirmSheet, swipeToDelete, fmtDate, setNum, LIMITS } from './ui.js';
import { wIn, fmtSetW, unitW, limW } from './units.js';

let routines = {};
// Handed in by workout.js, the way openRoutines is handed startWorkout, so this
// file imports nothing of Coach's. See tell().
let onChanged = null;

export async function initRoutines(onChange) {
  onChanged = typeof onChange === 'function' ? onChange : null;
  routines = (await read('routines', null)) || {};
  // Written whole, so a stale copy in memory would drop a routine added on
  // another device the next time this one saved.
  watch('routines', val => { routines = val || {}; tell(); });
}

/* Coach names a session shape by his own routine for it, and it reads
   `routines` once per app open — so a routine saved from the builder was not
   "his routine for this" until the next launch. Every change to the list is
   handed on from here instead: after one of this file's own writes, which
   offline never reaches the watch, and whenever the watch delivers one from
   anywhere else. It is the list this file already holds, so nothing is read to
   do it, and a write the database refused hands nothing on. */
function tell() {
  if (!onChanged) return;
  try { onChanged(routines); } catch {}
}

function persist() { return write('routines', routines).then(v => { tell(); return v; }); }

function sorted() {
  return Object.values(routines)
    .filter(r => r && r.id)
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0) ||
                    (a.name || '').localeCompare(b.name || ''));
}

export function routineCount() { return sorted().length; }

// Derived, never stored — a stored copy is a stored copy that goes stale.
function groupsOf(r) {
  const seen = [];
  (r.exercises || []).forEach(ex => { if (ex.group && !seen.includes(ex.group)) seen.push(ex.group); });
  return seen.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
}

function setCount(r) {
  return (r.exercises || []).reduce((s, ex) => s + (ex.sets || []).length, 0);
}

// One shape for a new exercise, so one added inside a block is the same object
// as one added outside it and the annotation is the only difference. The same
// idea as workout.js's newExercise, with a routine's sets: targets, never
// values.
function newExercise(x) {
  return {
    exId: x.id, name: x.name, group: x.group, equipment: x.equipment,
    sets: [{ tw: '', tr: '', type: 'N' }]
  };
}

// The save step, and the single source of truth in one function. Renumber the
// annotations 1..k in the order they are read on screen, then throw the
// transient order away: what is stored is the per-exercise `block` and nothing
// else. Returns a new object rather than editing the draft, so there is no
// window in which the thing about to be written still carries the array.
function forStorage(draft) {
  const laid = normalizeBlocks(draft.exercises, sessionBlocks(draft));
  const { blocks, ...rest } = draft;
  return { ...rest, exercises: laid.exercises };
}

function blankRoutine() {
  return {
    id: 'r' + Date.now().toString(36),
    name: '', note: '', exercises: [],
    created: Date.now(), lastUsed: 0, uses: 0
  };
}

/* ================= LIST ================= */
export function openRoutines(onStart) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Train'));
  sh.appendChild(el('h2', null, 'Routines'));

  const list = sorted();
  if (!list.length) {
    const es = el('div', 'empty-state');
    es.appendChild(el('h3', null, 'No routines yet'));
    es.appendChild(el('p', null,
      'Build one here, or finish a workout and save that as a routine — which is usually faster, because it captures what you actually did.'));
    sh.appendChild(es);
  }

  const box = el('div', 'rt-list');
  list.forEach(r => {
    const row = el('button', 'rt-item');

    const dots = el('div', 'rt-dots');
    groupsOf(r).forEach(g => {
      const d = el('i');
      d.style.background = (GROUPS[g] || {}).color || 'var(--dim)';
      dots.appendChild(d);
    });

    const mid = el('div', 'rt-mid');
    mid.appendChild(el('div', 'rt-name', r.name || 'Untitled routine'));
    const n = (r.exercises || []).length;
    mid.appendChild(el('div', 'rt-meta',
      n + (n === 1 ? ' exercise' : ' exercises') + ' · ' + setCount(r) + ' sets' +
      (r.lastUsed ? '  ·  last ' + fmtDate(new Date(r.lastUsed).toISOString().slice(0, 10)) : '')));

    row.append(dots, mid);
    row.appendChild(el('span', 'rt-go', '›'));
    row.onclick = () => { close(); openRoutine(r.id, onStart); };
    box.appendChild(row);
  });
  sh.appendChild(box);

  const add = el('button', 'btn btn-primary btn-block', '+  New routine');
  add.style.marginTop = '12px';
  add.onclick = () => { close(); openEditor(blankRoutine(), true, onStart); };
  sh.appendChild(add);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= ONE ROUTINE ================= */
function openRoutine(id, onStart) {
  const r = routines[id];
  if (!r) { toast('That routine is gone'); return; }
  const { sh, close } = sheet();

  sh.appendChild(el('div', 'eyebrow', 'Routine'));
  sh.appendChild(el('h2', null, r.name || 'Untitled routine'));
  if (r.note) sh.appendChild(noteEl(r.note));

  const box = el('div', 'rt-preview');
  const exes = r.exercises || [];
  // `tw` is stored pounds, the way every weight in this app is. Read once per
  // paint and converted in the expression that builds the string — the rule in
  // AGENTS.md, and the rule the routine editor two hundred lines down already
  // follows. This preview printed the raw number, so a metric account read its
  // own routine in pounds with a kilo label nowhere on the screen.
  const u = wu();
  const pvRow = ex => {
    const line = el('div', 'rt-pv-row');
    const tag = el('i', 'ex-tag');
    tag.style.background = (GROUPS[ex.group] || {}).color || 'var(--dim)';
    line.appendChild(tag);
    line.appendChild(el('span', 'rt-pv-name', ex.name));
    const sets = ex.sets || [];
    // fmtSetW, not fmtSetLoad: a routine's target is a plan, not a record, and
    // a blank one already prints as nothing at all rather than as a zero.
    const txt = sets.length
      ? sets.map(s => (s.tw ? fmtSetW(s.tw, u) + '×' : '') + (s.tr || '–')).join('  ')
      : 'no sets';
    line.appendChild(el('span', 'rt-pv-sets num', txt));
    return line;
  };
  // Display only — the same grouping the editor and the workout screen read
  // off the same annotations, with no buttons, because there is nothing to do
  // to a block from here. A block-less routine lists exactly as it always has.
  sessionLayout(exes, blockOrder(exes)).forEach(row => {
    if (row.kind === 'ex') { box.appendChild(pvRow(exes[row.index])); return; }
    const grp = el('div', 'rt-pv-block');
    grp.appendChild(el('div', 'wk-block-title', 'Block ' + row.block));
    row.items.forEach(i => grp.appendChild(pvRow(exes[i])));
    box.appendChild(grp);
  });
  sh.appendChild(box);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Start workout');
  go.style.marginTop = '14px';
  go.onclick = async () => {
    close();
    r.lastUsed = Date.now();
    r.uses = (r.uses || 0) + 1;
    routines[r.id] = r;
    persist();
    bump('routineStart');
    onStart(toSession(r));
  };
  sh.appendChild(go);

  const edit = el('button', 'btn btn-ghost btn-block', 'Edit');
  edit.style.marginTop = '8px';
  edit.onclick = () => { close(); openEditor(JSON.parse(JSON.stringify(r)), false, onStart); };
  sh.appendChild(edit);

  const back = el('button', 'btn btn-ghost btn-block', 'Back');
  back.style.marginTop = '8px';
  back.onclick = () => { close(); openRoutines(onStart); };
  sh.appendChild(back);
}

// Routine -> the object startWorkout() already knows how to take.
//
// The block annotation is carried straight through. startWorkout sets no
// `blocks` on the session, so sessionBlocks falls back to blockOrder and reads
// the blocks back off these annotations — which is why a routine needs no
// stored blocks array of its own, and must not grow one. v55: so is a drop's
// `dp` (analytics.js), so a drop set starts as one group.
function toSession(r) {
  return {
    name: r.name || 'Workout',
    exercises: (r.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      ...(ex.block ? { block: ex.block } : null),
      sets: (ex.sets || []).map(s => ({
        w: '', r: '', type: s.type || 'N', done: false,
        tw: s.tw || '', tr: s.tr || '',
        ...(s.dp != null ? { dp: s.dp } : null)
      }))
    }))
  };
}

/* ================= EDITOR ================= */
function openEditor(draft, isNew, onStart) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', isNew ? 'New' : 'Editing'));
  sh.appendChild(el('h2', null, 'Routine'));

  const nf = el('div', 'field');
  nf.appendChild(el('label', null, 'Name'));
  const nameIn = el('input');
  nameIn.type = 'text'; nameIn.autocapitalize = 'words';
  nameIn.placeholder = 'e.g. Push A';
  nameIn.value = draft.name || '';
  nf.appendChild(nameIn);
  sh.appendChild(nf);

  const tf = el('div', 'field');
  tf.style.marginTop = '10px';
  tf.appendChild(el('label', null, 'Note (optional)'));
  const noteIn = el('input');
  noteIn.type = 'text';
  noteIn.placeholder = 'heavy bench, back off on incline';
  noteIn.value = draft.note || '';
  tf.appendChild(noteIn);
  sh.appendChild(tf);

  const body = el('div', 'rt-edit');
  sh.appendChild(body);

  // The transient order, derived from the annotations the routine already
  // carries. A routine with none yields [], and everything below then draws
  // exactly what it drew before blocks existed.
  draft.blocks = blockOrder(draft.exercises);

  // The impure step, the routine editor's commitBlocks: takes what the pure
  // functions returned and puts it on the draft.
  const commit = next => {
    draft.exercises = next.exercises;
    draft.blocks = next.blocks;
    paint();
  };

  const paint = () => {
    body.innerHTML = '';

    // Renumbered on the way in as well as on every change, because the
    // per-exercise ⋯ menu can empty a block out and knows nothing about blocks.
    // normalizeBlocks is a fixed point, so on every other paint this is a
    // no-op. Same line the workout screen opens its render with.
    const laid = normalizeBlocks(draft.exercises, sessionBlocks(draft));
    draft.exercises = laid.exercises;
    draft.blocks = laid.blocks;

    sessionLayout(draft.exercises, draft.blocks).forEach(row => {
      if (row.kind === 'ex') { body.appendChild(exBlock(draft.exercises[row.index], row.index)); return; }
      body.appendChild(blockCard(row));
    });

    // Half width each, as on the workout screen. An exercise added here is
    // ungrouped; a block is a box to put the repeated ones in.
    const addRow = el('div', 'add-row');
    const add = el('button', 'btn btn-ghost', '+  Add exercise');
    add.onclick = () => openPicker(chosen => {
      chosen.forEach(x => draft.exercises.push(newExercise(x)));
      paint();
    });
    const addBlk = el('button', 'btn btn-ghost', '+  Add Lifting Block');
    addBlk.onclick = () => commit(addBlock(draft));
    addRow.append(add, addBlk);
    body.appendChild(addRow);
  };

  // The container, drawn the way the workout screen draws it — the same
  // classes, so it reads as the same thing — MINUS the check box, which ticks
  // sets off as you do them and has nothing to tick in a plan.
  function blockCard(row) {
    const n = row.block;
    const card = el('div', 'wk-block');

    const hd = el('div', 'wk-block-hd');
    hd.appendChild(el('div', 'wk-block-title', 'Block ' + n));

    const acts = el('div', 'wk-block-acts');

    const dup = el('button', 'btn btn-ghost wk-block-btn', 'Duplicate');
    // Nothing to repeat until the block holds an exercise, and a button that
    // quietly does nothing is worse than one that says it is not ready yet.
    dup.disabled = !row.items.length;
    // No copySet: a routine's sets are targets, and a repeat of a block plans
    // the same work, so they come across exactly as they are.
    dup.onclick = () => commit(duplicateBlock(draft, n));
    acts.appendChild(dup);

    const del = el('button', 'wk-block-x', '✕');
    del.setAttribute('aria-label', 'Delete Block ' + n);
    del.onclick = () => {
      // A routine holds no logged sets, so the bar for stopping is lower than
      // the workout screen's: exercises are worth a question, an empty block
      // goes without a word.
      if (!row.items.length) { commit(deleteBlock(draft, n)); return; }
      confirmSheet({
        title: 'Delete Block ' + n + '?',
        body: 'Its exercises and their targets come out of this routine.',
        confirmLabel: 'Delete block', danger: true,
        onConfirm: () => commit(deleteBlock(draft, n))
      });
    };
    acts.appendChild(del);
    hd.appendChild(acts);
    card.appendChild(hd);

    const inner = el('div', 'wk-block-body');
    row.items.forEach(i => inner.appendChild(exBlock(draft.exercises[i], i)));
    if (!row.items.length) inner.appendChild(noteEl('Nothing in this block yet — add the exercises you will repeat.'));

    const add = el('button', 'btn btn-ghost btn-block wk-block-add', '+  Add exercise');
    add.onclick = () => openPicker(chosen =>
      commit(addToBlock(draft, n, chosen.map(newExercise))));
    inner.appendChild(add);

    card.appendChild(inner);
    return card;
  }

  function exBlock(ex, xi) {
    const block = el('div', 'ex-block');
    const hd = el('div', 'ex-hd');
    const tag = el('i', 'ex-tag');
    tag.style.background = (GROUPS[ex.group] || {}).color || 'var(--dim)';
    hd.appendChild(tag);
    hd.appendChild(el('div', 'ex-name', ex.name));
    const menu = el('button', 'ex-menu', '⋯');
    menu.setAttribute('aria-label', 'Remove ' + ex.name);
    menu.onclick = () => confirmSheet({
      title: 'Remove ' + ex.name + '?',
      body: 'It comes out of this routine along with its sets.',
      confirmLabel: 'Remove', danger: true,
      onConfirm: () => { draft.exercises.splice(xi, 1); paint(); }
    });
    hd.appendChild(menu);
    block.appendChild(hd);

    const sets = el('div', 'rt-sets');
    const shd = el('div', 'set-hd');
    const u = wu();
    ['Set', 'Target ' + unitW(u), 'Reps', ''].forEach(t => shd.appendChild(el('span', null, t)));
    sets.appendChild(shd);

    ex.sets.forEach((s, si) => {
      const row = el('div', 'set-row');
      const idx = el('button', 'set-idx t-' + (s.type || 'N'),
        (s.type || 'N') === 'N' ? String(si + 1) : s.type);
      idx.title = 'Tap to cycle: normal, warm-up, failure, drop set';
      // v55: through retypeSet, as on the workout screen, so no drop set is
      // stitched to another when one set's type changes.
      idx.onclick = () => {
        const order = ['N', 'W', 'F', 'D'];
        ex.sets = retypeSet(ex.sets, si, order[(order.indexOf(s.type || 'N') + 1) % 4]);
        paint();
      };
      row.appendChild(idx);

      // tw is a stored POUND target held as a string, exactly like a logged
      // set's w, and '' has to survive so an unset target stays unset. Convert
      // on the way in, before the clamp, so a kilos routine is bounded in
      // kilos; convert on the way out so the box shows what was typed.
      const w = el('input');
      w.type = 'number'; w.inputMode = 'decimal'; w.placeholder = '–';
      const lim = limW(LIMITS.setW, u);
      w.min = lim[0]; w.max = lim[1];
      w.value = s.tw != null ? fmtSetW(s.tw, u) : '';
      w.onchange = e => {
        const n = setNum(e.target.value, lim);
        s.tw = n === '' ? '' : String(wIn(parseFloat(n), u));
        e.target.value = fmtSetW(s.tw, u);
      };
      row.appendChild(w);

      const rr = el('input');
      rr.type = 'number'; rr.inputMode = 'numeric'; rr.placeholder = '–';
      rr.value = s.tr != null ? s.tr : '';
      rr.onchange = e => { s.tr = setNum(e.target.value, LIMITS.reps, true); e.target.value = s.tr; };
      row.appendChild(rr);

      row.appendChild(el('span'));
      sets.appendChild(swipeToDelete(row, {
        onDelete: () => { ex.sets = removeSet(ex.sets, si); paint(); }
      }));
    });
    block.appendChild(sets);
    if (ex.sets.length) block.appendChild(el('div', 'swipe-hint', 'Swipe a set left to delete it'));

    const acts = el('div', 'ex-actions');
    const addSet = el('button', 'btn btn-ghost', '+ Set');
    addSet.onclick = () => {
      const last = ex.sets[ex.sets.length - 1] || {};
      ex.sets.push({ tw: last.tw || '', tr: last.tr || '', type: 'N' });
      paint();
    };
    acts.appendChild(addSet);
    block.appendChild(acts);
    return block;
  }

  paint();

  const save = el('button', 'btn btn-primary btn-block btn-lg', 'Save routine');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const name = nameIn.value.trim();
    if (!name) { toast('Give it a name'); nameIn.focus(); return; }
    if (!draft.exercises.length) { toast('Add at least one exercise'); return; }
    draft.name = name;
    draft.note = noteIn.value.trim();
    // Annotations renumbered 1..k in display order, transient order dropped:
    // what is stored carries `block` on the exercises and no `blocks` array.
    routines[draft.id] = forStorage(draft);
    await persist();
    close();
    toast('Saved ' + name);
    openRoutines(onStart);
  };
  sh.appendChild(save);

  if (!isNew) {
    const del = el('button', 'btn btn-danger btn-block', 'Delete routine');
    del.style.marginTop = '8px';
    del.onclick = () => confirmSheet({
      title: 'Delete ' + (draft.name || 'this routine') + '?',
      body: 'The routine goes. Workouts you already logged from it are untouched.',
      confirmLabel: 'Delete', danger: true,
      onConfirm: async () => {
        delete routines[draft.id];
        await persist();
        close();
        toast('Deleted');
        openRoutines(onStart);
      }
    });
    sh.appendChild(del);
  }

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ================= SAVE A FINISHED SESSION =================
   The cheapest way to get the first routine in: it captures what he actually
   did rather than making him type a plan from nothing. */
export function saveSessionAsRoutine(record, onDone) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Save as routine'));
  sh.appendChild(el('h2', null, 'Reuse this workout'));
  sh.appendChild(noteEl('The weights become targets — placeholders next time, not pre-filled numbers.'));

  const nf = el('div', 'field');
  nf.style.marginTop = '12px';
  nf.appendChild(el('label', null, 'Name'));
  const nameIn = el('input');
  nameIn.type = 'text'; nameIn.autocapitalize = 'words';
  nameIn.value = record.name && !/^(Morning|Afternoon|Evening) session$/.test(record.name)
    ? record.name : '';
  nameIn.placeholder = 'e.g. Push A';
  nf.appendChild(nameIn);
  sh.appendChild(nf);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Save routine');
  go.style.marginTop = '14px';
  go.onclick = async () => {
    const name = nameIn.value.trim();
    if (!name) { toast('Give it a name'); nameIn.focus(); return; }
    const r = blankRoutine();
    r.name = name;
    // Same idiom as editWorkout's map in workout.js: the block number is the
    // only trace a block leaves, so keeping it here is the whole of what makes
    // a block workout reusable. collectDone already left the record's
    // exercises block-contiguous and renumbered, so nothing is reordered.
    r.exercises = (record.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      ...(ex.block ? { block: ex.block } : null),
      // v55: a drop's `dp` too, so a drop set is saved as one group.
      sets: (ex.sets || []).map(s => ({ tw: s.w || '', tr: s.r || '', type: s.type || 'N', ...(s.dp != null ? { dp: s.dp } : null) }))
    }));
    routines[r.id] = r;
    await persist();
    close();
    toast('Saved ' + name);
    if (onDone) onDone();
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}
