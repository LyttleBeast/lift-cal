// mdF-wdth-survey.mjs — read-only: every literal `wdth` a native source file
// asks for below 90, so Meet Day's face.bands (≤ 64 and 74–76) can be shown
// to catch only Meet Day's own presets. Walks rack-mobile's tracked src/ and
// app/ files via `git ls-files` (read-only), prints file:line and the value.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const ROOT = '/Users/micahflunker/dev/rack-mobile/';
const files = execFileSync('git', ['-C', ROOT, 'ls-files', 'src', 'app'], { encoding: 'utf8' })
  .split('\n').filter(f => /\.(js|jsx|ts|tsx)$/.test(f));
const hits = {};
let n = 0;
for (const f of files) {
  const lines = readFileSync(ROOT + f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/wdth['"]?\s*[:,]\s*([0-9.]+)/g)) {
      const w = Number(m[1]); n++;
      hits[w] = hits[w] || [];
      if (w < 90) hits[w].push(`${f}:${i + 1}`);
      else hits[w].push('');
    }
  });
}
console.log(`literal wdth values found: ${n}`);
for (const w of Object.keys(hits).map(Number).sort((a, b) => a - b)) {
  const sites = hits[w].filter(Boolean);
  console.log(`wdth ${w}: ${hits[w].length} site(s)${sites.length ? ' — ' + sites.slice(0, 8).join(', ') : ''}`);
}
const inBand = w => w <= 64 || (w >= 74 && w <= 76);
const caught = Object.keys(hits).map(Number).filter(inBand);
console.log(caught.length ? `IN A MEET DAY BAND: ${caught.join(', ')}` : 'no literal native wdth falls in a Meet Day band (≤ 64, 74–76)');
