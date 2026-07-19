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
  obsidian: {
    name: 'Obsidian', mood: 'Dark · high contrast · product launch',
    swatch: ['#0a0a0c', '#5b8cff', '#e8e9ed'],
    vars: {
      '--bg': 'radial-gradient(120% 120% at 15% 0%, #16171d 0%, #0a0a0c 60%)',
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
    swatch: ['#fbfaf8', '#1b1b1f', '#c8542a'],
    vars: {
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
    swatch: ['#0b1020', '#4cc9f0', '#f72585'],
    vars: {
      '--bg': 'linear-gradient(135deg,#0b1020 0%,#171b3a 45%,#2a1240 100%)',
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
    swatch: ['#f4f6f8', '#0f2a43', '#2f7dd1'],
    vars: {
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
    swatch: ['#101114', '#00e08f', '#e6e6e6'],
    vars: {
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
    swatch: ['#f6f1e8', '#2b2620', '#a8763e'],
    vars: {
      '--bg': 'linear-gradient(160deg,#f9f5ee 0%,#f1e9dc 100%)',
      '--ink': '#241f19', '--muted': '#6f6558',
      '--accent': '#a8763e', '--accent2': '#3f5c50',
      '--surface': 'rgba(36,31,25,.05)', '--line': 'rgba(36,31,25,.15)',
      '--font-display': "'Inter Tight', Georgia, serif",
      '--font-body': "'Inter', system-ui, sans-serif",
      '--font-mono': "ui-monospace, Menlo, monospace",
    },
  },
};

function applyTheme(root, key) {
  const t = THEMES[key] || THEMES.obsidian;
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
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
      T({ role: 'display', text: '94%', x: MARGIN, y: 320, w: 900, h: 250,
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

  blank: { name: 'Blank', hint: 'Start from nothing', build: () => [] },
};

/* A deck that already looks finished, so a new user never faces a void. */
function starterDeck() {
  const d = makeDeck();
  d.title = 'Apex — Launch Deck';
  d.theme = 'obsidian';
  d.slides = [
    makeSlide({ elements: LAYOUTS.title.build(),   notes: 'Pause. Let the title sit for two seconds before you speak.' }),
    makeSlide({ elements: LAYOUTS.statement.build(), transition: 'zoom', notes: 'This is the thesis of the whole talk.' }),
    makeSlide({ elements: LAYOUTS.threeUp.build(), notes: 'Three pillars. Ten seconds each — do not over-explain.' }),
    makeSlide({ elements: LAYOUTS.stat.build(),    transition: 'zoom', notes: 'Land the number. Then stop talking.' }),
    makeSlide({ elements: LAYOUTS.chart.build(),   notes: 'Point at the inflection, not the axis.' }),
    makeSlide({ elements: LAYOUTS.code.build(),    notes: 'Read the first line aloud, then let them read the rest.' }),
    makeSlide({ elements: LAYOUTS.closing.build(), notes: 'Thank the room. Take questions.' }),
  ];
  return d;
}
