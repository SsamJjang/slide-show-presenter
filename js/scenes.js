/* ============================================================
   Scenes and elements.

   A scene is a field (the background) plus a list of elements you
   can move, resize, retype, add and delete. The Connect screens
   (opener, statement, feature card, live demo…) are starting
   layouts built from the same elements — rebuilt to the frame from
   the Connect 2025 broadcast — so you can start from one and make
   it your own, or start blank and compose.

   Element types:
     text       a line or block of type in one of the Connect styles
     lockup     icon + word, centred ("✦ Live AI", "∞ Meta")
     media      an image or video
     sculpture  a live, glossy organic form: twist, ribbon, lens,
                pebble, petal — or liquid (bodies that merge) and orb
     glow       a soft bloom of coloured light
     count      countdown numerals: smooth glossy blue
     pill       Live Demo / soft prompt / device tag

   Everything is organic on purpose: smooth forms, soft light, glossy
   colour. No outlines, wireframes, dotted lines or stripes.
   ============================================================ */

const Scenes = (() => {

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- the type system ----------
     Matched to the broadcast: one face, regular weight at display sizes,
     calm tracking. Sizes are in the 1920 × 1080 design space. */
  const TEXT_STYLES = {
    display:   { name: 'Display',   size: 176, weight: 400, lh: 1,    ls: -.02 },
    title:     { name: 'Title',     size: 124, weight: 400, lh: 1.04, ls: -.02 },
    statement: { name: 'Statement', size: 92,  weight: 400, lh: 1.12, ls: -.012 },
    heading:   { name: 'Heading',   size: 64,  weight: 400, lh: 1.12, ls: -.01 },
    body:      { name: 'Body',      size: 40,  weight: 400, lh: 1.32, ls: 0 },
    caption:   { name: 'Caption',   size: 30,  weight: 500, lh: 1.25, ls: 0 },
    number:    { name: 'Number',    size: 30,  weight: 500, lh: 1,    ls: .02 },
  };
  const COLORS = { auto: 'Auto', muted: 'Soft', blue: 'Blue', gloss: 'Gloss' };

  /* ---------- element factories ---------- */

  const E = {
    text: (text, style, x, y, w, more = {}) => ({ id: uid(), type: 'text', text, style, x, y, w, align: 'left', color: 'auto', ...more }),
    lockup: (text, glyph, x, y, w, more = {}) => ({ id: uid(), type: 'lockup', text, glyph, x, y, w, size: 96, ...more }),
    media: (x, y, w, h, more = {}) => ({ id: uid(), type: 'media', ref: '', x, y, w, h, fit: 'contain', round: false, ...more }),
    sculpture: (x, y, w, h, more = {}) => ({ id: uid(), type: 'sculpture', shape: 'twist', roll: 30, x, y, w, h, ...more }),
    count: (text, x, y, w, more = {}) => ({ id: uid(), type: 'count', text, x, y, w, size: 300, ...more }),
    glow: (x, y, w, h, more = {}) => ({ id: uid(), type: 'glow', tint: 'iris', x, y, w, h, ...more }),
    pill: (kind, text, x, y, more = {}) => ({ id: uid(), type: 'pill', kind, text, x, y, ...more }),
  };

  /* ---------- starting layouts ----------
     Each is one screen from the Connect 2025 keynote or identity. */
  const LAYOUTS = {
    blank:     { name: 'Blank', group: 'Start', field: 'navy', els: () => [] },
    countdown: { name: 'Countdown', group: 'Open', field: 'navy', hint: 'Counts down live while presenting.',
      els: () => [E.glow(-300, -360, 1300, 1100, { tint: 'violet' }), E.sculpture(-200, -260, 1000, 900, { shape: 'liquid', roll: 0, seed: 2 }),
                  E.count('05:00', 0, 380, 1920)] },
    countdownDay: { name: 'Countdown · daylight', group: 'Open', field: 'ice', hint: 'Connect 2024: giant numerals, silk pouring through.',
      els: () => [
        E.count('05:00', -120, 200, 2160, { size: 720, tone: 'ink' }),
        E.sculpture(-200, 340, 2320, 900, { shape: 'silk', roll: 78 }),
        E.sculpture(1180, -160, 900, 700, { shape: 'plume', roll: 30 })] },
    openerPrism: { name: 'Opener · prism stone', group: 'Open', field: 'ice', fx: 'open', hint: 'Connect 2022: white stone in moving prism light.',
      els: () => [
        E.sculpture(780, 60, 1240, 1100, { shape: 'stone', roll: 0 }),
        E.sculpture(-260, 420, 1100, 900, { shape: 'arch', roll: -8 }),
        E.text('APEX\nAscents', 'display', 150, 180, 900),
        E.text('2027', 'heading', 156, 560, 600, { color: 'muted' })] },
    opener:    { name: 'Opener', group: 'Open', field: 'navy', fx: 'open', hint: 'Liquid colour swells and opens onto this title.',
      els: () => [
        E.sculpture(560, 150, 900, 880, { roll: 34 }),
        E.text('APEX', 'display', 150, 160, 900), E.text('Ascents', 'display', 1010, 420, 860), E.text('2027', 'display', 150, 690, 700)] },
    title:     { name: 'Title card', group: 'Open', field: 'navy',
      els: () => [
        E.sculpture(560, 150, 900, 880, { roll: 34 }),
        E.text('APEX', 'display', 150, 160, 900), E.text('Ascents', 'display', 1010, 420, 860), E.text('2027', 'display', 150, 690, 700)] },
    brand:     { name: 'Brand card', group: 'Open', field: 'white', footer: false,
      els: () => [E.lockup('APEX', 'mark', 0, 474, 1920, { size: 112 })] },
    statement: { name: 'Statement', group: 'Talk', field: 'navy',
      els: () => [
        E.text('01', 'number', 0, 398, 1920, { align: 'center', color: 'muted' }),
        E.text('Technology should get\nout of the way.', 'statement', 0, 454, 1920, { align: 'center' })] },
    feature:   { name: 'Feature card', group: 'Talk', field: 'pale', footer: false,
      els: () => [E.lockup('Live AI', 'spark', 0, 482, 1920)] },
    speaker:   { name: 'Speaker', group: 'Talk', field: 'navy',
      els: () => [
        E.sculpture(1080, -120, 980, 1320, { shape: 'ribbon', roll: 18 }),
        E.text('Your Name', 'display', 140, 400, 1300), E.text('Founder, APEX', 'body', 146, 610, 900, { color: 'muted' })] },
    quote:     { name: 'Quote', group: 'Talk', field: 'navy',
      els: () => [
        E.text('“The fastest way to\nfind your people.”', 'statement', 0, 400, 1920, { align: 'center' }),
        E.text('A student, Grade 11', 'body', 0, 650, 1920, { align: 'center', color: 'muted' })] },
    productBlack: { name: 'Product on black', group: 'Product', field: 'black',
      els: () => [E.media(120, 80, 1680, 920)] },
    productWhite: { name: 'Product on white', group: 'Product', field: 'white',
      els: () => [E.media(120, 80, 1680, 920)] },
    price:     { name: 'Availability', group: 'Product', field: 'grey',
      els: () => [
        E.media(-40, 20, 620, 420), E.media(1320, -30, 660, 430), E.media(20, 650, 640, 450), E.media(1260, 660, 700, 440),
        E.text('Available now\nFree for students', 'title', 0, 410, 1920, { align: 'center' })] },
    apps:      { name: 'App screens', group: 'Product', field: 'black',
      els: () => ['Feed', 'Lounges', 'Polls', 'Chat', 'Profile'].flatMap((nm, i) => {
        const x = 150 + i * 332;
        return [E.text(nm, 'caption', x, 150, 290, { align: 'center', color: 'muted' }), E.media(x, 212, 290, 628, { fit: 'cover', round: true })];
      }) },
    collage:   { name: 'Collage', group: 'Product', field: 'navy',
      els: () => [
        E.media(120, 110, 330, 240, { fit: 'cover', round: true }), E.media(560, 70, 260, 340, { fit: 'cover', round: true }),
        E.media(1180, 90, 430, 280, { fit: 'cover', round: true }), E.media(1660, 300, 220, 300, { fit: 'cover', round: true }),
        E.media(330, 560, 300, 380, { fit: 'cover', round: true }), E.media(880, 660, 440, 300, { fit: 'cover', round: true }),
        E.media(1430, 640, 330, 330, { fit: 'cover', round: true }),
        E.pill('soft', 'Create anything…', 790, 478)] },
    live:      { name: 'Live demo', group: 'Demo', field: 'navy',
      els: () => [
        E.pill('live', 'Live Demo', 64, 56),
        E.media(740, 96, 440, 888, { fit: 'cover', round: true }),
        E.pill('tag', 'APEX for iPhone', 872, 122)] },
    video:     { name: 'Full-bleed video', group: 'Demo', field: 'black', footer: false,
      els: () => [E.media(0, 0, 1920, 1080, { fit: 'cover' })] },
    thanks:    { name: 'Thank you', group: 'Close', field: 'navy',
      els: () => [
        E.sculpture(-60, 400, 2040, 760, { shape: 'ribbon', roll: 96 }),
        E.text('Thank\nyou', 'display', 0, 300, 1920, { align: 'center', size: 230 })] },
  };

  /* ---------- what "+ Element" offers ---------- */
  const INSERTS = [
    { name: 'Display', make: () => E.text('Display', 'display', 160, 420, 1400) },
    { name: 'Title', make: () => E.text('A title', 'title', 160, 440, 1400) },
    { name: 'Statement', make: () => E.text('A statement, centred.', 'statement', 0, 480, 1920, { align: 'center' }) },
    { name: 'Heading', make: () => E.text('A heading', 'heading', 160, 460, 1200) },
    { name: 'Body', make: () => E.text('Supporting text, in one or two lines.', 'body', 160, 500, 1000, { color: 'muted' }) },
    { name: 'Caption', make: () => E.text('Caption', 'caption', 160, 520, 600) },
    { name: 'Number', make: () => E.text('01', 'number', 0, 400, 1920, { align: 'center', color: 'muted' }) },
    { name: 'Icon + word', make: () => E.lockup('Feature', 'spark', 0, 482, 1920) },
    { name: 'Image or video', make: () => E.media(560, 240, 800, 600, { round: true, fit: 'cover' }) },
    { name: 'Sculpture', make: () => E.sculpture(560, 140, 800, 800) },
    { name: 'Ribbon', make: () => E.sculpture(260, 200, 1400, 700, { shape: 'ribbon', roll: 92 }) },
    { name: 'Lens', make: () => E.sculpture(660, 240, 600, 600, { shape: 'lens', roll: 20 }) },
    { name: 'Pebble', make: () => E.sculpture(660, 240, 600, 600, { shape: 'pebble', roll: 10 }) },
    { name: 'Petal', make: () => E.sculpture(560, 140, 800, 800, { shape: 'petal', roll: 40 }) },
    { name: 'Liquid', make: () => E.sculpture(460, 140, 1000, 800, { shape: 'liquid', roll: 0, seed: 1 }) },
    { name: 'Orb', make: () => E.sculpture(760, 340, 400, 400, { shape: 'orb', roll: 0 }) },
    { name: 'Glow', make: () => E.glow(460, 140, 1000, 800) },
    { name: 'Silk', make: () => E.sculpture(0, 240, 1920, 760, { shape: 'silk', roll: 80 }) },
    { name: 'Plume', make: () => E.sculpture(560, 140, 800, 800, { shape: 'plume', roll: 30 }) },
    { name: 'Stone', make: () => E.sculpture(560, 140, 800, 800, { shape: 'stone', roll: 0 }) },
    { name: 'Stone arch', make: () => E.sculpture(460, 140, 1000, 800, { shape: 'arch', roll: 0 }) },
    { name: 'Glass slab', make: () => E.sculpture(460, 140, 1000, 800, { shape: 'glass', roll: 0 }) },
    { name: 'Frosted lens', make: () => E.sculpture(660, 240, 600, 600, { shape: 'frost', roll: 20 }) },
    { name: 'Countdown', make: () => E.count('05:00', 0, 380, 1920) },
    { name: 'Live pill', make: () => E.pill('live', 'Live Demo', 64, 56) },
    { name: 'Prompt pill', make: () => E.pill('soft', 'Ask anything…', 800, 500) },
    { name: 'Tag', make: () => E.pill('tag', 'APEX for iPhone', 860, 140) },
  ];

  /* ---------- element rendering ---------- */

  const SPARK = 'M10 2.5c.55 4.3 2.45 6.2 6.75 6.75-4.3.55-6.2 2.45-6.75 6.75-.55-4.3-2.45-6.2-6.75-6.75 4.3-.55 6.2-2.45 6.75-6.75zM18.2 13.6c.27 2 1.13 2.86 3.13 3.13-2 .27-2.86 1.13-3.13 3.13-.27-2-1.13-2.86-3.13-3.13 2-.27 2.86-1.13 3.13-3.13zM17.6 2.8c.18 1.35.78 1.95 2.13 2.13-1.35.18-1.95.78-2.13 2.13-.18-1.35-.78-1.95-2.13-2.13 1.35-.18 1.95-.78 2.13-2.13z';

  let n = 0;
  const box = (e) => `left:${e.x}px;top:${e.y}px;` + (e.w != null ? `width:${e.w}px;` : '') + (e.h != null ? `height:${e.h}px;` : '');

  function body(e, still = false) {
    switch (e.type) {
      case 'text': {
        const st = TEXT_STYLES[e.style] || TEXT_STYLES.body;
        const size = e.size || st.size;
        return `<div class="txt c-${e.color || 'auto'}" data-edit style="font-size:${size}px;font-weight:${st.weight};` +
          `line-height:${st.lh};letter-spacing:${st.ls}em;text-align:${e.align || 'left'}">${esc(e.text)}</div>`;
      }
      case 'lockup': {
        const isMark = e.glyph === 'mark';
        const s = e.size || 96;
        const icon = isMark
          ? `<img class="logo" src="assets/apex.png" alt="APEX" style="height:${Math.round(s * 1.05)}px;width:auto">`
          : `<svg viewBox="0 0 24 24" style="height:${Math.round(s * .95)}px"><path d="${SPARK}" fill="currentColor"/></svg>`;
        return `<div class="lock${isMark ? ' brand' : ''}" style="font-size:${s}px">${icon}<span data-edit>${esc(e.text)}</span></div>`;
      }
      case 'media': {
        const src = Media.url(e.ref);
        if (!src) return `<div class="ph"><span>Image or video<br><small>double-click or drop a file</small></span></div>`;
        // Thumbnails show a still first frame; only the stage and the player play.
        if (Media.kind(e.ref) === 'video') {
          return still
            ? `<video src="${src}#t=0.1" muted playsinline preload="metadata" draggable="false" style="object-fit:${e.fit}"></video>`
            : `<video src="${src}" muted loop playsinline autoplay draggable="false" style="object-fit:${e.fit}" ` +
              `onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',innerHTML:'<span>This video can’t play in a browser.<br><small>Export it as MP4 (H.264) and drop it in again.</small></span>'}))"></video>`;
        }
        return `<img src="${src}" alt="" draggable="false" style="object-fit:${e.fit}">`;
      }
      case 'sculpture': {
        const opts = { shape: e.shape, roll: e.roll, size: e.size || .92, seed: e.seed || 0 };
        const still = Sculpture.still(opts, e.w, e.h);
        return `<div class="sculpt" data-sculpt="${esc(JSON.stringify(opts))}">${still ? `<img src="${still}" alt="">` : ''}</div>`;
      }
      case 'count': return countSVG(e);
      case 'glow': return `<div class="glow g-${e.tint || 'iris'}"></div>`;
      case 'pill':
        return `<div class="pill pill-${e.kind}">${e.kind === 'soft' ? `<svg viewBox="0 0 24 24"><path d="${SPARK}" fill="currentColor"/></svg>` : ''}` +
          `<span data-edit>${esc(e.text)}</span></div>`;
    }
    return '';
  }

  /* Countdown numerals: a smooth glossy blue body (cyan crown, royal
     middle, violet base) with a soft sheen across the top. */
  function countSVG(e) {
    const id = 'cg' + (++n);
    const size = e.size || 300;
    const h = Math.round(size * 1.05);
    const t = esc(e.text);
    const ink = e.tone === 'ink';
    const text = (cls, fill, extra = '') =>
      `<text class="${cls}" x="50%" y="${Math.round(size * .86)}" text-anchor="middle" font-size="${size}" fill="${fill}"${extra}>${t}</text>`;
    return `<svg class="count" viewBox="0 0 ${e.w} ${h}" width="${e.w}" height="${h}" overflow="visible" data-countdown>` +
      `<defs>` +
        `<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="#c9f0ff"/><stop offset=".22" stop-color="#77c6ff"/>` +
          `<stop offset=".5" stop-color="#3f86ff"/><stop offset=".78" stop-color="#2d55ec"/><stop offset="1" stop-color="#6a4fe6"/></linearGradient>` +
        `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity=".06"/>` +
          `<stop offset=".43" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `</defs>` +
      `<g class="cnt-fill">${ink ? text('cf', '#0f1b2d') : text('cf', `url(#${id}f)`) + text('cs', `url(#${id}s)`)}</g>` +
      `</svg>`;
  }

  /* ---------- scene rendering ---------- */

  const FIELD = (f) => `<div class="field field-${f}"><i></i><i></i><i></i></div>`;
  const LIGHT = new Set(['white', 'grey', 'ice']);   // pale keeps white type, as the Live AI card

  /* Arrival order: graphics first, then everything else in reading order. */
  function order(els) {
    const art = (e) => ['sculpture', 'glow'].includes(e.type) ? 1 : 0;
    return [...els].sort((a, b) => (art(b) - art(a)) || (Math.round(a.y / 40) - Math.round(b.y / 40)) || (a.x - b.x));
  }

  function elHTML(e, ord, still = false) {
    const media = e.type === 'media' ? (e.round ? ' round' : '') + (Media.url(e.ref) ? '' : ' empty') : '';
    return `<div class="el el-${e.type}${media}" data-id="${e.id}" data-in style="--o:${ord.indexOf(e)};${box(e)}">${body(e, still)}</div>`;
  }

  function html(scene, { still = false } = {}) {
    const field = scene.field || 'navy';
    const ord = order(scene.els || []);
    return `<div class="scene${LIGHT.has(field) ? ' light' : ''}${scene.fx === 'open' ? ' opener' : ''}${still ? ' still' : ''}">` +
      FIELD(field) + (scene.fx === 'open' ? openerFx() : '') +
      (scene.els || []).map(e => elHTML(e, ord, still)).join('') +
      (scene.footer !== false ? `<div class="foot"><b><i class="mark"></i>APEX</b><span>APEX Ascents</span></div>` : '') +
      `</div>`;
  }

  function mount(boxEl, scene, opts = {}) {
    const w = boxEl.clientWidth || 320;
    boxEl.innerHTML = `<div class="scene-host" style="transform:scale(${w / 1920})">${html(scene, opts)}</div>`;
    return boxEl.firstElementChild;
  }

  function make(layout = 'blank') {
    const l = LAYOUTS[layout] || LAYOUTS.blank;
    return { id: uid(), layout, field: l.field, fx: l.fx || null, footer: l.footer !== false, els: l.els(), notes: '' };
  }

  /* ---------- the open ----------
     Liquid colour swells out of the field, its bodies drift together and
     merge, and as it blooms past the edges the scene is there underneath.
     The player brings the liquid to life; here it is only a place for it. */
  const openerFx = () => `<div class="op-liquid" aria-hidden="true"></div><div class="op-glow" aria-hidden="true"></div>`;

  const FIELDS = [['navy', 'Navy'], ['ice', 'Ice'], ['pale', 'Pale'], ['pastel', 'Daylight'], ['grey', 'Grey'], ['black', 'Black'], ['white', 'White']];

  return { LAYOUTS, INSERTS, TEXT_STYLES, COLORS, FIELDS, E, html, elHTML, body, order, mount, make, esc, uid };
})();
