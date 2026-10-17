/* ============================================================
   The deck: an ordered list of scenes and what you typed into
   them. Autosaved to this browser on every change; media lives in
   the Media store and is referenced, not copied.
   ============================================================ */

const Deck = (() => {
  const KEY = 'ascents.deck';
  let deck = null;
  const past = [];
  const subs = new Set();

  function starter() {
    return {
      v: 2, title: 'APEX Ascents 2027',
      scenes: ['countdownDay', 'openerPrism', 'statement', 'feature', 'productBlack', 'apps', 'live', 'thanks'].map(Scenes.make),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const d = raw && JSON.parse(raw);
      if (d && d.v === 2 && Array.isArray(d.scenes) && d.scenes.length) return (deck = d);
    } catch (e) { /* unreadable: start fresh */ }
    return (deck = starter());
  }

  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(deck)); }
      catch (e) { console.warn('[ascents] save failed', e); }
    }, 250);
  }

  /* Every change goes through here: one undo step, one save, one redraw.
     `quiet` changes (typing) skip the redraw — the stage already shows them. */
  function change(fn, { quiet = false, merge = null } = {}) {
    const snap = JSON.stringify(deck);
    if (!merge || past.length === 0 || past[past.length - 1].merge !== merge) {
      past.push({ snap, merge });
      if (past.length > 150) past.shift();
    }
    fn(deck);
    save();
    if (!quiet) subs.forEach(f => f());
  }

  function undo() {
    const p = past.pop();
    if (!p) return false;
    deck = JSON.parse(p.snap);
    save();
    subs.forEach(f => f());
    return true;
  }

  function replace(d) {
    past.push({ snap: JSON.stringify(deck), merge: null });
    deck = d;
    save();
    subs.forEach(f => f());
  }

  /* A deck file carries its media inline, so it opens anywhere. */
  async function exportFile() {
    const media = {};
    const refs = new Set();
    deck.scenes.forEach(s => (s.els || []).forEach(e => { if (e.ref && e.ref.startsWith('m:')) refs.add(e.ref); }));
    for (const r of refs) {
      const b = await Media.blob(r);
      if (b) media[r] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    }
    const blob = new Blob([JSON.stringify({ ...deck, media })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (deck.title || 'ascents').replace(/[^\w\- ]+/g, '').trim() + '.ascents.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importFile(file) {
    const d = JSON.parse(await file.text());
    if (!d || d.v !== 2 || !Array.isArray(d.scenes)) throw new Error('Not an Ascents deck file');
    const map = {};
    for (const [ref, url] of Object.entries(d.media || {})) {
      const b = await (await fetch(url)).blob();
      map[ref] = await Media.put(new File([b], 'media', { type: b.type }));
    }
    delete d.media;
    d.scenes.forEach(s => (s.els || []).forEach(e => { if (map[e.ref]) e.ref = map[e.ref]; }));
    replace(d);
  }

  return {
    get deck() { return deck; },
    load, change, undo, replace, starter, exportFile, importFile,
    canUndo: () => past.length > 0,
    subscribe: (f) => subs.add(f),
  };
})();
