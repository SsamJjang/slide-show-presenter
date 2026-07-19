/* Inline SVG icon set. No network, no font files — icons must never fail to load
   five minutes before you go on stage. */
const ICONS = (() => {
  const s = (d, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

  return {
    undo:    s('<path d="M3 10h11a5 5 0 0 1 0 10h-4"/><path d="M3 10l4-4M3 10l4 4"/>'),
    redo:    s('<path d="M21 10H10a5 5 0 0 0 0 10h4"/><path d="M21 10l-4-4M21 10l-4 4"/>'),
    text:    s('<path d="M5 6h14M12 6v13M9 19h6"/>'),
    shape:   s('<rect x="3" y="3" width="9" height="9" rx="1.5"/><circle cx="16.5" cy="16.5" r="4.5"/>'),
    image:   s('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>'),
    chart:   s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    code:    s('<path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/>'),
    table:   s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/>'),
    layout:  s('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'),
    palette: s('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.6 1.2-2 2.5-2H18a3 3 0 0 0 3-3c0-5-4-11.5-9-11.5Z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>'),
    key:     s('<circle cx="7.5" cy="12" r="3.5"/><path d="M11 12h10M17 12v3.5M20 12v2.5"/>'),
    export:  s('<path d="M12 15V3M12 3l-4 4M12 3l4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
    play:    s('<path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none"/>'),
    trash:   s('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/>'),
    copy:    s('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>'),
    up:      s('<path d="M12 19V5M12 5l-6 6M12 5l6 6"/>'),
    down:    s('<path d="M12 5v14M12 19l-6-6M12 19l6-6"/>'),
    lock:    s('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    eye:     s('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>'),
    plus:    s('<path d="M12 5v14M5 12h14"/>'),
    device:  s('<rect x="2" y="4" width="14" height="11" rx="1.6"/><path d="M2 8h14"/><rect x="17" y="9" width="5" height="11" rx="1.4"/>'),
    check:   s('<path d="M4 12.5l5 5 11-11"/>'),
  };
})();

/* Swap every ${icon:name} placeholder in the document (or a subtree) for real SVG.

   This walks TEXT nodes, not elements. Rewriting innerHTML on an ancestor
   would destroy and rebuild every descendant, silently orphaning the element
   references the other modules captured at load time — so only the exact text
   nodes holding a placeholder are ever touched. */
function hydrateIcons(root = document.body) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  let node;
  while ((node = walk.nextNode())) {
    if (node.nodeValue.includes('${icon:')) hits.push(node);
  }

  hits.forEach(text => {
    const frag = document.createDocumentFragment();
    const parts = text.nodeValue.split(/(\$\{icon:[a-z]+\})/);

    parts.forEach(part => {
      const m = part.match(/^\$\{icon:([a-z]+)\}$/);
      if (m) {
        const holder = document.createElement('span');
        holder.className = 'icon';
        holder.innerHTML = ICONS[m[1]] || '';
        const svg = holder.firstElementChild;
        if (svg) frag.appendChild(svg);
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    });

    text.replaceWith(frag);
  });
}

const icon = name => ICONS[name] || '';
