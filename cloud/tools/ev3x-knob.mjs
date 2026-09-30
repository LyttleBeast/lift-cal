// ev3x: in a run's scene dumps, every .tog's ::after background and every
// .you-greet-name's colour, A and B side by side.
//   node ev3x-knob.mjs <runName> <scene> [widths=390,320]
import { readGz } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
import { existsSync } from 'node:fs';
const [run, scene, ws = '390,320'] = process.argv.slice(2);
for (const w of ws.split(',')) for (const side of ['A', 'B']) {
  const f = `/Users/micahflunker/dev/vibes-night/proof/${run}/${side}/${w}/${scene}.dump.json.gz`;
  if (!existsSync(f)) { console.log(side, w, 'no dump', f); continue; }
  const D = readGz(f);
  const st = k => Object.fromEntries(D.props.map((p, i) => [p, D.styles[k][i]]));
  const out = [];
  for (const e of D.els) {
    const c = (e.at && e.at.class) || '';
    if (/(^| )tog( |$)/.test(c) && e.a !== undefined) out.push(`.${c.replace(/ /g, '.')}::after ${st(e.a)['background-color']}`);
    if (/you-greet-name/.test(c) && e.s !== undefined) out.push(`.you-greet-name ${st(e.s).color}`);
  }
  console.log(side, w, D.htmlAttrs ? JSON.stringify(D.htmlAttrs) : '', out.join(' | ') || '(none)');
}
