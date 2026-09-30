
import { readFileSync } from 'node:fs';
const [f, scene, re] = process.argv.slice(2);
const J = JSON.parse(readFileSync(f,'utf8')); const R=new RegExp(re);
for (const s of J.scenes||[]) { if (!(s.pass+':'+s.name).includes(scene)) continue; s.rows.forEach((x,i)=>{ const t=JSON.stringify(x); if (R.test(t)) console.log(s.pass+':'+s.name, i, t.slice(0,600)); }); break; }
for (const r of J.results||[]) { if (r.scene!==scene) continue; r.rows.forEach((x,i)=>{ const t=JSON.stringify(x); if (R.test(t)) console.log(r.scene, i, t.slice(0,600)); }); }
