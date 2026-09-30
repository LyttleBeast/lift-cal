// Scratch (N1): sweep-text-metrics' parsePresets(), cut out and run against the
// base theme.js and the engine theme.js, WITHOUT running sweep itself (it
// reads CSS from a directory this night must not open). Prints both maps and
// whether they are equal.
import { readFileSync } from 'node:fs';
const [sweepPath, baseTheme, newTheme] = process.argv.slice(2);
const sweep = readFileSync(sweepPath, 'utf8');
const start = sweep.indexOf('function parsePresets()');
const end = sweep.indexOf('\n}\n', start) + 2;
const body = sweep.slice(start, end);
// refsIn is sweep's own; a stand-in that returns the line is enough to compare.
const make = file => new Function('readFileSync', 'join', 'ROOT', 'refsIn',
  body + '\nreturn parsePresets();')(() => readFileSync(file, 'utf8'), (a, b) => b, '', l => [l.replace(/^[^/]*\/\/\s*/, '')]);
const a = make(baseTheme), b = make(newTheme);
const show = m => [...m].map(([k, v]) => k + ' size=' + v.size + ' lh=' + v.lh + ' refs=' + JSON.stringify(v.refs)).join('\n');
console.log('BASE (' + a.size + ')\n' + show(a) + '\n\nENGINE (' + b.size + ')\n' + show(b));
const same = a.size === b.size && [...a].every(([k, v]) => b.has(k) && b.get(k).size === v.size && b.get(k).lh === v.lh && JSON.stringify(b.get(k).refs) === JSON.stringify(v.refs));
console.log('\nsame names, sizes, lh and refs: ' + same);
process.exit(same ? 0 : 1);
