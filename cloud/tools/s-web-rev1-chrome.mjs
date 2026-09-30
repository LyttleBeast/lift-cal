#!/usr/bin/env node
// Adversarial review of S (web), round 1: two browser facts the Vibes sheet
// depends on, measured in headless Chrome under the night's harness lock.
//
//   T1  vibes-sheet.js faceReady(): document.fonts.load(font, '315') resolves
//       with the FontFace objects that matched. A family with no @font-face
//       (a system face, a generic, or 'Archivo' when rack.css's Google Fonts
//       @import did not arrive) matches none -> [] -> faceReady false -> the
//       tile's number keeps .wait (visibility: hidden) for good.
//   T2  vibes-sheet.js's claim that a tile's data-vibe lets a vibe's own
//       stylesheet reach "its own tile ... and no other vibe's", and the hook
//       the builder leaves for Phase V: [data-vibe="<id>"] .vibe-num { font-size }.
//       <html data-vibe="x"> is an ancestor of EVERY tile, so while x is worn
//       that rule also resizes v1's tile. An anchored selector,
//       [data-vibe="y"].vibe-in .vibe-num, which the scoping lint accepts (it
//       starts with [data-vibe="y"]), does not leak.
import { acquireLock, startChrome, CDP, sleep } from '/Users/micahflunker/dev/vibes-night/wt/web-settings/report/btn-44/harness-lib.mjs';
import { mkdirSync } from 'node:fs';

const release = await acquireLock({ waitMs: 20 * 60e3 });
const profile = '/Users/micahflunker/dev/vibes-night/tmp/s-web-rev1-chrome-profile';
mkdirSync(profile, { recursive: true });
const chrome = await startChrome({ cdpPort: 9471, profile, log: m => console.log(m) });
try {
  const c = new CDP(chrome.target.webSocketDebuggerUrl);
  await c.open();
  await c.send('Page.enable');
  const page = `<!doctype html><html><head><style>
    @font-face { font-family: 'ctl-Declared'; src: local('Georgia'); }
    @font-face { font-family: 'ctl-Broken'; src: url(data:font/woff2;base64,AAAAAAAA) format('woff2'); }
    .vibe-num { font-size: 35px; }
    [data-vibe="x"] .vibe-num { font-size: 20px; }
    [data-vibe="y"].vibe-in .vibe-num { font-size: 22px; }
  </style></head><body><div class="sheet">
    <button class="vibe-tile"><span class="vibe-in" data-vibe="v1"><span class="vibe-num">315</span></span></button>
    <button class="vibe-tile"><span class="vibe-in" data-vibe="x"><span class="vibe-num">315</span></span></button>
    <button class="vibe-tile"><span class="vibe-in" data-vibe="y"><span class="vibe-num">315</span></span></button>
  </div></body></html>`;
  await c.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(page) });
  await sleep(800);

  const t1 = await c.ev(`(async () => {
    const out = {};
    for (const f of ["800 35px Georgia", "800 35px system-ui", "800 35px -apple-system", "800 35px serif", "800 35px 'Archivo'", "800 35px 'ctl-Declared'", "800 35px 'ctl-Broken'"]) {
      let r;
      try { const x = await document.fonts.load(f, '315'); r = 'resolved, ' + x.length + ' face(s)'; }
      catch (e) { r = 'rejected: ' + e.name; }
      // faceReady() today draws only when load() resolved with >= 1 face;
      // a candidate: draw when check() says nothing matching is unloaded or failed.
      out[f] = r + ' | faceReady today: ' + (/resolved, [1-9]/.test(r) ? 'draw' : 'HIDE') + ' | fonts.check after load: ' + document.fonts.check(f, '315');
    }
    return out;
  })()`);
  console.log('\nT1  document.fonts.load(font, "315") in Chrome ' + chrome.version.Browser);
  for (const [k, v] of Object.entries(t1)) console.log('    ' + k.padEnd(28) + ' ' + v);

  const t2 = await c.ev(`(() => {
    const nums = [...document.querySelectorAll('.vibe-in')].map(n => [n.dataset.vibe, n.querySelector('.vibe-num')]);
    const read = () => Object.fromEntries(nums.map(([id, n]) => ['tile ' + id, getComputedStyle(n).fontSize]));
    const out = {};
    for (const worn of [null, 'x', 'y']) {
      if (worn) document.documentElement.dataset.vibe = worn; else delete document.documentElement.dataset.vibe;
      out['worn ' + (worn || 'v1')] = read();
    }
    return out;
  })()`);
  console.log('\nT2  computed font-size of each tile\'s .vibe-num, by the vibe worn on <html>');
  console.log('    rules: .vibe-num 35px | [data-vibe="x"] .vibe-num 20px (the hook the S report leaves for vibes) | [data-vibe="y"].vibe-in .vibe-num 22px (anchored)');
  for (const [k, v] of Object.entries(t2)) console.log('    ' + k.padEnd(9) + ' ' + JSON.stringify(v));
  c.ws.close();
} finally {
  chrome.stop();
  release();
}
