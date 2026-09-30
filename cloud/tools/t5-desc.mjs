// Track 5: fetch google/fonts DESCRIPTION.en_us.html (or article/ARTICLE.en_us.html) per family via fetch.mjs,
// then print each as plain text (tags stripped), trimmed. Usage: node t5-desc.mjs fetch|show name...
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const [cmd, ...names] = process.argv.slice(2);
for (const n of names) {
  const a = `${R}/${n}/DESCRIPTION.en_us.html`, b = `${R}/${n}/ARTICLE.en_us.html`;
  if (cmd === 'fetch') {
    if (existsSync(a) || existsSync(b)) continue;
    try { execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://raw.githubusercontent.com/google/fonts/main/ofl/${n}/DESCRIPTION.en_us.html`, a]); }
    catch { try { execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://raw.githubusercontent.com/google/fonts/main/ofl/${n}/article/ARTICLE.en_us.html`, b]); } catch { console.log('none', n); } }
  } else {
    const p = existsSync(a) ? a : existsSync(b) ? b : null;
    if (!p) { console.log(`## ${n}: (no description)`); continue; }
    const t = readFileSync(p, 'utf8').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
    console.log(`## ${n} [${p.endsWith('ARTICLE.en_us.html') ? 'article/ARTICLE' : 'DESCRIPTION'}]: ${t.slice(0, 700)}`);
  }
}
