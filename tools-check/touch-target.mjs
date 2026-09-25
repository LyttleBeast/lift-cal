#!/usr/bin/env node
//
// Verifier for the 44px touch target on every .btn.
//
//   node tools-check/touch-target.mjs
//
// THE CHANGE (v47). `.btn` renders its height from padding, border and the
// font's `line-height: normal` — the UA stylesheet's `font` shorthand resets
// line-height on a <button>, so the body's 1.45 never reaches it. On Archivo
// that made a primary .btn 39px, a ghost or danger one 41px (v43 measured
// Routines / Exercises / Statistics at 41), and the compact variants as little
// as 26px. v47 adds `min-height: 44px` to `.btn`. With `box-sizing:
// border-box` on everything, that is exactly 44px of box whatever the padding,
// the border, the type size or the metrics of whichever font loaded, and it can
// only ever ADD height: nothing about a width is touched.
//
// WHAT THIS FILE DOES. There is no layout engine in node, so it carries a small
// one for the part that matters: a CSS cascade over the REAL rack.css and
// auth.css (selectors, specificity, source order, !important, the two width
// @media blocks), run for a representative button from every screen — each
// built with the ancestor chain it really has in the DOM and tied to the line
// of source that makes it — at 390 and 320 pixels wide. For each it resolves
// the used border-box height and every property a WIDTH depends on, and:
//
//   A. asserts every one is at least 44px, and why: the minimum reaches it and
//      nothing caps it;
//   B. asserts the model reproduces, with the minimum taken out again, the
//      heights Chrome measured on the real app in v47's run at v46's CSS — so
//      the model is shown to be right before anything is concluded from it;
//   C. asserts nothing a width depends on differs from the v46 snapshot below;
//   D. sweeps every rule in both stylesheets: no rule that can reach a .btn
//      sets height, max-height or min-height, except the one this ship added;
//   E. checks the one layout the minimum reached beyond a button — the parked
//      workout bar, whose Resume grew and whose reserved space had to follow;
//   F. (v55) measures every answer's label on the Your goal screen, in
//      Archivo's own advance widths, against the chip the same cascade gives
//      it at 320 and 390 wide: each fits on one line, so nothing wraps or clips.
//
// Two things are restated because node cannot read them off a screen, and
// both are labelled where they are used: Archivo's vertical metrics (read from
// the font file Google Fonts serves, 23 Sep 2026: unitsPerEm 1000, hhea and
// typo ascender 878, descender -210, line gap 0), and the v46 heights Chrome
// measured (report/btn-44.md has the run: 566 buttons, 41 distinct sites,
// two widths, before and after — no width, position, wrap, clip or overflow
// changed anywhere).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);
const read = p => readFileSync(SRC(p), 'utf8');
const SHEETS = ['rack.css', 'auth.css'];            // index.html's order

let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }

/* ================= the cascade ================= */

// Rules, in source order, each with its selector list, its declarations and
// the @media condition it sits under (null for none). @keyframes, @font-face
// and @import are skipped; nothing in them sizes a box.
function parseCSS(text, file) {
  // Comments out, and @import lines (no block, so they would glue themselves
  // to the head of the next rule).
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const rules = [];
  const block = (from) => {           // index of the matching close brace
    let depth = 0;
    for (let j = from; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) return j; }
    }
    return src.length;
  };
  const walk = (start, end, media) => {
    let k = start;
    while (k < end) {
      const open = src.indexOf('{', k);
      if (open === -1 || open >= end) break;
      const head = src.slice(k, open).trim().replace(/^;+/, '').trim();
      const close = block(open);
      if (head.startsWith('@media')) walk(open + 1, close, head.slice(6).trim());
      else if (head.startsWith('@supports')) walk(open + 1, close, media);
      else if (head.startsWith('@')) { /* keyframes, font-face: nothing sizes a box */ }
      else if (head) {
        const decls = {};
        src.slice(open + 1, close).split(';').forEach(d => {
          const c = d.indexOf(':'); if (c < 0) return;
          const prop = d.slice(0, c).trim().toLowerCase();
          let val = d.slice(c + 1).trim();
          const imp = /!important$/.test(val);
          if (imp) val = val.replace(/\s*!important$/, '');
          if (prop) decls[prop] = { val, imp };
        });
        rules.push({ file, media, selectors: head.split(',').map(s => s.trim()).filter(Boolean), decls, order: rules.length });
      }
      k = close + 1;
    }
  };
  walk(0, src.length, null);
  return rules;
}

function mediaOK(cond, width) {
  if (!cond) return true;
  const mx = /max-width:\s*(\d+)px/.exec(cond), mn = /min-width:\s*(\d+)px/.exec(cond);
  if (mx || mn) return (!mx || width <= +mx[1]) && (!mn || width >= +mn[1]);
  // prefers-reduced-motion and the like: nothing under them sizes a box, and
  // they are asserted not to in section D.
  return false;
}

// Selectors: compounds of tag, #id, .class, [attr], :pseudo, joined by
// descendant or child combinators. A state pseudo-class (:active, :disabled,
// :focus…) never matches — a button at rest is what is being sized — and a
// pseudo-element rule is not about the box at all.
function parseSelector(sel) {
  const parts = sel.replace(/\s*>\s*/g, ' > ').split(/\s+/).filter(Boolean);
  const out = []; let comb = ' ';
  for (const p of parts) {
    if (p === '>') { comb = '>'; continue; }
    const c = { tag: null, id: null, classes: [], attrs: [], pseudo: [], el: false, comb };
    const re = /([#.]?[a-zA-Z_*-][\w-]*)|(\[[^\]]*\])|(::?[\w-]+(\([^)]*\))?)/g;
    let m;
    while ((m = re.exec(p))) {
      const t = m[0];
      if (t.startsWith('::')) c.el = true;
      else if (t.startsWith(':')) c.pseudo.push(t);
      else if (t.startsWith('[')) c.attrs.push(t);
      else if (t.startsWith('#')) c.id = t.slice(1);
      else if (t.startsWith('.')) c.classes.push(t.slice(1));
      else c.tag = t.toLowerCase();
    }
    out.push(c); comb = ' ';
  }
  return out;
}
const specificity = cs => cs.reduce((a, c) => [a[0] + (c.id ? 1 : 0),
  a[1] + c.classes.length + c.attrs.length + c.pseudo.filter(p => !/^:not\(/.test(p)).length + c.pseudo.filter(p => /^:not\(/.test(p)).length,
  a[2] + (c.tag && c.tag !== '*' ? 1 : 0)], [0, 0, 0]);
function compoundMatches(c, n) {
  if (!n || c.el) return false;
  if (c.tag && c.tag !== '*' && c.tag !== n.tag) return false;
  if (c.id && c.id !== n.id) return false;
  if (!c.classes.every(k => n.cls.includes(k))) return false;
  for (const a of c.attrs) {
    const m = /^\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(a);
    if (!m) return false;
    const v = (n.attrs || {})[m[1]];
    if (v === undefined || (m[2] !== undefined && v !== m[2])) return false;
  }
  for (const p of c.pseudo) {
    const not = /^:not\((.*)\)$/.exec(p);
    if (not) { if (compoundMatches(parseSelector(not[1])[0], n)) return false; continue; }
    if (p === ':root') { if (n.tag !== 'html') return false; continue; }
    return false;
  }
  return true;
}
function matches(cs, n) {
  if (!compoundMatches(cs[cs.length - 1], n)) return false;
  let cur = n;
  for (let i = cs.length - 2; i >= 0; i--) {
    const via = cs[i + 1].comb;
    if (via === '>') { cur = cur.parent; if (!compoundMatches(cs[i], cur)) return false; }
    else { cur = cur.parent; while (cur && !compoundMatches(cs[i], cur)) cur = cur.parent; if (!cur) return false; }
  }
  return true;
}

// Shorthands the height and width questions touch, expanded into longhands.
function expand(prop, val) {
  /* v55: split on the spaces outside parentheses, so `.sheet`'s
     `padding: 10px var(--pad) calc(24px + env(…))` is three values, not five —
     section F reads the sheet's side padding. No button's padding has a
     parenthesis in it, so nothing in A–E reads differently (C holds). */
  const words = v => { const out = []; let depth = 0, cur = '';
    for (const ch of v.trim()) { if (ch === '(') depth++; else if (ch === ')') depth--;
      if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch; }
    if (cur) out.push(cur); return out; };
  const box = v => { const p = words(v); return [p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]]; };
  if (prop === 'padding' || prop === 'margin') {
    const [t, r, b, l] = box(val);
    return { [prop + '-top']: t, [prop + '-right']: r, [prop + '-bottom']: b, [prop + '-left']: l };
  }
  if (prop === 'border' || /^border-(top|right|bottom|left)$/.test(prop)) {
    const w = val === 'none' || val === '0' ? '0px' : ((val.match(/(\d*\.?\d+)px/) || [])[0] || (/(^|\s)(none|0)(\s|$)/.test(val) ? '0px' : 'medium'));
    const sides = prop === 'border' ? ['top', 'right', 'bottom', 'left'] : [prop.slice(7)];
    return Object.fromEntries(sides.map(s => ['border-' + s + '-width', w]));
  }
  if (prop === 'border-width') { const [t, r, b, l] = box(val); return { 'border-top-width': t, 'border-right-width': r, 'border-bottom-width': b, 'border-left-width': l }; }
  if (prop === 'flex') {
    const p = val.split(/\s+/);
    if (val === 'none') return { 'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto' };
    if (p.length === 1 && /^\d*\.?\d+$/.test(p[0])) return { 'flex-grow': p[0], 'flex-shrink': '1', 'flex-basis': '0%' };
    return { 'flex-grow': p[0], 'flex-shrink': p[1] ?? '1', 'flex-basis': p[2] ?? '0%' };
  }
  if (prop === 'font') return { font: val };
  return { [prop]: val };
}

let ROOT = null;          // :root's custom properties, for var()
function cascade(rules, n, width) {
  const won = {};
  for (const r of rules) {
    if (!mediaOK(r.media, width)) continue;
    for (const s of r.selectors) {
      const cs = parseSelector(s);
      if (!matches(cs, n)) continue;
      const sp = specificity(cs);
      for (const [p, d] of Object.entries(r.decls)) {
        for (const [lp, lv] of Object.entries(expand(p, d.val))) {
          const cand = { v: lv, imp: d.imp, sp, order: r.order + (r.file === 'auth.css' ? 1e6 : 0), where: r.file + ' ' + s };
          const cur = won[lp];
          const beats = !cur || (cand.imp !== cur.imp ? cand.imp :
            (cand.sp[0] - cur.sp[0] || cand.sp[1] - cur.sp[1] || cand.sp[2] - cur.sp[2] || cand.order - cur.order) >= 0);
          if (beats) won[lp] = cand;
        }
      }
    }
  }
  // var(--x) and var(--x, fallback), from :root — every custom property this
  // stylesheet sizes a box with is declared there.
  for (const d of Object.values(won)) {
    d.v = d.v.replace(/var\((--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (all, name, fb) =>
      (ROOT && ROOT[name] ? ROOT[name].v : fb !== undefined ? fb.trim() : all));
  }
  return won;
}
const px = v => { const m = /^(-?\d*\.?\d+)px$/.exec(String(v || '').trim()); return m ? +m[1] : (String(v).trim() === '0' ? 0 : null); };

// Archivo's `line-height: normal` at a size: ascender + descender, each
// rounded to a whole pixel the way Blink lays out a line box. Metrics from the
// font file (header comment). WebKit rounds the sum instead of each part and
// can land half a pixel lower; with the minimum in place that cannot matter.
const ASC = 0.878, DESC = 0.210;
const normalLH = fs => Math.round(ASC * fs) + Math.round(DESC * fs);

// The used border-box height of a <button> with nothing inside it but text.
// A button does not inherit font-size or line-height (the UA `font` shorthand
// resets both), so an author rule is the only way either arrives.
function buttonBox(rules, n, width, { withMin = true, kid = null } = {}) {
  const c = cascade(rules, n, width);
  const val = p => (c[p] ? c[p].v : undefined);
  const fs = px(val('font-size')) ?? 13.333;
  const lhv = val('line-height');
  const text = lhv === undefined || lhv === 'normal' ? normalLH(fs) : (px(lhv) ?? (+lhv * fs));
  // A child taller than the line — Fuel's Foods and Meals carry a 16px icon —
  // sets the content box instead.
  const kidH = kid ? (px((cascade(rules, kid, width).height || {}).v) ?? 0) : 0;
  const lh = Math.max(text, kidH);
  const bt = px(val('border-top-width')) ?? 0, bb = px(val('border-bottom-width')) ?? 0;
  const pt = px(val('padding-top')) ?? 1, pb = px(val('padding-bottom')) ?? 1;
  const sizing = val('box-sizing') || 'content-box';
  const minH = withMin ? (px(val('min-height')) ?? 0) : 0;
  const h = px(val('height')), maxH = px(val('max-height'));
  const natural = bt + bb + pt + pb + lh;
  const toBorder = v => (v == null ? null : sizing === 'border-box' ? v : v + bt + bb + pt + pb);
  let used = h != null ? toBorder(h) : natural;
  if (maxH != null) used = Math.min(used, toBorder(maxH));
  used = Math.max(used, toBorder(minH) ?? 0);
  return { used, natural, minH, sizing, capped: h != null || maxH != null, fs, lh, c };
}

// What a width depends on, read off the resolved style.
const WIDTH_PROPS = ['display', 'width', 'min-width', 'max-width', 'flex-grow', 'flex-shrink', 'flex-basis',
  'padding-left', 'padding-right', 'margin-left', 'margin-right', 'border-left-width', 'border-right-width',
  'font-size', 'letter-spacing', 'font-variation-settings', 'text-transform', 'white-space', 'gap', 'box-sizing'];
const widthOf = (rules, n, width) => { const c = cascade(rules, n, width); return Object.fromEntries(WIDTH_PROPS.map(p => [p, c[p] ? c[p].v : null])); };

/* ================= the buttons ================= */

// An element chain, innermost first: 'button.btn.btn-ghost < div.btn-split <
// div.screen-pad < section#view-workout.view.active'. body and html are added.
function chain(spec, bodyCls = []) {
  const html = { tag: 'html', cls: [], parent: null };
  const body = { tag: 'body', cls: bodyCls, parent: html };
  let parent = body;
  const nodes = spec.split('<').map(s => s.trim()).reverse();
  let n = null;
  for (const s of nodes) {
    const m = /^([a-z0-9]+)?(#[\w-]+)?((?:\.[\w-]+)*)$/.exec(s);
    n = { tag: m[1] || 'div', id: m[2] ? m[2].slice(1) : null, cls: m[3] ? m[3].split('.').filter(Boolean) : [], parent };
    parent = n;
  }
  return n;
}

// Screen, what it is, the source that builds it (file and a pattern that must
// still be there), its chain as the DOM has it, and the height Chrome measured
// at v46's CSS. Then two optional things the height can come from instead of
// the button's own line: `row`, for a button in a flex row that stretches every
// item to the tallest — the chain of that tallest sibling, or a number where a
// non-button (an input) sets the row and Chrome's figure is the row's; and
// `kid`, a child taller than the line.
const V = 'section#view-workout.view.active', F = 'section#view-food.view.active', Wv = 'section#view-weight.view.active',
      Y = 'section#view-you.view.active', St = 'section#view-steps.view.active';
const BUTTONS = [
  ['Train', 'Routines', ['workout.js', /el\('button', 'btn btn-ghost', 'Routines'\)/], `button.btn.btn-ghost < div.btn-split < div.screen-pad < ${V}`, 41],
  ['Train', 'Statistics', ['workout.js', /el\('button', 'btn btn-ghost btn-block', 'Statistics'\)/], `button.btn.btn-ghost.btn-block < div.screen-pad < ${V}`, 41],
  ['Train', 'Start workout', ['workout.js', /el\('button', 'btn btn-primary btn-block btn-lg', 'Start workout'\)/], `button.btn.btn-primary.btn-block.btn-lg < div.screen-pad < ${V}`, 49],
  ['Train · session', '+ Set', ['workout.js', /'ex-actions'/], `button.btn.btn-ghost < div.ex-actions < div.ex-block < div.wk-block-body < div.wk-block < div.screen-pad < ${V}`, 34],
  ['Train · session', 'Duplicate (block)', ['workout.js', /el\('button', 'btn btn-ghost wk-block-btn', 'Duplicate'\)/], `button.btn.btn-ghost.wk-block-btn < div.wk-block-acts < div.wk-block-hd < div.wk-block < div.screen-pad < ${V}`, 26],
  ['Train · session', '+ Add exercise (block)', ['workout.js', /'btn btn-ghost btn-block wk-block-add'/], `button.btn.btn-ghost.btn-block.wk-block-add < div.wk-block-body < div.wk-block < div.screen-pad < ${V}`, 34],
  ['Train · session', 'Add exercise / Add lifting block', ['workout.js', /'add-row'/], `button.btn.btn-ghost < div.add-row < div.screen-pad < ${V}`, 40],
  ['Train · session', 'Finish', ['workout.js', /'wk-bar'/], `button.btn.btn-primary < div.wk-bar < div < ${V}`, 39],
  ['Train · parked', 'Resume', ['workout.js', /el\('button', 'btn btn-primary', 'Resume'\)/], 'button.btn.btn-primary < div.peek-bar', 31],
  ['Train · day', 'Edit / Delete', ['workout.js', /'day-actions'/], 'button.btn.btn-ghost < div.day-actions < div.card < div.sheet', 36],
  ['Train · picker', 'Add', ['picker.js', /'picker-foot'/], 'button.btn.btn-primary < div.picker-foot < div.sheet', 41, 'button.btn.btn-ghost < div.picker-foot < div.sheet'],
  ['Fuel', 'Foods / Meals', ['food.js', /'add-secondary'/], 'button.btn.btn-ghost < div.add-secondary < div.sheet', 42, null, 'svg'],
  ['Fuel', 'Add (manual)', ['food.js', /'btn btn-primary btn-block btn-lg'/], 'button.btn.btn-primary.btn-block.btn-lg < div.sheet', 49],
  ['Fuel · water', '+ bottle', ['water.js', /'btn btn-primary water-add'/], `button.btn.btn-primary.water-add < div.water-ctl < div.card < div.screen-pad < ${F}`, 46, 46],
  ['Fuel · water', '−', ['water.js', /'btn btn-ghost water-mini'/], `button.btn.btn-ghost.water-mini < div.water-ctl < div.card < div.screen-pad < ${F}`, 46, 46],
  ['Weight', 'Log', ['weight.js', /'qty-row'/], `button.btn.btn-primary < div.qty-row < div.card < div.screen-pad < ${Wv}`, 46, 46],
  ['Steps', '+500', ['steps.js', /'btn btn-ghost st-inc'/], `button.btn.btn-ghost.st-inc < div.st-ctl < div.card < div.screen-pad < ${St}`, 36],
  ['Steps', 'Set total', ['steps.js', /'btn btn-primary st-set'/], `button.btn.btn-primary.st-set < div.st-ctl < div.card < div.screen-pad < ${St}`, 36, `button.btn.btn-ghost.st-inc < div.st-ctl < div.card < div.screen-pad < ${St}`],
  ['You', 'Show me how', ['you.js', /'btn btn-primary btn-block'/], `button.btn.btn-primary.btn-block < div.card < div.you-sec < div.screen-pad < ${Y}`, 39],
  ['Settings', 'Close', ['settings.js', /'btn btn-ghost btn-block'/], 'button.btn.btn-ghost.btn-block < div.sheet', 41],
  ['Settings', 'Sign out', ['settings.js', /'btn btn-danger btn-block'/], 'button.btn.btn-danger.btn-block < div.you-sec < div.sheet', 41],
  ['Settings', 'Choose photo', ['settings.js', /'photo-btns'/], 'button.btn.btn-ghost < div.photo-btns < div.photo-row < div.field < div.sheet', 32],
  ['Coach sheet', 'Start it', ['coach-ui.js', /'coach-build-acts'/], 'button.btn.btn-primary.btn-block < div.coach-build-acts < div.coach-build < div.coach-thread < div.sheet.coach-sheet', 39],
  ['Coach sheet', 'Save as routine', ['coach-ui.js', /'coach-build-acts'/], 'button.btn.btn-ghost.btn-block < div.coach-build-acts < div.coach-build < div.coach-thread < div.sheet.coach-sheet', 41],
  ['Coach sheet', 'Close', ['coach-ui.js', /el\('button', 'btn btn-ghost btn-block', 'Close'\)/], 'button.btn.btn-ghost.btn-block < div.sheet.coach-sheet', 41],
  ['Confirm sheet', 'Delete block', ['ui.js', /'btn btn-block btn-lg ' \+ \(danger \? 'btn-danger' : 'btn-primary'\)/], 'button.btn.btn-block.btn-lg.btn-danger < div.sheet', 51],
  ['Admin', 'Approve', ['admin.js', /'btn btn-primary btn-sm', 'Approve'/], `button.btn.btn-primary.btn-sm < div.person-acts < div.person < div.you-sec < div.screen-pad < ${Y}`, 32, `button.btn.btn-ghost.btn-sm < div.person-acts < div.person < div.you-sec < div.screen-pad < ${Y}`],
  ['Admin', 'Copy', ['admin.js', /'btn btn-ghost btn-sm', 'Copy'/], `button.btn.btn-ghost.btn-sm < div.person-acts < div.person < div.you-sec < div.screen-pad < ${Y}`, 32],
  ['Admin', '+7 days', ['admin.js', /'btn btn-ghost btn-sm', '\+7 days'/], 'button.btn.btn-ghost.btn-sm < div.chip-row < div.card < div.sheet', 32],
  ['Sign in', 'Sign in', ['index.html', /class="btn btn-primary btn-block btn-lg" id="authBtn"/], 'button#authBtn.btn.btn-primary.btn-block.btn-lg < div#authBox.auth-box < div#auth', 49],
  ['Access gate', 'Unlock Rack', ['access.js', /'btn btn-primary btn-block'/], 'button.btn.btn-primary.btn-block < div.field < div.gate-body < div.auth-box < div#gate', 39],
  ['Onboarding', 'Set it up', ['onboarding.js', /'btn btn-primary btn-block btn-lg'/], 'button.btn.btn-primary.btn-block.btn-lg < div.ob-foot < div.ob-card < div#onboard', 49],
  /* v53, on purpose: the recap's "How did that feel?" — its chips (the
     sheet's .coach-chip, held to 44px inside the card), and Save and Skip.
     Never measured in Chrome at v46, so B names them and leaves them to A. */
  ['Recap · feel', 'Energy 1–10', ['workout.js', /el\('div', 'feel-grid'\)/], `button.coach-chip < div.feel-grid < div.card.feel-card < div.screen-pad.summary-page < ${V}`, null],
  ['Recap · feel', 'Strength steps', ['workout.js', /'coach-chips feel-steps'/], `button.coach-chip < div.coach-chips.feel-steps < div.card.feel-card < div.screen-pad.summary-page < ${V}`, null],
  ['Recap · feel', 'Anything Coach can’t see?', ['workout.js', /el\('div', 'feel-mark'\)/], `button.coach-chip < div.coach-chips < div.feel-mark < div.card.feel-card < div.screen-pad.summary-page < ${V}`, null],
  ['Recap · feel', 'Save', ['workout.js', /el\('button', 'btn btn-primary', 'Save'\)/], `button.btn.btn-primary < div.feel-acts < div.card.feel-card < div.screen-pad.summary-page < ${V}`, null],
  ['Recap · feel', 'Skip', ['workout.js', /el\('button', 'btn btn-ghost', 'Skip'\)/], `button.btn.btn-ghost < div.feel-acts < div.card.feel-card < div.screen-pad.summary-page < ${V}`, null],
  /* v54, on purpose: the live sheet's "How was it?" — the three effort chips
     (a .coach-chip, held to 44px by .coach-effort, since the sheet's other
     chips stay smaller) and "Use it for my next set". Never measured in Chrome
     at v46 either, so B names them and leaves them to A; their widths join the
     snapshot as they are tonight. */
  ['Coach · live', 'Way too easy / About right / Too hard', ['coach-ui.js', /'coach-chip coach-effort'/],
   'button.coach-chip.coach-effort < div.coach-chips < div.coach-rate < div.coach-thread < div.sheet.coach-sheet.coach-live', null],
  ['Coach · live', 'Use it for my next set', ['coach-ui.js', /el\('button', 'btn btn-primary btn-block', 'Use it for my next set'\)/],
   'button.btn.btn-primary.btn-block < div.coach-rate-after < div.coach-thread < div.sheet.coach-sheet.coach-live', null],
  /* v55, on purpose: Settings → Coach → Your goal, tidied — every answer is a
     chip (coach-ui.js coachAnswerRows), in one of the three boxes goalLayout()
     puts it in. Never measured in Chrome at v46, so B names them and leaves
     them to A; their widths join the snapshot as they are tonight, and F
     measures every label against its chip. */
  ['Your goal', 'Aims, two to a row', ['coach-ui.js', /el\('button', 'coach-goal-opt'/],
   'button.coach-goal-opt < div.coach-goal-opts.grid < div.field < div.you-sec < div.sheet', null],
  ['Your goal', 'Three answers or fewer, one line', ['coach-ui.js', /el\('div', 'coach-goal-opts ' \+ goalLayout\(q\)\)/],
   'button.coach-goal-opt < div.coach-goal-opts.line < div.field < div.you-sec < div.sheet', null],
  ['Your goal', 'Focus groups, wrapping', ['coach-ui.js', /q\.options\.length <= 3 \? 'line' : 'wrap'/],
   'button.coach-goal-opt < div.coach-goal-opts.wrap < div.field < div.you-sec < div.sheet', null],
  /* v55, on purpose: "+ Drop", under a drop set's last set (workout.js
     dropAddRow). A .btn, so the minimum holds it; never measured in Chrome at
     v46 either, and its widths join the snapshot as they are tonight. */
  ['Train · session', '+ Drop', ['workout.js', /el\('button', 'btn btn-ghost drop-add', '\+ Drop'\)/],
   `button.btn.btn-ghost.drop-add < div.drop-add-row < div.ex-block < div.screen-pad < ${V}`, null]
];

/* The width snapshot, v46 (12b3a9d), produced by this file's own resolver
   from that commit's stylesheets: `SNAPSHOT=1 node tools-check/touch-target.mjs`
   prints the table from whatever files it reads. Any difference here is a
   width-driven change and fails C. */
const SNAP = JSON.parse(readFileSync(new URL('./touch-target.snapshot.json', import.meta.url), 'utf8'));

/* ================= run ================= */
const RULES = SHEETS.flatMap(f => parseCSS(read(f), f));
ROOT = cascade(RULES, { tag: 'html', cls: [], parent: null }, 390);
const CODE = Object.fromEntries([...new Set(BUTTONS.map(b => b[2][0]))].map(f => [f, read(f)]));

if (process.env.SNAPSHOT) {
  const out = {};
  for (const w of [390, 320]) for (const b of BUTTONS) out[w + ' ' + b[0] + ' · ' + b[1]] = widthOf(RULES, chain(b[3]), w);
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}

section('A. every representative button is at least 44px, at 390 and 320 wide');
for (const w of [390, 320]) {
  for (const [screen, name, [file, re], spec, , , kid] of BUTTONS) {
    const bx = buttonBox(RULES, chain(spec), w, { kid: kid ? chain(kid + ' < ' + spec) : null });
    check(`${w} ${screen} · ${name}: ${bx.used}px` + (bx.used > 44 ? ' (taller than the minimum)' : ''),
          bx.used >= 44 && bx.minH === 44 && bx.sizing === 'border-box' && !bx.capped,
          `used ${bx.used}, min-height ${bx.minH} from ${(bx.c['min-height'] || {}).where}, sizing ${bx.sizing}, capped ${bx.capped}`);
  }
}
section('A2. and each one is still built by the source line it was taken from');
for (const [screen, name, [file, re]] of BUTTONS) check(`${screen} · ${name}: ${file} still has ${String(re).slice(1, 60)}`, re.test(CODE[file]));

section('B. the model, minimum taken out, reproduces the heights Chrome measured at v46');
for (const [screen, name, , spec, chromeV46, row, kid] of BUTTONS) {
  // v53's, v54's and v55's controls postdate the v46 measurement: there is nothing to reproduce.
  if (chromeV46 == null) { results.push('  · ' + screen + ' · ' + name + ': added after v46 (v53, v54, v55), never measured in Chrome — A holds its 44px'); continue; }
  const bx = buttonBox(RULES, chain(spec), 390, { withMin: false, kid: kid ? chain(kid + ' < ' + spec) : null });
  if (typeof row === 'number') {
    check(`${screen} · ${name}: ${bx.natural}px of its own, stretched to the row's ${row}px (an input sets it) = Chrome's ${chromeV46}px — over 44 before v47 too`,
          bx.natural <= row && row === chromeV46 && row >= 44);
  } else if (row) {
    const sib = buttonBox(RULES, chain(row), 390, { withMin: false });
    const h = Math.max(bx.natural, sib.natural);
    check(`${screen} · ${name}: ${bx.natural}px of its own, stretched to its row's tallest (${sib.natural}px) = Chrome's ${chromeV46}px`, h === chromeV46, `model ${h}`);
  } else {
    check(`${screen} · ${name}: ${bx.natural}px = Chrome's ${chromeV46}px` + (kid ? ' (its ' + kid + ' sets the content box)' : ''),
          bx.natural === chromeV46, `model ${bx.natural} (fs ${bx.fs}, lh ${bx.lh})`);
  }
}

section('C. nothing a width depends on has moved from v46');
for (const w of [390, 320]) {
  for (const b of BUTTONS) {
    const k = w + ' ' + b[0] + ' · ' + b[1];
    const now = widthOf(RULES, chain(b[3]), w), was = SNAP[k];
    const moved = was ? WIDTH_PROPS.filter(p => now[p] !== was[p]) : ['(not in snapshot)'];
    check(`${k}: widths as v46`, moved.length === 0, moved.map(p => p + ' ' + (was || {})[p] + ' → ' + now[p]).join(', '));
  }
}

section('D. no rule that can reach a .btn sets a height of its own — only the one minimum');
{
  // A rule "can reach a .btn" if its last compound names .btn or one of the
  // classes that only ever sit on a .btn, or is a bare `button` / `*` rule.
  const BTN_ONLY = ['btn', 'btn-primary', 'btn-ghost', 'btn-danger', 'btn-block', 'btn-lg', 'btn-sm',
                    'wk-block-btn', 'wk-block-add', 'water-mini', 'water-add', 'st-inc', 'st-set'];
  const reach = s => { const cs = parseSelector(s); const last = cs[cs.length - 1];
    return !last.el && (last.classes.some(k => BTN_ONLY.includes(k)) || (!last.classes.length && !last.id && (last.tag === 'button' || last.tag === '*'))); };
  const sets = [];
  for (const r of RULES) for (const s of r.selectors) {
    if (!reach(s)) continue;
    for (const p of ['height', 'max-height', 'min-height', 'block-size', 'max-block-size', 'min-block-size'])
      if (r.decls[p]) sets.push(r.file + ' ' + s + ' { ' + p + ': ' + r.decls[p].val + ' }');
  }
  // `.cal-nav button { height: 34px }` is the one other: it sizes the month
  // and day arrows and the gear, and would cap a .btn put in a .cal-nav. None
  // is — every .cal-nav in the app is checked for what it holds.
  const CAL = 'rack.css .cal-nav button { height: 34px }';
  check('exactly one sets a height on a .btn: rack.css .btn { min-height: 44px } — and one other reaches bare buttons, ' + CAL,
        sets.length === 2 && sets.includes('rack.css .btn { min-height: 44px }') && sets.includes(CAL), sets.join(' · '));
  const navs = [];
  for (const f of ['workout.js', 'food.js', 'steps.js', 'weight.js', 'water.js', 'you.js', 'stats.js', 'settings.js', 'admin.js']) {
    const t = read(f);
    for (const m of t.matchAll(/const (\w+) = el\('div', 'cal-nav'\);/g)) {
      const body = t.slice(m.index).split('\n').slice(0, 25).join('\n');
      const into = [...body.matchAll(new RegExp(m[1] + '\\.(?:append|appendChild)\\(([^)]*)\\)', 'g'))].flatMap(x => x[1].split(',').map(v => v.trim()));
      const made = Object.fromEntries([...body.matchAll(/const (\w+) = el\('button', ([^,)]*)/g)].map(x => [x[1], x[2].trim()]));
      into.forEach(v => navs.push([f, v, made[v]]));
    }
  }
  check('and every .cal-nav holds only classless arrows and the gear (' + navs.length + ' buttons in ' + new Set(navs.map(n => n[0])).size + ' files)',
        navs.length >= 5 && navs.every(([, , cls]) => cls === 'null' || cls === "'gear-btn'"), navs.map(n => n.join(':')).join(' '));
  // Every class list a .btn is built with anywhere in the app, in a plain
  // sheet, resolves the minimum — so a new variant class cannot undo it.
  const all = ['index.html', ...Object.keys(CODE), ...['access.js', 'admin.js', 'coach-ui.js', 'food.js', 'importer.js', 'onboarding.js', 'picker.js',
    'routines.js', 'settings.js', 'stats.js', 'steps.js', 'ui.js', 'water.js', 'weight.js', 'workout.js', 'you.js']].filter((v, i, a) => a.indexOf(v) === i);
  const lists = new Set();
  for (const f of all) {
    const t = read(f);
    for (const m of t.matchAll(/['"`](btn(?: [\w-]+)*)\s*['"`]/g)) lists.add(m[1].trim());
    for (const m of t.matchAll(/class="(btn[^"]*)"/g)) lists.add(m[1].trim());
  }
  // The two lists built by concatenation, written out in full.
  ['btn btn-primary btn-block', 'btn btn-ghost btn-block', 'btn btn-block btn-lg btn-danger', 'btn btn-block btn-lg btn-primary'].forEach(l => lists.add(l));
  const short = [...lists].filter(l => {
    const bx = buttonBox(RULES, chain('button.' + l.split(/\s+/).join('.') + ' < div.sheet'), 390);
    return bx.used < 44 || bx.minH !== 44;
  });
  check(`every class list a .btn is built with (${lists.size} of them) resolves the 44px minimum`, lists.size >= 15 && short.length === 0, short.join(' | '));
  const inline = Object.entries({ ...CODE, ...Object.fromEntries(all.map(f => [f, read(f)])) })
    .filter(([f, t]) => /\.style\.(height|minHeight|maxHeight|blockSize)\s*=/.test(t.replace(/(svg|bar)\.style\.height/g, '')))
    .map(([f]) => f);
  check('and no script sets a height on a button inline', inline.length === 0, inline.join(', '));
}

section('E. the parked-workout bar, which grew with its Resume button');
{
  // The bar is border + padding + the taller of Resume and the name/timer
  // stack; the name and timer are ordinary text and inherit body's 1.45.
  for (const withMin of [false, true]) {
    const bar = cascade(RULES, chain('div.peek-bar'), 390);
    const b = buttonBox(RULES, chain('button.btn.btn-primary < div.peek-bar'), 390, { withMin });
    const lhOf = spec => { const c = cascade(RULES, chain(spec), 390); const fs = px((c['font-size'] || {}).v); return { fs, lh: fs * 1.45, mt: px((c['margin-top'] || {}).v) || 0 }; };
    const name = lhOf('div.peek-name < div.peek-left < div.peek-bar'), timer = lhOf('div.timer.num < div.peek-left < div.peek-bar');
    const left = name.lh + timer.lh + timer.mt;
    const barH = (px((bar['border-top-width'] || {}).v) || 0) * 2 + px((bar['padding-top'] || {}).v) + px((bar['padding-bottom'] || {}).v) + Math.max(b.used, left);
    const reserved = px((cascade(RULES, chain('section.view.active', ['peeking']), 390)['padding-bottom'] || {}).v);
    // The page's last button ends `reserved` + the screen's own 16px bottom
    // padding above the dock; the bar floats 10px above it.
    const sp = px((cascade(RULES, chain(`div.screen-pad < ${V}`), 390)['padding-bottom'] || {}).v) || 0;
    const gap = reserved + sp - 10 - barH;
    if (!withMin) {
      check(`at v46's button: the bar is ${barH.toFixed(1)}px (Chrome: 57.2), set by the name and timer, not Resume`, Math.abs(barH - 57.23) < 0.1 && left > b.used, barH);
      check(`and v46's 58px reservation left a ${(58 + sp - 10 - barH).toFixed(1)}px gap above it (Chrome: 6.9)`, Math.abs((58 + sp - 10 - barH) - 6.87) < 0.2);
    } else {
      check(`with the minimum: Resume is 44px and the bar ${barH}px (Chrome: 64)`, b.used === 44 && barH === 64, barH);
      check(`and the reservation is ${reserved}px, so the gap above the bar is ${gap.toFixed(1)}px — kept, not closed (Chrome: 7.1)`, gap >= 6, gap);
      check('at 58px it would have been ' + (58 + sp - 10 - barH).toFixed(1) + 'px — flush against the page\'s last button', (58 + sp - 10 - barH) < 1);
    }
  }
}

section('F. Your goal (v55): every answer’s label fits its chip on one line, at 320 and 390 wide');
{
  /* Archivo's advance widths at the one instance the chips are set in, 'wdth'
     92 'wght' 600, in font units (unitsPerEm 1000, rounded to the unit).
     Restated because node cannot read them off a screen, like ASC and DESC
     above: read on 25 Sep 2026 from the variable font Google Fonts serves a
     browser for rack.css's @import (the latin range,
     fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLmvDIaI.woff2) — its
     hmtx plus its HVAR deltas at those coordinates. The same reading at four
     of Google's static instances (700 at wdth 100 and 87.5, 400 at 100, 300 at
     62.5) agreed with their own hmtx to one unit on every glyph below.
     Kerning is not modelled, so 3% of every label is held back for it and for
     the pixel snapping the model does not do either. */
  const FACE = "'wdth' 92, 'wght' 600", HOLD = 1.03;
  const ADV = {
    '0':539, '1':528, '2':540, '3':540, '4':538, '5':541, '6':540, '7':531, '8':538, '9':539, ' ':184,
    '!':283, '"':419, '#':557, '$':501, '%':901, '&':680, "'":233, '(':353, ')':353, '*':399, '+':604,
    ',':279, '-':313, '.':279, '/':291, ':':312, ';':312, '<':604, '=':604, '>':604, '?':566, '@':929,
    'A':657, 'B':655, 'C':673, 'D':679, 'E':623, 'F':562, 'G':736, 'H':682, 'I':269, 'J':545, 'K':652,
    'L':531, 'M':802, 'N':683, 'O':729, 'P':625, 'Q':729, 'R':668, 'S':618, 'T':581, 'U':674, 'V':625,
    'W':895, 'X':641, 'Y':635, 'Z':595, '[':333, '\\':291, ']':333, '^':604, '_':471, '`':197, 'a':524,
    'b':552, 'c':512, 'd':552, 'e':527, 'f':292, 'g':546, 'h':544, 'i':240, 'j':237, 'k':510, 'l':239,
    'm':806, 'n':545, 'o':557, 'p':552, 'q':552, 'r':338, 's':501, 't':296, 'u':544, 'v':489, 'w':712,
    'x':510, 'y':489, 'z':476, '{':382, '|':233, '}':382, '~':604, '–':460, '’':261
  };
  const textW = (s, fs) => { let u = 0; for (const ch of s) { if (!(ch in ADV)) return NaN; u += ADV[ch]; } return u * fs / 1000; };

  /* The labels, from the real sources: every question in coach.js's QUESTIONS
     that Settings may draw (all but `settings: false`), with coach-ui.js's
     SHORT_LABELS over them, and the box each is drawn in decided by
     coach-ui.js's own goalLayout() — read and run, never restated. */
  const CS = read('coach.js'), UIS = CODE['coach-ui.js'];
  const qs = CS.slice(CS.indexOf('export const QUESTIONS = Object.freeze(['));
  const qBlock = qs.slice(0, qs.indexOf('\n]);'));
  const at = [...qBlock.matchAll(/^    id: '(q_\w+)',$/gm)];
  const QS = at.map((m, i) => {
    const body = qBlock.slice(m.index, i + 1 < at.length ? at[i + 1].index : qBlock.length);
    return { id: m[1], settings: !/^\s+settings: false,$/m.test(body),
             options: [...body.matchAll(/\{\s*value:\s*'([^']+)',\s*label:\s*'([^']+)'\s*\}/g)].map(o => ({ value: o[1], label: o[2] })) };
  }).filter(q => q.settings);
  const shortSrc = (/const SHORT_LABELS = Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(UIS) || [])[1] || '';
  const SHORT = Object.fromEntries([...shortSrc.matchAll(/(q_\w+): Object\.freeze\(\{([^}]*)\}\)/g)]
    .map(m => [m[1], Object.fromEntries([...m[2].matchAll(/(\w+): '([^']+)'/g)].map(x => [x[1], x[2]]))]));
  const layoutSrc = (/const goalLayout = (q => [^\n]+);\n/.exec(UIS) || [])[1];
  const goalLayout = layoutSrc ? new Function('return (' + layoutSrc + ')')() : () => null;
  const n = id => (QS.find(q => q.id === id) || { options: [] }).options.length;
  check(`coach.js's questions were read: ${QS.map(q => q.id + ' ' + q.options.length).join(', ')} — the aims 6, experience 3, the focus groups 7`,
        n('q_goal_aim') === 6 && n('q_experience') === 3 && n('q_focus_group') === 7 && QS.every(q => q.options.length >= 2));
  check('coach-ui.js’s SHORT_LABELS were read, and each names a stored value of its question: ' + JSON.stringify(SHORT),
        Object.keys(SHORT).length >= 1 && Object.entries(SHORT).every(([id, m]) => {
          const q = QS.find(x => x.id === id); return !!q && Object.keys(m).every(v => q.options.some(o => o.value === v));
        }));
  check('and goalLayout() was read and run: the aims a grid, experience a line, the focus groups wrapping',
        !!layoutSrc && goalLayout({ id: 'q_goal_aim', options: [1, 2, 3, 4, 5, 6] }) === 'grid' &&
        goalLayout({ id: 'q_experience', options: [1, 2, 3] }) === 'line' && goalLayout({ id: 'q_focus_group', options: [1, 2, 3, 4, 5, 6, 7] }) === 'wrap');

  const spec = lay => `button.coach-goal-opt < div.coach-goal-opts.${lay} < div.field < div.you-sec < div.sheet`;
  const sides = (c, a, b) => [a, b].reduce((s, p) => { const v = c[p] ? c[p].v : '0px'; const x = px(v); if (x == null) throw new Error(p + ' is ' + v); return s + x; }, 0);
  for (const w of [390, 320]) {
    // The chips' container, outermost in: html and body have no margin or
    // padding; the sheet is 100% wide up to its max-width, border-box.
    const content = lay => {
      const nodes = []; for (let x = chain(spec(lay)).parent; x; x = x.parent) nodes.unshift(x);
      let inner = w;
      for (const nd of nodes) {
        const c = cascade(RULES, nd, w);
        const v = p => (c[p] ? c[p].v : undefined);
        const edge = sides(c, 'padding-left', 'padding-right') + sides(c, 'border-left-width', 'border-right-width');
        let box = inner - sides(c, 'margin-left', 'margin-right');
        if (v('width') === '100%') box = Math.min(inner, px(v('max-width')) ?? Infinity);
        else if (v('width') !== undefined) throw new Error(nd.tag + '.' + nd.cls.join('.') + ' has width ' + v('width'));
        if (v('width') !== undefined && v('box-sizing') !== 'border-box') throw new Error('not border-box');
        inner = box - edge;
      }
      return inner;
    };
    for (const lay of ['grid', 'line', 'wrap']) {
      const c = cascade(RULES, chain(spec(lay)), w), box = cascade(RULES, chain(spec(lay)).parent, w);
      const v = p => (c[p] ? c[p].v : undefined);
      const inherited = []; for (let x = chain(spec(lay)).parent; x; x = x.parent) {
        const a = cascade(RULES, x, w); ['letter-spacing', 'word-spacing', 'text-transform', 'font-variation-settings', 'font-size'].forEach(p => { if (a[p] && !(x.tag === 'html' || x.tag === 'body')) inherited.push(p); }); }
      const fs = px(v('font-size'));
      check(`${w} ${lay}: the chip is set ${v('font-size')} in ${v('font-variation-settings')}, one line (white-space ${v('white-space')}), no letter-spacing or case change from it or above it`,
            fs === 12 && v('font-variation-settings') === FACE && v('white-space') === 'nowrap' &&
            v('letter-spacing') === undefined && v('text-transform') === undefined && !inherited.length,
            'restate ADV for a new instance; ' + inherited.join(', '));
      const room = content(lay), gap = px((box.gap || {}).v) ?? 0;
      const edge = sides(c, 'padding-left', 'padding-right') + sides(c, 'border-left-width', 'border-right-width');
      const qsHere = QS.filter(q => goalLayout(q) === lay);
      check(`${w} ${lay}: questions drawn here — ${qsHere.map(q => q.id).join(', ')}`, qsHere.length >= 1);
      const lab = (q, o) => (SHORT[q.id] || {})[o.value] || o.label;
      if (lay === 'grid') {
        const col = (room - gap) / 2, avail = col - edge;
        check(`${w} grid: ${(box['grid-template-columns'] || {}).v}, ${gap}px apart in ${room}px — each chip ${col}px, ${avail}px for its label`,
              (box.display || {}).v === 'grid' && (box['grid-template-columns'] || {}).v === 'repeat(2, minmax(0, 1fr))');
        for (const q of qsHere) for (const o of q.options) {
          const t = textW(lab(q, o), fs);
          check(`${w} grid · “${lab(q, o)}”: ${t.toFixed(1)}px (+3% ${(t * HOLD).toFixed(1)}) in ${avail}px`, t * HOLD <= avail, 'wider than its chip');
        }
      } else if (lay === 'line') {
        check(`${w} line: one row that does not wrap, each chip as wide as its label (flex ${v('flex-grow')} ${v('flex-shrink')} ${v('flex-basis')})`,
              (box.display || {}).v === 'flex' && (box['flex-wrap'] || {}).v === 'nowrap' && v('flex-basis') === 'auto');
        for (const q of qsHere) {
          const ws = q.options.map(o => textW(lab(q, o), fs));
          const need = ws.reduce((s, t) => s + t * HOLD + edge, 0) + gap * (q.options.length - 1);
          check(`${w} line · ${q.id}: ${q.options.map((o, i) => '“' + lab(q, o) + '” ' + ws[i].toFixed(1)).join(', ')} — ${need.toFixed(1)}px with the 3%, padding, borders and gaps, in ${room}px`,
                need <= room, 'the row is wider than its box');
        }
      } else {
        check(`${w} wrap: chips wrap whole (flex-wrap ${(box['flex-wrap'] || {}).v})`, (box.display || {}).v === 'flex' && (box['flex-wrap'] || {}).v === 'wrap');
        for (const q of qsHere) for (const o of q.options) {
          const t = textW(lab(q, o), fs);
          check(`${w} wrap · “${lab(q, o)}”: ${(t * HOLD + edge).toFixed(1)}px with the 3% in ${room}px, and ${(t + edge).toFixed(1)}px wide as a target`,
                t * HOLD + edge <= room && t + edge >= 44, 'wider than the row, or narrower than 44px');
        }
      }
    }
  }
}

/* ---------- report ---------- */
console.log('\nevery .btn is a 44px touch target\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
