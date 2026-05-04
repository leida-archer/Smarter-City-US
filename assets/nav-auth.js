/* ============================================
   Nav Auth — shared logged-in state for the
   Sourcewell Members navbar button across all
   pages. Also exposes the centralized SCSAuth
   helper used by every page that gates content.
   Auth state has a 7-day TTL (mimics a real
   account session) — expired logins are
   silently cleared on next isAuthed() check.
   ============================================ */
(function () {
  'use strict';

  // ── Centralized auth (TTL-bounded localStorage) ──
  var TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function login(email) {
    localStorage.setItem('scs_authed', 'true');
    localStorage.setItem('scs_user', email || '');
    localStorage.setItem('scs_authed_at', String(Date.now()));
  }

  function logout() {
    localStorage.removeItem('scs_authed');
    localStorage.removeItem('scs_user');
    localStorage.removeItem('scs_authed_at');
  }

  function isAuthed() {
    if (localStorage.getItem('scs_authed') !== 'true') return false;
    var loginAt = parseInt(localStorage.getItem('scs_authed_at') || '0', 10);
    if (!loginAt || Date.now() - loginAt > TTL_MS) {
      logout();
      return false;
    }
    return true;
  }

  window.SCSAuth = { TTL_MS: TTL_MS, isAuthed: isAuthed, login: login, logout: logout };

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // The Sourcewell nav button is a .nav-cta whose only child is an <img>
  // with "sourcewell" in its src. Match by that structure.
  function findNavButton() {
    var candidates = document.querySelectorAll('.nav-cta');
    for (var i = 0; i < candidates.length; i++) {
      var img = candidates[i].querySelector('img');
      if (img && /sourcewell/i.test(img.getAttribute('src') || '')) {
        return candidates[i];
      }
    }
    return null;
  }

  // Hide the Resources dropdown for unauthenticated visitors. The Resources
  // surface (Pricing, Sales Deck, Newsletter, Library, Blog, Webinars, Tier
  // Sheets, Case Studies) is members-only — see resources-gate.js for the
  // page-level overlay that catches direct URL access.
  function gateResourcesNav() {
    var items = document.querySelectorAll('.nav-item.has-dropdown');
    for (var i = 0; i < items.length; i++) {
      var anchor = items[i].querySelector('a[href*="resources/"]');
      if (anchor) {
        items[i].style.display = 'none';
      }
    }
  }

  function init() {
    var authed = isAuthed();
    console.log('[nav-auth] loaded, authed=', authed);

    if (!authed) {
      gateResourcesNav();
      return;
    }

    var btn = findNavButton();
    if (!btn) {
      console.log('[nav-auth] no Sourcewell nav button found on this page');
      return;
    }

    var userEmail = localStorage.getItem('scs_user') || '';
    var username = userEmail.split('@')[0] || 'account';

    // Add the authed-state modifier so styles.css can resize the button to
    // a compact identity chip (matches nav-link proportions instead of the
    // logged-out logo+wordmark geometry).
    btn.classList.add('nav-cta--authed');

    // Swap inner content. SVG bumped to 16x16 to match the now-14px text.
    btn.innerHTML =
      escapeHTML(username) +
      ' <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">' +
      '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>';

    // Keep it as an <a> but send it nowhere; intercept click for logout.
    btn.setAttribute('href', '#');
    btn.title = 'Sign out';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
      window.location.reload();
    });

    // Hide lock icons in dropdown menus (existing gating convention).
    document.querySelectorAll('.dropdown a svg').forEach(function (svg) {
      if (svg.innerHTML.indexOf('3 3 0 016 0') !== -1) svg.style.display = 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Allow post-login code to re-run the swap without a full page reload.
  window.SCSNavAuth = { refresh: init };
})();
