// Water — daily intake against a goal.
//
//   users/{uid}/water/log/{YYYY-MM-DD} -> { entryId: { ml, t, src } }
//   users/{uid}/settings/water         -> { goalMl, unit, presets }
//
// Millilitres are the only thing ever stored. Display converts on the way out.
// A log that stores whichever unit happened to be on screen is a log you
// cannot sum.
//
// There is deliberately no rollup node. food/daySummaries exists because the
// TDEE math reads it instead of the raw log, and house rule 3 exists because
// that rollup goes stale. A day of water is a handful of entries — sum it on
// read. Don't build a second thing that can disagree with itself.
//
// Imports store.js, ui.js and usage.js only, so it can never create a cycle.

import { read, write, watch, todayKey } from './store.js';
import { bump } from './usage.js';
import { el, svgEl, sheet, toast, noteEl, confirmSheet, segmented,
         swipeToDelete, r1, trimNum, parseKey, LIMITS, within } from './ui.js';

/* ---------- units ---------- */
export const UNITS = {
  floz: { label: 'fl oz', ml: 29.5735, dp: 0 },
  ml:   { label: 'ml',    ml: 1,       dp: 0 },
  L:    { label: 'L',     ml: 1000,    dp: 2 },
  cup:  { label: 'cups',  ml: 236.588, dp: 1 }
};

// The flat-of-40 bottle from the supermarket is 16.9 fl oz / 500 ml. That's
// the one worth having as the fat default button.
const DEFAULT_PRESETS = [
  { label: 'Bottle',     ml: 500  },
  { label: 'Small cup',  ml: 237  },
  { label: 'Can',        ml: 355  },
  { label: 'Sports cap', ml: 591  },
  { label: 'Shaker',     ml: 710  },
  { label: 'Big bottle', ml: 946  },
  { label: 'Tumbler',    ml: 1183 },
  { label: 'Gallon',     ml: 3785 }
];

const DEFAULTS = { goalMl: 3785, unit: 'floz', presets: null };

let settings = { ...DEFAULTS };
let dayLog   = {};
let dayKey   = null;
let unwatch  = null;
let notify   = () => {};

/* ================= INIT ================= */
export async function initWater(onChange) {
  if (onChange) notify = onChange;
  const s = await read('settings/water', null);
  settings = { ...DEFAULTS, ...(s || {}) };
}

export function waterSettings() { return settings; }
export function presets() { return settings.presets && settings.presets.length ? settings.presets : DEFAULT_PRESETS; }
export function defaultPreset() { return presets()[0] || DEFAULT_PRESETS[0]; }

/* Load and subscribe to one day. Called by food.js whenever its date moves. */
export async function loadWaterDay(key) {
  dayKey = key;
  dayLog = (await read('water/log/' + key, null)) || {};
  if (unwatch) { unwatch(); unwatch = null; }
  unwatch = watch('water/log/' + key, val => {
    const next = val || {};
    if (JSON.stringify(next) === JSON.stringify(dayLog)) return;
    dayLog = next;
    notify();
  });
}

export function waterTotal() {
  return Object.values(dayLog).reduce((s, e) => s + (e && e.ml || 0), 0);
}

function sortedEntries() {
  return Object.entries(dayLog)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => (a.t || 0) - (b.t || 0));
}

/* ---------- conversion ---------- */
export function toDisplay(ml, unit = settings.unit) {
  const u = UNITS[unit] || UNITS.ml;
  const v = ml / u.ml;
  return u.dp === 0 ? Math.round(v) : Number(v.toFixed(u.dp));
}
export function fromDisplay(v, unit = settings.unit) {
  const u = UNITS[unit] || UNITS.ml;
  return Math.round(v * u.ml);
}
export function fmtWater(ml, unit = settings.unit) {
  const u = UNITS[unit] || UNITS.ml;
  return toDisplay(ml, unit).toLocaleString() + ' ' + u.label;
}

/* ---------- writes ---------- */
async function persist() {
  await write('water/log/' + dayKey, dayLog);
  notify();
}

export async function addWater(ml, src = 'preset') {
  if (!dayKey || !(ml > 0)) return;
  bump('waterLog');
  const id = 'wa' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  // Logging onto a past day timestamps it at midday, so it can never look like
  // it happened at whatever o'clock it is now.
  const t = dayKey === todayKey() ? Date.now() : parseKey(dayKey).getTime();
  dayLog[id] = { ml: Math.round(ml), t, src };
  await persist();
}

async function removeEntry(id) {
  delete dayLog[id];
  await persist();
}

async function undoLast() {
  const list = sortedEntries();
  if (!list.length) { toast('Nothing to undo'); return; }
  const last = list[list.length - 1];
  await removeEntry(last.id);
  toast('Removed ' + fmtWater(last.ml));
}

/* ================= THE CARD ================= */
let clipSeq = 0;

export function renderWater(editable = true) {
  const total = waterTotal();
  const goal  = settings.goalMl > 0 ? settings.goalMl : DEFAULTS.goalMl;
  const frac  = Math.max(0, Math.min(1, total / goal));

  const card = el('div', 'card');
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', 'Water'));
  const pctLbl = el('div', 'water-pct num', Math.round(total / goal * 100) + '%');
  hd.appendChild(pctLbl);
  card.appendChild(hd);

  const row = el('div', 'water-row');
  row.appendChild(vessel(frac));

  const right = el('div', 'water-right');

  const big = el('div', 'load-num num', String(toDisplay(total).toLocaleString()));
  big.style.fontSize = '34px';
  big.style.color = frac >= 1 ? 'var(--good)' : 'var(--p-blue)';
  right.appendChild(big);
  right.appendChild(el('div', 'eyebrow',
    (UNITS[settings.unit] || UNITS.ml).label + ' of ' + fmtWater(goal)));

  const left = Math.max(0, goal - total);
  right.appendChild(el('div', 'water-left num',
    left > 0 ? fmtWater(left) + ' to go' : 'Goal hit'));

  // One pip per default-size bottle. Turns 2,130 ml into "four and a bit
  // bottles", which is how you actually think about it.
  const unitMl = defaultPreset().ml;
  const pips = el('div', 'water-pips');
  const nPips = Math.max(1, Math.min(12, Math.ceil(goal / unitMl)));
  for (let i = 0; i < nPips; i++) {
    const filled = total >= (i + 1) * unitMl;
    const part   = !filled && total > i * unitMl;
    const p = el('i', 'water-pip' + (filled ? ' on' : part ? ' part' : ''));
    if (part) p.style.setProperty('--fill', ((total - i * unitMl) / unitMl * 100) + '%');
    pips.appendChild(p);
  }
  right.appendChild(pips);
  row.appendChild(right);
  card.appendChild(row);

  if (editable) {
    const ctl = el('div', 'water-ctl');
    const dp = defaultPreset();

    const minus = el('button', 'btn btn-ghost water-mini', '−');
    minus.setAttribute('aria-label', 'Undo last');
    minus.onclick = undoLast;

    const plus = el('button', 'btn btn-primary water-add',
      '+  ' + dp.label + '  ·  ' + fmtWater(dp.ml));
    plus.onclick = async () => { await addWater(dp.ml); toast('+ ' + fmtWater(dp.ml)); };

    const more = el('button', 'btn btn-ghost water-mini', '⋯');
    more.setAttribute('aria-label', 'More ways to log water');
    more.onclick = openWaterSheet;

    ctl.append(minus, plus, more);
    card.appendChild(ctl);
  }
  return card;
}

/* ---------- the vessel ----------
   A bottle that fills, with a wave for the waterline. A bar is a bar; the
   calorie meter is already a bar and this needs to read as a different thing
   at a glance. */
function vessel(frac) {
  const W = 104, H = 168;
  const id = 'wclip' + (++clipSeq);

  // Bottle outline: neck, shoulder, body.
  const shape = 'M 40 10 L 64 10 L 64 28 C 64 37 84 44 84 62 L 84 146 ' +
                'Q 84 160 70 160 L 34 160 Q 20 160 20 146 L 20 62 ' +
                'C 20 44 40 37 40 28 Z';

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'water-vessel' });
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id });
  clip.appendChild(svgEl('path', { d: shape }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  svg.appendChild(svgEl('path', { d: shape, fill: 'var(--rack)' }));

  // Waterline. 154 is the inside bottom, 22 the inside top of the neck.
  const bottom = 154, top = 22;
  const y = bottom - frac * (bottom - top);
  const g = svgEl('g', { 'clip-path': `url(#${id})` });
  if (frac > 0.001) {
    g.appendChild(svgEl('path', {
      d: wave(W, H, y + 3, 4, 14), fill: 'var(--p-blue)', opacity: '0.45'
    }));
    g.appendChild(svgEl('path', {
      d: wave(W, H, y, 5, 0), fill: 'var(--p-blue)', opacity: '0.9'
    }));
  }
  svg.appendChild(g);

  svg.appendChild(svgEl('path', {
    d: shape, fill: 'none', stroke: 'var(--knurl)', 'stroke-width': '2.5'
  }));
  // Cap.
  svg.appendChild(svgEl('rect', {
    x: '38', y: '2', width: '28', height: '10', rx: '3', fill: 'var(--knurl)'
  }));
  return svg;
}

// Alternating quadratic humps, extended past both edges so the clip never
// shows an end.
function wave(w, h, y, amp, shift) {
  const period = w / 1.6;
  let x = -period + shift;
  let d = `M ${x} ${y}`;
  let up = true;
  while (x < w + period) {
    d += ` q ${period / 4} ${up ? -amp : amp} ${period / 2} 0`;
    x += period / 2;
    up = !up;
  }
  return d + ` L ${x} ${h + 6} L ${-period + shift} ${h + 6} Z`;
}

/* ================= LOG SHEET ================= */
function openWaterSheet() {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Water'));
  sh.appendChild(el('h2', null, 'Log a drink'));

  const grid = el('div', 'water-preset-grid');
  presets().forEach(p => {
    const b = el('button', 'water-preset');
    b.appendChild(el('span', 'wp-label', p.label));
    b.appendChild(el('span', 'wp-amt num', fmtWater(p.ml)));
    b.onclick = async () => { close(); await addWater(p.ml); toast('+ ' + fmtWater(p.ml)); };
    grid.appendChild(b);
  });
  sh.appendChild(grid);

  // Custom amount, in whichever unit you pick right here.
  let unit = settings.unit;
  sh.appendChild(el('div', 'eyebrow', 'Custom amount'));
  const seg = segmented(Object.keys(UNITS).map(k => [k, UNITS[k].label]), unit, v => {
    unit = v;
    inp.placeholder = String(toDisplay(defaultPreset().ml, unit));
  });
  seg.style.marginTop = '6px';
  sh.appendChild(seg);

  const row = el('div', 'qty-row');
  const inp = el('input');
  inp.type = 'number'; inp.inputMode = 'decimal'; inp.step = 'any';
  inp.placeholder = String(toDisplay(defaultPreset().ml, unit));
  const go = el('button', 'btn btn-primary', 'Add');
  go.style.flex = '0 0 auto';
  go.onclick = async () => {
    const v = parseFloat(inp.value);
    if (!(v > 0)) { toast('Enter an amount'); return; }
    const ml = fromDisplay(v, unit);
    if (!within(ml, LIMITS.waterMl)) { toast('That’s more than ' + fmtWater(LIMITS.waterMl[1], unit) + ' in one go'); return; }
    close();
    await addWater(ml, 'manual');
    toast('+ ' + fmtWater(ml, unit));
  };
  row.append(inp, go);
  sh.appendChild(row);

  const list = sortedEntries();
  if (list.length) {
    sh.appendChild(el('div', 'eyebrow', 'Today'));
    const box = el('div', 'water-entries');
    list.reverse().forEach(e => {
      const r = el('div', 'water-entry');
      r.appendChild(el('span', 'num', fmtWater(e.ml)));
      r.appendChild(el('span', 'we-time',
        new Date(e.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })));
      box.appendChild(swipeToDelete(r, {
        onDelete: async () => { await removeEntry(e.id); close(); openWaterSheet(); }
      }));
    });
    sh.appendChild(box);
  }

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '14px';
  done.onclick = close;
  sh.appendChild(done);
}

/* ================= SETTINGS ================= */
// `latestLb` lets the goal default track bodyweight at roughly half an ounce
// per pound, which is the usual rule of thumb.
export function openWaterSettings(latestLb, onSaved) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Water'));
  sh.appendChild(el('h2', null, 'Goal and presets'));

  let unit = settings.unit;

  const uf = el('div', 'field');
  uf.appendChild(el('label', null, 'Display unit'));
  uf.appendChild(segmented(Object.keys(UNITS).map(k => [k, UNITS[k].label]), unit, v => {
    const cur = fromDisplay(parseFloat(gi.value) || 0, unit);
    unit = v;
    gi.value = cur > 0 ? String(toDisplay(cur, unit)) : '';
    gl.textContent = 'Goal (' + UNITS[unit].label + ')';
    hint();
  }));
  sh.appendChild(uf);

  const gf = el('div', 'field');
  gf.style.marginTop = '10px';
  const gl = el('label', null, 'Goal (' + UNITS[unit].label + ')');
  gf.appendChild(gl);
  const gi = el('input');
  gi.type = 'number'; gi.inputMode = 'decimal'; gi.step = 'any';
  gi.value = settings.goalMl > 0 ? String(toDisplay(settings.goalMl, unit)) : '';
  gf.appendChild(gi);
  sh.appendChild(gf);

  const note = noteEl('');
  const hint = () => {
    const byWeight = latestLb > 0 ? Math.round(latestLb * 0.5 * UNITS.floz.ml) : null;
    gi.placeholder = String(toDisplay(byWeight || DEFAULTS.goalMl, unit));
    note.textContent = byWeight
      ? 'Half an ounce per pound puts you around ' + fmtWater(byWeight, unit) +
        ' at ' + r1(latestLb) + ' lb. A gallon is ' + fmtWater(3785, unit) + '.'
      : 'A gallon is ' + fmtWater(3785, unit) + '. Log a weigh-in and this can suggest a number off your bodyweight.';
  };
  hint();
  sh.appendChild(note);
  gi.oninput = () => {};

  sh.appendChild(el('div', 'eyebrow', 'Quick-add buttons'));
  sh.appendChild(noteEl('The first one is the big button on the card. Drag isn’t a thing here — edit the amounts and the order follows.'));

  const rows = [];
  const box = el('div', 'water-preset-edit');
  const paint = () => {
    box.innerHTML = '';
    rows.length = 0;
    (settings.presets && settings.presets.length ? settings.presets : DEFAULT_PRESETS)
      .forEach((p, i) => {
        const r = el('div', 'wpe-row');
        const nm = el('input', 'wpe-name'); nm.value = p.label; nm.placeholder = 'Name';
        const am = el('input', 'wpe-amt');
        am.type = 'number'; am.inputMode = 'decimal'; am.step = 'any';
        am.value = String(toDisplay(p.ml, unit));
        const rm = el('button', 'wpe-del', '×');
        rm.setAttribute('aria-label', 'Remove');
        rm.onclick = () => {
          const next = rows.map(x => ({ label: x.nm.value.trim() || 'Drink', ml: Math.min(LIMITS.waterMl[1], fromDisplay(parseFloat(x.am.value) || 0, unit)) }));
          next.splice(i, 1);
          settings.presets = next.filter(x => x.ml > 0);
          paint();
        };
        r.append(nm, am, rm);
        box.appendChild(r);
        rows.push({ nm, am });
      });
  };
  paint();
  sh.appendChild(box);

  const addRow = el('button', 'btn btn-ghost btn-block', '+  Add a size');
  addRow.onclick = () => {
    settings.presets = rows.map(x => ({
      label: x.nm.value.trim() || 'Drink',
      ml: Math.min(LIMITS.waterMl[1], fromDisplay(parseFloat(x.am.value) || 0, unit))
    })).filter(x => x.ml > 0).concat([{ label: 'Drink', ml: 500 }]);
    paint();
  };
  sh.appendChild(addRow);

  const reset = el('button', 'btn btn-ghost btn-block', 'Reset to the standard sizes');
  reset.style.marginTop = '8px';
  reset.onclick = () => { settings.presets = null; paint(); };
  sh.appendChild(reset);

  const save = el('button', 'btn btn-primary btn-block', 'Save');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    const goal = fromDisplay(parseFloat(gi.value) || 0, unit);
    if (goal > 0 && !within(goal, LIMITS.waterGoalMl)) {
      toast('Pick a goal between ' + fmtWater(LIMITS.waterGoalMl[0], unit) + ' and ' + fmtWater(LIMITS.waterGoalMl[1], unit));
      return;
    }
    const next = rows.map(x => ({
      label: x.nm.value.trim() || 'Drink',
      ml: Math.min(LIMITS.waterMl[1], fromDisplay(parseFloat(x.am.value) || 0, unit))
    })).filter(x => x.ml > 0);
    settings = {
      goalMl: goal > 0 ? goal : DEFAULTS.goalMl,
      unit,
      presets: next.length ? next : null
    };
    await write('settings/water', settings);
    close();
    toast('Water goal saved');
    if (onSaved) onSaved();
    notify();
  };
  sh.appendChild(save);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = async () => { await initWater(); close(); notify(); };
  sh.appendChild(cancel);
}
