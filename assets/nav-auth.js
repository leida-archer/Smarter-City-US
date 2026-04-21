/* ============================================
   Nav Auth — shared logged-in state for the
   Sourcewell Members navbar button across all
   pages. If localStorage.scs_authed === 'true',
   the Sourcewell logo <img> is swapped for
   {username} + logout icon. No style overrides:
   the existing .nav-cta class + page-level
   inline styles carry the entire look, so the
   button's size, color, and position stay
   pixel-identical to the logged-out version.
   ============================================ */
(function () {
  'use strict';

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

  function init() {
    var isAuthed = localStorage.getItem('scs_authed') === 'true';
    console.log('[nav-auth] loaded, authed=', isAuthed);

    if (!isAuthed) return;

    var btn = findNavButton();
    if (!btn) {
      console.log('[nav-auth] no Sourcewell nav button found on this page');
      return;
    }

    var userEmail = localStorage.getItem('scs_user') || '';
    var username = userEmail.split('@')[0] || 'account';

    // Swap only the inner content — leave every class and inline style untouched.
    btn.innerHTML =
      escapeHTML(username) +
      ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">' +
      '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>';

    // Keep it as an <a> but send it nowhere; intercept click for logout.
    btn.setAttribute('href', '#');
    btn.title = 'Sign out';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('scs_authed');
      localStorage.removeItem('scs_user');
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
