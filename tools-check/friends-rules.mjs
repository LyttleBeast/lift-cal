#!/usr/bin/env node
//
// Verifier for the Friends rules (rack-v67): the REAL database.rules.json,
// run by tools-check/lib/rules-engine.mjs against an in-memory database, as
// accounts that try everything a client with a valid account could try.
//
//   node tools-check/friends-rules.mjs
//
// The rules are the only thing standing between one account and another's
// training log, so every property the Friends change promises is asserted
// here as an attempt that must be REFUSED, beside the honest attempt that
// must be allowed (a rule that refuses everything passes the first half):
//
//   A  the engine reads the published rules the way RTDB does: the canaries
//      on rules that predate Friends (users/ isolation, per-section grants,
//      $other denies, the invite claim's atomicity, usage's day keys,
//      owner-only fields). A model that got these wrong would prove nothing.
//   B  codes: mine only, one at a time, server-stamped, a day long, readable
//      only by an approved account that has the exact code, never listable
//   C  requests: only with the code owner's live, current code, spent in the
//      same write; never to myself, never twice, never to a friend
//   D  confirming: only the person asked, only over a pending request, both
//      sides at once; nobody can forge, half-make, or re-kind a connection
//   E  reading what a friend shows: only while BOTH sides stand, only what
//      the owner switched on for that reader, and never the owner's log
//   F  writing summaries: my own only, in the shapes and sizes the rules name
//   G  the switches: only mine for my friends; nobody flips mine
//   H  the inbox: only a friend writes, only their own slot, bounded in shape
//      and size; the receiver reads and deletes; strangers do neither
//   I  removing and re-adding: either side ends it, at once, and a removed
//      friend cannot come back without a new code
//   J  unapproved, revoked and signed-out accounts: nothing
//   K  the lock variant carries the identical social tree
//   L  (v68) a friend's face: friends only, a small JPEG data string only
//   M  (v68) nudges: friends only, one a day by the server's clock, fixed
//      words, the receiver's switches, dismissed or taken back
//
// No rule is copied into this file. Everything is the file Micah pastes.

import { readFileSync } from 'node:fs';
import { createDb, SERVER_TIMESTAMP as TS } from './lib/rules-engine.mjs';

const RULES = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const LOCK = JSON.parse(readFileSync(new URL('../database.rules.OPTIONAL-LOCK.json', import.meta.url), 'utf8'));
const OWNER = (/OWNER_UID = "([^"]+)"/.exec(readFileSync(new URL('../firebase-config.js', import.meta.url), 'utf8')) || [])[1];

let pass = 0, fail = 0;
const out = [];
const check = (label, cond, detail) => { if (cond) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const allowed = (r, label) => check(label, r.ok, r.why);
const refused = (r, label) => check(label, !r.ok, 'it was ALLOWED');

const NOW = 1790000000000, DAY = 864e5;
const [ANN, BOB, CAT, DAN] = ['uAnn', 'uBob', 'uCat', 'uDan'];   // Dan is signed in, never approved
const CODE = 'ABCD-EFGH', CODE2 = 'WXYZ-2345', CODE3 = 'MNPQ-RSTU';

/* A database with Ann, Bob and Cat approved, Dan not, and the owner. */
function world(rules = RULES) {
  const db = createDb(rules, { now: NOW });
  for (const u of [ANN, BOB, CAT]) db.poke('access/approved/' + u, { at: 1, via: 'owner' });
  return { db, ann: db.client({ uid: ANN }), bob: db.client({ uid: BOB }), cat: db.client({ uid: CAT }),
           dan: db.client({ uid: DAN }), anon: db.client(null), owner: db.client({ uid: OWNER }) };
}
const people = u => 'social/people/' + u;

// The app's own steps, written out as the multi-path updates friends-data.js sends.
const mkCode = (cl, u, code, old) => cl.update('', {
  ['social/codes/' + code]: { u, n: 'Name of ' + u, k: 'friend', at: TS },
  [people(u) + '/code']: code,
  ...(old ? { ['social/codes/' + old]: null } : {})
});
const ask = (cl, from, to, code, extra = {}) => cl.update('', {
  [people(to) + '/req/' + from]: { n: 'Name of ' + from, c: code, k: 'friend', at: TS },
  ['social/codes/' + code]: null,
  [people(from) + '/out/' + to]: { n: 'Name of ' + to, at: TS },
  [people(from) + '/share/' + to]: { pr: true, td: true, st: true },
  ...extra
});
const confirmIt = (cl, me, from, extra = {}) => cl.update('', {
  [people(me) + '/list/' + from]: { k: 'friend', n: 'Name of ' + from, at: TS },
  [people(from) + '/list/' + me]: { k: 'friend', n: 'Name of ' + me, at: TS },
  [people(me) + '/req/' + from]: null,
  [people(from) + '/out/' + me]: null,
  [people(me) + '/share/' + from]: { pr: true, td: true, st: true },
  ...extra
});
function connect(w, a = 'ann', b = 'bob', code = CODE) {
  const A = { ann: ANN, bob: BOB, cat: CAT }[a], B = { ann: ANN, bob: BOB, cat: CAT }[b];
  const r1 = mkCode(w[a], A, code), r2 = ask(w[b], B, A, code), r3 = confirmIt(w[a], A, B);
  if (!r1.ok || !r2.ok || !r3.ok) throw new Error('connect failed: ' + [r1, r2, r3].map(r => r.why).join(' | '));
}
const summaries = u => ({
  [`social/shared/${u}/me`]: { n: 'Name of ' + u, at: TS },
  [`social/shared/${u}/pr`]: { at: TS, ev: [{ d: '2026-10-19', x: 'Barbell Bench Press', w: 225, r: 5 }] },
  [`social/shared/${u}/td`]: { at: TS, end: '2026-10-20', b: '0'.repeat(34) + '1' },
  [`social/shared/${u}/st`]: { at: TS, end: '2026-10-20', d: Array(35).fill('8000').join(',') },
  [`social/shared/${u}/mac`]: { at: TS, end: '2026-10-19', b: 'b'.repeat(30) },
  [`social/shared/${u}/wt`]: { at: TS, tw: 182.4, rate: -0.8, goal: 175, dir: -1 }
});
const routine = (n = 3, sets = 3) => ({
  name: 'Push A', note: 'Heavy day',
  exercises: Array.from({ length: n }, (_, i) => ({
    exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell',
    sets: Array.from({ length: sets }, () => ({ tw: '225', tr: '5', type: 'N' }))
  }))
});

/* ================= A ================= */
section('A. the engine reads the rules that predate Friends the way RTDB does');
{
  const w = world();
  allowed(w.ann.set('users/' + ANN + '/food/log/2026-10-20/f1', { id: 'f1', name: 'Rice' }), 'an approved account writes its own food log');
  allowed(w.ann.get('users/' + ANN), 'and reads its own subtree');
  refused(w.bob.get('users/' + ANN), 'another approved account cannot read it');
  refused(w.bob.get('users/' + ANN + '/food/log'), 'not even one section of it');
  refused(w.bob.set('users/' + ANN + '/food/log/2026-10-20/f2', { name: 'x' }), 'nor write into it');
  refused(w.ann.set('users/' + ANN + '/junk', { a: 1 }), 'an ungranted top-level section is refused (the write that "fails silently")');
  refused(w.ann.set('users/' + ANN, { food: {} }), 'and so is a write at users/{uid} itself — grants are per section');
  refused(w.ann.set('users/' + ANN + '/profile', { name: 'Ann', stray: 1 }), 'profile\'s $other deny refuses a stray key');
  allowed(w.ann.set('users/' + ANN + '/profile', { name: 'Ann' }), 'and takes the named ones');
  refused(w.dan.set('users/' + DAN + '/food/log/2026-10-20/f1', { name: 'x' }), 'an account with no approval writes nothing of its own');
  refused(w.anon.get('users/' + ANN), 'signed out reads nothing');
  refused(w.ann.get('access/approved'), 'only the owner lists the approvals');
  allowed(w.owner.get('access/approved'), 'the owner does');
  w.db.poke('access/invites/AAAAA-BBBBB', { at: 1 });
  const claim = (cl, u, code, stamp = true) => cl.update('', {
    ['access/approved/' + u]: { at: 1, via: 'invite', code, name: 'Dan' },
    ...(stamp ? { ['access/invites/' + code + '/usedBy']: u, ['access/invites/' + code + '/usedAt']: 2 } : {})
  });
  refused(claim(w.dan, DAN, 'NOPE0-NOPE0'), 'the invite claim refuses a code that does not exist');
  allowed(claim(w.dan, DAN, 'AAAAA-BBBBB'), 'and lets a valid one in, approval and used-stamp in one update');
  refused(claim(w.cat, CAT, 'AAAAA-BBBBB'), 'a spent invite lets nobody else in');
  w.db.poke('access/invites/CCCCC-DDDDD', { at: 1 });
  const crafted = w.cat.update('', {
    ['access/approved/uEve']: { at: 1, via: 'invite', code: 'CCCCC-DDDDD', type: 'pro' },
    ['access/invites/CCCCC-DDDDD/usedBy']: 'uEve', ['access/invites/CCCCC-DDDDD/usedAt']: 2 });
  const eve = w.db.client({ uid: 'uEve' }).update('', {
    ['access/approved/uEve']: { at: 1, via: 'invite', code: 'CCCCC-DDDDD', type: 'pro' },
    ['access/invites/CCCCC-DDDDD/usedBy']: 'uEve', ['access/invites/CCCCC-DDDDD/usedAt']: 2 });
  refused(eve, 'a claim that carries type: pro is refused — by .validate, which a parent\'s .write grant cannot skip');
  check('…and it is .validate that refuses it', !eve.ok && /\.validate at \/access\/approved\/uEve\/type/.test(eve.why || ''), eve.why);
  refused(crafted, 'and nobody can claim an invite for somebody else');
  refused(w.ann.set('usage/' + ANN + '/days/not-a-day/appOpen', 1), 'usage refuses a day key of the wrong shape');
  allowed(w.ann.set('usage/' + ANN + '/days/2026-10-20/appOpen', 3), 'and takes one of the right shape');
}

/* ================= B ================= */
section('B. codes — mine only, one at a time, stamped by the server, a day long');
{
  const w = world();
  allowed(mkCode(w.ann, ANN, CODE), 'Ann makes a code and points to it, in one update');
  check('its time is the server\'s', w.db.peek('social/codes/' + CODE + '/at') === NOW);
  refused(w.ann.set('social/codes/' + CODE2, { u: ANN, n: 'Ann', k: 'friend', at: TS }), 'a code nobody points to is refused (no orphan codes)');
  refused(mkCode(w.ann, ANN, CODE2), 'a second code while the first stands is refused (the pointer cannot move)');
  allowed(mkCode(w.ann, ANN, CODE2, CODE), 'replacing it — the old one deleted in the same update — is allowed');
  check('and leaves exactly one code', w.db.peek('social/codes/' + CODE) === null && !!w.db.peek('social/codes/' + CODE2));
  refused(w.ann.set(people(ANN) + '/code', null), 'the pointer cannot be dropped while its code stands (it would orphan it)');
  allowed(w.ann.update('', { [people(ANN) + '/code']: null, ['social/codes/' + CODE2]: null }), 'dropping both together is fine');
  refused(w.bob.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'Ann', k: 'friend', at: TS }, [people(ANN) + '/code']: CODE }), 'Bob cannot make a code in Ann\'s name');
  refused(w.bob.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'Ann', k: 'friend', at: TS }, [people(BOB) + '/code']: CODE }), 'nor one that says Ann\'s uid, pointed to by himself');
  refused(w.ann.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'Ann', k: 'friend', at: NOW + 30 * DAY }, [people(ANN) + '/code']: CODE }), 'a client-chosen time is refused: only a server stamp (so no code outlives its day)');
  refused(w.ann.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'Ann', k: 'coach', at: TS }, [people(ANN) + '/code']: CODE }), 'a code of kind coach is refused — no kind but friend is live');
  refused(w.ann.update('', { ['social/codes/abcd-efgh']: { u: ANN, n: 'Ann', k: 'friend', at: TS }, [people(ANN) + '/code']: 'abcd-efgh' }), 'a key that is not a code\'s shape is refused');
  refused(w.ann.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'A'.repeat(41), k: 'friend', at: TS }, [people(ANN) + '/code']: CODE }), 'a name over 40 characters is refused');
  refused(w.ann.update('', { ['social/codes/' + CODE]: { u: ANN, n: 'Ann', k: 'friend', at: TS, x: 1 }, [people(ANN) + '/code']: CODE }), 'a stray field is refused');
  allowed(mkCode(w.ann, ANN, CODE), 'Ann makes one again');
  refused(w.bob.set('social/codes/' + CODE, null), 'Bob cannot delete Ann\'s code without spending it on a request');
  refused(w.dan.update('', { ['social/codes/' + CODE3]: { u: DAN, n: 'Dan', k: 'friend', at: TS }, [people(DAN) + '/code']: CODE3 }), 'an unapproved account makes no code');
  allowed(w.bob.get('social/codes/' + CODE), 'an approved account with the exact code reads it');
  refused(w.bob.get('social/codes'), 'nobody lists the codes (no enumeration)');
  refused(w.bob.get('social'), 'nor the tree they hang from');
  refused(w.dan.get('social/codes/' + CODE), 'an unapproved account cannot read a code (no guessing from a throwaway sign-up)');
  refused(w.anon.get('social/codes/' + CODE), 'nor can a signed-out one');
  w.db.setNow(NOW + DAY + 1);
  refused(w.bob.get('social/codes/' + CODE), 'a day later the code is unreadable');
  allowed(w.ann.get('social/codes/' + CODE), 'except to its owner, who can see it ran out');
}

/* ================= C ================= */
section('C. requests — only with the owner\'s live, current code, spent as it is used');
{
  let w = world();
  mkCode(w.ann, ANN, CODE);
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE, k: 'friend', at: TS } }), 'a request that does not spend the code is refused (codes are single-use)');
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE3, k: 'friend', at: TS }, ['social/codes/' + CODE3]: null }), 'a made-up code is refused');
  refused(ask(w.ann, ANN, ANN, CODE), 'Ann cannot request herself with her own code');
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE, k: 'coach', at: TS }, ['social/codes/' + CODE]: null }), 'a request of another kind than the code\'s is refused');
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE, k: 'friend', at: NOW - 5 * DAY }, ['social/codes/' + CODE]: null }), 'a backdated request is refused (server stamp only)');
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE, k: 'friend', at: TS, extra: 'x' }, ['social/codes/' + CODE]: null }), 'a stray field in a request is refused');
  refused(w.cat.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob', c: CODE, k: 'friend', at: TS }, ['social/codes/' + CODE]: null }), 'Cat cannot file a request in Bob\'s name');
  refused(w.dan.update('', { [people(ANN) + '/req/' + DAN]: { n: 'Dan', c: CODE, k: 'friend', at: TS }, ['social/codes/' + CODE]: null }), 'an unapproved account cannot request');
  allowed(ask(w.bob, BOB, ANN, CODE), 'Bob, with Ann\'s code: the request, the code spent, his note and his switches — one update');
  check('the code is gone', w.db.peek('social/codes/' + CODE) === null);
  refused(ask(w.cat, CAT, ANN, CODE), 'Cat cannot use the same code after him (single use)');
  refused(w.bob.update('', { [people(ANN) + '/req/' + BOB]: { n: 'Bob again', c: CODE, k: 'friend', at: TS } }), 'Bob cannot overwrite his request');
  refused(w.cat.set(people(ANN) + '/req/' + BOB, null), 'Cat cannot delete Bob\'s request to Ann');
  refused(w.cat.set(people(ANN) + '/req/' + BOB + '/n', 'Cat'), 'nor rename it');
  allowed(w.bob.get(people(ANN) + '/req/' + BOB), 'Bob can read his own request, to show it pending');
  refused(w.bob.get(people(ANN) + '/req'), 'but not Ann\'s other requests');
  refused(w.bob.get(people(ANN)), 'nor her node');
  allowed(w.ann.get(people(ANN)), 'Ann reads her node, request and all');

  // An expired code, and one that is not the owner's current one.
  w = world();
  mkCode(w.ann, ANN, CODE);
  w.db.setNow(NOW + DAY + 1);
  refused(ask(w.bob, BOB, ANN, CODE), 'a code past its day is refused, whatever the requester\'s clock says');
  w = world();
  mkCode(w.ann, ANN, CODE);
  w.db.poke('social/codes/' + CODE2, { u: ANN, n: 'Ann', k: 'friend', at: NOW });   // a code Ann does not point to (seeded past the rules)
  refused(ask(w.bob, BOB, ANN, CODE2), 'a code that is not the owner\'s current one is refused');
  w = world();
  connect(w);
  mkCode(w.ann, ANN, CODE2);
  refused(ask(w.bob, BOB, ANN, CODE2), 'a friend cannot request again (no duplicate connection)');
  // Out entries go only beside a new request.
  w = world();
  refused(w.bob.set(people(BOB) + '/out/' + ANN, { n: 'Ann', at: TS }), 'an outgoing note with no request beside it is refused');
}

/* ================= D ================= */
section('D. confirming — only the person asked, only over a pending request, both sides at once');
{
  let w = world();
  mkCode(w.ann, ANN, CODE);
  ask(w.bob, BOB, ANN, CODE);
  refused(confirmIt(w.bob, BOB, ANN), 'Bob cannot confirm his own request');
  refused(w.bob.update('', {
    [people(BOB) + '/list/' + ANN]: { k: 'friend', n: 'Ann', at: TS }, [people(ANN) + '/list/' + BOB]: { k: 'friend', n: 'Bob', at: TS }
  }), 'nor write both sides himself');
  refused(w.ann.update('', { [people(ANN) + '/list/' + BOB]: { k: 'friend', n: 'Bob', at: TS }, [people(ANN) + '/req/' + BOB]: null }), 'Ann cannot make only her own side');
  refused(w.ann.update('', { [people(BOB) + '/list/' + ANN]: { k: 'friend', n: 'Ann', at: TS }, [people(ANN) + '/req/' + BOB]: null }), 'nor only Bob\'s');
  refused(w.ann.update('', {
    [people(ANN) + '/list/' + BOB]: { k: 'friend', n: 'Bob', at: TS }, [people(BOB) + '/list/' + ANN]: { k: 'friend', n: 'Ann', at: TS }
  }), 'nor both while keeping the request (it is spent by confirming)');
  refused(w.ann.update('', {
    [people(ANN) + '/list/' + BOB]: { k: 'coach', n: 'Bob', at: TS }, [people(BOB) + '/list/' + ANN]: { k: 'coach', n: 'Ann', at: TS },
    [people(ANN) + '/req/' + BOB]: null
  }), 'nor confirm it as a different kind than was asked for');
  refused(confirmIt(w.ann, ANN, CAT), 'Ann cannot connect with Cat, who never asked');
  refused(confirmIt(w.cat, CAT, BOB, { [people(CAT) + '/list/' + BOB]: { k: 'friend', n: 'Bob', at: TS } }), 'Cat cannot confirm a request that is Ann\'s');
  allowed(confirmIt(w.ann, ANN, BOB), 'Ann confirms: both sides, the request and Bob\'s note gone, her switches — one update');
  check('both sides stand', !!w.db.peek(people(ANN) + '/list/' + BOB) && !!w.db.peek(people(BOB) + '/list/' + ANN));
  refused(w.bob.set(people(BOB) + '/list/' + ANN, { k: 'coach', n: 'Ann', at: TS }), 'a connection cannot be edited — kind and all (no escalation)');
  refused(w.ann.set(people(ANN) + '/list/' + BOB + '/k', 'coach'), 'not even one field of it');
  refused(w.cat.set(people(ANN) + '/list/' + CAT, { k: 'friend', n: 'Cat', at: TS }), 'Cat cannot add herself to Ann\'s list');
  refused(w.cat.get(people(BOB)), 'nobody else reads Bob\'s node (no friend-list enumeration)');
  refused(w.ann.update('', { [people(ANN) + '/list/' + ANN]: { k: 'friend', n: 'Ann', at: TS } }), 'nobody befriends themselves');
  // A crossed pair of requests: either confirm makes it, and clears both.
  w = world();
  mkCode(w.ann, ANN, CODE); mkCode(w.bob, BOB, CODE2);
  allowed(ask(w.bob, BOB, ANN, CODE), 'crossed: Bob asks Ann');
  allowed(ask(w.ann, ANN, BOB, CODE2), 'and Ann asks Bob');
  allowed(confirmIt(w.ann, ANN, BOB, { [people(BOB) + '/req/' + ANN]: null, [people(ANN) + '/out/' + BOB]: null }), 'Ann confirms Bob\'s, and her own request to him goes in the same update');
}

/* ================= E ================= */
section('E. reading what a friend shows — both sides standing, the owner\'s switch on, never the log');
{
  const w = world();
  connect(w);
  allowed(w.ann.update('', summaries(ANN)), 'Ann publishes her summaries');
  allowed(w.bob.update('', summaries(BOB)), 'and Bob his');
  allowed(w.bob.get('social/shared/' + ANN + '/me'), 'Bob reads Ann\'s name card');
  allowed(w.bob.get('social/shared/' + ANN + '/pr'), 'Bob reads Ann\'s PRs — switched on for him by default');
  allowed(w.bob.get('social/shared/' + ANN + '/td'), 'and her training days');
  allowed(w.bob.get('social/shared/' + ANN + '/st'), 'and her steps');
  refused(w.bob.get('social/shared/' + ANN + '/wt'), 'not her weight — off by default');
  refused(w.bob.get('social/shared/' + ANN + '/mac'), 'nor her macros — off by default');
  refused(w.bob.get('social/shared/' + ANN), 'nor all of it at once (no grant on the parent)');
  refused(w.bob.get('social/shared'), 'nobody lists the summaries');
  allowed(w.bob.get(people(ANN) + '/share/' + BOB), 'Bob may read which switches Ann has on for him');
  refused(w.bob.get(people(ANN) + '/share'), 'but not her switches for anyone else');
  refused(w.cat.get('social/shared/' + ANN + '/me'), 'Cat, not a friend, reads nothing — not even the name');
  refused(w.cat.get('social/shared/' + ANN + '/pr'), 'and no PRs');
  for (const n of ['food', 'weight', 'workouts', 'steps', 'profile', 'routines', 'settings']) {
    refused(w.bob.get('users/' + ANN + '/' + n), 'a friend still cannot read users/' + 'Ann/' + n);
  }
  allowed(w.ann.set(people(ANN) + '/share/' + BOB, { pr: true, td: true, st: true, wt: true }), 'Ann switches weight on for Bob');
  allowed(w.bob.get('social/shared/' + ANN + '/wt'), 'and Bob can read it at once');
  refused(w.cat.get('social/shared/' + ANN + '/wt'), 'Cat still cannot (the switch is per friend)');
  allowed(w.ann.set(people(ANN) + '/share/' + BOB, { td: true }), 'Ann switches PRs, steps and weight off again');
  refused(w.bob.get('social/shared/' + ANN + '/pr'), 'and Bob\'s next read of her PRs is refused — immediately, by the database');
  refused(w.bob.get('social/shared/' + ANN + '/wt'), 'and of her weight');
  allowed(w.bob.get('social/shared/' + ANN + '/td'), 'what stays on stays readable');
  allowed(w.ann.set(people(ANN) + '/share/' + BOB, null), 'Ann switches everything off');
  refused(w.bob.get('social/shared/' + ANN + '/td'), 'and Bob reads nothing');
  allowed(w.bob.get('social/shared/' + ANN + '/me'), 'but they are still friends: the name card stays');
  allowed(w.ann.get('social/shared/' + BOB + '/pr'), 'what Bob shows Ann is his own choice, untouched by hers (one direction per switch)');
}

/* ================= F ================= */
section('F. writing summaries — my own only, in the shapes and sizes the rules name');
{
  const w = world();
  connect(w);
  refused(w.bob.set('social/shared/' + ANN + '/pr', { at: TS, ev: [{ d: '2026-10-19', x: 'Fake', w: 999, r: 1 }] }), 'Bob cannot write Ann\'s summaries');
  refused(w.bob.set('social/shared/' + ANN, null), 'nor delete them');
  refused(w.ann.set('social/shared/' + ANN + '/food', { at: TS, log: 'everything' }), 'a category the rules do not name is refused');
  refused(w.ann.set('social/shared/' + ANN + '/pr', { at: TS, ev: Array.from({ length: 31 }, () => ({ d: '2026-10-19', x: 'Bench', w: 100, r: 1 })) }), 'more than 30 PR events is refused');
  refused(w.ann.set('social/shared/' + ANN + '/pr', { at: TS, ev: [{ d: '2026-10-19', x: 'Bench', w: 100, r: 1, set: [1, 2, 3] }] }), 'a PR event carrying anything more is refused');
  refused(w.ann.set('social/shared/' + ANN + '/pr', { at: TS, ev: [{ d: '2026-10-19', x: 'B'.repeat(61), w: 100, r: 1 }] }), 'a lift name over 60 characters is refused');
  refused(w.ann.set('social/shared/' + ANN + '/td', { at: TS, end: '2026-10-20', b: '1'.repeat(36) }), 'a training strip that is not 35 days is refused');
  refused(w.ann.set('social/shared/' + ANN + '/td', { at: TS, end: '2026-10-20', b: '1'.repeat(35), sessions: {} , x: 1 }), 'a training summary carrying anything more is refused');
  refused(w.ann.set('social/shared/' + ANN + '/st', { at: TS, end: '2026-10-20', d: '9'.repeat(251) }), 'a steps string over 250 characters is refused');
  refused(w.ann.set('social/shared/' + ANN + '/st', { at: TS, end: '2026-10-20', d: '1,2,<script>' }), 'a steps string of anything but digits and commas is refused');
  refused(w.ann.set('social/shared/' + ANN + '/mac', { at: TS, end: '2026-10-19', b: 'b'.repeat(30), cal: [2400, 2500] }), 'a macro summary carrying calories is refused');
  refused(w.ann.set('social/shared/' + ANN + '/wt', { at: TS, tw: 182, entries: { a: 182 } }), 'a weight summary carrying weigh-ins is refused');
  refused(w.ann.set('social/shared/' + ANN + '/wt', { at: TS, tw: 5000 }), 'a trend weight out of range is refused');
  refused(w.ann.set('social/shared/' + ANN + '/me', { n: 'Ann', at: NOW - DAY }), 'a summary stamped by the client is refused (server stamp only)');
  allowed(w.ann.set('social/shared/' + ANN + '/wt', { at: TS, tw: 182.4 }), 'a weight summary with only the trend is allowed');
  allowed(w.ann.update('', { ['social/shared/' + ANN + '/wt']: null, ['social/shared/' + ANN + '/mac']: null }), 'Ann deletes categories nobody may read');
  refused(w.dan.set('social/shared/' + DAN + '/me', { n: 'Dan', at: TS }), 'an unapproved account publishes nothing');
}

/* ================= G ================= */
section('G. the switches — only mine, only for a friend or somebody I asked');
{
  const w = world();
  connect(w);
  refused(w.bob.set(people(ANN) + '/share/' + BOB, { pr: true, td: true, st: true, mac: true, wt: true }), 'Bob cannot switch on what Ann shows him (no escalation)');
  refused(w.bob.set(people(ANN) + '/share/' + BOB + '/wt', true), 'not even one switch');
  refused(w.cat.set(people(ANN) + '/share/' + CAT, { pr: true }), 'Cat cannot write herself a switch on Ann\'s node');
  refused(w.ann.set(people(ANN) + '/share/' + CAT, { pr: true }), 'Ann cannot write switches for a stranger (no junk under her node)');
  refused(w.ann.set(people(ANN) + '/share/' + BOB, { pr: 'yes' }), 'a switch is a boolean');
  refused(w.ann.set(people(ANN) + '/share/' + BOB, { pr: true, food: true }), 'and there are five of them');
  allowed(w.bob.set(people(ANN) + '/share/' + BOB, null), 'Bob may DELETE Ann\'s switches for him — it can only ever show him less');
  refused(w.bob.get('social/shared/' + ANN + '/pr'), 'and then reads nothing of hers');
  refused(w.ann.set(people(ANN) + '/code', 'ZZZZ-ZZZZ'), 'a pointer to a code that is not hers is refused');
  refused(w.ann.set(people(ANN) + '/nickname', 'x'), 'her node holds only the named children');
}

/* ================= H ================= */
section('H. the inbox — a friend writes only their own slot, bounded; the receiver reads and deletes');
{
  const w = world();
  connect(w);
  const slot = (to, from) => 'social/inbox/' + to + '/' + from;
  allowed(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine() }), 'Ann sends Bob a routine');
  allowed(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine(2) }), 'sending again replaces it (one slot per sender: no inbox spam)');
  refused(w.ann.set(slot(BOB, CAT), { at: TS, n: 'Cat', r: routine() }), 'Ann cannot write Cat\'s slot in Bob\'s inbox (no impersonation)');
  refused(w.ann.set(slot(BOB, ANN) + '-2', { at: TS, n: 'Ann', r: routine() }), 'nor a second slot of her own');
  refused(w.cat.set(slot(BOB, CAT), { at: TS, n: 'Cat', r: routine() }), 'Cat, not his friend, cannot send Bob anything');
  refused(w.ann.set(slot(CAT, ANN), { at: TS, n: 'Ann', r: routine() }), 'nor can Ann send to Cat');
  refused(w.ann.set(slot(ANN, ANN), { at: TS, n: 'Ann', r: routine() }), 'nor to herself');
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine(31) }), 'more than 30 exercises is refused');
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine(1, 31) }), 'more than 30 sets in one is refused');
  const big = routine(1); big.exercises[0].sets[0].tw = '9'.repeat(13);
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: big }), 'a target over 12 characters is refused');
  const odd = routine(1); odd.exercises[0].sets[0].type = 'X';
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: odd }), 'a set type outside W N F D is refused');
  const extra = routine(1); extra.exercises[0].history = [{ w: 315 }];
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: extra }), 'an exercise carrying anything more (history, a log) is refused');
  const odd2 = routine(1); odd2.exercises[0].exId = '../../users/' + BOB;
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: odd2 }), 'an exercise id of the wrong shape is refused');
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine(), attachment: 'x'.repeat(5000) }), 'a stray field on the slot is refused');
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: { ...routine(), name: 'R'.repeat(61) } }), 'a routine name over 60 is refused');
  refused(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: { ...routine(), note: 'N'.repeat(201) } }), 'a note over 200 is refused');
  allowed(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine(30, 30) }), 'the largest routine the rules take — 30 by 30 — is allowed');
  check('and is bounded: about ' + Math.round(JSON.stringify(w.db.peek(slot(BOB, ANN))).length / 1024) + ' KB', JSON.stringify(w.db.peek(slot(BOB, ANN))).length < 64 * 1024);
  allowed(w.bob.get('social/inbox/' + BOB), 'Bob reads his inbox');
  allowed(w.ann.get(slot(BOB, ANN)), 'Ann reads what she left there');
  refused(w.ann.get('social/inbox/' + BOB), 'but not the rest of Bob\'s inbox');
  refused(w.cat.get(slot(BOB, ANN)), 'Cat reads none of it');
  refused(w.cat.set(slot(BOB, ANN), null), 'and cannot delete it');
  allowed(w.bob.set(slot(BOB, ANN), null), 'Bob deletes it (accept or decline)');
  allowed(w.ann.set(slot(BOB, ANN), { at: TS, n: 'Ann', r: routine() }), 'Ann sends another');
  allowed(w.ann.set(slot(BOB, ANN), null), 'and may take it back herself');
}

/* ================= I ================= */
section('I. removing — either side, at once — and a removed friend cannot come back on their own');
{
  let w = world();
  connect(w);
  w.ann.update('', summaries(ANN));
  w.bob.update('', summaries(BOB));
  w.ann.set('social/inbox/' + BOB + '/' + ANN, { at: TS, n: 'Ann', r: routine() });
  // Bob deletes only HIS side. Both directions end at once.
  allowed(w.bob.set(people(BOB) + '/list/' + ANN, null), 'Bob deletes his side alone');
  refused(w.bob.get('social/shared/' + ANN + '/pr'), 'Bob can no longer read Ann');
  refused(w.ann.get('social/shared/' + BOB + '/pr'), 'and Ann can no longer read Bob — a connection needs both sides');
  refused(w.ann.get('social/shared/' + BOB + '/me'), 'not even his name card');
  refused(w.ann.set('social/inbox/' + BOB + '/' + ANN, { at: TS, n: 'Ann', r: routine() }), 'nor send him anything');
  refused(w.bob.set(people(BOB) + '/list/' + ANN, { k: 'friend', n: 'Ann', at: TS }), 'Bob cannot put his side back');
  refused(w.bob.update('', {
    [people(BOB) + '/list/' + ANN]: { k: 'friend', n: 'Ann', at: TS }, [people(ANN) + '/list/' + BOB]: { k: 'friend', n: 'Bob', at: TS }
  }), 'nor write both back');
  // The app's own removal: everything between them, either side.
  w = world();
  connect(w);
  w.ann.set('social/inbox/' + BOB + '/' + ANN, { at: TS, n: 'Ann', r: routine() });
  w.bob.set('social/inbox/' + ANN + '/' + BOB, { at: TS, n: 'Bob', r: routine() });
  allowed(w.ann.update('', {
    [people(ANN) + '/list/' + BOB]: null, [people(BOB) + '/list/' + ANN]: null,
    [people(ANN) + '/share/' + BOB]: null, [people(BOB) + '/share/' + ANN]: null,
    ['social/inbox/' + ANN + '/' + BOB]: null, ['social/inbox/' + BOB + '/' + ANN]: null
  }), 'Ann removes Bob: both sides, both sets of switches, both inbox slots — one update');
  check('nothing between them is left', ['list/' + BOB, 'share/' + BOB].every(p => w.db.peek(people(ANN) + '/' + p) === null) &&
    ['list/' + ANN, 'share/' + ANN].every(p => w.db.peek(people(BOB) + '/' + p) === null) &&
    w.db.peek('social/inbox/' + ANN + '/' + BOB) === null && w.db.peek('social/inbox/' + BOB + '/' + ANN) === null);
  refused(w.cat.update('', { [people(ANN) + '/list/' + BOB]: null }), 'a third account cannot remove anybody');
  mkCode(w.bob, BOB, CODE2);
  refused(ask(w.ann, ANN, BOB, CODE), 'the removed side cannot re-add with an old, spent code');
  allowed(ask(w.ann, ANN, BOB, CODE2), 'only with a NEW code from the other person');
  allowed(confirmIt(w.bob, BOB, ANN), 'and their confirm');
}

/* ================= J ================= */
section('J. unapproved, revoked and signed out');
{
  const w = world();
  connect(w);
  w.ann.update('', summaries(ANN));
  w.db.poke('access/approved/' + BOB, null);   // the owner removed Bob
  refused(w.bob.get('social/shared/' + ANN + '/pr'), 'a removed account reads nothing of a friend\'s');
  refused(w.bob.get(people(BOB)), 'nor its own node');
  refused(w.bob.set(people(BOB) + '/share/' + ANN, { pr: true }), 'nor writes');
  refused(w.bob.set('social/shared/' + BOB + '/me', { n: 'Bob', at: TS }), 'nor publishes');
  w.db.poke('access/approved/' + BOB, { at: 1, via: 'owner' });
  w.bob.update('', summaries(BOB));
  w.db.poke('access/approved/' + BOB, null);
  refused(w.ann.get('social/shared/' + BOB + '/pr'), 'and what a removed account published is unreadable while it is out');
  refused(w.anon.get('social/shared/' + ANN + '/me'), 'signed out reads nothing');
  refused(w.anon.set('social/codes/' + CODE3, { u: 'x', n: 'x', k: 'friend', at: TS }), 'and writes nothing');
  allowed(w.owner.update('', { ['social/codes/' + CODE3]: { u: OWNER, n: 'Micah', k: 'friend', at: TS }, [people(OWNER) + '/code']: CODE3 }), 'the owner, approved by the rules themselves, makes a code like anybody');
  refused(w.owner.get('social/shared/' + ANN + '/pr'), 'and reads nobody\'s summaries without being their friend — the owner has no back door here');
  refused(w.owner.get('social/people/' + ANN), 'nor anybody\'s friends');
}

/* ================= K ================= */
section('K. the lock variant agrees');
{
  check('database.rules.OPTIONAL-LOCK.json carries the identical social tree', JSON.stringify(LOCK.rules.social) === JSON.stringify(RULES.rules.social));
  check('the owner uid in the rules is firebase-config.js\'s', !!OWNER && JSON.stringify(RULES.rules.social).includes(OWNER));
  // One run of the main flow through the lock variant, so "identical" is not taken on trust.
  const w = world(LOCK);
  let ok = true;
  try { connect(w); } catch { ok = false; }
  check('and the whole connect flow passes under it too', ok);
}

/* ================= L (v68) ================= */
section('L. v68 — a friend\'s face: only friends read it, only a small JPEG data string is written');
{
  const w = world();
  connect(w);
  const JPEG = 'data:image/jpeg;base64,' + '/9j/4AAQSkZJRgABAQ'.repeat(40) + 'AA==';
  allowed(w.ann.set('social/shared/' + ANN + '/av', { p: JPEG, at: TS }), 'Ann publishes a small JPEG face');
  allowed(w.bob.get('social/shared/' + ANN + '/av'), 'Bob, her friend, reads it');
  refused(w.cat.get('social/shared/' + ANN + '/av'), 'Cat, not her friend, does not');
  refused(w.dan.get('social/shared/' + ANN + '/av'), 'nor does an unapproved account');
  refused(w.anon.get('social/shared/' + ANN + '/av'), 'nor anybody signed out');
  refused(w.owner.get('social/shared/' + ANN + '/av'), 'nor the owner, who is not her friend');
  refused(w.bob.set('social/shared/' + ANN + '/av', { p: JPEG, at: TS }), 'Bob cannot write Ann\'s face');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: 'data:image/jpeg;base64,' + 'A'.repeat(6000), at: TS }), 'over 6,000 characters is refused');
  allowed(w.ann.set('social/shared/' + ANN + '/av', { p: 'data:image/jpeg;base64,' + 'A'.repeat(6000 - 23), at: TS }), 'exactly 6,000 is allowed');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: 'data:image/png;base64,AAAA', at: TS }), 'a PNG is refused (JPEG only)');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: 'data:image/svg+xml;base64,AAAA', at: TS }), 'an SVG — which could carry script — is refused');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: 'data:image/jpeg;base64,AA"><script>', at: TS }), 'anything but base64 after the prefix is refused');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: 'https://example.com/me.jpg', at: TS }), 'a URL is refused — nothing is fetched from anywhere');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: JPEG, at: NOW - 5 }), 'a client stamp is refused');
  refused(w.ann.set('social/shared/' + ANN + '/av', { p: JPEG, at: TS, big: 'x' }), 'and it carries nothing else');
  allowed(w.ann.set('social/shared/' + ANN + '/av', null), 'Ann removes it');
  allowed(w.ann.set('social/shared/' + ANN + '/av', { p: JPEG, at: TS }), 'and puts it back');
  allowed(w.ann.update('', { [people(ANN) + '/list/' + BOB]: null }), 'Ann removes her side of Bob');
  refused(w.bob.get('social/shared/' + ANN + '/av'), 'and Bob reads her face no more, at once');
}

/* ================= M (v68) ================= */
section('M. v68 — nudges: friends only, one a day by the server\'s clock, fixed words, the receiver decides');
{
  const w = world();
  connect(w);
  const nudge = (cl, from, to, v = 0) => cl.update('', { ['social/nudge/' + to + '/' + from]: { v, at: TS }, [people(from) + '/nudged/' + to]: TS });
  allowed(nudge(w.bob, BOB, ANN), 'Bob nudges Ann: the nudge and his stamp, in one write');
  allowed(w.ann.get('social/nudge/' + ANN), 'Ann reads her nudges');
  allowed(w.bob.get('social/nudge/' + ANN + '/' + BOB), 'Bob reads the one he sent');
  refused(w.cat.get('social/nudge/' + ANN), 'Cat reads nobody\'s');
  refused(w.bob.get('social/nudge/' + ANN), 'and Bob not the rest of Ann\'s box');
  refused(nudge(w.bob, BOB, ANN), 'a second nudge the same day is refused');
  allowed(w.ann.set('social/nudge/' + ANN + '/' + BOB, null), 'Ann dismisses it');
  refused(nudge(w.bob, BOB, ANN), 'and dismissing does not open the door: still one a day');
  refused(w.bob.set(people(BOB) + '/nudged/' + ANN, null), 'Bob cannot delete his stamp to send again');
  refused(w.bob.set(people(BOB) + '/nudged/' + ANN, TS), 'nor move it on its own');
  refused(w.bob.set('social/nudge/' + ANN + '/' + BOB, { v: 1, at: TS }), 'a nudge without the stamp beside it is refused');
  w.db.setNow(NOW + DAY - 1);
  refused(nudge(w.bob, BOB, ANN), 'a minute short of a day: still refused');
  w.db.setNow(NOW + DAY);
  allowed(nudge(w.bob, BOB, ANN, 1), 'a day later, the next one goes');
  w.db.setNow(NOW + 2 * DAY);
  refused(w.cat.update('', { ['social/nudge/' + ANN + '/' + CAT]: { v: 0, at: TS }, [people(CAT) + '/nudged/' + ANN]: TS }), 'Cat, not a friend, cannot nudge Ann');
  refused(w.dan.update('', { ['social/nudge/' + ANN + '/' + DAN]: { v: 0, at: TS }, [people(DAN) + '/nudged/' + ANN]: TS }), 'nor can an unapproved account');
  refused(nudge(w.bob, BOB, BOB), 'nobody nudges themselves');
  refused(w.bob.update('', { ['social/nudge/' + ANN + '/' + BOB]: { v: 3, at: TS }, [people(BOB) + '/nudged/' + ANN]: TS }), 'a wording that is not one of the three is refused');
  refused(w.bob.update('', { ['social/nudge/' + ANN + '/' + BOB]: { v: 0, at: TS, text: 'free text' }, [people(BOB) + '/nudged/' + ANN]: TS }), 'free text is refused — fixed words only');
  refused(w.bob.update('', { ['social/nudge/' + ANN + '/' + BOB]: { v: 0, at: NOW }, [people(BOB) + '/nudged/' + ANN]: TS }), 'a client stamp is refused');
  refused(w.bob.update('', { ['social/nudge/' + ANN + '/' + CAT]: { v: 0, at: TS }, [people(BOB) + '/nudged/' + ANN]: TS }), 'Bob cannot write a nudge in Cat\'s name');
  allowed(w.ann.set(people(ANN) + '/nonudge/' + BOB, true), 'Ann switches off nudges from Bob');
  refused(w.bob.set(people(ANN) + '/nonudge/' + BOB, null), 'Bob cannot switch them back on for himself');
  refused(nudge(w.bob, BOB, ANN), 'and his next nudge is refused');
  refused(w.ann.set(people(ANN) + '/nonudge/' + BOB, 'yes'), 'the switch is `true` or absent');
  allowed(w.ann.set(people(ANN) + '/nonudge/' + BOB, null), 'Ann allows them again');
  allowed(w.ann.set(people(ANN) + '/quiet', true), 'Ann mutes all nudges');
  refused(nudge(w.bob, BOB, ANN), 'and none gets through');
  refused(w.bob.set(people(ANN) + '/quiet', null), 'nobody else unmutes her');
  allowed(w.ann.set(people(ANN) + '/quiet', null), 'Ann unmutes');
  allowed(nudge(w.bob, BOB, ANN, 2), 'and a nudge lands again');
  allowed(w.bob.set('social/nudge/' + ANN + '/' + BOB, null), 'the sender may take one back');
  refused(w.cat.set('social/nudge/' + ANN + '/' + BOB, null), 'a stranger may not delete one');
  allowed(w.ann.update('', { [people(ANN) + '/list/' + BOB]: null, [people(BOB) + '/list/' + ANN]: null }), 'Ann removes Bob');
  w.db.setNow(NOW + 4 * DAY);
  refused(nudge(w.bob, BOB, ANN), 'and a removed friend cannot nudge');
  refused(w.ann.set(people(ANN) + '/nudged/' + BOB, TS), 'and a stamp alone is never written');
  refused(w.ann.set(people(ANN) + '/nonudge/' + ANN, true), 'and nobody switches nudges from themselves');
}

console.log('\nFriends: the rules, run\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
