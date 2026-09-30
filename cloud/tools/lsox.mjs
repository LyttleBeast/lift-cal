import fs from 'fs'; import path from 'path';
const roots = ['/Users/micahflunker/dev/vibes-night/tools', '/Users/micahflunker/dev/vibes-night/design'];
for (const r of roots) for (const f of fs.readdirSync(r, { recursive: true })) {
  if (String(f).includes('node_modules')) continue;
  if (/oxblood|contrast|cvd|check/i.test(f)) console.log(path.join(r, f), fs.statSync(path.join(r, f)).size);
}
