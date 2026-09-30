// gf8r-patch.mjs — critic-round gap fill (08a/09), run 2026-09-27. Applies the gap-fill findings to
// research/iron-age/PROVENANCE.photos.draft.json: demotes the four Bain frames and the NPC frame to Tier B (no
// dated printed use found), adds sourced likeness notes for named subjects, and appends 4 Sargent (1904) photos and
// 4 Krohne & Sesemann (1896) engravings. sha256/bytes are measured from disk; dims come from sips (recorded below).
// Every fact cites the page it came from; the pages are listed in 08a-photos.md under "Gap fill (critic round)".
// Idempotent: re-running skips entries whose file+source_id already exist. Writes via temp file + rename.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = '/Users/micahflunker/dev/vibes-night/research/iron-age/';
const P = ROOT + 'PROVENANCE.photos.draft.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
if (!Array.isArray(j)) throw new Error('expected array');
const TAG = '[gap fill, critic round 2026-09-27]';
const byFile = f => j.find(e => e.file === 'research/iron-age/originals/' + f);

// ---------- 1. demotions and likeness notes ----------
const CA_SEARCHED_SANDWINA = 'Chronicling America (loc.gov API, OCR read from tile.loc.gov) searched 1910-1914 for Sandwina; the earlier gf08 run viewed her photos in the Washington Times (4 May 1912), Tacoma Times (6 Jun 1911) and Evening Times-Republican (Marshalltown, 12 Jul 1911): all different frames.';
const US_IF_UNPUB = y => `If it was never published, an anonymous or for-hire photograph made before 1978 is protected for 120 years from creation (17 U.S.C. 302(c), applied by 303(a)): to the end of ${y}. Publication before 1931 is therefore what makes it US public domain, and it is not proven.`;
const PUB_DEF = 'Bain sold and distributed photographs to subscribing newspapers (LoC: "The photographs Bain produced and gathered for distribution through his news service"), which is publication if this frame was among them (17 U.S.C. 101: "offering to distribute copies ... to a group of persons for purposes of further distribution" is publication).';
const LIKE_SANDWINA = 'Katie Sandwina (born Katharina Brumbach), 6 May 1884 - 21 Jan 1952 (Wikipedia; LoC name authority n2023015257 gives only the birth date, 1884-05-06). California 70-year window closed Jan 2022; Indiana 100-year window runs to Jan 2052. Named, so: credits screen only, never near Rack\'s name, a slogan or an ad.';

const upd = {
  'sandwina-three-men.tif': {
    tier: 'B', confidence: 'medium',
    created: 'Undated: LoC records "[no date recorded on caption card]". Negative run LC-B2-1305 also holds Sen. L. Y. Sherman, in the Senate from 26 Mar 1913 (Wikipedia), so the copy negative is probably 1913 or later (inference). The frame is itself a copy of a printed publicity card, older than the negative by an unknown margin.',
    first_published: { year: 'not established', venue: 'No dated printed use found. The typeset caption "The Lady Hercules / Katie Sandwina" in the frame shows the photograph was printed as a card for distribution, but the card is undated. ' + CA_SEARCHED_SANDWINA },
    pd_basis_us: 'NOT established. ' + PUB_DEF + ' A printed card is also publication, but its date is unknown, and LoC says the Bain collection runs "as late as the 1930s". ' + US_IF_UNPUB('2033 (if made 1913)'),
    likeness: LIKE_SANDWINA,
  },
  'sandwina-lady-hercules.tif': {
    tier: 'B', confidence: 'medium',
    created: 'Undated (LoC: "[no date recorded on caption card]"); same negative run LC-B2-1305 as sandwina-three-men, so probably 1913 or later (inference). A copy of a printed card.',
    first_published: { year: 'not established', venue: 'No dated printed use found. The typeset caption "The Lady Hercules · Katie Sandwina / A Combination of female Strength, Form & Beauty" shows a printed card, date unknown. ' + CA_SEARCHED_SANDWINA },
    pd_basis_us: 'NOT established. ' + PUB_DEF + ' ' + US_IF_UNPUB('2033 (if made 1913)'),
    likeness: LIKE_SANDWINA,
  },
  'hackenschmidt-bain-1908.tif': {
    tier: 'B', confidence: 'medium',
    created: 'Undated (LoC: "[no date recorded on caption card]"). Negative run LC-B2-125 also holds Portuguese ministers; Campos Henriques was Prime Minister 26 Dec 1908 - 11 Apr 1909 (Wikipedia). Hackenschmidt landed in New York from the Lusitania on 13 Mar 1908 (New-York Tribune, 14 Mar 1908, p. 8). c. 1908 (inference).',
    first_published: { year: 'not established', venue: 'No dated printed use found. Hackenschmidt portraits printed in the New-York Tribune (14 and 15 Mar 1908), Washington Times (14 and 15 Mar 1908), Salt Lake Herald (15 Mar 1908) and Louisville Courier-Journal (29 Mar 1908) were all checked by eye: none is this frame.' },
    pd_basis_us: 'NOT established. ' + PUB_DEF + ' ' + US_IF_UNPUB('2028 (if made 1908)'),
    likeness: 'George Hackenschmidt, died 19 Feb 1968 (track 9, C4): California window to 2038, Indiana to 2068. Avoid as a hero image whatever the tier.',
  },
  'joe-rogers-gym.tif': {
    tier: 'B', confidence: 'medium',
    created: 'Undated (LoC: "[no date recorded on caption card]"). Negative run LC-B2-494 also holds the wrestler Yussif Mahmout, and LoC dates another Bain Mahmout photograph "1908 Oct." (item 2003677465). Rogers was in New York in March 1908, when Gotch "failed to tumble Joe Rogers over five times in one hour" (Washington Times, 7 Mar 1908, p. 8), and in August 1908 (Washington Herald, 5 Aug 1908, p. 9). c. 1908 (inference).',
    first_published: { year: 'not established', venue: 'No dated printed use found: Chronicling America OCR searches for "Joe Rogers" / "American Apollo", 1907-1910, found match reports but no photo caption of this frame.' },
    pd_basis_us: 'NOT established. ' + PUB_DEF + ' ' + US_IF_UNPUB('2028 (if made 1908)'),
    likeness: 'Joe Rogers, "The American Apollo", heavyweight wrestler. A United Press item in the Washington Daily News, 14 Jan 1929, p. 10 reads: "BUFFALO - Joe Rogers, 49, famous heavyweight wrestler of 20 years ago, was found dead in his auto in a downtown street yesterday. A heart attack was blamed." That he is the same man is an inference from name, trade and era. If so: died c. 13 Jan 1929; California window closed 1999; Indiana window runs to Jan 2029.',
  },
  'house-gym-dumbbells-1920.tif': {
    tier: 'B', confidence: 'medium',
    first_published: { year: 'not established', venue: 'The "caption list" is the National Photo Company\'s own record, not a printed use. Chronicling America searches for the drill (May-Jun 1920: "House Office Building", "dumb bell", "dumbbells") found none; the Casper Daily Tribune of 1 Jun 1920 carries Haskin\'s text-only piece "Congress Takes to Athletics" on the House gymnasium.' },
    pd_basis_us: 'NOT established. The National Photo Company supplied news photos to subscribers (LoC collection text), which is publication if this frame was supplied (17 U.S.C. 101). ' + US_IF_UNPUB('2040 (made 1920)'),
  },
};
for (const [f, u] of Object.entries(upd)) {
  const e = byFile(f); if (!e) throw new Error('missing ' + f);
  if ((e.notes || '').includes(TAG)) continue;
  Object.assign(e, u);
  e.notes = (e.notes || '') + ` ${TAG} Demoted to Tier B: no dated printed use before 1931 was found, and the year above is an inference. Micah rules whether news-agency distribution alone meets §14 test 1.`;
}
const like = {
  'saxon-trio-1911.tif': 'Named subjects. Arthur Saxon died 6 Aug 1921 (track 9, C4). Kurt and Hermann Saxon: death dates NOT found (English, Polish and Spanish Wikipedia, Wikidata Q4800243, LoC name authorities and oldtimestrongman.com searched; the only LoC "Saxon, Kurt" authority, n50016908, is a different man born 1932). Treat as a publicity risk of unknown length: credits screen only, never in App Store screenshots or ads.',
  'athleta-1911.tif': 'Athléta (Athleta Van Huffelen), 1865-1927 per the list in Wikipedia "Strongwoman" (uncited there; years only). California window closed 1997; Indiana window runs to 2027 (month unknown). Credits screen only.',
  'athleta-lille-1911.tif': 'Athléta (Athleta Van Huffelen), 1865-1927 per the list in Wikipedia "Strongwoman" (uncited there; years only). California window closed 1997; Indiana window runs to 2027 (month unknown). Credits screen only.',
  'apollon-portrait-1911.tif': 'Apollon (Louis Uni), 21 Feb 1862 - 18 Oct 1928 (Wikipedia "Louis Uni"). California window closed 1998; Indiana window runs to 18 Oct 2028. Credits screen only.',
};
for (const [f, l] of Object.entries(like)) {
  const e = byFile(f); if (!e) throw new Error('missing ' + f);
  if (!e.likeness) e.likeness = l;
}

// ---------- 2. new entries ----------
function disk(f) {
  const b = readFileSync(ROOT + 'originals/' + f);
  return { sha256: createHash('sha256').update(b).digest('hex'), bytes: b.length };
}
const hc = (W, H, x0, x1, y0, y1) => ({ x0, y0, x1, y1, source_px: `${Math.round((x1 - x0) * W)}x${Math.round((y1 - y0) * H)}`, at3x_ok: Math.round((x1 - x0) * W) >= 1074 });

const SARG = {
  W: 3291, H: 4579,
  book: 'Dudley Allen Sargent, Health, Strength & Power (New York and Boston: H. M. Caldwell Co., 1904). Title-page verso: "Copyright, 1904, By H. M. Caldwell Co."',
  creator: 'Uncredited photographer; halftones made "from numerous photographs of a well-trained model" (author\'s preface) for D. A. Sargent, Health, Strength & Power (1904)',
  creator_died: 'anonymous (no photographer named); book author Dudley Allen Sargent 1849-1924 (IA record); copyright claimant H. M. Caldwell Co. (a company)',
  inst: 'Internet Archive (scan of a Brigham Young University, Harold B. Lee Library copy)',
  url: 'https://archive.org/details/healthstrengthpo1904sarg',
  rights: '(none: the item record carries no rights, licenseurl or possible-copyright-status field; metadata API, retrieved 2026-09-27)',
  us: 'Published in New York and Boston in 1904 with a copyright notice, before 1931: US term expired.',
  ww: 'The photographer is not named (anonymous): the EU/UK anonymous term is 70 years from publication, 1904 + 70 = 1974. The book\'s author, Sargent, died 1924 (life + 70 ended 31 Dec 1994); the claimant is a company. Test 2 passes on every reading.',
  dl: 'https://archive.org/download/healthstrengthpo1904sarg/healthstrengthpo1904sarg_jp2.zip/healthstrengthpo1904sarg_jp2%2Fhealthstrengthpo1904sarg_',
  clothing: 'PASS: knitted gymnasium tights to the ankle, belt, soft shoes, bare torso. Exercise poses, not statue poses.',
  like: 'Unnamed model; no name printed anywhere in the book that was found. No likeness constraint beyond "never imply endorsement".',
  note: 'Whole page is the original: IA "Single Page Processed JP2", 8-bit colour, 500 ppi scan (IA ppi field), as served. The layout device (halftone figures cut out and overlapping a flat grey panel, hand-lettered italic captions) is itself a period motif worth studying for Iron Age. Leaf number from the item\'s scandata.xml (BookReader n + 3 here, because leaf 0 is deleted and two more are not shown); checked by eye against the BookReader page. Crop boxes read by eye from a 300 px preview, and the 3:1 band checked on a rendered crop; confirm before cutting.',
};
const KROHNE = {
  leaflet: 'Krohne & Sesemann, Health and strength-giving home gymnastics for every man, woman and child: no family should be without Largiader\'s apparatus for strengthening the chest and limbs (patented) (London: Krohne & Sesemann, [1896]), a folded 4-page trade leaflet; page 2 is headed "[Reprinted from The Chemist and Druggist, October 3, 1896.]"',
  inst: 'Wellcome Collection (Wellcome Library copy), digitized by Internet Archive',
  url: 'https://archive.org/details/b30475065',
  rights: 'IA metadata "rights": "This work is available under the Creative Commons, Public Domain Mark" (link http://creativecommons.org/publicdomain/mark/1.0/), retrieved 2026-09-27.',
  us: 'Published in London in 1896, before 1931: US term expired.',
  dl: 'https://archive.org/download/b30475065/b30475065_jp2.zip/b30475065_jp2%2Fb30475065_',
  note: 'Whole page is the original: IA "Single Page Processed JP2", 8-bit colour, as served. File _0000 in the zip is the scanner\'s colour target; leaf n in BookReader = file _(n+1) (checked by eye). The drawings illustrate "Largiader\'s Patent" weighted-cord arm and chest strengthener; the leaflet says its sketches follow Zahn\'s treatise (Stuttgart: A. Zimmer). Keep prices, the firm\'s name and address, and the physicians\' quotations out of every crop.',
};
const K = { W1: 3369, H1: 4383, W: 3303, H: 4353 };

const add = [
  {
    file: 'sargent-1904-leaf0205-teamsters-warning.jp2', leaf: '0205', tier: 'A', confidence: 'high',
    title: '"Teamsters\' Warning", Figs. 21-22 - Sargent, Health, Strength & Power (1904), plate at leaf 205',
    subject: 'Fig. 21: the model standing with both arms flung out level; Fig. 22: the same model in a wide squat with arms folded. Halftones cut out over a flat grey panel, lettered "Teamsters\' Warning".',
    focal: { x: 0.433, y: 0.095 }, crop: { x0: 0.025, y0: 0.03, x1: 0.965, y1: 0.975 },
    h120: [0.025, 0.965, 0.03, 0.2565], h190: [0.025, 0.965, 0.03, 0.3887],
    extra: 'The best 3:1 band in the whole set: Fig. 21\'s arms span the full width, head at the top, grey panel behind the chest.',
  },
  {
    file: 'sargent-1904-leaf0227-swimming-side-stroke.jp2', leaf: '0227', tier: 'A', confidence: 'high',
    title: '"Swimming Side Stroke", Figs. 43-44 - Sargent, Health, Strength & Power (1904), plate at leaf 227',
    subject: 'Fig. 44: the model leaning with one arm reaching high and one low, a long diagonal; Fig. 43: the same stroke seen from the other side. Grey panel, lettered "Swimming Side Stroke."',
    focal: { x: 0.5, y: 0.083 }, crop: { x0: 0.03, y0: 0.03, x1: 0.97, y1: 0.945 },
    h120: [0.03, 0.97, 0.03, 0.2565], h190: [0.03, 0.97, 0.03, 0.3887],
    extra: 'A diagonal across the 3:1 band; the lettering "Swimming Side Stroke." sits at the band\'s lower edge (keep or trim).',
  },
  {
    file: 'sargent-1904-leaf0207-fencing.jp2', leaf: '0207', tier: 'A', confidence: 'high',
    title: '"Fencing", Figs. 23-24 - Sargent, Health, Strength & Power (1904), plate at leaf 207',
    subject: 'Fig. 23: the model from behind, arms raised in guard; Fig. 24: the model in a deep fencing lunge, arm pointing out. Grey panel, lettered "Fencing."',
    focal: { x: 0.533, y: 0.476 }, crop: { x0: 0.03, y0: 0.02, x1: 0.985, y1: 0.965 },
    h120: [0.03, 0.985, 0.4, 0.63], h190: [0.03, 0.985, 0.33, 0.6943],
    extra: 'The 3:1 band centres on Fig. 24\'s shoulders and pointing arm; Fig. 23\'s legs fill its left third and the "Fig. 24" lettering touches its lower edge.',
  },
  {
    file: 'sargent-1904-leaf0199-striking-anvil.jp2', leaf: '0199', tier: 'A', confidence: 'high',
    title: '"Striking Anvil", Figs. 15-16 - Sargent, Health, Strength & Power (1904), plate at leaf 199',
    subject: 'Fig. 15: the model standing, arms spread level; Fig. 16: the model with both arms swung out to one side. Grey panel, lettered "Striking Anvil."',
    focal: { x: 0.433, y: 0.07 }, crop: { x0: 0.02, y0: 0.02, x1: 0.975, y1: 0.96 },
    h120: [0.02, 0.975, 0.02, 0.25], h190: [0.02, 0.975, 0.02, 0.3843],
    extra: 'A second arms-spread band, near-identical in shape to leaf 205: use one or the other, not both.',
  },
];
for (const a of add) {
  if (j.some(e => e.file === 'research/iron-age/originals/' + a.file)) continue;
  const d = disk(a.file);
  j.push({
    file: 'research/iron-age/originals/' + a.file, sha256: d.sha256, bytes: d.bytes, dims: `${SARG.W}x${SARG.H}`,
    title: a.title, subject: a.subject, creator: SARG.creator, creator_died: SARG.creator_died, created: 'before publication in 1904 (the preface is dated "Cambridge, July," with the year garbled in the OCR)',
    first_published: { year: '1904', venue: SARG.book + ', full-page halftone plate' },
    source_institution: SARG.inst, source_url: SARG.url, source_id: `healthstrengthpo1904sarg, leaf ${a.leaf} (file _${a.leaf}.jp2)`,
    rights_statement_verbatim: SARG.rights, pd_basis_us: SARG.us, pd_basis_worldwide: SARG.ww,
    retrieved: '2026-09-27', original_sha256: d.sha256, original_dims: `${SARG.W}x${SARG.H}`, transforms: [],
    clothing_check: SARG.clothing,
    credit_line: 'From D. A. Sargent, Health, Strength & Power (New York: H. M. Caldwell Co., 1904). Brigham Young University copy via Internet Archive.',
    micah_approved: false, focal: a.focal, crop_hint: a.crop,
    hero_crops: { box_358x120: hc(SARG.W, SARG.H, ...a.h120), box_358x190: hc(SARG.W, SARG.H, ...a.h190) },
    confidence: a.confidence, tier: a.tier,
    download_url: SARG.dl + a.leaf + '.jp2', pixel_format: '8-bit x 3 channel(s)', likeness: SARG.like,
    notes: `${TAG} Tier A: test 1 by the 1904 imprint and copyright notice; test 2 anonymous photographer (author d.1924, claimant a company, either way); clothing passes; unnamed model. ${a.extra} ${SARG.note}`,
  });
}

const kadd = [
  {
    file: 'eng-krohne-1896-p1-largiader-lunge.jp2', n: '0001', W: K.W1, H: K.H1, tier: 'A', confidence: 'medium',
    title: 'Man lunging with Largiader\'s arm and chest strengthener - Krohne & Sesemann leaflet (1896), p. [1]',
    subject: 'Line engraving: a man in shirt, braces and striped trousers lunging, one arm raised with the weighted cord running diagonally across his back. Unsigned.',
    venue: 'the leaflet\'s front page', focal: { x: 0.28, y: 0.29 }, crop: { x0: 0.15, y0: 0.25, x1: 0.416, y1: 0.48 },
    h120: [0.15, 0.416, 0.255, 0.3235], h190: [0.15, 0.416, 0.25, 0.3586],
    sig: 'No signature or monogram (ground hatching checked at full size).',
    extra: 'Sideways vertical lettering sits just outside the box on both sides, and "DIRECTIONS FOR USE" below it. The box is 896 px wide, so @2x at most for a full-width hero.',
  },
  {
    file: 'eng-krohne-1896-p2-largiader-figures.jp2', n: '0002', W: K.W, H: K.H, tier: 'A', confidence: 'medium',
    title: 'Boy and girl exercising with Largiader\'s apparatus - The Chemist and Druggist reprint (3 Oct 1896), Krohne & Sesemann leaflet p. [2]',
    subject: 'Line engraving: a boy in shirt and knickerbockers holding both handles overhead, weights hanging; a girl in a frock and sash drawing one cord up across her body. Unsigned.',
    venue: 'the leaflet\'s p. [2], the page headed as a reprint from The Chemist and Druggist of 3 Oct 1896', focal: { x: 0.72, y: 0.45 }, crop: { x0: 0.52, y0: 0.406, x1: 0.921, y1: 0.6545 },
    h120: [0.52, 0.921, 0.406, 0.508], h190: [0.52, 0.921, 0.406, 0.5675],
    sig: 'No signature or monogram (ground hatching checked at full size).',
    extra: 'Brown foxing spots cross the page at y≈.47 (between the figures\' shoulders and waists); they are in the scan and must not be retouched away. The same page has a woman seen from behind at x≈.24-.375, y≈.28-.53 (text close on both sides).',
  },
  {
    file: 'eng-krohne-1896-p3-largiader-class.jp2', n: '0003', W: K.W, H: K.H, tier: 'B', confidence: 'medium', src: 'class',
    title: 'A class of girls in a line with Largiader\'s apparatus - Krohne & Sesemann leaflet (1896), p. [3]',
    subject: 'Line engraving: eleven girls in frocks standing in a row on a hatched floor, holding the weighted cords out level or overhead. The widest drawing in the set.',
    venue: 'the leaflet\'s p. [3], under "Graduated Arm and Chest Strengthener"', focal: { x: 0.49, y: 0.46 }, crop: { x0: 0.263, y0: 0.429, x1: 0.713, y1: 0.588 },
    h120: [0.263, 0.713, 0.429, 0.5434], h190: [0.286, 0.69, 0.429, 0.592],
    sig: 'SIGNED: a draughtsman\'s signature in the ground hatching at x≈.675, y≈.568 reads roughly "?. Schram..." and is not legible enough to identify anyone. A named but unidentified artist means test 2 (died before 1956) cannot be shown: Tier B, Micah rules.',
    extra: 'Measured on the ink (luminance < 60, >= 12 px per row/column) and checked by eye; the quoted text columns sit just outside x .263 and .713.',
  },
  {
    file: 'eng-krohne-1896-p3-largiader-class.jp2', n: '0003', W: K.W, H: K.H, tier: 'B', confidence: 'medium', src: 'lunge',
    title: 'Bearded man in a side lunge with arms spread - Krohne & Sesemann leaflet (1896), p. [3]',
    subject: 'Line engraving: a bearded man in shirt, braces and trousers in a deep side lunge, the cord held level across both outstretched arms, weights hanging at each hand.',
    venue: 'the leaflet\'s p. [3], under "Hygieia, Part I., 1893-4"', focal: { x: 0.49, y: 0.71 }, crop: { x0: 0.33, y0: 0.684, x1: 0.638, y1: 0.839 },
    h120: [0.33, 0.638, 0.684, 0.762], h190: [0.33, 0.638, 0.684, 0.808],
    sig: 'A small monogram (two strokes, roughly "Th" or "J7") in the ground hatching at x≈.56, y≈.826; it identifies no one. With the signed class drawing on the same page, treated as Tier B: Micah rules.',
    extra: 'Measured on the ink and checked by eye. 1018 px wide, so @2x at most.',
  },
];
for (const a of kadd) {
  const sid = `b30475065, file _${a.n}.jp2 (BookReader n${Number(a.n) - 1})` + (a.src ? `, crop "${a.src}"` : '');
  if (j.some(e => e.file === 'research/iron-age/originals/' + a.file && e.source_id === sid)) continue;
  const d = disk(a.file);
  j.push({
    file: 'research/iron-age/originals/' + a.file, sha256: d.sha256, bytes: d.bytes, dims: `${a.W}x${a.H}`,
    medium: 'engraving (line block), not a photograph',
    title: a.title, subject: a.subject,
    creator: 'Unnamed draughtsman/engraver for Krohne & Sesemann (London surgical-instrument makers)',
    creator_died: a.tier === 'A' ? 'anonymous (no name or mark on this drawing); publisher a firm' : 'NOT established (see notes: a signature or mark is present but identifies no one)',
    created: 'by 1896',
    first_published: { year: '1896 (the Wellcome/IA date; p. [2] is headed as a reprint from The Chemist and Druggist of 3 Oct 1896)', venue: `${KROHNE.leaflet}; this drawing on ${a.venue}` },
    source_institution: KROHNE.inst, source_url: KROHNE.url, source_id: sid,
    rights_statement_verbatim: KROHNE.rights, pd_basis_us: KROHNE.us,
    pd_basis_worldwide: a.tier === 'A' ? 'Anonymous drawing published 1896: the EU/UK anonymous term (70 years from making available) ended 1966. Wellcome marks the item Public Domain.' : 'NOT established: the drawing carries a mark that may name its artist, whose dates are unknown. Wellcome marks the item Public Domain.',
    retrieved: '2026-09-27', original_sha256: d.sha256, original_dims: `${a.W}x${a.H}`, transforms: [],
    clothing_check: 'PASS: fully clothed figures in period dress.',
    credit_line: 'Engraving from a Krohne & Sesemann leaflet (London, 1896). Wellcome Collection, via Internet Archive.',
    micah_approved: false, focal: a.focal, crop_hint: a.crop,
    hero_crops: { box_358x120: hc(a.W, a.H, ...a.h120), box_358x190: hc(a.W, a.H, ...a.h190) },
    confidence: a.confidence, tier: a.tier,
    download_url: KROHNE.dl + a.n + '.jp2', pixel_format: '8-bit x 3 channel(s)',
    likeness: 'Drawn figures; no identifiable person.',
    notes: `${TAG} ${a.sig} ${a.extra} ${KROHNE.note} Filed here, not in PROVENANCE.engravings.draft.json, because that file was being edited by the 8b gap-fill agent at the same time; the orchestrator may move these entries.`,
  });
}

const tmp = P + '.tmp-gf8r';
writeFileSync(tmp, JSON.stringify(j, null, 2) + '\n');
JSON.parse(readFileSync(tmp, 'utf8'));
renameSync(tmp, P);
const t = {}; for (const e of j) t[e.tier] = (t[e.tier] || 0) + 1;
console.log('entries', j.length, 'tiers', JSON.stringify(t));
