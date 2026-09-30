// bake.mjs — bake a vibe's args (JSON file) into a copy of an assembled workflow script, so long
// notes and carried results never have to be pasted into a Workflow call. The script's
// `const V = args` becomes `const V = Object.assign(<json>, args || {})`.
//   node bake.mjs <assembledName> <argsJson> <outName>   → writes <outName>.js next to this file
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
const HERE = dirname(new URL(import.meta.url).pathname);
const [name, argsFile, outName] = process.argv.slice(2);
if (!name || !argsFile || !outName) { console.error('usage: bake.mjs <assembledName> <argsJson> <outName>'); process.exit(2); }
const src = readFileSync(join(HERE, name + '.js'), 'utf8');
const marker = 'const V = args\n';
if (src.split(marker).length !== 2) { console.error('expected exactly one `const V = args` line'); process.exit(2); }
const json = JSON.stringify(JSON.parse(readFileSync(argsFile, 'utf8')));
const out = src.replace(marker, () => `const V = Object.assign(${json}, args || {})\n`);
writeFileSync(join(HERE, outName + '.js'), out);
console.log(join(HERE, outName + '.js'), out.length, 'chars');
