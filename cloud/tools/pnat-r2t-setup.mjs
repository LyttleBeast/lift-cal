// Pnat round-2 theme-lens reviewer: copy the proof's verify-vibe-v1 and its two
// libs into a scratch dir and patch the child so that, BEFORE open() loads any
// app module, a SENTINEL look is put on — in the base tree by rewriting build
// 58's theme tables in place (they are plain objects), in the engine by
// applyTheme(build(sentinel)). Same sentinel per role NAME in both trees, so a
// host whose value differs between the two renders changed role.
// Read-only on the worktrees; writes only under ~/dev/vibes-night/tmp.
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SRC = '/Users/micahflunker/dev/vibes-night/wt/nat-proof';
const DST = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/harness';
mkdirSync(join(DST, 'tools/lib'), { recursive: true });
for (const f of ['tools/lib/vibe-snap.mjs', 'tools/lib/vibe-seed.mjs']) copyFileSync(join(SRC, f), join(DST, f));
let v = readFileSync(join(SRC, 'tools/verify-vibe-v1.mjs'), 'utf8');
const anchor = '  const H = await open(ROOT, GEO);\n';
if (v.split(anchor).length !== 2) throw new Error('anchor not found once');
v = v.replace(anchor,
  '  if (process.env.SENT_MODE) {\n' +
  '    const { pathToFileURL } = await import(\'node:url\');\n' +
  '    const R0 = await import(pathToFileURL(join(ROOT, \'tools/lib/rn-render.mjs\')).href);\n' +
  '    const { applySentinel } = await import(\'./sentinel2.mjs\');\n' +
  '    const legend = applySentinel(R0, process.env.SENT_MODE);\n' +
  '    writeFileSync(process.env.SENT_LEGEND + \'.\' + PASS + \'.json\', JSON.stringify(legend, null, 1));\n' +
  '  }\n' + anchor);
writeFileSync(join(DST, 'tools/verify-vibe-v1.mjs'), v);
console.log('harness written to', DST);
