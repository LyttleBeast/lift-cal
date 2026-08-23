// Weigh-in normalisation, and the trend that comes out of it.
//
// The problem this exists to solve: averaging every weigh-in in a calendar day
// treats a 7am fasted reading and a 9pm post-dinner reading as the same
// measurement. They differ by pounds. So the "daily mean" depends on what time
// you happened to step on the scale, and a change in *weighing habit* becomes
// indistinguishable from a change in *body weight* — then gets multiplied by
// 500 on its way into the maintenance estimate.
//
// The model. Every weigh-in is the true fasted weight plus whatever is
// currently inside you:
//
//     lb_i  =  W(d_i)  +  G_i  +  noise
//
//     G_i = bK · Σ kcal_j·e^(−Δt/τf)  +  bW · Σ ml_k·e^(−Δt/τw)
//
// Dinner thirty minutes ago is all still in you; breakfast ten hours ago
// mostly isn't. Both the food log and the water log already carry a `t` on
// every entry, so none of this needs new data.
//
// ---------------------------------------------------------------------------
// The one thing to not "simplify" later:
//
// bK and bW are fitted on WITHIN-DAY PAIRS, never on deviations from a
// smoothed trend line. Two weigh-ins from the same day share the same W(d), so
// differencing them cancels it exactly and the coefficient is identified.
// Fitting against a trend instead lets the smoother absorb the average gut
// load, and the coefficient collapses toward zero — measured at 0.00087
// against a true 0.00160 in simulation. It looks like it converged. It hasn't.
// ---------------------------------------------------------------------------
//
// Imports store.js and ui.js only. No cycles.

import { read, LS, todayKey } from './store.js';
import { parseKey } from './ui.js';

/* Physical priors. A 700 kcal meal is roughly 500 g of actual mass, which is
   1.1 lb — so ~0.0016 lb per logged kcal. Water is exact: 946 ml is 2.09 lb,
   so 0.0022 lb/ml before any of it leaves again. */
export const PRIOR = { bK: 0.0016, bW: 0.0022, tauFood: 10, tauWater: 2.5 };

const FIT_DAYS      = 60;   // how far back to look for within-day pairs
const MAX_FIT_DAYS  = 40;   // cap on days actually fetched, most recent first
const TREND_DAYS    = 21;   // window the slope is measured over
const MIN_PAIRS     = 30;   // below this, the coefficients stay at the priors
const MIN_PAIR_DAYS = 14;
const KCAL_PER_LB   = 3500;

const DAY = 864e5, HOUR = 36e5;

let model = null;      // last computed model, or null
let fingerprint = '';  // cheap guard so repeat renders don't refit

export function modelState() { return model; }

/* ================= DATA ================= */

// Past days never change, so they cache forever. Today is always refetched.
async function loadIntake(keys) {
  const out = {};
  const today = todayKey();
  await Promise.all(keys.map(async k => {
    const past = k < today;
    if (past) {
      const c = LS.get('intake:' + k, null);
      if (c) { out[k] = c; return; }
    }
    let food = null, water = null;
    try {
      [food, water] = await Promise.all([
        read('food/log/' + k, null),
        read('water/log/' + k, null)
      ]);
    } catch { /* offline — read() already fell back to the mirror */ }
    const v = {
      meals: Object.values(food || {})
        .filter(e => e && e.t > 0)
        .map(e => ({ t: e.t, cal: Math.max(0, e.cal || 0) }))
        .sort((a, b) => a.t - b.t),
      drinks: Object.values(water || {})
        .filter(e => e && e.t > 0)
        .map(e => ({ t: e.t, ml: Math.max(0, e.ml || 0) }))
        .sort((a, b) => a.t - b.t)
    };
    out[k] = v;
    if (past) LS.set('intake:' + k, v);
  }));
  return out;
}

function keyOf(t) { return todayKey(new Date(t)); }
function prevKey(k) { return todayKey(new Date(parseKey(k).getTime() - DAY)); }

/* ================= KERNELS ================= */

// Σ value · e^(−hours_ago / tau), over events already sorted ascending by t.
function decaySum(t, events, field, tau, maxHours) {
  let s = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const dt = (t - events[i].t) / HOUR;
    if (dt < 0) continue;          // logged later than this weigh-in
    if (dt > maxHours) break;      // and everything before it is older still
    s += (events[i][field] || 0) * Math.exp(-dt / tau);
  }
  return s;
}

/* ================= FIT =================
   Least squares on within-day differences, ridged toward the priors so a thin
   month can't produce a wild coefficient. */
function fitCoefficients(rows) {
  const byDay = {};
  rows.forEach(r => (byDay[r.d] = byDay[r.d] || []).push(r));

  let Skk = 0, Skw = 0, Sww = 0, Sky = 0, Swy = 0, pairs = 0, pairDays = 0;
  Object.keys(byDay).forEach(d => {
    const v = byDay[d].slice().sort((a, b) => a.t - b.t);
    if (v.length < 2) return;
    pairDays++;
    for (let i = 0; i < v.length; i++) {
      for (let j = i + 1; j < v.length; j++) {
        const dk = v[j].xK - v[i].xK;
        const dw = v[j].xW - v[i].xW;
        const dy = v[j].lb - v[i].lb;
        Skk += dk * dk; Sww += dw * dw; Skw += dk * dw;
        Sky += dk * dy; Swy += dw * dy;
        pairs++;
      }
    }
  });

  const learned = pairs >= MIN_PAIRS && pairDays >= MIN_PAIR_DAYS;
  const base = { bK: PRIOR.bK, bW: PRIOR.bW, pairs, pairDays, learned: false };
  if (!pairs) return base;

  // Ridge per coefficient, not one shared lambda: Skk is in kcal-squared and
  // Sww in ml-squared, so a single lambda would shrink whichever regressor
  // happens to have the smaller units far harder than the other.
  const lamK = 0.05 * Math.max(Skk, 1);
  const lamW = 0.05 * Math.max(Sww, 1);
  const a = Skk + lamK, b = Skw, c = Skw, d = Sww + lamW;
  const det = a * d - b * c;
  if (!isFinite(det) || Math.abs(det) < 1e-12) return base;

  const rk = Sky + lamK * PRIOR.bK;
  const rw = Swy + lamW * PRIOR.bW;
  let bK = (rk * d - b * rw) / det;
  let bW = (a * rw - c * rk) / det;

  // A negative coefficient means "food makes you lighter". Clamp, don't ship.
  bK = clamp(bK, 0, 0.004);
  bW = clamp(bW, 0, 0.004);
  if (!isFinite(bK) || !isFinite(bW)) return base;

  // Below the gate, ease in rather than snapping between two answers.
  const t = Math.min(1, pairs / MIN_PAIRS);
  return {
    bK: PRIOR.bK + t * (bK - PRIOR.bK),
    bW: PRIOR.bW + t * (bW - PRIOR.bW),
    pairs, pairDays, learned
  };
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/* ================= ROBUST SLOPE =================
   Weighted least squares with Huber re-weighting, so one bad reading can't
   tilt the line. Returns lb/day and its standard error. */
function robustSlope(pts) {
  const n = pts.length;
  if (n < 4) return null;
  let w = pts.map(p => p.w);
  let slope = 0, inter = 0, res = [];

  for (let it = 0; it < 3; it++) {
    const sw = w.reduce((s, x) => s + x, 0);
    if (!(sw > 0)) return null;
    const xb = pts.reduce((s, p, i) => s + w[i] * p.x, 0) / sw;
    const yb = pts.reduce((s, p, i) => s + w[i] * p.y, 0) / sw;
    const sxx = pts.reduce((s, p, i) => s + w[i] * (p.x - xb) ** 2, 0);
    if (!(sxx > 0)) return null;
    const sxy = pts.reduce((s, p, i) => s + w[i] * (p.x - xb) * (p.y - yb), 0);
    slope = sxy / sxx;
    inter = yb - slope * xb;
    res = pts.map(p => p.y - (inter + slope * p.x));
    const abs = res.map(Math.abs).sort((a, b) => a - b);
    const mad = abs[Math.floor(abs.length / 2)] || 0;
    const scale = 1.4826 * mad || 0.4;
    w = pts.map((p, i) => p.w * Math.min(1, 1.5 * scale / Math.max(1e-6, Math.abs(res[i]))));
  }

  // Standard error, with the weights renormalised to sum to n.
  const sw = w.reduce((s, x) => s + x, 0);
  const wn = w.map(x => x * n / sw);
  const xb = pts.reduce((s, p, i) => s + wn[i] * p.x, 0) / n;
  const sxx = pts.reduce((s, p, i) => s + wn[i] * (p.x - xb) ** 2, 0);
  const sse = pts.reduce((s, p, i) => s + wn[i] * res[i] ** 2, 0);
  const se = sxx > 0 && n > 2 ? Math.sqrt((sse / (n - 2)) / sxx) : null;
  return { slope, inter, se, n };
}

/* ================= BUILD ================= */

export async function refreshModel(entries) {
  const list = Object.entries(entries || {})
    .map(([id, e]) => ({ id, lb: e.lb, t: e.t }))
    .filter(e => e.lb > 0 && e.t > 0)
    .sort((a, b) => a.t - b.t);

  const fp = list.length + ':' + (list.length ? list[list.length - 1].t : 0);
  if (fp === fingerprint && model) return model;

  if (list.length < 4) { model = null; fingerprint = fp; return null; }

  const today = todayKey();
  const cutFit = Date.now() - FIT_DAYS * DAY;

  // Days with two or more weigh-ins are the ones that carry fitting
  // information; the trend window needs its own days regardless.
  const byDay = {};
  list.forEach(e => { const k = keyOf(e.t); (byDay[k] = byDay[k] || []).push(e); });

  const pairDays = Object.keys(byDay)
    .filter(k => byDay[k].length >= 2 && parseKey(k).getTime() >= cutFit)
    .sort().reverse().slice(0, MAX_FIT_DAYS);

  const trendDays = [];
  for (let i = 0; i < TREND_DAYS; i++) {
    trendDays.push(todayKey(new Date(Date.now() - i * DAY)));
  }

  // A morning weigh-in needs last night's dinner, so pull the day before too.
  const want = new Set();
  [...pairDays, ...trendDays].forEach(k => { want.add(k); want.add(prevKey(k)); });

  const intake = await loadIntake([...want]);

  const mealsFor = k => (intake[k] && intake[k].meals) || [];
  const drinksFor = k => (intake[k] && intake[k].drinks) || [];

  // Basis values at unit coefficients, using this day and the one before.
  const rows = list.map(e => {
    const k = keyOf(e.t), p = prevKey(k);
    const meals = [...mealsFor(p), ...mealsFor(k)];
    const drinks = [...drinksFor(p), ...drinksFor(k)];
    return {
      ...e, d: k,
      xK: decaySum(e.t, meals, 'cal', PRIOR.tauFood, 48),
      xW: decaySum(e.t, drinks, 'ml', PRIOR.tauWater, 24),
      dayCal: (intake[k] ? mealsFor(k) : []).reduce((s, m) => s + m.cal, 0)
    };
  });

  const coef = fitCoefficients(rows.filter(r => r.t >= cutFit));

  // Normalise: every reading moved onto one fasted-morning scale.
  const norm = rows.map(r => {
    const corr = coef.bK * r.xK + coef.bW * r.xW;
    return { ...r, corr, adj: r.lb - corr };
  });

  // Per-day value, weighted by how much we had to correct. A reading needing
  // 3 lb of correction carries 3 lb of the model's error with it; one needing
  // 0.3 lb barely does. Days with almost nothing logged are suspect too — the
  // correction there is missing, not small.
  const days = {};
  norm.forEach(r => {
    let w = 1 / (1 + (r.corr / 1.5) ** 2);
    if (r.dayCal > 0 && r.dayCal < 800) w *= 0.5;
    (days[r.d] = days[r.d] || []).push({ adj: r.adj, w, raw: r.lb });
  });

  const daily = Object.keys(days).sort().map(d => {
    const v = days[d];
    const sw = v.reduce((s, x) => s + x.w, 0) || 1;
    return {
      d,
      lb: v.reduce((s, x) => s + x.w * x.adj, 0) / sw,
      raw: v.reduce((s, x) => s + x.raw, 0) / v.length,
      n: v.length,
      w: Math.min(1, sw)
    };
  });

  // Slope over the trend window.
  const cutTrend = Date.now() - TREND_DAYS * DAY;
  const pts = daily
    .filter(p => parseKey(p.d).getTime() >= cutTrend)
    .map(p => ({ x: parseKey(p.d).getTime() / DAY, y: p.lb, w: p.w }));
  const fitTrend = robustSlope(pts);

  // Observed diurnal shape, straight off the corrections the model applied.
  const hours = {};
  norm.forEach(r => {
    const h = new Date(r.t).getHours();
    (hours[h] = hours[h] || []).push(r.corr);
  });
  const hourly = Object.keys(hours).map(h => ({
    h: +h,
    lb: hours[h].reduce((s, x) => s + x, 0) / hours[h].length,
    n: hours[h].length
  })).sort((a, b) => a.h - b.h);

  const anchorDays = Object.keys(byDay).filter(k => {
    if (parseKey(k).getTime() < Date.now() - 7 * DAY) return false;
    return byDay[k].some(e => { const h = new Date(e.t).getHours(); return h >= 4 && h < 10; });
  }).length;

  // The fitted line evaluated at today. This is the number to hand anything
  // that scales with bodyweight — the raw latest weigh-in swings by pounds
  // depending on what time he stood on the scale, which is the whole reason
  // this file exists.
  const trendLb = fitTrend
    ? fitTrend.inter + fitTrend.slope * (Date.now() / DAY)
    : (daily.length ? daily[daily.length - 1].lb : null);

  model = {
    coef,
    entries: norm,
    daily,
    trendLb,
    ratePerDay: fitTrend ? fitTrend.slope : null,
    rateWk: fitTrend ? fitTrend.slope * 7 : null,
    rateSeWk: fitTrend && fitTrend.se != null ? fitTrend.se * 7 : null,
    trendDays: fitTrend ? fitTrend.n : 0,
    hourly,
    anchorDays,
    spread: intraDaySpread(days)
  };
  fingerprint = fp;
  return model;
}

function intraDaySpread(days) {
  const sp = Object.values(days).filter(v => v.length > 1)
    .map(v => Math.max(...v.map(x => x.raw)) - Math.min(...v.map(x => x.raw)));
  if (!sp.length) return null;
  return sp.reduce((s, x) => s + x, 0) / sp.length;
}

/* ================= OUTPUTS ================= */

// Normalised bodyweight as of today, off the fitted trend line. Null until
// there is enough to fit one.
export function trendWeight() {
  return model && model.trendLb > 0 ? model.trendLb : null;
}

// Same shape weightStats().days produces, so the chart can swap between them.
export function adjustedDays() {
  return model ? model.daily.map(p => ({ d: p.d, lb: p.lb })) : null;
}

// "Your scale runs +3.8 lb by 8pm" — the number he actually noticed, handed back.
export function peakOffset() {
  if (!model || !model.hourly.length) return null;
  let best = null;
  model.hourly.forEach(p => {
    if (p.n < 2) return;
    if (!best || p.lb > best.lb) best = p;
  });
  return best;
}

export function maintenanceFromModel(daySummaries) {
  if (!model || model.rateWk == null) return null;
  const today = todayKey();
  const cal = Object.entries(daySummaries || {})
    .filter(([d, v]) => d !== today && v && v.cal > 0)
    .filter(([d]) => parseKey(d).getTime() > Date.now() - (TREND_DAYS + 1) * DAY);
  if (cal.length < 7) return null;

  const avgIntake = cal.reduce((s, [, v]) => s + v.cal, 0) / cal.length;
  const tdee = Math.round((avgIntake - model.ratePerDay * KCAL_PER_LB) / 10) * 10;
  const se = model.rateSeWk != null ? Math.round(model.rateSeWk / 7 * KCAL_PER_LB) : null;
  return {
    tdee, avgIntake, se,
    days: cal.length,
    rateWk: model.rateWk,
    rateSeWk: model.rateSeWk,
    coef: model.coef,
    trendDays: model.trendDays,
    need: []
  };
}
