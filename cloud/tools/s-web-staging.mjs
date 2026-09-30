// Which verifiers stage the REAL store.js, and how (the lines that build the
// staged tree): REAL lists, tmpdirs, copies, the SDK URL rewrites, vibe mentions.
// Usage: node s-web-staging.mjs <repo> <file.mjs> [file.mjs...]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [repo, ...files] = process.argv.slice(2);
const re = /REAL|vibe|mkdtemp|copyFileSync|cpSync|firebase-(app|auth|database)|gstatic|writeFileSync\(join\(dir|readdirSync\(ROOT/;
for (const f of files) {
  const lines = readFileSync(join(repo, 'tools-check', f), 'utf8').split('\n');
  console.log('== ' + f);
  lines.forEach((l, i) => { if (re.test(l)) console.log('  ' + (i + 1) + ': ' + l.trim().slice(0, 220)); });
}
