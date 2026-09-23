window.__h = {
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async settle(ms) { await __h.sleep(ms); },
  async until(fn, ms = 5000) {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = fn(); if (v) return v; } catch {} await __h.sleep(50); }
    throw new Error('timeout waiting for ' + String(fn).slice(0, 120));
  },
  vis(n) { return !!(n && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden'); },
  norm(t) { return (t || '').replace(/\s+/g, ' ').trim().toLowerCase(); },
  find(text, scope, sel) {
    const all = [...(scope || document).querySelectorAll(sel || 'button, a, [role=button], .add-tile, .coach-card, .set-row, .you-row, .hub-row, li, .person, .row')];
    const t = __h.norm(text);
    return all.filter(__h.vis).find(b => __h.norm(b.textContent) === t) || all.filter(__h.vis).find(b => __h.norm(b.textContent).startsWith(t));
  },
  async click(text, scope, sel) { const b = await __h.until(() => __h.find(text, scope, sel)); b.click(); await __h.sleep(450); return true; },
  async clickSel(sel) { const b = await __h.until(() => [...document.querySelectorAll(sel)].find(__h.vis)); b.click(); await __h.sleep(450); return true; },
  top() { const s = [...document.querySelectorAll('.sheet')]; return s[s.length - 1] || null; },
  async closeAll() { for (let i = 0; i < 6; i++) { const b = [...document.querySelectorAll('.sheet-backdrop')].pop(); if (!b) break; b.click(); await __h.sleep(300); } },
  async dock(v) { document.querySelector('.dock button[data-view="' + v + '"]').click(); await __h.sleep(700); },
  buttonsIn(scope) { return [...(scope || document).querySelectorAll('button')].filter(__h.vis).map(b => __h.norm(b.textContent).slice(0, 40)); },
  measure(scene) {
    const seen = {};
    const out = [];
    document.querySelectorAll('.btn').forEach(b => {
      if (!__h.vis(b)) return;
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(b);
      const lineTops = new Set([...range.getClientRects()].filter(x => x.width > 0.5).map(x => Math.round(x.top)));
      const chain = [];
      let p = b.parentElement;
      while (p && p !== document.body && chain.length < 5) {
        const cls = typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\s+/)[0] : (p.id ? '#' + p.id : p.tagName.toLowerCase());
        chain.push(cls); p = p.parentElement;
      }
      // Clipped: any ancestor that hides overflow and does not contain the
      // button's box. A scroll container counts only if the button is beyond
      // its scrollable content box, which cannot happen — so hidden/clip only.
      let clipped = null;
      p = b.parentElement;
      while (p && p !== document.documentElement) {
        const s = getComputedStyle(p);
        if (/hidden|clip/.test(s.overflowX + ' ' + s.overflowY)) {
          const pr = p.getBoundingClientRect();
          if (r.top < pr.top - .5 || r.bottom > pr.bottom + .5 || r.left < pr.left - .5 || r.right > pr.right + .5) { clipped = (p.className || p.tagName) + ''; break; }
        }
        p = p.parentElement;
      }
      const par = b.parentElement.getBoundingClientRect();
      // Spills: the button's box is not inside its parent's or grandparent's —
      // what a fixed-height container with visible overflow would show.
      const gp = b.parentElement.parentElement ? b.parentElement.parentElement.getBoundingClientRect() : par;
      // A scroll container's rect is its window, not its content: a button
      // below the fold is scrolled, not spilled.
      const scroller = n => n && /auto|scroll/.test(getComputedStyle(n).overflowY);
      const out1 = q => r.top < q.top - .5 || r.bottom > q.bottom + .5;
      const P = b.parentElement, G = P.parentElement;
      const spill = (!scroller(P) && out1(par)) ? 'parent' : (G && !scroller(G) && !scroller(P) && out1(gp)) ? 'grandparent' : null;
      const text = __h.norm(b.textContent).slice(0, 32);
      const base = scene + ' | ' + chain.slice(0, 3).join(' < ') + ' | ' + b.className + ' | ' + text;
      seen[base] = (seen[base] || 0) + 1;
      out.push({
        key: base + ' #' + seen[base],
        w: +r.width.toFixed(2), h: +r.height.toFixed(2), x: +(r.left - par.left).toFixed(2), y: +(r.top - par.top).toFixed(2),
        lines: lineTops.size, spill, overflowX: b.scrollWidth > b.clientWidth + 1, clipped,
        pw: +par.width.toFixed(2), ph: +par.height.toFixed(2),
        vw: innerWidth, offRight: r.right > innerWidth + .5, offLeft: r.left < -.5,
        minH: cs.minHeight, fs: cs.fontSize, pad: cs.paddingTop + ' ' + cs.paddingBottom, bw: cs.borderTopWidth
      });
    });
    const sheets = [...document.querySelectorAll('.sheet')].filter(__h.vis).map(sh => ({ cls: sh.className, ch: sh.clientHeight, sh: sh.scrollHeight, ov: getComputedStyle(sh).overflowY }));
    out.push({ key: scene + ' | __sheets', sheets, page: document.documentElement.scrollHeight, w: 0, h: 44, x: 0, lines: 0 });
    return out;
  }
};
true;
