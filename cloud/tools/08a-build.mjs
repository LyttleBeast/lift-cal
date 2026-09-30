// 08a-build.mjs — measure each downloaded Track 8a original (bytes, sha256, sips dims) and write
// research/iron-age/PROVENANCE.photos.draft.json from 08a-spec.mjs. Nothing is transformed: original == file.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { specs } from './08a-spec.mjs';
const DIR = '/Users/micahflunker/dev/vibes-night/research/iron-age/originals';
const LOG = '/Users/micahflunker/dev/vibes-night/research/scratch-08a/downloads.jsonl';
const logs = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const out = [], missing = [];
for (const s of specs) {
  const p = `${DIR}/${s.file}`;
  if (!existsSync(p)) { missing.push(s.file); continue; }
  const buf = readFileSync(p);
  const sha = createHash('sha256').update(buf).digest('hex');
  const sp = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'bitsPerSample', '-g', 'samplesPerPixel', p], { encoding: 'utf8' });
  const g = k => (sp.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1];
  const w = Number(g('pixelWidth')), h = Number(g('pixelHeight'));
  const lg = logs.filter(l => l.name === s.file).at(-1) || {};
  if (lg.sha256 && lg.sha256 !== sha) throw new Error('sha mismatch ' + s.file);
  const { tier, confidence, focal, crop_hint, notes, download_url, ...rest } = s;
  // Suggested hero crops (fractions of the original), full width of crop_hint, centred on the focal point:
  // 358x120 pt (2.983:1) and 358x190 pt (1.884:1), plus the source pixels each yields (need >= 1074 px wide for @3x).
  const hero = {};
  for (const [k, r] of [['box_358x120', 358 / 120], ['box_358x190', 358 / 190]]) {
    const rx0 = crop_hint.x0 * w, rx1 = crop_hint.x1 * w, ry0 = crop_hint.y0 * h, ry1 = crop_hint.y1 * h;
    let cw = rx1 - rx0, ch = cw / r;
    if (ch > ry1 - ry0) { ch = ry1 - ry0; cw = ch * r; }
    let cx0 = Math.min(Math.max(focal.x * w - cw / 2, rx0), rx1 - cw);
    let cy0 = Math.min(Math.max(focal.y * h - ch / 2, ry0), ry1 - ch);
    const f = v => Math.round(v * 1000) / 1000;
    hero[k] = { x0: f(cx0 / w), y0: f(cy0 / h), x1: f((cx0 + cw) / w), y1: f((cy0 + ch) / h), source_px: `${Math.round(cw)}x${Math.round(ch)}`, at3x_ok: cw >= 1074 };
  }
  out.push({
    file: `research/iron-age/originals/${s.file}`,
    sha256: sha, bytes: buf.length, dims: `${w}x${h}`,
    title: rest.title, subject: rest.subject, creator: rest.creator, creator_died: rest.creator_died,
    created: rest.created, first_published: rest.first_published,
    source_institution: rest.source_institution, source_url: rest.source_url, source_id: rest.source_id,
    rights_statement_verbatim: rest.rights_statement_verbatim, pd_basis_us: rest.pd_basis_us, pd_basis_worldwide: rest.pd_basis_worldwide,
    retrieved: (lg.retrieved || '').slice(0, 10) || null,
    original_sha256: sha, original_dims: `${w}x${h}`,
    transforms: [],
    clothing_check: rest.clothing_check, credit_line: rest.credit_line, micah_approved: false,
    focal, crop_hint, hero_crops: hero, confidence, tier,
    download_url: lg.finalUrl && lg.finalUrl !== download_url ? { loc_master: download_url, served_from: lg.finalUrl, ...(lg.mirror_check ? { byte_identity: lg.mirror_check } : {}) } : download_url,
    pixel_format: `${g('bitsPerSample')}-bit x ${g('samplesPerPixel')} channel(s)`,
    notes,
  });
}
writeFileSync('/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.photos.draft.json', JSON.stringify(out, null, 2) + '\n');
console.log('wrote', out.length, 'entries; missing:', missing.join(', ') || 'none');
for (const e of out) console.log(`${e.tier} ${e.dims.padEnd(11)} ${String(e.bytes).padStart(10)} ${e.sha256} ${e.pixel_format} 3:1=${e.hero_crops.box_358x120.source_px}${e.hero_crops.box_358x120.at3x_ok ? '' : '(LOW)'} 1.9:1=${e.hero_crops.box_358x190.source_px} ${e.retrieved} ${e.file.split('/').pop()}`);
