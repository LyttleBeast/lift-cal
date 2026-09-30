export const meta = {
  name: 'v59-judge-calibration',
  description: 'Calibration (information only): the exact "did an AI make this?" 3-judge brief the deep vibes face, run on v1 — today\'s shipped look',
  phases: [{ title: 'Judge' }],
}

// @@PREAMBLE@@

const NIGHT = '/Users/micahflunker/dev/vibes-night'
const REF = `${NIGHT}/wt/web-mainref`
const HARNESS = `${NIGHT}/wt/web-harness/report/btn-44/prove.mjs`
const shot = `${NIGHT}/proof/cal-v1/judge-r1`
const JUDGE_SCHEMA_V = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['human-designed', 'AI-made'] }, confidence: { type: 'number' },
  tells: { type: 'array', items: { type: 'string' } }, fixes: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
}, required: ['verdict', 'confidence', 'tells', 'fixes', 'notes'] }
// The judge brief below is vr.body.js's judge() text, verbatim except the repo/vibe (v1 = no --vibe) and the shot dir.
const verdicts = (await parallel(Array.from({ length: 3 }, (_, k) => () => agent(`${PREAMBLE}
===== YOUR JOB: "did an AI make this?" judge ${k + 1} of 3, round 1 (V59 §13.6) =====
Be adversarial: answer "AI-made" if unsure. ${k === 0 ? `First take the screenshots: \`node ${HARNESS} shoot --repo ${REF} --out ${shot}\` (it holds ${NIGHT}/harness.lock; if another agent holds it, wait) — You, Train calendar, live session with a drop set, summary, Fuel day, the add-food sheet, the Coach sheet, Weight, Steps, the Settings hub, the Vibes sheet, sign-in, at 390.` : `The screenshots are (or will shortly be) in ${shot} — wait for them (poll with Read on the directory listing via a node one-liner), do not take your own.`} Read every PNG. Look for the tells in ${NIGHT}/research/01-ai-tells.md (the one-accent-on-graphite look, uniform rounded 1px-bordered cards, tiny tracked-caps eyebrows, rows of three stat tiles, icon-in-a-circle, pills everywhere, gradients/glass, generic icons, sparkles, hero-number + small caption, the same spacing everywhere, the cream-and-clay/hairline "escape" looks). Verdict: "human-designed" or "AI-made", with the tells you saw and the concrete fixes that would remove them. You have not seen the design docs; judge only what you see.`,
  { label: `CAL:v1:judge${k + 1}`, phase: 'Judge', schema: JUDGE_SCHEMA_V, effort: 'high' })))).filter(Boolean)
return { v1: verdicts.map(v => ({ verdict: v.verdict, confidence: v.confidence, tells: v.tells })) }
