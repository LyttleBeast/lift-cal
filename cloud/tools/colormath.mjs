// colormath.mjs — OKLCH readout of sampled hexes, OKLCH->hex for proposed tokens, WCAG 2.x contrast pairs.
// Usage: node colormath.mjs lch '#hex' ...        -> L C h per hex
//        node colormath.mjs mk L C h              -> hex (gamut-clipped by chroma reduction)
//        node colormath.mjs cr '#fg' '#bg' ...     -> contrast ratio of each fg against bg (pairs)
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
const parse = h => [1, 3, 5].map(i => parseInt(h.replace('#', '').slice(i - 1, i + 1), 16));
function oklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return [R, G, B];
}
const inGamut = rgb => rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4);
function mk(L, C, h) {
  let c = C; let rgb;
  for (let i = 0; i < 200; i++) { const hr = h * Math.PI / 180; rgb = fromOklab([L, c * Math.cos(hr), c * Math.sin(hr)]); if (inGamut(rgb)) break; c *= 0.98; }
  return '#' + rgb.map(toSrgb).map(v => v.toString(16).padStart(2, '0')).join('');
}
const lum = h => { const [r, g, b] = parse(h).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const [mode, ...args] = process.argv.slice(2);
if (mode === 'lch') for (const h of args) { const [L, a, b] = oklab(parse(h)); const C = Math.hypot(a, b); let hh = Math.atan2(b, a) * 180 / Math.PI; if (hh < 0) hh += 360; console.log(`${h}  L ${L.toFixed(3)}  C ${C.toFixed(3)}  h ${hh.toFixed(1)}`); }
else if (mode === 'mk') console.log(mk(Number(args[0]), Number(args[1]), Number(args[2])));
else if (mode === 'cr') for (let i = 0; i < args.length; i += 2) console.log(`${args[i]} on ${args[i + 1]}: ${cr(args[i], args[i + 1]).toFixed(2)}:1`);
