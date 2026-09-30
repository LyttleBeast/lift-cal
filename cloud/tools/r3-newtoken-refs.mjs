// r3: every var(--name) the BASE tree's shipped files reference (JS, HTML, CSS),
// checked against base's :root and engine's :root. A name base references but
// does not define, which the engine now defines, changes value on the engine
// even though the referencing text did not change.
import fs from 'node:fs';
import path from 'node:path';
import { load, rootMap } from './r3css-lib.mjs';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine';
const bRoot = new Map([...rootMap(load(BASE + '/rack.css')), ...rootMap(load(BASE + '/auth.css'))]);
const eRoot = new Map([...rootMap(load(ENG + '/rack.css')), ...rootMap(load(ENG + '/auth.css'))]);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tools-check' || e.name === 'report') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(js|html|css|json)$/.test(e.name)) out.push(p);
  }
  return out;
}
for (const [label, root, defs, other] of [['BASE', BASE, bRoot, eRoot], ['ENGINE', ENG, eRoot, bRoot]]) {
  const refs = new Map();
  for (const f of walk(root)) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      const k = m[1];
      if (!refs.has(k)) refs.set(k, new Set());
      refs.get(k).add(path.relative(root, f) + ':' + (t.slice(0, m.index).split('\n').length));
    }
  }
  const undef = [...refs.keys()].filter(k => !defs.has(k));
  console.log(label, 'distinct var() names', refs.size, '; not defined in its own :root:', undef.map(k => k + ' ' + (other.has(k) ? '(DEFINED ON THE OTHER SIDE)' : '') + ' @ ' + [...refs.get(k)].slice(0, 6).join(', ')));
}
