// Food memory — everything already logged or already asked Claude about.
//
//   users/{uid}/food/recall/{key} -> { q, kind, items, n, last }
//
// The point is money. Describing a meal in words is the easiest way into the
// log, so it is the way that gets used, so it is the way that spends. Most of
// those sentences are the same sentence: the same breakfast, the same order at
// the same three places. Answering the second one out of here costs nothing.
//
// `key` is the normalised question, slugged — and that IS the deduplication.
// Asking "2 eggs and toast" again lands on the same key, bumps `n`, and adds
// no second row. Numbers survive normalisation deliberately: "2 eggs" and
// "4 eggs" are different foods and must never collapse into one entry.
//
// No pictures are ever stored. A photo estimate contributes only the sentence
// typed next to it, if there was one.

import { read, watch, mergeUpdate, LS } from './store.js';

const MAX_ROWS   = 400;   // beyond this the least-used, oldest rows go
const MIN_SCORE  = 0.74;  // how close a near-miss has to be to count as a hit

let recall = {};
let dirty  = null;

/* ---------- normalising ----------
   Filler words carry no macros. Number words do, so they become digits rather
   than being dropped — "two eggs" and "2 eggs" are the same breakfast. */
const FILLER = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'some', 'my', 'plus', 'w', 'i', 'had',
  'ate', 'eating', 'just', 'about', 'like', 'from', 'for'
]);

const NUMWORD = {
  half: '0.5', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
  dozen: '12', fifteen: '15', sixteen: '16', twenty: '20'
};

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.\s]+/g, ' ')
    .split(/\s+/)
    .map(w => NUMWORD[w] || w)
    .filter(w => w && !FILLER.has(w))
    .join(' ')
    .trim();
}

// Firebase keys can't hold . # $ [ ] or /, so the slug is the normalised
// sentence with everything else knocked out.
export function keyOf(text) {
  const n = normalize(text);
  if (!n) return '';
  return n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150);
}

function tokens(text) {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

function numbersIn(list) {
  return list.filter(t => /^[0-9]/.test(t)).sort().join(',');
}

// Dice coefficient over the word sets. Cheap, order-blind, and good enough for
// "chicken burrito bowl" vs "burrito bowl with chicken".
function score(a, b) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let hit = 0;
  sa.forEach(t => { if (sb.has(t)) hit++; });
  return (2 * hit) / (sa.size + sb.size);
}

/* ---------- load ---------- */
export async function initRecall() {
  recall = (await read('food/recall', null)) || {};
  watch('food/recall', val => { recall = val || {}; });
}

export function recallCount() { return Object.keys(recall).length; }

export function recallList() {
  return Object.entries(recall)
    .filter(([, r]) => r && r.q)
    .map(([key, r]) => ({ key, ...r }))
    .sort((a, b) => (b.last || 0) - (a.last || 0));
}

/* ---------- lookup ----------
   Exact key first, then the closest sentence above the bar. A near-miss whose
   numbers disagree is rejected outright, however similar the words: matching
   "3 slices of pizza" to a stored "2 slices of pizza" would hand back macros
   that are confidently a third short. */
export function lookup(text) {
  const key = keyOf(text);
  if (!key) return null;

  const exact = recall[key];
  if (exact && exact.items && exact.items.length) return { key, ...exact, score: 1, exact: true };

  const mine = tokens(text);
  const myNums = numbersIn(mine);
  if (mine.length < 2) return null;

  let best = null;
  for (const [k, r] of Object.entries(recall)) {
    if (!r || !r.q || !r.items || !r.items.length) continue;
    const theirs = tokens(r.q);
    if (numbersIn(theirs) !== myNums) continue;
    const s = score(mine, theirs);
    if (s >= MIN_SCORE && (!best || s > best.score)) best = { key: k, ...r, score: s, exact: false };
  }
  return best;
}

/* ---------- writing ----------
   Debounced, and always a merge — logging six foods in one go is one PATCH,
   not six, and a row that already exists is bumped rather than duplicated. */
function flush() {
  clearTimeout(dirty);
  dirty = setTimeout(() => {
    const patch = prune();
    LS.set('mirror:food/recall', recall);   // keeps the answer alive offline
    if (Object.keys(patch).length) mergeUpdate('food/recall', patch);
  }, 900);
}

let pending = {};

function stage(key, rec) {
  recall[key] = rec;
  pending[key] = rec;
  flush();
}

// Oldest and least-used first. Returns the patch to send, deletions included
// as nulls, then clears the staging area.
function prune() {
  const keys = Object.keys(recall);
  if (keys.length > MAX_ROWS) {
    const doomed = keys
      .map(k => ({ k, n: recall[k].n || 1, last: recall[k].last || 0 }))
      .sort((a, b) => a.n - b.n || a.last - b.last)
      .slice(0, keys.length - MAX_ROWS);
    doomed.forEach(({ k }) => { delete recall[k]; pending[k] = null; });
  }
  const out = pending;
  pending = {};
  return out;
}

function cleanItems(items) {
  return (items || [])
    .filter(x => x && x.name)
    .slice(0, 12)
    .map(x => {
      const o = {
        name: String(x.name).slice(0, 80),
        qty: x.qty ? String(x.qty).slice(0, 40) : '',
        cal: Math.round(x.cal || 0),
        p: +(x.p || 0), c: +(x.c || 0), f: +(x.f || 0)
      };
      if (x.micro && Object.keys(x.micro).length) o.micro = x.micro;
      return o;
    });
}

/* One question and the answer it got. `kind` is 'ai' for anything that came
   back from the estimator, 'log' for a food that went in some other way. */
export function remember(question, items, kind) {
  const key = keyOf(question);
  if (!key) return;
  const list = cleanItems(items);
  if (!list.length) return;

  const prev = recall[key];
  stage(key, {
    q: String(question).slice(0, 200).trim(),
    kind: kind || (prev && prev.kind) || 'log',
    items: list,
    n: (prev && prev.n || 0) + 1,
    last: Date.now()
  });
}

// A single food that just went into the log. Keyed on its own name, so the
// next time it is typed or described it comes back without a round trip.
export function rememberEntry(entry) {
  if (!entry || !entry.name) return;
  remember(entry.name, [entry], entry.src && /^ai-/.test(entry.src) ? 'ai' : 'log');
}

export function forget(key) {
  if (!recall[key]) return;
  delete recall[key];
  pending[key] = null;
  flush();
}

export function forgetAll() {
  Object.keys(recall).forEach(k => { pending[k] = null; });
  recall = {};
  flush();
}
