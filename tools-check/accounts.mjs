#!/usr/bin/env node
//
// Verifier for accounts.js — the account-type table and the entitlement choke
// point.
//
//   node tools-check/accounts.mjs
//
// This file is the answer to one question: can a missing field, a bad number or
// a garbage record take the app away from somebody? Every other check here is
// in service of that one. accounts.js decides who may open Rack and how much of
// Micah's Anthropic credit they may spend, and it decides it from a record that
// may be absent, half-written, or read back through a refused permission as
// null. The failure it must never have is the quiet one: an account that cannot
// get in because a key was not there.
//
// It loads the REAL module — no copy of the table lives in this file, which is
// the only way a verifier stays true when the numbers change. OWNER_UID comes
// from the real firebase-config.js for the same reason: the owner checks below
// are worthless against a fixture uid.
//
// The numbers in TIERS are placeholders Micah tunes. So the assertions here are
// written against PROPERTIES, not against literals, everywhere the literal is
// his to change — with two deliberate exceptions, both marked, where the
// literal IS the contract: basic must equal the Worker's own defaults, and no
// derived number may exceed the ceilings in database.rules.json.

import { readFileSync } from 'node:fs';
import { OWNER_UID } from '../firebase-config.js';
import {
  TIERS, SETTABLE_TYPES, SUB_STATUSES, FEATURES, RULE_MAX, TRIAL_DAYS,
  effectiveType, capabilitiesFor, derivedAllowance,
  isEffectivelyLocked, isTrial, trialDaysLeft, trialEndFromNow,
  typePatch, normalizeCustomCaps, typeLabel, isOwnerUid
} from '../accounts.js';

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

const NOW  = 1757894400000;           // a fixed clock: 2025-09-15T00:00:00Z
const DAY  = 864e5;
const SOMEBODY = 'uid_somebody_else_entirely_0001';

// What a record looks like today, before any of this existed. Every existing
// account in the database is this shape and no other.
const TODAY = { at: 1740000000000, via: 'invite', code: 'ABCDE-FGHJK',
                name: 'Sam', email: 'sam@example.com' };

/* ---------- 1. an account with no type is untouched ----------
   The whole ship rests here. Eight live accounts have no `type` and none of
   them may notice this release. "Behaves like basic" is not enough on its own —
   basic itself has to still be the Worker's defaults, which is section 2. */

{
  check('absent type resolves to basic',
        effectiveType(SOMEBODY, TODAY, NOW) === 'basic',
        effectiveType(SOMEBODY, TODAY, NOW));

  const caps = capabilitiesFor(SOMEBODY, TODAY, NOW);
  const basic = capabilitiesFor(SOMEBODY, { ...TODAY, type: 'basic' }, NOW);

  check('absent type and an explicit basic are the same capabilities',
        JSON.stringify(caps) === JSON.stringify(basic),
        JSON.stringify(caps) + ' vs ' + JSON.stringify(basic));

  check('absent type keeps app access', caps.appAccess === true);
  check('absent type keeps AI access',  caps.aiAccess === true);
  check('absent type is not locked',    isEffectivelyLocked(SOMEBODY, TODAY, NOW) === false);
}

/* ---------- 2. basic IS the Worker's default ----------
   AGENTS.md: "Absent means 'use the Worker's default', which is 3 and 3." The
   Worker is not changed this round and does not know this file exists, so if
   basic ever stops being 3/3 with no monthly override, deriving basic's
   allowance onto an existing account silently changes what that account gets.
   This is one of the two places a literal is the contract. */

{
  check('basic is 3 photo a day (the Worker default)', TIERS.basic.aiPhotoPerDay === 3,
        String(TIERS.basic.aiPhotoPerDay));
  check('basic is 3 describe a day (the Worker default)', TIERS.basic.aiTextPerDay === 3,
        String(TIERS.basic.aiTextPerDay));
  check('basic sets no monthly override — the Worker cap stands',
        TIERS.basic.monthlyUsd === null, String(TIERS.basic.monthlyUsd));

  const d = derivedAllowance(SOMEBODY, TODAY, NOW);
  check('deriving an untyped account writes the Worker defaults back, nothing new',
        d.photoPerDay === 3 && d.textPerDay === 3 && d.monthlyUsd === null && d.blocked === false,
        JSON.stringify(d));
}

/* ---------- 3. the owner ----------
   The owner cannot be locked out by anything stored anywhere. Not by a type
   somebody wrote by hand in the console, not by an expired trial, not by an
   empty record. This is the anti-lockout path that access.js already has for
   the approval node, held to the same standard one layer up. */

{
  check('the owner is the owner with no record at all',
        effectiveType(OWNER_UID, null, NOW) === 'owner');

  check('the owner is the owner with an empty record',
        effectiveType(OWNER_UID, {}, NOW) === 'owner');

  for (const t of SETTABLE_TYPES) {
    check('a stored type of ' + t + ' cannot demote the owner',
          effectiveType(OWNER_UID, { ...TODAY, type: t }, NOW) === 'owner',
          effectiveType(OWNER_UID, { ...TODAY, type: t }, NOW));
  }

  check('a stored type of locked cannot lock the owner',
        isEffectivelyLocked(OWNER_UID, { ...TODAY, type: 'locked' }, NOW) === false);

  check('an expired trial cannot lock the owner',
        isEffectivelyLocked(OWNER_UID, { type: 'trial', trialEndsAt: NOW - DAY }, NOW) === false);

  const caps = capabilitiesFor(OWNER_UID, { ...TODAY, type: 'locked' }, NOW);
  check('the owner keeps app access whatever is stored', caps.appAccess === true);
  check('the owner keeps AI access whatever is stored',  caps.aiAccess === true);
  check('the owner has every feature', FEATURES.every(f => caps.features[f] === true));
  check('the owner has no per-day override — his allowance is nobody else’s business',
        caps.aiPhotoPerDay === null && caps.aiTextPerDay === null && caps.monthlyUsd === null);

  check('derivedAllowance refuses to write the owner’s allowance at all',
        derivedAllowance(OWNER_UID, { ...TODAY, type: 'locked' }, NOW) === null);

  check('isOwnerUid is uid identity and nothing else',
        isOwnerUid(OWNER_UID) === true && isOwnerUid(SOMEBODY) === false &&
        isOwnerUid('') === false && isOwnerUid(null) === false);
}

/* ---------- 4. owner is not a type anybody can set ----------
   Phase 4's hard guarantee, asserted rather than assumed. The admin UI iterates
   SETTABLE_TYPES, so 'owner' being absent from it is what makes the control
   unable to offer it; typePatch is the only builder of a type write, and it
   refuses the string outright. */

{
  check('SETTABLE_TYPES does not contain owner', !SETTABLE_TYPES.includes('owner'));
  check('typePatch cannot be talked into writing owner',
        typePatch('owner', { nowMs: NOW }).type === 'basic',
        typePatch('owner', { nowMs: NOW }).type);
  check('typePatch cannot be talked into writing a type nobody defined',
        typePatch('superuser', { nowMs: NOW }).type === 'basic');
  check('every settable type is a real tier',
        SETTABLE_TYPES.every(t => !!TIERS[t]));
}

/* ---------- 5. a trial flips at the end date, and not a millisecond early ----
   The boundary is the assertion. "Roughly a day" is what turns into a support
   message at 11pm about an app that stopped working. */

{
  const ENDS = NOW + 7 * DAY;
  const rec  = { ...TODAY, type: 'trial', trialEndsAt: ENDS };

  check('a running trial is a trial', effectiveType(SOMEBODY, rec, NOW) === 'trial');
  check('a running trial is not locked', isEffectivelyLocked(SOMEBODY, rec, NOW) === false);
  check('isTrial agrees', isTrial(SOMEBODY, rec, NOW) === true);

  check('one millisecond before the end it is still a trial',
        effectiveType(SOMEBODY, rec, ENDS - 1) === 'trial');
  check('exactly at the end it is locked',
        effectiveType(SOMEBODY, rec, ENDS) === 'locked');
  check('after the end it is locked',
        effectiveType(SOMEBODY, rec, ENDS + 1) === 'locked');

  check('a trial gets Pro’s capabilities while it runs',
        JSON.stringify({ ...capabilitiesFor(SOMEBODY, rec, NOW), type: null }) ===
        JSON.stringify({ ...capabilitiesFor(SOMEBODY, { ...TODAY, type: 'pro' }, NOW), type: null }));

  check('an expired trial has no app access',
        capabilitiesFor(SOMEBODY, rec, ENDS + DAY).appAccess === false);
  check('an expired trial has no AI access',
        capabilitiesFor(SOMEBODY, rec, ENDS + DAY).aiAccess === false);

  check('days left counts up from the end date',
        trialDaysLeft(rec, NOW) === 7, String(trialDaysLeft(rec, NOW)));
  check('a part day still reads as a day',
        trialDaysLeft(rec, ENDS - 1) === 1, String(trialDaysLeft(rec, ENDS - 1)));
  check('days left never goes negative',
        trialDaysLeft(rec, ENDS + 10 * DAY) === 0, String(trialDaysLeft(rec, ENDS + 10 * DAY)));

  check('trialEndFromNow lands TRIAL_DAYS out by default',
        trialEndFromNow(NOW) === NOW + TRIAL_DAYS * DAY);
  check('trialEndFromNow takes a length',
        trialEndFromNow(NOW, 3) === NOW + 3 * DAY);
}

/* ---------- 6. a trial with no end date does NOT expire ----------
   The single most important fail-open case in the file. The owner sets a trial,
   the date write is refused or lost, and the account must keep working. A
   missing field locking somebody out is exactly the failure this whole module
   is written to make impossible. */

{
  const noDate = { ...TODAY, type: 'trial' };
  check('a trial with no end date is still a trial', effectiveType(SOMEBODY, noDate, NOW) === 'trial');
  check('a trial with no end date is never locked', isEffectivelyLocked(SOMEBODY, noDate, NOW) === false);
  check('a trial with no end date reports no countdown rather than zero',
        trialDaysLeft(noDate, NOW) === null);

  for (const junk of [0, -1, 'soon', null, NaN, Infinity, {}, []]) {
    const r = { ...TODAY, type: 'trial', trialEndsAt: junk };
    check('a trial whose end date is ' + JSON.stringify(junk) + ' is not locked',
          isEffectivelyLocked(SOMEBODY, r, NOW) === false,
          effectiveType(SOMEBODY, r, NOW));
  }

  for (const clock of [undefined, null, NaN, 'now', -1, 0]) {
    const r = { ...TODAY, type: 'trial', trialEndsAt: NOW - DAY };
    check('an unreadable clock (' + String(clock) + ') does not expire a trial',
          isEffectivelyLocked(SOMEBODY, r, clock) === false,
          effectiveType(SOMEBODY, r, clock));
  }
}

/* ---------- 7. custom ----------
   The owner's own numbers, over a base that is Pro's. An unset field falls back
   to the base and never to zero: "the owner left the box empty" and "the owner
   typed nought" are different instructions and only one of them takes the
   estimator away. */

{
  const base = TIERS.custom;

  const full = { ...TODAY, type: 'custom',
                 customCaps: { photoPerDay: 7, textPerDay: 9, monthlyUsd: 2.5 } };
  const caps = capabilitiesFor(SOMEBODY, full, NOW);
  check('custom takes the owner’s photo number', caps.aiPhotoPerDay === 7);
  check('custom takes the owner’s describe number', caps.aiTextPerDay === 9);
  check('custom takes the owner’s monthly cap', caps.monthlyUsd === 2.5);

  const partial = { ...TODAY, type: 'custom', customCaps: { photoPerDay: 1 } };
  const pc = capabilitiesFor(SOMEBODY, partial, NOW);
  check('an overridden field applies', pc.aiPhotoPerDay === 1);
  check('an unset field falls back to the base, not to zero',
        pc.aiTextPerDay === base.aiTextPerDay && pc.monthlyUsd === base.monthlyUsd,
        JSON.stringify(pc));

  const none = { ...TODAY, type: 'custom' };
  const nc = capabilitiesFor(SOMEBODY, none, NOW);
  check('custom with no caps at all is the base, and has full access',
        nc.aiPhotoPerDay === base.aiPhotoPerDay && nc.aiTextPerDay === base.aiTextPerDay &&
        nc.appAccess === true && nc.aiAccess === true,
        JSON.stringify(nc));

  const zero = { ...TODAY, type: 'custom', customCaps: { photoPerDay: 0, textPerDay: 0 } };
  const zc = capabilitiesFor(SOMEBODY, zero, NOW);
  check('a typed zero is a real zero — none of that kind at all',
        zc.aiPhotoPerDay === 0 && zc.aiTextPerDay === 0);
  check('a zeroed custom account still has the app and the estimator switch on',
        zc.appAccess === true && zc.aiAccess === true);

  const junkCaps = { ...TODAY, type: 'custom', customCaps: 'lots' };
  check('a customCaps that is not an object falls back to the base, not to a lock',
        capabilitiesFor(SOMEBODY, junkCaps, NOW).appAccess === true &&
        capabilitiesFor(SOMEBODY, junkCaps, NOW).aiPhotoPerDay === base.aiPhotoPerDay);

  check('custom carries the advanced feature',
        capabilitiesFor(SOMEBODY, none, NOW).features.advanced === true);
}

/* ---------- 8. locked ----------
   The one state that takes something away, so the one state that must be
   reachable only on purpose. */

{
  const rec = { ...TODAY, type: 'locked' };
  check('locked has no app access',  capabilitiesFor(SOMEBODY, rec, NOW).appAccess === false);
  check('locked has no AI access',   capabilitiesFor(SOMEBODY, rec, NOW).aiAccess === false);
  check('locked is zero estimates',
        capabilitiesFor(SOMEBODY, rec, NOW).aiPhotoPerDay === 0 &&
        capabilitiesFor(SOMEBODY, rec, NOW).aiTextPerDay === 0);

  const d = derivedAllowance(SOMEBODY, rec, NOW);
  check('locked derives blocked:true', d.blocked === true);
  check('locked derives 0 / 0', d.photoPerDay === 0 && d.textPerDay === 0, JSON.stringify(d));
  check('locked derives a zero monthly cap rather than the Worker default',
        d.monthlyUsd === 0, String(d.monthlyUsd));

  const expired = { ...TODAY, type: 'trial', trialEndsAt: NOW - DAY };
  check('an expired trial derives exactly what locked derives',
        JSON.stringify(derivedAllowance(SOMEBODY, expired, NOW)) === JSON.stringify(d));
}

/* ---------- 9. derivedAllowance is a shape the rules will accept ----------
   The second place a literal is the contract. database.rules.json refuses
   photoPerDay > 12, textPerDay > 30 and monthlyUsd > $10, and a refused write
   is SILENT — the owner sets a tier, sees no error, and the account keeps the
   limits it had. So no tier, however Micah tunes it, may derive a number
   outside those ceilings. */

{
  for (const t of SETTABLE_TYPES) {
    const rec = { ...TODAY, type: t,
                  trialEndsAt: NOW + 30 * DAY,
                  customCaps: { photoPerDay: 999, textPerDay: 999, monthlyUsd: 999 } };
    const d = derivedAllowance(SOMEBODY, rec, NOW);

    check(t + ': photoPerDay is null or a whole number inside the rules’ ceiling',
          d.photoPerDay === null ||
          (Number.isInteger(d.photoPerDay) && d.photoPerDay >= 0 && d.photoPerDay <= RULE_MAX.photoPerDay),
          String(d.photoPerDay));
    check(t + ': textPerDay is null or a whole number inside the rules’ ceiling',
          d.textPerDay === null ||
          (Number.isInteger(d.textPerDay) && d.textPerDay >= 0 && d.textPerDay <= RULE_MAX.textPerDay),
          String(d.textPerDay));
    check(t + ': monthlyUsd is null or money inside the rules’ ceiling',
          d.monthlyUsd === null ||
          (Number.isFinite(d.monthlyUsd) && d.monthlyUsd >= 0 && d.monthlyUsd <= RULE_MAX.monthlyUsd),
          String(d.monthlyUsd));
    check(t + ': blocked is a boolean', typeof d.blocked === 'boolean');
    check(t + ': blocked is true only where AI access is false',
          d.blocked === (capabilitiesFor(SOMEBODY, rec, NOW).aiAccess === false));
  }

  check('the ceilings mirrored here are the ones in database.rules.json',
        RULE_MAX.photoPerDay === 12 && RULE_MAX.textPerDay === 30 &&
        RULE_MAX.monthlyUsd === 10 && RULE_MAX.trialEndsAt === 4102444800000,
        JSON.stringify(RULE_MAX));

  // trialEndsAt travels in the SAME atomic update as the type, so a date the
  // rules refuse does not fail one field — it fails the whole change, and the
  // owner is told the rules are unpublished when they are not. A date picker
  // takes four digits for the year and a slip is one keystroke.
  check('an absurd trial date is clamped to the rules ceiling, not sent as-is',
        typePatch('trial', { nowMs: NOW, trialEndsAt: 253402214400000 }).trialEndsAt === RULE_MAX.trialEndsAt,
        String(typePatch('trial', { nowMs: NOW, trialEndsAt: 253402214400000 }).trialEndsAt));
  check('a negative trial date is clamped to zero, not sent as-is',
        typePatch('trial', { nowMs: NOW, trialEndsAt: -5 }).trialEndsAt === 0);
  check('a fractional trial date comes out whole',
        Number.isInteger(typePatch('trial', { nowMs: NOW, trialEndsAt: NOW + 0.7 }).trialEndsAt));
  check('an ordinary trial date is left exactly alone',
        typePatch('trial', { nowMs: NOW, trialEndsAt: NOW + 3 * DAY }).trialEndsAt === NOW + 3 * DAY);

  check('an over-typed custom cap comes out clamped, not refused',
        derivedAllowance(SOMEBODY,
          { ...TODAY, type: 'custom', customCaps: { photoPerDay: 40 } }, NOW).photoPerDay === 12);

  check('a fractional custom cap comes out whole and rounded DOWN',
        derivedAllowance(SOMEBODY,
          { ...TODAY, type: 'custom', customCaps: { photoPerDay: 3.9 } }, NOW).photoPerDay === 3);
}

/* ---------- 10. garbage fails OPEN, always to basic, never to locked ----------
   Everything a refused read, a half-written record or a hostile console edit
   could put in front of this module. The assertion is the same for all of them
   and it is the one that matters: the app still opens. */

const GARBAGE = [
  null, undefined, 0, 1, '', 'locked', true, false, NaN, [], [1, 2, 3],
  { type: null }, { type: 5 }, { type: {} }, { type: [] }, { type: 'LOCKED' },
  { type: ' locked' }, { type: 'locked ' }, { type: 'owner' }, { type: 'admin' },
  { type: 'basic', trialEndsAt: 'yes' }, { customCaps: { photoPerDay: -4 } },
  { type: '', trialEndsAt: NOW - DAY }, { at: 'nope', via: 12, type: undefined },
  Object.create(null)
];

{
  for (const g of GARBAGE) {
    const label = (() => { try { return JSON.stringify(g); } catch { return String(g); } })();
    const t = effectiveType(SOMEBODY, g, NOW);
    check('garbage ' + label + ' is not locked', t !== 'locked', t);

    const caps = capabilitiesFor(SOMEBODY, g, NOW);
    check('garbage ' + label + ' keeps app access', caps.appAccess === true);
    check('garbage ' + label + ' keeps AI access',  caps.aiAccess === true);

    const d = derivedAllowance(SOMEBODY, g, NOW);
    check('garbage ' + label + ' never derives blocked', d.blocked === false, JSON.stringify(d));
  }

  // The near-miss that matters most: a type string that LOOKS like a lock but
  // is not one of ours. Unrecognised is basic, and basic is today.
  check('a type that is nearly "locked" is basic, not locked',
        effectiveType(SOMEBODY, { ...TODAY, type: 'Locked' }, NOW) === 'basic');

  // A garbage clock must not lock anybody either.
  for (const clock of [undefined, null, NaN, 'x', {}, -5]) {
    check('a clock of ' + String(clock) + ' locks nobody with an ordinary record',
          isEffectivelyLocked(SOMEBODY, TODAY, clock) === false);
  }

  // A uid this module has never seen is an ordinary account, not a refusal.
  for (const u of [undefined, null, '', 0, {}, 'uid_nobody']) {
    check('uid ' + String(u) + ' resolves to basic rather than to a lock',
          effectiveType(u, TODAY, NOW) === 'basic',
          effectiveType(u, TODAY, NOW));
  }
}

/* ---------- 11. typePatch writes the fields, and only the fields ----------
   A type change must not rewrite how somebody got in or what they are called —
   `at`, `via`, `name`, `email` belong to the approval, not to the tier. */

{
  const p = typePatch('trial', { nowMs: NOW });
  check('a trial patch carries an end date', typeof p.trialEndsAt === 'number' && p.trialEndsAt > NOW);
  check('a trial patch clears customCaps', p.customCaps === null);
  check('a trial patch defaults to TRIAL_DAYS', p.trialEndsAt === NOW + TRIAL_DAYS * DAY);
  check('an explicit end date wins',
        typePatch('trial', { nowMs: NOW, trialEndsAt: NOW + 3 * DAY }).trialEndsAt === NOW + 3 * DAY);

  const b = typePatch('basic', { nowMs: NOW });
  check('a non-trial patch clears the end date', b.trialEndsAt === null);
  check('a non-custom patch clears customCaps', b.customCaps === null);

  const c = typePatch('custom', { nowMs: NOW, customCaps: { photoPerDay: 5, monthlyUsd: 1 } });
  check('a custom patch carries the caps', c.customCaps.photoPerDay === 5 && c.customCaps.monthlyUsd === 1);
  check('a custom patch with no caps clears the key rather than writing an empty one',
        typePatch('custom', { nowMs: NOW }).customCaps === null);

  check('subStatus defaults to none', b.subStatus === 'none');
  check('subStatus accepts only the known placeholders',
        typePatch('basic', { subStatus: 'gold' }).subStatus === 'none' &&
        typePatch('basic', { subStatus: 'active' }).subStatus === 'active');
  check('every subStatus placeholder is a string',
        SUB_STATUSES.every(s => typeof s === 'string'));

  for (const k of ['at', 'via', 'name', 'email', 'code']) {
    check('a type patch never touches ' + k, !(k in typePatch('pro', { nowMs: NOW })));
  }
}

/* ---------- 12. normalizeCustomCaps is the only door into customCaps ----------
   The rules validate this node child by child, so anything it does not
   recognise has to be gone before the write, not refused after it. */

{
  const n = normalizeCustomCaps({ photoPerDay: 4, textPerDay: 6, monthlyUsd: 1.239,
                                  features: { advanced: true, admin: true },
                                  nonsense: 'x' });
  check('unknown keys are dropped', !('nonsense' in n));
  check('unknown features are dropped', !('admin' in n.features));
  check('known features survive', n.features.advanced === true);
  check('money is rounded to the cent', n.monthlyUsd === 1.24, String(n.monthlyUsd));
  check('over-range numbers are clamped',
        normalizeCustomCaps({ photoPerDay: 99, textPerDay: 99, monthlyUsd: 99 }).photoPerDay === 12);
  check('an empty object comes back null', normalizeCustomCaps({}) === null);
  check('garbage comes back null',
        normalizeCustomCaps('x') === null && normalizeCustomCaps(null) === null &&
        normalizeCustomCaps([1]) === null);
  check('a zero survives normalisation — it is a real limit',
        normalizeCustomCaps({ photoPerDay: 0 }).photoPerDay === 0);
}

/* ---------- 13. the table itself ---------- */

{
  for (const [t, tier] of Object.entries(TIERS)) {
    check(t + ' has a label a person can read',
          typeof tier.label === 'string' && tier.label.length > 0);
    check(t + ' names its access explicitly',
          typeof tier.aiAccess === 'boolean' && typeof tier.appAccess === 'boolean');
    check('typeLabel(' + t + ') is that label', typeLabel(t) === tier.label);
  }
  check('typeLabel of nonsense is Basic, the safe answer',
        typeLabel('nope') === TIERS.basic.label && typeLabel(null) === TIERS.basic.label);

  check('locked is the only settable type without app access',
        SETTABLE_TYPES.filter(t => TIERS[t].appAccess === false).join(',') === 'locked');
  check('locked is the only settable type without AI access',
        SETTABLE_TYPES.filter(t => TIERS[t].aiAccess === false).join(',') === 'locked');
}

/* ---------- 14. the app and the rules agree ----------
   CLAUDE.md's silent failure, pinned: a write to a node the published rules do
   not name fails with NO error on screen — the data simply never arrives. Every
   field this module invents is new to access/approved, whose rules end in a
   catch-all that refuses anything unnamed. So the fields, the enums and the
   ceilings are checked against the real rules file here, and a field added to
   the app without a rule fails loudly in this verifier instead of quietly on
   somebody's phone.

   The rules file publishes nothing on its own — Micah pastes it into the
   Firebase console. This only proves the file says what the app needs it to. */

const RULES  = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const LOCKED = JSON.parse(readFileSync(new URL('../database.rules.OPTIONAL-LOCK.json', import.meta.url), 'utf8'));

{
  const appr = RULES.rules.access.approved.$uid;
  const ai   = RULES.rules.aiAllow.$uid;

  // Every key typePatch can write has to be a key the rules name.
  const written = Object.keys(typePatch('custom', { nowMs: NOW, customCaps: { photoPerDay: 1 } }));
  for (const k of written) {
    check('access/approved names the field ' + k, !!appr[k],
          'the rules would refuse it in silence');
  }
  check('access/approved still refuses anything it does not name',
        appr.$other && appr.$other['.validate'] === false);

  // Every key derivedAllowance can write has to be a key the aiAllow rules name.
  const derived = derivedAllowance(SOMEBODY, { ...TODAY, type: 'pro' }, NOW);
  for (const k of Object.keys(derived)) {
    check('aiAllow names the field ' + k, !!ai[k],
          'the rules would refuse it in silence');
  }
  check('aiAllow still refuses anything it does not name',
        ai.$other && ai.$other['.validate'] === false);

  // Owner-only, and enforced in .validate rather than in a child .write: a
  // .write grant on the PARENT cascades to the whole subtree, and the parent
  // here already grants a self-write to an account claiming an invite code. A
  // child .write could not take that back. .validate can, and does.
  for (const k of ['type', 'trialEndsAt', 'customCaps', 'subStatus']) {
    const v = String(appr[k]['.validate'] || '');
    check(k + ' is owner-only, checked in .validate',
          v.includes("auth.uid === '" + OWNER_UID + "'"), v.slice(0, 60));
    check(k + ' does not try to restrict with a child .write, which cannot work',
          !('.write' in appr[k]));
  }

  // The enums the rules accept are exactly the types and statuses this module
  // can produce — no more (a type nobody defined) and no fewer (a type the app
  // offers and the database refuses).
  const typeEnum = String(appr.type['.validate']).match(/'[a-z_]+'/g)
    .map(x => x.slice(1, -1)).filter(x => x !== OWNER_UID);
  check('the rules accept exactly the settable types',
        typeEnum.slice().sort().join(',') === SETTABLE_TYPES.slice().sort().join(','),
        typeEnum.join(','));
  check('the rules do not accept a stored type of owner', !typeEnum.includes('owner'));

  const subEnum = String(appr.subStatus['.validate']).match(/'[a-z_]+'/g)
    .map(x => x.slice(1, -1)).filter(x => x !== OWNER_UID);
  check('the rules accept exactly the placeholder subscription statuses',
        subEnum.slice().sort().join(',') === SUB_STATUSES.slice().sort().join(','),
        subEnum.join(','));

  // The ceilings RULE_MAX mirrors are the ceilings the rules actually hold, in
  // both places they appear: aiAllow, and customCaps.
  const ceiling = expr => Number(String(expr).match(/<=\s*([0-9.]+)\s*$/)[1]);
  check('aiAllow photoPerDay ceiling matches RULE_MAX',
        ceiling(ai.photoPerDay['.validate']) === RULE_MAX.photoPerDay);
  check('aiAllow textPerDay ceiling matches RULE_MAX',
        ceiling(ai.textPerDay['.validate']) === RULE_MAX.textPerDay);
  check('aiAllow monthlyUsd ceiling matches RULE_MAX',
        ceiling(ai.monthlyUsd['.validate']) === RULE_MAX.monthlyUsd);
  const cc = appr.customCaps;
  check('customCaps photoPerDay ceiling matches RULE_MAX',
        ceiling(cc.photoPerDay['.validate']) === RULE_MAX.photoPerDay);
  check('customCaps textPerDay ceiling matches RULE_MAX',
        ceiling(cc.textPerDay['.validate']) === RULE_MAX.textPerDay);
  check('customCaps monthlyUsd ceiling matches RULE_MAX',
        ceiling(cc.monthlyUsd['.validate']) === RULE_MAX.monthlyUsd);
  check('customCaps refuses a key nobody named',
        cc.$other && cc.$other['.validate'] === false);
  check('customCaps features refuses a feature nobody named',
        cc.features.$other && cc.features.$other['.validate'] === false);
  for (const f of FEATURES) {
    check('customCaps features names ' + f, !!cc.features[f]);
  }

  // The uid in the rules is the uid in firebase-config.js. If those two ever
  // part company the owner is locked out of his own database, which is the one
  // failure this whole project is built to make impossible.
  check('the rules name the same owner as firebase-config.js',
        JSON.stringify(RULES).includes(OWNER_UID));
}

/* ---------- 15. the optional lock is optional, and fail-safe ----------
   database.rules.OPTIONAL-LOCK.json is an ALTERNATIVE to paste, not an addition
   — only one rule set is ever live. It must differ from the published file in
   exactly one way: users/{uid} writes are refused while that account is locked.

   "Locked" has to mean there what it means in accounts.js, or the two
   definitions drift and the rule enforces half of what the app shows: an
   explicit type of 'locked', AND a trial whose end date has passed. The rules
   language has `now`, which is what makes the second one expressible at all. */

{
  const a = RULES.rules.users.$uid;
  const b = LOCKED.rules.users.$uid;
  const CLAUSE = "child('type').val() !== 'locked'";
  const TRIAL  = "child('trialEndsAt').val() > now";

  const branches = Object.keys(b).filter(k => b[k] && typeof b[k] === 'object' && b[k]['.write']);
  check('the lock variant guards every users/{uid} write branch',
        branches.length > 0 && branches.every(pth => String(b[pth]['.write']).includes(CLAUSE)),
        branches.filter(pth => !String(b[pth]['.write']).includes(CLAUSE)).join(','));

  check('the lock also covers an expired trial, which accounts.js calls locked',
        branches.every(pth => String(b[pth]['.write']).includes(TRIAL)),
        branches.filter(pth => !String(b[pth]['.write']).includes(TRIAL)).join(','));

  check('the published file carries no lock at all — publishing it locks nobody',
        !JSON.stringify(RULES).includes(CLAUSE));

  check('the lock variant still lets the owner through first',
        branches.every(pth => String(b[pth]['.write']).includes("auth.uid === '" + OWNER_UID + "' ||")));

  // Absent type is `null`, and null !== 'locked', so the clause passes. A trial
  // with no readable end date is allowed by an isNumber() test rather than
  // refused by a comparison against undefined. Both are the fail-safe.
  check('the lock tests the type for a value, never for its absence',
        branches.every(pth => !String(b[pth]['.write']).includes("child('type').exists()")));
  check('a trial with an unreadable end date is allowed, not locked',
        branches.every(pth => String(b[pth]['.write']).includes("!root.child('access/approved').child(auth.uid).child('trialEndsAt').isNumber()")));

  check('reads are deliberately left alone, so a paused account can still see its own data',
        a['.read'] === b['.read']);

  // Nothing else may differ. Walked leaf by leaf rather than diffed as text,
  // so the answer names the path that moved.
  const drift = [];
  (function walk(x, y, path) {
    if (x === y) return;
    if (x === null || y === null || typeof x !== 'object' || typeof y !== 'object') {
      drift.push(path); return;
    }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      walk(x[k], y[k], path + '/' + k);
    }
  })(RULES, LOCKED, '');

  const expected = /^\/rules\/users\/\$uid\/[a-z]+\/\.write$/;
  check('the two rule sets differ in nothing but users/{uid} write branches',
        drift.length > 0 && drift.every(pth => expected.test(pth)),
        drift.filter(pth => !expected.test(pth)).join(' '));

  // And each of those differs by ADDING to the same base expression, never by
  // rewriting it: the published rule must still be a literal prefix of the
  // locked one up to the point the extra conditions begin.
  check('every differing branch still contains the published rule it grew from',
        drift.every(pth => {
          const at = o => pth.split('/').filter(Boolean).reduce((n, k) => n[k], o);
          const base = String(at(RULES));
          const grown = String(at(LOCKED));
          const head = base.slice(0, base.indexOf('(auth.uid ==='));
          return grown.startsWith(head) &&
                 grown.includes("root.child('access/approved').child(auth.uid).exists()") &&
                 grown.length > base.length;
        }));
}

/* ---------- 16. the invariants the callers lean on ----------
   accounts.js is pure and provable; admin.js, access.js and app.js are DOM code
   that cannot be imported here. What CAN be pinned is the property each of them
   depends on, and the shape of the call — so that a change to the table below
   fails here rather than quietly changing what a screen does.

   This is the same trick tools-check/units.mjs plays on call sites: read the
   source as text and assert the shape. It catches a whole class of edit that no
   amount of testing the pure module would. */

const SRC = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

{
  /* WHY admin.js must not write `blocked` unconditionally. aiAllow/{uid}/blocked
     is two switches sharing one key — the tier's, and the owner's own "Turn
     their estimator off". Every tier but locked derives blocked:false, so a
     type change that wrote it every time would silently hand the estimator back
     to somebody the owner had switched off on purpose. */
  for (const t of SETTABLE_TYPES) {
    const d = derivedAllowance(SOMEBODY, { ...TODAY, type: t, trialEndsAt: NOW + DAY }, NOW);
    check('derivedAllowance says blocked for ' + t + ' only when the tier means it',
          d.blocked === (t === 'locked'), String(d.blocked));
  }

  const admin = SRC('admin.js');
  check('admin.js does not write aiAllow blocked unconditionally',
        !/paths\[P_AI \+ u \+ '\/blocked'\] = d\.blocked/.test(admin),
        'an unconditional write would clear a manual block on every type change');
  check('admin.js only ever SETS blocked from a tier, or clears one it set',
        /if \(d\.blocked\) paths\[P_AI \+ u \+ '\/blocked'\] = true;/.test(admin));

  /* WHY admin.js must consult the clock before preserving a trial date. The
     stored type and the effective type disagree for exactly one account: an
     expired trial, stored 'trial', effectively 'locked'. Re-applying 'trial'
     there must start a NEW trial, not write yesterday back and report success. */
  const expired = { ...TODAY, type: 'trial', trialEndsAt: NOW - DAY };
  check('an expired trial is the one record whose stored and effective types differ',
        expired.type === 'trial' && effectiveType(SOMEBODY, expired, NOW) === 'locked');
  check('admin.js passes the clock to keepFromRecord',
        /function keepFromRecord\(rec, type, now\)/.test(admin) &&
        /keepFromRecord\(rec, type, now\)/.test(admin));
  check('admin.js refuses to preserve a trial date that has already passed',
        /rec\.trialEndsAt > now/.test(admin));

  /* The owner guarantee, as a property of the SOURCE and not only of the table:
     no call in admin.js can hand applyType the string 'owner', and the control
     is built by iterating SETTABLE_TYPES rather than by listing labels. */
  check('no call site in admin.js passes owner to applyType',
        !/applyType\([^)]*['"]owner['"]/.test(admin));
  check('the type control is built from SETTABLE_TYPES, which has no owner in it',
        /SETTABLE_TYPES\.forEach/.test(admin));

  /* The app gate runs BEFORE boot and on the record already in hand. Its order
     is the whole of its safety: a gate evaluated after the modules load is a
     gate that has already let the app start. */
  const app = SRC('app.js');
  const iGate = app.indexOf('isAccessPaused(user.uid, acc.record)');
  const iBoot = app.indexOf('await boot(user, acc.record)');
  check('app.js asks isAccessPaused with the record accessState already read', iGate > 0);
  check('app.js asks before it boots, not after', iGate > 0 && iBoot > iGate);

  /* Whatever else access.js gates on, it must never gate the owner. */
  const access = SRC('access.js');
  check('access.js short-circuits the owner out of the pause check',
        /if \(isOwnerUid\(u\)\) return false;/.test(access));
  check('access.js answers the basic capability set when nothing is known',
        /return CAPS \|\| capabilitiesFor\('', null, Date\.now\(\)\);/.test(access));

  /* Removing somebody clears the limits a lock derived, because neither door
     back in can: aiAllow's numeric keys and `blocked` are owner-only, and
     revoke() is the last moment the owner is present. */
  check('revoke clears the derived allowance as well as the approval',
        /P_AI \+ targetUid \+ '\/blocked'\]: false/.test(access) &&
        /P_AI \+ targetUid \+ '\/photoPerDay'\]: null/.test(access));
}

/* ---------- report ---------- */

console.log('\naccount types, entitlements and the fail-open promise\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
