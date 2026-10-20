/* What Settings holds, and where each thing lives — the October 2026 redesign
 * (the owner's "A structure + B icons"; rack-mobile's NEXT-WEB-YOU-SETTINGS.md
 * is the spec, and src/ui/settings/registry.js is the table this was taken
 * from).
 *
 * PURE: no DOM, no store, no imports at all. The hub (settings.js) draws from
 * this table and owns what each row DOES; this file only says which rows
 * exist, which group each sits in, the icon on its tile, the words search
 * reads, and who may see it. Kept apart so one verifier
 * (tools-check/settings-registry.mjs) can prove, without drawing anything,
 * that every setting the hub had before the regroup is still here exactly
 * once, that search finds what it should and hides empty groups, and that the
 * owner-only row stays behind its gate.
 *
 * A ROW MOVES, IT IS NEVER DROPPED. The regroup changed where things sit and
 * nothing about what they do: every `opens` names the same sheet the hub
 * opened before, through the same function. A setting with nowhere obvious to
 * go goes under Help rather than out.
 *
 * GATES. `owner` — Admin, revealed by isOwner() and nothing else (the rule
 * tools-check/accounts.mjs and the admin verifiers hold); absent, not greyed,
 * for everybody else. `refused` — "N saves were refused", only while there
 * are some: a permanent "0 saves were refused" row is how people learn to
 * ignore the one that matters. A gated row is absent from search too:
 * searching "admin" must not answer the question the gate exists to keep.
 *
 * WHERE THIS DIFFERS FROM NATIVE'S TABLE, on purpose, and nowhere else:
 *   + `import` (Import workout history) in Food and data tools, and
 *     `install` (Add to Home Screen) in Help — both web-only, native has no
 *     workout importer and is not a home-screen app;
 *   - no `stepAuto` row (the web's step automation guide was removed in v40,
 *     there is nothing for it to open) and no Dev group (WRITE_MODE and its
 *     two dev affordances are native's).
 */

/* The groups, in the order they are drawn. `title` null draws no heading —
   the profile card at the top and the two sign-outs at the foot stand on
   their own. `tone` colours each row's icon tile (tiles.js TONES). */
export const GROUPS = Object.freeze([
  { id: 'you',   title: null,                  tone: 'help'  },
  { id: 'plan',  title: 'Your plan',           tone: 'plan'  },
  { id: 'train', title: 'Training',            tone: 'train' },
  { id: 'coach', title: 'Coach',               tone: 'coach' },
  { id: 'look',  title: 'Look and feel',       tone: 'look'  },
  { id: 'tools', title: 'Food and data tools', tone: 'tools' },
  { id: 'help',  title: 'Help',                tone: 'help'  },
  { id: 'out',   title: null,                  tone: 'out'   }
]);

/* Every row. `label` is what the row says; `desc` is only for search — the
   words somebody might type looking for it, none of them on screen. `pill`
   names the value shown at the right (the hub reads each from its owning
   module's in-memory getter, never a fresh read). `opens` is the hub's
   ACTIONS key. A row whose label is worked out when drawn (`label: null`)
   says which with `labelFrom`. */
export const ROWS = Object.freeze([
  { id: 'profile',  group: 'you',   label: 'Your details',   icon: 'you',     opens: 'profile',
    desc: 'profile name photo sex height birth year age' },

  { id: 'goal',     group: 'plan',  label: 'Goal',           icon: 'target',  opens: 'goal',     pill: 'goal',
    desc: 'cutting maintaining bulking cut bulk maintain lose gain' },
  { id: 'targets',  group: 'plan',  label: 'Daily targets',  icon: 'flame',   opens: 'targets',  pill: 'targets',
    desc: 'calories kcal protein fat carbs macros goal weight maintenance' },
  { id: 'water',    group: 'plan',  label: 'Water goal and sizes', icon: 'drop', opens: 'water', pill: 'water',
    desc: 'water goal glass bottle sizes ml fl oz litres' },
  { id: 'steps',    group: 'plan',  label: 'Step goal',      icon: 'steps',   opens: 'steps',    pill: 'steps',
    desc: 'steps daily goal walking' },

  { id: 'rest',     group: 'train', label: 'Default rest',   icon: 'timer',   opens: 'rest',     pill: 'rest',
    desc: 'rest timer seconds between sets' },
  { id: 'library',  group: 'train', label: 'Exercise library', icon: 'workout', opens: 'library',
    desc: 'exercises custom exercise movement manager' },

  { id: 'coach',    group: 'coach', label: 'Coach',          icon: 'bubble',  opens: 'coach',    pill: 'coach',
    desc: 'switches what coach brings up your answers your goal ask coach something' },

  { id: 'vibes',    group: 'look',  label: 'Vibes',          icon: 'palette', opens: 'vibes',    pill: 'vibe',
    desc: 'look theme colours style iron age chalk navy oxblood ledger clear sky meet day' },
  { id: 'units',    group: 'look',  label: 'Units',          icon: 'ruler',   opens: 'units',    pill: 'units',
    desc: 'pounds kilos kg lb inches centimetres cm imperial metric' },
  { id: 'openOn',   group: 'look',  label: 'Open the app on', icon: 'phone',  opens: 'openOn',   pill: 'openOn',
    desc: 'start tab launch you train last one' },

  { id: 'ai',       group: 'tools', label: 'AI estimator',   icon: 'spark',   opens: 'ai',       pill: 'ai',
    desc: 'ai estimate worker address connected photo describe' },
  { id: 'recall',   group: 'tools', label: 'Food memory',    icon: 'history', opens: 'recall',
    desc: 'remembered foods answers recall' },
  { id: 'paste',    group: 'tools', label: 'Paste food JSON', icon: 'braces', opens: 'paste',
    desc: 'import json food text' },
  { id: 'import',   group: 'tools', label: 'Import workout history', icon: 'workout', opens: 'import',
    desc: 'import workouts history csv liftoff strong spreadsheet file' },

  { id: 'install',  group: 'help',  label: 'Add to Home Screen', icon: 'phone', opens: 'install',
    desc: 'install home screen app icon pwa safari chrome' },
  { id: 'tour',     group: 'help',  label: 'Replay the walkthrough', icon: 'play', opens: 'tour',
    desc: 'tour tutorial onboarding help' },
  { id: 'refused',  group: 'help',  label: null, labelFrom: 'refused', icon: 'alert', tone: 'warn', opens: 'refused',
    gate: 'refused', desc: 'refused saves sync retry discard database' },
  { id: 'admin',    group: 'help',  label: 'Admin',          icon: 'shield',  opens: 'admin',    pill: 'owner',
    gate: 'owner', desc: 'owner accounts invites usage approvals' },

  { id: 'signOut',  group: 'out',   label: 'Sign out',       icon: 'exit',    opens: 'signOut',  danger: true,
    desc: 'log out logout' },
  { id: 'erase',    group: 'out',   label: 'Sign out and erase this device’s copy', icon: 'trash', opens: 'erase',
    danger: true, desc: 'log out logout erase delete clear phone cache device' }
]);

/* Who may see a gated row. `ctx`: { owner, refused } — refused is the row's
   label ("2 saves were refused") or null. */
function allowed(row, ctx) {
  const c = ctx || {};
  if (row.gate === 'owner') return c.owner === true;
  if (row.gate === 'refused') return typeof c.refused === 'string' && c.refused.length > 0;
  return true;
}

/* The row's label as drawn: its own, or the one its gate supplies. */
export function labelOf(row, ctx) {
  if (row.label) return row.label;
  if (row.labelFrom === 'refused') return (ctx && ctx.refused) || '';
  return '';
}

/* Lower case, accents and punctuation folded away, so "erase this device’s"
   and "Erase this devices" find the same row. */
export function fold(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/* Does `row` answer query `q`? Every word typed must appear somewhere in the
   label, the search words, or `extra` (words the hub adds when drawn — the
   Coach row's switch names, which live in coach.js, not here). Word starts,
   not substrings anywhere: "rest" finds Default rest, not "interest". */
export function matches(row, q, ctx, extra) {
  const words = fold(q).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = ' ' + fold([labelOf(row, ctx), row.desc, extra].join(' ')) + ' ';
  return words.every(w => hay.includes(' ' + w));
}

/* What the hub draws: the groups in order, each with its visible rows that
   match `q`, a group with none left out entirely (its heading too). `extra`:
   { [rowId]: 'more words' }. */
export function sections(ctx, q, extra) {
  const x = extra || {};
  return GROUPS.map(g => ({
    group: g,
    rows: ROWS.filter(r => r.group === g.id && allowed(r, ctx) && matches(r, q, ctx, x[r.id]))
  })).filter(s => s.rows.length > 0);
}

/* ---------------- Settings → Coach ----------------
   The switches in four small groups, as the mockup draws them. coach.js's
   CATEGORIES is still the only place a category exists and the order inside
   it still ranks findings; this only says which heading each switch sits
   under here. A category this table does not know yet lands in Other, so a
   switch added to coach.js can never be unreachable. */
export const COACH_GROUPS = Object.freeze([
  { id: 'training', title: 'Your training',       tone: 'train',
    ids: ['progression', 'targets', 'volume', 'recency', 'rest'] },
  { id: 'gym',      title: 'In and after the gym', tone: 'coach',
    ids: ['live', 'feel', 'build', 'readiness'] },
  { id: 'body',     title: 'Body and food',       tone: 'plan',
    ids: ['fuel', 'weight', 'steps'] },
  { id: 'other',    title: 'Other',               tone: 'tools',
    ids: ['questions', 'patterns'] }
]);

/* Each switch's tile icon. */
export const COACH_ICONS = Object.freeze({
  progression: 'trophy', targets: 'trend', volume: 'balance', recency: 'calendar', rest: 'moon',
  live: 'workout', feel: 'pulse', build: 'listPlus', readiness: 'battery',
  fuel: 'food', weight: 'scale', steps: 'steps',
  questions: 'question', patterns: 'nodes'
});

/* `rows` is the web's coachSwitchRows() (coach-ui.js): [{ id, label, note,
   on }]. Returns the four groups with their rows, in the table's order inside
   each, unknown ids appended to Other; a group left empty is dropped. */
export function coachSections(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const known = new Set(COACH_GROUPS.flatMap(g => g.ids));
  return COACH_GROUPS.map(g => {
    const mine = g.ids.map(id => list.find(r => r && r.id === id)).filter(Boolean);
    const extra = g.id === 'other' ? list.filter(r => r && !known.has(r.id)) : [];
    return { group: g, rows: [...mine, ...extra] };
  }).filter(s => s.rows.length > 0);
}

/* "13 of 14 on" — the Coach row's value. */
export function coachCount(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const on = list.filter(r => r && r.on).length;
  return list.length ? on + ' of ' + list.length + ' on' : null;
}
