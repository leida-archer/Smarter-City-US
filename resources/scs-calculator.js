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
      year1Discount: 0.65,
      includedPermits: 1000,
      overageStart: 0.99,
      overageFloor: 0.59,
    },
    vcompliance: {
      base: 35000,
      year1Discount: 0.65,
      baseCitationRate: 0.75,
      citationFloor: 0.35,
    },
    vpark: {
      ratePercent: 0.05,
      rateFlat: 0.25,
    },
    integrationCost: 3750,
    implementationFee: null, // [NEED FEE]
  };

  // Hardware pricing
  const HARDWARE = {
    tablet: { label: 'Rugged Handheld Enforcement Tablet', price: 4500 },
    lprHandheld: { label: 'Handheld LPR Citation Device', price: 2400 },
    printer: { label: 'Zebra Printer', price: 750 },
  };

  // MLPR Survision pricing
  const MLPR = {
    capex_full: { hardware: 16000, software: 8000, commissioning: 2500 },
    haas_full: { monthly: 1290, annual: 15480 },
    haas_mini: { monthly: 1100, annual: 13200 },
  };

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
    monthlyPermits: 1000,
    monthlyCitations: 500,
    monthlyTransactions: 5000,
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
  };

  // ── DOM Helpers ──────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Format Currency ──────────────────────────────
  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  // ── Fade Value Transition ───────────────────────
  var _skipFade = false;

  function fadeValue(el, newVal) {
    if (_skipFade) {
      el.textContent = newVal;
      return;
    }
    el.classList.add('updating');
    setTimeout(function() {
      el.textContent = newVal;
      el.classList.remove('updating');
    }, 500);
  }

  function fadeHTML(el, newHTML) {
    if (_skipFade) {
      el.innerHTML = newHTML;
      return;
    }
    el.classList.add('updating');
    setTimeout(function() {
      el.innerHTML = newHTML;
      el.classList.remove('updating');
    }, 500);
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
  function calcPermitOverage(monthlyPermits) {
    if (monthlyPermits <= 1000) return 0;
    const excess = monthlyPermits - 1000;
    // Tiered: rate starts at $0.99, drops by ~$0.05 per 1000-unit tier, floor $0.59
    const tiers = Math.ceil(excess / 1000);
    let total = 0;
    for (let t = 0; t < tiers; t++) {
      const count = Math.min(1000, excess - t * 1000);
      const rate = Math.max(0.59, 0.99 - t * 0.05);
      total += count * rate;
    }
    return total; // per month
  }

  // ── vCompliance Citation Calculation ─────────────
  function calcCitationCost(monthlyCitations) {
    if (monthlyCitations <= 0) return 0;
    // First 1000 at $0.75, tiered discount per additional 1000, floor $0.35
    let total = 0;
    let remaining = monthlyCitations;
    let tier = 0;
    while (remaining > 0) {
      const count = Math.min(1000, remaining);
      const rate = Math.max(0.35, 0.75 - tier * 0.05);
      total += count * rate;
      remaining -= count;
      tier++;
    }
    return total; // per month
  }

  // ── vPark Transaction Calculation ────────────────
  function calcVparkCost(monthlyTransactions, avgValue) {
    const percentFee = avgValue * 0.05;
    const effectiveRate = Math.max(percentFee, 0.25);
    return monthlyTransactions * effectiveRate; // per month
  }

  // ── Software Calculation ─────────────────────────
  function calculateSoftware() {
    const result = { lines: [], year1: 0, recurring: 0, implementation: 0, tco: {} };

    if (state.entity === 'campus') {
      const tier = CAMPUS_TIERS[state.campusTier];
      const proFactor = getProrationFactor(state.goLiveMonth);
      let saas = tier.saas;

      // Sourcewell discount (10% for eligible tiers)
      if (state.sourcewell && tier.sourcewellDiscount) {
        saas = saas * 0.9;
        result.lines.push({ label: 'SaaS Subscription (Sourcewell)', amount: saas, note: 'annual, 10% off' });
      } else {
        result.lines.push({ label: 'SaaS Subscription', amount: saas, note: 'annual' });
      }

      const proratedSaas = saas * proFactor;
      result.lines.push({ label: 'Year 1 Prorated SaaS', amount: proratedSaas, note: Math.round(proFactor * 12) + ' months' });
      result.lines.push({ label: 'Implementation & Training', amount: tier.implementation, note: 'one-time, ' + tier.implementationNote });

      // Extra integrations
      const extraInt = state.extraIntegrations;
      if (extraInt > 0) {
        const intCost = extraInt * 3750;
        result.lines.push({ label: 'Extra Integrations (' + extraInt + ')', amount: intCost, note: 'annual' });
        saas += intCost;
      }

      result.year1 = proratedSaas + tier.implementation + (extraInt > 0 ? extraInt * 3750 : 0);
      result.recurring = saas;
      result.implementation = tier.implementation;
      result.integrationsIncluded = tier.integrationsIncluded;

    } else {
      // Municipal / Standalone
      let baseSaas = 0;
      let year1Saas = 0;

      if (state.vpermit) {
        const base = MUNICIPAL.vpermit.base;
        const yr1 = base * MUNICIPAL.vpermit.year1Discount;
        baseSaas += base;
        year1Saas += yr1;
        result.lines.push({ label: 'vPermit Subscription', amount: base, note: 'annual' });
        result.lines.push({ label: 'vPermit Year 1 (65%)', amount: yr1, note: 'first year' });

        const overage = calcPermitOverage(state.monthlyPermits) * 12;
        if (overage > 0) {
          result.lines.push({ label: 'vPermit Overages', amount: overage, note: 'annual est.' });
          baseSaas += overage;
          year1Saas += overage;
        }
      }

      if (state.vcompliance) {
        const base = MUNICIPAL.vcompliance.base;
        const yr1 = base * MUNICIPAL.vcompliance.year1Discount;
        baseSaas += base;
        year1Saas += yr1;
        result.lines.push({ label: 'vCompliance Subscription', amount: base, note: 'annual' });
        result.lines.push({ label: 'vCompliance Year 1 (65%)', amount: yr1, note: 'first year' });

        const citationCost = calcCitationCost(state.monthlyCitations) * 12;
        if (citationCost > 0) {
          result.lines.push({ label: 'Citation Fees', amount: citationCost, note: 'annual est.' });
          baseSaas += citationCost;
          year1Saas += citationCost;
        }
      }

      if (state.vpark) {
        const vparkMonthly = calcVparkCost(state.monthlyTransactions, state.avgTransactionValue);
        const vparkAnnual = vparkMonthly * 12;
        result.lines.push({ label: 'vPark Transaction Fees', amount: vparkAnnual, note: 'annual est.' });
        baseSaas += vparkAnnual;
        year1Saas += vparkAnnual;
      }

      // Implementation (placeholder)
      const implFee = MUNICIPAL.implementationFee;
      if (implFee) {
        result.lines.push({ label: 'Implementation & Training', amount: implFee, note: 'one-time' });
        result.implementation = implFee;
      } else {
        result.lines.push({ label: 'Implementation & Training', amount: 0, note: '[NEED FEE] — contact for quote' });
        result.implementation = 0;
      }

      // Per-module integrations
      var totalInt = 0;
      if (state.vpermit) totalInt += state.vpermitIntegrations;
      if (state.vcompliance) totalInt += state.vcomplianceIntegrations;
      if (state.vpark) totalInt += state.vparkIntegrations;
      if (totalInt > 0) {
        const intCost = totalInt * MUNICIPAL.integrationCost;
        result.lines.push({ label: 'Integrations (' + totalInt + ')', amount: intCost, note: 'annual' });
        baseSaas += intCost;
        year1Saas += intCost;
      }

      result.year1 = year1Saas + result.implementation;
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

    // Enforcement devices
    if (state.hwTablet > 0) {
      const cost = HARDWARE.tablet.price * state.hwTablet;
      result.lines.push({ label: HARDWARE.tablet.label + ' \u00D7' + state.hwTablet, amount: cost, note: 'one-time' });
      result.total += cost;
    }
    if (state.hwLprHandheld > 0) {
      const cost = HARDWARE.lprHandheld.price * state.hwLprHandheld;
      result.lines.push({ label: HARDWARE.lprHandheld.label + ' \u00D7' + state.hwLprHandheld, amount: cost, note: 'one-time' });
      result.total += cost;
    }
    if (state.hwPrinter > 0) {
      const cost = HARDWARE.printer.price * state.hwPrinter;
      result.lines.push({ label: HARDWARE.printer.label + ' \u00D7' + state.hwPrinter, amount: cost, note: 'one-time' });
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
        result.lines.push({ label: 'MLPR Hardware \u00D7' + v, amount: p.hardware * v * d, note: 'one-time' });
        result.lines.push({ label: 'MLPR Software \u00D7' + v, amount: p.software * v * d, note: 'annual' });
        result.lines.push({ label: 'MLPR Commissioning \u00D7' + v, amount: p.commissioning * v * d, note: 'one-time' });
        result.mlprYear1 = yr1;
        result.mlprRecurring = rec;
      } else {
        const rate = state.kit === 'full' ? MLPR.haas_full : MLPR.haas_mini;
        result.lines.push({ label: 'MLPR All-inclusive \u00D7' + v, amount: rate.monthly * v * d, note: '/month' });
        result.lines.push({ label: 'MLPR Annual \u00D7' + v, amount: rate.annual * v * d, note: 'billed annually' });
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
          note.textContent = 'Sourcewell 10% discount applied to SaaS subscription';
          note.style.color = '';
        }
      }

      // Integrations note
      const intNote = $('#integrationsNote');
      if (intNote) {
        intNote.textContent = tier.integrationsIncluded + ' integrations included with your tier. Additional integrations at $3,750/yr each.';
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
        newEcho = 'Campus \u00B7 ' + tier.label + ' Tier (' + tier.population + ')';
      } else {
        const mods = [];
        if (state.vpermit) mods.push('vPermit');
        if (state.vcompliance) mods.push('vCompliance');
        if (state.vpark) mods.push('vPark');
        newEcho = 'Municipality \u00B7 ' + (mods.length ? mods.join(' + ') : 'No modules selected');
      }
      if (echo.textContent !== newEcho) fadeValue(echo, newEcho);
    }

    // Summary lines
    const linesEl = $('#softwareSummaryLines');
    if (linesEl) {
      var newLinesHTML = sw.lines.map(l =>
        '<div class="summary-line"><span class="summary-line-label">' + l.label +
        ' <span class="summary-line-sub">(' + l.note + ')</span></span><span class="summary-line-amount">' +
        (l.amount > 0 ? fmt(l.amount) : l.note.includes('[NEED FEE]') ? 'TBD' : '$0') + '</span></div>'
      ).join('');
      if (linesEl.innerHTML !== newLinesHTML) fadeHTML(linesEl, newLinesHTML);
    }

    // Totals
    const totalLabel = $('#softwareTotalLabel');
    const totalAmount = $('#softwareTotalAmount');
    const recurringLine = $('#softwareRecurringLine');

    if (totalLabel) {
      var newTotalLabel = state.entity === 'campus' ? 'Year 1 Total (Prorated)' : 'Year 1 Total (65% Discount)';
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

    // Prorate callout
    const prorateText = $('#prorateText');
    if (prorateText) {
      var newProrate;
      if (state.entity === 'campus') {
        const months = Math.round(getProrationFactor(state.goLiveMonth) * 12);
        newProrate = 'Year 1 prorated to <strong>' + months + ' months</strong> based on fiscal year (July\u2013June). Full annual pricing applies from Year 2.';
      } else {
        newProrate = 'Year 1 subscription at <strong>65% discount</strong>. Full annual pricing applies from Year 2.';
      }
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
      var newLinesHTML = hw.lines.map(l =>
        '<div class="summary-line"><span class="summary-line-label">' + l.label +
        ' <span class="summary-line-sub">(' + l.note + ')</span></span><span class="summary-line-amount">' +
        fmt(l.amount) + '</span></div>'
      ).join('');
      if (linesEl.innerHTML !== newLinesHTML) fadeHTML(linesEl, newLinesHTML);
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

    // MLPR discount
    if (state.mlprEnabled && state.mlprDiscount > 0 && linesEl) {
      linesEl.innerHTML += '<div class="summary-line" style="color:#4DAE37;font-size:13px;padding-top:4px"><span class="summary-line-label">MLPR volume discount</span><span class="summary-line-amount" style="color:#4DAE37">-' + state.mlprDiscount + '%</span></div>';
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

    // Hardware column
    fadeIfChanged($('#grandHardwareYr1'), fmt(hw.total));
    var gHwRec = $('#grandHardwareRecurring');
    if (gHwRec) gHwRec.innerHTML = hw.total > 0 ? 'One-time purchase' : '&nbsp;';

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

    // Grand TCO
    [1, 3, 5].forEach(y => {
      const swTco = sw.tco[y] || 0;
      const mlprTco = state.mlprEnabled ? (hw.mlprTco[y] || 0) : 0;
      const total = swTco + hw.total + mlprTco;
      const el = $('#grandTco' + y);
      if (el) {
        const newVal = fmt(total);
        if (el.textContent !== newVal) {
          fadeValue(el, newVal);
        }
      }
    });
  }

  // ── Master Render ────────────────────────────────
  function render() {
    const sw = renderSoftware();
    const hw = renderHardware();
    renderGrandTotal(sw, hw);
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
    ['monthlyPermits', 'monthlyCitations', 'monthlyTransactions', 'avgTransactionValue'].forEach(id => {
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

  function autoMlprDiscount() {
    if (state.vehicles >= 10) {
      state.mlprDiscount = 10;
    } else if (state.vehicles >= 5) {
      state.mlprDiscount = 5;
    } else {
      state.mlprDiscount = 0;
    }
  }

  // ── Custom Select Initialization ──────────────────
  function initCustomSelects() {
    $$('.calc-inputs select').forEach(sel => {
      // Build wrapper
      var wrap = document.createElement('div');
      wrap.className = 'custom-select';

      // Build trigger
      var trigger = document.createElement('div');
      trigger.className = 'custom-select-trigger';
      var textSpan = document.createElement('span');
      textSpan.className = 'custom-select-text';
      textSpan.textContent = sel.options[sel.selectedIndex].textContent;
      trigger.appendChild(textSpan);

      // SVG arrow (inline, no viewBox issues)
      var arrow = document.createElement('span');
      arrow.className = 'custom-select-arrow';
      arrow.innerHTML = '<svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      trigger.appendChild(arrow);

      // Build options panel
      var panel = document.createElement('div');
      panel.className = 'custom-select-options';

      Array.from(sel.options).forEach(function(opt) {
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

      // Toggle
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        $$('.custom-select.open').forEach(function(cs) {
          if (cs !== wrap) cs.classList.remove('open');
        });
        wrap.classList.toggle('open');
      });

      // Insert into DOM
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(trigger);
      wrap.appendChild(panel);
      wrap.appendChild(sel);

      // Store ref for programmatic sync
      wrap._textSpan = textSpan;
      wrap._select = sel;
    });

    // Close all on outside click
    document.addEventListener('click', function() {
      $$('.custom-select.open').forEach(function(cs) { cs.classList.remove('open'); });
    });
  }

  // Sync custom select display after programmatic value change
  function syncSelect(selectEl) {
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
    initCustomSelects();
    bind();
    render();
  }

  // Expose for PDF generator
  window.SCSCalc = { state, calculateSoftware, calculateHardware, fmt, CAMPUS_TIERS, MUNICIPAL, HARDWARE, MLPR };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
