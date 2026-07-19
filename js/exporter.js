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

  function exportHTML() {
    const deck = Store.deck;
    // Same variable map the editor applies, including any derived accent
    // palette — otherwise the export silently loses the deck's colour system.
    const themeVars = Object.entries(computeThemeVars(deck.theme, deck))
      .map(([k, v]) => `${k}:${v}`).join(';');
    // Straight from the constant — no fetch, so this works identically whether
    // the editor was opened over http or as a local file.
    const css = SLIDE_CSS;

    // Each slide carries its atmosphere spec rather than its own background
    // layers — the player hoists them into one persistent field, exactly as
    // presentation mode does, so the export feels continuous too.
    const slidesHTML = deck.slides.map(s => {
      const atmos = Render.esc(JSON.stringify({
        bgPreset: s.bgPreset || 'none', bgMotion: s.bgMotion || 'drift',
        bgSpeed: s.bgSpeed || 1, bgGrain: !!s.bgGrain, bgVignette: !!s.bgVignette,
        bg: s.bg || '',
      }));
      const layers = Backgrounds.html(s);
      return `<section class="pg" data-trans="${s.transition || 'fade'}" data-atmos="${atmos}">` +
             `<template class="atmos-src">${layers}</template>` +
             `${Render.slideHTML(s, deck)}</section>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${Render.esc(deck.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${css}
html,body{margin:0;height:100%;background:#000;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif}
#deck{${themeVars};position:absolute;inset:0}
#atmos{position:absolute;inset:0;overflow:hidden;background:var(--bg);z-index:0}
#atmos .atmos-layer{position:absolute;inset:0}
.pg{position:absolute;inset:0;display:none;place-items:center;z-index:1}
.pg.on{display:grid}
/* Slides are transparent over the persistent field, same as presentation mode. */
.pg .slide{background:transparent!important}
.pg .slide>.slide-bg,.pg .slide>.slide-bg-overlay,
.pg .slide>.slide-grain,.pg .slide>.slide-vignette{display:none}
.slide-host{transform-origin:center center}
.el.magic{z-index:2}
#hud{position:fixed;left:0;right:0;bottom:0;padding:12px 20px;color:rgba(255,255,255,.6);
  font-size:12px;display:flex;gap:14px;opacity:0;transition:opacity .25s;
  background:linear-gradient(to top,rgba(0,0,0,.7),transparent)}
body:hover #hud{opacity:1}
</style></head>
<body><div id="deck"><div id="atmos"></div>${slidesHTML}</div>
<div id="hud"><span id="n"></span><span style="margin-left:auto">← → to navigate · F for fullscreen</span></div>
<script>
const pages=[...document.querySelectorAll('.pg')];
const atmos=document.getElementById('atmos');
let i=0,scale=1;

function fit(){
  scale=Math.min(innerWidth/${DESIGN_W},innerHeight/${DESIGN_H});
  document.querySelectorAll('.slide').forEach(el=>{
    el.style.transform='scale('+scale+')';
    el.style.transformOrigin='center center';
  });
}

/* Persistent atmosphere: cross-dissolve only when the look actually changes,
   so the drift never restarts between slides. */
let atmosKey=null;
function syncAtmos(pg,immediate){
  const key=pg.dataset.atmos;
  if(key===atmosKey)return;
  atmosKey=key;
  let spec={};try{spec=JSON.parse(key)}catch(e){}
  const layer=document.createElement('div');
  layer.className='atmos-layer';
  if(spec.bg)layer.style.background=spec.bg;
  const src=pg.querySelector('.atmos-src');
  if(src)layer.appendChild(src.content.cloneNode(true));
  const old=[...atmos.querySelectorAll('.atmos-layer')];
  if(immediate||!old.length){old.forEach(o=>o.remove());atmos.appendChild(layer);return;}
  layer.style.opacity='0';layer.style.transition='opacity 900ms ease';
  atmos.appendChild(layer);void layer.offsetWidth;layer.style.opacity='1';
  old.forEach(o=>{o.style.transition='opacity 900ms ease';o.style.opacity='0';
    setTimeout(()=>o.remove(),960);});
}

/* Magic Move, driven by the geometry baked into each element's data-*.
   Same FLIP as the editor: measure where it was, start it there, play to
   where it belongs. */
function magic(fromPg,toPg){
  const dur=820,ease='cubic-bezier(.4,.02,.18,1)';
  const src=new Map();
  fromPg.querySelectorAll('.el[data-mm]').forEach(e=>{
    if(!src.has(e.dataset.mm))src.set(e.dataset.mm,e);});
  const moved=new Set();
  toPg.querySelectorAll('.el[data-mm]').forEach(b=>{
    const a=src.get(b.dataset.mm);
    if(!a||moved.has(a))return;
    moved.add(a);moved.add(b);
    const dx=+a.dataset.x-+b.dataset.x, dy=+a.dataset.y-+b.dataset.y;
    const sx=+b.dataset.w?+a.dataset.w/+b.dataset.w:1;
    const sy=+b.dataset.h?+a.dataset.h/+b.dataset.h:1;
    if(Math.abs(dx)<.5&&Math.abs(dy)<.5&&Math.abs(sx-1)<.003&&Math.abs(sy-1)<.003)return;
    b.classList.add('magic');b.style.transformOrigin='top left';
    b.animate([{transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')'},
               {transform:'translate(0,0) scale(1,1)'}],
              {duration:dur,easing:ease,fill:'both'});
    a.style.visibility='hidden';
  });
  fromPg.querySelectorAll('.el').forEach(e=>{
    if(e.style.visibility==='hidden')return;
    e.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-14px)'}],
      {duration:dur*.5,easing:'ease',fill:'both'});});
  toPg.querySelectorAll('.el').forEach(e=>{
    if(moved.has(e))return;
    e.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:dur*.6,delay:dur*.35,easing:ease,fill:'both'});});
  setTimeout(()=>{
    fromPg.querySelectorAll('.el').forEach(e=>{e.getAnimations().forEach(x=>x.cancel());e.style.visibility='';});
    toPg.querySelectorAll('.el').forEach(e=>{e.getAnimations().forEach(x=>x.cancel());
      e.classList.remove('magic');e.style.transformOrigin='';});
  },dur+120);
  return dur;
}

function show(n,opts){
  const from=pages[i];
  const target=Math.max(0,Math.min(pages.length-1,n));
  const first=!(opts&&opts.animate);
  const to=pages[target];
  const changed=target!==i;
  i=target;
  syncAtmos(to,first);
  if(changed&&!first&&to.dataset.trans==='magic'){
    to.classList.add('on');
    magic(from,to);
    setTimeout(()=>from.classList.remove('on'),900);
  }else{
    pages.forEach((p,k)=>p.classList.toggle('on',k===i));
  }
  document.getElementById('n').textContent=(i+1)+' / '+pages.length;
}
addEventListener('keydown',e=>{
  if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){show(i+1,{animate:1});e.preventDefault();}
  if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){show(i-1,{animate:1});e.preventDefault();}
  if(e.key==='Home')show(0,{animate:1});
  if(e.key==='End')show(pages.length-1,{animate:1});
  if(e.key==='f'||e.key==='F')document.documentElement.requestFullscreen?.();
});
addEventListener('click',()=>show(i+1,{animate:1}));
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
    applyTheme(root, deck.theme, deck);

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
