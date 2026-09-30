// Re-prove Chalk helper: find files under a dir whose name matches a regex (depth-limited), with size and mtime.
//   node rpc-find.mjs <dir> <regex> [maxDepth=3]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, pat, md = '3'] = process.argv.slice(2);
const re = new RegExp(pat);
const walk = (d, depth) => {
  let names; try { names = readdirSync(d); } catch { return; }
  for (const n of names) {
    const p = join(d, n); let s; try { s = statSync(p); } catch { continue; }
    if (re.test(n)) console.log(s.mtime.toISOString() + '\t' + (s.isDirectory() ? 'd' : s.size) + '\t' + p);
    if (s.isDirectory() && depth < +md && n !== 'node_modules') walk(p, depth + 1);
  }
};
walk(dir, 1);
