/* ============================================
   Resources Gate — block all Resources pages
   behind sign-in. Calls window.SCSAuth.isAuthed()
   (defined in assets/nav-auth.js) — if not authed
   or TTL has expired, a full-page overlay is
   injected with one primary Sourcewell sign-in
   CTA and a secondary Customer Login text link,
   matching the unified hierarchy used in the nav.
   Pages that already implement their own gating
   (resources/pricing.html) should NOT include
   this script.
   ============================================ */
(function () {
  'use strict';

  function init() {
    if (window.SCSAuth && window.SCSAuth.isAuthed()) return;

    // Determine relative paths (script may load from any depth under /resources/)
    var loginPath = '../account/sourcewell-login.html';
    var signupPath = '../account/signup.html';
    var sourcewellLogo = '../assets/sourcewell-logo.png';

    // Hide page content underneath the overlay
    document.body.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.id = 'resourcesGateOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(248,247,242,0.7);' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'padding:24px;font-family:Inter,sans-serif';

    overlay.innerHTML =
      '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);' +
      'border-radius:20px;padding:48px 56px;max-width:520px;width:100%;' +
      'box-shadow:0 16px 48px rgba(0,0,0,0.18)">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" ' +
        'stroke="#15626C" stroke-width="2" style="display:block;margin-bottom:20px">' +
          '<rect x="3" y="11" width="18" height="11" rx="2"/>' +
          '<path d="M7 11V7a5 5 0 0110 0v4"/>' +
        '</svg>' +
        '<h2 style="margin:0 0 10px;font-family:DM Sans,sans-serif;' +
        'font-size:24px;font-weight:600;color:#0E2A3A;text-wrap:balance">Members-Only Resources</h2>' +
        '<p style="margin:0 0 28px;font-size:15px;color:#6B7780;line-height:1.6;text-wrap:pretty">' +
          'Sign in to access pricing, case studies, the sales deck, and the rest ' +
          'of our resource library.' +
        '</p>' +
        '<a href="' + loginPath + '" ' +
        'style="display:flex;align-items:center;justify-content:center;' +
        'gap:10px;padding:14px 24px;background:#15626C;color:#fff;' +
        'border:1px solid #15626C;border-radius:10px;text-decoration:none;' +
        'font-family:DM Sans,sans-serif;font-weight:600;font-size:15px;' +
        'transition:background 0.2s,transform 0.15s">' +
          '<img src="' + sourcewellLogo + '" alt="" ' +
          'style="height:18px;width:auto;filter:brightness(0) invert(1)">' +
          'Sourcewell Member Sign-In' +
        '</a>' +
        '<p style="margin:18px 0 0;font-size:13px;color:#94a3b8;text-align:center">' +
          'Not a Sourcewell member? ' +
          '<a href="' + signupPath + '" style="color:#475569;text-decoration:underline;font-weight:500">Customer Login</a>' +
        '</p>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
