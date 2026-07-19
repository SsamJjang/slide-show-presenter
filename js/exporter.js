/* ============================================================
   Export / import.

   Three ways out, in order of how much you should trust them:
     .json  — lossless, reopens in this editor
     .html  — one self-contained file, plays anywhere, no editor
     PDF    — via the browser's print dialog, one slide per page
   ============================================================ */

const Exporter = (() => {

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    // Revoke on the next tick — revoking synchronously races the download in Safari.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const safeName = (s) => (s || 'deck').replace(/[^\w\-]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  /* ---------- JSON ---------- */

  function exportJSON() {
    download(safeName(Store.deck.title) + '.json',
      JSON.stringify(Store.deck, null, 2), 'application/json');
    App.toast('Deck exported as JSON');
  }

  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const deck = JSON.parse(r.result);
        if (!deck || !Array.isArray(deck.slides)) throw new Error('Not a deck file');
        Store.deck = Persist.migrate(deck);
        App.toast(`Loaded "${deck.title || 'deck'}" — ${deck.slides.length} slides`);
      } catch (err) {
        App.toast('That file isn\'t a valid deck: ' + err.message, 'err');
      }
    };
    r.onerror = () => App.toast('Could not read that file', 'err');
    r.readAsText(file);
  }

  /* ---------- standalone HTML ---------- */

  async function inlineCSS() {
    // Fetch our own stylesheets so the export is genuinely self-contained.
    const files = ['css/themes.css'];
    const parts = await Promise.all(files.map(async f => {
      try { return await (await fetch(f)).text(); }
      catch { return ''; }
    }));
    return parts.join('\n');
  }

  async function exportHTML() {
    const deck = Store.deck;
    const theme = THEMES[deck.theme] || THEMES.obsidian;
    const themeVars = Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';');
    const css = await inlineCSS();

    const slidesHTML = deck.slides
      .map(s => `<section class="pg">${Render.slideHTML(s, deck)}</section>`).join('\n');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${Render.esc(deck.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${css}
html,body{margin:0;height:100%;background:#000;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif}
#deck{${themeVars}}
.pg{position:absolute;inset:0;display:none;place-items:center}
.pg.on{display:grid}
.slide-host{transform-origin:center center}
#hud{position:fixed;left:0;right:0;bottom:0;padding:12px 20px;color:rgba(255,255,255,.6);
  font-size:12px;display:flex;gap:14px;opacity:0;transition:opacity .25s;
  background:linear-gradient(to top,rgba(0,0,0,.7),transparent)}
body:hover #hud{opacity:1}
</style></head>
<body><div id="deck">${slidesHTML}</div>
<div id="hud"><span id="n"></span><span style="margin-left:auto">← → to navigate · F for fullscreen</span></div>
<script>
const pages=[...document.querySelectorAll('.pg')];
let i=0;
function fit(){
  const s=Math.min(innerWidth/${DESIGN_W},innerHeight/${DESIGN_H});
  document.querySelectorAll('.slide').forEach(el=>{
    el.style.transform='scale('+s+')';
    el.style.transformOrigin='center center';
  });
}
function show(n){
  i=Math.max(0,Math.min(pages.length-1,n));
  pages.forEach((p,k)=>p.classList.toggle('on',k===i));
  document.getElementById('n').textContent=(i+1)+' / '+pages.length;
}
addEventListener('keydown',e=>{
  if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){show(i+1);e.preventDefault();}
  if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){show(i-1);e.preventDefault();}
  if(e.key==='Home')show(0);
  if(e.key==='End')show(pages.length-1);
  if(e.key==='f'||e.key==='F')document.documentElement.requestFullscreen?.();
});
addEventListener('click',()=>show(i+1));
addEventListener('resize',fit);
fit();show(0);
<\/script></body></html>`;

    download(safeName(deck.title) + '.html', html, 'text/html');
    App.toast('Standalone HTML exported — opens in any browser, offline');
  }

  /* ---------- PDF (print) ---------- */

  function exportPDF() {
    const deck = Store.deck;
    document.querySelector('.print-root')?.remove();

    const root = document.createElement('div');
    root.className = 'print-root print-mode';
    root.style.display = 'none';
    applyTheme(root, deck.theme);

    deck.slides.forEach(s => {
      const page = document.createElement('div');
      page.className = 'print-page';
      page.innerHTML = Render.slideHTML(s, deck);
      root.appendChild(page);
    });

    document.body.appendChild(root);

    // Give the layout a frame to settle before the print dialog snapshots it.
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => root.remove(), 1500);
    });

    App.toast('In the print dialog: choose "Save as PDF", landscape, margins none');
  }

  return { exportJSON, importJSON, exportHTML, exportPDF, download };
})();
