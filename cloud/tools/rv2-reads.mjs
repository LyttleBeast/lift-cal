// Round-2 review (js lens): any place app code READS a colour back (style,
// attribute, dataset) or compares one, in the engine's browser modules.
import { readFileSync, readdirSync } from 'node:fs';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';
const files = readdirSync(ENG).filter(f => f.endsWith('.js'));
const pats = [
  /\.style\.(background|backgroundColor|color|fill|stroke|borderColor)\b(?!\s*=[^=])/,
  /getAttribute\(\s*['"](fill|stroke|stop-color|style|data-color)['"]/,
  /\.color\s*(===|!==|==|!=)/,
  /(===|!==|==|!=)\s*[^;]*\.color\b/,
  /color\s*\+\s*['"]/,
  /\.color\.(slice|replace|substr|substring|toLowerCase|toUpperCase|startsWith|match)/,
  /hexToRgb|rgba?\(\s*\$\{/,
];
for (const f of files) {
  const lines = readFileSync(ENG + f, 'utf8').split('\n');
  lines.forEach((l, i) => { if (pats.some(p => p.test(l))) console.log(f + ':' + (i + 1) + ': ' + l.trim().slice(0, 200)); });
}
