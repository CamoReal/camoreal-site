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
