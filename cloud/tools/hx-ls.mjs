// hx-ls: list directories (the web-harness agent's helper; no ls in Bash).
//   node hx-ls.mjs <dir> [depth=1]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, depthArg] = process.argv.slice(2);
const depth = +(depthArg || 1);
function walk(d, lvl, pre) {
  let ents;
  try { ents = readdirSync(d, { withFileTypes: true }); } catch (e) { console.log(pre + '! ' + e.code); return; }
  ents.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of ents) {
    const p = join(d, e.name);
    let st; try { st = statSync(p); } catch { st = null; }
    const isDir = st && st.isDirectory();
    const extra = e.isSymbolicLink() ? ' -> symlink' : '';
    console.log(pre + e.name + (isDir ? '/' : '') + (st && !isDir ? '  ' + st.size : '') + (st ? '  ' + st.mtime.toISOString().slice(0, 19) : '') + extra);
    if (isDir && lvl < depth && !e.isSymbolicLink()) walk(p, lvl + 1, pre + '  ');
  }
}
walk(dir, 1, '');
