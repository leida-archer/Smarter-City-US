/* ============================================
   Themed Select — shared custom dropdown init
   Upgrades any <select class="themed-select"> to
   the themed UI. Safe to load on any page.
   Exposes window.ThemedSelect.syncValue(el) to
   refresh the trigger label after a programmatic
   value change.
   ============================================ */
(function() {
  'use strict';

  function init(root) {
    var scope = root || document;
    var selects = scope.querySelectorAll('select.themed-select');
    Array.prototype.forEach.call(selects, upgrade);
  }

  function upgrade(sel) {
    if (sel._themedUpgraded) return;
    sel._themedUpgraded = true;

    var wrap = document.createElement('div');
    wrap.className = 'custom-select';

    var trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    var textSpan = document.createElement('span');
    textSpan.className = 'custom-select-text';
    textSpan.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
    trigger.appendChild(textSpan);

    var arrow = document.createElement('span');
    arrow.className = 'custom-select-arrow';
    arrow.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    trigger.appendChild(arrow);

    var panel = document.createElement('div');
    panel.className = 'custom-select-options';

    Array.prototype.forEach.call(sel.options, function(opt) {
      var item = document.createElement('div');
      item.className = 'custom-select-option';
      if (opt.selected) item.classList.add('active');
      item.setAttribute('data-value', opt.value);
      item.textContent = opt.textContent;

      item.addEventListener('click', function(e) {
        e.stopPropagation();
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change'));
        textSpan.textContent = opt.textContent;
        panel.querySelectorAll('.custom-select-option').forEach(function(o) {
          o.classList.toggle('active', o.getAttribute('data-value') === opt.value);
        });
        wrap.classList.remove('open');
      });

      panel.appendChild(item);
    });

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach(function(cs) {
        if (cs !== wrap) cs.classList.remove('open');
      });
      wrap.classList.toggle('open');
    });

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    wrap.appendChild(sel);

    wrap._textSpan = textSpan;
    wrap._select = sel;
  }

  function syncValue(selectEl) {
    var wrap = selectEl.closest('.custom-select');
    if (!wrap) return;
    var textSpan = wrap._textSpan;
    if (textSpan && selectEl.options[selectEl.selectedIndex]) {
      textSpan.textContent = selectEl.options[selectEl.selectedIndex].textContent;
    }
    wrap.querySelectorAll('.custom-select-option').forEach(function(o) {
      o.classList.toggle('active', o.getAttribute('data-value') === selectEl.value);
    });
  }

  // Close any open dropdown on outside click
  document.addEventListener('click', function() {
    document.querySelectorAll('.custom-select.open').forEach(function(cs) {
      cs.classList.remove('open');
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); });
  } else {
    init();
  }

  window.ThemedSelect = { init: init, syncValue: syncValue };
})();
