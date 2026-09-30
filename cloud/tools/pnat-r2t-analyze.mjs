// Pnat round-2 theme lens: base (build 58) and engine, each rendered under the
// SAME sentinel (one value per role name). Host by host, every leaf value that
// differs between the two renders is a site whose role changed; label each
// side with the role(s) that produce it and group the transitions.
import { readFileSync, writeFileSync } from 'node:fs';
import { labelOf } from '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/harness/tools/lib/vibe-snap.mjs';

const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/';
const BASE = DIR + 'render-base-sent.txt', ENG = DIR + 'render-engine-sent.txt';
const PASSES = ['empty', 'seeded', 'small'];
const legendOf = who => {
  const out = {};
  for (const p of PASSES) {
    const L = JSON.parse(readFileSync(DIR + 'legend-' + who + '.' + p + '.json', 'utf8'));
    for (const [k, v] of Object.entries(L)) out[String(k).toLowerCase()] = [...new Set([...(out[String(k).toLowerCase()] || []), ...v])];
  }
  return out;
};
const LB = legendOf('base'), LE = legendOf('engine');
const rgbIndex = L => {
  const o = {};
  for (const [h, names] of Object.entries(L)) if (/^#[0-9a-f]{6}$/.test(h)) {
    const n = parseInt(h.slice(1), 16); o[[(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',')] = names;
  }
  return o;
};
const RB = rgbIndex(LB), RE = rgbIndex(LE);
function label(v, L, RG) {
  if (typeof v === 'number') return L[String(v)] ? L[String(v)].join('|') : null;
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase();
  if (L[s]) return L[s].join('|');
  if (/^#[0-9a-f]{8}$/.test(s) && L[s.slice(0, 7)]) return L[s.slice(0, 7)].join('|') + '+' + s.slice(7);
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(s);
  if (m && RG[[m[1], m[2], m[3]].join(',')]) return RG[[m[1], m[2], m[3]].join(',')].join('|') + '@' + (m[4] || '1');
  if (/^(archivo|sent)_\d+$/.test(s)) return 'FACE_' + s.split('_')[1] + (s.startsWith('archivo') ? '(Archivo)' : '');
  if (s === 'sysface') return 'systemFace';
  if (s === 'sentmono') return 'face.mono';
  if (/^sb_/.test(s)) return 'chrome.' + v.slice(3);
  return null;
}
function parse(file) {
  const scenes = []; let cur = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (o && typeof o === 'object' && 'name' in o && 'errors' in o && !('t' in o)) { cur = { name: o.name, hosts: [] }; scenes.push(cur); }
    else cur.hosts.push(o);
  }
  return scenes;
}
const B = parse(BASE), E = parse(ENG);
const eMap = new Map(E.map(s => [s.name, s]));
const trans = {};   // "base -> engine" -> [sites]
const other = [];
const push = (k, v) => { (trans[k] = trans[k] || []).push(v); };
let hostsCompared = 0;
function walk(a, b, path, site) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], path ? path + '.' + k : k, site);
    return;
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const la = a === undefined ? '(none)' : label(a, LB, RB);
  const lb = b === undefined ? '(none)' : label(b, LE, RE);
  if (la && lb) {
    // Archivo_N -> SENT_N is the face following the vibe; not a change of role
    if (la.startsWith('FACE_') && lb === la.replace('(Archivo)', '')) return;
    // an alias: the engine value is produced by a set of names including the base's
    const an = la.split('@')[0].split('+')[0].split('|'), bn = lb.split('@')[0].split('+')[0].split('|');
    const sameA = (la.split('@')[1] || '') === (lb.split('@')[1] || '');
    if (sameA && an.some(n => bn.includes(n))) { push('ALIAS ' + la + ' -> ' + lb, site + ' ' + path); return; }
    push(la + ' -> ' + lb, site + ' ' + path); return;
  }
  push((la || ('LIT ' + JSON.stringify(a))) + ' -> ' + (lb || ('LIT ' + JSON.stringify(b))), site + ' ' + path);
}
for (const sb of B) {
  if (sb.name.includes('$theme')) continue;
  const se = eMap.get(sb.name);
  if (!se) { other.push('scene missing ' + sb.name); continue; }
  if (se.hosts.length !== sb.hosts.length) other.push('host count ' + sb.name + ' ' + sb.hosts.length + ' vs ' + se.hosts.length);
  for (let i = 0; i < Math.min(sb.hosts.length, se.hosts.length); i++) {
    hostsCompared++;
    const lab = labelOf(sb.hosts, i);
    walk(sb.hosts[i], se.hosts[i], '', '[' + sb.name + ' #' + i + ' ' + sb.hosts[i].t + (lab ? ' "' + String(lab).slice(0, 40) + '"' : '') + ']');
  }
}
const res = Object.fromEntries(Object.entries(trans).sort((x, y) => y[1].length - x[1].length).map(([k, v]) => [k, { n: v.length, sites: v }]));
writeFileSync(DIR + 'transitions.json', JSON.stringify({ hostsCompared, other, transitions: res }, null, 1));
console.log('hosts compared', hostsCompared, 'other', other.length);
for (const [k, v] of Object.entries(res)) console.log(String(v.n).padStart(6), k);
