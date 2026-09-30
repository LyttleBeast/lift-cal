// Iron Age fix round gates-1-rs9: the pairs each fix draws, from the definition.
import { pathToFileURL } from 'node:url';
const TREE = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const D = (await import(pathToFileURL(TREE + '/vibes/defs/iron-age.js').href)).default;
const C = D.colors;
const hx = v => (typeof v === 'string' ? v : v.native || v.web);
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const c = k => hx(C[k]);
const GRAIN = '#e0d8c4', PRESSED = '#ded6c2';
console.log('1 heat: warn .70 on rack', CR(mix(c('warn'), .7, c('rack')), c('rack')), 'grain', CR(mix(c('warn'), .7, GRAIN), GRAIN),
  '| vs collar', CR(mix(c('warn'), .7, c('rack')), c('collar')), '| pGreen .70 on rack', CR(mix(c('pGreen'), .7, c('rack')), c('rack')), '| warn 1 on rack', CR(c('warn'), c('rack')));
console.log('2 peak: warn on rack', CR(c('warn'), c('rack')), 'grain', CR(c('warn'), GRAIN), 'bar', CR(c('warn'), c('bar')), '| steel on rack', CR(c('steel'), c('rack')));
console.log('3 swipe hint: dim on rack', CR(c('dim'), c('rack')), 'grain', CR(c('dim'), GRAIN), 'bar', CR(c('dim'), c('bar')));
console.log('4 placeholder: dim on bar', CR(c('dim'), c('bar')), 'on rack', CR(c('dim'), c('rack')), 'raised', CR(c('dim'), c('raised')));
console.log('5 weight box: knurl on bar', CR(c('knurl'), c('bar')), 'on rack', CR(c('knurl'), c('rack')), 'grain', CR(c('knurl'), GRAIN));
console.log('6 switch: bar knob on grip', CR(c('bar'), c('grip')), 'on accent', CR(c('bar'), c('accent')), '| grip track on rack', CR(c('grip'), c('rack')), 'on bar', CR(c('grip'), c('bar')), '| accent track on rack', CR(c('accent'), c('rack')), 'on bar', CR(c('accent'), c('bar')));
console.log('7 pill: native pro =', D.admin.pill.native.pro, '; warn on rack', CR(c('warn'), c('rack')), 'pressed', CR(c('warn'), PRESSED), 'bar', CR(c('warn'), c('bar')));
console.log('8 cal fill solid on track: pYellow', CR(c('pYellow'), c('track')), 'pBlue', CR(c('pBlue'), c('track')), 'pRed', CR(c('pRed'), c('track')), '| .92 pYellow', CR(mix(c('pYellow'), .92, c('track')), c('track')));
console.log('9 stacked dim hatch lines, full strength on rack: pYellow', CR(c('pYellow'), c('rack')), 'pBlue', CR(c('pBlue'), c('rack')), 'pRed', CR(c('pRed'), c('rack')));
