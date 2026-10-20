// Friends — what one account shows another, derived and read back (rack-v67).
//
// A friend never reads anybody's log. What they read is a handful of small
// summaries the OWNER's phone works out from its own data and writes to
// social/shared/{uid}/{category}, each readable only by a connected friend
// the owner has switched that category on for (friends-core.js SHARE; the
// gate is in the rules). This file is both halves of that: the summaries
// built from the owner's numbers, and the same summaries read back on a
// friend's phone, for the three boards and the two read-only cards.
//
// SMALL BY DESIGN — the data a checkbox implies and nothing past it:
//
//   pr   the personal records of the last five weeks: date, lift name,
//        weight, reps. Not the sets around them, not the sessions.
//   td   35 characters, one a day, 1 for a day trained. Not what was done.
//   st   35 daily step totals. Steps were never personal in the way the next
//        two are, and the board needs the number.
//   mac  30 characters, one a complete day: nothing logged, or which of the
//        calorie and protein targets it landed on. No food, no calorie, no
//        gram, no target.
//   wt   the trend weight, its weekly rate, the goal weight and the goal's
//        direction. Not one weigh-in, and no history.
//
// Every shape and bound here is the rules' (database.rules.json,
// social/shared); tools-check/friends-pure.mjs runs the real rules file over
// what this file builds. A summary read back is someone else's writing and
// is cleaned as it is read: a value out of range is clamped or dropped,
// never drawn as it came.
//
// PURE. No DOM, no store, no clock: `today` (a YYYY-MM-DD key) and `nowMs`
// are arguments. The PR events come in already derived — analytics.js
// prTimeline(), the app's one definition of a record — so nothing here is a
// second opinion about what a PR is. Copied into the native tree verbatim.

const DAY = 864e5;

export const SPAN = 35;      // days td and st cover, ending the day they were made
export const MAC_SPAN = 30;  // complete days mac covers, ending the day before
export const PR_MAX = 30;    // the rules' ev/0..29
// A complete day lands on calories within 10% of the target either way, and
// on protein at 90% of the target or more — the app's protein rule
// (insights.js windowStats). Judged against the targets as they are when the
// summary is made: the log keeps no history of past targets.
export const CAL_TOL = 0.10;
export const PROT_MIN = 0.90;

/* ---------- days ---------- */
const KEY_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
export const isKey = k => typeof k === 'string' && KEY_RE.test(k) && !Number.isNaN(noon(k).getTime());
function noon(k) { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0, 0); }
function keyOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function addDays(k, n) { const d = noon(k); d.setDate(d.getDate() + n); return keyOf(d); }
// b − a, in whole days.
export function daysBetween(a, b) { return Math.round((noon(b).getTime() - noon(a).getTime()) / DAY); }

// At most n UTF-16 units and never half a character (friends-core.js fit(),
// restated: this file imports nothing).
const cut = (s, n) => {
  let out = '';
  for (const ch of String(s == null ? '' : s).replace(/\s+/g, ' ').trim()) { if (out.length + ch.length > n) break; out += ch; }
  return out.trim();
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/* ================= building mine ================= */

/* `timeline` is analytics.js prTimeline(sessions): newest first, each
   { date, name, kind, value, set }. An e1RM record is its set — the weight
   and the reps he did; a heaviest-weight record is the weight alone, r 0. */
export function prPart(timeline, today) {
  const from = addDays(today, -(SPAN - 1));
  const ev = [];
  for (const p of Array.isArray(timeline) ? timeline : []) {
    if (!p || !isKey(p.date) || p.date < from || p.date > today) continue;
    const e1 = p.kind === 'e1rm' && p.set;
    const w = e1 ? parseFloat(p.set.w) : Number(p.value);
    const r = e1 ? parseInt(p.set.r, 10) : 0;
    if (!(w > 0)) continue;
    ev.push({ d: p.date, x: cut(p.name, 60) || 'A lift', w: r1(clamp(w, 0, 2000)), r: Number.isFinite(r) ? clamp(r, 0, 100) : 0 });
  }
  ev.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  return { ev: ev.slice(0, PR_MAX) };
}

/* The dates sessions were finished on (analytics.js allSessions()' _date). */
export function trainedPart(dates, today) {
  const on = new Set(Array.isArray(dates) ? dates : []);
  let b = '';
  for (let i = SPAN - 1; i >= 0; i--) b += on.has(addDays(today, -i)) ? '1' : '0';
  return { end: today, b };
}

/* users/{uid}/steps, the whole node. A day with nothing is an empty field,
   so 35 days of 100,000 is the longest it can be: 244 characters. */
export function stepsPart(stepDays, today) {
  const days = stepDays && typeof stepDays === 'object' ? stepDays : {};
  const out = [];
  for (let i = SPAN - 1; i >= 0; i--) {
    const v = days[addDays(today, -i)];
    const n = v && num(v.steps) > 0 ? Math.round(clamp(v.steps, 0, 100000)) : 0;
    out.push(n ? String(n) : '');
  }
  return { end: today, d: out.join(',') };
}

/* food/daySummaries and food/targets. Null when there is no target to land
   on, which is a thing to say ("no targets set") rather than thirty misses. */
export function macroPart(daySummaries, targets, today) {
  const t = targets && typeof targets === 'object' ? targets : {};
  const cal = num(t.cal) > 0 ? t.cal : 0, p = num(t.p) > 0 ? t.p : 0;
  if (!cal && !p) return null;
  const sums = daySummaries && typeof daySummaries === 'object' ? daySummaries : {};
  const end = addDays(today, -1);
  let b = '';
  for (let i = MAC_SPAN - 1; i >= 0; i--) {
    const s = sums[addDays(end, -i)];
    const c = s ? num(s.cal) : null;
    if (!(c > 0)) { b += '.'; continue; }
    const calOk = cal > 0 && Math.abs(c - cal) <= cal * CAL_TOL;
    const pOk = p > 0 && (num(s.p) || 0) >= p * PROT_MIN;
    b += calOk && pOk ? 'b' : calOk ? 'c' : pOk ? 'p' : 'x';
  }
  return { end, b };
}

/* tdee.js trendWeight() and trendRate().rateWk, food/targets.goalLb and
   insights.js goalDirection(). Null without a trend: there is nothing to
   show a friend before the first weigh-ins have made one. */
export function weightPart({ tw, rateWk, goalLb, dir } = {}) {
  if (!(num(tw) >= 40 && tw <= 1000)) return null;
  const out = { tw: r1(tw) };
  if (num(rateWk) !== null) out.rate = r2(clamp(rateWk, -10, 10));
  if (num(goalLb) >= 40 && goalLb <= 1000) out.goal = r1(goalLb);
  if (dir === -1 || dir === 0 || dir === 1) out.dir = dir;
  return out;
}

/* ================= reading a friend's =================
   Each reader answers about a WINDOW ending on the reader's own today. A
   summary made days ago covers fewer of those days, and a day it does not
   cover is unknown (null) rather than a zero. */

function covered(end, span, today, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    const off = daysBetween(k, end);   // end − k
    out.push(off >= 0 && off < span ? span - 1 - off : -1);
  }
  return out;
}

export function readTrained(td, today, days) {
  if (!td || !isKey(td.end) || typeof td.b !== 'string' || !/^[01]{35}$/.test(td.b) || !isKey(today)) return null;
  const strip = covered(td.end, SPAN, today, days).map(i => (i < 0 ? null : td.b[i] === '1' ? 1 : 0));
  return { value: strip.filter(x => x === 1).length, strip, known: strip.filter(x => x !== null).length };
}

export function readSteps(st, today, days) {
  if (!st || !isKey(st.end) || typeof st.d !== 'string' || !isKey(today)) return null;
  const parts = st.d.split(',');
  if (parts.length !== SPAN || !parts.every(x => /^[0-9]{0,6}$/.test(x))) return null;
  const vals = parts.map(x => (x ? clamp(parseInt(x, 10), 0, 100000) : 0));
  const strip = covered(st.end, SPAN, today, days).map(i => (i < 0 ? null : vals[i]));
  const logged = strip.filter(x => x > 0);
  const total = logged.reduce((s, x) => s + x, 0);
  return { value: total, strip, logged: logged.length, avg: logged.length ? Math.round(total / logged.length) : 0,
           best: logged.length ? Math.max(...logged) : 0 };
}

export function readPRs(pr, today, days) {
  if (!pr || typeof pr !== 'object' || !isKey(today)) return null;
  const from = addDays(today, -(days - 1));
  const raw = pr.ev && typeof pr.ev === 'object' ? Object.values(pr.ev) : [];
  const list = raw
    .filter(e => e && isKey(e.d) && e.d >= from && e.d <= today && num(e.w) > 0)
    .map(e => ({ d: e.d, x: cut(e.x, 60) || 'A lift', w: r1(clamp(e.w, 0, 2000)), r: num(e.r) !== null ? clamp(Math.round(e.r), 0, 100) : 0 }))
    .sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0))
    .slice(0, PR_MAX);
  return { value: list.length, list };
}

/* The last thirty days as the owner made them — not shifted to the reader's
   today, because a macro card says "18 of 26 days", not a board position. */
export function readMacros(mac) {
  if (!mac || !isKey(mac.end) || typeof mac.b !== 'string' || !/^[.xcpb]{30}$/.test(mac.b)) return null;
  const b = mac.b;
  const count = re => [...b].filter(c => re.test(c)).length;
  return { end: mac.end, strip: [...b], logged: count(/[xcpb]/), cal: count(/[cb]/), p: count(/[pb]/), both: count(/b/) };
}

export function readWeight(wt) {
  if (!wt || !(num(wt.tw) >= 40 && wt.tw <= 1000)) return null;
  return {
    tw: r1(wt.tw),
    rate: num(wt.rate) !== null ? r2(clamp(wt.rate, -10, 10)) : null,
    goal: num(wt.goal) >= 40 && wt.goal <= 1000 ? r1(wt.goal) : null,
    dir: wt.dir === -1 || wt.dir === 0 || wt.dir === 1 ? wt.dir : null
  };
}

/* How long ago a summary was made, in words, from its server `at`. */
export function agoWords(at, nowMs) {
  if (!(num(at) > 0) || !(num(nowMs) > 0)) return null;
  const d = Math.floor((nowMs - at) / DAY);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return d + ' days ago';
}

/* ================= the boards =================
   Me against my friends over a week or thirty days, on the three things
   people compare out loud. Weight and macros are not boards and never will
   be: they are not a race, and ranking them would be the app saying whose
   body is winning. */
export const BOARDS = Object.freeze([
  Object.freeze({ id: 'pr', label: 'PRs',      one: 'PR',   many: 'PRs' }),
  Object.freeze({ id: 'td', label: 'Training', one: 'day',  many: 'days' }),
  Object.freeze({ id: 'st', label: 'Steps',    one: 'step', many: 'steps' })
]);
export const WINDOWS = Object.freeze([
  Object.freeze({ id: 'week',  label: '7 days',  days: 7 }),
  Object.freeze({ id: 'month', label: '30 days', days: 30 })
]);
const READ = { pr: readPRs, td: readTrained, st: readSteps };

/* people: [{ uid, name, me, data: { pr, td, st } }] — `data` the raw
   summaries (mine built by the parts above, theirs as read). Everyone whose
   summary for this board is readable gets a row; a friend who does not show
   it to me is named in `missing`, so the board can say why they are absent
   rather than drawing them at zero. I am always on my own board.

   Ranked by value, highest first, standard competition ranking (1, 2, 2, 4),
   ties then by name so the order is stable. */
export function board(id, people, today, days) {
  const read = READ[id];
  if (!read) return { rows: [], missing: [] };
  const rows = [], missing = [];
  for (const p of Array.isArray(people) ? people : []) {
    if (!p) continue;
    const r = read(p.data ? p.data[id] : null, today, days);
    if (!r) {
      if (p.me) rows.push({ uid: p.uid, name: p.name, me: true, value: 0, read: null });
      else missing.push(p.name);
      continue;
    }
    rows.push({ uid: p.uid, name: p.name, me: !!p.me, value: r.value, read: r });
  }
  rows.sort((a, b) => b.value - a.value || String(a.name).localeCompare(String(b.name)) || (a.me ? -1 : 1));
  let rank = 0;
  rows.forEach((r, i) => { if (i === 0 || r.value !== rows[i - 1].value) rank = i + 1; r.rank = rank; });
  return { rows, missing };
}
