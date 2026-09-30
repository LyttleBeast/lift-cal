#!/usr/bin/env node
/* rt2-settype-proto — Pnat runtime review, round 2.
 * SetRow.jsx's SetTypeBadge looks a stored set's `type` up in its TINT table.
 * Build 58 held the colours ([T.tint.tagW, T.colors.pYellow], …) and
 * destructured `TINT[type] || [collar, steel]`; the engine holds names and reads
 * `TINT[type] ? [T.tint[t[0]], T.colors[t[1]]] : [raised, steel]`. A type that
 * is an inherited Object member ('toString', 'constructor', '__proto__', …)
 * finds a truthy non-array in both. This draws the real badge from --root's
 * tree for each such type (and N/W/F/D/unknown as controls) and prints what
 * happened: the host props, or the error the render threw.
 *
 *   node rt2-settype-proto.mjs --root <tree>
 */
import { spawnSync } from 'node:child_process';
import { resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/lib/';
const { ZONE, open, dump, canon } = await import(PROOF + 'vibe-snap.mjs');
const SELF = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const ROOT = pathResolve(arg('--root', '.'));
if (process.env.TZ !== ZONE || process.env.RT2_CHILD !== '1') {
  const r = spawnSync(process.execPath, [SELF, ...argv], { env: { ...process.env, TZ: ZONE, RT2_CHILD: '1' }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}
const H = await open(ROOT);
const { R } = H;
const { createRoot } = H.req('react-dom/client');
const doc = globalThis.document;
const { SetTypeBadge } = R.load('src/ui/train/SetRow.jsx');
console.log('rt2-settype-proto --root ' + ROOT);
for (const type of ['N', 'W', 'F', 'D', 'X', 'toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty']) {
  const errs = [];
  const box = doc.createElement('div'); doc.body.appendChild(box);
  const root = createRoot(box, { onCaughtError: e => errs.push(String(e && e.message)), onUncaughtError: e => errs.push(String(e && e.message)), onRecoverableError() {} });
  try { await R.act(async () => { root.render(R.h(SetTypeBadge, { type, index: 0, onPress() {} })); }); } catch (e) { errs.push('act: ' + String(e && e.message)); }
  const hosts = dump(R, box);
  const show = hosts.map(x => x.t + (x.x ? ' "' + x.x + '"' : '') + ' ' + canon({ bg: x.s && ('backgroundColor' in x.s ? x.s.backgroundColor : '(no key)'), color: x.s && ('color' in x.s ? x.s.color : '(no key)') })).join(' | ');
  console.log('  type ' + JSON.stringify(type).padEnd(17) + (errs.length ? 'THREW: ' + errs[0].slice(0, 120) : show));
  try { await R.act(async () => { root.unmount(); }); } catch {}
  box.parentNode.removeChild(box);
}
process.exit(0);
