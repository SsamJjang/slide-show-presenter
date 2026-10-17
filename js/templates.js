/* ============================================================
   Themes + layouts.

   This file is where "looks like a real keynote" actually lives.
   The layouts below are not empty boxes — they're pre-composed
   with a proper typographic scale, a consistent 140px margin, and
   an optical grid. Pick one, replace the words, and it already
   looks like it came out of a design team.
   ============================================================ */

const MARGIN = 140;
const CONTENT_W = DESIGN_W - MARGIN * 2;   // 1640

/* ---------------- Themes ---------------- */

const THEMES = {
  /* Meta Connect. Deep navy broadcast field, white medium-weight type,
     Meta blue with the identity's cyan / violet / magenta around it. The
     display face is Meta's own Optimistic where installed; the fallbacks are
     the closest geometric sans each platform ships. */
  connect: {
    name: 'Connect', mood: 'Meta Connect · keynote broadcast',
    dark: true,
    swatch: ['#000000', '#3f7dff', '#ff7fd6'],
    vars: {
      '--bg-flat': '#000000', '--bg': '#000000',
      '--ink': '#ffffff', '--muted': '#9ba1ad',
      '--accent': '#3f7dff', '--accent2': '#ff7fd6', '--accent3': '#7df3ff',
      '--glow': 'rgba(63,125,255,.42)', '--glow2': 'rgba(164,107,255,.36)',
      '--glow-0': 'rgba(63,125,255,0)', '--glow2-0': 'rgba(164,107,255,0)',
      '--accent-gradient': 'linear-gradient(100deg, #9ff6ff, #5aa2ff 30%, #a46bff 62%, #ff8fdc)',
      '--surface': 'rgba(255,255,255,.06)', '--line': 'rgba(255,255,255,.14)',
      '--font-display': "'Optimistic Display', 'Optimistic VF', 'Montserrat', 'Inter Tight', 'Segoe UI Variable Display', 'SF Pro Display', system-ui, sans-serif",
      '--font-body': "'Optimistic Text', 'Optimistic VF', 'Inter', 'Segoe UI Variable Text', 'SF Pro Text', system-ui, sans-serif",
      '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    },
  },
  obsidian: {
    name: 'Obsidian', mood: 'Dark · high contrast · product launch',
    dark: true,
    swatch: ['#0a0a0c', '#5b8cff', '#e8e9ed'],
    vars: {
      '--bg-flat': '#0a0a0c',
      '--bg-a': '#16171d', '--bg-b': '#0a0a0c',
      '--bg-shape': 'radial-gradient(125% 125% at 15% 0%)',
      '--ink': '#f2f3f7', '--muted': '#9aa0ae',
      '--accent': '#5b8cff', '--accent2': '#b78bff',
      '--surface': 'rgba(255,255,255,.05)', '--line': 'rgba(255,255,255,.12)',
      '--font-display': "'Inter Tight', 'Inter', system-ui, -apple-system, sans-serif",
      '--font-body': "'Inter', system-ui, -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    },
  },
  paper: {
    name: 'Paper', mood: 'Light · editorial · keynote',
    dark: false,
    swatch: ['#fbfaf8', '#1b1b1f', '#c8542a'],
    vars: {
      '--bg-flat': '#fbfaf8',
      '--bg': '#fbfaf8', '--ink': '#16161a', '--muted': '#6b6b73',
      '--accent': '#c8542a', '--accent2': '#1f6f5c',
      '--surface': 'rgba(0,0,0,.04)', '--line': 'rgba(0,0,0,.14)',
      '--font-display': "'Inter Tight', system-ui, sans-serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "ui-monospace, 'SF Mono', Menlo, monospace",
    },
  },
  aurora: {
    name: 'Aurora', mood: 'Gradient · energetic · demo day',
    dark: true,
    swatch: ['#0b1020', '#4cc9f0', '#f72585'],
    vars: {
      '--bg-flat': '#0b1020',
      '--bg-a': '#0b1020', '--bg-b': '#2a1240', '--bg-mid': '#171b3a',
      '--bg-shape': 'linear-gradient(135deg)',
      '--ink': '#f4f6ff', '--muted': '#98a2c8',
      '--accent': '#4cc9f0', '--accent2': '#f72585',
      '--surface': 'rgba(255,255,255,.06)', '--line': 'rgba(255,255,255,.16)',
      '--font-display': "'Inter Tight', system-ui, sans-serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "ui-monospace, Menlo, monospace",
    },
  },
  slate: {
    name: 'Slate', mood: 'Enterprise · calm · board deck',
    dark: false,
    swatch: ['#f4f6f8', '#0f2a43', '#2f7dd1'],
    vars: {
      '--bg-flat': '#f4f6f8',
      '--bg': '#f4f6f8', '--ink': '#0f2a43', '--muted': '#5b7086',
      '--accent': '#2f7dd1', '--accent2': '#0aa678',
      '--surface': 'rgba(15,42,67,.05)', '--line': 'rgba(15,42,67,.16)',
      '--font-display': "'Inter Tight', system-ui, sans-serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "ui-monospace, Menlo, monospace",
    },
  },
  carbon: {
    name: 'Carbon', mood: 'Mono · technical · developer talk',
    dark: true,
    swatch: ['#101114', '#00e08f', '#e6e6e6'],
    vars: {
      '--bg-flat': '#101114',
      '--bg': '#101114', '--ink': '#e9ecef', '--muted': '#8b9199',
      '--accent': '#00e08f', '--accent2': '#ffb020',
      '--surface': 'rgba(255,255,255,.05)', '--line': 'rgba(255,255,255,.13)',
      '--font-display': "'JetBrains Mono', ui-monospace, monospace",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "'JetBrains Mono', ui-monospace, monospace",
    },
  },
  ivory: {
    name: 'Ivory', mood: 'Warm · premium · brand story',
    dark: false,
    swatch: ['#f6f1e8', '#2b2620', '#a8763e'],
    vars: {
      '--bg-flat': '#f6f1e8',
      '--bg-a': '#f9f5ee', '--bg-b': '#f1e9dc',
      '--bg-shape': 'linear-gradient(160deg)',
      '--ink': '#241f19', '--muted': '#6f6558',
      '--accent': '#a8763e', '--accent2': '#3f5c50',
      '--surface': 'rgba(36,31,25,.05)', '--line': 'rgba(36,31,25,.15)',
      '--font-display': "'Inter Tight', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "ui-monospace, Menlo, monospace",
    },
  },
};

/* Apply a theme, then — if the deck overrides the accent — regenerate the
   whole palette from that one colour so nothing is left un-harmonised.
   `deck` is optional so previews can render a bare theme. */
/* The single source of truth for a deck's CSS variables. The editor applies
   these to a live element; the exporter serialises the same map into the
   standalone file, so an exported deck can't drift from what you designed. */
function computeThemeVars(key, deck = null) {
  const t = THEMES[key] || THEMES.obsidian;
  const dark = t.dark !== false;
  const vars = { ...t.vars };

  /* A theme that declares its background as two endpoints gets the same
     multi-stop, perceptually-even ramp the derived palettes use. A two-stop
     gradient across 1920px of near-black bands into stripes on a projector,
     and hand-writing seven stops per theme would be unmaintainable. */
  if (vars['--bg-shape']) {
    const a = vars['--bg-a'], b = vars['--bg-b'], mid = vars['--bg-mid'];
    const ramp = mid
      ? Palette.stops(a, mid, 4).map((c, i) => c.replace(/[\d.]+%$/, (i / 4 * 45).toFixed(1) + '%'))
          .concat(Palette.stops(mid, b, 4).slice(1)
            .map((c, i) => c.replace(/[\d.]+%$/, (45 + (i + 1) / 4 * 55).toFixed(1) + '%')))
      : Palette.stops(a, b, 6);
    vars['--bg'] = vars['--bg-shape'].replace(/\)$/, ', ' + ramp.join(', ') + ')');
    delete vars['--bg-shape']; delete vars['--bg-a'];
    delete vars['--bg-b']; delete vars['--bg-mid'];
  }

  // Derived extras, so themes predating the colour engine still resolve.
  vars['--bg-flat'] ??= t.vars['--bg'];
  vars['--accent3'] ??= t.vars['--accent2'];
  vars['--accent-gradient'] ??= Palette.linear('115deg', t.vars['--accent'], t.vars['--accent2']);
  vars['--glow'] ??= Palette.withAlpha(t.vars['--accent'], dark ? .38 : .26);
  vars['--glow2'] ??= Palette.withAlpha(t.vars['--accent2'], dark ? .30 : .20);
  /* Zero-alpha versions of the same hues. Fading a bloom to the `transparent`
     keyword means fading to transparent BLACK, which rings every bloom with a
     dirty grey halo where it meets the background. */
  vars['--glow-0'] ??= Palette.withAlpha(t.vars['--accent'], 0);
  vars['--glow2-0'] ??= Palette.withAlpha(t.vars['--accent2'], 0);
  vars['--accent-soft'] ??= Palette.withAlpha(t.vars['--accent'], .16);
  // Materials need to know which way "lit" points: a white sheen is invisible
  // on a light deck, so those edges have to darken instead of brighten.
  vars['--spec'] ??= dark ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.92)';
  vars['--shade'] ??= dark ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.22)';
  vars['--scheme'] ??= dark ? 'dark' : 'light';

  // A deck accent regenerates the entire colour system, keeping typography.
  if (deck && deck.accent) {
    const p = Palette.derive(deck.accent, { harmony: deck.harmony || 'analogous', dark });
    Object.assign(vars, Palette.toVars(p, { dark }));
  }
  return vars;
}

function applyTheme(root, key, deck = null) {
  const vars = computeThemeVars(key, deck);
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.deckTheme = key;
}

/* ---------------- Layouts ----------------
   Each returns a fresh element array. `T` is a text shorthand. */

const T = (patch) => makeElement('text', patch);
const S = (patch) => makeElement('shape', patch);

const LAYOUTS = {
  title: {
    name: 'Title', hint: 'Opening slide',
    build: () => [
      T({ role: 'kicker', text: 'PRODUCT LAUNCH · 2026', x: MARGIN, y: 360, w: CONTENT_W, h: 60,
          size: 30, weight: 600, letterSpacing: .18, uppercase: true, color: 'var(--accent)' }),
      T({ role: 'display', text: 'The thing that\nchanges everything', x: MARGIN, y: 430, w: CONTENT_W, h: 320,
          size: 132, weight: 700, lineHeight: 1.02, letterSpacing: -.035 }),
      T({ role: 'subtitle', text: 'Your name · Your company', x: MARGIN, y: 780, w: CONTENT_W, h: 60,
          size: 34, color: 'var(--muted)' }),
      S({ shape: 'rect', x: MARGIN, y: 745, w: 120, h: 5, fill: 'accent', radius: 3 }),
    ],
  },

  section: {
    name: 'Section', hint: 'Chapter break',
    build: () => [
      T({ role: 'kicker', text: '01', x: MARGIN, y: 396, w: 400, h: 100,
          size: 74, weight: 700, color: 'var(--accent)', letterSpacing: -.02 }),
      T({ role: 'title', text: 'How it works', x: MARGIN, y: 500, w: CONTENT_W, h: 140,
          size: 96, weight: 700, letterSpacing: -.03 }),
      T({ role: 'body', text: 'One line on why this section matters.', x: MARGIN, y: 650, w: 1100, h: 70,
          size: 36, color: 'var(--muted)' }),
    ],
  },

  statement: {
    name: 'Statement', hint: 'One big idea',
    build: () => [
      T({ role: 'display', text: 'Software should feel\nlike it {read your mind}.',
          x: MARGIN, y: 330, w: CONTENT_W, h: 420, size: 108, weight: 700,
          lineHeight: 1.08, letterSpacing: -.03, valign: 'middle' }),
    ],
  },

  bullets: {
    name: 'Title + points', hint: 'Classic content slide',
    build: () => [
      T({ role: 'title', text: 'What we built', x: MARGIN, y: 150, w: CONTENT_W, h: 110,
          size: 76, weight: 700, letterSpacing: -.025 }),
      S({ shape: 'rect', x: MARGIN, y: 290, w: 90, h: 5, fill: 'accent', radius: 3 }),
      T({ role: 'body', text: '**Instant.** Sub-20ms end to end.\n\n**Private.** Nothing leaves the device.\n\n**Open.** One API, zero lock-in.',
          x: MARGIN, y: 370, w: 1200, h: 480, size: 44, lineHeight: 1.5 }),
    ],
  },

  twoCol: {
    name: 'Two column', hint: 'Compare or explain',
    build: () => [
      T({ role: 'title', text: 'Before and after', x: MARGIN, y: 140, w: CONTENT_W, h: 110,
          size: 72, weight: 700, letterSpacing: -.025 }),
      S({ shape: 'rect', x: MARGIN, y: 320, w: 780, h: 520, fill: 'surface', radius: 24 }),
      T({ role: 'kicker', text: 'BEFORE', x: MARGIN + 56, y: 372, w: 300, h: 50,
          size: 26, weight: 700, letterSpacing: .16, color: 'var(--muted)' }),
      T({ role: 'body', text: 'Six tools, four dashboards,\nand a spreadsheet holding\nit all together.',
          x: MARGIN + 56, y: 440, w: 660, h: 340, size: 38, lineHeight: 1.4 }),
      S({ shape: 'rect', x: 1000, y: 320, w: 780, h: 520, fill: 'surface', radius: 24 }),
      T({ role: 'kicker', text: 'AFTER', x: 1056, y: 372, w: 300, h: 50,
          size: 26, weight: 700, letterSpacing: .16, color: 'var(--accent)' }),
      T({ role: 'body', text: 'One surface.\nEverything in it\nalready knows the context.',
          x: 1056, y: 440, w: 660, h: 340, size: 38, lineHeight: 1.4 }),
    ],
  },

  stat: {
    name: 'Big number', hint: 'Land one metric',
    build: () => [
      // Display type wants tight leading; the default 1.25 would overflow
      // the box at this size and clip the descenders.
      T({ role: 'display', text: '94%', x: MARGIN, y: 316, w: 900, h: 262,
          size: 220, weight: 700, lineHeight: 1.02, letterSpacing: -.05, color: 'var(--accent)' }),
      T({ role: 'title', text: 'less time to first result', x: MARGIN, y: 580, w: 1100, h: 100,
          size: 64, weight: 600, letterSpacing: -.02 }),
      T({ role: 'caption', text: 'Measured across 1,240 production workloads, Q2 2026.',
          x: MARGIN, y: 700, w: 1100, h: 60, size: 28, color: 'var(--muted)' }),
    ],
  },

  threeUp: {
    name: 'Three up', hint: 'Pillars / features',
    build: () => {
      const cols = ['Fast', 'Private', 'Open'];
      const copy = [
        'Answers before you finish typing the question.',
        'Runs on device. Your data never ships.',
        'One API. Swap anything. Leave anytime.',
      ];
      const out = [
        T({ role: 'title', text: 'Three things matter', x: MARGIN, y: 150, w: CONTENT_W, h: 110,
            size: 72, weight: 700, letterSpacing: -.025 }),
      ];
      cols.forEach((c, i) => {
        const x = MARGIN + i * 560;
        out.push(S({ shape: 'rect', x, y: 380, w: 72, h: 6, fill: 'accent', radius: 3 }));
        out.push(T({ role: 'subtitle', text: c, x, y: 430, w: 480, h: 80,
                     size: 52, weight: 700, letterSpacing: -.02 }));
        out.push(T({ role: 'body', text: copy[i], x, y: 525, w: 480, h: 240,
                     size: 32, lineHeight: 1.45, color: 'var(--muted)' }));
      });
      return out;
    },
  },

  quote: {
    name: 'Quote', hint: 'Testimonial / pull quote',
    build: () => [
      T({ role: 'display', text: '"We replaced our entire stack\nin an afternoon."',
          x: MARGIN, y: 330, w: CONTENT_W, h: 300, size: 86, weight: 600,
          lineHeight: 1.18, letterSpacing: -.02, italic: true }),
      S({ shape: 'rect', x: MARGIN, y: 680, w: 90, h: 4, fill: 'accent', radius: 2 }),
      T({ role: 'caption', text: 'Head of Platform, a company you\'ve heard of',
          x: MARGIN, y: 720, w: 1100, h: 60, size: 32, color: 'var(--muted)' }),
    ],
  },

  chart: {
    name: 'Chart', hint: 'Data slide',
    build: () => [
      T({ role: 'title', text: 'Growth', x: MARGIN, y: 120, w: 1000, h: 100,
          size: 66, weight: 700, letterSpacing: -.025 }),
      T({ role: 'caption', text: 'Weekly active developers', x: MARGIN, y: 216, w: 900, h: 50,
          size: 30, color: 'var(--muted)' }),
      makeElement('chart', { x: MARGIN, y: 300, w: CONTENT_W, h: 620, kind: 'area' }),
    ],
  },

  code: {
    name: 'Code', hint: 'Show the API',
    build: () => [
      T({ role: 'title', text: 'The whole integration', x: MARGIN, y: 130, w: 1200, h: 100,
          size: 62, weight: 700, letterSpacing: -.025 }),
      S({ shape: 'rect', x: MARGIN, y: 280, w: CONTENT_W, h: 620, fill: 'surface', radius: 24 }),
      makeElement('code', { x: MARGIN + 60, y: 340, w: CONTENT_W - 120, h: 500, size: 34,
        code: 'import { apex } from "@apex/sdk";\n\nconst result = await apex.run({\n  input: "ship it",\n  mode: "realtime",\n});\n\nconsole.log(result.latencyMs); // 12' }),
    ],
  },

  imageFull: {
    name: 'Full bleed image', hint: 'Let the visual talk',
    build: () => [
      makeElement('image', { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fit: 'cover' }),
      S({ shape: 'rect', x: 0, y: 620, w: DESIGN_W, h: 460, fill: 'rgba(0,0,0,.55)', radius: 0 }),
      T({ role: 'title', text: 'A caption that earns the photo', x: MARGIN, y: 800, w: 1300, h: 120,
          size: 68, weight: 700, letterSpacing: -.025, color: '#fff' }),
    ],
  },

  closing: {
    name: 'Closing', hint: 'Thanks / CTA',
    build: () => [
      T({ role: 'display', text: 'Thank you', x: MARGIN, y: 400, w: CONTENT_W, h: 180,
          size: 130, weight: 700, letterSpacing: -.035 }),
      T({ role: 'subtitle', text: 'apex.dev  ·  @yourhandle', x: MARGIN, y: 600, w: CONTENT_W, h: 70,
          size: 40, color: 'var(--accent)' }),
    ],
  },

  /* ---------- Premium layouts ----------
     These lean on the depth/motion/colour systems rather than just placing
     text in boxes. Each sets its own background preset via `slide`. */

  glassHero: {
    name: 'Glass hero', hint: 'Liquid glass over living depth',
    slide: { bgPreset: 'nebula', bgMotion: 'orbit', bgSpeed: .7, bgGrain: true, transition: 'iris' },
    build: () => [
      // Liquid glass needs something behind it to refract — the drifting
      // blooms are exactly that, which is why this pairs them.
      S({ shape: 'squircle', exponent: 5, x: 150, y: 300, w: 1620, h: 500,
          material: 'liquid', anim: 'scale', emphasis: 'levitate', shadow: 'dramatic' }),
      T({ role: 'kicker', text: 'INTRODUCING', x: 230, y: 372, w: 1400, h: 50,
          size: 26, weight: 700, letterSpacing: .24, uppercase: true,
          color: 'var(--accent)', anim: 'fade' }),
      T({ role: 'display', text: 'Apex', x: 230, y: 430, w: 1400, h: 240,
          size: 190, weight: 800, lineHeight: 1, letterSpacing: -.045,
          finish: 'liquidglass', anim: 'blur', animSpeed: 'slow' }),
      T({ role: 'subtitle', text: 'The fastest way to ship intelligence.',
          x: 230, y: 672, w: 1200, h: 70, size: 36, color: 'var(--muted)', anim: 'rise' }),
      S({ shape: 'blob', seed: 4, sides: 7, x: 1480, y: 120, w: 300, h: 300,
          fill: 'accent2', anim: 'pop', emphasis: 'float', shadow: 'glow' }),
      S({ shape: 'star', sides: 6, innerRatio: .38, radius: 10, x: 90, y: 800,
          w: 150, h: 150, fill: 'accent', anim: 'roll', emphasis: 'spin' }),
      // The rule that becomes the persistent thread on every later slide.
      S({ shape: 'rect', x: 230, y: 770, w: 220, h: 6, fill: 'accent', radius: 3,
          shadow: 'glow', anim: 'wipe' }),
    ],
  },

  hero: {
    name: 'Hero', hint: 'Liquid opener', slide: { bgPreset: 'mesh', bgMotion: 'orbit', bgSpeed: .8, bgGrain: true },
    build: () => [
      T({ role: 'kicker', text: 'INTRODUCING', x: MARGIN, y: 330, w: CONTENT_W, h: 56,
          size: 28, weight: 700, letterSpacing: .22, uppercase: true,
          color: 'var(--accent)', anim: 'fade' }),
      T({ role: 'display', text: 'Apex', x: MARGIN, y: 396, w: CONTENT_W, h: 260,
          size: 210, weight: 800, lineHeight: 1.0, letterSpacing: -.045,
          finish: 'liquid', anim: 'blur' }),
      T({ role: 'subtitle', text: 'The fastest way to ship intelligence.',
          x: MARGIN, y: 672, w: 1200, h: 80, size: 42, color: 'var(--muted)', anim: 'rise' }),
      S({ shape: 'rect', x: MARGIN, y: 790, w: 220, h: 6, fill: 'accent', radius: 3,
          shadow: 'glow', anim: 'wipe' }),
    ],
  },

  product: {
    name: 'Product shot', hint: 'Browser mockup + copy', slide: { bgPreset: 'spotlight', bgMotion: 'breathe' },
    build: () => [
      T({ role: 'kicker', text: 'THE PRODUCT', x: MARGIN, y: 150, w: 700, h: 50,
          size: 24, weight: 700, letterSpacing: .2, uppercase: true, color: 'var(--accent)' }),
      T({ role: 'title', text: 'It just\nlooks like this', x: MARGIN, y: 214, w: 640, h: 260,
          size: 70, weight: 700, lineHeight: 1.1, letterSpacing: -.03 }),
      T({ role: 'body', text: 'One surface. Everything already\nknows the context.',
          x: MARGIN, y: 500, w: 600, h: 160, size: 32, lineHeight: 1.5, color: 'var(--muted)' }),
      makeElement('mockup', { x: 880, y: 190, w: 900, h: 620, kind: 'browser',
        shadow: 'dramatic', anim: 'scale', build: 1 }),
    ],
  },

  metrics: {
    name: 'Metric trio', hint: 'Three glass stat cards', slide: { bgPreset: 'nebula', bgMotion: 'drift' },
    build: () => {
      const stats = [['12ms', 'median latency'], ['99.99%', 'uptime'], ['0', 'config files']];
      const out = [
        T({ role: 'title', text: 'The numbers', x: MARGIN, y: 170, w: CONTENT_W, h: 110,
            size: 72, weight: 700, letterSpacing: -.028 }),
      ];
      stats.forEach(([big, small], i) => {
        const x = MARGIN + i * 560;
        out.push(S({ shape: 'rect', x, y: 380, w: 500, h: 380, material: 'glass', radius: 28,
                     anim: 'rise', build: i === 0 ? 0 : i }));
        out.push(T({ role: 'display', text: big, x: x + 48, y: 460, w: 404, h: 150,
                     size: 96, weight: 800, letterSpacing: -.04, finish: 'chrome',
                     anim: 'rise', build: i === 0 ? 0 : i }));
        out.push(T({ role: 'caption', text: small, x: x + 48, y: 620, w: 404, h: 60,
                     size: 28, color: 'var(--muted)', anim: 'rise', build: i === 0 ? 0 : i }));
      });
      return out;
    },
  },

  featureGrid: {
    name: 'Feature grid', hint: 'Six capabilities', slide: { bgPreset: 'grid', bgMotion: 'drift' },
    build: () => {
      const feats = [
        ['Realtime', 'Streams by default'], ['Private', 'Runs on device'],
        ['Typed', 'End to end safety'], ['Composable', 'Swap any piece'],
        ['Observable', 'Every call traced'], ['Cheap', 'Pennies per million'],
      ];
      const out = [
        T({ role: 'title', text: 'Everything included', x: MARGIN, y: 120, w: CONTENT_W, h: 100,
            size: 64, weight: 700, letterSpacing: -.026 }),
      ];
      feats.forEach(([t, d], i) => {
        const x = MARGIN + (i % 3) * 560, y = 300 + Math.floor(i / 3) * 320;
        out.push(S({ shape: 'rect', x, y, w: 500, h: 260, material: 'glass', radius: 22, anim: 'fade' }));
        out.push(S({ shape: 'rect', x: x + 40, y: y + 40, w: 44, h: 5, fill: 'accent', radius: 3 }));
        out.push(T({ role: 'subtitle', text: t, x: x + 40, y: y + 76, w: 420, h: 60,
                     size: 36, weight: 700, letterSpacing: -.02 }));
        out.push(T({ role: 'body', text: d, x: x + 40, y: y + 146, w: 420, h: 70,
                     size: 26, color: 'var(--muted)' }));
      });
      return out;
    },
  },

  phone: {
    name: 'Phone', hint: 'Mobile product shot', slide: { bgPreset: 'horizon', bgMotion: 'flow' },
    build: () => [
      makeElement('mockup', { kind: 'phone', x: 220, y: 150, w: 440, h: 880,
        shadow: 'dramatic', anim: 'rise' }),
      T({ role: 'title', text: 'In your pocket', x: 800, y: 380, w: 900, h: 140,
          size: 82, weight: 700, letterSpacing: -.03, finish: 'gloss' }),
      T({ role: 'body', text: 'The same engine, the same latency,\non the device you already carry.',
          x: 800, y: 540, w: 900, h: 180, size: 34, lineHeight: 1.5, color: 'var(--muted)', build: 1 }),
    ],
  },

  timeline: {
    name: 'Timeline', hint: 'Roadmap / milestones', slide: { bgPreset: 'dots', bgMotion: 'drift' },
    build: () => {
      const steps = [['Now', 'Private beta'], ['Q3', 'Public launch'],
                     ['Q4', 'Enterprise'], ['2027', 'Platform']];
      const out = [
        T({ role: 'title', text: 'Where this goes', x: MARGIN, y: 160, w: CONTENT_W, h: 110,
            size: 68, weight: 700, letterSpacing: -.027 }),
        S({ shape: 'rect', x: MARGIN, y: 596, w: CONTENT_W, h: 3, fill: 'line', radius: 2, anim: 'wipe' }),
      ];
      steps.forEach(([when, what], i) => {
        const x = MARGIN + i * (CONTENT_W / steps.length);
        out.push(S({ shape: 'ellipse', x: x - 11, y: 586, w: 24, h: 24,
                     fill: i === 0 ? 'accent' : 'muted', shadow: i === 0 ? 'glow' : 'none',
                     anim: 'scale', build: i }));
        out.push(T({ role: 'subtitle', text: when, x: x - 10, y: 470, w: 340, h: 70,
                     size: 40, weight: 700, color: i === 0 ? 'var(--accent)' : null,
                     anim: 'rise', build: i }));
        out.push(T({ role: 'body', text: what, x: x - 10, y: 650, w: 340, h: 80,
                     size: 28, color: 'var(--muted)', anim: 'rise', build: i }));
      });
      return out;
    },
  },

  bigQuote: {
    name: 'Spotlight quote', hint: 'Dramatic testimonial',
    slide: { bgPreset: 'spotlight', bgMotion: 'breathe', bgVignette: true, transition: 'zoom' },
    build: () => [
      T({ role: 'display', text: '"This replaced\nfour vendors."',
          x: MARGIN, y: 300, w: CONTENT_W, h: 400, size: 100, weight: 700,
          lineHeight: 1.12, letterSpacing: -.03, valign: 'middle', finish: 'shimmer', anim: 'blur' }),
      T({ role: 'caption', text: 'CTO · a company you have heard of',
          x: MARGIN, y: 760, w: 1100, h: 60, size: 30, color: 'var(--muted)', anim: 'fade', build: 1 }),
    ],
  },

  /* ---------- Connect layouts ----------
     An update-keynote kit rebuilt from the Connect broadcast. Black or white
     fields only: the colour on screen comes from the form and the icons.
     Type is medium weight at a large size — calm, never bold.

     Every slide uses the Flow transition, so the order things leave and
     arrive in is decided by what they are (see js/flow.js), not by how the
     slide was assembled. Each slide also says where the form should be;
     the form itself belongs to the talk and glides between poses. */

  cBrand: {
    name: 'Connect · Brand card', hint: 'White card, centred lockup',
    slide: { bg: '#ffffff', chrome: false, chromeTone: 'dark', transition: 'flow', form: { pose: 'off', scheme: 'pearl' } },
    build: () => [
      S({ shape: 'polygon', sides: 3, radius: 7, x: 764, y: 470, w: 118, h: 112, fill: '#3f7dff' }),
      T({ role: 'display', text: 'APEX', x: 896, y: 470, w: 400, h: 120,
          size: 100, weight: 500, valign: 'middle', letterSpacing: -.02, lineHeight: 1, color: '#0b1020' }),
    ],
  },

  cTitle: {
    name: 'Connect · Title', hint: 'Scattered words around the form',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'title', scheme: 'connect' } },
    build: () => [
      T({ role: 'display', text: 'APEX', x: 150, y: 150, w: 900, h: 200,
          size: 176, weight: 500, letterSpacing: -.025, lineHeight: 1 }),
      T({ role: 'display', text: 'Update', x: 1060, y: 410, w: 800, h: 200,
          size: 176, weight: 500, letterSpacing: -.025, lineHeight: 1 }),
      T({ role: 'display', text: '1.5.1', x: 150, y: 680, w: 700, h: 200,
          size: 176, weight: 500, letterSpacing: -.025, lineHeight: 1 }),
    ],
  },

  cAgenda: {
    name: 'Connect · Agenda', hint: 'What this update covers, numbered',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'corner', scheme: 'connect' } },
    build: () => {
      const rows = [['Chapter one', 'One line on what it is.'], ['Chapter two', 'One line on what it is.'],
                    ['Chapter three', 'One line on what it is.'], ['Chapter four', 'One line on what it is.']];
      const out = [T({ role: 'title', text: 'In this update', x: MARGIN, y: 140, w: 1200, h: 100,
                       size: 76, weight: 500, letterSpacing: -.025, lineHeight: 1.1 })];
      rows.forEach(([t, d], i) => {
        const y = 330 + i * 150;
        out.push(S({ shape: 'rect', x: MARGIN, y: y - 30, w: CONTENT_W, h: 2, radius: 1, fill: 'rgba(255,255,255,.1)' }));
        out.push(T({ role: 'caption', text: String(i + 1).padStart(2, '0'), x: MARGIN, y, w: 90, h: 70,
                     size: 30, weight: 500, valign: 'middle', color: 'var(--muted)' }));
        out.push(T({ role: 'subtitle', text: t, x: 260, y, w: 700, h: 70,
                     size: 50, weight: 500, valign: 'middle', letterSpacing: -.015 }));
        out.push(T({ role: 'body', text: d, x: 1000, y, w: 780, h: 70,
                     size: 30, valign: 'middle', color: 'var(--muted)' }));
      });
      return out;
    },
  },

  cSpeaker: {
    name: 'Connect · Speaker', hint: 'Huge name, form to the right',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'right', scheme: 'aqua' } },
    build: () => [
      T({ role: 'display', text: 'Your Name', x: 140, y: 390, w: 1200, h: 220,
          size: 190, weight: 500, letterSpacing: -.03, lineHeight: 1 }),
      T({ role: 'subtitle', text: 'Founder, APEX', x: 146, y: 630, w: 900, h: 70,
          size: 44, weight: 400, color: 'var(--muted)' }),
    ],
  },

  cStatement: {
    name: 'Connect · Statement', hint: 'One line, enormous, form below',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'low', scheme: 'connect' } },
    build: () => [
      T({ role: 'display', text: 'Everything happens\nin one place.', x: 140, y: 180, w: CONTENT_W, h: 400,
          size: 150, weight: 500, letterSpacing: -.03, lineHeight: 1.05 }),
    ],
  },

  cSection: {
    name: 'Connect · Chapter', hint: 'Form centre stage, chapter title',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'hero', scheme: 'dusk' } },
    build: () => [
      T({ role: 'caption', text: 'Chapter 01', x: 140, y: 790, w: 900, h: 50,
          size: 32, weight: 500, color: 'var(--muted)' }),
      T({ role: 'display', text: 'Chapter', x: 140, y: 836, w: 1400, h: 150,
          size: 120, weight: 500, letterSpacing: -.025, lineHeight: 1 }),
    ],
  },

  cFeature: {
    name: 'Connect · Feature card', hint: 'White card, icon + feature name',
    slide: { bg: '#f6f7fb', chromeTone: 'dark', transition: 'flow', form: { pose: 'off', scheme: 'pearl' } },
    build: () => [
      makeElement('icon', { glyph: 'spark', tone: 'accent', tile: 'none', weight: 1.6,
        x: 704, y: 486, w: 108, h: 108 }),
      T({ role: 'display', text: 'Feature', x: 840, y: 470, w: 900, h: 140,
          size: 104, weight: 500, valign: 'middle', letterSpacing: -.02, lineHeight: 1, color: '#0b1020' }),
    ],
  },

  cFeatureHero: {
    name: 'Connect · Feature + phone', hint: 'Headline, icon bullets, screenshot',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [
        T({ role: 'kicker', text: 'Feature area', x: MARGIN, y: 180, w: 800, h: 50,
            size: 30, weight: 500, color: 'var(--muted)' }),
        T({ role: 'title', text: 'A headline\nin two lines.', x: MARGIN, y: 236, w: 900, h: 210,
            size: 90, weight: 500, letterSpacing: -.03, lineHeight: 1.06 }),
        T({ role: 'body', text: 'One or two sentences on what changed and why it matters.',
            x: MARGIN, y: 478, w: 820, h: 100, size: 32, lineHeight: 1.45, color: 'var(--muted)' }),
      ];
      [['spark', 'First detail'], ['spark', 'Second detail'], ['spark', 'Third detail']].forEach(([g, t], i) => {
        const y = 640 + i * 96;
        out.push(makeElement('icon', { glyph: g, tile: 'dark', x: MARGIN, y, w: 64, h: 64 }));
        out.push(T({ role: 'body', text: t, x: MARGIN + 92, y, w: 760, h: 64, size: 31, valign: 'middle' }));
      });
      out.push(makeElement('mockup', { kind: 'phone', x: 1200, y: 100, w: 420, h: 880, shadow: 'rim' }));
      return out;
    },
  },

  cFeatureWide: {
    name: 'Connect · Wide screenshot', hint: 'Centred headline over a desktop window',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => [
      T({ role: 'title', text: 'A headline for the screenshot', x: 0, y: 110, w: DESIGN_W, h: 96,
          size: 72, weight: 500, align: 'center', letterSpacing: -.025, lineHeight: 1.1 }),
      T({ role: 'body', text: 'One sentence of context, centred under it.', x: 260, y: 212, w: 1400, h: 60,
          size: 32, align: 'center', color: 'var(--muted)' }),
      makeElement('mockup', { kind: 'window', x: 300, y: 330, w: 1320, h: 640, radius: 22, shadow: 'rim' }),
    ],
  },

  cTrio: {
    name: 'Connect · Three cards', hint: 'Icon, title and copy, three across',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [
        T({ role: 'title', text: 'Three things to know', x: MARGIN, y: 150, w: CONTENT_W, h: 96,
            size: 76, weight: 500, letterSpacing: -.025, lineHeight: 1.1 }),
        T({ role: 'body', text: 'A short line that frames all three.', x: MARGIN, y: 254, w: 1200, h: 56,
            size: 32, color: 'var(--muted)' }),
      ];
      ['First', 'Second', 'Third'].forEach((t, i) => {
        const x = MARGIN + i * 560, y = 380;
        out.push(S({ shape: 'rect', x, y, w: 520, h: 540, radius: 34, fill: '#0e0f13',
                     stroke: 'rgba(255,255,255,.08)', strokeWidth: 2 }));
        out.push(makeElement('icon', { glyph: 'spark', tile: 'dark', x: x + 48, y: y + 52, w: 96, h: 96 }));
        out.push(T({ role: 'subtitle', text: t, x: x + 48, y: y + 196, w: 424, h: 64,
                     size: 44, weight: 500, letterSpacing: -.015 }));
        out.push(T({ role: 'body', text: 'Two lines on what this does for students.', x: x + 48, y: y + 270, w: 424, h: 200,
                     size: 29, lineHeight: 1.5, color: 'var(--muted)' }));
      });
      return out;
    },
  },

  cGrid: {
    name: 'Connect · Six-up grid', hint: 'Icon tiles with short copy, 3 × 2',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [T({ role: 'title', text: 'And a lot more', x: MARGIN, y: 140, w: CONTENT_W, h: 96,
                       size: 76, weight: 500, letterSpacing: -.025, lineHeight: 1.1 })];
      for (let i = 0; i < 6; i++) {
        const x = MARGIN + (i % 3) * 560, y = 340 + Math.floor(i / 3) * 300;
        out.push(makeElement('icon', { glyph: 'spark', tile: 'dark', x, y, w: 84, h: 84 }));
        out.push(T({ role: 'subtitle', text: 'Item title', x, y: y + 112, w: 480, h: 56,
                     size: 38, weight: 500, letterSpacing: -.01 }));
        out.push(T({ role: 'body', text: 'One short line about it.', x, y: y + 172, w: 470, h: 90,
                     size: 27, lineHeight: 1.45, color: 'var(--muted)' }));
      }
      return out;
    },
  },

  cCompare: {
    name: 'Connect · Before / after', hint: 'Two screens side by side',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => [
      T({ role: 'title', text: 'Before and after', x: 0, y: 110, w: DESIGN_W, h: 96,
          size: 72, weight: 500, align: 'center', letterSpacing: -.025, lineHeight: 1.1 }),
      T({ role: 'caption', text: 'Before', x: 520, y: 236, w: 400, h: 50,
          size: 32, weight: 500, align: 'center', color: 'var(--muted)' }),
      T({ role: 'caption', text: 'After', x: 1000, y: 236, w: 400, h: 50,
          size: 32, weight: 500, align: 'center', color: '#ffffff' }),
      makeElement('mockup', { kind: 'phone', x: 560, y: 300, w: 320, h: 660, shadow: 'lifted', opacity: .78 }),
      makeElement('mockup', { kind: 'phone', x: 1040, y: 300, w: 320, h: 660, shadow: 'rim' }),
    ],
  },

  cProduct: {
    name: 'Connect · Product on black', hint: 'Rim-lit device, name beneath',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => [
      makeElement('mockup', { kind: 'phone', x: 760, y: 110, w: 400, h: 840,
        shadow: 'rim', emphasis: 'levitate' }),
      T({ role: 'title', text: 'Product', x: 140, y: 800, w: 520, h: 80,
          size: 64, weight: 500, letterSpacing: -.02 }),
      T({ role: 'body', text: 'One line on what it is.', x: 140, y: 884, w: 560, h: 60,
          size: 30, lineHeight: 1.4, color: 'var(--muted)' }),
    ],
  },

  cPhones: {
    name: 'Connect · App row', hint: 'Five screens, labelled',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const names = ['Feed', 'Lounges', 'Polls', 'Chat', 'Profile'];
      const out = [];
      names.forEach((n, i) => {
        const big = i === 2;
        const w = big ? 330 : 296, h = big ? 690 : 620;
        const x = 140 + i * 340 + (296 - w) / 2;
        const y = big ? 230 : 265;
        out.push(T({ role: 'caption', text: n, x: x - 20, y: y - 76, w: w + 40, h: 50,
          size: 30, weight: 500, align: 'center', color: 'var(--muted)' }));
        out.push(makeElement('mockup', { kind: 'phone', x, y, w, h, shadow: big ? 'rim' : 'lifted' }));
      });
      return out;
    },
  },

  cStat: {
    name: 'Connect · Big number', hint: 'Iridescent figure, form beside it',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'left', scheme: 'aqua' } },
    build: () => [
      T({ role: 'display', text: '00', x: 820, y: 310, w: 1000, h: 336,
          size: 280, weight: 500, lineHeight: 1, letterSpacing: -.03, finish: 'connect' }),
      T({ role: 'subtitle', text: 'what the number means', x: 830, y: 650, w: 960, h: 70,
          size: 46, weight: 400, color: 'var(--muted)' }),
    ],
  },

  cStats: {
    name: 'Connect · Three numbers', hint: 'Figures with labels, three across',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [T({ role: 'title', text: 'By the numbers', x: MARGIN, y: 150, w: CONTENT_W, h: 96,
                       size: 76, weight: 500, letterSpacing: -.025, lineHeight: 1.1 })];
      ['00', '00', '00'].forEach((n, i) => {
        const x = MARGIN + i * 560;
        out.push(S({ shape: 'rect', x, y: 420, w: 480, h: 2, radius: 1, fill: 'rgba(255,255,255,.14)' }));
        out.push(T({ role: 'display', text: n, x, y: 460, w: 500, h: 180, size: 160, weight: 500,
                     lineHeight: 1, letterSpacing: -.035, finish: 'connect' }));
        out.push(T({ role: 'body', text: 'label', x, y: 660, w: 480, h: 60, size: 32, color: 'var(--muted)' }));
      });
      return out;
    },
  },

  cQuote: {
    name: 'Connect · Quote', hint: 'A student in their own words',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'right', scheme: 'dusk' } },
    build: () => [
      T({ role: 'display', text: '“A quote from a student\nabout what changed\nfor them.”', x: MARGIN, y: 250, w: 1150, h: 420,
          size: 78, weight: 500, lineHeight: 1.16, letterSpacing: -.02 }),
      T({ role: 'subtitle', text: 'Student name', x: MARGIN, y: 730, w: 800, h: 56, size: 36, weight: 500 }),
      T({ role: 'caption', text: 'Grade, club or role', x: MARGIN, y: 784, w: 800, h: 50, size: 30, color: 'var(--muted)' }),
    ],
  },

  cFixes: {
    name: 'Connect · Fixes', hint: 'Bug fixes and polish, two columns',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => [
      makeElement('icon', { glyph: 'tool', tile: 'dark', x: MARGIN, y: 140, w: 88, h: 88 }),
      T({ role: 'title', text: 'Fixes and polish', x: MARGIN + 120, y: 140, w: 1200, h: 88,
          size: 72, weight: 500, valign: 'middle', letterSpacing: -.025, lineHeight: 1 }),
      T({ role: 'body', text: 'A fix, in one line.\nA fix, in one line.\nA fix, in one line.\nA fix, in one line.\nA fix, in one line.',
          x: MARGIN, y: 320, w: 780, h: 620, size: 30, lineHeight: 1.85, color: 'var(--muted)' }),
      T({ role: 'body', text: 'A fix, in one line.\nA fix, in one line.\nA fix, in one line.\nA fix, in one line.\nA fix, in one line.',
          x: 1000, y: 320, w: 780, h: 620, size: 30, lineHeight: 1.85, color: 'var(--muted)' }),
    ],
  },

  cRoadmap: {
    name: 'Connect · What’s next', hint: 'Now, next, later',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [T({ role: 'title', text: 'What’s next', x: MARGIN, y: 150, w: CONTENT_W, h: 96,
                       size: 76, weight: 500, letterSpacing: -.025, lineHeight: 1.1 })];
      ['Now', 'Next', 'Later'].forEach((label, i) => {
        const x = MARGIN + i * 560, y = 330;
        out.push(S({ shape: 'rect', x, y, w: 520, h: 600, radius: 34, fill: '#0e0f13',
                     stroke: 'rgba(255,255,255,.08)', strokeWidth: 2 }));
        out.push(T({ role: 'kicker', text: label, x: x + 48, y: y + 50, w: 424, h: 56,
                     size: 40, weight: 500, finish: 'connect' }));
        out.push(T({ role: 'body', text: 'An item\nAn item\nAn item', x: x + 48, y: y + 130, w: 424, h: 420,
                     size: 30, lineHeight: 1.8, color: 'var(--muted)' }));
      });
      return out;
    },
  },

  cLive: {
    name: 'Connect · Live demo', hint: 'Red pill, portrait feed',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'corner', scheme: 'connect' } },
    build: () => [
      S({ shape: 'rect', x: 72, y: 64, w: 214, h: 56, radius: 28, fill: '#e5243b' }),
      T({ role: 'kicker', text: '●  Live demo', x: 72, y: 64, w: 214, h: 56,
          size: 24, weight: 600, align: 'center', valign: 'middle', color: '#ffffff' }),
      makeElement('mockup', { kind: 'phone', x: 770, y: 110, w: 380, h: 820, shadow: 'rim' }),
    ],
  },

  cAvailable: {
    name: 'Connect · Available', hint: 'Where to get it, platform pills',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'off', scheme: 'connect' } },
    build: () => {
      const out = [
        T({ role: 'title', text: 'Available today', x: MARGIN, y: 300, w: 1000, h: 140,
            size: 120, weight: 500, letterSpacing: -.03, lineHeight: 1 }),
        T({ role: 'body', text: 'Update from your app store, or just refresh on the web.', x: MARGIN, y: 466, w: 900, h: 60,
            size: 34, color: 'var(--muted)' }),
      ];
      [['globe', 'Web'], ['phone', 'Android'], ['desktop', 'Windows'], ['desktop', 'macOS']].forEach(([g, label], i) => {
        const x = MARGIN + i * 246, y = 590;
        out.push(S({ shape: 'rect', x, y, w: 226, h: 72, radius: 36, fill: '#121419',
                     stroke: 'rgba(255,255,255,.1)', strokeWidth: 2 }));
        out.push(makeElement('icon', { glyph: g, tile: 'none', x: x + 26, y: y + 18, w: 36, h: 36 }));
        out.push(T({ role: 'body', text: label, x: x + 74, y, w: 140, h: 72, size: 28, weight: 500, valign: 'middle' }));
      });
      out.push(makeElement('mockup', { kind: 'phone', x: 1260, y: 120, w: 410, h: 860, rot: 6,
        shadow: 'rim', emphasis: 'float' }));
      return out;
    },
  },

  cThanks: {
    name: 'Connect · Thank you', hint: 'Closing, form behind',
    slide: { bg: '#000000', transition: 'flow', form: { pose: 'behind', scheme: 'connect' } },
    build: () => [
      T({ role: 'display', text: 'Thank you', x: 0, y: 420, w: DESIGN_W, h: 210,
          size: 170, weight: 500, align: 'center', valign: 'middle', lineHeight: 1, letterSpacing: -.03 }),
      T({ role: 'subtitle', text: 'Questions?', x: 0, y: 640, w: DESIGN_W, h: 60,
          size: 40, weight: 400, align: 'center', color: 'var(--muted)' }),
    ],
  },

  blank: { name: 'Blank', hint: 'Start from nothing', build: () => [] },
};

/* An APEX update keynote, in the Connect style, filled with the 1.5.1
   release so every layout shows real content. The running order is the
   reusable part: brand → title → agenda → thesis, then per chapter an
   opener and one to three feature slides, then numbers, fixes, a live demo,
   what's next, availability and thanks. For the next release, duplicate a
   chapter and replace the words. */
function connectDeck() {
  const d = makeDeck();
  d.title = 'APEX 1.5.1 Update';
  d.theme = 'connect';
  d.accent = null;
  d.chrome = { on: true, left: 'APEX', right: 'APEX Connect 2026' };

  // `form` overrides the layout's pose, so repeated layouts (the chapter
  // openers) still send the form somewhere new each time.
  const from = (key, notes, edit, form) => {
    const l = LAYOUTS[key];
    const s = makeSlide({ ...structuredClone(l.slide || {}), elements: l.build(), notes });
    if (edit) edit(s.elements, s);
    if (form) s.form = form;
    return s;
  };

  /* Fill a layout's text boxes in reading order, and its icons in order. */
  const fill = (texts, icons) => (els) => {
    const t = els.filter(e => e.type === 'text');
    (texts || []).forEach((v, i) => { if (v != null && t[i]) t[i].text = v; });
    const ic = els.filter(e => e.type === 'icon');
    (icons || []).forEach((g, i) => { if (ic[i]) ic[i].glyph = g; });
  };

  d.slides = [
    from('cBrand', 'Lights down. Hold on the white card, then walk out.'),
    from('cTitle', 'The form glides in from the brand card. Let it settle before you speak.'),
    from('cAgenda', 'Four chapters. Read the names, not the descriptions.', fill([null,
      '01', 'Messages', 'Rich text, hearts and Googly Eyes.',
      '02', 'Lounges', 'Now living inside Messages.',
      '03', 'Polls', 'Redesigned from the ground up.',
      '04', 'Posts & PDFs', 'Profile posts and a built-in viewer.'])),
    from('cStatement', 'The thesis of this update. Say it, then pause.'),

    from('cSection', 'Chapter one.', fill(['Chapter 01', 'Messages'])),
    from('cFeatureHero', 'Show the composer. Type something bold live if you can.', fill([
      'Messages', 'Rich text,\nas you type.',
      'DMs and Lounges now support real formatting — shown live, with no markers.',
      'Bold, italic, strikethrough, code and headings',
      'Lists nest with Tab, just like a document',
      'Pasting from Docs or Word keeps the style'], ['pen', 'file', 'palette'])),
    from('cTrio', 'Three small things people will love.', fill([
      'More ways to say it', 'Small touches that make chat feel alive.',
      'Double-tap to heart', 'Tap any message twice to send a heart. Touch screens.',
      'Googly Eyes', 'A chat theme whose eyes roll as you tilt and shake your phone.',
      'Live formatting', 'Markdown or shortcuts, rendered the moment you type.'], ['heart', 'smile', 'pen'])),

    from('cSection', 'Chapter two.', fill(['Chapter 02', 'Lounges']), { pose: 'right', scheme: 'aqua' }),
    from('cCompare', 'Left: the old separate page. Right: Lounges inside Messages.', fill([
      'Lounges moved home', 'Before — its own page', 'After — inside Messages'])),
    from('cFeatureWide', 'Drop a desktop screenshot of Messages with a lounge open.', fill([
      'Every lounge, one tap away',
      'Open a lounge from Home, Explore, a notification or a link. Each has its own address.'])),

    from('cSection', 'Chapter three.', fill(['Chapter 03', 'Polls']), { pose: 'low', scheme: 'connect' }),
    from('cFeature', 'Feature card. Name it, then go to the details.', fill(['Polls'], ['poll'])),
    from('cGrid', 'Do not read these out. Give the room ten seconds.', fill([
      'Polls, redesigned',
      'A cleaner card', 'How to answer, votes and deadline in one line.',
      'Many right answers', 'Quizzes can have more than one correct answer.',
      'New settings', 'Segmented choices, switches and toggles.',
      'Real deadlines', 'Pick the exact date and time a poll closes.',
      'Edit after sending', 'Fix a poll you have already sent.',
      'On the shelf', 'Lounge polls live on the Resources shelf.'],
      ['poll', 'check', 'tool', 'calendar', 'pen', 'file'])),

    from('cSection', 'Chapter four.', fill(['Chapter 04', 'Posts & PDFs']), { pose: 'right', scheme: 'dusk' }),
    from('cFeatureHero', 'Drop a screenshot of the New post composer.', fill([
      'Posts', 'Post straight\nto your profile.',
      'No circuit needed. **New post** now sits right next to Your posts.',
      'The composer starts with photos first',
      'PDFs open inside APEX, every page full width',
      'Pinch, or Ctrl + scroll, to zoom'], ['image', 'file', 'search'])),
    from('cPhones', 'The whole app at a glance. Fill each phone with a screenshot.'),

    from('cStats', 'Check these against the release before presenting.', fill([
      'This update', '6', 'new features', '11', 'fixes', '4', 'platforms'])),
    from('cFixes', 'Point at it, do not read it.', fill([
      'Fixes and polish',
      'Search is visible and faster on PCs\nLounge pictures and messages line up\nRepeated Korean characters are fixed\nSend shows when only attaching images\nThe mobile 100vh bug is gone',
      'Toasts sit in the bottom-right corner\nThe page-stitching bug is fixed\nAdmins can accept or deny flagged posts\nEditing a post no longer duplicates it\nMobile toasts are nudged into place'])),
    from('cLive', 'Switch to the live demo. Keep a screen recording in the phone as a backup.'),
    from('cRoadmap', 'Be specific about now, honest about later. Replace these.', fill([
      'What’s next', 'Now', 'APEX 1.5.1\nOut today\nOn every platform', 'Next', 'Your next feature\nAnother one\nAnother one', 'Later', 'A bigger idea\nAnother one\nAnother one'])),
    from('cAvailable', 'Tell them how to get it, today.'),
    from('cThanks', 'Thank the room. Take questions.'),
  ];
  return d;
}

/* A new user lands on the Connect deck. */
function starterDeck() { return connectDeck(); }

/* The original launch deck, kept so the older look is still one click away. */
function classicDeck() {
  const d = makeDeck();
  d.title = 'Apex — Launch Deck';
  d.theme = 'obsidian';
  d.accent = '#5b8cff';
  d.harmony = 'analogous';

  const from = (key, notes, extra = {}) => {
    const l = LAYOUTS[key];
    return makeSlide({ ...(l.slide || {}), ...extra, elements: l.build(), notes });
  };

  /* A persistent brand mark. The SAME morph tag on every slide means it is
     never rebuilt — it travels from the giant hero title into a small corner
     label and then stays put, which is what stops the deck reading as a
     sequence of unrelated slides. */
  const mark = (patch = {}) => T({
    role: 'kicker', text: 'Apex', link: 'brand',
    x: 140, y: 74, w: 300, h: 54, size: 30, weight: 700,
    letterSpacing: -.01, color: 'var(--accent)', anim: 'fade', ...patch,
  });

  /* A rule that stretches and slides between slides — a second continuous
     thread the eye can follow across a cut. */
  const rule = (patch = {}) => S({
    shape: 'rect', link: 'rule', fill: 'accent', radius: 3,
    x: 140, y: 140, w: 120, h: 4, anim: 'wipe', ...patch,
  });

  const slides = [
    from('glassHero', 'Pause. Let the title sit for two seconds before you speak.'),
    from('statement', 'This is the thesis of the whole talk.', { bgPreset: 'spotlight' }),
    from('product',   'Drop a real screenshot in. Do not narrate the UI — let them look.'),
    from('metrics',   'Three numbers, revealed one at a time. Stop talking after each.'),
    from('featureGrid', 'Do not read these aloud. Ten seconds of silence.'),
    from('bigQuote',  'Let this land. Count to three before the next slide.'),
    from('chart',     'Point at the inflection, not the axis.', { bgPreset: 'mesh' }),
    from('code',      'Read the first line aloud, then let them read the rest.'),
    from('timeline',  'Roadmap. Be specific about "now", vague about "2027".'),
    from('closing',   'Thank the room. Take questions.', { bgPreset: 'horizon', bgGrain: true }),
  ];

  /* Magic Move everywhere. With shared elements present on both sides of
     every cut, this is what makes the deck play as one continuous space
     rather than ten separate slides. */
  slides.forEach((s, i) => {
    s.transition = 'magic';
    if (i > 0) {
      s.elements.unshift(mark(), rule());
    }
  });

  /* The hero title carries the same tag as the corner mark, so slide 1 -> 2
     is the signature move: the display type shrinks and flies into place
     while the next slide's content arrives around it. */
  const heroTitle = slides[0].elements.find(e => e.type === 'text' && e.finish === 'liquidglass');
  if (heroTitle) heroTitle.link = 'brand';
  const heroRule = slides[0].elements.find(e => e.type === 'shape' && e.fill === 'accent' && e.h < 20);
  if (heroRule) heroRule.link = 'rule';

  d.slides = slides;
  return d;
}
