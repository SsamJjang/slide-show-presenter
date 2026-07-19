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

/* ---------------- Background layers ----------------
   Stacked beneath every element, built only from theme variables. */

.slide-bg, .slide-bg-overlay, .slide-grain, .slide-vignette {
  position: absolute; inset: 0; pointer-events: none;
}
.slide-grain {
  opacity: .05; mix-blend-mode: overlay;
  background-repeat: repeat; background-size: 180px 180px;
}
.slide-vignette {
  background: radial-gradient(120% 100% at 50% 50%, transparent 52%, rgba(0,0,0,.42) 100%);
}

/* ---------------- Elements ---------------- */

.el { position: absolute; }

.el { transition: opacity .42s cubic-bezier(.2,.8,.3,1),
                  transform .42s cubic-bezier(.2,.8,.3,1),
                  filter .42s cubic-bezier(.2,.8,.3,1); }

/* Held-back build steps. The resting state depends on the element's motion
   preset, so revealing it animates along the right axis. */
.el.build-hidden { opacity: 0; pointer-events: none; }
.el.build-hidden[data-anim="rise"]  { transform: translateY(26px); }
.el.build-hidden[data-anim="fade"]  { transform: none; }
.el.build-hidden[data-anim="blur"]  { filter: blur(14px); transform: scale(1.02); }
.el.build-hidden[data-anim="scale"] { transform: scale(.92); }
.el.build-hidden[data-anim="wipe"]  { clip-path: inset(0 100% 0 0); opacity: 1; }
.el[data-anim="wipe"] { clip-path: inset(0 0 0 0); transition: clip-path .55s cubic-bezier(.2,.8,.25,1), opacity .42s; }
.el.build-hidden[data-anim="none"]  { transition: none; }

/* ---------------- Entrance choreography ----------------
   When a slide appears, its elements arrive in sequence rather than all at
   once. The 55ms step is the difference between "animated" and "designed" —
   long enough to read as deliberate, short enough not to delay the speaker.
   Capped so a dense slide never runs a long tail. */
.slide-host.entering .el:not(.build-hidden) {
  animation: elIn .62s cubic-bezier(.22,.85,.26,1) both;
  animation-delay: calc(min(var(--i, 0), 9) * 55ms);
}
.slide-host.entering .el[data-anim="none"] { animation: none; }
.slide-host.entering .el[data-anim="fade"]  { animation-name: elInFade; }
.slide-host.entering .el[data-anim="blur"]  { animation-name: elInBlur; }
.slide-host.entering .el[data-anim="scale"] { animation-name: elInScale; }
.slide-host.entering .el[data-anim="wipe"]  { animation-name: elInWipe; }

@keyframes elIn      { from { opacity: 0; transform: translateY(26px); } }
@keyframes elInFade  { from { opacity: 0; } }
@keyframes elInBlur  { from { opacity: 0; filter: blur(14px); transform: scale(1.02); } }
@keyframes elInScale { from { opacity: 0; transform: scale(.92); } }
@keyframes elInWipe  { from { clip-path: inset(0 100% 0 0); } }

/* Never animate in a thumbnail or on a printed page. */
.thumb-frame .el, .print-mode .el { transition: none !important; animation: none !important; }

/* Thumbnails are ~150px wide: a 28px backdrop blur, a grain overlay and a
   conic gradient are all invisible at that size but each forces its own
   compositing layer. With ten thumbnails on screen that dominated render
   time badly enough to stall the whole page, so they're dropped here and
   approximated with a flat surface fill. */
.thumb-frame .e-shape.glass {
  backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  background: var(--surface); box-shadow: none;
}
.thumb-frame .slide-grain,
.thumb-frame .slide-vignette { display: none !important; }
.thumb-frame .el { filter: none !important; }   /* drop-shadows too */

@media (prefers-reduced-motion: reduce) {
  .slide-host.entering .el { animation: none !important; }
  .el { transition-duration: .01ms !important; }
}

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

/* Luminous display type. Falls back to solid --accent anywhere the clip
   isn't supported, rather than rendering invisible text. */
.e-text.grad {
  color: var(--accent);
  background: var(--accent-gradient, linear-gradient(115deg, var(--accent), var(--accent2)));
  -webkit-background-clip: text; background-clip: text;
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .e-text.grad { color: transparent; -webkit-text-fill-color: transparent; }
}

/* shapes */
.e-shape { width: 100%; height: 100%; display: block; }

/* Frosted panel. The inset highlight along the top edge is what sells it as
   glass rather than as a flat translucent rectangle. */
.e-shape.glass {
  background: var(--surface);
  border: 1px solid var(--line);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 20px 50px rgba(0,0,0,.28);
}

/* ---------------- Device mockups ---------------- */

.e-mockup {
  width: 100%; height: 100%; overflow: hidden;
  background: var(--bg-flat, #0b0b0f);
  border: 1px solid var(--line);
  box-shadow: 0 30px 70px rgba(0,0,0,.45);
  display: flex; flex-direction: column;
}
.mk-bar {
  flex: none; height: 46px; display: flex; align-items: center; gap: 10px;
  padding: 0 18px; background: var(--surface); border-bottom: 1px solid var(--line);
}
.mk-bar i { width: 13px; height: 13px; border-radius: 50%; background: var(--line); flex: none; }
.mk-url {
  flex: 1; margin-left: 14px; height: 26px; border-radius: 13px;
  background: var(--bg-flat, rgba(0,0,0,.3)); border: 1px solid var(--line);
  color: var(--muted); font-size: 15px; display: flex; align-items: center;
  padding: 0 14px; font-family: var(--font-body);
}
.mk-screen { flex: 1; position: relative; overflow: hidden; }
.mk-shot { width: 100%; height: 100%; object-fit: cover; display: block; }
.mk-shot.empty {
  display: grid; place-items: center; background: var(--surface); color: var(--muted);
}
.mk-shot.empty svg { width: 72px; height: 72px; opacity: .45; }

.mk-phone { border-radius: 54px; border-width: 12px; border-style: solid; border-color: #1a1a1f; position: relative; }
.mk-phone .mk-screen { border-radius: 42px; }
.mk-notch {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  width: 34%; height: 26px; border-radius: 0 0 18px 18px; background: #1a1a1f;
}

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
