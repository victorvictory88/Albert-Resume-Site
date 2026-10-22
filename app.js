(() => {
  'use strict';
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('has-js');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const hero = $('.hero');
  const scene = $('.greeting-scene');
  const waveDisplacement = $('#wave-displacement');
  const badge = $('.crew-badge');
  const motionButton = $('.motion-toggle');
  const route = $('#route');
  const boat = $('#boat');
  const chapters = $$('.chapter');
  const markers = $$('.map-marker');
  const checkpointLinks = $$('.course-nav a');
  const directionButtons = $$('[data-direction]');
  const fractions = [0, .2, .4, .56, .79, 1];
  const routeLength = route.getTotalLength();
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = preference.matches;
  let pointerX = 0, pointerY = 0, currentX = 0, currentY = 0;
  let currentProgress = -1, raf = 0, manualDirection = false;
  let lastInput = Date.now(), idleTick = 0, heroVisible = true, waveFrame = 0;
  const heroObserver = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; scene.classList.toggle('offscreen', !heroVisible); });
  heroObserver.observe(hero);
  setInterval(() => {
    if (motionPaused || document.hidden || !heroVisible || manualDirection || Date.now() - lastInput < 4500) return;
    const sequence = ['front', 'left', 'front', 'right', 'front'];
    idleTick = (idleTick + 1) % sequence.length;
    setDirection(sequence[idleTick]);
  }, 3500);
  function stopWave() {
    cancelAnimationFrame(waveFrame);
    waveFrame = 0;
    waveDisplacement.setAttribute('scale', '0');
    scene.classList.remove('wave-now');
  }

  function playWave() {
    stopWave();
    if (motionPaused || document.hidden || !heroVisible) return;
    setDirection('front');
    scene.classList.add('wave-now');
    const started = performance.now();
    function waveTick(now) {
      const progress = (now - started) / 1800;
      if (progress >= 1 || motionPaused || !heroVisible || document.hidden) {
        stopWave();
        return;
      }
      const envelope = Math.sin(Math.PI * progress);
      const sway = Math.sin(progress * Math.PI * 6) * envelope * .085;
      waveDisplacement.setAttribute('scale', sway.toFixed(5));
      waveFrame = requestAnimationFrame(waveTick);
    }
    waveFrame = requestAnimationFrame(waveTick);
  }

  $('.wave-button').addEventListener('click', () => {
    lastInput = Date.now();
    manualDirection = false;
    playWave();
  });
  setInterval(() => {
    if (!manualDirection && Date.now() - lastInput > 4500) playWave();
  }, 11000);

  function setDirection(direction) {
    scene.dataset.look = direction;
    directionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === direction)));
  }

  directionButtons.forEach(button => button.addEventListener('click', () => {
    manualDirection = true;
    lastInput = Date.now();
    setTimeout(() => { manualDirection = false; }, 5500);
    setDirection(button.dataset.direction);
  }));

  function applyMotionPreference() {
    document.documentElement.classList.toggle('no-motion', motionPaused);
    if (motionPaused) stopWave();
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    motionButton.setAttribute('aria-label', motionPaused ? 'Enable decorative motion' : 'Pause decorative motion');
    motionButton.title = motionPaused ? 'Enable decorative motion' : 'Pause decorative motion';
    motionButton.innerHTML = `<span aria-hidden="true">${motionPaused ? '▷' : 'Ⅱ'}</span>`;
    if (motionPaused) {
      pointerX = pointerY = currentX = currentY = 0;
      hero.style.setProperty('--motion-x', '0px');
      hero.style.setProperty('--motion-y', '0px');
      hero.style.setProperty('--motion-angle', '0deg');
      hero.style.setProperty('--head-angle', '0deg');
      setDirection('front');
    }
    requestUpdate();
  }
  motionButton.addEventListener('click', () => { motionPaused = !motionPaused; applyMotionPreference(); });
  preference.addEventListener('change', event => { motionPaused = event.matches; applyMotionPreference(); });

  hero.addEventListener('pointermove', event => {
    if (motionPaused || event.pointerType === 'touch' || drag) return;
    lastInput = Date.now();
    const rect = hero.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    pointerX = (nx - .5) * 32;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * 18;
    if (!manualDirection) setDirection(nx < .34 ? 'left' : nx > .67 ? 'right' : 'front');
    requestUpdate();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    pointerX = pointerY = 0;
    manualDirection = false;
    if (!motionPaused) setDirection('front');
    requestUpdate();
  });

  let drag = null, dragged = false, flip = false;
  let releaseTimer;
  badge.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    badge.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    dragged = false;
    clearTimeout(releaseTimer);
    badge.style.animation = 'none';
    badge.style.transition = 'none';
  });
  badge.addEventListener('pointermove', event => {
    if (!drag) return;
    const x = Math.max(-70, Math.min(70, event.clientX - drag.x));
    const y = Math.max(-30, Math.min(65, event.clientY - drag.y));
    if (Math.abs(x) + Math.abs(y) > 8) dragged = true;
    if (!motionPaused) badge.style.transform = `translate(${x}px,${y}px) rotate(${8 + x * .23}deg) rotateY(${flip ? 180 : 0}deg)`;
  });
  function releaseBadge(event) {
    if (!drag) return;
    if (badge.hasPointerCapture(event.pointerId)) badge.releasePointerCapture(event.pointerId);
    drag = null;
    badge.style.transition = '';
    badge.style.transform = '';
    releaseTimer = setTimeout(() => { dragged = false; }, 120);
  }
  badge.addEventListener('pointerup', releaseBadge);
  badge.addEventListener('pointercancel', releaseBadge);
  badge.addEventListener('click', () => {
    if (dragged) return;
    flip = !flip;
    badge.classList.toggle('flipped', flip);
    badge.setAttribute('aria-pressed', String(flip));
    $('.badge-front').setAttribute('aria-hidden', String(flip));
    $('.badge-back').setAttribute('aria-hidden', String(!flip));
    badge.setAttribute('aria-label', flip ? 'Flip Albert’s crew pass to the front' : 'Flip Albert’s interactive crew pass');
  });
  badge.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key) || motionPaused) return;
    event.preventDefault();
    badge.style.animation = 'none';
    badge.style.transform = `rotate(${event.key === 'ArrowLeft' ? -15 : 18}deg) rotateY(${flip ? 180 : 0}deg)`;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => { badge.style.transform = ''; }, 650);
  });

  markers.forEach((marker, index) => {
    const point = route.getPointAtLength(routeLength * fractions[index]);
    marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
  });

  function updateCourse() {
    const mobile = window.innerWidth <= 760;
    const focus = mobile ? 280 + (window.innerHeight - 280) * .42 : window.innerHeight * .51;
    const centers = chapters.map(chapter => {
      const rect = chapter.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    let active = centers.reduce((best, value, i) => Math.abs(value - focus) < Math.abs(centers[best] - focus) ? i : best, 0);
    let progress = 0;
    if (centers[0] >= focus) progress = 0;
    else if (centers.at(-1) <= focus) progress = 1;
    else {
      const next = centers.findIndex(center => center > focus);
      const previous = next - 1;
      const t = (focus - centers[previous]) / (centers[next] - centers[previous]);
      progress = fractions[previous] + (fractions[next] - fractions[previous]) * t;
    }
    progress = Math.max(0, Math.min(1, progress));
    chapters.forEach((chapter, i) => chapter.classList.toggle('active', i === active));
    markers.forEach((marker, i) => { marker.classList.toggle('active', i === active); marker.classList.toggle('passed', i < active); });
    checkpointLinks.forEach((link, i) => {
      link.classList.toggle('active', i === active);
      if (i === active) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });
    $('.course-current').textContent = ['Rowland AI', 'Meta', 'Tickr', 'Google · Japan & Korea', 'Google · eCommerce', 'P&G'][active];
    $('.course-progress > span').style.width = `${progress * 100}%`;
    const point = route.getPointAtLength(routeLength * progress);
    const before = route.getPointAtLength(Math.max(0, routeLength * progress - 2));
    const after = route.getPointAtLength(Math.min(routeLength, routeLength * progress + 2));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    if (!motionPaused) boat.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
    const stroke = motionPaused ? 0 : Math.sin(progress * 100) * 20;
    $('.oar-left').setAttribute('transform', `rotate(${stroke})`);
    $('.oar-right').setAttribute('transform', `rotate(${-stroke})`);
    currentProgress = progress;
  }

  function frame() {
    raf = 0;
    updateCourse();
    if (!motionPaused) {
      currentX += (pointerX - currentX) * .11;
      currentY += (pointerY - currentY) * .11;
      hero.style.setProperty('--motion-x', `${currentX.toFixed(2)}px`);
      hero.style.setProperty('--motion-y', `${currentY.toFixed(2)}px`);
      hero.style.setProperty('--motion-angle', `${(currentX * .025).toFixed(3)}deg`);
      hero.style.setProperty('--head-angle', `${(currentX * .16).toFixed(3)}deg`);
      if (Math.abs(pointerX - currentX) + Math.abs(pointerY - currentY) > .05) requestUpdate();
    }
  }
  function requestUpdate() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  // Career highlights remain visible without disclosure controls.

  $('.copy-email').addEventListener('click', async () => {
    const status = $('.copy-status');
    try {
      await navigator.clipboard.writeText('albertchan@alumni.harvard.edu');
      status.textContent = 'Email address copied to clipboard.';
    } catch {
      status.textContent = 'albertchan@alumni.harvard.edu';
    }
  });
  applyMotionPreference();
  playWave();
})();
