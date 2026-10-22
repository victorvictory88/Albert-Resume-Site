(() => {
  'use strict';
  const control = document.querySelector('.sound-control');
  const button = control.querySelector('.music-button');
  const label = control.querySelector('.music-label');
  const volume = control.querySelector('.music-volume');
  const status = control.querySelector('.music-status');
  let context, master, timer, playing = false;
  let nextChord = 0, nextMelody = 0, chordIndex = 0, melodyIndex = 0;
  // An original, slow composition using soft sine tones. All sound stays local.
  const chords = [[57, 60, 64], [53, 57, 60], [48, 55, 59], [55, 59, 62]];
  const melody = [76, 79, 81, 79, 76, 72, 74, 76, 79, 76, 74, 72, 69, 72, 74, 76];
  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  function tone(midi, when, duration, peak, pad = false) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.exponentialRampToValueAtTime(peak, when + (pad ? 1.3 : .035));
    envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
    envelope.connect(master);
    let ended = 0;
    [1, 2.002].forEach((partial, index) => {
      const oscillator = context.createOscillator();
      const partialGain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency(midi) * partial;
      partialGain.gain.value = index ? .13 : 1;
      oscillator.connect(partialGain).connect(envelope);
      oscillator.start(when);
      oscillator.stop(when + duration + .1);
      oscillator.onended = () => {
        oscillator.disconnect();
        partialGain.disconnect();
        if (++ended === 2) envelope.disconnect();
      };
    });
  }

  function schedule() {
    if (!playing || context.state !== 'running' || document.hidden) return;
    const horizon = context.currentTime + .4;
    while (nextChord < horizon) {
      chords[chordIndex % chords.length].forEach((note, i) => tone(note, nextChord + i * .11, 7.6, .065, true));
      nextChord += 6.4;
      chordIndex++;
    }
    while (nextMelody < horizon) {
      tone(melody[melodyIndex % melody.length], nextMelody, 3.8, .16);
      nextMelody += melodyIndex % 4 === 3 ? 2.4 : 1.6;
      melodyIndex++;
    }
  }

  function render() {
    control.dataset.state = playing ? 'playing' : 'paused';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Pause quiet music' : 'Play quiet music');
    label.textContent = playing ? 'Music on' : 'Quiet music';
    control.querySelector('.music-icon').textContent = playing ? 'Ⅱ' : '♫';
    volume.disabled = !playing;
  }

  async function toggle() {
    button.disabled = true;
    try {
      if (!context) {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!AudioEngine) throw new Error('Audio is unavailable');
        context = new AudioEngine();
        master = context.createGain();
        master.gain.value = 0;
        const lowpass = context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1900;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -22;
        compressor.knee.value = 18;
        compressor.ratio.value = 2;
        master.connect(lowpass).connect(compressor).connect(context.destination);
        nextChord = context.currentTime + .08;
        nextMelody = context.currentTime + 1.2;
      }
      if (playing) {
        playing = false;
        clearInterval(timer);
        master.gain.setTargetAtTime(0, context.currentTime, .04);
        await new Promise(resolve => setTimeout(resolve, 180));
        await context.suspend();
      } else {
        await context.resume();
        master.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, .2);
        playing = true;
        schedule();
        timer = setInterval(schedule, 100);
      }
      status.textContent = playing ? 'Quiet music is playing.' : 'Background music is paused.';
      render();
    } catch {
      playing = false;
      clearInterval(timer);
      render();
      status.textContent = 'Music is unavailable in this browser.';
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', toggle);
  volume.addEventListener('input', () => {
    volume.setAttribute('aria-valuetext', `${volume.value}% volume`);
    if (master) master.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, .12);
  });
  document.addEventListener('visibilitychange', async () => {
    if (!context || !playing) return;
    if (document.hidden) await context.suspend();
    else { await context.resume(); schedule(); }
  });
  render();
})();
