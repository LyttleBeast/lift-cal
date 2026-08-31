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

import { uid, isOwner, auth, logout,
         readShared, writeShared, removeShared, updateShared, watchShared } from './store.js';
import { OWNER_UID } from './firebase-config.js';
import { el, sheet, toast, noteEl, confirmSheet, copyText, fmtDateFull } from './ui.js';

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
    [P_AI + targetUid + '/on']: false
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

/* ================= the owner's People screen ================= */

export function openPeople() {
  if (!isOwner()) return;
  const { sh, close } = sheet();
  sh.appendChild(el('h2', null, 'People & access'));
  const body = el('div');
  sh.appendChild(body);

  const done = el('button', 'btn btn-ghost btn-block', 'Done');
  done.style.marginTop = '14px';
  done.onclick = close;
  sh.appendChild(done);

  draw();

  async function draw() {
    body.innerHTML = '';
    body.appendChild(noteEl('Loading…'));
    const [requests, approved, invites] = await Promise.all([listRequests(), listApproved(), listInvites()]);
    body.innerHTML = '';

    /* ---- requests waiting ---- */
    const reqs = Object.entries(requests || {}).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    const rh = el('div', 'people-head');
    rh.appendChild(el('div', 'eyebrow', 'Requests'));
    if (reqs.length) rh.appendChild(el('span', 'badge', String(reqs.length)));
    body.appendChild(rh);

    if (!reqs.length) {
      body.appendChild(noteEl('Nobody waiting.'));
    } else {
      reqs.forEach(([u, r]) => {
        const row = el('div', 'person');
        const main = el('div', 'person-main');
        main.appendChild(el('div', 'person-name', r.name || '(no name)'));
        main.appendChild(el('div', 'person-sub', r.email || ''));
        if (r.note) main.appendChild(el('div', 'person-note', '“' + r.note + '”'));
        row.appendChild(main);

        const acts = el('div', 'person-acts');
        const yes = el('button', 'btn btn-primary btn-sm', 'Approve');
        yes.onclick = async () => {
          yes.disabled = true;
          try { await approve(u, r); toast((r.name || 'They') + ' can get in now'); }
          catch { toast('Couldn’t approve — try again'); }
          draw();
        };
        const no = el('button', 'btn btn-ghost btn-sm', 'Decline');
        no.onclick = () => confirmSheet({
          title: 'Decline this request?',
          body: 'They can ask again later. Nothing is created for them.',
          confirmLabel: 'Decline', danger: true,
          onConfirm: async () => { await decline(u); draw(); }
        });
        acts.append(yes, no);
        row.appendChild(acts);
        body.appendChild(row);
      });
    }

    /* ---- who is in ---- */
    body.appendChild(el('div', 'eyebrow people-gap', 'Has access'));
    const people = Object.entries(approved || {}).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    if (!people.length) body.appendChild(noteEl('Nobody yet.'));

    for (const [u, rec] of people) {
      const row = el('div', 'person');
      const main = el('div', 'person-main');
      const nm = el('div', 'person-name', (rec.name || rec.email || u.slice(0, 10)) + (u === OWNER_UID ? ' (you)' : ''));
      main.appendChild(nm);
      main.appendChild(el('div', 'person-sub',
        (rec.email ? rec.email + ' · ' : '') +
        (rec.via === 'invite' ? 'used a code' : 'approved by you')));
      row.appendChild(main);

      const acts = el('div', 'person-acts');
      if (u !== OWNER_UID) {
        const ai = el('button', 'btn btn-ghost btn-sm', 'AI…');
        ai.onclick = async () => {
          const blocked = await readShared(P_AI + u + '/blocked', false);
          confirmSheet({
            title: blocked ? 'Give them the AI estimator back?' : 'Turn off their AI estimator?',
            body: blocked
              ? 'They’ll be able to photograph and describe meals again, 3 of each a day.'
              : 'They keep the whole app — they just lose photo and describe, and stop spending your Anthropic credit.',
            confirmLabel: blocked ? 'Turn back on' : 'Turn off',
            danger: !blocked,
            onConfirm: async () => {
              await setAiBlocked(u, !blocked);
              toast(blocked ? 'AI back on for them' : 'AI off for them');
            }
          });
        };
        acts.appendChild(ai);

        const rev = el('button', 'btn btn-danger btn-sm', 'Remove');
        rev.onclick = () => confirmSheet({
          title: 'Remove ' + (rec.name || 'this person') + '?',
          body: 'They lose access immediately. Their own log is not deleted — if you add them back it is all still there.',
          confirmLabel: 'Remove', danger: true,
          onConfirm: async () => { await revoke(u); toast('Removed'); draw(); }
        });
        acts.appendChild(rev);
      }
      row.appendChild(acts);
      body.appendChild(row);
    }

    /* ---- invite codes ---- */
    body.appendChild(el('div', 'eyebrow people-gap', 'Invite codes'));
    body.appendChild(noteEl('A code lets somebody in without waiting on you. Each one works once.'));

    const codes = Object.entries(invites || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    codes.forEach(([code, inv]) => {
      const row = el('div', 'person');
      const main = el('div', 'person-main');
      const c = el('div', 'person-name code-input', code);
      main.appendChild(c);
      const state = inv.revoked ? 'turned off'
                  : inv.usedBy ? 'used'
                  : 'ready';
      main.appendChild(el('div', 'person-sub' + (state === 'ready' ? ' live' : ''),
        state + (inv.note ? ' · ' + inv.note : '')));
      row.appendChild(main);

      const acts = el('div', 'person-acts');
      if (!inv.usedBy && !inv.revoked) {
        const cp = el('button', 'btn btn-ghost btn-sm', 'Copy');
        cp.onclick = () => copyText(code, 'Code copied');
        const rv = el('button', 'btn btn-ghost btn-sm', 'Turn off');
        rv.onclick = async () => { await revokeInvite(code); draw(); };
        acts.append(cp, rv);
      } else {
        const del = el('button', 'btn btn-ghost btn-sm', 'Clear');
        del.onclick = async () => { await deleteInvite(code); draw(); };
        acts.appendChild(del);
      }
      row.appendChild(acts);
      body.appendChild(row);
    });

    const mk = el('button', 'btn btn-primary btn-block', 'New invite code');
    mk.style.marginTop = '10px';
    mk.onclick = async () => {
      mk.disabled = true;
      try {
        const code = await createInvite('');
        await copyText(code, 'Code copied — ' + code);
      } catch { toast('Couldn’t make a code'); }
      mk.disabled = false;
      draw();
    };
    body.appendChild(mk);
  }
}
