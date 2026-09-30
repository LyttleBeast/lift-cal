import { readFileSync } from 'node:fs';
const a = readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-cv2/tools-check/vibes-contract.mjs', 'utf8');
const b = readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-cv2/tools/verify-vibes-contract.mjs', 'utf8');
const cut = s => { const i = s.indexOf('/* ================= F ================= */'); const j = s.indexOf('\n}\n', i); return i < 0 ? null : s.slice(i, j + 3); };
const fa = cut(a), fb = cut(b);
console.log('web F', fa && fa.length, 'nat F', fb && fb.length, 'identical', fa === fb);
if (fa && fb && fa !== fb) {
  const la = fa.split('\n'), lb = fb.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) console.log(i, '\n W: ' + la[i] + '\n N: ' + lb[i]);
}
