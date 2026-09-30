// resume9-args-simple.mjs — args for the Navy and Oxblood V runs (vr.body.js, kind simple), after Chalk is on main.
//   node resume9-args-simple.mjs <mainWeb> <mainNat>   → tmp/resume9/{navy,oxblood}.args.json
import { writeFileSync } from 'node:fs';
const [mainWeb, mainNat] = process.argv.slice(2);
if (!mainWeb || !mainNat) { console.error('usage: resume9-args-simple.mjs <mainWeb> <mainNat>'); process.exit(2); }
const NIGHT = '/Users/micahflunker/dev/vibes-night';
const T = `${NIGHT}/tmp/resume9/`;
const COMMON = (id, name) => `
===== ${name.toUpperCase()}: WHAT THE EARLIER PHASES LEFT TO THIS VIBE (main now has engine v2 and Chalk) =====
1. The definition (${NIGHT}/wt/web-design/vibes/defs/${id}.js) was written BEFORE engine v2's roles. Update it in the web tree (then copy byte for byte to native): tagInk (the W/F/D badge letters), colors.band (the strip under the web status text — for a dark vibe, its ground or bar), shadow.calHead / calTarget if the spec rings them, face.bands if it has a condensed cut, face.web.* family names prefixed with the id ('${id} …', tools-check/vibes-scope), type.meta and inkOf if the spec sets them, and a \`shape\` object (may be {}). index.js valueOf() fills anything left out. Run tools-check/vibes-contract.mjs with ${id} registered.
2. SPARK: the icon set ${NIGHT}/wt/web-design/vibes/icons/${id}.js holds ONLY spark, the neutral ≈ mark (SYNTHESIS finding 6: v1's four-point sparkle is an AI tell). Copy it to vibes/icons/${id}.js, set the def's icons to '${id}', register the set in vibe.js and native (icon() falls back to v1 for every other name). Pure module, copied byte for byte to native and pinned.
3. ADD TILE · FLAT (the orchestrator's decision "E3", required before this vibe's commit): lit add tiles draw their icon well and tag on \`raised\`, so the 8.5px tag reaches 4.5:1 (the design judges measured the plain look's tag at ~2.1–2.4:1 in this palette). Chalk is on main already: look at how Chalk draws addTile·flat on both clients (web vibes/chalk.css; native the 'flat' case at the addTile switch, src/ui/variant.js sites) and reuse the same case — do not write a second implementation; if Chalk's case is Chalk-specific, generalise it in this vibe's own CSS / the shared 'flat' case without changing Chalk's or v1's output.
4. REUSE, DON'T REWRITE: Chalk added the generic native verifiers tools/verify-vibe-parity.mjs and tools/verify-vibe-fit.mjs (and extended verify-vibe-switch/-seams/-setting/-verbatim, tools/lib/vibe-seed.mjs); register ${id} in them. If ${NIGHT}/tools/vibe-contrast.mjs exists (Chalk's contrast gate), reuse it.
5. The Coach card and the other measured surfaces keep Archivo on v1 metrics (the spec says so).
6. Navy and Oxblood are built at the same time on separate branches; both add registry lines — that's expected; the orchestrator merges one at a time.`;
const navy = {
  id: 'navy', name: 'Navy', kind: 'simple', mainWeb, mainNat,
  spec: `${NIGHT}/design/navy.md`, def: `${NIGHT}/wt/web-design/vibes/defs/navy.js`, icons: `${NIGHT}/wt/web-design/vibes/icons/navy.js`,
  registry: { id: 'navy', name: 'Navy', feel: 'Deep navy ground, pale ink.', experimental: false, scheme: 'dark' },
  fonts_or_images: true, runSuffix: '-s1', buildRelay: 2,
  notes: COMMON('navy', 'Navy') + `
7. FONTS: Overpass (OFL 1.1, no RFN). The design agent already prepared candidates under ${NIGHT}/tools/navyA/fonts/ (navy-Overpass-latin.woff2 44,540 B + a 6,516 B picker-digits file; native latin-{400,600,700,800}.ttf, 800 = picker face, 168,216 B) — the fonts agent may use them only after re-verifying source, licence, sha256 and glyph coverage, and must record where they came from in FONTS.json.
8. Listed for Micah, not yours to change: the accent is pistachio (Q-P2; camel / old rose were the alternatives); Navy's data plates are close to Oxblood's (ΔE00 0-2.2 on 5 of 6); charts drawn by the pinned analytics.js keep pYellow, so they may read "v1 on blue".`,
};
const oxblood = {
  id: 'oxblood', name: 'Oxblood', kind: 'simple', mainWeb, mainNat,
  spec: `${NIGHT}/design/oxblood.md`, def: `${NIGHT}/wt/web-design/vibes/defs/oxblood.js`, icons: `${NIGHT}/wt/web-design/vibes/icons/oxblood.js`,
  registry: { id: 'oxblood', name: 'Oxblood', feel: 'Oxblood and ice blue.', experimental: false, scheme: 'dark' },
  fonts_or_images: true, runSuffix: '-s1', buildRelay: 2,
  notes: COMMON('oxblood', 'Oxblood') + `
7. GRIP BACK UP (orchestrator's decision): the design revise darkened colors.grip to #503a3e (split from knurl #846368) to lift the lit tile's tag — but that drops the sheet's grab handle to 1.68:1, and §13.1 requires 3:1 for any UI graphic a vibe changes. Put grip back to a value that keeps the grab handle ≥ 3:1 on the sheet (knurl's #846368 or the nearest value that passes; measure it), and let item 3 (addTile·flat) carry the tag's contrast.
8. FONTS: Schibsted Grotesk (OFL 1.1, no RFN), variable latin woff2 ~48.2 KB + a ~6.5 KB picker-digit face; 4 native statics incl. the picker face. Candidates may exist under ${NIGHT}/tools/oxblood/ — use only after re-verifying source, licence, sha256 and glyph coverage.
9. Listed for Micah, not yours to change: Oxblood's data plates are close to Navy's (distinct by ground ΔE00 16.5, accent 36.7, face); the research core colour was corrected to #8f99a5 for deutan (shoulders/core 11.98 < 12).`,
};
writeFileSync(T + 'navy.args.json', JSON.stringify(navy, null, 1));
writeFileSync(T + 'oxblood.args.json', JSON.stringify(oxblood, null, 1));
console.log('navy', JSON.stringify(navy).length, 'oxblood', JSON.stringify(oxblood).length);
