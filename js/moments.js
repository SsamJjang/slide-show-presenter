/* ============================================================
   Countdown moments.

   As in the Connect 2024 countdown: across the last ten seconds
   every second is its own material with its own choreography, and
   the material plays in two layers — part of it behind the numerals,
   part of it passing in front — composed around the digits so they
   stay readable.

     9  sprinkle blobs pop into two corner clusters
     8  coral silk ribbons draw themselves across, behind and below
     7  teal trumpet blooms grow in from both lower corners
     6  silk fabric drapes down from the top; one band sweeps in low
     5  an inflated cushion swells up behind the digits
     4  soap bubbles float up through both layers
     3  pebbles drop and settle along the bottom edge
     2  candy capsules burst out from behind the digits
     1  glass crystals orbit the digits, passing behind and in front
     0  rainbow silk wipes across the frame

   Each layer is its own canvas (back sits under the numerals, front
   over them) and only draws its own shapes, so the cost of a pixel is
   the shapes of that layer that actually reach it.

   Moments.mount(canvas, 'back' | 'front') → { show(second), destroy() }
   ============================================================ */

const Moments = (() => {

  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT, uP, uS, uL;
mat2 R(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
float H(float n){ return fract(sin(n*127.1 + 3.7)*43758.5453); }
float H2(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }
float eo(float x){ x = clamp(x, 0., 1.); return 1. - pow(1. - x, 3.); }
float eb(float x){ x = clamp(x, 0., 1.); return 1. + 2.7*pow(x - 1., 3.) + 1.7*pow(x - 1., 2.); }

vec4 acc; float px; vec3 N; bool FRONT;
float HEAD = 0., HDIR = 0.;          // ribbons drawing themselves in
const vec2 NC = vec2(0., -.05);      // where the numerals sit
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

/* A smooth dome over an ellipse, gently wobbling. */
float blob(vec2 p, vec2 c, vec2 ab, float ang, float seed){
  ab = max(ab, vec2(.001));
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
/* A silk band along a flowing curve, with folds catching the light.
   With HDIR set it is drawn only up to HEAD, tapering to a soft tip. */
float band(vec2 p, float y0, float ang, float w, float amp, float f, float ph, out float s, out float fold){
  vec2 q = R(ang)*p;
  float x = q.x;
  float yc = y0 + amp*sin(x*f + ph + uT*.5) + .1*sin(x*f*2.3 - ph*1.7 + uT*.3);
  float dy = amp*f*cos(x*f + ph + uT*.5);
  float tp = HDIR == 0. ? 1. : smoothstep(0., .7, (HEAD - x)*HDIR);
  float ww = max(w*(1. + .35*sin(x*1.7 + ph*2.1 + uT*.4))*tp, 1e-4);
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

/* 9 — sprinkle blobs pop into two corner clusters */
void sprinkles(vec2 p){
  for (int i = 0; i < 10; i++) {
    float k = float(i);
    bool tr = i >= 5;
    float j = tr ? k - 5. : k;
    bool front = !tr && (i == 2 || i == 4);
    if (front != FRONT) continue;
    vec2 cc = tr ? vec2(1.42, .6) : vec2(-1.4, -.68);
    float ang = j*1.3 + H(k)*.6 + uT*.12*(tr ? 1. : -1.);
    float rad = j == 0. ? 0. : .34 + .12*H(k + 5.);
    vec2 c = cc + vec2(cos(ang), sin(ang))*rad*vec2(1.2, .9);
    float sz = (j == 0. ? .34 : .15 + .09*H(k + 2.))*eb(uP*2.4 - j*.16 - (tr ? .2 : 0.));
    if (sz < .003) continue;
    float sd = blob(p, c, vec2(sz*(1.08 + .15*H(k + 7.)), sz), H(k + 3.)*3. + uT*.2, k);
    if (sd > px) continue;
    vec3 n = N;
    vec3 col = lit(pastel(k*.37 + .1), n, 30., .35);
    vec2 g = (p - c)/sz*9.;
    vec2 id = floor(g), f = fract(g) - .5;
    float h = H2(id + k*13.);
    vec2 off = vec2(H2(id + 1.7), H2(id + 3.1)) - .5;
    float on = step(.45, h)*smoothstep(.27, .18, length(f - off*.5))*smoothstep(-.02, -.06, sd);
    col = mix(col, lit(pastel(h*3.)*.95, normalize(n + vec3(f - off*.5, 0.)*1.4), 40., .5), on);
    put(sd, col, 1.);
  }
}
/* 8 — coral silk ribbons draw themselves across: behind through the
   middle, in front only above and below the digits */
void ribbons(vec2 p){
  float s, fold;
  for (int i = 0; i < 8; i++) {
    float k = float(i);
    bool front = i == 2 || i == 6;
    if (front != FRONT) continue;
    HEAD = mix(-2.6, 2.9, eo(uP*1.25 - k*.06)); HDIR = 1.;
    float y0 = front ? (i == 2 ? -.9 : .88) : -.5 + k*.14;
    float w = front ? .05 : .06 + .06*H(k + 5.);
    float sd = band(p, y0, .12, w, .14 + .08*H(k + 1.), .9 + .4*H(k + 3.), k*1.9, s, fold);
    if (sd > px) continue;
    vec3 base = mix(mix(vec3(1., .45, .35), vec3(1., .62, .78), H(k + 8.)), vec3(1., .74, .45), H(k + 11.)*.6);
    put(sd, lit(mix(base, vec3(1.), .14 + .14*fold), N, 18., .45), 1.);
  }
  HDIR = 0.;
}
/* 7 — teal trumpet blooms grow in from both lower corners */
void blooms(vec2 p){
  if (FRONT) for (int i = 0; i < 6; i++) {
    float k = float(i);
    bool left = i < 3;
    float j = mod(k, 3.);
    vec2 root = vec2(left ? -1.95 : 1.95, -1.1);
    float ang = .3 + j*.45; if (!left) ang = 3.14159 - ang;
    float L = (.4 + .12*H(k + 9.))*eb(uP*2. - .2 - j*.12);
    vec2 c = root + vec2(cos(ang), sin(ang))*L*.75;
    float sd = blob(p, c, vec2(L*.55, L*.13), -ang, k + 3.);
    if (sd < px) put(sd, lit(mix(vec3(.93, .66, .2), vec3(1., .82, .4), N.y*.5 + .5), N, 24., .45), 1.);
  }
  for (int i = 0; i < 8; i++) {
    float k = float(i);
    bool left = i < 4;
    float j = mod(k, 4.);
    bool front = j != 2.;
    if (front != FRONT) continue;
    vec2 base = vec2(left ? -1.95 : 1.95, -1.15);
    float ang = .22 + j*.36 + .05*sin(uT*.6 + k); if (!left) ang = 3.14159 - ang;
    float L = (.62 + .3*H(k + 16.) + (front ? 0. : .25))*eo(uP*1.5 - j*.12 - (left ? 0. : .08));
    if (L < .01) continue;
    vec2 q = R(ang)*(p - base);       // x: along the stem toward the mouth
    float t = clamp(q.x/L, 0., 1.);
    float wid = L*(.035 + .32*t*t*t);
    float sd = max(abs(q.y) - wid, max(-q.x, q.x - L));
    vec2 m = q - vec2(L, 0.);
    float wm = L*.355;
    vec2 mu = m/vec2(wm*.32, wm);
    float sm = (length(mu) - 1.)*wm*.32;
    if (min(sd, sm) > px) continue;
    float sv = clamp(q.y/wid, -1., 1.);
    vec3 n = vec3(-.6*t*t, sv, sqrt(max(0., 1. - sv*sv)) + .05);
    n.xy = R(-ang)*n.xy;
    put(sd, lit(mix(vec3(.05, .45, .5), vec3(.3, .85, .8), t), normalize(n), 30., .5), 1.);
    vec3 inner = mix(vec3(.05, .3, .4), vec3(.55, .95, .9), smoothstep(.2, 1., length(mu)));
    put(sm, lit(inner, normalize(vec3(R(-ang)*mu*.6, 1.)), 40., .4), 1.);
    float sb = blob(p, base + vec2(cos(ang), sin(ang))*L*1.02, vec2(.05)*L/.8, 0., k);
    if (sb < px) put(sb, lit(vec3(1., .55, .7), N, 50., .6), 1.);
  }
}
/* 6 — silk fabric drapes down from the top behind the digits;
   one band sweeps in low across the front */
void fabric(vec2 p){
  float s, fold;
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    bool front = i == 3;
    if (front != FRONT) continue;
    float y0, ang, w;
    if (front) { y0 = -1.02; ang = .08; w = .15; HEAD = mix(2.9, -2.9, eo(uP*1.3 - .15)); HDIR = -1.; }
    else { y0 = mix(2., .66 + k*.17, eo(uP*1.5 - k*.1)); ang = -.1 + .08*k; w = .2 + .07*H(k + 31.); HDIR = 0.; }
    float sd = band(p, y0, ang, w, .16, .8 + .3*H(k + 32.), k*2.3 + 1., s, fold);
    if (sd > px) continue;
    vec3 base = k == 0. ? vec3(1., .66, .8) : k == 1. ? vec3(1., .96, .96) : k == 2. ? vec3(.62, .74, 1.) : vec3(1., .5, .42);
    put(sd, lit(base*(.9 + .12*fold), N, 14., .5), 1.);
  }
  HDIR = 0.;
}
/* 5 — an inflated cushion swells up behind the digits */
const vec2 CB = vec2(1.3, .78);
float cushionSD(vec2 q){
  vec2 d = abs(q) - CB + .5;
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - .5;
}
float cushionZ(vec2 q){
  float e = clamp(-cushionSD(q)/.5, 0., 1.);
  float z = sqrt(1. - (1. - e)*(1. - e));
  float r = length(q*vec2(.75, 1.25));
  z -= .55*exp(-r*r*4.5);
  z += .05*sin(q.x*2.4 + q.y*1.6 + uT*.5)*e;
  return z*.75;
}
void cushion(vec2 p){
  if (FRONT) {
    // two small satellites in the corners, the only things in front
    for (int i = 0; i < 2; i++) {
      float k = float(i);
      vec2 c = i == 0 ? vec2(-1.5, -.78) : vec2(1.52, .7);
      float sd = blob(p, c, vec2(.16, .13)*eb(uP*2. - .35 - k*.1), .4 + k, k);
      if (sd < px) put(sd, lit(i == 0 ? vec3(.55, .68, 1.) : vec3(1., .66, .82), N, 30., .5), 1.);
    }
    return;
  }
  float sc = max(.02, eb(uP*1.6));
  vec2 q = R(.06 + .04*sin(uT*.5))*(p - NC)/sc;
  float sd = cushionSD(q)*sc;
  if (sd > px) return;
  vec2 e = vec2(.004, 0.);
  vec2 g = vec2(cushionZ(q + e.xy) - cushionZ(q - e.xy), cushionZ(q + e.yx) - cushionZ(q - e.yx))/(2.*e.x);
  vec3 base = mix(vec3(.62, .74, 1.), vec3(1., .74, .86), smoothstep(-1.2, 1.2, q.x + q.y*.6));
  put(sd, lit(base, normalize(vec3(-g, 1.)), 22., .45), 1.);
}
/* 4 — soap bubbles float up through both layers: big ones behind,
   small ones in front */
void bubbles(vec2 p){
  for (int i = 0; i < 18; i++) {
    float k = float(i);
    bool front = mod(k, 2.) == 0.;
    if (front != FRONT) continue;
    float r = front ? .06 + .08*H(k + 40.) : .17 + .2*H(k + 40.);
    float sp = .55 + .5*H(k + 44.);
    vec2 c = vec2(-1.7 + 3.4*H(k + 41.) + .08*sin(uT*1.3 + k), -1.55 + 1.7*H(k + 43.) + uP*sp*.7 + .5*eo(uP*1.5));
    float sd = blob(p, c, vec2(r), 0., k*.3);
    if (sd > px) continue;
    float fr = pow(1. - N.z, 1.6);
    vec3 col = mix(vec3(.8, .9, 1.), hue(fr*.8 + N.x*.2 + uT*.05 + k*.1), .55)*(.6 + .4*fr);
    float s = pow(max(dot(N, normalize(normalize(LD) + vec3(0., 0., 1.))), 0.), 60.);
    put(sd, col + vec3(s), clamp(.22 + .7*fr + s, 0., 1.));
  }
}
/* 3 — pebbles drop from above and settle along the bottom edge */
void pebbles(vec2 p){
  for (int i = 0; i < 9; i++) {
    float k = float(i);
    bool front = i < 7;
    if (front != FRONT) continue;
    vec2 ab = front ? vec2(.24 + .1*H(k + 53.), .15 + .05*H(k + 54.)) : vec2(.3, .2);
    vec2 rest = front ? vec2(-1.62 + k*.54 + .1*H(k + 50.), -1. + ab.y*.75) : vec2(i == 7 ? -1.45 : 1.48, i == 7 ? .1 : -.25);
    float x = uP*1.15 - H(k + 52.)*.35;
    float y = x <= 0. ? 1.8 : rest.y + (1.8 - rest.y)*exp(-4.*x)*abs(cos(7.*x));
    float sd = blob(p, vec2(rest.x, y), ab, (H(k + 55.) - .5)*.6 + .2*exp(-3.*max(x, 0.)), k + 9.);
    if (sd > px) continue;
    vec3 n = N;
    float wrap = clamp(.35 + .65*dot(n, normalize(LD)), 0., 1.);
    float pool = smoothstep(.2, .8, .5 + .5*sin(dot(p, vec2(.4, 1.2))*3. - uT*.6 + k));
    put(sd, vec3(.94, .945, .96)*(.25 + .75*wrap) + mix(hue(dot(p, vec2(.5, .2)) + uT*.05), vec3(1.), .12)*pool*(.55 + .4*wrap)*.75, 1.);
  }
}
/* 2 — candy capsules burst out from behind the digits and come
   forward as they clear them */
void capsules(vec2 p){
  for (int i = 0; i < 12; i++) {
    float k = float(i);
    float a = k*.5236 + H(k + 60.)*.4;
    float e = eo(uP*1.4 - H(k + 61.)*.15);
    vec2 c = NC + vec2(cos(a), sin(a))*mix(.15, 1.3 + .6*H(k + 62.), e)*vec2(1.3, .78);
    bool front = abs(c.x) > 1.08 || abs(c.y - NC.y) > .74;
    if (front != FRONT) continue;
    float sc = mix(.35, 1.15, e);
    vec2 dir = R(H(k + 63.)*6.28 + uT*(.6 + .4*H(k + 64.)))*vec2(.17 + .08*H(k + 65.), 0.)*sc;
    float sd = capsule(p, c - dir, c + dir, (.08 + .035*H(k + 66.))*sc);
    if (sd > px) continue;
    float h = H(k + 67.)*4.;
    vec3 base = h < 1. ? vec3(1., .45, .15) : h < 2. ? vec3(1., .3, .6) : h < 3. ? vec3(.2, .45, 1.) : vec3(.55, .9, .3);
    put(sd, lit(base, N, 70., .9), 1.);
  }
}
/* 1 — glass crystals orbit the digits: behind across the top of the
   ring, in front across the bottom */
void crystals(vec2 p){
  for (int i = 0; i < 10; i++) {
    float k = float(i);
    float a = k*.6283 + uT*.6;
    float depth = -sin(a);                         // > 0: nearer than the digits
    bool front = depth > 0.;
    if (front != FRONT) continue;
    float m = mix(2.3, 1., eo(uP*1.4));
    vec2 c = NC + R(.12)*(vec2(cos(a)*1.45, sin(a)*.5)*m);
    float r = (.11 + .05*H(k + 75.))*(1. + .35*depth);
    if (length(p - c) > r*2.2) continue;
    float ang = H(k + 73.)*6.28 + uT*.5*(H(k + 74.) - .5);
    vec2 q = R(ang)*(p - c);
    q.x /= 1.45 + .4*H(k + 76.);
    float seg = 1.0471976;
    float an = atan(q.y, q.x);
    float sec = floor(an/seg + .5);
    float la = an - sec*seg;
    float sd = length(q)*cos(la) - r*.866;
    if (sd > px) continue;
    float table = step(length(q)*cos(la), r*.42);
    vec2 fd = R(-ang)*vec2(cos(sec*seg), sin(sec*seg));
    vec3 n = table > .5 ? vec3(0., 0., 1.) : normalize(vec3(fd*.85, 1.));
    float rr = length(q)/r;
    vec3 base = mix(hue(k*.13 + sec*.05 + .2*rr + uT*.03), vec3(1.), .4 + .3*table);
    vec3 col = lit(base, n, 90., 1.1)*(.9 + .2*(1. - rr));
    col += vec3(1.)*.35*smoothstep(.8, 1., rr)*(.5 + .5*dot(n.xy, vec2(-.5, .7)));
    put(sd*.8, col, .9);
  }
}
/* 0 — rainbow silk wipes across the whole frame */
void rainbow(vec2 p){
  if (!FRONT) return;
  float s, fold;
  for (int i = 0; i < 9; i++) {
    float k = float(i);
    HEAD = mix(3.2, -3.4, eo(uP*1.1 - k*.05)); HDIR = -1.;
    float sd = band(p, -1.25 + k*.3, -.3, .19 + .05*H(k + 5.), .14, .9 + .4*H(k + 3.), k*1.9, s, fold);
    if (sd > px) continue;
    put(sd, lit(mix(hue(k*.12 + .02*fold), vec3(1., .96, .98), .32 - .1*fold), N, 18., .45), 1.);
  }
  HDIR = 0.;
}

void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes)/(.5*uRes.y);
  px = 2./uRes.y;
  FRONT = uL > .5;
  acc = vec4(0.);
  float s = uS;
  if (s > 8.5) sprinkles(p);
  else if (s > 7.5) ribbons(p);
  else if (s > 6.5) blooms(p);
  else if (s > 5.5) fabric(p);
  else if (s > 4.5) cushion(p);
  else if (s > 3.5) bubbles(p);
  else if (s > 2.5) pebbles(p);
  else if (s > 1.5) capsules(p);
  else if (s > .5) crystals(p);
  else rainbow(p);
  gl_FragColor = clamp(acc, 0., 1.);
}`;

  function mount(canvas, layer = 'front') {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' });
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
    const U = {}; ['uRes', 'uT', 'uP', 'uS', 'uL'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

    // Smooth shapes hold up to upscaling: draw at ~1000px and let it stretch.
    canvas.width = 1024; canvas.height = 576;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uL, layer === 'back' ? 0 : 1);

    let second = -1, since = 0, raf = 0;
    const t0 = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (second < 0) return;
      gl.uniform1f(U.uT, (now - t0) / 1000);
      gl.uniform1f(U.uP, Math.min(3, (now - since) / 1000));
      gl.uniform1f(U.uS, second);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
    return {
      /* Cut to the material for this second. */
      show(s, at = performance.now()) { if (s === second) return; second = s; since = at; },
      destroy() {
        cancelAnimationFrame(raf);
        canvas.style.display = 'none';
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  }

  return { mount };
})();
