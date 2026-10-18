/* ============================================================
   The Connect sculpture.

   A smooth, glossy, iridescent organic form that slowly turns and
   breathes — cyan, blue, violet and pink flowing across one surface. Raymarched in a fragment shader so it is
   smooth at any size, with soft anti-aliased edges.

   Sculpture.mount(canvas, opts)  live, for the stage and the editor
   Sculpture.still(opts, w, h)    a cached picture, for thumbnails

   opts: { shape, roll: degrees, intro: bool }
   shapes: twist ribbon lens pebble petal (gloss) · silk plume (2024 silk)
           glass frost (frosted glass)
           liquid orb (merging liquid)
   ============================================================ */

const Sculpture = (() => {

  const SHAPES = {
    twist:  { w: .64, t: .24, tw: 2.3, bend: 1 },
    ribbon: { w: .52, t: .09, tw: 3.4, bend: 1.4 },
    lens:   { w: .8,  t: .36, tw: .8,  bend: .5 },
    pebble: { w: .74, t: .58, tw: .35, bend: .3 },
    petal:  { w: .48, t: .14, tw: 1.2, bend: 1.9 },
    // Connect 2024: silk
    silk:   { w: .6,  t: .05, tw: 2.6, bend: 1.7, mat: 2 },
    plume:  { w: .7,  t: .12, tw: 1.4, bend: 2.2, mat: 2 },
    // frosted glass
    glass:  { w: 0, t: 0, tw: 0, bend: 0, kind: 3, mat: 3 },
    frost:  { w: .78, t: .3, tw: .9, bend: .5, mat: 3 },
  };

  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uRoll, uAlpha, uSize;
uniform vec4 uShape;        // twisted forms: width, thickness, twist, bend
uniform float uKind;        // 0 twisted form · 3 slab
uniform float uMat;         // 0 gloss · 2 silk · 3 frosted glass
mat2 R(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

float hash(vec3 p){ p = fract(p*.3183099 + .1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3. - 2.*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a*noise(p); p *= 2.03; a *= .5; } return s; }

vec3 L;   // surface coordinates for colouring: across, along, depth
float sdBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,max(q.y,q.z)),0.) - r; }

float map(vec3 p){
  float tt = uTime;
  if (uKind < .5) {
    p.xz = R(tt*.12)*p.xz;
    p.yz = R(.3)*p.yz;
    float y = p.y;
    p.x += .2*uShape.w*sin(y*1.5 + tt*.33);
    p.z += .14*uShape.w*sin(y*1.1 - tt*.27);
    p.xz = R(y*uShape.z + tt*.2)*p.xz;
    float t = clamp(1. - y*y, 0., 1.);
    float bx = uShape.x*pow(t,.62) + .004, bz = uShape.y*pow(t,.8) + .004;
    vec2 e = p.xz / vec2(bx, bz);
    float d = (length(e) - 1.)*min(bx, bz);
    d = max(d, abs(y) - 1.);
    L = vec3(clamp(p.x/bx, -1., 1.), y, e.y);
    return d*.6;
  }
  // slab: a thick rounded pane, slowly tilting
  p.xz = R(.5 + sin(tt*.17)*.25)*p.xz; p.yz = R(-.35 + sin(tt*.13)*.12)*p.yz;
  float d = sdBox(p, vec3(.95, .62, .07), .06);
  L = vec3(p.x, p.y, p.z);
  return d;
}
vec3 nrm(vec3 p){ vec2 k = vec2(1.,-1.)*.0015;
  return normalize(k.xyy*map(p+k.xyy) + k.yyx*map(p+k.yyx) + k.yxy*map(p+k.yxy) + k.xxx*map(p+k.xxx)); }

vec3 pal(float t){
  t = fract(t)*5.;
  vec3 c0 = vec3(.43,.95,1.), c1 = vec3(.18,.42,1.), c2 = vec3(.55,.36,1.), c3 = vec3(1.,.42,.84), c4 = vec3(.62,.98,.96);
  vec3 a = t<1.?c0:t<2.?c1:t<3.?c2:t<4.?c3:c4;
  vec3 b = t<1.?c1:t<2.?c2:t<3.?c3:t<4.?c4:c0;
  return mix(a, b, smoothstep(.15, .85, fract(t)));
}
/* Silk, as in the 2024 countdown: coral, pink, peach and teal. */
vec3 silk(float t){
  t = fract(t)*4.;
  vec3 c0 = vec3(1.,.47,.36), c1 = vec3(1.,.62,.8), c2 = vec3(1.,.82,.66), c3 = vec3(.36,.82,.84);
  vec3 a = t<1.?c0:t<2.?c1:t<3.?c2:c3;
  vec3 b = t<1.?c1:t<2.?c2:t<3.?c3:c0;
  return mix(a, b, smoothstep(.1, .9, fract(t)));
}

void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 d = vec2((uv.x-.5)*uRes.x/uRes.y, uv.y-.5);
  vec2 q = R(uRoll)*d/uSize*1.62;
  float r = length(q);
  vec4 o = vec4(0.);
  if (r < 2.1 && uAlpha > .001) {
    vec3 ro = vec3(0.,0.,3.2), rd = normalize(vec3(q,-2.6));
    float t = 1.4, dm = 1e9, tm = 1.4; bool hit = false;
    float px = 3.2/(uRes.y*uSize);
    // Only march inside a sphere around the form; rays that miss it skip.
    float rb = 1.75;
    float b = dot(ro, rd), hh = b*b - dot(ro, ro) + rb*rb;
    float t1 = -1.;
    if (hh > 0.) { t = max(1.4, -b - sqrt(hh)); t1 = -b + sqrt(hh); }
    for (int i = 0; i < 110; i++) {
      if (t > t1) break;
      float h = map(ro + rd*t);
      if (h < dm) { dm = h; tm = t; }
      if (h < .0008) { hit = true; tm = t; break; }
      t += h;
    }
    // Silk gets a softer, feathered edge; everything else a clean one.
    float soft = uMat > 1.5 && uMat < 2.5 ? 2.2 : .6;
    float cov = hit ? 1. : clamp(1. - dm/(px*soft), 0., 1.);
    if (cov > 0.) {
      vec3 p = ro + rd*tm; vec3 n = nrm(p); map(p);
      vec3 v = -rd, l = normalize(vec3(-.45,.75,.6));
      float fr = pow(1. - abs(dot(n,v)), 2.2);
      float dif = .5 + .5*dot(n,l);
      float sp = pow(max(dot(reflect(-l,n),v),0.), 40.);
      vec3 col; float a = cov*uAlpha;

      if (uMat < .5) {                                  // gloss
        vec3 base = pal(L.x*.32 + L.y*.16 + fr*.35 + uTime*.012);
        col = base*(.48 + .72*dif) + vec3(1.)*sp*.75 + mix(base, vec3(1.), .5)*fr*.5;
      } else if (uMat < 2.5) {                          // silk
        float fib = fbm(vec3(L.x*14., L.y*2., uTime*.05));
        vec3 base = silk(L.y*.35 + L.x*.12 + uTime*.015);
        vec3 h = normalize(l + v);
        float sheen = pow(1. - abs(dot(n, h)), 3.)*.0 + pow(max(dot(n, h), 0.), 10.)*.35;
        col = base*(.62 + .45*dif)*(.94 + .09*fib) + vec3(1.)*sheen + mix(base, vec3(1.), .6)*fr*.35;
        a *= .95 + .05*fib;
      } else {                                          // frosted glass
        vec3 base = pal(L.x*.25 + L.y*.35 + uTime*.02);
        vec3 inner = mix(base, vec3(1.), .35);
        col = inner*(.7 + .3*dif) + vec3(1.)*(sp*.6 + fr*.55);
        a *= .62 + .38*fr;
      }
      o = vec4(col*a, a);
    }
  }
  float nz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - .5;
  o.rgb += nz*(1.4/255.)*o.a;
  gl_FragColor = clamp(o, 0., 1.);
}
`;

  /* Liquid: soft bodies that drift, swell and merge into one glossy
     surface. A metaball field, thresholded smoothly so the edge is clean,
     shaded from its own gradient so it reads as a lit, rounded liquid. */
  const LIQUID = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uAlpha, uSize, uRoll;
uniform vec4 uShape;      // x: bodies, y: seed, z: spread
mat2 R(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float field(vec2 p){
  float f = 0.;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    if (fi >= uShape.x) break;
    float k = fi + uShape.y;
    vec2 c = uShape.x > 1.5
      ? vec2(sin(uTime*.21 + k*1.73)*.62, cos(uTime*.17 + k*2.31)*.4)*uShape.z
      : vec2(0.);
    float r = (uShape.x > 1.5 ? .44 : .8) + .05*sin(uTime*.33 + k*1.1);
    vec2 d = p - c;
    // Gaussian bodies: smooth everywhere, no spike at the centre.
    f += exp(-dot(d, d)/(r*r)*1.4);
  }
  return f;
}
vec3 pal(float t){
  t = fract(t)*5.;
  vec3 c0 = vec3(.43,.95,1.), c1 = vec3(.18,.42,1.), c2 = vec3(.55,.36,1.), c3 = vec3(1.,.42,.84), c4 = vec3(.62,.98,.96);
  vec3 a = t<1.?c0:t<2.?c1:t<3.?c2:t<4.?c3:c4;
  vec3 b = t<1.?c1:t<2.?c2:t<3.?c3:t<4.?c4:c0;
  return mix(a, b, smoothstep(.15, .85, fract(t)));
}
void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes) / (.5*min(uRes.x, uRes.y));
  p = R(uRoll)*p / max(uSize, .05);
  float f = field(p);
  float px = 2.5/(min(uRes.x, uRes.y)*uSize);
  const float TH = .42;
  float cov = smoothstep(TH - px*1.5, TH + px*1.5, f);
  vec4 o = vec4(0.);
  if (cov > 0.) {
    vec2 e = vec2(.003, 0.);
    vec2 g = vec2(field(p+e.xy) - field(p-e.xy), field(p+e.yx) - field(p-e.yx)) / (2.*e.x);
    // The surface rises from the edge like a drop of liquid: steep at the
    // rim, flat on top. Normals come from the field's own slope.
    float rim = 1. - smoothstep(TH, TH + .5, f);
    vec3 n = normalize(vec3(-g*(.18 + .9*rim), 1.));
    vec3 l = normalize(vec3(-.45, .65, .62)), v = vec3(0., 0., 1.);
    float dif = .5 + .5*dot(n, l);
    float sp = pow(max(dot(reflect(-l, n), v), 0.), 48.);
    float fr = pow(1. - n.z, 1.4);
    vec3 base = pal(p.x*.16 + p.y*.2 + fr*.45 + uTime*.015);
    base = mix(base*.82, base, smoothstep(-.6, .8, dot(n, l)));
    vec3 col = base*(.62 + .5*dif) + vec3(1.)*sp*.5 + mix(base, vec3(1.), .6)*fr*.35;
    o = vec4(col*cov*uAlpha, cov*uAlpha);
  }
  float nz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - .5;
  o.rgb += nz*(1.4/255.)*o.a;
  gl_FragColor = clamp(o, 0., 1.);
}`;

  function renderer(canvas, preserve, frag = FRAG) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: !!preserve });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[sculpture]', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    const fs = sh(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uTime', 'uRoll', 'uAlpha', 'uSize', 'uShape', 'uKind', 'uMat'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
    return {
      gl,
      draw(st, time) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uRoll, st.roll);
        gl.uniform1f(U.uAlpha, st.alpha);
        gl.uniform1f(U.uSize, st.size);
        gl.uniform4f(U.uShape, st.w, st.t, st.tw, st.bend);
        if (U.uKind) gl.uniform1f(U.uKind, st.kind || 0);
        if (U.uMat) gl.uniform1f(U.uMat, st.mat || 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  const LIQUIDS = {
    liquid: { w: 5, t: 0, tw: .95, bend: 0 },     // several bodies merging
    orb:    { w: 1, t: 0, tw: 0,   bend: 0 },     // one glossy drop
  };
  const isLiquid = (o) => o.shape in LIQUIDS;
  const target = (o) => {
    const s = LIQUIDS[o.shape] || SHAPES[o.shape] || SHAPES.twist;
    return { roll: (o.roll || 0) * Math.PI / 180, alpha: 1, size: o.size || .92, ...s,
             t: isLiquid(o) ? (o.seed || 0) : s.t };
  };

  /* Live: springs in from small, turned and transparent when `intro`. */
  function mount(canvas, opts = {}) {
    const R = renderer(canvas, false, isLiquid(opts) ? LIQUID : FRAG);
    if (!R) return { destroy() {}, resize() {} };
    /* Browsers drop the oldest WebGL contexts when too many are open (after
       a presentation, say). A lost canvas paints white: hide it and let the
       still picture underneath show instead. */
    canvas.addEventListener('webglcontextlost', () => {
      cancelAnimationFrame(raf);
      canvas.style.display = 'none';
      canvas.parentElement?.classList.remove('live');
    });
    const to = target(opts);
    const cur = { ...to };
    if (opts.intro) { cur.size = to.size * .4; cur.roll = to.roll - 1.2; cur.alpha = 0; }
    const vel = { size: 0, roll: 0, alpha: 0 };
    let raf = 0, last = 0;
    const t0 = performance.now() - (opts.phase || 0) * 1000;
    const K = 2.1;

    function resize() {
      const w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
      const k = Math.min(1, 1300 / Math.max(w, h));
      canvas.width = Math.max(2, Math.round(w * k));
      canvas.height = Math.max(2, Math.round(h * k));
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      for (const k of ['size', 'roll', 'alpha']) {
        vel[k] += (-K * K * (cur[k] - to[k]) - 2 * K * vel[k]) * dt;
        cur[k] += vel[k] * dt;
      }
      R.draw({ ...cur, alpha: Math.max(0, Math.min(1, cur.alpha)) }, (now - t0) / 1000);
    }
    resize();
    raf = requestAnimationFrame(frame);
    return {
      resize,
      /* Stop drawing but keep the context: releasing one mid-show stalls. */
      pause() { cancelAnimationFrame(raf); raf = 0; },
      /* Hide first: a canvas whose context is released paints solid white,
         and the old screen is often still dissolving when this runs. */
      destroy() {
        cancelAnimationFrame(raf);
        canvas.style.display = 'none';
        R.gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  }

  /* Stills share one offscreen context and are cached by shape and size. */
  const SR = {}, SC = {};
  const cache = new Map();
  function still(opts, w, h) {
    const k = Math.min(1, 700 / Math.max(w, h));
    const cw = Math.max(16, Math.round(w * k)), ch = Math.max(16, Math.round(h * k));
    const key = [opts.shape, opts.roll, opts.size, opts.seed, cw, ch].join('|');
    if (cache.has(key)) return cache.get(key);
    let url = '';
    const kind = isLiquid(opts) ? 'liquid' : 'form';
    try {
      if (!SC[kind]) {
        SC[kind] = document.createElement('canvas');
        SR[kind] = renderer(SC[kind], true, kind === 'liquid' ? LIQUID : FRAG);
      }
      if (SR[kind]) {
        SC[kind].width = cw; SC[kind].height = ch;
        SR[kind].draw(target(opts), 7);
        url = SC[kind].toDataURL('image/webp', .9);
      }
    } catch (e) { url = ''; }
    cache.set(key, url);
    return url;
  }

  return { mount, still, SHAPES, LIQUIDS };
})();
