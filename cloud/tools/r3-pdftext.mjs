// r3-pdftext.mjs — track 3 research helper: extract a PDF's text to a file under ~/dev/vibes-night.
// Usage: node r3-pdftext.mjs <in.pdf> <out.txt>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const pdf = require('pdf-parse/lib/pdf-parse.js');
const [inp, out] = process.argv.slice(2);
if (!out.startsWith('/Users/micahflunker/dev/vibes-night/')) { console.error('out must be under vibes-night'); process.exit(2); }
const pages = [];
const data = await pdf(readFileSync(inp), {
  pagerender: pd => pd.getTextContent().then(tc => {
    const t = tc.items.map(i => i.str).join(' ');
    pages.push(t);
    return t;
  })
});
writeFileSync(out, pages.map((t, i) => `\n=== PAGE ${i + 1} ===\n${t}`).join('\n'));
console.log('pages', data.numpages, 'chars', pages.reduce((a, t) => a + t.length, 0));
