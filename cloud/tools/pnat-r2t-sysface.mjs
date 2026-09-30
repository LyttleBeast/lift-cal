// Pnat round-2 theme lens: Text hosts that name no face in the ENGINE's
// sentinel render (systemFace 'SYSFACE', family 'SENT') — sites a vibe's
// system face never reaches — and any host whose face in the sentinel render
// is Archivo (T.fit / T.fit.archivo, or something that bypasses T.face).
import { readFileSync } from 'node:fs';
import { labelOf } from '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/harness/tools/lib/vibe-snap.mjs';
const DIR = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/';
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
const E = parse(DIR + 'render-engine-sent.txt');
const none = new Map(), archivo = new Map();
const add = (m, k, scene) => { if (!m.has(k)) m.set(k, { n: 0, scene }); m.get(k).n++; };
for (const s of E) {
  if (s.name.includes('$theme')) continue;
  s.hosts.forEach((h, i) => {
    if (!/Text|TextInput/.test(h.t)) return;
    const st = h.s || {};
    const ff = st.fontFamily !== undefined ? st.fontFamily : (h.p && h.p.fontFamily);
    const lab = String(labelOf(s.hosts, i) || '').slice(0, 50);
    if (ff === undefined) add(none, h.t + ' "' + lab + '"', s.name + ' #' + i);
    else if (/^Archivo_/.test(ff)) add(archivo, h.t + ' ' + ff + ' "' + lab + '"', s.name + ' #' + i);
  });
}
console.log('== Text hosts with no fontFamily under the sentinel (' + none.size + ' distinct)');
for (const [k, v] of none) console.log(String(v.n).padStart(5), k, '{' + v.scene + '}');
console.log('== Text hosts still in Archivo under the sentinel (' + archivo.size + ' distinct)');
for (const [k, v] of [...archivo].slice(0, 80)) console.log(String(v.n).padStart(5), k, '{' + v.scene + '}');
