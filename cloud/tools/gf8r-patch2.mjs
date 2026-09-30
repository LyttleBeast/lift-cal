// gf8r-patch2.mjs — critic-round gap fill (08a/09), 2026-09-27. Second pass on the four Sargent entries: hero crops
// must not carry the plates' lettering ("Fig. 24", "Swimming Side Stroke.") because words inside art would be new
// on-screen copy. Re-cut the 3:1 boxes (checked on rendered crops) and drop the 358x190 boxes, which cannot avoid a
// "Fig." label on any of these plates. Writes via temp file + rename.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.photos.draft.json';
const j = JSON.parse(readFileSync(P, 'utf8'));
const W = 3291, H = 4579;
const hc = (x0, x1, y0, y1) => ({ x0, y0, x1, y1, source_px: `${Math.round((x1 - x0) * W)}x${Math.round((y1 - y0) * H)}`, at3x_ok: Math.round((x1 - x0) * W) >= 1074 });
const set = {
  'sargent-1904-leaf0205-teamsters-warning.jp2': hc(0.025, 0.965, 0.03, 0.2565),
  'sargent-1904-leaf0227-swimming-side-stroke.jp2': hc(0.03, 0.84, 0.033, 0.2275),
  'sargent-1904-leaf0207-fencing.jp2': hc(0.03, 0.985, 0.385, 0.615),
  'sargent-1904-leaf0199-striking-anvil.jp2': hc(0.02, 0.975, 0.02, 0.25),
};
const NOTE = ' [gap fill, critic round 2026-09-27, pass 2] box_358x120 re-cut so no lettering is in frame (checked on a rendered crop); box_358x190 is null because every 1.88:1 box on this plate takes in a "Fig." label or the caption lettering.';
for (const [f, b] of Object.entries(set)) {
  const e = j.find(x => x.file === 'research/iron-age/originals/' + f);
  if (!e) throw new Error('missing ' + f);
  if ((e.notes || '').includes('pass 2]')) continue;
  e.hero_crops = { box_358x120: b, box_358x190: null };
  e.notes += NOTE;
}
const tmp = P + '.tmp-gf8r2';
writeFileSync(tmp, JSON.stringify(j, null, 2) + '\n');
JSON.parse(readFileSync(tmp, 'utf8'));
renameSync(tmp, P);
console.log('ok', j.length);
