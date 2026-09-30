// Concept-B (oxblood) helper: search files for a regex, or list a directory.
// usage: node oxB-find.mjs grep <regex> <file|dir> [more...]   (case-insensitive)
//        node oxB-find.mjs ls <dir>
import fs from 'node:fs';
import path from 'node:path';
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'ls') {
  for (const d of rest) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      let s = '';
      try { s = e.isFile() ? String(fs.statSync(p).size) : 'dir'; } catch {}
      console.log(s.padStart(10), p);
    }
  }
} else if (cmd === 'grep') {
  const re = new RegExp(rest[0], 'i');
  const walk = p => {
    const st = fs.statSync(p);
    if (st.isDirectory()) { for (const e of fs.readdirSync(p)) { if (e === 'node_modules' || e === '.git') continue; walk(path.join(p, e)); } return; }
    if (st.size > 5e6) return;
    if (!/\.(md|mjs|js|json|txt|css|html|jsx)$/i.test(p)) return;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { if (re.test(l)) console.log(`${p}:${i + 1}: ${l.slice(0, 400)}`); });
  };
  for (const p of rest.slice(1)) walk(p);
}
