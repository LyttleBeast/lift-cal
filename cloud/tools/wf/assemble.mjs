// assemble.mjs — build a Workflow script from <name>.body.js by replacing the line
// `// @@PREAMBLE@@` with the night's shared agent preamble (§0 verbatim + Micah's rules +
// superseded list + staging rule + session facts), so every brief carries it byte for byte.
//   node assemble.mjs extract <researchScriptPath>   → writes preamble.js (once)
//   node assemble.mjs build <name>                    → writes <name>.js next to <name>.body.js
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
const HERE = dirname(new URL(import.meta.url).pathname);
const [cmd, arg] = process.argv.slice(2);
if (cmd === 'extract') {
  const src = readFileSync(arg, 'utf8');
  const start = src.indexOf('const PREAMBLE = `');
  const end = src.indexOf('\n`\n', start);
  if (start < 0 || end < 0) { console.error('PREAMBLE not found'); process.exit(2); }
  const block = src.slice(start, end + 3);
  writeFileSync(join(HERE, 'preamble.js'), block);
  console.log('preamble.js', block.length, 'chars');
} else if (cmd === 'build') {
  const body = readFileSync(join(HERE, arg + '.body.js'), 'utf8');
  const pre = readFileSync(join(HERE, 'preamble.js'), 'utf8');
  if (!body.includes('// @@PREAMBLE@@')) { console.error('no // @@PREAMBLE@@ marker'); process.exit(2); }
  const out = body.replace('// @@PREAMBLE@@', () => pre);
  writeFileSync(join(HERE, arg + '.js'), out);
  console.log(join(HERE, arg + '.js'), out.length, 'chars');
} else { console.error('usage: assemble.mjs extract <script> | build <name>'); process.exit(2); }
