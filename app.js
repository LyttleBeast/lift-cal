import { login, signup, logout, resetPassword, watchAuth, flushQueue, syncPip,
         LS, uid, isOwner, watchShared } from './store.js';
import { accessState, renderGate, claimInvite, ensureAiRecord, normalizeCode, APPROVED } from './access.js';
import { onboardingState, runSetup, runTour } from './onboarding.js';
import { initWorkout, render as renderWorkout, hasActiveSession } from './workout.js';
import { initFood, render as renderFood } from './food.js';
import { initWeight, render as renderWeight } from './weight.js';
import { initSteps, render as renderSteps } from './steps.js';

const $ = s => document.querySelector(s);

/* ================= AUTH =================
   Three states, and it matters that they are three and not two:

     signed out        -> #auth, the sign-in / create-account box
     signed in, no access record -> #gate, the waiting screen (access.js)
     signed in, approved -> the app

   The middle one is the one a single-user app never needs and a two-user app
   cannot do without. An account can exist in Firebase Auth and have no right
   to a single byte of data, because the database rules gate on a node the
   owner controls, not on whether you managed to sign in. Telling that person
   "sign-in failed" would be false and would send them hunting for a typo. */

const authEl  = $('#auth');
const authBox = $('#authBox');
const err  = $('#authErr');
const okMsg = $('#authOk');
const btn  = $('#authBtn');

// Carried from the sign-up form to just after the account is created, so
// somebody who typed a code never sees the waiting screen at all.
let pendingCode = null;

function mode() { return authBox.dataset.mode; }

function setMode(m) {
  authBox.dataset.mode = m;
  $('#authTitle').textContent = m === 'up' ? 'Create your account' : 'Sign in';
  $('#authSub').textContent   = m === 'up'
    ? 'Rack is invite-only while it’s in testing.'
    : 'Your training log, your account.';
  btn.textContent = m === 'up' ? 'Create account' : 'Sign in';
  $('#authSwap').textContent  = m === 'up' ? 'I already have an account' : 'Create an account';
  $('#authPass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
  err.textContent = ''; okMsg.textContent = '';
}

$('#authSwap').onclick = () => setMode(mode() === 'up' ? 'in' : 'up');

$('#authForgot').onclick = async () => {
  const email = $('#authEmail').value.trim();
  err.textContent = ''; okMsg.textContent = '';
  if (!email) { err.textContent = 'Type your email above first, then tap this.'; return; }
  try {
    await resetPassword(email);
    // Deliberately the same answer whether or not the address is registered —
    // otherwise this form is a way to find out who has an account.
    okMsg.textContent = 'If that address has an account, a reset link is on its way.';
  } catch (e) {
    okMsg.textContent = 'If that address has an account, a reset link is on its way.';
  }
};

const AUTH_ERRORS = {
  'auth/invalid-credential':      'That email and password don’t match an account.',
  'auth/invalid-email':           'That email address isn’t formatted correctly.',
  'auth/user-not-found':          'No account with that email.',
  'auth/wrong-password':          'Wrong password.',
  'auth/too-many-requests':       'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed':  'No connection. Check your signal and try again.',
  'auth/email-already-in-use':    'There’s already an account with that email — try signing in.',
  'auth/weak-password':           'That password is too short. Use at least 8 characters.',
  'auth/operation-not-allowed':   'Sign-ups are switched off in the Firebase console.'
};

$('#authBtn').onclick = submitAuth;
['authEmail', 'authPass', 'authName', 'authCode'].forEach(id => {
  const n = $('#' + id);
  if (n) n.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });
});

async function submitAuth() {
  const up    = mode() === 'up';
  const email = $('#authEmail').value.trim();
  const pass  = $('#authPass').value;
  const name  = $('#authName').value.trim();
  const code  = $('#authCode').value.trim();

  err.textContent = ''; okMsg.textContent = '';
  if (!email || !pass) { err.textContent = 'Enter your email and password.'; return; }
  if (up && !name)     { err.textContent = 'What should the app call you?'; return; }
  if (up && pass.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
  if (up && code && !normalizeCode(code)) {
    err.textContent = 'That code should be 10 characters, like ABCDE-FGHJK.'; return;
  }

  btn.disabled = true;
  btn.textContent = up ? 'Creating…' : 'Signing in…';
  pendingCode = up ? (code || null) : null;

  try {
    if (up) await signup(email, pass, name);
    else    await login(email, pass);
    // watchAuth takes it from here.
  } catch (e) {
    pendingCode = null;
    err.textContent = AUTH_ERRORS[e.code] || (up ? 'Couldn’t create that account.' : 'Sign-in failed. Try again.');
    btn.disabled = false;
    btn.textContent = up ? 'Create account' : 'Sign in';
  }
}

/* ================= BOOT ================= */

let booted   = false;
let gateOpen = false;

watchAuth(async user => {
  if (user) {
    authEl.classList.add('hidden');
    if (booted) return;

    let acc;
    try { acc = await accessState(user); }
    catch { acc = { state: 'pending' }; }

    // A code typed on the sign-up form: spend it now rather than showing the
    // waiting screen and asking for it a second time.
    if (acc.state !== APPROVED && pendingCode) {
      const res = await claimInvite(pendingCode, user);
      pendingCode = null;
      if (res.ok) acc = { state: APPROVED };
    }

    if (acc.state !== APPROVED) {
      gateOpen = true;
      renderGate(user, () => { gateOpen = false; boot(user); });
      return;
    }
    await boot(user);
  } else {
    // A real sign-out, not the initial null before auth resolves. Every module
    // holds the last account's data in module-level state — dayLog, entries,
    // monthCache, routines, the fitted weight model — and none of it is torn
    // down. Reloading is the only way to be certain the next account starts
    // clean. `booted`/`gateOpen` distinguish the two cases; without that check
    // this would reload forever on a signed-out first load.
    if (booted || gateOpen) { location.reload(); return; }
    authEl.classList.remove('hidden');
    document.getElementById('gate').classList.add('hidden');
    booted = false;
    btn.disabled = false;
    setMode('in');
  }
});

async function boot(user) {
  if (booted) return;
  booted = true;

  syncPip();
  ensureAiRecord(user.uid);
  watchRevocation(user.uid);
  await flushQueue();

  // Setup runs before the tabs initialise, because what it writes — targets, a
  // first weigh-in, a water goal, a step goal — is what they read at boot.
  let wantTour = false;
  try {
    const ob = await onboardingState();
    wantTour = ob.needsTour;
    if (ob.needsSetup) {
      const res = await runSetup(user);
      wantTour = !res.skipped;
    }
  } catch {}

  await initWorkout();
  await initFood();
  await initWeight();
  await initSteps();
  restoreView();

  if (wantTour) {
    try { await runTour(switchView); } catch {}
  }
}

/* If the owner removes somebody while their app is open, every listener they
   hold starts failing permission and the screen quietly goes stale. Watching
   the one node the rules check turns that into a clean bounce back to the
   waiting screen. */
function watchRevocation(u) {
  if (isOwner()) return;
  let seen = false;
  watchShared('access/approved/' + u, v => {
    if (v) { seen = true; return; }
    if (seen) location.reload();
  });
}

/* ================= DOCK ROUTER ================= */
const dock = $('#dock');

export function switchView(name) {
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

/* Settings needs to be able to replay the tour without importing app.js and
   creating a cycle. */
window.__rackTour = () => runTour(switchView);

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
