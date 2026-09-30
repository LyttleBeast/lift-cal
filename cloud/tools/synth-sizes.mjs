// Synthesis helper: size, line count and heading lines of each research track file.
import { readFileSync, statSync } from 'node:fs';
const base = '/Users/micahflunker/dev/vibes-night/research/';
const files = ['01-ai-tells.md','02-fitness-apps.md','03-beyond-fitness.md','04-colour.md','05-typography.md','06-gym-visual.md','07-iron-age-period.md','iron-age/08a-photos.md','iron-age/08b-engravings.md','09-apple-rules.md','10-menus-settings.md','SYNTHESIS.md'];
const onlyHeads = process.argv[2] === 'heads';
for (const f of files) {
  const p = base + f;
  const s = statSync(p);
  const txt = readFileSync(p, 'utf8');
  const lines = txt.split('\n');
  console.log(`${f}: ${s.size} bytes, ${lines.length} lines`);
  if (onlyHeads) {
    lines.forEach((l, i) => { if (/^#{1,3} /.test(l)) console.log(`   ${i + 1}: ${l.slice(0, 110)}`); });
  }
}
