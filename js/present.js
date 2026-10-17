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
  const atmos = document.getElementById('presentAtmos');
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
  let form = null;              // live Connect form controller

  /* The persistent footer. One copy for the whole talk, above the stage, so
     it holds perfectly still while slides change underneath — the per-slide
     copies are hidden in presentation (see present.css). */
  const chromeHost = document.createElement('div');
  chromeHost.className = 'present-chrome';
  root.appendChild(chromeHost);

  /* The live form canvas, sized to the slide's own 16:9 box so a pose lands
     exactly where the editor's snapshot shows it. Sits above the field and
     below the stage. */
  let formCanvas = document.createElement('canvas');
  formCanvas.className = 'present-form';
  root.insertBefore(formCanvas, stage);
  /* A canvas whose WebGL context was released hands back that same dead
     context forever — re-mounting on it painted a white box with a broken
     glyph over every slide of the second talk. Each talk gets a new one. */
  function freshFormCanvas() {
    const c = document.createElement('canvas');
    c.className = 'present-form';
    formCanvas.replaceWith(c);
    formCanvas = c;
  }
  function placeForm(s) {
    formCanvas.style.width = DESIGN_W * s + 'px';
    formCanvas.style.height = DESIGN_H * s + 'px';
    formCanvas.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
    formCanvas.style.top = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';
    form?.resize();
  }

  /* Live sculptures. Each slide's .e-sculpture pictures are swapped for live
     WebGL forms when the slide goes on stage, and their contexts are released
     the moment it leaves — browsers allow only a handful at once. */
  const livers = new WeakMap();
  function liven(node, intro) {
    if (!node.querySelector('.e-sculpture')) return;
    livers.set(node, connectLiven(node, ConnectForm, { intro }));
  }
  function retire(node) {
    const release = livers.get(node);
    if (release) { release(); livers.delete(node); }
    node.remove();
  }

  const slides = () => Store.deck.slides;
  const scaleFor = () => Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);

  /* ---------- lifecycle ---------- */

  async function start(from = Store.sel.slide) {
    if (active) return;
    active = true;
    index = from; step = 0;
    startedAt = Date.now();
    hudDismissed = false;

    root.hidden = false;
    applyTheme(root, Store.deck.theme, Store.deck);
    freshFormCanvas();
    placeForm(scaleFor());
    form = ConnectForm.mount(formCanvas);
    form.set(slides()[index]?.form, true);
    show(index, null);
    // Fullscreen arriving resizes the window mid-entrance; refit (never
    // rebuild) handles that, so the opening slide plays through untouched.
    startTimer();

    try { await document.documentElement.requestFullscreen?.(); }
    catch { /* fullscreen refused (iframe, or user gesture lost) — present windowed */ }

    bumpHud();
  }

  function stop() {
    if (!active) return;
    active = false;
    root.hidden = true;
    stage.querySelectorAll('.slide-host').forEach(retire);
    stage.innerHTML = '';
    atmos.innerHTML = '';
    chromeHost.innerHTML = '';
    delete chromeHost.dataset.html;
    form?.destroy(); form = null;
    delete atmos.dataset.atmos;
    blank.hidden = true;
    clearInterval(tick);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    // Leave the editor sitting on whatever slide you ended on.
    Store.gotoSlide(index);
    pv?.closed === false && pv.postMessage?.({ type: 'end' }, '*');
  }

  /* ---------- rendering ---------- */

  /* Transitions that move the whole slide as one object.

     On these, the per-element entrance stagger has to be suppressed. Running
     both means the slide flies in from the right WHILE each thing on it also
     rises and fades independently — two different motions describing the same
     arrival, which is the single most common way a deck ends up looking
     amateur. Either the slide moves or its contents assemble; never both.

     The quiet transitions (cut, fade, dissolve, blur, iris) don't move the
     box, so the stagger is the only motion and it's welcome there. */
  const HOST_MOVES = new Set(['slide', 'push', 'zoom', 'zoomOut',
                              'cover', 'reveal', 'flip', 'swipeUp', 'glitch']);

  /* Place and fill the footer layer to match the slide host exactly. Only
     rebuilt when the deck's footer text changes; per-slide visibility and
     tone are class toggles, so the footer cross-fades instead of popping. */
  function syncChrome(slide, s) {
    const deck = Store.deck;
    const html = Connect.chromeHTML(deck, null);
    if (chromeHost.dataset.html !== html) {
      chromeHost.dataset.html = html;
      chromeHost.innerHTML = html
        ? `<div class="slide-host"><div class="slide" style="background:transparent">${html}</div></div>` : '';
    }
    const host = chromeHost.firstElementChild;
    if (!host) return;
    host.style.transform = `scale(${s})`;
    host.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
    host.style.top  = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';
    const bar = host.querySelector('.slide-chrome');
    bar.classList.toggle('tone-dark', Connect.chromeDark(slide));
    bar.style.opacity = slide.chrome === false ? '0' : '1';
  }

  function show(i, transition, { fromIndex = null, animate = true } = {}) {
    const slide = slides()[i];
    if (!slide) return;

    const s = scaleFor();
    const node = Render.slideNode(slide, Store.deck, { scale: s, build: step, noForm: true });
    node.style.setProperty('--s', s);
    node.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
    node.style.top  = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';

    /* A presenter clicking faster than the transition must never stack
       slides. Any host still animating from an earlier advance is collapsed
       immediately, leaving exactly one to transition out of. querySelector
       would also have returned the OLDEST host here, not the current one. */
    const existing = [...stage.querySelectorAll('.slide-host')];
    while (existing.length > 1) retire(existing.shift());
    const prev = existing[0] || null;

    const t = transition || slide.transition || 'fade';

    // The form never cuts: it springs toward this slide's pose from wherever
    // it is, including mid-glide from a previous advance.
    placeForm(s);
    form?.set(slide.form, !animate && !prev);

    // The atmosphere is continuous across the whole talk — it cross-dissolves
    // only when the look actually changes, and never restarts its motion.
    Continuity.syncAtmosphere(atmos, slide, { immediate: !prev });
    syncChrome(slide, s);

    /* --- Magic Move ---
       Only worth doing when there is a previous slide AND something on it to
       carry over. With no matches it degrades to the ordinary cross-fade,
       which is exactly what a plain transition would have done anyway. */
    const prevSlide = fromIndex != null ? slides()[fromIndex] : null;
    /* --- Flow ---
       The Connect choreography: out in reverse reading order, shared
       elements travel, in by reading order. Also used for the very first
       slide, so starting a talk looks like the rest of it. */
    if (t === 'flow' && animate) {
      stage.appendChild(node);
      liven(node, animate);
      const fl = connectFlow(prev, node);
      if (prev) {
        const finish = () => retire(prev);
        fl.done.then(finish);
        setTimeout(finish, fl.duration + 600);
      }
      updateHud();
      syncPresenter();
      return;
    }

    const continuous = t === 'magic';
    const matches = (continuous && prev && prevSlide)
      ? Continuity.pairs(prevSlide, slide) : [];

    if (continuous && prev) {
      stage.appendChild(node);
      liven(node, animate);
      const move = Continuity.magicMove(prev, node, matches);
      const finish = () => {
        retire(prev);
        // Only settle if this host is still the live one — a faster advance
        // may already have replaced it, and settling a superseded host would
        // strip the styles the new transition is relying on.
        if (node.isConnected) Continuity.settleHost(node);
      };
      move.done.then(finish);
      // Backstop: animations don't run in a backgrounded tab, so the promise
      // may never settle. Never leave two hosts stacked.
      setTimeout(finish, move.duration + 400);
      updateHud();
      syncPresenter();
      return;
    }

    if (prev && t !== 'none') {
      prev.classList.add('exit-' + t);
      prev.addEventListener('animationend', () => retire(prev), { once: true });
      // Safety net: if the animation never fires (tab backgrounded), don't
      // leave a stale slide stacked under the new one forever.
      setTimeout(() => retire(prev), 700);
      node.classList.add('enter-' + t);
    } else {
      if (prev) retire(prev);
    }

    stage.appendChild(node);
    liven(node, animate);
    if (animate) node.classList.add('building');

    // Choreographed entrance, only in presentation. Removed once it has run so
    // that later build reveals on this slide transition normally instead of
    // replaying the whole stagger.
    if (animate && !HOST_MOVES.has(t)) {
      node.classList.add('entering');
      setTimeout(() => node.classList.remove('entering'), 1200);
    }

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
    const from = index;
    index++; step = 0;
    show(index, null, { fromIndex: from });
  }

  function prev() {
    if (step > 0) { step--; refreshBuild(); return; }
    if (index <= 0) return;
    const from = index;
    index--;
    // Land on the fully-built version of the previous slide, not its first step.
    step = Render.maxBuild(slides()[index]);
    show(index, null, { fromIndex: from });
  }

  function goto(i) {
    const from = index;
    index = Math.max(0, Math.min(slides().length - 1, i));
    step = 0;
    show(index, null, { fromIndex: from });
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

  /* When the bar is dismissed with Tab it stays dismissed — moving the mouse
     must not bring it back, or the dismissal would be meaningless. */
  let hudDismissed = false;

  function bumpHud() {
    if (hudDismissed) return;
    root.classList.add('hud-on', 'show-cursor');
    clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => root.classList.remove('hud-on', 'show-cursor'), 2600);
  }

  function toggleHud() {
    hudDismissed = !hudDismissed;
    if (hudDismissed) {
      clearTimeout(hudTimeout);
      root.classList.remove('hud-on', 'show-cursor');
    } else {
      bumpHud();
    }
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
      <link rel="stylesheet" href="${location.href.replace(/[^/]*$/, '')}css/present.css">
      <style>${SLIDE_CSS}</style>
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

    applyTheme(doc.body, Store.deck.theme, Store.deck);

    /* Re-render only when what's being shown actually changes.

       syncPresenter runs once a second off the talk timer — it has to, for
       the clock — and it used to rebuild both slide previews every time.
       That restarted every animation inside them on a one-second cycle, so
       any deck using an emphasis loop or an animated finish showed the
       presenter a permanent twitch, and it re-decoded every image on the
       slide sixty times a minute for a preview that hadn't changed. */
    const fill = (hostId, slide, buildStep) => {
      const host = doc.getElementById(hostId);
      const key = slide ? `${slide.id}:${buildStep}:${Store.deck.theme}:${Store.deck.accent || ''}` : 'empty';
      if (host.dataset.key === key) return;
      host.dataset.key = key;
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
    // Tab toggles the bottom bar and keeps it that way — press once to get rid
    // of it for the whole talk, press again to bring it back.
    if (k === 'Tab') { e.preventDefault(); toggleHud(); return; }
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
  /* Re-fit on resize without replaying anything. Rebuilding the slide used to
     re-run the entrance stagger, so dragging a window edge — or a projector
     renegotiating its mode mid-talk — made the slide assemble itself again in
     front of the room. */
  /* Refit in place: rescale and recentre whatever is on stage, mid-animation
     or not. Rebuilding here is what made "Present" glitch — the click enters
     fullscreen, fullscreen resizes the window, and the resize used to throw
     away the slide that was halfway through its entrance. */
  function refit() {
    const s = scaleFor();
    stage.querySelectorAll('.slide-host').forEach(h => {
      h.style.transform = `scale(${s})`;
      h.style.setProperty('--s', s);
      h.style.left = ((window.innerWidth - DESIGN_W * s) / 2) + 'px';
      h.style.top  = ((window.innerHeight - DESIGN_H * s) / 2) + 'px';
    });
    placeForm(s);
    const slide = slides()[index];
    if (slide) syncChrome(slide, s);
  }
  window.addEventListener('resize', () => { if (active) refit(); });

  document.addEventListener('fullscreenchange', () => {
    // Escaping fullscreen via the browser chrome should also leave present mode.
    if (active && !document.fullscreenElement) stop();
  });

  return {
    start, stop, next, prev, goto, openPresenter,
    get active() { return active; },
  };
})();
