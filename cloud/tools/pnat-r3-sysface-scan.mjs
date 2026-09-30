// Round-3: in the render wearing a system face, every Text / TextInput host
// that still names NO fontFamily (so it stays in iOS's system font in every
// vibe), grouped by what it says; and a count of the hosts that took the face.
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/sent';
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
const S = parse(DIR + '/render-sentinel-sys.txt');
const noFace = new Map(), took = new Map();
const add = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
const ctx = (hs, i) => { for (let j = i - 1; j >= 0 && j > i - 6; j--) if (hs[j].x) return hs[j].x; return ''; };
for (const sc of S) {
  if (sc.name.includes('$theme') || sc.name.startsWith('app.json')) continue;
  sc.hosts.forEach((e, i) => {
    if (!/^(Text|TextInput|SvgText)$/.test(e.t)) return;
    const ff = (e.s && e.s.fontFamily) || (e.p && e.p.fontFamily);
    const key = e.t + ' "' + String(e.x == null ? '' : e.x).slice(0, 40) + '"  size=' + (e.s && e.s.fontSize) +
      '  after "' + String(ctx(sc.hosts, i)).slice(0, 30) + '"';
    if (!ff) add(noFace, key, sc.name);
    else if (ff === 'Zz_SysFace') add(took, e.t + ' size=' + (e.s && e.s.fontSize), sc.name);
  });
}
const out = ['NO fontFamily (' + noFace.size + ' distinct)'];
for (const [k, v] of [...noFace.entries()].sort()) out.push('  ' + k + '   [' + [...v].slice(0, 2).join(' | ') + (v.size > 2 ? ' +' + (v.size - 2) : '') + ']');
out.push('', 'took Zz_SysFace: ' + [...took.values()].reduce((n, v) => n + v.size, 0) + ' scene-hosts over ' + took.size + ' kinds');
writeFileSync(DIR + '/sysface-scan.txt', out.join('\n') + '\n');
console.log(out.slice(0, 3).join('\n'), '... ->', DIR + '/sysface-scan.txt');
