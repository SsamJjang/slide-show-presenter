# Apex Deck

A presentation studio that runs from a single folder. No build step, no
dependencies, no network. Open `index.html` and it works — including on a
borrowed laptop, on conference wifi that has given up, five minutes before
you walk on stage.

```
open index.html          # that's it
```

## Why it's built this way

Presenting has one hard requirement: **it must not fail live.** Every design
decision here follows from that.

- **Zero dependencies.** Nothing to install, nothing to break, no CDN to be
  offline. The whole app is plain HTML/CSS/JS.
- **One fixed design space.** Every coordinate is stored in a 1920×1080
  space and only scaled on the way out. The thumbnail, the editor, the
  projector, and the PDF are the same render at different scales — they
  cannot drift apart.
- **One renderer.** `js/render.js` draws a slide for every surface in the
  app. If a slide looks wrong somewhere, it's wrong in one file.
- **Autosave plus a rolling backup.** Work survives a crashed tab. A corrupt
  write can't take the only copy with it.
- **Fonts are named-first, system-fallback.** Nothing is fetched at runtime.

## Presenting

| | |
|---|---|
| Present from start | `Ctrl` `Enter` |
| Present from current slide | `Shift` `F5` |
| **Presenter view** (notes, next slide, timer) | `P` while presenting |
| Navigate | `←` `→` `Space` · click · right-click back |
| Jump to slide | number keys |
| Black / white the screen | `B` / `W` |
| Show / hide the bottom bar | `Tab` |
| Exit | `Esc` |

**Presenter view** opens a second window — put it on your laptop and the
main window on the projector. It shows the current slide, what's coming
next, your speaker notes, a talk timer, and the wall clock.

Allow pop-ups for the page or the second window won't open.

## Building slides

Press `?` in the app for the full keyboard list. The essentials:

| | |
|---|---|
| Insert text / shape / image / chart | `T` `S` `I` `C` |
| Insert device mockup | toolbar |
| Edit text | double-click it |
| Nudge / big nudge | arrows / `Shift` arrows |
| Constrain drag, or lock aspect on resize | hold `Shift` |
| Temporarily disable snapping | hold `Alt` |
| Layouts / themes / export | `Ctrl` `L` / `K` / `E` |

Elements snap to each other, to slide centre, and to the 140px margin grid,
with guides shown live.

**20 layouts** ship pre-composed with a real typographic scale. Alongside the
basics (title, statement, section, big number, quote, chart, code, closing)
there are premium ones built on the systems below — Hero, Product shot,
Metric trio, Feature grid, Phone, Timeline, Spotlight quote. They are not
empty boxes; replace the words and the slide is already designed.

**6 themes** — Obsidian, Paper, Aurora, Slate, Carbon, Ivory. Switching
restyles the entire deck at once. Anything coloured with a palette swatch
follows the theme; anything you set to an explicit hex value stays put.
That distinction is deliberate — it's what makes themes safe to try.

## What makes a deck look designed

Four systems, and they're the reason this doesn't come out looking like a
template. All of them are pure CSS built from theme variables, so they cost
nothing to render, scale to any projector, and survive the HTML export.

**One accent, everything derived.** Pick a single colour in the Theme sheet
and the secondary, the third chart series, the glows, the surface tints and
even the background are computed from it — with hue rotations damped through
the yellow-green band and lightness compensated per hue, because equal steps
in HSL are not equal steps to the eye. Backgrounds carry a trace of the
accent rather than being neutral grey, which is most of why a finished deck
reads as one thing. The picker shows the derived ramp and warns you if
accent-on-background falls under 3:1.

**Every gradient is built, not declared.** A two-stop CSS gradient is
interpolated in sRGB, and sRGB is not perceptually uniform, so it fails in
two ways at once: the middle of a two-hue ramp sags dark and grey, and a long
ramp across a near-black slide bands into visible stripes the moment it hits
a projector. So the intermediate colours are computed here, in Oklab, and
emitted as explicit stops.

Blending is polar (chroma-preserving) along the short hue arc up to 110°, and
rectangular beyond it. That cutoff is deliberate: polar blending keeps a
brand gradient as saturated in the middle as at its ends, but past a certain
arc it starts touring the colour wheel — orange to teal via polar blending
runs through magenta and purple, which is a rainbow, not a gradient. Past the
cutoff it passes through a clean neutral instead, at the right lightness.
It's the difference between a complementary harmony being usable and being a
novelty.

The same machinery de-bands the slide backgrounds, and it emits plain hex, so
an export can't lose its gradients on a browser without the newer CSS colour
syntax.

**Depth that moves.** Ten background presets — spotlight, mesh, aurora,
nebula, grid, dots, rays, horizon, duotone. Each is built from several
colour blooms that drift *independently*, on deliberately mismatched
durations, so the background never visibly loops or resets. Five motion
modes (Still, Drift, Breathe, Flow, Orbit) and a tempo dial. Every bloom
animates `transform` only, so the whole system runs on the compositor —
it costs nothing during a talk. The patterned presets move by transform
too: panning a tiled gradient by `background-position` instead repaints
the entire slide every frame, which is the one thing this system exists
to avoid.

A bloom fades to *its own hue at zero alpha*, on a curve. Both halves
matter. The `transparent` keyword means transparent **black**, so a bloom
fading to it wears a dirty grey halo exactly where it should be dissolving
into the field — and a linear alpha ramp has a corner in it that the eye
finds and reads as a disc with an edge. Real light falls off on a curve.

Optional film grain and vignette. The grain is neutral-grey noise at a
little over one 8-bit level of amplitude, blended `overlay` — mid-grey is
overlay's identity, so it dithers luminance locally without lifting the
exposure. It is worth turning on for any large gradient: banding is a
luminance artefact, and dithering is the cheapest fix for it. (Coloured
noise would not work, and would crawl over the slide as chroma dirt.)

Set Motion to **Still** if the talk is being filmed, or if the room needs
the calm.

**Materials.** Glass panels (real backdrop blur with an inset top highlight),
five elevation levels including an accent glow, and browser / window / phone
device frames for product shots. A screenshot in a real chrome reads as a
shipped product; the same image floating on a slide reads as a wireframe.

**Text finishes.** Nine treatments for display type, picked from swatches
that render the actual finish:

| | |
|---|---|
| **Gradient** | Flat two-colour accent sweep. The quiet one. |
| **Gloss** | Bright crown, saturated core, reflected lift at the baseline. The hard specular break at the midline is what makes it read as a lit, curved surface. The crown is a tinted near-white rather than pure white — at full white the top third of every letter is a blank cutout and the type stops being readable at the back of the room. |
| **Chrome** | Neutral metal. The tight light/dark inversion at the midline is the horizon reflecting in the bevel. |
| **Liquid** | An oversized gradient sliding under the glyphs, so colour appears to pour through the letterforms. Animated. |
| **Shimmer** | A single soft specular band crossing the fill, at about half strength, with most of the cycle spent waiting. Both are the point: at full white it's a bar wiping the headline out, and at a two-second cycle it's a loading skeleton. You should notice it *has happened*, not watch it go past. Animated. |
| **Liquid glass** | Apple's material, painted. `backdrop-filter` can't be clipped to glyphs, so the glass is drawn instead: a refractive crown, a travelling highlight, a dark underside, a hairline stroke standing in for edge thickness, and a contact shadow. One shadow, not three — an outer glow stacked on the contact shadow is just haze, and it fights the letterforms for the same edge. Animated. |
| **Frost** | Etched into glass — translucent, legible over busy backgrounds. |
| **Emboss** | Pressed into the surface. Prints well. |
| **Outline** | Weight without mass. Good over photography. |

These are **not** the default, deliberately. A glossy headline against plain
body copy is a focal point; a deck where everything shimmers is a deck where
nothing does. Use one per slide, on the biggest thing.

They are also all tuned quieter than they could be. Every one of these
effects is trivially easy to overdo, and a finish loud enough to be noticed
*as an effect* has stopped doing its job — which is to make one thing on the
slide look like the thing worth looking at.

Every finish degrades to a solid readable colour if its clip isn't
supported — the failure mode is never invisible text, and there's a test
asserting exactly that across all 120 theme/layout combinations.

**Shapes are generated, not listed.** Fourteen *generators* with open
parameters, rather than a fixed menu: sides, corner radius, angle, inner
ratio, thickness, squareness, irregularity, sweep. A triangle, a heptagon, a
seven-point star with softened tips and a rounded gauge arc are all the same
few generators at different settings, so the shape count is effectively
unbounded. Everything angular routes through one corner-rounding routine
(walk back along both edges by `r / tan(theta/2)`, join with an arc, clamp
the inset to half the shorter edge) — which is why one radius control softens
a triangle, a star and a chevron identically without ever inverting the path.

Includes a real **squircle** (superellipse — the maths behind an Apple icon,
with the exponent exposed), organic **blobs** that are deterministic from a
seed so a shape you like is reproducible, and per-corner radius overrides on
rectangles.

**Choreography.** Three independent layers, which is what makes combinations
work — a title can drop in with a spring, float gently forever, and sit on a
slide that arrived with an iris wipe, without any of the three knowing about
the others.

They are independent because each one owns its own node: `.el` holds the
geometry, its rotation and its shadow; `.el-anim` runs the entrance;
`.el-emph` runs the loop. There is only one `transform` and one `filter` per
element, and a running CSS animation outranks an inline style, so sharing a
node meant they destroyed each other — an element with both an entrance and
a loop played its *entrance*, on the loop's timing, for the length of the
talk; anything rotated snapped upright the moment either started; anything
with a shadow lost it. Nesting is what makes the catalogue below actually
combinable rather than just listed together.

- **30 entrances** grouped as Basic, Directional, Reveal, Dimensional and
  Energetic — including spring, elastic, drop, roll, unfold, iris, split,
  flip and zoom-blur. Three speeds.
- **14 emphasis loops** that run for as long as the slide is up: float, bob,
  sway, breathe, pulse, glow, spin, orbit, wobble, tilt, shine, flicker,
  levitate. All deliberately small — anything bigger competes with the person
  speaking.
- **15 slide transitions**: Magic Move, fade, slide, push, zoom, pull back,
  blur, iris, cover, reveal, flip, swipe up, dissolve, glitch, cut.

Elements arrive in stacking order with a 55ms stagger — but only on
transitions that don't move the slide itself. If the whole slide flies in
from the right *and* each thing on it separately rises and fades, that's two
different motions describing the same arrival, which is the most common way a
deck ends up looking amateur. Either the slide moves or its contents
assemble, never both.

Everything respects `prefers-reduced-motion`, and every loop is frozen in
thumbnails and print.

## Continuity — why it plays as one space

The single thing that separates a modern keynote from a slideshow is that it
does not feel like separate slides. Two mechanisms, and the first matters
more than people expect.

**The atmosphere does not belong to a slide.** It is hoisted out of the slide
stack and lives above it for the whole talk, cross-dissolving only when the
look actually changes — and even then the blooms keep drifting on their own
uninterrupted clocks. Nothing ever restarts. The eye tracks the continuous
field and reads the content as moving *within* a space rather than as a cut
between two of them. On its own this removes most of the "slides playing
separately" feeling.

**Magic Move.** Anything present on both sides of a cut is not destroyed and
rebuilt — it travels. Position, size and scale are interpolated from where it
was to where it is going. A title that shrinks out of a hero and flies into
the corner while the next slide's content arrives around it is the signature
move, and it is this.

Matching is automatic: identical text, the same image, the same shape. Set a
**morph tag** on two elements to force a pairing the matcher wouldn't find on
its own. The starter deck carries a brand mark and an accent rule through all
ten slides so you can see it immediately.

Unmatched content is **strictly sequenced**: the outgoing content is fully
gone before any incoming content starts arriving. Overlapping them is wrong —
two slides that each hold a paragraph produce no match (the words differ), so
both would be on screen at once, which reads as a doubling glitch rather than
a transition. Matched elements still travel across the whole duration, so the
*movement still leads* and the changes follow.

All of it is driven by the Web Animations API rather than CSS transitions: a
transition cannot start on an element inserted in the same frame (it has no
previous computed style to move away from), and the usual reflow nudge is
unreliable. `element.animate()` takes an explicit from/to and returns a
finished promise, so cleanup is exact rather than a timeout racing the
animation.

**The standalone HTML export does all of this too** — persistent atmosphere,
Magic Move, the full transition set and the entrance choreography, with the
geometry baked into `data-*` attributes so the exported player needs no deck
model. What you rehearse is what plays on someone else's laptop.

That required moving the transition catalogue out of `css/present.css` and
into `js/slide-css.js`, keyed off bare `enter-*` / `exit-*` classes. An
export carries that one stylesheet and nothing else, so anything scoped to
the editor's presentation surface played in rehearsal and then degraded
silently to a hard cut on the machine you actually presented from — which is
the worst possible place to find out.

### Text formatting

Inside any text element: `**bold**`, `*italic*`, `` `code` ``, and `{accent}`
to pull a phrase into the theme's accent colour.

### Builds

Any element can be set to reveal on click 1–5 instead of appearing with the
slide. `→` advances through a slide's builds before moving on, so
progressive disclosure works the way you expect when you're live.

## Getting the deck out

- **Standalone HTML** — one self-contained file, ~17KB plus images. Plays
  fullscreen in any browser with no internet and no editor. *This is what
  you present from on someone else's machine.*
- **PDF** — opens the print dialog. Choose Save as PDF, landscape, margins
  none.
- **`.json`** — lossless, and the only format that reopens here editable.
  Export this if the deck matters.

## Layout

```
index.html
css/   app.css      editor chrome
       present.css  presentation chrome + presenter view
js/    slide-css.js slide surface, motion, transitions, print (see note below)
       palette.js   colour engine — derives a full palette from one accent
       backgrounds.js  ten depth presets, motion modes, grain, vignette
       shapes.js    parametric shape generators + corner rounding
       motion.js    entrance / emphasis / transition catalogue
       model.js     deck model, undo history
       store.js     autosave + recovery
       render.js    the single slide renderer
       charts.js    SVG charts, no chart library
       templates.js themes + layouts
       canvas.js    drag, resize, rotate, snap, inline edit
       inspector.js contextual properties
       rail.js      slide sorter
       present.js   playback, builds, presenter view
       exporter.js  HTML / PDF / JSON
       app.js       wiring, keyboard, modals
```

The slide styling lives in `js/slide-css.js` as a string rather than in a
`.css` file. It has to be embedded into every exported HTML deck, and
`fetch()` is blocked on `file://` pages — so a stylesheet would have meant
exports came out unstyled whenever you'd opened `index.html` directly. One
source of truth that every path can read, with no build step.

The rule that follows from that: **if a viewer can see it, it belongs in
`slide-css.js`.** Everything that draws a slide, moves an element, or
replaces one slide with another lives there. `css/present.css` and
`css/app.css` hold only chrome — the HUD, the presenter window, the editor
— none of which an export contains. Anything visual that drifts into those
files works in rehearsal and silently disappears on the night.

## Known limits

- Images are embedded as base64 in the autosave. A deck with many large
  photos can hit the browser's storage quota; the app warns you and you
  should export a `.json`.
- PDF export goes through the browser's print dialog rather than generating
  the file directly — margins and scaling depend on getting those settings
  right.
- Multi-select supports move, align, and distribute, but per-type styling
  edits apply to the first selected element only.
