// One-time migration: bring a Liftoff export (converted to Rack format) into the app.
// Merges by month so existing sessions are never clobbered.

import { read, write } from './store.js';
import { el, sheet, toast, noteEl } from './ui.js';

export function openImport() {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Import workout history'));
  sh.appendChild(noteEl('Pick the rack-import.json file Claude generated from your Liftoff export. Nothing is written until you confirm on the next screen.'));

  const pick = el('input', 'file-pick');
  pick.type = 'file';
  pick.accept = '.json,application/json';
  sh.appendChild(pick);

  const status = el('div', 'eyebrow import-status');
  sh.appendChild(status);

  pick.onchange = async () => {
    const f = pick.files && pick.files[0];
    if (!f) return;
    status.textContent = 'Reading ' + f.name + '…';
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch {
      status.textContent = 'That file isn’t valid JSON.';
      return;
    }
    if (!data || data.type !== 'rack-workout-import' || !data.workouts) {
      status.textContent = 'That doesn’t look like a Rack import file.';
      return;
    }
    close();
    preview(data);
  };

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '14px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

function summarize(data) {
  let sessions = 0, sets = 0, work = 0, volume = 0;
  const months = Object.keys(data.workouts).sort();
  const groups = {};
  for (const mk of months) {
    for (const dd of Object.keys(data.workouts[mk])) {
      for (const sid of Object.keys(data.workouts[mk][dd])) {
        const s = data.workouts[mk][dd][sid];
        sessions++;
        volume += s.volume || 0;
        (s.groups || []).forEach(g => groups[g] = (groups[g] || 0) + 1);
        (s.exercises || []).forEach(ex => (ex.sets || []).forEach(st => {
          sets++; if (st.type !== 'W') work++;
        }));
      }
    }
  }
  return { sessions, sets, work, volume, months, groups };
}

function preview(data) {
  const { sh, close } = sheet();
  const s = summarize(data);

  sh.appendChild(el('div', 'eyebrow', 'Ready to import'));
  sh.appendChild(el('h2', null, s.sessions + ' sessions'));

  const row = el('div', 'stat-row');
  row.style.marginTop = '10px';
  const cell = (v, l) => {
    const c = el('div', 'stat');
    c.appendChild(el('div', 'stat-val num', v));
    c.appendChild(el('div', 'stat-lbl', l));
    return c;
  };
  row.appendChild(cell(String(s.work), 'working sets'));
  row.appendChild(cell(String(s.sets - s.work), 'warm-ups'));
  row.appendChild(cell(Math.round(s.volume / 1000) + 'k', 'lb volume'));
  sh.appendChild(row);

  sh.appendChild(noteEl(
    s.months[0] + ' through ' + s.months[s.months.length - 1] +
    ' · ' + s.months.length + ' months. Existing sessions are kept — this only adds days you don’t already have.'));

  const bar = el('div', 'import-bar');
  const COLORS = { chest:'var(--p-red)', back:'var(--p-blue)', legs:'var(--p-yellow)',
                   shoulders:'var(--p-green)', arms:'var(--p-white)', core:'var(--p-chrome)' };
  const tot = Object.values(s.groups).reduce((a, b) => a + b, 0) || 1;
  Object.entries(s.groups).sort((a, b) => b[1] - a[1]).forEach(([g, n]) => {
    const seg = el('div');
    seg.style.width = (n / tot * 100) + '%';
    seg.style.background = COLORS[g] || 'var(--knurl)';
    bar.appendChild(seg);
  });
  sh.appendChild(bar);

  const prog = el('div', 'eyebrow import-status');
  sh.appendChild(prog);

  const go = el('button', 'btn btn-primary btn-block btn-lg', 'Import');
  go.style.marginTop = '12px';
  go.onclick = async () => {
    go.disabled = true;
    try {
      await runImport(data, msg => prog.textContent = msg);
      prog.textContent = 'Done.';
      toast('Imported ' + s.sessions + ' sessions');
      setTimeout(() => { close(); location.reload(); }, 900);
    } catch (e) {
      prog.textContent = 'Import failed: ' + (e && e.message ? e.message : 'unknown error');
      go.disabled = false;
    }
  };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

async function runImport(data, onProgress) {
  const months = Object.keys(data.workouts).sort();

  // 1. custom exercises the library doesn't cover
  const customs = data.customExercises && Object.values(data.customExercises);
  if (customs && customs.length) {
    onProgress('Adding ' + customs.length + ' custom exercises…');
    const existing = (await read('exercises/custom', null)) || [];
    const haveIds = new Set(existing.map(e => e.id));
    const merged = existing.concat(customs.filter(c => !haveIds.has(c.id)));
    await write('exercises/custom', merged);
  }

  // 2. workouts, one write per month (13 writes, not 194)
  let done = 0;
  for (const mk of months) {
    onProgress('Importing ' + mk + '  (' + (++done) + '/' + months.length + ')');
    const existing = (await read('workouts/' + mk, null)) || {};
    const incoming = data.workouts[mk];
    for (const dd of Object.keys(incoming)) {
      existing[dd] = Object.assign({}, existing[dd] || {}, incoming[dd]);
    }
    await write('workouts/' + mk, existing);
  }

  // 3. per-exercise history for the "last time" line
  if (data.history) {
    onProgress('Building exercise history…');
    const hist = (await read('history', null)) || {};
    for (const exId of Object.keys(data.history)) {
      const seen = new Set((hist[exId] || []).map(e => e.date));
      const add = data.history[exId].filter(e => !seen.has(e.date));
      hist[exId] = (hist[exId] || []).concat(add)
        .sort((a, b) => a.date < b.date ? 1 : -1)
        .slice(0, 20);
    }
    await write('history', hist);
  }

  onProgress('Finishing…');
}
