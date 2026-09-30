// ia-css-audit.mjs <repo> — list rack.css / auth.css rules whose border-radius
// is a literal (not var(), 0, or 50%), and rules with box-shadow / filter /
// backdrop-filter / gradient literals, then say whether vibes/iron-age.css
// names any class of the selector. Read-only.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const repo = process.argv[2];
const ia = readFileSync(join(repo, 'vibes/iron-age.css'), 'utf8');
const iaClasses = new Set([...ia.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
for (const f of ['rack.css', 'auth.css']) {
  const src = readFileSync(join(repo, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const sel = m[1].trim(), body = m[2];
    if (sel.startsWith('@') || sel.includes(':root')) continue;
    const line = src.slice(0, m.index).split('\n').length + (m[1].match(/^\s*/)[0].split('\n').length - 1);
    const hits = [];
    const rad = /border-radius\s*:\s*([^;]+)/.exec(body);
    if (rad && !/var\(|^\s*0\s*$|50%|999/.test(rad[1])) hits.push('radius ' + rad[1].trim());
    const sh = /box-shadow\s*:\s*([^;]+)/.exec(body);
    if (sh && !/var\(|none/.test(sh[1])) hits.push('shadow ' + sh[1].trim().slice(0, 40));
    if (/gradient\(/.test(body)) hits.push('gradient');
    if (/backdrop-filter/.test(body)) hits.push('backdrop');
    if (!hits.length) continue;
    const cls = [...sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(x => x[1]);
    const named = cls.some(c => iaClasses.has(c));
    console.log((named ? '   ' : 'NEW') + ' ' + f + ':' + line + '  ' + sel.replace(/\s+/g, ' ').slice(0, 90) + '  [' + hits.join('; ') + ']');
  }
}
