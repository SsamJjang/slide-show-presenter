/* ============================================================
   Presenting.

   Like the Connect broadcast: the outgoing screen dissolves while
   the next one assembles itself — field first, then each piece
   fading up out of soft focus in reading order. The opener swells
   out of liquid colour; sculptures are live and spring in; the
   countdown counts; videos play.

   → Space PageDown click   next      ← PageUp   previous
   B   black screen          Esc       back to the editor
   ============================================================ */

const Player = (() => {
  const root = document.getElementById('player');
  let index = 0, active = false;
  let current = null;              // { slot, release }
  let clock = 0, hideT = 0, black = null;

  const fit = () => Math.min(innerWidth / 1920, innerHeight / 1080);

  function place(slot) {
    const s = fit();
    slot.style.transform = `scale(${s})`;
    slot.style.left = (innerWidth - 1920 * s) / 2 + 'px';
    slot.style.top = (innerHeight - 1080 * s) / 2 + 'px';
  }

  /* Where the numerals sit on each of the last ten beats (x, y in
     design px, scale), composed with that second's moment. */
  const BEAT = {
    9: [0, 0, 1], 8: [-50, -10, 1.04], 7: [0, -70, .94], 6: [0, 70, .98], 5: [0, 0, .9],
    4: [70, 0, 1.06], 3: [0, -80, .94], 2: [0, 0, 1], 1: [0, 0, .9], 0: [0, 0, 1],
  };

  /* Live parts of a screen that is now on stage. Returns a release. */
  function liven(slot) {
    const scene = slot.querySelector('.scene');
    const opener = scene.classList.contains('opener');
    const ctrls = [], timers = [], forms = [];

    // The open: liquid colour swells and merges, then blooms away.
    const liquid = slot.querySelector('.op-liquid');
    if (liquid) {
      const c = document.createElement('canvas');
      liquid.appendChild(c);
      ctrls.push(Sculpture.mount(c, { shape: 'liquid', size: .95, seed: 3, intro: true }));
    }

    slot.querySelectorAll('.sculpt[data-sculpt]').forEach(box => {
      let opts; try { opts = JSON.parse(box.dataset.sculpt); } catch (e) { return; }
      const start = () => {
        const c = document.createElement('canvas');
        box.appendChild(c);
        const f = Sculpture.mount(c, { ...opts, intro: true });
        ctrls.push(f); forms.push(f);
        box.classList.add('live');
      };
      // On the opener the sculpture arrives as the bands clear.
      if (opener) { box.style.opacity = 0; timers.push(setTimeout(() => { box.style.opacity = ''; start(); }, 2600)); }
      else start();
    });

    // Placed materials play their own entrance as they arrive, in reading order.
    slot.querySelectorAll('.mat[data-mat]').forEach(box => {
      const o = parseFloat(box.parentElement.style.getPropertyValue('--o')) || 0;
      const c = document.createElement('canvas');
      box.appendChild(c);
      ctrls.push(Moments.material(c, box.dataset.mat, { intro: true, delay: (opener ? 2700 : 0) + 180 + o * 110 }));
      box.classList.add('live');
    });

    // A scene with a single video plays it with sound; several play muted.
    const vids = slot.querySelectorAll('video');
    vids.forEach(v => {
      v.currentTime = 0;
      if (vids.length === 1) v.muted = false;
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    });

    const cd = slot.querySelector('[data-countdown]');
    if (cd) {
      const texts = cd.querySelectorAll('text');
      const [m, s] = texts[0].textContent.trim().split(':').map(n => parseInt(n, 10) || 0);
      const end = Date.now() + (m * 60 + s) * 1000;
      // The last ten seconds: each one its own material and choreography,
      // played in two layers around the numerals — which drop the minutes,
      // grow to fill the frame and shift a little on every beat.
      const finale = cd.dataset.finale !== 'plain' && m * 60 + s > 0;
      let back = null, front = null, shown = -1, prevTxt = '';
      const layer = () => {
        const d = document.createElement('div');
        d.className = 'moments';
        d.appendChild(document.createElement('canvas'));
        return d;
      };
      // Built as soon as the countdown is up: the layers, their contexts and
      // every program compile in the background now, not on the 10 s beat.
      let begun = false;
      if (finale) {
        const b = layer(), f = layer();
        scene.querySelector('.field').after(b);      // under every element
        scene.appendChild(f);                        // over every element
        f.classList.add('front');
        back = Moments.mount(b.firstChild, 'back');
        front = Moments.mount(f.firstChild, 'front');
        ctrls.push(back, front);
      }
      const begin = () => {
        begun = true;
        cd.classList.add('final');
        // The scene's own sculptures and glows step aside, then stop
        // drawing (paused, not torn down), so the moments have the GPU.
        scene.classList.add('finale');
        timers.push(setTimeout(() => forms.forEach(c => c.pause?.()), 650));
      };
      const tickF = () => {
        const ms = end - Date.now();
        const left = Math.max(0, Math.ceil(ms / 1000 - .001));
        const last = finale && left < 10;
        const txt = last ? String(left).padStart(2, '0')
          : String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
        if (last && !begun) begin();
        if (last && left !== shown) {
          shown = left;
          // Start the moment on the beat itself, not on the tick that saw it.
          const at = performance.now() - Math.max(0, left * 1000 - ms);
          back.show(left, at); front.show(left, at);
          const [x, y, k] = BEAT[left];
          cd.style.setProperty('--nx', x + 'px'); cd.style.setProperty('--ny', y + 'px'); cd.style.setProperty('--ns', k);
        }
        if (txt !== prevTxt) { prevTxt = txt; texts.forEach(t => { t.textContent = txt; }); }
      };
      tickF();
      clock = setInterval(tickF, 50);
    }

    return () => {
      ctrls.forEach(c => c.destroy());
      timers.forEach(clearTimeout);
      slot.querySelectorAll('video').forEach(v => v.pause());
    };
  }

  function show(i, animate = true) {
    const scenes = Deck.deck.scenes;
    if (i < 0 || i >= scenes.length) return;
    index = i;
    clearInterval(clock);

    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = Scenes.html(scenes[i]);
    place(slot);
    root.appendChild(slot);
    const scene = slot.firstElementChild;
    if (animate) scene.classList.add('play');

    const prev = current;
    current = { slot, release: liven(slot) };

    if (prev) {
      const ps = prev.slot.firstElementChild;
      ps.classList.add('leave');
      prev.slot.style.zIndex = 2;          // the old screen dissolves over the new one
      setTimeout(() => { prev.slot.remove(); prev.release(); }, 600);
    }
  }

  function start(from = 0) {
    if (active) return;
    active = true;
    wentFull = false;
    root.hidden = false;
    root.innerHTML = '';
    current = null;
    show(from);
    root.requestFullscreen?.().catch(() => {});
    wake();
  }

  function stop() {
    if (!active) return;
    active = false;
    clearInterval(clock);
    if (current) { current.release(); current = null; }
    root.innerHTML = '';
    root.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    Editor.go(index);
  }

  const next = () => show(index + 1);
  const prev = () => show(index - 1);

  function toggleBlack() {
    if (black) { black.remove(); black = null; return; }
    black = document.createElement('div');
    black.style.cssText = 'position:absolute;inset:0;background:#000;z-index:10';
    root.appendChild(black);
  }

  function wake() {
    root.classList.add('cursor');
    clearTimeout(hideT);
    hideT = setTimeout(() => root.classList.remove('cursor'), 1800);
  }

  addEventListener('keydown', (e) => {
    if (!active) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); stop(); }
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'b' || k === 'B' || k === '.') { e.preventDefault(); toggleBlack(); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
  });
  root.addEventListener('click', () => { if (active) next(); });
  root.addEventListener('contextmenu', (e) => { if (active) { e.preventDefault(); prev(); } });
  root.addEventListener('mousemove', () => active && wake());
  addEventListener('resize', () => { if (active) root.querySelectorAll('.slot').forEach(place); });
  /* Leaving fullscreen from the browser's own controls ends the talk — but
     only a fullscreen this talk entered. A late event from the previous
     talk's exit would otherwise close a presentation the moment it opened. */
  let wentFull = false;
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === root) { wentFull = true; return; }
    if (active && wentFull && !document.fullscreenElement) stop();
  });

  return { start, stop, get active() { return active; } };
})();
