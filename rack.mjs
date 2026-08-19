#!/usr/bin/env node
// rack — command line access to the Rack database.
//
// Reads are public and need nothing. Writes need the agent account:
//
//   export RACK_AGENT_EMAIL='…'
//   export RACK_AGENT_PASSWORD='…'
//
// Usage:
//   node tools/rack.mjs today
//   node tools/rack.mjs get food/log/2026-08-19
//   node tools/rack.mjs food list [date]
//   node tools/rack.mjs food add '{"name":"Chicken and rice","qty":"1 bowl","cal":650,"p":52,"c":78,"f":12,"meal":"lunch"}' [--date=YYYY-MM-DD]
//   node tools/rack.mjs food rm 2026-08-19 f1a2b3c
//   node tools/rack.mjs weigh 214.6 [--at=2026-08-19T07:10]
//   node tools/rack.mjs workouts [YYYY-MM]
//   node tools/rack.mjs patch <path> '<json>'      merge into a node
//   node tools/rack.mjs set   <path> '<json>'      replace a node
//   node tools/rack.mjs del   <path>
//
// Paths are relative to users/{OWNER_UID}. See AGENTS.md for the schema.

import { firebaseConfig, OWNER_UID } from '../firebase-config.js';

const DB = firebaseConfig.databaseURL.replace(/\/$/, '');
const ROOT = `users/${OWNER_UID}`;
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

let token = null;

/* ---------- plumbing ---------- */

async function auth() {
  if (token) return token;
  const email = process.env.RACK_AGENT_EMAIL;
  const password = process.env.RACK_AGENT_PASSWORD;
  if (!email || !password) die('Writes need RACK_AGENT_EMAIL and RACK_AGENT_PASSWORD in the environment.');
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const j = await r.json();
  if (!j.idToken) die('Sign-in failed: ' + (j.error?.message || r.status));
  token = j.idToken;
  return token;
}

async function req(method, path, body) {
  const needsAuth = method !== 'GET';
  const q = needsAuth ? '?auth=' + (await auth()) : '';
  const r = await fetch(`${DB}/${ROOT}/${path}.json${q}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const txt = await r.text();
  if (!r.ok) die(`${method} ${path} → ${r.status} ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

const get   = p => req('GET', p);
const patch = (p, v) => req('PATCH', p, v);
const put   = (p, v) => req('PUT', p, v);
const del   = p => req('DELETE', p);

function die(msg) { console.error(msg); process.exit(1); }
function out(v) { console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2)); }
function r1(x) { return Math.round(x * 10) / 10; }

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
function flag(args, name) {
  const hit = args.find(a => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
}
function defaultMeal() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

/* ---------- food ---------- */

function normalize(x) {
  if (!x || !x.name) die('Every food needs a name.');
  const e = {
    name: String(x.name).slice(0, 80),
    qty: x.qty ? String(x.qty).slice(0, 40) : '',
    cal: Math.round(Number(x.cal) || 0),
    p: r1(Number(x.p) || 0),
    c: r1(Number(x.c) || 0),
    f: r1(Number(x.f) || 0),
    meal: MEALS.includes(x.meal) ? x.meal : defaultMeal(),
    src: 'agent'
  };
  if (x.micro && typeof x.micro === 'object') e.micro = x.micro;
  return e;
}

// food/daySummaries powers the maintenance estimate. Recompute it whenever the
// day's log changes so the number stays true even if the app never opens.
async function refreshSummary(date) {
  const log = (await get('food/log/' + date)) || {};
  const t = Object.values(log).reduce((s, e) => ({
    cal: s.cal + (e.cal || 0), p: s.p + (e.p || 0), c: s.c + (e.c || 0), f: s.f + (e.f || 0)
  }), { cal: 0, p: 0, c: 0, f: 0 });
  await put('food/daySummaries/' + date, {
    cal: t.cal, p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f)
  });
  return t;
}

async function foodAdd(json, date) {
  let data;
  try { data = JSON.parse(json); } catch { die('That is not valid JSON.'); }
  const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [data];
  const add = {};
  const now = Date.now();
  list.map(normalize).forEach((e, i) => {
    const id = newId('f');
    add[id] = { id, t: now + i, ...e };
  });
  await patch('food/log/' + date, add);
  const t = await refreshSummary(date);
  out({ logged: Object.values(add), date, dayTotals: t });
}

async function foodList(date) {
  const log = (await get('food/log/' + date)) || {};
  const rows = Object.values(log).sort((a, b) => (a.t || 0) - (b.t || 0));
  const t = rows.reduce((s, e) => ({
    cal: s.cal + (e.cal || 0), p: s.p + (e.p || 0), c: s.c + (e.c || 0), f: s.f + (e.f || 0)
  }), { cal: 0, p: 0, c: 0, f: 0 });
  out({ date, totals: { ...t, p: r1(t.p), c: r1(t.c), f: r1(t.f) }, items: rows });
}

/* ---------- today ---------- */

async function today() {
  const date = dayKey();
  const [log, targets, weights] = await Promise.all([
    get('food/log/' + date), get('food/targets'), get('weight/entries')
  ]);
  const rows = Object.values(log || {});
  const t = rows.reduce((s, e) => ({
    cal: s.cal + (e.cal || 0), p: s.p + (e.p || 0), c: s.c + (e.c || 0), f: s.f + (e.f || 0)
  }), { cal: 0, p: 0, c: 0, f: 0 });
  const wl = Object.values(weights || {}).sort((a, b) => a.t - b.t);
  const last = wl[wl.length - 1] || null;
  out({
    date,
    fuel: {
      logged: rows.length,
      totals: { cal: t.cal, p: r1(t.p), c: r1(t.c), f: r1(t.f) },
      targets: targets || null,
      items: rows.sort((a, b) => (a.t || 0) - (b.t || 0)).map(e => ({ id: e.id, name: e.name, qty: e.qty, cal: e.cal, meal: e.meal }))
    },
    weight: last ? { lb: last.lb, at: new Date(last.t).toISOString() } : null
  });
}

/* ---------- main ---------- */

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'today': await today(); break;

  case 'get': {
    if (!args[0]) die('Which path?');
    out(await get(args[0]));
    break;
  }

  case 'food': {
    const sub = args[0];
    if (sub === 'add') {
      await foodAdd(args[1], flag(args, 'date') || dayKey());
    } else if (sub === 'rm') {
      const [, date, id] = args;
      if (!date || !id) die('Usage: food rm <YYYY-MM-DD> <entryId>');
      await del(`food/log/${date}/${id}`);
      out({ removed: id, dayTotals: await refreshSummary(date) });
    } else if (sub === 'list' || sub === undefined) {
      await foodList(args[1] || dayKey());
    } else die('food: add | rm | list');
    break;
  }

  case 'weigh': {
    const lb = parseFloat(args[0]);
    if (!(lb > 60 && lb < 600)) die('Weight in pounds, please.');
    const at = flag(args, 'at');
    const t = at ? new Date(at).getTime() : Date.now();
    if (!t) die('Could not read that --at timestamp.');
    const id = newId('wt');
    await patch('weight/entries', { [id]: { lb: r1(lb), t } });
    out({ id, lb: r1(lb), at: new Date(t).toISOString() });
    break;
  }

  case 'workouts': {
    const mk = args[0] || dayKey().slice(0, 7);
    out(await get('workouts/' + mk));
    break;
  }

  case 'patch': out(await patch(args[0], JSON.parse(args[1]))); break;
  case 'set':   out(await put(args[0], JSON.parse(args[1]))); break;
  case 'del':   await del(args[0]); out({ deleted: args[0] }); break;

  default:
    console.log(`rack — Rack database from the command line

  today                          what has been logged today
  get <path>                     read any node
  food list [date]               the day's food log
  food add '<json>' [--date=]    log one food, an array, or {"items":[…]}
  food rm <date> <entryId>       remove one logged food
  weigh <lb> [--at=ISO]          log a weigh-in
  workouts [YYYY-MM]             a month of training
  patch|set <path> '<json>'      merge into / replace a node
  del <path>                     remove a node

Paths hang off users/${OWNER_UID}. Schema: AGENTS.md.
Writes need RACK_AGENT_EMAIL and RACK_AGENT_PASSWORD.`);
}
