// Pweb fixer round 2: every raster flip the night's prove runs recorded (a scene
// with rasterStates), run offline through the backstop's signature — the old
// one (anywhere in the dock's box) and the new one (inside a dock icon's box,
// the icon boxes read from A's first dump). Also the hsens m10b plant.
//   node pwr2-flips.mjs [harnessDir]
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const H = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-harness';
const lib = await import(join(H, 'report', 'btn-44', 'harness-lib.mjs'));
const PROOF = '/Users/micahflunker/dev/vibes-night/proof';
const SIG = { maxPixels: 48, maxDelta: 4 };
const sums = [];
const walk = (d, depth) => {
  let l = [];
  try { l = readdirSync(d); } catch { return; }
  for (const f of l) {
    const p = join(d, f);
    if (f === 'summary.json') sums.push(p);
    else if (depth < 3) { try { if (statSync(p).isDirectory() && !/^(A|B|tmp)$/.test(f)) walk(p, depth + 1); } catch {} }
  }
};
walk(PROOF, 0);
// Format-1 dumps have no attributes: the dock by the path format-2 dumps give it
// (index.html's static <nav class="dock">, the same in every scene).
let DOCK_PATH = null;
const findDock = d => {
  const byClass = d.els.find(e => e.at && (/(^|\s)dock(\s|$)/.test(e.at.class || '')));
  if (byClass) { DOCK_PATH = DOCK_PATH || byClass.p; return byClass; }
  return DOCK_PATH ? d.els.find(e => e.p === DOCK_PATH) || null : null;
};
{
  const probe = join(PROOF, 'pwebfix', 'ab-absent', 'A', '390', 'you.dump.json.gz');
  if (existsSync(probe)) findDock(lib.readGz(probe));
  console.log('dock path (from a format-2 dump): ' + DOCK_PATH);
}
function iconsFromDump(dumpFile) {
  const d = lib.readGz(dumpFile);
  const dock = findDock(d);
  if (!dock) return null;
  return d.els.filter(e => e.p.startsWith(dock.p + '>') && /(^|>)svg:\d+$/.test(e.p)).map(e => ({ left: e.r[0], top: e.r[1], right: e.r[0] + e.r[2], bottom: e.r[1] + e.r[3] }));
}
// Older summaries kept no dock box: the dock's rect and the scroll, from the dump.
function dockFromDump(dumpFile) {
  const d = lib.readGz(dumpFile);
  const dock = findDock(d);
  if (!dock) return null;
  return { left: dock.r[0], top: dock.r[1], right: dock.r[0] + dock.r[2], bottom: dock.r[1] + dock.r[3], scrollX: d.doc.scrollX || 0, scrollY: d.doc.scrollY || 0, fromDump: true };
}
// a393ffb's rule, verbatim in effect: every region inside the dock's whole box.
function oldNoise(d, dock, dpr, sig) {
  if (!dock || d.sizeMismatch) return false;
  if (d.diffPixels > sig.maxPixels || d.maxDelta > sig.maxDelta) return false;
  const sy = dock.scrollY || 0, sx = dock.scrollX || 0;
  const y0 = (dock.top + sy) * dpr - 2, y1 = (dock.bottom + sy) * dpr + 2;
  const x0 = (dock.left + sx) * dpr - 2, x1 = (dock.right + sx) * dpr + 2;
  return d.allRegions.every(([rx0, ry0, rx1, ry1]) => rx0 >= x0 && rx1 <= x1 && ry0 >= y0 && ry1 <= y1);
}
function oldDecide({ A, B, load, dock, dpr, sig, rebootDiffs }) {
  const shared = [...B.keys()].filter(k => A.has(k));
  if (!shared.length) return { forgiven: false, why: 'no PNG in common' };
  if (rebootDiffs) return { forgiven: false, why: 'reboot dumps' };
  const ref = load(A.get(shared[0]));
  for (const m of [A, B]) for (const [sha, f] of m) { if (shared.includes(sha)) continue; if (!oldNoise(lib.diffPNG(load(f), ref, dpr), dock, dpr, sig)) return { forgiven: false, why: 'outside' }; }
  return { forgiven: true };
}
let n = 0, oldF = 0, newF = 0, changed = [];
for (const sf of sums) {
  let s;
  try { s = JSON.parse(readFileSync(sf, 'utf8')); } catch { continue; }
  const dir = join(sf, '..');
  const dpr = s.dpr || 3;
  for (const [k, x] of Object.entries(s.scenes || {})) {
    if (!x.rasterStates) continue;
    const at = k.lastIndexOf('@'), name = k.slice(0, at), W = k.slice(at + 1);
    const files = side => { let l = []; try { l = readdirSync(join(dir, side, W)); } catch {} return l.filter(f => f === name + '.png' || (f.startsWith(name + '.') && /^\.[AB]-r\d+\.png$/.test(f.slice(name.length)))).map(f => join(dir, side, W, f)); };
    const A = new Map(), B = new Map();
    for (const f of files('A')) A.set(lib.sha256(readFileSync(f)), f);
    for (const f of files('B')) B.set(lib.sha256(readFileSync(f)), f);
    // B's first PNG is written only when it differed from A's: the shared one is A's.
    if (x.pngSha && x.pngSha[1] && !B.has(x.pngSha[1]) && A.has(x.pngSha[1])) B.set(x.pngSha[1], A.get(x.pngSha[1]));
    const dumpA = join(dir, 'A', W, name + '.dump.json.gz');
    const dock = x.dock || (existsSync(dumpA) ? dockFromDump(dumpA) : null);
    if (!dock) { console.log('no dock box: ' + sf + ' ' + k); continue; }
    if (!A.size || !B.size) { console.log('no PNG states kept: ' + sf + ' ' + k + ' (A ' + A.size + ', B ' + B.size + ')'); continue; }
    const icons = existsSync(dumpA) ? iconsFromDump(dumpA) : null;
    const load = f => readFileSync(f);
    const old = oldDecide({ A, B, load, dock, dpr, sig: SIG, rebootDiffs: x.rebootDiffs ? 1 : 0 });
    const neu = lib.backstopDecide({ A, B, load, dock: { ...dock, icons: icons || [] }, dpr, sig: SIG, rebootDiffs: x.rebootDiffs ? 1 : 0 });
    n++; if (old.forgiven) oldF++; if (neu.forgiven) newF++;
    const rec = x.backstop ? x.backstop.forgiven : null;
    const line = (neu.forgiven === old.forgiven ? '  ' : '!! ') + sf.replace(PROOF + '/', '') + ' ' + k + ': recorded ' + rec + ', whole-dock rule ' + old.forgiven + ', icon rule ' + neu.forgiven + (neu.why ? ' (' + neu.why + ')' : '') + '; states A ' + A.size + ' B ' + B.size + '; icons ' + (icons ? icons.length : 'none') + '; regions ' + JSON.stringify((x.firstAttempt && x.firstAttempt.diffRegions || []).map(r => r.css));
    console.log(line);
    if (neu.forgiven !== old.forgiven) changed.push(line);
  }
}
console.log('flips: ' + n + '; forgiven by the whole-dock rule ' + oldF + ', by the icon rule ' + newF + '; decided differently ' + changed.length);
