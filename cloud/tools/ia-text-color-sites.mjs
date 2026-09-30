// ia-text-color-sites.mjs <repo> — every place the web app sets TEXT colour
// (CSS `color:` or JS `.style.color` / `color:` in a style string / cssText)
// that can resolve to a plate or subject colour (--p-*, paint(), a subject,
// group colour, a `c`/`col` variable). Read-only; prints file:line and the text.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const repo = process.argv[2];
const files = readdirSync(repo).filter(f => /\.(js|css)$/.test(f) && f !== 'vibe.js');
const pat = /(^|[^-\w])color\s*[:=]|style\.color|setProperty\(\s*['"]color['"]/;
for (const f of files) {
  const lines = readFileSync(join(repo, f), 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (!pat.test(l)) return;
    if (/background|border-color|stroke|fill|stop-color/.test(l) && !/[^-]color\s*:/.test(l.replace(/background(-color)?\s*:|border(-\w+)?-color\s*:|stop-color\s*:/g, ''))) return;
    if (/var\(--(chalk|steel|dim|faint|accent|knockout|ink|on-|danger|good|bad|warn|done|ink-go|focus|inverse|tag-ink|ink-of|ink-plate)/.test(l) && !/p-(yellow|chrome|red|blue|green|white)|paint\(|subject|group|\bc\b|col\b/.test(l)) return;
    if (!/p-(yellow|chrome)|paint\(|subj|group|Color|\bc\b|col\b|\.color\b|hue|tone|zone/i.test(l)) return;
    console.log(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 150));
  });
}
