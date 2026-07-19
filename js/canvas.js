/* ============================================================
   Canvas — direct manipulation.

   Drag, resize, rotate, snap, inline text edit. All pointer math
   is converted out of screen space into the 1920x1080 design space
   immediately (see toDesign) so zoom level never leaks into the
   stored geometry.
   ============================================================ */

const Canvas = (() => {

  const wrap   = document.getElementById('canvasWrap');
  const canvas = document.getElementById('canvas');
  const selBox = document.getElementById('selection');
  const guides = document.getElementById('guides');
  const scroll = document.getElementById('stageScroll');

  let scale = 0.5;
  let fitMode = true;
  let editingId = null;

  const SNAP = 8;              // design-space px
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- sizing ---------- */

  function computeFit() {
    const pad = 56;
    const availW = scroll.clientWidth - pad;
    const availH = scroll.clientHeight - pad;
    return Math.min(availW / DESIGN_W, availH / DESIGN_H);
  }

  function setScale(s, { fit = false } = {}) {
    fitMode = fit;
    scale = clamp(s, 0.08, 3);
    applySize();
    drawSelection();
    document.getElementById('zoomLabel').textContent =
      fit ? 'Fit' : Math.round(scale * 100) + '%';
  }

  function applySize() {
    const w = DESIGN_W * scale, h = DESIGN_H * scale;
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const host = canvas.querySelector('.slide-host');
    if (host) host.style.transform = `scale(${scale})`;
  }

  const zoomFit = () => setScale(computeFit(), { fit: true });
  const zoomBy  = (f) => setScale(scale * f);

  /* ---------- render ---------- */

  function render() {
    const slide = Store.currentSlide();
    canvas.innerHTML = '';
    if (!slide) return;

    const host = Render.slideNode(slide, Store.deck, { scale, build: Infinity });
    canvas.appendChild(host);
    applySize();
    drawSelection();
  }

  /* ---------- coordinate helpers ---------- */

  function toDesign(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  }

  const elById = (id) => (Store.currentSlide()?.elements || []).find(e => e.id === id);

  /* ---------- selection box ---------- */

  function drawSelection() {
    const els = Store.selectedElements();
    if (!els.length || editingId) { selBox.hidden = true; return; }

    // Union box for multi-select; exact box (with rotation) for single.
    const x1 = Math.min(...els.map(e => e.x));
    const y1 = Math.min(...els.map(e => e.y));
    const x2 = Math.max(...els.map(e => e.x + e.w));
    const y2 = Math.max(...els.map(e => e.y + e.h));

    selBox.hidden = false;
    selBox.style.left   = x1 * scale + 'px';
    selBox.style.top    = y1 * scale + 'px';
    selBox.style.width  = (x2 - x1) * scale + 'px';
    selBox.style.height = (y2 - y1) * scale + 'px';
    selBox.style.transform = (els.length === 1 && els[0].rot)
      ? `rotate(${els[0].rot}deg)` : '';

    // Resize handles only make sense on a single element.
    selBox.querySelectorAll('.handle, .rotator')
      .forEach(h => h.style.display = els.length === 1 ? '' : 'none');
  }

  /* ---------- snapping ---------- */

  function snapTargets(movingIds) {
    const slide = Store.currentSlide();
    const v = [0, DESIGN_W / 2, DESIGN_W, MARGIN, DESIGN_W - MARGIN];
    const h = [0, DESIGN_H / 2, DESIGN_H, MARGIN, DESIGN_H - MARGIN];
    slide.elements.forEach(e => {
      if (movingIds.includes(e.id)) return;
      v.push(e.x, e.x + e.w / 2, e.x + e.w);
      h.push(e.y, e.y + e.h / 2, e.y + e.h);
    });
    return { v, h };
  }

  function applySnap(box, targets) {
    const hits = { v: [], h: [] };
    let dx = 0, dy = 0, bestX = SNAP, bestY = SNAP;

    [[box.x, 0], [box.x + box.w / 2, 1], [box.x + box.w, 2]].forEach(([pos]) => {
      targets.v.forEach(t => {
        const d = t - pos;
        if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx = d; hits.v = [t]; }
      });
    });
    [[box.y, 0], [box.y + box.h / 2, 1], [box.y + box.h, 2]].forEach(([pos]) => {
      targets.h.forEach(t => {
        const d = t - pos;
        if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy = d; hits.h = [t]; }
      });
    });
    return { dx, dy, hits };
  }

  function showGuides(hits) {
    guides.setAttribute('viewBox', `0 0 ${DESIGN_W} ${DESIGN_H}`);
    guides.innerHTML =
      (hits?.v || []).map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${DESIGN_H}"/>`).join('') +
      (hits?.h || []).map(y => `<line x1="0" y1="${y}" x2="${DESIGN_W}" y2="${y}"/>`).join('');
  }
  const clearGuides = () => { guides.innerHTML = ''; };

  /* ---------- pointer: drag / resize / rotate ---------- */

  let drag = null;

  canvas.addEventListener('pointerdown', (ev) => {
    if (editingId) return;
    const node = ev.target.closest('.el');

    if (!node) { Store.select([]); return; }

    const el = elById(node.dataset.id);
    if (!el || el.locked) return;

    const additive = ev.shiftKey;
    if (!Store.sel.els.includes(el.id)) Store.select(el.id, { additive });
    else if (additive) Store.select(Store.sel.els.filter(i => i !== el.id));

    startDrag(ev, 'move');
  });

  selBox.addEventListener('pointerdown', (ev) => {
    const h = ev.target.dataset.h;
    if (!h) return;
    ev.stopPropagation();
    startDrag(ev, h === 'rot' ? 'rotate' : 'resize', h);
  });

  function startDrag(ev, mode, handle) {
    const els = Store.selectedElements().filter(e => !e.locked);
    if (!els.length) return;

    const start = toDesign(ev.clientX, ev.clientY);
    drag = {
      mode, handle, start,
      origin: els.map(e => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot })),
      tag: 'drag-' + Date.now(),
      moved: false,
    };
    canvas.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

  window.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const now = toDesign(ev.clientX, ev.clientY);
    let dx = now.x - drag.start.x;
    let dy = now.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 2) return;
    drag.moved = true;

    if (drag.mode === 'move') {
      // Shift constrains to one axis — the muscle memory from every other tool.
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }

      let hits = null;
      if (!ev.altKey) {
        const o = drag.origin[0];
        const box = { x: o.x + dx, y: o.y + dy, w: o.w, h: o.h };
        const snap = applySnap(box, snapTargets(drag.origin.map(o2 => o2.id)));
        dx += snap.dx; dy += snap.dy;
        hits = snap.hits;
      }
      showGuides(hits);

      Store.commit(() => {
        drag.origin.forEach(o => {
          const e = elById(o.id);
          if (e) { e.x = Math.round(o.x + dx); e.y = Math.round(o.y + dy); }
        });
      }, { tag: drag.tag });
    }

    if (drag.mode === 'resize') {
      const o = drag.origin[0];
      const h = drag.handle;
      let { x, y, w, hgt } = { x: o.x, y: o.y, w: o.w, hgt: o.h };

      if (h.includes('e')) w = o.w + dx;
      if (h.includes('s')) hgt = o.h + dy;
      if (h.includes('w')) { w = o.w - dx; x = o.x + dx; }
      if (h.includes('n')) { hgt = o.h - dy; y = o.y + dy; }

      // Shift preserves aspect ratio on the corner handles.
      if (ev.shiftKey && h.length === 2) {
        const ratio = o.w / o.h;
        if (Math.abs(w - o.w) > Math.abs(hgt - o.h)) hgt = w / ratio;
        else w = hgt * ratio;
        if (h.includes('n')) y = o.y + (o.h - hgt);
        if (h.includes('w')) x = o.x + (o.w - w);
      }

      w = Math.max(24, w); hgt = Math.max(24, hgt);
      Store.commit(() => {
        const e = elById(o.id);
        if (e) { e.x = Math.round(x); e.y = Math.round(y); e.w = Math.round(w); e.h = Math.round(hgt); }
      }, { tag: drag.tag });
    }

    if (drag.mode === 'rotate') {
      const o = drag.origin[0];
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      let deg = Math.atan2(now.y - cy, now.x - cx) * 180 / Math.PI + 90;
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;   // 15° detents
      Store.commit(() => {
        const e = elById(o.id);
        if (e) e.rot = Math.round(deg);
      }, { tag: drag.tag });
    }
  });

  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    clearGuides();
  });

  /* ---------- inline text editing ---------- */

  canvas.addEventListener('dblclick', (ev) => {
    const node = ev.target.closest('.el');
    if (!node) return;
    const el = elById(node.dataset.id);
    if (!el || el.type !== 'text' || el.locked) return;
    beginEdit(el, node);
  });

  function beginEdit(el, node) {
    editingId = el.id;
    selBox.hidden = true;
    node.classList.add('editing');

    const field = node.querySelector('.e-text');
    field.contentEditable = 'true';
    field.style.whiteSpace = 'pre-wrap';
    // innerText reports text as *rendered*, so an uppercase-styled element would
    // read back as capitals and bake them into the stored content permanently.
    // Neutralise the transform for the duration of the edit.
    field.style.textTransform = 'none';
    field.textContent = el.text;      // edit the raw markup, not the rendered form
    field.focus();

    // Place the caret at the end rather than at the click point — simpler,
    // and matches what happens when you tab into a field.
    const range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);

    const finish = () => {
      const text = field.innerText.replace(/ /g, ' ');
      field.removeEventListener('blur', finish);
      editingId = null;
      Store.commit(d => { const e = elById(el.id); if (e) e.text = text; });
    };

    field.addEventListener('blur', finish);
    field.addEventListener('keydown', (e) => {
      e.stopPropagation();                       // don't trip global shortcuts
      if (e.key === 'Escape') { e.preventDefault(); field.blur(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); field.blur(); }
    });
  }

  const isEditing = () => editingId !== null;

  /* ---------- element ops ---------- */

  function addElement(type, patch = {}) {
    const el = makeElement(type, patch);
    // Drop new elements in the middle of the canvas, not on top of each other.
    if (patch.x === undefined) {
      el.x = Math.round((DESIGN_W - el.w) / 2);
      el.y = Math.round((DESIGN_H - el.h) / 2);
    }
    Store.commit(() => Store.currentSlide().elements.push(el));
    Store.select(el.id);
    return el;
  }

  function updateSelected(patch, tag) {
    Store.commit(() => {
      Store.selectedElements().forEach(e => Object.assign(e, patch));
    }, { tag });
  }

  function deleteSelected() {
    const ids = Store.sel.els;
    if (!ids.length) return;
    Store.commit(() => {
      const s = Store.currentSlide();
      s.elements = s.elements.filter(e => !ids.includes(e.id));
    });
    Store.select([]);
  }

  function duplicateSelected() {
    const els = Store.selectedElements();
    if (!els.length) return;
    const copies = els.map(e => Object.assign(structuredClone(e), {
      id: uid(), x: e.x + 40, y: e.y + 40,
    }));
    Store.commit(() => Store.currentSlide().elements.push(...copies));
    Store.select(copies.map(c => c.id));
  }

  function reorder(dir) {
    const ids = Store.sel.els;
    if (!ids.length) return;
    Store.commit(() => {
      const s = Store.currentSlide();
      const picked = s.elements.filter(e => ids.includes(e.id));
      const rest = s.elements.filter(e => !ids.includes(e.id));
      if (dir === 'front') s.elements = [...rest, ...picked];
      if (dir === 'back')  s.elements = [...picked, ...rest];
      if (dir === 'fwd' || dir === 'bwd') {
        const arr = s.elements.slice();
        const step = dir === 'fwd' ? 1 : -1;
        const order = dir === 'fwd' ? [...ids].reverse() : ids;
        order.forEach(id => {
          const i = arr.findIndex(e => e.id === id);
          const j = i + step;
          if (i >= 0 && j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]];
        });
        s.elements = arr;
      }
    });
  }

  function align(how) {
    const els = Store.selectedElements();
    if (!els.length) return;
    // One element aligns to the slide; several align to each other.
    const multi = els.length > 1;
    const bx1 = multi ? Math.min(...els.map(e => e.x)) : 0;
    const by1 = multi ? Math.min(...els.map(e => e.y)) : 0;
    const bx2 = multi ? Math.max(...els.map(e => e.x + e.w)) : DESIGN_W;
    const by2 = multi ? Math.max(...els.map(e => e.y + e.h)) : DESIGN_H;

    Store.commit(() => {
      Store.selectedElements().forEach(e => {
        if (how === 'left')   e.x = Math.round(bx1);
        if (how === 'hcent')  e.x = Math.round((bx1 + bx2) / 2 - e.w / 2);
        if (how === 'right')  e.x = Math.round(bx2 - e.w);
        if (how === 'top')    e.y = Math.round(by1);
        if (how === 'vcent')  e.y = Math.round((by1 + by2) / 2 - e.h / 2);
        if (how === 'bottom') e.y = Math.round(by2 - e.h);
      });
    });
  }

  function distribute(axis) {
    const els = Store.selectedElements();
    if (els.length < 3) return;
    const key = axis === 'h' ? 'x' : 'y';
    const size = axis === 'h' ? 'w' : 'h';
    const sorted = [...els].sort((a, b) => a[key] - b[key]);
    const first = sorted[0], last = sorted.at(-1);
    const span = (last[key] + last[size]) - first[key];
    const total = sorted.reduce((s, e) => s + e[size], 0);
    const gap = (span - total) / (sorted.length - 1);

    Store.commit(() => {
      let cursor = first[key];
      sorted.forEach(e => {
        const live = elById(e.id);
        live[key] = Math.round(cursor);
        cursor += live[size] + gap;
      });
    });
  }

  function nudge(dx, dy) {
    Store.commit(() => {
      Store.selectedElements().forEach(e => { e.x += dx; e.y += dy; });
    }, { tag: 'nudge' });
  }

  /* ---------- paste + drop images ---------- */

  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function insertImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      App.toast('Image is over 8MB — autosave may hit the storage limit', 'err');
    }
    const src = await fileToDataURL(file);
    const img = new Image();
    img.onload = () => {
      // Fit inside the content area while keeping the natural aspect ratio.
      const maxW = CONTENT_W, maxH = 720;
      const r = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * r), h = Math.round(img.height * r);
      addElement('image', {
        src, w, h,
        x: Math.round((DESIGN_W - w) / 2), y: Math.round((DESIGN_H - h) / 2),
      });
    };
    img.src = src;
  }

  canvas.addEventListener('dragover', e => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) insertImageFile(file);
  });

  window.addEventListener('paste', (e) => {
    if (isEditing()) return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) { insertImageFile(item.getAsFile()); return; }

    const text = e.clipboardData?.getData('text');
    if (text && /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)$/i.test(text.trim())) {
      addElement('image', { src: text.trim(), w: 900, h: 600 });
    }
  });

  window.addEventListener('resize', () => { if (fitMode) zoomFit(); });

  return {
    render, setScale, zoomFit, zoomBy, drawSelection, isEditing,
    addElement, updateSelected, deleteSelected, duplicateSelected,
    reorder, align, distribute, nudge, insertImageFile,
    get scale() { return scale; },
  };
})();
