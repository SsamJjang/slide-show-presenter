/* ============================================================
   Parametric shape engine.

   A fixed menu of five shapes is a toy. Instead every shape here is
   a *generator*: give it a side count, a corner radius, an angle, an
   inner ratio, and it emits an SVG path. Fourteen generators with
   open parameters cover effectively unlimited forms — a triangle, a
   heptagon, a five-point star and a soft-edged badge are all the
   same generator at different settings.

   Paths are generated in the element's real pixel box rather than a
   normalised viewBox, so a corner radius means the same thing on a
   tall shape as on a wide one. A 0..100 viewBox stretched to fit
   would shear every fillet.
   ============================================================ */

const Shapes = (() => {

  const TAU = Math.PI * 2;
  const rad = (deg) => deg * Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- the core routine ----------
     Round the corners of an arbitrary polygon. Everything angular in
     this file routes through here, which is why one radius control can
     soften a triangle, a star and a chevron identically.

     For each vertex: walk back along both adjacent edges by
     r / tan(theta/2), and join those two tangent points with a circular
     arc. The inset is clamped to half of the shorter edge so adjacent
     fillets can never overrun each other and invert the path. */
  function roundPath(pts, r) {
    const n = pts.length;
    if (n < 3) return '';
    if (r <= 0) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + ' Z';

    let d = '';
    for (let i = 0; i < n; i++) {
      const cur = pts[i];
      const prev = pts[(i - 1 + n) % n];
      const next = pts[(i + 1) % n];

      const v1 = [prev[0] - cur[0], prev[1] - cur[1]];
      const v2 = [next[0] - cur[0], next[1] - cur[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1;
      const l2 = Math.hypot(v2[0], v2[1]) || 1;
      const u1 = [v1[0] / l1, v1[1] / l1];
      const u2 = [v2[0] / l2, v2[1] / l2];

      // Interior angle at this vertex.
      const dot = clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1);
      const theta = Math.acos(dot);
      // Straight or doubled-back: no corner to round.
      if (theta < 1e-3 || Math.abs(Math.PI - theta) < 1e-3) {
        d += `${i ? 'L' : 'M'}${cur[0].toFixed(2)} ${cur[1].toFixed(2)} `;
        continue;
      }

      const maxInset = Math.min(l1, l2) / 2;
      const inset = Math.min(r / Math.tan(theta / 2), maxInset);
      const rr = inset * Math.tan(theta / 2);

      const t1 = [cur[0] + u1[0] * inset, cur[1] + u1[1] * inset];
      const t2 = [cur[0] + u2[0] * inset, cur[1] + u2[1] * inset];

      // Sweep direction follows the winding at this corner.
      const cross = u1[0] * u2[1] - u1[1] * u2[0];
      const sweep = cross > 0 ? 0 : 1;

      d += `${i ? 'L' : 'M'}${t1[0].toFixed(2)} ${t1[1].toFixed(2)} `;
      d += `A${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 ${sweep} ${t2[0].toFixed(2)} ${t2[1].toFixed(2)} `;
    }
    return d + 'Z';
  }

  /* Points on an ellipse inscribed in w x h. */
  const ring = (w, h, n, rotation, scale = 1) => {
    const cx = w / 2, cy = h / 2;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = rad(rotation - 90) + (i / n) * TAU;
      out.push([cx + Math.cos(a) * (w / 2) * scale, cy + Math.sin(a) * (h / 2) * scale]);
    }
    return out;
  };

  /* ---------- generators ----------
     Each takes the element (for w/h and its params) and returns a path. */

  const GEN = {

    /* Rectangle with four independently controllable corners. */
    rect(w, h, p) {
      const max = Math.min(w, h) / 2;
      const tl = clamp(p.rTL ?? p.radius, 0, max), tr = clamp(p.rTR ?? p.radius, 0, max);
      const br = clamp(p.rBR ?? p.radius, 0, max), bl = clamp(p.rBL ?? p.radius, 0, max);
      return `M${tl} 0 H${w - tr} A${tr} ${tr} 0 0 1 ${w} ${tr} V${h - br}
              A${br} ${br} 0 0 1 ${w - br} ${h} H${bl} A${bl} ${bl} 0 0 1 0 ${h - bl}
              V${tl} A${tl} ${tl} 0 0 1 ${tl} 0 Z`;
    },

    ellipse(w, h) {
      return `M${w / 2} 0 A${w / 2} ${h / 2} 0 0 1 ${w / 2} ${h}
              A${w / 2} ${h / 2} 0 0 1 ${w / 2} 0 Z`;
    },

    /* Superellipse — the actual maths behind an Apple "squircle". n=2 is a
       plain ellipse, n=4 is the icon shape, n>8 approaches a rectangle. */
    squircle(w, h, p) {
      const n = clamp(p.exponent ?? 4, 2, 20);
      const cx = w / 2, cy = h / 2, steps = 96;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * TAU;
        const ct = Math.cos(t), st = Math.sin(t);
        pts.push([
          cx + cx * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n),
          cy + cy * Math.sign(st) * Math.pow(Math.abs(st), 2 / n),
        ]);
      }
      return pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' ') + ' Z';
    },

    polygon(w, h, p) {
      return roundPath(ring(w, h, clamp(Math.round(p.sides ?? 6), 3, 24), p.rotation ?? 0), p.radius ?? 0);
    },

    star(w, h, p) {
      const n = clamp(Math.round(p.sides ?? 5), 3, 24);
      const inner = clamp(p.innerRatio ?? .5, .05, .98);
      const cx = w / 2, cy = h / 2, pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = rad((p.rotation ?? 0) - 90) + (i / (n * 2)) * TAU;
        const s = i % 2 ? inner : 1;
        pts.push([cx + Math.cos(a) * (w / 2) * s, cy + Math.sin(a) * (h / 2) * s]);
      }
      return roundPath(pts, p.radius ?? 0);
    },

    /* Cross / plus. `thickness` is the arm width as a fraction of the box. */
    cross(w, h, p) {
      const t = clamp(p.thickness ?? .34, .05, .95);
      const ax = w * t / 2, ay = h * t / 2;
      const cx = w / 2, cy = h / 2;
      return roundPath([
        [cx - ax, 0], [cx + ax, 0], [cx + ax, cy - ay], [w, cy - ay], [w, cy + ay],
        [cx + ax, cy + ay], [cx + ax, h], [cx - ax, h], [cx - ax, cy + ay],
        [0, cy + ay], [0, cy - ay], [cx - ax, cy - ay],
      ], p.radius ?? 0);
    },

    chevron(w, h, p) {
      const t = clamp(p.thickness ?? .34, .05, .9) * w;
      return roundPath([
        [0, 0], [t, 0], [w, h / 2], [t, h], [0, h], [w - t, h / 2],
      ], p.radius ?? 0);
    },

    arrow(w, h, p) {
      const t = clamp(p.thickness ?? .38, .05, .95) * h;   // shaft
      const head = clamp(p.headRatio ?? .42, .1, .9) * w;
      const cy = h / 2, sy = t / 2;
      return roundPath([
        [0, cy - sy], [w - head, cy - sy], [w - head, 0], [w, cy],
        [w - head, h], [w - head, cy + sy], [0, cy + sy],
      ], p.radius ?? 0);
    },

    /* Ring / arc segment. Two concentric arcs joined at the ends —
       a donut when the sweep is full, a gauge when it isn't. */
    arc(w, h, p) {
      const start = rad((p.startAngle ?? -90));
      const sweepDeg = clamp(p.sweep ?? 270, 1, 359.9);
      const end = start + rad(sweepDeg);
      const th = clamp(p.thickness ?? .3, .02, .49);
      const rx = w / 2, ry = h / 2;
      const ix = rx * (1 - th), iy = ry * (1 - th);
      const cx = w / 2, cy = h / 2;
      const P = (a, RX, RY) => [cx + Math.cos(a) * RX, cy + Math.sin(a) * RY];
      const large = sweepDeg > 180 ? 1 : 0;
      const [x1, y1] = P(start, rx, ry), [x2, y2] = P(end, rx, ry);
      const [x3, y3] = P(end, ix, iy), [x4, y4] = P(start, ix, iy);
      return `M${x1.toFixed(2)} ${y1.toFixed(2)}
              A${rx} ${ry} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
              L${x3.toFixed(2)} ${y3.toFixed(2)}
              A${ix} ${iy} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
    },

    /* Organic blob. Deterministic from `seed`, so a shape you like is
       reproducible and stable across reloads — not random on every render. */
    blob(w, h, p) {
      const n = clamp(Math.round(p.sides ?? 6), 3, 16);
      const amt = clamp(p.irregularity ?? .28, 0, .9);
      let s = (p.seed ?? 7) * 9301 + 49297;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      const cx = w / 2, cy = h / 2, pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rad(p.rotation ?? 0);
        const k = 1 - amt / 2 + rnd() * amt;
        pts.push([cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k]);
      }
      // Catmull-Rom through the points, converted to cubic beziers — a
      // rounded polygon would still read as faceted at this vertex count.
      let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)} `;
      }
      return d + 'Z';
    },

    wave(w, h, p) {
      const freq = clamp(p.frequency ?? 2, .5, 12);
      const amp = clamp(p.amplitude ?? .3, 0, 1) * h / 2;
      const steps = 120;
      let d = `M0 ${h / 2}`;
      for (let i = 1; i <= steps; i++) {
        const x = (i / steps) * w;
        const y = h / 2 + Math.sin((i / steps) * TAU * freq + rad(p.rotation ?? 0)) * amp;
        d += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      return d + ` L${w} ${h} L0 ${h} Z`;
    },

    /* Speech bubble — tail position slides along the bottom edge. */
    bubble(w, h, p) {
      const r = clamp(p.radius ?? 28, 0, Math.min(w, h) / 2);
      const bodyH = h * .82;
      const tx = clamp(p.tail ?? .3, .05, .95) * w;
      const tw = clamp(p.thickness ?? .12, .04, .4) * w;
      return `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w} ${r} V${bodyH - r}
              A${r} ${r} 0 0 1 ${w - r} ${bodyH} H${(tx + tw).toFixed(2)}
              L${tx.toFixed(2)} ${h} L${Math.max(tx - tw * .2, r).toFixed(2)} ${bodyH}
              H${r} A${r} ${r} 0 0 1 0 ${bodyH - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
    },

    arch(w, h, p) {
      const r = Math.min(w / 2, clamp(p.radius ?? w / 2, 0, w / 2));
      return `M0 ${h} V${r} A${r} ${r} 0 0 1 ${w} ${r} V${h} Z`;
    },

    /* Burst / seal — alternating radii with sharp teeth. */
    burst(w, h, p) {
      const n = clamp(Math.round(p.sides ?? 12), 5, 40);
      const inner = clamp(p.innerRatio ?? .82, .3, .99);
      const cx = w / 2, cy = h / 2, pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = rad((p.rotation ?? 0) - 90) + (i / (n * 2)) * TAU;
        const s = i % 2 ? inner : 1;
        pts.push([cx + Math.cos(a) * (w / 2) * s, cy + Math.sin(a) * (h / 2) * s]);
      }
      return roundPath(pts, p.radius ?? 0);
    },
  };

  /* Which controls the inspector should expose per generator, so the panel
     only ever shows parameters that actually do something. */
  const PARAMS = {
    rect:      ['corners'],
    ellipse:   [],
    squircle:  ['exponent'],
    polygon:   ['sides', 'radius', 'rotation'],
    star:      ['sides', 'innerRatio', 'radius', 'rotation'],
    burst:     ['sides', 'innerRatio', 'radius', 'rotation'],
    cross:     ['thickness', 'radius'],
    chevron:   ['thickness', 'radius'],
    arrow:     ['thickness', 'headRatio', 'radius'],
    arc:       ['startAngle', 'sweep', 'thickness'],
    blob:      ['sides', 'irregularity', 'seed', 'rotation'],
    wave:      ['frequency', 'amplitude', 'rotation'],
    bubble:    ['radius', 'tail', 'thickness'],
    arch:      ['radius'],
  };

  const CATALOG = [
    ['rect', 'Rectangle'], ['squircle', 'Squircle'], ['ellipse', 'Ellipse'],
    ['polygon', 'Polygon'], ['star', 'Star'], ['burst', 'Burst'],
    ['blob', 'Blob'], ['cross', 'Cross'], ['chevron', 'Chevron'],
    ['arrow', 'Arrow'], ['arc', 'Arc / ring'], ['wave', 'Wave'],
    ['bubble', 'Speech'], ['arch', 'Arch'],
  ];

  /* Legacy names from before the engine existed. */
  const ALIAS = { triangle: 'polygon', line: 'rect' };

  function path(el) {
    const kind = ALIAS[el.shape] || el.shape || 'rect';
    const gen = GEN[kind] || GEN.rect;
    const w = Math.max(el.w || 1, 1), h = Math.max(el.h || 1, 1);
    // A legacy triangle is just a 3-gon.
    const p = el.shape === 'triangle' ? { ...el, sides: 3 } : el;
    try { return gen(w, h, p); }
    catch { return GEN.rect(w, h, { radius: 0 }); }
  }

  return { path, GEN, PARAMS, CATALOG, roundPath, ALIAS };
})();
