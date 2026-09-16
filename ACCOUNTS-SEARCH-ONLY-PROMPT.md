# ACCOUNTS-SEARCH-ONLY-PROMPT.md — rack-v39, WEB ONLY, admin People/Accounts tidy

Two small, focused changes to the owner admin panel that the v38 overhaul left
open. WEB ONLY (note native destinations for the later port). Do NOT push — the
pre-push hook refuses; commit and print the ship command. Keep all existing
verifiers green and the wrong-number / fail-safe / isolation rules from v38.

===============================================================================
CHANGE 1 — Accounts is search-only; it must not list everyone by default
===============================================================================
File: admin.js — accountsSection() / paintAccounts() (~line 586-680).
Today paintAccounts() renders the top SHOW_MAX (25) rows even when the search box
is empty and the type filter is 'all', so opening Admin dumps a list. Change it
so the Accounts list renders rows ONLY when the owner is actually looking for
someone:
- If the search query is EMPTY and the filter is 'all': render NO rows. Instead
  show a short prompt via acctNote (e.g. "Search a name or email, or tap a type
  to list those accounts."). The search box and the type chips stay visible.
- If the query is non-empty OR the filter is a specific type (not 'all'): render
  the matches exactly as today — filtered, sorted, capped at SHOW_MAX, with the
  existing "N more match — search to narrow it down." note when truncated (never
  a silent cap).
Rationale to preserve: this keeps the panel from rendering a huge list as the
account count grows. Keep the search-repaints-body-only behavior (acctBox /
acctQuery / acctFilter) intact — do not make it re-render the whole page and lose
the keyboard. quotaCard() stays where it is.
NATIVE dest: src/ui/admin/admin.js — same empty-state gate on the accounts list.

NOTE (do NOT build now): load() still reads the entire access/approved tree +
usage on open, so at true millions this download — not the rendering — is the
bottleneck. That is the RTDB->Firestore / server-side-search work on the roadmap,
out of scope here. This change is the correct rendering fix for current scale.

===============================================================================
CHANGE 2 — remove the "Has access" list from People & Access
===============================================================================
File: admin.js — peopleSection() (~line 949-1045).
Remove the entire "Has access" block: the `el('div','eyebrow people-gap','Has
access')` heading and the `Object.entries(approved)` list that renders each
approved person with the "AI…" and "Remove" buttons (~line 992 to just before the
"Invite codes" block at ~1031). Everyone with access is now reachable through the
searchable Accounts section above, and the per-account AI-allowance and Remove
actions already live in that account's detail (openAccount), so this list is pure
duplication.
KEEP, unchanged:
- the "Requests" block (pending access requests with Approve / Decline) at the
  top of peopleSection (~955), and
- the "Invite codes" block + "New invite code" button (~1031+).
Do not remove or alter any access.js primitive (approve/decline/revoke/invite);
only stop rendering the has-access list here. Confirm revoke/AI-block are still
reachable from the Accounts detail (they are) so no capability is lost.
NATIVE dest: src/ui/admin/admin.js (+ sheets.jsx) — same removal, keep requests +
invites.

===============================================================================
Version + verifiers + done
===============================================================================
- Bump BOTH sw.js const CACHE 'rack-v38' -> 'rack-v39' and usage.js VERSION ->
  rack-v39 (they move together).
- Run every existing verifier (tools-check/*.mjs incl. accounts.mjs) — all green,
  report numbers. node --check every touched file. These are UI-only changes; no
  data model, rules, pure-module, or Worker change — leave accounts.js, the rules
  files, and worker/ untouched.
- One commit, NOT pushed. Print `git push --no-verify origin main` and stop.

Done-when: opening Admin shows the Accounts search box + chips with NO list until
you search or pick a type; People & Access shows Requests + Invite codes but no
"Has access" list; every per-account action still reachable via Accounts;
sw.js + usage.js at rack-v39; verifiers green; committed, not pushed.
