/* ============================================================
   Kit — the Connect element library.

   The Connect 2025 identity is not one graphic, it is a family of
   them, and every one is shown at some point between "drafted" and
   "definitive": dotted wire lines drawing themselves, lens shapes
   whose contour lines fill in solid, stripe bands rising, dot fields,
   and the glossy sculpture. Each is an element here — insert as many
   as you like, size and rotate them, and tune them — and each has
   its own build that plays when its slide arrives:

     sculpture  live WebGL form (Twist, Lens, Ribbon, Pebble, Petal);
                springs in from small and turned, then breathes
     lens       one or many lens / leaf / drop / petal shapes with
                meridian contours, in rows, grids, fans or clusters;
                fill goes wire → lines → solid, or progresses across
                the set like the identity's lens rows
     wires      sheaves of dotted, dashed or hairline curves — sweeps,
                waves, arcs, helices, bursts and rings — that draw on
                and keep marching
     bands      iridescent stripe bars at any angle, rising in turn
     halftone   dot fields that grow out from a point or across

   Builds are CSS keyed off `.building` on the slide, delayed by the
   element's place in the choreography (--bd, set by js/flow.js). With
   no `.building` the resting state is the finished element, so the
   editor, thumbnails, print and export all show it complete.
   ============================================================ */

const Kit = (() => {

  const f1 = (n) => Math.round(n * 10) / 10;
  let uidN = 0;
  const uidFor = (p) => p + (++uidN).toString(36) + Math.random().toString(36).slice(2, 5);

  /* Colour sets shared by every kit element: four thin-film stops, the same
     ones the sculpture uses, so a slide built from several elements is
     automatically one palette. */
  const schemeStops = (k) => (ConnectForm.SCHEMES[k] || ConnectForm.SCHEMES.connect).c;
  const inkFor = (color) => ({
    white: '#ffffff', cyan: '#8ff1ff', violet: '#b79bff', blue: '#5a8cff', ink: '#0b1020',
  })[color] || null;

  function gradientDef(id, stops, x1, y1, x2, y2, units = 'userSpaceOnUse') {
    return `<linearGradient id="${id}" gradientUnits="${units}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
      stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('') +
      `</linearGradient>`;
  }

  /* ================= sculpture ================= */

  function sculptureForm(el) {
    return {
      pose: { x: .5, y: .5, size: el.scale ?? .9, roll: (el.roll || 0) * Math.PI / 180, turn: el.turn || 0, alpha: 1 },
      species: el.species || 'twist', scheme: el.scheme || 'connect',
      speed: el.speed ?? 1, halo: el.halo !== false,
      twist: el.twist != null && el.twist !== '' ? +el.twist : null,
    };
  }

  function renderSculpture(el) {
    const form = sculptureForm(el);
    const src = ConnectForm.snapshot(form, el.w, el.h);
    const data = Render.esc(JSON.stringify(form));
    return `<div class="e-sculpture" data-form="${data}">${src ? `<img src="${src}" alt="">` : ''}</div>`;
  }

  /* ================= lens ================= */

  /* One lens, length 2 (y from -1 to 1), half-width `fw`, as cubic segments
     in unit space. `m` in [-1, 1] picks a meridian: the outline is m = ±1,
     the contour lines are everything between. */
  const LENS = {
    leaf:    (fw, m) => [[0, -1], [fw * m * 1.33, -.33], [fw * m * 1.33, .33], [0, 1]],
    ellipse: (fw, m) => [[0, -1], [fw * m * 1.38, -1], [fw * m * 1.38, 1], [0, 1]],
    drop:    (fw, m) => [[0, -1], [fw * m * 1.1, -.2], [fw * m * 1.5, 1], [0, 1]],
    petal:   (fw, m) => [[0, -1], [fw * m * 1.55 + .18, -.55], [fw * m * .9 + .1, .75], [0, 1]],
  };

  function lensCells(el, n) {
    const w = el.w, h = el.h, gap = el.gap ?? .12;
    const out = [];
    const arrange = el.arrange || 'row';
    if (arrange === 'grid') {
      const cols = Math.max(1, Math.round(Math.sqrt(n * w / h)));
      const rows = Math.ceil(n / cols);
      const cw = w / cols, ch = h / rows;
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        out.push({ x: cw * (c + .5), y: ch * (r + .5), len: ch * (1 - gap) / 2, rot: el.tilt || 0 });
      }
    } else if (arrange === 'fan') {
      const L = Math.min(h * .48, w * .48);
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? 0 : (-60 + 120 * i / (n - 1)) * (el.spread ?? 1);
        const r = a * Math.PI / 180;
        out.push({ x: w / 2 + Math.sin(r) * L, y: h - Math.cos(r) * L - h * .02, len: L * (1 - gap * .5), rot: a + (el.tilt || 0) });
      }
    } else if (arrange === 'cluster') {
      // Overlapping, like three lenses passed over each other.
      const L = Math.min(h, w) * .42;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? .5 : i / (n - 1);
        out.push({ x: w * (.25 + .5 * t), y: h / 2 + Math.sin(i * 2.1) * h * .08,
                   len: L * (1 - Math.abs(t - .5) * .35), rot: -24 + 48 * t + (el.tilt || 0) });
      }
    } else {
      const cw = w / n;
      for (let i = 0; i < n; i++) {
        out.push({ x: cw * (i + .5), y: h / 2, len: Math.min(h / 2 * (1 - gap * .3), cw * 1.6), rot: el.tilt || 0 });
      }
    }
    return out;
  }

  function renderLens(el) {
    const id = uidFor('ln');
    const n = Math.max(1, Math.min(40, Math.round(el.count || 1)));
    const shape = LENS[el.shape] || LENS.leaf;
    const fw = el.fat ?? .38;
    const merN = Math.max(2, Math.min(28, Math.round(el.contours ?? 11)));
    const stops = schemeStops(el.scheme);
    const cells = lensCells(el, n);
    const fillMode = el.fill || 'mixed';
    const weight = el.weight ?? 1.6;

    const defs = [];
    let body = '';
    cells.forEach((c, i) => {
      const stage = fillMode !== 'mixed' ? fillMode
        : n === 1 ? 'solid' : ['wire', 'lines', 'solid'][Math.min(2, Math.floor(i / n * 3))];
      const rot = c.rot * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot);
      const P = ([x, y]) => [c.x + (x * cs - y * sn) * c.len, c.y + (x * sn + y * cs) * c.len];
      const seg = (m) => {
        const q = shape(fw, m).map(P);
        return `M${f1(q[0][0])} ${f1(q[0][1])}C${f1(q[1][0])} ${f1(q[1][1])} ${f1(q[2][0])} ${f1(q[2][1])} ${f1(q[3][0])} ${f1(q[3][1])}`;
      };
      // Closed outline: right side down, left side back up.
      const r = shape(fw, 1).map(P), l = shape(fw, -1).map(P);
      const closed = `M${f1(r[0][0])} ${f1(r[0][1])}C${f1(r[1][0])} ${f1(r[1][1])} ${f1(r[2][0])} ${f1(r[2][1])} ${f1(r[3][0])} ${f1(r[3][1])}` +
        `C${f1(l[2][0])} ${f1(l[2][1])} ${f1(l[1][0])} ${f1(l[1][1])} ${f1(l[0][0])} ${f1(l[0][1])}Z`;

      // Each lens gets the palette rotated a step, so a row shimmers through it.
      const rot4 = stops.slice(i % 4).concat(stops.slice(0, i % 4));
      const g = `${id}g${i}`;
      defs.push(gradientDef(g, rot4, 0, 0, 1, 1, 'objectBoundingBox'));

      const mers = [];
      for (let k = 0; k <= merN; k++) {
        const m = -1 + 2 * k / merN;
        if (Math.abs(m) > .999) continue;
        mers.push(`<path d="${seg(m)}" pathLength="1"/>`);
      }

      let inner = '';
      if (stage === 'solid') {
        inner += `<path class="ln-fill" d="${closed}" fill="url(#${g})"/>`;
        inner += `<path class="ln-gloss" d="${closed}" fill="url(#${id}hl)"/>`;
        inner += `<g class="ln-mer ln-soft" stroke="rgba(255,255,255,.28)" stroke-width="${weight * .7}" fill="none">${mers.join('')}</g>`;
      } else if (stage === 'lines') {
        inner += `<g class="ln-mer" stroke="url(#${g})" stroke-width="${weight}" fill="none" stroke-linecap="round">${mers.join('')}</g>`;
        inner += `<path class="ln-edge" d="${closed}" fill="none" stroke="url(#${g})" stroke-width="${weight}"/>`;
      } else {
        inner += `<g class="ln-dots" stroke="url(#${g})" stroke-width="${weight * 1.5}" fill="none" stroke-linecap="round" ` +
          `stroke-dasharray="0.001 ${f1(Math.max(5, c.len * .06))}">${mers.map(p => p.replace(' pathLength="1"', '')).join('')}</g>`;
        inner += `<path class="ln-edge" d="${closed}" fill="none" stroke="url(#${g})" stroke-width="${weight}" opacity=".55"/>`;
      }
      body += `<g class="ln ln-${stage}" style="--k:${i}">${inner}</g>`;
    });

    defs.push(`<radialGradient id="${id}hl" cx=".32" cy=".24" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".62"/>` +
      `<stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);

    return `<svg class="e-lens" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none" overflow="visible">` +
      `<defs>${defs.join('')}</defs>${body}</svg>`;
  }

  /* ================= wires ================= */

  const bez = (p, t) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  };
  const SPINES = {
    sweep: [[-.05, .92], [.35, 1.06], [.55, -.06], [1.05, .14]],
    wave:  [[-.05, .55], [.3, .02], [.7, 1.02], [1.05, .45]],
    arc:   [[-.05, .98], [.2, -.12], [.8, -.12], [1.05, .98]],
    rise:  [[.2, 1.05], [.85, .7], [.1, .3], [.75, -.05]],
  };
  const pathOf = (pts) => 'M' + pts.map(([x, y]) => f1(x) + ' ' + f1(y)).join('L');

  function wireStrands(el) {
    const w = el.w, h = el.h, n = Math.max(1, Math.min(60, Math.round(el.count || 9)));
    const spread = (el.spread ?? 1) * Math.min(w, h) * .035;
    const curve = el.curve || 'sweep';
    const out = [];
    if (curve === 'burst') {
      const cx = w / 2, cy = h * 1.02, R = Math.hypot(w, h);
      for (let k = 0; k < n; k++) {
        const a = (-80 + 160 * (n === 1 ? .5 : k / (n - 1))) * Math.PI / 180;
        out.push([[cx, cy], [cx + Math.sin(a) * R, cy - Math.cos(a) * R]]);
      }
      return { strands: out, radial: [cx, cy] };
    }
    if (curve === 'rings') {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
      for (let k = 0; k < n; k++) {
        const r = R * (k + 1) / n, pts = [];
        for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
        out.push(pts);
      }
      return { strands: out, radial: [cx, cy] };
    }
    if (curve === 'helix') {
      for (let k = 0; k < n; k++) {
        const ph = k / n * Math.PI * 2, pts = [];
        for (let i = 0; i <= 80; i++) {
          const t = i / 80;
          pts.push([t * w, h / 2 + Math.sin(t * Math.PI * 3 + ph) * h * .36 * (.35 + .65 * Math.sin(t * Math.PI))]);
        }
        out.push(pts);
      }
      return { strands: out };
    }
    const P = (SPINES[curve] || SPINES.sweep).map(([x, y]) => [x * w, y * h]);
    for (let k = 0; k < n; k++) {
      const o = (k - (n - 1) / 2) * spread, pts = [];
      for (let i = 0; i <= 70; i++) {
        const t = i / 70, a = bez(P, t), b = bez(P, Math.min(1, t + .01)), c0 = bez(P, Math.max(0, t - .01));
        const dx = b[0] - c0[0], dy = b[1] - c0[1], len = Math.hypot(dx, dy) || 1;
        // Strands fan apart toward the far end, so the sheaf opens like the identity's lines.
        const oo = o * (.4 + 1.2 * t);
        pts.push([a[0] - dy / len * oo, a[1] + dx / len * oo]);
      }
      out.push(pts);
    }
    return { strands: out, spine: P };
  }

  function renderWires(el) {
    const id = uidFor('wr');
    const { strands, spine, radial } = wireStrands(el);
    const stops = schemeStops(el.scheme);
    const solid = inkFor(el.color);
    const stroke = solid || `url(#${id}g)`;
    const wgt = el.weight ?? 2.6, gap = el.gap ?? 13;
    const dash = el.dot === 'line' ? '' : el.dot === 'dashes' ? `${f1(gap * .9)} ${f1(gap * .7)}` : `0.001 ${f1(gap)}`;
    const period = el.dot === 'dashes' ? gap * 1.6 : gap;

    let mask;
    if (radial) {
      const R = Math.hypot(el.w, el.h) * 1.1;
      mask = `<circle class="wr-grow" cx="${f1(radial[0])}" cy="${f1(radial[1])}" r="${f1(R)}" fill="#fff"/>`;
    } else {
      const sp = spine ? pathOf(Array.from({ length: 61 }, (_, i) => bez(spine, i / 60))) : `M0 ${el.h / 2}L${el.w} ${el.h / 2}`;
      mask = `<path class="wr-draw" d="${sp}" pathLength="1" fill="none" stroke="#fff" stroke-linecap="round" ` +
        `stroke-width="${f1(Math.max(el.w, el.h) * 1.4)}"/>`;
    }

    return `<svg class="e-wires${el.flow !== false && dash ? ' flowing' : ''}" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none" overflow="visible" ` +
      `style="--period:${f1(period)}px">` +
      `<defs>${gradientDef(id + 'g', stops, 0, 0, el.w, el.h)}` +
      `<mask id="${id}m" maskUnits="userSpaceOnUse" x="${-el.w}" y="${-el.h}" width="${el.w * 3}" height="${el.h * 3}">${mask}</mask></defs>` +
      `<g mask="url(#${id}m)" fill="none" stroke="${stroke}" stroke-width="${wgt}" stroke-linecap="round" opacity="${el.alpha ?? 1}"` +
      `${dash ? ` stroke-dasharray="${dash}"` : ''}>` +
      strands.map((s, k) => `<path d="${pathOf(s)}" style="--k:${k}"/>`).join('') + `</g></svg>`;
  }

  /* ================= bands ================= */

  function rand(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

  function renderBands(el) {
    const n = Math.max(1, Math.min(48, Math.round(el.count || 9)));
    const st = schemeStops(el.scheme);
    const R = rand(el.seed ?? 3);
    const navy = '#0b1450';
    const bars = [];
    for (let i = 0; i < n; i++) {
      const w = 1 + (el.variance ?? .6) * (R() * 2.2 - .6);
      const a = st[i % 4], b = st[(i + 1) % 4], c = st[(i + 2) % 4];
      const dark = el.depth !== false && i % 3 === 2;
      const grad = dark ? `linear-gradient(180deg, ${navy}, ${a} 55%, ${b})`
                        : `linear-gradient(180deg, ${a}, ${b} 50%, ${c})`;
      bars.push(`<i style="flex:${Math.max(.25, w).toFixed(2)};background:${grad};--k:${i};` +
        `transform-origin:${i % 2 ? 'top' : 'bottom'}"${el.lines ? ' class="lined"' : ''}></i>`);
    }
    const gap = el.gap ?? 0;
    // The rotated strip has to cover the whole box at any angle.
    const a = (el.angle || 0) * Math.PI / 180, cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    const W = el.w * cs + el.h * sn, H = el.w * sn + el.h * cs;
    return `<div class="e-bands" style="border-radius:${el.radius || 0}px">` +
      `<div class="bd-rot" style="width:${f1(W + 2)}px;height:${f1(H + 2)}px;gap:${gap}px;` +
      `transform:translate(-50%,-50%) rotate(${el.angle || 0}deg)">${bars.join('')}</div></div>`;
  }

  /* ================= halftone ================= */

  function renderHalftone(el) {
    const id = uidFor('ht');
    const w = el.w, h = el.h;
    const cols = Math.max(4, Math.min(90, Math.round(el.density || 34)));
    const cell = w / cols, rows = Math.max(1, Math.round(h / cell));
    const maxR = cell / 2 * (el.size ?? .92);
    const pat = el.pattern || 'radial';
    const cx = w * (el.cx ?? .5), cy = h * (el.cy ?? .5), far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
    const dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + .5) * cell, y = (r + .5) * (h / rows);
        let f;
        if (pat === 'linear') f = x / w;
        else if (pat === 'wave') f = .5 + .5 * Math.sin(x / w * Math.PI * 3 + y / h * Math.PI * 1.4);
        else f = 1 - Math.hypot(x - cx, y - cy) / far;
        if (el.invert) f = 1 - f;
        const rr = maxR * Math.pow(Math.max(0, f), el.falloff ?? 1.2);
        if (rr > .35) dots.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}"/>`);
      }
    }
    const solid = inkFor(el.color);
    const mask = pat === 'radial'
      ? `<circle class="ht-grow" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(far * 1.05)}" fill="#fff"/>`
      : `<rect class="ht-wipe" x="0" y="0" width="${w}" height="${h}" fill="#fff"/>`;
    return `<svg class="e-halftone" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
      `<defs>${gradientDef(id + 'g', schemeStops(el.scheme), 0, 0, w, h)}` +
      `<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">${mask}</mask></defs>` +
      `<g mask="url(#${id}m)" fill="${solid || `url(#${id}g)`}" opacity="${el.alpha ?? 1}">${dots.join('')}</g></svg>`;
  }

  /* ================= the catalogue the sidebar shows =================
     Every entry is just an element type and a starting patch — nothing a
     preset sets can't be changed afterwards in the inspector. */
  const item = (name, type, w, h, patch = {}) => ({ name, type, w, h, patch });
  const CATALOG = [
    { group: 'Sculptures', hint: 'Live 3D forms', items: [
      item('Twist', 'sculpture', 760, 760, { species: 'twist', scheme: 'connect', roll: 30 }),
      item('Lens', 'sculpture', 760, 760, { species: 'lens', scheme: 'aqua', roll: 20 }),
      item('Ribbon', 'sculpture', 900, 700, { species: 'ribbon', scheme: 'connect', roll: 70 }),
      item('Pebble', 'sculpture', 640, 640, { species: 'pebble', scheme: 'pearl', roll: 10 }),
      item('Petal', 'sculpture', 760, 760, { species: 'petal', scheme: 'dusk', roll: 40 }),
      item('Sunset twist', 'sculpture', 760, 760, { species: 'twist', scheme: 'sunset', roll: -30 }),
      item('Mint ribbon', 'sculpture', 900, 700, { species: 'ribbon', scheme: 'mint', roll: 20 }),
      item('Chrome pebble', 'sculpture', 640, 640, { species: 'pebble', scheme: 'mono', roll: 0 }),
    ]},
    { group: 'Lenses', hint: 'Contour forms, wire to solid', items: [
      item('Lens row', 'lens', 1500, 420, { shape: 'leaf', count: 7, arrange: 'row', fill: 'mixed' }),
      item('Single lens', 'lens', 420, 700, { shape: 'leaf', count: 1, fill: 'solid', tilt: 18 }),
      item('Lens cluster', 'lens', 1000, 620, { shape: 'ellipse', count: 3, arrange: 'cluster', fill: 'mixed', contours: 15 }),
      item('Petal fan', 'lens', 900, 560, { shape: 'petal', count: 7, arrange: 'fan', fill: 'lines' }),
      item('Drop grid', 'lens', 1200, 520, { shape: 'drop', count: 14, arrange: 'grid', fill: 'mixed' }),
      item('Wire leaf', 'lens', 420, 700, { shape: 'leaf', count: 1, fill: 'wire', contours: 15 }),
      item('Line ellipse', 'lens', 520, 700, { shape: 'ellipse', count: 1, fill: 'lines', contours: 19, scheme: 'aqua' }),
      item('Sunset petals', 'lens', 1200, 460, { shape: 'petal', count: 6, arrange: 'row', fill: 'solid', scheme: 'sunset' }),
    ]},
    { group: 'Wire lines', hint: 'Drafted lines that draw on', items: [
      item('Sweep', 'wires', 1600, 700, { curve: 'sweep', count: 9 }),
      item('Wave', 'wires', 1600, 520, { curve: 'wave', count: 7 }),
      item('Arc', 'wires', 1400, 700, { curve: 'arc', count: 6, dot: 'line', weight: 1.4 }),
      item('Helix', 'wires', 1600, 520, { curve: 'helix', count: 4 }),
      item('Burst', 'wires', 1400, 700, { curve: 'burst', count: 15, dot: 'dashes' }),
      item('Rings', 'wires', 700, 700, { curve: 'rings', count: 7 }),
      item('Rise', 'wires', 900, 1000, { curve: 'rise', count: 11, color: 'cyan' }),
      item('White hairlines', 'wires', 1600, 600, { curve: 'wave', count: 14, dot: 'line', weight: 1, color: 'white', alpha: .5 }),
    ]},
    { group: 'Bands', hint: 'Iridescent stripes', items: [
      item('Stripe wall', 'bands', 1000, 700, { count: 9, angle: 0 }),
      item('Diagonal', 'bands', 1000, 700, { count: 11, angle: 24, lines: true }),
      item('Ocean bars', 'bands', 900, 600, { count: 6, scheme: 'aqua', gap: 18, radius: 28 }),
      item('Sunset slats', 'bands', 1200, 500, { count: 16, angle: -12, scheme: 'sunset', variance: .2 }),
      item('Thin lines', 'bands', 1000, 600, { count: 26, scheme: 'connect', variance: .9, lines: true, angle: 8 }),
    ]},
    { group: 'Dot fields', hint: 'Halftone gradients', items: [
      item('Radial dots', 'halftone', 900, 900, { pattern: 'radial', density: 30 }),
      item('Dot fade', 'halftone', 1400, 500, { pattern: 'linear', density: 44 }),
      item('Dot wave', 'halftone', 1400, 600, { pattern: 'wave', density: 40, scheme: 'aqua' }),
      item('White dots', 'halftone', 900, 900, { pattern: 'radial', density: 26, color: 'white', alpha: .5 }),
    ]},
  ];

  return { CATALOG, LENS, SPINES, sculptureForm,
           renderSculpture, renderLens, renderWires, renderBands, renderHalftone };
})();

/* ============================================================
   Bring a slide's sculptures to life. Self-contained: the export
   player embeds this source next to the form runtime.

   host     slide root containing .e-sculpture[data-form] nodes
   RT       a connectFormRuntime() instance
   returns  a function that releases every WebGL context it made
   ============================================================ */
function connectLiven(host, RT, opts) {
  opts = opts || {};
  var ctrls = [];
  var boxes = [].slice.call(host.querySelectorAll('.e-sculpture[data-form]'));
  // Browsers cap live WebGL contexts (~16); a slide past that keeps pictures.
  boxes.slice(0, opts.max || 6).forEach(function (box) {
    var form; try { form = JSON.parse(box.getAttribute('data-form')); } catch (e) { return; }
    var c = document.createElement('canvas');
    c.className = 'sc-live';
    box.appendChild(c);
    var ctl = RT.mount(c, { resolution: 1, stiffness: 2.2 });
    ctl.resize();
    ctl.set(form, true, opts.intro !== false);
    box.classList.add('live');
    ctrls.push(ctl);
  });
  return function () { ctrls.forEach(function (c) { c.destroy(); }); ctrls = []; };
}
