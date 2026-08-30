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
import { el, sheet, toast, noteEl, confirmSheet } from './ui.js';

let customEx  = [];
let overrides = {};
let hidden    = [];

export async function initPicker() {
  customEx  = (await read('exercises/custom',    null)) || [];
  overrides = (await read('exercises/overrides', null)) || {};
  hidden    = (await read('exercises/hidden',    null)) || [];
}

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

/* ================= PICKER ================= */
// Multi-select. Hands back [{ id, name, group, equipment }, …].
export function openPicker(onPick) {
  const { sh, close } = sheet();

  const selected = [];
  let filter = 'all', q = '';

  const search = el('div', 'picker-search');
  const inp = el('input');
  inp.placeholder = 'Search exercises';
  inp.type = 'search';
  search.appendChild(inp);

  const chips = el('div', 'filter-row');
  const mkChip = (id, label) => {
    const c = el('button', 'chip' + (filter === id ? ' on' : ''), label);
    c.onclick = () => { filter = id; paint(); };
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
    paint();
  });
  const addBtn = el('button', 'btn btn-primary', 'Add');
  addBtn.style.flex = '1';
  addBtn.onclick = () => { if (selected.length) { close(); onPick(selected); } };
  const closeBtn = el('button', 'btn btn-ghost', 'Cancel');
  closeBtn.onclick = () => close();
  foot.append(closeBtn, custom, addBtn);
  sh.appendChild(foot);

  function paint() {
    chips.innerHTML = '';
    chips.appendChild(mkChip('all', 'All'));
    GROUP_ORDER.forEach(g => chips.appendChild(mkChip(g, GROUPS[g].label)));

    list.innerHTML = '';
    const pool = allExercises()
      .filter(x => filter === 'all' || x.group === filter)
      .filter(x => !q || x.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    pool.slice(0, 260).forEach(x => {
      const on = selected.some(s => s.id === x.id);
      const b = el('button', 'ex-item' + (on ? ' sel' : ''));
      const dot = el('i', 'dot'); dot.style.background = GROUPS[x.group].color;
      b.appendChild(dot);
      b.appendChild(el('span', 'nm', x.name));
      b.appendChild(el('span', 'eq', x.equipment));
      b.onclick = () => {
        const i = selected.findIndex(s => s.id === x.id);
        if (i >= 0) selected.splice(i, 1); else selected.push(x);
        paint();
      };
      list.appendChild(b);
    });

    addBtn.textContent = selected.length ? `Add ${selected.length}` : 'Add';
    addBtn.disabled = !selected.length;
  }

  inp.oninput = e => { q = e.target.value.toLowerCase().trim(); paint(); };
  paint();
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
        customEx = customEx.filter(e => e.id !== id);
        hidden = hidden.filter(h => h !== id);
        delete overrides[id];
        await write('exercises/custom', customEx);
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
