// Analytics engine: loads the whole training history, derives aggregates and
// personal records from it, and builds the SVG charts.
//
// Design note — there is deliberately NO stored "records" node in the
// database. Every record and every statistic in this file is derived from the
// workouts themselves. That means editing or deleting a past session can
// never leave a stale PR behind: the numbers always describe what is actually
// in the log. The cost is that the full history has to be in memory, which is
// fine at this scale (a few hundred KB) and is cached by store.js anyway.

import { read, todayKey } from './store.js';
import { GROUPS, GROUP_ORDER } from './exercises.js';
import { svgEl, el, compact, r1 } from './ui.js';
import { fmtSetLoad, labelVol } from './units.js';

/* ================================================================
   1.  LOADING
   ================================================================ */

let allCache = null;   // the raw workouts tree
let flatCache = null;  // sessions flattened + sorted

// Call after any write that changes the training log.
export function invalidate() { allCache = null; flatCache = null; }

export async function loadAll(force = false) {
  if (force) invalidate();
  if (allCache) return allCache;
  allCache = (await read('workouts', null)) || {};
  return allCache;
}

// Every finished session, oldest first.
export async function allSessions(force = false) {
  if (!force && flatCache) return flatCache;
  const tree = await loadAll(force);
  const out = [];
  for (const mk of Object.keys(tree)) {
    const month = tree[mk] || {};
    for (const dd of Object.keys(month)) {
      const day = month[dd] || {};
      for (const id of Object.keys(day)) {
        const s = day[id];
        if (!s || !s.startedAt) continue;
        out.push({ ...s, _mk: mk, _dd: dd, _date: mk + '-' + dd });
      }
    }
  }
  out.sort((a, b) => a.startedAt - b.startedAt);
  flatCache = out;
  return out;
}

/* ================================================================
   2.  MATH
   ================================================================ */

// Epley. Must stay identical to the value shown on the set row.
export function e1rm(w, r) {
  const W = parseFloat(w), R = parseInt(r);
  if (!W || !R || R < 1) return 0;
  if (R === 1) return Math.round(W);
  return Math.round(W * (1 + R / 30));
}

export function isWorking(set) { return set && set.type !== 'W'; }

export function setVolume(set) {
  return (parseFloat(set.w) || 0) * (parseInt(set.r) || 0);
}

// Volume of one exercise block within a session (working sets only).
export function exerciseVolume(ex) {
  return (ex.sets || []).filter(isWorking).reduce((a, s) => a + setVolume(s), 0);
}

// The single best set in an exercise block, by estimated 1RM.
export function bestSet(ex) {
  const working = (ex.sets || []).filter(isWorking);
  if (!working.length) return null;
  return working.slice().sort((a, b) => e1rm(b.w, b.r) - e1rm(a.w, a.r))[0];
}

// The heaviest weight touched in an exercise block, regardless of reps.
export function topWeight(ex) {
  return Math.max(0, ...(ex.sets || []).filter(isWorking).map(s => parseFloat(s.w) || 0));
}

// The merge invariant, in one place: an exercise appearing more than once in
// ONE session is ONE logical entry for that session, with its sets
// concatenated in session order.
//
// It is reachable today by adding the same exercise twice by hand, and a
// duplicated lifting block makes it routine. Everything downstream that counts
// SESSIONS has to see one entry per exId or it reports the duplicates as extra
// training days — a beta account that has trained once currently reads "4
// sessions" against every lift on the Most-trained card. Concatenating rather
// than discarding is the other half: the work was really done, so volume, set
// and rep totals must come out exactly as they did before the merge. Only the
// occurrence disappears.
//
// The first occurrence's naming (and any block annotation) stands for the
// merged entry, with anything it is missing filled in from a later one — within
// one session every occurrence of an exId normally carries the same library
// metadata, but a rename between two adds is enough to break that, and a merged
// entry with no name reaches the screen as the word "undefined". Nothing here
// touches the input — each entry is copied
// with a fresh sets array. The set objects themselves are shared, which is
// safe because every reader of a set in this file only reads it.
export function mergeSessionExercises(exercises) {
  const out = [];
  const at = new Map();                 // exId -> its index in out
  (exercises || []).forEach(ex => {
    if (!ex) return;
    // Nothing to key on, so it passes through unmerged rather than collapsing
    // every id-less block into a single entry.
    if (!ex.exId) { out.push({ ...ex, sets: (ex.sets || []).slice() }); return; }
    const i = at.get(ex.exId);
    if (i === undefined) {
      at.set(ex.exId, out.length);
      out.push({ ...ex, sets: (ex.sets || []).slice() });
      return;
    }
    const e = out[i];
    e.sets = e.sets.concat(ex.sets || []);
    // Filling only what the first occurrence is MISSING. Before the merge the
    // index took the most recent naming per occurrence, so a library rename or
    // refile between two picker adds inside one session could supply metadata
    // the earlier block lacked; taking the first occurrence flat would have made
    // the merged entry nameless and printed "undefined" on the group pill.
    if (!e.name && ex.name) e.name = ex.name;
    if (!e.group && ex.group) e.group = ex.group;
    if (!e.equipment && ex.equipment) e.equipment = ex.equipment;
  });
  return out;
}

/* ================================================================
   3.  PER-EXERCISE INDEX
   ================================================================ */

// Builds { exId: { exId, name, group, equipment, entries:[...], totals } }
// `entries` is one row per session the exercise appeared in, oldest first —
// which is why the session's exercises go through mergeSessionExercises first.
// Without it `entries` and `sessions` count occurrences, and the card that
// reads them says so on screen.
export function exerciseIndex(sessions) {
  const idx = {};
  sessions.forEach(s => {
    mergeSessionExercises(s.exercises).forEach(ex => {
      if (!ex.exId) return;
      const e = idx[ex.exId] || (idx[ex.exId] = {
        exId: ex.exId, name: ex.name, group: ex.group, equipment: ex.equipment,
        entries: [], sessions: 0, totalVolume: 0, totalSets: 0, totalReps: 0,
        bestE1rm: 0, bestE1rmDate: null, bestE1rmSet: null,
        bestWeight: 0, bestWeightDate: null,
        bestVolume: 0, bestVolumeDate: null,
        lastDate: null, firstDate: null
      });
      // Keep the most recent naming — exercises can be renamed in the library.
      e.name = ex.name || e.name;
      e.group = ex.group || e.group;
      e.equipment = ex.equipment || e.equipment;

      const working = (ex.sets || []).filter(isWorking);
      if (!working.length) return;

      const vol  = exerciseVolume(ex);
      const best = bestSet(ex);
      const bE   = best ? e1rm(best.w, best.r) : 0;
      const tW   = topWeight(ex);
      const reps = working.reduce((a, x) => a + (parseInt(x.r) || 0), 0);

      e.entries.push({
        date: s._date, startedAt: s.startedAt, sessionId: s.id,
        volume: Math.round(vol), e1rm: bE, topWeight: tW,
        sets: working.length, reps,
        best: best ? { w: best.w, r: best.r } : null
      });

      e.sessions++;
      e.totalVolume += vol;
      e.totalSets += working.length;
      e.totalReps += reps;
      if (bE > e.bestE1rm)  { e.bestE1rm = bE;  e.bestE1rmDate = s._date; e.bestE1rmSet = best; }
      if (tW > e.bestWeight) { e.bestWeight = tW; e.bestWeightDate = s._date; }
      if (vol > e.bestVolume) { e.bestVolume = Math.round(vol); e.bestVolumeDate = s._date; }
      if (!e.firstDate || s._date < e.firstDate) e.firstDate = s._date;
      if (!e.lastDate  || s._date > e.lastDate)  e.lastDate  = s._date;
    });
  });
  Object.values(idx).forEach(e => {
    e.totalVolume = Math.round(e.totalVolume);
    e.entries.sort((a, b) => a.startedAt - b.startedAt);
  });
  return idx;
}

/* ================================================================
   4.  PERSONAL RECORDS
   ================================================================ */

// Compares a just-finished (or just-edited) session against everything that
// came BEFORE it. Returns { prs: [...], firsts: [...] }.
//
// `prior` must exclude the session being judged — pass sessions with a
// startedAt strictly earlier, or the session will beat itself.
export function detectPRs(record, prior) {
  const idx = exerciseIndex(prior);
  const prs = [], firsts = [];

  // Merged for the same reason the index is: a session that hit bench in three
  // blocks would otherwise push three "first time" cards, and judge each
  // block's volume separately against a best that is a whole session's worth.
  mergeSessionExercises(record.exercises).forEach(ex => {
    const working = (ex.sets || []).filter(isWorking);
    if (!working.length) return;

    const hist = idx[ex.exId];
    const best = bestSet(ex);
    const bE   = best ? e1rm(best.w, best.r) : 0;
    const tW   = topWeight(ex);
    const vol  = Math.round(exerciseVolume(ex));

    if (!hist || !hist.entries.length) {
      firsts.push({ exId: ex.exId, name: ex.name, group: ex.group, e1rm: bE, set: best });
      return;
    }

    if (bE > hist.bestE1rm) {
      prs.push({
        kind: 'e1rm', exId: ex.exId, name: ex.name, group: ex.group,
        value: bE, prev: hist.bestE1rm, delta: bE - hist.bestE1rm,
        // The set behind the record travels as the set, not as a baked
        // string: its weight is stored pounds like every other weight in here,
        // and only a screen knows which unit to print it in. prDetail() below
        // is where it becomes text. The old `unit: 'lb e1RM'` went with it —
        // nothing read it, and a field that says "lb" to a kilos account is
        // exactly the kind of wrong this is guarding against.
        set: best, detail: ''
      });
    }
    if (tW > hist.bestWeight) {
      prs.push({
        kind: 'weight', exId: ex.exId, name: ex.name, group: ex.group,
        value: tW, prev: hist.bestWeight, delta: r1(tW - hist.bestWeight),
        detail: 'heaviest ever'
      });
    }
    if (vol > hist.bestVolume) {
      prs.push({
        kind: 'volume', exId: ex.exId, name: ex.name, group: ex.group,
        value: vol, prev: hist.bestVolume, delta: vol - hist.bestVolume,
        detail: 'best session volume'
      });
    }
  });

  // One PR per exercise is enough noise. Keep the most impressive kind.
  const rank = { e1rm: 3, weight: 2, volume: 1 };
  const bestPer = {};
  prs.forEach(p => {
    const cur = bestPer[p.exId];
    if (!cur || rank[p.kind] > rank[cur.kind]) bestPer[p.exId] = p;
  });

  return { prs: Object.values(bestPer), firsts };
}

// Session-level milestones — volume, duration, set count.
export function sessionMilestones(record, prior, u) {
  const out = [];
  if (!prior.length) return out;
  const maxVol  = Math.max(...prior.map(s => s.volume || 0));
  const maxDur  = Math.max(...prior.map(s => s.durationSec || 0));
  const setsOf  = s => (s.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter(isWorking).length, 0);
  const maxSets = Math.max(...prior.map(setsOf));

  if ((record.volume || 0) > maxVol && maxVol > 0) {
    out.push({ label: 'Heaviest session ever', value: labelVol(record.volume, u), prev: labelVol(maxVol, u) });
  }
  const mySets = setsOf(record);
  if (mySets > maxSets && maxSets > 0) {
    out.push({ label: 'Most working sets ever', value: mySets + ' sets', prev: maxSets + ' sets' });
  }
  if ((record.durationSec || 0) > maxDur && maxDur > 0) {
    out.push({ label: 'Longest session ever', value: Math.round(record.durationSec / 60) + ' min', prev: Math.round(maxDur / 60) + ' min' });
  }
  return out;
}

// Reps in a session — working sets only, the same filter volume uses. One
// definition, because the recap's "N reps" heading and the comparison card
// under it have to be the same number.
export function sessionReps(s) {
  return ((s && s.exercises) || []).reduce((a, ex) =>
    a + (ex.sets || []).filter(isWorking).reduce((b, x) => b + (parseInt(x.r) || 0), 0), 0);
}

/* v53: HOW A SESSION FELT — his own rating from the recap, stored with the
   record at workouts/{mk}/{dd}/{id}/feel as { e, s, at }: energy 1 to 10,
   strength against his normal as one of five steps (120 is "120% or more"),
   and when he rated it. Either of e and s may be absent, never both.
   Everything that reads `feel` reads it through here, and it FAILS SAFE:
   anything that is not one of those values is not a rating, and null is
   what an unrated session is. Pure, beside the other record helpers, so the
   port copies it verbatim. */
export const FEEL_STRENGTH = Object.freeze([80, 90, 100, 110, 120]);
export function normFeel(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const e = Number.isInteger(v.e) && v.e >= 1 && v.e <= 10 ? v.e : null;
  const s = FEEL_STRENGTH.includes(v.s) ? v.s : null;
  if (e == null && s == null) return null;
  const out = {};
  if (e != null) out.e = e;
  if (s != null) out.s = s;
  if (typeof v.at === 'number' && Number.isFinite(v.at) && v.at > 0) out.at = v.at;
  return out;
}

// What the recap says about this session against the last four weeks, and
// WHETHER it says anything at all.
//
// Volume is weight × reps, so a session with no weight on the bar has no
// volume to compare. The card used to divide anyway: after a set of pull-ups
// it read "AGAINST YOUR LAST 4 WEEKS · -100% · 0 lb today against a 10.9k lb
// average across 19 sessions". Every number in that sentence is arithmetically
// right and the sentence is false — a percentage against a quantity you never
// attempted is a division, not a comparison, and -100% in the failure colour
// says you went backwards on a day you trained.
//
// So: volume against volume, and only when there is volume on BOTH sides. When
// this session has none, reps against reps instead — the same 28 days, the same
// sessions, a quantity that exists and that a bodyweight set really does move.
// When neither side has anything, the card does not appear, which is what it
// has always done with fewer than two prior sessions. There is deliberately no
// percentage on the reps branch: the number it would colour red is the one this
// function exists to stop claiming.
//
// `now` is an argument rather than a Date.now() inside, so this is pure and the
// native port copies it instead of re-deriving it.
export function sessionComparison(record, prior, now) {
  const recent = (prior || []).filter(s => s && s.startedAt > now - 28 * 864e5);
  if (recent.length < 2) return null;
  const n = recent.length;

  const vol = (record && record.volume) || 0;
  const avgVol = recent.reduce((a, s) => a + (s.volume || 0), 0) / n;
  // avgVol > 0 as well as vol > 0: four weeks of bodyweight work behind a
  // barbell day would otherwise divide by zero and print "+0%".
  if (vol > 0 && avgVol > 0) {
    return { kind: 'volume', n, volume: vol, avg: avgVol,
             pct: Math.round((vol - avgVol) / avgVol * 100) };
  }

  const reps = sessionReps(record);
  const avgReps = recent.reduce((a, s) => a + sessionReps(s), 0) / n;
  if (reps > 0 && avgReps > 0) return { kind: 'reps', n, reps, avg: avgReps };
  return null;
}

// Every PR ever hit, newest first. Walks the log forward keeping running bests.
export function prTimeline(sessions) {
  const best = {};   // exId -> { e1rm, weight }
  const out = [];
  sessions.forEach(s => {
    // Merged, or the second block of a session becomes a PR over the first one
    // — a record set against itself, on its own date.
    mergeSessionExercises(s.exercises).forEach(ex => {
      const working = (ex.sets || []).filter(isWorking);
      if (!working.length || !ex.exId) return;
      const b = bestSet(ex);
      const bE = b ? e1rm(b.w, b.r) : 0;
      const tW = topWeight(ex);
      const cur = best[ex.exId] || (best[ex.exId] = { e1rm: 0, weight: 0, seen: false });

      if (cur.seen) {
        if (bE > cur.e1rm) {
          out.push({
            date: s._date, exId: ex.exId, name: ex.name, group: ex.group,
            kind: 'e1rm', value: bE, prev: cur.e1rm,
            set: b, detail: ''
          });
        } else if (tW > cur.weight) {
          out.push({
            date: s._date, exId: ex.exId, name: ex.name, group: ex.group,
            kind: 'weight', value: tW, prev: cur.weight, detail: 'heaviest'
          });
        }
      }
      cur.seen = true;
      cur.e1rm = Math.max(cur.e1rm, bE);
      cur.weight = Math.max(cur.weight, tW);
    });
  });
  return out.reverse();
}

// The set behind an e1RM record, as text, in the unit on screen. Records whose
// detail is a phrase rather than a number ("heaviest ever") pass straight
// through. Both PR producers above hand back `set`, so there is one place that
// decides what a record's set reads like and it is this one.
export function prDetail(p, u) {
  return p && p.set ? fmtSetLoad(p.set.w, u) + ' x ' + p.set.r : ((p && p.detail) || '');
}

/* ================================================================
   5.  ROLLUPS
   ================================================================ */

export function filterByRange(sessions, days) {
  if (!days) return sessions;
  const since = Date.now() - days * 864e5;
  return sessions.filter(s => (s.startedAt || 0) >= since);
}

// Volume per ISO-ish week (weeks start Sunday to match the calendar).
export function weeklyVolume(sessions) {
  const by = {};
  sessions.forEach(s => {
    const d = new Date(s.startedAt);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());          // back to Sunday
    const k = todayKey(d);
    by[k] = by[k] || { key: k, volume: 0, sessions: 0, sets: 0 };
    by[k].volume += s.volume || 0;
    by[k].sessions++;
    by[k].sets += (s.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter(isWorking).length, 0);
  });
  return Object.values(by).sort((a, b) => a.key < b.key ? -1 : 1);
}

// Working sets and volume per muscle group.
export function groupSplit(sessions) {
  const out = {};
  GROUP_ORDER.forEach(g => out[g] = { group: g, sets: 0, volume: 0, sessions: 0 });
  sessions.forEach(s => {
    const seen = new Set();
    (s.exercises || []).forEach(ex => {
      const g = ex.group;
      if (!out[g]) return;
      const working = (ex.sets || []).filter(isWorking);
      out[g].sets += working.length;
      out[g].volume += exerciseVolume(ex);
      if (working.length) seen.add(g);
    });
    seen.forEach(g => out[g].sessions++);
  });
  Object.values(out).forEach(v => v.volume = Math.round(v.volume));
  return GROUP_ORDER.map(g => out[g]).filter(v => v.sets > 0);
}

export function topBy(index, key, n = 5) {
  return Object.values(index)
    .filter(e => e[key] > 0)
    .sort((a, b) => b[key] - a[key])
    .slice(0, n);
}

/* ================================================================
   6.  CHARTS
   ================================================================ */

const PALETTE = {
  chest: '#d6252b', back: '#2e7fd9', legs: '#f0be1e',
  shoulders: '#2aa85c', arms: '#e8e5de', core: '#a8aeb8'
};
export function groupColor(g) { return PALETTE[g] || '#8d939f'; }

let gradSeq = 0;

// Catmull-Rom through the points, converted to cubic beziers. Gives the line
// a soft shape without overshooting the data the way a naive spline does.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) return 'M' + pts[0].x + ' ' + pts[0].y + 'L' + pts[1].x + ' ' + pts[1].y;
  let d = 'M' + pts[0].x + ' ' + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.32;                       // tension; lower = tighter to data
    const c1x = p1.x + (p2.x - p0.x) * t / 2;
    const c1y = p1.y + (p2.y - p0.y) * t / 2;
    const c2x = p2.x - (p3.x - p1.x) * t / 2;
    const c2y = p2.y - (p3.y - p1.y) * t / 2;
    d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' +
               c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' +
               p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
  }
  return d;
}

/**
 * A trend line with a gradient area fill.
 * points:  [{ t: msTimestamp, v: number }]   the line itself
 * opts:    { color, height, markMax, unit, dots, scatter }
 * scatter: optional second series drawn as faint dots behind the line —
 *          used by the weight tab to show raw weigh-ins under the average.
 * line2:   optional second line, dashed and without an area, for a derived
 *          series that belongs on the same axis — You draws the normalised
 *          trend over the raw day means with it. `color2` is its stroke.
 * yLabels: print the top and bottom of the scale on the grid, so the reader
 *          knows what a pixel of slope is worth without a second chart.
 */
export function lineChart(points, opts = {}) {
  const {
    color = 'var(--p-yellow)', height = 168, markMax = true,
    unit = '', dots = true, scatter = null,
    line2 = null, color2 = 'var(--chalk)', yLabels = false
  } = opts;

  const W = 340, H = height, PADX = 10, PADT = 16, PADB = 22;

  if (!points.length) return emptyChart('Nothing logged yet');

  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' });
  const gid = 'g' + (++gradSeq);

  const defs = svgEl('defs');
  const lg = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
  lg.appendChild(svgEl('stop', { offset: '0%',   'stop-color': color, 'stop-opacity': '0.28' }));
  lg.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
  defs.appendChild(lg);
  svg.appendChild(defs);

  const extra = (scatter || []).concat(line2 || []);
  const vals = points.map(p => p.v).concat(extra.map(p => p.v));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo;
  if (span < 1e-6) { lo = lo - Math.max(1, lo * 0.05); hi = hi + Math.max(1, hi * 0.05); }
  else { lo -= span * 0.12; hi += span * 0.12; }

  const allT = points.map(p => p.t).concat(extra.map(p => p.t));
  const t0 = Math.min(...allT);
  const t1 = Math.max(...allT);
  const spanT = Math.max(1, t1 - t0);

  const X = t => PADX + (t - t0) / spanT * (W - PADX * 2);
  const Y = v => PADT + (1 - (v - lo) / (hi - lo)) * (H - PADT - PADB);

  // horizontal grid
  [0, 0.5, 1].forEach(f => {
    const y = PADT + f * (H - PADT - PADB);
    svg.appendChild(svgEl('line', {
      x1: PADX, y1: y.toFixed(1), x2: W - PADX, y2: y.toFixed(1), class: 'chart-grid'
    }));
    if (yLabels && f !== 0.5) {
      // Sits just above the top line and just above the bottom one, so neither
      // collides with the date labels under the axis.
      const t = svgEl('text', { x: PADX, y: (y - 3).toFixed(1), class: 'chart-axis' });
      const v = hi - f * (hi - lo);
      t.textContent = (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + (unit ? ' ' + unit : '');
      svg.appendChild(t);
    }
  });

  // faint raw series behind everything else
  if (scatter) {
    scatter.forEach(p => svg.appendChild(svgEl('circle', {
      cx: X(p.t).toFixed(1), cy: Y(p.v).toFixed(1), r: '2.3', class: 'chart-scatter'
    })));
  }

  const pts = points.map(p => ({ x: X(p.t), y: Y(p.v), ...p }));
  const line = smoothPath(pts);

  // area
  if (line) {
    const area = svgEl('path', {
      d: line + 'L' + pts[pts.length - 1].x.toFixed(1) + ' ' + (H - PADB) +
         'L' + pts[0].x.toFixed(1) + ' ' + (H - PADB) + 'Z',
      fill: 'url(#' + gid + ')', stroke: 'none'
    });
    svg.appendChild(area);
  }

  if (line) svg.appendChild(svgEl('path', { d: line, class: 'chart-line', stroke: color }));

  // The derived line goes over the measured one, thin and dashed: on a quiet
  // fortnight the two nearly coincide, and drawn underneath it vanished
  // entirely while the legend went on promising it.
  if (line2 && line2.length >= 2) {
    const p2 = line2.map(p => ({ x: X(p.t), y: Y(p.v) }));
    svg.appendChild(svgEl('path', { d: smoothPath(p2), class: 'chart-line2', stroke: color2 }));
  }

  // dots
  if (dots) {
    pts.forEach(p => svg.appendChild(svgEl('circle', {
      cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: pts.length > 40 ? 1.6 : 2.6,
      class: 'chart-dot', fill: color
    })));
  }

  // peak marker
  if (markMax && pts.length > 1) {
    const peak = pts.reduce((a, b) => b.v >= a.v ? b : a);
    svg.appendChild(svgEl('circle', {
      cx: peak.x.toFixed(1), cy: peak.y.toFixed(1), r: '5.5', class: 'chart-peak-ring', stroke: color
    }));
    const tx = Math.min(W - PADX - 30, Math.max(PADX + 20, peak.x));
    const lbl = svgEl('text', {
      x: tx.toFixed(1), y: Math.max(11, peak.y - 11).toFixed(1),
      class: 'chart-peak-lbl', 'text-anchor': 'middle', fill: color
    });
    lbl.textContent = Math.round(peak.v) + (unit ? ' ' + unit : '');
    svg.appendChild(lbl);
  }

  // axis labels
  const lo1 = svgEl('text', { x: PADX, y: H - 6, class: 'chart-axis' });
  lo1.textContent = new Date(t0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const hi1 = svgEl('text', { x: W - PADX, y: H - 6, class: 'chart-axis', 'text-anchor': 'end' });
  hi1.textContent = new Date(t1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  svg.append(lo1, hi1);

  return svg;
}

/**
 * Vertical bars.
 * bars: [{ label, v, color?, dim? }]   `dim` fades a bar that isn't finished —
 *        today's calories, today's steps — so a half day never reads as a low one.
 * opts:  { height, width, color, unit, showValues, target, targetLabel }
 *        `target` draws a dashed goal line and is folded into the scale, so a
 *        week of misses still shows how far off the goal sat. `width` is the
 *        viewBox width: a chart in a half-width card keeps its text legible by
 *        drawing at half the width rather than being scaled to it.
 *        A bar may carry `parts: [{ v, color }]` and it is then drawn as a
 *        stack, bottom part first, with a hairline of surface between the
 *        pieces so the seams read; `v` is still the bar's total. `note` is a
 *        short label printed above the bar whether or not values are shown —
 *        the session count over a week of volume. `lines` are further
 *        reference lines, `[{ v, label, at: 'start'|'end' }]`, folded into
 *        the scale the way `target` is.
 */
export function barChart(bars, opts = {}) {
  const { height = 150, width = 340, color = 'var(--p-blue)', unit = '', showValues = true,
          target = null, targetLabel = '', lines = [] } = opts;
  if (!bars.length) return emptyChart('Nothing logged yet');

  const W = width, H = height, PADB = 20, PADT = 18, PADX = 8;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' });

  const max = Math.max(...bars.map(b => b.v), target > 0 ? target : 0,
                       ...lines.map(l => l && l.v > 0 ? l.v : 0), 1);
  const n = bars.length;
  const slot = (W - PADX * 2) / n;
  const bw = Math.max(3, Math.min(30, slot * 0.62));
  const plotH = H - PADT - PADB;

  bars.forEach((b, i) => {
    const x = PADX + slot * i + (slot - bw) / 2;
    const h = Math.max(b.v > 0 ? 2 : 0, (b.v / max) * plotH);
    const y = H - PADB - h;
    const dimCls = b.dim ? ' chart-bar-dim' : '';

    svg.appendChild(svgEl('rect', {
      x: x.toFixed(1), y: (H - PADB - plotH).toFixed(1),
      width: bw.toFixed(1), height: plotH.toFixed(1),
      rx: Math.min(4, bw / 2), class: 'chart-bar-bg'
    }));

    if (b.parts && b.parts.length && b.v > 0) {
      // Clipped to the rounded outline of the whole bar, so the stack has one
      // rounded top rather than a rounded cap on every piece.
      const cid = 'c' + (++gradSeq);
      const cp = svgEl('clipPath', { id: cid });
      cp.appendChild(svgEl('rect', {
        x: x.toFixed(1), y: y.toFixed(1), width: bw.toFixed(1), height: h.toFixed(1), rx: Math.min(4, bw / 2)
      }));
      svg.appendChild(cp);
      const g = svgEl('g', { 'clip-path': 'url(#' + cid + ')', class: 'chart-bar' + dimCls });
      let base = H - PADB;
      b.parts.forEach((p, k) => {
        if (!(p.v > 0)) return;
        const ph = (p.v / b.v) * h;
        const gap = k ? 1.5 : 0;
        g.appendChild(svgEl('rect', {
          x: x.toFixed(1), y: (base - ph + gap).toFixed(1),
          width: bw.toFixed(1), height: Math.max(0, ph - gap).toFixed(1),
          fill: p.color || color
        }));
        base -= ph;
      });
      svg.appendChild(g);
    } else {
      svg.appendChild(svgEl('rect', {
        x: x.toFixed(1), y: y.toFixed(1), width: bw.toFixed(1), height: h.toFixed(1),
        rx: Math.min(4, bw / 2), fill: b.color || color, class: 'chart-bar' + dimCls
      }));
    }

    const above = b.note != null ? String(b.note) : (showValues && n <= 14 && b.v > 0 ? compact(b.v) + unit : '');
    if (above) {
      const t = svgEl('text', {
        x: (x + bw / 2).toFixed(1), y: (y - 5).toFixed(1),
        class: 'chart-barval', 'text-anchor': 'middle'
      });
      t.textContent = above;
      svg.appendChild(t);
    }
    if (b.label && n <= 14) {
      const t = svgEl('text', {
        x: (x + bw / 2).toFixed(1), y: H - 6, class: 'chart-axis', 'text-anchor': 'middle'
      });
      t.textContent = b.label;
      svg.appendChild(t);
    }
  });

  const refLine = (v, label, at, cls) => {
    const ty = H - PADB - (v / max) * plotH;
    svg.appendChild(svgEl('line', {
      x1: PADX, y1: ty.toFixed(1), x2: W - PADX, y2: ty.toFixed(1), class: cls
    }));
    if (label) {
      const end = at !== 'start';
      const t = svgEl('text', {
        x: end ? W - PADX : PADX, y: (ty - 4).toFixed(1), class: 'chart-axis', 'text-anchor': end ? 'end' : 'start'
      });
      t.textContent = label;
      svg.appendChild(t);
    }
  };
  if (target > 0) refLine(target, targetLabel, 'end', 'chart-target');
  lines.forEach(l => { if (l && l.v > 0) refLine(l.v, l.label, l.at, l.cls || 'chart-ref'); });

  return svg;
}

/**
 * A ring gauge: one value against its goal. The track is the unfilled
 * remainder in the surface colour, so a ring that is nearly closed reads as
 * "nearly there" before the number in the middle is read at all. Past 100% the
 * ring simply closes — a bigger-than-full arc is not a thing anyone can read.
 * frac: 0..∞      opts: { size, thickness, color, top, sub }
 */
export function ring(frac, opts = {}) {
  const { size = 76, thickness = 7, color = 'var(--p-yellow)', top = '', sub = '' } = opts;
  const R = size / 2, r = R - thickness / 2;
  const svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'chart chart-ring' });
  svg.style.width = size + 'px';
  svg.style.height = size + 'px';

  svg.appendChild(svgEl('circle', { cx: R, cy: R, r, class: 'ring-track', 'stroke-width': thickness }));

  const f = Number.isFinite(frac) ? Math.max(0, Math.min(1, frac)) : 0;
  if (f >= 0.999) {
    svg.appendChild(svgEl('circle', { cx: R, cy: R, r, stroke: color, 'stroke-width': thickness, fill: 'none', class: 'ring-fill' }));
  } else if (f > 0.005) {
    const a0 = -Math.PI / 2, a1 = a0 + f * Math.PI * 2;
    const x0 = R + r * Math.cos(a0), y0 = R + r * Math.sin(a0);
    const x1 = R + r * Math.cos(a1), y1 = R + r * Math.sin(a1);
    svg.appendChild(svgEl('path', {
      d: 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
         'A' + r + ' ' + r + ' 0 ' + (f > 0.5 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2),
      stroke: color, 'stroke-width': thickness, fill: 'none', 'stroke-linecap': 'round', class: 'ring-fill'
    }));
  }

  if (top) {
    const t = svgEl('text', { x: R, y: sub ? R + 1 : R + 5, class: 'ring-top', 'text-anchor': 'middle' });
    t.textContent = top;
    svg.appendChild(t);
  }
  if (sub) {
    const t = svgEl('text', { x: R, y: R + 13, class: 'ring-sub', 'text-anchor': 'middle' });
    t.textContent = sub;
    svg.appendChild(t);
  }
  return svg;
}

/**
 * A sparkline: the shape of the last fortnight under a headline number. No
 * axes, no labels — the number beside it is the label. A null is a day with
 * nothing logged: it keeps its place on the x-axis but the line runs straight
 * through it to the next real day, because drawing it as zero would be a
 * crash to the floor and breaking the line at every gap turns a fortnight
 * with two days off into confetti. Points from `accentFrom` onward draw in
 * `color`; the ones before it in the muted stroke, so "this week" stands out
 * of "last week" without a legend.
 * values: [number | null]      opts: { width, height, color, accentFrom }
 */
export function sparkline(values, opts = {}) {
  const { width = 150, height = 40, color = 'var(--p-yellow)', accentFrom = 0,
          area = false, glow = false, ref = null, kind = 'line' } = opts;
  const W = width, H = height, PADX = 4, PADY = 5;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart chart-spark' });

  const n = values.length;
  const pts = [];
  values.forEach((v, i) => { if (Number.isFinite(v)) pts.push({ i, v }); });

  // Bars: one per slot, from a zero baseline, the accented ones in colour.
  // The shape for a series of discrete totals — weeks of training volume —
  // where a line would imply a value between two weeks that never existed.
  if (kind === 'bars') {
    if (!n || !pts.some(p => p.v > 0)) {
      svg.appendChild(svgEl('line', { x1: PADX, y1: H - PADY, x2: W - PADX, y2: H - PADY, class: 'spark-none' }));
      return svg;
    }
    const max = Math.max(...pts.map(p => p.v), ref && ref > 0 ? ref : 0, 1);
    const slot = (W - PADX * 2) / n;
    const bw = Math.max(3, slot * 0.58);
    values.forEach((v, i) => {
      const x = PADX + slot * i + (slot - bw) / 2;
      const h = Number.isFinite(v) && v > 0 ? Math.max(2, v / max * (H - PADY * 2)) : 1.5;
      svg.appendChild(svgEl('rect', {
        x: x.toFixed(1), y: (H - PADY - h).toFixed(1), width: bw.toFixed(1), height: h.toFixed(1), rx: 2,
        fill: i >= accentFrom && v > 0 ? color : 'var(--knurl)', class: 'spark-bar'
      }));
    });
    if (ref > 0) {
      const y = H - PADY - ref / max * (H - PADY * 2);
      svg.appendChild(svgEl('line', { x1: PADX, y1: y.toFixed(1), x2: W - PADX, y2: y.toFixed(1), class: 'spark-ref' }));
    }
    return svg;
  }

  if (n < 2 || pts.length < 2) {
    svg.appendChild(svgEl('line', {
      x1: PADX, y1: H / 2, x2: W - PADX, y2: H / 2, class: 'spark-none'
    }));
    return svg;
  }

  // The reference line is folded into the scale so it is always on the
  // picture — a target the line never crosses is the most useful thing the
  // picture can show.
  const scaled = pts.map(p => p.v).concat(ref > 0 ? [ref] : []);
  let lo = Math.min(...scaled), hi = Math.max(...scaled);
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const X = i => PADX + i / (n - 1) * (W - PADX * 2);
  const Y = v => PADY + (1 - (v - lo) / (hi - lo)) * (H - PADY * 2);
  pts.forEach(p => { p.x = X(p.i); p.y = Y(p.v); });

  const before = accentFrom > 0 ? pts.filter(p => p.i < accentFrom) : [];
  const after  = accentFrom > 0 ? pts.filter(p => p.i >= accentFrom) : pts.slice();
  // The seam belongs to both halves: the last muted point is also the first
  // coloured one, so the line has no gap where the colour changes.
  if (before.length && after.length) before.push(after[0]);

  const seg = list => list.map((p, k) => (k ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('');

  // The area sits under the coloured half only: it is what makes "this week"
  // read as the subject and last week as its shadow.
  if (area && after.length >= 2) {
    const gid = 'sg' + (++gradSeq);
    const defs = svgEl('defs');
    const lg = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    lg.appendChild(svgEl('stop', { offset: '0%',   'stop-color': color, 'stop-opacity': '0.32' }));
    lg.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(lg);
    svg.appendChild(defs);
    const a0 = after[0], a1 = after[after.length - 1];
    svg.appendChild(svgEl('path', {
      d: seg(after) + 'L' + a1.x.toFixed(1) + ' ' + (H - 1) + 'L' + a0.x.toFixed(1) + ' ' + (H - 1) + 'Z',
      fill: 'url(#' + gid + ')', stroke: 'none'
    }));
  }

  if (ref > 0) {
    const y = Y(ref);
    svg.appendChild(svgEl('line', { x1: PADX, y1: y.toFixed(1), x2: W - PADX, y2: y.toFixed(1), class: 'spark-ref' }));
  }

  if (before.length >= 2) svg.appendChild(svgEl('path', { d: seg(before), class: 'spark-line-dim' }));
  if (after.length >= 2)  svg.appendChild(svgEl('path', { d: seg(after), class: 'spark-line', stroke: color }));

  const end = pts[pts.length - 1];
  if (glow) {
    svg.appendChild(svgEl('circle', { cx: end.x.toFixed(1), cy: end.y.toFixed(1), r: 6.5, fill: color, class: 'spark-glow' }));
  }
  svg.appendChild(svgEl('circle', { cx: end.x.toFixed(1), cy: end.y.toFixed(1), r: 2.8, fill: color, class: 'spark-end' }));
  return svg;
}

/**
 * Donut for the muscle-group split.
 * segments: [{ label, v, color }]
 */
export function donut(segments, opts = {}) {
  const { size = 168, thickness = 20, centerTop = '', centerSub = '' } = opts;
  const total = segments.reduce((a, s) => a + s.v, 0);
  if (!total) return emptyChart('Nothing logged yet');

  const R = size / 2, r = R - thickness / 2;
  const svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'chart chart-donut' });

  let angle = -Math.PI / 2;   // start at 12 o'clock
  const GAP = 0.028;          // radians of breathing room between segments

  segments.forEach(s => {
    const frac = s.v / total;
    const sweep = frac * Math.PI * 2;
    if (sweep <= GAP) { angle += sweep; return; }
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    const x0 = R + r * Math.cos(a0), y0 = R + r * Math.sin(a0);
    const x1 = R + r * Math.cos(a1), y1 = R + r * Math.sin(a1);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    svg.appendChild(svgEl('path', {
      d: 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
         'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2),
      stroke: s.color, 'stroke-width': thickness, fill: 'none',
      'stroke-linecap': 'round', class: 'donut-seg'
    }));
    angle += sweep;
  });

  if (centerTop) {
    const t = svgEl('text', { x: R, y: R - 2, class: 'donut-top', 'text-anchor': 'middle' });
    t.textContent = centerTop;
    svg.appendChild(t);
  }
  if (centerSub) {
    const t = svgEl('text', { x: R, y: R + 14, class: 'donut-sub', 'text-anchor': 'middle' });
    t.textContent = centerSub;
    svg.appendChild(t);
  }
  return svg;
}

/**
 * Consistency heat strip — one cell per day for the last N days.
 * Takes either a session list (shaded by volume, for Train's stats) or a
 * plain { dateKey: weight } map, which is how You draws "any day with anything
 * on it" without a session list standing in for the whole account.
 */
export function heatStrip(sessions, days = 91) {
  const byDay = {};
  if (Array.isArray(sessions)) {
    sessions.forEach(s => {
      const k = s._date;
      byDay[k] = (byDay[k] || 0) + (s.volume || 0);
    });
  } else {
    Object.keys(sessions || {}).forEach(k => { byDay[k] = Number(sessions[k]) || 0; });
  }
  const max = Math.max(1, ...Object.values(byDay));

  const cols = Math.ceil(days / 7);
  const CELL = 9, GAP = 2.5;
  const W = cols * (CELL + GAP), H = 7 * (CELL + GAP);
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart heat' });

  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  start.setDate(start.getDate() - start.getDay());   // align to a Sunday

  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(d.getDate() + c * 7 + row);
      if (d.getTime() > Date.now() + 864e5) continue;
      const k = todayKey(d);
      const v = byDay[k] || 0;
      const op = v ? (0.28 + 0.72 * Math.min(1, v / max)) : 0;
      svg.appendChild(svgEl('rect', {
        x: (c * (CELL + GAP)).toFixed(1), y: (row * (CELL + GAP)).toFixed(1),
        width: CELL, height: CELL, rx: 2.5,
        fill: v ? 'var(--p-yellow)' : 'var(--collar)',
        'fill-opacity': v ? op.toFixed(2) : '1'
      }));
    }
  }
  return svg;
}

export function emptyChart(msg) {
  return el('div', 'chart-empty', msg);
}

/* ---------- shared legend ---------- */
export function legend(items) {
  const wrap = el('div', 'legend');
  items.forEach(({ label, color, value }) => {
    const it = el('div', 'legend-item');
    const sw = el('i');
    sw.style.background = color;
    it.appendChild(sw);
    it.appendChild(el('span', 'legend-lbl', label));
    if (value != null) it.appendChild(el('span', 'legend-val num', value));
    wrap.appendChild(it);
  });
  return wrap;
}

export { GROUPS, GROUP_ORDER };
