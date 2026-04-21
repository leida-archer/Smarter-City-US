/* ============================================
   SCS Tech Stack Pricing Calculator
   Pure vanilla JS — no dependencies
   ============================================ */

(function () {
  'use strict';

  // ── Pricing Data ─────────────────────────────────

  // Campus / University tiers (Sourcewell)
  const CAMPUS_TIERS = {
    x_small: {
      label: 'X-Small',
      population: 'Under 2,500',
      saas: 36000,
      sourcewellDiscount: false, // X-Small does not get Sourcewell discount
      implementation: 10000,
      implementationNote: 'Online only',
      integrationsIncluded: 3,
    },
    small: {
      label: 'Small',
      population: '2,500 – 10,000',
      saas: 75000,
      sourcewellDiscount: true,
      implementation: 49000,
      implementationNote: '1 onsite visit',
      integrationsIncluded: 4,
    },
    medium: {
      label: 'Medium',
      population: '10,000 – 20,000',
      saas: 115000,
      sourcewellDiscount: true,
      implementation: 87500,
      implementationNote: '1 onsite visit',
      integrationsIncluded: 6,
    },
    large: {
      label: 'Large',
      population: '20,000 – 30,000',
      saas: 155000,
      sourcewellDiscount: true,
      implementation: 105000,
      implementationNote: '2 onsite visits',
      integrationsIncluded: 8,
    },
    xl: {
      label: 'X-Large',
      population: '30,000 – 40,000',
      saas: 210000,
      sourcewellDiscount: true,
      implementation: 155000,
      implementationNote: '2 onsite visits',
      integrationsIncluded: 10,
    },
    xxl: {
      label: 'XX-Large',
      population: '40,000+',
      saas: 275000,
      sourcewellDiscount: true,
      implementation: 175000,
      implementationNote: '2 onsite visits',
      integrationsIncluded: 15,
    },
  };

  // Municipal / Standalone pricing
  const MUNICIPAL = {
    vpermit: {
      base: 42000,
      includedPermits: 12000,
      overageStart: 0.99,
      overageFloor: 0.59,
    },
    vcompliance: {
      base: 35000,
      baseCitationRate: 0.75,
      citationFloor: 0.35,
    },
    vpark: {
      ratePercent: 0.05,
      rateFlat: 0.25,
    },
    integrationCost: 3750,
    implementationFactor: 0.65, // implementation = 65% of selected module base subscriptions
  };

  // Hardware pricing
  const HARDWARE = {
    tablet: { label: 'Handheld Enforcement Tablet', price: 4050 },
    lprHandheld: { label: 'Handheld LPR Citation Device', price: 2160 },
    printer: { label: 'Wireless Printer', price: 675 },
  };

  // MLPR Survision pricing — tiered
  const MLPR_TIERS = {
    msrp: {
      label: 'MSRP',
      capex_full: { hardware: 15120, software: 7560, commissioning: 2362.50 },
      haas_full: { monthly: 1219.05, annual: 14628.60 },
      haas_mini: { monthly: 1039.50, annual: 12474 },
    },
    sourcewell: {
      label: 'Sourcewell',
      capex_full: { hardware: 14400, software: 7200, commissioning: 2250 },
      haas_full: { monthly: 1161, annual: 13932 },
      haas_mini: { monthly: 990, annual: 11880 },
    },
  };
  // Active MLPR pricing (defaults to MSRP)
  var MLPR = MLPR_TIERS.msrp;

  // ── State ────────────────────────────────────────
  const state = {
    // Software
    entity: 'campus',       // 'campus' | 'municipal'
    campusTier: 'medium',
    sourcewell: true,
    goLiveMonth: 7,         // 7 = July (fiscal year start)
    extraIntegrations: 0,

    // Municipal modules
    vpermit: true,
    vcompliance: true,
    vpark: false,
    annualPermits: 12000,
    annualCitations: 6000,
    annualTransactions: 60000,
    vpermitIntegrations: 0,
    vcomplianceIntegrations: 0,
    vparkIntegrations: 0,
    avgTransactionValue: 5,
    munExtraIntegrations: 0,

    // Hardware
    hwTablet: 0,
    hwLprHandheld: 0,
    hwPrinter: 0,

    // MLPR
    mlprEnabled: false,
    vehicles: 1,
    kit: 'full',
    model: 'capex',
    mlprDiscount: 0,
    mlprTier: 'msrp',  // 'msrp' | 'sourcewell'
  };

  // ── DOM Helpers ──────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Format Currency ──────────────────────────────
  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  // ── Fade Value Transition ───────────────────────
  // Phase-locked to the CSS opacity transition (see --anim-fade-half in CSS).
  // The DOM swap waits for transitionend (not setTimeout) so opacity is
  // guaranteed to be 0 at the moment of the swap, and a double-rAF forces the
  // browser to commit the new DOM at opacity:0 before the fade-in starts —
  // preventing engines from collapsing the out/in transitions into one pass
  // (which was painting the first characters of new content mid-fade).
  var _skipFade = false;
  var FADE_FALLBACK_MS = 260; // safety net if transitionend never fires

  function runFade(el, applyNew) {
    // Cancel any in-flight fade on this element so rapid clicks don't stack.
    if (el._fadeCleanup) el._fadeCleanup();

    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      el.removeEventListener('transitionend', onEnd);
      if (el._fadeSafety) { clearTimeout(el._fadeSafety); el._fadeSafety = null; }
      el._fadeCleanup = null;

      // Swap while .updating is still active (opacity:0, visibility:hidden).
      applyNew();

      // Force layout commit, then wait one more frame so the browser paints
      // the new DOM at opacity:0 as a discrete frame before we remove the
      // class and start the fade-in.
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          el.classList.remove('updating');
        });
      });
    }

    function onEnd(e) {
      if (e.target !== el || e.propertyName !== 'opacity') return;
      finish();
    }

    el._fadeCleanup = function() {
      el.removeEventListener('transitionend', onEnd);
      if (el._fadeSafety) { clearTimeout(el._fadeSafety); el._fadeSafety = null; }
      el._fadeCleanup = null;
    };

    el.addEventListener('transitionend', onEnd);
    el._fadeSafety = setTimeout(finish, FADE_FALLBACK_MS);
    el.classList.add('updating');
  }

  function fadeValue(el, newVal, useHTML) {
    if (_skipFade) {
      if (useHTML) el.innerHTML = newVal; else el.textContent = newVal;
      return;
    }
    runFade(el, function() {
      if (useHTML) el.innerHTML = newVal; else el.textContent = newVal;
    });
  }

  function fadeHTML(el, newHTML) {
    if (_skipFade) {
      // When skipping fades (e.g. during a larger section transition), still
      // honour the stack structure so internal state stays consistent.
      if (el.classList && el.classList.contains('summary-lines-stack')) {
        var layers = el.querySelectorAll('.summary-lines-layer');
        if (layers.length === 2) {
          var active = el._activeLayer || layers[0];
          active.innerHTML = newHTML;
          el._activeLayer = active;
          return;
        }
      }
      el.innerHTML = newHTML;
      return;
    }
    if (el.classList && el.classList.contains('summary-lines-stack')) {
      crossFadeStack(el, newHTML);
      return;
    }
    runFade(el, function() { el.innerHTML = newHTML; });
  }

  // Read the "visible" HTML from either a plain element or a stack's active layer.
  function currentContent(el) {
    if (el.classList && el.classList.contains('summary-lines-stack')) {
      var active = el._activeLayer;
      if (!active) {
        var layers = el.querySelectorAll('.summary-lines-layer');
        active = layers[0] && !layers[0].classList.contains('is-inactive') ? layers[0] : layers[1];
      }
      return active ? active.innerHTML : '';
    }
    return el.innerHTML;
  }

  // Double-buffered cross-fade for the two-layer .summary-lines-stack.
  // The layer currently marked active receives .is-inactive (fading out) and
  // the other layer gets populated with the new HTML and fades in. Old and
  // new text live on separate DOM nodes — no position-shared glyph caching
  // can carry over mid-fade.
  function crossFadeStack(stack, newHTML) {
    var layers = stack.querySelectorAll('.summary-lines-layer');
    if (layers.length !== 2) {
      stack.innerHTML = newHTML;
      return;
    }
    var active = stack._activeLayer;
    if (!active) {
      // First call: pick the layer that isn't .is-inactive, else layers[0].
      active = layers[0].classList.contains('is-inactive') ? layers[1] : layers[0];
    }
    var incoming = active === layers[0] ? layers[1] : layers[0];

    incoming.innerHTML = newHTML;
    // Commit the new DOM at opacity 0 before starting the fade-in.
    // eslint-disable-next-line no-unused-expressions
    incoming.offsetHeight;

    active.classList.add('is-inactive');
    incoming.classList.remove('is-inactive');
    stack._activeLayer = incoming;
  }

  // ── Proration Logic ──────────────────────────────
  function getProrationFactor(goLiveMonth) {
    // Fiscal year: July (7) = start, June (6) = end
    // July = 12/12, Aug = 11/12, ... June = 1/12
    if (goLiveMonth >= 7) {
      return (12 - (goLiveMonth - 7)) / 12;
    } else {
      return (6 - goLiveMonth + 1) / 12;
    }
  }

  // ── vPermit Overage Calculation ──────────────────
  function calcPermitOverage(annualPermits) {
    if (annualPermits <= 12000) return 0;
    const excess = annualPermits - 12000;
    // Tiered: rate starts at $0.99, drops by ~$0.05 per 12,000-unit tier, floor $0.59
    const tiers = Math.ceil(excess / 12000);
    let total = 0;
    for (let t = 0; t < tiers; t++) {
      const count = Math.min(12000, excess - t * 12000);
      const rate = Math.max(0.59, 0.99 - t * 0.05);
      total += count * rate;
    }
    return total; // annual
  }

  // ── vCompliance Citation Calculation ─────────────
  function calcCitationCost(annualCitations) {
    if (annualCitations <= 0) return 0;
    // First 12,000 at $0.75, tiered discount per additional 12,000, floor $0.35
    let total = 0;
    let remaining = annualCitations;
    let tier = 0;
    while (remaining > 0) {
      const count = Math.min(12000, remaining);
      const rate = Math.max(0.35, 0.75 - tier * 0.05);
      total += count * rate;
      remaining -= count;
      tier++;
    }
    return total; // annual
  }

  // ── vPark Transaction Calculation ────────────────
  // Fee per transaction = 5% of value + flat fee. Sourcewell 10% reduces the flat fee only.
  function calcVparkCost(annualTransactions, avgValue, flatFee) {
    const percentFee = avgValue * 0.05;
    const effectiveRate = percentFee + (flatFee != null ? flatFee : 0.35);
    return annualTransactions * effectiveRate; // annual
  }

  // ── Software Calculation ─────────────────────────
  function calculateSoftware() {
    const result = { lines: [], year1: 0, recurring: 0, implementation: 0, tco: {} };

    if (state.entity === 'campus') {
      const tier = CAMPUS_TIERS[state.campusTier];
      const proFactor = getProrationFactor(state.goLiveMonth);
      const sourcewellActive = state.sourcewell && tier.sourcewellDiscount;
      const discountFactor = sourcewellActive ? 0.9 : 1;
      let saas = tier.saas * discountFactor;

      if (sourcewellActive) {
        result.lines.push({ label: 'Sourcewell Subscription', amount: saas, note: 'annual, 10% off' });
      } else {
        result.lines.push({ label: 'Standard Subscription', amount: saas, note: 'annual' });
      }

      const proratedSaas = saas * proFactor;
      const proratedSavings = saas - proratedSaas;
      if (proratedSavings > 0) {
        result.lines.push({ label: 'Prorated to ' + Math.round(proFactor * 12) + ' months', amount: proratedSavings, note: '', type: 'subline' });
      }

      // Extra integrations (Sourcewell discount applies)
      const extraInt = state.extraIntegrations;
      const intUnit = 3750 * discountFactor;
      const intCost = extraInt * intUnit;
      if (extraInt > 0) {
        const intNote = sourcewellActive ? 'annual, 10% off' : 'annual';
        result.lines.push({ label: 'Extra Integrations (' + extraInt + ')', amount: intCost, note: intNote });
        saas += intCost;
      }

      // Implementation & Training — always last line item
      result.lines.push({ label: 'Implementation & Training', amount: tier.implementation, note: 'one-time' });

      result.year1 = proratedSaas + intCost + tier.implementation;
      result.recurring = saas;
      result.implementation = tier.implementation;
      result.integrationsIncluded = tier.integrationsIncluded;

    } else {
      // Municipal / Standalone
      let baseSaas = 0;
      let moduleBaseTotal = 0;
      const sourcewellActive = state.sourcewell;
      const discountFactor = sourcewellActive ? 0.9 : 1;
      const subNote = sourcewellActive ? 'annual, 10% off' : 'annual';

      if (state.vpermit) {
        const base = MUNICIPAL.vpermit.base * discountFactor;
        moduleBaseTotal += base;
        baseSaas += base;
        result.lines.push({ label: sourcewellActive ? 'vPermit (Sourcewell)' : 'vPermit Subscription', amount: base, note: subNote });

        const overage = calcPermitOverage(state.annualPermits);
        if (overage > 0) {
          result.lines.push({ label: 'Estimated Active Permits', amount: overage, note: 'annual', type: 'subitem' });
          baseSaas += overage;
        }
      }

      if (state.vcompliance) {
        const base = MUNICIPAL.vcompliance.base * discountFactor;
        moduleBaseTotal += base;
        baseSaas += base;
        result.lines.push({ label: sourcewellActive ? 'vCompliance (Sourcewell)' : 'vCompliance Subscription', amount: base, note: subNote });

        const citationCost = calcCitationCost(state.annualCitations);
        if (citationCost > 0) {
          result.lines.push({ label: 'Estimated Citations', amount: citationCost, note: 'annual', type: 'subitem' });
          baseSaas += citationCost;
        }
      }

      if (state.vpark) {
        const vparkFlatFee = sourcewellActive ? 0.35 * 0.9 : 0.35;
        const vparkAnnual = calcVparkCost(state.annualTransactions, state.avgTransactionValue, vparkFlatFee);
        result.lines.push({ label: sourcewellActive ? 'vPark (Sourcewell)' : 'vPark Subscription', amount: vparkAnnual, note: 'annual est.' });
        baseSaas += vparkAnnual;
      }

      // Per-module integrations (Sourcewell 10% applies)
      var totalInt = 0;
      if (state.vpermit) totalInt += state.vpermitIntegrations;
      if (state.vcompliance) totalInt += state.vcomplianceIntegrations;
      if (state.vpark) totalInt += state.vparkIntegrations;
      if (totalInt > 0) {
        const intUnit = MUNICIPAL.integrationCost * discountFactor;
        const intCost = totalInt * intUnit;
        const intNote = sourcewellActive ? 'annual, 10% off' : 'annual';
        result.lines.push({ label: 'Integrations (' + totalInt + ')', amount: intCost, note: intNote });
        baseSaas += intCost;
      }

      // Implementation & Training — 65% of selected module base subscriptions (always last)
      const implFee = moduleBaseTotal * MUNICIPAL.implementationFactor;
      if (implFee > 0) {
        result.lines.push({ label: 'Implementation & Training', amount: implFee, note: 'one-time' });
      }
      result.implementation = implFee;

      result.year1 = baseSaas + result.implementation;
      result.recurring = baseSaas;
    }

    // TCO
    [1, 3, 5].forEach(y => {
      if (y === 1) {
        result.tco[y] = result.year1;
      } else {
        result.tco[y] = result.year1 + result.recurring * (y - 1);
      }
    });

    return result;
  }

  // ── Hardware Calculation ─────────────────────────
  function calculateHardware() {
    const result = { lines: [], total: 0, mlprYear1: 0, mlprRecurring: 0, mlprTco: {} };

    // Set active MLPR pricing tier
    MLPR = MLPR_TIERS[state.mlprTier] || MLPR_TIERS.msrp;

    // Enforcement devices
    if (state.hwTablet > 0) {
      const cost = HARDWARE.tablet.price * state.hwTablet;
      result.lines.push({ label: HARDWARE.tablet.label + ' (' + state.hwTablet + ')', amount: cost, note: '' });
      result.total += cost;
    }
    if (state.hwLprHandheld > 0) {
      const cost = HARDWARE.lprHandheld.price * state.hwLprHandheld;
      result.lines.push({ label: HARDWARE.lprHandheld.label + ' (' + state.hwLprHandheld + ')', amount: cost, note: '' });
      result.total += cost;
    }
    if (state.hwPrinter > 0) {
      const cost = HARDWARE.printer.price * state.hwPrinter;
      result.lines.push({ label: HARDWARE.printer.label + ' (' + state.hwPrinter + ')', amount: cost, note: '' });
      result.total += cost;
    }

    // MLPR
    if (state.mlprEnabled) {
      const v = state.vehicles;
      const d = 1 - state.mlprDiscount / 100;

      if (state.kit === 'mini') state.model = 'haas';

      if (state.model === 'capex') {
        const p = MLPR.capex_full;
        const yr1 = (p.hardware + p.software + p.commissioning) * v * d;
        const rec = p.software * v * d;
        result.lines.push({ label: 'MLPR Hardware (' + v + ')', amount: p.hardware * v * d, note: '' });
        result.lines.push({ label: 'MLPR Software (' + v + ')', amount: p.software * v * d, note: 'annual' });
        result.lines.push({ label: 'MLPR Commissioning (' + v + ')', amount: p.commissioning * v * d, note: 'one-time' });
        result.mlprYear1 = yr1;
        result.mlprRecurring = rec;
      } else {
        const rate = state.kit === 'full' ? MLPR.haas_full : MLPR.haas_mini;
        result.lines.push({ label: 'MLPR All-inclusive (' + v + ')', amount: rate.monthly * v * d, note: '/month' });
        result.lines.push({ label: 'MLPR Annual (' + v + ')', amount: rate.annual * v * d, note: 'billed annually' });
        result.mlprYear1 = rate.annual * v * d;
        result.mlprRecurring = rate.annual * v * d;
      }

      [1, 3, 5].forEach(y => {
        if (state.model === 'capex') {
          result.mlprTco[y] = result.mlprYear1 + result.mlprRecurring * (y - 1);
        } else {
          result.mlprTco[y] = result.mlprRecurring * y;
        }
      });

      // Break-even
      if (state.kit === 'full') {
        const capex3 = (MLPR.capex_full.hardware + MLPR.capex_full.software + MLPR.capex_full.commissioning) * v
          + MLPR.capex_full.software * v * 2;
        const haas3 = MLPR.haas_full.annual * v * 3;
        result.mlprSavingsAt3 = (haas3 - capex3) * d;
        result.mlprBreakevenYears = 2.6;
      }
    }

    return result;
  }

  // ── Smooth Card Height Animation ──────────────────
  function animateCardHeight(card, callback) {
    var startHeight = card.offsetHeight;
    callback();
    // Let the DOM reflow with new content
    card.style.height = startHeight + 'px';
    card.style.overflow = 'hidden';
    // Force reflow
    card.offsetHeight;
    // Measure new natural height
    card.style.height = 'auto';
    var endHeight = card.offsetHeight;
    // Set back to start and animate
    card.style.height = startHeight + 'px';
    card.offsetHeight;
    card.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.height = endHeight + 'px';
    // Clean up after transition
    var onEnd = function() {
      card.style.height = '';
      card.style.overflow = '';
      card.style.transition = '';
      card.removeEventListener('transitionend', onEnd);
    };
    card.addEventListener('transitionend', onEnd);
  }

  // ── Transition State Tracking ─────────────────────
  var _prevEntity = state.entity;
  var _prevModules = '' + state.vpermit + state.vcompliance + state.vpark;
  var _transitionPending = false;

  function shouldTransition() {
    var newEntity = state.entity;
    var newModules = '' + state.vpermit + state.vcompliance + state.vpark;
    var changed = (newEntity !== _prevEntity) || (newModules !== _prevModules);
    _prevEntity = newEntity;
    _prevModules = newModules;
    return changed;
  }

  // ── Render Software Section ──────────────────────
  function renderSoftware() {
    var doTransition = shouldTransition();
    var body = $('#softwareSummaryBody');
    var card = $('#softwareSummary');

    if (doTransition && body && card && !_transitionPending) {
      _transitionPending = true;
      body.classList.add('fading');
      setTimeout(function() {
        _skipFade = true;
        animateCardHeight(card, function() {
          _doRenderSoftware();
        });
        _skipFade = false;
        body.classList.remove('fading');
        _transitionPending = false;
      }, 500);
      return calculateSoftware();
    }

    // For non-transition updates, still animate height if content changes
    if (card && body) {
      var startH = card.offsetHeight;
      var result = _doRenderSoftware();
      var endH = card.scrollHeight;
      if (Math.abs(startH - endH) > 2) {
        card.style.height = startH + 'px';
        card.style.overflow = 'hidden';
        card.offsetHeight;
        card.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
        card.style.height = endH + 'px';
        var onEnd = function() {
          card.style.height = '';
          card.style.overflow = '';
          card.style.transition = '';
          card.removeEventListener('transitionend', onEnd);
        };
        card.addEventListener('transitionend', onEnd);
      }
      return result;
    }

    return _doRenderSoftware();
  }

  function _doRenderSoftware() {
    const sw = calculateSoftware();

    // Toggle entity panels
    const campusOpts = $('#campusOptions');
    const munOpts = $('#municipalOptions');
    if (campusOpts) campusOpts.style.display = state.entity === 'campus' ? '' : 'none';
    if (munOpts) munOpts.style.display = state.entity === 'municipal' ? '' : 'none';

    // Entity toggle cards
    $$('.toggle-card[data-entity]').forEach(card => {
      card.classList.toggle('selected-teal', card.dataset.entity === state.entity);
    });

    // Sourcewell toggle
    if (state.entity === 'campus') {
      const tier = CAMPUS_TIERS[state.campusTier];
      const swYes = $('#sourcewellYes');
      const swNo = $('#sourcewellNo');

      if (swYes && swNo) {
        if (!tier.sourcewellDiscount) {
          state.sourcewell = false;
          swYes.classList.add('disabled');
          swYes.classList.remove('selected-teal');
          swNo.classList.add('selected-teal');
        } else {
          swYes.classList.remove('disabled');
          swYes.classList.toggle('selected-teal', state.sourcewell);
          swNo.classList.toggle('selected-teal', !state.sourcewell);
        }
      }

      // Sourcewell note
      const note = $('#sourcewellNote');
      if (note) {
        if (!tier.sourcewellDiscount) {
          note.textContent = 'Sourcewell discount is not available for X-Small tier';
          note.style.color = '#EB5B25';
        } else {
          note.textContent = 'Available for Small tier and above via Sourcewell contract';
          note.style.color = '';
        }
      }

      // Integrations note
      const intNote = $('#integrationsNote');
      if (intNote) {
        const sourcewellActive = state.sourcewell && tier.sourcewellDiscount;
        const intPrice = sourcewellActive ? '$3,375' : '$3,750';
        const intSuffix = sourcewellActive ? '/yr each (10% off).' : '/yr each.';
        intNote.textContent = tier.integrationsIncluded + ' integrations included with your tier. Additional integrations at ' + intPrice + intSuffix;
      }

      // Sync integration stepper input
      const intInput = $('#extraIntegrations');
      if (intInput) intInput.value = state.extraIntegrations;
      const intMinus = $('#intBtnMinus');
      if (intMinus) intMinus.disabled = state.extraIntegrations <= 0;
    }

    // Municipal module checkboxes visual state
    if (state.entity === 'municipal') {
      $$('.checkbox-card[data-module]').forEach(card => {
        const mod = card.dataset.module;
        const checked = state[mod];
        card.classList.toggle('checked', checked);
      });

      // Sync municipal Sourcewell toggle visual state
      const munSwYes = $('#munSourcewellYes');
      const munSwNo = $('#munSourcewellNo');
      if (munSwYes && munSwNo) {
        munSwYes.classList.toggle('selected-teal', state.sourcewell);
        munSwNo.classList.toggle('selected-teal', !state.sourcewell);
      }

      // Integration rate hints (reflect Sourcewell 10% discount)
      const munIntText = state.sourcewell ? '$3,375/yr each (10% off)' : '$3,750/yr each';
      $$('.mun-int-hint').forEach(el => { el.textContent = munIntText; });

      // vPark rate hint (Sourcewell reduces the flat fee only)
      $$('.vpark-rate-hint').forEach(el => {
        el.textContent = state.sourcewell ? '5% of transaction + $0.315/transaction (10% off flat fee)' : '5% of transaction + $0.35/transaction';
      });

      // Sync per-module integration inputs
      $$('.mod-integrations').forEach(inp => {
        const mod = inp.dataset.mod;
        inp.value = state[mod + 'Integrations'];
      });
    }

    // Config echo
    const echo = $('#softwareConfigEcho');
    if (echo) {
      var newEcho;
      if (state.entity === 'campus') {
        const tier = CAMPUS_TIERS[state.campusTier];
        newEcho = 'Campus \u00B7 ' + tier.label + ' Tier (' + tier.population + ')' +
          '<br><span class="toggle-pill teal" style="margin-top:4px">' + tier.integrationsIncluded + ' Integrations Included</span>';
      } else {
        const mods = [];
        if (state.vpermit) mods.push('vPermit');
        if (state.vcompliance) mods.push('vCompliance');
        if (state.vpark) mods.push('vPark');
        newEcho = 'Municipality \u00B7 ' + (mods.length ? mods.join(' \u00B7 ') : 'No modules selected');
      }
      if (echo.innerHTML !== newEcho) fadeValue(echo, newEcho, true);
    }

    // Summary lines
    const linesEl = $('#softwareSummaryLines');
    if (linesEl) {
      var newLinesHTML = sw.lines.map(l => {
        if (l.type === 'subline' || l.type === 'subitem') {
          var subNoteHTML = l.note ? ' <span class="summary-line-sub">(' + l.note + ')</span>' : '';
          var prefix = l.type === 'subline' ? '\u2212' : '';
          return '<div class="summary-line is-subline"><span class="summary-line-label"><span class="summary-line-arrow">\u21B3</span>' + l.label + subNoteHTML + '</span><span class="summary-line-amount">' + prefix + fmt(l.amount) + '</span></div>';
        }
        var noteHTML = l.note ? ' <span class="summary-line-sub">(' + l.note + ')</span>' : '';
        var amountHTML;
        if (l.amount > 0) amountHTML = fmt(l.amount);
        else if (l.note && l.note.includes('[NEED FEE]')) amountHTML = 'TBD';
        else if (l.note === 'transaction-based') amountHTML = '\u2014';
        else amountHTML = '$0';
        return '<div class="summary-line"><span class="summary-line-label">' + l.label + noteHTML + '</span><span class="summary-line-amount">' + amountHTML + '</span></div>';
      }).join('');
      if (currentContent(linesEl) !== newLinesHTML) fadeHTML(linesEl, newLinesHTML);
    }

    // Totals
    const totalLabel = $('#softwareTotalLabel');
    const totalAmount = $('#softwareTotalAmount');
    const recurringLine = $('#softwareRecurringLine');

    if (totalLabel) {
      var newTotalLabel;
      if (state.entity === 'campus' && state.goLiveMonth !== 7) {
        newTotalLabel = 'Year 1 Total (Prorated)';
      } else {
        newTotalLabel = 'Year 1 Total';
      }
      if (totalLabel.textContent !== newTotalLabel) fadeValue(totalLabel, newTotalLabel);
    }
    if (totalAmount) {
      var newTotal = fmt(sw.year1);
      if (totalAmount.textContent !== newTotal) fadeValue(totalAmount, newTotal);
    }
    if (recurringLine) {
      var newRec = 'Annual recurring (Year 2+): ' + fmt(sw.recurring) + '/yr';
      if (recurringLine.textContent !== newRec) fadeValue(recurringLine, newRec);
    }

    // Projections
    $$('.sw-proj').forEach(cell => {
      const y = parseInt(cell.dataset.yr);
      const newVal = fmt(sw.tco[y]);
      if (cell.textContent !== newVal) fadeValue(cell, newVal);
      cell.classList.toggle('active', y === 3);
    });

    // Monthly effective
    const monthlyEl = $('#softwareMonthlyLine');
    if (monthlyEl) {
      const monthly = sw.tco[3] / 36;
      const newMonthly = 'Effective monthly cost: <strong>' + fmt(monthly) + '/mo</strong>';
      if (monthlyEl.innerHTML !== newMonthly) fadeHTML(monthlyEl, newMonthly);
    }

    // Prorate callout (campus only)
    const prorateText = $('#prorateText');
    if (prorateText && state.entity === 'campus') {
      const months = Math.round(getProrationFactor(state.goLiveMonth) * 12);
      const newProrate = 'Year 1 prorated to <strong>' + months + ' months</strong> based on fiscal year (July\u2013June). Full annual pricing applies from Year 2.';
      if (prorateText.innerHTML !== newProrate) fadeHTML(prorateText, newProrate);
    }

    return sw;
  }

  // ── Hardware Transition Tracking ──────────────────
  var _prevMlpr = state.mlprEnabled;
  var _hwTransitionPending = false;

  // ── Render Hardware Section ──────────────────────
  function renderHardware() {
    var mlprChanged = (state.mlprEnabled !== _prevMlpr);
    _prevMlpr = state.mlprEnabled;
    var hwBody = $('#hardwareSummaryBody');
    var hwCard = $('#hardwareSummary');

    if (mlprChanged && hwBody && hwCard && !_hwTransitionPending) {
      _hwTransitionPending = true;
      hwBody.classList.add('fading');
      setTimeout(function() {
        _skipFade = true;
        animateCardHeight(hwCard, function() {
          _doRenderHardware();
        });
        _skipFade = false;
        hwBody.classList.remove('fading');
        _hwTransitionPending = false;
      }, 500);
      return calculateHardware();
    }

    // Smooth height for non-transition updates
    if (hwCard) {
      var startH = hwCard.offsetHeight;
      var result = _doRenderHardware();
      var endH = hwCard.scrollHeight;
      if (Math.abs(startH - endH) > 2) {
        hwCard.style.height = startH + 'px';
        hwCard.style.overflow = 'hidden';
        hwCard.offsetHeight;
        hwCard.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
        hwCard.style.height = endH + 'px';
        var onEnd = function() {
          hwCard.style.height = '';
          hwCard.style.overflow = '';
          hwCard.style.transition = '';
          hwCard.removeEventListener('transitionend', onEnd);
        };
        hwCard.addEventListener('transitionend', onEnd);
      }
      return result;
    }

    return _doRenderHardware();
  }

  function _doRenderHardware() {
    const hw = calculateHardware();

    // Sync hardware stepper inputs
    const hwTabletInput = $('#hwTablet');
    const hwLprInput = $('#hwLprHandheld');
    const hwPrinterInput = $('#hwPrinter');
    if (hwTabletInput) hwTabletInput.value = state.hwTablet;
    if (hwLprInput) hwLprInput.value = state.hwLprHandheld;
    if (hwPrinterInput) hwPrinterInput.value = state.hwPrinter;

    // MLPR card toggle
    const mlprCard = $('#mlprCard');
    if (mlprCard) mlprCard.classList.toggle('active', state.mlprEnabled);

    // MLPR tier toggle sync
    $$('.mlpr-tier-control .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.tier === state.mlprTier));

    // MLPR constraints
    if (state.mlprEnabled) {
      // Vehicle stepper
      const vInput = $('#vehicleCount');
      const vMinus = $('#vehBtnMinus');
      const vPlus = $('#vehBtnPlus');
      if (vInput) vInput.value = state.vehicles;
      if (vMinus) vMinus.disabled = state.vehicles <= 1;
      if (vPlus) vPlus.disabled = state.vehicles >= 50;

      // Kit cards
      $$('.toggle-card[data-kit]').forEach(card => {
        card.classList.toggle('selected', card.dataset.kit === state.kit);
      });

      // Model cards
      $$('.toggle-card[data-model]').forEach(card => {
        const isCapex = card.dataset.model === 'capex';
        card.classList.toggle('selected-teal', card.dataset.model === state.model);
        card.classList.toggle('disabled', isCapex && state.kit === 'mini');
      });

      // Mini constraint note
      // Auto discount
      const discountEl = $('#mlprDiscount');
      if (discountEl) {
        discountEl.value = String(state.mlprDiscount);
        syncSelect(discountEl);
      }
    }

    // Hardware config echo
    const echo = $('#hardwareConfigEcho');
    if (echo) {
      const parts = [];
      if (state.hwTablet > 0) parts.push(state.hwTablet + ' Tablet' + (state.hwTablet > 1 ? 's' : ''));
      if (state.hwLprHandheld > 0) parts.push(state.hwLprHandheld + ' LPR Device' + (state.hwLprHandheld > 1 ? 's' : ''));
      if (state.hwPrinter > 0) parts.push(state.hwPrinter + ' Printer' + (state.hwPrinter > 1 ? 's' : ''));
      if (state.mlprEnabled) parts.push(state.vehicles + ' MLPR Vehicle' + (state.vehicles > 1 ? 's' : ''));
      var newEcho = parts.length ? parts.join(' \u00B7 ') : 'No hardware selected';
      if (echo.textContent !== newEcho) fadeValue(echo, newEcho);
    }

    // Hardware summary lines
    const linesEl = $('#hardwareSummaryLines');
    if (linesEl) {
      var newLinesHTML = hw.lines.map(l => {
        var noteHTML = l.note ? ' <span class="summary-line-sub">(' + l.note + ')</span>' : '';
        return '<div class="summary-line"><span class="summary-line-label">' + l.label + noteHTML + '</span><span class="summary-line-amount">' + fmt(l.amount) + '</span></div>';
      }).join('');
      if (state.mlprEnabled && state.mlprDiscount > 0) {
        newLinesHTML += '<div class="summary-line" style="color:#4DAE37;font-size:13px;padding-top:4px"><span class="summary-line-label">MLPR volume discount</span><span class="summary-line-amount" style="color:#4DAE37">-' + state.mlprDiscount + '%</span></div>';
      }
      if (currentContent(linesEl) !== newLinesHTML) fadeHTML(linesEl, newLinesHTML);
    }

    // Hardware total
    const totalLabel = $('#hardwareTotalLabel');
    const totalAmount = $('#hardwareTotalAmount');
    if (totalLabel) totalLabel.textContent = state.mlprEnabled ? 'Year 1 Hardware + MLPR' : 'Hardware Total';
    if (totalAmount) {
      var newHwTotal = fmt(hw.total + hw.mlprYear1);
      if (totalAmount.textContent !== newHwTotal) fadeValue(totalAmount, newHwTotal);
    }

    // MLPR recurring
    const recLine = $('#hardwareRecurringLine');
    if (recLine) {
      if (state.mlprEnabled && hw.mlprRecurring > 0) {
        var newRecText;
        if (state.model === 'capex') {
          newRecText = 'MLPR annual recurring (Year 2+): ' + fmt(hw.mlprRecurring) + '/yr';
        } else {
          newRecText = 'MLPR monthly: ' + fmt(hw.mlprRecurring / 12) + '/mo \u00B7 36-month commitment';
        }
        if (recLine.textContent !== newRecText) fadeValue(recLine, newRecText);
        recLine.style.display = '';
      } else {
        recLine.style.display = 'none';
      }
    }

    // MLPR projection
    const projEl = $('#mlprProjection');
    if (projEl) projEl.style.display = state.mlprEnabled ? '' : 'none';
    if (state.mlprEnabled) {
      $$('.mlpr-proj').forEach(cell => {
        const y = parseInt(cell.dataset.yr);
        const newVal = fmt(hw.mlprTco[y]);
        if (cell.textContent !== newVal) {
          fadeValue(cell, newVal);
        }
        cell.classList.toggle('active', y === 3);
      });
    }

    // Break-even
    const beBlock = $('#mlprBreakevenBlock');
    const beText = $('#mlprBreakevenText');
    if (beBlock && beText) {
      if (state.mlprEnabled && state.kit === 'full') {
        beBlock.style.display = 'flex';
        if (state.model === 'capex') {
          beText.innerHTML = 'CapEx breaks even vs. HaaS at <strong>~2.6 years</strong>. At 3 years: CapEx saves <strong>' +
            fmt(hw.mlprSavingsAt3 / state.vehicles) + '/vehicle</strong>.';
        } else {
          beText.innerHTML = 'HaaS costs <strong>' + fmt(hw.mlprSavingsAt3) +
            ' more</strong> over 3 years vs. CapEx, but requires no upfront capital.';
        }
      } else {
        beBlock.style.display = 'none';
      }
    }

    return hw;
  }

  // ── Render Grand Total ───────────────────────────
  function renderGrandTotal(sw, hw) {
    function fadeIfChanged(el, newVal) {
      if (el && el.textContent !== newVal) fadeValue(el, newVal);
      else if (el) el.textContent = newVal;
    }

    // Software column
    fadeIfChanged($('#grandSoftwareYr1'), fmt(sw.year1));
    fadeIfChanged($('#grandSoftwareRecurring'), fmt(sw.recurring) + '/yr recurring');

    // Hardware column — hide when no devices selected
    var deviceCount = state.hwTablet + state.hwLprHandheld + state.hwPrinter;
    const hwCol = $('#grandHardwareCol');
    if (hwCol) hwCol.style.display = deviceCount > 0 ? '' : 'none';
    fadeIfChanged($('#grandHardwareYr1'), fmt(hw.total));
    var gHwRec = $('#grandHardwareRecurring');
    if (gHwRec) gHwRec.innerHTML = deviceCount > 0 ? deviceCount + ' device' + (deviceCount === 1 ? '' : 's') : '&nbsp;';

    // MLPR column
    const mlprCol = $('#grandMlprCol');
    if (mlprCol) mlprCol.style.display = state.mlprEnabled ? '' : 'none';
    fadeIfChanged($('#grandMlprYr1'), fmt(hw.mlprYear1));
    fadeIfChanged($('#grandMlprRecurring'), fmt(hw.mlprRecurring) + '/yr recurring');

    // Grand totals
    const totalYr1 = sw.year1 + hw.total + hw.mlprYear1;
    const totalRec = sw.recurring + hw.mlprRecurring;

    fadeIfChanged($('#grandTotalYear1'), fmt(totalYr1));
    fadeIfChanged($('#grandTotalRecurring'), fmt(totalRec) + '/yr');

    // Subtitle — list only the components present in the package
    const subtitleEl = $('#grandTotalSubtitle');
    if (subtitleEl) {
      const parts = ['Software'];
      const hwCount = state.hwTablet + state.hwLprHandheld + state.hwPrinter;
      if (hwCount > 0) parts.push('Hardware');
      if (state.mlprEnabled) parts.push('Mobile LPR');
      const newSubtitle = parts.join(' \u00B7 ');
      if (subtitleEl.textContent !== newSubtitle) subtitleEl.textContent = newSubtitle;
    }
  }

  // ── Master Render ────────────────────────────────
  // Coalesce multiple state-change calls in the same frame into one pass,
  // so rapid clicks (e.g. double-tap Sourcewell toggle) don't overlap fades.
  var _renderScheduled = false;
  function render() {
    if (_renderScheduled) return;
    _renderScheduled = true;
    requestAnimationFrame(function() {
      _renderScheduled = false;
      const sw = renderSoftware();
      const hw = renderHardware();
      renderGrandTotal(sw, hw);
    });
  }

  // ── Event Binding ────────────────────────────────
  function bind() {
    // Entity type toggle
    $$('.toggle-card[data-entity]').forEach(card => {
      card.addEventListener('click', () => {
        state.entity = card.dataset.entity;
        render();
      });
    });

    // Campus tier
    const tierSelect = $('#campusTier');
    if (tierSelect) {
      tierSelect.addEventListener('change', () => {
        state.campusTier = tierSelect.value;
        render();
      });
    }

    // Sourcewell toggle
    $$('.sourcewell-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('disabled')) return;
        state.sourcewell = card.dataset.sourcewell === 'yes';
        render();
      });
    });

    // Go-live month
    const goLive = $('#goLiveMonth');
    if (goLive) {
      goLive.addEventListener('change', () => {
        state.goLiveMonth = parseInt(goLive.value);
        render();
      });
    }

    // Campus integrations stepper
    bindStepper('intBtnMinus', 'intBtnPlus', 'extraIntegrations', 'extraIntegrations', 0, 100);

    // Municipal module checkboxes — click on header area toggles, not on expand inputs
    $$('.checkbox-card[data-module]').forEach(card => {
      card.querySelector('.checkbox-card-inner').addEventListener('click', () => {
        const mod = card.dataset.module;
        const cb = card.querySelector('input[type="checkbox"]');
        cb.checked = !cb.checked;
        state[mod] = cb.checked;
        render();
      });
    });
    // Prevent clicks on expand fields from toggling the checkbox
    $$('.checkbox-card-expand').forEach(expand => {
      expand.addEventListener('click', (e) => { e.stopPropagation(); });
    });

    // Municipal volume inputs
    ['annualPermits', 'annualCitations', 'annualTransactions', 'avgTransactionValue'].forEach(id => {
      const el = $('#' + id);
      if (el) {
        el.addEventListener('change', () => {
          state[id] = parseFloat(el.value) || 0;
          render();
        });
      }
    });

    // Per-module integration steppers
    $$('.int-btn-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const mod = btn.dataset.mod;
        const key = mod + 'Integrations';
        if (state[key] > 0) { state[key]--; render(); }
      });
    });
    $$('.int-btn-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const mod = btn.dataset.mod;
        const key = mod + 'Integrations';
        state[key]++;
        render();
      });
    });
    $$('.mod-integrations').forEach(inp => {
      inp.addEventListener('change', () => {
        const mod = inp.dataset.mod;
        const key = mod + 'Integrations';
        state[key] = Math.max(0, parseInt(inp.value) || 0);
        render();
      });
    });

    // Hardware steppers
    bindHardwareStepper('hwTablet', 'tablet');
    bindHardwareStepper('hwLprHandheld', 'lprHandheld');
    bindHardwareStepper('hwPrinter', 'printer');

    // MLPR card toggle
    const mlprToggle = $('#mlprToggle');
    if (mlprToggle) {
      mlprToggle.addEventListener('click', () => {
        state.mlprEnabled = !state.mlprEnabled;
        render();
      });
    }
    // Prevent clicks inside expand area from toggling
    const mlprExpand = $('#mlprOptions');
    if (mlprExpand) {
      mlprExpand.addEventListener('click', (e) => { e.stopPropagation(); });
    }

    // MLPR pricing tier toggle
    $$('.mlpr-tier-control .segmented-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.mlprTier = btn.dataset.tier;
        $$('.mlpr-tier-control .segmented-btn').forEach(b => b.classList.toggle('active', b.dataset.tier === state.mlprTier));
        render();
      });
    });

    // MLPR vehicle stepper
    bindStepper('vehBtnMinus', 'vehBtnPlus', 'vehicleCount', 'vehicles', 1, 50, true);

    // Kit toggle
    $$('.toggle-card[data-kit]').forEach(card => {
      card.addEventListener('click', () => {
        state.kit = card.dataset.kit;
        render();
      });
    });

    // Model toggle
    $$('.toggle-card[data-model]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('disabled')) return;
        state.model = card.dataset.model;
        render();
      });
    });

    // MLPR discount
    const discountEl = $('#mlprDiscount');
    if (discountEl) {
      discountEl.addEventListener('change', () => {
        state.mlprDiscount = parseInt(discountEl.value) || 0;
        render();
      });
    }

    // PDF download
    const pdfBtn = $('#downloadPdfBtn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.SCSCalcPDF && typeof window.SCSCalcPDF.generate === 'function') {
          window.SCSCalcPDF.generate();
        } else {
          window.print();
        }
      });
    }
  }

  // ── Stepper Helper ───────────────────────────────
  function bindStepper(minusId, plusId, inputId, stateKey, min, max, autoDiscountMlpr) {
    const btnM = $('#' + minusId);
    const btnP = $('#' + plusId);
    const inp = $('#' + inputId);

    if (btnM) {
      btnM.addEventListener('click', () => {
        if (state[stateKey] > min) {
          state[stateKey]--;
          if (autoDiscountMlpr) autoMlprDiscount();
          render();
        }
      });
    }
    if (btnP) {
      btnP.addEventListener('click', () => {
        if (state[stateKey] < max) {
          state[stateKey]++;
          if (autoDiscountMlpr) autoMlprDiscount();
          render();
        }
      });
    }
    if (inp) {
      inp.addEventListener('change', () => {
        let v = parseInt(inp.value) || min;
        v = Math.max(min, Math.min(max, v));
        state[stateKey] = v;
        if (autoDiscountMlpr) autoMlprDiscount();
        render();
      });
    }
  }

  function bindHardwareStepper(stateKey, hwKey) {
    const inp = $('#' + stateKey);
    if (!inp) return;

    // Find buttons near this input
    const stepper = inp.closest('.stepper');
    if (!stepper) return;

    const btns = stepper.querySelectorAll('.stepper-btn');
    const btnM = btns[0];
    const btnP = btns[1];

    if (btnM) {
      btnM.addEventListener('click', () => {
        if (state[stateKey] > 0) { state[stateKey]--; render(); }
      });
    }
    if (btnP) {
      btnP.addEventListener('click', () => {
        if (state[stateKey] < 50) { state[stateKey]++; render(); }
      });
    }
    inp.addEventListener('change', () => {
      let v = parseInt(inp.value) || 0;
      v = Math.max(0, Math.min(50, v));
      state[stateKey] = v;
      render();
    });
  }

  // Volume discount is now negotiated directly with Survision (no automated
  // tier), so keep state.mlprDiscount at 0 regardless of vehicle count.
  function autoMlprDiscount() {
    state.mlprDiscount = 0;
  }

  // Custom select upgrade is handled by shared /assets/themed-select.js.
  // Any <select class="themed-select"> inside the calculator gets themed.
  function syncSelect(selectEl) {
    if (window.ThemedSelect && window.ThemedSelect.syncValue) {
      window.ThemedSelect.syncValue(selectEl);
      return;
    }
    var wrap = selectEl.closest('.custom-select');
    if (!wrap) return;
    var textSpan = wrap._textSpan;
    if (textSpan) textSpan.textContent = selectEl.options[selectEl.selectedIndex].textContent;
    wrap.querySelectorAll('.custom-select-option').forEach(function(o) {
      o.classList.toggle('active', o.getAttribute('data-value') === selectEl.value);
    });
  }

  // ── Init ─────────────────────────────────────────
  function init() {
    // Ensure themed selects are upgraded (shared script also auto-runs;
    // calling init() again is a no-op thanks to _themedUpgraded guard).
    if (window.ThemedSelect && window.ThemedSelect.init) {
      window.ThemedSelect.init();
    }
    bind();
    render();
  }

  // Expose for PDF generator
  window.SCSCalc = { state, calculateSoftware, calculateHardware, fmt, CAMPUS_TIERS, MUNICIPAL, HARDWARE, get MLPR() { return MLPR; }, MLPR_TIERS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
