/* ============================================================
   Media store.

   Images and videos live in IndexedDB, not in the deck JSON, so a
   deck full of screenshots and screen recordings never runs into
   the few megabytes localStorage allows. The deck only holds a
   reference ("m:<id>"); this module turns references into object
   URLs, loading them once and keeping them for the session.
   ============================================================ */

const Media = (() => {
  const DB = 'ascents-media', STORE = 'files';
  const urls = new Map();          // id -> object URL
  const kinds = new Map();         // id -> 'image' | 'video'
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };

  /* Large photos are scaled to 2400px on the long side — sharper than any
     projector, a fraction of a phone photo's size. Videos are kept as-is. */
  /* Animated WebP (an ANIM chunk) and animated PNG (an acTL chunk) look
     like ordinary images by type; redrawing them through a canvas would
     keep only the first frame, so they are stored exactly as uploaded. */
  async function animated(file) {
    if (!/image\/(webp|png)/.test(file.type)) return false;
    const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    const tag = file.type === 'image/webp' ? [65, 78, 73, 77] : [97, 99, 84, 76];   // 'ANIM' / 'acTL'
    for (let i = 0; i < head.length - 4; i++) {
      if (head[i] === tag[0] && head[i + 1] === tag[1] && head[i + 2] === tag[2] && head[i + 3] === tag[3]) return true;
    }
    return false;
  }

  async function shrink(file) {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
    if (await animated(file)) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const png = /png|webp/.test(file.type);
    return await new Promise(r => c.toBlob(r, png ? 'image/webp' : 'image/jpeg', .9));
  }

  async function put(file) {
    const blob = await shrink(file);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await tx('readwrite', s => s.put(blob, id));
    urls.set(id, URL.createObjectURL(blob));
    kinds.set(id, blob.type.startsWith('video/') ? 'video' : 'image');
    return 'm:' + id;
  }

  async function load(ref) {
    const id = ref.slice(2);
    if (urls.has(id)) return;
    const blob = await tx('readonly', s => s.get(id));
    if (!blob) return;
    urls.set(id, URL.createObjectURL(blob));
    kinds.set(id, blob.type.startsWith('video/') ? 'video' : 'image');
  }

  /* Make every reference in a deck available before it renders. */
  async function preload(deck) {
    const refs = new Set();
    deck.scenes.forEach(s => (s.els || []).forEach(e => { if (e.ref && e.ref.startsWith('m:')) refs.add(e.ref); }));
    await Promise.all([...refs].map(r => load(r).catch(() => {})));
  }

  const url = (ref) => ref && ref.startsWith('m:') ? urls.get(ref.slice(2)) || '' : (ref || '');
  const kind = (ref) => ref && ref.startsWith('m:') ? kinds.get(ref.slice(2)) || 'image' : 'image';

  /* For export: the raw blob behind a reference. */
  const blob = (ref) => tx('readonly', s => s.get(ref.slice(2)));

  return { put, load, preload, url, kind, blob };
})();
