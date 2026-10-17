/* ============================================================
   Background system — living depth.

   A flat fill is the tell that a deck came out of a generic tool.
   A *static* gradient is the tell that someone tried. What actually
   reads as expensive is depth that moves: independent colour blooms
   drifting on their own clocks, so the background is never quite the
   same shape twice and never loops visibly.

   Each bloom is a separate element animated on `transform` only, so
   the whole system runs on the compositor — no repaint, no layout,
   no measurable cost during a talk. Everything is built from theme
   variables, so it can't clash with content, and it's pure CSS, so
   it survives the standalone export intact.
   ============================================================ */

const Backgrounds = (() => {

  /* A bloom: position, size, which glow it uses, and its own tempo.
     Prime-ish durations keep the blooms from re-synchronising into a
     visible loop — the drift should feel like weather, not a GIF. */
  const blob = (x, y, w, h, tint, dur, delay = 0) => ({ x, y, w, h, tint, dur, delay });

  const PRESETS = {
    none: {
      name: 'Flat', hint: 'Theme background only',
      blobs: [],
    },

    spotlight: {
      name: 'Spotlight', hint: 'Soft light from above',
      blobs: [blob(50, -18, 120, 90, 'glow', 23)],
    },

    mesh: {
      name: 'Mesh', hint: 'Layered colour blooms',
      blobs: [
        blob(12, 8, 70, 80, 'glow', 27),
        blob(88, 18, 62, 72, 'glow2', 34, -6),
        blob(68, 96, 78, 86, 'glow', 41, -13),
      ],
    },

    aurora: {
      name: 'Aurora', hint: 'Wide colour sweep',
      blobs: [
        blob(20, 100, 92, 62, 'glow2', 31),
        blob(80, 0, 80, 58, 'glow', 37, -9),
        blob(50, 50, 110, 70, 'glow', 47, -20),
      ],
    },

    nebula: {
      name: 'Nebula', hint: 'Deep, slow, cinematic',
      blobs: [
        blob(28, 24, 86, 92, 'glow', 53),
        blob(74, 70, 78, 84, 'glow2', 43, -11),
        blob(50, 12, 64, 60, 'glow2', 61, -27),
        blob(10, 88, 70, 74, 'glow', 37, -5),
      ],
    },

    grid: {
      name: 'Grid', hint: 'Technical blueprint',
      blobs: [blob(50, 0, 100, 80, 'glow', 29)],
      pattern: `
        background-image:
          linear-gradient(var(--line) 1px, transparent 1px),
          linear-gradient(90deg, var(--line) 1px, transparent 1px);
        background-size: 80px 80px, 80px 80px;
        --pan-x: 80px; --pan-y: 80px;`,
      mask: `radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%)`,
      opacity: .5,
      overlayMotion: 'pan',
    },

    dots: {
      name: 'Dots', hint: 'Quiet texture',
      blobs: [blob(78, 10, 90, 70, 'glow', 33)],
      pattern: `
        background-image: radial-gradient(var(--line) 1.6px, transparent 1.7px);
        background-size: 46px 46px;
        --pan-x: 46px; --pan-y: 46px;`,
      mask: `radial-gradient(110% 100% at 60% 20%, #000 10%, transparent 80%)`,
      opacity: .7,
      overlayMotion: 'pan',
    },

    rays: {
      name: 'Rays', hint: 'Rotating light shafts',
      blobs: [blob(50, 0, 90, 70, 'glow', 25)],
      // Centred on the layer's own pivot (50% 0), which .bg-pattern[spin]
      // parks over the slide's top-centre — so the shafts radiate from the
      // point the layer rotates about and the geometry can't drift.
      pattern: `
        background-image: conic-gradient(from 210deg at 50% 0%,
          transparent 0deg, var(--glow) 26deg, transparent 52deg,
          transparent 66deg, var(--glow2) 88deg, transparent 116deg);`,
      overlayMotion: 'spin',
    },

    horizon: {
      name: 'Horizon', hint: 'Glow along the base',
      blobs: [
        blob(50, 118, 120, 60, 'glow', 26),
        blob(20, 108, 70, 44, 'glow2', 35, -8),
      ],
    },

    /* ---- Connect mist fields ----
       Soft gradient atmospheres from the Connect identity: slow, deep blooms
       in fixed Connect tints over a base colour the field sets for itself
       (see Library backgrounds). */
    mistNavy: {
      name: 'Navy mist', hint: 'Deep blue broadcast field',
      blobs: [blob(10, 96, 96, 92, 'cx-blue', 41), blob(92, 8, 76, 80, 'cx-violet', 53, -14),
              blob(62, 60, 70, 64, 'cx-cyan', 37, -6)],
    },
    mistDusk: {
      name: 'Dusk mist', hint: 'Violet into warm orange',
      blobs: [blob(14, 90, 90, 90, 'cx-violet', 43), blob(88, 14, 80, 84, 'cx-orange', 51, -9),
              blob(60, 70, 70, 70, 'cx-magenta', 35, -21)],
    },
    mistOcean: {
      name: 'Ocean mist', hint: 'Teal and blue depths',
      blobs: [blob(8, 20, 90, 90, 'cx-teal', 47), blob(90, 86, 86, 86, 'cx-blue', 39, -12),
              blob(50, 40, 60, 60, 'cx-cyan', 57, -27)],
    },
    mistPearl: {
      name: 'Pearl mist', hint: 'Pale daylight pastels',
      blobs: [blob(12, 90, 80, 90, 'cx-pink', 39), blob(88, 14, 80, 84, 'cx-sky', 47, -9),
              blob(70, 96, 64, 70, 'cx-peach', 31, -17), blob(30, 8, 60, 60, 'cx-lilac', 57, -25)],
    },
    inkGlow: {
      name: 'Ink glow', hint: 'Black with a low blue light',
      blobs: [blob(50, 118, 120, 60, 'cx-blue', 33), blob(80, 0, 60, 50, 'cx-violet', 49, -13)],
    },

    duotone: {
      name: 'Duotone', hint: 'Bold two-colour split',
      blobs: [
        blob(4, 6, 90, 90, 'glow', 30),
        blob(96, 94, 90, 90, 'glow2', 38, -12),
      ],
    },
  };

  /* How the depth behaves. `none` freezes everything — the honest option
     for a deck that will be filmed, or a room that needs the calm. */
  const MOTIONS = {
    none:  { name: 'Still',   hint: 'No movement' },
    drift: { name: 'Drift',   hint: 'Slow wandering blooms' },
    breathe:{ name: 'Breathe', hint: 'Gentle scale pulse' },
    flow:  { name: 'Flow',    hint: 'Sweeping diagonal current' },
    orbit: { name: 'Orbit',   hint: 'Circling, most alive' },
  };

  /* Grain exists to break up gradient banding, and banding is a LUMINANCE
     artefact — so the noise has to be luminance too. feTurbulence generates
     each channel independently, which is coloured static: on a projector
     that reads as chroma dirt crawling over the slide rather than as film
     grain. The colour matrix flattens it to grey, and the alpha row keeps
     the tile from carrying its own opacity on top of the layer's. */
  const GRAIN_SVG =
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>` +
    `<filter id='n' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/>` +
    /* Collapse the three noise channels into one grey value and pin alpha
       at 1, in a single explicit matrix.

       Both halves matter. feTurbulence generates R, G and B independently,
       which is coloured static: on a projector that reads as chroma dirt
       crawling over the slide, not as film grain — and banding, the thing
       this layer exists to break up, is a luminance artefact, so the fix
       has to be luminance too. And turbulence varies alpha as well, which
       punches transparent holes through the tile; those read as dirt on
       the lens rather than as grain in the image. */
    `<feColorMatrix type='matrix' values='` +
    `.34 .33 .33 0 0  .34 .33 .33 0 0  .34 .33 .33 0 0  0 0 0 0 1'/>` +
    `</filter>` +
    `<rect width='140' height='140' filter='url(#n)'/></svg>`;
  /* Fully percent-encoded and UNQUOTED.

     This used to be `url("data:...")` written straight into a style
     attribute — which is a style attribute already delimited by double
     quotes, so the HTML parser ended it at the first quote inside the URL
     and the grain silently never rendered at all. Anywhere. Swapping the
     SVG's own quotes for apostrophes only moved the problem, since an
     unquoted url() token can't contain those either.

     encodeURIComponent leaves ' ( ) ! * alone, and the first three are
     exactly what url() and the SVG both use, so they're escaped by hand. */
  const GRAIN_URL = 'url(data:image/svg+xml,' +
    encodeURIComponent(GRAIN_SVG)
      .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')';

  /* A bloom's falloff.

     `radial-gradient(closest-side, X 0%, transparent 100%)` has two faults
     that are most of why a gradient background looks cheap:

       1. `transparent` is transparent BLACK. Fading a coloured bloom to it
          drags every midtone toward grey, so each bloom wears a dirty halo
          exactly where it should be dissolving into the field. Fading to
          the same hue at zero alpha is the fix, and it's not optional.

       2. A linear alpha ramp has a corner in it at both ends. The eye finds
          that corner and reads a disc with an edge. Real light falls off on
          a curve, so these stops trace a rough Gaussian instead — dense in
          the core, long and thin in the tail.

     color-mix does the alpha arithmetic against the zero-alpha twin, which
     keeps the whole thing driven by theme variables: change the accent and
     every bloom re-tints without re-rendering a thing. */
  const FALLOFF = [[0, 100], [16, 93], [32, 76], [48, 53], [64, 31], [80, 14], [91, 5], [100, 0]];

  const bloom = (tint) => 'radial-gradient(closest-side, ' + FALLOFF.map(([pos, amt]) =>
    `color-mix(in srgb, var(--${tint}) ${amt}%, var(--${tint}-0)) ${pos}%`).join(', ') + ')';

  function html(slide) {
    const preset = PRESETS[slide.bgPreset] || PRESETS.none;
    const motion = slide.bgMotion || 'drift';
    // 1 = the tempo the durations were tuned at; the control is a multiplier.
    const speed = slide.bgSpeed || 1;
    const out = [];

    if (preset.blobs.length) {
      const blobs = preset.blobs.map((b, i) => {
        const dur = (b.dur / speed).toFixed(1);
        // Negative delays start each bloom mid-path, so nothing "begins"
        // when the slide appears — the background is already in motion.
        const delay = ((b.delay || -i * 7) / speed).toFixed(1);
        // Base tempo is kept on the node so the tempo slider can re-time the
        // animation in place, without rebuilding (which would restart it).
        return `<i class="bg-blob" data-dur="${b.dur}" data-delay="${b.delay || -i * 7}"
          style="--x:${b.x}%;--y:${b.y}%;--w:${b.w}%;--h:${b.h}%;
          background:${bloom(b.tint)};
          animation-duration:${dur}s;animation-delay:${delay}s"></i>`;
      }).join('');
      out.push(`<div class="slide-bg" data-motion="${motion}">${blobs}</div>`);
    }

    /* The pattern sits on an inner layer so its motion can be a TRANSFORM.
       Panning `background-position` on a full-bleed tiled gradient repaints
       the whole slide every frame — the one thing this system is built to
       avoid — and it silently breaks on presets whose pattern has a
       different number of layers than the keyframe declares. The mask and
       opacity stay on the outer element, which never moves, so the fade-out
       at the edges holds still while the pattern travels under it. */
    if (preset.pattern) {
      const om = motion === 'none' ? 'none' : (preset.overlayMotion || 'none');
      const mask = preset.mask
        ? `-webkit-mask-image:${preset.mask};mask-image:${preset.mask};` : '';
      const op = preset.opacity != null ? `opacity:${preset.opacity};` : '';
      // Rays sweep a full circle, so they need many times longer than a pan
      // that only has to travel one tile before it repeats.
      const dur = (preset.overlayMotion === 'spin' ? 120 : 26) / speed;
      out.push(`<div class="slide-bg-overlay" style="${mask}${op}">` +
        `<i class="bg-pattern" data-omotion="${om}" data-dur="${
          preset.overlayMotion === 'spin' ? 120 : 26}"
          style="${preset.pattern.replace(/\s+/g, ' ')};animation-duration:${dur.toFixed(1)}s"></i></div>`);
    }

    if (slide.bgGrain) out.push(`<div class="slide-grain" style="background-image:${GRAIN_URL}"></div>`);
    if (slide.bgVignette) out.push(`<div class="slide-vignette"></div>`);
    return out.join('');
  }

  return { PRESETS, MOTIONS, html, GRAIN_URL };
})();
