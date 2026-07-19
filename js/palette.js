/* ============================================================
   Colour engine.

   The difference between a deck that looks designed and one that
   looks assembled is usually that the second one picked its colours
   independently. Here you choose ONE accent and everything else —
   the secondary, the glows, the surfaces, the chart series — is
   derived from it by rule, so nothing can clash.

   Working space is HSL with perceptual corrections: hue rotations
   are damped through the yellow/green region (60-180deg) where equal
   hue steps read as much larger colour steps, and lightness targets
   are compensated for the fact that blues read darker than yellows
   at identical L.
   ============================================================ */

const Palette = (() => {

  /* ---------- conversions ---------- */

  function hexToRgb(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  const rgbToHex = ({ r, g, b }) =>
    '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > .5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s, l };
  }

  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360;
    if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < .5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      t = ((t % 1) + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: f(h / 360 + 1 / 3) * 255, g: f(h / 360) * 255, b: f(h / 360 - 1 / 3) * 255 };
  }

  const toHsl = (hex) => { const rgb = hexToRgb(hex); return rgb ? rgbToHsl(rgb) : null; };
  const toHex = (hsl) => rgbToHex(hslToRgb(hsl));

  /* Relative luminance, for contrast checks. */
  function luminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    return .2126 * f(rgb.r) + .7152 * f(rgb.g) + .0722 * f(rgb.b);
  }

  function contrast(a, b) {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
  }

  /* ---------- perceptual helpers ---------- */

  /* Equal hue steps are not equal perceptual steps. Rotations that land in
     the yellow-green band get compressed so a "+60deg" from blue and from
     orange feel like comparable moves. */
  function rotate(h, deg) {
    const target = h + deg;
    const norm = ((target % 360) + 360) % 360;
    if (norm > 60 && norm < 180) {
      const t = (norm - 60) / 120;
      return 60 + t * 120 * .72 + (norm > 120 ? 14 : 0);
    }
    return norm;
  }

  /* Blue reads darker than yellow at the same L, so nudge lightness by hue. */
  const lightnessBias = (h) => {
    const n = ((h % 360) + 360) % 360;
    if (n > 200 && n < 280) return .06;    // blues/violets lift
    if (n > 40 && n < 100) return -.05;    // yellows sink
    return 0;
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const withAlpha = (hex, a) => {
    const rgb = hexToRgb(hex);
    return rgb ? `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${a})` : `rgba(0,0,0,${a})`;
  };

  /* ---------- the derivation ---------- */

  const HARMONIES = {
    analogous:     { name: 'Analogous',     shift: 42 },
    complementary: { name: 'Complementary', shift: 180 },
    triadic:       { name: 'Triadic',       shift: 120 },
    split:         { name: 'Split',         shift: 152 },
    mono:          { name: 'Monochrome',    shift: 0 },
  };

  /* Given one accent and a harmony rule, produce every colour the slide
     surface needs. `dark` selects which side of the contrast the surfaces
     sit on. */
  function derive(accentHex, { harmony = 'analogous', dark = true } = {}) {
    const base = toHsl(accentHex) || toHsl('#5b8cff');
    const rule = HARMONIES[harmony] || HARMONIES.analogous;

    // Accent itself: keep the user's hue, but guarantee it can carry text on
    // the deck background by floor-ing its saturation and lightness.
    const accent = toHex({
      h: base.h,
      s: clamp01(Math.max(base.s, .55)),
      l: clamp01((dark ? Math.max(base.l, .58) : Math.min(base.l, .52)) + lightnessBias(base.h)),
    });

    const h2 = rule.shift === 0 ? base.h : rotate(base.h, rule.shift);
    const accent2 = toHex({
      h: h2,
      s: clamp01(rule.shift === 0 ? base.s * .8 : Math.max(base.s * .92, .5)),
      l: clamp01((dark ? .66 : .46) + lightnessBias(h2) + (rule.shift === 0 ? (dark ? .12 : -.12) : 0)),
    });

    // A third series colour for charts, placed between the two so a
    // three-series chart never has two neighbours that read as the same.
    const h3 = rotate(base.h, rule.shift === 0 ? 0 : rule.shift / 2);
    const accent3 = toHex({
      h: h3,
      s: clamp01(base.s * .7),
      l: clamp01((dark ? .74 : .38) + lightnessBias(h3)),
    });

    // Backgrounds carry a trace of the accent hue rather than being neutral
    // grey — this is most of why a deck reads as "one thing".
    const bg = toHex({ h: base.h, s: dark ? .18 : .30, l: dark ? .045 : .975 });
    const bgLift = toHex({ h: base.h, s: dark ? .22 : .34, l: dark ? .10 : .935 });
    const ink = toHex({ h: base.h, s: dark ? .14 : .22, l: dark ? .96 : .09 });
    const muted = toHex({ h: base.h, s: dark ? .11 : .13, l: dark ? .63 : .40 });

    return {
      accent, accent2, accent3, bg, bgLift, ink, muted,
      surface: withAlpha(dark ? '#ffffff' : '#000000', dark ? .055 : .045),
      line: withAlpha(dark ? '#ffffff' : '#000000', dark ? .14 : .13),
      glow: withAlpha(accent, dark ? .40 : .28),
      glow2: withAlpha(accent2, dark ? .32 : .22),
      accentSoft: withAlpha(accent, .16),
      // Gradient used for luminous display type and accent bars.
      gradient: `linear-gradient(115deg, ${accent} 0%, ${accent2} 100%)`,
    };
  }

  /* Turn a derived palette into the CSS variables the slide surface reads. */
  function toVars(p, { dark = true } = {}) {
    return {
      '--bg': `radial-gradient(120% 130% at 12% -10%, ${p.bgLift} 0%, ${p.bg} 62%)`,
      '--bg-flat': p.bg,
      '--ink': p.ink,
      '--muted': p.muted,
      '--accent': p.accent,
      '--accent2': p.accent2,
      '--accent3': p.accent3,
      '--surface': p.surface,
      '--line': p.line,
      '--glow': p.glow,
      '--glow2': p.glow2,
      '--accent-soft': p.accentSoft,
      '--accent-gradient': p.gradient,
      '--scheme': dark ? 'dark' : 'light',
    };
  }

  /* Readability guard: report accent/background pairs that fall below the
     3:1 large-text threshold, so the theme picker can warn instead of
     silently shipping a slide nobody at the back can read. */
  function audit(p) {
    return {
      accentOnBg: contrast(p.accent, p.bg),
      inkOnBg: contrast(p.ink, p.bg),
      mutedOnBg: contrast(p.muted, p.bg),
      ok: contrast(p.accent, p.bg) >= 3 && contrast(p.ink, p.bg) >= 7,
    };
  }

  return { derive, toVars, audit, contrast, luminance, withAlpha, toHsl, toHex, HARMONIES, hexToRgb, rgbToHex };
})();
