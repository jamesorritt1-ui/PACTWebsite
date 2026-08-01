/* ===========================================================
   Scroll-reveal — The Performance Act
   Progressive enhancement: adds subtle fade/slide-up as sections
   enter the viewport. No-JS and reduced-motion users see all
   content immediately (nothing is ever left hidden).
   =========================================================== */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var SELECTORS = [
    '.section-heading', '.section-intro',
    '.about-grid__image', '.about-grid__content',
    '.pillar-card', '.journey-card', '.stat', '.team-card',
    '.privacy-note', '.privacy-note + .programs-footer',
    '.sp-section__media', '.sp-section__content',
    '.sp-lead__title', '.sp-lead__text', '.sp-lead__aside',
    '.sp-choice-card', '.sp-both__inner', '.sp-imm__inner',
    '.ap-section-title', '.ap-cta__inner', '.tm-philosophy',
    '.grow-grid__content', '.grow-grid__image', '.bespoke-intro',
    '.accordion__item', '.cta-banner__content',
    '.newsletter__title', '.newsletter__subtitle'
  ];

  var els = [];
  SELECTORS.forEach(function (sel) {
    var found = document.querySelectorAll(sel);
    for (var i = 0; i < found.length; i++) {
      var el = found[i];
      if (el.hasAttribute('data-reveal')) continue;
      el.setAttribute('data-reveal', el.classList.contains('sp-section__media') ? 'media' : '');
      els.push(el);
    }
  });
  if (!els.length) return;

  document.documentElement.classList.add('reveal-ready');

  // Gentle stagger for siblings that share a parent (cards, list rows, etc.)
  var seen = new Map();
  els.forEach(function (el) {
    var p = el.parentElement;
    var n = seen.get(p) || 0;
    seen.set(p, n + 1);
    if (n > 0) el.style.transitionDelay = Math.min(n * 90, 320) + 'ms';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  els.forEach(function (el) { io.observe(el); });
})();
