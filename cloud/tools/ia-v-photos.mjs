// ia-v-photos.mjs — Iron Age Phase V photos: the four band plates and the
// Vibes-card thumbnail, from untouched Tier A originals, by deterministic
// operations only (V59 §11, §14; design/iron-age.md §10):
//
//   1. sips-316 -s format png            the original, whole, to a work PNG
//   2. sips-316 -c h w --cropOffset y x   the crop (source px, below; inside
//                                         each plate's crop hint, lettering out)
//   3. sips-316 -z H W                    resample to the slot's asset size
//   4. node + pngjs (this file):          the ink-on-stock tone map (07 G.4:
//        Rec. 709 Y on linear sRGB -> L* -> levels on the crop's own
//        P0.5 / P99.5 -> linear in L* between coverage a = 1.00 and a = 0.04,
//        exact in luminance against stock #e6dec9 and ink #1c1712)
//   5. node (this file):                  an AM halftone, pitch PITCH (6) device px,
//        45 degrees, dot AREA = a (no gain curve), round ink dots for a <= .5
//        and round stock holes on the dual lattice above, 3 x 3 supersampled,
//        ink and stock mixed in LINEAR light (Murray-Davies). Exactly 10
//        coverage levels, so exactly 10 colours on the ink-stock line.
//   6. node, gap8a/palpng.mjs:            4-bit indexed PNG, lossless.
//
// No scrim is baked into any file: in band mode no word sits on a plate, and
// the thumbnail's stock .54 scrim is the definition's, drawn at run time
// (native PhotoLayer; web by vibes/iron-age.css). Nothing is sharpened,
// restored, colourised or generated. No CSS sepia; the only colours are the
// vibe's own ink and stock.
//
//   node ia-v-photos.mjs            -> ~/dev/vibes-night/ia-photos/out/*.png + run.json
// Deterministic: the same originals give byte-identical files (sha256 in run.json).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { encodePalettePNG } from './gap8a/palpng.mjs';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const ORIG = NIGHT + '/research/iron-age/originals';
const DRAFT = NIGHT + '/research/iron-age/PROVENANCE.photos.draft.json';
const ROOT = NIGHT + '/ia-photos';
const WORK = ROOT + '/work', CROP = ROOT + '/crop', OUT = process.env.IA_OUT || ROOT + '/out';
for (const d of [WORK, CROP, OUT]) mkdirSync(d, { recursive: true });

export const STOCK = '#e6dec9', INK = '#1c1712';
/* PITCH 6 device px: 2.0 pt on the @3x thumbnail, 2.04 pt on the 235 px / 80 pt
   band (about 80 lines an inch on a 460 ppi phone, a newspaper screen). The
   spec's 3.0 pt (9 px) leaves 26 dot rows in an 80 pt band: the naval plate
   and the thumbnail dissolved into a checkerboard (study renders
   ia-photos/out-p9/). 6 px keeps 4 device px a dot on a @2x phone (0.68x),
   where 4.5 px would fall to 3 and alias. A decision left to Micah; set
   IA_PITCH=9 to rebuild the spec's exact screen. */
export const PITCH = Number(process.env.IA_PITCH || 6);
export const A_MIN = 0.04, A_MAX = 1.0;

/* The jobs. Rects are SOURCE pixels of the untouched original (x0, y0, w, h).
   `faces` are head boxes read by eye (hair top to chin, ear to ear) off
   gridded study views (ia-ph-view.mjs; ia-photos/view/*.png), about +-10 px;
   the face rule (design/iron-age.md §10, Q-Q2) is checked by ia-v-photos-check.mjs. */
export const JOBS = [
  { out: 'you.png', slot: 'youHero', plate: 'sargent-1904-leaf0205-teamsters-warning', ext: 'jp2',
    crop: { x: 82, y: 70, w: 3094, h: 621 }, size: [1170, 235],
    why: 'Fig. 21 only: the head, the arms flung out level and both hands, over the top of the grey panel. The hint\'s full width (x .025-.965); top at 70 px, 67 px above the hint\'s .03 (137 px), into the clean page margin, so the face rule clears the hair with room (the page-top view shows plain stock there); "Fig. 21." (y ~1246) and all lettering far below.',
    faces: [{ x0: 1288, y0: 175, x1: 1621, y1: 525 }],
    lettering: [{ what: '"Fig. 21."', x0: 700, y0: 1170, x1: 1150, y1: 1330 }, { what: '"Fig. 22."', x0: 2000, y0: 1450, x1: 2500, y1: 1620 }] },
  { out: 'recap.png', slot: 'summaryHero', plate: 'anderson-pulleys-man-lunge-1897', ext: 'jp2',
    crop: { x: 84, y: 699, w: 1507, h: 303 }, size: [1170, 235],
    why: 'The lunge\'s top: the pulling arm and its handle at the left, the head, the shoulders, the cords at the right, on the plate\'s black ground. The hint\'s full width (x .05-.945).',
    faces: [{ x0: 644, y0: 740, x1: 832, y1: 960 }],
    lettering: [] },
  { out: 'steps.png', slot: 'stepsToday', plate: 'gym-naval-academy', ext: 'tif',
    crop: { x: 153, y: 1150, w: 2650, h: 532 }, size: [1170, 235],
    why: 'The ropes and the trusses: the knotted and the plain climbing rope, the roof trusses and a chandelier, the top of the gallery windows. The left half of the frame, inside the tightened hint (x .03-.955, y .05-.93, gap8a photos.mjs: the negative border and the "M.H." out). No people.',
    faces: [], lettering: [{ what: 'handwritten "M.H."', x0: 3928, y0: 3826, x1: 4235, y1: 3948 }] },
  { out: 'weight.png', slot: 'weightLog', plate: 'gym-naval-academy', ext: 'tif',
    crop: { x: 850, y: 2330, w: 3000, h: 603 }, size: [1170, 235],
    why: 'THE FALLBACK: the spec\'s plate, anderson-pulleys-woman-front-1897, fails the face rule on every band box (her head, bun to chin, grown by the rule, is 351 px; the widest band the plate allows is 308 px). So the naval gym, a different strip from Steps\': the pommel horse, the dumbbell racks along the wall, the vaulting buck and the mats. No people.',
    faces: [], lettering: [{ what: 'handwritten "M.H."', x0: 3928, y0: 3826, x1: 4235, y1: 3948 }] },
  { out: 'pick.png', slot: 'thumb', plate: 'gym-naval-academy', ext: 'tif',
    crop: { x: 1790, y: 2208, w: 1100, h: 864 }, size: [336, 264],
    why: 'The Vibes card (112 x 88 pt @3x): the pommel horse, close, the dumbbell rack and the windows behind. No people.',
    faces: [], lettering: [{ what: 'handwritten "M.H."', x0: 3928, y0: 3826, x1: 4235, y1: 3948 }] }
];

// ---------- colour ----------
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const LIN = Float64Array.from({ length: 256 }, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
export const lumRGB = (r, g, b) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];
const enc = l => Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));
const INKC = hex(INK), STKC = hex(STOCK);
const INKL = INKC.map(v => LIN[v]), STKL = STKC.map(v => LIN[v]);
const Ys = lumRGB(...STKC), Yi = lumRGB(...INKC);
const Lstar = Y => 116 * (Y > 216 / 24389 ? Math.cbrt(Y) : (24389 / 27 * Y + 16) / 116) - 16;
const YofL = L => { const f = (L + 16) / 116; return f ** 3 > 216 / 24389 ? f ** 3 : L / (24389 / 27); };
// the 10 colours a 3 x 3 supersampled dot can make: c = k / 9 ink, in linear light
export const PALETTE = Array.from({ length: 10 }, (_, k) => { const c = k / 9; return [0, 1, 2].map(i => enc(INKL[i] * c + STKL[i] * (1 - c))); });

const sha = b => createHash('sha256').update(b).digest('hex');
const SIPS = '/usr/bin/sips';
const sips = args => { execFileSync(SIPS, args, { stdio: 'pipe' }); return 'sips-316 ' + args.map(a => a.startsWith('/') ? a.replace(NIGHT + '/', '') : a).join(' '); };

function toneMap(Y) {
  const Ls = Float64Array.from(Y, Lstar), s = Float64Array.from(Ls).sort();
  const P0 = s[Math.floor(0.005 * (s.length - 1))], P1 = s[Math.floor(0.995 * (s.length - 1))];
  const Lhi = Lstar((1 - A_MIN) * Ys + A_MIN * Yi), Llo = Lstar(A_MAX * Yi + (1 - A_MAX) * Ys);
  const a = new Float64Array(Y.length);
  for (let i = 0; i < Y.length; i++) {
    const n = Math.max(0, Math.min(1, (Ls[i] - P0) / Math.max(1e-6, P1 - P0)));
    const Yo = YofL(Llo + n * (Lhi - Llo));
    a[i] = Math.max(A_MIN, Math.min(A_MAX, (Ys - Yo) / (Ys - Yi)));
  }
  return { a, P0: +P0.toFixed(3), P1: +P1.toFixed(3) };
}

// returns palette indices 0..9 (the count of inked subsamples)
function halftone(A, W, H) {
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += A[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  const half = PITCH / 2, cs = Math.SQRT1_2, sn = Math.SQRT1_2;
  const mean = (cx, cy) => {
    const x0 = Math.max(0, Math.min(W, Math.round(cx - half))), x1 = Math.max(0, Math.min(W, Math.round(cx + half)));
    const y0 = Math.max(0, Math.min(H, Math.round(cy - half))), y1 = Math.max(0, Math.min(H, Math.round(cy + half)));
    if (x1 <= x0 || y1 <= y0) return A[Math.max(0, Math.min(H - 1, Math.round(cy))) * W + Math.max(0, Math.min(W - 1, Math.round(cx)))];
    return (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const cache = new Map();
  const cov = (u, v) => { const k = u * 100003 + v; let t = cache.get(k); if (t === undefined) { t = mean((u * cs - v * sn) * PITCH, (u * sn + v * cs) * PITCH); cache.set(k, t); } return t; };
  const idx = new Uint8Array(W * H), SS = [1 / 6, 3 / 6, 5 / 6];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = 0;
      for (const oy of SS) for (const ox of SS) {
        const X = x + ox, Yv = y + oy, u = (X * cs + Yv * sn) / PITCH, v = (-X * sn + Yv * cs) / PITCH;
        const iu = Math.round(u), iv = Math.round(v), t = cov(iu, iv);
        let ink;
        if (t <= 0.5) { const du = (u - iu) * PITCH, dv = (v - iv) * PITCH; ink = du * du + dv * dv < PITCH * PITCH * t / Math.PI; }
        else { const hu = Math.floor(u) + 0.5, hv = Math.floor(v) + 0.5, th = cov(hu, hv), du = (u - hu) * PITCH, dv = (v - hv) * PITCH; ink = !(du * du + dv * dv < PITCH * PITCH * (1 - th) / Math.PI); }
        if (ink) c++;
      }
      idx[y * W + x] = c;
    }
    if (y % 48 === 0) cache.clear();
  }
  return idx;
}

const draft = JSON.parse(readFileSync(DRAFT, 'utf8'));
const ME = readFileSync(new URL(import.meta.url)), PAL = readFileSync(NIGHT + '/tools/gap8a/palpng.mjs');
const run = { script: 'tools/ia-v-photos.mjs', script_sha256: sha(ME), palpng_sha256: sha(PAL), node: process.version,
  pngjs: require('pngjs/package.json').version, sips: 'sips-316', stock: STOCK, ink: INK, pitch_px: PITCH, a: [A_MIN, A_MAX], palette: PALETTE, files: [] };

if (import.meta.url === 'file://' + process.argv[1]) {
  for (const j of JOBS) {
    const d = draft.find(e => e.file.endsWith('/' + j.plate + '.' + j.ext));
    if (!d) throw new Error('no draft entry for ' + j.plate);
    const src = `${ORIG}/${j.plate}.${j.ext}`, buf = readFileSync(src), h = sha(buf);
    if (h !== d.sha256 || h !== d.original_sha256) throw new Error(j.plate + ': original sha256 ' + h + ' is not the draft\'s');
    const [ow, oh] = d.dims.split('x').map(Number);
    const c = j.crop;
    if (c.x < 0 || c.y < 0 || c.x + c.w > ow || c.y + c.h > oh) throw new Error(j.out + ': crop outside the original');
    const work = `${WORK}/${j.plate}.png`;
    const cmds = [];
    if (!existsSync(work)) sips(['-s', 'format', 'png', src, '--out', work]);
    cmds.push(`sips-316 -s format png research/iron-age/originals/${j.plate}.${j.ext} --out <work>.png  (whole original, lossless)`);
    const cropF = `${CROP}/${j.out.replace('.png', '')}-crop.png`, sizedF = `${CROP}/${j.out.replace('.png', '')}-sized.png`;
    cmds.push(sips(['-c', String(c.h), String(c.w), '--cropOffset', String(c.y), String(c.x), work, '--out', cropF]).replace(WORK + '/', '<work>/'));
    cmds.push(sips(['-z', String(j.size[1]), String(j.size[0]), cropF, '--out', sizedF]));
    const png = PNG.sync.read(readFileSync(sizedF));
    const [W, H] = j.size;
    if (png.width !== W || png.height !== H) throw new Error(j.out + ': sips gave ' + png.width + 'x' + png.height);
    const Y = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) Y[i] = lumRGB(png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2]);
    const tm = toneMap(Y);
    const idx = halftone(tm.a, W, H);
    const out = encodePalettePNG(idx, W, H, PALETTE);
    writeFileSync(`${OUT}/${j.out}`, out);
    cmds.push(`node ${process.version} + pngjs ${run.pngjs}, tools/ia-v-photos.mjs sha256 ${run.script_sha256}: ink-on-stock tone map (Rec. 709 Y, linear sRGB -> L*; levels on the crop's own P0.5 = L* ${tm.P0}, P99.5 = L* ${tm.P1}; linear in L* to coverage a in [${A_MIN}, ${A_MAX}], exact in luminance against stock ${STOCK} / ink ${INK})`);
    cmds.push(`node (same script): AM halftone, pitch ${PITCH} px, 45 deg, dot area = a, round dot <= .5 / round stock hole on the dual lattice above, 3 x 3 supersampled, ink ${INK} and stock ${STOCK} mixed in linear light (10 levels)`);
    cmds.push(`node (same script), tools/gap8a/palpng.mjs sha256 ${run.palpng_sha256}: 4-bit indexed PNG, 10-colour palette, zlib level 9, lossless`);
    run.files.push({ out: j.out, slot: j.slot, plate: j.plate, crop: c, size: j.size, levels: [tm.P0, tm.P1], bytes: out.length, sha256: sha(out), transforms: cmds });
    console.log(j.out, W + 'x' + H, out.length, 'B', sha(out).slice(0, 12), 'levels', tm.P0, tm.P1);
  }
  writeFileSync(OUT + '/run.json', JSON.stringify(run, null, 1));
}
