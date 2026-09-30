#!/usr/bin/env node
/* r2-screentitle-repro — Pnat round-2 coverage reviewer's scratch tool.
 * The Steps and Fuel tab titles, as each tree draws them, through that tree's
 * own tools/lib/rn-render.mjs: build 58's inline `<View><Eyebrow/><Text/></View>`
 * (app/(app)/(tabs)/steps.jsx:78, food.jsx:1622 at 1cb6498) and the engine's
 * `<ScreenTitle eyebrow title />` (src/ui/Card.jsx:47, no style passed).
 * Prints the title View host's own prop keys.
 * usage: node r2-screentitle-repro.mjs <base tree> <engine tree> */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [BASE, ENGINE] = process.argv.slice(2);
async function titleView(tree, useScreenTitle) {
  const R = await import(pathToFileURL(join(tree, 'tools/lib/rn-render.mjs')).href);
  const T = R.load('src/ui/theme.js').default;
  const CardMod = R.load('src/ui/Card.jsx');
  const { Text } = R.RN;
  const el = useScreenTitle
    ? R.h(CardMod.ScreenTitle, { eyebrow: 'Movement', title: 'Steps' })
    : R.h(R.RN.View, null, R.h(CardMod.Eyebrow, null, 'Movement'), R.h(Text, { style: T.text.h1 }, 'Steps'));
  const m = R.mount(el);
  const v = R.hosts(m.box).find(x => x.t === 'View');
  const out = { keys: Object.keys(v.p).filter(k => k !== 'children'), hasStyle: 'style' in v.p, style: v.p.style === undefined ? '(undefined)' : v.p.style };
  m.unmount();
  return out;
}
// Each tree in its own process would be cleaner; rn-render's module hooks are per-ROOT, so run one tree per invocation.
const which = process.argv[4];
if (which === 'base') console.log('build 58 (1cb6498) Steps title View:', JSON.stringify(await titleView(BASE, false)));
else if (which === 'engine') console.log('engine ScreenTitle View:', JSON.stringify(await titleView(ENGINE, true)));
else console.log('pass base|engine as the third argument');
