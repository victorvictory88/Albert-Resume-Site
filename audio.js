(() => {
  'use strict';
  const control = document.querySelector('.sound-control');
  const button = control.querySelector('.music-button');
  const label = control.querySelector('.music-label');
  const volume = control.querySelector('.music-volume');
  const status = control.querySelector('.music-status');
  const preferenceKey = 'albert-career-music';
  let enabled = true;
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch {}
  let context, master, timer, playing = false, mediaActive = false;
  const gestureEvents = ['pointerup', 'keydown'];
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
    if (!playing || context.state !== 'running' || document.hidden || mediaActive) return;
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
    const audible = enabled && playing && context?.state === 'running' && !document.hidden && !mediaActive;
    control.dataset.state = mediaActive ? 'video' : audible ? 'playing' : enabled ? 'ready' : 'paused';
    control.dataset.audioState = context?.state || 'idle';
    button.setAttribute('aria-pressed', String(audible));
    button.setAttribute('aria-label', audible ? 'Pause background music' : 'Play background music');
    label.textContent = mediaActive ? 'Music paused' : audible ? 'Music on' : enabled ? 'Play music' : 'Music off';
    control.querySelector('.music-icon').textContent = audible ? 'Ⅱ' : '♫';
    volume.disabled = !enabled;
  }

  function syncPlayback() {
    const running = enabled && context?.state === 'running' && !document.hidden && !mediaActive;
    if (running && !playing) {
      playing = true;
      nextChord = context.currentTime + .08;
      nextMelody = context.currentTime + 1.2;
      master.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, .2);
      schedule();
      clearInterval(timer);
      timer = setInterval(schedule, 100);
      status.textContent = 'Quiet music is playing.';
    } else if (!running) {
      playing = false;
      clearInterval(timer);
    }
    render();
  }

  function createEngine() {
    if (context) return;
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
    context.addEventListener('statechange', syncPlayback);
  }

  function start() {
    if (!enabled || document.hidden || mediaActive) return;
    try {
      createEngine();
      // Autoplay can stay suspended until a trusted visitor interaction.
      // Keep the off switch usable while a resume request is pending.
      context.resume().then(() => {
        if (!enabled || document.hidden || mediaActive) context.suspend().catch(() => {});
        syncPlayback();
      }).catch(() => {
        syncPlayback();
        status.textContent = 'Use the music control to start playback.';
      });
      syncPlayback();
    } catch {
      enabled = false;
      playing = false;
      clearInterval(timer);
      render();
      status.textContent = 'Music is unavailable in this browser.';
    }
  }

  function onGesture(event) {
    if (!enabled || playing || mediaActive || !event.isTrusted || event.target.closest('.sound-control')) return;
    if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key))) return;
    start();
  }
  function listenForPlayback() {
    gestureEvents.forEach(type => document[enabled ? 'addEventListener' : 'removeEventListener'](type, onGesture));
  }
  function toggle() {
    // A pending autoplay request is silent, so the first click must start it.
    const audible = enabled && playing && context?.state === 'running' && !document.hidden && !mediaActive;
    enabled = !audible;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch {}
    listenForPlayback();
    if (enabled) start();
    else {
      playing = false;
      clearInterval(timer);
      if (context) {
        master.gain.setTargetAtTime(0, context.currentTime, .04);
        setTimeout(() => { if (!enabled) context.suspend().catch(() => {}); }, 180);
      }
      render();
    }
    status.textContent = enabled ? 'Background music is enabled.' : 'Background music is turned off.';
  }

  button.addEventListener('click', toggle);
  volume.addEventListener('input', () => {
    volume.setAttribute('aria-valuetext', `${volume.value}% volume`);
    if (master && enabled) master.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, .12);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (context) context.suspend().catch(() => {});
    } else if (enabled) start();
  });
  document.addEventListener('speaking-video-open', () => {
    mediaActive = true;
    playing = false;
    clearInterval(timer);
    if (context) {
      master.gain.setValueAtTime(0, context.currentTime);
      context.suspend().catch(() => {});
    }
    render();
  });
  document.addEventListener('speaking-video-close', () => {
    mediaActive = false;
    if (enabled) start();
    else render();
  });
  listenForPlayback();
  render();
  start();
})();
