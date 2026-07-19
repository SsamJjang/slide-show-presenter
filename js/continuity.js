/* ============================================================
   Continuity — the thing that makes a deck feel like one space
   instead of a stack of slides.

   Two mechanisms, and they matter in this order:

   1. PERSISTENT ATMOSPHERE
      The background does not belong to a slide. It lives above the
      slide stack for the whole talk and cross-dissolves when the
      look changes, while the blooms keep drifting on their own
      uninterrupted clocks. This alone removes most of the
      "slides playing separately" feeling, because the eye tracks
      the continuous field and reads the content as moving within it
      rather than as a cut.

   2. MAGIC MOVE
      Anything present on both the outgoing and incoming slide is not
      destroyed and rebuilt — it travels. Position, size and scale are
      interpolated from where it was to where it's going, using FLIP
      (measure First, apply Last, invert with a transform, then Play).
      A title that shrinks into a corner as the next slide's content
      arrives around it is the single most recognisable move in a
      modern keynote, and it's this.

   Everything else (fades, wipes) is a fallback for when there's
   nothing to match.
   ============================================================ */

const Continuity = (() => {

  /* ---------- matching ----------

     Keynote matches by object identity because it owns the document.
     Here slides are independent, so identity is inferred. An explicit
     `link` tag always wins; otherwise elements match on the thing that
     makes them recognisably "the same object" to a viewer — the words,
     the image, the shape. Getting this wrong is cheap: a bad match just
     looks like a cross-fade, which is where we started. */
  function keyFor(el) {
    if (el.link) return 'link:' + el.link;
    switch (el.type) {
      case 'text':   return 'text:' + String(el.text || '').trim().toLowerCase();
      case 'image':  return 'img:' + (el.src || '').slice(-120);
      case 'mockup': return 'mk:' + el.kind + ':' + (el.src || '').slice(-120);
      case 'chart':  return 'chart:' + el.kind;
      case 'code':   return 'code:' + String(el.code || '').slice(0, 60);
      case 'table':  return 'table';
      case 'shape':  return `shape:${el.shape}:${el.fill}:${el.material || 'none'}`;
      default:       return null;
    }
  }

  /* Build the match set between two slides. First match wins, so a
     duplicated element can't be claimed twice and left flickering. */
  function pairs(fromSlide, toSlide) {
    const taken = new Set();
    const out = [];
    const fromKeys = fromSlide.elements.map(e => ({ el: e, key: keyFor(e) }));

    toSlide.elements.forEach(to => {
      const key = keyFor(to);
      if (!key) return;
      const hit = fromKeys.find(f => f.key === key && !taken.has(f.el.id));
      if (!hit) return;
      taken.add(hit.el.id);
      out.push({ from: hit.el, to });
    });
    return out;
  }

  /* ---------- magic move ----------

     `scale` is the presentation scale; geometry is design-space, so the
     inversion is computed in design units and applied inside the already
     scaled host. That keeps the maths independent of window size. */
  /* Driven by the Web Animations API rather than CSS transitions.

     A CSS transition cannot start on an element that was inserted in the
     same task: it has no previous computed style to move away from, so the
     browser jumps straight to the end (or, as here, pins it at whatever was
     set first). The usual reflow nudge is unreliable. element.animate()
     takes an explicit from/to and has none of that ambiguity — and it hands
     back a finished promise, which makes cleanup exact instead of a
     setTimeout racing the animation. */
  function magicMove(prevHost, nextHost, matches, { duration = 820 } = {}) {
    const EASE = 'cubic-bezier(.4,.02,.18,1)';   // long tail — reads as weight
    const moved = new Set();
    const running = [];

    matches.forEach(({ from, to }) => {
      const a = prevHost.querySelector(`.el[data-id="${from.id}"]`);
      const b = nextHost.querySelector(`.el[data-id="${to.id}"]`);
      if (!a || !b) return;

      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const sx = to.w ? from.w / to.w : 1;
      const sy = to.h ? from.h / to.h : 1;
      const rot = to.rot ? ` rotate(${to.rot}deg)` : '';

      // Nothing actually changed — leave it alone rather than animating a
      // no-op, which would still cost a composite every frame.
      const still = Math.abs(dx) < .5 && Math.abs(dy) < .5 &&
                    Math.abs(sx - 1) < .003 && Math.abs(sy - 1) < .003;

      b.classList.add('magic');
      b.style.animation = 'none';        // suppress the entrance for travellers

      if (!still) {
        b.style.transformOrigin = 'top left';
        running.push(b.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})${rot}`,
            opacity: from.opacity ?? 1 },
          { transform: `translate(0,0) scale(1,1)${rot}`, opacity: to.opacity ?? 1 },
        ], { duration, easing: EASE, fill: 'both' }));
      }

      // The outgoing copy must not be visible underneath the traveller.
      a.style.visibility = 'hidden';
      moved.add(to.id);
    });

    // Everything that isn't travelling: the old content recedes, the new
    // arrives slightly later, so the movement leads and the changes follow.
    // Simultaneous would read as a plain cross-fade.
    prevHost.querySelectorAll('.el').forEach(el => {
      if (el.style.visibility === 'hidden') return;
      running.push(el.animate(
        [{ opacity: 1, transform: 'translateY(0)' },
         { opacity: 0, transform: 'translateY(-14px)' }],
        { duration: duration * .5, easing: 'ease', fill: 'both' }));
    });

    nextHost.querySelectorAll('.el').forEach(el => {
      if (moved.has(el.dataset.id)) return;
      el.style.animation = 'none';
      running.push(el.animate(
        [{ opacity: 0, transform: 'translateY(18px)' },
         { opacity: 1, transform: 'translateY(0)' }],
        { duration: duration * .6, delay: duration * .35, easing: EASE, fill: 'both' }));
    });

    // Resolves when the last one lands, so the caller tears down at exactly
    // the right moment rather than guessing.
    const done = Promise.allSettled(running.map(x => x.finished.catch(() => {})));
    return { duration, done, animations: running };
  }

  /* Strip the inline styles magic move applied, once it has finished, so
     later build reveals and emphasis loops behave normally. */
  function settleHost(host) {
    host.querySelectorAll('.el').forEach(el => {
      // Commit any WAAPI animation still holding a fill, then drop it, so the
      // element returns to being styled purely by its own rules. Leaving a
      // filled animation in place would pin the element and block later
      // emphasis loops and build reveals.
      el.getAnimations?.().forEach(a => a.cancel());
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.animation = '';
      el.style.transformOrigin = '';
      el.classList.remove('magic');
    });
  }

  /* ---------- persistent atmosphere ----------

     One layer for the entire presentation. When the look changes we
     stack a new layer on top and fade it in; the old one is removed
     after. The blooms in the new layer start mid-path (negative delays),
     so there is never a visible "start" — the field just becomes
     something else while continuing to move. */
  const atmosKey = (slide) =>
    [slide.bgPreset || 'none', slide.bgMotion || 'drift', slide.bgSpeed || 1,
     slide.bgGrain ? 1 : 0, slide.bgVignette ? 1 : 0, slide.bg || ''].join('|');

  function syncAtmosphere(container, slide, { immediate = false, fade = 900 } = {}) {
    const key = atmosKey(slide);
    if (container.dataset.atmos === key) return;   // nothing to change
    container.dataset.atmos = key;

    const layer = document.createElement('div');
    layer.className = 'atmos-layer';
    if (slide.bg) layer.style.background = slide.bg;
    layer.innerHTML = Backgrounds.html(slide);

    const old = [...container.querySelectorAll('.atmos-layer')];

    if (immediate || !old.length) {
      old.forEach(o => o.remove());
      container.appendChild(layer);
      return;
    }

    layer.style.opacity = '0';
    layer.style.transition = `opacity ${fade}ms ease`;
    container.appendChild(layer);
    void layer.offsetWidth;
    layer.style.opacity = '1';

    old.forEach(o => {
      o.style.transition = `opacity ${fade}ms ease`;
      o.style.opacity = '0';
      setTimeout(() => o.remove(), fade + 60);
    });
  }

  return { keyFor, pairs, magicMove, settleHost, syncAtmosphere, atmosKey };
})();
