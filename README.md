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

## Presenting

**Present** starts from the scene you're on. `→` / `Space` / click for next,
`←` for back, `B` for black, `Esc` to stop.

- **Screens:** each one assembles itself in reading order, and screens
  dissolve into each other the way the broadcast does.
- **Opener:** plays the identity open. Drafted lines draw on, iridescent
  bands sweep through, and the title lands with the sculpture.
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
js/media.js         images and videos (stored in the browser's IndexedDB)
fonts/Figtree.woff2 the typeface, closest open match to Meta's Optimistic
```

Decks autosave in this browser. **••• → Save deck file** writes a single
file with all the media inside. Open it on any other machine with
**Open deck file**.
