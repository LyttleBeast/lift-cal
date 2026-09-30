// Extract text from a PDF, page by page, and write it to a .txt file.
// Usage: node pdftext.mjs <in.pdf> <out.txt>
// Research helper for Phase R (track 6): reading federation rulebooks.
import { readFileSync, writeFileSync } from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';

const [inp, out] = process.argv.slice(2);
const buf = new Uint8Array(readFileSync(inp));
const pdf = await getDocumentProxy(buf);
const { totalPages, text } = await extractText(pdf, { mergePages: false });
const body = text.map((t, i) => `\n===== PAGE ${i + 1} =====\n${t}`).join('\n');
writeFileSync(out, body);
console.log(`${totalPages} pages, ${body.length} chars -> ${out}`);
