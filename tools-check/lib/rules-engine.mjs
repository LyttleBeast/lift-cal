// A model of the Firebase Realtime Database security rules, for verifiers
// (rack-v67, the Friends change).
//
// WHY THIS EXISTS. database.rules.json is a copy: Micah pastes it into the
// Firebase console and nothing in this repo can run it. Until v67 every rule
// in it guarded one account's own data, and "does the rule say what the app
// needs" was a question a verifier could answer by reading the JSON. The
// Friends rules are different in kind: they decide what one account may read
// of ANOTHER's, through multi-path updates checked against the database as it
// will be after the write. Reading the text does not answer that. Running it
// does — so this file runs it, against an in-memory database, and the
// verifiers drive the REAL rules file through it. No rule is copied in here.
//
// WHAT IT MODELS, and each is the documented behaviour of RTDB rules:
//
//   - The rule tree is walked by key: a literal child wins, otherwise the
//     level's one `$wildcard`, whose name is then bound as a variable.
//   - READ at a path is allowed when any `.read` on the way from the root to
//     that path is true. Rules only grant: a `false` blocks nothing below it,
//     and a grant deeper down never grants its parent (no partial reads).
//   - WRITE: a set() or a multi-path update() is one atomic operation. Every
//     location written needs a true `.write` at that location or above it,
//     evaluated with `data` (before), `newData` (after the WHOLE operation —
//     every path in it), `root` (before) and `now`.
//   - VALIDATE runs only after the writes are granted, on every node of the
//     new data at and below each written location, and on that location's
//     ancestors, and only where the new value is not null: a delete is never
//     validated. `.validate` does not cascade — each level must pass its own.
//   - A child with no rule node at all is not validated (which is why the
//     rules end their objects in "$other": { ".validate": false }).
//   - An expression that throws (a method on null, child() of a non-string)
//     is false, as RTDB treats an error.
//   - Values are stored as RTDB stores them: no nulls and no empty objects
//     (a write of {} or null deletes), arrays become index-keyed objects, and
//     { ".sv": "timestamp" } becomes `now` — so `newData.val() === now` holds
//     exactly for a server timestamp, as the console documents it.
//   - Overlapping paths in one update() are refused, as the SDK refuses them.
//
// WHAT IT CANNOT PROVE. This is a model. The expressions are evaluated as
// JavaScript, which agrees with the rules language on everything these rules
// use (===, !==, &&, ||, !, +, <, >, the snapshot methods, and the string
// methods matches / beginsWith / contains / length, added below), but it is
// not Google's evaluator. The console's Rules Playground is the check of the
// real thing; DEPLOY.md lists the cases to try there.
//
// Pure: no I/O. The verifier reads the rules file and hands the JSON in.

/* ---------- the rules language's string methods ---------- */
// RTDB strings have these; JavaScript's do not. Defined non-enumerable, once.
for (const [k, fn] of Object.entries({
  beginsWith(s) { return String(this).startsWith(s); },
  contains(s) { return String(this).includes(s); },
  matches(re) { if (!(re instanceof RegExp)) throw new Error('matches() needs a regex'); return re.test(String(this)); }
})) {
  if (!Object.prototype.hasOwnProperty.call(String.prototype, k)) {
    Object.defineProperty(String.prototype, k, { value: fn, configurable: true, writable: true, enumerable: false });
  }
}

const TS = '.sv';
const split = p => String(p || '').split('/').filter(Boolean);
const isObj = v => v !== null && typeof v === 'object';
const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

/* A value as RTDB would store it. Throws on what the SDK refuses: an
   undefined, a NaN, a key with a forbidden character. */
function normalize(v, now) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) v = Object.fromEntries(v.map((x, i) => [String(i), x]));
  if (isObj(v)) {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === TS) {
      if (v[TS] !== 'timestamp') throw new Error('unknown server value');
      return now;
    }
    const out = {};
    for (const k of keys) {
      if (!k || /[.#$\[\]\/]/.test(k)) throw new Error('invalid key ' + JSON.stringify(k));
      const c = normalize(v[k], now);
      if (c !== null) out[k] = c;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('not a finite number'); return v; }
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  throw new Error('unstorable ' + typeof v);
}

function nodeAt(tree, segs) {
  let n = tree;
  for (const k of segs) {
    if (!isObj(n) || !Object.prototype.hasOwnProperty.call(n, k)) return null;
    n = n[k];
  }
  return n === undefined ? null : n;
}

// The tree with `value` at `segs`, empties pruned on the way back up.
function withValue(tree, segs, value) {
  if (!segs.length) return value;
  const base = isObj(tree) ? { ...tree } : {};
  const [k, ...rest] = segs;
  const child = withValue(Object.prototype.hasOwnProperty.call(base, k) ? base[k] : null, rest, value);
  if (child === null) delete base[k]; else base[k] = child;
  return Object.keys(base).length ? base : null;
}

/* ---------- snapshots ---------- */
class Snap {
  constructor(tree, segs) { this._t = tree; this._p = segs; }
  _n() { return nodeAt(this._t, this._p); }
  val() { return clone(this._n()); }
  child(p) {
    if (typeof p !== 'string') throw new Error('child() of a non-string');
    return new Snap(this._t, [...this._p, ...split(p)]);
  }
  parent() { if (!this._p.length) throw new Error('parent() of the root'); return new Snap(this._t, this._p.slice(0, -1)); }
  exists() { return this._n() !== null; }
  hasChild(p) { return this.child(p).exists(); }
  hasChildren(list) {
    const n = this._n();
    if (!isObj(n)) return false;
    if (list === undefined) return Object.keys(n).length > 0;
    return list.every(k => this.child(k).exists());
  }
  isNumber() { return typeof this._n() === 'number'; }
  isString() { return typeof this._n() === 'string'; }
  isBoolean() { return typeof this._n() === 'boolean'; }
  getPriority() { return null; }
}

/* ---------- expressions ---------- */
const compiled = new Map();
function evalRule(rule, ctx) {
  if (typeof rule === 'boolean') return rule;
  if (typeof rule !== 'string') return false;
  const names = Object.keys(ctx.vars);
  const key = names.join(',') + '|' + rule;
  let fn = compiled.get(key);
  if (!fn) {
    // `$uid` and the rest are legal JavaScript identifiers, so the rule's own
    // text is the function body.
    fn = new Function('auth', 'root', 'data', 'newData', 'now', ...names, '"use strict"; return (' + rule + ');');
    compiled.set(key, fn);
  }
  try {
    return fn(ctx.auth, ctx.root, ctx.data, ctx.newData, ctx.now, ...names.map(n => ctx.vars[n])) === true;
  } catch {
    return false;
  }
}

// One level down the rule tree: the literal key, else the level's wildcard.
function descend(node, key, vars) {
  if (!isObj(node)) return null;
  if (Object.prototype.hasOwnProperty.call(node, key) && !key.startsWith('.') && !key.startsWith('$')) return node[key];
  const wild = Object.keys(node).find(k => k.startsWith('$'));
  if (!wild) return null;
  vars[wild] = key;
  return node[wild];
}

/* ---------- the database ---------- */
export function createDb(rulesJson, opts = {}) {
  const RULES = rulesJson && rulesJson.rules;
  if (!isObj(RULES)) throw new Error('not a rules file');
  let tree = normalize(opts.data || null, 0);
  let now = typeof opts.now === 'number' ? opts.now : 1790000000000;
  const log = [];

  function canRead(auth, path) {
    const segs = split(path);
    let node = RULES;
    const vars = {};
    for (let i = 0; ; i++) {
      if (isObj(node) && '.read' in node &&
          evalRule(node['.read'], { auth, root: new Snap(tree, []), data: new Snap(tree, segs.slice(0, i)), newData: undefined, now, vars: { ...vars } })) {
        return { ok: true, at: '/' + segs.slice(0, i).join('/') };
      }
      if (i === segs.length) break;
      node = descend(node, segs[i], vars);
      if (!node) break;
    }
    return { ok: false, why: 'no .read grants /' + segs.join('/') };
  }

  function validateDown(ruleNode, segs, vars, next, auth, fails) {
    const nd = new Snap(next, segs);
    if (!nd.exists()) return;
    if (isObj(ruleNode) && '.validate' in ruleNode &&
        !evalRule(ruleNode['.validate'], { auth, root: new Snap(tree, []), data: new Snap(tree, segs), newData: nd, now, vars: { ...vars } })) {
      fails.push('.validate at /' + segs.join('/'));
    }
    const v = nd.val();
    if (!isObj(v)) return;
    for (const k of Object.keys(v)) {
      const cv = { ...vars };
      const cr = descend(ruleNode, k, cv);
      if (cr) validateDown(cr, [...segs, k], cv, next, auth, fails);
    }
  }

  // writes: [[path, value], ...] as ONE atomic operation.
  function tryWrite(auth, writes) {
    const locs = writes.map(([p, v]) => [split(p), v]);
    for (let i = 0; i < locs.length; i++) for (let j = 0; j < locs.length; j++) {
      if (i === j) continue;
      const a = locs[i][0], b = locs[j][0];
      if (a.length <= b.length && a.every((k, n) => b[n] === k)) return { ok: false, why: 'overlapping paths in one update: /' + a.join('/') + ' and /' + b.join('/') };
    }
    let next = tree;
    try {
      for (const [segs, v] of locs) next = withValue(next, segs, normalize(v, now));
    } catch (e) {
      return { ok: false, why: 'the SDK would refuse this value: ' + e.message };
    }
    const fails = [];
    for (const [segs] of locs) {
      // .write: anywhere from the root down to the location itself.
      let node = RULES, granted = false;
      const vars = {};
      for (let i = 0; ; i++) {
        if (isObj(node) && '.write' in node &&
            evalRule(node['.write'], { auth, root: new Snap(tree, []), data: new Snap(tree, segs.slice(0, i)), newData: new Snap(next, segs.slice(0, i)), now, vars: { ...vars } })) {
          granted = true; break;
        }
        if (i === segs.length) break;
        node = descend(node, segs[i], vars);
        if (!node) break;
      }
      if (!granted) fails.push('no .write grants /' + segs.join('/'));
    }
    if (fails.length) return { ok: false, why: fails.join('; ') };
    for (const [segs] of locs) {
      // .validate: the location's ancestors, then the location and below.
      let node = RULES;
      const vars = {};
      for (let i = 0; i < segs.length; i++) {
        const nd = new Snap(next, segs.slice(0, i));
        if (i > 0 && isObj(node) && '.validate' in node && nd.exists() &&
            !evalRule(node['.validate'], { auth, root: new Snap(tree, []), data: new Snap(tree, segs.slice(0, i)), newData: nd, now, vars: { ...vars } })) {
          fails.push('.validate at /' + segs.slice(0, i).join('/'));
        }
        node = descend(node, segs[i], vars);
        if (!node) break;
      }
      if (node) validateDown(node, segs, vars, next, auth, fails);
    }
    if (fails.length) return { ok: false, why: [...new Set(fails)].join('; ') };
    tree = next;
    return { ok: true };
  }

  /* A client signed in as `auth` ({ uid } or null). Every call answers
     { ok, why?, value? } and never throws, so a verifier can assert either
     way. `update(base, obj)` is the SDK's multi-path update at `base`. */
  function client(auth) {
    const record = (op, path, res) => { log.push({ who: auth ? auth.uid : null, op, path, ok: res.ok, why: res.why }); return res; };
    return {
      auth,
      get(path) {
        const r = canRead(auth, path);
        return record('get', path, r.ok ? { ok: true, value: clone(nodeAt(tree, split(path))) } : r);
      },
      set(path, value) { return record('set', path, tryWrite(auth, [[path, value]])); },
      remove(path) { return record('remove', path, tryWrite(auth, [[path, null]])); },
      update(base, obj) {
        const b = split(base).join('/');
        const writes = Object.entries(obj || {}).map(([k, v]) => [(b ? b + '/' : '') + k, v]);
        return record('update', base + ' ' + Object.keys(obj || {}).join(','), tryWrite(auth, writes));
      }
    };
  }

  return {
    client,
    // Seeding and inspection, with no rules applied.
    poke(path, value) { tree = withValue(tree, split(path), normalize(value, now)); },
    peek(path) { return clone(nodeAt(tree, split(path))); },
    get now() { return now; },
    setNow(t) { now = t; },
    log
  };
}

export const SERVER_TIMESTAMP = Object.freeze({ '.sv': 'timestamp' });
