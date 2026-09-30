// resume11-deep-args.mjs — args for the Ledger and Clear sky V runs (vr.body.js, kind deep), on main with engine v3.
//   node resume11-deep-args.mjs <mainWeb> <mainNat>   → tmp/resume9/{ledger,clear-sky}.args.json
import { readFileSync, writeFileSync } from 'node:fs';
const [mainWeb, mainNat] = process.argv.slice(2);
if (!mainWeb || !mainNat) { console.error('usage: resume11-deep-args.mjs <mainWeb> <mainNat>'); process.exit(2); }
const NIGHT = '/Users/micahflunker/dev/vibes-night', T = `${NIGHT}/tmp/resume9/`, D2 = `${NIGHT}/wt/web-design2`;
const specs = JSON.parse(readFileSync(T + 'd4-specs.json', 'utf8'));
const V3 = `
===== ENGINE v3 IS ON MAIN (web ${mainWeb}, native ${mainNat}) — use its roles instead of the residuals the spec lists =====
The design (${D2}/vibes/defs/<id>.js, committed on vibes/design2 22a4151) was written on contract v2. Bring the definition up to v3 in the web tree (then copy byte for byte to native and pin): colors.knob (a toggle's off knob — a HEX, falls back to steel), colors.greetName (the greeting name's ink — a HEX role, not a colour name), type.tag (the literal-caps/sub-11pt sites; v1 sets none), type.hero + headline 'solo'/'bare', type.pill (web: no token — write .delta-pill .delta-v/.delta-a in your own CSS), shape.stripe ('side'|'top'|'keyline' for the tour tip and the Coach ask bubble), shape.cue.ink (default chalk; set 'accent' if your today keyline / dock rail / tab underline are accent), shape.chosen.tick (native draws it; on the web draw the tick in your own CSS off --shape-chosen-tick), shape.rank.column, rule.hair may be 0. Read vibes/defs/vocab.js (v3) for each look's exact wording and sites; ${NIGHT}/tmp/resume9/d4-specs.json has your spec's engine_asks and open items — every ask v3 answered is no longer a residual; say which remain. The web has no tint.* custom properties: write the vibe's tints as hand rules in its CSS (Chalk/Navy/Oxblood did). Chalk, Navy, Oxblood are on main: reuse their generic native verifiers (verify-vibe-parity/-fit/-switch/-seams) and ${NIGHT}/tools/vibe-contrast/ scripts; register the vibe in each. Iron Age (the other ruled vibe) is still on its own branch — card·ruled's wording is Iron Age's, adopted by the contract; do not copy Iron Age's files. Web fonts: @font-face family names start with the vibe id. The native "≤4 static TTFs per vibe" counts the vibe's OWN new files (v1's boot faces are already in the app; a face another vibe already ships, e.g. ArchivoCondensed_700, is shared, not re-added).`;
const mk = (id, extra) => {
  const s = specs[id];
  return {
    id, name: s.registry_entry.name, kind: 'deep', mainWeb, mainNat,
    spec: `${NIGHT}/design/${id}.md`, def: `${D2}/vibes/defs/${id}.js`, icons: `${D2}/vibes/icons/${id}.js`,
    registry: { id, name: s.registry_entry.name, feel: s.registry_entry.feel, experimental: false, scheme: s.registry_entry.scheme },
    fonts_or_images: true, runSuffix: '-d1', buildRelay: 3,
    notes: V3 + '\n' + extra,
  };
};
const ledger = mk('ledger', `===== LEDGER =====
Fonts per the spec: Manuale (OFL, no RFN) for text and figures + Archivo condensed (wdth 75 / 700) for heads; the Coach card stays Archivo on v1 metrics. The design stage prepared and measured the files: ${NIGHT}/design/ledger/final/fonts/out/ (web ledger-manuale.woff2 38,936 B, ledger-num.woff2 3,192 B, ledger-heads.woff2 25,404 B; native Manuale_400/600/700) and ${NIGHT}/tools/ledgerB/ArchivoCondensed_700.latin.ttf — the fonts agent may use them only after re-verifying source, licence, sha256 and glyph coverage (record FONTS.json). Manuale's hhea lineGap is 221/1000: every native preset sets an explicit lineHeight ≥ minLh 1.216 — check glyphs sit centred. The spec's decisions for Micah stand as specced (Manuale; Archivo Coach card; pink accent Q-P4; the kettlebell and scale dock icons).`);
const sky = mk('clear-sky', `===== CLEAR SKY =====
Its concept is the hero numeral (headline · solo), which engine v3 now provides: set headline 'solo' (the definition names 'v1' until R1 landed — change it) and type.hero; the hero figures are web [data-hero] (Fuel's summary .load-num, Steps' today .load-num, the Goal's .headline-v) and native LoadNum hero / HeadlineV hero. greetName is a HEX role: write Clear sky's chalk hex. rule.hair 0 + calCell 'ruled' are now allowed (spec R5). The stripe param answers R4. The 5th native face (Archivo Light 300 for the hero numeral): allowed — the ≤4 limit counts the vibe's own new files. Light vibe: web keeps the top safe-area band dark (colors.band); native StatusBar dark, keyboards/date pickers light. Decisions for Micah stand (Q-P1 a sky-blue page; the four unit strings keep v1's caps).`);
writeFileSync(T + 'ledger.args.json', JSON.stringify(ledger, null, 1));
writeFileSync(T + 'clear-sky.args.json', JSON.stringify(sky, null, 1));
console.log('ledger', JSON.stringify(ledger.registry), '| clear-sky', JSON.stringify(sky.registry));
