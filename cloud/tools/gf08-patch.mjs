// gf08-patch.mjs — Track 8a gap fill (critic round). Applies the critic-round changes on top of
// research/iron-age/PROVENANCE.photos.draft.json, which 08a-build.mjs generates from 08a-spec.mjs.
// If 08a-build.mjs is ever re-run, run this script after it. Idempotent: re-running gives the same file.
//  1. UPD: tier / confidence / first_published / likeness changes to existing entries (by file name).
//  2. ADD: new entries, with file facts measured from the originals (sha256, bytes, sips dims) and the
//     same hero-crop arithmetic as 08a-build.mjs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const JSONF = '/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.photos.draft.json';
const DIR = '/Users/micahflunker/dev/vibes-night/research/iron-age/originals';
const LOG = '/Users/micahflunker/dev/vibes-night/research/scratch-gf08/downloads.jsonl';
const MARK = '[gap fill, critic round]';
const { UPD, ADD } = await import('./gf08-patch-data.mjs');
const logs = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
let arr = JSON.parse(readFileSync(JSONF, 'utf8'));

// 1. updates
for (const [file, u] of Object.entries(UPD)) {
  const e = arr.find(x => x.file.endsWith('/' + file));
  if (!e) throw new Error('no entry ' + file);
  for (const [k, v] of Object.entries(u)) {
    if (k === 'notes_add') {
      const base = String(e.notes || '').split(' ' + MARK)[0];
      e.notes = `${base} ${MARK} ${v}`;
    } else e[k] = v;
  }
}

// 2. additions
function measure(name) {
  const p = `${DIR}/${name}`;
  const buf = readFileSync(p);
  const sha = createHash('sha256').update(buf).digest('hex');
  const sp = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'bitsPerSample', '-g', 'samplesPerPixel', p], { encoding: 'utf8' });
  const g = k => (sp.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1];
  return { buf, sha, w: Number(g('pixelWidth')), h: Number(g('pixelHeight')), fmt: `${g('bitsPerSample')}-bit x ${g('samplesPerPixel')} channel(s)` };
}
function heroCrops(w, h, focal, crop_hint) {
  const hero = {};
  for (const [k, r] of [['box_358x120', 358 / 120], ['box_358x190', 358 / 190]]) {
    const rx0 = crop_hint.x0 * w, rx1 = crop_hint.x1 * w, ry0 = crop_hint.y0 * h, ry1 = crop_hint.y1 * h;
    let cw = rx1 - rx0, ch = cw / r;
    if (ch > ry1 - ry0) { ch = ry1 - ry0; cw = ch * r; }
    const cx0 = Math.min(Math.max(focal.x * w - cw / 2, rx0), rx1 - cw);
    const cy0 = Math.min(Math.max(focal.y * h - ch / 2, ry0), ry1 - ch);
    const f = v => Math.round(v * 1000) / 1000;
    hero[k] = { x0: f(cx0 / w), y0: f(cy0 / h), x1: f((cx0 + cw) / w), y1: f((cy0 + ch) / h), source_px: `${Math.round(cw)}x${Math.round(ch)}`, at3x_ok: cw >= 1074 };
  }
  return hero;
}
for (const s of ADD) {
  const m = measure(s.file);
  const lg = logs.filter(l => l.name === s.file).at(-1) || {};
  if (lg.sha256 && lg.sha256 !== m.sha) throw new Error('sha mismatch ' + s.file);
  const entry = {
    file: `research/iron-age/originals/${s.file}`,
    sha256: m.sha, bytes: m.buf.length, dims: `${m.w}x${m.h}`,
    title: s.title, subject: s.subject, creator: s.creator, creator_died: s.creator_died,
    created: s.created, first_published: s.first_published,
    source_institution: s.source_institution, source_url: s.source_url, source_id: s.source_id,
    rights_statement_verbatim: s.rights_statement_verbatim, pd_basis_us: s.pd_basis_us, pd_basis_worldwide: s.pd_basis_worldwide,
    retrieved: (lg.retrieved || '').slice(0, 10) || null,
    original_sha256: m.sha, original_dims: `${m.w}x${m.h}`,
    transforms: [],
    clothing_check: s.clothing_check, credit_line: s.credit_line, micah_approved: false,
    focal: s.focal, crop_hint: s.crop_hint, hero_crops: heroCrops(m.w, m.h, s.focal, s.crop_hint),
    confidence: s.confidence, tier: s.tier,
    download_url: lg.finalUrl && lg.finalUrl !== s.download_url ? { source_file: s.download_url, served_from: lg.finalUrl } : s.download_url,
    pixel_format: m.fmt,
    likeness: s.likeness,
    notes: `${MARK} ${s.notes}`,
  };
  const i = arr.findIndex(x => x.file === entry.file);
  if (i >= 0) arr[i] = entry; else arr.push(entry);
}
const out = JSON.stringify(arr, null, 2) + '\n';
JSON.parse(out); // must stay valid JSON
writeFileSync(JSONF, out);
const A = arr.filter(e => e.tier === 'A').length, B = arr.filter(e => e.tier === 'B').length;
console.log(`wrote ${arr.length} entries: tier A ${A}, tier B ${B}`);
for (const e of arr) console.log(`${e.tier} ${e.confidence.padEnd(6)} ${e.dims.padEnd(10)} 3:1=${e.hero_crops.box_358x120.source_px}${e.hero_crops.box_358x120.at3x_ok ? '' : '(LOW)'} ${e.file.split('/').pop()}${e.likeness ? '  | likeness: ' + String(e.likeness).slice(0, 60) : ''}`);
