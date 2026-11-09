// Original 3.8-second neon synth ident. No sampled game music or external files.
// Returns a stop function so Skip and Escape silence every scheduled sound.
window.playCamoSting = function () {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return () => {};
  const ctx = new Audio();
  ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.4;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 8;
  master.connect(limiter).connect(ctx.destination);
  const t = ctx.currentTime + 0.02;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 117;
  for (let i = 0; i < data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
  const echo = ctx.createDelay(1), feedback = ctx.createGain(), wet = ctx.createGain();
  echo.delayTime.value = .19; feedback.gain.value = .24; wet.gain.value = .18;
  echo.connect(feedback).connect(echo); echo.connect(wet).connect(master);
  function tone(freq, start, duration, volume, type = 'triangle', detune = 0) {
    const o = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(2400, t + start);
    filter.frequency.exponentialRampToValueAtTime(450, t + start + duration);
    gain.gain.setValueAtTime(.0001, t + start);
    gain.gain.exponentialRampToValueAtTime(volume, t + start + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, t + start + duration);
    o.connect(filter).connect(gain); gain.connect(master); gain.connect(echo);
    o.start(t + start); o.stop(t + start + duration + .02);
  }
  function noise(start, duration, volume, from, to) {
    const n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    n.buffer = buffer; f.type = 'bandpass'; f.Q.value = .8;
    f.frequency.setValueAtTime(from, t + start); f.frequency.exponentialRampToValueAtTime(to, t + start + duration);
    g.gain.setValueAtTime(.0001, t + start); g.gain.exponentialRampToValueAtTime(volume, t + start + duration * .4); g.gain.exponentialRampToValueAtTime(.0001, t + start + duration);
    n.connect(f).connect(g).connect(master); n.start(t + start); n.stop(t + start + duration);
  }
  function bass(freq, start, volume = .4) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(freq * 2.8, t + start); o.frequency.exponentialRampToValueAtTime(freq, t + start + .12);
    g.gain.setValueAtTime(.0001, t + start); g.gain.exponentialRampToValueAtTime(volume, t + start + .012); g.gain.exponentialRampToValueAtTime(.0001, t + start + .65);
    o.connect(g).connect(master); o.start(t + start); o.stop(t + start + .7);
  }
  // Radio flicker, rising sweep, then logo impact at 0.55 seconds.
  noise(0,.13,.08,3200,800); noise(.16,.12,.06,1800,4000); noise(.18,.4,.15,250,4200);
  bass(55,.55,.55); noise(.55,.4,.2,3000,350);
  // A minor 9 to F major 7, with an original rising four-note motif.
  [[220,261.63,329.63,493.88],[174.61,220,261.63,329.63]].forEach((notes, i) => {
    notes.forEach(f => { tone(f,.55 + i * 1.05,1.65,.06,'sawtooth',-6); tone(f,.55 + i * 1.05,1.65,.06,'sawtooth',6); });
  });
  [329.63,440,493.88,659.25].forEach((f,i) => tone(f,.73 + i * .19,.68,.14));
  bass(43.65,1.6,.35); bass(55,2.37,.3);
  tone(440,2.36,1.15,.11); tone(659.25,2.36,1.2,.08);
  [1.05,1.43,1.81,2.19].forEach(start => noise(start,.07,.07,6500,3800));
  master.gain.setValueAtTime(.4,t + 3.25); master.gain.exponentialRampToValueAtTime(.0001,t + 3.8);
  const timer = setTimeout(() => ctx.close().catch(() => {}),3900);
  return () => { clearTimeout(timer); if (ctx.state !== 'closed') ctx.close().catch(() => {}); };
};

// Slow, original analog-style synth for the intro's fade into the site (about 5s).
// Browsers keep audio suspended until the visitor interacts, so it plays right
// away where allowed; otherwise a tap or key press unlocks it.
window.camoRhythm = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const GRACE_MS = 4000, EVENTS = ['pointerdown','touchend','keydown'];
  let ctx = null, cued = false, played = false, graceTimer = null;

  function schedule(ac, out, t0) {
    // Slow, dark analog feel: 96 BPM, D minor to Bb major, about 5 seconds.
    const beat = 60 / 96, eighth = beat / 2, length = beat * 6 + 1.15;
    const master = ac.createGain();
    master.gain.setValueAtTime(.62, t0);
    master.gain.setValueAtTime(.62, t0 + beat * 6);
    master.gain.exponentialRampToValueAtTime(.0001, t0 + length);
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.ratio.value = 6;
    master.connect(limiter).connect(out);

    // Long dark room, built from decaying noise so there is no file to load.
    const room = ac.createConvolver(), roomLevel = ac.createGain(), roomTone = ac.createBiquadFilter();
    const impulse = ac.createBuffer(2, Math.ceil(ac.sampleRate * 2.2), ac.sampleRate);
    let seed = 1984;
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 2147483648 - 1) * Math.pow(1 - i / data.length, 3);
      }
    }
    room.buffer = impulse; roomLevel.gain.value = .5;
    roomTone.type = 'lowpass'; roomTone.frequency.value = 2600;
    roomTone.connect(room); room.connect(roomLevel).connect(master);
    const echo = ac.createDelay(1.5), echoBack = ac.createGain(), echoLevel = ac.createGain();
    echo.delayTime.value = beat * .75; echoBack.gain.value = .38; echoLevel.gain.value = .3;
    echo.connect(echoBack).connect(echo); echo.connect(echoLevel).connect(master); echoLevel.connect(roomTone);

    // Pad and bass duck on each beat for the slow pumping feel.
    const pump = ac.createGain();
    pump.connect(master); pump.connect(roomTone);
    pump.gain.setValueAtTime(1, t0);
    for (let i = 0; i < 7; i++) {
      pump.gain.setValueAtTime(.42, t0 + i * beat);
      pump.gain.linearRampToValueAtTime(1, t0 + (i + .62) * beat);
    }

    const noiseBuf = ac.createBuffer(1, Math.ceil(ac.sampleRate * .6), ac.sampleRate);
    const noise = noiseBuf.getChannelData(0);
    for (let i = 0; i < noise.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; noise[i] = seed / 2147483648 - 1; }

    function pad(notes, at, dur) {
      notes.forEach(freq => [-9, 9].forEach(detune => {
        const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = detune;
        f.type = 'lowpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(420, at); f.frequency.linearRampToValueAtTime(1250, at + dur * .7);
        g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(.05, at + .35);
        g.gain.setValueAtTime(.05, at + dur - .12); g.gain.linearRampToValueAtTime(.0001, at + dur + .25);
        o.connect(f).connect(g).connect(pump); o.start(at); o.stop(at + dur + .3);
      }));
    }
    function bass(freq, at, dur, vol) {
      const f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(620, at); f.frequency.exponentialRampToValueAtTime(190, at + dur);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + .012);
      g.gain.setValueAtTime(vol, at + dur * .55); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
      f.connect(g).connect(pump);
      [['sawtooth', -6], ['sawtooth', 6], ['sine', 0]].forEach(([type, detune]) => {
        const o = ac.createOscillator();
        o.type = type; o.frequency.value = type === 'sine' ? freq / 2 : freq; o.detune.value = detune;
        o.connect(f); o.start(at); o.stop(at + dur + .02);
      });
    }
    function lead(points, at, dur, vol) {
      const f = ac.createBiquadFilter(), g = ac.createGain(), wobble = ac.createOscillator(), depth = ac.createGain();
      f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 2;
      wobble.frequency.value = 4.6;
      depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(11, at + .6);
      g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(vol, at + .1);
      g.gain.setValueAtTime(vol, at + dur - .3); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
      f.connect(g); g.connect(master); g.connect(echo);
      ['square', 'triangle'].forEach((type, n) => {
        const o = ac.createOscillator();
        o.type = type; o.detune.value = n ? 5 : -5;
        points.forEach(([freq, when], i) => {
          if (i === 0) o.frequency.setValueAtTime(freq, at + when);
          else { o.frequency.setValueAtTime(points[i - 1][0], at + when - .16); o.frequency.exponentialRampToValueAtTime(freq, at + when); }
        });
        wobble.connect(depth).connect(o.detune);
        o.connect(f); o.start(at); o.stop(at + dur + .02);
      });
      wobble.start(at); wobble.stop(at + dur + .02);
    }
    function kick(at) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(40, at + .14);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.62, at + .006); g.gain.exponentialRampToValueAtTime(.0001, at + .32);
      o.connect(g).connect(master); o.start(at); o.stop(at + .34);
    }
    function snare(at) {
      const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = .7;
      g.gain.setValueAtTime(.3, at); g.gain.exponentialRampToValueAtTime(.0001, at + .3);
      n.connect(f).connect(g); g.connect(master); g.connect(roomTone); n.start(at); n.stop(at + .32);
    }

    pad([146.83, 174.61, 220, 261.63], t0, beat * 4);
    pad([116.54, 146.83, 174.61, 220], t0 + beat * 4, beat * 2 + .7);
    for (let i = 0; i < 8; i++) bass(73.42, t0 + i * eighth, eighth * .9, i % 2 ? .17 : .26);
    for (let i = 0; i < 4; i++) bass(58.27, t0 + (8 + i) * eighth, eighth * .9, i % 2 ? .17 : .26);
    bass(73.42, t0 + beat * 6, 1, .24);
    [0, 2, 4, 6].forEach(i => kick(t0 + i * beat));
    [1, 3, 5].forEach(i => snare(t0 + i * beat));
    lead([[349.23, 0], [440, .75], [392, 1.75]], t0 + beat * 1.5, beat * 2.5 + .1, .075);
    lead([[293.66, 0], [349.23, .6]], t0 + beat * 4, beat * 2 + .85, .075);
    return length;
  }
  function detach() {
    clearTimeout(graceTimer);
    EVENTS.forEach(type => window.removeEventListener(type, onGesture, true));
  }
  function fire() {
    if (played || !ctx) return;
    played = true; detach();
    const active = ctx, length = schedule(active, active.destination, active.currentTime + .03);
    setTimeout(() => { if (active.state !== 'closed') active.close().catch(() => {}); }, (length + .4) * 1000);
  }
  function onGesture() {
    if (!ctx) return;
    const ready = ctx.resume();
    if (cued) ready.then(fire).catch(() => {});
  }
  function arm() {
    cancel();
    if (!AC) return;
    cued = false; played = false;
    try { ctx = new AC(); } catch { ctx = null; return; }
    ctx.resume().catch(() => {});
    EVENTS.forEach(type => window.addEventListener(type, onGesture, {capture:true, passive:true}));
  }
  function cue() {
    if (!ctx || cued) return;
    cued = true;
    if (ctx.state === 'running') fire();
    else graceTimer = setTimeout(cancel, GRACE_MS);
  }
  function cancel() {
    detach();
    if (ctx && !played && ctx.state !== 'closed') ctx.close().catch(() => {});
    if (!played) ctx = null;
  }
  return { arm, cue, cancel, schedule };
})();
