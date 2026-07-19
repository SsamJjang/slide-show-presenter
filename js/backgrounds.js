/* ============================================================
   Background system.

   A flat fill is the single biggest tell that a deck came out of a
   generic tool. Every preset here is built only from the active
   theme's variables, so backgrounds can never fight the content —
   change the accent and the background follows.

   All layers are pure CSS gradients (no images, no canvas) so they
   scale to any projector resolution, cost nothing to render, and
   survive the standalone HTML export intact.
   ============================================================ */

const Backgrounds = (() => {

  const PRESETS = {
    none: {
      name: 'Flat', hint: 'Theme background only',
      layers: () => [],
    },

    spotlight: {
      name: 'Spotlight', hint: 'Soft light from above',
      layers: () => [
        `radial-gradient(120% 90% at 50% -20%, var(--glow) 0%, transparent 62%)`,
      ],
    },

    mesh: {
      name: 'Mesh', hint: 'Layered colour blooms',
      layers: () => [
        `radial-gradient(60% 70% at 12% 8%, var(--glow) 0%, transparent 60%)`,
        `radial-gradient(55% 65% at 88% 18%, var(--glow2) 0%, transparent 62%)`,
        `radial-gradient(70% 80% at 68% 96%, var(--glow) 0%, transparent 58%)`,
      ],
    },

    aurora: {
      name: 'Aurora', hint: 'Wide colour sweep',
      layers: () => [
        `radial-gradient(80% 55% at 20% 100%, var(--glow2) 0%, transparent 66%)`,
        `radial-gradient(70% 50% at 80% 0%, var(--glow) 0%, transparent 64%)`,
        `linear-gradient(115deg, transparent 30%, var(--accent-soft) 100%)`,
      ],
    },

    grid: {
      name: 'Grid', hint: 'Technical blueprint',
      layers: () => [
        `radial-gradient(100% 80% at 50% 0%, var(--glow) 0%, transparent 58%)`,
      ],
      // Ruled lines fade out toward the bottom so they never compete with text.
      overlay: `
        background-image:
          linear-gradient(var(--line) 1px, transparent 1px),
          linear-gradient(90deg, var(--line) 1px, transparent 1px);
        background-size: 80px 80px, 80px 80px;
        -webkit-mask-image: radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%);
        mask-image: radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%);
        opacity: .5;`,
    },

    dots: {
      name: 'Dots', hint: 'Quiet texture',
      layers: () => [
        `radial-gradient(90% 70% at 78% 10%, var(--glow) 0%, transparent 62%)`,
      ],
      overlay: `
        background-image: radial-gradient(var(--line) 1.6px, transparent 1.6px);
        background-size: 46px 46px;
        -webkit-mask-image: radial-gradient(110% 100% at 60% 20%, #000 10%, transparent 80%);
        mask-image: radial-gradient(110% 100% at 60% 20%, #000 10%, transparent 80%);
        opacity: .7;`,
    },

    rays: {
      name: 'Rays', hint: 'Light shafts',
      layers: () => [
        `conic-gradient(from 210deg at 50% -10%, transparent 0deg, var(--glow) 26deg, transparent 52deg,
           transparent 66deg, var(--glow2) 88deg, transparent 116deg)`,
        `radial-gradient(90% 70% at 50% 0%, var(--glow) 0%, transparent 60%)`,
      ],
    },

    horizon: {
      name: 'Horizon', hint: 'Glow along the base',
      layers: () => [
        `radial-gradient(120% 60% at 50% 118%, var(--glow) 0%, transparent 64%)`,
        `linear-gradient(180deg, transparent 55%, var(--accent-soft) 100%)`,
      ],
    },

    duotone: {
      name: 'Duotone', hint: 'Bold two-colour split',
      layers: () => [
        `linear-gradient(125deg, var(--glow) 0%, transparent 48%, var(--glow2) 100%)`,
      ],
    },
  };

  /* Grain is a separate toggle rather than a preset: it composes with all of
     them, and it is the cheapest way to stop large gradients from banding on
     a projector. Inline SVG turbulence — no asset to ship. */
  const GRAIN_SVG =
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter>` +
    `<rect width='120' height='120' filter='url(%23n)' opacity='.55'/></svg>`;

  const GRAIN_URL = `url("data:image/svg+xml,${GRAIN_SVG.replace(/#/g, '%23').replace(/"/g, "'")}")`;

  /* Build the HTML for a slide's background stack. */
  function html(slide) {
    const preset = PRESETS[slide.bgPreset] || PRESETS.none;
    const out = [];

    const layers = preset.layers();
    if (layers.length) {
      out.push(`<div class="slide-bg" style="background-image:${layers.join(',')}"></div>`);
    }
    if (preset.overlay) {
      out.push(`<div class="slide-bg-overlay" style="${preset.overlay.replace(/\s+/g, ' ')}"></div>`);
    }
    if (slide.bgGrain) {
      out.push(`<div class="slide-grain" style="background-image:${GRAIN_URL}"></div>`);
    }
    if (slide.bgVignette) {
      out.push(`<div class="slide-vignette"></div>`);
    }
    return out.join('');
  }

  return { PRESETS, html, GRAIN_URL };
})();
