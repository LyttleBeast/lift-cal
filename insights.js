// Insights — what Rack noticed, derived from the data the You tab already holds.
//
// The You tab used to answer "how did the week go" with pictures and leave
// the reading to the reader. This module does the reading: it looks at the
// same numbers the cards draw and says, in one line each, what is going well,
// what is slipping, what changed, and where the goal is heading at the
// current pace. Everything here is arithmetic over the log; nothing is
// generated, guessed or phrased to sound wise. If a finding cannot be backed
// by a number the reader could check on another tab, it is not made.
//
// Pure on purpose. No reads, no DOM, no module state: you.js passes in what it
// loaded and gets back plain objects. That keeps the reading testable, keeps
// the You tab the only reader of the database, and means the thresholds all
// live in one file where they can be argued about.
//
// Every threshold below is a judgement and is written as one. They are kept
// deliberately coarse — a "meaningful" change is one a person would notice on
// the other tab, not one that clears a statistical bar — and each finding
// carries a `why` that states the rule in plain words, because a verdict the
// reader cannot see the working of is the thing this app refuses to be.
//
// Imports only what it needs from analytics.js (session math) and ui.js
// (formatting). Nothing imports back.

import { todayKey } from './store.js';
import { parseKey, r1, compact, fmtDate } from './ui.js';
import { prTimeline, groupSplit, GROUPS } from './analytics.js';

const DAY = 864e5;

export function keysBack(n, endAgo = 0) {
  const out = [];
  for (let i = endAgo + n - 1; i >= endAgo; i--) out.push(todayKey(new Date(Date.now() - i * DAY)));
  return out;
}

function mean(xs) {
  const v = xs.map(Number).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

const fmtInt = v => Math.round(v).toLocaleString();
const pct = (a, b) => Math.round((a - b) / b * 100);

/* ================= ONE WINDOW OF DAYS =================
   Every number the findings compare, over one run of date keys. Averages are
   over the days that have the thing — four logged days is a four-day
   average, not a week with three days of nothing. `foodKeys` drops today
   when asked, for the reason every other intake average in the app gives
   (tdee.js:75): half a day of food read against whole ones is not a smaller
   appetite, it is an unfinished day. */
export function windowStats(ctx, keys, { dropToday = false } = {}) {
  const { summaries = {}, targets, wmap = {}, sessions, stepDays = {}, stepGoal, waterDays, waterGoal } = ctx;
  const today = todayKey();
  const foodKeys = dropToday ? keys.filter(k => k !== today) : keys;

  const logged = foodKeys.filter(k => summaries[k] && summaries[k].cal > 0);
  const kcal = mean(logged.map(k => summaries[k].cal));
  // Days with quick-logged calories (summary.q) have macros that are missing,
  // not zero, so they count for calories and are left out of the protein
  // reading — otherwise a 700 kcal dinner logged as a number reads as a
  // protein-free day and the verdict is wrong.
  const macroKeys = logged.filter(k => !(summaries[k].q > 0));
  const pTarget = targets && targets.p > 0 ? targets.p : null;
  const pAvg = mean(macroKeys.map(k => summaries[k].p || 0));
  const pDays = pTarget ? macroKeys.filter(k => (summaries[k].p || 0) >= pTarget * 0.9).length : null;

  const stepKeys = keys.filter(k => stepDays[k] && stepDays[k].steps > 0);
  const steps = mean(stepKeys.map(k => stepDays[k].steps));
  const stepHit = stepGoal > 0 ? stepKeys.filter(k => stepDays[k].steps >= stepGoal).length : 0;

  const waterKeys = waterDays ? keys.filter(k => waterDays[k] > 0) : [];
  const water = mean(waterKeys.map(k => waterDays[k]));
  const waterHit = waterGoal > 0 ? waterKeys.filter(k => waterDays[k] >= waterGoal).length : 0;

  const set = new Set(keys);
  const sess = sessions ? sessions.filter(s => s && set.has(s._date)) : null;
  const volume = sess ? sess.reduce((a, s) => a + (s.volume || 0), 0) : null;
  const trainDays = sess ? new Set(sess.map(s => s._date)) : new Set();

  const weighKeys = keys.filter(k => wmap[k] != null);
  const active = keys.filter(k =>
    (summaries[k] && summaries[k].cal > 0) || stepKeys.includes(k) || weighKeys.includes(k) || trainDays.has(k)).length;

  return {
    keys, foodDays: foodKeys.length,
    logged: logged.length, macroDays: macroKeys.length, kcal, pAvg, pDays, pTarget,
    stepDays: stepKeys.length, steps, stepHit,
    waterDays: waterKeys.length, water, waterHit, waterKnown: waterDays != null,
    sessions: sess ? sess.length : null, volume, trainDays: trainDays.size,
    weighDays: weighKeys.length, weightAvg: mean(weighKeys.map(k => wmap[k])),
    active
  };
}

/* ================= THE FINDINGS =================
   ctx: { targets, maint: {cal, pinned}|null, dir: -1|0|1|null, summaries,
          wmap: {dateKey: lb}, entries, rate: {rateWk, model}|null, tw: lb|null,
          sessions: []|null, stepDays, stepGoal, waterDays: {dateKey: ml}|null,
          waterGoal, est: maintenance()|null, days: weightStats().days }

   Returns { wins, improve, insights, review, trajectory }. Each finding is
   { id, subject, score, title, detail, why }. `score` is how much the reader
   would care, not how large the number is — protein on a cut outranks water
   whatever the percentages — and it is what the caller sorts by. */
export function assess(ctx) {
  const { targets, dir, rate, tw } = ctx;
  const wins = [], improve = [], insights = [];
  const win = f => wins.push(f), fix = f => improve.push(f), note = f => insights.push(f);

  const thisWk = windowStats(ctx, keysBack(7, 0), { dropToday: true });
  const lastWk = windowStats(ctx, keysBack(7, 7));
  const month  = windowStats(ctx, keysBack(28, 0), { dropToday: true });
  const rateWk = rate && Number.isFinite(rate.rateWk) ? rate.rateWk : null;
  const planned = targets && targets.auto && Number.isFinite(targets.auto.rateWk) ? targets.auto.rateWk : null;
  const goalWord = dir < 0 ? 'cut' : dir > 0 ? 'bulk' : 'hold';

  /* ---- food logging ---- */
  if (thisWk.foodDays >= 5) {
    if (thisWk.logged >= thisWk.foodDays - 1 && thisWk.logged >= 5) {
      win({ id: 'log-good', subject: 'fuel', score: 60,
        title: 'Food logged ' + thisWk.logged + ' of the last ' + thisWk.foodDays + ' days',
        detail: 'That is what lets Rack measure your maintenance instead of guessing it.',
        why: 'Counted over the last seven days, today left out because it isn’t over. A day counts once anything with calories is on it.' });
    } else if (thisWk.logged <= 2) {
      fix({ id: 'log-low', subject: 'fuel', score: 90,
        title: thisWk.logged ? 'Only ' + thisWk.logged + ' day' + (thisWk.logged === 1 ? '' : 's') + ' of food logged this week' : 'No food logged this week',
        detail: 'Every other number on this screen leans on the log. Even a rough day is better than a blank one.',
        why: 'Days with at least one entry, over the last seven days with today left out. Under three is where the maintenance estimate stops being able to update.' });
    }
  }

  /* ---- protein ---- */
  if (thisWk.pTarget && thisWk.macroDays >= 3) {
    const share = thisWk.pDays / thisWk.macroDays;
    if (share >= 0.8) {
      win({ id: 'protein-good', subject: 'fuel', score: 85,
        title: 'Protein on target ' + thisWk.pDays + ' of ' + thisWk.macroDays + ' logged days',
        detail: 'Averaging ' + fmtInt(thisWk.pAvg) + ' g against ' + fmtInt(thisWk.pTarget) + '.',
        why: 'A day counts when it reaches 90% of your protein target (' + fmtInt(thisWk.pTarget * 0.9) + ' g). Four of five logged days or better is the bar.' });
    } else if (share <= 0.4) {
      fix({ id: 'protein-low', subject: 'fuel', score: 95,
        title: 'Protein under target ' + (thisWk.macroDays - thisWk.pDays) + ' of ' + thisWk.macroDays + ' days',
        detail: 'Averaging ' + fmtInt(thisWk.pAvg) + ' g against ' + fmtInt(thisWk.pTarget) +
          (dir < 0 ? ' — on a cut it is the number that decides whether the weight you lose is fat.' : '.'),
        why: 'A day counts when it reaches 90% of your protein target. Fewer than two in five logged days is the bar for this.' });
    }
    // Improving, week over week — a pattern rather than a state.
    if (lastWk.pTarget && lastWk.macroDays >= 3 && thisWk.pDays - lastWk.pDays >= 2 && share >= 0.6) {
      note({ id: 'protein-up', subject: 'fuel', score: 70,
        title: 'Protein consistency is improving',
        detail: thisWk.pDays + ' of ' + thisWk.macroDays + ' days on target this week, up from ' + lastWk.pDays + ' of ' + lastWk.macroDays + ' last week.',
        why: 'Days at or above 90% of your protein target, this seven days against the seven before. Two more days is the bar.' });
    }
  }

  /* ---- calories against target ---- */
  if (targets && targets.cal > 0 && thisWk.logged >= 3 && thisWk.kcal != null) {
    const diff = thisWk.kcal - targets.cal;
    const share = diff / targets.cal;
    if (Math.abs(share) <= 0.05) {
      win({ id: 'kcal-good', subject: 'fuel', score: 80,
        title: 'Calories within ' + fmtInt(Math.abs(diff)) + ' of target',
        detail: 'Averaging ' + fmtInt(thisWk.kcal) + ' a day against ' + fmtInt(targets.cal) + '.',
        why: 'The average over logged days, today left out, within 5% of your daily target either way.' });
    } else if ((dir < 0 && share >= 0.12) || (dir > 0 && share <= -0.12) || (dir === 0 && Math.abs(share) >= 0.12)) {
      fix({ id: 'kcal-off', subject: 'fuel', score: 88,
        title: 'Averaging ' + fmtInt(thisWk.kcal) + ', ' + fmtInt(Math.abs(diff)) + ' ' + (diff > 0 ? 'over' : 'under') + ' your target',
        detail: dir < 0 ? 'That is most of the deficit gone before the scale gets a say.'
              : dir > 0 ? 'A bulk that averages under target is a hold with extra steps.'
              :           'Either side is fine for a day; a week of it moves the scale.',
        why: 'The average over logged days, today left out, more than 12% from target in the direction that works against your ' + goalWord + '.' });
    }
  }

  /* ---- the weekend ---- */
  {
    const keys = keysBack(28, 1);
    const wd = [], we = [];
    keys.forEach(k => {
      const s = ctx.summaries[k];
      if (!(s && s.cal > 0)) return;
      const d = parseKey(k).getDay();
      (d === 0 || d === 6 ? we : wd).push(s.cal);
    });
    if (we.length >= 3 && wd.length >= 6) {
      const gap = pct(mean(we), mean(wd));
      if (gap >= 15) {
        note({ id: 'weekend', subject: 'fuel', score: 65,
          title: 'Weekends run ' + gap + '% higher than weekdays',
          detail: fmtInt(mean(we)) + ' a day Saturday and Sunday against ' + fmtInt(mean(wd)) + ' Monday to Friday, over the last four weeks.',
          why: 'Logged days in the last 28, split by weekday and weekend, with at least three weekend days and six weekdays behind it. Fifteen percent is the bar.' });
      }
    }
  }

  /* ---- weight against the goal ---- */
  if (rateWk != null && dir != null && thisWk.weighDays + lastWk.weighDays >= 4) {
    const abs = r1(Math.abs(rateWk));
    if (dir < 0 && rateWk <= -0.3) {
      win({ id: 'pace-good', subject: 'weight', score: 90,
        title: 'Losing ' + abs + ' lb a week',
        detail: planned ? 'Your plan is ' + r1(Math.abs(planned)) + ' lb a week.' : 'The trend is heading the way a cut should.',
        why: 'The slope of your normalised trend weight, which corrects every weigh-in for the food and water in you at the time. Down at least 0.3 lb a week is the bar on a cut.' });
    } else if (dir > 0 && rateWk >= 0.2) {
      win({ id: 'pace-good', subject: 'weight', score: 90,
        title: 'Gaining ' + abs + ' lb a week',
        detail: planned ? 'Your plan is ' + r1(Math.abs(planned)) + ' lb a week.' : 'The trend is heading the way a bulk should.',
        why: 'The slope of your normalised trend weight. Up at least 0.2 lb a week is the bar on a bulk.' });
    } else if (dir === 0 && Math.abs(rateWk) <= 0.3) {
      win({ id: 'pace-good', subject: 'weight', score: 75,
        title: 'Weight holding steady',
        detail: 'Trend moving ' + abs + ' lb a week, which is noise.',
        why: 'The slope of your normalised trend weight within 0.3 lb a week either way.' });
    } else if ((dir < 0 && rateWk >= 0.2) || (dir > 0 && rateWk <= -0.2)) {
      fix({ id: 'pace-wrong', subject: 'weight', score: 92,
        title: 'Weight ' + (rateWk > 0 ? 'up' : 'down') + ' ' + abs + ' lb a week on a ' + goalWord,
        detail: 'Two weeks of that is a real move, not a wobble. The calorie line under Fuel is where it starts.',
        why: 'The slope of your normalised trend weight, at least 0.2 lb a week the wrong way for your goal.' });
    }
    // Faster or slower than the plan — a pattern, not a verdict.
    if (planned && planned !== 0 && Math.sign(rateWk) === Math.sign(planned)) {
      const ratio = Math.abs(rateWk) / Math.abs(planned);
      if (ratio >= 1.6 && Math.abs(rateWk) >= 1.4 && dir < 0) {
        note({ id: 'pace-fast', subject: 'weight', score: 80,
          title: 'Losing faster than planned',
          detail: abs + ' lb a week against a plan of ' + r1(Math.abs(planned)) + '. Past about 1.5 a week more of it is muscle.',
          why: 'Trend slope at least 1.6 times the planned rate and above 1.4 lb a week.' });
      } else if (ratio <= 0.4 && Math.abs(planned) >= 0.5 && (thisWk.weighDays + lastWk.weighDays) >= 8) {
        note({ id: 'pace-slow', subject: 'weight', score: 72,
          title: (dir < 0 ? 'Losing' : 'Gaining') + ' slower than planned',
          detail: abs + ' lb a week against a plan of ' + r1(Math.abs(planned)) + '. Not wrong — but the target may be sitting closer to maintenance than it looks.',
          why: 'Trend slope under 40% of the planned rate, with at least eight weigh-ins in the last fortnight so the slope is real.' });
      }
    }
  }

  /* ---- weigh-ins ---- */
  if (thisWk.weighDays >= 5) {
    win({ id: 'weigh-good', subject: 'weight', score: 55,
      title: 'Weighed in ' + thisWk.weighDays + ' of 7 days',
      detail: 'The trend, the rate and the maintenance number all get sharper with every reading.',
      why: 'Days with at least one weigh-in in the last seven. Five is the bar.' });
  } else if (thisWk.weighDays <= 1 && Object.keys(ctx.wmap).length >= 3) {
    fix({ id: 'weigh-low', subject: 'weight', score: 60,
      title: thisWk.weighDays ? 'One weigh-in this week' : 'No weigh-ins this week',
      detail: 'Without readings the trend goes stale and the maintenance estimate stops moving.',
      why: 'Days with a weigh-in in the last seven, for an account that has weighed in before.' });
  }

  /* ---- training ---- */
  if (thisWk.sessions != null) {
    if (thisWk.sessions >= 3) {
      win({ id: 'train-good', subject: 'train', score: 82,
        title: thisWk.sessions + ' sessions this week',
        detail: thisWk.volume > 0 ? compact(thisWk.volume) + ' lb moved.' : '',
        why: 'Finished sessions in the last seven days, today included. Three is the bar.' });
    } else if (thisWk.sessions === 0 && ctx.sessions.length) {
      fix({ id: 'train-none', subject: 'train', score: 85,
        title: 'No sessions this week',
        detail: lastWk.sessions ? lastWk.sessions + ' last week.' : 'Nothing last week either.',
        why: 'Finished sessions in the last seven days, for an account that has trained before.' });
    }
    if (lastWk.sessions >= 2 && thisWk.sessions >= 2 && lastWk.volume > 0 && thisWk.volume > 0) {
      const ch = pct(thisWk.volume, lastWk.volume);
      if (Math.abs(ch) >= 25) {
        note({ id: 'vol-change', subject: 'train', score: 75,
          title: 'Training volume ' + (ch > 0 ? 'up' : 'down') + ' ' + Math.abs(ch) + '% on last week',
          detail: compact(thisWk.volume) + ' lb over ' + thisWk.sessions + ' sessions, against ' + compact(lastWk.volume) + ' over ' + lastWk.sessions + '.',
          why: 'Working-set volume (weight × reps, warm-ups excluded) this seven days against the seven before, both with at least two sessions. A quarter either way is the bar.' });
      }
    }
    if (ctx.sessions.length) {
      const wk = new Set(keysBack(7, 0));
      const prs = prTimeline(ctx.sessions).filter(p => wk.has(p.date));
      if (prs.length) {
        const top = prs.slice().sort((a, b) => b.value - a.value)[0];
        note({ id: 'prs', subject: 'train', score: 78,
          title: prs.length === 1 ? 'A new record this week' : prs.length + ' new records this week',
          detail: top.name + ' — ' + Math.round(top.value) + ' lb' + (top.kind === 'e1rm' ? ' estimated 1RM (' + top.detail + ')' : ', heaviest yet') + '.',
          why: 'A record is a best estimated one-rep max or a heaviest weight for an exercise, against everything logged before it. Warm-ups never count.' });
      }
    }
    // Where the month's sets went — a group missed for four weeks is the
    // kind of thing nobody notices from inside the week.
    const monthSess = ctx.sessions.filter(s => s && new Set(keysBack(28, 0)).has(s._date));
    if (monthSess.length >= 6) {
      const split = groupSplit(monthSess);
      const total = split.reduce((a, x) => a + x.sets, 0);
      const have = new Set(split.map(x => x.group));
      const missing = ['chest', 'back', 'legs', 'shoulders'].filter(g => !have.has(g));
      if (missing.length && missing.length <= 2) {
        note({ id: 'neglect', subject: 'train', score: 74,
          title: 'No ' + missing.map(g => GROUPS[g].label.toLowerCase()).join(' or ') + ' work in four weeks',
          detail: monthSess.length + ' sessions in the last 28 days, none of them with a working set there.',
          why: 'Working sets by muscle group over the last 28 days, for an account with at least six sessions in them.' });
      }
      const heavy = split.find(x => x.sets / total >= 0.45);
      if (heavy && total >= 30) {
        note({ id: 'imbalance', subject: 'train', score: 62,
          title: Math.round(heavy.sets / total * 100) + '% of your sets are ' + GROUPS[heavy.group].label.toLowerCase(),
          detail: heavy.sets + ' of ' + total + ' working sets in the last four weeks.',
          why: 'One muscle group with at least 45% of the working sets over the last 28 days, thirty sets or more in total.' });
      }
    }
  }

  /* ---- steps ---- */
  if (thisWk.stepDays >= 3 && ctx.stepGoal > 0) {
    if (thisWk.steps >= ctx.stepGoal) {
      win({ id: 'steps-good', subject: 'steps', score: 58,
        title: 'Averaging ' + fmtInt(thisWk.steps) + ' steps a day',
        detail: 'Over your ' + fmtInt(ctx.stepGoal) + ' goal on ' + thisWk.stepHit + ' of ' + thisWk.stepDays + ' days.',
        why: 'The average over days with a step total in the last seven, at or above your goal.' });
    } else if (thisWk.steps < ctx.stepGoal * 0.6) {
      fix({ id: 'steps-low', subject: 'steps', score: 50,
        title: 'Steps at ' + fmtInt(thisWk.steps) + ' a day, well under ' + fmtInt(ctx.stepGoal),
        detail: 'Walking is the cheapest place to find a deficit that food is not giving you.',
        why: 'The average over days with a step total in the last seven, under 60% of your goal.' });
    }
    if (lastWk.stepDays >= 3) {
      const ch = pct(thisWk.steps, lastWk.steps);
      if (Math.abs(ch) >= 25) {
        note({ id: 'steps-change', subject: 'steps', score: 56,
          title: 'Steps ' + (ch > 0 ? 'up' : 'down') + ' ' + Math.abs(ch) + '% on last week',
          detail: fmtInt(thisWk.steps) + ' a day against ' + fmtInt(lastWk.steps) + '.',
          why: 'The average over logged days this seven days against the seven before, both with at least three days. A quarter either way is the bar.' });
      }
    }
  }

  /* ---- water ---- */
  if (thisWk.waterKnown && thisWk.waterDays >= 3 && ctx.waterGoal > 0) {
    if (thisWk.waterHit >= 4) {
      win({ id: 'water-good', subject: 'water', score: 45,
        title: 'Water goal hit ' + thisWk.waterHit + ' of ' + thisWk.waterDays + ' days',
        detail: '', why: 'Days at or above your water goal in the last seven. Four is the bar.' });
    } else if (thisWk.water < ctx.waterGoal * 0.6) {
      fix({ id: 'water-low', subject: 'water', score: 40,
        title: 'Water under 60% of goal',
        detail: 'On the days you logged it.',
        why: 'The average over days with water logged in the last seven, under 60% of your goal.' });
    }
  }

  /* ---- consistency ---- */
  {
    const streak = streakOf(ctx);
    if (streak >= 7) {
      win({ id: 'streak', subject: 'all', score: 70,
        title: streak + '-day streak',
        detail: 'Something logged every day for ' + streak + ' days.',
        why: 'Consecutive days, counted back from today or from yesterday when today is still empty, with a meal, a weigh-in, a session or a step total on each.' });
    }
    if (month.active >= 25) {
      note({ id: 'month', subject: 'all', score: 60,
        title: month.active + ' of the last 28 days on record',
        detail: 'That kind of consistency is what makes every estimate on this screen trustworthy.',
        why: 'Days in the last 28 with anything at all logged. Twenty-five is the bar.' });
    }
  }

  const byScore = (a, b) => b.score - a.score;
  wins.sort(byScore); improve.sort(byScore); insights.sort(byScore);

  return {
    wins: wins.slice(0, 3),
    improve: improve.slice(0, 3),
    insights: insights.slice(0, 4),
    review: weeklyReview(ctx),
    trajectory: trajectory(ctx, rateWk, planned, tw)
  };
}

/* Consecutive days with anything on them, back from today — or from
   yesterday when today is still empty, because a streak should not be lost
   at eight in the morning. */
export function streakOf(ctx) {
  const on = k => (ctx.summaries[k] && ctx.summaries[k].cal > 0) || ctx.wmap[k] != null ||
                  (ctx.stepDays[k] && ctx.stepDays[k].steps > 0) ||
                  (ctx.sessions || []).some(s => s && s._date === k);
  let streak = 0;
  let d = new Date();
  if (!on(todayKey(d))) d = new Date(d.getTime() - DAY);
  for (let i = 0; i < 400; i++) {
    if (!on(todayKey(d))) break;
    streak++;
    d = new Date(d.getTime() - DAY);
  }
  return streak;
}

/* ================= THE WEEKLY REVIEW =================
   The last seven complete days against the seven before them. Complete days
   on purpose: a review that includes today changes every time it is read.
   Returns { from, to, verdict, positives, attention, takeaway, items } where
   each item is { subject, label, value, ok, text } and `ok` is true, false
   or null for "nothing to judge". */
export function weeklyReview(ctx) {
  const { targets, dir } = ctx;
  const cur  = windowStats(ctx, keysBack(7, 1));
  const prev = windowStats(ctx, keysBack(7, 8));
  const items = [];
  const item = (subject, label, ok, text, value) => items.push({ subject, label, ok, text, value });

  // Training
  if (cur.sessions != null) {
    const s = cur.sessions;
    const delta = prev.sessions != null ? s - prev.sessions : null;
    item('train', 'Training',
      s === 0 && ctx.sessions.length ? false : s >= 2 ? true : s === 0 ? null : false,
      s === 0 ? (ctx.sessions.length ? 'No sessions.' + (prev.sessions ? ' ' + prev.sessions + ' the week before.' : '') : 'Nothing logged yet.')
        : s + ' session' + (s === 1 ? '' : 's') + (cur.volume > 0 ? ', ' + compact(cur.volume) + ' lb' : '') +
          (delta != null && delta !== 0 ? ' — ' + (delta > 0 ? 'up ' : 'down ') + Math.abs(delta) + ' on the week before' : '') +
          (prev.volume > 0 && cur.volume > 0 && Math.abs(pct(cur.volume, prev.volume)) >= 15 ? ', volume ' + (cur.volume > prev.volume ? 'up ' : 'down ') + Math.abs(pct(cur.volume, prev.volume)) + '%' : '') + '.',
      s + (s === 1 ? ' session' : ' sessions'));
  }

  // Logging
  item('fuel', 'Food log',
    cur.logged >= 5 ? true : cur.logged <= 2 ? false : null,
    cur.logged + ' of 7 days logged' + (prev.logged !== cur.logged ? ', ' + prev.logged + ' the week before' : '') + '.',
    cur.logged + ' / 7');

  // Calories
  if (targets && targets.cal > 0 && cur.logged >= 3 && cur.kcal != null) {
    const diff = cur.kcal - targets.cal, share = diff / targets.cal;
    const bad = (dir < 0 && share >= 0.1) || (dir > 0 && share <= -0.1) || (dir === 0 && Math.abs(share) >= 0.1);
    item('fuel', 'Calories', Math.abs(share) <= 0.06 ? true : bad ? false : null,
      fmtInt(cur.kcal) + ' a day, ' + fmtInt(Math.abs(diff)) + ' ' + (diff >= 0 ? 'over' : 'under') + ' target' +
      (prev.kcal != null && prev.logged >= 3 ? ' (' + fmtInt(prev.kcal) + ' the week before)' : '') + '.',
      fmtInt(cur.kcal) + ' kcal');
  }

  // Protein
  if (cur.pTarget && cur.macroDays >= 3) {
    const share = cur.pDays / cur.macroDays;
    item('fuel', 'Protein', share >= 0.7 ? true : share <= 0.4 ? false : null,
      cur.pDays + ' of ' + cur.macroDays + ' logged days on target, averaging ' + fmtInt(cur.pAvg) + ' g of ' + fmtInt(cur.pTarget) +
      (cur.logged > cur.macroDays ? ' (' + (cur.logged - cur.macroDays) + ' quick-logged ' + (cur.logged - cur.macroDays === 1 ? 'day' : 'days') + ' left out)' : '') + '.',
      cur.pDays + ' / ' + cur.macroDays + ' days');
  }

  // Weight
  if (cur.weighDays >= 2 && prev.weighDays >= 2 && cur.weightAvg != null && prev.weightAvg != null) {
    const d = cur.weightAvg - prev.weightAvg;
    const ok = dir == null ? null
             : dir === 0 ? Math.abs(d) <= 0.7
             : dir < 0 ? d <= -0.2 ? true : d >= 0.5 ? false : null
             : d >= 0.2 ? true : d <= -0.5 ? false : null;
    item('weight', 'Weight', ok,
      'Averaged ' + r1(cur.weightAvg) + ' lb, ' + (Math.abs(d) < 0.05 ? 'unchanged' : r1(Math.abs(d)) + ' lb ' + (d < 0 ? 'down' : 'up')) +
      ' on the week before, over ' + cur.weighDays + ' weigh-in day' + (cur.weighDays === 1 ? '' : 's') + '.',
      r1(cur.weightAvg) + ' lb');
  } else if (cur.weighDays === 0 && Object.keys(ctx.wmap).length) {
    item('weight', 'Weight', false, 'No weigh-ins.', '–');
  }

  // Steps
  if (cur.stepDays >= 3 && ctx.stepGoal > 0) {
    item('steps', 'Steps', cur.steps >= ctx.stepGoal * 0.95 ? true : cur.steps < ctx.stepGoal * 0.7 ? false : null,
      fmtInt(cur.steps) + ' a day against a ' + fmtInt(ctx.stepGoal) + ' goal, ' + cur.stepHit + ' of ' + cur.stepDays + ' days over it.',
      fmtInt(cur.steps) + ' / day');
  }

  // Water
  if (cur.waterKnown && cur.waterDays >= 3 && ctx.waterGoal > 0) {
    item('water', 'Water', cur.waterHit >= 4 ? true : cur.water < ctx.waterGoal * 0.6 ? false : null,
      cur.waterHit + ' of ' + cur.waterDays + ' logged days at goal.',
      cur.waterHit + ' / ' + cur.waterDays + ' days');
  }

  const positives = items.filter(i => i.ok === true);
  const attention = items.filter(i => i.ok === false);
  const verdict =
    cur.active <= 2 ? 'A quiet week'
    : positives.length >= 3 && attention.length === 0 ? 'A strong week'
    : positives.length >= attention.length + 1 ? 'A solid week'
    : attention.length >= 3 ? 'A week to reset from'
    : 'A mixed week';

  // One takeaway, chosen by leverage rather than by size: the thing whose
  // fixing makes the most other numbers on this screen come right.
  let takeaway = null;
  const has = (label, ok) => items.find(i => i.label === label && i.ok === ok);
  if (has('Food log', false)) takeaway = 'Log food most days next week — even roughly. Nothing else on this screen can be measured without it.';
  else if (has('Protein', false)) takeaway = 'Get protein to ' + fmtInt(cur.pTarget) + ' g on at least five days next week. It is the number a ' + (dir < 0 ? 'cut' : 'week of training') + ' most depends on.';
  else if (has('Training', false)) takeaway = 'Two sessions next week, on the calendar before the week starts. Volume can wait; showing up cannot.';
  else if (has('Calories', false)) takeaway = (dir < 0 ? 'Bring the daily average back under ' + fmtInt(targets.cal) + '. ' : dir > 0 ? 'Get the daily average up to ' + fmtInt(targets.cal) + '. ' : 'Settle the daily average around ' + fmtInt(targets.cal) + '. ') + 'The bar on Fuel shows where each day lands.';
  else if (has('Weight', false)) takeaway = cur.weighDays === 0 ? 'Weigh in most mornings next week. The trend cannot move without readings.' : 'The scale went the wrong way for a week. Hold the calorie target and let the trend answer before changing anything.';
  else if (has('Steps', false)) takeaway = 'Find ' + fmtInt(ctx.stepGoal - cur.steps) + ' more steps a day. A walk after dinner is most of it.';
  else if (has('Water', false)) takeaway = 'Water on the table at every meal. It is the easiest of these to fix.';
  else if (positives.length) takeaway = 'Keep doing exactly this. The only thing to add is more of the same.';
  else takeaway = 'Log a little of everything next week — a meal, a weigh-in, a session — and this review gets something to say.';

  return {
    from: cur.keys[0], to: cur.keys[cur.keys.length - 1],
    verdict, positives, attention, takeaway, items, active: cur.active
  };
}

/* ================= GOAL TRAJECTORY =================
   Where the trend is heading at the current pace. Nothing here projects
   from fewer than a fortnight of weigh-ins, and nothing prints a date more
   than two years out: a projection is only as honest as the slope under it,
   and a slope over a handful of readings is noise dressed as a plan.
   Returns null when there is no goal, or { dir, planned, rate, model, tw,
   goalLb, start, progress, weeks, eta, status, reason, enough }. */
export function trajectory(ctx, rateWk, planned, tw) {
  const { dir, targets, days } = ctx;
  if (dir == null) return null;
  const goalLb = targets && targets.goalLb > 0 ? targets.goalLb : null;
  const weighDays = Object.keys(ctx.wmap).length;
  const span = days && days.length >= 2 ? (parseKey(days[days.length - 1].d) - parseKey(days[0].d)) / DAY : 0;
  const enough = rateWk != null && tw != null && weighDays >= 6 && span >= 13;

  const out = { dir, planned, rate: rateWk, model: !!(ctx.rate && ctx.rate.model), tw, goalLb, enough,
                start: null, progress: null, weeks: null, eta: null, status: null, reason: '' };

  if (goalLb && days && days.length) {
    // The earliest daily mean on record is the start line. It is the only
    // number the account has for "where I began", and it is labelled as such.
    out.start = days[0].lb;
    out.startDate = days[0].d;
    if (tw != null && Math.abs(out.start - goalLb) > 0.5) {
      out.progress = Math.max(0, Math.min(1, (out.start - tw) / (out.start - goalLb)));
    }
  }

  if (!enough) {
    out.reason = weighDays < 6 || span < 13
      ? 'Needs about two weeks of weigh-ins before a pace means anything.'
      : 'Not enough to fit a trend yet.';
    return out;
  }

  const right = dir === 0 ? Math.abs(rateWk) <= 0.3 : Math.sign(rateWk) === dir;
  if (dir === 0) {
    out.status = right ? 'on' : 'drift';
    out.reason = right ? 'Holding within a third of a pound a week.'
                       : 'Drifting ' + r1(Math.abs(rateWk)) + ' lb a week ' + (rateWk > 0 ? 'up' : 'down') + '.';
  } else if (!right || Math.abs(rateWk) < 0.1) {
    out.status = Math.abs(rateWk) < 0.1 ? 'flat' : 'wrong';
    out.reason = out.status === 'flat' ? 'The trend is flat at the moment.' : 'The trend is moving the wrong way for a ' + (dir < 0 ? 'cut' : 'bulk') + '.';
  } else {
    if (planned && Math.sign(planned) === dir) {
      const ratio = Math.abs(rateWk) / Math.abs(planned);
      out.status = ratio >= 1.25 ? 'ahead' : ratio <= 0.6 ? 'behind' : 'on';
      out.reason = (out.status === 'on' ? 'On pace: ' : out.status === 'ahead' ? 'Ahead of plan: ' : 'Behind plan: ') +
        r1(Math.abs(rateWk)) + ' lb a week against ' + r1(Math.abs(planned)) + ' planned.';
    } else {
      out.status = 'on';
      out.reason = r1(Math.abs(rateWk)) + ' lb a week, the right way.';
    }
    if (goalLb && tw != null) {
      const left = (tw - goalLb) * (dir < 0 ? 1 : -1);
      if (left > 0.5) {
        const weeks = left / Math.abs(rateWk);
        out.weeks = weeks;
        out.eta = weeks <= 104 ? new Date(Date.now() + weeks * 7 * DAY) : null;
      } else {
        out.weeks = 0;
      }
    }
  }
  return out;
}

export function fmtRange(from, to) {
  return fmtDate(from) + ' – ' + fmtDate(to);
}
