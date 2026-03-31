/* ============================================
   SCS USA — Shared Foundation Scripts
   ============================================ */

(function() {
  'use strict';

  // ── Sticky nav shadow on scroll ────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // ── Mobile hamburger toggle ────────────────────
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      hamburger.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Smooth scroll for anchor links ─────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── IntersectionObserver reveal animations ─────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        // Trigger counter animation if present within this reveal
        const counters = entry.target.querySelectorAll('.counter');
        counters.forEach(counter => animateCounter(counter));
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ── Stagger animation for grid items ───────────
  // Auto-apply reveal to common card/grid children
  document.querySelectorAll('.product-card, .value-item, .testimonial-card, .partner-category').forEach((el, i) => {
    if (!el.classList.contains('reveal')) {
      el.classList.add('reveal');
      const delayClass = 'reveal-delay-' + ((i % 3) + 1);
      el.classList.add(delayClass);
      revealObserver.observe(el);
    }
  });

  // ── Counter animation ──────────────────────────
  function animateCounter(el) {
    if (el.dataset.animated) return;
    el.dataset.animated = 'true';

    const text = el.textContent;
    const target = parseInt(el.dataset.target || text);
    const suffix = el.dataset.suffix || '';

    if (isNaN(target)) return;

    const duration = 1800;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // Also observe standalone counter elements (in CTA stats, etc.)
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.cta-stat-num').forEach(el => {
    counterObserver.observe(el);
  });

  // ── Dropdown menu hover behavior ───────────────
  // Keep dropdowns open while cursor moves between trigger and menu
  document.querySelectorAll('.has-dropdown').forEach(item => {
    let timeout;

    item.addEventListener('mouseenter', () => {
      clearTimeout(timeout);
      // Close other open dropdowns
      document.querySelectorAll('.has-dropdown.open').forEach(other => {
        if (other !== item) other.classList.remove('open');
      });
      item.classList.add('open');
    });

    item.addEventListener('mouseleave', () => {
      timeout = setTimeout(() => {
        item.classList.remove('open');
      }, 150);
    });
  });

  // ── Form submit mockup handler ─────────────────
  // ── Form submission success banner ─────────────
  const params = new URLSearchParams(window.location.search);
  const submitted = params.get('submitted');
  if (submitted) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#15626C;color:#fff;padding:16px 24px;text-align:center;font-family:Inter,sans-serif;font-size:15px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;gap:12px;';
    banner.innerHTML = '<span>✓ Your ' + submitted.toLowerCase() + ' has been received. We\'ll be in touch shortly.</span><button style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 4px;opacity:0.7" onclick="this.parentElement.remove()">&times;</button>';
    document.body.prepend(banner);
    // Clean URL
    const clean = new URL(window.location);
    clean.searchParams.delete('submitted');
    history.replaceState(null, '', clean);
    // Auto-dismiss after 8s
    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 8000);
  }

})();
