// One-time migration: bring a Liftoff export (converted to Rack format) into the app.
// Merges by month so existing sessions are never clobbered.

import { read, write } from './store.js';
import { toast } from './workout.js';

const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };

function sheet() {
  const back = el('div', 'sheet-backdrop');
  const sh = el('div', 'sheet');
  sh.appendChild(el('div', 'sheet-grab'));
  const close = () => { back.remove(); sh.remove(); };
  back.onclick = close;
  document.body.append(back, sh);
  return { back, sh, close };
}

function note(txt) {
  const p = el('div', null, txt);
  p.style.cssText = 'font-size:12px;color:var(--dim);line-height:1.5;margin-top:8px';
  return p;
}

export function openImport() {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Import workout history'));
  sh.appendChild(note('Pick the rack-import.json file Claude generated from your Liftoff export. Nothing is written until you confirm on the next screen.'));

  const pick = el('input');
  pick.type = 'file';
  pick.accept = '.json,application/json';
  pick.style.cssText = 'margin-top:14px;width:100%;color:var(--steel);font-size:13px';
  sh.appendChild(pick);

  const status = el('div', 'eyebrow');
  status.style.marginTop = '10px';
  sh.appendChild(status);

  pick.onchange = async () => {
    const f = pick.files && pick.files[0];
    if (!f) return;
    status.textContent = 'Reading ' + f.name + '\u2026';
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch {
      status.textContent = 'That file isn\u2019t valid JSON.';
      return;
    }
    if (!data || data.type !== 'rack-workout-import' || !data.workouts) {
      status.textContent = 'That doesn\u2019t look like a Rack import file.';
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

  sh.appendChild(note(
    s.months[0] + ' through ' + s.months[s.months.length - 1] +
    ' \u00b7 ' + s.months.length + ' months. Existing sessions are kept \u2014 this only adds days you don\u2019t already have.'));

  const bar = el('div');
  bar.style.cssText = 'height:6px;border-radius:3px;overflow:hidden;display:flex;margin-top:12px';
  const COLORS = { chest:'var(--p-red)', back:'var(--p-blue)', legs:'var(--p-yellow)',
                   shoulders:'var(--p-green)', arms:'var(--p-white)', core:'var(--p-chrome)' };
  const tot = Object.values(s.groups).reduce((a, b) => a + b, 0) || 1;
  Object.entries(s.groups).sort((a, b) => b[1] - a[1]).forEach(([g, n]) => {
    const seg = el('div');
    seg.style.cssText = 'width:' + (n / tot * 100) + '%;background:' + (COLORS[g] || 'var(--knurl)');
    bar.appendChild(seg);
  });
  sh.appendChild(bar);

  const prog = el('div', 'eyebrow');
  prog.style.marginTop = '12px';
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
    onProgress('Adding ' + customs.length + ' custom exercises\u2026');
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
    onProgress('Building exercise history\u2026');
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

  onProgress('Finishing\u2026');
}
