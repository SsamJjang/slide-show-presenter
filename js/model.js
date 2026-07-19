/* ============================================================
   Deck model.

   Every coordinate in this app lives in a fixed 1920x1080 design
   space. Nothing is ever stored in screen pixels. That's what lets
   the same deck render identically in the editor thumbnail, the
   canvas, a 4K projector, and the print/PDF path — we only ever
   change the scale factor on the way out.
   ============================================================ */

const DESIGN_W = 1920;
const DESIGN_H = 1080;

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- element factories ---------- */

const ELEMENT_DEFAULTS = {
  text: {
    text: 'Text',
    role: 'body',           // display | title | subtitle | body | caption | kicker
    size: 44, weight: 400, align: 'left', valign: 'top',
    color: null,            // null = inherit from theme
    lineHeight: 1.25, letterSpacing: 0, italic: false, uppercase: false,
    finish: 'none',         // see Text finishes: gradient|gloss|chrome|liquid|shimmer|frost|emboss|outline
  },
  shape: {
    shape: 'rect',          // any generator in Shapes.CATALOG
    fill: 'accent', stroke: null, strokeWidth: 0,
    material: 'none',       // none | glass | liquid
    // Parametric controls. Each generator reads the subset it needs
    // (see Shapes.PARAMS), which is what makes the shape count unbounded.
    radius: 16, rotation: 0, sides: 6, innerRatio: .5, thickness: .34,
    headRatio: .42, exponent: 4, irregularity: .28, seed: 7,
    frequency: 2, amplitude: .3, startAngle: -90, sweep: 270, tail: .3,
    rTL: null, rTR: null, rBR: null, rBL: null,   // per-corner override
  },
  mockup: {
    kind: 'browser',        // browser | phone | window
    src: '', url: 'apex.dev', radius: 18,
  },
  image: { src: '', fit: 'cover', radius: 0, alt: '' },
  code:  { code: 'const ship = () => true;', lang: 'js', size: 26, showLines: true },
  chart: {
    kind: 'bar',            // bar | line | donut | area
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Revenue', data: [12, 28, 44, 96] }],
    showGrid: true, showValues: true,
  },
  table: {
    head: ['Feature', 'Us', 'Them'],
    rows: [['Latency', '12ms', '840ms'], ['Cost', '$0.02', '$1.40']],
    size: 26,
  },
};

function makeElement(type, patch = {}) {
  const base = {
    id: uid(), type,
    x: 200, y: 200, w: 600, h: 200,
    rot: 0, opacity: 1, locked: false, hidden: false,
    shadow: 'none',         // none | soft | lifted | dramatic | glow
    build: 0,               // 0 = always visible, 1+ = reveal step
    anim: 'rise',           // entrance — see Motion.ENTRANCES
    emphasis: 'none',       // looping behaviour — see Motion.EMPHASIS
    animSpeed: 'normal',    // fast | normal | slow
    link: '',               // Magic Move tag — same tag on two slides = one travelling object
  };
  return Object.assign(base, structuredClone(ELEMENT_DEFAULTS[type] || {}), patch);
}

function makeSlide(patch = {}) {
  return Object.assign({
    id: uid(),
    elements: [],
    bg: null,               // null = theme background
    bgPreset: 'none',       // see Backgrounds.PRESETS
    bgMotion: 'drift',      // how the depth moves: none|drift|breathe|flow|orbit
    bgSpeed: 1,             // tempo multiplier for that motion
    bgGrain: false,         // film grain overlay, stops large gradients banding
    bgVignette: false,
    transition: 'fade',     // fade | slide | push | zoom | none
    notes: '',
  }, patch);
}

function makeDeck() {
  return {
    version: 2,
    title: 'Untitled Deck',
    theme: 'obsidian',
    accent: null,           // hex override — derives the whole palette
    harmony: 'analogous',   // how the secondary is derived from the accent
    ratio: '16:9',
    slides: [],
  };
}

/* ============================================================
   Store — single source of truth, with undo history.

   History is coalescing: a drag that fires 200 mousemove commits
   collapses into one undo entry as long as the caller passes the
   same `tag`. Otherwise Ctrl+Z would walk back one pixel at a time.
   ============================================================ */

const Store = (() => {
  let deck = makeDeck();
  let sel = { slide: 0, els: [] };
  let past = [], future = [];
  let lastTag = null, lastCommitAt = 0;
  const listeners = new Set();

  const snapshot = () => structuredClone(deck);
  const emit = (reason) => listeners.forEach(fn => fn(reason));

  /* `live` is for continuous interaction — dragging an element, scrubbing a
     slider. It records history exactly the same way, but emits a 'live' signal
     so subscribers patch what changed instead of rebuilding everything. A full
     rebuild per pointermove means re-rendering every thumbnail and destroying
     the very slider under the user's cursor, which is both slow and broken. */
  function commit(mutator, { tag = null, silent = false, live = false } = {}) {
    const now = Date.now();
    const coalesce = tag && tag === lastTag && (now - lastCommitAt) < 900;

    if (!coalesce) {
      past.push(snapshot());
      if (past.length > 120) past.shift();
      future.length = 0;
    }
    lastTag = tag;
    lastCommitAt = now;

    mutator(deck);
    if (!silent) emit(live ? 'live' : 'commit');
    return deck;
  }

  /* Call when a live interaction ends, to resync the surfaces that were
     skipped (thumbnails, inspector layout). */
  function settle() { lastTag = null; emit('commit'); }

  function undo() {
    if (!past.length) return false;
    future.push(snapshot());
    deck = past.pop();
    lastTag = null;
    clampSelection();
    emit('undo');
    return true;
  }

  function redo() {
    if (!future.length) return false;
    past.push(snapshot());
    deck = future.pop();
    lastTag = null;
    clampSelection();
    emit('redo');
    return true;
  }

  function clampSelection() {
    if (sel.slide >= deck.slides.length) sel.slide = Math.max(0, deck.slides.length - 1);
    const live = new Set((currentSlide()?.elements || []).map(e => e.id));
    sel.els = sel.els.filter(id => live.has(id));
  }

  const currentSlide = () => deck.slides[sel.slide];
  const selectedElements = () =>
    (currentSlide()?.elements || []).filter(e => sel.els.includes(e.id));

  function select(ids, { additive = false } = {}) {
    const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
    sel.els = additive ? [...new Set([...sel.els, ...list])] : list;
    emit('select');
  }

  function gotoSlide(i) {
    const n = deck.slides.length;
    if (!n) return;
    sel.slide = Math.max(0, Math.min(n - 1, i));
    sel.els = [];
    emit('slide');
  }

  return {
    get deck() { return deck; },
    set deck(d) { deck = d; past.length = 0; future.length = 0; sel = { slide: 0, els: [] }; emit('load'); },
    get sel() { return sel; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    commit, settle, undo, redo, select, gotoSlide,
    currentSlide, selectedElements, snapshot,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit,
  };
})();
