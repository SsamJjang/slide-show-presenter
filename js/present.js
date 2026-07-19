/* ============================================================
   Presentation mode.

   Navigation is build-aware: → advances to the next reveal step on
   the current slide before it moves to the next slide, which is what
   every presenter expects and what makes progressive disclosure
   usable live.
   ============================================================ */

const Present = (() => {
  const root  = document.getElementById('presentRoot');
  const stage = document.getElementById('presentStage');
  const blank = document.getElementById('presentBlank');
  const hudNum = document.getElementById('hudNum');
  const hudBar = document.getElementById('hudBar');
  const hudTimer = document.getElementById('hudTimer');

  let active = false;
  let index = 0;
  let step = 0;                 // current build step on this slide
  let startedAt = 0;
  let tick = null;
  let hudTimeout = null;
  let pv = null;                // presenter view window

  const slides = () => Store.deck.slides;
  const scaleFor = () => Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);

  /* ---------- lifecycle ---------- */

  async function start(from = Store.sel.slide) {
    if (active) return;
    active = true;
    index = from; step = 0;
    startedAt = Date.now();

    root.hidden = false;
    applyTheme(root, Store.deck.theme);
    show(index, null);
    startTimer();

    try { await document.documentElement.requestFullscreen?.(); }
    catch { /* fullscreen refused (iframe, or user gesture lost) — present windowed */ }

    bumpHud();
  }

  function stop() {
    if (!active) return;
    active = false;
    root.hidden = true;
    stage.innerHTML = '';
    blank.hidden = true;
    clearInterval(tick);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    // Leave the editor sitting on whatever slide you ended on.
    Store.gotoSlide(index);
    pv?.closed === false && pv.postMessage?.({ type: 'end' }, '*');
  }

  /* ---------- rendering ---------- */

  function show(i, transition) {
    const slide = slides()[i];
    if (!slide) return;

    const s = scaleFor();
    const node = Render.slideNode(slide, Store.deck, { scale: s, build: step });
    node.style.setProperty('--s', s);
    node.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
    node.style.top  = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';

    const prev = stage.querySelector('.slide-host');
    const t = transition || slide.transition || 'fade';

    if (prev && t !== 'none') {
      prev.classList.add('exit-' + t);
      prev.addEventListener('animationend', () => prev.remove(), { once: true });
      // Safety net: if the animation never fires (tab backgrounded), don't
      // leave a stale slide stacked under the new one forever.
      setTimeout(() => prev.remove(), 700);
      node.classList.add('enter-' + t);
    } else {
      prev?.remove();
    }

    stage.appendChild(node);
    updateHud();
    syncPresenter();
  }

  function refreshBuild() {
    const host = stage.querySelector('.slide-host');
    if (host) Render.applyBuild(host, step);
    updateHud();
    syncPresenter();
  }

  /* ---------- navigation ---------- */

  function next() {
    const slide = slides()[index];
    if (step < Render.maxBuild(slide)) { step++; refreshBuild(); return; }
    if (index >= slides().length - 1) return;
    index++; step = 0;
    show(index);
  }

  function prev() {
    if (step > 0) { step--; refreshBuild(); return; }
    if (index <= 0) return;
    index--;
    // Land on the fully-built version of the previous slide, not its first step.
    step = Render.maxBuild(slides()[index]);
    show(index);
  }

  function goto(i) {
    index = Math.max(0, Math.min(slides().length - 1, i));
    step = 0;
    show(index);
  }

  /* ---------- HUD + timer ---------- */

  function updateHud() {
    const n = slides().length;
    hudNum.textContent = `${index + 1} / ${n}`;
    hudBar.style.width = ((index + 1) / n * 100) + '%';
  }

  function startTimer() {
    clearInterval(tick);
    tick = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      const txt = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      hudTimer.textContent = txt;
      syncPresenter();
    }, 1000);
  }

  function bumpHud() {
    root.classList.add('hud-on', 'show-cursor');
    clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => root.classList.remove('hud-on', 'show-cursor'), 2600);
  }
  root.addEventListener('mousemove', () => active && bumpHud());

  function toggleBlank(mode) {
    const on = !blank.hidden && blank.classList.contains(mode);
    blank.hidden = on;
    blank.classList.toggle('white', mode === 'white');
    if (!on) blank.classList.add(mode);
  }

  /* ---------- presenter view ---------- */

  function openPresenter() {
    if (pv && !pv.closed) { pv.focus(); return; }

    pv = window.open('', 'apexdeck-presenter', 'width=1280,height=800');
    if (!pv) { App.toast('Presenter view was blocked — allow pop-ups for this page', 'err'); return; }

    pv.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Presenter View</title>
      <link rel="stylesheet" href="${location.href.replace(/[^/]*$/, '')}css/app.css">
      <link rel="stylesheet" href="${location.href.replace(/[^/]*$/, '')}css/themes.css">
      <link rel="stylesheet" href="${location.href.replace(/[^/]*$/, '')}css/present.css">
      </head><body class="pv-body">
        <div class="pv-top">
          <div class="pv-timer" id="pvTimer">00:00</div>
          <button class="pv-btn" id="pvReset">Reset timer</button>
          <div class="pv-clock" id="pvClock"></div>
          <div class="pv-count" id="pvCount"></div>
          <button class="pv-btn" id="pvPrev">← Prev</button>
          <button class="pv-btn" id="pvNext">Next →</button>
        </div>
        <div class="pv-main">
          <div class="pv-col">
            <div class="pv-label">Now showing</div>
            <div class="pv-screen" id="pvCur"></div>
            <div class="pv-label" style="margin-top:6px">Speaker notes</div>
            <div class="pv-notes" id="pvNotes"></div>
          </div>
          <div class="pv-col">
            <div class="pv-label">Up next</div>
            <div class="pv-screen next" id="pvNext2"></div>
          </div>
        </div>
      </body></html>`);
    pv.document.close();

    pv.addEventListener('keydown', (e) => handleKey(e));
    pv.document.getElementById('pvNext').onclick = next;
    pv.document.getElementById('pvPrev').onclick = prev;
    pv.document.getElementById('pvReset').onclick = () => { startedAt = Date.now(); };

    // Clean up the reference so a reopen doesn't try to write into a dead window.
    pv.addEventListener('beforeunload', () => { pv = null; });

    syncPresenter();
  }

  function syncPresenter() {
    if (!pv || pv.closed) return;
    const doc = pv.document;
    if (!doc.getElementById('pvCur')) return;

    const cur = slides()[index];
    const nxt = slides()[index + 1];

    applyTheme(doc.body, Store.deck.theme);

    const fill = (hostId, slide, buildStep) => {
      const host = doc.getElementById(hostId);
      host.innerHTML = '';
      if (!slide) { host.style.opacity = .25; return; }
      host.style.opacity = '';
      const w = host.clientWidth || 640;
      host.appendChild(Render.slideNode(slide, Store.deck, { scale: w / DESIGN_W, build: buildStep }));
    };

    fill('pvCur', cur, step);
    fill('pvNext2', nxt, Infinity);

    const notes = doc.getElementById('pvNotes');
    notes.textContent = cur?.notes?.trim() || 'No notes for this slide.';
    notes.classList.toggle('empty', !cur?.notes?.trim());

    doc.getElementById('pvCount').textContent = `Slide ${index + 1} of ${slides().length}`;
    doc.getElementById('pvTimer').textContent = hudTimer.textContent;
    doc.getElementById('pvClock').textContent =
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- keyboard ---------- */

  function handleKey(e) {
    if (!active) return;
    const k = e.key;

    if (k === 'Escape')                                   { stop(); e.preventDefault(); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { next(); e.preventDefault(); return; }
    if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k))       { prev(); e.preventDefault(); return; }
    if (k === 'Home')  { goto(0); e.preventDefault(); return; }
    if (k === 'End')   { goto(slides().length - 1); e.preventDefault(); return; }
    if (k === 'b' || k === 'B') { toggleBlank('black'); e.preventDefault(); return; }
    if (k === 'w' || k === 'W') { toggleBlank('white'); e.preventDefault(); return; }
    if (k === 'p' || k === 'P') { openPresenter(); e.preventDefault(); return; }

    // Number keys jump to a slide.
    if (/^[0-9]$/.test(k)) {
      const n = parseInt(k, 10);
      if (n >= 1) goto(n - 1);
      e.preventDefault();
    }
  }

  window.addEventListener('keydown', handleKey);
  root.addEventListener('click', (e) => { if (active && !e.target.closest('.present-hud')) next(); });
  root.addEventListener('contextmenu', (e) => { if (active) { e.preventDefault(); prev(); } });
  window.addEventListener('resize', () => { if (active) show(index, 'none'); });

  document.addEventListener('fullscreenchange', () => {
    // Escaping fullscreen via the browser chrome should also leave present mode.
    if (active && !document.fullscreenElement) stop();
  });

  return {
    start, stop, next, prev, goto, openPresenter,
    get active() { return active; },
  };
})();
