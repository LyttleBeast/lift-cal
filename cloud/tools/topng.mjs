// topng.mjs — convert listed JPEG scans to PNG with sips (no other transform), into research/iron-age-period/png/.
import { execFileSync } from 'node:child_process';
const dir = '/Users/micahflunker/dev/vibes-night/research/iron-age-period';
for (const f of process.argv.slice(2)) {
  const base = f.split('/').pop().replace(/\.jpe?g$/i, '');
  execFileSync('sips', ['-s', 'format', 'png', f, '--out', `${dir}/png/${base}.png`], { stdio: 'ignore' });
  console.log('ok', base);
}
