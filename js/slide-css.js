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

/* Patterned overlays: grids and dots pan, rays rotate.

   The pattern lives on an inner layer and moves by TRANSFORM. Panning
   'background-position' instead repaints a full-bleed tiled gradient on
   every single frame, which is the one thing this whole system exists to
   avoid — and it also assumed a fixed number of background layers, so it
   was silently wrong on any preset that didn't happen to have two.

   The pan distance is exactly one tile (declared per preset as --pan-x/y),
   so the loop is seamless without alternating direction. */
.slide-bg-overlay { overflow: hidden; }
.bg-pattern {
  position: absolute; inset: -12%;
  background-repeat: repeat;
  will-change: transform;
}
.bg-pattern[data-omotion="pan"] { animation: bgPan linear infinite; }
@keyframes bgPan { to { transform: translate(var(--pan-x, 80px), var(--pan-y, 80px)); } }

/* Rays sweep a full circle about the slide's top-centre, so the layer has to
   be big enough that no corner can swing into view: the farthest point of a
   16:9 slide from its top-centre is ~1.34x its height away. */
.bg-pattern[data-omotion="spin"] {
  inset: auto; left: 50%; top: 0;
  width: 300%; height: 300%; margin-left: -150%;
  transform-origin: 50% 0;
  animation: bgSpin linear infinite;
}
@keyframes bgSpin { to { transform: rotate(360deg); } }
/* The tile is neutral grey noise with a standard deviation of ~17/255, so
   at this opacity it dithers by a little over one 8-bit level — enough to
   dissolve the step edges in a large gradient, well under the threshold
   where anyone would describe the slide as textured. Overlay is the right
   blend because mid-grey is its identity: the layer shifts luminance
   locally without lifting or dropping the overall exposure. */
.slide-grain {
  opacity: .08; mix-blend-mode: overlay;
  background-repeat: repeat; background-size: 200px 200px;
}
/* Eased alpha, in steps. A vignette is a wide, low-contrast ramp over the
   full width of the projector, which is precisely the case 8-bit sRGB
   cannot represent smoothly: two stops give you concentric rings. These
   follow a curve rather than a straight line, so the darkening starts
   imperceptibly instead of switching on at a radius you can point to. */
.slide-vignette {
  background: radial-gradient(126% 104% at 50% 50%,
    rgba(0,0,0,0)    46%,
    rgba(0,0,0,.02)  58%,
    rgba(0,0,0,.055) 68%,
    rgba(0,0,0,.11)  77%,
    rgba(0,0,0,.19)  85%,
    rgba(0,0,0,.29)  93%,
    rgba(0,0,0,.40) 100%);
}

/* ---------------- Elements ----------------

   Three nested nodes, and the nesting is the whole point.

   '.el'      geometry: position, size, opacity, the element's own rotation,
              and its drop shadow. NOTHING animates here except Magic Move,
              which is the one effect that legitimately moves the box itself.
   '.el-anim' the entrance. Runs once.
   '.el-emph' the emphasis loop. Runs forever.

   They used to be one node, and that quietly broke four things, because a
   running CSS animation outranks an inline style and there is only one
   'transform' and one 'filter' to go round:

     · an emphasis loop and an entrance both set 'animation', so an element
       with both played its ENTRANCE on the emphasis timing — forever. A
       title set to fade in and then float gently instead re-faded in, on a
       loop, for the length of the talk.
     · any rotated element snapped upright the moment either one started,
       because the keyframes' transform replaced the inline 'rotate()'.
     · any element with a drop shadow lost it the moment a filter-based
       entrance or a glow loop ran.
     · the outgoing fade in a transition did the same to both.

   Splitting them means each layer owns one property outright and the three
   compose by nesting instead of by fighting. It also makes the catalogue
   honest: entrance, emphasis and transition really are independent now. */

.el { position: absolute; }
.el-anim, .el-emph { width: 100%; height: 100%; }

.el-anim { transition: opacity .42s cubic-bezier(.2,.8,.3,1),
                       transform .42s cubic-bezier(.2,.8,.3,1),
                       filter .42s cubic-bezier(.2,.8,.3,1); }

/* Held-back build steps. The resting state depends on the element's motion
   preset, so revealing it animates along the right axis. */
.el.build-hidden { pointer-events: none; }
.el.build-hidden > .el-anim { opacity: 0; }
.el.build-hidden[data-anim="rise"]  > .el-anim { transform: translateY(26px); }
.el.build-hidden[data-anim="fall"]  > .el-anim { transform: translateY(-26px); }
.el.build-hidden[data-anim="fade"]  > .el-anim { transform: none; }
.el.build-hidden[data-anim="blur"]  > .el-anim { filter: blur(14px); transform: scale(1.02); }
.el.build-hidden[data-anim="scale"] > .el-anim { transform: scale(.92); }
.el.build-hidden[data-anim="pop"]   > .el-anim { transform: scale(.9); }
.el.build-hidden[data-anim="wipe"]  > .el-anim { clip-path: inset(0 100% 0 0); opacity: 1; }
.el[data-anim="wipe"] > .el-anim {
  clip-path: inset(0 0 0 0);
  transition: clip-path .55s cubic-bezier(.2,.8,.25,1), opacity .42s;
}
.el.build-hidden[data-anim="none"] > .el-anim { transition: none; }

/* ---------------- Entrance choreography ----------------
   When a slide appears, its elements arrive in sequence rather than all at
   once. The 55ms step is the difference between "animated" and "designed" —
   long enough to read as deliberate, short enough not to delay the speaker.
   Capped so a dense slide never runs a long tail. */
.entering .el:not(.build-hidden) > .el-anim {
  animation: elRise calc(.62s * var(--sp, 1)) cubic-bezier(.22,.85,.26,1) both;
  animation-delay: calc(min(var(--i, 0), 9) * 55ms * var(--sp, 1));
}
.entering .el[data-anim="none"] > .el-anim { animation: none; }

/* --- the entrance catalogue --- */
.entering .el[data-anim="fade"] > .el-anim     { animation-name: elFade; }
.entering .el[data-anim="rise"] > .el-anim     { animation-name: elRise; }
.entering .el[data-anim="fall"] > .el-anim     { animation-name: elFall; }
.entering .el[data-anim="scale"] > .el-anim    { animation-name: elScale; }
.entering .el[data-anim="slideL"] > .el-anim   { animation-name: elSlideL; }
.entering .el[data-anim="slideR"] > .el-anim   { animation-name: elSlideR; }
.entering .el[data-anim="slideU"] > .el-anim   { animation-name: elSlideU; }
.entering .el[data-anim="slideD"] > .el-anim   { animation-name: elSlideD; }
.entering .el[data-anim="glide"] > .el-anim    { animation-name: elGlide; animation-duration: calc(.9s * var(--sp,1)); }
.entering .el[data-anim="wipe"] > .el-anim     { animation-name: elWipe; }
.entering .el[data-anim="wipeL"] > .el-anim    { animation-name: elWipeL; }
.entering .el[data-anim="wipeU"] > .el-anim    { animation-name: elWipeU; }
.entering .el[data-anim="wipeD"] > .el-anim    { animation-name: elWipeD; }
.entering .el[data-anim="iris"] > .el-anim     { animation-name: elIris; }
.entering .el[data-anim="split"] > .el-anim    { animation-name: elSplit; }
.entering .el[data-anim="flipX"] > .el-anim    { animation-name: elFlipX; }
.entering .el[data-anim="flipY"] > .el-anim    { animation-name: elFlipY; }
.entering .el[data-anim="unfold"] > .el-anim   { animation-name: elUnfold; }
.entering .el[data-anim="rotate"] > .el-anim   { animation-name: elRotate; }
.entering .el[data-anim="tilt"] > .el-anim     { animation-name: elTilt; }
.entering .el[data-anim="skew"] > .el-anim     { animation-name: elSkew; }
.entering .el[data-anim="pop"] > .el-anim      { animation-name: elPop;
  animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
.entering .el[data-anim="spring"] > .el-anim   { animation-name: elSpring; animation-duration: calc(.8s * var(--sp,1));
  animation-timing-function: cubic-bezier(.22,1.4,.36,1); }
.entering .el[data-anim="drop"] > .el-anim     { animation-name: elDrop; animation-duration: calc(.78s * var(--sp,1));
  animation-timing-function: cubic-bezier(.3,1.5,.5,1); }
.entering .el[data-anim="elastic"] > .el-anim  { animation-name: elElastic; animation-duration: calc(1s * var(--sp,1)); }
.entering .el[data-anim="blur"] > .el-anim     { animation-name: elBlur; }
.entering .el[data-anim="zoomBlur"] > .el-anim { animation-name: elZoomBlur; }
.entering .el[data-anim="swing"] > .el-anim    { animation-name: elSwing; animation-duration: calc(.85s * var(--sp,1)); }
.entering .el[data-anim="roll"] > .el-anim     { animation-name: elRoll; animation-duration: calc(.8s * var(--sp,1)); }

/* Perspective for the dimensional entrances. It has to sit on the PARENT of
   the node being transformed, so it lives on .el — which also means each
   element flips about its own centre rather than a shared vanishing point. */
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

.el[data-emph]:not([data-emph="none"]) > .el-anim > .el-emph {
  /* Timing goes through a variable rather than being overridden per preset:
     this shorthand is the more specific rule, so a bare
     'animation-timing-function' on a preset would lose to the 'ease-in-out'
     baked in here — which is why spin and orbit used to ease in and out of
     every revolution instead of turning steadily. */
  animation: var(--emph-name) var(--emph-dur, 6s) var(--emph-ease, ease-in-out) infinite;
}
.el[data-emph="float"] .el-emph    { --emph-name: emFloat;    --emph-dur: 6s; }
.el[data-emph="bob"] .el-emph      { --emph-name: emBob;      --emph-dur: 3.4s; }
.el[data-emph="sway"] .el-emph     { --emph-name: emSway;     --emph-dur: 7s; }
.el[data-emph="breathe"] .el-emph  { --emph-name: emBreathe;  --emph-dur: 5s; }
.el[data-emph="pulse"] .el-emph    { --emph-name: emPulse;    --emph-dur: 2.6s; }
.el[data-emph="glow"] .el-emph     { --emph-name: emGlow;     --emph-dur: 3.2s; }
.el[data-emph="spin"] .el-emph     { --emph-name: emSpin;     --emph-dur: 14s; --emph-ease: linear; }
.el[data-emph="orbit"] .el-emph    { --emph-name: emOrbit;    --emph-dur: 11s; --emph-ease: linear; }
.el[data-emph="wobble"] .el-emph   { --emph-name: emWobble;   --emph-dur: 4.5s; }
.el[data-emph="tick"] .el-emph     { --emph-name: emTick;     --emph-dur: 5.5s; }
.el[data-emph="shine"] .el-emph    { --emph-name: emShine;    --emph-dur: 4.5s; }
.el[data-emph="flicker"] .el-emph  { --emph-name: emFlicker;  --emph-dur: 5s; }
.el[data-emph="levitate"] .el-emph { --emph-name: emLevitate; --emph-dur: 8s; }

@keyframes emFloat    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes emBob      { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes emSway     { 0%,100% { transform: translateX(-9px); } 50% { transform: translateX(9px); } }
@keyframes emBreathe  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes emPulse    { 0%,100% { opacity: 1; } 50% { opacity: .72; } }
@keyframes emGlow     { 0%,100% { filter: drop-shadow(0 0 9px var(--glow)); }
                        50%     { filter: drop-shadow(0 0 24px var(--glow)); } }
@keyframes emSpin     { to { transform: rotate(360deg); } }
@keyframes emOrbit    { from { transform: rotate(0) translateX(10px) rotate(0); }
                        to   { transform: rotate(360deg) translateX(10px) rotate(-360deg); } }
@keyframes emWobble   { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes emTick     { 0%,100% { transform: rotate(0); } 45% { transform: rotate(2.4deg); } }
@keyframes emShine    { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.09); } }
@keyframes emFlicker  { 0%,100% { opacity: 1; } 46% { opacity: 1; } 50% { opacity: .86; } 54% { opacity: 1; } }
@keyframes emLevitate {
  0%,100% { transform: translateY(0) rotate(-.8deg); }
  50%     { transform: translateY(-18px) rotate(.8deg); }
}

/* Never animate in a thumbnail or on a printed page. The descendant sweep
   covers the motion layers and the animated text finishes in one rule —
   they're all inside .el, and none of them should move here. */
.thumb-frame .el, .thumb-frame .el *,
.print-mode .el, .print-mode .el * {
  transition: none !important; animation: none !important;
}

/* Thumbnails are ~150px wide: a 28px backdrop blur, a grain overlay and a
   conic gradient are all invisible at that size but each forces its own
   compositing layer. With ten thumbnails on screen that dominated render
   time badly enough to stall the whole page, so they're dropped here and
   approximated with a flat surface fill. */
.thumb-frame .e-shape.glass, .thumb-frame .e-liquid {
  backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  background: var(--surface); box-shadow: none;
}
.thumb-frame .slide-grain,
.thumb-frame .slide-vignette { display: none !important; }
/* drop-shadows too — a 150px thumbnail renders a dozen filter passes it is
   physically too small to show. */
.thumb-frame .el, .thumb-frame .el * { filter: none !important; }

/* Nothing in a thumbnail or a printed page may animate. Ten looping
   backgrounds in the rail would burn the GPU for pixels nobody can see,
   and a shimmer caught mid-pass would print as a white gash. */
.thumb-frame .bg-blob,
.thumb-frame .bg-pattern,
.print-mode .bg-blob,
.print-mode .bg-pattern { animation: none !important; }

/* Freeze the moving fills at a readable point rather than wherever the
   animation happened to stop. */
.thumb-frame .finish-liquid, .print-mode .finish-liquid  { background-position: 50% 50%; }
.thumb-frame .finish-shimmer, .print-mode .finish-shimmer { background-position: 150% 50%, 0 0; }
.thumb-frame .finish-liquidglass, .print-mode .finish-liquidglass { background-position: 40% 50%, 0 0; }
.thumb-frame .e-liquid::after, .print-mode .e-liquid::after { animation: none !important; opacity: .5; }

@media (prefers-reduced-motion: reduce) {
  .bg-blob, .bg-pattern, .e-text, .el-emph { animation: none !important; }
  .finish-liquid { background-position: 50% 50%; }
  .finish-shimmer { background-position: 150% 50%, 0 0; }
  .finish-liquidglass { background-position: 40% 50%, 0 0; }
  .e-liquid::after { animation: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  .entering .el > .el-anim { animation: none !important; }
  .el-anim { transition-duration: .01ms !important; }
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
    color-mix(in srgb, var(--accent) 14%, #fff) 0%,
    color-mix(in srgb, var(--accent) 40%, #fff) 22%,
    color-mix(in srgb, var(--accent) 78%, #fff) 42%,
    var(--accent) 51%,
    color-mix(in srgb, var(--accent2) 88%, #000) 52%,
    color-mix(in srgb, var(--accent2) 96%, #000) 62%,
    var(--accent2) 78%,
    color-mix(in srgb, var(--accent2) 76%, #fff) 100%);
  filter: drop-shadow(0 2px 1px rgba(0,0,0,.22));
}

/* Chrome: neutral metal, no hue. The tight light/dark inversion at the
   midline is the whole trick — that's the horizon reflecting in the bevel. */
.finish-chrome {
  background-image: linear-gradient(180deg,
    #f2f4f7 0%, #dfe3e9 14%, #c3c9d2 28%,
    #a2a9b4 40%, #8d949f 49%,
    #666d77 50%, #8f97a2 54%, #bcc3cd 64%,
    #e2e6ec 78%, #cdd3db 92%, #b9c0c9 100%);
  filter: drop-shadow(0 2px 2px rgba(0,0,0,.28));
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
  /* Alternating means the colour reverses direction at each end, which reads
     as a wobble. Running one way and wrapping keeps it pouring. */
  animation: txLiquid 14s linear infinite;
}
@keyframes txLiquid {
  0%   { background-position:   0% 50%; }
  100% { background-position: 200% 50%; }
}

/* Shimmer: a single specular band crossing an otherwise solid fill, with a
   long pause between passes so it reads as a catch of light, not a loop. */
.finish-shimmer {
  /* A soft, wide band at just over half strength. At .92 white the pass read
     as a white bar wiping the headline out; the point is a catch of light,
     which means you should notice it has happened rather than watch it go. */
  background-image:
    linear-gradient(105deg,
      rgba(255,255,255,0) 38%,
      rgba(255,255,255,.16) 46%,
      rgba(255,255,255,.52) 50%,
      rgba(255,255,255,.16) 54%,
      rgba(255,255,255,0) 62%),
    var(--accent-gradient, linear-gradient(115deg, var(--accent), var(--accent2)));
  background-size: 280% 100%, 100% 100%;
  background-repeat: no-repeat;
  animation: txShimmer 7.5s cubic-bezier(.45,0,.55,1) infinite;
}
@keyframes txShimmer {
  /* Most of the cycle is the pause. A band that comes round every two
     seconds is a loading skeleton, not a finish. */
  0%, 72% { background-position: 150% 50%, 0 0; }
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
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--spec, #fff) 14%, transparent),
    0 20px 50px color-mix(in srgb, var(--shade, rgba(0,0,0,.45)) 62%, transparent);
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
      rgba(255,255,255,.17) 0%,
      rgba(255,255,255,.08) 22%,
      rgba(255,255,255,.03) 44%,
      rgba(255,255,255,.02) 62%,
      rgba(255,255,255,.07) 100%),
    var(--accent-soft);
  backdrop-filter: blur(34px) saturate(190%) brightness(1.05);
  -webkit-backdrop-filter: blur(34px) saturate(190%) brightness(1.05);
  /* The rim is what gives the panel thickness, so it stays. What went was
     the interior wash: an inset 40px white bleed across the middle turned
     every panel into a lit box and buried whatever was behind it. */
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.42),
    inset 1.5px 0 0 rgba(255,255,255,.20),
    inset 0 -1.5px 0 rgba(0,0,0,.24),
    inset -1.5px 0 0 rgba(0,0,0,.14),
    0 22px 60px rgba(0,0,0,.30);
}

/* The travelling sheen. A wide, very soft band — a hard edge would read
   as a scanline rather than as light moving across a curved surface. */
.e-liquid::after {
  content: '';
  position: absolute; inset: -40%;
  background: linear-gradient(100deg,
    rgba(255,255,255,0) 30%,
    rgba(255,255,255,.08) 42%,
    rgba(255,255,255,.20) 50%,
    rgba(255,255,255,.08) 58%,
    rgba(255,255,255,0) 70%);
  animation: lgSheen 13s cubic-bezier(.45,0,.55,1) infinite;
  pointer-events: none;
}
/* Most of the cycle is the panel sitting still. The sheen is an event, and
   an event that happens every seven seconds stops being one. */
@keyframes lgSheen {
  0%, 46%  { transform: translateX(-70%) rotate(8deg); opacity: 0; }
  55%      { opacity: 1; }
  92%      { opacity: 1; }
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
  -webkit-text-stroke: .012em rgba(255,255,255,.36);
  background-image:
    linear-gradient(100deg,
      rgba(255,255,255,0) 28%,
      rgba(255,255,255,.30) 44%,
      rgba(255,255,255,.62) 50%,
      rgba(255,255,255,.30) 56%,
      rgba(255,255,255,0) 72%),
    linear-gradient(180deg,
      rgba(255,255,255,.78) 0%,
      rgba(255,255,255,.40) 18%,
      rgba(255,255,255,.24) 30%,
      color-mix(in srgb, var(--accent) 46%, transparent) 52%,
      color-mix(in srgb, var(--accent2) 52%, transparent) 74%,
      color-mix(in srgb, var(--accent2) 22%, transparent) 88%,
      rgba(255,255,255,.46) 100%);
  background-size: 260% 100%, 100% 100%;
  background-repeat: no-repeat;
  -webkit-background-clip: text; background-clip: text;
  animation: txLiquidGlass 11s cubic-bezier(.45,0,.55,1) infinite;
  /* Two shadows, not three. The contact shadow is what makes glass sit above
     the slide; the outer glow on top of it was just haze, and it was fighting
     the letterforms for the same edge. */
  filter:
    drop-shadow(0 1px 0 rgba(255,255,255,.28))
    drop-shadow(0 8px 20px rgba(0,0,0,.32));
}
@keyframes txLiquidGlass {
  0%, 58%  { background-position: 150% 50%, 0 0; }
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

/* The rail is drawn as a gradient rather than a flat colour: a phone edge is
   a curved metal band, and a flat one is the tell that this is a rectangle
   with a big border-radius. */
.mk-phone {
  border-radius: 56px; border-width: 11px; border-style: solid;
  /* Transparent border + border-box clip is what lets the gradient paint
     THROUGH the border area — that band is the phone's rail. */
  border-color: transparent; position: relative;
  background-image: linear-gradient(145deg, #4a4d55, #1b1c21 26%, #131418 62%, #3a3d45);
  background-origin: border-box; background-clip: border-box;
  box-shadow: 0 30px 70px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06);
}
.mk-phone .mk-screen { border-radius: 45px; }
/* A pill island, not a notch — a notch dates a mockup to 2018 and that reads
   on a slide before anyone has looked at the screenshot. */
.mk-notch {
  position: absolute; top: 15px; left: 50%; transform: translateX(-50%);
  width: 118px; height: 34px; border-radius: 17px; background: #08080a;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
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

/* ---------------- Slide transitions ----------------

   How one whole slide replaces another. Keyed off bare 'enter-*' / 'exit-*'
   classes rather than off a presentation-mode ancestor, because this file is
   the only stylesheet a standalone export carries: scoped to .present-stage,
   every one of these played in rehearsal and then degraded to a hard cut on
   the machine you actually presented from.

   Kept short — 380ms and up. Anything longer reads as sluggish from the back
   of a room, where the audience is waiting for the next thing to be said.

   Transforms compose with the scale() the renderer applies to the slide, so
   every keyframe re-declares it through --s. Surfaces that scale the slide
   itself rather than its container just leave --s unset and get the 1.

   REDUCED MOTION: handled by each surface, not here, because "instant" for a
   full-slide transition is not the same decision as "instant" for a build. */

/* Travellers ride above the content that's leaving, on every surface. */
.el.magic { z-index: 2; }

.enter-fade  { animation: pFadeIn  .38s ease both; }
.exit-fade   { animation: pFadeOut .38s ease both; }
.enter-slide { animation: pSlideIn .42s cubic-bezier(.2,.8,.25,1) both; }
.exit-slide  { animation: pSlideOut .42s cubic-bezier(.2,.8,.25,1) both; }
.enter-push  { animation: pPushIn  .46s cubic-bezier(.3,.85,.25,1) both; }
.exit-push   { animation: pPushOut .46s cubic-bezier(.3,.85,.25,1) both; }
.enter-zoom  { animation: pZoomIn  .44s cubic-bezier(.2,.9,.3,1) both; }
.exit-zoom   { animation: pZoomOut .3s ease both; }

/* Transforms compose with the scale() the renderer sets, so every
   keyframe re-declares it via the --s custom property. */
@keyframes pFadeIn   { from { opacity: 0; } to { opacity: 1; } }
@keyframes pFadeOut  { to   { opacity: 0; } }
@keyframes pSlideIn  { from { opacity: 0; transform: scale(var(--s,1)) translateX(7%); }
                       to   { opacity: 1; transform: scale(var(--s,1)) translateX(0); } }
@keyframes pSlideOut { to   { opacity: 0; transform: scale(var(--s,1)) translateX(-7%); } }
@keyframes pPushIn   { from { transform: scale(var(--s,1)) translateY(100%); }
                       to   { transform: scale(var(--s,1)) translateY(0); } }
@keyframes pPushOut  { to   { transform: scale(var(--s,1)) translateY(-100%); } }
@keyframes pZoomIn   { from { opacity: 0; transform: scale(calc(var(--s,1) * .88)); }
                       to   { opacity: 1; transform: scale(var(--s,1)); } }
@keyframes pZoomOut  { to   { opacity: 0; transform: scale(calc(var(--s,1) * 1.06)); } }

/* --- extended transition set --- */
.enter-zoomOut  { animation: pPullIn .5s cubic-bezier(.2,.9,.3,1) both; }
.exit-zoomOut   { animation: pPullOut .38s ease both; }
@keyframes pPullIn   { from { opacity: 0; transform: scale(calc(var(--s,1) * 1.18)); }
                       to   { opacity: 1; transform: scale(var(--s,1)); } }
@keyframes pPullOut  { to   { opacity: 0; transform: scale(calc(var(--s,1) * .86)); } }

.enter-blur { animation: pBlurIn .5s ease both; }
.exit-blur  { animation: pBlurOut .4s ease both; }
@keyframes pBlurIn   { from { opacity: 0; filter: blur(26px); }
                       to   { opacity: 1; filter: blur(0); } }
@keyframes pBlurOut  { to   { opacity: 0; filter: blur(26px); } }

.enter-iris { animation: pIrisIn .62s cubic-bezier(.3,.85,.25,1) both; }
.exit-iris  { animation: pFadeOut .3s ease both; }
@keyframes pIrisIn   { from { clip-path: circle(0% at 50% 50%); }
                       to   { clip-path: circle(78% at 50% 50%); } }

/* Cover slides the new deck over the old one, which stays put — the old
   slide must not also move or the two cancel out visually. */
.enter-cover { animation: pCoverIn .5s cubic-bezier(.3,.9,.25,1) both; }
.exit-cover  { animation: pHold .5s both; }
@keyframes pCoverIn  { from { transform: scale(var(--s,1)) translateX(100%); }
                       to   { transform: scale(var(--s,1)) translateX(0); } }
@keyframes pHold     { to { opacity: 1; } }

/* Reveal is the inverse: the old slide leaves, uncovering the new one. */
.enter-reveal { animation: pHold .5s both; z-index: 0; }
.exit-reveal  { animation: pRevealOut .5s cubic-bezier(.3,.9,.25,1) both; z-index: 1; }
@keyframes pRevealOut { to { transform: scale(var(--s,1)) translateX(-100%); } }

.enter-flip { animation: pFlipIn .58s cubic-bezier(.3,.9,.3,1) both; }
.exit-flip  { animation: pFlipOut .34s ease-in both; }
@keyframes pFlipIn   { from { opacity: 0; transform: scale(var(--s,1)) perspective(1600px) rotateY(52deg); }
                       to   { opacity: 1; transform: scale(var(--s,1)) perspective(1600px) rotateY(0); } }
@keyframes pFlipOut  { to   { opacity: 0; transform: scale(var(--s,1)) perspective(1600px) rotateY(-52deg); } }

.enter-swipeUp { animation: pSwipeUpIn .5s cubic-bezier(.25,.9,.25,1) both; }
.exit-swipeUp  { animation: pSwipeUpOut .5s cubic-bezier(.25,.9,.25,1) both; }
@keyframes pSwipeUpIn  { from { transform: scale(var(--s,1)) translateY(100%); } }
@keyframes pSwipeUpOut { to   { transform: scale(var(--s,1)) translateY(-42%); opacity: 0; } }

.enter-dissolve { animation: pDissolveIn .72s ease both; }
.exit-dissolve  { animation: pFadeOut .5s ease both; }
/* A whole-slide contrast pump reads as the projector flinching, not as a
   dissolve. The blur does the work; the contrast just keeps the midtones
   from going flat while it clears. */
@keyframes pDissolveIn { from { opacity: 0; filter: blur(9px) contrast(1.12); }
                         to   { opacity: 1; filter: blur(0) contrast(1); } }

/* Glitch: hard jumps with the colour channels pulled apart. Short on
   purpose — it's a punctuation mark, and it stops being one if it lingers.

   The separation is done with two opposed coloured drop-shadows, which is
   what a mis-registered signal actually looks like. Rotating the hue of the
   whole slide instead, as this used to, turns the deck a different colour
   for a fifth of a second: that isn't a glitch, it's a flash of green, and
   on a projector it's the kind of thing people ask about afterwards. */
.enter-glitch { animation: pGlitchIn .38s steps(1,end) both; }
.exit-glitch  { animation: pFadeOut .14s both; }
@keyframes pGlitchIn {
  0%   { opacity: 0; transform: scale(var(--s,1)) translateX(-1.4%);
         filter: drop-shadow(-14px 0 0 rgba(255,0,64,.55)) drop-shadow(14px 0 0 rgba(0,224,255,.55)); }
  30%  { opacity: 1; transform: scale(var(--s,1)) translateX(1%);
         filter: drop-shadow(9px 0 0 rgba(255,0,64,.42)) drop-shadow(-9px 0 0 rgba(0,224,255,.42)); }
  55%  { transform: scale(var(--s,1)) translateX(-.45%);
         filter: drop-shadow(-4px 0 0 rgba(255,0,64,.28)) drop-shadow(4px 0 0 rgba(0,224,255,.28)); }
  80%  { transform: scale(var(--s,1)) translateX(.2%);
         filter: drop-shadow(2px 0 0 rgba(0,224,255,.16)); }
  100% { transform: scale(var(--s,1)) translateX(0); filter: none; }
}

/* ================================================================
   CONNECT — the Meta Connect stage language. See js/connect.js.
   ================================================================ */

/* The form's static picture. In presentation it is hidden and the live
   canvas takes its place (present.css), so it only shows on still surfaces. */
.slide-form { position: absolute; inset: 0; pointer-events: none; }
.slide-form img { width: 100%; height: 100%; display: block; }

/* ---------- Icons ----------
   The tile is a soft rounded square, not a hard box: a hairline edge and
   a faint top light, so it sits in the slide like Meta's feature glyphs. */
.e-icon { width: 100%; height: 100%; display: grid; place-items: center; }
.e-icon svg { width: 100%; height: 100%; overflow: visible; }
.e-icon.tile-dark, .e-icon.tile-light { border-radius: 27%; }
.e-icon.tile-dark svg, .e-icon.tile-light svg { width: 52%; height: 52%; }
.e-icon.tile-dark {
  background: linear-gradient(180deg, #1c1f26, #121419);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.09), inset 0 0 0 1px rgba(255,255,255,.06);
}
.e-icon.tile-light {
  background: linear-gradient(180deg, #ffffff, #f1f3f8);
  box-shadow: inset 0 0 0 1px rgba(11,16,32,.07), 0 10px 30px rgba(11,16,32,.08);
}

/* ---------- Kit elements (js/kit.js) ---------- */
.e-sculpture, .e-lens, .e-wires, .e-halftone, .e-bands { width: 100%; height: 100%; display: block; position: relative; }
.e-sculpture img, .e-sculpture canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.e-sculpture.live img { opacity: 0; }
.e-bands { overflow: hidden; }
.e-bands .bd-rot { position: absolute; left: 50%; top: 50%; display: flex; }
.e-bands i { display: block; height: 100%; position: relative; }
.e-bands i.lined::after {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.2) 0 2px, transparent 2px 9px);
}
.e-lens .ln { transform-box: fill-box; transform-origin: center; }
.e-lens .ln-mer path { stroke-dasharray: 1 1; stroke-dashoffset: 0; }
.e-wires .wr-draw { stroke-dasharray: 1 1; stroke-dashoffset: 0; }
.e-wires .wr-grow, .e-halftone .ht-grow { transform-box: fill-box; transform-origin: center; }
.e-halftone .ht-wipe { transform-box: fill-box; transform-origin: left center; }
/* Dotted lines keep marching after they have drawn — slow enough to feel
   like drift, not like a loading bar. */
.e-wires.flowing g > path { animation: wrMarch 1.8s linear infinite; }
@keyframes wrMarch { to { stroke-dashoffset: calc(var(--period, 13px) * -1); } }

/* ---------- Signature builds ----------
   Only on a slide that is arriving (.building), only for elements left on
   their signature entrance, and delayed by the element's slot in the
   choreography (--bd). The resting state is always the finished element. */
.entering .el { --bd: calc(min(var(--i, 0), 9) * 55ms); }
.entering .el[data-anim="build"] > .el-anim { animation-name: elFade; }

.building .el[data-anim="build"] .ln {
  animation: knPop 1.1s cubic-bezier(.2,.9,.2,1) calc(var(--bd, 0ms) + var(--k, 0) * 90ms) both;
}
.building .el[data-anim="build"] .ln-mer path {
  animation: knDraw 1.2s cubic-bezier(.6,0,.2,1) calc(var(--bd, 0ms) + var(--k, 0) * 90ms) both;
}
.building .el[data-anim="build"] .ln-fill,
.building .el[data-anim="build"] .ln-gloss {
  animation: knFade 1s cubic-bezier(.2,.8,.2,1) calc(var(--bd, 0ms) + var(--k, 0) * 90ms + 520ms) both;
}
.building .el[data-anim="build"] .wr-draw {
  animation: knDraw 1.7s cubic-bezier(.6,0,.2,1) var(--bd, 0ms) both;
}
.building .el[data-anim="build"] .wr-grow,
.building .el[data-anim="build"] .ht-grow {
  animation: knGrow 1.6s cubic-bezier(.6,0,.2,1) var(--bd, 0ms) both;
}
.building .el[data-anim="build"] .ht-wipe {
  animation: knWipe 1.5s cubic-bezier(.6,0,.2,1) var(--bd, 0ms) both;
}
.building .el[data-anim="build"] .e-bands i {
  animation: bdRise 1s cubic-bezier(.2,.9,.2,1) calc(var(--bd, 0ms) + var(--k, 0) * 55ms) both;
}
.building .el[data-anim="build"] .e-sculpture:not(.live) img {
  animation: scIn 1.6s cubic-bezier(.16,1,.3,1) var(--bd, 0ms) both;
}
@keyframes knDraw { from { stroke-dashoffset: 1; } }
@keyframes knFade { from { opacity: 0; } }
@keyframes knPop  { from { opacity: 0; transform: scale(.82) rotate(-8deg); } }
@keyframes knGrow { from { transform: scale(0); } }
@keyframes knWipe { from { transform: scaleX(0); } }
@keyframes bdRise { from { transform: scaleY(0); opacity: 0; } }
@keyframes scIn   { from { opacity: 0; transform: scale(.6) rotate(-24deg); filter: blur(14px); } }
.thumb-frame .e-wires.flowing g > path { animation: none !important; }

/* ---------- More type finishes ----------
   Striped: the giant cropped words over the sculpture. Dissolve: the
   countdown numerals breaking into lines. Mist: soft pastel, for white
   slides. All degrade to the accent colour without clip-to-text. */
.finish-stripes, .finish-dissolve, .finish-mist {
  color: var(--accent);
  -webkit-background-clip: text; background-clip: text;
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .finish-stripes, .finish-dissolve, .finish-mist { color: transparent; -webkit-text-fill-color: transparent; }
}
.finish-stripes {
  background-image:
    repeating-linear-gradient(90deg, rgba(6,10,44,.5) 0 2px, transparent 2px 8px),
    linear-gradient(100deg, #9ff6ff 0%, #5aa2ff 30%, #a46bff 62%, #ff8fdc 100%);
}
.finish-dissolve {
  background-image:
    repeating-linear-gradient(90deg, rgba(6,10,44,.66) 0 3px, transparent 3px 11px),
    linear-gradient(180deg, #d4eeff 0%, #7cc0ff 28%, #3478ff 60%, #6c4dff 100%);
  background-size: 100% 42%, 100% 100%;
  background-position: 0 100%, 0 0;
  background-repeat: no-repeat;
}
.finish-mist { background-image: linear-gradient(120deg, #ffc9e6 0%, #d3c4ff 35%, #b6ddff 70%, #dffaff 100%); }

/* ---------- Mist fields ----------
   Fixed Connect tints for the gradient-mist backgrounds. Declared on the
   atmosphere layer too, because in presentation the field lives outside
   any .slide. */
.slide, .atmos-layer {
  --cx-blue: rgba(38, 92, 255, .62);    --cx-blue-0: rgba(38, 92, 255, 0);
  --cx-violet: rgba(120, 70, 255, .5);  --cx-violet-0: rgba(120, 70, 255, 0);
  --cx-cyan: rgba(90, 220, 255, .36);   --cx-cyan-0: rgba(90, 220, 255, 0);
  --cx-magenta: rgba(230, 80, 210, .34); --cx-magenta-0: rgba(230, 80, 210, 0);
  --cx-orange: rgba(255, 140, 70, .42); --cx-orange-0: rgba(255, 140, 70, 0);
  --cx-teal: rgba(40, 210, 190, .38);   --cx-teal-0: rgba(40, 210, 190, 0);
  --cx-pink: rgba(255, 186, 228, .9);   --cx-pink-0: rgba(255, 186, 228, 0);
  --cx-sky: rgba(176, 214, 255, .95);   --cx-sky-0: rgba(176, 214, 255, 0);
  --cx-peach: rgba(255, 222, 196, .85); --cx-peach-0: rgba(255, 222, 196, 0);
  --cx-lilac: rgba(214, 196, 255, .9);  --cx-lilac-0: rgba(214, 196, 255, 0);
}

/* ---------- Persistent chrome ---------- */
.slide-chrome {
  position: absolute; left: 0; right: 0; bottom: 0; height: 120px;
  pointer-events: none; z-index: 60;
  font-family: var(--font-display); color: #fff;
  transition: color .9s ease, opacity .9s ease;
}
.slide-chrome.tone-dark { color: #0b1020; }
.slide-chrome .ch-l, .slide-chrome .ch-r {
  position: absolute; bottom: 48px;
  font-size: 24px; font-weight: 500; letter-spacing: -.005em; line-height: 1;
  display: flex; align-items: center; gap: 11px;
}
.slide-chrome .ch-l { left: 68px; opacity: .92; }
.slide-chrome .ch-r { right: 68px; opacity: .7; }
/* The APEX peak, softened: rounded joins, iridescent fill. */
.slide-chrome .ch-mark {
  display: inline-block; width: 28px; height: 24px;
  background: linear-gradient(135deg, #7df3ff, #3f7dff 50%, #a46bff 78%, #ff7fd6);
  clip-path: path('M14 1.5c1 0 1.8.5 2.3 1.4l10.6 18.2c.9 1.6-.2 3.4-2 3.4h-3.6c-.9 0-1.7-.5-2.1-1.2L14 13.6l-5.2 9.7c-.4.7-1.2 1.2-2.1 1.2H3.1c-1.8 0-2.9-1.8-2-3.4L11.7 2.9c.5-.9 1.3-1.4 2.3-1.4z');
}

/* ---------- Iridescent type ----------
   The Connect countdown numerals: a smooth thin-film sweep across the
   glyphs, the same four colours as the form. Degrades to solid accent. */
.finish-connect {
  color: var(--accent);
  -webkit-background-clip: text; background-clip: text;
  background-image: linear-gradient(100deg, #9ff6ff 0%, #5aa2ff 30%, #a46bff 62%, #ff8fdc 100%);
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .finish-connect { color: transparent; -webkit-text-fill-color: transparent; }
}

/* ---------- Connect entrances ----------
   Flow: out of soft focus, drifting up into place on a long ease-out —
   the way words arrive on a Connect screen. Nothing snaps, nothing wipes. */
.entering .el[data-anim="flow"] > .el-anim {
  animation-name: elFlow; animation-duration: calc(1.1s * var(--sp,1));
  animation-timing-function: cubic-bezier(.16,1,.3,1);
  animation-delay: calc(min(var(--i, 0), 9) * 80ms * var(--sp, 1));
}
@keyframes elFlow { from { opacity: 0; transform: translateY(24px); filter: blur(14px); } }
.el.build-hidden[data-anim="flow"] > .el-anim { transform: translateY(18px); filter: blur(12px); }
.el[data-anim="flow"] > .el-anim {
  transition: opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1),
              filter .9s cubic-bezier(.16,1,.3,1);
}
/* Settle: soft focus pull with a slow scale-down, for products on black. */
.entering .el[data-anim="settle"] > .el-anim {
  animation-name: elSettle; animation-duration: calc(1.5s * var(--sp,1));
  animation-timing-function: cubic-bezier(.16,1,.3,1);
}
@keyframes elSettle { from { opacity: 0; transform: scale(1.08); filter: blur(12px); } }

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
