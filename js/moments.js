/* ============================================================
   Countdown moments.

   As in the Connect 2024 countdown: across the last ten seconds
   every second is its own material, rising up through the numerals
   from the bottom of the frame and cut on the beat.

     9  pastel blobs dusted in sprinkles      4  soap-film bubbles
     8  coral silk ribbons                    3  pebbles in prism light
     7  teal trumpet blooms, golden leaves    2  candy capsules
     6  billowing silk fabric                 1  rainbow crystals
     5  an inflated cushion, pinched          0  rainbow silk fills the frame

   One canvas, one GL context for the whole run. Shapes are smooth
   lit domes, tubes and bands, composited back to front, so every
   edge is soft and anti-aliased.

   Moments.mount(canvas) → { show(second), destroy() }
   ============================================================ */

const Moments = (() => {

  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT, uP, uS;
mat2 R(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
float H(float n){ return fract(sin(n*127.1 + 3.7)*43758.5453); }
float H2(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }
float ease(float x){ x = clamp(x, 0., 1.); return 1. - pow(1. - x, 3.); }

vec4 acc; float px; vec3 N;
const vec3 LD = vec3(-.4, .7, .6);

/* Over-composite one shape: sd < 0 inside, in frame units. */
void put(float sd, vec3 col, float a){
  float cov = clamp(.5 - sd/px, 0., 1.)*a;
  acc = vec4(col*cov, cov) + acc*(1. - cov);
}
vec3 lit(vec3 base, vec3 n, float gloss, float spec){
  vec3 l = normalize(LD);
  float dif = .5 + .5*dot(n, l);
  float sp = pow(max(dot(n, normalize(l + vec3(0., 0., 1.))), 0.), gloss);
  float fr = pow(1. - clamp(n.z, 0., 1.), 2.);
  return base*(.52 + .58*dif) + vec3(1.)*sp*spec + mix(base, vec3(1.), .6)*fr*.28;
}
/* Rising: each shape comes up from below the frame with its own lag. */
float lift(float k){ return (1. - ease(uP*1.35 - k*.3))*(-.8 - k*.7) + uP*.1; }

/* A smooth dome over an ellipse, gently wobbling. */
float blob(vec2 p, vec2 c, vec2 ab, float ang, float seed){
  vec2 q = R(ang)*(p - c);
  vec2 u = q/ab;
  float a = atan(u.y, u.x);
  float l = length(u)*(1. + .05*sin(a*3. + seed*6. + uT*.8) + .03*sin(a*5. - seed*4. + uT*.6));
  float z = sqrt(max(0., 1. - l*l));
  vec2 g = R(-ang)*(u/ab)*min(ab.x, ab.y);
  N = normalize(vec3(g, z + .02));
  return (l - 1.)*min(ab.x, ab.y);
}
/* A rounded tube from a to b. */
float capsule(vec2 p, vec2 a, vec2 b, float r){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.);
  vec2 d = pa - ba*h;
  float l = length(d)/r;
  N = normalize(vec3(d/r, sqrt(max(0., 1. - l*l)) + .02));
  return length(d) - r;
}
/* A silk band along a flowing curve, with folds catching the light. */
float band(vec2 p, float y0, float ang, float w, float amp, float f, float ph, out float s, out float fold){
  vec2 q = R(ang)*p;
  float x = q.x;
  float yc = y0 + amp*sin(x*f + ph + uT*.5) + .12*sin(x*f*2.3 - ph*1.7 + uT*.3);
  float dy = amp*f*cos(x*f + ph + uT*.5);
  float ww = w*(1. + .35*sin(x*1.7 + ph*2.1 + uT*.4));
  s = (q.y - yc)/ww;
  fold = sin(x*3.1 + s*1.8 + ph*3. + uT*.7);
  vec3 n = vec3(-dy*.25 + fold*.45, s*.55 + fold*.35, 1.);
  n.xy = R(-ang)*n.xy;
  N = normalize(n);
  return (abs(s) - 1.)*ww/sqrt(1. + dy*dy);
}

vec3 pastel(float k){
  k = fract(k)*5.;
  return k < 1. ? vec3(1., .78, .85) : k < 2. ? vec3(.8, .74, 1.) : k < 3. ? vec3(.7, .94, .86) : k < 4. ? vec3(1., .9, .66) : vec3(.68, .86, 1.);
}
vec3 hue(float h){ return clamp(abs(fract(h + vec3(0., .667, .333))*6. - 3.) - 1., 0., 1.); }
vec3 prism(float t){ return mix(hue(t), vec3(1.), .12); }

/* 9 — pastel blobs dusted in sprinkles */
void sprinkles(vec2 p){
  for (int i = 0; i < 9; i++) {
    float k = float(i), r = H(k + 1.);
    vec2 c = vec2(-1.75 + k*.44 + .2*H(k + 9.), -.62 + .35*H(k + 4.) + lift(r));
    vec2 ab = vec2(.3 + .16*H(k + 2.), .26 + .14*H(k + 7.));
    float sd = blob(p, c, ab, H(k + 3.)*3. + uT*.15, k);
    vec3 n = N;
    vec3 col = lit(pastel(k*.37 + .1), n, 30., .35);
    // the sprinkles: tiny lit grains following the surface
    vec2 g = (p - c)*34.;
    vec2 id = floor(g), f = fract(g) - .5;
    float h = H2(id + k*13.);
    vec2 off = vec2(H2(id + 1.7), H2(id + 3.1)) - .5;
    float dd = length(f - off*.5);
    float on = step(.45, h)*smoothstep(.27, .18, dd)*smoothstep(-.02, -.08, sd);
    col = mix(col, lit(pastel(h*3.) * .95, normalize(n + vec3(f - off*.5, 0.)*1.4), 40., .5), on);
    put(sd, col, 1.);
  }
}
/* 8 — coral silk ribbons sweeping through */
void ribbons(vec2 p, bool rainbow){
  float s, fold;
  for (int i = 0; i < 9; i++) {
    float k = float(i);
    float y0 = -1.15 + k*.13 + lift(H(k + 2.)*.6)*(rainbow ? .6 : 1.) + (rainbow ? .75 : 0.);
    float w = rainbow ? .16 + .07*H(k + 5.) : .045 + .05*H(k + 5.);
    float sd = band(p, y0, rainbow ? -.32 : .42, w, .14 + .1*H(k + 1.), .9 + .5*H(k + 3.), k*1.9, s, fold);
    vec3 base = rainbow ? mix(hue(k*.12 + .02*fold), vec3(1., .96, .98), .32) : mix(mix(vec3(1., .45, .35), vec3(1., .62, .78), H(k + 8.)), vec3(1., .74, .45), H(k + 11.)*.6);
    base = mix(base, vec3(1.), .14 + .14*fold);
    put(sd, lit(base, N, 18., .45), 1.);
  }
}
/* 7 — teal trumpet blooms among golden leaves */
void blooms(vec2 p){
  for (int i = 0; i < 6; i++) {
    float k = float(i);
    vec2 c = vec2(-1.7 + k*.62 + .2*H(k + 3.), -.95 + .3*H(k + 1.) + lift(H(k + 6.)));
    float sd = blob(p, c + vec2(.25, .15), vec2(.36, .085), .5 + H(k)*.8, k + 3.);
    put(sd, lit(mix(vec3(.93, .66, .2), vec3(1., .82, .4), N.y*.5 + .5), N, 24., .45), 1.);
  }
  for (int i = 0; i < 7; i++) {
    float k = float(i);
    vec2 base = vec2(-1.85 + k*.56 + .15*H(k + 21.), -1.25 + lift(H(k + 14.)));
    float ang = 1.1 + .5*(H(k + 15.) - .5) + .08*sin(uT*.6 + k);
    float L = .7 + .25*H(k + 16.);
    vec2 q = R(ang)*(p - base);        // x: along the stem toward the mouth
    float t = clamp(q.x/L, 0., 1.);
    float wid = L*(.035 + .32*t*t*t);
    float sd = max(abs(q.y) - wid, max(-q.x, q.x - L));
    float sv = clamp(q.y/wid, -1., 1.);
    vec3 n = vec3(-.6*t*t, sv, sqrt(max(0., 1. - sv*sv)) + .05);
    n.xy = R(-ang)*n.xy;
    vec3 teal = mix(vec3(.05, .45, .5), vec3(.3, .85, .8), t);
    put(sd, lit(teal, normalize(n), 30., .5), 1.);
    // the mouth, seen slightly from the front
    vec2 m = q - vec2(L, 0.);
    float wm = L*.355;
    float sm = (length(m/vec2(wm*.32, wm)) - 1.)*wm*.32;
    float l2 = length(m/vec2(wm*.32, wm));
    vec3 inner = mix(vec3(.05, .3, .4), vec3(.55, .95, .9), smoothstep(.2, 1., l2));
    put(sm, lit(inner, normalize(vec3(R(-ang)*(m/vec2(wm*.32, wm))*.6, 1.)), 40., .4), 1.);
    float sb = blob(p, base + vec2(cos(ang), sin(ang))*L*1.02, vec2(.05, .05), 0., k);
    put(sb, lit(vec3(1., .55, .7), N, 50., .6), 1.);
  }
}
/* 6 — billowing silk fabric */
void fabric(vec2 p){
  float s, fold;
  for (int i = 0; i < 5; i++) {
    float k = float(i);
    float y0 = -1.05 + k*.2 + lift(H(k + 30.)*.5);
    float sd = band(p, y0, -.15 + .1*k, .28 + .1*H(k + 31.), .22, .8 + .3*H(k + 32.), k*2.3 + 1., s, fold);
    vec3 base = k == 0. ? vec3(.62, .74, 1.) : k == 1. ? vec3(1., .5, .42) : k == 2. ? vec3(1., .96, .96) : k == 3. ? vec3(1., .66, .8) : vec3(1., .78, .62);
    base *= .9 + .12*fold;
    put(sd, lit(base, N, 14., .5), 1.);
  }
}
/* 5 — an inflated cushion, gathered at the centre */
const vec2 CB = vec2(1.15, .7);
float cushionSD(vec2 q){
  vec2 d = abs(q) - CB + .5;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - .5;
}
float cushionZ(vec2 q){
  float e = clamp(-cushionSD(q)/.5, 0., 1.);
  float z = sqrt(1. - (1. - e)*(1. - e));
  float r = length(q*vec2(.75, 1.25));
  z -= .55*exp(-r*r*4.5);                                  // the gather
  z += .05*sin(q.x*2.4 + q.y*1.6 + uT*.5)*e;               // broad soft folds
  return z*.75;
}
void cushion(vec2 p){
  vec2 c = vec2(0., -.38 + lift(0.)*1.1);
  vec2 q = R(.1 + .04*sin(uT*.5))*(p - c);
  q *= 1. - .025*sin(uT*.9);
  float sd = cushionSD(q);
  vec2 e = vec2(.004, 0.);
  vec2 g = vec2(cushionZ(q + e.xy) - cushionZ(q - e.xy), cushionZ(q + e.yx) - cushionZ(q - e.yx))/(2.*e.x);
  vec3 n = normalize(vec3(-g, 1.));
  vec3 base = mix(vec3(.45, .62, 1.), vec3(1., .62, .8), smoothstep(-1.2, 1.2, q.x + q.y*.6));
  put(sd, lit(base, n, 22., .45), 1.);
}
/* 4 — soap-film bubbles */
void bubbles(vec2 p){
  for (int i = 0; i < 10; i++) {
    float k = float(i), r = .14 + .26*H(k + 40.);
    vec2 c = vec2(-1.8 + 3.6*H(k + 41.), -.9 + .7*H(k + 42.) + lift(H(k + 43.)));
    float sd = blob(p, c, vec2(r), 0., k*.3);
    float fr = pow(1. - N.z, 1.6);
    vec3 film = hue(fr*.8 + N.x*.2 + uT*.05 + k*.1);
    vec3 col = mix(vec3(.8, .9, 1.), film, .55)*(.6 + .4*fr);
    float sp = pow(max(dot(N, normalize(normalize(LD) + vec3(0., 0., 1.))), 0.), 60.);
    float a = .22 + .7*fr + sp;
    put(sd, (col + vec3(sp))*1., clamp(a, 0., 1.));
  }
}
/* 3 — smooth pebbles in prism light */
void pebbles(vec2 p){
  for (int i = 0; i < 8; i++) {
    float k = float(i);
    vec2 c = vec2(-1.75 + k*.5 + .15*H(k + 50.), -.78 + .32*H(k + 51.) + lift(H(k + 52.)));
    float sd = blob(p, c, vec2(.34 + .14*H(k + 53.), .22 + .08*H(k + 54.)), (H(k + 55.) - .5)*1.2, k + 9.);
    vec3 n = N;
    float wrap = clamp(.35 + .65*dot(n, normalize(LD)), 0., 1.);
    vec3 stone = vec3(.94, .945, .96)*(.25 + .75*wrap);
    float pool = smoothstep(.2, .8, .5 + .5*sin(dot(p, vec2(.4, 1.2))*3. - uT*.6 + k));
    vec3 col = stone + prism(dot(p, vec2(.5, .2)) + uT*.05)*pool*(.55 + .4*wrap)*.75;
    put(sd, col, 1.);
  }
}
/* 2 — glossy candy capsules tumbling up */
void capsules(vec2 p){
  for (int i = 0; i < 10; i++) {
    float k = float(i);
    vec2 c = vec2(-1.85 + k*.4 + .1*H(k + 60.), -.8 + .45*H(k + 61.) + lift(H(k + 62.)));
    vec2 dir = R(H(k + 63.)*6.28 + uT*(.3 + .3*H(k + 64.)))*vec2(.18 + .1*H(k + 65.), 0.);
    float sd = capsule(p, c - dir, c + dir, .09 + .04*H(k + 66.));
    float h = H(k + 67.)*4.;
    vec3 base = h < 1. ? vec3(1., .45, .15) : h < 2. ? vec3(1., .3, .6) : h < 3. ? vec3(.2, .45, 1.) : vec3(.55, .9, .3);
    put(sd, lit(base, N, 70., .9), 1.);
  }
}
/* 1 — rainbow crystals: faceted shards catching light */
void crystals(vec2 p){
  for (int i = 0; i < 11; i++) {
    float k = float(i);
    vec2 c = vec2(-1.85 + k*.37 + .12*H(k + 70.), -.8 + .5*H(k + 71.) + lift(H(k + 72.)));
    float ang = H(k + 73.)*6.28 + uT*.25*(H(k + 74.) - .5);
    float r = .16 + .14*H(k + 75.);
    vec2 q = R(ang)*(p - c);
    q.x /= 1.45 + .4*H(k + 76.);           // shards are longer than wide
    const float NS = 6.;
    float a = atan(q.y, q.x), seg = 6.2831853/NS;
    float sec = floor(a/seg + .5);
    float la = a - sec*seg;
    float sd = length(q)*cos(la) - r*cos(seg*.5);
    float table = step(length(q)*cos(la), r*.42);
    vec2 fd = R(-ang)*vec2(cos(sec*seg), sin(sec*seg));
    vec3 n = table > .5 ? vec3(0., 0., 1.) : normalize(vec3(fd*.85, 1.));
    float rr = length(q)/r;
    vec3 base = hue(k*.13 + sec*.05 + .2*rr + uT*.03);
    base = mix(base, vec3(1.), .4 + .3*table);
    vec3 col = lit(base, n, 90., 1.1)*(.9 + .2*(1. - rr));
    col += vec3(1.)*.35*smoothstep(.8, 1., rr)*(.5 + .5*dot(n.xy, vec2(-.5, .7)));
    put(sd*.8, col, .9);
  }
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes)/(.5*uRes.y);
  px = 2./uRes.y;
  acc = vec4(0.);
  float s = uS;
  if (s > 8.5) sprinkles(p);
  else if (s > 7.5) ribbons(p, false);
  else if (s > 6.5) blooms(p);
  else if (s > 5.5) fabric(p);
  else if (s > 4.5) cushion(p);
  else if (s > 3.5) bubbles(p);
  else if (s > 2.5) pebbles(p);
  else if (s > 1.5) capsules(p);
  else if (s > .5) crystals(p);
  else ribbons(p, true);
  float nz = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453) - .5;
  acc.rgb += nz*(1.4/255.)*acc.a;
  gl_FragColor = clamp(acc, 0., 1.);
}`;

  function mount(canvas) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    const none = { show() {}, destroy() {} };
    if (!gl) return none;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[moments]', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return none;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return none;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uT', 'uP', 'uS'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

    const w = canvas.clientWidth || 1920, h = canvas.clientHeight || 1080;
    const k = Math.min(1, 1400 / Math.max(w, h));
    canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);

    let second = -1, since = 0, raf = 0;
    const t0 = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (second < 0) return;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.uniform1f(U.uP, Math.min(2, (now - since) / 1000));
      gl.uniform1f(U.uS, second);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
    return {
      /* Cut to the material for this second; it rises from the bottom. */
      show(s) { if (s === second) return; second = s; since = performance.now(); },
      destroy() {
        cancelAnimationFrame(raf);
        canvas.style.display = 'none';
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  }

  return { mount };
})();
