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

/* ================================================================
   3.  PER-EXERCISE INDEX
   ================================================================ */

// Builds { exId: { exId, name, group, equipment, entries:[...], totals } }
// `entries` is one row per session the exercise appeared in, oldest first.
export function exerciseIndex(sessions) {
  const idx = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
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

  (record.exercises || []).forEach(ex => {
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
        detail: best ? best.w + ' x ' + best.r : '', unit: 'lb e1RM'
      });
    }
    if (tW > hist.bestWeight) {
      prs.push({
        kind: 'weight', exId: ex.exId, name: ex.name, group: ex.group,
        value: tW, prev: hist.bestWeight, delta: r1(tW - hist.bestWeight),
        detail: 'heaviest ever', unit: 'lb'
      });
    }
    if (vol > hist.bestVolume) {
      prs.push({
        kind: 'volume', exId: ex.exId, name: ex.name, group: ex.group,
        value: vol, prev: hist.bestVolume, delta: vol - hist.bestVolume,
        detail: 'best session volume', unit: 'lb'
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
export function sessionMilestones(record, prior) {
  const out = [];
  if (!prior.length) return out;
  const maxVol  = Math.max(...prior.map(s => s.volume || 0));
  const maxDur  = Math.max(...prior.map(s => s.durationSec || 0));
  const setsOf  = s => (s.exercises || []).reduce((a, ex) => a + (ex.sets || []).filter(isWorking).length, 0);
  const maxSets = Math.max(...prior.map(setsOf));

  if ((record.volume || 0) > maxVol && maxVol > 0) {
    out.push({ label: 'Heaviest session ever', value: compact(record.volume) + ' lb', prev: compact(maxVol) + ' lb' });
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

// Every PR ever hit, newest first. Walks the log forward keeping running bests.
export function prTimeline(sessions) {
  const best = {};   // exId -> { e1rm, weight }
  const out = [];
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
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
            detail: b ? b.w + ' x ' + b.r : ''
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

/* ---------- what a chart says out loud ----------
   Every SVG below used to be svgEl('svg', { viewBox, class }) and nothing
   else: no role, no name, silent to a screen reader. Each now gets role="img"
   and a sentence built from the numbers it already has. `label` names the
   subject ("Body weight, last 45 days"); `describe` is for the one thing only
   the caller knows, like the fitted weekly rate. Units are spoken as words. */
const UNIT_WORDS = { lb: 'pounds', kcal: 'kilocalories', g: 'grams', '%': 'percent' };
function unitWord(u) { const k = String(u || '').trim(); return UNIT_WORDS[k] || k; }
function spoken(v, unit) {
  const n = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const u = unitWord(unit);
  return n.toLocaleString() + (u ? ' ' + u : '');
}
function fmtDay(t) { return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function describeSvg(svg, text) {
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', text);
}

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
 * markMax: ring and label the highest point. Off unless asked for: it was on
 *          by default and drew a "peak" on charts where the peak means nothing,
 *          like a body-weight trend on a cut.
 * scatter: optional second series drawn as faint dots behind the line —
 *          used by the weight tab to show raw weigh-ins under the average.
 * line2:   optional second line, dashed and without an area, for a derived
 *          series that belongs on the same axis — You draws the normalised
 *          trend over the raw day means with it. `color2` is its stroke.
 * yLabels: print the top and bottom of the scale on the grid, so the reader
 *          knows what a pixel of slope is worth without a second chart.
 * minSpan: the least the vertical scale may cover, in the data's units. The
 *          padding is a fraction of the span, so with no floor four weigh-ins
 *          inside 0.4 lb filled the whole chart and read as a swing — the one
 *          place these charts actively misled.
 */
export function lineChart(points, opts = {}) {
  const {
    color = 'var(--p-yellow)', height = 168, markMax = false,
    unit = '', dots = true, scatter = null,
    line2 = null, color2 = 'var(--chalk)', yLabels = false,
    label = 'Trend', describe = '', minSpan = 0
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
  if (minSpan > 0 && hi - lo < minSpan) { const mid = (hi + lo) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
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

  const first = points[0].v, last = points[points.length - 1].v;
  const move = Math.abs(last - first) < 0.05 ? 'flat' : (last < first ? 'down' : 'up');
  describeSvg(svg, label + ', ' + fmtDay(t0) + ' to ' + fmtDay(t1) + ': ' +
    spoken(first, '') + (move === 'flat' ? ' to ' : ' ' + move + ' to ') + spoken(last, unit) +
    (describe ? '. ' + describe : '') + '.');

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
          target = null, targetLabel = '', lines = [], label = 'Bars' } = opts;
  if (!bars.length) return emptyChart('Nothing logged yet');

  const W = width, H = height, PADB = 20, PADT = 18, PADX = 8;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' });

  const max = Math.max(...bars.map(b => b.v), target > 0 ? target : 0,
                       ...lines.map(l => l && l.v > 0 ? l.v : 0), 1);
  const n = bars.length;
  const slot = (W - PADX * 2) / n;
  // Fourteen weeks in a 340px chart is a 23px slot, and "Aug 28" is ~30px at
  // 9px, so every label overprinted its neighbour. Label every kth bar instead,
  // counted back from the newest so the latest bar always keeps its date.
  const labelEvery = Math.max(1, Math.ceil(n / 8));
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
    if (b.label && n <= 14 && (n - 1 - i) % labelEvery === 0) {
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

  const lastB = bars[n - 1];
  const top = bars.reduce((a, b) => (b.v > a.v ? b : a), bars[0]);
  let said = label + ': ' + n + (n === 1 ? ' bar' : ' bars');
  if (bars[0].label && lastB.label && n > 1) said += ', ' + bars[0].label + ' to ' + lastB.label;
  const uw = unitWord(unit) ? ' ' + unitWord(unit) : '';
  if (top.v > 0) said += '. Highest ' + compact(top.v) + uw + (top.label ? ' at ' + top.label : '');
  said += '. Latest ' + compact(lastB.v) + uw;
  if (target > 0) {
    const tl = targetLabel || 'Target';
    said += '. ' + tl.charAt(0).toUpperCase() + tl.slice(1) + ' ' + compact(target) + uw;
  }
  describeSvg(svg, said + '.');

  return svg;
}

/**
 * A ring gauge: one value against its goal. The track is the unfilled
 * remainder in the surface colour, so a ring that is nearly closed reads as
 * "nearly there" before the number in the middle is read at all. Past 100% the
 * ring simply closes — a bigger-than-full arc is not a thing anyone can read.
 * frac: 0..∞      opts: { size, thickness, color, top, sub, label, cls }
 * cls is an extra class for the caller's CSS to size the text by — the Steps
 * hero draws this ring at 132px and needs a 22px number in it.
 */
export function ring(frac, opts = {}) {
  const { size = 76, thickness = 7, color = 'var(--p-yellow)', top = '', sub = '', label = '', cls = '' } = opts;
  const R = size / 2, r = R - thickness / 2;
  const svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'chart chart-ring' + (cls ? ' ' + cls : '') });
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
  describeSvg(svg, (label || 'Progress') + ': ' + Math.round((Number.isFinite(frac) ? frac : 0) * 100) + ' percent of goal' +
    (top && !/%$/.test(top) ? ', ' + top + (sub ? ' ' + sub : '') : '') + '.');
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
 * values: [number | null]      opts: { width, height, color, accentFrom, minSpan }
 * minSpan is the same floor lineChart has: a quiet fortnight must not fill the
 * whole height and read as a swing.
 */
export function sparkline(values, opts = {}) {
  const { width = 150, height = 40, color = 'var(--p-yellow)', accentFrom = 0,
          area = false, glow = false, ref = null, kind = 'line', label = 'Last days', minSpan = 0 } = opts;
  const W = width, H = height, PADX = 4, PADY = 5;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart chart-spark' });

  const finite = values.filter(Number.isFinite);
  describeSvg(svg, label + ': ' + values.length + (kind === 'bars' ? ' weeks' : ' days') + ', ' +
    (finite.length ? finite.length + ' with a value, ' + spoken(finite[0], '') + ' to ' + spoken(finite[finite.length - 1], '') : 'nothing logged') +
    (ref > 0 ? ', target ' + spoken(ref, '') : '') + '.');

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
  if (minSpan > 0 && hi - lo < minSpan) { const mid = (hi + lo) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
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
  const { size = 168, thickness = 20, centerTop = '', centerSub = '', label = 'Split' } = opts;
  const total = segments.reduce((a, s) => a + s.v, 0);
  if (!total) return emptyChart('Nothing logged yet');

  const R = size / 2, r = R - thickness / 2;
  const svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'chart chart-donut' });
  describeSvg(svg, label + ': ' + segments.filter(s => s.v > 0)
    .map(s => s.label + ' ' + Math.round(s.v / total * 100) + '%').join(', ') + '.');

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
 * One bar split by share — the month's working sets by muscle group. Linear
 * on purpose: a length is read to within a few percent and a wedge angle is
 * not, so the donut this replaced was misread about three times as often. The
 * numbers belong in a legend beside it, not on the bar.
 * segments: [{ label, v, color }]      opts: { label }
 */
export function splitBar(segments, opts = {}) {
  const { label = 'Split' } = opts;
  const total = segments.reduce((a, s) => a + (s.v > 0 ? s.v : 0), 0);
  if (!total) return emptyChart('Nothing logged yet');
  const bar = el('div', 'split-bar');
  segments.forEach(s => {
    if (!(s.v > 0)) return;
    const seg = el('div', 'split-seg');
    seg.style.flex = String(s.v);
    seg.style.background = s.color;
    bar.appendChild(seg);
  });
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', label + ': ' + segments.filter(s => s.v > 0)
    .map(s => s.label + ' ' + Math.round(s.v / total * 100) + '%').join(', ') + '.');
  return bar;
}

/**
 * Consistency heat strip — one cell per day for the last N days.
 * Takes either a session list (shaded by volume, for Train's stats) or a
 * plain { dateKey: weight } map, which is how You draws "any day with anything
 * on it" without a session list standing in for the whole account.
 */
export function heatStrip(sessions, days = 91, label = 'Activity') {
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

  let active = 0;
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(d.getDate() + c * 7 + row);
      if (d.getTime() > Date.now() + 864e5) continue;
      const k = todayKey(d);
      const v = byDay[k] || 0;
      if (v) active++;
      const op = v ? (0.28 + 0.72 * Math.min(1, v / max)) : 0;
      svg.appendChild(svgEl('rect', {
        x: (c * (CELL + GAP)).toFixed(1), y: (row * (CELL + GAP)).toFixed(1),
        width: CELL, height: CELL, rx: 2.5,
        fill: v ? 'var(--p-yellow)' : 'var(--collar)',
        'fill-opacity': v ? op.toFixed(2) : '1'
      }));
    }
  }
  describeSvg(svg, label + ', last ' + days + ' days: ' + active + (active === 1 ? ' day' : ' days') + ' with something logged.');
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
