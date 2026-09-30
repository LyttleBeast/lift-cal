// ironpal.mjs — build candidate Iron Age tokens from OKLCH targets (anchored on the sampled scans) and check WCAG contrast.
import { execFileSync } from 'node:child_process';
const cm = (...a) => execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/colormath.mjs', ...a]).toString().trim();
const T = {
  light: {
    stock: [0.955, 0.022, 80], stock2: [0.925, 0.028, 78], stock3: [0.890, 0.032, 76],
    ink: [0.235, 0.016, 60], ink2: [0.430, 0.020, 62], ink3: [0.540, 0.020, 65],
    vermilion: [0.520, 0.160, 29], chromeYellow: [0.800, 0.150, 95], ochreText: [0.520, 0.100, 80],
    bottleGreen: [0.450, 0.075, 145], prussian: [0.420, 0.085, 252], slate: [0.460, 0.025, 219], iron: [0.600, 0.012, 250],
  },
  dark: {
    ground: [0.205, 0.012, 70], ground2: [0.245, 0.014, 70], text: [0.930, 0.028, 82], text2: [0.760, 0.030, 78], text3: [0.620, 0.025, 76],
    vermilion: [0.640, 0.160, 31], chromeYellow: [0.820, 0.150, 95], bottleGreen: [0.680, 0.090, 145], prussian: [0.680, 0.080, 250], iron: [0.720, 0.012, 250],
  },
};
const out = {};
for (const [g, set] of Object.entries(T)) { out[g] = {}; for (const [k, v] of Object.entries(set)) out[g][k] = cm('mk', ...v.map(String)); }
console.log(JSON.stringify(out, null, 1));
const L = out.light, D = out.dark;
const pairs = [
  [L.ink, L.stock], [L.ink2, L.stock], [L.ink3, L.stock], [L.ink, L.stock3], [L.ink2, L.stock3],
  [L.vermilion, L.stock], [L.ochreText, L.stock], [L.chromeYellow, L.stock], [L.bottleGreen, L.stock], [L.prussian, L.stock], [L.slate, L.stock], [L.iron, L.stock],
  [L.ink, L.chromeYellow], [L.stock, L.vermilion], [L.stock, L.ink],
  [D.text, D.ground], [D.text2, D.ground], [D.text3, D.ground], [D.vermilion, D.ground], [D.chromeYellow, D.ground], [D.bottleGreen, D.ground], [D.prussian, D.ground], [D.iron, D.ground], [D.text2, D.ground2],
];
console.log(cm('cr', ...pairs.flat()));
