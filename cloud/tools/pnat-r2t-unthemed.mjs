// Pnat round-2 theme lens: colour values in the engine's SENTINEL render that no
// role produced — a site that would not follow a vibe.
import { readFileSync } from 'node:fs';
import { labelOf } from '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/harness/tools/lib/vibe-snap.mjs';
const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/';
const L = {};
for (const p of ['empty', 'seeded', 'small']) for (const [k, v] of Object.entries(JSON.parse(readFileSync(DIR + 'legend-engine.' + p + '.json', 'utf8')))) L[String(k).toLowerCase()] = v;
const rgb = {};
for (const h of Object.keys(L)) if (/^#[0-9a-f]{6}$/.test(h)) { const n = parseInt(h.slice(1), 16); rgb[[(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',')] = 1; }
const known = v => {
  const s = v.toLowerCase();
  if (L[s] || (s.length === 9 && L[s.slice(0, 7)])) return true;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
  return !!(m && rgb[[m[1], m[2], m[3]].join(',')]);
};
const isColour = v => typeof v === 'string' && (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(/i.test(v));
const out = new Map();
let scene = null, hosts = [];
const flush = () => {
  if (!scene || scene.includes('$theme')) return;
  hosts.forEach((h, i) => {
    const walk = (o, path) => {
      if (o && typeof o === 'object') { for (const k of Object.keys(o)) walk(o[k], path ? path + '.' + k : k); return; }
      if (isColour(o) && !known(o)) {
        const key = o + '  ' + h.t + ' "' + String(labelOf(hosts, i) || '').slice(0, 40) + '" ' + path;
        if (!out.has(key)) out.set(key, { n: 0, scene }); out.get(key).n++;
      }
    };
    walk(h, '');
  });
};
for (const line of readFileSync(DIR + 'render-engine-sent.txt', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  if (o && 'name' in o && 'errors' in o && !('t' in o)) { flush(); scene = o.name; hosts = []; } else hosts.push(o);
}
flush();
console.log('distinct unthemed colour sites', out.size);
for (const [k, v] of [...out].slice(0, 80)) console.log(String(v.n).padStart(5), k, '{' + v.scene + '}');
