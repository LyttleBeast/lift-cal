// ia-assets-check.mjs <webRepo> — every url() in vibes/iron-age.css and every
// image slot in the definition resolves to a file; sizes and budgets; what the
// engine prefetches (images + @font-face) and what it does not (textures).
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const repo = process.argv[2];
const css = readFileSync(join(repo, 'vibes/iron-age.css'), 'utf8');
const urls = new Set([...css.matchAll(/url\(\s*(['"]?)([^)'"#][^)'"]*)\1\s*\)/g)].map(m => m[2]));
const def = (await import(pathToFileURL(join(repo, 'vibes/defs/iron-age.js')).href)).default;
let bad = 0, total = 0;
const seen = new Map();
for (const u of urls) {
  const f = join(repo, 'vibes', u);
  if (!existsSync(f)) { console.log('MISSING css url', u); bad++; continue; }
  seen.set(f, statSync(f).size);
}
const pre = [];
for (const [slot, v] of Object.entries(def.images || {})) {
  const f = join(repo, 'vibes/iron-age', typeof v === 'string' ? v : v.file);
  if (!existsSync(f)) { console.log('MISSING image slot', slot, f); bad++; continue; }
  seen.set(f, statSync(f).size); pre.push(f);
}
const fonts = [...css.matchAll(/@font-face\s*{[^}]*url\(([^)]+)\)/g)].map(m => join(repo, 'vibes', m[1].replace(/['"]/g, '')));
pre.push(...fonts);
for (const [f, n] of seen) { total += n; console.log(String(n).padStart(8), f.slice(repo.length + 1), pre.includes(f) ? 'prefetched' : 'fetched-on-use'); }
const fontBytes = fonts.reduce((a, f) => a + statSync(f).size, 0);
console.log('total referenced bytes', total, 'fonts', fontBytes, '(<= 120000 per family)', 'images', total - fontBytes, '(<= 1572864)');
for (const [f, n] of seen) if (/\.(png|jpe?g|webp)$/.test(f) && n > 153600) { console.log('OVER 150KB', f); bad++; }
process.exit(bad ? 1 : 0);
