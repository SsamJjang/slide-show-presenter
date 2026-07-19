/* ============================================================
   Persistence.

   Autosave is not a nicety here — the failure mode is "browser
   crashed the night before the talk". Everything is written to
   localStorage on a debounce, plus a rolling backup slot so a
   corrupt write can't take the only copy with it.
   ============================================================ */

const Persist = (() => {
  const KEY = 'apexdeck.current';
  const BACKUP = 'apexdeck.backup';
  let timer = null;
  let lastGood = null;

  function save(deck) {
    try {
      const json = JSON.stringify(deck);
      // Promote the previous known-good save to backup before overwriting.
      if (lastGood) localStorage.setItem(BACKUP, lastGood);
      localStorage.setItem(KEY, json);
      lastGood = json;
      return true;
    } catch (err) {
      // Quota is the realistic failure: base64 images in a big deck.
      console.warn('[apexdeck] autosave failed:', err);
      return false;
    }
  }

  function saveDebounced(deck, onDone) {
    clearTimeout(timer);
    timer = setTimeout(() => onDone?.(save(deck)), 600);
  }

  function load() {
    for (const key of [KEY, BACKUP]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const deck = JSON.parse(raw);
        if (deck && Array.isArray(deck.slides) && deck.slides.length) {
          return migrate(deck);
        }
      } catch (err) {
        console.warn(`[apexdeck] ${key} unreadable, trying next`, err);
      }
    }
    return null;
  }

  /* Forward-compat: old decks get missing fields filled rather than rejected. */
  function migrate(deck) {
    deck.version = deck.version || 1;
    deck.ratio = deck.ratio || '16:9';
    deck.theme = THEMES[deck.theme] ? deck.theme : 'obsidian';
    deck.harmony ||= 'analogous';
    deck.accent ??= null;
    deck.slides.forEach(s => {
      s.id ||= uid();
      s.transition ||= 'fade';
      s.notes ??= '';
      s.bgPreset ||= 'none';
      s.bgMotion ||= 'drift';
      s.bgSpeed ||= 1;
      s.bgGrain ??= false;
      s.bgVignette ??= false;
      s.elements ||= [];
      s.elements.forEach(e => {
        e.id ||= uid();
        e.opacity ??= 1;
        e.rot ??= 0;
        e.build ??= 0;
        e.shadow ??= 'none';
        // v2 additions. Older elements default to no motion so reopening an
        // existing deck doesn't silently start animating in a way its author
        // never chose — new elements opt in via the model default.
        e.anim ??= 'none';
        e.emphasis ??= 'none';
        e.animSpeed ||= 'normal';
        // The old boolean glass flag became a named material.
        if (e.material === undefined) e.material = e.glass ? 'glass' : 'none';
        delete e.glass;
        // v1 carried a boolean; v2 has a named finish.
        if (e.finish === undefined) e.finish = e.gradient ? 'gradient' : 'none';
        delete e.gradient;
      });
    });
    return deck;
  }

  const clear = () => { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP); };

  return { save, saveDebounced, load, migrate, clear };
})();
