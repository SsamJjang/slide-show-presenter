/* ============================================================
   Renderer.

   ONE function draws a slide, everywhere: editor canvas, rail
   thumbnails, presenter view, exported HTML, print/PDF. If the
   thumbnail and the projector ever disagree, it's a bug in here
   and nowhere else — which is the whole point of centralising it.
   ============================================================ */

const Render = (() => {

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Text with **bold**, *italic*, `code` and {accent} spans.
     Deliberately tiny — a presentation is not a document. */
  function richText(raw) {
    return esc(raw)
      .replace(/\{([^}]+)\}/g, '<span class="ac">$1</span>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  /* drop-shadow() takes <x> <y> <blur> <color> — it has NO spread parameter.
     A four-length value (the box-shadow habit) is invalid, and one invalid
     function voids the entire filter property, which is why shadows silently
     did nothing. Three lengths only. */
  const SHADOWS = {
    none: 'none',
    soft: '0 6px 16px rgba(0,0,0,.28)',
    lifted: '0 16px 34px rgba(0,0,0,.42)',
    dramatic: '0 32px 64px rgba(0,0,0,.62)',
    glow: '0 0 40px var(--glow)',
    // Connect product lighting: a cool blue rim, as if lit from behind on a
    // dark stage. One shadow, wide and saturated.
    rim: '0 0 70px rgba(47,107,255,.55)',
  };

  function elementStyle(el) {
    const st = [
      `left:${el.x}px`, `top:${el.y}px`,
      `width:${el.w}px`, `height:${el.h}px`,
      `opacity:${el.opacity}`,
    ];
    if (el.rot) st.push(`transform:rotate(${el.rot}deg)`);
    if (el.shadow && el.shadow !== 'none') st.push(`filter:drop-shadow(${SHADOWS[el.shadow]})`);
    return st.join(';');
  }

  /* ---------- per-type body renderers ---------- */

  function renderText(el) {
    const st = [
      `font-size:${el.size}px`,
      `font-weight:${el.weight}`,
      `text-align:${el.align}`,
      `line-height:${el.lineHeight}`,
      `letter-spacing:${el.letterSpacing}em`,
      `justify-content:${{ top: 'flex-start', middle: 'center', bottom: 'flex-end' }[el.valign]}`,
    ];
    if (el.color) st.push(`color:${el.color}`);
    if (el.italic) st.push('font-style:italic');
    if (el.uppercase) st.push('text-transform:uppercase');
    const finish = el.finish || (el.gradient ? 'gradient' : 'none');
    const cls = 'e-text role-' + el.role + (finish !== 'none' ? ' finish-' + finish : '');
    /* One inner block, so the flex column that does vertical alignment sees a
       single child. Without it every {accent} or **bold** span became its own
       flex item and stacked on a line of its own. */
    return `<div class="${cls}" style="${st.join(';')}"><div class="tx">${richText(el.text)}</div></div>`;
  }

  /* Every shape is a generated path in the element's own pixel box, so
     stroke widths and corner radii stay true instead of being sheared by a
     stretched viewBox. Material (glass / liquid glass) is a DOM layer
     clipped to that same path. */
  function renderShape(el) {
    /* Palette names resolve through --fill-*; anything else is a literal
       colour. Wrapping a literal in var() made '--fill-#e5243b' — not a valid
       custom property name, so the whole value was dropped and every hex or
       rgba fill silently painted black. */
    const paint = (v, none) => !v ? none
      : /^[a-z][a-z0-9]*$/i.test(v) && v !== 'transparent' ? `var(--fill-${v}, ${v})` : v;
    const fill = paint(el.fill, 'transparent');
    const stroke = paint(el.stroke, 'none');
    const sw = el.strokeWidth || 0;
    const w = Math.max(el.w || 1, 1), h = Math.max(el.h || 1, 1);
    const d = Shapes.path(el);

    // A material panel can't be painted by SVG fill — it needs backdrop
    // filters, so it's a div clipped to the path.
    if (el.material && el.material !== 'none') {
      const cls = el.material === 'liquid' ? 'e-liquid' : 'e-shape glass';
      // clip-path referencing a path() needs the same coordinate space.
      const clip = `clip-path:path('${d}');-webkit-clip-path:path('${d}')`;
      return `<div class="${cls} clipped" style="${clip}"></div>`;
    }

    return `<svg class="e-shape" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      <path d="${d}" fill="${fill}"
        ${sw ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}
        ${sw && el.dash ? `stroke-dasharray="${esc(el.dash)}" stroke-linecap="round"` : ''}/>
    </svg>`;
  }

  function renderImage(el) {
    if (!el.src) {
      return `<div class="e-image empty"><span>${icon('image')}<br>Drop an image, or paste a URL</span></div>`;
    }
    return `<img class="e-image" src="${esc(el.src)}" alt="${esc(el.alt)}"
      style="object-fit:${el.fit};border-radius:${el.radius}px">`;
  }

  const CODE_RULES = [
    [/(\/\/[^\n]*|#[^\n]*)/g, 'c-com'],
    [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, 'c-str'],
    [/\b(const|let|var|function|return|if|else|for|while|class|new|await|async|import|from|export|def|self|None|True|False|null|true|false)\b/g, 'c-kw'],
    [/\b(\d+\.?\d*)\b/g, 'c-num'],
  ];

  function renderCode(el) {
    /* Tokenise, then wrap. Each match is parked in a stash and replaced by a
       placeholder, so a rule that runs later can't re-match text an earlier
       rule already claimed.

       Two things about the placeholder are load-bearing, and both were wrong:

       - The marker is U+0000, because it cannot occur in source code, but it
         is written as an ESCAPE rather than as a literal byte. A raw NUL in
         the file makes git classify this whole module as binary, and a module
         whose diff reads "Bin 9884 -> 10826 bytes" can never be reviewed.

       - The index is prefixed with a letter. U+0000 is not a word character,
         so a bare marker-digits-marker placeholder put word boundaries on
         either side of its own index -- and the last rule in the list matches
         \b\d+\b. The number rule was therefore highlighting the placeholders,
         which split them, which meant the final restore pass matched nothing:
         every comment, string and keyword silently vanished into the stash
         and never came back, leaving stray digits and invisible control
         characters on the slide in their place. With a letter in front there
         is no word boundary before the digits.

       Quotes are deliberately NOT escaped here. This text goes into a text
       node, never an attribute, so a literal double quote is safe -- and
       escaping it to &quot; meant the string rule could never match a
       double-quoted string in any language. */
    const escCode = (t) => String(t ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let out = escCode(el.code);
    const stash = [];
    CODE_RULES.forEach(([re, cls]) => {
      out = out.replace(re, (m) => {
        stash.push(`<span class="${cls}">${m}</span>`);
        return `\u0000t${stash.length - 1}\u0000`;
      });
    });
    out = out.replace(/\u0000t(\d+)\u0000/g, (_, i) => stash[+i]);

    const lines = out.split('\n');
    const body = el.showLines
      ? lines.map((l, i) => `<span class="c-ln">${String(i + 1).padStart(2, ' ')}</span>${l || ' '}`).join('\n')
      : out;

    return `<pre class="e-code" style="font-size:${el.size}px"><code>${body}</code></pre>`;
  }

  function renderTable(el) {
    const head = `<tr>${el.head.map(h => `<th>${richText(h)}</th>`).join('')}</tr>`;
    const rows = el.rows.map(r => `<tr>${r.map(c => `<td>${richText(c)}</td>`).join('')}</tr>`).join('');
    return `<table class="e-table" style="font-size:${el.size}px"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  }

  /* Device frames. Product shots sitting in a real chrome read as a shipped
     product; the same screenshot floating on a slide reads as a wireframe. */
  function renderMockup(el) {
    const shot = el.src
      ? `<img class="mk-shot" src="${esc(el.src)}" alt="">`
      : `<div class="mk-shot empty">${icon('image')}</div>`;

    if (el.kind === 'phone') {
      return `<div class="e-mockup mk-phone">
        <div class="mk-screen">${shot}</div>
        <div class="mk-notch"></div>
      </div>`;
    }

    if (el.kind === 'window') {
      return `<div class="e-mockup mk-window" style="border-radius:${el.radius}px">
        <div class="mk-bar"><i></i><i></i><i></i></div>
        <div class="mk-screen">${shot}</div>
      </div>`;
    }

    // browser
    return `<div class="e-mockup mk-browser" style="border-radius:${el.radius}px">
      <div class="mk-bar">
        <i></i><i></i><i></i>
        <div class="mk-url">${esc(el.url)}</div>
      </div>
      <div class="mk-screen">${shot}</div>
    </div>`;
  }

  /* Just the inner content of an element, with no wrapper. Lets the editor
     refresh what an element *says* without replacing the node itself — which
     would restart its animations and drop keyboard focus. */
  function elementBody(el) {
    switch (el.type) {
      case 'text':   return renderText(el);
      case 'shape':  return renderShape(el);
      case 'image':  return renderImage(el);
      case 'code':   return renderCode(el);
      case 'table':  return renderTable(el);
      case 'chart':  return Charts.render(el);
      case 'mockup': return renderMockup(el);
      case 'icon':   return Connect.renderIcon(el);
      case 'sculpture': return Kit.renderSculpture(el);
      case 'lens':      return Kit.renderLens(el);
      case 'wires':     return Kit.renderWires(el);
      case 'bands':     return Kit.renderBands(el);
      case 'halftone':  return Kit.renderHalftone(el);
      default:       return '';
    }
  }

  function renderElement(el, opts) {
    if (el.hidden) return '';
    const body = elementBody(el);
    const buildAttr = el.build > 0 ? ` data-build="${el.build}"` : '';
    // Geometry and match key travel with the markup so the exported player can
    // run Magic Move without shipping the deck model alongside it.
    const mmKey = typeof Continuity !== 'undefined' ? Continuity.keyFor(el) : null;
    // data-rot travels too: a matched element that is rotated has to keep its
    // rotation while it flies, and the exported player has no deck model to
    // look it up in.
    const mm = mmKey
      ? ` data-mm="${esc(mmKey)}" data-x="${el.x}" data-y="${el.y}" data-w="${el.w}" data-h="${el.h}"` +
        ` data-rot="${el.rot || 0}"`
      : '';
    const animAttr = ` data-anim="${el.anim || 'rise'}" data-emph="${el.emphasis || 'none'}"`;
    // --i drives the entrance stagger; index order is paint order.
    const sp = Motion.speedFactor(el.animSpeed || 'normal');
    const stagger = ` style="--i:${opts.index ?? 0};--sp:${sp};${elementStyle(el)}"`;
    /* Three nested nodes so the three motion layers each own one `transform`
       instead of overwriting each other's — see the note in slide-css.js.
       .el is geometry, .el-anim is the entrance, .el-emph is the loop. */
    return `<div class="el el-${el.type}" data-id="${el.id}"${buildAttr}${animAttr}${mm}${stagger}>` +
           `<div class="el-anim"><div class="el-emph">${body}</div></div></div>`;
  }

  /* The node that carries an element's content — everything inside the motion
     layers. Anything replacing an element's markup in place must target this,
     not .el, or it will delete the layers along with the old body. */
  const bodyNode = (elNode) => elNode.querySelector('.el-emph') || elNode;

  /* ---------- slide ---------- */

  function slideHTML(slide, deck, opts = {}) {
    const bg = slide.bg ? ` style="background:${slide.bg}"` : '';
    const layers = Backgrounds.html(slide);
    const els = slide.elements
      .map((el, index) => renderElement(el, { ...opts, index })).join('');
    // The form sits between the field and the content. Surfaces that run the
    // live form (presentation, export) ask for it to be left out.
    const form = opts.noForm ? '' : Connect.formHTML(slide);
    const chrome = Connect.chromeHTML(deck, slide)
      .replace('class="slide-chrome"', `class="slide-chrome${Connect.chromeDark(slide) ? ' tone-dark' : ''}"`);
    return `<div class="slide"${bg}>${layers}${form}${els}${chrome}</div>`;
  }

  /* Build a live DOM node sized to `scale`. */
  function slideNode(slide, deck, { scale = 1, build = Infinity, noForm = false } = {}) {
    const host = document.createElement('div');
    host.className = 'slide-host';
    host.style.width = DESIGN_W + 'px';
    host.style.height = DESIGN_H + 'px';
    host.style.transform = `scale(${scale})`;
    host.innerHTML = slideHTML(slide, deck, { noForm });
    applyBuild(host, build);
    return host;
  }

  /* Reveal-on-click: elements with data-build above the current step
     are held back. Step Infinity shows everything (thumbnails, export). */
  function applyBuild(host, step) {
    host.querySelectorAll('.el[data-build]').forEach(node => {
      const b = +node.dataset.build;
      node.classList.toggle('build-hidden', b > step);
    });
  }

  const maxBuild = (slide) =>
    slide.elements.reduce((m, e) => Math.max(m, e.build || 0), 0);

  return { slideHTML, slideNode, elementBody, bodyNode, applyBuild, maxBuild, richText, esc, SHADOWS };
})();
