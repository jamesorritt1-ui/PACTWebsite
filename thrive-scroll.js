/* ==========================================================================
   THRIVE scroll enhancements  (shared across all THRIVE pages)
   1) Gamified avatar-track scroll-progress bar
   2) Fast fade / slide-in reveal-on-scroll (IntersectionObserver)
   Mobile-first, prefers-reduced-motion aware, degrades gracefully with no JS.
   ========================================================================== */
(function () {
  var root = document.documentElement;
  root.classList.add('thx-js');

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Avatar progress track ---------------------------------------- */
  var track = document.createElement('div');
  track.className = 'thx-track';
  track.setAttribute('aria-hidden', 'true');
  track.innerHTML =
    '<div class="thx-track__fill"></div>' +
    '<div class="thx-track__flag">🏁</div>' +   /* 🏁 */
    '<div class="thx-track__avatar">🏃</div>';   /* 🏃 */
  var fill, avatar, ticking = false, done = false;

  function progress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (max <= 0) return 0;
    var y = window.scrollY || h.scrollTop || 0;
    return Math.min(1, Math.max(0, y / max));
  }

  function update() {
    var w = progress() * 100;
    if (fill) fill.style.width = w + '%';
    if (avatar) avatar.style.left = w + '%';
    if (w >= 99.5) {
      if (!done) { done = true; track.classList.add('is-done'); }
    } else if (done) {
      done = false; track.classList.remove('is-done');
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  /* ---- 2. Reveal on scroll --------------------------------------------- */
  function setupReveal() {
    var wraps = document.querySelectorAll('.th-sec .th-wrap, .th-sec > .container.th');
    var items = [];
    for (var i = 0; i < wraps.length; i++) {
      var kids = wraps[i].children;
      for (var j = 0; j < kids.length; j++) {
        var el = kids[j];
        el.classList.add('thx-reveal');
        if (!reduce) el.style.transitionDelay = (Math.min(j, 4) * 55) + 'ms';
        items.push(el);
      }
    }
    if (!items.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      for (var k = 0; k < items.length; k++) items[k].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });

    /* Safety net: never leave content hidden if something goes wrong */
    setTimeout(function () {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }, 4000);
  }

  function init() {
    document.body.appendChild(track);
    fill = track.querySelector('.thx-track__fill');
    avatar = track.querySelector('.thx-track__avatar');
    update();
    setupReveal();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
