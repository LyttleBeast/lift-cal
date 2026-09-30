// Add `import { <names> } from '<rel>';` after the line `import T from '…theme';`
// in <file>, unless an import from <rel> is already there.
// Usage: node ev2n-imp.mjs <file> <names> <rel>
import { readFileSync, writeFileSync } from 'node:fs';
const [file, names, rel] = process.argv.slice(2);
const L = readFileSync(file, 'utf8').split('\n');
if (L.some(l => l.includes("from '" + rel + "'"))) { console.log('already imports ' + rel + ': ' + file); process.exit(0); }
const i = L.findIndex(l => /^import T from '.*theme';$/.test(l));
if (i < 0) { console.log('NO theme import in ' + file); process.exit(1); }
L.splice(i + 1, 0, 'import { ' + names + " } from '" + rel + "';");
writeFileSync(file, L.join('\n'));
console.log('import added at ' + (i + 2) + ': ' + file.split('/').slice(-2).join('/'));
