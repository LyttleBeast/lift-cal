// e2b-grep.mjs <file> <regex> [flags] — print matching lines with numbers (no shell grep).
import { readFileSync } from 'node:fs';
const [file, pat, flags = ''] = process.argv.slice(2);
const re = new RegExp(pat, flags);
readFileSync(file, 'utf8').split('\n').forEach((l, i) => { if (re.test(l)) console.log(String(i + 1).padStart(5) + '  ' + l.slice(0, 300)); });
