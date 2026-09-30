import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const P = '/Users/micahflunker/dev/vibes-night/proof';
for (const d of readdirSync(P)) {
  const f = join(P, d, 'fit.json');
  if (!existsSync(f)) continue;
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    console.log(d, statSync(f).mtime.toISOString(), 'vibe=' + j.vibe, 'commit=' + (j.commit || j.head || ''), JSON.stringify(j.safeArea), JSON.stringify(j.totals));
  } catch (e) { console.log(d, 'ERR', e.message); }
}
