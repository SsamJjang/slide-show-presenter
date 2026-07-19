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
| Edit text | double-click it |
| Nudge / big nudge | arrows / `Shift` arrows |
| Constrain drag, or lock aspect on resize | hold `Shift` |
| Temporarily disable snapping | hold `Alt` |
| Layouts / themes / export | `Ctrl` `L` / `K` / `E` |

Elements snap to each other, to slide centre, and to the 140px margin grid,
with guides shown live.

**13 layouts** ship pre-composed with a real typographic scale — title,
statement, section, big number, three-up, two-column, quote, chart, code,
full-bleed image, table, closing, blank. They are not empty boxes; replace
the words and the slide is already designed.

**6 themes** — Obsidian, Paper, Aurora, Slate, Carbon, Ivory. Switching
restyles the entire deck at once. Anything coloured with a palette swatch
follows the theme; anything you set to an explicit hex value stays put.
That distinction is deliberate — it's what makes themes safe to try.

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
       themes.css   slide surface + print rules
       present.css  presentation + presenter view
js/    model.js     deck model, undo history
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

## Known limits

- Images are embedded as base64 in the autosave. A deck with many large
  photos can hit the browser's storage quota; the app warns you and you
  should export a `.json`.
- PDF export goes through the browser's print dialog rather than generating
  the file directly — margins and scaling depend on getting those settings
  right.
- Multi-select supports move, align, and distribute, but per-type styling
  edits apply to the first selected element only.
