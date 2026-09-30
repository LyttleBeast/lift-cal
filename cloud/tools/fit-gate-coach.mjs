// Coach card and the 19 clipped: chalk vs reference, side by side. Usage: node fit-gate-coach.mjs <vibe fit.json> <ref fit.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const V = JSON.parse(readFileSync(a, 'utf8')), R = JSON.parse(readFileSync(b, 'utf8'));
for (const [id, x] of Object.entries(V.scenes)) {
  if (x.error) continue;
  const y = R.scenes[id];
  const cards = (x.watch || []).filter(z => /coach-card/.test(z.cls));
  for (const c of cards) {
    const r = (y.watch || []).find(z => z.path === c.path);
    console.log('CARD', id, c.cls, c.w + 'x' + c.h, 'box', JSON.stringify(c.box), 'content', JSON.stringify(c.content), '| ref', r ? r.w + 'x' + r.h + ' content ' + JSON.stringify(r.content) : 'none');
  }
  for (const z of x.clipped.filter(z => z.how === 'clipped')) {
    const r = y.clipped.find(w => w.path === z.path && w.how === z.how);
    console.log('CLIP', id, z.cls, JSON.stringify(z.text).slice(0, 50), JSON.stringify(z.box) + '→' + JSON.stringify(z.content), 'clamp', z.clamp, z.ellipsis ? 'ellipsis' : '', '| ref', r ? JSON.stringify(r.box) + '→' + JSON.stringify(r.content) + ' ' + JSON.stringify(r.text).slice(0, 50) : 'NONE');
  }
}
