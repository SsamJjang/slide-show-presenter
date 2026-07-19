/* ============================================================
   Slide surface styling — as a JS string, deliberately.

   This is the CSS that draws an actual slide, and it has to travel:
   the editor uses it, the presenter window uses it, and every
   exported HTML file embeds a copy so it plays with no other files
   beside it.

   It lives in JS rather than a .css file because the export path
   would otherwise have to fetch() it — and fetch() is blocked on
   file:// pages. Since opening index.html directly is a first-class
   way to run this app, a stylesheet the exporter can't read would
   silently produce completely unstyled decks. One source of truth,
   readable from anywhere, no build step.
   ============================================================ */

const SLIDE_CSS = `
.slide-host {
  position: relative;
  transform-origin: top left;
  flex: none;
}

.slide {
  position: relative;
  width: 1920px; height: 1080px;
  background: var(--bg, #0a0a0c);
  color: var(--ink, #f2f3f7);
  font-family: var(--font-body);
  overflow: hidden;
}

/* Named fills so elements can reference the palette symbolically.
   A shape saved as fill:"accent" restyles itself when the theme changes;
   a shape saved as "#5b8cff" stays literal. Both are supported on purpose. */
.slide {
  --fill-accent:  var(--accent);
  --fill-accent2: var(--accent2);
  --fill-ink:     var(--ink);
  --fill-muted:   var(--muted);
  --fill-surface: var(--surface);
  --fill-line:    var(--line);
}

/* ---------------- Elements ---------------- */

.el { position: absolute; }

.el.build-hidden { opacity: 0; transform: translateY(18px); pointer-events: none; }
.el { transition: opacity .42s cubic-bezier(.2,.8,.3,1), transform .42s cubic-bezier(.2,.8,.3,1); }
.thumb-frame .el, .print-mode .el { transition: none !important; }

/* text */
.e-text {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  white-space: pre-wrap; word-break: break-word;
}
.e-text .ac { color: var(--accent); }
.e-text b { font-weight: 700; }
.e-text code {
  font-family: var(--font-mono); font-size: .86em;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: .22em; padding: .04em .28em;
}
.role-display, .role-title, .role-subtitle, .role-kicker { font-family: var(--font-display); }
.role-caption { color: var(--muted); }

/* shapes */
.e-shape { width: 100%; height: 100%; display: block; }

/* image */
img.e-image { width: 100%; height: 100%; display: block; }
.e-image.empty {
  width: 100%; height: 100%;
  display: grid; place-items: center; text-align: center;
  background: var(--surface); border: 2px dashed var(--line);
  border-radius: 16px; color: var(--muted); font-size: 26px; line-height: 1.8;
}
.e-image.empty svg { width: 64px; height: 64px; opacity: .55; }

/* code */
.e-code {
  margin: 0; width: 100%; height: 100%; overflow: hidden;
  font-family: var(--font-mono); line-height: 1.62;
  color: var(--ink); tab-size: 2;
}
.e-code .c-ln  { display: inline-block; width: 2.4em; color: var(--muted); opacity: .5; user-select: none; }
.e-code .c-kw  { color: var(--accent2); font-weight: 600; }
.e-code .c-str { color: var(--accent); }
.e-code .c-com { color: var(--muted); font-style: italic; }
.e-code .c-num { color: var(--accent2); }

/* table */
.e-table {
  width: 100%; border-collapse: collapse; font-family: var(--font-body);
}
.e-table th, .e-table td {
  text-align: left; padding: .62em .8em;
  border-bottom: 1px solid var(--line);
}
.e-table th {
  font-weight: 700; font-size: .78em; letter-spacing: .1em;
  text-transform: uppercase; color: var(--muted);
}
.e-table tbody tr:last-child td { border-bottom: none; }

/* chart */
.e-chart { width: 100%; height: 100%; overflow: visible; font-family: var(--font-body); }
.ch-grid { stroke: var(--line); stroke-width: 1.5; }
.ch-axis { fill: var(--muted); font-size: 24px; }
.ch-val  { fill: var(--ink); font-size: 26px; font-weight: 700; }
.ch-line { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.ch-dot  { stroke: var(--bg); stroke-width: 4; }
.e-chart.error { display: grid; place-items: center; color: var(--muted); font-size: 28px; }

/* ---------------- Print / PDF ----------------
   Chrome's "Save as PDF" is the export path. One slide per page,
   landscape, no chrome, no page breaks inside a slide. */

@page { size: 1920px 1080px; margin: 0; }

@media print {
  body > *:not(.print-root) { display: none !important; }
  .print-root { display: block !important; }
  .print-page {
    width: 1920px; height: 1080px;
    page-break-after: always; break-after: page;
    overflow: hidden;
  }
  .print-page:last-child { page-break-after: auto; }
}
`;

/* Inject into a document (the app itself, or the presenter window). */
function injectSlideCSS(doc = document) {
  if (doc.getElementById('slide-css')) return;
  const style = doc.createElement('style');
  style.id = 'slide-css';
  style.textContent = SLIDE_CSS;
  doc.head.appendChild(style);
}
