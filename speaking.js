(() => {
  'use strict';
  const dialog = document.querySelector('#speaking-dialog');
  if (!dialog) return;
  const video = dialog.querySelector('video');
  const title = dialog.querySelector('#reel-dialog-title');
  const status = dialog.querySelector('.reel-status');
  let trigger, generation = 0;
  document.querySelectorAll('.speaking-tile').forEach(button => {
    button.addEventListener('click', () => {
      trigger = button;
      const current = ++generation;
      title.textContent = button.dataset.title;
      status.textContent = '';
      video.poster = button.querySelector('img').getAttribute('src');
      video.querySelectorAll('track').forEach(track => track.remove());
      const captions = document.createElement('track');
      captions.kind = 'captions';
      captions.srclang = 'en';
      captions.label = button.dataset.reel === 'icesi' ? 'English translation' : 'English';
      captions.src = `assets/speaking/${button.dataset.reel}-en.vtt`;
      captions.default = window.matchMedia('(max-width: 600px)').matches;
      video.append(captions);
      video.src = `assets/speaking/${button.dataset.reel}-15s.mp4`;
      video.setAttribute('aria-label', `${button.dataset.title}, 15-second preview`);
      document.dispatchEvent(new Event('speaking-video-open'));
      dialog.showModal();
      document.documentElement.classList.add('reel-open');
      video.play().catch(() => {
        if (dialog.open && current === generation) status.textContent = 'Press play to watch this preview.';
      });
    });
  });
  function close() { if (dialog.open) dialog.close(); }
  dialog.querySelector('.reel-close').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  dialog.addEventListener('close', () => {
    generation++;
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('track').forEach(track => track.remove());
    video.load();
    document.documentElement.classList.remove('reel-open');
    document.dispatchEvent(new Event('speaking-video-close'));
    trigger?.focus({preventScroll: true});
  });
  video.addEventListener('error', () => {
    if (dialog.open && video.hasAttribute('src')) status.textContent = 'This preview could not load. Please close it and try again.';
  });
  const ticker = document.querySelector('.speaker-ticker');
  const pause = document.querySelector('.photo-pause');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncPhotoControl() {
    const motionOff = reducedMotion.matches || document.documentElement.classList.contains('no-motion');
    const paused = ticker.classList.contains('photos-paused');
    pause.disabled = motionOff;
    pause.setAttribute('aria-pressed', String(motionOff || paused));
    pause.setAttribute('aria-label', motionOff ? 'Photo motion is paused by your motion preference' : `${paused ? 'Play' : 'Pause'} speaking photo strip`);
    pause.innerHTML = motionOff ? 'Motion paused' : `${paused ? 'Play' : 'Pause'} photos <span aria-hidden="true">${paused ? '▶' : 'Ⅱ'}</span>`;
  }
  pause.addEventListener('click', () => { ticker.classList.toggle('photos-paused'); syncPhotoControl(); });
  new MutationObserver(syncPhotoControl).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  reducedMotion.addEventListener('change', syncPhotoControl);
  syncPhotoControl();
})();
