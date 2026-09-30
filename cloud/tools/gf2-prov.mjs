// gf2-prov.mjs — 08b gap-fill RESUME (critic round, 27 Sep): append entries #29-#31 (bar-bells) to
// research/iron-age/PROVENANCE.engravings.draft.json. sha256 / bytes / dims are measured from disk (dims via
// macOS sips); crops come from tools/gf2-crops.mjs (luminance < 150, or < 110 for the halftones; >= 3 inked px
// per row/column; 12 px pad). Refuses to add a file twice; re-parses the result. Every entry micah_approved:false.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const IA = '/Users/micahflunker/dev/vibes-night/research/iron-age/';
const P = IA + 'PROVENANCE.engravings.draft.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
const measure = f => {
  const b = readFileSync(IA + f);
  const s = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', IA + f]).toString();
  const w = s.match(/pixelWidth: (\d+)/)[1], h = s.match(/pixelHeight: (\d+)/)[1];
  return { sha256: createHash('sha256').update(b).digest('hex'), bytes: b.length, dims: `${w}x${h}` };
};
const ADDED = 'gap fill (critic round) RESUME, 2026-09-27, tools/gf2-prov.mjs; crops tightened by tools/gf2-crops.mjs (luminance < 150, >= 3 inked px per row/column, 12 px pad; < 110 for the halftones)';
const KEEP = 'File is the Internet Archive processed page JP2 (the item\'s own page image, downloaded as-is from download_url through tools/fetch.mjs, no re-encode).';

const add = [
  {
    file: 'originals/eng-hulley-1867-p258-bar-bell.jp2',
    title: 'The bar-bell ("the annexed wood-cut"), chapter XXX, Wooden Bar-bells',
    subject: 'A bar-bell drawn upright: a long round bar with a ball at each end, each ball a ring with an inner highlight ring (wood engraving, pure line). The same book, par. 741 (p. 268): iron bar-bells "are of the same shape as those of wood, but they are made of iron and weigh from 20 to 100 pounds each."',
    creator: 'Unsigned woodcut in E. G. Ravenstein and John Hulley, A Handbook of Gymnastics and Athletics; no engraver or designer named. Title page: "With numerous woodcut illustrations, from original designs." The preface thanks "Mr. A. Ravenstein of Frankfurt-on-the-Main, whose \'Volks-Turnbuch\' has been to us a mine of wealth, upon which, by kind permission, we have drawn frequently."',
    creator_died: 'anonymous engraver (unsigned, none credited). Every hand the book names died before 1956: John Hulley 6 Jan 1875 and E. G. Ravenstein 13 Mar 1913 (English Wikipedia); A. Ravenstein, read here as Friedrich August Ravenstein of Frankfurt, 31 Jul 1881 (German Wikipedia; that article does not name the Volks-Turnbuch, so the identification is an inference).',
    created: 'by July 1867 (preface dated "London and Liverpool, July 1867")',
    first_published: { year: '1867', venue: 'E. G. Ravenstein and John Hulley, A Handbook of Gymnastics and Athletics, London: Trübner and Co., 1867, p. 258 (chapter XXX, "Wooden Bar-bells")' },
    source_institution: 'Wellcome Library (contributor and sponsor), digitized by Internet Archive',
    source_url: 'https://archive.org/details/b28055718/page/n269/',
    source_id: 'b28055718, leaf 0270 (BookReader n269; checked: the n269 page image has the leaf\'s 2267x3761 dimensions and shows p. 258), printed p. 258; Wellcome shelfmark on the scan "Med K10313"',
    rights_statement_verbatim: 'rights: <a href="http://creativecommons.org/publicdomain/mark/1.0/" rel="ugc nofollow">This work is available under the Creative Commons, Public Domain Mark</a> (item notes: "Copyright is on title page. Some pages creased.")',
    pd_basis_us: 'Published in London in 1867, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Engraver unnamed: the 70-year anonymous-work term from 1867 has expired. Were the cut attributed to any hand the book names (the two authors, or A. Ravenstein), each died before 1956 (1875, 1913, 1881), so life+70 has also expired. Statutes not opened tonight.',
    retrieved: '2026-09-27',
    transforms: [],
    clothing_check: 'Apparatus only in the crop. The same page\'s Figs. 1 and 2 (outside the crop) show fully clothed boys in tunics and trousers.',
    credit_line: 'Woodcut from E. G. Ravenstein and John Hulley, A Handbook of Gymnastics and Athletics (London: Trübner and Co., 1867), p. 258. Wellcome Library, via Internet Archive.',
    micah_approved: false,
    crop: { x: 362, y: 813, w: 85, h: 697 },
    traceability: 'A: clean line. The bar is two parallel rules; each ball is a ring with an inner highlight ring. Very long (about 8:1 with the pad): at 66 px (22 pt @3x) it reads as a thin bar with two rings, at 22 px as a line (tools/gf2-crops.mjs). Use it for the ball-and-bar vocabulary and shorten the bar.',
    download_url: 'https://archive.org/download/b28055718/b28055718_jp2.zip/b28055718_jp2%2Fb28055718_0270.jp2',
    notes: 'Tier A globe bar-bell: the fallback for the Train dock slot if Micah declines #28 and #30. Its bells are small (about 8% of the length); the book says the iron bar-bell has the same shape. The rough box stops above the next text line ("obtained", y about 1535). ' + KEEP,
    added_by: ADDED
  },
  {
    file: 'originals/eng-graf-1898-p004-barbells.jp2',
    title: 'Barbells, Figs. 16-19 (Fig. 16: the solid-ball barbell)',
    subject: 'Fig. 16: a barbell with a solid ball fixed on each end. The text: "As a rule the weight at each end of the bar consists of a solid ball of wood or iron fixed on to the bar, as shown in fig. 16; but they are also made hollow, and in two or more parts, and are so contrived that additional weights, in the shape of shot or other heavy substances, can be inserted and then screwed down (see fig. 17)". Figs. 17-18: hollow two-part bells; Fig. 19: movable bells with wing nuts. Pen line with cross-hatched globes.',
    creator: 'T. Gowland, probably. Preface: "The illustrations which, with few exceptions, Mr. T. Gowland has kindly sketched for the book". It does not say whether Figs. 16-19 are his or among the "few exceptions" (then presumably by F. Graf or taken from elsewhere).',
    creator_died: 'NOT established. No dates found for T. Gowland: an IA full-text search for "T. Gowland" found no match tied to gymnastics, and WebSearch was unavailable (the session budget was spent). F. Graf\'s dates are not established either.',
    created: 'by January 1898 (preface dated "London, January 1898")',
    first_published: { year: '1898', venue: 'F. Graf (Orion Gymnastic Club), Dumb-bells, London and New York: George Bell & Sons, 1898 (the All-England Series), p. 4, Figs. 16-19; printed by William Clowes and Sons. A 1905 issue (IA dumbbells00grafgoog, Google-digitized, University of Michigan) has the same page.' },
    source_institution: 'Boston Public Library (contributor and sponsor), digitized by Internet Archive',
    source_url: 'https://archive.org/details/dumbbells00graf/page/n15/',
    source_id: 'dumbbells00graf, leaf 0016 (BookReader n15; checked: the n15 page image has the leaf\'s 1964x3098 dimensions), printed p. 4; BPL call number 4009.207',
    rights_statement_verbatim: '(none: the item record carries no rights, possible-copyright-status or licenseurl field)',
    pd_basis_us: 'Published in 1898 (London and New York), before 1931; US copyright expired.',
    pd_basis_worldwide: 'NOT established. Test 2 passes only if whoever drew Figs. 16-19 (T. Gowland, or F. Graf for the "few exceptions") died before 1956. Tier B: Micah rules.',
    retrieved: '2026-09-27',
    transforms: [],
    clothing_check: 'Apparatus only on this page (Figs. 16-22). p. 2 of the same book (leaf 0014) has Fig. 5, a nude classical figure with halteres: rejected, never cropped.',
    credit_line: 'Drawing from F. Graf, Dumb-bells (London: George Bell & Sons, 1898), p. 4, fig. 16. Boston Public Library, via Internet Archive.',
    micah_approved: false,
    crop: { x: 292, y: 487, w: 194, h: 946 },
    crop_alt: { figs_16_19: { x: 292, y: 453, w: 1542, h: 980 } },
    traceability: 'A: pen line. Drop the cross-hatch on the globes; keep each circle and, at most, one highlight arc. The bar is double-ruled. Aspect about 4.9:1 with the pad; each ball is about 17% of the length. At 66 px (22 pt @3x) Fig. 16 still reads as a barbell; at 22 px it closes to a dumbbell-like blob (tools/gf2-crops.mjs).',
    download_url: 'https://archive.org/download/dumbbells00graf/dumbbells00graf_jp2.zip/dumbbells00graf_jp2%2Fdumbbells00graf_0016.jp2',
    notes: 'The clearest period drawing of the globe barbell found; its globes are larger than #29\'s. Fig. 18 is the hollow, shot-loading globe, the form #28 shows. The BPL scan was used because it is the 1898 first edition and not a Google scan. ' + KEEP,
    added_by: ADDED
  },
  {
    file: 'originals/eng-narragansett-c1905-p079-bar-bells.jp2',
    title: 'Bar-bells: "Standard" bar-bells, iron bar-bells, and the "Standard" adjustable bar-bell',
    subject: 'Three halftone photographs: a maple bar with pear-shaped bells; "Iron Bar-Bells have japanned iron balls, ash bars, and are five feet long over all"; and the adjustable bar-bell, a bar loaded with stacked iron discs, with loose discs in front ("eleven discs weighing five pounds each for each end").',
    creator: 'Anonymous catalogue photographer (Narragansett Machine Co. trade catalogue; none named)',
    creator_died: 'anonymous (no photographer, engraver or designer named)',
    created: 'c. 1905',
    first_published: { year: 'c. 1905 (IA date "c1905")', venue: 'Catalogue of gymnastic apparatus made by the Narragansett Machine Co., Providence, R.I., [Providence?], c. 1905, p. 79 ("Bar-Bells")' },
    source_institution: 'University of California Libraries (contributor), digitized by Internet Archive (sponsor MSN)',
    source_url: 'https://archive.org/details/catalogueofgymna00narrrich/page/n82/',
    source_id: 'catalogueofgymna00narrrich, leaf 0083 (BookReader n82; checked: the n82 page image shows the printed page number 79), printed p. 79; GLAD-151156225',
    rights_statement_verbatim: 'possible-copyright-status: NOT_IN_COPYRIGHT',
    pd_basis_us: 'Published in the United States c. 1905, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Anonymous trade-catalogue photographs: the 70-year anonymous-work term from publication has expired. Statutes not opened tonight.',
    retrieved: '2026-09-27',
    transforms: [],
    clothing_check: 'Apparatus only; no person on the page.',
    credit_line: 'Photograph from the Catalogue of Gymnastic Apparatus made by the Narragansett Machine Co., Providence, R.I. (c. 1905), p. 79. University of California Libraries, via Internet Archive.',
    micah_approved: false,
    crop: { x: 308, y: 1210, w: 1970, h: 202 },
    crop_alt: { adjustable_bar_bell: { x: 561, y: 2089, w: 1402, h: 416 } },
    traceability: 'C: halftone photographs, silhouette only. At 66 px both read as dark masses.',
    download_url: 'https://archive.org/download/catalogueofgymna00narrrich/catalogueofgymna00narrrich_jp2.zip/catalogueofgymna00narrrich_jp2%2Fcatalogueofgymna00narrrich_0083.jp2',
    notes: 'Evidence more than a trace source: gymnasium makers sold both the iron globe bar-bell and a disc-loaded bar-bell by c. 1905, so a plate-loaded Train icon (v1\'s own form) is not an anachronism in Iron Age. The globe (#29, #30) stays the period\'s signature form. The page header "NARRAGANSETT MACHINE COMPANY" is outside both crops. ' + KEEP,
    added_by: ADDED
  }
];

const have = new Set(j.entries.map(e => e.file));
for (const e of add) {
  if (have.has(e.file)) { console.log('SKIP (already present)', e.file); continue; }
  const m = measure(e.file);
  const entry = { file: e.file, sha256: m.sha256, bytes: m.bytes, dims: m.dims };
  for (const [k, v] of Object.entries(e)) if (k !== 'file') entry[k] = v;
  // original_* sit after `retrieved`, as in the other entries
  const out = {};
  for (const [k, v] of Object.entries(entry)) {
    out[k] = v;
    if (k === 'retrieved') { out.original_sha256 = m.sha256; out.original_dims = m.dims; }
  }
  j.entries.push(out);
  console.log('ADDED', j.entries.length, e.file, m.sha256, m.bytes, m.dims);
}
// #28's notes called it the only iron globe barbell found as line art; #30 (Fig. 18) now shows one too.
const e28 = j.entries.find(e => e.file === 'originals/eng-strength-1922-03-p001-milo-stage.jp2');
const NOTE28 = ' Resume note (2026-09-27): no longer the only one. #30 (Graf 1898, Fig. 18) draws the hollow, shot-loading globe, and #29 (Hulley 1867, Tier A) the globe bar-bell form.';
if (e28 && !e28.notes.includes('Resume note (2026-09-27)')) { e28.notes += NOTE28; console.log('amended #28 notes'); }
j.gap_fill_critic_round_resume = 'Entries #29-#31 (bar-bells) were added on 2026-09-27 when the critic-round gap fill was resumed (see 08b-engravings.md, "Gap fill (critic round)", G6). Same rules: draft only, micah_approved false.';
const text = JSON.stringify(j, null, 1) + '\n';
JSON.parse(text);
writeFileSync(P, text);
console.log('entries', j.entries.length, 'written and re-parsed');
