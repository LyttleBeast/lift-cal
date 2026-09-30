// Page half of vibe-contrast/web.mjs (V59 §13.1). Evaluated in the page after
// the harness's helpers.js and capture.js. Reads only: every visible text run,
// every SVG mark, every CSS mark, control edge, ring and pseudo-element, each
// with the colour it is actually painted in and the colour actually painted
// under it (the ancestor chain composited with each node's background and
// group opacity, over the white canvas). Then every :focus / :active rule the
// sheets hold, resolved on the elements it matches. Aggregated in the page so
// the result is small: one row per (kind, context, fg, bg, size class).
window.__vc = (() => {
  const P = s => {
    if (!s || s === 'transparent' || s === 'none') return [0, 0, 0, 0];
    let m = s.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const over = (t, b) => {
    const a = t[3] + b[3] * (1 - t[3]);
    if (a <= 0) return [0, 0, 0, 0];
    return [0, 1, 2].map(i => (t[i] * t[3] + b[i] * b[3] * (1 - t[3])) / a).concat(a);
  };
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const CR = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const CANVAS = [255, 255, 255, 1];
  const flags = new Set();
  // What one pixel of `start` (a colour on top of el, or transparent for the
  // ground itself) looks like once every ancestor's background and opacity
  // has been applied, from el up to <html>, over the canvas.
  function paint(el, start, fl) {
    let Lc = start;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const bg = P(cs.backgroundColor);
      if (bg === null) fl.add('unparsed-bg:' + cs.backgroundColor);
      else Lc = over(Lc, bg);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') fl.add('bg-image@' + name(n));
      const o = +cs.opacity;
      if (o < 1) { Lc = [Lc[0], Lc[1], Lc[2], Lc[3] * o]; fl.add('opacity' + o + '@' + name(n)); }
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') fl.add('blend@' + name(n));
      if (cs.filter && cs.filter !== 'none') fl.add('filter:' + cs.filter + '@' + name(n));
    }
    return over(Lc, CANVAS);
  }
  const name = n => {
    if (!n || n.nodeType !== 1) return '?';
    const c = typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '';
    const cls = c.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    return n.localName + (n.id ? '#' + n.id : '') + (cls ? '.' + cls : '');
  };
  const ctx = el => {
    const parts = [];
    for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
      const nm = name(n);
      if (parts.length === 0 || /[.#]/.test(nm)) parts.push(nm);
    }
    return parts.join(' < ');
  };
  const effOpacity = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  function visible(el) {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (effOpacity(el) < 0.02) return false;
    // clipped away by an ancestor that hides overflow, or by clip / clip-path
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = getComputedStyle(n);
      if (c.clip && c.clip !== 'auto' && /rect\(0px,? 0px,? 0px,? 0px\)|rect\(1px/.test(c.clip)) return false;
      if (n !== el && c.overflow !== 'visible' && (c.overflowX !== 'visible' || c.overflowY !== 'visible')) {
        const q = n.getBoundingClientRect();
        if (r.right <= q.left + 0.5 || r.left >= q.right - 0.5 || r.bottom <= q.top + 0.5 || r.top >= q.bottom - 0.5) return false;
      }
    }
    // off the page to the side (a sheet parked off screen)
    const W = document.documentElement.clientWidth;
    if (r.right <= 0 || r.left >= W) return false;
    return true;
  }
  // Fixed full-screen layers that dim what is under them (sheet backdrop,
  // tour scrim). Text under one is not read; text above one is.
  function overlays() {
    const vw = innerWidth, vh = innerHeight, out = [];
    for (const n of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(n);
      if (cs.position !== 'fixed' || !n.getClientRects().length || cs.visibility === 'hidden') continue;
      const r = n.getBoundingClientRect();
      if (r.width < vw * 0.95 || r.height < vh * 0.9) continue;
      const bg = P(cs.backgroundColor);
      if ((bg && bg[3] > 0) || (cs.backgroundImage && cs.backgroundImage !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none')) {
        if (effOpacity(n) < 0.02) continue;
        out.push({ n, z: zOf(n) });
      }
    }
    return out;
  }
  const zOf = el => { let z = 0; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.position !== 'static' && cs.zIndex !== 'auto') z = Math.max(z, +cs.zIndex); } return z; };
  function occluded(el, OV) {
    for (const o of OV) {
      if (o.n === el || o.n.contains(el)) continue;
      const z = zOf(el);
      const after = !!(o.n.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (z > o.z || (z === o.z && after)) continue;
      return true;
    }
    return false;
  }
  const wghtOf = cs => { const m = /"wght"\s+([\d.]+)/.exec(cs.fontVariationSettings || ''); return m ? +m[1] : +cs.fontWeight; };

  function collect(scene) {
    const rows = new Map();
    const add = (kind, el, fg, bg, extra = {}) => {
      const fl = extra.fl || new Set();
      const r = +CR(fg, bg).toFixed(2);
      const k = [kind, ctx(el), hex(fg), hex(bg), extra.size || ''].join('|');
      const x = rows.get(k);
      if (x) { x.n++; return; }
      rows.set(k, { scene, kind, ctx: ctx(el), fg: hex(fg), bg: hex(bg), ratio: r, n: 1, ...extra, fl: [...fl].slice(0, 6) });
    };
    const OV = overlays();
    const all = [...document.body.querySelectorAll('*')];
    for (const el of all) {
      if (el.closest('head, script, style, noscript, template')) continue;
      if (!visible(el)) continue;
      if (OV.length && occluded(el, OV)) continue;
      const cs = getComputedStyle(el);
      const isSvg = el instanceof SVGElement;
      // ---- text: own text nodes (HTML) ----
      if (!isSvg) {
        let own = '';
        for (const t of el.childNodes) if (t.nodeType === 3) own += t.textContent;
        own = own.replace(/\s+/g, ' ').trim();
        const isField = /^(input|textarea|select)$/.test(el.localName);
        let txt = own, col = cs.color;
        if (isField) {
          if (el.localName === 'select') txt = (el.selectedOptions[0] || {}).textContent || '';
          else if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'range' || el.type === 'hidden' || el.type === 'file') txt = '';
          else txt = el.value || '';
        }
        const fs = parseFloat(cs.fontSize), w = wghtOf(cs);
        const large = fs >= 24 || (fs >= 18.66 && w >= 700);
        const largeIos = fs >= 18 || (fs >= 14 && w >= 700);
        if (txt && cs.color) {
          const fl = new Set();
          const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
          if (fill !== cs.color) fl.add('text-fill:' + fill);
          const fgC = P(fill);
          if (fgC && fgC[3] > 0) {
            const fgP = paint(el, fgC, fl), bgP = paint(el, [0, 0, 0, 0], fl);
            add('text', el, fgP, bgP, { fl, size: fs + '/' + w, fs, w, large, largeIos, text: txt.slice(0, 48), raw: fill });
          } else if (fgC) fl.add('transparent-text');
        }
        if (isField && el.placeholder && !el.value && el.type !== 'hidden') {
          const pcs = getComputedStyle(el, '::placeholder');
          const fl = new Set(['placeholder']);
          const fgC = P(pcs.color);
          if (fgC && fgC[3] > 0) add('placeholder', el, paint(el, fgC, fl), paint(el, [0, 0, 0, 0], fl), { fl, size: fs + '/' + w, fs, w, large, largeIos, text: el.placeholder.slice(0, 48), raw: pcs.color });
        }
        // pseudo-elements: text content, or a painted block (knob, rail, dot)
        for (const ps of ['::before', '::after']) {
          const p = getComputedStyle(el, ps);
          if (!p.content || p.content === 'none' || p.content === 'normal' || p.display === 'none') continue;
          const fl = new Set([ps]);
          const content = p.content.replace(/^"|"$/g, '');
          if (content && !/^(counter|url|attr)/.test(p.content)) {
            const fgC = P(p.color); const pfs = parseFloat(p.fontSize), pw = wghtOf(p);
            if (fgC && fgC[3] > 0 && content.trim()) add('text', el, paint(el, fgC, fl), paint(el, [0, 0, 0, 0], fl), { fl, size: pfs + '/' + pw, fs: pfs, w: pw, large: pfs >= 24 || (pfs >= 18.66 && pw >= 700), largeIos: pfs >= 18 || (pfs >= 14 && pw >= 700), text: ps + ' ' + content.slice(0, 20), raw: p.color });
          }
          const bgC = P(p.backgroundColor);
          if (bgC && bgC[3] > 0 && parseFloat(p.width) > 0 && parseFloat(p.height) > 0) {
            const pw = parseFloat(p.width), ph = parseFloat(p.height);
            add('pseudo-fill', el, paint(el, bgC, fl), paint(el, [0, 0, 0, 0], fl), { fl, size: Math.round(pw) + 'x' + Math.round(ph), raw: p.backgroundColor, pos: p.position });
          }
          if (p.backgroundImage && p.backgroundImage !== 'none') {
            for (const m of p.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) {
              const c = P(m[0]); if (c && c[3] > 0) add('pseudo-gradient-stop', el, paint(el, c, fl), paint(el, [0, 0, 0, 0], fl), { fl, raw: m[0] });
            }
          }
          const bw = parseFloat(p.borderTopWidth) || parseFloat(p.borderLeftWidth);
          if (bw > 0 && p.borderTopStyle !== 'none') { const bc = P(p.borderTopColor); if (bc && bc[3] > 0) add('pseudo-border', el, paint(el, bc, fl), paint(el, [0, 0, 0, 0], fl), { fl, raw: p.borderTopColor, size: bw + 'px' }); }
        }
        // ---- CSS marks: a painted box with no text of its own ----
        const bgC = P(cs.backgroundColor);
        const r = el.getBoundingClientRect();
        const parent = el.parentElement;
        if (bgC && bgC[3] > 0 && !el.textContent.trim() && parent) {
          const fl = new Set();
          const mine = paint(el, [0, 0, 0, 0], fl), under = paint(parent, [0, 0, 0, 0], fl);
          if (CR(mine, under) < 1.005 && hex(mine) === hex(under)) {} else
            add('mark', el, mine, under, { fl, size: Math.round(r.width) + 'x' + Math.round(r.height), raw: cs.backgroundColor });
        }
        if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage) && parent) {
          for (const m of cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) {
            const c = P(m[0]); const fl = new Set(['gradient']);
            if (c && c[3] > 0) add('gradient-stop', el, paint(el, c, fl), paint(el, [0, 0, 0, 0], fl), { fl, raw: m[0], size: Math.round(r.width) + 'x' + Math.round(r.height) });
          }
        }
        // ---- edges: borders, outlines, spread-only rings ----
        const sides = ['Top', 'Right', 'Bottom', 'Left'];
        const seen = new Set();
        for (const s of sides) {
          const bw = parseFloat(cs['border' + s + 'Width']);
          if (!(bw > 0) || cs['border' + s + 'Style'] === 'none' || cs['border' + s + 'Style'] === 'hidden') continue;
          const bc = P(cs['border' + s + 'Color']);
          if (!bc || bc[3] === 0) continue;
          const key = cs['border' + s + 'Color'] + bw;
          if (seen.has(key)) continue; seen.add(key);
          const fl = new Set(['border-' + s.toLowerCase()]);
          const outer = parent ? paint(parent, [0, 0, 0, 0], fl) : CANVAS;
          const inner = paint(el, [0, 0, 0, 0], fl);
          const edge = parent ? paint(parent, bc, new Set()) : over(bc, CANVAS);
          add('border', el, edge, outer, { fl, size: bw + 'px', raw: cs['border' + s + 'Color'], inner: hex(inner), vsInner: +CR(edge, inner).toFixed(2), fillVsOuter: +CR(inner, outer).toFixed(2), tag: el.localName, control: /^(input|select|textarea|button)$/.test(el.localName) || el.getAttribute('role') === 'switch' });
        }
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
          const oc = P(cs.outlineColor);
          if (oc && oc[3] > 0 && parent) add('outline', el, paint(parent, oc, new Set()), paint(parent, [0, 0, 0, 0], new Set()), { size: cs.outlineWidth, raw: cs.outlineColor });
        }
        if (cs.boxShadow && cs.boxShadow !== 'none' && parent) {
          for (const sh of cs.boxShadow.split(/,(?![^(]*\))/)) {
            const cm = sh.match(/rgba?\([^)]+\)/); if (!cm) continue;
            const nums = sh.replace(cm[0], '').replace('inset', '').trim().split(/\s+/).map(parseFloat);
            const [x, y, blur, spread] = nums;
            if (blur || !spread) continue;   // a ring: spread only
            const c = P(cm[0]);
            if (!c || !c[3]) continue;
            const inset = /inset/.test(sh);
            const fl = new Set([inset ? 'inset-ring' : 'ring']);
            const base = inset ? el : parent;
            add('ring', el, paint(base, c, new Set()), paint(inset ? el : parent, [0, 0, 0, 0], new Set()), { fl, size: spread + 'px', raw: cm[0], inner: hex(paint(el, [0, 0, 0, 0], new Set())) });
          }
        }
      } else {
        // ---- SVG: text, and every shape's stroke and fill ----
        const svgRoot = el.ownerSVGElement || el;
        const host = svgRoot.parentElement;
        if (!host) continue;
        const fl = new Set(['svg']);
        const under = paint(host, [0, 0, 0, 0], fl);
        const op = +cs.opacity * (() => { let o = 1; for (let n = el.parentElement; n && n !== host; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; })();
        if (el.localName === 'text' || el.localName === 'tspan') {
          let own = ''; for (const t of el.childNodes) if (t.nodeType === 3) own += t.textContent;
          own = own.trim();
          const f = P(cs.fill);
          if (own && f && f[3] > 0) {
            const fs = parseFloat(cs.fontSize), w = wghtOf(cs);
            const fo = +cs.fillOpacity;
            add('svg-text', el, paint(host, [f[0], f[1], f[2], f[3] * fo * op], fl), under, { fl, size: fs + '/' + w, fs, w, large: fs >= 24 || (fs >= 18.66 && w >= 700), largeIos: fs >= 18 || (fs >= 14 && w >= 700), text: own.slice(0, 40), raw: cs.fill, svgCtx: ctx(svgRoot) });
          }
        } else if (/^(path|circle|rect|line|polyline|polygon|ellipse)$/.test(el.localName)) {
          const s = P(cs.stroke), sw = parseFloat(cs.strokeWidth);
          if (s && s[3] > 0 && sw > 0) add('svg-stroke', el, paint(host, [s[0], s[1], s[2], s[3] * +cs.strokeOpacity * op], fl), under, { fl, size: sw + 'sw', raw: cs.stroke, svgCtx: ctx(svgRoot) });
          const f = P(cs.fill);
          if (f && f[3] > 0 && cs.fill !== 'none') add('svg-fill', el, paint(host, [f[0], f[1], f[2], f[3] * +cs.fillOpacity * op], fl), under, { fl, raw: cs.fill, svgCtx: ctx(svgRoot) });
        }
      }
    }
    return { scene, overlays: OV.map(o => name(o.n) + ' z' + o.z), rows: [...rows.values()] };
  }

  // Every :focus / :focus-visible / :focus-within / :active rule in effect,
  // resolved on (up to 3 of) the visible elements its selector matches with
  // the state stripped. Declared values are resolved with a probe child, so
  // var() and currentColor mean what they mean there.
  function states(scene) {
    const out = [];
    const rules = [];
    const walk = list => { for (const r of list) {
      if (r.cssRules && (r.media ? matchMedia(r.media.mediaText).matches : true) && !(r instanceof CSSStyleRule)) { walk(r.cssRules); continue; }
      if (r instanceof CSSStyleRule && /:(focus|focus-visible|focus-within|active)\b/.test(r.selectorText)) rules.push(r);
    } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    const OV = overlays();
    for (const r of rules) {
      for (const sel of r.selectorText.split(/,(?![^(]*\))/)) {
        if (!/:(focus|focus-visible|focus-within|active)\b/.test(sel)) continue;
        const base = sel.replace(/:(focus-visible|focus-within|focus|active)\b/g, '').replace(/:not\(\s*\)/g, '').trim() || '*';
        let els = [];
        try { els = [...document.querySelectorAll(base)].filter(e => visible(e) && !(OV.length && occluded(e, OV))).slice(0, 3); } catch { continue; }
        for (const el of els) {
          const st = r.style;
          const probe = document.createElement('span');
          probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
          el.appendChild(probe);
          const res = {};
          for (const p of ['color', 'background-color', 'background', 'border-color', 'border-top-color', 'border-bottom-color', 'outline-color', 'outline', 'box-shadow', 'border']) {
            const v = st.getPropertyValue(p);
            if (!v) continue;
            if (p === 'background' || p === 'outline' || p === 'border') { const m = v.match(/(rgba?\([^)]*\)|var\([^)]*\)|#[0-9a-f]{3,8}\b|currentColor)/i); if (!m) continue; probe.style.color = m[1]; res[p] = getComputedStyle(probe).color; probe.style.color = ''; continue; }
            if (p === 'box-shadow') { probe.style.boxShadow = v; res[p] = getComputedStyle(probe).boxShadow; probe.style.boxShadow = ''; continue; }
            probe.style.color = v; res[p] = getComputedStyle(probe).color; probe.style.color = '';
          }
          probe.remove();
          if (!Object.keys(res).length) continue;
          const cs = getComputedStyle(el);
          const fl = new Set();
          const under = el.parentElement ? paint(el.parentElement, [0, 0, 0, 0], fl) : CANVAS;
          const ownBg = paint(el, [0, 0, 0, 0], fl);
          const bgDecl = res['background-color'] || res.background;
          let bgState = ownBg;
          if (bgDecl) { const c = P(bgDecl); if (c) bgState = over(c, under); }
          const row = { scene, rule: sel.trim().slice(0, 140), el: ctx(el), decl: res, under: hex(under), bgState: hex(bgState) };
          let own = ''; for (const t of el.childNodes) if (t.nodeType === 3) own += t.textContent;
          const hasText = !!el.textContent.trim();
          if (hasText) {
            const tc = P(res.color || cs.color);
            if (tc) { const fg = over(tc, bgState); row.textRatio = +CR(fg, bgState).toFixed(2); row.text = hex(fg); row.fs = parseFloat(cs.fontSize); row.w = wghtOf(cs); }
          }
          for (const k of ['outline-color', 'outline', 'border-color', 'border-top-color', 'border-bottom-color', 'border']) if (res[k]) { const c = P(res[k]); if (c && c[3] > 0) { const e = over(c, under); row.edge = hex(e); row.edgeRatio = +CR(e, under).toFixed(2); row.edgeVsFill = +CR(e, bgState).toFixed(2); } }
          if (res['box-shadow'] && res['box-shadow'] !== 'none') {
            const m = res['box-shadow'].match(/rgba?\([^)]+\)/);
            if (m) { const c = P(m[0]); const e = over(c, under); row.ring = hex(e); row.ringRatio = +CR(e, under).toFixed(2); }
          }
          if (bgDecl) row.stateVsUnder = +CR(bgState, under).toFixed(2);
          out.push(row);
        }
      }
    }
    return out;
  }
  return { collect, states };
})();
