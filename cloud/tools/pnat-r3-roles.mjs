// Round-3 theme lens: the same 213 scenes drawn in v1 and in the sentinel vibe,
// host by host. Every colour a host carries in the sentinel render is decoded
// to the role it came from; a v1 colour that survives into the sentinel render
// is a site that does not follow the vibe at all.
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent';
const MAP = JSON.parse(readFileSync(DIR + '/sentinel-map.json', 'utf8'));
const parse = f => {
  const scenes = [];
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (o && typeof o.name === 'string' && 'errors' in o && !('t' in o)) scenes.push({ name: o.name, errors: o.errors, hosts: [] });
    else scenes[scenes.length - 1].hosts.push(o);
  }
  return scenes;
};
const A = parse(DIR + '/render-v1.txt'), B = parse(DIR + '/render-sentinel.txt');
const rgbKey = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
const RGB = {};
for (const [h, n] of Object.entries(MAP)) RGB[rgbKey(h.toLowerCase())] = n;
const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
const roleOf = s => String(s).replace(COLOR, m => {
  if (m[0] === '#') return MAP[m] || MAP[m.toLowerCase()] || ('?' + m);
  const [r, g, b, a] = m.match(/[\d.]+/g);
  const n = RGB[r + ',' + g + ',' + b];
  return n ? n + '@' + (a == null ? 1 : a) : '?' + m;
});
const labelOf = (hosts, i) => {
  const own = hosts[i];
  const cut = s => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 39) + '…' : s; };
  if (own.x != null && own.x !== '') return cut(own.x);
  for (let j = i + 1; j < hosts.length && hosts[j].d > own.d; j++) if (hosts[j].x != null && hosts[j].x !== '') return '>' + cut(hosts[j].x);
  const p = own.p || {};
  if (p.accessibilityLabel) return '@' + cut(p.accessibilityLabel);
  for (let j = i - 1; j >= 0; j--) if (hosts[j].x) return '<' + cut(hosts[j].x);
  return '';
};
const pathTo = (hosts, i) => { const st = []; for (let j = 0; j <= i; j++) { st.length = hosts[j].d; st.push(hosts[j].t); } return st.slice(-3).join('>'); };

const walk = (a, b, pre, out) => {
  if (typeof a === 'string' || typeof b === 'string') { out.push([pre, a, b]); return; }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], pre + '.' + k, out);
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push([pre, a, b]);
};

const structural = [], stays = new Map(), follows = new Map();
const add = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
for (let si = 0; si < A.length; si++) {
  const a = A[si], b = B[si];
  if (!b || a.name !== b.name) { structural.push('scene order differs at ' + si); break; }
  if (a.name.includes('$theme')) continue;
  if (a.hosts.length !== b.hosts.length) structural.push(a.name + ': ' + a.hosts.length + ' hosts -> ' + b.hosts.length);
  if (JSON.stringify(a.errors) !== JSON.stringify(b.errors)) structural.push(a.name + ': errors ' + JSON.stringify(a.errors) + ' -> ' + JSON.stringify(b.errors));
  const n = Math.min(a.hosts.length, b.hosts.length);
  for (let i = 0; i < n; i++) {
    const ha = a.hosts[i], hb = b.hosts[i];
    if (ha.t !== hb.t || ha.d !== hb.d || ha.x !== hb.x || ha.fn !== hb.fn) structural.push(a.name + ' #' + i + ': ' + ha.t + '/' + ha.x + ' -> ' + hb.t + '/' + hb.x);
    const diffs = [];
    walk({ s: ha.s, sp: ha.sp, p: ha.p, cp: ha.cp }, { s: hb.s, sp: hb.sp, p: hb.p, cp: hb.cp }, '', diffs);
    const where = ha.t + ' ' + pathTo(a.hosts, i) + ' "' + labelOf(a.hosts, i) + '"';
    for (const [k, va, vb] of diffs) {
      if (k.includes('.cp')) continue;   // pressed children: report separately below
      const sa = typeof va === 'string' ? va : JSON.stringify(va), sb = typeof vb === 'string' ? vb : JSON.stringify(vb);
      const colA = String(sa).match(COLOR), colB = String(sb).match(COLOR);
      if (sa === sb) {
        if (colA) add(stays, sa + '  ' + k, a.name + ' :: ' + where);
        continue;
      }
      if (!colA && !colB) { add(stays, 'NONCOLOUR ' + k + ' ' + sa + ' -> ' + sb, a.name + ' :: ' + where); continue; }
      const role = roleOf(sb);
      add(follows, (colA ? colA.join('+') : sa) + ' -> ' + role + '   ' + k, where + '   [' + a.name + ']');
    }
    // colours that survive unchanged anywhere in the host (strings equal on both sides)
    const all = JSON.stringify({ s: hb.s, sp: hb.sp, p: hb.p, cp: hb.cp });
    const left = all.match(COLOR) || [];
    for (const c of left) if (!roleOf(c).match(/^[a-zA-Z]/)) add(stays, 'V1-COLOUR-LEFT ' + c, a.name + ' :: ' + where);
  }
}

const lines = [];
lines.push('STRUCTURAL (' + structural.length + ')', ...structural.slice(0, 200));
lines.push('', 'COLOURS THAT DO NOT FOLLOW THE VIBE (' + stays.size + ' kinds)');
for (const [k, v] of [...stays.entries()].sort()) { lines.push(k + '   (' + v.size + ' hosts)'); [...v].slice(0, 6).forEach(x => lines.push('      ' + x)); }
lines.push('', 'ROLES, by v1 value -> sentinel role and prop (' + follows.size + ' kinds)');
const sites = new Map();
for (const [k, v] of [...follows.entries()].sort()) {
  const uniq = new Map();
  for (const x of v) { const w = x.replace(/\s+\[.*\]$/, ''); if (!uniq.has(w)) uniq.set(w, x.match(/\[(.*)\]$/)[1]); }
  lines.push(k + '   (' + uniq.size + ' sites)');
  [...uniq.entries()].slice(0, 40).forEach(([w, sc]) => lines.push('      ' + w + '   [' + sc + ']'));
}
writeFileSync(DIR + '/roles.txt', lines.join('\n') + '\n');
console.log('structural', structural.length, 'stays', stays.size, 'follows', follows.size);
