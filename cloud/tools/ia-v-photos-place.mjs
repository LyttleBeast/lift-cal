// ia-v-photos-place.mjs — place Iron Age's photo files and write PROVENANCE.json,
// byte-identical, in both vibe worktrees (V59 §14: one PROVENANCE.json per
// vibe folder, mirrored in both trees).
//
//   node ia-v-photos.mjs && node ia-v-photos-check.mjs && node ia-v-photos-place.mjs
//
// Reads ia-photos/out/{*.png, run.json, check.json} (refuses unless the check
// passed and the files on disk are the ones it measured) and the research
// draft's rights fields for each plate, and writes
//   web     vibes/iron-age/img/<file>        + vibes/iron-age/PROVENANCE.json
//   native  assets/vibes/iron-age/img/<file> + assets/vibes/iron-age/PROVENANCE.json
// It keeps any entry another Phase V job has already put in PROVENANCE.json
// (an entry whose `kind` is not "photo"), and replaces only the photo entries.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JOBS } from './ia-v-photos.mjs';

const NIGHT = '/Users/micahflunker/dev/vibes-night';
const OUT = NIGHT + '/ia-photos/out';
const TREES = { web: NIGHT + '/wt/web-v-iron-age/vibes/iron-age', native: NIGHT + '/wt/nat-v-iron-age/assets/vibes/iron-age' };
const sha = b => createHash('sha256').update(b).digest('hex');
const run = JSON.parse(readFileSync(OUT + '/run.json', 'utf8'));
const check = JSON.parse(readFileSync(OUT + '/check.json', 'utf8'));
if (!check.pass) throw new Error('ia-v-photos-check did not pass');
const draft = JSON.parse(readFileSync(NIGHT + '/research/iron-age/PROVENANCE.photos.draft.json', 'utf8'));

/* What was re-opened on 2026-09-27 for this job (saved under ia-photos/verify/). */
const REVERIFIED = {
  'gym-naval-academy': 'Re-opened 2026-09-27: https://www.loc.gov/item/2016804446/?fo=json — rights_advisory "No known restrictions on publication."; notes "Title and date from Detroit, Catalogue J (1901)." and "Detroit Publishing Co. no. 021344."; reproduction number LC-DIG-det-4a15039; creator "Detroit Publishing Co., publisher".',
  'sargent-1904-leaf0205-teamsters-warning': 'Re-opened 2026-09-27: https://archive.org/metadata/healthstrengthpo1904sarg — creator "Sargent, Dudley Allen, 1849-1924", publisher "New York, Boston, H. M. Caldwell co", date "1904", no rights field; the item\'s text layer (_djvu.txt) reads "Copyright^ igo4 / By H. M. Caldwell Co." (OCR of "Copyright, 1904") and the preface\'s "photographs of a well-trained model".',
  'anderson-pulleys-man-lunge-1897': 'Re-opened 2026-09-27: https://archive.org/metadata/andersonsphysica00andeiala — creator "Anderson, William Gilbert, 1860-1947", date "1897", possible-copyright-status "NOT_IN_COPYRIGHT", copyright-evidence "visible notice of copyright; stated date is 1897"; the text layer reads "COPYRIGHT 1897, BV W. G. ANDERSON, NEW HAVEN, CONN."'
};

const CLOTHING = {
  'you.png': 'PASS. In frame: the model\'s head, arms and hands, and the top of his bare chest (the plate: knitted gymnasium tights to the ankle, belt, soft shoes, bare torso; an exercise pose, not a statue pose). No nudity, no drape, no fig leaf. Unnamed model.',
  'recap.png': 'PASS. In frame: the athlete\'s head, pulling arm and handle, bare shoulders and the top of his chest (the plate: loose trunks, bare torso, light shoes; an exercise at the wall pulleys). No nudity, no drape. Unnamed model.',
  'steps.png': 'PASS. No people in frame (ropes, trusses, a chandelier, gallery windows).',
  'weight.png': 'PASS. No people in frame (pommel horse, dumbbell racks, vaulting buck, mats).',
  'pick.png': 'PASS. No people in frame (pommel horse, dumbbell rack, windows).'
};

const entries = JOBS.map(j => {
  const d = draft.find(e => e.file.endsWith('/' + j.plate + '.' + (j.ext)));
  const r = run.files.find(f => f.out === j.out), c = check.files.find(f => f.file === j.out);
  const buf = readFileSync(`${OUT}/${j.out}`);
  if (sha(buf) !== r.sha256 || sha(buf) !== c.sha256) throw new Error(j.out + ': the file is not the one built and measured');
  const band = j.slot !== 'thumb';
  return {
    kind: 'photo',
    file: 'img/' + j.out,
    paths: { web: 'vibes/iron-age/img/' + j.out, native: 'assets/vibes/iron-age/img/' + j.out },
    slot: j.slot,
    use: band ? 'band mode: an 80 pt strip across the top of the hero box, no word on it (design/iron-age.md §10); cover-cropped round the file\'s centre (focal .5 / .5)' : 'the Vibes card thumbnail, 112 x 88 pt, under the definition\'s stock .54 scrim, `315` in ink over it',
    sha256: r.sha256, bytes: r.bytes, dims: c.dims,
    format: '4-bit indexed PNG, 10 colours, all on the ink #1c1712 - stock #e6dec9 line',
    title: d.title, subject: d.subject, creator: d.creator, creator_died: d.creator_died, created: d.created,
    first_published: d.first_published,
    source_institution: d.source_institution, source_url: d.source_url, source_id: d.source_id,
    rights_statement_verbatim: d.rights_statement_verbatim, pd_basis_us: d.pd_basis_us, pd_basis_worldwide: d.pd_basis_worldwide,
    retrieved: d.retrieved, original_file: 'research/iron-age/originals/' + j.plate + '.' + j.ext,
    original_sha256: d.original_sha256, original_dims: d.original_dims, download_url: d.download_url,
    crop_px: j.crop, crop_why: j.why,
    transforms: r.transforms,
    clothing_check: CLOTHING[j.out],
    likeness: d.likeness || (j.plate === 'gym-naval-academy' ? 'No people in frame.' : null),
    face_rule: band
      ? { rule: 'a head box (hair top to chin, ear to ear, read by eye off gridded views, +-10 source px) grown 15 % of its height above and below and 10 % of its width each side must be wholly visible in every box', head_boxes_source_px: j.faces,
          boxes: c.boxes.map(b => ({ client: b.client, box: b.box, min_margin_asset_px: b.faces.length ? Math.min(...b.faces.map(f => f.margin)) : null })),
          result: j.faces.length ? 'PASS at every box' : 'no people' }
      : { rule: 'as for the bands', boxes: ['112x88'], result: 'no people' },
    lettering: j.lettering.length ? j.lettering.map(l => l.what + ': outside the crop') : 'none on the plate',
    contrast: band
      ? { text_on_plate: 'none (band mode)', plate_range: c.plateRange,
          declared_fallback_stock_scrim_054_every_word_ink: Object.fromEntries(c.boxes.map(b => [b.client + ' ' + b.box, b.worst])) ,
          note: 'Only if a client drew the declared scrim over the whole box instead of the band: ink text against the darkest scrimmed pixel of the box\'s visible window, worst of encoded sRGB at .54, linear light at .54, and encoded at .53 (Chrome\'s run-time loss). Any other text colour on that fallback fails (spec §5.1).' }
      : { text_on_plate: '`315`, loadNum 35, chalk #1c1712', scrim: 'rack #e6dec9 at .54 (the definition\'s STOCK_SCRIM, drawn at run time)',
          worst_pixel_and_ratio: c.boxes[0].text315, worst: c.boxes[0].worst },
    tier: d.tier, confidence: d.confidence,
    credit_line: d.credit_line,
    reverified: REVERIFIED[j.plate],
    micah_approved: false
  };
});

const NOT_USED = [{
  plate: 'anderson-pulleys-woman-front-1897', slot: 'weightLog', spec: 'design/iron-age.md §10 names it for weightLog, pending Q-Q2',
  why: 'Fails the face rule on every band box. Her head (bun top 627 to chin 897, 742-925 across, source px) grown by the rule spans 351 px; the widest band the plate allows (its crop hint, 1533 px wide, at the band\'s 4.98:1) is 308 px tall. Rights and clothing pass; the geometry does not. The spec\'s fallback, gym-naval-academy, is used (img/weight.png).'
}];

const DECISIONS = [
  'Halftone pitch 6 device px (2.0 pt on the @3x thumbnail, 2.04 pt on the bands) in place of the spec\'s 3.0 pt (§10 pipeline step 4): at 3.0 pt an 80 pt band holds 26 dot rows and the naval plate and the thumbnail read as a checkerboard. The spec-exact set (IA_PITCH=9) is built and checked too: ~/dev/vibes-night/ia-photos/out-p9/ (all checks pass).',
  'weightLog falls back to the naval gym (the woman plate fails the face rule), so the naval plate appears on Steps, Weight and the Vibes card, in three different crops (spec §16 names the risk).',
  'The Sargent crop takes 67 px of plain page margin above the plate\'s crop hint, so the face rule clears his hair by 20 asset px rather than 7.',
  'No scrim is baked into any file (band mode needs none; the thumbnail\'s is the definition\'s, drawn at run time).'
];

const doc = {
  vibe: 'iron-age',
  kind: 'provenance',
  written: '2026-09-27',
  about: 'Every image Iron Age ships, one entry each (V59 §14). Photo entries are written by vibes-night/tools/ia-v-photos-place.mjs from the untouched originals, the build log (ia-v-photos.mjs) and the pixel measurements (ia-v-photos-check.mjs). No AI tool touched any file; every transform is listed as the command that made it. Nothing is approved: micah_approved is false on every entry.',
  build: { scripts: { 'tools/ia-v-photos.mjs': run.script_sha256, 'tools/gap8a/palpng.mjs': run.palpng_sha256 }, node: run.node, pngjs: run.pngjs, sips: run.sips, stock: run.stock, ink: run.ink, pitch_px: run.pitch_px, coverage: run.a },
  imagery_bytes_photos: entries.reduce((s, e) => s + e.bytes, 0),
  entries: [], not_used: NOT_USED, decisions_left_to_micah: DECISIONS
};

for (const [client, dir] of Object.entries(TREES)) {
  mkdirSync(dir + '/img', { recursive: true });
  for (const j of JOBS) copyFileSync(`${OUT}/${j.out}`, `${dir}/img/${j.out}`);
  const pf = dir + '/PROVENANCE.json';
  const kept = existsSync(pf) ? (JSON.parse(readFileSync(pf, 'utf8')).entries || []).filter(e => e.kind !== 'photo') : [];
  const out = { ...doc, entries: [...entries, ...kept] };
  writeFileSync(pf, JSON.stringify(out, null, 2) + '\n');
  console.log(client, pf, kept.length ? `(kept ${kept.length} other entries)` : '');
}
