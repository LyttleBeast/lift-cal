// ev2w-unwrap.mjs — rewrite `const X = glyphed(el(...), 'n');` (one line) as
// `const X = el(...); glyphed(X, 'n');`, so the site's own line is the one it
// always was (textual verifiers anchor on `const X = el(`). Prints each change.
// Usage: node ev2w-unwrap.mjs <tree> <file...> [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const [tree, ...files] = args.filter(a => a !== '--write');
const RE = /^(\s*)const (\w+)(\s*)= glyphed\((el\(.*?\)), '(\w+)'\);(.*)$/;
for (const f of files) {
  const p = join(tree, f);
  const lines = readFileSync(p, 'utf8').split('\n');
  let n = 0;
  const out = lines.map((l, i) => {
    const m = RE.exec(l);
    if (!m) return l;
    const [, ind, name, sp, call, g, rest] = m;
    // the call must be balanced, or the lazy match stopped inside it
    let d = 0; for (const c of call) { if (c === '(') d++; else if (c === ')') d--; if (d < 0) break; }
    if (d !== 0) { console.log(`SKIP ${f}:${i + 1} unbalanced: ${l.trim()}`); return l; }
    const next = `${ind}const ${name}${sp}= ${call}; glyphed(${name}, '${g}');${rest}`;
    console.log(`${f}:${i + 1}\n  - ${l.trim()}\n  + ${next.trim()}`);
    n++;
    return next;
  });
  if (WRITE && n) writeFileSync(p, out.join('\n'));
}
