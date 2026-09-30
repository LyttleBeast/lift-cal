// navy-g1-marks-s1.mjs — compare.mjs matches rows by order, so a v1 group-colour
// mark can line up against a Navy raised mark. Count, per scene and kind, the
// rows whose raw colour is each role (v1 hex vs navy hex), so a lost group
// colour shows as a count that differs.
//   node navy-g1-marks-s1.mjs <navy.json> <v1.json> <navy def> <v1 def>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [NF, VF, ND, VD] = process.argv.slice(2);
const N = (await import(pathToFileURL(ND).href)).default, V = (await import(pathToFileURL(VD).href)).default;
const norm = s => String(s || '').toLowerCase().replace(/\s/g, '');
const roleOf = (D, raw) => {
  const r = norm(raw);
  const out = [];
  for (const [k, v] of Object.entries(D.colors)) if (typeof v === 'string' && norm(v) === r) out.push(k);
  return out.length ? out.sort().join('=') : null;
};
const load = (f, D) => {
  const J = JSON.parse(readFileSync(f, 'utf8')); const m = new Map();
  const rows = [];
  if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
  if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene });
  for (const x of rows) {
    if (!/^(mark|svg-fill|svg-stroke|pseudo-fill)$/.test(x.kind)) continue;
    const role = roleOf(D, x.raw); if (!role) continue;
    if (!/(^|=)(p[A-Z]\w*|good|bad|warn|danger|done|accent|focus)(=|$)/.test(role)) continue;
    const k = x.scene + '|' + x.kind + '|' + (process.env.BYROLE ? role : 'coloured');
    m.set(k, (m.get(k) || 0) + (x.n || 1));
  }
  return m;
};
const A = load(NF, N), B = load(VF, V);
const keys = new Set([...A.keys(), ...B.keys()]);
const TRACK = /^(p(Red|Blue|Yellow|Green|White|Chrome)|good|bad|warn|danger|done|accent)/;
let diffs = 0;
for (const k of [...keys].sort()) {
  const a = A.get(k) || 0, b = B.get(k) || 0;
  if (a === b) continue;
  const role = k.split('|')[2];
  if (!TRACK.test(role) && !/(^|=)(p[A-Z]|good|bad|warn|danger|done|accent)/.test(role)) continue;
  diffs++;
  console.log('navy ' + a + ' v1 ' + b + '  ' + k);
}
console.log('coloured-role count differences: ' + diffs);
