# ADMIN-OVERHAUL-PROMPT.md — rack-v38, WEB ONLY, owner/admin + account-type overhaul

You are doing a large, self-contained overhaul of Rack's owner admin panel and
introducing an account-type ("tier") system with fail-safe scaffolding for a
future paid model. WEB ONLY this round (the native port is a separate later
round; you still name the native destination for every change). Work in phases,
verify each, commit, and STOP — Micah reviews and pushes in the morning. You must
NOT push or deploy: the pre-push hook refuses, and rules are published by Micah.

===============================================================================
HARD RULES (do not violate)
===============================================================================
- Do NOT push/deploy/publish. One or a few commits, then print the ship commands
  and stop. The canary `echo GUARDTEST ping` must be refused; if it runs, stop.
- FAIL-SAFE ABOVE ALL. This touches who can use the app and the money gate. Every
  new gate must default OPEN for safety: an absent/unknown account type, a read
  error, or missing data must behave EXACTLY like the app does today. Nobody —
  above all the owner — may be locked out by a missing field or a failed read.
- Do NOT weaken existing account isolation or the access rules. users/{uid} stays
  self-only. The owner stays OWNER_UID (firebase-config.js) — see Phase 4.
- A wrong number is worse than no number (the estimator/allowance still applies).
- Logic written once as a PURE function the native port copies verbatim; every
  change names its WEB file and its NATIVE destination.
- Reversible + isolated: prefer additive changes; do not delete removed graphs
  (move them); keep each phase independently revertible.

===============================================================================
DECISIONS ALREADY MADE (Micah: review these on waking; each is isolated + easy to change)
===============================================================================
1. Account type is stored on the existing owner-only node access/approved/{uid}
   as `type`. ABSENT type == 'basic' == today's exact behavior, so no existing
   account changes. New per-account fields (all owner-writable only):
     type: 'basic'|'pro'|'trial'|'custom'|'locked'   (NOT 'owner' — see #6)
     trialEndsAt: <ms epoch>        (only meaningful for type 'trial')
     customCaps: { photoPerDay, textPerDay, monthlyUsd, features?{} }  (type 'custom')
     subStatus: 'none'|'active'|'past_due'|'canceled'   (PLACEHOLDER, display only)
2. Account type DERIVES the AI limits and writes them into the EXISTING
   aiAllow/{uid} node, so the current Worker enforces tier limits with NO Worker
   change this round. (This is what keeps the round web-only.)
3. The per-tier limit NUMBERS are PLACEHOLDERS defined at the top of the new pure
   module (Phase 0). Micah tunes them; do not scatter them elsewhere.
4. 'locked' (and an expired 'trial') == AI blocked + a client "access paused"
   screen for that account (never the owner; absent type never locks). An
   optional real rules-level write-deny is included in Phase 6 for Micah to
   publish; the client gate is the tonight behavior.
5. Trial expiry is evaluated CLIENT-SIDE this round (for UX + effective lock);
   trustworthy money-gate enforcement is a later Worker/rules round. trialEndsAt
   is owner-set and owner-extendable/shortenable from the dashboard.
6. OWNER/ADMIN is NOT settable in-app. The owner is defined solely by OWNER_UID
   + the security rules. The type control never offers 'owner', and there is no
   in-app path that can promote anyone — see Phase 4. This is the intended
   "make it near-impossible": the app fundamentally cannot do it.
7. Payments: SEAMS + TODO placeholders only. No payment code, no SDKs, no network.
8. The graphs Micah asked to "get rid of" are MOVED into a bottom "More Info"
   collapsible, NOT deleted. Main view keeps: the estimator + "Where people go" +
   "How food gets in". More Info holds: "Training, weight and the rest", "The
   shell", "Every counter", and "Usage over time".

===============================================================================
CURRENT STATE — read these first, do not rediscover wrong (all in this repo)
===============================================================================
- admin.js — the owner panel. page() (line ~332) renders in order: glance()
  "At a glance"; usageSection() "Feature usage, all accounts" (segmented range
  7d/30d/90d/All, then the "The estimator" donut, then the FAMILIES bar charts,
  then the "Every counter" table); overTime() "Usage over time"; perAccount()
  "Per account" (flat list -> openAccount sheet); allowanceSection() "AI
  allowance" (list -> openAllowance sheet, + quotaCard); peopleSection()
  "People & access" (requests, has-access, invite codes). FAMILIES (line ~62) are
  exactly: "Where people go", "How food gets in", "Training, weight and the rest",
  "The shell". Gate: openAdmin checks isOwner() (client) but the real gate is the
  rules; keep both.
- access.js — the access model. access/approved/{uid} = {at,via,name,email,[code]}
  gates all users/{uid}. Owner (OWNER_UID) is approved by the rules themselves
  (anti-lockout). Doors: claimInvite (atomic), submitRequest->approve. revoke()
  removes the approval (keeps the person's data) and refuses OWNER_UID. aiAllow/
  {uid} = {on (self-writable), blocked (owner-only), photoPerDay, textPerDay,
  monthlyUsd (owner-only, ceilinged 12/30 in rules)}. setAiBlocked writes blocked.
- store.js — uid(), isOwner() (UID===OWNER_UID), readShared/writeShared/
  removeShared/updateShared(multi-path atomic)/watchShared.
- firebase-config.js — OWNER_UID.
- database.rules.json — the live rules (owner-only writes on access/approved and
  aiAllow limits; the 12/30 ceilings). This is where Phase 6 adds type guards.
- usage.js — EVENTS + the counters; sw.js — const CACHE; usage.js — VERSION.
- The Worker (NOT in this repo, NOT changed this round) reads aiAllow/{uid} and
  enforces photo/text per-day + a monthly cap. Deriving limits into aiAllow
  (Decision #2) is how tiers reach it with no Worker deploy.

===============================================================================
PHASE 0 — the pure account/tier module (the single source of truth)
===============================================================================
Create a new PURE module (suggested: accounts.js) — no DOM, no Firebase, pure
functions only, native-portable verbatim to src/pure/accounts.js.
Contents:
- TIERS: a table keyed by type with, per tier, PLACEHOLDER values Micah will tune:
    { label, aiPhotoPerDay, aiTextPerDay, monthlyUsd, aiAccess, appAccess, features:{} }
  Suggested placeholders (mark clearly as tunable):
    basic:  3 / 3  / default cap, aiAccess true,  appAccess true
    pro:    10 / 20 / higher cap,  aiAccess true,  appAccess true, features:{advanced:true}
    trial:  same as pro (acts like Pro),          appAccess true
    custom: from customCaps (default unlimited),  appAccess true
    locked: 0 / 0, aiAccess false, appAccess false
  basic's numbers MUST equal today's Worker defaults so an absent type is a no-op.
- effectiveType(uid, approvedRecord, nowMs): OWNER_UID -> 'owner'; a 'trial'
  whose trialEndsAt <= now -> 'locked'; a missing/unknown type -> 'basic';
  else record.type. Owner is 'owner' regardless of any stored field.
- capabilitiesFor(uid, approvedRecord, nowMs): returns the merged
  { aiPhotoPerDay, aiTextPerDay, monthlyUsd, aiAccess, appAccess, features }.
  owner -> everything unlimited/true. custom -> customCaps merged over pro
  defaults (unset custom field -> unlimited). Deterministic, cannot throw:
  wrap any lookup so garbage input returns the basic/safe capability set, never
  a locked one. THIS FUNCTION IS THE SINGLE ENTITLEMENT CHOKE POINT (see Phase 5).
- derivedAllowance(uid, approvedRecord, nowMs): returns the {photoPerDay,
  textPerDay, monthlyUsd, blocked} to write into aiAllow/{uid} so the existing
  Worker enforces the tier. locked/expired -> blocked:true, 0/0. owner ->
  untouched/high. This is the bridge to the unchanged Worker.
- helpers: isEffectivelyLocked, isTrial, trialDaysLeft(record, now).
NATIVE dest: src/pure/accounts.js (verbatim).

===============================================================================
PHASE 1 — reorganize the admin page + the bottom "More Info"
===============================================================================
Rewrite page() ordering to: pageHead 'Owner only'/'Admin' (keep) -> glance()
(keep) -> a slimmed usageSection() (keep the segmented 7d/30d/90d/All range, the
"The estimator" donut, and ONLY the "Where people go" and "How food gets in"
family charts) -> the NEW Accounts section (Phase 2) -> peopleSection() (keep
EXACTLY as-is: requests, has-access, invite create/remove) -> a NEW collapsible
"More Info" at the very bottom.
"More Info" is a single owner-clicked expander (a details/summary or a toggle
button that renders on demand) containing, moved NOT deleted: the "Training,
weight and the rest" chart, the "The shell" chart, the "Every counter" table,
and the entire overTime() "Usage over time" section. Keep their code intact; just
relocate their render calls behind the expander. If any of Micah's remove-labels
is ambiguous, MOVE it to More Info rather than deleting — nothing is lost.
NATIVE dest: src/ui/admin/admin.js (same section order + a native collapsible).

===============================================================================
PHASE 2 — the Accounts page (searchable, per-account, type filter)
===============================================================================
Replace the flat perAccount() list AND the allowanceSection() list with ONE
"Accounts" section built to scale to many accounts:
- A search input (matches name / email / uid, case-insensitive) plus a type
  FILTER control (All / Owner / Pro / Basic / Trial / Custom / Locked). Do NOT
  render every account at once — render only the matches (cap the shown list,
  e.g. top 25, and show a "N more — refine your search" note when truncated;
  log/print no silent cap).
- Each result row shows: name/email, the account TYPE as a labeled pill, last
  seen, and its derived AI limits at a glance. Tapping a row opens the per-account
  detail.
- Per-account detail (merge today's openAccount + openAllowance + new controls
  into one page/sheet): the account's info + counters + meta (from openAccount);
  the TYPE control (Phase 3); the allowance view (now driven by type, with the
  manual override path preserved for 'custom'); the AI on/off block toggle
  (setAiBlocked); and account actions incl. Remove (revoke) and any other
  per-account action. This becomes the single account page.
The quotaCard ("Your Worker quota") stays available (it is the owner's own
spend) — keep it in the Accounts area or in More Info, your call; it is not
per-account data.
NATIVE dest: src/ui/admin/admin.js + sheets.jsx (searchable list + detail).

===============================================================================
PHASE 3 — account types: setting them + enforcement
===============================================================================
In the per-account detail, a TYPE control lets the owner set the account's type
to basic / pro / trial / custom / locked (NEVER owner — Phase 4). On change,
write ATOMICALLY (updateShared) BOTH:
  - access/approved/{uid}: type (+ trialEndsAt when trial, + customCaps when
    custom, + subStatus placeholder), and
  - aiAllow/{uid}: the derivedAllowance() limits + blocked, so the existing
    Worker enforces the tier with no Worker change.
UI per type: 'trial' reveals a trialEndsAt with quick extend/shorten controls
(e.g. +7d / -7d / set date) and a "N days left" readout; 'custom' reveals the
manual photo/text/monthlyUsd (and any feature toggles) that today's openAllowance
already edits — keep that editor, it becomes the 'custom' path; 'locked' shows a
clear locked state with an Unlock (set back to prior/basic) action.
ENFORCEMENT (client, fail-safe): capabilitiesFor() gates the app for the signed-in
account — a non-owner whose effective type is 'locked' (incl. expired trial) sees
an "access paused" screen (reuse the access-gate style from access.js) instead of
the app, with a message to contact the owner / (future) pay. aiAccess:false hides
/ disables the estimator. A trial account sees a small "N days left in trial"
banner. NEVER gate the owner. Any read error or absent type -> treat as full
normal access (fail OPEN). Do not touch anyone's stored data on lock.
NATIVE dest: the type control + detail in src/ui/admin/; the app-lock gate in the
native shell (app/_layout.jsx / the gate), the trial banner in the app chrome.

===============================================================================
PHASE 4 — owner/admin: make promotion impossible-by-accident
===============================================================================
The owner is OWNER_UID (firebase-config.js) + the rules, full stop. Therefore:
- The type control MUST NOT list 'owner'. There is NO in-app control that writes
  type:'owner' or otherwise grants owner/admin. capabilitiesFor treats ONLY
  OWNER_UID as owner. revoke() already refuses OWNER_UID; the type control must
  likewise refuse to change the owner's own account.
- Document (in code + a short note in a NOTES/AGENTS doc) that creating a new
  owner requires editing OWNER_UID and re-publishing the rules — a deliberate
  code/console change that cannot happen by accident or from the UI.
- SCAFFOLD ONLY (clearly-marked, DISABLED, wired to nothing that can change owner)
  the future multi-phase elevation flow so the shape exists for later: (1) Firebase
  reauthenticateWithCredential (password re-entry), (2) an email-approval step via
  a FUTURE Worker endpoint (TODO — no email system exists yet), (3) a typed
  confirmation + a delayed second confirmation. Leave it inert and commented as
  the future path; the hard guarantee tonight is that the app cannot promote
  anyone. Do not build the email system.
NATIVE dest: same guarantees mirrored in src/ (no native promote path either).

===============================================================================
PHASE 5 — paid-infrastructure scaffolding (seams only, no payments)
===============================================================================
- Keep subStatus on the record as a placeholder (display only).
- capabilitiesFor() is THE single entitlement choke point — every feature/limit
  check in the app must route through it (or a thin wrapper), so that later,
  payment/subscription status feeds capabilities in ONE place. Refactor obvious
  existing tier-relevant checks to go through it where cheap; do not over-reach.
- Add clearly-marked TODO placeholders (no code that runs) where Apple IAP +
  RevenueCat + a server-side entitlement gate + a webhook will later plug in,
  referencing SCALING-BRIEF.md's stated path (ALLOWED_UIDS -> "account + active
  paid subscription"). No SDKs, no network, no payment logic this round.

===============================================================================
PHASE 6 — rules, verifiers, version, ship
===============================================================================
- database.rules.json (and, if you find it referenced, the PROPOSED variant): add
  owner-ONLY write + validation for the new access/approved/{uid} fields:
  type (enum basic|pro|trial|custom|locked), trialEndsAt (number in range),
  customCaps (bounded object), subStatus (enum). A non-owner must never be able
  to set or change their own type/trial/custom/sub. Do NOT weaken any existing
  rule. OPTIONAL real lock (include, clearly labeled, for Micah to publish): deny
  users/{uid} writes when access/approved/{uid}/type === 'locked' — but FAIL SAFE:
  absent type allowed, owner always allowed. Rules are Micah's to publish; you
  only write the file. State exactly what changed.
- Verifiers: add tools-check/accounts.mjs driving the REAL pure module and
  proving: absent type == basic == today's caps (no-op); owner is never locked
  and gets full caps; a trial flips to locked exactly at trialEndsAt; custom
  overrides apply; derivedAllowance maps each type to the right aiAllow shape;
  garbage/malformed record fails OPEN to basic, never to locked. Keep ALL existing
  verifiers green (run them; report numbers). node --check every touched file.
- Version: bump BOTH sw.js const CACHE 'rack-v37' -> 'rack-v38' and usage.js
  VERSION -> rack-v38 (they move together).
- Done: one or a few commits, NOT pushed. Print for Micah:
    git push --no-verify origin main
  and a one-line reminder that the rules changes must be pasted into the Firebase
  console to take effect, and that tier limit numbers + the optional lock rule are
  his to review. Then STOP.

===============================================================================
DONE-WHEN
===============================================================================
- accounts.js pure module exists and is the single source of tier truth + the
  entitlement choke point; native dest noted.
- Admin page reorganized; removed graphs live in a bottom "More Info" (moved, not
  deleted); People & access unchanged.
- Accounts is a searchable, type-filterable page with a single per-account detail
  that sets type, edits trial/custom, blocks AI, and removes the account.
- Types derive aiAllow so the current Worker enforces them; locked/expired-trial
  gate the app client-side, fail-safe, never the owner, absent type == today.
- Owner promotion is impossible from the UI; the multi-phase flow is inert scaffold.
- Paid seams + TODOs in place; no payment code.
- Rules updated (owner-only type writes) + optional lock, file only; verifiers
  green with a new accounts.mjs; sw.js + usage.js at rack-v38.
- Committed, not pushed; ship + rules-publish reminder printed.

===============================================================================
NATIVE (later round — do NOT build now, just keep parity possible)
===============================================================================
accounts.js -> src/pure/accounts.js (verbatim). Admin reorg + Accounts page ->
src/ui/admin/admin.js + sheets.jsx. App-lock gate + trial banner -> the native
shell (app/_layout.jsx / gate + chrome). Same data model + same rules (shared
backend), so a native port reads the same fields with no schema change.
