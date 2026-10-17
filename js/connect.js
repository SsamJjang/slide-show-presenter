/* ============================================================
   Connect — the Meta Connect stage language.

   What makes a Connect keynote not feel like a slideshow is that
   there is ONE object on screen for the whole talk: a glossy,
   iridescent, twisting sculpture that never cuts. When the speaker
   moves on, it glides to a new place and re-forms while the words
   dissolve around it — the content changes, the space does not.

   So this file is two things:

   FORM     That sculpture, rendered live in WebGL: a twisted lens
            shape with smooth thin-film colour, fine contour lines and
            a soft halo, slowly breathing. Each slide only says where
            it should be (a pose) and what light it carries (a scheme);
            the runtime springs every parameter there, so moving from
            one slide to the next is one continuous motion. Static
            surfaces (editor, thumbnails, print) get a cached snapshot
            from the same shader, so they show exactly the same object.

   CHROME   The quiet footer every keynote screen carries: brand mark
            bottom-left, event name bottom-right. In presentation it
            is hoisted out of the slides and never moves.

   The form runtime is one self-contained function so the standalone
   export can embed its source verbatim — one implementation, two
   runtimes, nothing to drift.
   ============================================================ */

function connectFormRuntime() {

  /* ---------- poses ----------
     Where the form sits, in slide fractions. `size` is its length as a
     fraction of slide height; `roll` its angle on screen; `turn` how far it
     has spun in depth — changing pose also turns it, which is what makes a
     move read as the object re-forming rather than sliding. */
  var POSES = {
    title:  { name: 'Title',   x: .585, y: .5,  size: .86, roll: .62,  turn: 0,    alpha: 1 },
    hero:   { name: 'Hero',    x: .5,   y: .5,  size: .78, roll: .4,   turn: .9,   alpha: 1 },
    right:  { name: 'Right',   x: .74,  y: .5,  size: .78, roll: .28,  turn: 1.8,  alpha: 1 },
    left:   { name: 'Left',    x: .26,  y: .5,  size: .74, roll: -.5,  turn: 2.6,  alpha: 1 },
    low:    { name: 'Low',     x: .56,  y: .9,  size: 1.0, roll: 1.42, turn: 3.4,  alpha: 1 },
    behind: { name: 'Behind',  x: .5,   y: .5,  size: 1.0, roll: 1.1,  turn: 4.2,  alpha: .62 },
    corner: { name: 'Corner',  x: .87,  y: .2,  size: .3,  roll: .9,   turn: 5,    alpha: 1 },
    off:    { name: 'Hidden',  x: .5,   y: .62, size: .5,  roll: .9,   turn: 5.6,  alpha: 0 },
  };

  /* ---------- species ----------
     The shape of the sculpture: width and thickness of its cross-section,
     how hard it twists along its length, and how much it bends. They are
     springs like everything else, so a form can turn from one species into
     another between slides. */
  var SPECIES = {
    twist:  { name: 'Twist',  w: .62, t: .2,  tw: 2.15, bd: 1 },
    lens:   { name: 'Lens',   w: .78, t: .36, tw: .7,  bd: .45 },
    ribbon: { name: 'Ribbon', w: .5,  t: .055, tw: 3.6, bd: 1.5 },
    pebble: { name: 'Pebble', w: .72, t: .56, tw: .35, bd: .3 },
    petal:  { name: 'Petal',  w: .46, t: .12, tw: 1.2,  bd: 1.9 },
  };

  /* ---------- schemes ----------
     Four stops of the thin-film colour, sampled from the Connect 2025
     identity. `pearl` is the soft version for white slides. */
  var SCHEMES = {
    connect: { name: 'Connect', c: ['#7df3ff', '#3f7dff', '#a46bff', '#ff7fd6'] },
    aqua:    { name: 'Aqua',    c: ['#c4fbff', '#4fd8ff', '#3a6dff', '#77ffd8'] },
    dusk:    { name: 'Dusk',    c: ['#ffc07a', '#ff6fb0', '#8b5cff', '#3f7dff'] },
    pearl:   { name: 'Pearl',   c: ['#bfe6ff', '#9fb8ff', '#e3c6ff', '#ffcfe8'] },
    sunset:  { name: 'Sunset',  c: ['#ffd27a', '#ff8a5c', '#ff5fa2', '#8b5cff'] },
    mint:    { name: 'Mint',    c: ['#d6fff3', '#6ff2cf', '#3fc6ff', '#a2f0ff'] },
    mono:    { name: 'Chrome',  c: ['#f4f6fb', '#9aa6bd', '#dfe5f0', '#6b7790'] },
  };

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;',
    'uniform vec2 uPos;uniform float uSize,uRoll,uTurn,uAlpha;',
    'uniform vec3 uC0,uC1,uC2,uC3;',
    'uniform vec4 uShape;uniform float uSpeed,uHalo;',
    'mat2 R(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
    'vec3 LOC;',
    /* The sculpture: a lens-shaped cross-section (wide, thin) that tapers to
       points at both ends, twisted along its length and gently bent so it is
       never quite straight. The ends close on their own because the section
       shrinks to nothing — no caps, no edges. */
    'float map(vec3 p){',
    '  float tt=uTime*uSpeed;',
    '  p.xz=R(uTurn+tt*.11)*p.xz;',
    '  p.yz=R(.32)*p.yz;',
    '  float y=p.y;',
    '  p.x+=.2*uShape.w*sin(y*1.5+tt*.33);',
    '  p.z+=.14*uShape.w*sin(y*1.1-tt*.27);',
    '  p.xz=R(y*uShape.z+tt*.19)*p.xz;',
    '  float t=clamp(1.-y*y,0.,1.);',
    '  float bx=uShape.x*pow(t,.62)+.004, bz=uShape.y*pow(t,.8)+.004;',
    '  vec2 e=p.xz/vec2(bx,bz);',
    '  float d=(length(e)-1.)*min(bx,bz);',
    '  d=max(d,abs(y)-1.);',
    '  LOC=vec3(clamp(p.x/bx,-1.,1.),y,e.y);',
    '  return d*.6;',
    '}',
    'vec3 nrm(vec3 p){vec2 k=vec2(1.,-1.)*.0015;',
    '  return normalize(k.xyy*map(p+k.xyy)+k.yyx*map(p+k.yyx)+k.yxy*map(p+k.yxy)+k.xxx*map(p+k.xxx));}',
    /* Thin-film colour: a smooth loop through the four scheme stops. */
    'vec3 film(float t){t=fract(t)*4.;',
    '  vec3 a=t<1.?uC0:t<2.?uC1:t<3.?uC2:uC3;',
    '  vec3 b=t<1.?uC1:t<2.?uC2:t<3.?uC3:uC0;',
    '  return mix(a,b,smoothstep(0.,1.,fract(t)));}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes;',
    '  vec2 d=vec2((uv.x-uPos.x)*uRes.x/uRes.y,uPos.y-(1.-uv.y));',
    '  vec2 q=R(uRoll)*d/uSize*1.62;',
    '  float r=length(q);',
    /* Soft halo: the form throws its colour into the field around it. It is
       what keeps a black slide from looking empty, without painting it. */
    /* One slowly drifting hue, no angular term: an angle-based colour has a
       seam where atan wraps, and it showed as a hard-edged wedge. */
    '  vec3 hc=mix(film(.08+uTime*.01),film(.55+uTime*.01),.5+.5*q.y/(1.+r));',
    /* Fade the halo out before the canvas edge, or a sculpture element shows
       a faint square where its glow is cut off by its own box. */
    '  float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));',
    '  float halo=exp(-r*r*.55)*.13*uAlpha*uHalo*smoothstep(0.,.22,edge);',
    '  vec4 outc=vec4(hc*halo,halo);',
    '  if(r<1.9&&uAlpha>.001){',
    '    vec3 ro=vec3(0.,0.,3.2),rd=normalize(vec3(q,-2.6));',
    '    float t=1.6,dm=1e9,tm=1.6;bool hit=false;',
    '    float px=3.2/(uRes.y*uSize);',
    '    for(int i=0;i<84;i++){',
    '      float h=map(ro+rd*t);',
    '      if(h<dm){dm=h;tm=t;}',
    '      if(h<.0008){hit=true;tm=t;break;}',
    '      t+=h;if(t>4.8)break;',
    '    }',
    /* Coverage from the closest approach, so the silhouette is soft and
       anti-aliased instead of a stair-stepped hard edge. */
    '    float cov=hit?1.:clamp(1.-dm/(px*.6),0.,1.);',
    '    if(cov>0.){',
    '      vec3 p=ro+rd*tm;vec3 n=nrm(p);map(p);',
    '      vec3 v=-rd,l=normalize(vec3(-.45,.75,.6));',
    '      float fr=pow(1.-abs(dot(n,v)),2.4);',
    '      float s=LOC.x;',
    '      vec3 base=film(s*.32+LOC.y*.2+fr*.42+uTime*.014);',
    /* Fine contour lines running the length of the form: low contrast and
       smooth, a texture you feel more than see. */
    '      float ln=.5+.5*sin(s*3.14159*15.);',
    '      base*=.88+.12*smoothstep(.15,.85,ln);',
    '      float dif=.5+.5*dot(n,l);',
    '      float sp=pow(max(dot(reflect(-l,n),v),0.),42.);',
    '      float sp2=pow(max(dot(reflect(-normalize(vec3(.6,-.3,.7)),n),v),0.),18.);',
    '      vec3 col=base*(.42+.78*dif)+vec3(1.)*sp*.7+film(s*.3+.5)*sp2*.35+mix(base,vec3(1.),.55)*fr*.55;',
    '      float a=cov*uAlpha;',
    '      outc=vec4(col*a+outc.rgb*(1.-a),a+outc.a*(1.-a));',
    '    }',
    '  }',
    /* About one 8-bit level of noise: the halo is a long, faint gradient and
       it banded into visible rings, worst over a white slide. */
    '  float nz=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;',
    '  outc.rgb+=nz*(1.6/255.)*outc.a;outc.a+=nz*(1.6/255.)*step(.001,outc.a);',
    '  gl_FragColor=clamp(outc,0.,1.);',
    '}',
  ].join('\n');

  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }

  /* The numeric state a form is driven by — everything the springs move. */
  /* `form.pose` is a pose name, or an explicit pose object (a sculpture
     element passes its own box-relative one). */
  function stateFor(form) {
    form = form || {};
    var po = typeof form.pose === 'object' && form.pose ? form.pose : (POSES[form.pose || 'off'] || POSES.off);
    var sc = SCHEMES[form.scheme || 'connect'] || SCHEMES.connect;
    var sp = SPECIES[form.species || 'twist'] || SPECIES.twist;
    var c = sc.c.map(hex);
    var tw = form.twist != null ? form.twist : sp.tw;
    return [po.x, po.y, po.size, po.roll, po.turn, po.alpha,
      c[0][0], c[0][1], c[0][2], c[1][0], c[1][1], c[1][2],
      c[2][0], c[2][1], c[2][2], c[3][0], c[3][1], c[3][2],
      sp.w, sp.t, tw, sp.bd,
      form.speed != null ? form.speed : 1, form.halo === false ? 0 : 1];
  }

  function renderer(canvas, preserve) {
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: !!preserve });
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[form]', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uRes', 'uTime', 'uPos', 'uSize', 'uRoll', 'uTurn', 'uAlpha', 'uC0', 'uC1', 'uC2', 'uC3',
     'uShape', 'uSpeed', 'uHalo']
      .forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    return {
      gl: gl,
      draw: function (s, time) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, time);
        gl.uniform2f(U.uPos, s[0], s[1]);
        gl.uniform1f(U.uSize, Math.max(.01, s[2]));
        gl.uniform1f(U.uRoll, s[3]);
        gl.uniform1f(U.uTurn, s[4]);
        gl.uniform1f(U.uAlpha, Math.max(0, Math.min(1, s[5])));
        gl.uniform3f(U.uC0, s[6], s[7], s[8]);
        gl.uniform3f(U.uC1, s[9], s[10], s[11]);
        gl.uniform3f(U.uC2, s[12], s[13], s[14]);
        gl.uniform3f(U.uC3, s[15], s[16], s[17]);
        gl.uniform4f(U.uShape, s[18], s[19], s[20], s[21]);
        gl.uniform1f(U.uSpeed, s[22]);
        gl.uniform1f(U.uHalo, Math.max(0, s[23]));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  /* ---------- live ----------
     One canvas for the whole presentation. Each parameter is a critically
     damped spring toward the current slide's pose: it accelerates out and
     settles in without overshoot, so a change of slide is a single glide
     that never stops dead and never restarts.

     The canvas must cover exactly the slide's 16:9 box (the caller sizes
     it), so poses land where the editor snapshot shows them. */
  function mount(canvas, opts) {
    opts = opts || {};
    var R = renderer(canvas, false);
    if (!R) return { set: function () {}, resize: function () {}, destroy: function () {} };
    var cur = null, vel = null, target = null, raf = 0, last = 0, t0 = performance.now();
    var K = opts.stiffness || 2.4;
    var res = opts.resolution || .75;

    function resize() {
      var w = canvas.clientWidth || 1920, h = canvas.clientHeight || 1080;
      var k = Math.min(res, 1500 / Math.max(w, 1));
      canvas.width = Math.max(2, Math.round(w * k));
      canvas.height = Math.max(2, Math.round(h * k));
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (!cur) return;
      for (var i = 0; i < cur.length; i++) {
        var x = cur[i] - target[i];
        vel[i] += (-K * K * x - 2 * K * vel[i]) * dt;
        cur[i] += vel[i] * dt;
      }
      R.draw(cur, (now - t0) / 1000);
    }
    resize();
    raf = requestAnimationFrame(frame);
    return {
      /* `intro` starts the form small, turned and transparent and lets the
         springs bring it in — the sculpture element's build. */
      set: function (form, immediate, intro) {
        target = stateFor(form);
        if (!cur || immediate) {
          cur = target.slice(); vel = target.map(function () { return 0; });
          if (intro) { cur[2] *= .45; cur[4] -= 2.2; cur[5] = 0; cur[3] -= .5; }
        }
      },
      resize: resize,
      destroy: function () {
        cancelAnimationFrame(raf);
        var ext = R.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      },
    };
  }

  /* ---------- snapshot ----------
     Static surfaces get a picture of the same shader, cached by everything
     that shapes it, from one shared offscreen context — so a dozen
     thumbnails cost one WebGL context and a handful of renders, not a dozen
     live loops. `w`/`h` give the box's aspect (a sculpture element is
     rarely 16:9). */
  var snapR = null, snapC = null, cache = {};
  function snapshot(form, w, h) {
    if (!form || !form.pose || form.pose === 'off') return '';
    w = w || 1280; h = h || 720;
    var k = Math.min(1, 900 / Math.max(w, h));
    var cw = Math.max(16, Math.round(w * k)), ch = Math.max(16, Math.round(h * k));
    var key = JSON.stringify([form.pose, form.scheme, form.species, form.twist, form.halo, cw, ch]);
    if (cache[key] !== undefined) return cache[key];
    try {
      if (!snapC) {
        snapC = document.createElement('canvas');
        snapR = renderer(snapC, true);
        if (!snapR) { snapC.width = 2; snapR = renderer(snapC, true); }
      }
      if (!snapR) return (cache[key] = '');
      snapC.width = cw; snapC.height = ch;
      snapR.draw(stateFor(form), 6.0);
      var url = snapC.toDataURL('image/webp', .92);
      if (url.indexOf('data:image/webp') !== 0) url = snapC.toDataURL('image/png');
      cache[key] = url;
    } catch (e) { cache[key] = ''; }
    return cache[key];
  }

  return { POSES: POSES, SCHEMES: SCHEMES, SPECIES: SPECIES, mount: mount, snapshot: snapshot, stateFor: stateFor };
}

const ConnectForm = connectFormRuntime();

const Connect = (() => {
  /* ---------- persistent chrome ----------
     Rendered on every slide so the editor, thumbnails, print and export all
     show it; in presentation the per-slide copies are hidden and one copy is
     hoisted above the stage, so it never moves during a transition. */
  function chromeHTML(deck, slide) {
    const c = deck && deck.chrome;
    if (!c || c.on === false || (slide && slide.chrome === false)) return '';
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    return `<div class="slide-chrome">` +
      `<span class="ch-l"><i class="ch-mark"></i>${esc(c.left)}</span>` +
      `<span class="ch-r">${esc(c.right)}</span></div>`;
  }

  /* The static picture of a slide's form, for every surface that is not
     the live presentation. */
  function formHTML(slide) {
    const src = ConnectForm.snapshot(slide.form);
    return src ? `<div class="slide-form"><img src="${src}" alt=""></div>` : '';
  }

  /* ---------- icons ----------
     The small glyphs Connect puts beside every feature: one stroke weight,
     round joins, drawn on a 24px grid. Rendered as SVG so they stay sharp at
     projector size, optionally on a soft tile, in iridescent, accent or ink. */
  const ICONS = {
    spark:    'M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5zM19 16c.2 1.5.9 2.2 2.4 2.4-1.5.2-2.2.9-2.4 2.4-.2-1.5-.9-2.2-2.4-2.4 1.5-.2 2.2-.9 2.4-2.4z',
    chat:     'M20 11.5a8 8 0 0 1-11.7 7.1L4 19.5l1-4A8 8 0 1 1 20 11.5z',
    poll:     'M5.5 20v-8M12 20V4.5M18.5 20v-5',
    users:    'M15.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5V20M9.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20.5 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.3 4.6a3.5 3.5 0 0 1 0 6.8',
    bell:     'M6 9.5a6 6 0 0 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15 6 9.5zM10 20a2 2 0 0 0 4 0',
    shield:   'M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6zM9 12l2.2 2.2L15.5 10',
    bolt:     'M13 2.5L5 13.5h6l-1 8 8-11h-6z',
    heart:    'M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
    image:    'M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5zM9 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM19.5 15l-4.5-4.5L6 19.5',
    calendar: 'M6 5.5h12A1.5 1.5 0 0 1 19.5 7v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V7A1.5 1.5 0 0 1 6 5.5zM4.5 10h15M8.5 3.5v4M15.5 3.5v4',
    lock:     'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6 10.5h12a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1z',
    globe:    'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z',
    pen:      'M15.5 5l3.5 3.5L8.5 19H5v-3.5zM13.5 7l3.5 3.5',
    file:     'M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8zM14 3.5V8h4.5M9 13h6M9 16.5h4',
    palette:  'M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.5-.7 1.5-1.5 0-1.6 1.2-2 2.5-2H18a2.5 2.5 0 0 0 2.5-2.5C20.5 8.4 16.7 3.5 12 3.5zM8 11.5h.01M11.5 7.5h.01M16 10h.01',
    rocket:   'M12.5 15l-3.5-3.5c1.5-4.5 4.6-7.6 10-8.5-.9 5.4-4 8.5-8.5 10zM9 11.5l-3.5.5L8 8.5h3M12.5 15l-.5 3.5 3.5-2.5v-3M6.5 17.5c-1 1-1.5 3-1.5 3s2-.5 3-1.5',
    check:    'M5 12.5l4.5 4.5L19 7.5',
    smile:    'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01',
    search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    eye:      'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    tool:     'M15 5.5a4.5 4.5 0 0 0-5.6 5.6L4 16.5V20h3.5l5.4-5.4A4.5 4.5 0 0 0 18.5 9l-2.8 2.8-2.5-2.5L16 6.5z',
    phone:    'M8 2.5h8A1.5 1.5 0 0 1 17.5 4v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
    desktop:  'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15V6a1.5 1.5 0 0 1 1.5-1.5zM9 20.5h6M12 16.5v4',
    star:     'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  };

  let iconN = 0;
  function renderIcon(el) {
    const d = ICONS[el.glyph] || ICONS.spark;
    const id = 'ic' + (++iconN).toString(36) + Math.random().toString(36).slice(2, 5);
    const tone = el.tone || 'iris';
    const stroke = tone === 'iris' ? `url(#${id})` : tone === 'accent' ? 'var(--accent)'
                 : tone === 'dark' ? '#0b1020' : '#ffffff';
    const grad = tone === 'iris'
      ? `<defs><linearGradient id="${id}" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="#9ff6ff"/><stop offset=".38" stop-color="#5aa2ff"/>` +
        `<stop offset=".7" stop-color="#a46bff"/><stop offset="1" stop-color="#ff8fdc"/></linearGradient></defs>` : '';
    const tile = el.tile && el.tile !== 'none' ? ' tile-' + el.tile : '';
    return `<div class="e-icon${tile}"><svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" ` +
      `stroke-width="${el.weight || 1.7}" stroke-linecap="round" stroke-linejoin="round">${grad}<path d="${d}"/></svg></div>`;
  }

  /* Footer ink. 'auto' (the default) reads the slide's own background, so a
     white or pastel slide gets dark ink without anyone setting it. */
  function chromeDark(slide) {
    const t = slide?.chromeTone;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    const m = /^#([0-9a-f]{6})$/i.exec(slide?.bg || '');
    if (!m) return false;
    const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (r * .299 + g * .587 + b * .114) > 150;
  }

  return { chromeHTML, formHTML, renderIcon, ICONS, chromeDark };
})();
