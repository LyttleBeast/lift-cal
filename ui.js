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
export function segmented(options, current, onPick) {
  const wrap = el('div', 'seg');
  options.forEach(([val, label]) => {
    const b = el('button', 'seg-btn' + (val === current ? ' on' : ''), label);
    b.onclick = () => {
      if (val === current) return;
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
