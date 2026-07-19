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
      overlay: `
        background-image:
          linear-gradient(var(--line) 1px, transparent 1px),
          linear-gradient(90deg, var(--line) 1px, transparent 1px);
        background-size: 80px 80px, 80px 80px;
        -webkit-mask-image: radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%);
        mask-image: radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%);
        opacity: .5;`,
      overlayMotion: 'pan',
    },

    dots: {
      name: 'Dots', hint: 'Quiet texture',
      blobs: [blob(78, 10, 90, 70, 'glow', 33)],
      overlay: `
        background-image: radial-gradient(var(--line) 1.6px, transparent 1.6px);
        background-size: 46px 46px;
        -webkit-mask-image: radial-gradient(110% 100% at 60% 20%, #000 10%, transparent 80%);
        mask-image: radial-gradient(110% 100% at 60% 20%, #000 10%, transparent 80%);
        opacity: .7;`,
      overlayMotion: 'pan',
    },

    rays: {
      name: 'Rays', hint: 'Rotating light shafts',
      blobs: [blob(50, 0, 90, 70, 'glow', 25)],
      overlay: `
        background-image: conic-gradient(from 210deg at 50% -10%,
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

  const GRAIN_SVG =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter>` +
    `<rect width='120' height='120' filter='url(%23n)' opacity='.55'/></svg>`;
  const GRAIN_URL = `url("data:image/svg+xml,${GRAIN_SVG.replace(/#/g, '%23').replace(/"/g, "'")}")`;

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
          background:radial-gradient(closest-side, var(--${b.tint}) 0%, transparent 100%);
          animation-duration:${dur}s;animation-delay:${delay}s"></i>`;
      }).join('');
      out.push(`<div class="slide-bg" data-motion="${motion}">${blobs}</div>`);
    }

    if (preset.overlay) {
      const om = motion === 'none' ? 'none' : (preset.overlayMotion || 'none');
      out.push(`<div class="slide-bg-overlay" data-omotion="${om}"
        style="${preset.overlay.replace(/\s+/g, ' ')};animation-duration:${(70 / speed).toFixed(1)}s"></div>`);
    }

    if (slide.bgGrain) out.push(`<div class="slide-grain" style="background-image:${GRAIN_URL}"></div>`);
    if (slide.bgVignette) out.push(`<div class="slide-vignette"></div>`);
    return out.join('');
  }

  return { PRESETS, MOTIONS, html, GRAIN_URL };
})();
