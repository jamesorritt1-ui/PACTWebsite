/* =========================================================
   THE PERFORMANCE ACT — HOMEPAGE EFFECTS · home.js v1
   1. Photo reveals and heading fade-ups as sections arrive
   2. Hero photo slowly zooms and darkens as you scroll
   3. Word band moves with the scroll (no auto-play)
   4. "Psychology, applied in sport" photo drifts (parallax)
   5. Scroll progress line (fallback where CSS can't do it)
   6. Photo panels open the matching "Who we support" tab
   Nothing runs for prefers-reduced-motion except #6.
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- 6. Photo panels -> matching tab (always on) ---------- */
  document.querySelectorAll('.hm-path[data-journey]').forEach(function (panel) {
    panel.addEventListener('click', function () {
      var btn = document.querySelector('.tabs__btn[data-tab="' + panel.getAttribute('data-journey') + '"]');
      if (btn) btn.click();
    });
  });

  if (reduce) return;

  /* ---------- 1. Reveals ---------- */
  if ('IntersectionObserver' in window) {
    root.classList.add('hm-js-reveal');
    document.querySelectorAll('.hm-head, .hm-paths-head, .hm-statement, .hm-person__role, .hm-person__bio').forEach(function (el) {
      el.classList.add('hm-fade');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    document.querySelectorAll('.hm-reveal, .hm-fade').forEach(function (el) {
      // gentle stagger for siblings (e.g. the three photo panels)
      if (el.classList.contains('hm-reveal') && el.closest('.hm-path')) {
        var idx = Array.prototype.indexOf.call(el.closest('.hm-paths').children, el.closest('.hm-path'));
        el.style.setProperty('animation-delay', (idx * 0.12) + 's');
        var img = el.querySelector('img');
        if (img) img.style.animationDelay = (0.42 + idx * 0.12) + 's';
      }
      io.observe(el);
    });

    // Tab photos: re-run the reveal when a new tab is shown
    document.querySelectorAll('.tabs__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById('tab-' + btn.getAttribute('data-tab'));
        var photo = panel && panel.querySelector('.hm-reveal');
        if (!photo) return;
        photo.classList.remove('is-in');
        void photo.offsetWidth; // restart the animation
        photo.classList.add('is-in');
      });
    });
  }

  /* ---------- 2-5. Scroll-linked effects (one rAF loop) ---------- */
  var hero = document.querySelector('[data-hm-hero]');
  var heroBg = hero ? hero.querySelector('.hero__bg') : null;
  var ticker = document.querySelector('[data-hm-ticker]');
  var applied = document.querySelector('.hm-applied');
  var progressEl = document.querySelector('.hm-progress');
  var cssProgress = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    if (hero && heroBg) {
      var h = hero.offsetHeight || vh;
      var p = Math.min(1, Math.max(0, y / h));
      hero.style.setProperty('--hm-hero-p', p.toFixed(3));
      heroBg.style.transform = 'translateY(' + (y * 0.25).toFixed(1) + 'px) scale(' + (1 + p * 0.08).toFixed(4) + ')';
    }

    if (ticker) {
      var r = ticker.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        var third = ticker.scrollWidth / 3;
        var shift = ((vh - r.top) * 0.45) % third;
        ticker.style.transform = 'translate3d(' + (-shift).toFixed(1) + 'px,0,0)';
      }
    }

    if (applied) {
      var a = applied.getBoundingClientRect();
      if (a.bottom > 0 && a.top < vh) {
        var t = (a.top + a.height / 2 - vh / 2) / vh; // -1..1 around the centre
        applied.style.setProperty('--hm-par', (t * -60).toFixed(1));
      }
    }

    if (progressEl && !cssProgress) {
      var max = root.scrollHeight - vh;
      progressEl.style.setProperty('--hm-progress', max > 0 ? (y / max).toFixed(4) : 0);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
