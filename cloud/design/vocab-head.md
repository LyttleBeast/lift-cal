# Vibes: the component vocabulary

V59 §9.1, Phase D.1 — 2026-09-27. For the concept agents, the judges, and the native engine's N4 agent.

This is the list of shared building blocks a vibe may re-draw, the looks each block accepts by name, what each look changes, and what no look may change. Together with the token roles (`design/ROLES.md`), it is the contract every vibe fills.

- **The machine copy** is `vibes/defs/vocab.js` in the `web-design` worktree. It imports nothing and is frozen, like `v1.js` and `index.js`, so it can be copied byte for byte into rack-mobile's `src/pure/vibes/defs/` and pinned.
- **This page's block sections are generated from `vocab.js`** by `~/dev/vibes-night/tools/d1-vocab-md.mjs`, so the two cannot disagree. The prose around them is hand-written.
- **It was checked against both trees:** web `64303c7` and native `cb47196`. `~/dev/vibes-night/tools/d1-vocab-check.mjs` confirms that:
  - every native file named here exists;
  - every switch listed as existing is in its file;
  - every web class named here is in the stylesheets or the code;
  - every role a block "reads" resolves in `v1.js`;
  - every name the native engine already accepts is kept.

Words used below:
- A **block** is a shared component.
- A **look** is one of a block's accepted names. The code calls it a *variant*: `variants: { card: 'ruled' }`.
- **v1** is today's look, and it is named `'v1'` in every block.

---

## 1. How a vibe names a look

- **The definition names one look per block.** It does this in `variants: { <block>: '<look>' }`. v1 names `'v1'` everywhere. A name a block does not accept draws v1, never a broken box (native `src/ui/variant.js` `variantOf`).
- **Native branches on the name.** Each block opens with `switch (variantOf('<block>'))`. A look's branch sits above v1's, and v1 falls through to today's JSX. Each block below says which switches exist at `cb47196` and which switch sites the build phase still has to open.
- **The web does not branch at all.** The vibe's own stylesheet (`vibes/<id>.css`, every selector under `[data-vibe="<id>"]`) draws the looks its definition names, on the selectors listed per block. The name is what native branches on, and what Phase Q's parity check compares (§13.5).
- **A look is geometry, not a vibe.** It is drawn from the vibe's own tokens and its `shape` params (§4), so two vibes that name `ruled` get the same shapes in their own colours and faces. No native branch reads a vibe's id.
  - *Recommendation for the web:* generate each look's CSS from one template per look (for example in `tools-check/vibes-css.mjs`, which already writes each vibe's token block). If each vibe's file writes its looks by hand, only Q's parity check holds two vibes' `ruled` together.
- **v1 cannot move.** v1 names `'v1'` everywhere and reads no param. Nothing in `vocab.js` is a value v1 spends.

## 2. Grades, and who may use them

| Grade | What it may change | Who may name it |
|---|---|---|
| `v1` | nothing: today's JSX and CSS | everyone |
| `shape` | only:<br>• fill (a surface role, or none)<br>• border weight and colour role<br>• corner radius<br>• shadow<br>No new drawn device, nothing re-arranged inside the block, no literal type re-set | simple vibes, and everyone else |
| `deep` | adds drawn devices: rules, leaders, bands, keylines, inversions, hatching.<br>Re-sets type at literal sites.<br>Re-arranges inside the block without changing the order of what it holds | the deep vibes, Iron Age, the experimental vibe |

- **Letting a simple vibe name a `shape` look is D.1's reading of §2** ("plus at most small shape tokens such as radius or border weight"). A `shape` look is exactly such a bundle. Q or Micah may hold simple vibes to `'v1'` everywhere instead; nothing else in this file depends on it.
- **A simple vibe gets most of its change without any look:**
  - every colour role;
  - its faces;
  - the type roles, including `upper: 0` on the caps presets (the strings are authored in sentence case);
  - radius per role;
  - the tint alphas. Setting `tint.pillUp` and its siblings to 0 removes the delta pills' fill.

## 3. What no look may change

These come from `vocab.js` `rules`, drawn from §1, §2, §13 and SYNTHESIS R1, R7 and R8.

