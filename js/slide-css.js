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
  animation: elRise calc(.62s * var(--sp, 1)) cubic-bezier(.22,.85,.26,1) both;
  animation-delay: calc(min(var(--i, 0), 9) * 55ms * var(--sp, 1));
}
.slide-host.entering .el[data-anim="none"] { animation: none; }

/* --- the entrance catalogue --- */
.slide-host.entering .el[data-anim="fade"]     { animation-name: elFade; }
.slide-host.entering .el[data-anim="rise"]     { animation-name: elRise; }
.slide-host.entering .el[data-anim="fall"]     { animation-name: elFall; }
.slide-host.entering .el[data-anim="scale"]    { animation-name: elScale; }
.slide-host.entering .el[data-anim="slideL"]   { animation-name: elSlideL; }
.slide-host.entering .el[data-anim="slideR"]   { animation-name: elSlideR; }
.slide-host.entering .el[data-anim="slideU"]   { animation-name: elSlideU; }
.slide-host.entering .el[data-anim="slideD"]   { animation-name: elSlideD; }
.slide-host.entering .el[data-anim="glide"]    { animation-name: elGlide; animation-duration: calc(.9s * var(--sp,1)); }
.slide-host.entering .el[data-anim="wipe"]     { animation-name: elWipe; }
.slide-host.entering .el[data-anim="wipeL"]    { animation-name: elWipeL; }
.slide-host.entering .el[data-anim="wipeU"]    { animation-name: elWipeU; }
.slide-host.entering .el[data-anim="wipeD"]    { animation-name: elWipeD; }
.slide-host.entering .el[data-anim="iris"]     { animation-name: elIris; }
.slide-host.entering .el[data-anim="split"]    { animation-name: elSplit; }
.slide-host.entering .el[data-anim="flipX"]    { animation-name: elFlipX; }
.slide-host.entering .el[data-anim="flipY"]    { animation-name: elFlipY; }
.slide-host.entering .el[data-anim="unfold"]   { animation-name: elUnfold; }
.slide-host.entering .el[data-anim="rotate"]   { animation-name: elRotate; }
.slide-host.entering .el[data-anim="tilt"]     { animation-name: elTilt; }
.slide-host.entering .el[data-anim="skew"]     { animation-name: elSkew; }
.slide-host.entering .el[data-anim="pop"]      { animation-name: elPop;
  animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
.slide-host.entering .el[data-anim="spring"]   { animation-name: elSpring; animation-duration: calc(.8s * var(--sp,1));
  animation-timing-function: cubic-bezier(.22,1.4,.36,1); }
.slide-host.entering .el[data-anim="drop"]     { animation-name: elDrop; animation-duration: calc(.78s * var(--sp,1));
  animation-timing-function: cubic-bezier(.3,1.5,.5,1); }
.slide-host.entering .el[data-anim="elastic"]  { animation-name: elElastic; animation-duration: calc(1s * var(--sp,1)); }
.slide-host.entering .el[data-anim="blur"]     { animation-name: elBlur; }
.slide-host.entering .el[data-anim="zoomBlur"] { animation-name: elZoomBlur; }
.slide-host.entering .el[data-anim="swing"]    { animation-name: elSwing; animation-duration: calc(.85s * var(--sp,1)); }
.slide-host.entering .el[data-anim="roll"]     { animation-name: elRoll; animation-duration: calc(.8s * var(--sp,1)); }

/* Perspective for the dimensional entrances. Set on the element itself so
   each one flips about its own centre rather than a shared vanishing point. */
.el[data-anim="flipX"], .el[data-anim="flipY"],
.el[data-anim="unfold"], .el[data-anim="tilt"] { perspective: 1200px; }

@keyframes elFade     { from { opacity: 0; } }
@keyframes elRise     { from { opacity: 0; transform: translateY(26px); } }
@keyframes elFall     { from { opacity: 0; transform: translateY(-26px); } }
@keyframes elScale    { from { opacity: 0; transform: scale(.92); } }
@keyframes elSlideL   { from { opacity: 0; transform: translateX(-70px); } }
@keyframes elSlideR   { from { opacity: 0; transform: translateX(70px); } }
@keyframes elSlideU   { from { opacity: 0; transform: translateY(70px); } }
@keyframes elSlideD   { from { opacity: 0; transform: translateY(-70px); } }
@keyframes elGlide    { from { opacity: 0; transform: translateX(-140px) scale(.98); } }
@keyframes elWipe     { from { clip-path: inset(0 100% 0 0); } }
@keyframes elWipeL    { from { clip-path: inset(0 0 0 100%); } }
@keyframes elWipeU    { from { clip-path: inset(100% 0 0 0); } }
@keyframes elWipeD    { from { clip-path: inset(0 0 100% 0); } }
@keyframes elIris     { from { clip-path: circle(0% at 50% 50%); }
                        to   { clip-path: circle(75% at 50% 50%); } }
@keyframes elSplit    { from { clip-path: inset(50% 0 50% 0); } }
@keyframes elFlipX    { from { opacity: 0; transform: rotateX(-80deg); } }
@keyframes elFlipY    { from { opacity: 0; transform: rotateY(80deg); } }
@keyframes elUnfold   { from { opacity: 0; transform: rotateX(-90deg) translateY(-20px); } }
@keyframes elRotate   { from { opacity: 0; transform: rotate(-12deg) scale(.9); } }
@keyframes elTilt     { from { opacity: 0; transform: rotateY(28deg) rotateX(10deg) scale(.94); } }
@keyframes elSkew     { from { opacity: 0; transform: skewX(14deg) translateX(40px); } }
@keyframes elPop      { from { opacity: 0; transform: scale(.6); } }
@keyframes elSpring   { from { opacity: 0; transform: scale(.5) translateY(30px); } }
@keyframes elDrop     { from { opacity: 0; transform: translateY(-120px) scale(1.04); } }
@keyframes elBlur     { from { opacity: 0; filter: blur(14px); transform: scale(1.02); } }
@keyframes elZoomBlur { from { opacity: 0; filter: blur(20px); transform: scale(1.35); } }

/* Multi-stop ones need explicit intermediate frames to read as elastic
   or swinging rather than as a single eased move. */
@keyframes elElastic {
  0%   { opacity: 0; transform: scale(.4); }
  55%  { opacity: 1; transform: scale(1.12); }
  72%  { transform: scale(.95); }
  86%  { transform: scale(1.04); }
  100% { transform: scale(1); }
}
@keyframes elSwing {
  0%   { opacity: 0; transform: rotate(-14deg); transform-origin: top center; }
  60%  { opacity: 1; transform: rotate(7deg);   transform-origin: top center; }
  80%  { transform: rotate(-3deg); transform-origin: top center; }
  100% { transform: rotate(0);     transform-origin: top center; }
}
@keyframes elRoll {
  from { opacity: 0; transform: translateX(-90px) rotate(-120deg); }
  to   { opacity: 1; transform: translateX(0) rotate(0); }
}

/* ---------------- Emphasis (looping) ----------------
   Runs for as long as the slide is on screen, so amplitudes are small on
   purpose. These are ambient, not attention-grabbing — anything bigger
   competes with the person speaking. */

.el[data-emph]:not([data-emph="none"]) {
  animation: var(--emph-name) var(--emph-dur, 6s) ease-in-out infinite;
}
.el[data-emph="float"]    { --emph-name: emFloat;    --emph-dur: 6s; }
.el[data-emph="bob"]      { --emph-name: emBob;      --emph-dur: 3.4s; }
.el[data-emph="sway"]     { --emph-name: emSway;     --emph-dur: 7s; }
.el[data-emph="breathe"]  { --emph-name: emBreathe;  --emph-dur: 5s; }
.el[data-emph="pulse"]    { --emph-name: emPulse;    --emph-dur: 2.6s; }
.el[data-emph="glow"]     { --emph-name: emGlow;     --emph-dur: 3.2s; }
.el[data-emph="spin"]     { --emph-name: emSpin;     --emph-dur: 14s;
  animation-timing-function: linear; }
.el[data-emph="orbit"]    { --emph-name: emOrbit;    --emph-dur: 11s;
  animation-timing-function: linear; }
.el[data-emph="wobble"]   { --emph-name: emWobble;   --emph-dur: 4.5s; }
.el[data-emph="tick"]     { --emph-name: emTick;     --emph-dur: 5.5s; }
.el[data-emph="shine"]    { --emph-name: emShine;    --emph-dur: 4.5s; }
.el[data-emph="flicker"]  { --emph-name: emFlicker;  --emph-dur: 5s; }
.el[data-emph="levitate"] { --emph-name: emLevitate; --emph-dur: 8s; }

@keyframes emFloat    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes emBob      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes emSway     { 0%,100% { transform: translateX(-9px); } 50% { transform: translateX(9px); } }
@keyframes emBreathe  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes emPulse    { 0%,100% { opacity: 1; } 50% { opacity: .62; } }
@keyframes emGlow     { 0%,100% { filter: drop-shadow(0 0 10px var(--glow)); }
                        50%     { filter: drop-shadow(0 0 34px var(--glow)); } }
@keyframes emSpin     { to { transform: rotate(360deg); } }
@keyframes emOrbit    { from { transform: rotate(0) translateX(10px) rotate(0); }
                        to   { transform: rotate(360deg) translateX(10px) rotate(-360deg); } }
@keyframes emWobble   { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes emTick     { 0%,100% { transform: rotate(0); } 45% { transform: rotate(2.4deg); } }
@keyframes emShine    { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.22); } }
@keyframes emFlicker  { 0%,100% { opacity: 1; } 46% { opacity: 1; } 50% { opacity: .78; } 54% { opacity: 1; } }
@keyframes emLevitate {
  0%,100% { transform: translateY(0) rotate(-.8deg); }
  50%     { transform: translateY(-18px) rotate(.8deg); }
}

/* Never animate in a thumbnail or on a printed page. */
.thumb-frame .el, .print-mode .el { transition: none !important; animation: none !important; }

/* Thumbnails are ~150px wide: a 28px backdrop blur, a grain overlay and a
   conic gradient are all invisible at that size but each forces its own
   compositing layer. With ten thumbnails on screen that dominated render
   time badly enough to stall the whole page, so they're dropped here and
   approximated with a flat surface fill. */
.thumb-frame .e-shape.glass, .thumb-frame .e-liquid {
  backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  background: var(--surface); box-shadow: none;
}
/* Emphasis loops must not run in the rail either. */
.thumb-frame .el[data-emph], .print-mode .el[data-emph] { animation: none !important; }
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
.thumb-frame .finish-liquidglass, .print-mode .finish-liquidglass { background-position: 40% 50%, 0 0; }
.thumb-frame .e-liquid::after, .print-mode .e-liquid::after { animation: none !important; opacity: .5; }

@media (prefers-reduced-motion: reduce) {
  .bg-blob, .slide-bg-overlay, .e-text { animation: none !important; }
  .finish-liquid { background-position: 50% 50%; }
  .finish-shimmer { background-position: 150% 50%, 0 0; }
  .finish-liquidglass { background-position: 40% 50%, 0 0; }
  .e-liquid::after { animation: none !important; }
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

.finish-gradient, .finish-gloss, .finish-chrome, .finish-liquid,
.finish-shimmer, .finish-liquidglass {
  color: var(--accent);
  -webkit-background-clip: text; background-clip: text;
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .finish-gradient, .finish-gloss, .finish-chrome, .finish-liquid,
  .finish-shimmer, .finish-liquidglass {
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

/* ---------------- Liquid glass ----------------

   Apple's material is not just "blurry and translucent". Four things do
   the work, and it looks wrong if any is missing:

     1. heavy backdrop blur with saturation PUSHED UP, so colour bleeds
        through the panel instead of going grey
     2. a bright rim on the top/left and a dark rim on the bottom/right —
        this is refraction at the edge, and it's what gives thickness
     3. a broad specular sheen across the surface, slowly travelling
     4. a soft contact shadow so the panel sits above the slide

   Built with layered gradients and inset shadows rather than an SVG
   displacement filter: real refraction would need a per-frame filter
   pass over the backdrop, which is far too expensive to run behind a
   live talk on unknown hardware. */

.e-liquid {
  position: relative;
  width: 100%; height: 100%;
  overflow: hidden;
  background:
    linear-gradient(135deg,
      rgba(255,255,255,.22) 0%,
      rgba(255,255,255,.06) 32%,
      rgba(255,255,255,.02) 55%,
      rgba(255,255,255,.10) 100%),
    var(--accent-soft);
  backdrop-filter: blur(34px) saturate(210%) brightness(1.08);
  -webkit-backdrop-filter: blur(34px) saturate(210%) brightness(1.08);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.55),
    inset 1.5px 0 0 rgba(255,255,255,.28),
    inset 0 -1.5px 0 rgba(0,0,0,.28),
    inset -1.5px 0 0 rgba(0,0,0,.16),
    inset 0 0 40px rgba(255,255,255,.10),
    0 22px 60px rgba(0,0,0,.34);
}

/* The travelling sheen. A wide, very soft band — a hard edge would read
   as a scanline rather than as light moving across a curved surface. */
.e-liquid::after {
  content: '';
  position: absolute; inset: -40%;
  background: linear-gradient(100deg,
    transparent 34%,
    rgba(255,255,255,.30) 47%,
    rgba(255,255,255,.44) 50%,
    rgba(255,255,255,.30) 53%,
    transparent 66%);
  animation: lgSheen 7s ease-in-out infinite;
  pointer-events: none;
}
@keyframes lgSheen {
  0%, 12%  { transform: translateX(-70%) rotate(8deg); opacity: 0; }
  30%      { opacity: 1; }
  70%      { opacity: 1; }
  100%     { transform: translateX(70%) rotate(8deg); opacity: 0; }
}

/* Clipped variant: when the shape isn't a rectangle the panel is masked to
   the generated path, so liquid glass works on a star or a blob too. */
.e-liquid.clipped { border-radius: 0; }

/* --- Liquid glass TEXT ---

   backdrop-filter can't be clipped to glyphs, so the blur trick isn't
   available here. Instead the glass is *painted*: a near-transparent body
   with a bright refractive crown, a travelling highlight, and a dark
   underside — plus a stroke standing in for the edge thickness, and a
   drop-shadow doing the contact shadow. */
.finish-liquidglass {
  color: transparent;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: .012em rgba(255,255,255,.42);
  background-image:
    linear-gradient(100deg,
      transparent 30%,
      rgba(255,255,255,.85) 47%,
      rgba(255,255,255,.95) 50%,
      rgba(255,255,255,.85) 53%,
      transparent 70%),
    linear-gradient(180deg,
      rgba(255,255,255,.92) 0%,
      rgba(255,255,255,.34) 26%,
      color-mix(in srgb, var(--accent) 40%, transparent) 52%,
      color-mix(in srgb, var(--accent2) 46%, transparent) 74%,
      rgba(255,255,255,.55) 100%);
  background-size: 260% 100%, 100% 100%;
  background-repeat: no-repeat;
  -webkit-background-clip: text; background-clip: text;
  animation: txLiquidGlass 6.5s ease-in-out infinite;
  filter:
    drop-shadow(0 1px 0 rgba(255,255,255,.35))
    drop-shadow(0 10px 22px rgba(0,0,0,.35))
    drop-shadow(0 0 26px var(--glow));
}
@keyframes txLiquidGlass {
  0%, 8%   { background-position: 150% 50%, 0 0; }
  100%     { background-position: -50% 50%, 0 0; }
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
