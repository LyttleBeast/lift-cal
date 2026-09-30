// ev3m: today's calendar keyline, as each side's captures computed it,
// aggregated: side, width, where (a screen, or a fixture chain), data-vibe,
// its four border colours and width, its ground, its number's ink and weight.
//   node ev3m-caltoday.mjs <runName>
import { readdirSync } from 'node:fs';
import { readGz } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const run = process.argv[2];
const dir = `/Users/micahflunker/dev/vibes-night/proof/${run}`;
const hex = c => { const m = String(c).match(/rgb\((\d+), (\d+), (\d+)\)/); return m ? '#' + m.slice(1).map(x => (+x).toString(16).padStart(2, '0')).join('') : c; };
const agg = new Map();
for (const side of ['A', 'B']) for (const w of readdirSync(`${dir}/${side}`)) {
  if (!/^\d+$/.test(w)) continue;
  for (const f of readdirSync(`${dir}/${side}/${w}`).filter(f => f.endsWith('.dump.json.gz'))) {
    const D = readGz(`${dir}/${side}/${w}/${f}`);
    const P = n => D.props.indexOf(n);
    const found = D.els.filter(e => e.at && /\bcal-day\b/.test(e.at.class || '') && /\btoday\b/.test(e.at.class || ''));
    for (const e of found) {
      const st = D.styles[e.s];
      const num = D.els.find(x => x.p.startsWith(e.p + '>') && x.at && /cal-daynum/.test(x.at.class || ''));
      const key = [side, w, f === 'fixture.dump.json.gz' && e.p.includes('>div:6>div:') ? 'fixture-chain ' + e.p.split('>').slice(3, 4) : 'screen', 'vibe=' + ((D.htmlAttrs || {})['data-vibe'] || '-'),
        'border', ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'].map(p => hex(st[P(p)])).join(','), st[P('border-top-width')],
        'bg', hex(st[P('background-color')]), 'num', num ? hex(D.styles[num.s][P('color')]) + ' ' + D.styles[num.s][P('font-variation-settings')] : '-'].join(' ');
      if (!agg.has(key)) agg.set(key, []);
      agg.get(key).push(f.replace('.dump.json.gz', ''));
    }
  }
}
for (const [k, v] of agg) console.log(v.length, 'scenes:', k, v.length < 4 ? '(' + v.join(',') + ')' : '');
