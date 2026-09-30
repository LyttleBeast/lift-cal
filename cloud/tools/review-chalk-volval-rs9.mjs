// Review scratch (chalk r1): width of the macro row figure at 11pt in v1's
// native Archivo and Chalk's Sofia Sans, tabular figures on, against the 42pt
// column native food.jsx MacroRow keeps.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const hbMod = await import('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs/index.js');
const hb = await (hbMod.default || hbMod);
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk';
const arch = '/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo';
const archDir = readdirSync(arch).find(d => /400/.test(d));
const archFile = join(arch, archDir, readdirSync(join(arch, archDir)).find(f => f.endsWith('.ttf')));
const faces = {
  archivo400: archFile,
  sofia400: join(NAT, 'assets/fonts/SofiaSans/SofiaSans_400.ttf'),
  sofia600: join(NAT, 'assets/fonts/SofiaSans/SofiaSans_600.ttf'),
};
const strs = process.argv.slice(2).length ? process.argv.slice(2) : ['142/200', '88/150', '112.5/250', '250/300', '2150/2400', '188/188', '42/65'];
for (const [k, p] of Object.entries(faces)) {
  const blob = hb.createBlob(readFileSync(p));
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  const upem = face.upem;
  const out = [];
  for (const s of strs) {
    const buf = hb.createBuffer(); buf.addText(s); buf.guessSegmentProperties();
    hb.shape(font, buf, 'tnum');
    const adv = buf.json().reduce((a, g) => a + g.ax, 0);
    out.push(`${s}=${(adv / upem * 11).toFixed(1)}`);
    buf.destroy();
  }
  console.log(k, p.split('/').pop(), out.join('  '));
  font.destroy(); face.destroy(); blob.destroy();
}
