#!/usr/bin/env node
//
// Verifier for Settings' back arrow (v68).
//
//   node tools-check/settings-back.mjs
//
// Micah, 21 Oct 2026: inside a Settings screen, going back closed Settings
// altogether. Only four of the hub's rows (Units, Open the app on, Default
// rest, Coach) had a ‹ Settings; every other row's sheet is drawn in its own
// module (food.js, water.js, picker.js, vibes-sheet.js …) and had only Close.
//
// THE RULE. Every row of the hub that opens a screen opens it as a CHILD of
// the hub (settings.js `kid`, through ui.js `asChildSheet`): the sheet it
// opens carries ‹ Settings at the top, and that arrow closes it and opens the
// hub again with the search as it was. Admin, a page rather than a sheet,
// hands openAdmin a back that does the same. The hook is one-shot: only the
// first sheet opened while the row runs gets the arrow.
//
//   A  ui.js asChildSheet: the next sheet gets the decoration, once, and only
//      while open() runs — a sheet opened afterwards, or by a throw, gets none
//   B  every hub row that opens something is wired through kid() (or is one
//      of the four that are actions, not screens) — read from the real
//      settings-registry.js and settings.js, so a new row cannot ship without
//      a way back
//   C  the arrow: ‹ Settings, a label, back to the hub with the search kept,
//      and 44px tall in the real rack.css
//
// Driven in a browser by hand in v68 (Playwright over report/btn-44's fakes):
// all sixteen rows' sheets open with one 44px arrow that lands on the hub.

import { readFileSync } from 'node:fs';
import { stage, harness, J } from './lib/stage.mjs';

const { check, section, done } = harness('Settings: the back arrow (v68)');
const st = stage(['ui.js']);
const UI = await st.load('ui.js');
const rd = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

section('A. ui.js asChildSheet — the next sheet, once, only while it runs');
{
  const seen = [];
  const deco = x => seen.push(x.sh);
  const r = UI.asChildSheet(deco, () => { const a = UI.sheet(); const b2 = UI.sheet(); return [a, b2]; });
  check('the first sheet opened inside it is decorated', seen.length === 1 && seen[0] === r[0].sh);
  check('the second one opened inside the same call is not', !seen.includes(r[1].sh));
  check('it hands back what open() returned', Array.isArray(r) && r.length === 2);
  UI.sheet();
  check('a sheet opened afterwards is not decorated', seen.length === 1);
  const n0 = seen.length;
  UI.asChildSheet(deco, () => {});
  UI.sheet();
  check('an open() that opened no sheet leaves nothing armed for the next one', seen.length === n0);
  try { UI.asChildSheet(deco, () => { throw new Error('x'); }); } catch { /* expected */ }
  UI.sheet();
  check('nor does an open() that throws', seen.length === n0);
  const order = [];
  UI.asChildSheet(({ sh }) => order.push(sh.children.length), () => UI.sheet());
  check('the decoration runs before the opener draws anything (only the grab is there)', order[0] === 1);
  const ok = UI.asChildSheet(() => { throw new Error('bad'); }, () => UI.sheet());
  check('a decoration that throws still leaves the sheet open', !!(ok && ok.sh));
}

section('B. every hub row that opens a screen goes through kid()');
{
  const REG = rd('settings-registry.js'), SET = rd('settings.js');
  const opens = [...REG.matchAll(/opens:\s*'(\w+)'/g)].map(m => m[1]);
  const ACTIONS = /const ACTIONS = \{([\s\S]*?)\n  \};/.exec(SET);
  check('the hub’s ACTIONS table is where it was', !!ACTIONS);
  const body = ACTIONS ? ACTIONS[1] : '';
  const NOT_SCREENS = ['tour', 'signOut', 'erase', 'admin'];
  const missing = opens.filter(id => !NOT_SCREENS.includes(id) && !new RegExp('\\n\\s+' + id + ':\\s+kid\\(').test(body));
  check('every row that opens a sheet (' + opens.filter(id => !NOT_SCREENS.includes(id)).length + ' of them) is kid(…)', missing.length === 0, J(missing));
  check('tour, sign out and erase are actions, not screens: no arrow', ['tour', 'signOut', 'erase'].every(id => new RegExp('\\n\\s+' + id + ':\\s+\\(\\) =>').test(body)));
  check('Admin, a page: its ‹ Back reopens the hub with the search kept',
    /admin:\s+\(\) => \{ const q0 = q\.value; close\(\); openAdmin\(\(\) => \{ if \(onEdit\) onEdit\(\); openSettings\(onEdit, who, \{ q: q0 \}\); \}\); \}/.test(body));
  check('kid closes the hub first and opens the row as a child sheet',
    /const kid = open => \(\) => \{ const q0 = q\.value; close\(\); asChildSheet\(backArrow\(onEdit, who, q0\), open\); \};/.test(SET));
  check('the four small sheets no longer draw an arrow of their own (one arrow, not two)',
    !/function subSheet[\s\S]*?back-btn[\s\S]*?\n\}/.test(SET.slice(SET.indexOf('function subSheet'), SET.indexOf('function backArrow'))));
}

section('C. the arrow');
{
  const SET = rd('settings.js'), CSS = rd('rack.css');
  const fn = /function backArrow\([\s\S]*?\n\}/.exec(SET);
  check('it reads ‹ Settings and is labelled for a screen reader', !!fn && fn[0].includes('&#8249;</span> Settings') && fn[0].includes("'Back to Settings'"));
  check('it closes the sheet and opens the hub with the search it came from', !!fn && fn[0].includes('close(); openSettings(onEdit, who, { q });'));
  check('the hub puts that search back in the box before it draws', /if \(from && typeof from\.q === 'string'\) q\.value = from\.q;\n  draw\(\);/.test(SET));
  const rule = /\.back-btn \{([^}]*)\}/.exec(CSS);
  check('.back-btn is 44px tall — the touch target', !!rule && /min-height:\s*44px/.test(rule[1]));
}

done(st.cleanup);
