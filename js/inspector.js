/* ============================================================
   Inspector — contextual properties.

   Rebuilt from state on every change. That's cheap at this size and
   removes a whole class of "panel says X, slide says Y" bugs.
   Inputs write through Canvas.updateSelected with a coalescing tag so
   dragging a slider produces one undo entry, not four hundred.
   ============================================================ */

const Inspector = (() => {
  const root = document.getElementById('inspector');

  /* ---------- tiny declarative builders ---------- */

  const h = (html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; };

  const section = (title, inner) =>
    `<div class="insp-section"><div class="insp-title">${title}</div>${inner}</div>`;

  const num = (label, key, val, { min = -9999, max = 9999, step = 1 } = {}) =>
    `<div class="field"><label>${label}</label>
      <input class="inp" type="number" data-key="${key}" value="${Math.round(val * 100) / 100}"
        min="${min}" max="${max}" step="${step}"></div>`;

  const range = (label, key, val, min, max, step) =>
    `<div class="field"><label>${label}</label>
      <input class="inp" type="range" data-key="${key}" value="${val}" min="${min}" max="${max}" step="${step}">
      <span class="rangeval" style="width:34px;text-align:right;color:var(--ui-muted)">${val}</span></div>`;

  const select = (label, key, val, opts) =>
    `<div class="field"><label>${label}</label>
      <select class="inp" data-key="${key}">${opts.map(o => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<option value="${v}"${v == val ? ' selected' : ''}>${t}</option>`;
      }).join('')}</select></div>`;

  const seg = (label, key, val, opts) =>
    `<div class="field"><label>${label}</label>
      <div class="seg" data-seg="${key}">${opts.map(([v, t]) =>
        `<button data-val="${v}" class="${v == val ? 'on' : ''}" title="${t.title || v}">${t.label || t}</button>`
      ).join('')}</div></div>`;

  const chips = (label, key, val, opts) =>
    `<div class="field stack"><label>${label}</label>
      <div class="chiprow" data-chips="${key}">${opts.map(o => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<button class="chip ${v == val ? 'on' : ''}" data-val="${v}">${t}</button>`;
      }).join('')}</div></div>`;

  const PALETTE_KEYS = [
    ['accent', 'var(--accent)'], ['accent2', 'var(--accent2)'],
    ['ink', 'var(--ink)'], ['muted', 'var(--muted)'], ['surface', 'var(--surface)'],
  ];

  const swatches = (label, key, val) =>
    `<div class="field stack"><label>${label}</label>
      <div class="swatches" data-sw="${key}">
        ${PALETTE_KEYS.map(([k, css]) =>
          `<button class="sw ${val === k ? 'on' : ''}" data-val="${k}" title="${k}"
            style="background:${css}"></button>`).join('')}
        <button class="sw ${val === 'transparent' ? 'on' : ''}" data-val="transparent" title="none"
          style="background:repeating-conic-gradient(#333 0 25%, #555 0 50%) 0/10px 10px"></button>
        <input type="color" data-custom="${key}" value="${/^#/.test(val || '') ? val : '#5b8cff'}" title="Custom colour">
      </div></div>`;

  /* ---------- the two panel modes ---------- */

  function render() {
    const els = Store.selectedElements();
    // The finish swatches render the real treatment, so the panel needs the
    // deck's colour variables. Editor chrome uses --ui-* names, so there's
    // no collision with these.
    applyTheme(root, Store.deck.theme, Store.deck);
    root.innerHTML = els.length ? elementPanel(els) : slidePanel();
    hydrateIcons(root);
    wire();
  }

  /* --- nothing selected: slide + deck properties --- */

  function slidePanel() {
    const slide = Store.currentSlide();
    if (!slide) return '<div class="insp-empty">No slide</div>';
    const i = Store.sel.slide;

    return `
      <div class="insp-empty">
        <b>Slide ${i + 1}</b>
        Click an element to edit it.<br>Double-click text to type.
      </div>

      ${section('Transition', `
        ${chips('Style', 'transition', slide.transition,
          Motion.TRANSITIONS.map(([k, label]) => [k, label]))}
      `)}

      ${section('Atmosphere', `
        ${chips('Depth', 'bgPreset', slide.bgPreset || 'none',
          Object.entries(Backgrounds.PRESETS).map(([k, v]) => [k, v.name]))}
        ${chips('Motion', 'bgMotion', slide.bgMotion || 'drift',
          Object.entries(Backgrounds.MOTIONS).map(([k, v]) => [k, v.name]))}
        <div class="field"><label>Tempo</label>
          <input class="inp" type="range" data-slidenum="bgSpeed"
            value="${slide.bgSpeed || 1}" min=".25" max="3" step=".05">
          <span class="rangeval" style="width:34px;text-align:right;color:var(--ui-muted)">${
            (slide.bgSpeed || 1).toFixed(2)}×</span></div>
        <div class="btnrow" style="margin-top:8px">
          <button class="btn ${slide.bgGrain ? 'on' : ''}" data-slidetoggle="bgGrain">Grain</button>
          <button class="btn ${slide.bgVignette ? 'on' : ''}" data-slidetoggle="bgVignette">Vignette</button>
        </div>
        <div style="color:var(--ui-muted);font-size:11.5px;line-height:1.5;margin-top:8px">
          The blooms drift on separate clocks so the background never visibly
          loops. All built from the deck's accent, so they can't clash.
        </div>
      `)}

      ${section('Background colour', `
        <div class="field"><label>Override</label>
          <input type="color" data-slidebg value="${slide.bg && /^#/.test(slide.bg) ? slide.bg : '#0a0a0c'}">
          <button class="btn" data-act="clearBg">Use theme</button>
        </div>
      `)}

      ${section('Slide', `
        <div class="btnrow" style="margin-bottom:6px">
          <button class="btn" data-act="dupSlide">${'${icon:copy}'} Duplicate</button>
          <button class="btn danger" data-act="delSlide">${'${icon:trash}'}</button>
        </div>
        <div class="btnrow">
          <button class="btn" data-act="slideUp">${'${icon:up}'} Move up</button>
          <button class="btn" data-act="slideDown">${'${icon:down}'} Down</button>
        </div>
      `)}

      ${section('Deck', `
        ${select('Theme', 'deckTheme', Store.deck.theme,
          Object.entries(THEMES).map(([k, t]) => [k, t.name]))}
        <div class="field"><label>Slides</label>
          <span style="color:var(--ui-muted)">${Store.deck.slides.length}</span></div>
      `)}
    `;
  }

  /* --- element(s) selected --- */

  function elementPanel(els) {
    const e = els[0];
    const many = els.length > 1;
    const mixed = (key) => many && els.some(x => x[key] !== e[key]);

    let out = section(many ? `${els.length} elements` : e.type, `
      <div class="grid2">
        ${num('X', 'x', e.x)}${num('Y', 'y', e.y)}
      </div>
      <div class="grid2">
        ${num('W', 'w', e.w, { min: 8 })}${num('H', 'h', e.h, { min: 8 })}
      </div>
      ${num('Rotation', 'rot', e.rot, { min: -360, max: 360 })}
      ${range('Opacity', 'opacity', e.opacity, 0, 1, .01)}
    `);

    out += section('Align', `
      <div class="grid3" style="margin-bottom:6px">
        <button class="btn" data-align="left">Left</button>
        <button class="btn" data-align="hcent">Center</button>
        <button class="btn" data-align="right">Right</button>
      </div>
      <div class="grid3" style="margin-bottom:6px">
        <button class="btn" data-align="top">Top</button>
        <button class="btn" data-align="vcent">Middle</button>
        <button class="btn" data-align="bottom">Bottom</button>
      </div>
      ${many ? `<div class="grid2">
        <button class="btn" data-dist="h">Distribute ⇢</button>
        <button class="btn" data-dist="v">Distribute ⇡</button>
      </div>` : ''}
    `);

    /* type-specific */
    if (e.type === 'text' && !many) out += textSection(e);
    if (e.type === 'shape')         out += shapeSection(e);
    if (e.type === 'image' && !many) out += imageSection(e);
    if (e.type === 'code'  && !many) out += codeSection(e);
    if (e.type === 'chart' && !many) out += chartSection(e);
    if (e.type === 'table' && !many) out += tableSection(e);
    if (e.type === 'mockup' && !many) out += mockupSection(e);

    out += section('Effects', `
      ${chips('Shadow', 'shadow', e.shadow,
        [['none', 'None'], ['soft', 'Soft'], ['lifted', 'Lifted'],
         ['dramatic', 'Dramatic'], ['glow', 'Glow']])}
    `);

    out += section('Entrance', `
      <div data-chips="anim">
        ${Motion.ENTRANCES.map(g => `
          <div class="insp-sub">${g.group}</div>
          <div class="chiprow" style="margin-bottom:7px">
            ${g.items.map(([v, label]) =>
              `<button class="chip ${(e.anim || 'rise') === v ? 'on' : ''}" data-val="${v}">${label}</button>`
            ).join('')}
          </div>`).join('')}
      </div>
      ${chips('Speed', 'animSpeed', e.animSpeed || 'normal',
        Motion.SPEEDS.map(([k, label]) => [k, label]))}
      <div class="insp-sub" style="margin-top:2px">
        Elements arrive in stacking order with a stagger. Set Build order below
        to hold one back until you click.
      </div>
    `);

    out += section('Emphasis', `
      ${chips('Loop', 'emphasis', e.emphasis || 'none',
        Motion.EMPHASIS.map(([k, label]) => [k, label]))}
      <div class="insp-sub" style="margin-top:2px">
        Runs continuously while the slide is shown. Deliberately subtle — pick
        one hero element, not the whole slide.
      </div>
    `);

    out += section('Build order', `
      <div class="field"><label>Reveal at</label>
        <select class="inp" data-key="build">
          ${[0, 1, 2, 3, 4, 5].map(n =>
            `<option value="${n}"${n === e.build ? ' selected' : ''}>${
              n === 0 ? 'With slide' : `Click ${n}`}</option>`).join('')}
        </select></div>
      <div style="color:var(--ui-muted);font-size:11.5px;line-height:1.5">
        Elements set to a click number stay hidden until you advance during the talk.
      </div>
    `);

    out += section('Arrange', `
      <div class="grid4" style="margin-bottom:8px">
        <button class="btn" data-order="back"  title="Send to back">⤓</button>
        <button class="btn" data-order="bwd"   title="Send backward">↓</button>
        <button class="btn" data-order="fwd"   title="Bring forward">↑</button>
        <button class="btn" data-order="front" title="Bring to front">⤒</button>
      </div>
      <div class="btnrow">
        <button class="btn" data-act="dupEl">${'${icon:copy}'} Duplicate</button>
        <button class="btn" data-act="lockEl">${'${icon:lock}'} ${e.locked ? 'Unlock' : 'Lock'}</button>
        <button class="btn danger" data-act="delEl">${'${icon:trash}'}</button>
      </div>
    `);

    return out;
  }

  /* ---------- type sections ---------- */

  const textSection = (e) => section('Type', `
    <div class="field stack"><label>Content</label>
      <textarea class="inp" data-key="text" rows="3">${Render.esc(e.text)}</textarea>
      <div style="color:var(--ui-muted);font-size:11px;line-height:1.5">
        <b>**bold**</b> · <i>*italic*</i> · <code>\`code\`</code> · {accent colour}
      </div>
    </div>
    ${select('Style', 'role', e.role,
      [['display', 'Display'], ['title', 'Title'], ['subtitle', 'Subtitle'],
       ['body', 'Body'], ['caption', 'Caption'], ['kicker', 'Kicker']])}
    ${num('Size', 'size', e.size, { min: 8, max: 400 })}
    ${select('Weight', 'weight', e.weight,
      [[300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Black']])}
    ${seg('Align', 'align', e.align,
      [['left', { label: '⇤' }], ['center', { label: '↔' }], ['right', { label: '⇥' }]])}
    ${seg('Vertical', 'valign', e.valign,
      [['top', { label: '⇡' }], ['middle', { label: '↕' }], ['bottom', { label: '⇣' }]])}
    ${range('Line height', 'lineHeight', e.lineHeight, .8, 2.4, .01)}
    ${range('Tracking', 'letterSpacing', e.letterSpacing, -.08, .3, .005)}
    ${swatches('Colour', 'color', e.color)}
    <div class="btnrow">
      <button class="btn ${e.italic ? 'on' : ''}" data-toggle="italic">Italic</button>
      <button class="btn ${e.uppercase ? 'on' : ''}" data-toggle="uppercase">UPPER</button>
    </div>
  `) + section('Finish', `
    <div class="fin-grid" data-chips="finish">
      ${[['none', 'Plain'], ['gradient', 'Gradient'], ['gloss', 'Gloss'], ['chrome', 'Chrome'],
         ['liquidglass', 'Liquid glass'], ['liquid', 'Liquid'], ['shimmer', 'Shimmer'],
         ['frost', 'Frost'], ['emboss', 'Emboss'], ['outline', 'Outline']].map(([v, label]) =>
        `<button class="chip fin ${(e.finish || 'none') === v ? 'on' : ''}" data-val="${v}">
           <span class="fin-prev finish-${v}">Ag</span><em>${label}</em></button>`).join('')}
    </div>
    <div style="color:var(--ui-muted);font-size:11.5px;line-height:1.5;margin-top:9px">
      Liquid and Shimmer animate while presenting. Use one per slide, on the
      biggest thing — if everything shines, nothing does.
    </div>
  `);

  /* Only the parameters the active generator actually reads are shown —
     a "sides" slider on an ellipse is noise. */
  const SHAPE_CONTROLS = {
    sides:        (e) => num('Sides', 'sides', e.sides ?? 6, { min: 3, max: 24 }),
    radius:       (e) => num('Corner radius', 'radius', e.radius ?? 0, { min: 0, max: 400 }),
    rotation:     (e) => range('Angle', 'rotation', e.rotation ?? 0, -180, 180, 1),
    innerRatio:   (e) => range('Inner', 'innerRatio', e.innerRatio ?? .5, .05, .98, .01),
    thickness:    (e) => range('Thickness', 'thickness', e.thickness ?? .34, .02, .95, .01),
    headRatio:    (e) => range('Head', 'headRatio', e.headRatio ?? .42, .1, .9, .01),
    exponent:     (e) => range('Squareness', 'exponent', e.exponent ?? 4, 2, 12, .1),
    irregularity: (e) => range('Irregularity', 'irregularity', e.irregularity ?? .28, 0, .9, .01),
    seed:         (e) => num('Seed', 'seed', e.seed ?? 7, { min: 1, max: 999 }),
    frequency:    (e) => range('Frequency', 'frequency', e.frequency ?? 2, .5, 12, .1),
    amplitude:    (e) => range('Amplitude', 'amplitude', e.amplitude ?? .3, 0, 1, .01),
    startAngle:   (e) => range('Start', 'startAngle', e.startAngle ?? -90, -180, 180, 1),
    sweep:        (e) => range('Sweep', 'sweep', e.sweep ?? 270, 1, 359, 1),
    tail:         (e) => range('Tail', 'tail', e.tail ?? .3, .05, .95, .01),
    corners:      (e) => `
      ${num('Corner radius', 'radius', e.radius ?? 0, { min: 0, max: 400 })}
      <div class="insp-sub">Per corner — blank follows the value above</div>
      <div class="grid4">
        ${['rTL', 'rTR', 'rBR', 'rBL'].map(k =>
          `<input class="inp" type="number" data-key="${k}" placeholder="—"
             value="${e[k] ?? ''}" min="0" max="400" title="${k}">`).join('')}
      </div>`,
  };

  const shapeSection = (e) => {
    const kind = e.shape || 'rect';
    const params = Shapes.PARAMS[Shapes.ALIAS[kind] || kind] || [];
    return section('Shape', `
      <div class="shape-grid" data-chips="shape">
        ${Shapes.CATALOG.map(([k, label]) =>
          `<button class="chip shp ${k === kind ? 'on' : ''}" data-val="${k}" title="${label}">
             <svg viewBox="0 0 40 40" aria-hidden="true"><path d="${
               Shapes.path({ ...e, shape: k, w: 34, h: 34, radius: Math.min(e.radius ?? 6, 8) })
             }" transform="translate(3,3)"/></svg>
             <em>${label}</em></button>`).join('')}
      </div>
      ${params.length ? `<div class="insp-sub" style="margin-top:10px">Parameters</div>
        ${params.map(p => SHAPE_CONTROLS[p]?.(e) || '').join('')}` : ''}
    `) + section('Material', `
      ${chips('Surface', 'material', e.material || 'none',
        [['none', 'Solid'], ['glass', 'Frosted'], ['liquid', 'Liquid glass']])}
      ${(e.material || 'none') === 'none' ? `
        ${swatches('Fill', 'fill', e.fill)}
        ${swatches('Stroke', 'stroke', e.stroke)}
        ${num('Stroke width', 'strokeWidth', e.strokeWidth, { min: 0, max: 40 })}
      ` : `<div class="insp-sub">Liquid glass refracts whatever sits behind it —
             put it over a photo or a moving background, not over flat colour.</div>`}
    `);
  };

  const imageSection = (e) => section('Image', `
    <div class="field stack"><label>Source URL</label>
      <input class="inp" data-key="src" value="${Render.esc(e.src)}" placeholder="https://… or drop a file">
    </div>
    <div class="btnrow" style="margin-bottom:8px">
      <button class="btn" data-act="pickImage">Choose file…</button>
    </div>
    ${seg('Fit', 'fit', e.fit,
      [['cover', { label: 'Cover' }], ['contain', { label: 'Contain' }], ['fill', { label: 'Fill' }]])}
    ${num('Corner radius', 'radius', e.radius, { min: 0, max: 400 })}
    <div class="field stack"><label>Alt text</label>
      <input class="inp" data-key="alt" value="${Render.esc(e.alt)}"></div>
  `);

  const codeSection = (e) => section('Code', `
    <div class="field stack"><label>Source</label>
      <textarea class="inp" data-key="code" rows="8">${Render.esc(e.code)}</textarea></div>
    ${num('Size', 'size', e.size, { min: 10, max: 90 })}
    <div class="btnrow">
      <button class="btn ${e.showLines ? 'on' : ''}" data-toggle="showLines">Line numbers</button>
    </div>
  `);

  const chartSection = (e) => section('Chart', `
    ${chips('Type', 'kind', e.kind,
      [['bar', 'Bar'], ['line', 'Line'], ['area', 'Area'], ['donut', 'Donut']])}
    <div class="field stack"><label>Labels (comma separated)</label>
      <input class="inp" data-csv="labels" value="${Render.esc(e.labels.join(', '))}"></div>
    <div class="field stack"><label>Values (comma separated)</label>
      <input class="inp" data-series="0" value="${Render.esc(e.series[0].data.join(', '))}"></div>
    <div class="btnrow">
      <button class="btn ${e.showGrid ? 'on' : ''}" data-toggle="showGrid">Grid</button>
      <button class="btn ${e.showValues ? 'on' : ''}" data-toggle="showValues">Values</button>
    </div>
  `);

  const mockupSection = (e) => section('Device', `
    ${chips('Frame', 'kind', e.kind,
      [['browser', 'Browser'], ['window', 'Window'], ['phone', 'Phone']])}
    <div class="field stack"><label>Screenshot</label>
      <input class="inp" data-key="src" value="${Render.esc(e.src)}" placeholder="https://… or drop a file">
    </div>
    <div class="btnrow" style="margin-bottom:8px">
      <button class="btn" data-act="pickImage">Choose file…</button>
    </div>
    ${e.kind === 'browser' ? `<div class="field stack"><label>URL bar</label>
      <input class="inp" data-key="url" value="${Render.esc(e.url)}"></div>` : ''}
    ${e.kind !== 'phone' ? num('Corner radius', 'radius', e.radius, { min: 0, max: 60 }) : ''}
  `);

  const tableSection = (e) => section('Table', `
    <div class="field stack"><label>Header row</label>
      <input class="inp" data-csv="head" value="${Render.esc(e.head.join(', '))}"></div>
    <div class="field stack"><label>Body — one row per line</label>
      <textarea class="inp" data-rows rows="5">${Render.esc(e.rows.map(r => r.join(', ')).join('\n'))}</textarea></div>
    ${num('Size', 'size', e.size, { min: 12, max: 70 })}
  `);

  /* ---------- wiring ---------- */

  function wire() {
    const upd = (patch, tag, live) => Canvas.updateSelected(patch, tag, live);

    // numeric / text / select inputs bound by data-key
    root.querySelectorAll('[data-key]').forEach(inp => {
      const key = inp.dataset.key;
      const isNum = inp.type === 'number' || inp.type === 'range';
      const evt = (inp.tagName === 'SELECT' || inp.type === 'color') ? 'change' : 'input';

      inp.addEventListener(evt, () => {
        // Per-corner overrides are intentionally nullable: cleared means
        // "inherit the shared radius", which is not the same as zero.
        if (/^r(TL|TR|BR|BL)$/.test(key) && inp.value.trim() === '') {
          upd({ [key]: null }, 'insp-' + key);
          return;
        }
        let v = isNum ? parseFloat(inp.value) : inp.value;
        if (isNum && Number.isNaN(v)) return;
        if (key === 'build') v = parseInt(inp.value, 10);
        if (key === 'weight') v = parseInt(inp.value, 10);

        const label = inp.parentElement.querySelector('.rangeval');
        if (label) label.textContent = Math.round(v * 100) / 100;

        // Sliders and number spinners fire continuously — patch in place so the
        // control keeps pointer capture and the drag stays smooth.
        upd({ [key]: v }, 'insp-' + key, isNum);
      });

      // Once the scrub finishes, do a full resync so thumbnails catch up.
      if (isNum) inp.addEventListener('change', () => Store.settle());
    });

    // segmented controls
    root.querySelectorAll('[data-seg]').forEach(box => {
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        upd({ [box.dataset.seg]: b.dataset.val });
      });
    });

    // chip rows — also used for slide transition
    root.querySelectorAll('[data-chips]').forEach(box => {
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('button');
        if (!b) return;
        const key = box.dataset.chips;
        // Slide-level properties live on the slide, not the selected element.
        if (['transition', 'bgPreset', 'bgMotion'].includes(key)) {
          Store.commit(() => { Store.currentSlide()[key] = b.dataset.val; });
        } else {
          upd({ [key]: b.dataset.val });
        }
      });
    });

    // palette swatches
    root.querySelectorAll('[data-sw]').forEach(box => {
      const key = box.dataset.sw;
      box.addEventListener('click', (ev) => {
        const b = ev.target.closest('.sw');
        if (!b) return;
        const v = b.dataset.val;
        upd({ [key]: v === 'transparent' ? null : v });
      });
      box.querySelector('[data-custom]')?.addEventListener('input', (ev) => {
        upd({ [key]: ev.target.value }, 'insp-color');
      });
    });

    // boolean toggles
    root.querySelectorAll('[data-toggle]').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.toggle;
        const cur = Store.selectedElements()[0]?.[key];
        upd({ [key]: !cur });
      });
    });

    // slide-level numbers (background tempo) — live so the scrub stays smooth
    root.querySelectorAll('[data-slidenum]').forEach(inp => {
      const key = inp.dataset.slidenum;
      inp.addEventListener('input', () => {
        const v = parseFloat(inp.value);
        if (Number.isNaN(v)) return;
        const label = inp.parentElement.querySelector('.rangeval');
        if (label) label.textContent = v.toFixed(2) + '×';
        Store.commit(() => { Store.currentSlide()[key] = v; }, { tag: 'slide-' + key, live: true });
      });
      inp.addEventListener('change', () => Store.settle());
    });

    // slide-level booleans (grain, vignette)
    root.querySelectorAll('[data-slidetoggle]').forEach(b => {
      b.addEventListener('click', () => {
        const key = b.dataset.slidetoggle;
        Store.commit(() => { const s = Store.currentSlide(); s[key] = !s[key]; });
      });
    });

    // comma-separated arrays (chart labels, table header)
    root.querySelectorAll('[data-csv]').forEach(inp => {
      inp.addEventListener('input', () => {
        const arr = inp.value.split(',').map(s => s.trim());
        upd({ [inp.dataset.csv]: arr }, 'insp-csv');
      });
    });

    root.querySelectorAll('[data-series]').forEach(inp => {
      inp.addEventListener('input', () => {
        const data = inp.value.split(',').map(s => parseFloat(s.trim())).filter(n => !Number.isNaN(n));
        if (!data.length) return;
        const el = Store.selectedElements()[0];
        const series = structuredClone(el.series);
        series[0].data = data;
        upd({ series }, 'insp-series');
      });
    });

    root.querySelector('[data-rows]')?.addEventListener('input', (ev) => {
      const rows = ev.target.value.split('\n').filter(l => l.trim())
        .map(l => l.split(',').map(s => s.trim()));
      upd({ rows }, 'insp-rows');
    });

    // align / distribute / order
    root.querySelectorAll('[data-align]').forEach(b =>
      b.addEventListener('click', () => Canvas.align(b.dataset.align)));
    root.querySelectorAll('[data-dist]').forEach(b =>
      b.addEventListener('click', () => Canvas.distribute(b.dataset.dist)));
    root.querySelectorAll('[data-order]').forEach(b =>
      b.addEventListener('click', () => Canvas.reorder(b.dataset.order)));

    // slide background
    root.querySelector('[data-slidebg]')?.addEventListener('input', (ev) => {
      Store.commit(() => { Store.currentSlide().bg = ev.target.value; }, { tag: 'slidebg' });
    });

    // deck theme
    root.querySelector('[data-key="deckTheme"]')?.addEventListener('change', (ev) => {
      Store.commit(d => { d.theme = ev.target.value; });
    });

    // buttons
    const acts = {
      dupSlide:  () => Rail.duplicateSlide(),
      delSlide:  () => Rail.deleteSlide(),
      slideUp:   () => Rail.moveSlide(-1),
      slideDown: () => Rail.moveSlide(1),
      clearBg:   () => Store.commit(() => { Store.currentSlide().bg = null; }),
      dupEl:     () => Canvas.duplicateSelected(),
      delEl:     () => Canvas.deleteSelected(),
      lockEl:    () => { const cur = Store.selectedElements()[0]?.locked; Canvas.updateSelected({ locked: !cur }); },
      pickImage: () => App.pickImage(),
    };
    root.querySelectorAll('[data-act]').forEach(b =>
      b.addEventListener('click', () => acts[b.dataset.act]?.()));
  }

  /* Push current model values into the existing inputs, without touching the
     DOM structure — so the control being dragged survives the update. The
     focused input is skipped: it's the source of truth mid-interaction, and
     writing back to it would fight the user's cursor. */
  function syncValues() {
    const el = Store.selectedElements()[0];
    if (!el) return;
    root.querySelectorAll('[data-key]').forEach(inp => {
      const key = inp.dataset.key;
      if (!(key in el) || inp === document.activeElement) return;
      const v = el[key];
      if (inp.value != v) inp.value = v;
      const label = inp.parentElement.querySelector('.rangeval');
      if (label) label.textContent = Math.round(v * 100) / 100;
    });
  }

  return { render, syncValues };
})();
