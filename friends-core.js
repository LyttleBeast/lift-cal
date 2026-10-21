// Friends — the pure half of the connection layer (rack-v67).
//
// One account can see another's training only through what that account
// chose to show it. Everything here exists to keep that sentence true, and
// the database rules (database.rules.json, `social`) are what make it true
// against a client that ignores this file: every shape, size and bound below
// is the rules' own, written down once for the app to build its writes from.
// A write this file would refuse, the rules refuse too; tools-check/
// friends-rules.mjs runs the real rules file to prove it, and tools-check/
// friends-pure.mjs proves every payload built here is one they accept.
//
// THE MODEL, in one paragraph (AGENTS.md has the nodes). A connection is two
// entries, one in each account's `social/people/{uid}/list`, and it exists
// only while BOTH do. It is made in three steps: A makes a short code that
// works once and for 24 hours; B types it, which files a request on A's node
// and spends the code in the same atomic write; A confirms, which writes both
// entries at once. Either side deletes their own entry and the connection is
// over at that instant, because every read a friend makes is gated on both.
// What a friend sees is a handful of small derived summaries the owner's own
// phone computes (friends-summary.js), each one gated by the owner's switch
// for that friend — never the owner's log.
//
// KINDS. `friend` is the only kind there is. `coach` and `team` are written
// down here so the shape has room for them — every connection carries its
// kind, the code it came from fixes it, and nothing can change it afterwards —
// but they are not live: no screen offers them and the rules accept a code of
// no kind but 'friend'. Making one live is a decision about what a coach may
// see, a rules change at `social/codes/$code/k`, and a screen; not a flag.
//
// PURE. No DOM, no store, no clock of its own: time is always an argument and
// randomness is a function handed in. The native port copies this file
// verbatim, like coach.js and its siblings; its one import is exercises.js,
// which is pure too.

import { EXERCISE_BY_ID, GROUP_ORDER, EQUIPMENT } from './exercises.js';

/* ================= kinds ================= */

export const KINDS = Object.freeze({
  friend: Object.freeze({ label: 'Friend', live: true }),
  // Reserved. Not offered, not accepted by the rules, never drawn.
  coach:  Object.freeze({ label: 'Coach',  live: false }),
  team:   Object.freeze({ label: 'Team',   live: false })
});

/* The kind of a connection as this build understands it: a live kind, or
   null. A connection of a kind this build does not offer is not drawn at all
   — failing closed, so a later build's coach link never shows up here as a
   plain friend with a plain friend's screen. */
export function liveKind(k) {
  return typeof k === 'string' && Object.prototype.hasOwnProperty.call(KINDS, k) && KINDS[k].live ? k : null;
}

/* ================= codes ================= */

// The invite alphabet (access.js): no 0 O 1 I L, so a code read off one
// phone and typed on another has no "was that a one or an el".
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LEN = 8;
// The rules' `now - 86400000`. A code's clock is the SERVER's — its `at` is
// a server timestamp the rules check against `now` — so no phone with a
// wrong clock can make a code that lives longer.
export const CODE_TTL_MS = 86400000;
// The rules' code key: 'ABCD-EFGH'.
export const CODE_RE = /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

/* A new code from `nextByte`, a function returning 0–255 (the caller hands
   in crypto.getRandomValues; a verifier hands in a fixed stream). Rejection
   sampling rather than `byte % 31`: 256 is not a multiple of 31, and the
   modulo would make the first eight letters a fifth more likely than the rest.

   Eight characters is 31^8, about 8.5 × 10^11. What that has to stand up to:
   only an approved account can read a code at all, each account has at most
   one live, a code lasts a day and works once, and what a guess wins is a
   request its owner sees with the guesser's name on it and declines. */
export function makeCode(nextByte) {
  const LIMIT = 256 - (256 % CODE_ALPHABET.length);
  const out = [];
  let guard = 0;
  while (out.length < CODE_LEN) {
    if (++guard > 4096) throw new Error('random source is not random');
    const b = nextByte() | 0;
    if (b < 0 || b >= LIMIT) continue;
    out.push(CODE_ALPHABET[b % CODE_ALPHABET.length]);
  }
  return out.slice(0, 4).join('') + '-' + out.slice(4).join('');
}

/* What somebody typed, as a code, or null. Case and spacing do not matter
   and the hyphen is optional; a character the alphabet does not have is a
   mistyped code, never a guess at what was meant. */
export function normCode(raw) {
  const s = String(raw == null ? '' : raw).toUpperCase().replace(/[\s-]/g, '');
  if (s.length !== CODE_LEN) return null;
  if (![...s].every(c => CODE_ALPHABET.includes(c))) return null;
  const code = s.slice(0, 4) + '-' + s.slice(4);
  return CODE_RE.test(code) ? code : null;
}

/* Milliseconds a code made at `at` has left at `nowMs` (both server-ish
   epoch ms), or 0. A code with no readable time has none. */
export function codeLeft(at, nowMs) {
  if (!Number.isFinite(at) || !Number.isFinite(nowMs) || at <= 0) return 0;
  return Math.max(0, at + CODE_TTL_MS - nowMs);
}

/* "23 h", "40 min", "under a minute" — how long a code has, for a person. */
export function leftWords(ms) {
  if (!(ms > 0)) return 'expired';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'under a minute';
  if (min < 60) return min + ' min';
  return Math.floor(min / 60) + ' h';
}

/* ================= names ================= */

export const NAME_MAX = 40;   // the rules' `n`, everywhere

/* At most `max` UTF-16 units, never half a character. The rules' `.length`
   is a string's length as the database counts it, which is safest read as
   UTF-16 units — an emoji is two — and a cut must never leave a lone half of
   a pair behind, which is not text at all. Whole characters only, then. */
export function fit(s, max) {
  let out = '';
  for (const ch of String(s == null ? '' : s)) {
    if (out.length + ch.length > max) break;
    out += ch;
  }
  return out;
}

/* A display name as the rules take it: trimmed, inner whitespace collapsed,
   control characters out, at most 40 characters, never empty. Applied to a
   name read back as well as to one written — a name is somebody else's
   typing and is only ever drawn as text. */
export function cleanName(s, fallback = 'A friend') {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ').trim();
  return fit(t, NAME_MAX).trim() || fallback;
}

export function initialsOf(name) {
  const parts = cleanName(name, '').split(' ').filter(Boolean);
  if (!parts.length) return '–';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ================= what each person shows each friend ================= */

/* The five switches, in the order they are drawn. Absent means OFF — the
   rules read only `=== true` — so a connection made by an older build, a
   switch nobody wrote, and a value the rules would refuse all show nothing.

   THE DEFAULTS. Three are on when a connection is made, and only three:
   personal records, training days and steps. Those are what the three boards
   are made of, so a new friend has something to compare on day one; and they
   are things people already say out loud in a gym — "hit a 225 bench",
   "trained four days", "walked 12k" — that describe effort, not a body.
   Weight and what somebody eats are the opposite: the most personal numbers
   the app holds, the ones people are most often hurt by, and nothing the
   friendship needs. They start off, and each person turns them on per friend
   if they want to. The request and confirm screens say which three are on
   before anything is sent. */
export const SHARE = Object.freeze([
  Object.freeze({ id: 'pr',  label: 'Personal records', icon: 'trophy',
    note: 'The lift, the weight and the reps when you set a new best — not your other sets.', dflt: true }),
  Object.freeze({ id: 'td',  label: 'Training days', icon: 'calendar',
    note: 'Which days in the last five weeks you trained — not what you did.', dflt: true }),
  Object.freeze({ id: 'st',  label: 'Steps', icon: 'steps',
    note: 'Your daily step totals for the last five weeks.', dflt: true }),
  Object.freeze({ id: 'mac', label: 'Macro consistency', icon: 'target',
    note: 'How many days you landed on your calorie and protein targets — no foods, no numbers.', dflt: false }),
  Object.freeze({ id: 'wt',  label: 'Weight and trend', icon: 'scale',
    note: 'Your trend weight, its weekly rate and your goal weight — no weigh-ins.', dflt: false })
]);
export const SHARE_IDS = Object.freeze(SHARE.map(s => s.id));

/* Every switch as a boolean, from whatever was stored. */
export function normShare(v) {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const out = {};
  for (const id of SHARE_IDS) out[id] = o[id] === true;
  return out;
}

export function defaultShare() {
  const out = {};
  for (const s of SHARE) out[s.id] = s.dflt;
  return out;
}

/* The node to write for a set of switches: only the ones that are on, as
   `true` — and null, a delete, when none is, so "shows nothing" is one shape
   and never two. */
export function shareNode(flags) {
  const f = normShare(flags);
  const out = {};
  for (const id of SHARE_IDS) if (f[id]) out[id] = true;
  return Object.keys(out).length ? out : null;
}

/* The categories this account must publish: those on for at least one
   friend. A category nobody may read is deleted, not kept. */
export function wantedCats(byFriend) {
  const on = new Set();
  for (const f of Object.values(byFriend || {})) {
    const n = normShare(f);
    for (const id of SHARE_IDS) if (n[id]) on.add(id);
  }
  return SHARE_IDS.filter(id => on.has(id));
}

/* ================= a friend's face (v68) =================
   The owner's profile picture, shrunk again to a tiny square JPEG and
   published at social/shared/{uid}/av for the people on their list. Not a
   switch: a friend already sees the name you go by, and the face beside it
   is the same kind of thing — who you are, not anything you logged. It goes
   only to confirmed friends (the rules gate it exactly as they gate `me`),
   it is gone the moment the connection is, and removing your photo removes
   it. The rules hold it to a JPEG data string of at most AV_MAX characters
   and nothing but base64 after the prefix, so another person's writing can
   only ever be drawn as a picture — and is checked again here before it is. */
export const AV_MAX = 6000;
export const AV_PX = 72;
export const AV_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/]+=*$/;
export function avatarOk(p) {
  return typeof p === 'string' && p.length <= AV_MAX && AV_RE.test(p);
}
/* A friend's `av` summary as read back: the picture, or null. */
export function readAvatar(av) {
  return av && typeof av === 'object' && avatarOk(av.p) ? av.p : null;
}

/* ================= nudges (v68) =================
   One tap on a friend's row: "Ann says you are slacking off. Get in there."
   The words are these three and only these — what travels is which one (`v`,
   0–2) and the server's time, never text, and the name is the one on the
   receiver's own list. The rules make the rest true:

     - only between confirmed friends, both sides standing;
     - one per sender per friend per 24 hours, by the SERVER's clock: the
       nudge is written beside a stamp on the sender's own node
       (people/{from}/nudged/{to}) that cannot be moved or deleted for a day,
       so a dismissed nudge does not open the door to the next;
     - the receiver can switch nudges off per friend (people/{me}/nonudge/
       {fid}, absent means allowed) or all at once (people/{me}/quiet), and
       a nudge to somebody who has is refused;
     - the receiver dismisses (deletes) it, either side deletes it, and the
       app shows none older than NUDGE_TTL and tidies them away.

   Delivered in the app today: the Friends tab's card and the dock's dot.
   Phone notifications plug in later without changing any of this —
   PUSH-NUDGE-CONTRACT.md. */
export const NUDGE_LINES = Object.freeze([
  '{n} says you are slacking off. Get in there.',
  '{n} thinks the bar misses you. Time for a session.',
  '{n} is checking in: go get a workout in today.'
]);
export const NUDGE_GAP = 86400000;            // the rules' one-a-day
export const NUDGE_TTL = 7 * 86400000;        // shown for a week, then tidied
export function nudgeText(v, name) {
  const i = Number.isInteger(v) && v >= 0 && v < NUDGE_LINES.length ? v : 0;
  return NUDGE_LINES[i].replace('{n}', firstName(name));
}
function firstName(name) { return cleanName(name).split(' ')[0]; }
/* The next wording for a sender, rotating: after 0 comes 1, then 2, then 0. */
export function nextVariant(prev) {
  return Number.isInteger(prev) && prev >= 0 ? (prev + 1) % NUDGE_LINES.length : 0;
}
/* My nudge inbox as read: live ones from current friends only, newest first,
   each named from my own list — and the ones to delete (expired, junk, or
   from somebody who is no longer a friend). */
export function readNudges(node, peopleNode, nowMs) {
  const n = node && typeof node === 'object' ? node : {};
  const list = peopleNode && peopleNode.list && typeof peopleNode.list === 'object' ? peopleNode.list : {};
  const live = [], stale = [];
  for (const [from, x] of Object.entries(n)) {
    const at = x && Number(x.at);
    const friend = list[from] && liveKind(list[from].k);
    const v = x && x.v;
    if (!friend || !Number.isFinite(at) || !Number.isInteger(v) || v < 0 || v >= NUDGE_LINES.length ||
        !(Number.isFinite(nowMs) && at > nowMs - NUDGE_TTL)) { stale.push(from); continue; }
    const name = cleanName(list[from].n);
    live.push({ from, name, v, at, text: nudgeText(v, name) });
  }
  live.sort((a, b) => b.at - a.at);
  return { live, stale };
}
/* Whether I may nudge `fid` now, by what my node says I last sent: the time
   left in ms, or 0. A stamp from a phone that cannot read the server clock
   reads as none — the rules are the real check. */
export function nudgeWait(sentAt, nowMs) {
  if (!Number.isFinite(sentAt) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, sentAt + NUDGE_GAP - nowMs);
}

/* ================= the node paths =================
   Every social path is built here, the way store.js userPath() builds every
   path under users/{uid}: one place where a uid enters a path. */
const seg = u => {
  const s = String(u || '');
  if (!s || /[.#$\[\]\/]/.test(s)) throw new Error('bad id');
  return s;
};
export const PATH = Object.freeze({
  code:     c => 'social/codes/' + seg(c),
  people:   u => 'social/people/' + seg(u),
  myCode:   u => 'social/people/' + seg(u) + '/code',
  req:      (to, from) => 'social/people/' + seg(to) + '/req/' + seg(from),
  out:      (from, to) => 'social/people/' + seg(from) + '/out/' + seg(to),
  link:     (u, f) => 'social/people/' + seg(u) + '/list/' + seg(f),
  share:    (u, f) => 'social/people/' + seg(u) + '/share/' + seg(f),
  shared:   (u, cat) => 'social/shared/' + seg(u) + (cat ? '/' + seg(cat) : ''),
  inbox:    u => 'social/inbox/' + seg(u),
  slot:     (to, from) => 'social/inbox/' + seg(to) + '/' + seg(from),
  // v68: nudges, and the receiver's two switches for them
  nudges:   u => 'social/nudge/' + seg(u),
  nudge:    (to, from) => 'social/nudge/' + seg(to) + '/' + seg(from),
  nudged:   (from, to) => 'social/people/' + seg(from) + '/nudged/' + seg(to),
  noNudge:  (u, f) => 'social/people/' + seg(u) + '/nonudge/' + seg(f),
  quiet:    u => 'social/people/' + seg(u) + '/quiet'
});

/* ================= reading my own node =================
   social/people/{me}, as read, into the lists the screen draws. Everything is
   cleaned on the way in: these are other people's names and other people's
   timestamps, and a junk entry is skipped rather than drawn. */
export function readPeople(node, nowMs) {
  const n = node && typeof node === 'object' ? node : {};
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const friends = [], incoming = [], outgoing = [];
  for (const [uid, e] of Object.entries(obj(n.list))) {
    if (!e || !liveKind(e.k)) continue;
    friends.push({ uid, kind: e.k, name: cleanName(e.n), at: Number(e.at) || 0, share: normShare(obj(n.share)[uid]),
                   // v68: my nudge switch for them (absent: allowed), and when I last nudged them
                   nudges: obj(n.nonudge)[uid] !== true, nudgedAt: Number(obj(n.nudged)[uid]) || 0 });
  }
  for (const [uid, e] of Object.entries(obj(n.req))) {
    if (!e || !liveKind(e.k)) continue;
    incoming.push({ uid, name: cleanName(e.n), at: Number(e.at) || 0, already: !!obj(n.list)[uid] });
  }
  for (const [uid, e] of Object.entries(obj(n.out))) {
    if (!e) continue;
    outgoing.push({ uid, name: cleanName(e.n), at: Number(e.at) || 0, already: !!obj(n.list)[uid] });
  }
  const byName = (a, b) => a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid);
  friends.sort(byName);
  incoming.sort((a, b) => b.at - a.at);
  outgoing.sort((a, b) => b.at - a.at);
  return {
    friends, incoming, outgoing,
    code: typeof n.code === 'string' && CODE_RE.test(n.code) ? n.code : null,
    // Share entries with nobody behind them — a request that was declined or
    // cancelled leaves the requester's defaults — for the client to tidy.
    orphanShares: Object.keys(obj(n.share)).filter(u => !obj(n.list)[u] && !obj(n.out)[u]),
    // v68: every nudge from anybody is off (people/{me}/quiet), and my
    // per-friend nudge switches with nobody behind them, to tidy
    quiet: n.quiet === true,
    orphanNoNudge: Object.keys(obj(n.nonudge)).filter(u => !obj(n.list)[u])
  };
}

/* ================= sending a routine =================
   The rules' bounds on an inbox slot, here so the sender can say "too long"
   in words instead of watching a write fail. */
export const ROUTINE_MAX = Object.freeze({ exercises: 30, sets: 30, name: 60, note: 200, exName: 60, block: 30 });
const EX_ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
const TYPES = ['W', 'N', 'F', 'D'];
/* A list as the database may hand it back: an array, or — when its indexes
   are sparse, which the SDK leaves as an object — an object keyed '0', '1', …
   Read in index order either way; anything else is no list. */
const listOf = v => Array.isArray(v) ? v
  : v && typeof v === 'object' ? Object.keys(v).filter(k => /^[0-9]+$/.test(k)).sort((a, b) => a - b).map(k => v[k]) : [];
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cut = (s, n) => fit(String(s == null ? '' : s).replace(/\s+/g, ' ').trim(), n).trim();
// A target as the routine stores it: text. A stored number becomes its text,
// anything else nothing.
const target = (v, max) => {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) v = String(v);
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return /^[0-9]*\.?[0-9]*$/.test(t) && t.length <= max ? t : '';
};

/* One of my routines, as the inbox slot carries it — { ok, r } — or why not.
   What is kept is what a routine IS: its name, its note, and per exercise the
   id, name, group, equipment, block and the target sets (tw/tr/type and a
   drop's dp). Nothing else of mine travels: not when I last used it, not how
   often. */
export function routinePayload(routine) {
  const r = routine && typeof routine === 'object' ? routine : null;
  if (!r) return { ok: false, why: 'That routine is empty.' };
  const exes = listOf(r.exercises).filter(x => x && typeof x === 'object');
  if (!exes.length) return { ok: false, why: 'That routine has no exercises in it yet.' };
  if (exes.length > ROUTINE_MAX.exercises) {
    return { ok: false, why: 'That routine has ' + exes.length + ' exercises — a routine sent to a friend can have at most ' + ROUTINE_MAX.exercises + '.' };
  }
  const exercises = [];
  for (const x of exes) {
    const sets = listOf(x.sets).filter(s => s && typeof s === 'object');
    if (sets.length > ROUTINE_MAX.sets) {
      return { ok: false, why: cut(x.name, 40) + ' has ' + sets.length + ' sets — a routine sent to a friend can have at most ' + ROUTINE_MAX.sets + ' an exercise.' };
    }
    const name = cut(x.name, ROUTINE_MAX.exName) || 'Exercise';
    // An id the rules cannot take (an imported one) travels as a custom id of
    // the name; the receiver matches customs by name and group anyway.
    const exId = EX_ID_RE.test(String(x.exId || '')) ? String(x.exId) : ('custom-' + (slug(name) || 'exercise')).slice(0, 80);
    // The app's own groups and equipment, which the rules' shape admits; a
    // value from somewhere else goes as core and no equipment.
    const group = GROUP_ORDER.includes(x.group) ? x.group : 'core';
    const ex = { exId, name, group };
    if (EQUIPMENT.includes(x.equipment)) ex.equipment = x.equipment;
    if (Number.isInteger(x.block) && x.block >= 1 && x.block <= ROUTINE_MAX.block) ex.block = x.block;
    const out = (sets.length ? sets : [{ type: 'N' }]).map((s, i, all) => {
      const type = TYPES.includes(s.type) ? s.type : 'N';
      const o = { tw: target(s.tw != null ? s.tw : s.w, 12), tr: target(s.tr != null ? s.tr : s.r, 6), type };
      // A drop continues the drop set above it only as a 'D' under a 'D'
      // (AGENTS.md, v55) — anything else is not a drop and carries no dp.
      if (type === 'D' && s.dp === 1 && i > 0 && all[i - 1].type === 'D') o.dp = 1;
      return o;
    });
    ex.sets = out;
    exercises.push(ex);
  }
  const payload = { name: cut(r.name, ROUTINE_MAX.name) || 'A routine', exercises };
  const note = cut(r.note, ROUTINE_MAX.note);
  if (note) payload.note = note;
  return { ok: true, r: payload };
}

/* What I received, as a routine of mine — never trusting the sender: the
   rules bound the shape, and this bounds the meaning all over again.

   `library` is my exercise list (picker.js allExercises(): built-ins and my
   customs). An exercise of the sender's that is not a built-in is matched to
   one of my customs by name and group; with no match it becomes a NEW custom
   exercise of mine, made by `makeCustom(name, group, equipment)` — the
   receiver is told before saving, because it adds to their library. `newId`
   names the routine. Returns { routine, customs } — customs to add first. */
export function receivedRoutine(payload, { library = [], makeCustom, newId, nowMs, fromName } = {}) {
  const ok = routinePayload(payload && payload.r ? payload.r : payload);
  if (!ok.ok) return null;
  const r = ok.r;
  const lib = Array.isArray(library) ? library : [];
  const mine = new Map(lib.map(x => [x.id, x]));
  const byName = new Map(lib.filter(x => x && x.custom).map(x => [cut(x.name, 60).toLowerCase() + '|' + x.group, x]));
  const customs = [];
  const exercises = r.exercises.map(ex => {
    const group = GROUP_ORDER.includes(ex.group) ? ex.group : 'core';
    const equipment = EQUIPMENT.includes(ex.equipment) ? ex.equipment : 'barbell';
    let id = ex.exId;
    // A built-in is the same exercise on every account; drawn by my name for
    // it where I renamed it (allExercises() carries my overrides).
    let shown = EXERCISE_BY_ID[id] ? (mine.get(id) || EXERCISE_BY_ID[id]) : null;
    if (!shown) {
      const key = ex.name.toLowerCase() + '|' + group;
      const have = (mine.has(id) && mine.get(id).custom && mine.get(id)) || byName.get(key);
      if (have) shown = have;
      else {
        const made = typeof makeCustom === 'function' ? makeCustom(ex.name, group, equipment) : null;
        if (!made || !made.id) return null;
        customs.push(made);
        byName.set(key, made);
        shown = made;
      }
      id = shown.id;
    }
    const out = {
      exId: id,
      name: shown.name || ex.name,
      group: shown.group || group,
      equipment: shown.equipment || equipment,
      sets: ex.sets.map(s => ({ tw: s.tw, tr: s.tr, type: s.type, ...(s.dp === 1 ? { dp: 1 } : null) }))
    };
    if (ex.block) out.block = ex.block;
    return out;
  });
  if (exercises.some(x => !x)) return null;
  const from = cleanName(fromName, '');
  return {
    routine: {
      id: typeof newId === 'string' ? newId : 'r' + Math.floor(Number(nowMs) || 0).toString(36),
      name: r.name,
      note: r.note || (from ? 'From ' + from : ''),
      exercises,
      created: Number(nowMs) || 0, lastUsed: 0, uses: 0
    },
    customs
  };
}
