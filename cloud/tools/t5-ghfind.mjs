// Track 5: print paths in a fetched GitHub tree matching a regex. Usage: node t5-ghfind.mjs <key> <regex>
import { readFileSync } from 'node:fs';
const [key, pat] = process.argv.slice(2);
const t = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/research/fonts/_gh/${key}.json`, 'utf8'));
const re = new RegExp(pat, 'i');
for (const x of t.tree || []) if (re.test(x.path)) console.log(x.path, x.size || '');
