import { login, logout, watchAuth, flushQueue, syncPip, feedUrl, LS } from './store.js';
import { initWorkout, render as renderWorkout, hasActiveSession, toast } from './workout.js';

const $ = s => document.querySelector(s);

/* ================= AUTH ================= */
const authEl = $('#auth');

$('#authBtn').onclick = doLogin;
$('#authPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const email = $('#authEmail').value.trim();
  const pass  = $('#authPass').value;
  const err   = $('#authErr');
  const btn   = $('#authBtn');

  if (!email || !pass) { err.textContent = 'Enter your email and password.'; return; }

  btn.disabled = true; btn.textContent = 'Signing in\u2026'; err.textContent = '';
  try {
    await login(email, pass);
  } catch (e) {
    const map = {
      'auth/invalid-credential': 'That email and password don\u2019t match an account.',
      'auth/invalid-email':      'That email address isn\u2019t formatted correctly.',
      'auth/user-not-found':     'No account with that email.',
      'auth/wrong-password':     'Wrong password.',
      'auth/too-many-requests':  'Too many attempts. Wait a minute and try again.',
      'auth/network-request-failed': 'No connection. Check your signal and try again.'
    };
    err.textContent = map[e.code] || 'Sign-in failed. Try again.';
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}

let booted = false;

watchAuth(async user => {
  if (user) {
    authEl.classList.add('hidden');
    syncPip();
    if (!booted) {
      booted = true;
      await flushQueue();
      await initWorkout();
      mountFood();
      mountWeight();
    }
  } else {
    authEl.classList.remove('hidden');
    booted = false;
    const btn = $('#authBtn');
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

/* ================= DOCK ROUTER ================= */
const dock = $('#dock');
dock.addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  const name = btn.dataset.view;

  dock.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));

  LS.set('lastView', name);
  if (name === 'workout') renderWorkout();
});

/* ================= PHASE 2 / 3 PLACEHOLDERS ================= */
function placeholder(title, body, note) {
  const wrap = document.createElement('div');
  wrap.className = 'screen-pad';
  wrap.innerHTML = `
    <div class="empty-state" style="padding-top:90px">
      <h3>${title}</h3>
      <p>${body}</p>
      <p style="color:var(--dim);font-size:12px;max-width:280px;margin:0 auto">${note}</p>
    </div>`;
  return wrap;
}

function mountFood() {
  $('#view-food').appendChild(placeholder(
    'Nutrition',
    'Not built yet.',
    'Phase 2: barcode scanning, manual entry, macro targets, micronutrients, and Claude deep-link logging.'
  ));
}

function mountWeight() {
  const w = placeholder(
    'Body weight',
    'Not built yet.',
    'Phase 3: weight log with 7-day moving average, weekly rate of change, and time-of-day breakdown.'
  );

  // Settings live here for now so the Claude link is reachable on day one.
  const card = document.createElement('div');
  card.className = 'card';
  card.style.marginTop = '20px';
  card.innerHTML = `<div class="card-hd"><div class="eyebrow">Settings</div></div>`;

  const linkBtn = document.createElement('button');
  linkBtn.className = 'btn btn-ghost btn-block';
  linkBtn.textContent = 'Copy Claude link';
  linkBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(feedUrl()); toast('Link copied'); }
    catch { prompt('Copy this:', feedUrl()); }
  };
  card.appendChild(linkBtn);

  const restRow = document.createElement('div');
  restRow.className = 'field';
  restRow.style.marginTop = '12px';
  restRow.innerHTML = `<label for="restDef">Default rest (seconds)</label>`;
  const restIn = document.createElement('input');
  restIn.id = 'restDef'; restIn.type = 'number'; restIn.inputMode = 'numeric';
  restIn.value = LS.get('restDefault', 150);
  restIn.onchange = e => { LS.set('restDefault', parseInt(e.target.value) || 150); toast('Rest updated'); };
  restRow.appendChild(restIn);
  card.appendChild(restRow);

  const out = document.createElement('button');
  out.className = 'btn btn-danger btn-block';
  out.style.marginTop = '12px';
  out.textContent = 'Sign out';
  out.onclick = () => {
    if (hasActiveSession() && !confirm('You have a workout in progress. Sign out anyway?')) return;
    logout();
  };
  card.appendChild(out);

  w.appendChild(card);
  $('#view-weight').appendChild(w);
}

/* ================= PWA ================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Keep an in-progress workout from being lost to an accidental refresh.
window.addEventListener('beforeunload', e => {
  if (hasActiveSession()) { e.preventDefault(); e.returnValue = ''; }
});
