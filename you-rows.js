/* What the You tab draws, and what sits behind each of its rows — the October
 * 2026 redesign (Option A, Coach right under the greeting; rack-mobile's
 * NEXT-WEB-YOU-SETTINGS.md is the spec and src/ui/you/rows.js is the table this
 * was taken from).
 *
 * PURE: no DOM, no store, no imports. you.js and the three screens behind it
 * read this table; one verifier (tools-check/you-structure.mjs) holds it to the
 * promise the redesign was approved on — EVERY CARD YOU DREW BEFORE IS STILL
 * DRAWN, one tap away, and drawn exactly once. Nothing was deleted: the cards
 * moved, unchanged.
 *
 * THE BLOCKS keep the composition contract's names (vibes/defs/vocab.js
 * compose.you), so a vibe that re-orders You (Meet Day) still can, block for
 * block: `goal` is the headline card (it is the goal, told as one number, one
 * line and one chart), `week` the four number tiles (the week, as four
 * numbers), `review` the three rows. The other four names (doing, noticed,
 * trends, app) are simply not drawn on this screen any more; arrange() skips a
 * block that is not drawn, where it stands.
 */

/* Top to bottom, in v1. `hero` draws the greeting with the Coach card under
   it and the since line, as one block, unless a vibe composes the screen
   (then coach and since are their own blocks — compose.js composed()). */
export const YOU_BLOCKS = Object.freeze(['hero', 'coach', 'since', 'goal', 'week', 'review']);

/* The rows, in order, and what each opens. `holds` names the cards drawn on
   that screen, top to bottom — the old You cards, unchanged. On the web a
   row opens a sub-view of this same tab (you.js `sub`), not a route. */
export const YOU_ROWS = Object.freeze([
  { id: 'review',  label: 'Weekly review', icon: 'review', tone: 'train',
    holds: ['AssessCard:wins', 'AssessCard:improve', 'WeekCard', 'ReviewCard'] },
  { id: 'trends',  label: 'Trends',        icon: 'chart',  tone: 'plan',
    holds: ['TrajectoryCard', 'WeightCard', 'FuelCard', 'TrainingCard', 'StepsCard', 'WaterCard'] },
  { id: 'noticed', label: 'Rack noticed',  icon: 'spark',  tone: 'look',
    holds: ['InsightsCard'] }
]);

/* Trends is one screen with four switches, each holding today's cards. */
export const TRENDS = Object.freeze([
  { id: 'weight',   label: 'Weight',   cards: ['TrajectoryCard', 'WeightCard'] },
  { id: 'fuel',     label: 'Fuel',     cards: ['FuelCard'] },
  { id: 'training', label: 'Training', cards: ['TrainingCard'] },
  { id: 'habits',   label: 'Habits',   cards: ['StepsCard', 'WaterCard'] }
]);
export const trendsOf = id => (TRENDS.some(t => t.id === id) ? id : TRENDS[0].id);

/* The quiet line under each row: what is behind it, today. `found` is the
   screen's one assess() (or null while it is being worked out). */
export function rowSub(id, found) {
  if (id === 'trends') return 'Weight, fuel, training, steps and water';
  if (!found) return '…';
  if (id === 'review') {
    const r = found.review;
    if (!r) return '…';
    const good = (r.positives || []).map(i => String(i.label || '').toLowerCase()).filter(Boolean);
    const fix = (r.attention || []).length;
    const parts = [];
    if (good.length) parts.push('Going well: ' + good.slice(0, 2).join(', '));
    if (fix) parts.push(fix + ' to fix');
    return parts.length ? parts.join(' · ') : 'The last seven days, written up';
  }
  if (id === 'noticed') {
    const n = (found.insights || []).length;
    return n === 0 ? 'Nothing new this week' : n === 1 ? '1 new pattern' : n + ' new patterns';
  }
  return '';
}
