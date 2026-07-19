/* ============================================================
   Slide rail — thumbnails, reordering, slide-level operations.
   Thumbnails are real renders, not screenshots, so they're always
   in sync with the slide and cost nothing to regenerate.
   ============================================================ */

const Rail = (() => {
  const list = document.getElementById('railList');
  let dragId = null;

  function render() {
    const { slides } = Store.deck;
    const sel = Store.sel.slide;
    list.innerHTML = '';

    slides.forEach((slide, i) => {
      const row = document.createElement('div');
      row.className = 'thumb' + (i === sel ? ' sel' : '');
      row.draggable = true;
      row.dataset.id = slide.id;
      row.dataset.index = i;

      const badges = [];
      if (slide.notes.trim()) badges.push('<i class="badge">NOTES</i>');
      const builds = Render.maxBuild(slide);
      if (builds) badges.push(`<i class="badge">${builds + 1} BUILDS</i>`);

      row.innerHTML = `
        <div class="thumb-no">${i + 1}</div>
        <div class="thumb-frame"><div class="thumb-slot"></div>
          <div class="thumb-badges">${badges.join('')}</div>
        </div>`;

      // Insert first, then measure. Deferring this to requestAnimationFrame
      // would leave every thumbnail blank whenever the deck renders while the
      // tab is backgrounded — rAF simply doesn't fire there.
      list.appendChild(row);

      const w = row.querySelector('.thumb-frame').clientWidth || 180;
      row.querySelector('.thumb-slot')
         .appendChild(Render.slideNode(slide, Store.deck, { scale: w / DESIGN_W }));
    });
  }

  /* ---------- interaction ---------- */

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.thumb');
    if (row) Store.gotoSlide(+row.dataset.index);
  });

  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.thumb');
    if (!row) return;
    dragId = row.dataset.id;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragend', () => {
    dragId = null;
    list.querySelectorAll('.thumb').forEach(r => r.classList.remove('dragging', 'drag-over'));
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const row = e.target.closest('.thumb');
    list.querySelectorAll('.thumb').forEach(r => r.classList.toggle('drag-over', r === row));
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const row = e.target.closest('.thumb');
    if (!row || !dragId) return;
    const to = +row.dataset.index;

    Store.commit(d => {
      const from = d.slides.findIndex(s => s.id === dragId);
      if (from < 0 || from === to) return;
      const [moved] = d.slides.splice(from, 1);
      d.slides.splice(to, 0, moved);
    });
    // Follow the slide you just moved.
    Store.gotoSlide(Store.deck.slides.findIndex(s => s.id === dragId));
  });

  /* ---------- slide operations ---------- */

  function addSlide(layoutKey = 'bullets', at = null) {
    const slide = makeSlide({ elements: (LAYOUTS[layoutKey] || LAYOUTS.blank).build() });
    const index = at ?? Store.sel.slide + 1;
    Store.commit(d => d.slides.splice(index, 0, slide));
    Store.gotoSlide(index);
    return slide;
  }

  function applyLayout(layoutKey) {
    const layout = LAYOUTS[layoutKey];
    if (!layout) return;
    Store.commit(() => {
      Store.currentSlide().elements = layout.build();
    });
    Store.select([]);
  }

  function duplicateSlide() {
    const s = Store.currentSlide();
    if (!s) return;
    const copy = structuredClone(s);
    copy.id = uid();
    copy.elements.forEach(e => e.id = uid());
    const at = Store.sel.slide + 1;
    Store.commit(d => d.slides.splice(at, 0, copy));
    Store.gotoSlide(at);
  }

  function deleteSlide() {
    if (Store.deck.slides.length <= 1) {
      App.toast('A deck needs at least one slide', 'err');
      return;
    }
    const at = Store.sel.slide;
    Store.commit(d => d.slides.splice(at, 1));
    Store.gotoSlide(Math.min(at, Store.deck.slides.length - 1));
  }

  function moveSlide(dir) {
    const from = Store.sel.slide;
    const to = from + dir;
    if (to < 0 || to >= Store.deck.slides.length) return;
    Store.commit(d => {
      const [s] = d.slides.splice(from, 1);
      d.slides.splice(to, 0, s);
    });
    Store.gotoSlide(to);
  }

  return { render, addSlide, applyLayout, duplicateSlide, deleteSlide, moveSlide };
})();
