// Friends — the tab (rack-v67). It took the Steps tab's slot in the dock; the
// step data, its goal and its sheets stay where they were (steps.js).
//
// What is on it, top to bottom: anybody waiting on me (a request to confirm,
// a routine to open), the board, my friends, and anybody I am waiting on —
// or, with none of that, one warm card that says how to start. Every row
// opens a sheet; sheets never nest.
//
// THE PROMISE THIS SCREEN KEEPS ON EVERY LINE: nothing is shared until both
// people have said yes, and what is shared is chosen per friend, per thing,
// by the person it is about. So the request and confirm steps say which
// three things go by default before anything is sent, a friend's page says
// in words what each switch shows, and "Remove" is never more than two taps
// away. The rules are what make it true (friends-data.js header); this
// screen's job is to never imply otherwise.
//
// Names here are other people's typing. Every one is drawn with
// textContent (el()), never as markup.
//
// Imports store.js, ui.js, units.js, usage.js, vibe.js, tiles.js and the
// three friends modules. Nothing imports back but app.js.

import { todayKey, wu, onChange } from './store.js';
import { $, el, sheet, toast, noteEl, confirmSheet, copyText, segmented, fmtDate } from './ui.js';
import { fmtW, unitW, fmtRate } from './units.js';
// A drop set read as one group, "185×8 → 135×6" — the Routines preview's
// own call (v56), so a routine reads the same sent as kept.
import { setsText } from './analytics.js';
import { tail, glyphed } from './vibe.js';
import { tile, glyph } from './tiles.js';
import { initialsOf, cleanName, SHARE, normShare, codeLeft, leftWords, avatarOk } from './friends-core.js';
import { BOARDS, WINDOWS, board, readTrained, readSteps, readPRs, readMacros, readWeight, agoWords } from './friends-summary.js';
import { onFriends, friendsState, initFriends, newCode, lookupCode, sendRequest, confirm, decline, cancel,
         removeFriend, setShare, loadFriends, mySummaries, routineList, routineFor, pendingTo, sendRoutine,
         preview, acceptRoutine, declineRoutine, waiting, myName, CODE_HOURS,
         canNudge, sendNudge, dismissNudge, setNudgesFrom, setQuiet } from './friends-data.js';

// The board's two choices, kept across repaints and visits (device state).
let boardId = 'td';
let windowId = 'week';
let mine = null;          // my own pr / td / st, built the way my friends read them
let mineAt = 0;
let mineBusy = false;

const DEFAULT_WORDS = SHARE.filter(s => s.dflt).map(s => s.label.toLowerCase());
const andList = xs => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const firstOf = name => cleanName(name).split(' ')[0];

/* ================= boot ================= */

// app.js's one call: the watchers on my own node and my inbox, and the first
// publish of my summaries a few seconds behind the tabs.
export function initFriendsTab(user) { return initFriends(user); }

onFriends(() => { paintDot(); if (isOpen()) render(); });
// My own numbers on the board are re-made after a change to my log.
onChange(path => { if (/^(workouts|steps)(\/|$)/.test(path)) mineAt = 0; });

function isOpen() {
  const v = document.getElementById('view-friends');
  return !!(v && v.classList.contains('active'));
}

/* The dot on the dock's Friends button: somebody is waiting on me. */
function paintDot() {
  try {
    const b = document.querySelector('#dock button[data-view="friends"]');
    if (b) b.classList.toggle('has-dot', waiting() > 0);
  } catch {}
}

function refreshMine() {
  if (mineBusy || (mine && Date.now() - mineAt < 60000)) return;
  mineBusy = true;
  mySummaries().then(d => { mine = d; mineAt = Date.now(); mineBusy = false; if (isOpen()) render(); })
    .catch(() => { mineBusy = false; });
}

/* ================= the tab ================= */

export function render() {
  const root = $('#view-friends');
  if (!root) return;
  const s = friendsState();
  if (s.ready && s.friends.length) { loadFriends(false); refreshMine(); }
  paintDot();

  const wrap = el('div', 'screen-pad');
  wrap.appendChild(head());

  if (!s.ready) {
    wrap.appendChild(noteEl('Looking for your friends…'));
  } else {
    if (s.incoming.length) wrap.appendChild(requestsCard(s));
    if (s.nudges.length) wrap.appendChild(nudgesCard(s));
    if (s.inbox.length) wrap.appendChild(inboxCard(s));
    if (s.friends.length) {
      wrap.appendChild(boardCard(s));
      wrap.appendChild(friendsCard(s));
    }
    if (s.outgoing.length) wrap.appendChild(outgoingCard(s));
    if (!s.friends.length && !s.incoming.length && !s.outgoing.length) wrap.appendChild(emptyCard());
    if (s.friends.length) {
      const acts = el('div', 'btn-split fr-acts');
      const add = el('button', 'btn btn-ghost', 'Add a friend');
      add.onclick = () => openAdd();
      const send = el('button', 'btn btn-ghost', 'Send a routine');
      send.onclick = () => openSend(null);
      acts.append(add, send);
      wrap.appendChild(acts);
    }
  }

  const y = root.firstChild ? window.scrollY : null;
  root.innerHTML = '';
  root.appendChild(tail(wrap, 'friends'));   // the vibe's tailpiece, where one is ever drawn for Friends (none today)
  if (y) window.scrollTo(0, y);
}

function head() {
  const hd = el('div', 'cal-hd');
  const left = el('div');
  left.appendChild(el('div', 'eyebrow', 'Together'));
  left.appendChild(el('h1', null, 'Friends'));
  hd.appendChild(left);
  const add = el('button', 'fr-head-add');
  add.setAttribute('aria-label', 'Add a friend');
  add.appendChild(glyph('userPlus'));
  add.onclick = () => openAdd();
  hd.appendChild(add);
  return hd;
}

/* v68: `photo` is a friend's face as their own phone published it
   (friends-data.js loadFriends, checked there and again here): drawn as an
   <img> whose src is a JPEG data string the rules allow nothing else into,
   never as markup. No face, or one that will not decode: the letters. */
function avatar(name, key, me, photo) {
  const a = el('span', 'fr-av' + (me ? ' me' : ''), me ? 'You' : initialsOf(name));
  if (!me && avatarOk(photo)) {
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    img.onerror = () => { img.remove(); a.classList.remove('has-photo'); };
    img.src = photo;
    a.classList.add('has-photo');
    a.appendChild(img);
  }
  if (!me) {
    const tones = ['var(--p-blue)', 'var(--p-green)', 'var(--p-red)', 'var(--p-yellow)', 'var(--p-chrome)'];
    // FNV-1a over the id, so similar ids still spread across the five.
    let h = 2166136261;
    for (const c of String(key || name)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    a.style.setProperty('--av', tones[(h >>> 0) % tones.length]);
  }
  a.setAttribute('aria-hidden', 'true');
  return a;
}

function cardHead(c, title, right) {
  const hd = el('div', 'card-hd');
  hd.appendChild(el('div', 'eyebrow', title));
  if (right) hd.appendChild(right);
  c.appendChild(hd);
}

/* ---------- waiting on me ---------- */
function requestsCard(s) {
  const c = el('div', 'card fr-card');
  cardHead(c, s.incoming.length === 1 ? 'Wants to connect' : s.incoming.length + ' want to connect');
  s.incoming.forEach(r => {
    const row = el('div', 'fr-req');
    row.appendChild(avatar(r.name, r.uid));
    const mid = el('div', 'fr-mid');
    mid.appendChild(el('div', 'fr-name', r.name));
    mid.appendChild(el('div', 'fr-sub', 'Used your code' + (r.at ? ' · ' + ago(r.at) : '') + '. Confirm and you’ll show them your ' + andList(DEFAULT_WORDS) + '.'));
    row.appendChild(mid);
    c.appendChild(row);
    const acts = el('div', 'btn-split fr-req-acts');
    const yes = el('button', 'btn btn-primary', 'Confirm');
    const no = el('button', 'btn btn-ghost', 'Not now');
    yes.onclick = async () => {
      yes.disabled = no.disabled = true;
      const res = await confirm(r.uid);
      if (!res.ok) { toast(res.why); yes.disabled = no.disabled = false; return; }
      toast('You and ' + firstOf(r.name) + ' are friends. Their page is where you choose what they see.');
    };
    no.onclick = () => confirmSheet({
      title: 'Not connect with ' + firstOf(r.name) + '?',
      body: 'Their request goes, and they won’t be told why. They’d need a new code from you to ask again.',
      confirmLabel: 'Decline',
      onConfirm: async () => { const res = await decline(r.uid); if (!res.ok) toast(res.why); }
    });
    acts.append(yes, no);
    c.appendChild(acts);
  });
  return c;
}

/* v68: nudges to me — "Ann says you are slacking off. Get in there." —
   each with a dismiss, and a way to stop them from that friend. */
function nudgesCard(s) {
  const c = el('div', 'card fr-card fr-nudges');
  cardHead(c, s.nudges.length === 1 ? 'A nudge' : s.nudges.length + ' nudges');
  s.nudges.forEach(n => {
    const row = el('div', 'fr-req fr-nudge');
    row.appendChild(avatar(n.name, n.from, false, (s.data[n.from] || {}).av));
    const mid = el('div', 'fr-mid');
    mid.appendChild(el('div', 'fr-name fr-nudge-t', n.text));
    mid.appendChild(el('div', 'fr-sub', ago(n.at)));
    row.appendChild(mid);
    const x = el('button', 'btn btn-ghost fr-cancel', 'Dismiss');
    x.setAttribute('aria-label', 'Dismiss the nudge from ' + n.name);
    x.onclick = async () => { x.disabled = true; const res = await dismissNudge(n.from); if (!res.ok) { toast(res.why); x.disabled = false; } };
    row.appendChild(x);
    c.appendChild(row);
  });
  c.appendChild(noteEl('Nudges switch off per friend on their page, or for everybody there too.'));
  return c;
}

function inboxCard(s) {
  const c = el('div', 'card fr-card');
  cardHead(c, s.inbox.length === 1 ? 'A routine for you' : 'Routines for you');
  const list = el('div', 'set-list');
  s.inbox.forEach(it => {
    const b = el('button', 'set-row-nav has-tile');
    b.appendChild(tile('inbox', 'train'));
    const mid = el('span', 'set-row-l fr-two');
    mid.appendChild(el('span', null, it.title));
    mid.appendChild(el('span', 'set-row-sub', 'From ' + it.name + ' · ' + it.count + (it.count === 1 ? ' exercise' : ' exercises')));
    b.appendChild(mid);
    b.appendChild(glyphed(el('span', 'set-row-x', '›'), 'go'));
    b.onclick = () => openInboxItem(it.from);
    list.appendChild(b);
  });
  c.appendChild(list);
  return c;
}

/* ---------- the board ---------- */
function people(s) {
  const out = [{ uid: s.me, name: myName(), me: true, data: mine || {} }];
  s.friends.forEach(f => out.push({ uid: f.uid, name: f.name, me: false, data: s.data[f.uid] || {} }));
  return out;
}

function boardCard(s) {
  const c = el('div', 'card fr-card');
  const chips = el('div', 'chip-row');
  WINDOWS.forEach(w => {
    const ch = el('button', 'chip fr-chip' + (windowId === w.id ? ' on' : ''), w.label);
    ch.onclick = () => { windowId = w.id; render(); };
    chips.appendChild(ch);
  });
  cardHead(c, 'Board', chips);
  const seg = segmented(BOARDS.map(b => [b.id, b.label]), boardId, id => { boardId = id; render(); });
  seg.classList.add('fr-seg');
  c.appendChild(seg);

  const win = WINDOWS.find(w => w.id === windowId) || WINDOWS[0];
  const def = BOARDS.find(b => b.id === boardId) || BOARDS[0];
  const today = todayKey();
  if (!mine) { c.appendChild(noteEl('Adding up your week…')); return c; }
  const res = board(def.id, people(s), today, win.days);
  const list = el('ol', 'fr-board');
  res.rows.forEach(r => {
    const li = el('li', 'fr-rank-row' + (r.me ? ' me' : '') + (r.rank === 1 && r.value > 0 ? ' top' : ''));
    li.appendChild(el('span', 'fr-rank num', String(r.rank)));
    li.appendChild(avatar(r.name, r.uid, r.me, r.me ? null : (s.data[r.uid] || {}).av));
    const mid = el('div', 'fr-mid');
    mid.appendChild(el('div', 'fr-name', r.me ? 'You' : r.name));
    const sub = boardSub(def.id, r.read, win.days);
    if (sub) mid.appendChild(sub);
    li.appendChild(mid);
    const v = el('div', 'fr-val');
    v.appendChild(el('span', 'fr-val-n num', def.id === 'st' ? compactSteps(r.value) : String(r.value)));
    v.appendChild(el('span', 'fr-val-u', def.id === 'st' ? 'steps' : r.value === 1 ? def.one : def.many));
    li.appendChild(v);
    list.appendChild(li);
  });
  c.appendChild(list);

  const loading = s.friends.some(f => !s.data[f.uid]);
  if (loading) c.appendChild(noteEl('Reading what your friends share…'));
  else if (res.missing.length) {
    const what = def.id === 'pr' ? 'personal records' : def.id === 'td' ? 'training days' : 'steps';
    c.appendChild(noteEl(res.missing.length === s.friends.length
      ? 'None of your friends show you their ' + what + ' yet. They switch it on from your name on their Friends tab.'
      : andList(res.missing.map(firstOf)) + (res.missing.length === 1 ? ' doesn’t' : ' don’t') + ' show you ' + what + ', so ' + (res.missing.length === 1 ? 'isn’t' : 'aren’t') + ' on this board.'));
  }
  return c;
}

function compactSteps(n) {
  if (n >= 100000) return Math.round(n / 1000) + 'k';
  if (n >= 10000) return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

function boardSub(id, r, days) {
  if (!r) return el('div', 'fr-sub', 'Nothing yet');
  if (id === 'pr') {
    const p = r.list && r.list[0];
    return el('div', 'fr-sub', p ? p.x + ' · ' + liftText(p) : 'No records in ' + days + ' days');
  }
  if (id === 'st') return el('div', 'fr-sub', r.logged ? r.avg.toLocaleString() + ' a day' + (r.logged < days ? ' · ' + r.logged + ' of ' + days + ' days' : '') : 'No steps logged');
  // training: the days as dots, one per day of the window
  if (days > 7) return el('div', 'fr-sub', r.known < days ? 'of the ' + r.known + ' days they’ve shared' : 'of the last ' + days);
  return dots(r.strip);
}

function dots(strip) {
  const d = el('div', 'fr-dots');
  d.setAttribute('aria-hidden', 'true');
  strip.forEach(x => d.appendChild(el('i', x === 1 ? 'on' : x === null ? 'unk' : null)));
  return d;
}

function liftText(p) {
  const u = wu();
  return fmtW(p.w, u) + ' ' + unitW(u) + (p.r ? ' × ' + p.r : '');
}

/* ---------- my friends ---------- */
function friendsCard(s) {
  const c = el('div', 'card fr-card');
  cardHead(c, s.friends.length === 1 ? 'Your friend' : 'Your friends · ' + s.friends.length);
  const list = el('div', 'set-list');
  s.friends.forEach(f => {
    // v68: the row and its nudge button side by side — a button may not
    // hold a button.
    const line = el('div', 'fr-friend-line');
    const b = el('button', 'set-row-nav fr-friend');
    b.appendChild(avatar(f.name, f.uid, false, (s.data[f.uid] || {}).av));
    const mid = el('span', 'set-row-l fr-two');
    mid.appendChild(el('span', null, f.name));
    mid.appendChild(el('span', 'set-row-sub', theyShare(s.data[f.uid])));
    b.appendChild(mid);
    b.appendChild(glyphed(el('span', 'set-row-x', '›'), 'go'));
    b.onclick = () => openFriend(f.uid);
    line.append(b, nudgeButton(f));
    list.appendChild(line);
  });
  c.appendChild(list);
  return c;
}

/* v68: one nudge a day per friend. The button says when it is spent rather
   than vanishing, so the row does not jump. */
function nudgeButton(f) {
  const first = firstOf(f.name);
  const can = canNudge(f.uid);
  const b = el('button', 'fr-nudge-btn' + (can.ok ? '' : ' spent'), can.ok ? 'Nudge' : 'Nudged');
  b.setAttribute('aria-label', can.ok ? 'Nudge ' + first + ' to get a workout in' : 'You’ve nudged ' + first + ' today');
  b.onclick = async e => {
    e.stopPropagation();
    if (!canNudge(f.uid).ok) { toast(canNudge(f.uid).why); return; }
    b.disabled = true;
    const res = await sendNudge(f.uid);
    b.disabled = false;
    if (!res.ok) { toast(res.why); return; }
    // Spent at once, whatever the repaint brings: the stamp is the server's.
    b.textContent = 'Nudged'; b.classList.add('spent');
    b.setAttribute('aria-label', 'You’ve nudged ' + first + ' today');
    toast('Nudged ' + first + '. They’ll see it on their Friends tab.');
  };
  return b;
}

function theyShare(d) {
  if (!d) return '…';
  const on = SHARE.filter(x => d.share && d.share[x.id]).map(x => x.label.toLowerCase());
  return on.length ? 'Shows you ' + andList(on) : 'Shows you nothing yet';
}

function outgoingCard(s) {
  const c = el('div', 'card fr-card');
  cardHead(c, 'Waiting on');
  s.outgoing.forEach(o => {
    const row = el('div', 'fr-req');
    row.appendChild(avatar(o.name, o.uid));
    const mid = el('div', 'fr-mid');
    mid.appendChild(el('div', 'fr-name', o.name));
    mid.appendChild(el('div', 'fr-sub', 'You used their code' + (o.at ? ' ' + ago(o.at) : '') + '. They confirm it on their phone.'));
    row.appendChild(mid);
    const x = el('button', 'btn btn-ghost fr-cancel', 'Cancel');
    x.onclick = async () => { x.disabled = true; const res = await cancel(o.uid); if (!res.ok) { toast(res.why); x.disabled = false; } };
    row.appendChild(x);
    c.appendChild(row);
  });
  return c;
}

function emptyCard() {
  const c = el('div', 'card fr-empty');
  const art = el('div', 'fr-empty-art');
  art.appendChild(glyph('people'));
  c.appendChild(art);
  c.appendChild(el('h3', null, 'Train with your people'));
  c.appendChild(el('p', null, 'Swap a code with a friend: one of you makes it, the other types it in, and you confirm. Then you can race each other on a board, and send each other routines.'));
  c.appendChild(el('p', 'fr-empty-small', 'Nothing is shared until you both say yes — and you choose what each friend sees.'));
  const make = el('button', 'btn btn-primary btn-block', 'Make a code');
  make.onclick = () => openAdd({ make: true });
  const have = el('button', 'btn btn-ghost btn-block', 'I have a code');
  have.style.marginTop = '8px';
  have.onclick = () => openAdd({ focus: true });
  c.append(make, have);
  return c;
}

/* ================= add a friend ================= */

function openAdd(opts = {}) {
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Friends'));
  sh.appendChild(el('h2', null, 'Add a friend'));
  sh.appendChild(noteEl('One of you makes a code and sends it; the other types it in; whoever made it confirms. A code works once and lasts ' + (CODE_HOURS === 24 ? 'a day' : CODE_HOURS + ' hours') + '.'));

  const mineSec = el('div', 'you-sec');
  mineSec.appendChild(el('div', 'you-sec-t', 'Your code'));
  const mineBody = el('div');
  mineSec.appendChild(mineBody);
  sh.appendChild(mineSec);

  const paintCode = () => {
    mineBody.innerHTML = '';
    const s = friendsState();
    const left = s.code && s.code.at ? codeLeft(s.code.at, Date.now()) : 0;
    if (s.code && !s.code.spent && left > 0) {
      const box = el('div', 'fr-code-box');
      box.appendChild(el('div', 'fr-code num', s.code.code));
      box.appendChild(el('div', 'fr-sub', 'Works once · ' + leftWords(left) + ' left'));
      mineBody.appendChild(box);
      const acts = el('div', 'btn-split');
      const cp = el('button', 'btn btn-ghost', 'Copy');
      cp.onclick = () => copyText(s.code.code, 'Code copied');
      acts.appendChild(cp);
      if (typeof navigator !== 'undefined' && navigator.share) {
        const shb = el('button', 'btn btn-ghost', 'Send it');
        shb.onclick = () => navigator.share({ text: 'Add me on Rack — my friend code is ' + s.code.code + '. It works once, today.' }).catch(() => {});
        acts.appendChild(shb);
      }
      mineBody.appendChild(acts);
      const again = el('button', 'linkish fr-again', 'Make a new code instead');
      again.onclick = make;
      mineBody.appendChild(again);
    } else {
      if (s.code && (s.code.spent || s.code.at)) mineBody.appendChild(noteEl(s.code.spent ? 'Your last code was used. Make a new one for the next friend.' : 'Your last code ran out. Make a new one.'));
      const mk = el('button', 'btn btn-primary btn-block', 'Make a code');
      mk.onclick = make;
      mineBody.appendChild(mk);
    }
  };
  async function make(e) {
    const b = e && e.currentTarget;
    if (b) { b.disabled = true; b.textContent = 'Making…'; }
    const res = await newCode();
    if (!res.ok) { toast(res.why); if (b) { b.disabled = false; b.textContent = 'Make a code'; } return; }
    paintCode();
  }
  paintCode();

  const theirs = el('div', 'you-sec');
  theirs.appendChild(el('div', 'you-sec-t', 'Got a code?'));
  const row = el('div', 'qty-row fr-code-row');
  const inp = el('input');
  inp.type = 'text'; inp.className = 'code-input'; inp.placeholder = 'ABCD-2345';
  inp.maxLength = 12; inp.autocapitalize = 'characters'; inp.spellcheck = false; inp.autocomplete = 'off';
  inp.setAttribute('aria-label', 'Friend code');
  const go = el('button', 'btn btn-primary', 'Find');
  row.append(inp, go);
  theirs.appendChild(row);
  const result = el('div');
  theirs.appendChild(result);
  sh.appendChild(theirs);

  const find = async () => {
    result.innerHTML = '';
    go.disabled = true;
    const found = await lookupCode(inp.value);
    go.disabled = false;
    if (!found.ok) { result.appendChild(noteEl(found.why)).classList.add('fr-why'); return; }
    const box = el('div', 'fr-found');
    const top = el('div', 'fr-req');
    top.appendChild(avatar(found.name, found.uid));
    const mid = el('div', 'fr-mid');
    mid.appendChild(el('div', 'fr-name', 'Connect with ' + found.name + '?'));
    mid.appendChild(el('div', 'fr-sub', 'They confirm it on their phone.'));
    top.appendChild(mid);
    box.appendChild(top);
    box.appendChild(noteEl('Once they do, you’ll show ' + firstOf(found.name) + ' your ' + andList(DEFAULT_WORDS) + ' — never your food, your weight or anything else unless you switch it on. Change it, friend by friend, any time.'));
    const send = el('button', 'btn btn-primary btn-block', 'Send request');
    send.onclick = async () => {
      send.disabled = true; send.textContent = 'Sending…';
      const res = await sendRequest(found);
      if (!res.ok) { toast(res.why); send.disabled = false; send.textContent = 'Send request'; return; }
      close();
      toast('Sent. ' + firstOf(found.name) + ' confirms it on their phone.');
    };
    box.appendChild(send);
    result.appendChild(box);
  };
  go.onclick = find;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') find(); });

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '18px';
  done.onclick = close;
  sh.appendChild(done);

  if (opts.make && !(friendsState().code && friendsState().code.at && codeLeft(friendsState().code.at, Date.now()) > 0)) make();
  if (opts.focus) setTimeout(() => { try { inp.focus(); } catch {} }, 80);
}

/* ================= one friend ================= */

function openFriend(f) {
  const s = friendsState();
  const fr = s.friends.find(x => x.uid === f);
  if (!fr) { toast('They’re not on your list any more.'); return; }
  const d = s.data[f] || null;
  const first = firstOf(fr.name);
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Friend'));
  const top = el('div', 'fr-who');
  top.appendChild(avatar(fr.name, fr.uid, false, d && d.av));
  const mid = el('div', 'fr-mid');
  mid.appendChild(el('h2', null, fr.name));
  const since = fr.at ? 'Friends since ' + new Date(fr.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Friends';
  const upd = d && d.me && d.me.at ? agoWords(d.me.at, Date.now()) : null;
  mid.appendChild(el('div', 'fr-sub', since + (upd ? ' · updated ' + upd : '')));
  top.appendChild(mid);
  sh.appendChild(top);

  /* What they show me. */
  const theirs = el('div', 'you-sec');
  theirs.appendChild(el('div', 'you-sec-t', 'What ' + first + ' shows you'));
  if (!d) theirs.appendChild(noteEl('Reading what ' + first + ' shares…'));
  else {
    const on = SHARE.filter(x => d.share[x.id]);
    if (!on.length) theirs.appendChild(noteEl(first + ' hasn’t switched anything on for you yet. You’ll see it here when they do.'));
    on.forEach(x => theirs.appendChild(sharedBlock(x, d[x.id], first)));
  }
  sh.appendChild(theirs);

  /* What I show them — the switches. */
  const mineSec = el('div', 'you-sec');
  mineSec.appendChild(el('div', 'you-sec-t', 'What you show ' + first));
  const list = el('div', 'set-list');
  let flags = { ...normShare(fr.share) };
  SHARE.forEach(x => {
    const b = el('button', 'fr-tog-row');
    b.setAttribute('role', 'switch');
    b.appendChild(tile(x.icon, x.dflt ? 'train' : 'plan'));
    const body = el('span', 'set-row-l fr-two');
    body.appendChild(el('span', null, x.label));
    body.appendChild(el('span', 'set-row-sub', x.note));
    b.appendChild(body);
    const knob = el('span', 'tog');
    knob.setAttribute('aria-hidden', 'true');
    b.appendChild(knob);
    const paint = () => { knob.classList.toggle('on', flags[x.id]); b.setAttribute('aria-checked', flags[x.id] ? 'true' : 'false'); };
    paint();
    let busy = false;
    b.onclick = async () => {
      if (busy) return;
      busy = true;
      flags = { ...flags, [x.id]: !flags[x.id] };
      paint();
      const ok = await setShare(f, flags);
      busy = false;
      if (!ok) { flags = { ...flags, [x.id]: !flags[x.id] }; paint(); toast('That didn’t save. Check your connection and try again.'); }
    };
    list.appendChild(b);
  });
  mineSec.appendChild(list);
  mineSec.appendChild(noteEl('Off means ' + first + ' can’t read it at all — the database refuses, not just this screen. Each friend has their own switches.'));
  sh.appendChild(mineSec);

  /* v68: nudges from them, and from anybody. Not something I show — something
     I let in — so they are their own section. */
  const nudgeSec = el('div', 'you-sec');
  nudgeSec.appendChild(el('div', 'you-sec-t', 'Nudges'));
  const nlist = el('div', 'set-list');
  const nrow = (label, note, get, set) => {
    const b = el('button', 'fr-tog-row');
    b.setAttribute('role', 'switch');
    b.appendChild(tile('bell', 'coach'));
    const body = el('span', 'set-row-l fr-two');
    body.appendChild(el('span', null, label));
    body.appendChild(el('span', 'set-row-sub', note));
    b.appendChild(body);
    const knob = el('span', 'tog');
    knob.setAttribute('aria-hidden', 'true');
    b.appendChild(knob);
    let on = get();
    const paint = () => { knob.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); };
    paint();
    let busy = false;
    b.onclick = async () => {
      if (busy) return;
      busy = true; on = !on; paint();
      const ok = await set(on);
      busy = false;
      if (!ok) { on = !on; paint(); toast('That didn’t save. Check your connection and try again.'); }
    };
    return b;
  };
  nlist.appendChild(nrow('Allow nudges from ' + first, first + ' can send you one a day: a nudge to get a workout in. Fixed words, never a message.',
    () => fr.nudges !== false, on => setNudgesFrom(f, on)));
  nlist.appendChild(nrow('Mute all nudges', 'No nudges from anybody, whatever each friend’s switch says.',
    () => !!friendsState().quiet, on => setQuiet(on)));
  nudgeSec.appendChild(nlist);
  const nudgeHim = el('button', 'btn btn-ghost btn-block', 'Nudge ' + first);
  nudgeHim.style.marginTop = '10px';
  const cn = canNudge(f);
  if (!cn.ok) { nudgeHim.disabled = true; nudgeHim.textContent = 'Nudged ' + first + ' today'; }
  nudgeHim.onclick = async () => {
    nudgeHim.disabled = true;
    const res = await sendNudge(f);
    if (!res.ok) { toast(res.why); nudgeHim.disabled = !canNudge(f).ok; return; }
    nudgeHim.textContent = 'Nudged ' + first + ' today';
    toast('Nudged ' + first + '. They’ll see it on their Friends tab.');
  };
  nudgeSec.appendChild(nudgeHim);
  sh.appendChild(nudgeSec);

  const send = el('button', 'btn btn-ghost btn-block', 'Send ' + first + ' a routine');
  send.style.marginTop = '16px';
  send.onclick = () => { close(); openSend(f); };
  sh.appendChild(send);

  const rm = el('button', 'btn btn-danger btn-block', 'Remove ' + first);
  rm.style.marginTop = '8px';
  rm.onclick = () => {
    close();
    confirmSheet({
      title: 'Remove ' + first + '?',
      body: 'You stop seeing each other’s numbers straight away, and any routine either of you left waiting goes too. Nothing in your own log changes. To be friends again, one of you makes a new code.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        const res = await removeFriend(f);
        toast(res.ok ? 'Removed ' + first : res.why);
      }
    });
  };
  sh.appendChild(rm);

  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '8px';
  done.onclick = close;
  sh.appendChild(done);
}

function sharedBlock(x, data, first) {
  const c = el('div', 'fr-shared');
  const hd = el('div', 'fr-shared-hd');
  hd.appendChild(tile(x.icon, 'help'));
  hd.appendChild(el('span', 'fr-shared-t', x.label));
  const when = data && data.at ? agoWords(data.at, Date.now()) : null;
  if (when) hd.appendChild(el('span', 'fr-shared-w', when));
  c.appendChild(hd);
  const today = todayKey();
  const none = t => { c.appendChild(el('div', 'fr-sub', t)); return c; };
  if (x.id === 'pr') {
    const r = readPRs(data, today, 35);
    if (!r || !r.list.length) return none('No new records in the last five weeks.');
    const ul = el('div', 'fr-pr-list');
    r.list.slice(0, 5).forEach(p => {
      const line = el('div', 'fr-pr');
      line.appendChild(el('span', 'fr-pr-x', p.x));
      line.appendChild(el('span', 'fr-pr-v num', liftText(p) + ' · ' + fmtDate(p.d)));
      ul.appendChild(line);
    });
    c.appendChild(ul);
    if (r.list.length > 5) c.appendChild(el('div', 'fr-sub', (r.list.length - 5) + ' more in the last five weeks'));
    return c;
  }
  if (x.id === 'td') {
    const r = readTrained(data, today, 35);
    if (!r) return none(first + ' hasn’t trained since sharing this.');
    c.appendChild(weeks(r.strip));
    return none(r.value + (r.value === 1 ? ' day' : ' days') + ' trained in the last five weeks' + (r.known < 35 ? ' (the last ' + r.known + ' days shared)' : '') + '.');
  }
  if (x.id === 'st') {
    const w = readSteps(data, today, 7), m = readSteps(data, today, 30);
    if (!w || !m) return none('No steps logged yet.');
    return none(w.logged ? w.avg.toLocaleString() + ' a day this week · best ' + w.best.toLocaleString() : 'No steps this week' + (m.logged ? ' · ' + m.avg.toLocaleString() + ' a day over 30 days' : '.'));
  }
  if (x.id === 'mac') {
    const r = readMacros(data);
    if (!r) return none(first + ' has no calorie or protein targets set, so there’s nothing to land on yet.');
    const strip = el('div', 'fr-mac');
    strip.setAttribute('aria-hidden', 'true');
    r.strip.forEach(ch => strip.appendChild(el('i', ch === 'b' ? 'both' : ch === 'c' || ch === 'p' ? 'one' : ch === 'x' ? 'miss' : null)));
    c.appendChild(strip);
    return none(r.logged
      ? 'Calories on target ' + r.cal + ' of ' + r.logged + ' logged days · protein ' + r.p + ' of ' + r.logged + ' · the 30 days to ' + fmtDate(r.end)
      : 'Nothing logged in the 30 days to ' + fmtDate(r.end) + '.');
  }
  if (x.id === 'wt') {
    const r = readWeight(data);
    if (!r) return none('No trend yet — it takes a few weigh-ins.');
    const u = wu();
    const big = el('div', 'fr-wt');
    big.appendChild(el('span', 'fr-wt-v num', fmtW(r.tw, u)));
    big.appendChild(el('span', 'fr-wt-u', unitW(u) + ' trend'));
    c.appendChild(big);
    const bits = [];
    if (r.rate !== null) bits.push((r.rate > 0 ? '+' : r.rate < 0 ? '−' : '') + fmtRate(Math.abs(r.rate), u) + ' ' + unitW(u) + ' a week');
    if (r.goal !== null) bits.push('goal ' + fmtW(r.goal, u) + ' ' + unitW(u) + (Math.abs(r.goal - r.tw) >= 0.1 ? ' (' + fmtW(Math.abs(r.goal - r.tw), u) + ' to go)' : ''));
    if (r.dir !== null && r.goal === null) bits.push(r.dir < 0 ? 'cutting' : r.dir > 0 ? 'bulking' : 'maintaining');
    if (bits.length) c.appendChild(el('div', 'fr-sub', bits.join(' · ')));
    return c;
  }
  return c;
}

function weeks(strip) {
  const g = el('div', 'fr-weeks');
  g.setAttribute('aria-hidden', 'true');
  strip.forEach(x => g.appendChild(el('i', x === 1 ? 'on' : x === null ? 'unk' : null)));
  return g;
}

/* ================= send a routine ================= */

function openSend(fixed) {
  const s = friendsState();
  const { sh, close } = sheet();
  const to = fixed ? s.friends.find(f => f.uid === fixed) : null;
  sh.appendChild(el('div', 'eyebrow', 'Send a routine'));
  sh.appendChild(el('h2', null, to ? 'To ' + to.name : 'Which routine?'));
  const list = routineList();
  if (!list.length) {
    sh.appendChild(noteEl('You don’t have a routine to send yet. Build one under Train → Routines, or finish a workout and save it as one.'));
  } else {
    sh.appendChild(noteEl('It lands in their inbox; they choose whether to save it. Only the plan goes — the exercises and the target sets — never your log.'));
    const box = el('div', 'rt-list');
    list.forEach(r => {
      const row = el('button', 'rt-item');
      const mid = el('div', 'rt-mid');
      mid.appendChild(el('div', 'rt-name', r.name || 'Untitled routine'));
      const n = (r.exercises || []).length;
      mid.appendChild(el('div', 'rt-meta', n + (n === 1 ? ' exercise' : ' exercises')));
      row.appendChild(mid);
      row.appendChild(glyphed(el('span', 'rt-go', '›'), 'go'));
      row.onclick = () => {
        const p = routineFor(r);
        if (!p.ok) { toast(p.why); return; }
        close();
        if (to) openSendConfirm(to, r); else openPickFriend(r);
      };
      box.appendChild(row);
    });
    sh.appendChild(box);
  }
  const done = el('button', 'btn btn-ghost btn-block', 'Close');
  done.style.marginTop = '12px';
  done.onclick = close;
  sh.appendChild(done);
}

function openPickFriend(r) {
  const s = friendsState();
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Send ' + (r.name || 'a routine')));
  sh.appendChild(el('h2', null, 'To whom?'));
  const list = el('div', 'set-list');
  s.friends.forEach(f => {
    const b = el('button', 'set-row-nav fr-friend');
    b.appendChild(avatar(f.name, f.uid));
    b.appendChild(el('span', 'set-row-l', f.name));
    b.appendChild(glyphed(el('span', 'set-row-x', '›'), 'go'));
    b.onclick = () => { close(); openSendConfirm(f, r); };
    list.appendChild(b);
  });
  sh.appendChild(list);
  const done = el('button', 'btn btn-ghost btn-block', 'Cancel');
  done.style.marginTop = '12px';
  done.onclick = close;
  sh.appendChild(done);
}

function openSendConfirm(f, r) {
  const first = firstOf(f.name);
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'Send to ' + f.name));
  sh.appendChild(el('h2', null, r.name || 'Untitled routine'));
  const p = routineFor(r);
  sh.appendChild(previewList(p.ok ? p.r.exercises : []));
  const warn = el('div');
  sh.appendChild(warn);
  pendingTo(f.uid).then(name => {
    if (name) warn.appendChild(noteEl(first + ' hasn’t opened “' + name + '” yet. Sending this replaces it — you can have one routine waiting for each friend.'));
  });
  const go = el('button', 'btn btn-primary btn-block', 'Send to ' + first);
  go.style.marginTop = '14px';
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Sending…';
    const res = await sendRoutine(f.uid, r);
    if (!res.ok) { toast(res.why); go.disabled = false; go.textContent = 'Send to ' + first; return; }
    close();
    toast('Sent to ' + first + '.');
  };
  sh.appendChild(go);
  const cancelB = el('button', 'btn btn-ghost btn-block', 'Cancel');
  cancelB.style.marginTop = '8px';
  cancelB.onclick = close;
  sh.appendChild(cancelB);
}

function previewList(exercises) {
  const box = el('div', 'rt-preview');
  const u = wu();
  exercises.forEach(ex => {
    const line = el('div', 'rt-pv-row');
    line.appendChild(el('span', 'rt-pv-name', ex.name));
    const sets = ex.sets || [];
    const txt = setsText(sets, st => (st.tw ? fmtW(parseFloat(st.tw), u) + '×' : '') + (st.tr || '–'), '  ');
    line.appendChild(el('span', 'rt-pv-sets num', sets.length ? txt : 'no sets'));
    box.appendChild(line);
  });
  return box;
}

/* ================= a routine for me ================= */

function openInboxItem(from) {
  const s = friendsState();
  const it = s.inbox.find(x => x.from === from);
  const got = preview(from);
  if (!it || !got) { toast('That routine couldn’t be read.'); return; }
  const { sh, close } = sheet();
  sh.appendChild(el('div', 'eyebrow', 'From ' + it.name));
  sh.appendChild(el('h2', null, got.routine.name));
  if (got.routine.note && !/^From /.test(got.routine.note)) sh.appendChild(noteEl(got.routine.note));
  sh.appendChild(previewList(got.routine.exercises));
  if (got.customs.length) {
    sh.appendChild(noteEl('Saving also adds ' + (got.customs.length === 1 ? 'one exercise' : got.customs.length + ' exercises') +
      ' you don’t have to your library: ' + andList(got.customs.map(x => x.name)) + '.'));
  }
  const save = el('button', 'btn btn-primary btn-block', 'Save to my routines');
  save.style.marginTop = '14px';
  save.onclick = async () => {
    save.disabled = true; save.textContent = 'Saving…';
    const res = await acceptRoutine(from);
    if (!res.ok) { toast(res.why); save.disabled = false; save.textContent = 'Save to my routines'; return; }
    close();
    toast('Saved “' + res.name + '” — it’s under Train → Routines.');
  };
  sh.appendChild(save);
  const no = el('button', 'btn btn-ghost btn-block', 'Decline');
  no.style.marginTop = '8px';
  no.onclick = async () => { close(); const res = await declineRoutine(from); if (!res.ok) toast(res.why); };
  sh.appendChild(no);
}

/* ---------- small ---------- */
function ago(at) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (!(m >= 0)) return '';
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h ago';
  return Math.floor(h / 24) + ' d ago';
}
