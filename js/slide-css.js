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
  overflow: hidden;
}

/* Each bloom is its own element so it can move on its own clock. Animating
   transform/opacity only keeps all of this on the compositor — no repaint,
   no layout, nothing that can stutter a live talk. */
.bg-blob {
  position: absolute;
  left: var(--x); top: var(--y);
  width: var(--w); height: var(--h);
  transform: translate(-50%, -50%);
  animation-timing-function: cubic-bezier(.45,.05,.55,.95);
  animation-iteration-count: infinite;
  animation-direction: alternate;
  will-change: transform, opacity;
}
/* Every keyframe re-states the centring translate, since transform is a
   single property and the animation would otherwise drop it. */
.slide-bg[data-motion="none"] .bg-blob { animation: none; }

.slide-bg[data-motion="drift"] .bg-blob { animation-name: bgDrift; }
@keyframes bgDrift {
  0%   { transform: translate(-50%,-50%) translate(0,0)          scale(1);    opacity: .92; }
  50%  { transform: translate(-50%,-50%) translate(6%, -4%)      scale(1.12); opacity: 1; }
  100% { transform: translate(-50%,-50%) translate(-5%, 5%)      scale(.96);  opacity: .86; }
}

.slide-bg[data-motion="breathe"] .bg-blob { animation-name: bgBreathe; }
@keyframes bgBreathe {
  0%   { transform: translate(-50%,-50%) scale(.92); opacity: .78; }
  100% { transform: translate(-50%,-50%) scale(1.18); opacity: 1; }
}

.slide-bg[data-motion="flow"] .bg-blob { animation-name: bgFlow; }
@keyframes bgFlow {
  0%   { transform: translate(-50%,-50%) translate(-12%, 8%)  scale(1.04); }
  100% { transform: translate(-50%,-50%) translate(12%, -8%)  scale(1.14); }
}

/* Orbit is the most alive: a real circular path, so the blooms never
   retrace the same line. Direction is not alternated — it just keeps going. */
.slide-bg[data-motion="orbit"] .bg-blob {
  animation-name: bgOrbit;
  animation-direction: normal;
  animation-timing-function: linear;
}
@keyframes bgOrbit {
  0%   { transform: translate(-50%,-50%) rotate(0deg)   translateX(7%) rotate(0deg)    scale(1.06); }
  100% { transform: translate(-50%,-50%) rotate(360deg) translateX(7%) rotate(-360deg) scale(1.06); }
}

/* Patterned overlays get their own motion: grids and dots pan, rays rotate. */
.slide-bg-overlay[data-omotion="pan"] {
  animation: bgPan linear infinite;
}
@keyframes bgPan { to { background-position: 240px 160px, 240px 160px; } }

.slide-bg-overlay[data-omotion="spin"] {
  animation: bgSpin linear infinite;
  transform-origin: 50% 0%;
}
@keyframes bgSpin { to { transform: rotate(360deg); } }
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

/* Nothing in a thumbnail or a printed page may animate. Ten looping
   backgrounds in the rail would burn the GPU for pixels nobody can see,
   and a shimmer caught mid-pass would print as a white gash. */
.thumb-frame .bg-blob,
.thumb-frame .slide-bg-overlay,
.thumb-frame .e-text,
.print-mode .bg-blob,
.print-mode .slide-bg-overlay,
.print-mode .e-text { animation: none !important; }

/* Freeze the moving fills at a readable point rather than wherever the
   animation happened to stop. */
.thumb-frame .finish-liquid, .print-mode .finish-liquid  { background-position: 50% 50%; }
.thumb-frame .finish-shimmer, .print-mode .finish-shimmer { background-position: 150% 50%, 0 0; }

@media (prefers-reduced-motion: reduce) {
  .bg-blob, .slide-bg-overlay, .e-text { animation: none !important; }
  .finish-liquid { background-position: 50% 50%; }
  .finish-shimmer { background-position: 150% 50%, 0 0; }
}

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

/* ---------------- Text finishes ----------------

   Optional treatments for display type. These are deliberately NOT the
   default: a glossy headline against a plain body is a focal point, and
   a deck where everything shimmers is a deck where nothing does. Use one
   per slide, on the largest thing.

   All of them paint a background and clip it to the glyphs, so every one
   degrades to a solid readable colour if the clip is unsupported — the
   failure mode is never invisible text. */

.finish-gradient, .finish-gloss, .finish-chrome, .finish-liquid, .finish-shimmer {
  color: var(--accent);
  -webkit-background-clip: text; background-clip: text;
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .finish-gradient, .finish-gloss, .finish-chrome, .finish-liquid, .finish-shimmer {
    color: transparent; -webkit-text-fill-color: transparent;
  }
}

/* Flat two-colour accent sweep — the quiet one. */
.finish-gradient {
  background-image: var(--accent-gradient, linear-gradient(115deg, var(--accent), var(--accent2)));
}

/* Gloss: bright crown, saturated core, and a reflected lift at the baseline.
   The hard stop at 52% is the specular break that makes it read as a curved,
   lit surface rather than a soft fade. */
.finish-gloss {
  background-image: linear-gradient(180deg,
    #ffffff 0%,
    color-mix(in srgb, var(--accent) 55%, #fff) 30%,
    var(--accent) 51%,
    color-mix(in srgb, var(--accent2) 82%, #000) 52%,
    var(--accent2) 74%,
    color-mix(in srgb, var(--accent2) 60%, #fff) 100%);
  filter: drop-shadow(0 2px 1px rgba(0,0,0,.28));
}

/* Chrome: neutral metal, no hue. The tight light/dark inversion at the
   midline is the whole trick — that's the horizon reflecting in the bevel. */
.finish-chrome {
  background-image: linear-gradient(180deg,
    #fdfdfe 0%, #d4d9e0 26%, #9aa1ab 49%,
    #5f666f 50%, #aeb5bf 56%, #eef1f5 78%, #c3c9d2 100%);
  filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
}

/* Liquid: a wide, over-sized gradient slowly sliding under the glyphs, so
   the colour appears to pour through the letterforms. */
.finish-liquid {
  background-image: linear-gradient(100deg,
    var(--accent) 0%,
    color-mix(in srgb, var(--accent) 40%, #fff) 18%,
    var(--accent2) 38%,
    color-mix(in srgb, var(--accent2) 45%, #fff) 55%,
    var(--accent) 74%,
    color-mix(in srgb, var(--accent) 35%, #fff) 88%,
    var(--accent2) 100%);
  background-size: 320% 100%;
  animation: txLiquid 9s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 18px var(--glow));
}
@keyframes txLiquid {
  0%   { background-position:   0% 50%; }
  100% { background-position: 100% 50%; }
}

/* Shimmer: a single specular band crossing an otherwise solid fill, with a
   long pause between passes so it reads as a catch of light, not a loop. */
.finish-shimmer {
  background-image:
    linear-gradient(105deg, transparent 42%, rgba(255,255,255,.92) 50%, transparent 58%),
    var(--accent-gradient, linear-gradient(115deg, var(--accent), var(--accent2)));
  background-size: 280% 100%, 100% 100%;
  background-repeat: no-repeat;
  animation: txShimmer 5.5s cubic-bezier(.5,0,.5,1) infinite;
}
@keyframes txShimmer {
  0%, 62% { background-position: 150% 50%, 0 0; }
  100%    { background-position: -50% 50%, 0 0; }
}

/* Frost: etched into glass. Keeps a real (translucent) fill colour rather
   than clipping, so it stays legible over a busy background. */
.finish-frost {
  color: color-mix(in srgb, var(--ink) 72%, transparent);
  background: none;
  text-shadow:
    0 1px 0 color-mix(in srgb, #fff 45%, transparent),
    0 0 26px var(--glow),
    0 12px 30px rgba(0,0,0,.28);
}

/* Emboss: pressed into the surface. Costs nothing and reads well in print,
   where every animated finish flattens to a still frame anyway. */
.finish-emboss {
  color: var(--ink);
  background: none;
  text-shadow:
    0 1px 0 color-mix(in srgb, #fff 30%, transparent),
    0 -1px 0 rgba(0,0,0,.45);
}

/* Outline: weight without mass — good over photography. */
.finish-outline {
  color: transparent;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 2px var(--accent);
  background: none;
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
