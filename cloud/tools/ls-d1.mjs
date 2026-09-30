// List a directory (optionally recursive, depth-limited) with sizes and mtimes. Usage: node ls-d1.mjs <dir> [depth]
import fs from 'node:fs'; import path from 'node:path';
const [dir, depthArg] = process.argv.slice(2); const maxD = Number(depthArg || 1);
function walk(d, depth) {
  let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { console.log('ERR', d, e.code); return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name); const st = fs.lstatSync(p);
    console.log(`${'  '.repeat(depth - 1)}${e.isDirectory() ? 'D' : 'F'} ${e.name} ${st.size} ${st.mtime.toISOString()}`);
    if (e.isDirectory() && depth < maxD) walk(p, depth + 1);
  }
}
walk(dir, 1);
