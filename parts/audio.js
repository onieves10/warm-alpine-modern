/* ============================================================
   WAMAudio — soft, generative "warm alpine" ambient pad.
   Pure Web Audio (no files). Must be start()ed from a user gesture.
   ============================================================ */
window.WAMAudio = (function () {
  var ctx, sum, trem, master, filt, started = false, playing = false;
  var baseCut = 900;

  function impulse(dur, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * dur), buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function brownNoise(dur) {
    var rate = ctx.sampleRate, len = Math.floor(rate * dur), buf = ctx.createBuffer(1, len, rate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    return buf;
  }

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain(); master.gain.value = 0.0001;
    trem   = ctx.createGain(); trem.gain.value = 0.94;
    sum    = ctx.createGain(); sum.gain.value = 1.0;
    sum.connect(trem); trem.connect(master); master.connect(ctx.destination);

    // warm pad: A add9 voicing, detuned pairs for chorus
    filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = baseCut; filt.Q.value = 0.7;
    var conv = ctx.createConvolver(); conv.buffer = impulse(3.4, 2.6);
    var wet = ctx.createGain(); wet.gain.value = 0.55;
    var dry = ctx.createGain(); dry.gain.value = 0.75;
    filt.connect(dry); dry.connect(sum);
    filt.connect(conv); conv.connect(wet); wet.connect(sum);

    var freqs = [55.00, 82.41, 110.00, 164.81, 220.00, 277.18]; // A1 E2 A2 E3 A3 C#4
    var gains = [0.16, 0.12, 0.13, 0.10, 0.07, 0.045];
    for (var i = 0; i < freqs.length; i++) {
      for (var p = 0; p < 2; p++) {
        var o = ctx.createOscillator();
        o.type = i < 3 ? 'sine' : 'triangle';
        o.frequency.value = freqs[i];
        o.detune.value = p === 0 ? -6 : 6;
        var g = ctx.createGain(); g.gain.value = gains[i] * 0.5;
        o.connect(g); g.connect(filt); o.start();
      }
    }

    // slow "breathing" on the filter
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    var lfoG = ctx.createGain(); lfoG.gain.value = 340;
    lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();

    // slow amplitude swell
    var alfo = ctx.createOscillator(); alfo.frequency.value = 0.08;
    var alfoG = ctx.createGain(); alfoG.gain.value = 0.06;
    alfo.connect(alfoG); alfoG.connect(trem.gain); alfo.start();

    // whisper of warm air
    var noise = ctx.createBufferSource(); noise.buffer = brownNoise(5); noise.loop = true;
    var nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 480;
    var ng = ctx.createGain(); ng.gain.value = 0.016;
    noise.connect(nf); nf.connect(ng); ng.connect(sum); noise.start();
  }

  function start() {
    if (playing) return;
    if (!ctx) { try { build(); } catch (e) { return; } }
    if (ctx.state === 'suspended') ctx.resume();
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.linearRampToValueAtTime(0.62, now + 2.6);
    playing = true; started = true;
  }
  function stop() {
    if (!ctx || !playing) return;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    playing = false;
  }
  function setMood(name) {
    baseCut = name === 'cosmos' ? 1300 : name === 'warm' ? 760 : 900;
    if (ctx && filt) filt.frequency.setTargetAtTime(baseCut, ctx.currentTime, 2.5);
  }

  return {
    start: start, stop: stop,
    toggle: function () { playing ? stop() : start(); },
    isOn: function () { return playing; },
    isStarted: function () { return started; },
    setMood: setMood
  };
})();
