// gap-fill helper: list a directory with sizes. usage: node gf-ls.mjs <dir> [filterRegex]
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [,, dir, pat] = process.argv;
const re = pat ? new RegExp(pat, 'i') : null;
for (const n of readdirSync(dir).sort()) {
  if (re && !re.test(n)) continue;
  const s = statSync(join(dir, n));
  console.log((s.isDirectory() ? 'd ' : 'f ') + String(s.size).padStart(10) + '  ' + n);
}
