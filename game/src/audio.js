// Golden Hour Skies — synthesized sound.
// One clear job: every sound the game makes, built with WebAudio oscillators
// and noise, no audio files. Engine hum follows the throttle; rings chime,
// touchdowns thud, crashes rumble. M toggles mute.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let master = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: two detuned sawtooths through a lowpass, pitch follows throttle.
      engineOsc = ctx.createOscillator();
      engineOsc2 = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc2.type = 'square';
      engineOsc.frequency.value = 55;
      engineOsc2.frequency.value = 82;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, lowFreq) {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from the first user gesture; browsers need one. */
    unlock() {
      if (ensure() && ctx && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, airborne, speed) {
      if (!ctx || !engineOsc) return;
      const t = ctx.currentTime;
      const base = 46 + throttle * 58 + speed * 0.12;
      engineOsc.frequency.setTargetAtTime(base, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(base * 1.5 + 3, t, 0.08);
      const vol = airborne || throttle > 0.05 ? 0.045 + throttle * 0.075 : 0.0;
      engineGain.gain.setTargetAtTime(muted ? 0 : vol, t, 0.1);
    },
    ringChime() {
      tone(880, 0.5, 'sine', 0.22);
      tone(1318, 0.6, 'sine', 0.16, 0.07);
      tone(1760, 0.7, 'sine', 0.1, 0.14);
    },
    touchdown() {
      noise(0.25, 0.5, 300);
      tone(70, 0.3, 'sine', 0.35);
    },
    crash() {
      noise(0.9, 0.7, 220);
      tone(48, 0.8, 'sine', 0.4);
      tone(36, 1.0, 'sine', 0.3, 0.15);
    },
    click() {
      tone(660, 0.08, 'square', 0.08);
    },
    winFanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.16, i * 0.12));
    },
    stallWarning() {
      tone(220, 0.18, 'square', 0.1);
      tone(220, 0.18, 'square', 0.1, 0.22);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
