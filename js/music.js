/* ============================================================
   The soundtrack.

   A default tech score, synthesised live in the browser (nothing to
   license, nothing to download), cut to the show the way the Connect
   broadcast cuts picture to music:

   - the chrome open: a metallic hit on every camera cut, a riser into
     the pull back, a big hit as the whole mark appears, and the beat
     drops as the name lands. Same grid as the camera (Sculpture.BEAT);
   - between screens: a soft whoosh as one dissolves into the next;
   - under the talk: a quiet bed, the full groove, or silence;
   - a screen playing a video with sound ducks the music under it.

   Or play your own track instead (it loops, and still ducks).

   Music.start(settings)  when presenting starts (deck.music)
   Music.scene({ first, mark, video })   on every screen
   Music.duck(why | false)   Music.stop()   Music.preview(settings)
   ============================================================ */

const Music = (() => {
  const BPM = 112, B = 60 / BPM, S = B / 4;          // beat, sixteenth (s)
  const DEFAULTS = { mode: 'builtin', bed: 'quiet', volume: .8 };

  let ac = null, out, music, fx, verb, delay, noise;
  let set = { ...DEFAULTS };
  let on = false, timer = 0, T0 = 0, step = 0, plan = () => 0;
  let track = null;                                  // your own track: an <audio>
  let stopT = 0, previewT = 0;

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- the room ---------- */

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
    out = ac.createGain(); out.connect(comp); comp.connect(ac.destination);
    music = ac.createGain(); music.connect(out);     // the groove: rides the bed and the ducking
    fx = ac.createGain(); fx.connect(out);           // hits, risers, whooshes: duck but don't ride the bed

    // A long, soft hall, made from decaying noise.
    verb = ac.createConvolver();
    const len = ac.sampleRate * 3, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    verb.buffer = ir;
    const vg = ac.createGain(); vg.gain.value = .55; verb.connect(vg); vg.connect(out);

    // A dotted-eighth echo for the plucks, darkening as it repeats.
    delay = ac.createDelay(2); delay.delayTime.value = B * .75;
    const fb = ac.createGain(), lp = ac.createBiquadFilter(), dg = ac.createGain();
    fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2600; dg.gain.value = .3;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(dg); dg.connect(music);

    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  const gain = (v, to) => { const g = ac.createGain(); g.gain.value = v; g.connect(to); return g; };
  const env = (g, t, a, peak, d) => {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
  };
  function osc(type, f, t, end, to) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    o.connect(to); o.start(t); o.stop(end); return o;
  }
  function noiseSrc(t, end, to) {
    const n = ac.createBufferSource(); n.buffer = noise; n.loop = true;
    n.connect(to); n.start(t, Math.random()); n.stop(end); return n;
  }
  const filter = (type, f, q, to) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const send = (node, amt, to = verb) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(to); };

  /* ---------- the band ---------- */

  // A minor, i–VI–III–VII: Am9 · Fmaj7 · Cmaj7 · G6, two bars each.
  const CHORDS = [
    { root: 45, notes: [57, 60, 64, 67, 71] },
    { root: 41, notes: [53, 57, 60, 64, 69] },
    { root: 48, notes: [55, 59, 64, 67, 72] },
    { root: 43, notes: [55, 59, 62, 64, 67] },
  ];

  function pad(t, dur, notes) {
    const g = gain(.0001, music), lp = filter('lowpass', 700, .4, g);
    send(g, .7);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.05, t + 1.4);
    g.gain.setValueAtTime(.05, t + dur - .2);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur + 1.6);
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * .6);
    lp.frequency.linearRampToValueAtTime(700, t + dur);
    notes.forEach(m => [-7, 7].forEach(c => { const o = osc('sawtooth', hz(m), t, t + dur + 1.7, lp); o.detune.value = c; }));
  }
  function pluck(t, m, v) {
    const g = gain(.0001, music), lp = filter('lowpass', 3200, 3, g);
    env(g, t, .004, .07 * v, .26);
    lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(500, t + .2);
    osc('square', hz(m), t, t + .32, lp);
    send(g, .9, delay); send(g, .25);
  }
  function bass(t, m, dur) {
    const g = gain(.0001, music), lp = filter('lowpass', 260, 1, g);
    env(g, t, .006, .2, dur);
    osc('sawtooth', hz(m), t, t + dur + .05, lp);
    osc('sine', hz(m - 12), t, t + dur + .05, g);
  }
  function kick(t, k = 1) {
    const g = gain(.0001, music); env(g, t, .002, .9 * k, .42);
    const o = osc('sine', 150, t, t + .5, g); o.frequency.exponentialRampToValueAtTime(42, t + .14);
  }
  function hat(t, v) {
    const g = gain(.0001, music); env(g, t, .001, .05 * v, .05);
    noiseSrc(t, t + .08, filter('highpass', 7500, .7, g));
  }
  function clap(t) {
    const g = gain(.0001, music); env(g, t, .002, .16, .17); send(g, .4);
    noiseSrc(t, t + .25, filter('bandpass', 1500, .9, g));
  }

  /* ---------- the edit ---------- */

  // A chrome "ping" on a cut: inharmonic partials, like struck metal, a soft
  // thump under it and a breath of air on top.
  function ping(t, m, big = false) {
    const f0 = hz(m);
    [1, 2.76, 5.4, 8.93].forEach((r, i) => {
      const g = gain(.0001, fx); env(g, t, .003, (big ? .1 : .09) / (i + 1), (big ? 3.2 : 1.8) / (1 + i * .5));
      send(g, .8);
      osc('sine', f0 * r, t, t + 3.5, g);
    });
    const th = gain(.0001, fx); env(th, t, .003, big ? .6 : .65, big ? 1.3 : .4);
    const o = osc('sine', big ? 90 : 120, t, t + 1.5, th);
    o.frequency.exponentialRampToValueAtTime(big ? 27 : 45, t + (big ? 1 : .25));
    const air = gain(.0001, fx); env(air, t, .002, big ? .25 : .18, big ? 1.6 : .3); send(air, .6);
    const bp = filter('lowpass', 9000, .5, air); noiseSrc(t, t + 2, bp);
    bp.frequency.setValueAtTime(9000, t); bp.frequency.exponentialRampToValueAtTime(300, t + (big ? 1.4 : .3));
  }
  function riser(t, dur) {
    const g = gain(.0001, fx); send(g, .5);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.6, t + dur); g.gain.setValueAtTime(.0001, t + dur + .01);
    const bp = filter('bandpass', 300, 2.2, g);
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    noiseSrc(t, t + dur + .02, bp);
    const s = gain(.0001, fx); s.gain.setValueAtTime(.0001, t); s.gain.exponentialRampToValueAtTime(.06, t + dur); s.gain.setValueAtTime(.0001, t + dur + .01);
    const o = osc('sawtooth', 110, t, t + dur + .02, filter('lowpass', 1800, .5, s));
    o.frequency.exponentialRampToValueAtTime(880, t + dur);
  }
  function whoosh(t) {
    const g = gain(.0001, fx); env(g, t, .25, .09, .55); send(g, .5);
    const bp = filter('bandpass', 2400, 1.4, g);
    bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(350, t + .8);
    noiseSrc(t, t + .9, bp);
  }

  /* ---------- the sequencer ----------
     Sixteenths from T0, scheduled a little ahead. plan(bar) says how much
     of the band plays: 0 nothing, 1 pad, 2 + plucks, 3 + bass and hats,
     4 everything. */
  const ARP = [0, 2, 1, 3, 2, 4, 3, 1];
  function play(n, t) {
    const bar = Math.floor(n / 16), lv = plan(bar);
    if (lv <= 0) return;
    const ch = CHORDS[Math.floor(bar / 2) % 4], i = n % 16;
    if (n % 32 === 0) pad(t, B * 8, ch.notes);
    if (lv >= 2) pluck(t, ch.notes[ARP[n % 8]] + (i >= 8 && n % 2 ? 12 : 0), i % 4 === 0 ? 1 : .6);
    if (lv >= 3) {
      if (i % 2 === 0) bass(t, ch.root + (i % 8 === 6 ? 12 : 0), S * 1.6);
      if (i % 4 === 2) hat(t, 1);
      else if (lv >= 4 && i % 2 === 1) hat(t, .45);
    }
    if (lv >= 4) {
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) clap(t);
    }
  }
  function tick() {
    const until = ac.currentTime + .3;
    while (T0 + step * S <= until) {
      const t = T0 + step * S;
      if (t >= ac.currentTime - .02) play(step, t);
      step++;
    }
  }
  function groove(at, p) {
    T0 = at; step = 0; plan = p;
    clearInterval(timer); timer = setInterval(tick, 60); tick();
  }
  const bedLevel = () => set.bed === 'full' ? 4 : set.bed === 'silent' ? 0 : 2;
  const bedGain = () => set.bed === 'full' ? 1 : set.bed === 'silent' ? 0 : .45;
  const ride = (v, t = ac.currentTime, tc = .6) => { music.gain.cancelScheduledValues(t); music.gain.setTargetAtTime(v, t, tc); };

  /* ---------- the show ---------- */

  function start(settings) {
    stop(true);
    set = { ...DEFAULTS, ...(settings || {}) };
    if (set.mode === 'off') return;
    clearTimeout(stopT);
    if (set.mode === 'file') {
      const src = Media.url(set.ref);
      if (!src) return;
      track = new Audio(src); track.loop = true; track.volume = set.volume;
      on = true;
      return;
    }
    init();
    ac.resume();
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setValueAtTime(set.volume, ac.currentTime);
    fx.gain.value = 1; music.gain.value = 0;
    on = true;
  }

  function scene({ first = false, mark = false, video = false } = {}) {
    if (!on) return;
    if (track) {
      if (first) track.play().catch(() => {});
      track.volume = set.volume * (video ? .15 : 1);
      return;
    }
    const t = ac.currentTime + .03;
    duck(video ? 'video' : false);
    if (mark) {
      // Cuts on beats 0, 2, 4; a riser into the pull back on beat 6; the
      // band builds under the pull back and the beat drops on beat 10.
      ride(0, t, .05);
      [69, 76, 72].forEach((m, i) => ping(t + i * 2 * B, m + 12));
      riser(t + 4 * B, 2 * B);
      ping(t + 6 * B, 57, true);
      music.gain.setTargetAtTime(1, t + 6 * B, .05);
      groove(t + 6 * B, (bar) => bar === 0 ? 2 : 4);
      // After the drop, settle to the bed under whatever comes next.
      return;
    }
    if (first) {
      groove(t, (bar) => bar < 2 ? Math.min(bedLevel(), 1 + bar) : bedLevel());
      ride(bedGain(), t, 1.2);
      return;
    }
    whoosh(t);
    // The groove keeps time across screens; only how much of it plays changes.
    const from = Math.floor((t - T0) / (B * 4)) + 1;
    const p = plan;
    plan = (bar) => bar < from ? p(bar) : bedLevel();
    ride(bedGain(), t + .3, .8);
  }

  function duck(why) {
    if (track) { track.volume = set.volume * (why ? .15 : 1); return; }
    if (!ac || !on) return;
    const v = why === 'video' ? .12 : why === 'black' ? .3 : 1;
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setTargetAtTime(set.volume * v, ac.currentTime, .25);
  }

  function stop(now = false) {
    clearTimeout(previewT);
    if (track) { track.pause(); track = null; }
    if (!ac || !on) { on = false; return; }
    on = false;
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setTargetAtTime(0, ac.currentTime, now ? .02 : .35);
    clearTimeout(stopT);
    stopT = setTimeout(() => { if (!on) clearInterval(timer); }, now ? 60 : 1600);
    if (now) clearInterval(timer);
  }

  /* In the editor: the chrome open's music, about twelve seconds. */
  function preview(settings) {
    if (on) { stop(); return false; }
    start(settings);
    scene({ first: true, mark: (settings?.mode || 'builtin') === 'builtin' });
    previewT = setTimeout(() => stop(), 12000);
    return true;
  }

  return { start, scene, duck, stop, preview, BPM, DEFAULTS, get playing() { return on; } };
})();
