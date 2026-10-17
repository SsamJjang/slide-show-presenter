/* ============================================================
   Flow — the Connect choreography.

   A Connect screen never swaps. It empties, in order, and then
   fills, in order, while anything that belongs to both moments
   travels between them:

     1. OUT     the outgoing content leaves in REVERSE reading order
                — captions and media first, the headline last — fast,
                up and out of focus. The last thing you read is the
                last thing to go.
     2. TRAVEL  elements present on both slides glide from where they
                were to where they are going, across the whole move.
     3. IN      the new content arrives in reading order: kicker,
                headline, supporting copy, then each card with its own
                contents (card, icon, title, text), then media, then
                captions. It starts just as the last outgoing element
                clears, so the screen is never empty and never doubled.

   Order comes from what an element IS (its role and type) and where it
   sits, not from the order it was inserted in — so a slide built in any
   order still plays correctly.

   Self-contained ON PURPOSE: the export player embeds this function's
   source, so it may reference nothing outside itself.

   fromHost  the outgoing slide root (or null for a first entrance)
   toHost    the incoming slide root
   returns   { duration, done } — done resolves once everything landed
   ============================================================ */
function connectFlow(fromHost, toHost, opts) {
  opts = opts || {};
  var E_OUT = 'cubic-bezier(.16,1,.3,1)', E_IN = 'cubic-bezier(.55,0,1,.45)',
      E_MOVE = 'cubic-bezier(.65,0,.35,1)', E_POP = 'cubic-bezier(.34,1.4,.64,1)';
  var running = [];

  function list(host) {
    return host ? [].slice.call(host.querySelectorAll('.el')).filter(function (e) {
      return !e.classList.contains('build-hidden');
    }) : [];
  }
  function kind(el) {
    var tx = el.querySelector('.e-text');
    if (tx) {
      var c = tx.className;
      if (/role-kicker/.test(c)) return 'kicker';
      if (/role-(display|title)/.test(c)) return 'head';
      if (/role-subtitle/.test(c)) return 'sub';
      if (/role-body/.test(c)) return 'body';
      return 'caption';
    }
    if (/el-(sculpture|lens|wires|bands|halftone)/.test(el.className)) return 'art';
    if (/el-(mockup|image|chart|code|table)/.test(el.className)) return 'media';
    if (/el-icon/.test(el.className)) return 'icon';
    return 'shape';
  }
  /* Art (sculptures, lenses, wires, bands, dot fields) builds first, behind
     the type, and is the last thing to leave — the graphic is the stage the
     words arrive on, as in the Connect titles. */
  var PHASE = { art: -1, kicker: 0, head: 1, sub: 2, body: 3, icon: 4, shape: 4, card: 5, media: 6, caption: 7 };
  function geo(el) {
    return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
             w: parseFloat(el.style.width) || 0, h: parseFloat(el.style.height) || 0 };
  }
  function inside(a, b) {
    var cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    return cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h && a.w * a.h < b.w * b.h;
  }

  /* Reading order for one slide. */
  function order(host) {
    var info = list(host).map(function (e) { return { el: e, k: kind(e), g: geo(e), card: -1, inner: 0 }; });
    // Containers: shapes big enough to hold something — cards, pills, panels.
    var boxes = info.filter(function (i) { return i.k === 'shape' && i.g.w * i.g.h > 8000; });
    boxes.sort(function (a, b) { return (Math.round(a.g.y / 60) - Math.round(b.g.y / 60)) || (a.g.x - b.g.x); });
    info.forEach(function (i) {
      var bi = boxes.indexOf(i);
      if (bi >= 0) { i.card = bi; i.inner = -1; return; }
      for (var s = 0; s < boxes.length; s++) {
        // Inside a card the icon leads: card, icon, title, copy.
        if (inside(i.g, boxes[s].g)) { i.card = s; i.inner = i.k === 'icon' ? .5 : PHASE[i.k]; return; }
      }
    });
    info.forEach(function (i) { i.p = i.card >= 0 ? PHASE.card : PHASE[i.k]; });
    /* Virtual cards. A loose icon and the text beside it (a bullet row) or
       stacked under it (a grid item) are one thing, and play as one: icon,
       then its title, then its copy — item by item, not "all the icons, then
       all the titles". The group plays at the phase of its most important
       member, so an icon beside a headline still arrives with the headline. */
    var icons = info.filter(function (i) { return i.k === 'icon' && i.card < 0; });
    icons.sort(function (a, b) { return (Math.round(a.g.y / 60) - Math.round(b.g.y / 60)) || (a.g.x - b.g.x); });
    icons.forEach(function (ic, n) {
      var cid = boxes.length + n, p = PHASE.icon;
      ic.card = cid; ic.inner = .5;
      info.forEach(function (t) {
        if (t.card >= 0 || !t.el.querySelector('.e-text')) return;
        var tcy = t.g.y + t.g.h / 2;
        var row = tcy > ic.g.y - 10 && tcy < ic.g.y + ic.g.h + 10 &&
                  t.g.x > ic.g.x && t.g.x - (ic.g.x + ic.g.w) < 320;
        var col = Math.abs(t.g.x - ic.g.x) < 24 && t.g.y > ic.g.y && t.g.y < ic.g.y + ic.g.h + 260;
        if (row || col) { t.card = cid; t.inner = PHASE[t.k] + t.g.y / 10000; p = Math.min(p, PHASE[t.k]); }
      });
      info.forEach(function (t) { if (t.card === cid) t.p = p; });
    });
    info.sort(function (a, b) {
      return (a.p - b.p) || (a.card - b.card) || (a.inner - b.inner) ||
        (Math.round(a.g.y / 40) - Math.round(b.g.y / 40)) || (a.g.x - b.g.x);
    });
    return info;
  }

  if (toHost) toHost.classList.add('building');

  /* ---- travellers: matched by the key the renderer writes ---- */
  var src = {}, moved = [];
  list(fromHost).forEach(function (e) { var k = e.dataset.mm; if (k && !src[k]) src[k] = e; });
  var travellers = [];
  list(toHost).forEach(function (b) {
    var k = b.dataset.mm, a = k && src[k];
    if (!a || moved.indexOf(a) >= 0) return;
    moved.push(a, b); travellers.push([a, b]);
  });

  /* ---- 1. out ---- */
  var outs = order(fromHost).filter(function (i) { return moved.indexOf(i.el) < 0; }).reverse();
  var OUT_DUR = 380, OUT_STEP = Math.min(40, 260 / Math.max(outs.length, 1));
  outs.forEach(function (i, n) {
    var inner = i.el.querySelector('.el-anim'); if (!inner) return;
    inner.style.animation = 'none';
    var to = i.k === 'art' ? { opacity: 0, transform: 'scale(1.04)', filter: 'blur(16px)' }
           : i.k === 'media' ? { opacity: 0, transform: 'scale(.95)', filter: 'blur(12px)' }
           : (i.k === 'shape' || i.k === 'icon') ? { opacity: 0, transform: 'scale(.97)', filter: 'blur(6px)' }
           : { opacity: 0, transform: 'translateY(-16px)', filter: 'blur(10px)' };
    running.push(inner.animate([{ opacity: 1, transform: 'none', filter: 'blur(0px)' }, to],
      { duration: OUT_DUR, delay: n * OUT_STEP, easing: E_IN, fill: 'both' }));
  });
  var outEnd = outs.length ? OUT_DUR + (outs.length - 1) * OUT_STEP : 0;

  /* ---- 3. in ---- */
  var ins = order(toHost).filter(function (i) { return moved.indexOf(i.el) < 0; });
  var start = fromHost ? Math.max(0, outEnd - 90) : (opts.delay || 150);
  var t = start, budget = 1000, steps = [];
  for (var n = 0; n < ins.length; n++) {
    var nx = ins[n + 1];
    steps.push(t);
    // Members of one card follow each other closely; separate things breathe.
    t += nx && nx.card >= 0 && nx.card === ins[n].card ? 45 : 95;
  }
  var span = t - start, squeeze = span > budget ? budget / span : 1;
  var inEnd = start;
  ins.forEach(function (i, n) {
    var inner = i.el.querySelector('.el-anim'); if (!inner) return;
    inner.style.animation = 'none';
    if (i.el.dataset.anim === 'none') return;
    var delay = start + (steps[n] - start) * squeeze, f, dur, ease = E_OUT;
    // Kit elements run their own build inside (CSS keyed off .building);
    // this tells it when its turn is.
    i.el.style.setProperty('--bd', Math.round(delay) + 'ms');
    if (i.k === 'art') {
      f = { opacity: 0 }; dur = 700;
    } else if (i.k === 'media') {
      f = { opacity: 0, transform: 'translateY(56px) scale(1.04)', filter: 'blur(18px)' }; dur = 1300;
    } else if (i.k === 'icon') {
      f = { opacity: 0, transform: 'scale(.55)', filter: 'blur(6px)' }; dur = 820; ease = E_POP;
    } else if (i.k === 'shape') {
      f = { opacity: 0, transform: 'translateY(30px) scale(.97)', filter: 'blur(8px)' }; dur = 1000;
    } else {
      f = { opacity: 0, transform: 'translateY(' + (i.k === 'head' ? 40 : 28) + 'px)', filter: 'blur(14px)' };
      dur = i.k === 'head' ? 1150 : 1000;
    }
    running.push(inner.animate([f, { opacity: 1, transform: 'none', filter: 'blur(0px)' }],
      { duration: dur, delay: delay, easing: ease, fill: 'both' }));
    inEnd = Math.max(inEnd, delay + dur);
  });

  /* ---- 2. travel ---- */
  var TRAVEL = Math.max(1150, start + 650);
  travellers.forEach(function (p) {
    var a = p[0], b = p[1], ga = geo(a), gb = geo(b);
    a.style.visibility = 'hidden';
    b.classList.add('magic');
    var bi = b.querySelector('.el-anim'); if (bi) bi.style.animation = 'none';
    var dx = ga.x - gb.x, dy = ga.y - gb.y, sx = gb.w ? ga.w / gb.w : 1, sy = gb.h ? ga.h / gb.h : 1;
    if (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(sx - 1) < .003 && Math.abs(sy - 1) < .003) return;
    var rot = +b.dataset.rot ? ' rotate(' + b.dataset.rot + 'deg)' : '';
    b.style.transformOrigin = 'top left';
    running.push(b.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' + rot },
      { transform: 'translate(0,0) scale(1,1)' + rot }],
      { duration: TRAVEL, easing: E_MOVE, fill: 'both' }));
  });

  var total = Math.max(inEnd, TRAVEL, outEnd);

  /* Hand every element back to its own styles once it has landed, so build
     reveals and emphasis loops behave normally afterwards. */
  function settle() {
    if (!toHost) return;
    [].slice.call(toHost.querySelectorAll('.el')).forEach(function (e) {
      [e, e.querySelector('.el-anim')].forEach(function (nd) {
        if (!nd) return;
        if (nd.getAnimations) nd.getAnimations().forEach(function (x) {
          if (x.effect && x.effect.target === nd) x.cancel();
        });
        nd.style.transform = ''; nd.style.opacity = '';
        nd.style.animation = ''; nd.style.transformOrigin = '';
        // .el's filter is the element's own drop shadow — only the motion
        // layer's filter was ever animation state.
        if (nd !== e) nd.style.filter = '';
      });
      if (+e.dataset.rot) e.style.transform = 'rotate(' + e.dataset.rot + 'deg)';
      e.classList.remove('magic');
    });
  }
  var done = new Promise(function (res) {
    var fin = false;
    function end() { if (fin) return; fin = true; settle(); res(); }
    Promise.all(running.map(function (x) { return x.finished.catch(function () {}); })).then(end);
    setTimeout(end, total + 500);   // backgrounded tabs never finish animations
  });
  return { duration: total, done: done };
}
