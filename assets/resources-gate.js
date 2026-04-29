/* ============================================
   Resources Gate — block all Resources pages
   behind sign-in. If localStorage.scs_authed !==
   'true', a full-page overlay is injected with
   two CTAs (Sourcewell Members / Customer Login)
   and the underlying page is visually hidden.
   Pages that already implement their own gating
   (resources/pricing.html) should NOT include
   this script.
   ============================================ */
(function () {
  'use strict';

  function init() {
    if (localStorage.getItem('scs_authed') === 'true') return;

    // Determine relative paths (script may load from any depth under /resources/)
    var loginPath = '../account/sourcewell-login.html';
    var signupPath = '../account/signup.html';
    var sourcewellLogo = '../assets/sourcewell-logo.png';

    // Hide page content underneath the overlay
    document.body.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.id = 'resourcesGateOverlay';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(248,247,242,0.96);' +
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
      'z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'padding:24px;font-family:Inter,sans-serif';

    overlay.innerHTML =
      '<div style="background:#fff;border:1px solid rgba(0,0,0,0.08);' +
      'border-radius:20px;padding:48px 56px;max-width:560px;width:100%;' +
      'text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.12)">' +
        '<div style="width:64px;height:64px;border-radius:50%;' +
        'background:rgba(44,116,128,0.1);color:#2C7480;display:flex;' +
        'align-items:center;justify-content:center;margin:0 auto 20px">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2"><rect x="3" y="11" ' +
          'width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>' +
          '</svg>' +
        '</div>' +
        '<h2 style="margin:0 0 10px;font-family:DM Sans,sans-serif;' +
        'font-size:24px;font-weight:600;color:#0E2A3A">Members-Only Resource</h2>' +
        '<p style="margin:0 0 28px;font-size:15px;color:#6B7780;line-height:1.6">' +
          'Sign in to access pricing, case studies, the sales deck, and the rest ' +
          'of our resource library.' +
        '</p>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          '<a href="' + loginPath + '" class="btn-primary" ' +
          'style="display:inline-flex;align-items:center;justify-content:center;' +
          'gap:8px;padding:14px 24px;background:#15626C;color:#fff;' +
          'border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">' +
            '<img src="' + sourcewellLogo + '" alt="Sourcewell" ' +
            'style="height:18px;width:auto;filter:brightness(0) invert(1)">' +
            'Sign in as Sourcewell Member' +
          '</a>' +
          '<a href="' + signupPath + '" ' +
          'style="display:inline-flex;align-items:center;justify-content:center;' +
          'padding:14px 24px;border:1.5px solid #15626C;color:#15626C;' +
          'border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">' +
            'Customer Login' +
          '</a>' +
        '</div>' +
        '<p style="margin:24px 0 0;font-size:12px;color:#94a3b8">' +
          'New customer? The Customer Login page also handles new sign-ups.' +
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
