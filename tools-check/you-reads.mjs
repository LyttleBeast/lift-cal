#!/usr/bin/env node
//
// Verifier for the You tab's reads (v57).
//
//   node tools-check/you-reads.mjs
//
// BACKLOG.md carried it from v42: "The You tab issues around seven live GETs
// per render … the thing worth attacking before anything else is added to that
// screen." A render is every switch to the tab and every repaint its own loads
// trigger, and each one ended in refreshLogged(), which read seven nodes whole
// — weight/entries, food/targets, food/daySummaries, steps, profile,
// settings/steps and settings/water — to learn whether anything had changed.
// store.js read() is a live get() whenever the device is online (the mirror is
// only its fallback), so every one of those was a round trip. Almost always
// nothing had changed.
//
// Since v57 (SHIP-V57-PROMPT §D) the screen reads those seven once per app
// open, and after that only a node that changed: store.js onChange() names the
// path of every write on this device and every live listener's delivery, and
// You re-reads just the node that path is in. A listener that delivers one of
// the seven whole hands it over with no read at all.
//
// What this proves, driving the REAL app — every module as it is, over a
// Firebase stub that holds a real tree and counts each get(). A get() is one
// live GET; read() and readExact() both come to it, so nothing that reads can
// go around the spy.
//
//   A. THE COUNT. rack-v56's GETs per You render, measured, and this build's,
//      pinned — at boot, on every tab switch, and on every change below.
//   B. THE SCREEN IS THE SAME. Both builds render one fixture, and the You
//      tab's text is compared line for line: at boot, after three switches to
//      the tab, and after each change.
//   C. A WRITE ELSEWHERE STILL SHOWS, with no reload: a weigh-in on Weight, a
//      day's food on Fuel, the targets, a weigh-in from another device through
//      the Weight tab's own listener, and Your details saved from You's gear.
//      Each is on the screen after the next switch to You, and the reads it
//      cost are spied.
//
// Each build runs in its own child process (this file, `--child <dir>`),
// because module state is the subject and two builds in one process would
// share one document. The clock is frozen at one evening in the child, so the
// two builds read the same "today" whatever the zone and whenever it runs.
// rack-v56 is staged out of git (04e87cc), so a full clone is needed, as
// coach-volume.mjs's is.

import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const SELF = fileURLToPath(import.meta.url);
const V56 = '04e87cc';
const MARK = '@@you-reads@@';

if (process.argv[2] === '--child') {
  await child(process.argv[3]);
  process.exit(0);
}

/* ================= STAGING =================
   A whole build, every root .js file as it is, in a directory whose
   package.json makes .js a module. The one edit is store.js's three Firebase
   imports, pointed at the stub — generated from the names store.js imports, so
   a new import there cannot break this file with "does not provide an export
   named". */
const STUB_IMPL = `
const fb = () => globalThis.__fb;
export function initializeApp() { return {}; }
export function getAuth() { return { currentUser: { uid: 'u1', email: 'micah@example.com', getIdToken: async () => 'token' } }; }
export function getDatabase() { return {}; }
export function ref(_db, path) { return { path: path || '' }; }
export async function get(r) { return fb().get(r.path); }
export async function set(r, v) { return fb().set(r.path, v); }
export async function update(r, o) { return fb().update(r.path, o); }
export async function remove(r) { return fb().set(r.path, null); }
export function onValue(r, cb) { return fb().onValue(r.path, cb); }
export function onAuthStateChanged(_a, cb) { cb({ uid: 'u1', email: 'micah@example.com' }); return () => {}; }
`;
const IMPLEMENTED = [...STUB_IMPL.matchAll(/export (?:async )?function (\w+)/g)].map(m => m[1]);

function stage(tag, files, text) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-you-reads-' + tag + '-'));
  writeFileSync(join(dir, 'package.json'), '{ "type": "module" }\n');
  const storeSrc = text('store.js');
  const names = new Set();
  for (const m of storeSrc.matchAll(/import\s*\{([^}]*)\}\s*from\s*'https:[^']+'/g)) {
    m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n));
  }
  writeFileSync(join(dir, 'fb-stub.js'), STUB_IMPL +
    [...names].filter(n => !IMPLEMENTED.includes(n)).map(n => `export function ${n}() {}`).join('\n') + '\n');
  files.forEach(f => writeFileSync(join(dir, f), f === 'store.js'
    ? storeSrc.replace(/from\s*'https:\/\/www\.gstatic\.com\/firebasejs\/[^']+'/g, "from './fb-stub.js'")
    : text(f)));
  return dir;
}
const nowFiles = readdirSync(ROOT).filter(f => f.endsWith('.js'));
const nowDir = stage('now', nowFiles, f => readFileSync(join(ROOT, f), 'utf8'));
const oldFiles = execFileSync('git', ['ls-tree', '--name-only', V56], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(f => /^[\w-]+\.js$/.test(f));
const oldDir = stage('v56', oldFiles, f => execFileSync('git', ['show', V56 + ':' + f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));

function run(dir) {
  const r = spawnSync(process.execPath, [SELF, '--child', dir], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: 240000 });
  const line = (r.stdout || '').split('\n').find(l => l.startsWith(MARK));
  if (!line) throw new Error('you-reads: the child for ' + dir + ' reported nothing (exit ' + r.status + ')\n' + (r.stdout || '').slice(-2000) + (r.stderr || '').slice(-3000));
  return JSON.parse(line.slice(MARK.length));
}
const before = run(oldDir), after = run(nowDir);
// For reading a failure: YOU_READS_DUMP=1 prints what each build measured.
if (process.env.YOU_READS_DUMP) {
  const sum = x => ({ boot: x.boot.gets, renders: x.renders, tail: x.tail,
                      steps: Object.fromEntries(Object.entries(x.steps).map(([k, s]) => [k, { gets: s.gets, seen: s.seen, added: s.added }])) });
  console.log(JSON.stringify({ v56: sum(before), now: sum(after) }, null, 1));
  console.log('\n--- the screen at boot (this build) ---\n' + after.boot.text);
}

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const SEVEN = ['weight/entries', 'food/targets', 'food/daySummaries', 'steps', 'profile', 'settings/steps', 'settings/water'];
const same = (a, b) => J(a.slice().sort()) === J(b.slice().sort());
// You's own reads are the seven. Anything else a step reads is somebody else's
// — the weight model reads a new weigh-in day's food and water once, Coach its
// own — and the check on those is that both builds read exactly the same.
const mine = g => g.filter(p => SEVEN.includes(p)), others = g => g.filter(p => !SEVEN.includes(p));
// The first line two texts part at, for a failure's detail.
const parting = (a, b) => {
  const x = a.split('\n'), y = b.split('\n');
  const i = x.findIndex((l, k) => l !== y[k]);
  return i < 0 ? (x.length === y.length ? 'the same' : 'lengths ' + x.length + ' / ' + y.length) : 'line ' + i + ': ' + J(x[i]) + ' / ' + J(y[i]);
};

/* ================= A. THE COUNT ================= */
section('A. the count — rack-v56 measured, this build pinned, with a spy on every get()');
{
  const perB = before.renders.map(r => r.length), perA = after.renders.map(r => r.length);
  const times = (g, n) => g.filter(p => p === n).length;
  check('the instrument sees the boot: ' + before.boot.gets.length + ' reads to open You in rack-v56, ' + after.boot.gets.length + ' in this build',
        before.boot.gets.length > 20 && after.boot.gets.length > 20);
  // Coach's own boot snapshot (coach-data.js, once per open) reads four of the
  // seven too; that is the same in both builds, and not You's.
  check('rack-v56’s boot read each of the seven once more than this build’s: refreshLogged()’s first round, taken as the baseline and thrown away — ' +
        J(SEVEN.map(n => times(before.boot.gets, n))) + ' against ' + J(SEVEN.map(n => times(after.boot.gets, n))),
        SEVEN.every(n => times(before.boot.gets, n) - times(after.boot.gets, n) === 1), J(SEVEN.map(n => [times(before.boot.gets, n), times(after.boot.gets, n)])));
  check('so this build’s boot is You’s one read of each, and Coach’s snapshot beside it, unchanged',
        before.boot.gets.length - after.boot.gets.length === 7, before.boot.gets.length + ' / ' + after.boot.gets.length);
  check('and every other boot read is rack-v56’s, one for one — nothing added, nothing taken away', same(others(before.boot.gets), others(after.boot.gets)),
        J({ v56: others(before.boot.gets), now: others(after.boot.gets) }));
  check('MEASURED, rack-v56: ' + J(perB) + ' GETs on each of three switches to You — the seven, every time',
        perB.every(n => n === 7) && before.renders.every(r => same(r, SEVEN)), J(before.renders));
  check('PINNED, this build: ' + J(perA) + ' — a switch to You with nothing changed reads nothing',
        perA.every(n => n === 0), J(after.renders));
  check('and after every change below has landed, three more switches read nothing either: ' + J(after.tail.map(r => r.length)),
        after.tail.every(r => r.length === 0), J(after.tail));
  check('rack-v56 read the seven on those too: ' + J(before.tail.map(r => r.length)), before.tail.every(r => r.length === 7), J(before.tail));
}

/* ================= B. THE SCREEN IS THE SAME ================= */
section('B. the same fixture, both builds — the You tab says the same thing, line for line');
{
  check('the screen has something on it to compare: ' + after.boot.text.split('\n').length + ' lines, the name, Coach, the trend and the targets among them',
        after.boot.text.split('\n').length > 100 && ['Micah', 'COACH', 'Trend today', 'Against your targets', 'Weekly review'].every(s => after.boot.text.includes(s)),
        after.boot.text.slice(0, 400));
  check('at boot, once every load has landed', before.boot.text === after.boot.text, parting(before.boot.text, after.boot.text));
  check('after three switches to the tab', before.afterRenders === after.afterRenders, parting(before.afterRenders, after.afterRenders));
  ['weigh', 'food', 'targets', 'remote'].forEach(k =>
    check('after ' + after.steps[k].what, before.steps[k].text === after.steps[k].text, parting(before.steps[k].text, after.steps[k].text)));
}

/* ================= C. A WRITE ELSEWHERE STILL SHOWS ================= */
section('C. a write elsewhere is on You at the next switch to it, no reload — and what each cost');
{
  const S = after.steps, O = before.steps;
  // Seen: the screen moved — the lines it gained are listed — and part B holds
  // it to rack-v56's screen after the same change, line for line.
  const cost = (k, want) => check(S[k].what + ': on screen (' + J(S[k].added.slice(0, 3)) + '…) for ' + J(mine(S[k].gets)) + ' — rack-v56 read ' + mine(O[k].gets).length,
                                  S[k].added.length > 0 && same(mine(S[k].gets), want) && same(others(S[k].gets), others(O[k].gets)),
                                  J({ now: S[k].gets, v56: O[k].gets, added: S[k].added }));
  // The Weight tab keeps a live listener on weight/entries (weight.js, food.js),
  // and it delivers the node whole: You takes it from there and reads nothing.
  cost('weigh', []);
  cost('food', ['food/daySummaries']);
  cost('targets', ['food/targets']);
  cost('remote', []);
  check('each of those moved rack-v56’s screen too, and it read the seven twice for each — once for the switch, once for the repaint that followed: ' +
        J(['weigh', 'food', 'targets', 'remote'].map(k => mine(O[k].gets).length)),
        ['weigh', 'food', 'targets', 'remote'].every(k => O[k].added.length > 0 && mine(O[k].gets).length === 14),
        J(['weigh', 'food', 'targets', 'remote'].map(k => [O[k].added.length, mine(O[k].gets).length])));
  // Your details from You's gear: the sheet reads the profile itself
  // (readExact, before its form), and then You re-reads the one node it saved.
  check(S.details.what + ': "' + S.details.shows + '" on screen, for the sheet’s own read and You’s one — ' + J(S.details.gets),
        S.details.seen && J(S.details.gets) === J(['profile', 'profile']), J(S.details));
  check('THE ONE LINE THAT DIFFERS, on purpose: rack-v56 never showed it. Its callback emptied the fingerprint, so the seven it read were taken as the boot values and thrown away',
        O.details.seen === false && O.details.added.length === 0 && mine(O.details.gets).length === 8 && S.details.text.includes('Jordan'),
        J({ v56seen: O.details.seen, v56gets: O.details.gets }));
  // The name, and the avatar's initial.
  const cut = a => a.split('\n').filter(l => !/^(Micah|Jordan|M|J)$/.test(l)).join('\n');
  check('and that name is the only thing between the two screens after it', cut(O.details.text) === cut(S.details.text), parting(cut(O.details.text), cut(S.details.text)));
}

/* ================= D. THE CODE SAYS SO ================= */
section('D. the mechanism — one change feed in store.js, and You reads only what it names');
{
  const Y = readFileSync(join(ROOT, 'you.js'), 'utf8'), ST = readFileSync(join(ROOT, 'store.js'), 'utf8');
  check('store.js exports onChange(), and write(), watch(), mergeUpdate(), the queue and a retried refusal each tell it', /export function onChange\(/.test(ST) &&
        (ST.match(/\bchanged\(/g) || []).length >= 6, String((ST.match(/\bchanged\(/g) || []).length));
  check('you.js subscribes once, at load, and refreshLogged() reads only the nodes that changed',
        (Y.match(/^onChange\(/gm) || []).length === 1 && /Promise\.all\(want\.map\(n => read\(n, null\)\)\)/.test(Y) && !/liveFp/.test(Y));
  check('no callback throws a refresh away any more: the four settings callbacks repaint, and the repaint reads what changed',
        !/liveFp = ''/.test(Y) && Y.includes('pickProfilePhoto(() => render())') && (Y.match(/openSettings\(\(\) => render\(\)\)/g) || []).length === 2 &&
        Y.includes('const back = () => render();') && /refreshSessions\(\);\s*\n\}/.test(Y));
}

console.log('\nthe You tab reads once per open, and after that only what changed\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);

/* ================================================================
   THE CHILD — one build, booted, driven and read.
   ================================================================ */
async function child(dir) {
  /* ---------- the clock, frozen at one evening ---------- */
  const RealDate = Date;
  const NOW = new RealDate(2026, 8, 25, 18, 30, 0, 0).getTime();
  class FrozenDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(NOW); }
    static now() { return NOW; }
  }
  globalThis.Date = FrozenDate;
  const DAY = 864e5;
  const at = (ago, h, m = 0) => { const d = new RealDate(NOW); d.setDate(d.getDate() - ago); d.setHours(h, m, 0, 0); return d.getTime(); };
  const key = ms => { const d = new RealDate(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const r1 = x => Math.round(x * 10) / 10;

  /* ---------- the fake browser ---------- */
  const ls = new Map();
  globalThis.localStorage = {
    getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k),
    key: i => Array.from(ls.keys())[i] ?? null, clear: () => ls.clear(), get length() { return ls.size; }
  };
  globalThis.sessionStorage = globalThis.localStorage;
  const walk = (n, out = []) => { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; };
  function simple(n, s) {
    const m = /^([a-z0-9-]+|\*)?((?:[#.][\w-]+|\[[^\]]+\])*)$/i.exec(s);
    if (!m || n.tag.startsWith('#')) return false;
    if (m[1] && m[1] !== '*' && n.tag !== m[1].toLowerCase()) return false;
    for (const part of (m[2].match(/[#.][\w-]+|\[[^\]]+\]/g) || [])) {
      if (part[0] === '#' && n.id !== part.slice(1)) return false;
      if (part[0] === '.' && !n._cls.includes(part.slice(1))) return false;
      if (part[0] === '[') {
        const [k, v] = part.slice(1, -1).split('=');
        const name = k.trim(), dk = name.startsWith('data-') ? name.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase()) : null;
        const got = dk && dk in n.dataset ? n.dataset[dk] : name in n.attrs ? n.attrs[name] : undefined;
        if (got === undefined) return false;
        if (v != null && String(got) !== v.replace(/^["']|["']$/g, '')) return false;
      }
    }
    return true;
  }
  function matches(n, sel) {
    return sel.split(',').some(s => {
      const parts = s.trim().split(/\s+/);
      if (!simple(n, parts[parts.length - 1])) return false;
      let a = n.parentNode;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (a && !simple(a, parts[i])) a = a.parentNode;
        if (!a) return false;
        a = a.parentNode;
      }
      return true;
    });
  }
  class El {
    constructor(tag, text) {
      this.tag = String(tag || 'div').toLowerCase(); this.tagName = this.tag.toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1;
      this.children = []; this.parentNode = null; this._text = text == null ? '' : String(text); this._html = '';
      this.attrs = {}; this.dataset = {}; this._cls = []; this._id = ''; this.value = ''; this.type = ''; this.hidden = false; this.disabled = false;
      const st = {};
      this.style = new Proxy(st, {
        get: (o, k) => (k === 'setProperty' ? (p, v) => { o[p] = v; } : k === 'removeProperty' ? p => { delete o[p]; } : k === 'getPropertyValue' ? p => o[p] || '' : k in o ? o[k] : ''),
        set: (o, k, v) => { o[k] = v; return true; }
      });
    }
    get id() { return this._id; } set id(v) { this._id = String(v); }
    get className() { return this._cls.join(' '); } set className(v) { this._cls = String(v || '').split(/\s+/).filter(Boolean); }
    get classList() {
      const n = this;
      return { add: (...c) => c.forEach(x => { if (!n._cls.includes(x)) n._cls.push(x); }), remove: (...c) => { n._cls = n._cls.filter(x => !c.includes(x)); },
               toggle: (c, f) => { const has = n._cls.includes(c), want = f === undefined ? !has : !!f; if (want && !has) n._cls.push(c); if (!want && has) n._cls = n._cls.filter(x => x !== c); return want; },
               contains: c => n._cls.includes(c) };
    }
    get textContent() { return this.children.length ? this.children.map(c => c.textContent).join('') : this._text; }
    set textContent(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = v == null ? '' : String(v); this._html = ''; }
    get innerText() { return this.textContent; } set innerText(v) { this.textContent = v; }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = ''; this._html = v == null ? '' : String(v); }
    get firstChild() { return this.children[0] || null; } get lastChild() { return this.children[this.children.length - 1] || null; }
    get firstElementChild() { return this.firstChild; } get lastElementChild() { return this.lastChild; }
    get childNodes() { return this.children; } get parentElement() { return this.parentNode; } get isConnected() { return true; }
    get nextSibling() { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) + 1] || null : null; }
    get previousSibling() { const p = this.parentNode; return p ? p.children[p.children.indexOf(this) - 1] || null : null; }
    get nextElementSibling() { return this.nextSibling; } get previousElementSibling() { return this.previousSibling; }
    appendChild(c) {
      if (c == null) return c;
      if (c.tag === '#fragment') { c.children.slice().forEach(x => this.appendChild(x)); return c; }
      if (c.parentNode) c.remove();
      c.parentNode = this; this.children.push(c); return c;
    }
    append(...cs) { cs.forEach(c => this.appendChild(typeof c === 'string' ? new El('#text', c) : c)); }
    prepend(...cs) { cs.slice().reverse().forEach(c => this.insertBefore(typeof c === 'string' ? new El('#text', c) : c, this.firstChild)); }
    insertBefore(c, ref) {
      if (!ref) return this.appendChild(c);
      if (c.parentNode) c.remove();
      c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c;
    }
    before(...cs) { const p = this.parentNode; if (p) cs.forEach(c => p.insertBefore(typeof c === 'string' ? new El('#text', c) : c, this)); }
    after(...cs) { const p = this.parentNode; if (p) cs.slice().reverse().forEach(c => p.insertBefore(typeof c === 'string' ? new El('#text', c) : c, this.nextSibling)); }
    removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
    replaceChildren(...cs) { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = ''; this._html = ''; this.append(...cs); }
    replaceWith(n) { const p = this.parentNode; if (!p) return; p.insertBefore(n, this); this.remove(); }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = v; if (k === 'class') this.className = v; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; } hasAttribute(k) { return k in this.attrs; }
    toggleAttribute(k, f) { const want = f === undefined ? !(k in this.attrs) : !!f; if (want) this.attrs[k] = ''; else delete this.attrs[k]; return want; }
    addEventListener() {} removeEventListener() {} dispatchEvent() { return true; }
    focus() {} blur() {} select() {} scrollIntoView() {} scrollTo() {} setSelectionRange() {}
    click() { if (this.onclick) return this.onclick({ target: this, currentTarget: this, preventDefault() {}, stopPropagation() {} }); }
    getBoundingClientRect() { return { top: 0, left: 0, right: 390, bottom: 0, width: 390, height: 0, x: 0, y: 0 }; }
    get offsetWidth() { return 390; } get offsetHeight() { return 0; } get clientWidth() { return 390; } get clientHeight() { return 0; } get scrollHeight() { return 0; }
    matches(sel) { return matches(this, sel); }
    closest(sel) { for (let n = this; n; n = n.parentNode) if (matches(n, sel)) return n; return null; }
    querySelectorAll(sel) { return walk(this).filter(n => matches(n, sel)); }
    querySelector(sel) { return walk(this).find(n => matches(n, sel)) || null; }
    contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; }
    cloneNode(deep) { const c = new El(this.tag, this._text); c.className = this.className; c._html = this._html; Object.assign(c.attrs, this.attrs); if (deep) this.children.forEach(x => c.appendChild(x.cloneNode(true))); return c; }
  }
  const html = new El('html'), head = new El('head'), body = new El('body');
  html.append(head, body);
  const view = new El('section'); view.id = 'view-you'; view.className = 'view active'; body.appendChild(view);
  globalThis.document = {
    documentElement: html, head, body, readyState: 'complete', visibilityState: 'visible', hidden: false, activeElement: null, cookie: '',
    createElement: t => new El(t), createElementNS: (_ns, t) => new El(t), createTextNode: t => new El('#text', t),
    createDocumentFragment: () => new El('#fragment'),
    getElementById: id => walk(html).find(n => n.id === id) || null,
    querySelector: sel => html.querySelector(sel), querySelectorAll: sel => html.querySelectorAll(sel),
    addEventListener() {}, removeEventListener() {}
  };
  const mq = () => ({ matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.window = globalThis;
  Object.assign(globalThis, {
    scrollY: 0, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, isSecureContext: false,
    scrollTo() {}, addEventListener() {}, removeEventListener() {}, matchMedia: mq,
    requestAnimationFrame: cb => setTimeout(() => cb(0), 0), cancelAnimationFrame: t => clearTimeout(t),
    location: { href: 'https://example.test/', hash: '', search: '', pathname: '/', origin: 'https://example.test', reload() {}, replace() {} },
    history: { replaceState() {}, pushState() {} },
    Image: class { set src(v) { this._src = v; if (this.onload) setTimeout(() => this.onload(), 0); } get src() { return this._src; } }
  });
  try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, standalone: false, userAgent: 'node', platform: 'MacIntel', maxTouchPoints: 0, language: 'en-US' }, configurable: true, writable: true }); } catch {}

  /* ---------- the fake database: a real tree, and a spy on get() ---------- */
  const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const tree = {};
  const segs = p => String(p || '').split('/').filter(Boolean);
  const getAt = p => { let n = tree; for (const s of segs(p)) { if (n == null || typeof n !== 'object' || !(s in n)) return undefined; n = n[s]; } return n; };
  const setAt = (p, v) => {
    const ss = segs(p);
    if (!ss.length) return;
    let n = tree;
    for (let i = 0; i < ss.length - 1; i++) { if (n[ss[i]] == null || typeof n[ss[i]] !== 'object') n[ss[i]] = {}; n = n[ss[i]]; }
    if (v === null || v === undefined) delete n[ss[ss.length - 1]]; else n[ss[ss.length - 1]] = clone(v);
  };
  const snap = v => ({ exists: () => v !== undefined && v !== null, val: () => clone(v) });
  const gets = [], listeners = [];
  const U = 'users/u1/';
  // A listener sees a change at, under or over its own path, as Firebase's do.
  const touch = p => listeners.filter(l => l.on && (l.path === p || p.startsWith(l.path + '/') || l.path.startsWith(p + '/')))
    .forEach(l => setTimeout(() => { if (l.on) l.cb(snap(getAt(l.path))); }, 0));
  globalThis.__fb = {
    async get(p) { gets.push(p.startsWith(U) ? p.slice(U.length) : p); return snap(getAt(p)); },
    async set(p, v) { setAt(p, v); touch(p); },
    async update(p, o) { Object.keys(o).forEach(k => { setAt(p ? p + '/' + k : k, o[k]); touch(p ? p + '/' + k : k); }); },
    onValue(p, cb) { const l = { path: p, cb, on: true }; listeners.push(l); setTimeout(() => { if (l.on) cb(snap(getAt(p))); }, 0); return () => { l.on = false; }; }
  };

  /* ---------- the fixture: an account six weeks into a bulk ---------- */
  const put = (p, v) => setAt(U + p, v);
  put('profile', { name: 'Micah', email: 'micah@example.com', sex: 'm', heightIn: 71, birthYear: 1994, createdAt: at(200, 9) });
  put('onboarding', { done: true, tourDone: true, at: at(200, 9), version: 1 });
  put('settings/units', { weight: 'lb', height: 'in' });
  put('food/targets', { cal: 3470, p: 200, f: 70, maint: null, auto: { on: true, rateWk: 0.5, pPerLb: 1, fPerLb: 0.35, floor: 0, lastAdj: at(3, 8) } });
  const sums = {};
  for (let d = 1; d <= 42; d++) sums[key(at(d, 12))] = { cal: 3150 + (d * 37) % 320, p: 185 + d % 25, c: 360 + d % 60, f: 68 + d % 12 };
  put('food/daySummaries', sums);
  const ents = {};
  for (let d = 0; d <= 45; d++) {
    ents['wt' + d + 'a'] = { lb: r1(189.4 + (45 - d) * 0.045 + ((d * 7) % 10) / 25), t: at(d, 7, 10) };
    if (d % 3 === 0) ents['wt' + d + 'b'] = { lb: r1(190.8 + (45 - d) * 0.045 + ((d * 3) % 10) / 25), t: at(d, 21, 40) };
  }
  put('weight/entries', ents);
  put('settings/steps', { goal: 9000 });
  const steps = {};
  for (let d = 0; d <= 20; d++) steps[key(at(d, 21))] = { steps: 6800 + (d * 613) % 5200, mi: r1((6800 + (d * 613) % 5200) / 2100), t: at(d, 21), src: 'manual' };
  put('steps', steps);
  put('settings/water', { goalMl: 3500, unit: 'floz', presets: null });
  for (let d = 0; d <= 16; d++) put('water/log/' + key(at(d, 9)), { ['wa' + d + 'a']: { ml: 500, t: at(d, 9), src: 'tap' }, ['wa' + d + 'b']: { ml: 750 + (d % 3) * 250, t: at(d, 15), src: 'tap' } });
  const lift = (exId, name, group, w, r) => ({ exId, name, group, equipment: 'barbell', sets: [0, 1, 2].map(() => ({ w: String(w), r: String(r), type: 'N', done: true })) });
  for (let i = 0; i < 16; i++) {
    const t0 = at(1 + i * 3, 18), d = new RealDate(t0), p = n => String(n).padStart(2, '0');
    const mk = d.getFullYear() + '-' + p(d.getMonth() + 1), dd = p(d.getDate()), id = 'wm' + i;
    const exs = i % 2 ? [lift('back-squat-high-bar', 'Back Squat (High Bar)', 'legs', 265 + i, 5), lift('barbell-row', 'Barbell Row', 'back', 175, 8)]
                      : [lift('barbell-bench-press', 'Barbell Bench Press', 'chest', 205 + i, 6), lift('overhead-press', 'Overhead Press', 'shoulders', 125, 6)];
    put('workouts/' + mk + '/' + dd + '/' + id, { id, name: i % 2 ? 'Legs' : 'Push', startedAt: t0, endedAt: t0 + 3600e3, durationSec: 3600,
      volume: exs.reduce((s, e) => s + e.sets.reduce((a, x) => a + x.w * x.r, 0), 0), groups: [...new Set(exs.map(e => e.group))], exercises: exs });
  }
  put('settings/coach', { v: 1 });

  /* ---------- boot, as app.js does it ---------- */
  const imp = f => import(pathToFileURL(join(dir, f)).href);
  const store = await imp('store.js');
  const you = await imp('you.js');
  const settle = async () => { for (let i = 0; i < 80; i++) await new Promise(r => setTimeout(r, 0)); };
  const text = () => walk(view).map(n => (n.children.length ? '' : n._text) + (n._html ? '[html]' + n._html : '')).filter(s => s.trim()).join('\n');
  const since = k => gets.slice(k);
  store.watchAuth(() => {});
  store.online.value = true;
  await store.initUnits();
  // The Weight and Steps tabs' own listeners, opened at boot as app.js's
  // initWeight() and initSteps() open them — which is the only way a weigh-in
  // from another device reaches this one before the next open.
  store.watch('weight/entries', () => {});
  store.watch('steps', () => {});
  const k0 = gets.length;
  await you.initYou({ user: { uid: 'u1' }, go: () => {} });
  await settle();
  const out = { boot: { gets: since(k0), text: text() }, renders: [], steps: {}, tail: [] };

  const switchTo = async () => { const k = gets.length; you.render(); await settle(); return since(k); };
  for (let i = 0; i < 3; i++) out.renders.push(await switchTo());
  out.afterRenders = text();

  // What changed on the screen: the lines the step added, in order.
  const added = (pre, post) => { const was = new Set(pre.split('\n')); return post.split('\n').filter(l => !was.has(l)); };
  const step = async (name, what, act, shows) => {
    const pre = text();
    await act();
    await settle();
    const g = await switchTo();
    const t = text();
    out.steps[name] = { what, gets: g, text: t, shows, seen: t.includes(shows) && !pre.includes(shows), added: added(pre, t) };
  };
  // A weigh-in on the Weight tab — weight.js writes the node whole.
  await step('weigh', 'a weigh-in on the Weight tab', () =>
    store.write('weight/entries', { ...getAt(U + 'weight/entries'), wtNEW: { lb: 196.4, t: at(0, 18, 5) } }), '196.4');
  // A day's food corrected on Fuel — food.js writes one day's summary.
  await step('food', 'yesterday’s food, logged on Fuel', () =>
    store.write('food/daySummaries/' + key(at(1, 12)), { cal: 5200, p: 260, c: 610, f: 150 }), '5,200');
  // The targets moved from Fuel's Daily targets — written whole.
  await step('targets', 'the calorie target, moved on Fuel', () =>
    store.write('food/targets', { ...getAt(U + 'food/targets'), cal: 3620 }), '3,620');
  // A weigh-in from another device: the database moves and the Weight tab's
  // listener delivers it. Nothing on this device wrote anything.
  await step('remote', 'a weigh-in from another device, through the Weight tab’s listener', async () => {
    setAt(U + 'weight/entries/wtREMOTE', { lb: 197.2, t: at(0, 18, 20) });
    touch(U + 'weight/entries/wtREMOTE');
  }, '197.2');
  // Your details, from You's own gear: the hub, the row, the name, Save.
  {
    const k = gets.length;
    const gear = view.querySelector('.you-gear');
    gear.onclick();
    await settle();
    const row = walk(body).find(n => n._cls.includes('set-row-nav') && n.textContent.startsWith('Your details'));
    row.onclick();
    await settle();
    const sheets = body.children.filter(n => n._cls.includes('sheet'));
    const sh = sheets[sheets.length - 1];
    const nameIn = walk(sh).find(n => n.tag === 'input' && n.value === 'Micah');
    nameIn.value = 'Jordan';
    await walk(sh).find(n => n.tag === 'button' && n.textContent === 'Save').onclick();
    await settle();
    // No switch to You: this sheet opens over it, so what is behind it is what
    // he sees when it closes.
    const t = text();
    out.steps.details = { what: 'Your details, saved from You’s gear', gets: since(k), text: t, shows: 'Jordan', seen: t.includes('Jordan'), added: added(out.steps.remote.text, t) };
  }
  for (let i = 0; i < 3; i++) out.tail.push(await switchTo());
  process.stdout.write(MARK + JSON.stringify(out) + '\n');
}
