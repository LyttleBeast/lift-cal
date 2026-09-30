// Wrap every line of <file> whose trimmed text is exactly <line> (a JSX child
// <Text …>X</Text>) as {glyph('<name>', <line>)}, keeping its indentation.
// Prints each line number it changed. Usage: node ev2n-wrap.mjs <file> <name> <line>
import { readFileSync, writeFileSync } from 'node:fs';
const [file, name, line] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
const hit = [];
for (let i = 0; i < L.length; i++) {
  if (L[i].trim() !== line) continue;
  const ind = L[i].slice(0, L[i].length - L[i].trimStart().length);
  L[i] = ind + "{glyph('" + name + "', " + line + ')}';
  hit.push(i + 1);
}
writeFileSync(file, L.join('\n'));
console.log(file.split('/').slice(-2).join('/'), name, 'wrapped at', hit.join(', ') || 'NOTHING');
