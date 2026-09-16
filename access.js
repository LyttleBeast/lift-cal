// Who is allowed in.
//
// The thing to understand first, because every decision here follows from it:
// creating a Firebase Auth account is NOT what gets you into Rack. It can't be.
// The API key sits in firebase-config.js in a public repo, and anybody who
// reads it can call Google's signUp endpoint by hand and have an account thirty
// seconds later. No amount of JavaScript on the sign-up screen changes that,
// and a gate you can walk around is worse than no gate because you stop
// checking the real one.
//
// So the real one is a single node in the database:
//
//     access/approved/{uid}
//
// The security rules require it to exist before that uid can read or write one
// byte under users/{uid}. Only the owner can create it — with one exception,
// below. An account without it is a name in Firebase Auth and nothing else:
// it holds no data, it can see no data, and it costs nothing to leave lying
// around.
//
// Two doors lead to that node:
//
//   Invite code — the owner makes a code, the code is one node under
//     access/invites/{CODE}, and claiming it is a single atomic multi-path
//     write that creates the approval and stamps the code used in the same
//     operation. The rules refuse the write if the code doesn't exist, is
//     already claimed, or has been revoked, so the check is not something this
//     file does politely — it is something the database does.
//
//   Request — no code, so the account files access/requests/{uid} and waits.
//     The owner sees it, approves it, and a live listener on the waiting
//     phone lets them in without a refresh.
//
// Both doors end at the same allowlist, which is the point: adding the third
// person later is the same code path as adding the second.

import { logout, readShared, writeShared, removeShared, updateShared, watchShared } from './store.js';
import { OWNER_UID } from './firebase-config.js';
import { capabilitiesFor, effectiveType, trialDaysLeft, isOwnerUid } from './accounts.js';
import { el, noteEl, fmtDateFull } from './ui.js';

export const APPROVED = 'approved';
export const PENDING   = 'pending';

const P_APPROVED = 'access/approved/';
const P_INVITES  = 'access/invites/';
const P_REQUESTS = 'access/requests/';
const P_AI       = 'aiAllow/';

/* ================= invite codes ================= */

// No 0/O/1/I/L. A code gets read off a screen and typed on a phone, and
// "was that a one or an el" is how a working code becomes a support request.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]);
  return chars.slice(0, 5).join('') + '-' + chars.slice(5).join('');
}

// 31^10 is about 8x10^14. Firebase throttles auth long before that is a
// concern, and every guess costs the guesser an account they cannot use.
export function normalizeCode(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 10) return null;
  if ([...clean].some(c => !ALPHABET.includes(c))) return null;
  return clean.slice(0, 5) + '-' + clean.slice(5);
}

/* ================= reading the current account's standing ================= */

/* Returns 'approved' or 'pending'. Deliberately fails CLOSED: if the read
   throws — offline, rules rejected it, anything — the answer is pending, and
   the app stays behind the gate rather than booting into modules that will
   spray permission errors at a database that has already said no. */
export async function accessState(user) {
  if (!user) return { state: PENDING, record: null, request: null };

  // The owner is approved by the rules themselves, so his own record existing
  // is a convenience (it makes him show up in his own People list), never a
  // condition of him getting in. This is the anti-lockout path: even with the
  // access tree wiped, Micah's app still opens.
  if (user.uid === OWNER_UID) {
    const rec = await readShared(P_APPROVED + user.uid, null);
    if (!rec) await ensureOwnerRecord(user);
    return { state: APPROVED, record: rec || { at: Date.now(), via: 'owner' }, request: null };
  }

  const rec = await readShared(P_APPROVED + user.uid, null);
  if (rec) return { state: APPROVED, record: rec, request: null };

  const req = await readShared(P_REQUESTS + user.uid, null);
  return { state: PENDING, record: null, request: req };
}

/* The waiting screen subscribes to this. When the owner taps Approve on his
   phone, the node appears here within a second and the gate opens itself —
   which is the difference between "an app" and "a thing you have to be told
   to reload". */
export function watchApproval(u, cb) {
  if (!u) return () => {};
  return watchShared(P_APPROVED + u, v => { if (v) cb(v); });
}

export async function ensureOwnerRecord(user) {
  try {
    await writeShared(P_APPROVED + user.uid, {
      at: Date.now(), via: 'owner',
      name: (user.displayName || 'Owner').slice(0, 60),
      email: (user.email || '').slice(0, 120)
    });
  } catch {}
}

/* The AI estimator's switch. The Worker reads aiAllow/{uid} over plain HTTPS —
   it has no Firebase credentials of its own — so this node is readable by
   anyone who already knows the uid, and holds nothing but two booleans. An
   approved account may turn its own `on` flag on; only the owner can set
   `blocked`, and blocked wins. That split is what lets the roommate get the
   estimator the moment he claims a code, while leaving Micah a switch that the
   roommate cannot flip back. The per-day limits are NOT here — they live in
   the Worker's settings, where no client can reach them. */
export async function ensureAiRecord(u) {
  if (!u) return;
  try {
    const cur = await readShared(P_AI + u + '/on', null);
    if (cur !== true) await writeShared(P_AI + u + '/on', true);
  } catch {}
}

/* ================= the two doors ================= */

export async function claimInvite(rawCode, user) {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: 'That code doesn’t look right — it’s 10 characters, like ABCDE-FGHJK.' };

  const invite = await readShared(P_INVITES + code, null);
  if (!invite)          return { ok: false, message: 'No invite with that code. Check it and try again.' };
  if (invite.revoked)   return { ok: false, message: 'That code has been turned off.' };
  if (invite.usedBy)    return { ok: false, message: 'That code has already been used.' };

  // One atomic write. The approval and the used-stamp land together or neither
  // lands: the rules check the invite is unclaimed as part of allowing the
  // approval, so there is no window where a code is spent without letting
  // anyone in, or someone is let in without spending the code.
  try {
    await updateShared({
      [P_APPROVED + user.uid]: {
        at: Date.now(), via: 'invite', code,
        name:  (user.displayName || '').slice(0, 60),
        email: (user.email || '').slice(0, 120)
      },
      [P_INVITES + code + '/usedBy']: user.uid,
      [P_INVITES + code + '/usedAt']: Date.now()
    });
  } catch (e) {
    return { ok: false, message: 'That code couldn’t be used — somebody may have just claimed it.' };
  }

  await ensureAiRecord(user.uid);
  return { ok: true };
}

export async function submitRequest(user, { name, note }) {
  try {
    await writeShared(P_REQUESTS + user.uid, {
      at: Date.now(),
      name:  String(name || user.displayName || '').slice(0, 60),
      email: String(user.email || '').slice(0, 120),
      note:  String(note || '').slice(0, 300)
    });
    return { ok: true };
  } catch {
    return { ok: false, message: 'Couldn’t send that request. Check your connection and try again.' };
  }
}

export function cancelRequest(u) { return removeShared(P_REQUESTS + u).catch(() => {}); }

/* ================= owner actions ================= */

export async function approve(reqUid, req) {
  await updateShared({
    [P_APPROVED + reqUid]: {
      at: Date.now(), via: 'owner',
      name:  String((req && req.name) || '').slice(0, 60),
      email: String((req && req.email) || '').slice(0, 120)
    },
    [P_REQUESTS + reqUid]: null,
    [P_AI + reqUid + '/on']: true
  });
}

export function decline(reqUid) { return removeShared(P_REQUESTS + reqUid); }

/* Revoking does not delete anybody's data. It removes the one node the rules
   check, so the account stops being able to read or write its own subtree from
   the next request onward; the training log stays exactly where it is, in case
   this was a mistake or a falling-out that gets patched up. */
export async function revoke(targetUid) {
  if (targetUid === OWNER_UID) throw new Error('refusing to revoke the owner');
  await updateShared({
    [P_APPROVED + targetUid]: null,
    [P_AI + targetUid + '/on']: false,
    /* The type went with the approval record; its derived limits are in a
       different tree and would not have. That leaves one bad shape behind:
       LOCKED derives aiAllow 0 / 0 / $0 with blocked set, and a locked account
       that is then removed keeps all of it. Whichever door they come back
       through later — approved again, or a fresh invite code they claim
       themselves — they would land on an account that opens perfectly well and
       whose estimator refuses every call, with nothing on any screen saying
       why. Neither door can clear these keys: they are owner-only, and this is
       the last moment the owner is here. So clear them now, and let the next
       grant start from the Worker's defaults like any new account.

       This is the permissions, not their data. The training log, the food log
       and every weigh-in stay exactly where they are — that promise is about
       users/{uid} and it is unchanged. */
    [P_AI + targetUid + '/blocked']: false,
    [P_AI + targetUid + '/photoPerDay']: null,
    [P_AI + targetUid + '/textPerDay']: null,
    [P_AI + targetUid + '/monthlyUsd']: null
  });
}

export function setAiBlocked(targetUid, blocked) {
  return writeShared(P_AI + targetUid + '/blocked', !!blocked);
}

export async function createInvite(note) {
  const code = generateCode();
  await writeShared(P_INVITES + code, {
    at: Date.now(),
    note: String(note || '').slice(0, 80)
  });
  return code;
}

export function revokeInvite(code) { return writeShared(P_INVITES + code + '/revoked', true); }
export function deleteInvite(code) { return removeShared(P_INVITES + code); }

export function listRequests() { return readShared('access/requests', null); }
export function listApproved() { return readShared('access/approved', null); }
export function listInvites()  { return readShared('access/invites', null); }

/* ================= what THIS account may do =================

   accounts.js is pure and answers about any account. This is the live wrapper
   over it for the one account that is signed in: worked out once at boot from
   the record accessState() has already read, and held for the app to ask.

   It is the only thing the rest of the app talks to about entitlements, which
   is the point — capabilitiesFor() stays the single choke point and this is the
   only cached copy of its answer.

   Before boot sets it, and after any failure, capabilities() answers with the
   basic set: full ordinary access, the Worker's own limits. Nothing in this
   file can answer "no" by accident. */

let CAPS = null;

export function initCapabilities(u, record) {
  try { CAPS = capabilitiesFor(u || '', record, Date.now()); }
  catch { CAPS = null; }
  return capabilities();
}

export function capabilities() {
  // capabilitiesFor('', null) is the basic set by construction — see the
  // fail-open promise at the top of accounts.js.
  return CAPS || capabilitiesFor('', null, Date.now());
}

// The estimator's gate on the client. The Worker is still the one that counts;
// this is so the app does not offer a button that is going to come back refused.
export function canUseAi() { return capabilities().aiAccess !== false; }

/* Whether to show the app at all. Deliberately narrow: the owner is never
   paused, an absent or unreadable record is never paused, and any throw at all
   is never paused. The only two roads here are an explicit stored 'locked' and
   a trial with a real end date that has really passed. */
export function isAccessPaused(u, record) {
  try {
    if (isOwnerUid(u)) return false;
    return capabilitiesFor(u, record, Date.now()).appAccess === false;
  } catch {
    return false;
  }
}

/* The paused screen. Same host and the same furniture as the waiting screen —
   it is the same situation from the person's side: signed in, and not through
   the door. It watches the record it is standing on, so the moment the owner
   changes the type the app lets itself back in without anybody being told to
   reload. */
export function renderPaused(user, record) {
  const host = document.getElementById('gate');
  host.innerHTML = '';
  host.classList.remove('hidden');

  const expired = effectiveType(user.uid, record, Date.now()) === 'locked' &&
                  record && typeof record.trialEndsAt === 'number' && record.type === 'trial';

  const stop = watchShared(P_APPROVED + user.uid, v => {
    // Only ever opens the door, never closes it: a read that came back null is
    // a revocation, and app.js's own watcher already handles that.
    if (v && !isAccessPaused(user.uid, v)) location.reload();
  });

  const box = el('div', 'auth-box gate-box');

  const mark = el('div', 'auth-mark');
  ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8'].forEach((c, i) => {
    const b = el('i');
    b.style.background = c;
    b.style.animationDelay = (i * 60) + 'ms';
    mark.appendChild(b);
  });
  box.appendChild(mark);

  const wrap = el('div', 'gate-body');
  wrap.appendChild(el('h1', 'gate-title', expired ? 'Your trial has ended' : 'Access paused'));
  wrap.appendChild(noteEl(
    expired
      ? 'The trial on this account finished ' + fmtDateFull(dayKeyOf(record.trialEndsAt)) + '. Everything you logged is still here and none of it has been deleted — ask Micah to carry the account on and it all comes straight back.'
      : 'Micah has paused this account. Nothing you logged has been deleted and nothing has been changed — ask him to switch it back on and it is all still here.'));

  const pill = el('div', 'gate-pending');
  pill.appendChild(el('span', 'dot'));
  pill.appendChild(el('span', null, 'This screen unlocks itself the moment he does'));
  wrap.appendChild(pill);

  const again = el('button', 'btn btn-ghost btn-block', 'Check again');
  again.onclick = () => location.reload();
  wrap.appendChild(again);

  const who = el('div', 'gate-who');
  who.appendChild(el('span', null, 'Signed in as ' + (user.email || '')));
  const out = el('button', 'linkish', 'Sign out');
  out.onclick = () => { stop && stop(); logout(); };
  who.appendChild(out);
  wrap.appendChild(who);

  box.appendChild(wrap);
  host.appendChild(box);
}

/* "6 days left in trial", in the corner, once. Small on purpose: it is a fact
   somebody wants available, not a thing to be sold to every time they open the
   app. Tapping it puts it away until the next launch. Nothing is drawn at all
   when there is no countdown to give — a trial with no end date does not
   expire, and a banner counting down from nothing would be a lie. */
export function mountTrialBanner(u, record) {
  try {
    if (effectiveType(u, record, Date.now()) !== 'trial') return;
    const left = trialDaysLeft(record, Date.now());
    if (left === null) return;
    document.querySelector('.trial-bar')?.remove();
    const bar = el('button', 'trial-bar',
      left === 0 ? 'Trial ends today' : left + ' day' + (left === 1 ? '' : 's') + ' left in trial');
    bar.onclick = () => bar.remove();
    document.body.appendChild(bar);
  } catch {}
}

/* ================= the waiting screen ================= */

/* Shown to a signed-in account with no approval record. It is a full screen
   rather than a message on the sign-in box, because the account IS signed in —
   telling them "sign in failed" would be a lie and would send them round the
   login loop forever looking for a typo that isn't there. */
export function renderGate(user, onGranted) {
  const host = document.getElementById('gate');
  host.innerHTML = '';
  host.classList.remove('hidden');

  let stop = watchApproval(user.uid, async () => {
    await ensureAiRecord(user.uid);
    stop && stop();
    host.classList.add('hidden');
    onGranted();
  });

  const box = el('div', 'auth-box gate-box');

  const mark = el('div', 'auth-mark');
  ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8'].forEach((c, i) => {
    const b = el('i');
    b.style.background = c;
    b.style.animationDelay = (i * 60) + 'ms';
    mark.appendChild(b);
  });
  box.appendChild(mark);

  readShared(P_REQUESTS + user.uid, null).then(req => {
    body(req);
  });

  function body(req) {
    box.querySelectorAll('.gate-body').forEach(n => n.remove());
    const wrap = el('div', 'gate-body');

    if (req) {
      wrap.appendChild(el('h1', 'gate-title', 'Waiting on approval'));
      wrap.appendChild(noteEl('Your request went to Micah. This screen unlocks by itself the moment he approves it — you don’t need to reload or sign in again.'));

      const pill = el('div', 'gate-pending');
      pill.appendChild(el('span', 'dot'));
      pill.appendChild(el('span', null, 'Requested ' + fmtDateFull(dayKeyOf(req.at))));
      wrap.appendChild(pill);

      wrap.appendChild(el('div', 'gate-sep', 'or, if you have a code'));
      wrap.appendChild(codeField());

      const cancel = el('button', 'btn btn-ghost btn-block', 'Cancel my request');
      cancel.style.marginTop = '10px';
      cancel.onclick = async () => { await cancelRequest(user.uid); body(null); };
      wrap.appendChild(cancel);
    } else {
      wrap.appendChild(el('h1', 'gate-title', 'One more step'));
      wrap.appendChild(noteEl('Rack is invite-only while it’s being tested. Enter the code Micah gave you, or ask him for access and he’ll get a note.'));
      wrap.appendChild(codeField());
      wrap.appendChild(el('div', 'gate-sep', 'or'));
      wrap.appendChild(requestForm());
    }

    const who = el('div', 'gate-who');
    who.appendChild(el('span', null, 'Signed in as ' + (user.email || '')));
    const out = el('button', 'linkish', 'Sign out');
    out.onclick = () => { stop && stop(); logout(); };
    who.appendChild(out);
    wrap.appendChild(who);

    box.appendChild(wrap);
  }

  function codeField() {
    const f = el('div', 'field');
    const l = el('label', null, 'Invite code');
    l.setAttribute('for', 'gateCode');
    f.appendChild(l);
    const i = el('input');
    i.id = 'gateCode'; i.type = 'text'; i.placeholder = 'ABCDE-FGHJK';
    i.autocapitalize = 'characters'; i.spellcheck = false; i.maxLength = 12;
    i.className = 'code-input';
    f.appendChild(i);
    const err = el('div', 'auth-err');
    f.appendChild(err);

    const go = el('button', 'btn btn-primary btn-block', 'Unlock Rack');
    go.style.marginTop = '10px';
    const submit = async () => {
      err.textContent = '';
      go.disabled = true; go.textContent = 'Checking…';
      const res = await claimInvite(i.value, user);
      if (res.ok) { stop && stop(); host.classList.add('hidden'); onGranted(); return; }
      err.textContent = res.message;
      go.disabled = false; go.textContent = 'Unlock Rack';
    };
    go.onclick = submit;
    i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    f.appendChild(go);
    return f;
  }

  function requestForm() {
    const f = el('div');
    const nf = el('div', 'field');
    const nl = el('label', null, 'Your name');
    nl.setAttribute('for', 'gateName');
    nf.appendChild(nl);
    const ni = el('input');
    ni.id = 'gateName'; ni.type = 'text'; ni.autocomplete = 'name';
    ni.value = user.displayName || '';
    nf.appendChild(ni);
    f.appendChild(nf);

    const tf = el('div', 'field');
    const tl = el('label', null, 'Anything he should know (optional)');
    tl.setAttribute('for', 'gateNote');
    tf.appendChild(tl);
    const ti = document.createElement('textarea');
    ti.id = 'gateNote'; ti.rows = 2; ti.maxLength = 300;
    ti.placeholder = 'It’s Sam from down the hall';
    tf.appendChild(ti);
    f.appendChild(tf);

    const err = el('div', 'auth-err');
    f.appendChild(err);

    const go = el('button', 'btn btn-ghost btn-block', 'Ask for access');
    go.onclick = async () => {
      if (!ni.value.trim()) { err.textContent = 'A name helps him know who this is.'; return; }
      go.disabled = true; go.textContent = 'Sending…';
      const res = await submitRequest(user, { name: ni.value.trim(), note: ti.value.trim() });
      if (res.ok) { body(await readShared(P_REQUESTS + user.uid, null)); return; }
      err.textContent = res.message;
      go.disabled = false; go.textContent = 'Ask for access';
    };
    f.appendChild(go);
    return f;
  }

  host.appendChild(box);
}

function dayKeyOf(ms) {
  const d = new Date(ms || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
