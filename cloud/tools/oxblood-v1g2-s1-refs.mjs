// Oxblood v1 gate round 2-s1: list proof runs whose summary.json names its
// trees' heads, to pick a reference run whose B served web main's tree.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof';
for (const d of readdirSync(P).sort()) {
  const f = P + '/' + d + '/summary.json';
  if (!existsSync(f)) continue;
  let s; try { s = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const pick = o => o && typeof o === 'object' ? JSON.stringify(o).match(/"(head|commit|sha)[^"]*":"[0-9a-f]{7,40}"/g) : null;
  const t = s.trees || s.sides || { a: s.a, b: s.b };
  console.log(d, s.verdict || '', JSON.stringify(t).slice(0, 300), JSON.stringify(s.flags || s.args || '').slice(0, 200));
}
