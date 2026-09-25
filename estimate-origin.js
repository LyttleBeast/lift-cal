// Where the numbers on the estimate sheet came from.
//
// The sheet's heading said "Claude's estimate" over every answer it ever
// showed. Type "panda sesame chicken" and the Worker answers out of Panda's
// published row — no model runs, $0.0000 is spent — and the sheet still put
// Claude's name on it. food.js already refuses the same lie in the other
// direction, in the comment above the `src` expression it writes to the
// database: recording a food-db answer as an AI estimate "is the same class of
// lie". This is that rule, said out loud on the screen.
//
// WHAT THIS MODULE DOES NOT DO. It does not touch what is stored. The `src`
// string food.js writes ('food-db' | 'ai-text' | 'ai-photo') is the shipped iOS
// rule verbatim and both clients read it back; this only decides what the sheet
// SAYS while somebody is deciding whether to log it.
//
// The signals, all of them already in the reply — no Worker change:
//
//   item.src.kind  EVERY row carries a `src`, model rows included. 'curated' is
//                  a row priced off somebody's published page — the venue and
//                  generic lookups and the barcode reader all send it, with
//                  { venue?, from?, asOf?, stale }. 'ai' is a row the model
//                  priced, with { model, searched }. 'cache' is a remembered
//                  row stored before per-item provenance existed. Per row, so
//                  it is the only signal that can describe a MIXED answer, and
//                  it wins wherever it is there.
//   res.source     'curated' | 'parsed' | 'cache' | 'ai' | 'mixed' | absent.
//                  Speaks for the whole reply, and is the ONLY evidence on a
//                  reply from a Worker old enough to send no per-item `src`.
//                  It is the same signal food.js already trusts enough to write
//                  'food-db' into the database.
//
// A ROW IS NOT PUBLISHED BECAUSE IT HAS A `src`. This module tested that object
// for PRESENCE until 17 Sep 2026, on a brief that said model rows carry none.
// They always have. So a pure model answer was headed "From published
// nutrition", and on a residual answer the estimated row read "published
// nutrition" under a Panda heading — the exact lie this module exists to stop,
// committed by the module itself. Only kind 'curated' may claim a source. Every
// other kind is an estimate, including a kind added to the Worker after this
// build shipped: the only safe thing to say about a provenance you cannot read
// is nothing.
//
// THE DIRECTION IT FAILS IN IS THE POINT. An older Worker sends no `source` and
// no per-item `src`, and that reads as an estimate — never as a menu. Claiming
// a published source a number does not have is a wrong number in words, and a
// wrong number is worse than no number. Saying "estimate" over a number that
// really did come off a menu costs nothing but modesty.
//
// This module imports nothing and reads nothing — no clock, no store, no
// formatting from ui.js — so the native port copies it verbatim into
// src/pure/ and drives it from its own reply.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'Sep 2026' out of '2026-09' or '2026-09-15'. Parsed as TEXT and never through
// Date: `new Date('2026-09-01')` is UTC midnight, which prints as August west of
// Greenwich. Anything this does not recognise is passed through exactly as the
// Worker sent it rather than guessed at.
function asOfText(v) {
  const s = String(v == null ? '' : v).trim();
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(s);
  if (!m) return s;
  const mo = MONTHS[Number(m[2]) - 1];
  return mo ? mo + ' ' + m[1] : m[1];
}

// 'panda-express' -> 'Panda Express'. A venue the Worker already wrote out in
// full survives unchanged, because only the first letter of each word is
// touched.
function venueText(v) {
  const s = String(v == null ? '' : v).trim().replace(/[-_]+/g, ' ');
  return s ? s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1)) : '';
}

// The Worker's `from` is the page a human can open to check the number, so for
// a generic it is a full URL ("https://fdc.nal.usda.gov/food-details/172688/
// nutrients"). That is the right thing to STORE and the wrong thing to print on
// a one-line row: name the publisher instead. A known host gets its name, any
// other URL prints as its bare host, and text that is not a URL is passed
// through exactly as the Worker sent it. Parsed as TEXT, never through `new
// URL` — nothing in this file may throw.
const PUBLISHERS = { 'fdc.nal.usda.gov': 'USDA' };
function sourceText(v) {
  const s = String(v == null ? '' : v).trim();
  const m = /^https?:\/\/([^\/?#\s]+)/i.exec(s);
  if (!m) return s;
  const host = m[1].toLowerCase().replace(/^www\./, '');
  return PUBLISHERS[host] || host;
}

function foodRow(s, res) {
  const venue = venueText(s.venue || (res && res.venue));
  const who = venue || sourceText(s.from);
  const when = asOfText(s.asOf);
  const parts = [];
  if (who) parts.push(who);
  if (when) parts.push('published ' + when);
  if (!parts.length) parts.push('published nutrition');
  // A row the food layer itself marked stale says so on the row. It is still a
  // published number and still better than a guess; it is just older than the
  // menu somebody is holding.
  if (s.stale) parts.push('may be out of date');
  return { origin: venue ? 'menu' : 'usda', venue, label: parts.join(' · ') };
}

const modelRow = origin => ({
  origin,
  venue: '',
  label: origin === 'cache' ? 'estimate · answered earlier' : 'estimate'
});

/* ---------- a row somebody corrected ----------
   The sheet exists to be argued with — every row is editable, which is the
   whole reason an estimate is trusted at all. But a row whose numbers have been
   changed by hand did not come off Panda's published page any more, and leaving
   the old line under it would be this ship's own defect, committed fresh. So a
   corrected row says whose numbers they now are. */
export const EDITED = Object.freeze({ origin: 'edited', venue: '', label: 'edited by hand' });

/* ---------- the heading ----------
   Derived from the rows and nothing else, so that deleting the one estimated
   row off a mixed answer leaves a heading that is still true. `sub` is the
   second line, and only a wholly cached answer has one. */
export function originHeading(rows) {
  const all = Array.isArray(rows) ? rows.filter(Boolean) : [];
  // A corrected row has no source to speak for, so it does not vote on the
  // heading — it only stops the heading being the whole story, and its own line
  // is what says so. When every row has been corrected, nobody's estimate is
  // left on the screen.
  const list = all.filter(r => r.origin !== 'edited');
  if (!list.length) return { heading: all.length ? 'Your numbers' : 'Claude’s estimate', sub: '' };

  const food = list.filter(r => r.origin === 'menu' || r.origin === 'usda');
  const venues = Array.from(new Set(list.map(r => r.venue).filter(Boolean)));

  if (food.length === list.length) {
    if (venues.length === 1) return { heading: 'From the ' + venues[0] + ' menu', sub: '' };
    return { heading: venues.length ? 'From the menu' : 'From published nutrition', sub: '' };
  }
  if (!food.length) {
    return { heading: 'Claude’s estimate',
             sub: list.every(r => r.origin === 'cache') ? 'answered earlier, nothing spent' : '' };
  }
  // A residual answer: the food layer priced what it knew and the model priced
  // the rest. Neither name alone is true, so the heading says both and every
  // row carries its own.
  return { heading: venues.length ? 'Part menu, part estimate'
                                  : 'Part published, part estimate', sub: '' };
}

/* ---------- a meal saved off this sheet (v55) ----------
   Micah, 16 Sep 2026: on the estimate result, a way "to save that item (or
   plate) as a saved meal for quick re-logging later". The meal builder opens
   with this in its name box, and he can change it before anything is saved:
   the venue and the item, "Panda Express · Grilled teriyaki chicken ×3.5", or
   for a plate its first two items. The venue is the rows' own when they agree
   on one, else the reply's. A count is said only when the row's amount starts
   with one — "3.5 × entrée", "3.5 servings" — and is never worked out: a
   number in a name he did not type has to be one the reply said. */
const COUNT = /^\s*(\d+(?:\.\d+)?)\s*(?:[×x]\s|servings?\b)/i;
export function mealName(rows, origins, res) {
  const list = Array.isArray(rows) ? rows.filter(r => r && String(r.name == null ? '' : r.name).trim()) : [];
  if (!list.length) return '';
  const os = Array.isArray(origins) ? origins : [];
  const venues = Array.from(new Set(os.map(o => (o && o.venue) || '').filter(Boolean)));
  const venue = venues.length === 1 ? venues[0] : venueText(res && res.venue);
  const nameOf = r => String(r.name).trim();
  let what;
  if (list.length === 1) {
    const m = COUNT.exec(String(list[0].qty == null ? '' : list[0].qty));
    what = nameOf(list[0]) + (m && parseFloat(m[1]) > 0 && parseFloat(m[1]) !== 1 ? ' ×' + m[1] : '');
  } else {
    what = list.slice(0, 2).map(nameOf).join(', ');
  }
  return venue ? venue + ' · ' + what : what;
}

/* ---------- the one call the sheet makes ----------
   `rows` is aligned one-for-one with `res.items`, including any item that will
   later be dropped for having no name — alignment is the caller's to keep and
   an off-by-one here would put Panda's provenance on a guess. */
export function estimateOrigin(res) {
  const r = res || {};
  const items = Array.isArray(r.items) ? r.items : [];
  const srcOf = x => (x && x.src && typeof x.src === 'object' ? x.src : null);

  const perItem = items.some(srcOf);
  // 'mixed' is deliberately NOT on this list. It is the Worker's word for rows
  // that disagree with each other, so it is the one top-level source that can
  // never speak for a row: when it is there, every row carries its own kind.
  const wholeIsFood = r.source === 'curated' || r.source === 'parsed';
  const cached = r.source === 'cache';

  const rows = items.map(x => {
    const s = srcOf(x);
    const kind = s ? String(s.kind == null ? '' : s.kind) : '';
    // The one kind that may claim a published source.
    if (kind === 'curated') return foodRow(s, r);
    // No row anywhere carries provenance and the reply as a whole says the food
    // layer answered it: a Worker from before per-item `src`. The whole reply is
    // the only evidence there is, and it is evidence.
    if (!s && !perItem && wholeIsFood) return foodRow({}, r);
    // Everything else: 'ai', 'cache', a kind this build does not know, a `src`
    // with no kind at all, and a row with no `src` on a reply that does not
    // claim the food layer. A cached answer says so however its rows are
    // labelled — the model that produced it ran earlier, not now.
    return modelRow(kind === 'cache' || cached ? 'cache' : 'ai');
  });
  return { ...originHeading(rows), rows };
}
