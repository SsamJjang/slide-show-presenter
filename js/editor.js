/* ============================================================
   The editor.

   A scene is yours: click anything to select it, drag to move it,
   pull a handle to resize it, double-click text to retype it or an
   image box to fill it. "+ Element" adds more — type, images and
   video, sculptures, liquid, orbs, glows, countdowns, pills. A small
   toolbar over the selection holds only that element's choices.

   Keys:  Delete remove · arrows nudge (Shift ×10) · Ctrl+D duplicate
          Esc deselect · Ctrl+Z undo · N add scene · Ctrl+Enter present
          With nothing selected, ↑ ↓ move between scenes.
   ============================================================ */

const Editor = (() => {
  const $ = (id) => document.getElementById(id);
  const list = $('list'), stage = $('stage'), wrap = $('stageWrap'), bar = $('scenebar');
  const sheet = $('sheet'), gallery = $('gallery'), fileIn = $('file'), title = $('title');

  let cur = 0;
  let sel = null;                 // selected element id
  let stageRelease = null;
  let k = .5;                     // stage scale: screen px per design px

  const scenes = () => Deck.deck.scenes;
  const scene = () => scenes()[cur];
  const elOf = (id) => scene()?.els.find(e => e.id === id);
  const nodeOf = (id) => stage.querySelector(`.el[data-id="${id}"]`);

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2400);
  }

  /* ================= scene list ================= */

  function renderList() {
    list.innerHTML = '';
    scenes().forEach((s, i) => {
      const it = document.createElement('div');
      it.className = 'item' + (i === cur ? ' on' : '');
      it.draggable = true;
      it.dataset.i = i;
      const name = (Scenes.LAYOUTS[s.layout] || Scenes.LAYOUTS.blank).name;
      it.innerHTML = `<span class="num">${i + 1}</span><div class="thumb"></div><div class="name">${Scenes.esc(name)}</div>` +
        `<div class="acts"><button data-a="dup" title="Duplicate scene">⧉</button><button data-a="del" title="Delete scene">✕</button></div>`;
      list.appendChild(it);
      Scenes.mount(it.querySelector('.thumb'), s, { still: true });
    });
    const add = document.createElement('button');
    add.className = 'list-add'; add.textContent = '+ Add scene';
    add.onclick = openGallery;
    list.appendChild(add);
    list.querySelector('.item.on')?.scrollIntoView({ block: 'nearest' });
  }
  const refreshThumb = () => {
    const t = list.querySelector(`.item[data-i="${cur}"] .thumb`);
    if (t) Scenes.mount(t, scene(), { still: true });
  };

  list.addEventListener('click', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    const i = +it.dataset.i, a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'dup') return dupScene(i);
    if (a === 'del') return delScene(i);
    go(i);
  });
  let dragFrom = null;
  list.addEventListener('dragstart', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    dragFrom = +it.dataset.i; it.classList.add('drag'); e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    if (dragFrom === null) return;
    e.preventDefault();
    const it = e.target.closest('.item');
    list.querySelectorAll('.item').forEach(x => x.classList.toggle('over', x === it));
  });
  list.addEventListener('dragend', () => { dragFrom = null; list.querySelectorAll('.item').forEach(x => x.classList.remove('drag', 'over')); });
  list.addEventListener('drop', (e) => {
    const it = e.target.closest('.item');
    if (dragFrom === null || !it) return;
    e.preventDefault();
    const to = +it.dataset.i, from = dragFrom;
    if (to === from) return;
    Deck.change(d => { const [m] = d.scenes.splice(from, 1); d.scenes.splice(to, 0, m); });
    go(to);
  });

  /* ================= stage ================= */

  function fitStage() {
    const cs = getComputedStyle(wrap);
    const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const w = Math.max(200, Math.min(aw, ah * 16 / 9));
    stage.style.width = w + 'px';
    stage.style.height = w * 9 / 16 + 'px';
    k = w / 1920;
    const host = stage.querySelector('.scene-host');
    if (host) host.style.transform = `scale(${k})`;
    drawSel();
  }

  function renderStage() {
    stageRelease?.(); stageRelease = null;
    const s = scene();
    if (!s) { stage.innerHTML = ''; return; }
    fitStage();
    Scenes.mount(stage, s);
    stage.insertAdjacentHTML('beforeend',
      `<div class="sel" id="sel" hidden>${['nw', 'ne', 'sw', 'se', 'e', 'w'].map(h => `<i data-h="${h}"></i>`).join('')}</div>` +
      `<div class="guide gv" hidden></div><div class="guide gh" hidden></div>`);
    // Sculptures and liquid are live on the stage, as they will be presented.
    const ctrls = [];
    stage.querySelectorAll('.sculpt[data-sculpt]').forEach(b => {
      const c = document.createElement('canvas'); b.appendChild(c);
      ctrls.push(Sculpture.mount(c, JSON.parse(b.dataset.sculpt)));
      b.classList.add('live');
    });
    stage.querySelectorAll('.mat[data-mat]').forEach(b => {
      const c = document.createElement('canvas'); b.appendChild(c);
      ctrls.push(Moments.material(c, b.dataset.mat));
      b.classList.add('live');
    });
    stage.querySelectorAll('video').forEach(v => v.play().catch(() => {}));
    stageRelease = () => ctrls.forEach(c => c.destroy());
    if (sel && !elOf(sel)) sel = null;
    drawSel();
    renderTools();
  }

  /* Selection box, in stage pixels, from the element's own rendered box. */
  function drawSel() {
    const box = $('sel');
    if (!box) return;
    const n = sel && nodeOf(sel);
    if (!n) { box.hidden = true; return; }
    const r = n.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    box.hidden = false;
    box.style.left = r.left - sr.left + 'px';
    box.style.top = r.top - sr.top + 'px';
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
    const e = elOf(sel);
    box.dataset.kind = e.type === 'pill' ? 'none' : (TYPEY.includes(e.type) ? 'text' : 'box');
    placeTools();
  }

  // Elements made of type: sides change the width, corners scale the type.
  const TYPEY = ['text', 'stat', 'list'];
  const BASE = { text: 0, stat: 220, list: 44, lockup: 96, count: 300 };

  function select(id) {
    if (sel === id) return;
    endEdit();
    sel = id;
    drawSel();
    renderTools();
  }

  /* ---------- move ---------- */
  let drag = null;
  // Images and videos would otherwise start the browser's own drag-and-drop
  // and swallow the move.
  stage.addEventListener('dragstart', (ev) => { if (!editing) ev.preventDefault(); });
  stage.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const h = ev.target.closest('.sel i[data-h]');
    if (h) return startResize(ev, h.dataset.h);
    if (ev.target.closest('[contenteditable="plaintext-only"]')) return;      // typing
    const n = ev.target.closest('.el');
    ev.preventDefault();
    if (!n) { select(null); return; }
    const again = sel === n.dataset.id;          // a second click on the selection edits it
    select(n.dataset.id);
    const e = elOf(sel);
    drag = { mode: 'move', id: e.id, sx: ev.clientX, sy: ev.clientY, x: e.x, y: e.y, moved: false, again, hit: ev.target, orig: { ...e } };
    stage.setPointerCapture(ev.pointerId);
  });

  function startResize(ev, h) {
    ev.stopPropagation();
    const e = elOf(sel), n = nodeOf(sel);
    const r = n.getBoundingClientRect();
    drag = { mode: 'resize', h, id: e.id, sx: ev.clientX, sy: ev.clientY,
             x: e.x, y: e.y, w: e.w ?? r.width / k, h0: e.h ?? r.height / k, size: e.size, orig: { ...e } };
    stage.setPointerCapture(ev.pointerId);
  }

  const SNAP = 10;
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const dx = (ev.clientX - drag.sx) / k, dy = (ev.clientY - drag.sy) / k;
    const e = elOf(drag.id), n = nodeOf(drag.id);
    if (!e || !n) return;
    if (drag.mode === 'move') {
      if (!drag.moved && Math.hypot(dx, dy) * k < 3) return;
      drag.moved = true;
      let x = Math.round(drag.x + dx), y = Math.round(drag.y + dy);
      // Snap the element's centre to the slide's centre lines.
      const w = n.offsetWidth, hh = n.offsetHeight;
      const gv = Math.abs(x + w / 2 - 960) < SNAP, gh = Math.abs(y + hh / 2 - 540) < SNAP;
      if (gv) x = Math.round(960 - w / 2);
      if (gh) y = Math.round(540 - hh / 2);
      stage.querySelector('.gv').hidden = !gv;
      stage.querySelector('.gh').hidden = !gh;
      e.x = x; e.y = y;
      n.style.left = x + 'px'; n.style.top = y + 'px';
    } else {
      resizeTo(e, n, dx, dy, ev.shiftKey);
    }
    drawSel();
  });

  /* Resizing means different things per element: text boxes change width
     from the sides and scale their type from the corners; images, forms
     and glows change their box (corners keep the shape unless Shift). */
  function resizeTo(e, n, dx, dy, free) {
    const H = drag.h;
    const left = H.includes('w'), top = H.includes('n'), corner = H.length === 2;
    if (e.type in BASE) {
      if (!corner && TYPEY.includes(e.type)) {
        const w = Math.max(80, drag.w + (left ? -dx : dx));
        e.w = Math.round(w); if (left) e.x = Math.round(drag.x + drag.w - w);
        n.style.width = e.w + 'px'; n.style.left = e.x + 'px';
        return;
      }
      // Corners: scale the type.
      const base = drag.size || (e.type === 'text' ? Scenes.TEXT_STYLES[e.style].size : BASE[e.type]);
      const f = Math.max(.15, (drag.w + (left ? -dx : dx)) / drag.w);
      e.size = Math.round(base * f);
      if (TYPEY.includes(e.type)) { e.w = Math.round(drag.w * f); if (left) e.x = Math.round(drag.x + drag.w - e.w); }
      n.innerHTML = Scenes.body(e);
      n.style.width = e.w + 'px'; n.style.left = e.x + 'px';
      return;
    }
    let w = drag.w + (left ? -dx : dx), h = drag.h0 + (top ? -dy : dy);
    if (H === 'e' || H === 'w') h = drag.h0;
    if (corner && !free && e.type !== 'media') {
      const f = Math.max(w / drag.w, h / drag.h0);
      w = drag.w * f; h = drag.h0 * f;
    }
    w = Math.max(40, w); h = Math.max(40, h);
    e.w = Math.round(w); e.h = Math.round(h);
    if (left) e.x = Math.round(drag.x + drag.w - w);
    if (top) e.y = Math.round(drag.y + drag.h0 - h);
    Object.assign(n.style, { left: e.x + 'px', top: e.y + 'px', width: e.w + 'px', height: e.h + 'px' });
  }

  stage.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    stage.querySelector('.gv') && (stage.querySelector('.gv').hidden = true);
    stage.querySelector('.gh') && (stage.querySelector('.gh').hidden = true);
    if (d.mode === 'move' && !d.moved) { if (d.again) startEdit(d.id, d.hit); return; }
    // The element was changed live while dragging. Put it back, then apply
    // the result through the deck, so the whole gesture is one undo step.
    const e = elOf(d.id), now = { ...e };
    Object.keys(e).forEach(key => { if (!(key in d.orig)) delete e[key]; });
    Object.assign(e, d.orig);
    Deck.change(() => Object.assign(elOf(d.id), now));
  });

  /* ---------- edit text / fill media ---------- */
  let editing = null;
  /* Double-click, a click on what is already selected, or Enter starts
     typing. The stage holds pointer capture while you press (for dragging),
     which retargets clicks to the stage itself, so the element is found
     from the pointer position, not from the event target. */
  stage.addEventListener('dblclick', (ev) => {
    // Editing may have started on the first click of this double-click; the
    // browser's own double-click then selects one word. Select it all again.
    if (editing) { if (performance.now() - editing.t < 700) document.getSelection().selectAllChildren(editing.node); return; }
    const hit = document.elementFromPoint(ev.clientX, ev.clientY);
    const n = hit?.closest('#stage .el') || nodeOf(sel);
    if (n) startEdit(n.dataset.id, hit);
  });
  /* `at` picks which text to type into when an element has several (a
     card's title or its line); otherwise the first. */
  function startEdit(id, at = null) {
    if (editing) return;
    const e = elOf(id), n = nodeOf(id);
    if (!e || !n) return;
    if (e.type === 'media') return pick(e.id);
    if (e.type === 'count') {                     // the time is typed in the toolbar
      const inp = tools.querySelector('[data-set="text"]');
      if (inp) { inp.focus(); inp.select(); }
      return;
    }
    if (sel !== id) select(id);
    const node = nodeOf(id);
    const t = (at && node?.contains(at) && at.closest('[data-edit]')) || node?.querySelector('[data-edit]');
    if (!t) return;
    // A list is typed as plain lines, one item per line.
    if (e.type === 'list') { t.textContent = e.text; t.classList.add('raw'); }
    editing = { id: e.id, node: t, t: performance.now() };
    t.contentEditable = 'plaintext-only'; t.spellcheck = false;
    t.focus();
    document.getSelection().selectAllChildren(t);
    $('sel').classList.add('editing');
  }
  stage.addEventListener('keydown', (ev) => {
    if (!editing) return;
    const e = elOf(editing.id);
    if (ev.key === 'Escape' || (ev.key === 'Enter' && (!['text', 'list', 'card'].includes(e.type) || ev.ctrlKey))) {
      ev.preventDefault(); ev.stopPropagation();   // ends typing; keeps the element selected
      endEdit();
    }
  });
  stage.addEventListener('input', () => { if (editing) drawSel(); });
  stage.addEventListener('focusout', (ev) => { if (editing && ev.target === editing.node) endEdit(); });
  function endEdit() {
    if (!editing) return;
    const { id, node } = editing; editing = null;
    node.contentEditable = 'false';
    $('sel')?.classList.remove('editing');
    const text = node.innerText.replace(/\n$/, '');
    const field = node.dataset.edit || 'text';
    const e = elOf(id);
    if (e && e[field] !== text) Deck.change(() => { elOf(id)[field] = text; });
    else if (e && e.type === 'list') { const n = nodeOf(id); if (n) n.innerHTML = Scenes.body(e); }
  }

  let pickFor = null;
  function pick(id) {
    pickFor = id; fileIn.accept = 'image/*,video/*'; fileIn.value = ''; fileIn.onchange = null; fileIn.click();
  }
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0];
    if (f && pickFor) await setMedia(pickFor, f);
    pickFor = null;
  });
  stage.addEventListener('dragover', (ev) => {
    if (!ev.dataTransfer.types.includes('Files')) return;
    ev.preventDefault();
    const n = ev.target.closest('.el-media');
    stage.querySelectorAll('.el-media.drop').forEach(x => x !== n && x.classList.remove('drop'));
    n?.classList.add('drop');
  });
  stage.addEventListener('drop', async (ev) => {
    const f = ev.dataTransfer.files?.[0];
    if (!f) return;
    ev.preventDefault();
    stage.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
    const n = ev.target.closest('.el-media');
    if (n) return setMedia(n.dataset.id, f);
    // Dropped anywhere else: a new image or video where it landed.
    const sr = stage.getBoundingClientRect();
    const e = Scenes.E.media(0, 0, 800, 520, { fit: 'cover', round: true });
    e.x = Math.round((ev.clientX - sr.left) / k - 400); e.y = Math.round((ev.clientY - sr.top) / k - 260);
    e.ref = await mediaRef(f); if (!e.ref) return;
    Deck.change(() => scene().els.push(e));
    sel = e.id; renderAll();
  });
  async function mediaRef(f) {
    if (!/^(image|video)\//.test(f.type)) { toast('That isn’t an image or a video'); return null; }
    return Media.put(f);
  }
  async function setMedia(id, f) {
    const ref = await mediaRef(f); if (!ref) return;
    Deck.change(() => { elOf(id).ref = ref; });
  }

  /* ================= selection toolbar ================= */

  const tools = document.createElement('div');
  tools.className = 'tools'; tools.hidden = true;
  wrap.appendChild(tools);

  const seg = (key, cur, opts) => `<span class="tseg">${opts.map(([v, l]) =>
    `<button data-set="${key}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
  const sep = '<i class="tsep"></i>';
  const ICON = {
    left: '<svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h8M2 12h11"/></svg>',
    center: '<svg viewBox="0 0 16 16"><path d="M2 4h12M4 8h8M3 12h10"/></svg>',
    right: '<svg viewBox="0 0 16 16"><path d="M2 4h12M6 8h8M3 12h11"/></svg>',
    front: '<svg viewBox="0 0 16 16"><rect x="5" y="2" width="9" height="9" rx="2"/><path d="M2 6v6a2 2 0 0 0 2 2h6"/></svg>',
    back: '<svg viewBox="0 0 16 16"><rect x="2" y="5" width="9" height="9" rx="2"/><path d="M6 2h6a2 2 0 0 1 2 2v6"/></svg>',
    dup: '<svg viewBox="0 0 16 16"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M2 11V4a2 2 0 0 1 2-2h7"/></svg>',
    del: '<svg viewBox="0 0 16 16"><path d="M3 4h10M6 4V2.5h4V4M4.5 4l.7 9.5h5.6l.7-9.5"/></svg>',
  };

  function renderTools() {
    const e = sel && elOf(sel);
    if (!e) { tools.hidden = true; return; }
    let h = '';
    if (e.type === 'text') {
      h += `<select data-set="style" class="tsel">${Object.entries(Scenes.TEXT_STYLES).map(([v, s]) =>
        `<option value="${v}"${e.style === v ? ' selected' : ''}>${s.name}</option>`).join('')}</select>` + sep;
      h += `<span class="tseg">${['left', 'center', 'right'].map(a =>
        `<button data-set="align" data-v="${a}" class="ic${(e.align || 'left') === a ? ' on' : ''}" title="Align ${a}">${ICON[a]}</button>`).join('')}</span>` + sep;
      h += seg('color', e.color || 'auto', Object.entries(Scenes.COLORS));
    } else if (e.type === 'lockup') {
      h += seg('glyph', e.glyph, [['spark', 'Sparkle'], ['mark', 'APEX logo']]);
    } else if (e.type === 'media') {
      h += seg('fit', e.fit, [['cover', 'Fill'], ['contain', 'Fit']]) + sep +
        seg('round', e.round === 'circle' ? 'circle' : !!e.round, [[false, 'Square'], [true, 'Rounded'], ['circle', 'Circle']]) + sep +
        `<button class="tbtn" data-act="replace">Replace…</button>`;
    } else if (e.type === 'sculpture') {
      h += `<select data-set="shape" class="tsel">${[['twist', 'Twist'], ['ribbon', 'Ribbon'], ['lens', 'Lens'], ['pebble', 'Pebble'],
        ['petal', 'Petal'], ['liquid', 'Liquid'], ['orb', 'Orb'], ['silk', 'Silk'], ['plume', 'Plume'],
        ['glass', 'Glass slab'], ['frost', 'Frosted lens']].map(([v, l]) =>
        `<option value="${v}"${e.shape === v ? ' selected' : ''}>${l}</option>`).join('')}</select>` + sep +
        `<button class="tbtn" data-act="rotL" title="Turn left">↺</button><button class="tbtn" data-act="rotR" title="Turn right">↻</button>` +
        (e.shape === 'liquid' ? sep + `<button class="tbtn" data-act="reshuffle">New flow</button>` : '');
    } else if (e.type === 'material') {
      h += `<select data-set="kind" class="tsel">${Object.entries(Moments.MATERIALS).map(([v, l]) =>
        `<option value="${v}"${e.kind === v ? ' selected' : ''}>${l}</option>`).join('')}</select>` + sep +
        seg('soft', !!e.soft, [[false, 'Hard edges'], [true, 'Soft edges']]);
    } else if (e.type === 'shape') {
      h += seg('form', e.form || 'blob', [['blob', 'Blob'], ['circle', 'Circle'], ['pill', 'Pill']]) + sep +
        seg('tint', e.tint || 'iris', Object.entries(Scenes.SHAPE_TINTS));
    } else if (e.type === 'card') {
      h += seg('style', e.style || 'frost', [['frost', 'Frosted'], ['light', 'Light'], ['ink', 'Ink'], ['iris', 'Iris'], ['coral', 'Coral']]);
    } else if (e.type === 'stat') {
      h += `<span class="tseg">${['left', 'center', 'right'].map(a =>
        `<button data-set="align" data-v="${a}" class="ic${(e.align || 'left') === a ? ' on' : ''}" title="Align ${a}">${ICON[a]}</button>`).join('')}</span>` + sep +
        seg('color', e.color || 'auto', Object.entries(Scenes.COLORS));
    } else if (e.type === 'list') {
      h += seg('kind', e.kind || 'dots', [['dots', 'Dots'], ['numbers', 'Numbers']]) + sep +
        seg('color', e.color || 'auto', Object.entries(Scenes.COLORS));
    } else if (e.type === 'glow') {
      h += seg('tint', e.tint || 'iris', [['iris', 'Iris'], ['violet', 'Violet'], ['pink', 'Pink'], ['cyan', 'Cyan'], ['warm', 'Warm']]);
    } else if (e.type === 'count') {
      h += `<label class="tlabel">Time<input class="tin" data-set="text" value="${Scenes.esc(e.text)}" size="5"></label>` + sep +
        seg('tone', e.tone || 'gloss', [['gloss', 'Glossy blue'], ['ink', 'Ink']]) + sep +
        `<span class="tlabel">Last 10 s</span>` + seg('finale', e.finale || 'moments', [['moments', 'Moments'], ['plain', 'Plain']]);
    } else if (e.type === 'pill') {
      h += seg('kind', e.kind, [['live', 'Live'], ['soft', 'Prompt'], ['tag', 'Tag']]);
    }
    h += sep + `<button class="tbtn ic" data-act="front" title="Bring to front">${ICON.front}</button>` +
      `<button class="tbtn ic" data-act="back" title="Send to back">${ICON.back}</button>` +
      `<button class="tbtn ic" data-act="dup" title="Duplicate (Ctrl+D)">${ICON.dup}</button>` +
      `<button class="tbtn ic danger" data-act="del" title="Delete">${ICON.del}</button>`;
    tools.innerHTML = h;
    tools.hidden = false;
    placeTools();
  }

  function placeTools() {
    if (tools.hidden) return;
    const box = $('sel'); if (!box || box.hidden) { tools.style.visibility = 'hidden'; return; }
    tools.style.visibility = '';
    const sr = stage.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), br = box.getBoundingClientRect();
    let top = br.top - wr.top - tools.offsetHeight - 12;
    if (top < 4) top = br.bottom - wr.top + 12;
    let left = br.left - wr.left + br.width / 2 - tools.offsetWidth / 2;
    left = Math.max(4, Math.min(left, wrap.clientWidth - tools.offsetWidth - 4));
    tools.style.top = Math.max(4, Math.min(top, wrap.clientHeight - tools.offsetHeight - 4)) + 'px';
    tools.style.left = left + 'px';
  }

  tools.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  tools.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const e = elOf(sel); if (!e) return;
    if (b.dataset.set) {
      let v = b.dataset.v; if (v === 'true' || v === 'false') v = v === 'true';
      Deck.change(() => { elOf(sel)[b.dataset.set] = v; if (b.dataset.set === 'style') delete elOf(sel).size; });
      return;
    }
    const a = b.dataset.act;
    if (a === 'replace') return pick(e.id);
    if (a === 'rotL' || a === 'rotR') return Deck.change(() => { elOf(sel).roll = (elOf(sel).roll || 0) + (a === 'rotL' ? -15 : 15); });
    if (a === 'reshuffle') return Deck.change(() => { elOf(sel).seed = Math.floor(Math.random() * 40); });
    if (a === 'front' || a === 'back') return Deck.change(() => {
      const els = scene().els, i = els.findIndex(x => x.id === sel), [m] = els.splice(i, 1);
      a === 'front' ? els.push(m) : els.unshift(m);
    });
    if (a === 'dup') return dupEl();
    if (a === 'del') return delEl();
  });
  tools.addEventListener('change', (ev) => {
    const t = ev.target; if (!t.dataset.set) return;
    Deck.change(() => { elOf(sel)[t.dataset.set] = t.value; if (t.dataset.set === 'style') delete elOf(sel).size; });
  });

  function dupEl() {
    const e = elOf(sel); if (!e) return;
    const c = { ...JSON.parse(JSON.stringify(e)), id: Scenes.uid(), x: e.x + 40, y: e.y + 40 };
    Deck.change(() => scene().els.push(c));
    sel = c.id; renderAll();
  }
  function delEl() {
    if (!sel) return;
    const id = sel; sel = null;
    Deck.change(() => { scene().els = scene().els.filter(x => x.id !== id); });
  }

  /* ================= scene bar ================= */

  function renderBar() {
    const s = scene(); if (!s) { bar.innerHTML = ''; return; }
    const l = Scenes.LAYOUTS[s.layout] || Scenes.LAYOUTS.blank;
    bar.innerHTML =
      `<div class="add-wrap"><button class="btn primary sm" id="addEl"><span class="plus"></span>Element</button>` +
      `<div class="pop" id="pop" hidden></div></div>` +
      `<span class="opt">Background<span class="seg">${Scenes.FIELDS.map(([v, n]) =>
        `<button data-f="${v}" class="${s.field === v ? 'on' : ''}">${n}</button>`).join('')}</span></span>` +
      `<span class="opt">Liquid open<button class="switch${s.fx === 'open' ? ' on' : ''}" data-sw="fx"></button></span>` +
      `<span class="opt">Footer<button class="switch${s.footer !== false ? ' on' : ''}" data-sw="footer"></button></span>` +
      (l.hint ? `<span class="hint">${Scenes.esc(l.hint)}</span>` : '') +
      `<textarea class="notes" placeholder="Speaker notes" spellcheck="false">${Scenes.esc(s.notes || '')}</textarea>`;
  }

  bar.addEventListener('click', (ev) => {
    const s = scene();
    const f = ev.target.closest('[data-f]');
    if (f) return Deck.change(() => { s.field = f.dataset.f; });
    const sw = ev.target.closest('[data-sw]');
    if (sw) return Deck.change(() => {
      if (sw.dataset.sw === 'fx') s.fx = s.fx === 'open' ? null : 'open';
      else s.footer = s.footer === false;
    });
    if (ev.target.closest('#addEl')) { ev.stopPropagation(); return togglePop(); }
    const ins = ev.target.closest('[data-ins]');
    if (ins) {
      const made = [].concat(Scenes.INSERTS[+ins.dataset.ins].make());
      $('pop').hidden = true;
      Deck.change(() => scene().els.push(...made));
      sel = made[made.length - 1].id; renderAll();
    }
  });
  bar.addEventListener('input', (ev) => {
    if (!ev.target.classList.contains('notes')) return;
    const s = scene();
    Deck.change(() => { s.notes = ev.target.value; }, { quiet: true, merge: 'notes' + s.id });
  });

  /* "+ Element": every element, drawn small on this scene's field. */
  function togglePop() {
    const pop = $('pop');
    if (!pop.hidden) { pop.hidden = true; return; }
    // Grouped: text, content, media, materials, forms, shapes and light, live.
    let last = '';
    pop.innerHTML = Scenes.INSERTS.map((it, i) => {
      const head = it.group !== last ? `<h4 class="pgroup">${Scenes.esc(it.group)}</h4>` : '';
      last = it.group;
      return head + `<button class="pcard" data-ins="${i}"><div class="pthumb"></div><b>${Scenes.esc(it.name)}</b></button>`;
    }).join('');
    pop.hidden = false;
    pop.querySelectorAll('.pcard').forEach(c => {
      const els = [].concat(Scenes.INSERTS[+c.dataset.ins].make());
      Scenes.mount(c.querySelector('.pthumb'), { field: scene().field, footer: false, els }, { still: true });
    });
  }
  document.addEventListener('pointerdown', (ev) => {
    const pop = $('pop');
    if (pop && !pop.hidden && !ev.target.closest('.add-wrap')) pop.hidden = true;
  });

  /* ================= add scene ================= */

  const GROUPS = ['Start', 'Open', 'Talk', 'Product', 'Demo', 'Close'];
  function openGallery() {
    gallery.innerHTML = GROUPS.map(g => {
      const items = Object.entries(Scenes.LAYOUTS).filter(([, l]) => l.group === g);
      return `<div class="g-group">${g}</div><div class="g-grid">` + items.map(([key, l]) =>
        `<button class="card" data-layout="${key}"><div class="thumb"></div><b>${Scenes.esc(l.name)}</b>` +
        `${l.hint ? `<span>${Scenes.esc(l.hint)}</span>` : ''}</button>`).join('') + `</div>`;
    }).join('');
    sheet.hidden = false;
    gallery.querySelectorAll('.card').forEach(c => Scenes.mount(c.querySelector('.thumb'), Scenes.make(c.dataset.layout), { still: true }));
  }
  gallery.addEventListener('click', (ev) => {
    const c = ev.target.closest('.card'); if (!c) return;
    const s = Scenes.make(c.dataset.layout), at = cur + 1;
    sheet.hidden = true;
    Deck.change(d => d.scenes.splice(at, 0, s));
    go(at);
  });
  $('sheetClose').onclick = () => sheet.hidden = true;
  sheet.addEventListener('click', (ev) => { if (ev.target === sheet) sheet.hidden = true; });

  /* ================= scene ops ================= */

  function go(i) {
    endEdit();
    cur = Math.max(0, Math.min(scenes().length - 1, i));
    sel = null;
    renderAll();
  }
  function dupScene(i) {
    const c = JSON.parse(JSON.stringify(scenes()[i]));
    c.id = Scenes.uid(); c.els.forEach(e => e.id = Scenes.uid());
    Deck.change(d => d.scenes.splice(i + 1, 0, c));
    go(i + 1);
  }
  function delScene(i) {
    if (scenes().length <= 1) return toast('A deck needs at least one scene');
    Deck.change(d => d.scenes.splice(i, 1));
    go(Math.min(i, scenes().length - 1));
    toast('Scene removed — Ctrl+Z brings it back');
  }

  /* ================= top bar ================= */

  $('add').onclick = openGallery;
  $('present').onclick = () => Player.start(cur);
  $('undo').onclick = () => { if (!Deck.undo()) toast('Nothing to undo'); };
  title.addEventListener('input', () => Deck.change(d => { d.title = title.value; }, { quiet: true, merge: 'title' }));
  $('more').onclick = (ev) => { ev.stopPropagation(); $('menu').hidden = !$('menu').hidden; };
  document.addEventListener('click', () => { $('menu').hidden = true; });
  $('menu').addEventListener('click', async (ev) => {
    const m = ev.target.closest('[data-m]')?.dataset.m;
    if (m === 'export') { await Deck.exportFile(); toast('Deck file saved'); }
    if (m === 'import') {
      pickFor = null; fileIn.accept = '.json,application/json'; fileIn.value = '';
      fileIn.onchange = async () => {
        fileIn.onchange = null;
        const f = fileIn.files?.[0]; if (!f) return;
        try { await Deck.importFile(f); go(0); toast('Deck opened'); }
        catch (err) { toast('Couldn’t open that file'); }
      };
      fileIn.click();
    }
    if (m === 'new') { Deck.replace(Deck.starter()); go(0); toast('New deck — Ctrl+Z to get the old one back'); }
  });

  /* ================= keys ================= */

  addEventListener('keydown', (ev) => {
    if (Player.active) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && ev.key === 'Enter') { ev.preventDefault(); endEdit(); Player.start(cur); return; }
    if (editing || ev.target.closest?.('input, textarea, select')) return;
    if (!sheet.hidden && ev.key === 'Escape') { sheet.hidden = true; return; }
    if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); if (!Deck.undo()) toast('Nothing to undo'); return; }
    if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); sel ? dupEl() : dupScene(cur); return; }
    if (ev.key === 'Escape') { select(null); return; }
    if (sel && (ev.key === 'Enter' || ev.key === 'F2')) { ev.preventDefault(); startEdit(sel); return; }
    if (sel && (ev.key === 'Delete' || ev.key === 'Backspace')) { ev.preventDefault(); delEl(); return; }
    if (sel && ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      const step = ev.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
      Deck.change(() => { const e = elOf(sel); e.x += d[0]; e.y += d[1]; }, { merge: 'nudge' + sel });
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') { ev.preventDefault(); go(cur + 1); }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') { ev.preventDefault(); go(cur - 1); }
    if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); openGallery(); }
  });

  /* ================= render ================= */

  function renderAll() {
    if (document.activeElement !== title) title.value = Deck.deck.title || '';
    $('undo').disabled = !Deck.canUndo();
    renderList();
    renderBar();          // first: the bar's height decides how big the stage can be
    renderStage();
  }

  Deck.subscribe(() => {
    cur = Math.min(cur, scenes().length - 1);
    renderAll();
  });
  addEventListener('resize', fitStage);

  async function boot() {
    await document.fonts.load('400 40px Ascents').catch(() => {});
    Deck.load();
    await Media.preload(Deck.deck).catch(() => {});
    renderAll();
  }
  boot();

  return { go, toast };
})();
