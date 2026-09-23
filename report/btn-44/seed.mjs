// Builds a realistic account for report/btn-44/measure.mjs: eight weeks
// of push/pull/legs, a food log, weigh-ins, water, steps, two routines (one
// with a lifting block), Coach settings, and an access tree with people in it
// so the owner's admin panel has rows.
import { writeFileSync } from 'node:fs';
const UID = 'aXSDfnZK8IMT9wRVhBbEgkDHpsj2';
const now = Date.now();
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const key = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const S = (w, r, type = 'N') => ({ w: String(w), r: String(r), type, done: true });
const E = (exId, name, group, equipment, sets, extra) => ({ exId, name, group, equipment, sets, ...(extra || {}) });
const PUSH = k => [E('barbell-bench-press', 'Barbell Bench Press', 'chest', 'barbell', [S(95, 8, 'W'), S(185 + k, 5), S(185 + k, 5), S(185 + k, 5)]),
                   E('overhead-press', 'Overhead Press', 'shoulders', 'barbell', [S(95 + k, 8), S(95 + k, 8)]),
                   E('barbell-curl', 'Barbell Curl', 'arms', 'barbell', [S(65, 10), S(65, 10)])];
const PULL = k => [E('conventional-deadlift', 'Conventional Deadlift', 'back', 'barbell', [S(135, 5, 'W'), S(275 + k, 5), S(275 + k, 5)]),
                   E('ez-bar-curl', 'EZ-Bar Curl', 'arms', 'barbell', [S(55, 12), S(55, 12)])];
const LEGS = k => [E('back-squat-high-bar', 'Back Squat (High Bar)', 'legs', 'barbell', [S(135, 5, 'W'), S(225 + k, 5), S(225 + k, 5), S(225 + k, 5)]),
                   E('plank', 'Plank', 'core', 'bodyweight', [S(0, 60), S(0, 60)])];
const workouts = {}, history = {};
let n = 0;
for (let d = 56; d >= 1; d--) {
  const dow = new Date(now - d * DAY).getDay();
  const kind = dow === 1 ? 'Push' : dow === 3 ? 'Pull' : dow === 5 ? 'Legs' : null;
  if (!kind) continue;
  const k = Math.floor((56 - d) / 7) * 5;
  const exercises = (kind === 'Push' ? PUSH : kind === 'Pull' ? PULL : LEGS)(k);
  const t0 = new Date(key(now - d * DAY) + 'T18:00:00').getTime();
  const id = 'w' + (t0).toString(36);
  const dk = key(t0), mk = dk.slice(0, 7), dd = dk.slice(8);
  const vol = exercises.reduce((a, e) => a + e.sets.filter(s => s.type !== 'W').reduce((b, s) => b + (+s.w) * (+s.r), 0), 0);
  const rec = { id, name: kind + ' day', startedAt: t0, endedAt: t0 + 3600e3, durationSec: 3600, volume: vol,
                groups: [...new Set(exercises.map(e => e.group))], exercises };
  ((workouts[mk] = workouts[mk] || {})[dd] = {})[id] = rec;
  exercises.forEach(e => { (history[e.exId] = history[e.exId] || []).unshift({ date: dk, sets: e.sets.filter(s => s.type !== 'W').map(({ w, r, type }) => ({ w, r, type })) }); });
  n++;
}
const today = key(now);
const food = { log: {}, daySummaries: {} };
for (let d = 0; d < 21; d++) {
  const dk = key(now - d * DAY);
  const t = new Date(dk + 'T08:00:00').getTime();
  const entries = {
    ['fa' + d]: { id: 'fa' + d, t, name: 'Oats with whey', qty: '1 bowl', cal: 520, p: 42, c: 60, f: 11, meal: 'breakfast', src: 'manual' },
    ['fb' + d]: { id: 'fb' + d, t: t + 5 * 3600e3, name: 'Chicken and rice', qty: '1 bowl', cal: 650, p: 52, c: 78, f: 12, meal: 'lunch', src: 'manual' },
    ['fc' + d]: { id: 'fc' + d, t: t + 11 * 3600e3, name: 'Salmon, potatoes and greens', qty: '1 plate', cal: 780, p: 48, c: 70, f: 30, meal: 'dinner', src: 'manual' }
  };
  food.log[dk] = entries;
  food.daySummaries[dk] = { cal: 1950, p: 142, c: 208, f: 53 };
}
food.targets = { cal: 2300, p: 200, f: 70, maint: 2700, goalLb: 182, auto: { on: true, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: now - 3 * DAY } };
food.items = { u1: { id: 'u1', name: 'Body Fortress whey (vanilla)', brand: 'Body Fortress', base: 'serv', serv: { label: 'scoop', grams: 44 }, n: { cal: 180, p: 30, c: 7, f: 3 }, uses: 12, last: now - DAY, barcode: '0074312222221' } };
food.meals = { m1: { name: 'Usual breakfast', items: [{ name: 'Oats with whey', qty: '1 bowl', cal: 520, p: 42, c: 60, f: 11, meal: 'breakfast', src: 'manual' }], last: now - DAY } };
const weight = { entries: {} };
for (let d = 40; d >= 0; d--) {
  const t = new Date(key(now - d * DAY) + 'T07:10:00').getTime();
  weight.entries['wt' + d] = { lb: Math.round((196 - (40 - d) * 0.12 + (d % 3) * 0.3) * 10) / 10, t };
}
const water = { log: { [today]: { wa1: { ml: 500, t: now - 3 * 3600e3, src: 'tap' }, wa2: { ml: 350, t: now - 3600e3, src: 'tap' } } } };
const steps = {};
for (let d = 0; d < 14; d++) steps[key(now - d * DAY)] = { steps: 6000 + d * 310, mi: 2.9, t: now - d * DAY, src: 'manual' };
const routines = {
  r1: { id: 'r1', name: 'Push day', exercises: [
    { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', sets: [{ tw: '185', tr: '5', type: 'N' }, { tw: '185', tr: '5', type: 'N' }] },
    { exId: 'overhead-press', name: 'Overhead Press', group: 'shoulders', equipment: 'barbell', block: 1, sets: [{ tw: '95', tr: '8', type: 'N' }] },
    { exId: 'barbell-curl', name: 'Barbell Curl', group: 'arms', equipment: 'barbell', block: 1, sets: [{ tw: '65', tr: '10', type: 'N' }] } ] },
  r2: { id: 'r2', name: 'Legs', exercises: [{ exId: 'back-squat-high-bar', name: 'Back Squat (High Bar)', group: 'legs', equipment: 'barbell', sets: [{ tw: '225', tr: '5', type: 'N' }] }] }
};
const user = {
  profile: { name: 'Micah', email: 'm@example.test', sex: 'm', heightIn: 70, birthYear: 1990, createdAt: now - 400 * DAY },
  onboarding: { done: true, tourDone: true, at: now - 400 * DAY, version: 3 },
  food, weight, workouts, history, water, steps, routines,
  exercises: { custom: [], overrides: {}, hidden: [] },
  settings: { coach: { v: 1, on: { patterns: true } }, water: { goalMl: 3000, unit: 'floz' }, steps: { goal: 8000 }, units: { weight: 'lb', height: 'in' } }
};
const seed = {
  users: { [UID]: user },
  access: {
    approved: { [UID]: { at: now - 400 * DAY, via: 'owner', name: 'Micah', email: 'm@example.test' },
                p2: { at: now - 30 * DAY, via: 'invite', code: 'ABCDEFGHJK', name: 'Sam Alexander-Whitfield', email: 'sam.alexander@example.test', type: 'pro' },
                p3: { at: now - 10 * DAY, via: 'invite', code: 'BCDEFGHJKM', name: 'Jo', email: 'jo@example.test', type: 'trial', trialEndsAt: now + 4 * DAY } },
    invites: { ABCDEFGHJK: { at: now - 31 * DAY, usedBy: 'p2', usedAt: now - 30 * DAY }, CDEFGHJKMN: { at: now - DAY, note: 'for Pat' } },
    requests: { p4: { at: now - 3600e3, name: 'Pat Requester', email: 'pat@example.test', note: 'friend of Sam' } }
  },
  aiAllow: { [UID]: { on: true }, p2: { on: true, photoPerDay: 10, textPerDay: 20, monthlyUsd: 5, blocked: false }, p3: { on: true } },
  usage: { [UID]: { who: { firstSeen: now - 400 * DAY, lastSeen: now, platform: 'ios', standalone: true, version: 'rack-v46' }, days: { [today]: { appOpen: 3, tabYou: 2 } } },
           p2: { who: { firstSeen: now - 30 * DAY, lastSeen: now - DAY, platform: 'android', standalone: false, version: 'rack-v45' }, days: {} } }
};
// A live session: two exercises in a block, one outside, sets part-ticked.
const live = { id: 'wlive', name: 'Push day', startedAt: now - 25 * 60e3, exercises: [
  { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', sets: [{ w: '95', r: '8', type: 'W', done: true }, { w: '185', r: '5', type: 'N', done: true }, { w: '', r: '', tw: '185', tr: '5', type: 'N', done: false }] },
  { exId: 'overhead-press', name: 'Overhead Press', group: 'shoulders', equipment: 'barbell', block: 1, sets: [{ w: '95', r: '8', type: 'N', done: true }, { w: '', r: '', type: 'N', done: false }] },
  { exId: 'barbell-curl', name: 'Barbell Curl', group: 'arms', equipment: 'barbell', block: 1, sets: [{ w: '', r: '', type: 'N', done: false }] } ] };
writeFileSync(new URL('./seed.json', import.meta.url), JSON.stringify({ UID, seed, live }));
console.log('sessions', n, 'today', today);
