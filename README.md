# APEX Ascents

The presenter for APEX Ascents keynotes. Every screen is a one-to-one rebuild
of a Meta Connect 2025 keynote screen, so anything you make here plays like
a Connect keynote.

```
python devserver.py          # then open http://localhost:5599
```

## Making a keynote

- **Add scene** (or `N`) opens every Connect screen: Countdown, Opener,
  Title card, Brand card, Statement, Feature card, Speaker, Quote, Product on
  black, Product on white, Availability, App screens, Collage, Live demo,
  Full-bleed video, Thank you.
- **Click any text on the stage** and type. **Click or drop a file** on any
  image box to fill it with an image or a screen recording.
- The bar under the stage has the few choices each screen really has
  (background, number, caption, footer) and your speaker notes.
- Drag scenes in the list to reorder. Hover a scene for duplicate and delete.
  `Ctrl+Z` undoes.
- **Copy and paste:** `Ctrl+C` / `Ctrl+X` / `Ctrl+V` copy, cut and paste
  elements, across scenes, tabs and decks. Paste a screenshot to get an image,
  or paste text to get a text box.
- **Type:** any text can take one of 16 typefaces (sans, display, serif, mono),
  a weight, a size, italic, capitals and any colour. **More** adds an effect
  (shadow, glow, outline), letter spacing and line height. On every element,
  More also sets opacity and rotation.
- **Music** (top bar): the built-in soundtrack, your own track, or none. You
  choose how loud it plays under the talk, and **Preview the open** plays the
  chrome open's music in the editor.

## Presenting

**Present** starts from the scene you're on. `→` / `Space` / click for next,
`←` for back, `B` for black, `Esc` to stop.

- **Screens:** each one assembles itself in reading order, and screens
  dissolve into each other the way the broadcast does.
- **Opener:** plays the identity open. Drafted lines draw on, iridescent
  bands sweep through, and the title lands with the sculpture.
- **Intro · chrome mark:** the Connect 2026 open. Three extreme close-ups of
  the APEX link in polished chrome cut on the beat, then the camera pulls
  back to the whole mark and the name lands as the beat drops. The mark is
  also an element (Forms → Chrome APEX mark) with Connect amber, APEX mint or
  silver reflections.
- **Music:** the built-in score is synthesised live, on the same 112 BPM grid
  as the open's cuts. It hits each cut and builds into the pull back. Between
  screens it plays a soft whoosh, and it ducks under a video with sound.
- **Countdown:** counts down live.
- **Full-bleed video:** plays with sound.

## Files

```
index.html          the editor
css/ascents.css     the Connect screens: fields, type, footer, motion
css/editor.css      the editor
js/scenes.js        every screen, rebuilt to the frame
js/sculpture.js     the twisted, striped Connect sculpture (WebGL)
js/player.js        presenting
js/editor.js        editing
js/deck.js          the deck, autosave, undo, deck files
js/media.js         images, videos and music (stored in the browser's IndexedDB)
js/music.js         the soundtrack (Web Audio)
css/fonts.css       the extra typefaces (Google Fonts, OFL, bundled in fonts/)
fonts/Figtree.woff2 the house typeface, closest open match to Meta's Optimistic
```

Decks autosave in this browser. **••• → Save deck file** writes a single
file with all the media inside. Open it on any other machine with
**Open deck file**.
