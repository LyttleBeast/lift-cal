// Phase R synthesis: candidate replacement grounds/accents, distance checks only.
import { dE, contrast, simulate } from './colour/colour-lib.mjs';
const creams = ['#f4f1ea', '#f7f1e4', '#f5f1e8', '#faf8f5', '#f0ebe0'];
const others = { chalk: '#e8ebeb', whiteboard: '#eef0f0', iaCream: '#ede3cc', paperT4: '#f4f2ec' };
const grounds = process.argv.slice(2).filter(a => a.startsWith('g=')).map(a => a.slice(2));
const accents = process.argv.slice(2).filter(a => a.startsWith('a=')).map(a => a.slice(2));
for (const g of grounds) {
  const m = Math.min(...creams.map(c => dE(g, c)));
  console.log(`ground ${g}: min dE00 to AI creams ${m.toFixed(2)} | ` + Object.entries(others).map(([k, v]) => `${k} ${dE(g, v).toFixed(1)}`).join(' ') + ` | ink #111111 ${contrast('#111111', g).toFixed(2)}`);
}
// Paper's data colours (track 4) for accent separation
const data = { chest: '#84140e', back: '#0b5f8f', legs: '#8e6c00', shoulders: '#036349', arms: '#222120', core: '#6d737e' };
const otherAcc = { chalkPetrol: '#005f73', iaCarmine: '#a8163f', whiteboardPlum: '#9c1f5e', v1: '#f0be1e', oxIce: '#a8d8ff', clubPink: '#ffb3c8', navyGold: '#e2b04a' };
for (const a of accents) {
  const near = k => Object.entries(data).map(([n, v]) => [n, dE(simulate(a, k), simulate(v, k))]).sort((x, y) => x[1] - y[1])[0];
  const nn = near('normal'), nd = near('deutan'), np = near('protan');
  const oa = Object.entries(otherAcc).map(([n, v]) => [n, dE(a, v)]).sort((x, y) => x[1] - y[1])[0];
  console.log(`accent ${a}: nearest data normal ${nn[0]} ${nn[1].toFixed(1)}, deutan ${nd[0]} ${nd[1].toFixed(1)}, protan ${np[0]} ${np[1].toFixed(1)} | nearest other-vibe accent ${oa[0]} ${oa[1].toFixed(1)} | clay ${dE(a, '#d97757').toFixed(1)}`);
}
