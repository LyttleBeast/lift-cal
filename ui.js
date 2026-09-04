// Shared UI primitives.
// These used to be copy-pasted into workout.js, food.js, weight.js and
// importer.js. They live here now so there is exactly one of each.
// This module imports nothing, so it can never create a circular dependency.

export const $ = s => document.querySelector(s);

export const el = (t, c, txt) => {
  const n = document.createElement(t);
  if (c) n.className = c;
  if (txt != null) n.textContent = txt;
  return n;
};

export const svgEl = (t, attrs) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', t);
  if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
  return n;
};

/* ---------- bottom sheet ---------- */
// Every modal in the app is one of these. Returns the backdrop, the panel,
// and a close function. `onClose` fires whichever way it is dismissed.
export function sheet(onClose) {
  const back = el('div', 'sheet-backdrop');
  const sh   = el('div', 'sheet');
  sh.appendChild(el('div', 'sheet-grab'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    sh.remove();
    if (onClose) onClose();
  };
  back.onclick = close;
  document.body.append(back, sh);
  return { back, sh, close };
}

/* ---------- toast ---------- */
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- clipboard ----------
   navigator.clipboard needs a secure context and, on iOS, a gesture it still
   believes in. When it refuses, fall back to a sheet with the text already
   selected — a long-press away rather than a dead end. */
export async function copyText(text, okMsg) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast(okMsg || 'Copied');
      return true;
    }
  } catch {}
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'Copy this'));
  sh.appendChild(noteEl('Your browser wouldn\u2019t hand over the clipboard. Select it all and copy.'));
  const ta = document.createElement('textarea');
  ta.className = 'paste-box';
  ta.value = text;
  ta.readOnly = true;
  sh.appendChild(ta);
  setTimeout(() => { ta.focus(); ta.select(); }, 60);
  const done = el('button', 'btn btn-ghost btn-block', 'Done');
  done.style.marginTop = '10px';
  done.onclick = close;
  sh.appendChild(done);
  return false;
}

/* ---------- files out ----------
   Getting a file off a phone is three different problems. On a touch device
   the share sheet is the way to Files, Mail or a computer, where the Web Share
   API can carry a file (iOS 15+, Android). Elsewhere an anchor download — which
   iOS in home-screen mode quietly ignores, which is why touch devices try the
   share sheet first. Failing both, the copy sheet above, so the data is never
   stuck behind a button that does nothing. Returns how it went out. */
export async function saveText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const touch = (navigator.maxTouchPoints || 0) > 1;
  if (touch && navigator.canShare && typeof File === 'function') {
    try {
      const file = new File([blob], filename, { type: mime });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '') ||
              (/Mac/.test(navigator.platform || '') && (navigator.maxTouchPoints || 0) > 1);
  if (!(ios && navigator.standalone)) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Saved ' + filename);
      return 'downloaded';
    } catch {}
  }
  await copyText(text, 'Copied ' + filename + ' to the clipboard');
  return 'copied';
}

export async function readClipboard() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) return await navigator.clipboard.readText();
  } catch {}
  return null;
}

/* ---------- small text block ---------- */
export function noteEl(txt) {
  return el('div', 'note', txt);
}

/* ---------- numbers ---------- */
export function r1(x) { return Math.round(x * 10) / 10; }
export function trimNum(x) { return String(r1(x)).replace(/\.0$/, ''); }
export function compact(n) {
  const v = Math.abs(n);
  if (v >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

/* ---------- limits ----------
   The most a typed number is allowed to be. Nothing here is a nudge toward a
   sensible value — that is what the target sheets and the You tab are for.
   These only stop a slipped digit, or a bored thumb, from writing a number the
   charts and the weight model then have to live with. Each ceiling sits
   comfortably past the real-world extreme so nobody who is actually training
   ever meets one:
     lb          heaviest living people are in the 600s; 1,400 is the record,
                 and nobody at that weight is logging lifts
     steps       a 100-mile day is roughly 200k
     waterMl     a US gallon is 3,785 ml; 15 l a day is Tour-de-France territory
     cal         the famous Phelps figure is 10,000 kcal; sled-dog racers ~12,000
     entryCal    one food — a whole pizza is ~2,500, a family cake ~8,000
     setW        the leg-press "records" people post are ~2,300 lb
     reps        a single set of 1,000 pushups is a stunt, not a workout
   Each pair is [min, max]. clamp() pulls a value inside; within() just asks. */
export const LIMITS = {
  lb:          [50, 700],      // bodyweight and goal weight
  steps:       [0, 300000],    // one day's total
  stepGoal:    [500, 100000],
  waterMl:     [1, 5000],      // one drink or one preset
  waterGoalMl: [250, 15000],
  cal:         [500, 15000],   // a daily target, a floor, or maintenance
  targetG:     [0, 1000],      // protein or fat target, grams
  entryCal:    [0, 20000],     // one logged food or one library item
  entryG:      [0, 5000],      // one macro on one food, grams
  micro:       [0, 100000],    // fibre in g, sodium in mg — one bound covers both
  servG:       [0.1, 10000],   // grams in one serving
  amount:      [0, 10000],     // servings or grams being logged
  mult:        [0.05, 100],    // the "× how much" multiplier
  setW:        [0, 5000],      // lb on the bar
  reps:        [0, 1000],
  durMin:      [0, 1440],      // a workout can't outlast the day
  rest:        [0, 1800],      // default rest, seconds
  rateWk:      [-5, 5],        // lb per week
  perLb:       [0, 3]          // grams of protein or fat per lb
};
export const clamp  = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
export const within = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;
// A set's weight and reps are kept as the strings the inputs hold, and '' has
// to survive — it is how an unfilled set is told apart from a logged zero.
// Anything else is pulled inside the limit before it is stored.
export function setNum(v, lim, whole = false) {
  if (String(v).trim() === '') return '';
  const n = whole ? parseInt(v) : parseFloat(v);
  return String(clamp(Number.isFinite(n) ? n : 0, lim));
}

/* ---------- dates ---------- */
// Everything parses date keys at T12:00:00 local. Parsing 'YYYY-MM-DD' bare
// gives UTC midnight, which lands on the previous day in western timezones.
// Do not remove the T12:00:00.
export function parseKey(dateKey) { return new Date(dateKey + 'T12:00:00'); }

export function fmtDate(dateKey) {
  return parseKey(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtDateFull(dateKey) {
  return parseKey(dateKey).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
export function fmtDuration(sec) {
  const m = Math.round((sec || 0) / 60);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}

/* ---------- confirm ---------- */
// A styled replacement for window.confirm(). Native confirm() is jarring on
// iOS and cannot be styled; this reads as part of the app.
export function confirmSheet({ title, body, confirmLabel = 'Confirm', danger = false, onConfirm }) {
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, title));
  if (body) sh.appendChild(noteEl(body));

  const go = el('button', 'btn btn-block btn-lg ' + (danger ? 'btn-danger' : 'btn-primary'), confirmLabel);
  go.style.marginTop = '16px';
  go.onclick = () => { close(); onConfirm(); };
  sh.appendChild(go);

  const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancel.style.marginTop = '8px';
  cancel.onclick = close;
  sh.appendChild(cancel);
}

/* ---------- segmented control ---------- */
// options: [[value, label], ...]. Calls onPick(value) when a segment changes.
//
// `sel` has to be a live variable, not the `current` argument. `current` is
// whatever was selected when the control was BUILT, and it never changes — so
// the "don't fire for the segment already chosen" guard used to compare against
// a frozen value and permanently deadlock that one segment. In the water sheet,
// which opens on fl oz, that meant fl oz → ml worked, ml → L worked, and
// nothing could ever get back to fl oz without closing and reopening the sheet.
// Same bug sat in Daily targets and the steps walkthrough, less visibly.
export function segmented(options, current, onPick) {
  const wrap = el('div', 'seg');
  let sel = current;
  options.forEach(([val, label]) => {
    const b = el('button', 'seg-btn' + (val === sel ? ' on' : ''), label);
    b.onclick = () => {
      if (val === sel) return;
      sel = val;
      wrap.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      onPick(val);
    };
    wrap.appendChild(b);
  });
  return wrap;
}

/* ---------- swipe to delete ---------- */
// Wraps a row so dragging it left reveals a delete action.
// Uses Pointer Events so it works with both touch and a mouse.
// `touch-action: pan-y` on .swipe-front lets vertical scrolling stay native
// while horizontal drags come to us.
export function swipeToDelete(row, { onDelete, label = 'Delete', width = 88 }) {
  const wrap  = el('div', 'swipe');
  const back  = el('div', 'swipe-back');
  const btn   = el('button', 'swipe-del', label);
  back.appendChild(btn);
  const front = el('div', 'swipe-front');
  front.appendChild(row);
  wrap.append(back, front);

  let startX = 0, startY = 0, dx = 0, dragging = false, decided = false, open = false;

  const setX = x => { front.style.transform = x ? 'translateX(' + x + 'px)' : ''; };

  btn.onclick = e => { e.stopPropagation(); onDelete(); };

  front.addEventListener('pointerdown', e => {
    // Let form controls keep their normal behaviour.
    if (e.target.closest('input, textarea, select')) return;
    startX = e.clientX; startY = e.clientY;
    dx = 0; dragging = true; decided = false;
    front.classList.add('no-anim');
  });

  front.addEventListener('pointermove', e => {
    if (!dragging) return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;

    if (!decided) {
      // Wait until the gesture has a clear direction before claiming it.
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      if (Math.abs(my) > Math.abs(mx)) { dragging = false; front.classList.remove('no-anim'); return; }
      decided = true;
      try { front.setPointerCapture(e.pointerId); } catch {}
    }

    dx = Math.max(-width - 24, Math.min(0, mx + (open ? -width : 0)));
    setX(dx);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    front.classList.remove('no-anim');
    if (!decided) return;
    open = dx < -width / 2;
    setX(open ? -width : 0);
  };
  front.addEventListener('pointerup', end);
  front.addEventListener('pointercancel', end);

  return wrap;
}
