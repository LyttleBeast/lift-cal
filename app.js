import { login, signup, logout, resetPassword, watchAuth, flushQueue, syncPip,
         LS, uid, isOwner, watchShared } from './store.js';
import { accessState, renderGate, claimInvite, ensureAiRecord, normalizeCode, APPROVED } from './access.js';
import { onboardingState, runSetup, runTour } from './onboarding.js';
import { initWorkout, render as renderWorkout, hasActiveSession, startFresh } from './workout.js';
import { initFood, render as renderFood, openLogFood } from './food.js';
import { initWeight, render as renderWeight } from './weight.js';
import { initSteps, render as renderSteps } from './steps.js';
import { initYou, render as renderYou } from './you.js';
import { initUsage, bump } from './usage.js';

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
// Whether initYou() got far enough that switching to You is safe. Module-level
// because restoreView() is what has to act on it.
let youOk    = true;

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
  // Unawaited on purpose: telemetry is never allowed to delay or break a boot.
  initUsage(user);
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

  // Started before the four tabs, awaited after them. #view-you is the view the
  // markup marks active, so it is what somebody opening the app is looking at —
  // and initYou() paints its skeleton synchronously, before its first await, so
  // starting it here is the difference between a screen with headings on it and
  // a blank one held for every read the four inits below make in turn. Its own
  // reads then overlap theirs instead of queueing behind them.
  const youReady = initYou({ user, go: switchView }).catch(() => { youOk = false; });

  await initWorkout();
  await initFood();
  await initWeight();
  await initSteps();
  // Awaited here because restoreView() has to know whether You built itself
  // before it decides where to put the user.
  await youReady;
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
  // The bump goes before the render so a screen that fails to draw is still
  // counted as a screen somebody went looking for.
  if (name === 'you')     { bump('tabYou');    renderYou(); }
  if (name === 'workout') { bump('tabTrain');  renderWorkout(); }
  if (name === 'food')    { bump('tabFuel');   renderFood(); }
  if (name === 'weight')  { bump('tabWeight'); renderWeight(); }
  if (name === 'steps')   { bump('tabSteps');  renderSteps(); }
}

dock.addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (btn) switchView(btn.dataset.view);
});

/* You is the default now — it is what the app opens on unless the settings hub
   says otherwise. A live workout still outranks all of it: coming back to a
   parked session and landing anywhere else is how sets get lost.
   `openOn` is 'you' | 'workout' | 'last'; 'last' defers to `lastView`, which
   switchView has been writing all along. And if You failed to initialise, we
   send them to Train rather than to a view whose render() will throw next. */
/* Home-screen shortcuts (manifest.json) open the app at #go=<view>[-<action>].
   One-shot: the hash is cleared so a reload lands normally. A live workout is
   left alone — startFresh() never replaces one — but a shortcut to Fuel or
   Weight is honoured over it, the parked session being safe in localStorage. */
function shortcut() {
  const m = /^#go=(you|workout|food|weight|steps)(?:-([a-z]+))?$/.exec(location.hash || '');
  if (!m) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  return { view: m[1], action: m[2] || null };
}

function restoreView() {
  const sc = shortcut();
  if (sc && (sc.view !== 'you' || youOk)) {
    switchView(sc.view);
    if (sc.view === 'food' && sc.action === 'add') openLogFood();
    if (sc.view === 'workout' && sc.action === 'start') startFresh();
    return;
  }
  if (hasActiveSession()) { switchView('workout'); return; }
  let want = youOk ? LS.get('openOn', 'you') : 'workout';
  if (want === 'last') want = LS.get('lastView', 'you');
  if (want === 'you' && !youOk) want = 'workout';
  // switchView toggles `active` by comparing against a view id, so a name that
  // matches no view unsets all five and leaves a blank screen under the dock.
  // A stored `null` reaches here as null rather than the fallback (LS.get tests
  // the raw string, and "null" is truthy), and a settings label saved in place
  // of its value would do the same. Land somewhere real instead.
  if (!document.getElementById('view-' + want)) want = youOk ? 'you' : 'workout';
  switchView(want);
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
