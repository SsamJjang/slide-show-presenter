/* ============================================================
   Motion registries.

   Three independent layers, because they answer different questions:

     ENTRANCE  — how an element arrives (once)
     EMPHASIS  — how it behaves while it sits there (loops)
     TRANSITION— how a whole slide replaces another

   Keeping them separate is what makes combinations work: a title can
   drop in with a spring AND float gently forever AND live on a slide
   that arrived with an iris wipe, without any of the three knowing
   about the others.

   The CSS lives in slide-css.js so the exporter carries it. This file
   is only the catalogue the UI reads.
   ============================================================ */

const Motion = (() => {

  /* Grouped so the picker can present them in a sane order rather than
     as one undifferentiated wall of 26 buttons. */
  const ENTRANCES = [
    { group: 'Basic', items: [
      ['none',    'None'],
      ['fade',    'Fade'],
      ['rise',    'Rise'],
      ['fall',    'Fall'],
      ['scale',   'Scale'],
    ]},
    { group: 'Directional', items: [
      ['slideL',  'From left'],
      ['slideR',  'From right'],
      ['slideU',  'From below'],
      ['slideD',  'From above'],
      ['glide',   'Glide'],
    ]},
    { group: 'Reveal', items: [
      ['wipe',    'Wipe →'],
      ['wipeL',   'Wipe ←'],
      ['wipeU',   'Wipe ↑'],
      ['wipeD',   'Wipe ↓'],
      ['iris',    'Iris'],
      ['split',   'Split'],
    ]},
    { group: 'Dimensional', items: [
      ['flipX',   'Flip X'],
      ['flipY',   'Flip Y'],
      ['unfold',  'Unfold'],
      ['rotate',  'Rotate'],
      ['tilt',    'Tilt'],
      ['skew',    'Skew'],
    ]},
    { group: 'Energetic', items: [
      ['pop',     'Pop'],
      ['spring',  'Spring'],
      ['drop',    'Drop'],
      ['elastic', 'Elastic'],
      ['blur',    'Blur'],
      ['zoomBlur','Zoom blur'],
      ['swing',   'Swing'],
      ['roll',    'Roll'],
    ]},
  ];

  /* Looping behaviours. These run forever while the slide is shown, so
     every one of them is deliberately small — a slide where something
     jumps every two seconds is unwatchable behind a speaker. */
  const EMPHASIS = [
    ['none',     'None'],
    ['float',    'Float'],
    ['bob',      'Bob'],
    ['sway',     'Sway'],
    ['breathe',  'Breathe'],
    ['pulse',    'Pulse'],
    ['glow',     'Glow'],
    ['spin',     'Spin'],
    ['orbit',    'Orbit'],
    ['wobble',   'Wobble'],
    ['tick',     'Tilt'],
    ['shine',    'Shine'],
    ['flicker',  'Flicker'],
    ['levitate', 'Levitate'],
  ];

  const TRANSITIONS = [
    ['none',     'Cut'],
    ['fade',     'Fade'],
    ['slide',    'Slide'],
    ['push',     'Push'],
    ['zoom',     'Zoom'],
    ['zoomOut',  'Pull back'],
    ['blur',     'Blur'],
    ['iris',     'Iris'],
    ['cover',    'Cover'],
    ['reveal',   'Reveal'],
    ['flip',     'Flip'],
    ['swipeUp',  'Swipe up'],
    ['dissolve', 'Dissolve'],
    ['glitch',   'Glitch'],
  ];

  /* Speed presets, applied as a multiplier on the CSS durations. Exposed
     rather than a raw seconds field because "how fast" is a feel decision,
     not a numeric one, and a 4-second entrance is never the right answer. */
  const SPEEDS = [
    ['fast',   'Fast',   .6],
    ['normal', 'Normal', 1],
    ['slow',   'Slow',   1.6],
  ];

  const entranceKeys = () => ENTRANCES.flatMap(g => g.items.map(i => i[0]));
  const emphasisKeys = () => EMPHASIS.map(e => e[0]);
  const transitionKeys = () => TRANSITIONS.map(t => t[0]);

  const speedFactor = (key) => (SPEEDS.find(s => s[0] === key) || SPEEDS[1])[2];

  return { ENTRANCES, EMPHASIS, TRANSITIONS, SPEEDS, entranceKeys, emphasisKeys, transitionKeys, speedFactor };
})();
