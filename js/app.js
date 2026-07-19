/* ============================================================
   App — wiring, keyboard, modals, boot.
   ============================================================ */

const App = (() => {

  const stageStatus = document.getElementById('stageStatus');
  const notesArea   = document.getElementById('notesArea');
  const notesDrawer = document.getElementById('notesDrawer');
  const deckTitle   = document.getElementById('deckTitle');
  const sheet       = document.getElementById('sheet');
  const sheetPanel  = document.getElementById('sheetPanel');
  const filePicker  = document.getElementById('filePicker');

  /* ---------- toast ---------- */

  function toast(msg, kind = '') {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 320);
    }, kind === 'err' ? 4200 : 2600);
  }

  /* ---------- modal sheet ---------- */

  function openSheet(html) {
    sheetPanel.innerHTML = html;
    sheet.hidden = false;
    hydrateIcons(sheetPanel);
  }
  const closeSheet = () => { sheet.hidden = true; sheetPanel.innerHTML = ''; };

  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  /* ---------- layout picker ---------- */

  function showLayouts() {
    const cards = Object.entries(LAYOUTS).map(([key, l]) => `
      <button class="card" data-layout="${key}">
        <div class="card-prev" data-prev="${key}"></div>
        <div class="card-meta"><b>${l.name}</b><span>${l.hint}</span></div>
      </button>`).join('');

    openSheet(`
      <h2>Layouts</h2>
      <p class="sub">Click to add a new slide. Hold <kbd>Shift</kbd> to replace the current slide instead.</p>
      <div class="card-grid">${cards}</div>`);

    // Live-render a real preview of each layout in the current theme.
    sheetPanel.querySelectorAll('[data-prev]').forEach(box => {
      const slide = makeSlide({ elements: LAYOUTS[box.dataset.prev].build() });
      applyTheme(box, Store.deck.theme);
      const w = box.clientWidth || 190;
      box.appendChild(Render.slideNode(slide, Store.deck, { scale: w / DESIGN_W }));
    });

    sheetPanel.querySelectorAll('[data-layout]').forEach(b => {
      b.addEventListener('click', (e) => {
        if (e.shiftKey) Rail.applyLayout(b.dataset.layout);
        else Rail.addSlide(b.dataset.layout);
        closeSheet();
      });
    });
  }

  /* ---------- theme picker ---------- */

  function showThemes() {
    const cards = Object.entries(THEMES).map(([key, t]) => `
      <button class="card" data-theme="${key}">
        <div class="card-prev" data-tprev="${key}"></div>
        <div class="card-meta"><b>${t.name}${key === Store.deck.theme ? ' ✓' : ''}</b><span>${t.mood}</span></div>
      </button>`).join('');

    openSheet(`
      <h2>Theme</h2>
      <p class="sub">Applies to every slide at once. Anything you coloured with a palette swatch follows along; explicit hex colours stay put.</p>
      <div class="card-grid">${cards}</div>`);

    // Preview each theme using the deck's own first slide — you see your content, not a stock mock.
    const sample = Store.currentSlide() || Store.deck.slides[0];
    sheetPanel.querySelectorAll('[data-tprev]').forEach(box => {
      applyTheme(box, box.dataset.tprev);
      const w = box.clientWidth || 190;
      box.appendChild(Render.slideNode(sample, Store.deck, { scale: w / DESIGN_W }));
    });

    sheetPanel.querySelectorAll('[data-theme]').forEach(b => {
      b.addEventListener('click', () => {
        Store.commit(d => { d.theme = b.dataset.theme; });
        toast(`Theme: ${THEMES[b.dataset.theme].name}`);
        closeSheet();
      });
    });
  }

  /* ---------- export sheet ---------- */

  function showExport() {
    openSheet(`
      <h2>Export</h2>
      <p class="sub">Your deck autosaves to this browser. These are the ways to take it elsewhere.</p>
      <div class="card-grid">
        <button class="card" data-x="html"><div class="card-meta" style="padding:16px">
          <b>Standalone HTML</b><span>One file. Plays fullscreen in any browser, with no internet. This is what you present from on someone else's laptop.</span>
        </div></button>
        <button class="card" data-x="pdf"><div class="card-meta" style="padding:16px">
          <b>PDF</b><span>Opens the print dialog. Pick "Save as PDF", landscape, margins none. Best for sending a read-only copy.</span>
        </div></button>
        <button class="card" data-x="json"><div class="card-meta" style="padding:16px">
          <b>Deck file (.json)</b><span>Lossless. The only format that reopens here with everything editable.</span>
        </div></button>
        <button class="card" data-x="import"><div class="card-meta" style="padding:16px">
          <b>Import .json</b><span>Replaces what's open now. Export first if you haven't.</span>
        </div></button>
      </div>`);

    const acts = {
      html: () => Exporter.exportHTML(),
      pdf:  () => Exporter.exportPDF(),
      json: () => Exporter.exportJSON(),
      import: () => pickFile('application/json', f => Exporter.importJSON(f)),
    };
    sheetPanel.querySelectorAll('[data-x]').forEach(b =>
      b.addEventListener('click', () => { closeSheet(); acts[b.dataset.x](); }));
  }

  /* ---------- shortcuts sheet ---------- */

  const SHORTCUTS = [
    ['Present from start', 'Ctrl Enter'], ['Present from this slide', 'Shift F5'],
    ['Presenter view (while presenting)', 'P'], ['Exit presenting', 'Esc'],
    ['Black / white screen (presenting)', 'B / W'],
    ['New slide', 'Ctrl M'], ['Duplicate slide', 'Ctrl Shift D'],
    ['Next / previous slide', 'PgDn / PgUp'],
    ['Undo / redo', 'Ctrl Z / Ctrl Shift Z'],
    ['Insert text', 'T'], ['Insert shape', 'S'], ['Insert image', 'I'],
    ['Edit text', 'Double-click'], ['Duplicate element', 'Ctrl D'],
    ['Delete element', 'Delete'], ['Nudge / big nudge', 'Arrows / Shift Arrows'],
    ['Constrain drag or ratio', 'Hold Shift'], ['Disable snapping', 'Hold Alt'],
    ['Bring forward / send back', 'Ctrl ] / Ctrl ['],
    ['Select all on slide', 'Ctrl A'], ['Deselect', 'Esc'],
    ['Zoom in / out / fit', 'Ctrl + / Ctrl − / Ctrl 0'],
    ['Layouts', 'Ctrl L'], ['Themes', 'Ctrl K'], ['Export', 'Ctrl E'],
    ['This list', '?'],
  ];

  function showShortcuts() {
    openSheet(`
      <h2>Keyboard</h2>
      <p class="sub">Everything worth doing has a key. Learn six of them and you'll never touch the inspector.</p>
      <div class="kbd-grid">${SHORTCUTS.map(([what, keys]) => `
        <div class="kbd-row"><span>${what}</span>
          <span>${keys.split(' ').map(k => `<kbd>${k}</kbd>`).join(' ')}</span></div>`).join('')}
      </div>`);
  }

  /* ---------- file picking ---------- */

  let pickHandler = null;
  function pickFile(accept, cb) {
    filePicker.accept = accept;
    pickHandler = cb;
    filePicker.value = '';
    filePicker.click();
  }
  filePicker.addEventListener('change', () => {
    const f = filePicker.files?.[0];
    if (f && pickHandler) pickHandler(f);
    pickHandler = null;
  });

  const pickImage = () => pickFile('image/*', f => Canvas.insertImageFile(f));

  /* ---------- toolbar ---------- */

  const ACTIONS = {
    undo: () => { if (!Store.undo()) toast('Nothing to undo'); },
    redo: () => { if (!Store.redo()) toast('Nothing to redo'); },
    present: () => Present.start(0),
    layouts: showLayouts,
    theme: showThemes,
    export: showExport,
    shortcuts: showShortcuts,
    addSlide: () => Rail.addSlide('bullets'),
    zoomIn:  () => Canvas.zoomBy(1.2),
    zoomOut: () => Canvas.zoomBy(1 / 1.2),
    zoomFit: () => Canvas.zoomFit(),
    toggleNotes: () => { notesDrawer.hidden = !notesDrawer.hidden; Canvas.zoomFit(); },
  };

  document.querySelector('.topbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-insert]');
    if (!b) return;
    if (b.dataset.act) ACTIONS[b.dataset.act]?.();
    if (b.dataset.insert) insert(b.dataset.insert);
  });

  document.querySelector('.stage-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) ACTIONS[b.dataset.act]?.();
  });

  document.getElementById('rail').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) ACTIONS[b.dataset.act]?.();
  });

  function insert(type) {
    if (type === 'image') { pickImage(); return; }
    const presets = {
      text:  { w: 900, h: 160, size: 56, text: 'New text' },
      shape: { w: 420, h: 300 },
      chart: { w: 1200, h: 620 },
      code:  { w: 1200, h: 500 },
      table: { w: 1200, h: 400 },
    };
    Canvas.addElement(type, presets[type] || {});
  }

  /* ---------- global keyboard ---------- */

  window.addEventListener('keydown', (e) => {
    if (Present.active) return;                       // Present owns the keyboard
    if (Canvas.isEditing()) return;

    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;

    if (e.key === 'Escape') {
      if (!sheet.hidden) { closeSheet(); return; }
      if (typing) { e.target.blur(); return; }
      Store.select([]);
      return;
    }
    if (typing) return;

    // --- with modifier ---
    if (mod) {
      const k = e.key.toLowerCase();
      const map = {
        z: () => e.shiftKey ? Store.redo() : Store.undo(),
        y: () => Store.redo(),
        d: () => e.shiftKey ? Rail.duplicateSlide() : Canvas.duplicateSelected(),
        m: () => Rail.addSlide('bullets'),
        a: () => Store.select((Store.currentSlide()?.elements || []).map(el => el.id)),
        l: showLayouts,
        k: showThemes,
        e: showExport,
        s: () => { Persist.save(Store.deck); toast('Saved'); },
        enter: () => Present.start(0),
        ']': () => Canvas.reorder('fwd'),
        '[': () => Canvas.reorder('bwd'),
        '=': () => Canvas.zoomBy(1.2),
        '+': () => Canvas.zoomBy(1.2),
        '-': () => Canvas.zoomBy(1 / 1.2),
        '0': () => Canvas.zoomFit(),
      };
      const fn = map[k === 'enter' ? 'enter' : k];
      if (fn) { e.preventDefault(); fn(); }
      return;
    }

    // --- bare keys ---
    if (e.key === 'F5') { e.preventDefault(); Present.start(e.shiftKey ? Store.sel.slide : 0); return; }
    if (e.key === '?')  { e.preventDefault(); showShortcuts(); return; }

    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); Canvas.deleteSelected(); return; }
    if (e.key === 'PageDown') { e.preventDefault(); Store.gotoSlide(Store.sel.slide + 1); return; }
    if (e.key === 'PageUp')   { e.preventDefault(); Store.gotoSlide(Store.sel.slide - 1); return; }

    if (e.key.startsWith('Arrow')) {
      const step = e.shiftKey ? 40 : 4;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      // With nothing selected the arrows page through slides instead.
      if (!Store.sel.els.length) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') Store.gotoSlide(Store.sel.slide + 1);
        else Store.gotoSlide(Store.sel.slide - 1);
      } else {
        Canvas.nudge(...d);
      }
      return;
    }

    const inserts = { t: 'text', s: 'shape', i: 'image', c: 'chart' };
    if (inserts[e.key]) { e.preventDefault(); insert(inserts[e.key]); }
  });

  /* ---------- notes + title ---------- */

  notesArea.addEventListener('input', () => {
    Store.commit(() => { Store.currentSlide().notes = notesArea.value; },
      { tag: 'notes', silent: true });
    scheduleSave();
  });

  deckTitle.addEventListener('input', () => {
    Store.commit(d => { d.title = deckTitle.value; }, { tag: 'title', silent: true });
    scheduleSave();
  });

  /* ---------- reactive redraw ---------- */

  let saveTimer = null;
  const scheduleSave = () => Persist.saveDebounced(Store.deck, ok => {
    if (!ok) toast('Autosave failed — storage may be full. Export your deck.', 'err');
  });

  function syncChrome() {
    const i = Store.sel.slide;
    stageStatus.textContent = `Slide ${i + 1} of ${Store.deck.slides.length}`;
    document.getElementById('notesSlideNo').textContent = i + 1;
    if (document.activeElement !== notesArea) notesArea.value = Store.currentSlide()?.notes || '';
    if (document.activeElement !== deckTitle) deckTitle.value = Store.deck.title;

    document.querySelector('[data-act="undo"]').disabled = !Store.canUndo;
    document.querySelector('[data-act="redo"]').disabled = !Store.canRedo;

    applyTheme(document.getElementById('canvas'), Store.deck.theme);
  }

  Store.subscribe((reason) => {
    // A pure selection change doesn't need the canvas or rail rebuilt.
    if (reason === 'select') {
      Canvas.drawSelection();
      Inspector.render();
      return;
    }
    Canvas.render();
    Rail.render();
    Inspector.render();
    syncChrome();
    scheduleSave();
  });

  /* ---------- boot ---------- */

  function boot() {
    hydrateIcons(document.body);

    const saved = Persist.load();
    Store.deck = saved || starterDeck();

    applyTheme(document.getElementById('canvas'), Store.deck.theme);
    Canvas.zoomFit();
    Canvas.render();
    Rail.render();
    Inspector.render();
    syncChrome();

    if (saved) toast(`Recovered "${saved.title}" — ${saved.slides.length} slides`);

    // Last line of defence against losing work to a tab close.
    window.addEventListener('beforeunload', () => Persist.save(Store.deck));
  }

  return { toast, boot, pickImage, showLayouts, showThemes, showExport, showShortcuts, closeSheet };
})();

document.addEventListener('DOMContentLoaded', App.boot);
