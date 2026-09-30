// Track 5: fetch upstream repo trees (GitHub API via tools/fetch.mjs) and list static .ttf files.
// Usage: node t5-ghtrees.mjs fetch owner/repo[:key] ...   |   node t5-ghtrees.mjs list key ...
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const G = '/Users/micahflunker/dev/vibes-night/research/fonts/_gh';
const [cmd, ...args] = process.argv.slice(2);
for (const a of args) {
  const [repo, keyArg] = a.split(':');
  const key = keyArg || repo.split('/').pop().toLowerCase();
  const out = `${G}/${key}.json`;
  if (cmd === 'fetch') {
    if (existsSync(out)) { console.log('have', key); continue; }
    try { console.log(execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, out]).toString().trim().slice(0, 160)); }
    catch (e) { console.log('FAIL', repo, String(e.stdout || e).slice(0, 200)); }
  } else {
    if (!existsSync(out)) { console.log(key, 'no tree'); continue; }
    const t = JSON.parse(readFileSync(out, 'utf8'));
    const ttf = (t.tree || []).filter(x => /\.(ttf|otf)$/i.test(x.path) && !/italic/i.test(x.path));
    const stat = ttf.filter(x => !/\[|VF|Variable/i.test(x.path));
    const vf = ttf.filter(x => /\[|VF|Variable/i.test(x.path));
    const dirs = [...new Set(stat.map(x => x.path.split('/').slice(0, -1).join('/')))];
    console.log(`${key}: truncated=${t.truncated} static=${stat.length} vf=${vf.length}`);
    for (const d of dirs) {
      const fs = stat.filter(x => x.path.startsWith(d + '/') && x.path.split('/').length === d.split('/').length + 1);
      console.log(`   ${d}/ (${fs.length}): ${fs.map(x => x.path.split('/').pop() + (x.size ? ' ' + Math.round(x.size / 1024) + 'K' : '')).slice(0, 14).join(', ')}`);
    }
  }
}
