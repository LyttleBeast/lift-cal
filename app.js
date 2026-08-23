import { login, logout, watchAuth, flushQueue, syncPip, LS } from './store.js';
import { initWorkout, render as renderWorkout, hasActiveSession } from './workout.js';
import { initFood, render as renderFood } from './food.js';
import { initWeight, render as renderWeight } from './weight.js';
import { initSteps, render as renderSteps } from './steps.js';

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
      await initFood();
      await initWeight();
      await initSteps();
      restoreView();
    }
  } else {
    // A real sign-out, not the initial null before auth resolves. Every module
    // holds the last account's data in module-level state — dayLog, entries,
    // monthCache, routines, the fitted weight model — and none of it is torn
    // down. Reloading is the only way to be certain the next account starts
    // clean. `booted` distinguishes the two cases; without that check this
    // would reload forever on a signed-out first load.
    if (booted) { location.reload(); return; }
    authEl.classList.remove('hidden');
    booted = false;
    const btn = $('#authBtn');
    btn.disabled = false; btn.textContent = 'Sign in';
  }
});

/* ================= DOCK ROUTER ================= */
const dock = $('#dock');

function switchView(name) {
  dock.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  LS.set('lastView', name);
  if (name === 'workout') renderWorkout();
  if (name === 'food')    renderFood();
  if (name === 'weight')  renderWeight();
  if (name === 'steps')   renderSteps();
}

dock.addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (btn) switchView(btn.dataset.view);
});

function restoreView() {
  const last = LS.get('lastView', 'workout');
  if (last !== 'workout' && !hasActiveSession()) switchView(last);
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
