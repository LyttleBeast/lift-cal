// Track 5 helper: run tools/fetch.mjs (the night's only downloader) over a list of [url, out] pairs.
// Usage: node t5-fetchbatch.mjs <jobs.json> [concurrency=4]
//   jobs.json: [[url, outfile], ...]. Skips outfiles that already exist.
//   Appends one JSON line per job to research/fonts/_fetchlog.jsonl.
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
const FETCH = '/Users/micahflunker/dev/vibes-night/tools/fetch.mjs';
const LOG = '/Users/micahflunker/dev/vibes-night/research/fonts/_fetchlog.jsonl';
mkdirSync('/Users/micahflunker/dev/vibes-night/research/fonts', { recursive: true });
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const conc = +(process.argv[3] || 4);
let i = 0, ok = 0, bad = 0, skip = 0;
function one([url, out]) {
  return new Promise(res => {
    if (existsSync(out)) { skip++; return res(); }
    execFile('node', [FETCH, url, out], { env: process.env, timeout: 120000 }, (err, stdout, stderr) => {
      const line = (stdout || '').trim() || (stderr || '').trim() || String(err);
      let rec;
      try { rec = JSON.parse(line); } catch { rec = { url, out, error: line }; }
      rec.retrieved = new Date().toISOString();
      if (err) { bad++; rec.failed = true; console.log('FAIL', err.code, url, line.slice(0, 200)); }
      else { ok++; }
      appendFileSync(LOG, JSON.stringify(rec) + '\n');
      res();
    });
  });
}
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await one(j); } }
await Promise.all(Array.from({ length: conc }, worker));
console.log(`done: ok ${ok}, failed ${bad}, skipped ${skip}, of ${jobs.length}`);
