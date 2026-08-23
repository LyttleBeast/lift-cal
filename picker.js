// The exercise library and the two sheets that pick from it.
//
// This was inside workout.js. Routines need the same picker, and having
// routines.js import workout.js while workout.js imports routines.js is the
// cycle the README's import graph forbids. So the shared half moved down here
// and both import it. Nothing imports back.
//
//   exercises/custom -> [ { id, name, group, equipment }, … ]

import { GROUPS, GROUP_ORDER, EXERCISES, EQUIPMENT, makeCustomExercise } from './exercises.js';
import { read, write } from './store.js';
import { el, sheet, toast, noteEl } from './ui.js';

let customEx = [];

export async function initPicker() {
  customEx = (await read('exercises/custom', null)) || [];
}

export function allExercises() { return [...EXERCISES, ...customEx]; }

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
  nameIn.placeholder = 'e.g. Zercher Squat';
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
    const dupe = allExercises().find(x => x.name.toLowerCase() === name.toLowerCase());
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
