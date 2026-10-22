#!/usr/bin/env node
//
// Verifier for the Friends tab's shape (rack-v67) — the structural half,
// the way tools-check/you-structure.mjs holds the You redesign.
//
//   node tools-check/friends-structure.mjs
//
//   A  the slot: Friends is the dock's fifth button and view where Steps was,
//      routed, counted, booted unawaited and toured
//   B  the page: what it draws and in what order, a warm empty state, and a
//      sheet for each thing a row opens
//   C  the split: friends-core.js and friends-summary.js are pure — no DOM, no
//      store, no clock, no randomness of their own — and every social path is
//      built in one place
//   D  safety in the code: names drawn as text, never markup; the shared
//      verbs only; every stamp the server's; usage events on the closed list
//   E  the vibe contract is untouched: no file under vibes/ changed, Friends
//      tags no block, the dock keeps index.html's drawing where no set has one,
//      and its tile glyphs live in tile-icons.js
//   F  touch targets: every tappable Friends adds is 44px or more
//   G  the docs and the version say so

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const rd = f => readFileSync(join(ROOT, f), 'utf8');
const IDX = rd('index.html'), APP = rd('app.js'), FR = rd('friends.js'), FD = rd('friends-data.js');
const CORE = rd('friends-core.js'), SUM = rd('friends-summary.js'), CSS = rd('rack.css');
const BASE = 'f31e34d';   // the You/Settings redesign, which this change starts from

let pass = 0, fail = 0;
const out = [];
const check = (label, ok, detail) => { if (ok) { pass++; out.push('  ✓ ' + label); } else { fail++; out.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); } };
const section = t => out.push('\n' + t);
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

section('A. the slot');
{
  const views = [...IDX.matchAll(/<section class="view[^"]*" id="view-(\w+)"/g)].map(m => m[1]);
  const dock = [...IDX.matchAll(/<button data-view="(\w+)"[^>]*aria-label="([^"]+)"/g)].map(m => [m[1], m[2]]);
  check('five views: you, workout, food, weight, friends', JSON.stringify(views) === JSON.stringify(['you', 'workout', 'food', 'weight', 'friends']), views.join());
  check('the dock\'s fifth button is Friends, labelled for a screen reader', JSON.stringify(dock[4]) === JSON.stringify(['friends', 'Friends']) && dock.length === 5);
  check('its label reads Friends', /data-view="friends"[\s\S]*?<\/svg>\s*Friends\s*<\/button>/.test(IDX));
  check('the router renders it and counts the visit as tabFriends', /if \(name === 'friends'\) \{ bump\('tabFriends'\); renderFriends\(\); \}/.test(APP));
  check('a vibe switch repaints it like any tab', /friends: renderFriends/.test(APP));
  const boot = APP.slice(APP.indexOf('async function boot('), APP.indexOf('\n}\n', APP.indexOf('async function boot(')));
  check('boot starts it after Steps and does not wait for it', /await initSteps\(\);[\s\S]*initFriendsTab\(user\)\.catch\(\(\) => \{\}\);/.test(boot) && !/await initFriendsTab/.test(boot));
  check('and before restoreView(), so a tour or a stored last tab of Friends lands on a live screen', boot.indexOf('initFriendsTab(') < boot.indexOf('restoreView();'));
  check('the walkthrough tours Friends, not Steps', /view: 'friends', title: 'Friends'/.test(rd('onboarding.js')) && !/view: 'steps'/.test(rd('onboarding.js')));
}

section('B. the page');
{
  const r = FR.slice(FR.indexOf('export function render() {'), FR.indexOf('\nfunction head()'));
  const order = ['requestsCard(s)', 'inboxCard(s)', 'boardCard(s)', 'friendsCard(s)', 'outgoingCard(s)', 'emptyCard()'].map(x => r.indexOf(x));
  check('top to bottom: waiting on me (requests, then routines), the board, my friends, waiting on others — or the empty card',
    order.every(i => i > 0) && order.every((i, k) => k === 0 || i > order[k - 1]), order.join());
  check('the empty card is drawn only with no friends and nothing pending', /if \(!s\.friends\.length && !s\.incoming\.length && !s\.outgoing\.length\) wrap\.appendChild\(emptyCard\(\)\)/.test(r));
  check('until my node has been read it says so, instead of claiming I have no friends', /if \(!s\.ready\)/.test(r) && /Looking for your friends/.test(r));
  const empty = FR.slice(FR.indexOf('function emptyCard()'), FR.indexOf('\n}\n', FR.indexOf('function emptyCard()')));
  check('the empty card is warm and says how to start, and that nothing is shared until both say yes',
    /Train with your people/.test(empty) && /Nothing is shared until you both say yes/.test(empty) && /Make a code/.test(empty) && /I have a code/.test(empty));
  check('the head has an add button with a name a screen reader can say', /setAttribute\('aria-label', 'Add a friend'\)/.test(FR));
  for (const [fn, what] of [['openAdd', 'add a friend'], ['openFriend', 'one friend'], ['openSend', 'send a routine'], ['openSendConfirm', 'confirm the send'], ['openInboxItem', 'a routine for me']]) {
    check('a sheet for ' + what + ' (' + fn + ')', new RegExp('function ' + fn + '\\(').test(FR));
  }
  check('the request and the confirm both say which three things are shared by default, before anything is sent',
    /DEFAULT_WORDS/.test(FR.slice(FR.indexOf('function requestsCard'), FR.indexOf('function inboxCard'))) &&
    /andList\(DEFAULT_WORDS\)/.test(FR.slice(FR.indexOf('function openAdd'), FR.indexOf('function openFriend'))));
  check('a friend\'s page has the five switches, what they show me, Send a routine and Remove',
    /SHARE\.forEach\(x => \{/.test(FR) && /'What ' \+ first \+ ' shows you'/.test(FR) && /'Send ' \+ first \+ ' a routine'/.test(FR) && /'Remove ' \+ first/.test(FR));
  check('removing asks first, and says what it ends', /title: 'Remove ' \+ first \+ '\?'/.test(FR) && /danger: true/.test(FR));
  check('weight and macros are read-only cards, never a board', /BOARDS\.map/.test(FR) && !/board\('(wt|mac)'/.test(FR));
}

section('C. the split: two pure modules, one gatherer, one screen');
{
  const imports = t => [...t.matchAll(/^import[^;]*from\s*'([^']+)'/gm)].map(m => m[1]);
  check('friends-core.js imports exercises.js and nothing else', JSON.stringify(imports(CORE)) === JSON.stringify(['./exercises.js']));
  check('friends-summary.js imports nothing', imports(SUM).length === 0);
  check('exercises.js, which friends-core.js leans on, is itself pure', imports(rd('exercises.js')).length === 0);
  for (const [name, t] of [['friends-core.js', code(CORE)], ['friends-summary.js', code(SUM)]]) {
    check(name + ': no DOM, no window, no storage', !/\b(document|window|localStorage|navigator)\b/.test(t));
    check(name + ': no clock of its own (time is an argument)', !/Date\.now\(\)/.test(t) && !/new Date\(\)/.test(t));
    check(name + ': no randomness of its own (makeCode takes the source)', !/Math\.random|crypto\./.test(t));
  }
  check('every social/ path is built in friends-core.js PATH — the gatherer and the screen spell none',
    !/'social\//.test(code(FD)) && !/'social\//.test(code(FR)) && /export const PATH = Object\.freeze\(\{/.test(CORE));
  check('the screen reads and writes nothing itself: no store verb but the clock-free todayKey, wu and onChange',
    /import \{ todayKey, wu, onChange \} from '\.\/store\.js';/.test(FR) && !/readShared|writeShared|updateShared/.test(code(FR)));
}

section('D. safety in the code');
{
  const html = [...code(FR).matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map(m => m[1].trim());
  check('names are only ever text: every innerHTML the screen sets is the empty string', html.length > 0 && html.every(v => v === "''"), html.join(' | '));
  check('the gatherer writes only through the shared verbs — never users/ read()/write(), never mergeUpdate()',
    !/\bwrite\(|mergeUpdate\(/.test(code(FD)) && /from '\.\/store\.js'/.test(FD));
  // The seven writes that carry a stamp: a code, a request, an outgoing note,
  // both sides of a connection, a published summary and an inbox slot — and
  // v68's two: the face (av) and a nudge, beside the sender's nudged stamp,
  // which is a bare serverNow() of its own.
  const stamps = (code(FD).match(/\bat: serverNow\(\)/g) || []).length;
  check('every stamp written is the server\'s (serverNow()), so no phone\'s clock decides a code\'s day — ' + stamps + ' of them',
    stamps === 9 && /\[PATH\.nudged\(me, f\)\]: serverNow\(\)/.test(code(FD)) &&
    !/\bat: Date\.now\(\)/.test(code(FD)) && !/Date\.now\(\)\s*[+-]\s*CODE_TTL/.test(code(FD)));
  const EV = rd('usage.js');
  check('the three new counters are on usage.js\'s closed list, and tabSteps stays for the days already counted',
    ['tabFriends', 'friendAdd', 'routineSend', 'tabSteps'].every(e => EV.includes("'" + e + "'")));
  check('and the owner\'s panel labels them', /\['tabFriends', 'Friends'\]/.test(rd('admin.js')) && /\['friendAdd', 'Friend'\]/.test(rd('admin.js')) && /\['routineSend', 'Sent'\]/.test(rd('admin.js')));
  check('a routine accepted goes through routines.js and picker.js, which write the whole list first', /adoptRoutine\(got\.routine\)/.test(FD) && /adoptCustom\(got\.customs\)/.test(FD) &&
    /export async function adoptRoutine[\s\S]{0,400}await write\('routines', next\);\s*routines = next;/.test(rd('routines.js')) &&
    /export async function adoptCustom[\s\S]{0,700}await write\('exercises\/custom', next\);\s*customEx = next;/.test(rd('picker.js')));
}

section('E. the vibe contract is untouched');
{
  const changed = execFileSync('git', ['-C', ROOT, 'diff', '--name-only', BASE, '--', 'vibes'], { encoding: 'utf8' }).trim();
  const untracked = execFileSync('git', ['-C', ROOT, 'ls-files', '--others', '--exclude-standard', 'vibes'], { encoding: 'utf8' }).trim();
  check('no file under vibes/ differs from ' + BASE, !changed && !untracked, changed + untracked);
  check('Friends is not a screen of the composition vocabulary, so it tags no block and arranges nothing', !/\bblk\(|composeScreen\(/.test(code(FR)));
  check('it ends in tail() by its own name, like every tab', /tail\(wrap, 'friends'\)/.test(FR));
  check('vibe.js keeps index.html\'s own dock drawing for a view no icon set draws', /const named = set !== DEFAULT && hasIcon\(set, b\.dataset\.view\);/.test(rd('vibe.js')) && /: orig;/.test(rd('vibe.js')));
  const TI = rd('tile-icons.js');
  check('its three tile glyphs (people, userPlus, inbox) are in tile-icons.js and not in the contract',
    ['people:', 'userPlus:', 'inbox:'].every(k => TI.includes(k)) && !/userPlus|people:/.test(rd('vibes/icons/v1.js')));
  check('and the dock\'s Friends drawing is the people glyph\'s, path for path',
    IDX.includes('M3 20c.4-3.4 2.9-5.4 6-5.4s5.6 2 6 5.4') && TI.includes('M3 20c.4-3.4 2.9-5.4 6-5.4s5.6 2 6 5.4') && IDX.includes('M14.6 5.4a2.8 2.8 0 1 1 0 4.8M17.2 14.4c2.2.4 3.5 2.4 3.8 5.6'));
}

section('F. touch targets: 44px or more on everything Friends adds that a thumb taps');
{
  const rule = sel => { const m = new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(CSS); return m ? m[2] : ''; };
  const px = (body, prop) => { const m = new RegExp('(^|[;\\s])' + prop + '\\s*:\\s*([0-9.]+)px').exec(body); return m ? +m[2] : 0; };
  const T = [
    ['.fr-head-add', 'height'], ['.fr-tog-row', 'min-height'], ['.fr-friend', 'min-height'],
    ['.fr-seg .seg-btn', 'min-height'], ['.fr-again', 'min-height']
  ];
  for (const [sel, prop] of T) check(sel + ' is ' + px(rule(sel), prop) + 'px tall', px(rule(sel), prop) >= 44, rule(sel).trim().slice(0, 80));
  const chip = rule('.fr-chip'), hit = rule('.fr-chip::after');
  check('the window chips are 32px pills whose hit area reaches 44 (6px past each edge)', px(chip, 'min-height') === 32 && /top:\s*-6px/.test(hit) && /bottom:\s*-6px/.test(hit));
  check('the inbox and friend rows are the hub\'s .set-row-nav (52px with a tile, 58 with a face)', /el\('button', 'set-row-nav has-tile'\)/.test(FR) && /el\('button', 'set-row-nav fr-friend'\)/.test(FR));
  check('every other button Friends draws is a .btn — 44px by .btn\'s own minimum (touch-target.mjs D)',
    [...FR.matchAll(/el\('button', '([^']+)'/g)].map(m => m[1]).every(c => /\bbtn\b|set-row-nav|fr-tog-row|fr-head-add|chip fr-chip|linkish fr-again|rt-item/.test(c)));
  check('no rule Friends adds sets a height on a .btn', !/\.fr-[\w-]+\s+\.btn\s*\{[^}]*height/.test(CSS) && !/\.btn[\w.-]*\.fr-[\w-]+\s*\{[^}]*height/.test(CSS));
}

section('G. the docs and the version');
{
  const SW = /const CACHE='(rack-v\d+)'/.exec(rd('sw.js'))[1], US = /const VERSION = '(rack-v\d+)'/.exec(rd('usage.js'))[1];
  // v69, on purpose: the build moved on, and the two still agree.
  check('sw.js and usage.js both say rack-v75', SW === 'rack-v75' && US === 'rack-v75', SW + ' / ' + US);
  const AG = rd('AGENTS.md');
  check('AGENTS.md documents every social node', ['social/codes/{CODE}', 'social/people/{uid}', 'social/shared/{uid}', 'social/inbox/{to}/{from}'].every(k => AG.includes(k)));
  check('README.md and CLAUDE.md name the four files', ['friends.js', 'friends-data.js', 'friends-core.js', 'friends-summary.js'].every(f => rd('README.md').includes(f) && rd('CLAUDE.md').includes(f)));
  check('DEPLOY.md says the rules must be published for Friends to work', /Friends/.test(rd('DEPLOY.md')) && /social/.test(rd('DEPLOY.md')));
}

console.log('\nFriends: the tab in Steps\' slot\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
