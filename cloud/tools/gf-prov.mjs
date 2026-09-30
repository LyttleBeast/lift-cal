// gf-prov.mjs — gap-fill (critic round, 08b): append the new engraving candidates to
// research/iron-age/PROVENANCE.engravings.draft.json. sha256, bytes and dims are measured from disk here
// (dims via macOS sips). Idempotent: an entry whose (file, crop) already exists is not added twice.
// Usage: node gf-prov.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const IA = '/Users/micahflunker/dev/vibes-night/research/iron-age';
const P = `${IA}/PROVENANCE.engravings.draft.json`;
const doc = JSON.parse(readFileSync(P, 'utf8'));

function measure(file) {
  const buf = readFileSync(`${IA}/${file}`);
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', `${IA}/${file}`]).toString();
  const w = out.match(/pixelWidth: (\d+)/)[1], h = out.match(/pixelHeight: (\d+)/)[1];
  return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, dims: `${w}x${h}` };
}
const iaNote = 'File is the Internet Archive processed page JP2 (the item\'s own page image, downloaded as-is from download_url, no re-encode).';
const dl = (id, leaf) => `https://archive.org/download/${id}/${id}_jp2.zip/${id}_jp2%2F${id}_${leaf}.jp2`;

// ---- shared blocks per source ----
const sears = (leafs, n, page, dept) => ({
  creator: 'Anonymous catalogue engraver for Sears, Roebuck & Co.',
  creator_died: 'anonymous (unsigned corporate catalogue cut)',
  created: 'c. 1902 (Catalogue No. 112; item record dates it "190-"; it offers "1902 model" and "New 1903" goods)',
  first_published: { year: 'c. 1902', venue: `Sears, Roebuck & Co., Catalogue No. 112 (Chicago), p. ${page}${dept ? ' (' + dept + ')' : ''}` },
  source_institution: 'Winterthur Museum Library (contributor), digitized by Internet Archive',
  source_url: `https://archive.org/details/catalogueno11200sear/page/n${n}/`,
  source_id: `catalogueno11200sear, leaf ${leafs} (BookReader n${n}), printed p. ${page}`,
  rights_statement_verbatim: '(none: the Internet Archive item record carries no rights, possible-copyright-status or licenseurl field)',
  pd_basis_us: 'Published in the United States c. 1902, before 1931; US copyright expired.',
  pd_basis_worldwide: 'Anonymous corporate catalogue cut first published c. 1902: 70-year anonymous-work term expired; no named creator.',
  credit_line: `Engraving from Sears, Roebuck & Co., Catalogue No. 112 (Chicago, c. 1902), p. ${page}. Winterthur Library, via Internet Archive.`,
  download_url: dl('catalogueno11200sear', leafs)
});
const polhemus = {
  creator: 'Anonymous stock-cut engravers (electrotype stock cuts offered by the John Polhemus Printing Co.; no engraver named)',
  creator_died: 'anonymous (unsigned stock cuts; no engraver named on the page or in the book)',
  created: 'by 1895',
  first_published: { year: '1895', venue: 'Specimens of type faces, stock cuts, initials, logotypes, etc. (cover title: Specimen book), New York: John Polhemus Printing Co., 1895, p. 203 ("Indexes")' },
  source_institution: 'Getty Research Institute (contributor and sponsor), digitized by Internet Archive',
  source_url: 'https://archive.org/details/specimensoftypef00john/page/n206/',
  source_id: 'specimensoftypef00john, leaf 0207 (BookReader n206), printed p. 203; Getty call number 9929494920001551',
  rights_statement_verbatim: '(none: the Internet Archive item record carries no rights, possible-copyright-status or licenseurl field; its notes read "No copyright page found.")',
  pd_basis_us: 'Published in the United States in 1895, before 1931; US copyright expired.',
  pd_basis_worldwide: 'Anonymous stock cuts first published by 1895: 70-year anonymous-work term from publication expired (EU Term Directive art. 1(3); UK CDPA s.12(3); statutes not opened tonight); no individual engraver identified.',
  credit_line: 'Stock cut from Specimens of Type Faces, Stock Cuts, Initials, Logotypes, etc. (New York: John Polhemus Printing Co., 1895), p. 203. Getty Research Institute, via Internet Archive.',
  download_url: dl('specimensoftypef00john', '0207')
};

const add = [
  { file: 'originals/eng-sears-no112-p101-fork.jp2', ...sears('0111', 110, 101, 'silverware'),
    title: 'Plain Tipped Dessert Fork', subject: 'Four-tined dessert fork, plain tipped handle, in profile (catalogue cut, near full size)',
    clothing_check: 'No figures on the page; object only.', crop: { x: 48, y: 1078, w: 2175, h: 334 },
    traceability: 'A: clean engraved outline, tonal hatching on the handle (drop it). Very large (about 2150 px long), so the tines and the shoulder trace cleanly. Horizontal: rotate to vertical for the Fuel icon.',
    notes: 'Mask the caption "Plain Tipped Dessert Fork." inside the box at {x:820,y:1318,w:460,h:56}. The page says the goods will be stamped "Sears, Roebuck & Co.\'s Alaska Silverware" but this cut carries no stamp; the page header and "ALASKA SILVERWARE" heading are outside the crop (Sears is a live brand: never carry either). ' + iaNote },
  { file: 'originals/eng-sears-no112-p645-glassware.jp2', ...sears('0637', 636, 645, 'glassware'),
    title: 'Plain water tumbler, No. 2T500', subject: 'Straight-sided, slightly tapered half-pint water tumbler of heavy glass',
    clothing_check: 'No figures on the page; object only.', crop: { x: 18, y: 2079, w: 223, h: 293 },
    traceability: 'B: outline and rim ellipse are clean; body is vertical tonal hatching and the foot has a star cut (drop both). Silhouette = a tapered beaker with a rim ellipse.',
    notes: 'The glass for the Fuel dock icon (fork and glass). Text column starts immediately right of the crop. ' + iaNote },
  { file: 'originals/eng-sears-no112-p645-glassware.jp2', ...sears('0637', 636, 645, 'glassware'),
    title: 'The Perfection Separable Water Bottle, No. 2T511', subject: 'Glass water bottle (carafe): tall flared neck on a round cut-glass bowl',
    clothing_check: 'No figures on the page; object only.', crop: { x: 1193, y: 2700, w: 351, h: 494 },
    traceability: 'Silhouette A, interior C: the neck/shoulder/bowl outline is clean; the bowl is covered in cut-glass stars and fans (never trace them). Portrait aspect about 0.71, close to the v1 vessel box (104x168 = 0.62).',
    notes: 'Water-vessel candidate (the v1 vessel is a bottle). Text inside the box: mask {x:1185,y:2680,w:80,h:208} (column text left of the neck), {x:1185,y:2680,w:270,h:26} (a text line along the top) and {x:1455,y:2690,w:110,h:95} (the price "35c"). The same page shows the bottle taken apart and a Bedroom Glass Set; not used. ' + iaNote },
  { file: 'originals/eng-sears-no112-p099-pens.jp2', ...sears('0109', 108, 99, 'fountain pens'),
    title: 'Solid gold pen (nib), long nib No. 6', subject: 'Single steel-pen-shaped gold nib, point up, with slit and shoulders',
    clothing_check: 'No figures on the page; object only.', crop: { x: 1149, y: 2650, w: 121, h: 478 },
    traceability: 'A: clean outline with a centre slit; stamped numeral "6" on the body (drop it). Narrow (about 1:4): tilt to 45 degrees for the pen icon so it uses the 24-unit box.',
    notes: 'Row of nibs "LONG NIBS" 1-8 and "STUBS" 4-7 at the foot of the page; No. 6 chosen for its middle proportions; the stubs (wider shoulders) are the fallback if a fatter mark reads better at 19 pt. A stray "4" near the top-right corner is masked at {x:1262,y:2660,w:40,h:36}. "Paul E. Wirt" lettering is outside the crop. ' + iaNote },
  { file: 'originals/eng-sears-no112-p233-cameras.jp2', ...sears('0243', 242, 233, 'photographic goods'),
    title: 'The Perfection Jr. Camera', subject: 'Box camera with leather carrying handle, lens and finder openings, three-quarter view',
    clothing_check: 'No figures on the page; object only.', crop: { x: 2, y: 268, w: 910, h: 764 },
    traceability: 'B: seal-grain texture over the whole body (drop it); edges, handle, lens ring and finder windows are clean. Three-quarter view: trace for proportions, then redraw as a front elevation (box, handle, lens circle, finder) so it reads at 19 pt.',
    notes: 'Printed page number 233 (last digit smudged; consistent with leaf 243). Text inside the box: mask {x:0,y:262,w:250,h:72} ("$7.50 OUTFIT FOR $2.69"), {x:700,y:262,w:230,h:108}, {x:0,y:990,w:100,h:50} ("THE") and {x:810,y:975,w:115,h:60}. No lettering on the camera itself; the brand "Seroco" appears only on the lower cut and the outfit box. ' + iaNote },
  { file: 'originals/eng-sears-no112-p158-calendar-stand.jp2', ...sears('0168', 167, 158, 'stationery'),
    title: 'Calendar Stand and Memorandum Pad, No. 3T5774', subject: 'Desk calendar stand: wire frame holding a month strip, a day leaf and a memorandum pad on a sloped base',
    clothing_check: 'No figures in the crop (clothed hands appear in two inkstand cuts elsewhere on the page; not used).', crop: { x: 1888, y: 1068, w: 484, h: 544 },
    traceability: 'B: perspective view with hatched base and tiny lettering. Trace the frame, the leaf and the base outline; redraw frontal.',
    notes: 'The cut is lettered "1899" on the month strip and "JANUARY 25 WEDNESDAY" on the leaf (25 January 1899 was a Wednesday, checked with node), so the cut itself was probably made for 1899 and reused. Drop ALL lettering and numerals: a calendar icon that shows a fixed date states something untrue on every other day. Text left of the frame: mask {x:1880,y:1060,w:112,h:205}. ' + iaNote },
  { file: 'originals/eng-sears-no112-p784-tinware-canteen.jp2', ...sears('0770', 769, 784, 'tinware'),
    title: "Miners' Canteen, IC tin, No. 23T5079", subject: 'Round flat tin canteen with a screw spout and a label strip',
    clothing_check: 'No figures in the crop (a hand holding a grater appears elsewhere on the page; not used).', crop: { x: 56, y: 1965, w: 216, h: 222 },
    traceability: 'B: circular outline and spout are clean; body hatched and a vertical label strip with illegible lettering (drop both).',
    notes: 'Backup water vessel (round, so it fills a circle rather than the v1 bottle box). The heading "Miners\' Canteens" sits just above the crop; the text "No." at top-right is masked at {x:215,y:1935,w:45,h:32}. ' + iaNote },
  { file: 'originals/eng-sears-no112-p936-insoles.jp2', ...sears('0914', 913, 936, 'shoe findings'),
    title: 'Non-Crumpling Hair Insole', subject: 'Shoe insole (sole outline), seen nearly from above',
    clothing_check: 'No figures on the page; object only.', crop: { x: 1603, y: 1716, w: 394, h: 114 },
    traceability: 'B: sole outline is clean; interior hatched and a lettered band "NON-CRUMPLING HAIR INSOLE" runs along it (drop both). Use the outline only, stood upright and paired (one mirrored, offset) as a footprint pair.',
    notes: 'Footprint (Steps) reference. Heading above and body text below are outside the crop. ' + iaNote },
  { file: 'originals/eng-polhemus-1895-p203-indexes.jp2', ...polhemus,
    title: 'Index (printers\' fist), stock cut No. 422', subject: 'Solid black pointing hand with a hatched cuff, pointing right',
    clothing_check: 'Hand and cuff only. (Cut No. 429 on the same page shows unclothed cherubs: rejected, never cropped.)', crop: { x: 348, y: 1098, w: 367, h: 160 },
    traceability: 'A+: solid silhouette; the cuff is cross-hatched (render it as a plain band). Survives a 22 px box-filter test as a pointing hand.',
    notes: 'The period\'s own "note this" mark. Proposed Iron Age replacement for v1\'s four-point sparkle (spark) beside the estimator notices; see 08b gap fill. No. 423 (mirror, pointing left) sits beside it. The page number labels "422" etc. are below the crop. ' + iaNote },
  { file: 'originals/eng-polhemus-1895-p203-indexes.jp2', ...polhemus,
    title: 'Index (printers\' fist), stock cut No. 431', subject: 'Large outline pointing hand with cuff, pointing left',
    clothing_check: 'Hand and cuff only.', crop: { x: 758, y: 2743, w: 1459, h: 674 },
    traceability: 'A: bold outline with a few interior lines; the engraved alternative to No. 422 if a line (not solid) mark matches the icon set better.',
    notes: 'Points left: mirror it for a right-pointing mark. ' + iaNote },
  { file: 'originals/eng-strength-1922-03-p001-milo-stage.jp2',
    title: 'Globe barbell (with dumbbell and kettlebell) on a stage, from a Milo Bar Bell Co. advertisement',
    subject: 'Plate-loading globe barbell lying on a stage; a globe dumbbell in front of it and a ring-handled kettlebell half-hidden behind the bar (pen-and-ink line drawing)',
    creator: 'Unsigned advertisement illustrator for The Milo Bar Bell Co. (no signature found on the drawing)',
    creator_died: 'anonymous (unsigned); NOT established. The issue\'s only credited artist is its cover artist, Clayton Knight (1891-1969, per Wikipedia); if this drawing were his it would fail test 2 worldwide.',
    created: 'by March 1922',
    first_published: { year: '1922', venue: 'Strength, vol. 6 no. 7 (March 1922), Philadelphia: The Milo Publishing Co.; advertisement page facing the cover ("Yes, We Develop Men Like This" / "Our Business is Making Men")' },
    source_institution: 'Internet Archive community upload (item notes: "Scanned from the Taylorology library")',
    source_url: 'https://archive.org/details/StrengthMarch1922/page/n1/',
    source_id: 'StrengthMarch1922, leaf 0001 (BookReader n1; checked against the n1 page image), unnumbered advertisement page',
    rights_statement_verbatim: 'licenseurl: http://creativecommons.org/publicdomain/mark/1.0/',
    pd_basis_us: 'Published in the United States in March 1922, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Only if anonymous: 70 years from publication (1922) expired; the artist is not identified (see creator_died). Tier B: Micah rules.',
    credit_line: 'Drawing from an advertisement for The Milo Bar Bell Co., Strength (Philadelphia), March 1922. Via Internet Archive.',
    download_url: dl('StrengthMarch1922', '0001'),
    clothing_check: 'The same drawing shows a strongman in a singlet, trunks and boots lifting a horse (allowed clothing), outside the crop; the crop holds apparatus only.',
    crop: { x: 410, y: 1239, w: 622, h: 183 },
    traceability: 'B: the globes and bar are clean line; the kettlebell behind the bar overlaps it and the stage backdrop hatching runs behind both. Separate by hand: trace the two globes and the bar, drop the backdrop; the kettlebell (handle ring and upper body) can be completed by hand as its own mark.',
    notes: 'The only true iron globe barbell found as line art (08b had globe-ended wooden dumbbells only). "THE MILO BAR BELL CO." is lettered at the foot of the page, outside the crop; the Milo company later became York Barbell (a live brand, per Wikipedia on Alan Calvert), so never carry any lettering. Spalding c. 1891 p. 87 lists "Polished Ash Bar Bells" as text only, with no cut. ' + iaNote }
];

const key = e => e.file + JSON.stringify(e.crop);
const have = new Set(doc.entries.map(key));
let n = 0;
for (const e of add) {
  if (have.has(key(e))) continue;
  const m = measure(e.file);
  const entry = {
    file: e.file, sha256: m.sha256, bytes: m.bytes, dims: m.dims,
    title: e.title, subject: e.subject, creator: e.creator, creator_died: e.creator_died, created: e.created,
    first_published: e.first_published, source_institution: e.source_institution, source_url: e.source_url, source_id: e.source_id,
    rights_statement_verbatim: e.rights_statement_verbatim, pd_basis_us: e.pd_basis_us, pd_basis_worldwide: e.pd_basis_worldwide,
    retrieved: '2026-09-26', original_sha256: m.sha256, original_dims: m.dims, transforms: [],
    clothing_check: e.clothing_check, credit_line: e.credit_line, micah_approved: false,
    crop: e.crop, traceability: e.traceability, download_url: e.download_url, notes: e.notes,
    added_by: 'gap fill (critic round), tools/gf-prov.mjs; crops tightened by tools/gf-crops.mjs (luminance < 150, >= 3 inked px per row/column, 12 px pad)'
  };
  doc.entries.push(entry); n++;
}
doc.gap_fill_critic_round = 'Entries added after the first 17 come from the critic-round gap fill (see 08b-engravings.md, "Gap fill (critic round)"). Same rules: draft only, micah_approved false.';
writeFileSync(P, JSON.stringify(doc, null, 1) + '\n');
JSON.parse(readFileSync(P, 'utf8'));
console.log(`appended ${n}; total entries ${doc.entries.length}; JSON re-parsed OK`);
