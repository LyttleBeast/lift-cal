// prov8b.mjs — track 8b: write research/iron-age/PROVENANCE.engravings.draft.json.
// sha256 / bytes / dims are measured from the files on disk; everything else is the research record.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const IA = '/Users/micahflunker/dev/vibes-night/research/iron-age';
const LOC_RIGHTS = 'possible-copyright-status: The Library of Congress is unaware of any copyright restrictions for this item.';
const PDM_WELLCOME = 'rights: This work is available under the Creative Commons, Public Domain Mark [http://creativecommons.org/publicdomain/mark/1.0/]';
const PDM_MALLORY = 'licenseurl: https://creativecommons.org/publicdomain/mark/1.0/ (no rights text on the item record)';
const WINTERTHUR = '(none: the Internet Archive item record carries no rights, possible-copyright-status or licenseurl field)';
const RETR = '2026-09-26';
const dl = (id, zb, leaf) => `https://archive.org/download/${id}/${zb}_jp2.zip/${zb}_jp2%2F${zb}_${leaf}.jp2`;

const SPALDING_BOOK = { title: "A.G. Spalding & Bros. gymnasium and athletic catalogue", pub: 'New York, Chicago [etc.]: A.G. Spalding & Bros.', id: 'agspaldingbrosgy00spal' };
const spald = (leafN, nIdx, page, extra) => ({
  creator: 'Anonymous trade-catalogue engraver for A.G. Spalding & Bros. (unsigned cut)',
  creator_died: 'anonymous (unsigned corporate catalogue cut; no engraver named on the page)',
  created: 'c. 1891 (undated catalogue; LoC/IA record says "ncd"; testimonial letters printed in it are dated July 1891)',
  first_published: { year: 'c. 1891', venue: `${SPALDING_BOOK.title}, ${SPALDING_BOOK.pub}, p. ${page}` },
  source_institution: 'Library of Congress (contributor), digitized by Internet Archive (sponsor: Sloan Foundation)',
  source_url: `https://archive.org/details/${SPALDING_BOOK.id}/page/n${nIdx}/`,
  source_id: `${SPALDING_BOOK.id}, leaf ${leafN} (BookReader n${nIdx}), printed p. ${page}; IA call_number field 7734083`,
  download_url: dl(SPALDING_BOOK.id, SPALDING_BOOK.id, leafN),
  rights_statement_verbatim: LOC_RIGHTS,
  pd_basis_us: 'Published in the United States before 1931 (c. 1891); any US copyright has expired (an OCR search of the whole scan for "copyright" returns no hits).',
  pd_basis_worldwide: 'Unsigned corporate catalogue illustration first published c. 1891: an anonymous work whose 70-year term from publication ended long ago (EU Term Directive art. 1(3); UK CDPA s.12(3)); no individual creator is identified, so life+70 cannot extend it.',
  credit_line: `Engraving from A.G. Spalding & Bros., Gymnasium and Athletic Catalogue (New York, c. 1891), p. ${page}. Library of Congress, via Internet Archive.`,
  ...extra
});

const entries = [
  { file: 'eng-spalding-c1891-p050-rings.jp2', ...spald('0058', 57, 50, {
    title: 'Swinging and traveling rings', subject: 'Four gymnasium rings on ropes with adjusting clamps (catalogue cut)',
    crop: { x: 530, y: 444, w: 114, h: 1163 },
    traceability: 'Clean line engraving: open rope-twist lines and a plain oval ring; silhouette traces cleanly. The ring itself is small (about 110 px wide) so trace the ring + clamp, not the rope texture.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'Alternative crop, all four rings: {x:530,y:444,w:1278,h:1184}. No trademark lettering on the rings.' }) },
  { file: 'eng-spalding-c1891-p088-clubs-rings-dumbbells.jp2', ...spald('0096', 95, 88, {
    title: "Spalding's adjustable Indian club", subject: 'Upright Indian club (wood-grain engraving), from the adjustable-club cut',
    crop: { x: 412, y: 348, w: 254, h: 883 },
    traceability: 'Clean line engraving with wood-grain hatching; outline is crisp and closed, hatching can be dropped. Tall narrow silhouette (about 250 x 880 px).',
    clothing_check: 'No figures on the page; object only.',
    notes: 'Same page carries the wooden exercising rings and maple dumb-bells (separate entries). The companion cut to the right shows the club taken apart; not in this crop. No lettering on this club.' }) },
  { file: 'eng-spalding-c1891-p088-clubs-rings-dumbbells.jp2', ...spald('0096', 95, 88, {
    title: 'Wooden exercising rings', subject: 'Pair of hand-held wooden exercising rings (walnut and maple, glued in three thicknesses)',
    crop: { x: 335, y: 1287, w: 898, h: 444 },
    traceability: 'Clean line engraving; two closed annuli with grain hatching. Traces to two clean circles; a single ring is about 420 px across.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'Top edge of the crop sits just under the adjustable-club parts; bottom edge just above the wand rule.' }) },
  { file: 'eng-spalding-c1891-p088-clubs-rings-dumbbells.jp2', ...spald('0096', 95, 88, {
    title: 'Maple wood dumb-bells', subject: 'Crossed pair of globe-ended wooden dumb-bells (the period "bell" form)',
    crop: { x: 1108, y: 1814, w: 836, h: 592 },
    traceability: 'Clean line engraving; spheres drawn with contour hatching and a centre band. Globe silhouettes are unambiguous; best source tonight for a globe dumb-bell / globe-barbell end.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'Alternative crop, both pairs (maple above, rosewood-finish below): {x:1108,y:1814,w:836,h:1214}. The page number "88" sits below-left of the lower pair, outside both crops. No lettering on the bells.' }) },
  { file: 'eng-spalding-c1891-p089-iron-dumbbells.jp2', ...spald('0097', 96, 89, {
    title: 'Iron dumb-bells', subject: 'Japanned iron dumb-bells, 5 / 10 / 15 / 25 lb, with weight numerals on the bells',
    crop: { x: 131, y: 1807, w: 684, h: 199 },
    traceability: 'Engraving with dense concentric line shading (reads almost as solid black at small size). Silhouette is crisp; interior is dark. The numerals are period engraved figures worth studying.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'TRADEMARK: each bell is stamped "TRADE [SPALDING] MARK" on one end. Spalding is a live brand, so any traced icon must drop that lettering (§14 "no live trademarks"). Crop given is the 10-lb bell; alternative, all four: {x:62,y:1640,w:804,h:922}.' }) },
  { file: 'eng-spalding-c1891-p090-club-holder.jp2', ...spald('0098', 97, 90, {
    title: 'Indian club (outline), from the Indian club, dumb-bell and wand holder', subject: 'Pure outline drawing of an Indian club hanging in a wall holder',
    crop: { x: 987, y: 604, w: 214, h: 833 },
    traceability: 'Cleanest line art in the set: unshaded single-weight outlines, almost an icon already. Trace directly.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'The club knob is hidden behind the holder band, so the top of the club needs completing when traced. Alternative crop, whole holder row (clubs, ring-handled bells, wands): {x:325,y:328,w:1721,h:1525}.' }) },
  { file: 'eng-spalding-c1891-p093-gym-scale.jp2', ...spald('0101', 100, 93, {
    title: "Spalding's gymnasium scales, with measuring attachment", subject: 'Beam platform scale with a sliding height rod, for weighing and measuring gymnasium members',
    crop: { x: 364, y: 549, w: 1352, h: 2467 },
    traceability: 'Clean line engraving with light hatching; beam, poise and platform read clearly. The most on-topic object for a bodyweight log.',
    clothing_check: 'No figures on the page; object only.',
    notes: 'MASK NEEDED: the page text column sits inside this box at about x 364-784, y 780-2320 (measured from the ink profile); blank it before tracing, or crop the upper part from x 1040. A small maker\'s plate on the column is illegible at scan resolution.' }) },
  {
    file: 'eng-fairbanks-1867-p030-platform-scale.jp2',
    title: 'Portable platform scale (Plate 23)', subject: 'Wheeled platform scale with weigh-beam and drop lever',
    creator: 'Unsigned engraving for E. & T. Fairbanks & Co.', creator_died: 'anonymous (no signature seen in the crop at preview scale)',
    created: '1867', first_published: { year: 1867, venue: "Fairbanks' standard ... scales (E. & T. Fairbanks & Co., [n.p.], 1867), p. 30, Plate 23" },
    source_institution: 'Library of Congress (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/fairbanksstandar00fair/page/n31/',
    source_id: 'fairbanksstandar00fair, leaf 0032 (BookReader n31), printed p. 30; IA call_number field 10010810', download_url: dl('fairbanksstandar00fair', 'fairbanksstandar00fair', '0032'),
    rights_statement_verbatim: LOC_RIGHTS,
    pd_basis_us: 'Published in the United States in 1867, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Anonymous corporate catalogue illustration first published 1867: 70-year anonymous-work term long expired; no named creator.',
    clothing_check: 'No figures on the page; object only.',
    credit_line: "Engraving from Fairbanks' Standard Scales (E. & T. Fairbanks & Co., 1867), Plate 23. Library of Congress, via Internet Archive.",
    crop: { x: 1025, y: 982, w: 748, h: 764 },
    traceability: 'Clean line engraving with a hatched ground shadow; outline traces cleanly once the ground hatching is dropped.',
    notes: 'The caption "PLATE 23." sits just below the crop.'
  },
  {
    file: 'eng-fairbanks-1867-p037-counter-scale.jp2',
    title: 'Counter scale (Plate 38)', subject: 'Equal-arm balance with chains, pan and scoop on a turned pillar',
    creator: 'Wood engraving signed "HOWLAND N.Y." for E. & T. Fairbanks & Co.',
    creator_died: '1875 if the signature is William Howland (wood engraver, Poughkeepsie 1822 - New York 1875, per The Met record 42.137); attribution of this signature to him is probable but unconfirmed. Any engraver working in 1867 died before 1956.',
    created: '1867', first_published: { year: 1867, venue: "Fairbanks' standard ... scales (E. & T. Fairbanks & Co., [n.p.], 1867), p. 37, Plate 38" },
    source_institution: 'Library of Congress (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/fairbanksstandar00fair/page/n38/',
    source_id: 'fairbanksstandar00fair, leaf 0039 (BookReader n38), printed p. 37; IA call_number field 10010810', download_url: dl('fairbanksstandar00fair', 'fairbanksstandar00fair', '0039'),
    rights_statement_verbatim: LOC_RIGHTS,
    pd_basis_us: 'Published in the United States in 1867, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Signed engraving; the signer (probably William Howland, d. 1875) died more than 70 years ago; even if another Howland, an engraver active in 1867 cannot have died after 1955 in any plausible case (would be 110+).',
    clothing_check: 'No figures on the page; object only.',
    credit_line: "Wood engraving signed Howland, N.Y., from Fairbanks' Standard Scales (E. & T. Fairbanks & Co., 1867), Plate 38. Library of Congress, via Internet Archive.",
    crop: { x: 778, y: 2346, w: 669, h: 650 },
    traceability: 'Clean wood engraving; the balance beam, chains and pans are open line work and trace very cleanly. Best "scale" silhouette for an icon.',
    notes: 'Same page, Plate 37 "Market scale" (hanging beam scale with pan): crop {x:833,y:684,w:615,h:797}. The engraver signature is inside the counter-scale crop, bottom right.'
  },
  {
    file: 'eng-grant-1893-title-worm-gear.jp2',
    title: 'Worm and worm-wheel (title-page vignette)', subject: 'Six-spoked toothed wheel meshing with a worm',
    creator: 'Unsigned engraving published by George B. Grant', creator_died: 'Engraver anonymous (unsigned); author-publisher George Barnard Grant died 1917 (LoC name heading "Grant, George B. (George Barnard), 1849-1917")',
    created: '1893 (sixth edition)', first_published: { year: 1893, venue: 'George B. Grant, A Treatise on Gear Wheels, 6th ed. (Lexington, Mass.; Philadelphia, Pa.: G.B. Grant, 1893), title page' },
    source_institution: 'Library of Congress (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/treatiseongearwh00gran/page/n0/',
    source_id: 'treatiseongearwh00gran, leaf 0001 (BookReader n0), title page; IA call_number field 9607270', download_url: dl('treatiseongearwh00gran', 'treatiseongearwh00gran', '0001'),
    rights_statement_verbatim: LOC_RIGHTS,
    pd_basis_us: 'Published in the United States in 1893, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Unsigned illustration (anonymous: 70 years from 1893 long passed); the only named person, the author-publisher, died 1917, before 1956.',
    clothing_check: 'No figures on the page; object only.',
    credit_line: 'Engraving from George B. Grant, A Treatise on Gear Wheels (6th ed., 1893), title page. Library of Congress, via Internet Archive.',
    crop: { x: 854, y: 1702, w: 993, h: 1276 },
    traceability: 'Engraving with heavy tonal shading on the rim and spokes (fine line, not halftone). Outline and six spokes trace cleanly; a strong settings/gear source.',
    notes: 'A LoC shelf label and pencil marks sit on the left of the page, outside the crop.'
  },
  {
    file: 'eng-grant-1893-ad-ready-made-gears.jp2',
    title: 'Ready made gears (advertisement)', subject: 'Spoked, webbed and plain spur gears with a rack',
    creator: 'Unsigned advertisement engraving for George B. Grant', creator_died: 'Engraver anonymous (unsigned); advertiser George B. Grant died 1917',
    created: '1893', first_published: { year: 1893, venue: 'George B. Grant, A Treatise on Gear Wheels, 6th ed. (1893), unnumbered advertisement page (scan leaf 13)' },
    source_institution: 'Library of Congress (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/treatiseongearwh00gran/page/n12/',
    source_id: 'treatiseongearwh00gran, leaf 0013 (BookReader n12), unnumbered advertisement page', download_url: dl('treatiseongearwh00gran', 'treatiseongearwh00gran', '0013'),
    rights_statement_verbatim: LOC_RIGHTS,
    pd_basis_us: 'Published in the United States in 1893, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Unsigned illustration (anonymous: 70 years from 1893 long passed); the only named person died 1917.',
    clothing_check: 'No figures on the page; object only.',
    credit_line: 'Engraving from an advertisement in George B. Grant, A Treatise on Gear Wheels (6th ed., 1893). Library of Congress, via Internet Archive.',
    crop: { x: 348, y: 627, w: 2057, h: 1277 },
    traceability: 'Crisp engraving with fine tooth detail; gears overlap each other, so tracing a single gear needs its hidden edge completed.',
    notes: 'The rack is lettered "LEX. G. WORKS" (Lexington Gear Works, Grant\'s own firm, long defunct); drop the lettering in any trace anyway.'
  },
  {
    file: 'eng-sears-no112-p325-exercisers.jp2',
    title: 'Common Sense Exerciser (chest expander)', subject: 'Elastic-cord chest expander with two stirrup handles',
    creator: 'Anonymous catalogue engraver for Sears, Roebuck & Co.', creator_died: 'anonymous (unsigned corporate catalogue cut)',
    created: 'c. 1902 (Catalogue No. 112; item record dates it "190-"; it offers "1902 model" and "New 1903" goods)',
    first_published: { year: 'c. 1902', venue: 'Sears, Roebuck & Co., Catalogue No. 112 (Chicago), p. 325' },
    source_institution: 'Winterthur Museum Library (contributor), digitized by Internet Archive (sponsor: Lyrasis Members and Sloan Foundation)', source_url: 'https://archive.org/details/catalogueno11200sear/page/n328/',
    source_id: 'catalogueno11200sear, leaf 0329 (BookReader n328), printed p. 325; Winterthur call number HF5466 S43a TC', download_url: dl('catalogueno11200sear', 'catalogueno11200sear', '0329'),
    rights_statement_verbatim: WINTERTHUR,
    pd_basis_us: 'Published in the United States c. 1902, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Anonymous corporate catalogue cut first published c. 1902: 70-year anonymous-work term expired; no named creator.',
    clothing_check: 'No figures in the crop. (The Whiteley exerciser cut lower on the same page shows small exercising figures; not used, and not checked in detail.)',
    credit_line: 'Engraving from Sears, Roebuck & Co., Catalogue No. 112 (Chicago, c. 1902), p. 325. Winterthur Library, via Internet Archive.',
    crop: { x: 1556, y: 1179, w: 480, h: 243 },
    traceability: 'Clean small line cut; handles and cords are open lines. Low pixel count (object about 460 x 230 px) but the shape is simple enough to trace.',
    notes: 'A line of body text runs along the top edge of the crop; trim or mask. Same page also has small cuts of maple Indian clubs (lettered "INDIAN CLUBS" with a trade roundel: rejected for icon use), wood and iron dumb-bells and exercising rings.'
  },
  {
    file: 'eng-sears-no112-p741-padlocks.jp2',
    title: 'Scandinavian padlock', subject: 'Plain cast padlock with round-topped body and shackle, key below',
    creator: 'Anonymous catalogue engraver for Sears, Roebuck & Co.', creator_died: 'anonymous (unsigned corporate catalogue cut)',
    created: 'c. 1902', first_published: { year: 'c. 1902', venue: 'Sears, Roebuck & Co., Catalogue No. 112 (Chicago), p. 741' },
    source_institution: 'Winterthur Museum Library (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/catalogueno11200sear/page/n726/',
    source_id: 'catalogueno11200sear, leaf 0727 (BookReader n726), printed p. 741', download_url: dl('catalogueno11200sear', 'catalogueno11200sear', '0727'),
    rights_statement_verbatim: WINTERTHUR,
    pd_basis_us: 'Published in the United States c. 1902, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Anonymous corporate catalogue cut first published c. 1902: 70-year anonymous-work term expired.',
    clothing_check: 'No figures on the page; object only.',
    credit_line: 'Engraving from Sears, Roebuck & Co., Catalogue No. 112 (Chicago, c. 1902), p. 741. Winterthur Library, via Internet Archive.',
    crop: { x: 770, y: 2397, w: 135, h: 216 },
    traceability: 'Small, dark line cut (about 120 x 200 px): silhouette only; interior detail is lost at this size. Use as a shape reference, not a detailed trace.',
    notes: 'Text fragments touch the right edge of the crop. Many other padlock cuts on the page; several carry maker lettering (avoid).'
  },
  {
    file: 'eng-sears-no112-p155-blank-books.jp2',
    title: 'Twentieth Century scrap book (open)', subject: 'Open bound book with pasted-in clippings: a notebook / ledger shape',
    creator: 'Anonymous catalogue engraver for Sears, Roebuck & Co.', creator_died: 'anonymous (unsigned corporate catalogue cut)',
    created: 'c. 1902', first_published: { year: 'c. 1902', venue: 'Sears, Roebuck & Co., Catalogue No. 112 (Chicago), p. 155 (Stationery Department)' },
    source_institution: 'Winterthur Museum Library (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/catalogueno11200sear/page/n164/',
    source_id: 'catalogueno11200sear, leaf 0165 (BookReader n164), printed p. 155', download_url: dl('catalogueno11200sear', 'catalogueno11200sear', '0165'),
    rights_statement_verbatim: WINTERTHUR,
    pd_basis_us: 'Published in the United States c. 1902, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Anonymous corporate catalogue cut first published c. 1902: 70-year anonymous-work term expired.',
    clothing_check: 'The pasted-in page shows a small halftone portrait of a woman (head and shoulders, clothed); drop it from any trace. No other figures.',
    credit_line: 'Engraving from Sears, Roebuck & Co., Catalogue No. 112 (Chicago, c. 1902), p. 155. Winterthur Library, via Internet Archive.',
    crop: { x: 847, y: 434, w: 665, h: 402 },
    traceability: 'Mixed: line-drawn book with tiny halftone clippings inside. Outline (open covers, page block) is clean; interior should be redrawn as ruled lines, not traced.',
    notes: 'The same page has a closed "Cap Folio" ledger with marbled boards (muddy) and an "Order Book"; the open scrap book is the best notebook silhouette on it.'
  },
  {
    file: 'eng-spalding-almanac-1908-56lb-weight.jp2',
    title: 'Regulation 56-lb. weight', subject: 'Lead throwing weight with a triangular handle: the closest period stand-in for a kettlebell found tonight',
    creator: 'Anonymous advertising illustration for A.G. Spalding & Bros.', creator_died: 'anonymous (unsigned advertisement art)',
    created: '1908 ("Prices in effect January 6, 1908")',
    first_published: { year: 1908, venue: "Spalding's Official Athletic Almanac [for 1908], comp. J. E. Sullivan (New York: American Sports Publishing Co., 1908), advertising section" },
    source_institution: 'Library of Congress (contributor), digitized by Internet Archive (sponsor: Sloan Foundation)', source_url: 'https://archive.org/details/spaldingsofficia05sull/page/n232/',
    source_id: 'spaldingsofficia05sull, leaf 0233 (BookReader n232), unnumbered advertisement page; IA call_number field 9130470', download_url: dl('spaldingsofficia05sull', 'spaldingsofficia05sull', '0233'),
    rights_statement_verbatim: LOC_RIGHTS,
    pd_basis_us: 'Published in the United States in 1908, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Unsigned advertising art (anonymous) first published 1908: 70-year term expired. The almanac compiler, James E. Sullivan, died 1914 (IA/LoC heading "Sullivan, James Edward, 1862-1914").',
    clothing_check: 'Crop is object only. The page also shows a halftone of the hammer thrower John Flanagan in athletic kit (clothed) above the crop; he is outside it and must not be used or named.',
    credit_line: "Illustration from an A.G. Spalding & Bros. advertisement in Spalding's Official Athletic Almanac (New York, 1908). Library of Congress, via Internet Archive.",
    crop: { x: 580, y: 990, w: 365, h: 650 },
    traceability: 'MUDDY: retouched halftone, not line art. The silhouette (triangle handle + sphere) is simple and readable, so trace the outline only.',
    notes: 'Hand-lettered "56-LB WEIGHT" sits inside the triangle and "REGULATION HAMMER WITH WIRE HANDLE" beside it; the hammer\'s wire crosses near the handle. Drop all lettering. The page header carries the live Spalding trademark (outside the crop).'
  },
  {
    file: 'eng-lewis-1866-p029-wooden-ring.jp2',
    title: 'The gymnastic ring (Figure 1)', subject: 'Turned cherry-wood ring used in Dio Lewis\'s partner ring exercises',
    creator: 'Unsigned wood engraving in Dio Lewis, The New Gymnastics', creator_died: 'Engraver anonymous (unsigned); author Dio Lewis died 1886 (Wellcome/IA heading "Lewis, Dio, 1823-1886")',
    created: '1866 London issue (the item record notes "Also published Boston : Ticknor & Fields, 1864"; an earlier 1862 Boston first edition is unsourced tonight)',
    first_published: { year: 1866, venue: 'Dio Lewis, The New Gymnastics for Families and Schools, together with the Dumb-bell Instructor and Pangymnastikon (London: Tweedie, 1866), p. 29, fig. 1' },
    source_institution: 'Wellcome Library (contributor), digitized by Internet Archive', source_url: 'https://archive.org/details/b2804891x/page/n34/',
    source_id: 'b2804891x, leaf 0035 (BookReader n34), printed p. 29', download_url: dl('b2804891x', 'b2804891x', '0035'),
    rights_statement_verbatim: PDM_WELLCOME,
    pd_basis_us: 'Published 1866 (Boston edition 1864 per the item record), before 1931; US public domain.',
    pd_basis_worldwide: 'Author died 1886 and the engraver is anonymous: both more than 70 years ago. Wellcome marks the scan Public Domain Mark.',
    clothing_check: 'Crop is object only. The same page shows a man in a full-length period gym suit (Figure 2) below the ring; clothed, outside the crop.',
    credit_line: 'Wood engraving from Dio Lewis, The New Gymnastics (London: Tweedie, 1866), p. 29. Wellcome Collection, via Internet Archive. Public Domain Mark.',
    crop: { x: 84, y: 269, w: 761, h: 770 },
    traceability: 'Clean wood engraving: concentric line shading on a plain annulus. Traces to a perfect ring. Verso text shows through faintly inside the ring; threshold it out.',
    notes: 'Box measured from the ink profile: ring spans x 90-845, y 270-1035; the text column starts at x 870.'
  },
  {
    file: 'eng-mallory-1871-p292-padlocks.jp2',
    title: 'Padlock No. 10', subject: 'Heart-shaped wrought-iron padlock with shackle, key in the keyhole',
    creator: 'Unsigned chromolithograph for Mallory, Wheeler & Co. (successors to Davenport, Mallory & Co.)', creator_died: 'anonymous (unsigned trade-catalogue plate)',
    created: '1871', first_published: { year: 1871, venue: 'Mallory, Wheeler & Co., Door Locks, Knobs, Padlocks, etc., Illustrated and Described (Mallory, Wheeler & Company, 1871), p. 292 "Padlocks"' },
    source_institution: 'Caroline Simpson Library & Research Collection, Museums of History NSW (contributor), via Internet Archive', source_url: 'https://archive.org/details/Mallory34115/page/n289/',
    source_id: 'Mallory34115 (library record no. 34115), leaf 0289 (BookReader n289), printed p. 292', download_url: dl('Mallory34115', 'Recno34115', '0289'),
    rights_statement_verbatim: PDM_MALLORY,
    pd_basis_us: 'Published in the United States in 1871, before 1931; US copyright expired.',
    pd_basis_worldwide: 'Unsigned corporate trade-catalogue plate first published 1871: anonymous 70-year term long expired. The contributing library marks it Public Domain Mark.',
    clothing_check: 'No figures on the page; object only.',
    credit_line: 'Chromolithograph from Mallory, Wheeler & Co., Door Locks, Knobs, Padlocks, etc. (1871), p. 292. Caroline Simpson Library, Museums of History NSW, via Internet Archive.',
    crop: { x: 812, y: 750, w: 404, h: 471 },
    traceability: 'Colour lithograph with engraved-style ribbing, not pure line art. Silhouette is strong and closed; about 400 x 470 px. Good padlock (privacy / lock) source; the brass drop plate on No. 10 is unlettered.',
    notes: 'Other padlocks on the page carry "M.W.&Co." on their drop plates (defunct firm, but still lettering to drop). The uploaded source file COL_CSLRC_recno34115_290.jpg in Recno34115_images.zip is the same page at the same 1658 x 2000 px.'
  }
];

const out = entries.map(e => {
  const p = `${IA}/originals/${e.file}`;
  const buf = readFileSync(p);
  const sha = createHash('sha256').update(buf).digest('hex');
  const s = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', p]).toString();
  const w = +s.match(/pixelWidth: (\d+)/)[1], h = +s.match(/pixelHeight: (\d+)/)[1];
  if (e.crop.x + e.crop.w > w || e.crop.y + e.crop.h > h) throw new Error('crop outside image: ' + e.file);
  return {
    file: `originals/${e.file}`, sha256: sha, bytes: statSync(p).size, dims: `${w}x${h}`,
    title: e.title, subject: e.subject, creator: e.creator, creator_died: e.creator_died, created: e.created,
    first_published: e.first_published, source_institution: e.source_institution, source_url: e.source_url, source_id: e.source_id,
    rights_statement_verbatim: e.rights_statement_verbatim, pd_basis_us: e.pd_basis_us, pd_basis_worldwide: e.pd_basis_worldwide,
    retrieved: RETR, original_sha256: sha, original_dims: `${w}x${h}`, transforms: [],
    clothing_check: e.clothing_check, credit_line: e.credit_line, micah_approved: false,
    crop: e.crop, traceability: e.traceability,
    download_url: e.download_url,
    notes: `${e.notes} File is the Internet Archive processed page JP2 (the item's own page image, downloaded as-is from download_url, no re-encode).`
  };
});
const doc = {
  _about: 'Track 8b (engravings / line illustrations) draft provenance, V59 Phase R. Draft only: nothing here is approved (micah_approved false on every entry). file paths are relative to research/iron-age/. crop is in the original file\'s own pixels. Several entries share one page image and differ only by crop.',
  generated: RETR, generator: 'tools/prov8b.mjs (sha256/bytes/dims measured from disk; dims via macOS sips)',
  entries: out
};
writeFileSync(`${IA}/PROVENANCE.engravings.draft.json`, JSON.stringify(doc, null, 1));
console.log('wrote ' + out.length + ' entries');
for (const o of out) console.log(o.file, o.bytes, o.dims, o.sha256.slice(0, 12), JSON.stringify(o.crop));
