// Pnat round-2 theme lens: SetTypeBadge (src/ui/train/SetRow.jsx) for a stored
// set type that is an Object.prototype member, in build 58 and in the engine.
// Usage: node pnat-r2t-badge.mjs <tree root>
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const ROOT = process.argv[2];
const R = await import(pathToFileURL(join(ROOT, 'tools/lib/rn-render.mjs')).href);
const { SetTypeBadge } = R.load('src/ui/train/SetRow.jsx');
for (const type of ['N', 'W', 'F', 'D', 'constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty']) {
  let m, threw = null;
  try { m = R.mount(R.h(SetTypeBadge, { type, index: 0, onPress() {} })); } catch (e) { threw = e; }
  const err = threw || (m && (m.uncaught[0] || m.caught[0]));
  if (err) { console.log(JSON.stringify(type).padEnd(18), 'THREW', String(err && err.message).split('\n')[0]); continue; }
  const hs = R.hosts(m.box).map(x => ({ t: x.t, bg: R.styleOf(x.p).backgroundColor, color: R.styleOf(x.p).color, text: x.text }));
  console.log(JSON.stringify(type).padEnd(18), JSON.stringify(hs));
  m.unmount();
}
