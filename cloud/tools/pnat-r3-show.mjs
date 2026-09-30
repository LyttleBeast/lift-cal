// Round-3: print the hosts of one scene of the sentinel render around every
// host whose props mention a given role, with the v1 render's value beside it.
// usage: node pnat-r3-show.mjs '<scene name>' '<role, e.g. colors.pYellow>' [context=4]
import { readFileSync } from 'node:fs';
const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent';
const MAP = JSON.parse(readFileSync(DIR + '/sentinel-map.json', 'utf8'));
const [scene, role, ctxS] = process.argv.slice(2);
const ctx = +(ctxS || 4);
const parse = f => {
  const scenes = [];
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (o && typeof o.name === 'string' && 'errors' in o && !('t' in o)) scenes.push({ name: o.name, hosts: [] });
    else scenes[scenes.length - 1].hosts.push(o);
  }
  return scenes;
};
const A = parse(DIR + '/render-v1.txt').find(s => s.name === scene);
const B = parse(DIR + '/render-sentinel.txt').find(s => s.name === scene);
if (!A || !B) { console.log('no scene', scene); process.exit(1); }
const hex = Object.entries(MAP).filter(([, n]) => n === role).map(([h]) => h.toLowerCase());
const rgb = hex.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', '));
const hit = e => { const s = JSON.stringify(e).toLowerCase(); return hex.some(h => s.includes(h)) || rgb.some(r => s.includes('(' + r + ',')); };
const idx = B.hosts.map((e, i) => (hit(e) ? i : -1)).filter(i => i >= 0);
const show = new Set();
idx.forEach(i => { for (let j = Math.max(0, i - ctx); j <= Math.min(B.hosts.length - 1, i + ctx); j++) show.add(j); });
const short = e => JSON.stringify({ s: e.s, p: e.p }).replace(/"(fontFamily|fontSize|letterSpacing|lineHeight|fontVariant|textTransform|flexDirection|alignItems|justifyContent|paddingVertical|paddingHorizontal|padding|margin[A-Za-z]*|gap|flex|minWidth|width|height)":[^,}]*,?/g, '').slice(0, 260);
let last = -2;
for (const i of [...show].sort((a, b) => a - b)) {
  if (i !== last + 1) console.log('   ...');
  last = i;
  const e = B.hosts[i];
  console.log((idx.includes(i) ? '>>' : '  ') + String(i).padStart(4) + ' ' + '  '.repeat(Math.min(e.d, 20)) + e.t + (e.x ? ' "' + String(e.x).slice(0, 50) + '"' : '') + '  ' + short(e));
  if (idx.includes(i)) console.log('      v1: ' + short(A.hosts[i]));
}
