// N3 scratch: peek at the theme baseline's plan keys (no cat/head in this session).
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(Object.keys(B), Object.keys(B.plan || {}));
console.log('faces', JSON.stringify((B.plan || {}).faces).slice(0, 400));
console.log('sizes', JSON.stringify((B.plan || {}).sizes));
