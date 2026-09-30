// t10-grep.mjs — track 10 research helper. Prints matching lines (with numbers)
// of a text file. Usage: node t10-grep.mjs <file> <regex>
import { readFileSync } from 'node:fs';
const re = new RegExp(process.argv[3], 'i');
readFileSync(process.argv[2], 'utf8').split('\n').forEach((l, i) => { if (re.test(l)) console.log(i + 1 + ':', l); });
