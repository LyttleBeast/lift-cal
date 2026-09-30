// List files under a directory (recursive, max depth 3) with sizes.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d, depth) => { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); console.log(p, s.isDirectory() ? '/' : s.size); if (s.isDirectory() && depth < 3) walk(p, depth + 1); } };
walk(process.argv[2], 0);
