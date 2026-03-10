/* =========================================================
   PERFORMANCE ACT - JavaScript
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- MOBILE NAV TOGGLE ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileLinks = mobileNav.querySelectorAll('.mobile-nav__link, .mobile-nav__actions .btn');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
    document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  /* ---------- HEADER SCROLL EFFECT ---------- */
  const header = document.getElementById('header');

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 100) {
      header.style.backgroundColor = 'rgba(0, 0, 0, 0.97)';
    } else {
      header.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
    }
  }, { passive: true });

  /* ---------- ACTIVE NAV LINK HIGHLIGHT ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    root: null,
    rootMargin: '-50% 0px -50% 0px',
    threshold: 0,
  });

  sections.forEach(section => sectionObserver.observe(section));

  /* ---------- TABS — WHO WE SUPPORT ---------- */
  const tabButtons = document.querySelectorAll('.tabs__btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Update buttons
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panels
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `tab-${targetTab}`) {
          panel.classList.add('active');
        }
      });
    });
  });

  /* ---------- SCROLL REVEAL ANIMATION ---------- */
  const revealElements = document.querySelectorAll(
    '.about-grid, .manifesto__row, .program-tile, .team-card, .community-card, .cta-banner__content, .stats-grid .stat, .grow-grid, .tabs, .bespoke-intro, .photo-band__item'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1,
  });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ---------- STAGGERED CARD ANIMATIONS ---------- */
  const cardGroups = document.querySelectorAll('.programs-showcase, .team-grid, .community-grid');
  cardGroups.forEach(group => {
    const cards = group.children;
    Array.from(cards).forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.1}s`;
    });
  });

  /* ---------- SCROLL TO TOP BUTTON ---------- */
  const scrollTopBtn = document.getElementById('scrollTop');

  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- SMOOTH SCROLL FOR ANCHOR LINKS ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const headerHeight = document.getElementById('header').offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    });
  });

  /* ---------- NEWSLETTER FORM ---------- */
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = newsletterForm.querySelector('.btn');
      const originalText = btn.textContent;

      btn.textContent = 'THANK YOU!';
      btn.style.backgroundColor = '#000';
      btn.style.color = '#FFE500';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
        btn.style.color = '';
        newsletterForm.reset();
      }, 3000);
    });
  }

  /* ---------- STAT COUNTER ANIMATION ---------- */
  const stats = document.querySelectorAll('.stat');
  let statsAnimated = false;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;
        animateStats();
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.3 });

  if (stats.length > 0) {
    statsObserver.observe(stats[0].parentElement);
  }

  function animateStats() {
    stats.forEach(stat => {
      const target = parseInt(stat.dataset.count, 10);
      const numberEl = stat.querySelector('.stat__number');
      const suffix = numberEl.textContent.includes('+') ? '+' : '';
      let current = 0;
      const increment = target / 40;
      const duration = 1500;
      const stepTime = duration / 40;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        numberEl.textContent = Math.round(current) + suffix;
      }, stepTime);
    });
  }

  /* ---------- PARALLAX-LITE ON HERO ---------- */
  const heroBg = document.querySelector('.hero__bg');
  if (heroBg && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    }, { passive: true });
  }

});
