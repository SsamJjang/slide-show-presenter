/* ============================================================
   Library — everything you can put on a slide, in one place.

   The drawer on the left of the editor. Five panes:

     Elements     the Connect kit (sculptures, lenses, wire lines,
                  bands, dot fields), icons, shapes, devices, data
     Text         type styles, from display to captions, including the
                  iridescent / striped / dissolving finishes
     Media        upload, images already in this deck, device frames
     Backgrounds  solid fields, Connect mist fields, classic depth, and
                  the stage sculpture that glides between slides
     Layouts      starting points — optional; a blank slide plus the
                  library is the main way to build

   Every tile is a real render of what it inserts, at tile size, so the
   drawer can't drift from what lands on the slide. Click a tile to add
   it to the middle of the slide, or drag it to exactly where you want it.
   Search filters the open pane by name.
   ============================================================ */

const Library = (() => {
  const ws     = document.getElementById('workspace');
  const dock   = document.getElementById('dock');
  const body   = document.getElementById('drawerBody');
  const search = document.getElementById('drawerSearch');
  const scroll = document.getElementById('stageScroll');

  let pane = 'elements';
  let applyAll = false;
  let reg = [];                       // what each tile in the open pane inserts

  const esc = (s) => Render.esc(s);

  /* ---------- catalogues ---------- */

  const el = (name, type, w, h, patch = {}) => ({ kind: 'el', name, type, w, h, patch });

  const TEXT = [
    el('Display', 'text', 1300, 190, { role: 'display', text: 'Display headline', size: 150, weight: 500, lineHeight: 1.04, letterSpacing: -.03 }),
    el('Headline', 'text', 1300, 120, { role: 'title', text: 'A headline', size: 92, weight: 500, lineHeight: 1.1, letterSpacing: -.025 }),
    el('Subhead', 'text', 1100, 70, { role: 'subtitle', text: 'A supporting subhead', size: 48, weight: 500, letterSpacing: -.01 }),
    el('Body', 'text', 900, 110, { role: 'body', text: 'Body copy. One or two calm lines that carry the detail.', size: 32, lineHeight: 1.45, color: 'var(--muted)' }),
    el('Caption', 'text', 800, 50, { role: 'caption', text: 'Caption or label', size: 26 }),
    el('Kicker', 'text', 700, 50, { role: 'kicker', text: 'KICKER LABEL', size: 26, weight: 600, letterSpacing: .14, uppercase: true, color: 'var(--accent3, var(--accent))' }),
    el('Iridescent figure', 'text', 760, 320, { role: 'display', text: '128', size: 300, weight: 500, lineHeight: 1, letterSpacing: -.03, finish: 'connect' }),
    el('Striped giant word', 'text', 1400, 380, { role: 'display', text: 'APEX', size: 340, weight: 600, lineHeight: 1, letterSpacing: -.04, finish: 'stripes' }),
    el('Countdown', 'text', 760, 440, { role: 'display', text: '05', size: 400, weight: 500, lineHeight: 1, letterSpacing: -.03, finish: 'dissolve' }),
    el('Mist headline', 'text', 1300, 140, { role: 'display', text: 'Soft and bright', size: 110, weight: 500, lineHeight: 1.1, finish: 'mist' }),
    el('Chrome', 'text', 1100, 160, { role: 'display', text: 'Chrome', size: 140, weight: 600, lineHeight: 1.05, finish: 'chrome' }),
    el('Outline', 'text', 1300, 320, { role: 'display', text: 'Outline', size: 280, weight: 600, lineHeight: 1, finish: 'outline' }),
    el('Gradient', 'text', 1200, 150, { role: 'display', text: 'Gradient', size: 130, weight: 600, lineHeight: 1.05, finish: 'gradient' }),
    el('Liquid glass', 'text', 1200, 200, { role: 'display', text: 'Liquid', size: 180, weight: 700, lineHeight: 1.05, finish: 'liquidglass' }),
    el('Quote', 'text', 1300, 260, { role: 'display', text: '“A line someone said,\nworth repeating.”', size: 76, weight: 500, lineHeight: 1.16, letterSpacing: -.02 }),
  ];

  const SHAPES = [
    el('Card', 'shape', 520, 540, { shape: 'rect', radius: 34, fill: '#0e0f13', stroke: 'rgba(255,255,255,.08)', strokeWidth: 2 }),
    el('Light card', 'shape', 520, 540, { shape: 'rect', radius: 34, fill: '#ffffff', stroke: 'rgba(11,16,32,.07)', strokeWidth: 2 }),
    el('Pill', 'shape', 240, 64, { shape: 'rect', radius: 32, fill: '#e5243b' }),
    el('Divider', 'shape', 1200, 2, { shape: 'rect', radius: 1, fill: 'rgba(255,255,255,.14)' }),
    el('Circle', 'shape', 300, 300, { shape: 'ellipse', fill: 'accent' }),
    el('Squircle', 'shape', 320, 320, { shape: 'squircle', exponent: 5, fill: 'accent2' }),
    el('Triangle', 'shape', 300, 280, { shape: 'polygon', sides: 3, radius: 14, fill: 'accent' }),
    el('Star', 'shape', 300, 300, { shape: 'star', sides: 4, innerRatio: .32, radius: 6, fill: 'accent' }),
    el('Blob', 'shape', 340, 340, { shape: 'blob', seed: 4, sides: 7, fill: 'accent2' }),
    el('Glass panel', 'shape', 620, 420, { shape: 'squircle', exponent: 5, material: 'liquid' }),
  ];

  const DEVICES = [
    el('Phone', 'mockup', 400, 840, { kind: 'phone', shadow: 'rim' }),
    el('Browser', 'mockup', 1200, 760, { kind: 'browser', shadow: 'rim' }),
    el('Window', 'mockup', 1300, 640, { kind: 'window', radius: 22, shadow: 'rim' }),
  ];

  const DATA = [
    el('Bar chart', 'chart', 1200, 620, { kind: 'bar' }),
    el('Line chart', 'chart', 1200, 620, { kind: 'line' }),
    el('Area chart', 'chart', 1200, 620, { kind: 'area' }),
    el('Donut', 'chart', 640, 640, { kind: 'donut' }),
    el('Table', 'table', 1200, 400, {}),
    el('Code', 'code', 1200, 500, {}),
  ];

  const bg = (name, bgColor, preset = 'none', extra = {}) => ({ kind: 'bg', name, bg: bgColor, bgPreset: preset, ...extra });
  const BACKGROUNDS = [
    { group: 'Solid', items: [
      bg('Black', '#000000'), bg('Ink', '#07080b'), bg('Night', '#0b1020'),
      bg('Navy', '#0a1148'), bg('Paper', '#f6f7fb'), bg('White', '#ffffff'),
    ]},
    { group: 'Connect mist', hint: 'Slow gradient fields', items: [
      bg('Navy mist', '#060b33', 'mistNavy'), bg('Dusk mist', '#12081f', 'mistDusk'),
      bg('Ocean mist', '#02141c', 'mistOcean'), bg('Pearl mist', '#f4f2fb', 'mistPearl'),
      bg('Ink glow', '#000000', 'inkGlow'),
    ]},
    { group: 'Classic depth', hint: 'Follows the theme colours', items:
      ['spotlight', 'mesh', 'aurora', 'nebula', 'grid', 'dots', 'rays', 'horizon', 'duotone']
        .map(k => bg(Backgrounds.PRESETS[k].name, null, k)) },
  ];

  /* ---------- tile rendering ---------- */

  /* An element drawn at tile size. Thin strokes would vanish at that scale,
     so line weights and spacing are thickened for the preview only. */
  function elementPreview(spec, boxW, boxH) {
    const k = Math.min(boxW / spec.w, boxH / spec.h);
    const patch = { ...spec.patch };
    if (spec.type === 'wires' || spec.type === 'lens') {
      const w0 = patch.weight ?? (spec.type === 'wires' ? 2.6 : 1.6);
      const boost = Math.max(1, 1.3 / (k * w0));
      patch.weight = w0 * boost;
      if (spec.type === 'wires') patch.gap = (patch.gap ?? 13) * boost;
    }
    const m = makeElement(spec.type, { ...patch, w: spec.w, h: spec.h, x: 0, y: 0 });
    let inner;
    try { inner = Render.elementBody(m); } catch (e) { inner = ''; }
    const filter = m.shadow && m.shadow !== 'none' ? `filter:drop-shadow(${Render.SHADOWS[m.shadow]});` : '';
    return `<div class="tile-fit" style="width:${spec.w}px;height:${spec.h}px;transform:translate(-50%,-50%) scale(${k})">` +
      `<div class="slide" style="width:${spec.w}px;height:${spec.h}px;background:transparent">` +
      `<div class="el el-${spec.type}" style="position:absolute;inset:0;${filter}"><div class="el-anim"><div class="el-emph">${inner}</div></div></div>` +
      `</div></div>`;
  }

  function slidePreview(slide, w) {
    const host = Render.slideNode(slide, Store.deck, { scale: w / DESIGN_W });
    return host.outerHTML;
  }

  function tile(spec, cls, art, name = spec.name) {
    const i = reg.push(spec) - 1;
    return `<button class="tile ${cls || ''}" data-i="${i}" draggable="true" title="${esc(name)}">` +
      `<div class="tile-art">${art}</div>` + (name ? `<div class="tile-name">${esc(name)}</div>` : '') + `</button>`;
  }

  const groupHead = (name, hint) =>
    `<div class="lib-group" data-group><b>${esc(name)}</b>${hint ? `<span>${esc(hint)}</span>` : ''}</div>`;

  /* ---------- panes ---------- */

  function elementsPane() {
    const W = 128;
    let out = '';
    Kit.CATALOG.forEach(g => {
      out += groupHead(g.group, g.hint) + `<div class="lib-grid">` +
        g.items.map(it => tile({ kind: 'el', ...it }, '', elementPreview(it, W * .9, W * .9))).join('') + `</div>`;
    });
    out += groupHead('Icons', 'Click to add') + `<div class="lib-grid six">` +
      Object.entries(Connect.ICONS).map(([k, d]) => {
        const spec = el(k, 'icon', 120, 120, { glyph: k, tile: 'dark' });
        const i = reg.push(spec) - 1;
        return `<button class="tile icon-tile" data-i="${i}" draggable="true" title="${k}">` +
          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></button>`;
      }).join('') + `</div>`;
    out += groupHead('Shapes') + `<div class="lib-grid three">` +
      SHAPES.map(s => tile(s, '', elementPreview(s, 76, 76))).join('') + `</div>`;
    out += groupHead('Devices', 'Drop a screenshot in after') + `<div class="lib-grid three">` +
      DEVICES.map(s => tile(s, '', elementPreview(s, 76, 76))).join('') + `</div>`;
    out += groupHead('Data') + `<div class="lib-grid three">` +
      DATA.map(s => tile(s, '', elementPreview(s, 76, 76))).join('') + `</div>`;
    return out;
  }

  function textPane() {
    return groupHead('Type styles', 'Every one is editable after') + `<div class="lib-grid one">` +
      TEXT.map(t => {
        const k = Math.min(250 / t.w, 52 / t.h);
        const art = `<div class="tile-fit" style="width:${t.w}px;height:${t.h}px;transform:translate(-50%,-50%) scale(${k})">` +
          `<div class="slide" style="width:${t.w}px;height:${t.h}px;background:transparent">` +
          `<div class="el el-text" style="position:absolute;inset:0"><div class="el-anim"><div class="el-emph">${
            Render.elementBody(makeElement('text', { ...t.patch, w: t.w, h: t.h }))}</div></div></div></div></div>`;
        return tile(t, 'text', art);
      }).join('') + `</div>` +
      `<p class="lib-note">Inside any text: **bold**, *italic*, \`code\`, and {braces} for the accent colour.</p>`;
  }

  function mediaPane() {
    const srcs = [...new Set(Store.deck.slides.flatMap(s => s.elements)
      .filter(e => (e.type === 'image' || e.type === 'mockup') && e.src).map(e => e.src))];
    let out = groupHead('Upload') +
      `<button class="lib-drop" data-upload>${ICONS.image}<span>Choose an image, or drop one here</span></button>` +
      `<p class="lib-note">With a phone or window selected, the image goes into its screen.</p>`;
    if (srcs.length) {
      out += groupHead('In this deck', `${srcs.length}`) + `<div class="lib-grid three">` +
        srcs.map(src => tile(el('Image', 'image', 900, 600, { src, fit: 'cover' }), '',
          `<img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover">`, '')).join('') + `</div>`;
    }
    out += groupHead('Devices') + `<div class="lib-grid three">` +
      DEVICES.map(s => tile(s, '', elementPreview(s, 76, 76))).join('') + `</div>`;
    return out;
  }

  function backgroundsPane() {
    const s = Store.currentSlide();
    let out = `<label class="lib-check"><input type="checkbox" data-allbg ${applyAll ? 'checked' : ''}> Apply to every slide</label>`;
    BACKGROUNDS.forEach(g => {
      out += groupHead(g.group, g.hint) + `<div class="lib-grid three">` +
        g.items.map(b => {
          const on = s && (s.bg || null) === b.bg && (s.bgPreset || 'none') === b.bgPreset;
          const prev = makeSlide({ bg: b.bg, bgPreset: b.bgPreset, bgMotion: 'none', chrome: false, elements: [] });
          return tile(b, 'wide' + (on ? ' on' : ''), slidePreview(prev, 82));
        }).join('') + `</div>`;
    });

    // The stage sculpture: the one form that glides between slides.
    const f = s?.form || {};
    const chipRow = (key, cur, list) => `<div class="lib-chips" data-form="${key}">` +
      list.map(([k, name]) => `<button class="chip ${cur === k ? 'on' : ''}" data-val="${k}">${esc(name)}</button>`).join('') + `</div>`;
    out += groupHead('Stage sculpture', 'Glides between slides') +
      `<div class="insp-sub">Where</div>` + chipRow('pose', f.pose || 'off', Object.entries(ConnectForm.POSES).map(([k, v]) => [k, v.name])) +
      `<div class="insp-sub">Shape</div>` + chipRow('species', f.species || 'twist', Object.entries(ConnectForm.SPECIES).map(([k, v]) => [k, v.name])) +
      `<div class="insp-sub">Light</div>` + chipRow('scheme', f.scheme || 'connect', Object.entries(ConnectForm.SCHEMES).map(([k, v]) => [k, v.name])) +
      `<p class="lib-note">Set a different place or shape on each slide; while presenting it moves and re-forms between them instead of cutting.</p>`;
    return out;
  }

  function layoutsPane() {
    const keys = Object.keys(LAYOUTS);
    const connect = keys.filter(k => /^c[A-Z]/.test(k));
    const classic = keys.filter(k => !/^c[A-Z]/.test(k));
    const card = (k) => {
      const l = LAYOUTS[k];
      const slide = makeSlide({ ...(l.slide || {}), elements: l.build() });
      return tile({ kind: 'layout', key: k, name: l.name.replace(/^Connect · /, '') }, 'wide', slidePreview(slide, 128));
    };
    return `<p class="lib-note">Starting points, not templates — every part is yours to change. Click to add a slide after this one; Shift-click to replace this slide.</p>` +
      groupHead('Connect') + `<div class="lib-grid">${connect.map(card).join('')}</div>` +
      groupHead('Classic') + `<div class="lib-grid">${classic.map(card).join('')}</div>`;
  }

  const PANES = { elements: elementsPane, text: textPane, media: mediaPane, backgrounds: backgroundsPane, layouts: layoutsPane };

  function render() {
    reg = [];
    applyTheme(body, Store.deck.theme, Store.deck);
    body.innerHTML = PANES[pane]();
    dock.querySelectorAll('.dk').forEach(b => b.classList.toggle('on', b.dataset.pane === pane && !ws.classList.contains('no-drawer')));
    filter();
  }

  /* Hide tiles that don't match the search, then any group left empty. */
  function filter() {
    const q = search.value.trim().toLowerCase();
    body.querySelectorAll('.tile').forEach(t => {
      const spec = reg[+t.dataset.i];
      t.hidden = !!q && !(spec && String(spec.name || '').toLowerCase().includes(q));
    });
    body.querySelectorAll('[data-group]').forEach(h => {
      const grid = h.nextElementSibling;
      const any = grid && grid.querySelector('.tile:not([hidden])');
      const hide = !!q && !any && grid?.classList.contains('lib-grid');
      h.hidden = hide; if (grid?.classList.contains('lib-grid')) grid.hidden = hide;
    });
  }

  /* ---------- acting on a tile ---------- */

  function insertEl(spec, at) {
    const patch = { ...structuredClone(spec.patch || {}), w: spec.w, h: spec.h };
    if (at) { patch.x = Math.round(at.x - spec.w / 2); patch.y = Math.round(at.y - spec.h / 2); }
    // An image dropped onto a selected device fills its screen instead.
    Canvas.addElement(spec.type, patch);
  }

  function applyBg(spec) {
    const set = (s) => { s.bg = spec.bg; s.bgPreset = spec.bgPreset; };
    Store.commit(d => { (applyAll ? d.slides : [Store.currentSlide()]).forEach(set); });
    render();
  }

  function use(spec, ev, at) {
    if (!spec) return;
    if (spec.kind === 'el') insertEl(spec, at);
    else if (spec.kind === 'bg') applyBg(spec);
    else if (spec.kind === 'layout') {
      if (ev && ev.shiftKey) Rail.applyLayout(spec.key); else Rail.addSlide(spec.key);
    }
  }

  body.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (t) { use(reg[+t.dataset.i], e); return; }
    if (e.target.closest('[data-upload]')) { App.pickImage(); return; }
    const chip = e.target.closest('[data-form] .chip');
    if (chip) {
      const key = chip.parentElement.dataset.form;
      Store.commit(() => {
        const s = Store.currentSlide();
        s.form = { pose: 'off', scheme: 'connect', ...(s.form || {}) };
        s.form[key] = chip.dataset.val;
        // Choosing a shape or light for a hidden form means you want to see it.
        if (key !== 'pose' && s.form.pose === 'off') s.form.pose = 'right';
      });
      render();
    }
  });
  body.addEventListener('change', (e) => {
    if (e.target.matches('[data-allbg]')) applyAll = e.target.checked;
  });

  // Drop an image file onto the upload zone.
  body.addEventListener('dragover', (e) => {
    const z = e.target.closest('[data-upload]');
    if (z && e.dataTransfer.types.includes('Files')) { e.preventDefault(); z.classList.add('over'); }
  });
  body.addEventListener('dragleave', (e) => e.target.closest('[data-upload]')?.classList.remove('over'));
  body.addEventListener('drop', (e) => {
    const z = e.target.closest('[data-upload]');
    if (!z) return;
    e.preventDefault(); z.classList.remove('over');
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) Canvas.insertImageFile(f);
  });

  /* ---------- drag from the drawer onto the canvas ---------- */

  const MIME = 'application/x-apexdeck';
  body.addEventListener('dragstart', (e) => {
    const t = e.target.closest('.tile');
    if (!t) return;
    e.dataTransfer.setData(MIME, t.dataset.i);
    e.dataTransfer.effectAllowed = 'copy';
  });
  scroll.addEventListener('dragover', (e) => {
    if (!e.dataTransfer.types.includes(MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    scroll.classList.add('drop-target');
  });
  scroll.addEventListener('dragleave', (e) => {
    if (!scroll.contains(e.relatedTarget)) scroll.classList.remove('drop-target');
  });
  scroll.addEventListener('drop', (e) => {
    scroll.classList.remove('drop-target');
    const i = e.dataTransfer.getData(MIME);
    if (i === '') return;
    e.preventDefault();
    e.stopPropagation();
    use(reg[+i], e, Canvas.toDesign(e.clientX, e.clientY));
  });

  /* ---------- dock ---------- */

  function open(p) {
    const collapsed = ws.classList.contains('no-drawer');
    if (p === pane && !collapsed) { close(); return; }
    pane = p;
    ws.classList.remove('no-drawer');
    search.value = '';
    render();
    setTimeout(() => Canvas.zoomFit(), 240);
  }
  function close() {
    ws.classList.add('no-drawer');
    dock.querySelectorAll('.dk').forEach(b => b.classList.remove('on'));
    setTimeout(() => Canvas.zoomFit(), 240);
  }

  dock.addEventListener('click', (e) => {
    const b = e.target.closest('.dk[data-pane]');
    if (b) open(b.dataset.pane);
  });
  search.addEventListener('input', filter);

  /* Panes that show deck state (backgrounds, images) follow the deck. */
  function refresh() {
    if (ws.classList.contains('no-drawer')) return;
    if (pane === 'backgrounds' || pane === 'media') render();
  }

  return { render, open, close, refresh, get pane() { return pane; } };
})();
