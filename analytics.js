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
 */
export function lineChart(points, opts = {}) {
  const {
    color = 'var(--p-yellow)', height = 168, markMax = true,
    unit = '', dots = true, scatter = null
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

  const vals = points.map(p => p.v).concat(scatter ? scatter.map(p => p.v) : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo;
  if (span < 1e-6) { lo = lo - Math.max(1, lo * 0.05); hi = hi + Math.max(1, hi * 0.05); }
  else { lo -= span * 0.12; hi += span * 0.12; }

  const allT = points.map(p => p.t).concat(scatter ? scatter.map(p => p.t) : []);
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
    svg.appendChild(svgEl('path', { d: line, class: 'chart-line', stroke: color }));
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
 */
export function barChart(bars, opts = {}) {
  const { height = 150, width = 340, color = 'var(--p-blue)', unit = '', showValues = true,
          target = null, targetLabel = '' } = opts;
  if (!bars.length) return emptyChart('Nothing logged yet');

  const W = width, H = height, PADB = 20, PADT = 18, PADX = 8;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' });

  const max = Math.max(...bars.map(b => b.v), target > 0 ? target : 0, 1);
  const n = bars.length;
  const slot = (W - PADX * 2) / n;
  const bw = Math.max(3, Math.min(30, slot * 0.62));

  bars.forEach((b, i) => {
    const x = PADX + slot * i + (slot - bw) / 2;
    const h = Math.max(b.v > 0 ? 2 : 0, (b.v / max) * (H - PADT - PADB));
    const y = H - PADB - h;

    svg.appendChild(svgEl('rect', {
      x: x.toFixed(1), y: (H - PADB - (H - PADT - PADB)).toFixed(1),
      width: bw.toFixed(1), height: (H - PADT - PADB).toFixed(1),
      rx: Math.min(4, bw / 2), class: 'chart-bar-bg'
    }));
    svg.appendChild(svgEl('rect', {
      x: x.toFixed(1), y: y.toFixed(1), width: bw.toFixed(1), height: h.toFixed(1),
      rx: Math.min(4, bw / 2), fill: b.color || color, class: 'chart-bar' + (b.dim ? ' chart-bar-dim' : '')
    }));

    if (showValues && n <= 14 && b.v > 0) {
      const t = svgEl('text', {
        x: (x + bw / 2).toFixed(1), y: (y - 5).toFixed(1),
        class: 'chart-barval', 'text-anchor': 'middle'
      });
      t.textContent = compact(b.v) + unit;
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

  if (target > 0) {
    const ty = H - PADB - (target / max) * (H - PADT - PADB);
    svg.appendChild(svgEl('line', {
      x1: PADX, y1: ty.toFixed(1), x2: W - PADX, y2: ty.toFixed(1), class: 'chart-target'
    }));
    if (targetLabel) {
      const t = svgEl('text', {
        x: W - PADX, y: (ty - 4).toFixed(1), class: 'chart-axis', 'text-anchor': 'end'
      });
      t.textContent = targetLabel;
      svg.appendChild(t);
    }
  }

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
  const { width = 150, height = 40, color = 'var(--p-yellow)', accentFrom = 0 } = opts;
  const W = width, H = height, PADX = 4, PADY = 5;
  const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart chart-spark' });

  const n = values.length;
  const pts = [];
  values.forEach((v, i) => { if (Number.isFinite(v)) pts.push({ i, v }); });
  if (n < 2 || pts.length < 2) {
    svg.appendChild(svgEl('line', {
      x1: PADX, y1: H / 2, x2: W - PADX, y2: H / 2, class: 'spark-none'
    }));
    return svg;
  }

  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const X = i => PADX + i / (n - 1) * (W - PADX * 2);
  const Y = v => PADY + (1 - (v - lo) / (hi - lo)) * (H - PADY * 2);
  pts.forEach(p => { p.x = X(p.i); p.y = Y(p.v); });

  const path = (list, cls) => {
    if (list.length < 2) return;
    const d = list.map((p, k) => (k ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('');
    const attrs = { d, class: cls };
    if (cls === 'spark-line') attrs.stroke = color;
    svg.appendChild(svgEl('path', attrs));
  };

  // The seam belongs to both halves: the last muted point is also the first
  // coloured one, so the line has no gap where the colour changes.
  if (accentFrom > 0) {
    const before = pts.filter(p => p.i < accentFrom);
    const after  = pts.filter(p => p.i >= accentFrom);
    if (before.length && after.length) before.push(after[0]);
    path(before, 'spark-line-dim');
    path(after, 'spark-line');
  } else {
    path(pts, 'spark-line');
  }

  const end = pts[pts.length - 1];
  svg.appendChild(svgEl('circle', { cx: end.x.toFixed(1), cy: end.y.toFixed(1), r: 2.6, fill: color, class: 'spark-end' }));
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
