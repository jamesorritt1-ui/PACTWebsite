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
    /* clamp so the runner never hangs off either screen edge */
    if (avatar) avatar.style.left = 'clamp(12px, ' + w + '%, calc(100% - 12px))';
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

  /* ---- 3. Sticky mini table-of-contents -------------------------------- */
  var tocTicking = false, tocScan = null;

  function headerH() {
    var v = parseFloat(getComputedStyle(root).getPropertyValue('--header-height'));
    return isNaN(v) ? 80 : v;
  }

  function setupToc() {
    var src = document.querySelector('.thm-toc');
    if (!src) return;                       /* modules only; hub/bonus skip */
    var links = src.querySelectorAll('a[href^="#"]');
    if (!links.length) return;

    var bar = document.createElement('nav');
    bar.className = 'thx-toc';
    bar.setAttribute('aria-label', 'Section navigation');
    var inner = document.createElement('div');
    inner.className = 'thx-toc__inner';

    var map = [];
    links.forEach(function (l) {
      var id = (l.getAttribute('href') || '').slice(1);
      var sec = id && document.getElementById(id);
      if (!sec) return;
      var a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = l.textContent;
      inner.appendChild(a);
      map.push({ id: id, link: a, section: sec });
    });
    if (!map.length) return;

    bar.appendChild(inner);
    document.body.appendChild(bar);

    var hero = document.querySelector('.thm-hero');
    var active = null;

    tocScan = function () {
      /* show once we've scrolled past the hero */
      var past = hero
        ? (hero.getBoundingClientRect().bottom < 60)
        : ((window.scrollY || 0) > 240);
      bar.classList.toggle('is-visible', past);

      /* which section are we in? last one whose top has crossed the probe
         line (upper third of the viewport). */
      var probe = headerH() + Math.min(150, window.innerHeight * 0.35);
      var cur = map[0].id;
      for (var i = 0; i < map.length; i++) {
        if (map[i].section.getBoundingClientRect().top <= probe) cur = map[i].id;
      }
      /* at the very bottom the last section may never reach the probe line
         (page scroll is clamped) — select it explicitly */
      var docH = document.documentElement.scrollHeight;
      if ((window.scrollY || 0) + window.innerHeight >= docH - 4) {
        cur = map[map.length - 1].id;
      }
      if (cur !== active) {
        active = cur;
        map.forEach(function (m) {
          var on = m.id === cur;
          m.link.classList.toggle('is-active', on);
          if (on) {
            /* keep the active chip centred without touching page scroll */
            bar.scrollLeft = m.link.offsetLeft - bar.clientWidth / 2 + m.link.clientWidth / 2;
          }
        });
      }
      tocTicking = false;
    };

    window.addEventListener('scroll', function () {
      if (!tocTicking) { tocTicking = true; requestAnimationFrame(tocScan); }
    }, { passive: true });
    tocScan();
  }

  function init() {
    document.body.appendChild(track);
    fill = track.querySelector('.thx-track__fill');
    avatar = track.querySelector('.thx-track__avatar');
    update();
    setupReveal();
    setupToc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      onScroll();
      if (tocScan) tocScan();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
