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
// Imports picker.js, never workout.js. workout.js passes its startWorkout in
// as a callback, so the dependency only ever points one way.

import { read, write, watch } from './store.js';
import { GROUPS, GROUP_ORDER } from './exercises.js';
import { openPicker } from './picker.js';
import { el, sheet, toast, noteEl, confirmSheet, swipeToDelete, fmtDate } from './ui.js';

let routines = {};

export async function initRoutines() {
  routines = (await read('routines', null)) || {};
  // Written whole, so a stale copy in memory would drop a routine added on
  // another device the next time this one saved.
  watch('routines', val => { routines = val || {}; });
}

function persist() { return write('routines', routines); }

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
  (r.exercises || []).forEach(ex => {
    const line = el('div', 'rt-pv-row');
    const tag = el('i', 'ex-tag');
    tag.style.background = (GROUPS[ex.group] || {}).color || 'var(--dim)';
    line.appendChild(tag);
    line.appendChild(el('span', 'rt-pv-name', ex.name));
    const sets = ex.sets || [];
    const txt = sets.length
      ? sets.map(s => (s.tw ? s.tw + '×' : '') + (s.tr || '–')).join('  ')
      : 'no sets';
    line.appendChild(el('span', 'rt-pv-sets num', txt));
    box.appendChild(line);
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
function toSession(r) {
  return {
    name: r.name || 'Workout',
    exercises: (r.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      sets: (ex.sets || []).map(s => ({
        w: '', r: '', type: s.type || 'N', done: false,
        tw: s.tw || '', tr: s.tr || ''
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

  const paint = () => {
    body.innerHTML = '';
    draft.exercises.forEach((ex, xi) => body.appendChild(exBlock(ex, xi)));

    const add = el('button', 'btn btn-ghost btn-block', '+  Add exercise');
    add.onclick = () => openPicker(chosen => {
      chosen.forEach(x => draft.exercises.push({
        exId: x.id, name: x.name, group: x.group, equipment: x.equipment,
        sets: [{ tw: '', tr: '', type: 'N' }]
      }));
      paint();
    });
    body.appendChild(add);
  };

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
    ['Set', 'Target lb', 'Reps', ''].forEach(t => shd.appendChild(el('span', null, t)));
    sets.appendChild(shd);

    ex.sets.forEach((s, si) => {
      const row = el('div', 'set-row');
      const idx = el('button', 'set-idx t-' + (s.type || 'N'),
        (s.type || 'N') === 'N' ? String(si + 1) : s.type);
      idx.title = 'Tap to cycle: normal, warm-up, failure, drop set';
      idx.onclick = () => {
        const order = ['N', 'W', 'F', 'D'];
        s.type = order[(order.indexOf(s.type || 'N') + 1) % 4];
        paint();
      };
      row.appendChild(idx);

      const w = el('input');
      w.type = 'number'; w.inputMode = 'decimal'; w.placeholder = '–';
      w.value = s.tw != null ? s.tw : '';
      w.onchange = e => { s.tw = e.target.value; };
      row.appendChild(w);

      const rr = el('input');
      rr.type = 'number'; rr.inputMode = 'numeric'; rr.placeholder = '–';
      rr.value = s.tr != null ? s.tr : '';
      rr.onchange = e => { s.tr = e.target.value; };
      row.appendChild(rr);

      row.appendChild(el('span'));
      sets.appendChild(swipeToDelete(row, {
        onDelete: () => { ex.sets.splice(si, 1); paint(); }
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
    routines[draft.id] = draft;
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
    r.exercises = (record.exercises || []).map(ex => ({
      exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
      sets: (ex.sets || []).map(s => ({ tw: s.w || '', tr: s.r || '', type: s.type || 'N' }))
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
