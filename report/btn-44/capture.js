// The page half of prove.mjs: settle the page, then dump it. Evaluated in the
// page after helpers.js. Nothing here writes to the app's state except what
// settling has to: the focused element is blurred (no caret), the selection is
// cleared, every finite animation and transition is finished and every
// infinite one is paused at its first frame, a --data-vibe the app took off
// <html> is put back, and relayer() adds and removes a <style> of its own.
// After the screenshot, keyframes() adds and removes probes of its own (a
// zero-size box at the end of <body>); prove.mjs forces :active / :focus… on a
// few elements through CDP and stateDump() reads them, and takes the force off
// again. buildFixture() is a scene of its own (scenes-cover.json): it leaves
// its box in the page, and nothing runs after it in its group.
window.__cap = {
  wall: () => (window.__realNow ? window.__realNow() : Date.now()),
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  // Two frames, or 150ms if the page is not producing frames.
  frame() {
    return Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), __cap.sleep(150)]);
  },
  async settle() {
    // prove.mjs --data-vibe: the attribute stays forced for the capture even if
    // the app took it off; how often it had to be put back is reported.
    let forced = 0;
    if (window.__FORCE_DATA_VIBE != null && document.documentElement.getAttribute('data-vibe') !== window.__FORCE_DATA_VIBE) {
      document.documentElement.setAttribute('data-vibe', window.__FORCE_DATA_VIBE); forced = 1;
    }
    const a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement && a.blur) a.blur();
    try { getSelection().removeAllRanges(); } catch {}
    let rounds = 0, touched = 0;
    for (; rounds < 12; rounds++) {
      let n = 0;
      for (const an of document.getAnimations()) {
        let t = null;
        try { t = an.effect && an.effect.getComputedTiming(); } catch {}
        if (t && t.iterations === Infinity) {
          if (an.playState !== 'paused' || an.currentTime !== 0) { an.pause(); an.currentTime = 0; n++; }
        } else if (an.playState !== 'finished') {
          try { an.finish(); n++; } catch { try { an.cancel(); n++; } catch {} }
        }
      }
      touched += n;
      // Let animationend / transitionend handlers run, then look again: a
      // handler may start the next animation (the Fuel button's settle).
      await __cap.frame();
      await __cap.sleep(30);
      if (!n) break;
    }
    try { await document.fonts.ready; } catch {}
    await Promise.all([...document.images].map(i => (i.complete ? null : i.decode().catch(() => {}))));
    await __cap.frame();
    return forced ? { rounds, touched, forced } : { rounds, touched };
  },
  // settle()'s animation rule, at once and without waiting for frames: every
  // transition and finite animation finished, every infinite one at frame 0.
  // For the forced-state pass, where forcing :active starts the transitions a
  // rule declares (read at their start, the old value would be all it saw).
  quiet() {
    let n = 0;
    for (const an of document.getAnimations()) {
      let t = null;
      try { t = an.effect && an.effect.getComputedTiming(); } catch {}
      if (t && t.iterations === Infinity) { if (an.playState !== 'paused' || an.currentTime !== 0) { an.pause(); an.currentTime = 0; n++; } }
      else if (an.playState !== 'finished') { try { an.finish(); n++; } catch { try { an.cancel(); n++; } catch {} } }
    }
    return n;
  },
  // Take the dock out of the render tree and put it back, so Chrome makes its
  // composited layer and tilings again and rasters them from the final display
  // list (prove.mjs HOLDS, "raster states"). A <style> of the harness's own,
  // added and removed: the DOM is left as it was found.
  async relayer() {
    if (!document.querySelector('.dock')) return false;
    const s = document.createElement('style');
    s.textContent = '.dock{display:none!important}';
    document.head.appendChild(s);
    await __cap.frame(); await __cap.sleep(50);
    s.remove();
    await __cap.frame(); await __cap.sleep(50);
    return true;
  },
  // Where the dock is, for the re-boot backstop's signature (prove.mjs
  // confirmPixels, harness-lib isDockRasterNoise): its box in the viewport, the
  // boxes of its icons (its <svg>s — the raster states are theirs, never the
  // labels'), and the scroll it sits at.
  dockBox() {
    const d = document.querySelector('.dock');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    const icons = [...d.querySelectorAll('svg')].map(s => { const b = s.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; })
      .filter(b => b.right > b.left && b.bottom > b.top);
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, scrollX, scrollY, innerHeight, icons };
  },
  pathOf(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      let i = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === n.localName && s !== document.head) i++;
      parts.push(n.localName + ':' + i);
    }
    return parts.reverse().join('>');
  },
  // Every property the browser enumerates, but custom properties (--*).
  props() {
    const cs0 = getComputedStyle(document.documentElement);
    const P = [];
    for (let i = 0; i < cs0.length; i++) { const p = cs0[i]; if (!p.startsWith('--')) P.push(p); }
    return P;
  },
  // An interning style reader: each distinct tuple of values once.
  styler(P) {
    const styles = [], seen = new Map();
    const st = (el, pseudo) => {
      const cs = getComputedStyle(el, pseudo);
      const v = new Array(P.length);
      for (let i = 0; i < P.length; i++) v[i] = cs.getPropertyValue(P[i]);
      const k = v.join('\u0001');
      let j = seen.get(k);
      if (j === undefined) { j = styles.length; seen.set(k, j); styles.push(v); }
      return j;
    };
    return { styles, st };
  },

  /* ---------- the stylesheets, as the page has them ---------- */
  // Every style rule in effect, in order: top level, and inside an @media that
  // matches now, an @supports that holds, a @layer or @container block.
  // Cross-origin sheets (the pinned Archivo CSS) cannot be read and hold no rules.
  rules() {
    const out = [];
    const walk = list => {
      for (const r of list) {
        if (r instanceof CSSStyleRule) out.push(r);
        else if (r instanceof CSSMediaRule) { if (!r.media.mediaText || matchMedia(r.media.mediaText).matches) walk(r.cssRules); }
        else if (r instanceof CSSSupportsRule) { let ok = true; try { ok = CSS.supports(r.conditionText); } catch {} if (ok) walk(r.cssRules); }
        else if ((typeof CSSLayerBlockRule !== 'undefined' && r instanceof CSSLayerBlockRule) || (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule)) walk(r.cssRules);
      }
    };
    for (const sh of __cap.sheets()) {
      let list; try { list = sh.cssRules; } catch { continue; }
      if (sh.disabled || (sh.media && sh.media.mediaText && !matchMedia(sh.media.mediaText).matches)) continue;
      walk(list);
    }
    return out;
  },
  // The document's stylesheets and any it adopted (constructed sheets have no
  // element, so neither the head nor the text comparison sees them).
  sheets() { return [...document.styleSheets, ...(document.adoptedStyleSheets || [])]; },
  // A selector list, split at its top-level commas.
  splitTop(sel) {
    const out = []; let cur = '', d = 0, q = null;
    for (const ch of sel) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--;
      if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  },
  // A complex selector as compounds and the combinators before them.
  parseComplex(sel) {
    const out = []; let buf = '', d = 0, q = null, pend = null;
    const push = () => { if (buf) { out.push({ comb: out.length ? (pend || ' ') : null, comp: buf }); buf = ''; pend = null; } };
    for (let i = 0; i < sel.length; i++) {
      const ch = sel[i];
      if (q) { buf += ch; if (ch === q && sel[i - 1] !== '\\') q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === '\\') { buf += ch + (sel[i + 1] || ''); i++; continue; }
      if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--;
      if (!d && (ch === '>' || ch === '+' || ch === '~')) { push(); pend = ch; continue; }
      if (!d && /\s/.test(ch)) { push(); if (!pend) pend = ' '; continue; }
      buf += ch;
    }
    push();
    return out;
  },
  joinComplex(comps) { return comps.map((c, i) => (i ? (c.comb === ' ' ? ' ' : ' ' + c.comb + ' ') : '') + c.comp).join(''); },
  STATES: /:(hover|active|focus-visible|focus-within|focus|visited|target)(?![\w-])/g,
  // A compound with its states and pseudo-elements taken out; '' if nothing is left.
  stripComp(c) {
    return c.replace(/::?(before|after|placeholder|marker|first-letter|first-line|selection|backdrop|file-selector-button|-webkit-[\w-]+|-moz-[\w-]+)(\([^)]*\))?/g, '').replace(__cap.STATES, '');
  },
  FOCUSABLE: ':is(a[href], button, input, select, textarea, [tabindex], summary)',
  // The whole selector stripped (for the element that has to match it). A
  // compound that was only a state becomes `fill` (the focusable elements for
  // a state, anything otherwise).
  stripSel(sel, fill = '*') {
    const comps = __cap.parseComplex(sel).map(c => ({ comb: c.comb, comp: __cap.stripComp(c.comp) || fill }));
    return __cap.joinComplex(comps);
  },
  // One compound's simple selectors.
  parseCompound(c) {
    const r = { tag: null, id: null, cls: [], attrs: [], pcs: [] };
    let i = 0;
    const ident = () => { let s = ''; while (i < c.length && (/[\w-]/.test(c[i]) || c.charCodeAt(i) > 127 || c[i] === '\\')) { if (c[i] === '\\') { s += c[i + 1] || ''; i += 2; continue; } s += c[i++]; } return s; };
    const args = () => { let d = 0, s = ''; for (; i < c.length; i++) { const ch = c[i]; if (ch === '(') { d++; if (d === 1) continue; } else if (ch === ')') { d--; if (!d) { i++; break; } } s += ch; } return s; };
    if (c[i] === '*') i++; else if (/[a-zA-Z]/.test(c[i] || '')) r.tag = ident().toLowerCase();
    while (i < c.length) {
      const ch = c[i];
      if (ch === '.') { i++; r.cls.push(ident()); }
      else if (ch === '#') { i++; r.id = ident(); }
      else if (ch === '[') {
        let j = i + 1, q = null; for (; j < c.length; j++) { if (q) { if (c[j] === q) q = null; continue; } if (c[j] === '"' || c[j] === "'") q = c[j]; else if (c[j] === ']') break; }
        const body = c.slice(i + 1, j); i = j + 1;
        const m = body.match(/^\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))\s*(i|s)?)?\s*$/);
        if (!m) return null;
        r.attrs.push([m[1], m[2] || null, m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : null]);
      } else if (ch === ':') {
        i++; if (c[i] === ':') return null;   // a pseudo-element left in: not for here
        const name = ident().toLowerCase(); const arg = c[i] === '(' ? args() : null;
        r.pcs.push({ name, arg });
      } else return null;
    }
    return r;
  },

  /* ---------- the fixture: every rule's element, built ----------
     For every style rule in effect (scenes-cover.json's "fixture" scene), a
     small chain of elements that matches its selector — states and
     pseudo-elements aside — so its computed style is measured even when no
     scene reaches it. Built from the page's own stylesheets, so each side builds
     its own; the same selectors build the same DOM. Kept in a zero-height box
     with strict containment at the end of <body>: it paints nothing and moves
     nothing. What could not be built is counted by reason (info.fixture). */
  buildFixture() {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'tspan', 'defs', 'stop', 'use', 'symbol', 'lineargradient', 'radialgradient', 'clippath', 'mask', 'pattern']);
    const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'wbr', 'textarea', 'select', 'video', 'canvas', 'iframe']);
    const old = document.getElementById('__fx'); if (old) old.remove();
    const box = document.createElement('div');
    box.id = '__fx';
    box.setAttribute('style', 'position:absolute;left:0;top:0;width:' + innerWidth + 'px;height:0;overflow:hidden;contain:strict;pointer-events:none');
    const seen = new Set(), skipped = {};
    let built = 0;
    const skip = (why, s) => { (skipped[why] = skipped[why] || []).push(s); };
    const make = (spec, inSvg) => {
      const pcn = spec.pcs.map(p => p.name);
      let tag = spec.tag;
      if (!tag) tag = pcn.includes('disabled') || pcn.includes('enabled') ? 'button' : (pcn.includes('checked') || pcn.includes('placeholder-shown')) ? 'input' : 'div';
      const svg = inSvg || SVG_TAGS.has(tag);
      const el = svg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
      if (spec.id) el.setAttribute('id', spec.id);
      for (const k of spec.cls) el.classList.add(k);
      for (const [n, , v] of spec.attrs) el.setAttribute(n, v == null ? '' : v);
      if (pcn.includes('disabled')) el.setAttribute('disabled', '');
      if (pcn.includes('checked')) { if (!el.getAttribute('type')) el.setAttribute('type', 'checkbox'); el.setAttribute('checked', ''); }
      if (pcn.includes('placeholder-shown') && !el.hasAttribute('placeholder')) el.setAttribute('placeholder', 'Aa');
      if (pcn.includes('open') && !el.hasAttribute('open')) el.setAttribute('open', '');
      return { el, svg };
    };
    // :is(x) / :where(x) whose first choice is one compound: merged in.
    const merge = spec => {
      for (const p of spec.pcs.filter(p => (p.name === 'is' || p.name === 'where') && p.arg)) {
        const alt = __cap.splitTop(p.arg)[0];
        const cx = __cap.parseComplex(alt);
        if (cx.length !== 1) return null;
        const sub = __cap.parseCompound(cx[0].comp);
        if (!sub) return null;
        if (sub.tag && !spec.tag) spec.tag = sub.tag;
        if (sub.id && !spec.id) spec.id = sub.id;
        spec.cls.push(...sub.cls); spec.attrs.push(...sub.attrs); spec.pcs.push(...sub.pcs.filter(q => q.name !== 'is' && q.name !== 'where'));
      }
      return spec;
    };
    for (const rule of __cap.rules()) {
      for (const raw of __cap.splitTop(rule.selectorText)) {
        const want = __cap.stripSel(raw);
        if (seen.has(want)) continue;
        seen.add(want);
        let comps = __cap.parseComplex(want);
        while (comps.length > 1 && /^(html|:root|body)$/i.test(comps[0].comp) && comps[1].comb === ' ') { comps = comps.slice(1); comps[0] = { comb: null, comp: comps[0].comp }; }
        if (!comps.length || comps.some(c => /^(html|body)(?![\w-])|^:root/i.test(c.comp) || c.comp === '*' && comps.length === 1)) { skip('root', raw); continue; }
        const specs = comps.map(c => { const pc = __cap.parseCompound(c.comp); return pc ? merge(pc) : null; });
        if (specs.some(s => !s)) { skip('unparsed', raw); continue; }
        const wrap = document.createElement('div');
        let cur = null, curSvg = false, ok = true;
        specs.forEach((spec, i) => {
          if (!ok) return;
          const comb = comps[i].comb;
          const parentSvg = comb === '+' || comb === '~' ? (cur && cur.parentNode && cur.parentNode.namespaceURI === SVGNS) : curSvg;
          const { el, svg } = make(spec, i && parentSvg);
          if (!cur) wrap.appendChild(el);
          else if (comb === '+' || comb === '~') cur.parentNode.insertBefore(el, cur.nextSibling);
          else cur.appendChild(el);
          // :nth-child(n) / :nth-of-type(n) with a plain n: n-1 siblings before it.
          const nth = spec.pcs.find(p => (p.name === 'nth-child' || p.name === 'nth-of-type') && /^\s*\d+\s*$/.test(p.arg || ''));
          if (nth) for (let k = 1; k < +nth.arg; k++) el.parentNode.insertBefore(el.namespaceURI === SVGNS ? document.createElementNS(SVGNS, el.localName) : document.createElement(el.localName), el);
          // :has(x) with a simple subject: one child that matches it.
          for (const p of spec.pcs.filter(p => p.name === 'has' && p.arg)) {
            const alt = __cap.splitTop(p.arg)[0].replace(/^\s*>\s*/, '');
            const cx = __cap.parseComplex(alt);
            const sub = cx.length === 1 && __cap.parseCompound(__cap.stripComp(cx[0].comp) || '*');
            if (!sub) { ok = false; return; }
            el.appendChild(make(sub, svg).el);
          }
          cur = el; curSvg = svg;
        });
        if (!ok) { skip('has', raw); continue; }
        const leaf = cur;
        const pcn = specs[specs.length - 1].pcs.map(p => p.name);
        if (!curSvg && !VOID.has(leaf.localName) && !pcn.includes('empty') && !leaf.firstChild) leaf.appendChild(document.createTextNode('Aa 0'));
        box.appendChild(wrap);
        let m = false;
        try { if (!box.isConnected) document.body.appendChild(box); m = leaf.matches(want); } catch { m = false; }
        if (!m) { wrap.remove(); skip('unmatched', raw); continue; }
        built++;
      }
    }
    if (!box.isConnected) document.body.appendChild(box);
    const counts = Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, v.length]));
    window.__FIXTURE = { built, selectors: seen.size, skipped: counts, skippedSample: Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, v.slice(0, 12)])) };
    return window.__FIXTURE;
  },

  /* ---------- after the screenshot: keyframes, states, coverage ---------- */
  // Every @keyframes in effect, played on probes of its own: each keyframe's
  // offset and halfway between, every property its frames declare, read back
  // computed (var() resolved, percentages against a 100px box). A frame no
  // scene ever captures — the middle of a pulse, a flash no scene triggers — is
  // compared here. The probes sit in a zero-size, strictly contained box that
  // is removed before this returns.
  keyframes() {
    const names = new Map();
    const walk = list => {
      for (const r of list) {
        if (r instanceof CSSKeyframesRule) {
          let n = names.get(r.name);
          if (!n) names.set(r.name, n = { offsets: new Set(), props: new Set() });
          for (const kf of r.cssRules) {
            for (const t of kf.keyText.split(',')) { const x = t.trim(); n.offsets.add(x === 'from' ? 0 : x === 'to' ? 1 : parseFloat(x) / 100); }
            for (let i = 0; i < kf.style.length; i++) { const p = kf.style[i]; if (!p.startsWith('--') && !/^animation-/.test(p)) n.props.add(p); }
          }
        } else if (r instanceof CSSMediaRule) { if (!r.media.mediaText || matchMedia(r.media.mediaText).matches) walk(r.cssRules); }
        else if (r instanceof CSSSupportsRule) { let ok = true; try { ok = CSS.supports(r.conditionText); } catch {} if (ok) walk(r.cssRules); }
      }
    };
    for (const sh of __cap.sheets()) { let l; try { l = sh.cssRules; } catch { continue; } walk(l); }
    const box = document.createElement('div');
    box.setAttribute('style', 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;contain:strict;pointer-events:none;visibility:hidden');
    const out = {}, probes = [];
    for (const name of [...names.keys()].sort()) {
      const n = names.get(name);
      // 0 and 1 always: a @keyframes that leaves one out takes the element's own
      // value there, and the halfway sample needs both ends.
      const offs = [...new Set([0, 1, ...n.offsets])].filter(x => Number.isFinite(x)).sort((a, b) => a - b);
      const samples = [];
      offs.forEach((o, i) => { samples.push(o); if (i + 1 < offs.length) samples.push((o + offs[i + 1]) / 2); });
      const props = [...n.props].sort();
      out[name] = { offsets: samples.map(x => +x.toFixed(4)), props, values: [] };
      for (const o of samples) {
        const p = document.createElement('div');
        p.setAttribute('style', 'position:absolute;left:0;top:0;width:100px;height:100px');
        p.style.animationName = name;
        p.style.animationDuration = '1000s';
        p.style.animationTimingFunction = 'linear';
        p.style.animationIterationCount = '1';
        p.style.animationPlayState = 'paused';
        p.style.animationFillMode = 'both';
        p.style.animationDelay = (-o * 1000) + 's';
        box.appendChild(p);
        probes.push([name, p]);
      }
    }
    document.body.appendChild(box);
    for (const [name, p] of probes) { const cs = getComputedStyle(p); out[name].values.push(out[name].props.map(k => cs.getPropertyValue(k))); }
    box.remove();
    return out;
  },
  // What prove.mjs forces, state by state: for each rule with a state in it,
  // the elements to force (the compound that holds the state, stripped: the
  // focusable elements when the compound is nothing but the state) and the
  // elements the rule styles. A state inside :not() / :is() / :has() is out of
  // reach and counted.
  statePlan() {
    const plan = {}, out = { plan, unreachable: 0 };
    const re = /:(hover|active|focus-visible|focus-within|focus)(?![\w-])/g;
    for (const r of __cap.rules()) {
      if (!/:(hover|active|focus)/.test(r.selectorText)) continue;
      for (const sel of __cap.splitTop(r.selectorText)) {
        if (/:(not|is|where|has|matches)\([^)]*:(hover|active|focus)/.test(sel)) { out.unreachable++; continue; }
        const comps = __cap.parseComplex(sel);
        comps.forEach((cp, i) => {
          const kinds = [...new Set([...cp.comp.matchAll(re)].map(m => m[1]))];
          if (!kinds.length) return;
          const force = __cap.stripSel(__cap.joinComplex(comps.slice(0, i + 1)), __cap.FOCUSABLE);
          const subj = __cap.stripSel(sel, __cap.FOCUSABLE);
          for (const k of kinds) {
            const p = plan[k] = plan[k] || { force: [], subj: [] };
            if (!p.force.includes(force)) p.force.push(force);
            if (!p.subj.includes(subj)) p.subj.push(subj);
          }
        });
      }
    }
    return out;
  },
  // With the state forced (by prove.mjs, through CDP), the first `K` elements
  // of every selector, each once, by path: computed style and ::before /
  // ::after (and ::placeholder).
  stateDump(sels, K) {
    const P = __cap.props();
    const { styles, st } = __cap.styler(P);
    const seen = new Set(), els = [];
    for (const s of sels) {
      let l; try { l = document.querySelectorAll(s); } catch { continue; }
      for (let i = 0; i < l.length && i < K; i++) {
        const el = l[i];
        if (seen.has(el)) continue;
        seen.add(el);
        const e = { k: __cap.pathOf(el), p: __cap.pathOf(el), s: st(el, null), b: st(el, '::before'), a: st(el, '::after') };
        if (el.localName === 'input' || el.localName === 'textarea') e.ph = st(el, '::placeholder');
        els.push(e);
      }
    }
    els.sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0));
    return { props: P, styles, els };
  },
  // For the coverage report: for each rule (prove.mjs TOUCHED: the selector its
  // element can be found by, and the @media / @supports around it), how many
  // elements match, outside the fixture and inside it — but only when the rule
  // is in effect at this capture: every @media matches now, every @supports
  // holds, and there is no at-rule the page cannot test (@container, @scope…).
  // A rule in @media (min-width: 900px) styles no element at 390 or 320, however
  // many match its selector. Each entry: [real, fixture, in effect 1/0].
  count(items) {
    const fx = document.getElementById('__fx');
    return items.map(it => {
      let on = !(it.other && it.other.length);
      for (const m of it.media || []) { try { if (!matchMedia(m).matches) on = false; } catch { on = false; } }
      for (const q of it.supports || []) { try { if (!CSS.supports(q)) on = false; } catch { on = false; } }
      if (!on) return [0, 0, 0];
      let l; try { l = document.querySelectorAll(it.sel); } catch { return [-1, -1, 1]; }
      let real = 0, fix = 0;
      for (const e of l) { if (fx && fx.contains(e)) fix++; else real++; }
      return [real, fix, 1];
    });
  },

  // Every element under <html> except <head>'s subtree (nothing in it renders;
  // it is listed separately), with its computed style and its ::before /
  // ::after (and ::placeholder on inputs, ::marker on list items, and any other
  // pseudo-element a rule in effect styles on it, under x): every property the
  // browser enumerates except custom properties (--*); its rect; every
  // attribute but style (at). Styles are interned: `styles` holds each
  // distinct value tuple once, in the order of `props`, and an element points
  // at its tuples by index.
  dump() {
    const html = document.documentElement;
    const P = __cap.props();
    const { styles, st } = __cap.styler(P);
    // Pseudo-elements beyond the four: which elements a rule gives one to.
    const extra = new Map();
    const PE = /::?(first-letter|first-line|selection|backdrop|file-selector-button|-webkit-[\w-]+)(?![\w-])/g;
    for (const r of __cap.rules()) {
      if (!/::?(first-l|selection|backdrop|file-selector|-webkit-)/.test(r.selectorText)) continue;
      for (const s of __cap.splitTop(r.selectorText)) {
        const pes = [...s.matchAll(PE)].map(m => '::' + m[1]);
        if (!pes.length) continue;
        let l; try { l = document.querySelectorAll(__cap.stripSel(s)); } catch { continue; }
        for (const el of l) { const x = extra.get(el) || new Set(); pes.forEach(p => x.add(p)); extra.set(el, x); }
      }
    }
    // SVG paint is compared by its COMPUTED value (it is in the style tuple, and
    // repeated under svg.paint): the engine may move a hex out of a fill=""
    // attribute into a style. Every other attribute, raw, under at.
    const PAINT = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'opacity'];
    const SVG_SKIP = new Set(['style', ...PAINT]);
    const els = [];
    const visit = (el, path) => {
      const r = el.getBoundingClientRect();
      const tag = el.localName;
      const e = { p: path, s: st(el, null), b: st(el, '::before'), a: st(el, '::after'), r: [r.x, r.y, r.width, r.height] };
      if (tag === 'input' || tag === 'textarea') { e.ph = st(el, '::placeholder'); e.v = el.value; }
      else if (tag === 'select') e.v = el.value;
      if (tag === 'li' || tag === 'summary') e.mk = st(el, '::marker');
      const x = extra.get(el);
      if (x) { e.x = {}; for (const p of [...x].sort()) e.x[p] = st(el, p); }
      const isSvg = el instanceof SVGElement;
      const at = {};
      let nat = 0;
      for (const a of el.attributes) { if (a.name === 'style' || (isSvg && SVG_SKIP.has(a.name))) continue; at[a.name] = a.value; nat++; }
      if (nat) e.at = at;
      if (isSvg) {
        const cs = getComputedStyle(el), paint = {};
        for (const k of PAINT) paint[k] = cs.getPropertyValue(k);
        e.svg = { paint };
      }
      if (tag !== 'script' && tag !== 'style') {
        let t = '';
        for (const n of el.childNodes) if (n.nodeType === 3) t += n.data;
        t = t.replace(/\s+/g, ' ').trim();
        if (t) e.t = t;
      }
      els.push(e);
      const cnt = {};
      for (const c of el.children) {
        if (c === document.head) continue;
        const n = c.localName;
        cnt[n] = (cnt[n] || 0) + 1;
        visit(c, path + '>' + n + ':' + cnt[n]);
      }
    };
    visit(html, 'html:1');
    // The head, entry by entry, with every attribute (a script as its src only).
    const head = [...document.head.children].map(n => n.localName === 'script' ? 'script' + (n.getAttribute('src') ? ' src=' + n.getAttribute('src') : '')
      : n.localName + [...n.attributes].map(a => ' ' + a.name + '=' + a.value).join('') + (n.localName === 'title' ? ' text=' + n.textContent : ''));
    const htmlAttrs = {};
    for (const x of html.attributes) htmlAttrs[x.name] = x.value;
    return JSON.stringify({
      props: P, styles, els, head, htmlAttrs, fixture: window.__FIXTURE || null,
      doc: { scrollX, scrollY, innerWidth, innerHeight, scrollWidth: html.scrollWidth, scrollHeight: html.scrollHeight, title: document.title, active: document.activeElement ? document.activeElement.localName : null }
    });
  },
  // The fit read (§13.3): horizontal overflow, clipped text, small targets.
  fit() {
    const vw = innerWidth, html = document.documentElement;
    const vis = n => !!(n && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden');
    const label = n => (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).join('.') : n.localName);
    const text = n => (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const clipsX = n => /hidden|clip|auto|scroll/.test(getComputedStyle(n).overflowX);
    const out = { vw, docScrollWidth: html.scrollWidth, bodyScrollWidth: document.body.scrollWidth, docOverflow: html.scrollWidth > vw, overflow: [], clipped: [], small: [], watch: [] };
    for (const el of document.body.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const cs = getComputedStyle(el);
      if (r.right > vw + 0.5 || r.left < -0.5) {
        let inside = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (clipsX(p)) { inside = true; break; }
        if (!inside && cs.position !== 'fixed') out.overflow.push({ path: __cap.pathOf(el), cls: label(el), text: text(el), left: +r.left.toFixed(2), right: +r.right.toFixed(2) });
      }
      const hasText = /\S/.test(el.textContent || '') && el.localName !== 'script' && el.localName !== 'style';
      if (hasText && el.clientHeight > 0) {
        const scrolls = /auto|scroll/.test(cs.overflowX + ' ' + cs.overflowY);
        const oh = el.scrollHeight > el.clientHeight + 1, ow = el.scrollWidth > el.clientWidth + 1;
        if (!scrolls && (oh || ow)) {
          const hides = /hidden|clip/.test(cs.overflowX + ' ' + cs.overflowY);
          out.clipped.push({ path: __cap.pathOf(el), cls: label(el), text: text(el), how: hides ? 'clipped' : 'spills', axis: (oh ? 'y' : '') + (ow ? 'x' : ''),
            box: [el.clientWidth, el.clientHeight], content: [el.scrollWidth, el.scrollHeight], height: cs.height, overflow: cs.overflowX + '/' + cs.overflowY,
            ellipsis: cs.textOverflow === 'ellipsis', clamp: cs.webkitLineClamp });
        }
      }
      if (el.matches('button, a[href], [role=button], input:not([type=hidden]), select, textarea, summary') && r.height < 43.99)
        out.small.push({ path: __cap.pathOf(el), cls: label(el), text: text(el).slice(0, 32), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
      if (el.matches('.coach-card, .btn, [class*="chip"]'))
        out.watch.push({ path: __cap.pathOf(el), cls: label(el), w: +r.width.toFixed(2), h: +r.height.toFixed(2), box: [el.clientWidth, el.clientHeight], content: [el.scrollWidth, el.scrollHeight] });
    }
    return out;
  }
};
true;
