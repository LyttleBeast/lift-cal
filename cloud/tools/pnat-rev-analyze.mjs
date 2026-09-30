// Compare the base render (build 58) with the engine's render under the
// SENTINEL vibe, host by host, and say which role each colour/face follows.
import { readFileSync, writeFileSync } from 'node:fs';
import { labelOf } from '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/sentinel/tools/lib/vibe-snap.mjs';

const BASE = process.argv[2] || '/Users/micahflunker/dev/vibes-night/proof/pnat/render-base-by-proofcopy.txt';
const SENT = process.argv[3] || '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/render-sentinel.txt';
const LEG = JSON.parse(readFileSync(process.argv[4] || '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/legend.json', 'utf8'));
const OUT = process.argv[5] || '/Users/micahflunker/dev/vibes-night/tmp/pnat-rev-theme/analysis.json';

function parse(file) {
  const scenes = [];
  let cur = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (o && typeof o === 'object' && 'name' in o && 'errors' in o && !('t' in o)) { cur = { name: o.name, hosts: [] }; scenes.push(cur); }
    else cur.hosts.push(o);
  }
  return scenes;
}
const lc = s => String(s).toLowerCase();
const legLc = Object.fromEntries(Object.entries(LEG).map(([k, v]) => [lc(k), v]));
const rgbOf = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };
const byRgb = {};
for (const [h, r] of Object.entries(LEG)) byRgb[rgbOf(h)] = r;
function roleOf(v) {
  if (typeof v !== 'string') return null;
  if (legLc[lc(v)]) return legLc[lc(v)];
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(v);
  if (m && byRgb[[m[1], m[2], m[3]].join(',')]) return byRgb[[m[1], m[2], m[3]].join(',')] + '@' + m[4];
  if (/^SENT_\d+$/.test(v)) return 'face ' + v;
  if (v === 'SENTMONO') return 'face.mono';
  if (v === 'SYSFACE_400') return 'systemFace';
  if (/^SB_/.test(v)) return 'chrome.' + v.slice(3).toLowerCase();
  return null;
}
const isColour = v => typeof v === 'string' && (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(/.test(v));

const B = parse(BASE), S = parse(SENT);
const sMap = new Map(S.map(s => [s.name, s]));
const pairs = {};         // base value -> role -> [sites]
const unthemed = {};      // colour equal in both renders (did not follow the vibe)
const archivoKept = {};   // fontFamily Archivo_* in both
const sysWrong = [];      // Archivo in base, systemFace in sentinel
const sysMissed = {};     // a Text with no fontFamily in both
const sysTaken = {};
const other = [];         // any other difference (structure etc.)
let hostCount = 0;
const push = (o, k, v) => { (o[k] = o[k] || []).push(v); };

function walk(a, b, path, site) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], path ? path + '.' + k : k, site);
    return;
  }
  if (JSON.stringify(a) === JSON.stringify(b)) {
    if (isColour(a) && a !== 'transparent') push(unthemed, a, site + ' ' + path);
    if (typeof a === 'string' && /^Archivo_/.test(a)) push(archivoKept, path.replace(/^.*\./, ''), site + ' ' + path);
    return;
  }
  const r = roleOf(b);
  if (a === undefined && r === 'systemFace') { push(sysTaken, 'added', site + ' ' + path); return; }
  if (typeof a === 'string' && /^Archivo_/.test(a) && r === 'systemFace') { sysWrong.push(site + ' ' + path); return; }
  if (r) { pairs[a] = pairs[a] || {}; push(pairs[a], r, site + ' ' + path); return; }
  other.push(site + ' ' + path + ': ' + JSON.stringify(a) + ' -> ' + JSON.stringify(b));
}

for (const sb of B) {
  const ss = sMap.get(sb.name);
  if (!ss) { other.push('scene missing: ' + sb.name); continue; }
  if (ss.hosts.length !== sb.hosts.length) other.push('host count differs: ' + sb.name + ' ' + sb.hosts.length + ' vs ' + ss.hosts.length);
  for (let i = 0; i < Math.min(sb.hosts.length, ss.hosts.length); i++) {
    hostCount++;
    const hb = sb.hosts[i], hs = ss.hosts[i];
    const lab = labelOf(sb.hosts, i);
    const site = '[' + sb.name + ' #' + i + ' ' + hb.t + (lab ? ' "' + lab + '"' : '') + ']';
    walk(hb, hs, '', site);
    // system-font Text: no fontFamily in either render
    if ((hb.t === 'Text' || hb.t === 'Animated.Text' || hb.t === 'TextInput') && hb.s && !('fontFamily' in hb.s) && hs.s && !('fontFamily' in hs.s)) push(sysMissed, hb.t, site);
  }
}

const summarise = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { n: v.length, sample: [...new Set(v)].slice(0, 400) }]));
const res = {
  hosts: hostCount,
  pairs: Object.fromEntries(Object.entries(pairs).map(([a, rs]) => [a, Object.fromEntries(Object.entries(rs).map(([r, v]) => [r, { n: v.length, sites: [...new Set(v)] }]))])),
  unthemed: summarise(unthemed), archivoKept: summarise(archivoKept), sysWrong, sysTaken: summarise(sysTaken),
  sysMissed: summarise(sysMissed), other: other.slice(0, 500), otherCount: other.length
};
writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log('hosts compared', hostCount, '; other diffs', other.length, '; sysWrong', sysWrong.length);
for (const [a, rs] of Object.entries(res.pairs)) console.log(JSON.stringify(a), '->', Object.entries(rs).map(([r, x]) => r + ' x' + x.n).join(', '));
console.log('unthemed colours:', Object.entries(res.unthemed).map(([k, v]) => k + ' x' + v.n).join(', '));
console.log('archivo kept by prop:', Object.entries(res.archivoKept).map(([k, v]) => k + ' x' + v.n).join(', '));
console.log('system-font Text with no face in either:', Object.entries(res.sysMissed).map(([k, v]) => k + ' x' + v.n).join(', '));
console.log('systemFace added at:', res.sysTaken.added ? res.sysTaken.added.n : 0);
