/* =========================================================
   PRE-PERFORMANCE ROUTINE LANDING PAGE — routine.js v1
   1. Mobile sticky booking bar
   2. GA4 click events: book_korero, download_guide
   3. Keyboard access for diagrams that scroll sideways
   4. "View helplines" button opens the existing support modal
      (plus 4b: confirms the guide opened in a new tab,
       4c: share button)
   No dependencies. Safe to load with defer.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. Mobile sticky booking bar ----------
     Shows once the hero has scrolled out of view and hides again
     from the final yellow band down, so it never sits over the
     band, the immediate support module or the footer. CSS only
     displays it at 768px and below, and lifts the floating
     "Immediate Support" and scroll-to-top buttons above it. */
  var bar = document.getElementById('rtSticky');
  var hero = document.querySelector('[data-rt-hero]');
  var finalBand = document.querySelector('[data-rt-final]');

  if (bar && hero && finalBand) {
    var shown = false;
    var ticking = false;

    var update = function () {
      ticking = false;
      var pastHero = hero.getBoundingClientRect().bottom <= 0;
      var beforeFinal = finalBand.getBoundingClientRect().top > window.innerHeight;
      var show = pastHero && beforeFinal;
      if (show === shown) return;
      shown = show;
      bar.classList.toggle('is-visible', show);
      document.body.classList.toggle('rt-sticky-on', show);
    };

    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- 2. GA4 click events ----------
     Any link with data-track sends that event name to GA4 through
     the site's existing gtag. Nothing new is loaded and no cookies
     are added. The site-wide contact_click event in script.js still
     fires as well for links to /contact. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[data-track]') : null;
    if (!link || typeof window.gtag !== 'function') return;

    var params = {
      link_location: link.getAttribute('data-track-location') || 'page',
      link_url: link.getAttribute('href') || '',
      page_path: window.location.pathname
    };

    if (link.getAttribute('data-track') === 'download_guide') {
      params.file_name = 'tpa-pre-performance-routine-guide.pdf';
      params.file_extension = 'pdf';
    }

    window.gtag('event', link.getAttribute('data-track'), params);
  });

  /* ---------- 3. Diagrams that scroll sideways ----------
     On small screens the diagrams keep a readable size and scroll
     inside their panel. When (and only when) a panel overflows, make
     it focusable so keyboard users can scroll it, and show the hint. */
  var scrollers = document.querySelectorAll('.rt-diagram__scroll');

  var checkScrollers = function () {
    for (var i = 0; i < scrollers.length; i++) {
      var el = scrollers[i];
      var figure = el.closest('[data-diagram]');
      var overflowing = el.scrollWidth > el.clientWidth + 2;
      if (figure) figure.classList.toggle('is-scrollable', overflowing);
      if (overflowing) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', el.getAttribute('data-scroll-label') || 'Diagram');
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    }
  };

  if (scrollers.length) {
    checkScrollers();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkScrollers, 150);
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(checkScrollers);
  }

  /* ---------- 4b. Confirm the guide opened ----------
     The PDF opens in a new tab, which is easy to miss on a phone.
     After a download click, the nearest status line (role="status")
     says so, and screen readers announce it. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[data-track="download_guide"]') : null;
    if (!link) return;
    var scope = link.closest('[data-dl-scope]') ||
      (link.closest('.rt-hero') && document.querySelector('.rt-hero [data-dl-scope]')) ||
      (link.closest('.rt-download') && document.querySelector('.rt-download [data-dl-scope]'));
    var status = scope ? scope.querySelector('.rt-dl-status') : null;
    if (!status) return;
    status.textContent = '';
    setTimeout(function () { status.textContent = 'The guide has opened in a new tab.'; }, 60);
  });

  /* ---------- 4c. "Send it to a teammate or coach" ----------
     Uses the phone's own share sheet where available, otherwise copies
     the page link. The shared link is tagged so GA4 shows shares. */
  var shareBtn = document.querySelector('[data-share]');
  if (shareBtn) {
    var shareUrl = 'https://www.performance-act.com/pre-performance-routine?utm_source=share&utm_medium=referral&utm_campaign=routine_guide';
    var shareStatus = shareBtn.closest('[data-dl-scope]') && shareBtn.closest('[data-dl-scope]').querySelector('.rt-dl-status');
    var say = function (msg) {
      if (!shareStatus) return;
      shareStatus.textContent = '';
      setTimeout(function () { shareStatus.textContent = msg; }, 60);
    };
    shareBtn.addEventListener('click', function () {
      if (typeof window.gtag === 'function') window.gtag('event', 'share_guide', { link_location: 'process' });
      if (navigator.share) {
        navigator.share({ title: 'Build Your Pre-Performance Routine: a free athlete guide', url: shareUrl }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(function () { say('Link copied. Paste it anywhere to share.'); }, function () { say(shareUrl); });
      } else {
        say(shareUrl);
      }
    });
  }

  /* ---------- 4. "View helplines" opens the existing support modal ---------- */
  var helplineButtons = document.querySelectorAll('[data-open-support]');
  for (var j = 0; j < helplineButtons.length; j++) {
    helplineButtons[j].addEventListener('click', function () {
      var openBtn = document.getElementById('supportLineBtn');
      if (openBtn) openBtn.click();
    });
  }
})();
