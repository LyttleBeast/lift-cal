// V/icons (Iron Age, V59 §11/§14): writes vibes/iron-age/icons/PROVENANCE.json in both vibe worktrees
// (web vibes/iron-age/icons/, native assets/vibes/iron-age/icons/ — the same bytes). One entry per traced
// source: the §14 fields (from research/iron-age/PROVENANCE.engravings.draft.json, whose rights research
// this does not redo, plus the one new source, Fairbanks 1919, verified here), the crop box that was
// traced, every command from the page to the drawing, and the hashes measured now from disk.
// The photos' PROVENANCE.json (vibes/iron-age/PROVENANCE.json) is the photos job's; this file is the icons'.
//   node iav-prov.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { SOURCES } from './iai-sources.mjs';
import { PRE, TRACE_OPTS } from './iai-trace.mjs';

const N = '/Users/micahflunker/dev/vibes-night/';
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const bytes = f => readFileSync(f).length;
const dims = f => { const o = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f]).toString();
  return (/pixelWidth: (\d+)/.exec(o) || [])[1] + 'x' + (/pixelHeight: (\d+)/.exec(o) || [])[1]; };
const draft = JSON.parse(readFileSync(N + 'research/iron-age/PROVENANCE.engravings.draft.json', 'utf8')).entries;
const crops = JSON.parse(readFileSync(N + 'icons-ia/crops.json', 'utf8'));
const TOOLS = 'sips-316 (macOS); node v24.20.0; pngjs 7.0.0; imagetracerjs 1.2.6 (public domain / Unlicense)';

// The new source: Fairbanks Dial Scales (1919). Verified 2026-09-27 from the item's metadata
// (archive.org/metadata/fairbanksdialsca00fair) and its full text (the _djvu.txt), both opened.
const FAIRBANKS = {
  title: 'Fairbanks Warehouse All-metal Self-contained Dial Scale, with Suspended Platform',
  subject: 'A warehouse dial scale: a cabinet with a round dial head, over a suspended platform (retouched catalogue halftone; the silhouette only was traced, no lettering)',
  creator: 'Fairbanks, Morse & Co. (corporate catalogue; no photographer, retoucher or artist credited anywhere in the text)',
  creator_died: 'anonymous (corporate work; no individual author named)',
  created: '1919 (Bulletin 135)',
  first_published: { year: '1919', venue: 'Fairbanks dial scales, [Chicago] Fairbanks, Morse & Co. (incorporated), 1919, 24 p., page six ("Page Six"); plate number (19495J)' },
  source_institution: 'Library of Congress (contributor), digitized by Internet Archive (sponsor: Sloan Foundation)',
  source_url: 'https://archive.org/details/fairbanksdialsca00fair/page/n9/',
  source_id: 'fairbanksdialsca00fair, leaf 0010 (BookReader n9), printed "Page Six"; IA call_number field 5909004',
  rights_statement_verbatim: 'possible-copyright-status: The Library of Congress is unaware of any copyright restrictions for this item.',
  pd_basis_us: 'Published in the United States in 1919, before 1931, with the notice "Copyright, 1919, by E. & T. Fairbanks & Co." (in the item\'s full text): the term has expired.',
  pd_basis_worldwide: 'Corporate catalogue work with no individual author identified, first published 1919: an anonymous/corporate work whose 70-year term from publication ended in 1989 (EU Term Directive art. 1(3)-(4); UK CDPA s.12(3)).',
  download_url: 'https://archive.org/download/fairbanksdialsca00fair/fairbanksdialsca00fair_jp2.zip/fairbanksdialsca00fair_jp2%2Ffairbanksdialsca00fair_0010.jp2',
  retrieved: '2026-09-27',
  clothing_check: 'No figures on the page; object only.',
  credit_line: 'Photograph from Fairbanks Dial Scales (Fairbanks, Morse & Co., 1919), page six. Library of Congress, via Internet Archive.',
  notes: 'A retouched halftone photograph, not an engraving: traced for the scale\'s outline only. "FAIRBANKS" (a live scale brand) is lettered on the cabinet and platform; the icon carries no lettering and no figures, and traces the silhouette only. The file was re-downloaded on 2026-09-27 and its sha256 matched the working copy byte for byte.'
};

// Which drawings each traced source feeds, and the commands that took the trace to the drawing
// (tools/…, run from vibes-night/tools). `how`: traced (the trace's points joined) | traced, redrawn.
const USE = {
  'globe-bell': { n: 4, how: 'traced, redrawn', keys: ['icons.workout', 'ornaments.you'],
    steps: ['node iav-globes.mjs  → four globes fitted (r 144.0–148.2 px); one dumb-bell\'s centres 3.82 and 4.01 radii apart',
            'redrawn: icons.workout globes r 3.6 at x 4.85 / 19.15 (3.97 radii); ornaments.you r 7 at 10.35 / 37.65 (3.9 radii); each globe\'s band as an arc toward the handle; the handle two rules'] },
  fork: { n: 18, how: 'traced, redrawn', keys: ['icons.food (the fork)'],
    steps: ['node iav-fit.mjs fork box=3,2.5,9,21.5 rot=-90 eps=0.25  → tines 2.6–8.1, head 4.9–7.2 wide, shank 10–16, handle 16–21.5',
            'redrawn: three tines 3–7.8 at x 4.6 / 6.5 / 8.4 (the head widened 1.6× across so the tines stay apart at 22pt), the shank, the plain tipped handle'] },
  tumbler: { n: 19, how: 'traced, redrawn', keys: ['icons.food (the tumbler)'],
    steps: ['node iav-fit.mjs tumbler box=12,4,21,21 eps=0.3  → lip 8.95 wide, foot 7.3 (taper .82)',
            'redrawn: lip 12.5–20.5 at y 8.5, foot 13.25–19.75 at y 20.5, the heavy base a rule at 18.3'] },
  'dial-scale': { n: null, how: 'traced, redrawn', keys: ['icons.weight'],
    steps: ['node iav-fit.mjs dial-scale box=3,2.5,21,21.5 eps=0.3  → the profile: a round dial head set right over a flat-topped cabinet, a platform wider than the cabinet',
            'redrawn: the cabinet 5.8–19.4 with its head an arc r 5.2 about (14.2, 8.3) — enlarged from the cut so the dial holds at 22pt — the dial r 3.1, one hand, the platform 3–21 × 17.5–21; no figures, no lettering'] },
  insole: { n: 25, how: 'traced', keys: ['icons.steps'],
    steps: ['node iav-fit.mjs insole box=0,0,5.6,16 rot=-90 eps=0.25 curve corner=70  → 13 points, toe up',
            'node iav-curve.mjs "<the 13 points>" closed affine=1.2,.84,13.6,2.7  → the right insole',
            'node iav-curve.mjs "<the 13 points>" closed affine=1.2,.84,3.9,6.9 flipx=2.77  → the left: the same, reflected and set lower'] },
  fist: { n: 27, how: 'traced', keys: ['icons.spark'],
    steps: ['node iav-fit.mjs fist box=1.5,6,22.5,18 flip eps=0.2  → the outline, reflected to point right',
            'node iav-curve.mjs "4.7,7.9;10.8,7.25;18.75,7.34;21.97,7.75;22.5,8.3;22.1,8.98;17.25,9.55;16.2,10.6;15.3,13.07;14.5,14.9;14.17,15.38;10.39,15.38;7.07,15.88;5.27,15.51;4.7,15.6" closed sharp=0,6,10,14  → the hand (its closing edge left to the cuff)',
            'by hand: the cuff as a rect over the cut\'s cuff band (x 1.8–4.7); the thumb line and one curled-finger line where the cut has them'] },
  carafe: { n: 20, how: 'traced', keys: ['vessel'],
    steps: ['node iav-fit.mjs carafe box=6,4,98,162 eps=1.2 curve corner=45  → the outline in the 104 × 168 box',
            'node iav-curve.mjs "52,28;34.5,28;33.4,32;39.5,40.9;42,51.7;41.2,67.2;35.4,83.6;24.3,92.2;24.3,100.8;14.5,106.7;7.7,115.5;6.3,131.8;12.1,147.3;28,154.9;40.2,156.9;52,157.3" sharp=0,1,2,7,8 mirror=52  → the left side (moved down 10), reflected; the price-text notch on the right dropped',
            'insideTop 92 (the collar\'s top), insideBottom 155 (the floor inside a 3-unit stroke)'] },
  club: { n: 6, how: 'traced', keys: ['ornaments.workout'],
    steps: ['node iav-fit.mjs club box=6,8,18,45 clipY=30,900 eps=0.3 open curve  → the club below the holder\'s clamp',
            'node iav-curve.mjs "10.75,8.7;10.3,14;9.3,20;8.1,27;7.9,32;8.1,38;8.9,42.4;9.6,44.5" sharp=0,7  and  "14.3,44.6;15.1,42.4;15.95,37.9;16.3,32.5;15.98,28.2;15.1,23;13.8,17;13.07,11.8;13.07,8.6" sharp=0,8  → its two sides',
            'by hand: the neck carried up to a knob r 1.8 (the clamp hides the cut\'s own), the band at the foot at y 36.6'] },
  exerciser: { n: 12, how: 'traced, redrawn', keys: ['ornaments.food'],
    steps: ['node iav-fit.mjs exerciser list  → the handles\', links\' and cords\' contours; the object\'s full extent read off a wider view (iav-peek.mjs, x 1500 y 1100 877 × 400)',
            'mapped to 48 × 24 (x\' = 2 + (x − 88) × .0963, y\' = 2.95 + (y − 112) × .0963, crop pixels of that view)',
            'node iav-curve.mjs "3.2,3.1;7.97,4.2;9.41,7.38;7.97,10.46;3.2,11.2" closed sharp=0,4  and  "3.2,13.16;7.97,14.12;9.41,17;7.97,20.09;3.2,21" closed sharp=0,4  → the two stirrups; the links, cords, ring and hook as circles and rules at the mapped points'] },
  ring: { n: 16, how: 'traced, redrawn', keys: ['ornaments.weight'],
    steps: ['node iav-fit.mjs ring box=4,4,28,28 pick=0 circle  → outer edge r 310.3 px (rms 10.7, the grain hatching)',
            'node iav-fit.mjs ring box=4,4,28,28 pick=13 circle  → inner edge r 273.0 px (rms 1.8): .88 of the outer',
            'redrawn: circles r 12 and 10.55 about (16, 16)'] }
};

const entries = [];
for (const [id, u] of Object.entries(USE)) {
  const s = SOURCES.find(x => x.id === id);
  const d = u.n ? draft[u.n - 1] : FAIRBANKS;
  const orig = s.file.startsWith('../../') ? N + s.file.slice(6) : N + 'research/iron-age/' + s.file;
  const cropPng = N + 'icons-ia/src/' + id + '.png', svg = N + 'icons-ia/trace/' + id + '.svg';
  const osha = sha(orig);
  if (u.n && osha !== d.original_sha256) throw new Error(id + ': the original on disk does not match the draft entry');
  entries.push({
    file: 'vibes/icons/iron-age.js',
    drawings: u.keys,
    how: u.how,
    sha256: sha(cropPng), bytes: bytes(cropPng), dims: dims(cropPng),
    sha256_of: 'the crop that was traced (vibes-night icons-ia/src/' + id + '.png, remade from the original by the sips command below); the drawing itself is path data in the file above',
    title: d.title, subject: d.subject, creator: d.creator, creator_died: d.creator_died, created: d.created,
    first_published: d.first_published, source_institution: d.source_institution, source_url: d.source_url, source_id: d.source_id,
    rights_statement_verbatim: d.rights_statement_verbatim, pd_basis_us: d.pd_basis_us, pd_basis_worldwide: d.pd_basis_worldwide,
    retrieved: d.retrieved, original_file: s.file.replace(/^\.\.\/\.\.\//, '').replace(/^originals\//, 'research/iron-age/originals/'),
    original_sha256: osha, original_dims: dims(orig), download_url: d.download_url,
    crop: s.crop, masks: s.masks || [],
    transforms: [
      crops[id].command + '   [' + 'sips-316' + ']',
      'node iai-trace.mjs ' + id + '   [node v24.20.0, pngjs 7.0.0, imagetracerjs 1.2.6]: Rec. 601 luma < ' + PRE[id].T + ' as ink' + (s.masks ? ', the masks blanked' : '') +
        (PRE[id].capTop ? ', the outline closed across its top rows' : '') + (PRE[id].R ? ', a disc close of radius ' + PRE[id].R : '') + (PRE[id].fill ? ', holes filled' : '') +
        (PRE[id].K ? ', the ' + PRE[id].K + ' largest component(s) kept' : '') + '; traced with ' + JSON.stringify(TRACE_OPTS),
      ...u.steps
    ],
    trace_record_sha256: sha(svg),
    clothing_check: d.clothing_check, credit_line: d.credit_line,
    ...(u.n ? { draft_entry: '#' + u.n + ' of research/iron-age/PROVENANCE.engravings.draft.json (rights research carried over, not redone)' } : { notes: FAIRBANKS.notes }),
    micah_approved: false
  });
}
const out = {
  _about: 'Iron Age\'s icons: every pre-1931 source that was traced for vibes/icons/iron-age.js, one entry per source. Drawings with no entry are hand-drawn (the module\'s `sources` says which). The traces are line art or silhouettes of objects; no figure, no lettering and no trade mark is carried. Nothing here is approved.',
  generated: '2026-09-27', generator: 'vibes-night/tools/iav-prov.mjs', tools: TOOLS,
  entries
};
const json = JSON.stringify(out, null, 1) + '\n';
for (const dir of [N + 'wt/web-v-iron-age/vibes/iron-age/icons', N + 'wt/nat-v-iron-age/assets/vibes/iron-age/icons']) {
  mkdirSync(dir, { recursive: true }); writeFileSync(dir + '/PROVENANCE.json', json);
}
console.log(entries.length, 'entries,', json.length, 'bytes, sha256', createHash('sha256').update(json).digest('hex'));
