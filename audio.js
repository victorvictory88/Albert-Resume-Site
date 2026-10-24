// Compatibility cleanup for older cached pages. Page background music is removed.
(() => {
  try { localStorage.setItem('albert-career-music', 'off'); } catch {}
  document.querySelector('.sound-control')?.remove();
})();
