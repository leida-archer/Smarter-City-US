/* ============================================
   SCS Pricing Calculator V2 — slide-based flow
   Higher Education path (Municipality greyed out for trial)
   Pure vanilla JS. Pricing data from:
     - SCS Pricing Calculator.xlsx (HE tiers + integrations)
     - Business Model 2026 Smarter City Solutions.pdf (MLPR)
   ============================================ */

(function () {
  'use strict';

  // ── Pricing Data ─────────────────────────────────

  // Higher Education tier table (XLSX source of truth)
  const HE_TIERS = {
    k12:     { label: 'K-12',      popLabel: 'any student body',   base:  24000, installPct: 0.45, sizeBucket: 'small', sourcewellEligible: false },
    x_small: { label: 'X-Small',   popLabel: 'up to 5,000',        base:  36000, installPct: 0.50, sizeBucket: 'small', sourcewellEligible: false },
    small:   { label: 'Small',     popLabel: '5,001 – 10,000',     base:  60000, installPct: 0.55, sizeBucket: 'small', sourcewellEligible: true  },
    medium:  { label: 'Medium',    popLabel: '10,001 – 20,000',    base:  72000, installPct: 0.65, sizeBucket: 'small', sourcewellEligible: true  },
    large:   { label: 'Large',     popLabel: '20,001 – 30,000',    base: 125000, installPct: 0.70, sizeBucket: 'large', sourcewellEligible: true  },
    xl:      { label: 'X-Large',   popLabel: '30,001 – 40,000',    base: 175000, installPct: 0.70, sizeBucket: 'large', sourcewellEligible: true  },
    xxl:     { label: 'XX-Large',  popLabel: '40,001+',            base: 215000, installPct: 0.70, sizeBucket: 'large', sourcewellEligible: true  },
  };

  // Per-integration price by level and size bucket (XS/S/M column vs L/XL/XXL)
  const INTEG = {
    1: { label: 'Level 1', desc: 'LPR · Camera-based AI · Mobile Pay · Meters · Student Management Systems · Payroll', small: 3350, large: 3950 },
    2: { label: 'Level 2', desc: 'Ride Share · Occupancy · Collection Agency',                                       small: 4900, large: 5500 },
    3: { label: 'Level 3', desc: 'Bespoke & PARCS Systems',                                                          small: 7200, large: 8900 },
  };

  const SOURCEWELL_DISCOUNT = 0.10;

  // Municipality pricing — flat module bases, flat install %, flat integration prices
  const MUNI_MODULES = {
    vpermit:     { label: 'vPermit',     base: 42000, dot: 'green',  hasBase: true,  priceLabel: '$42,000' },
    vcompliance: { label: 'vCompliance', base: 35000, dot: 'orange', hasBase: true,  priceLabel: '$35,000' },
    vpark:       { label: 'vPark',       base: 0,     dot: 'amber',  hasBase: false, priceLabel: 'Transaction-based' },
  };
  const MUNI_INTEG_PRICE = { 1: 3950, 2: 5500, 3: 8900 };
  const MUNI_INSTALL_PCT = 0.70;

  // Municipality usage-based pricing (carried forward from previous calculator)
  // vPermit:     first 12,000 included, then $0.99/permit tiered down to $0.59 floor (per 12k tier)
  // vCompliance: $0.75/citation tiered down to $0.35 floor (per 12k tier)
  // vPark:       5% of transaction value + $0.35/transaction flat
  function calcPermitOverage(annualPermits) {
    if (annualPermits <= 12000) return 0;
    const excess = annualPermits - 12000;
    const tiers = Math.ceil(excess / 12000);
    let total = 0;
    for (let t = 0; t < tiers; t++) {
      const count = Math.min(12000, excess - t * 12000);
      const rate = Math.max(0.59, 0.99 - t * 0.05);
      total += count * rate;
    }
    return total;
  }
  function calcCitationCost(annualCitations) {
    if (annualCitations <= 0) return 0;
    let total = 0, remaining = annualCitations, tier = 0;
    while (remaining > 0) {
      const count = Math.min(12000, remaining);
      const rate = Math.max(0.35, 0.75 - tier * 0.05);
      total += count * rate;
      remaining -= count;
      tier++;
    }
    return total;
  }
  function calcVparkCost(annualTransactions, avgValue) {
    if (annualTransactions <= 0) return 0;
    const perTxn = (avgValue * 0.05) + 0.35;
    return annualTransactions * perTxn;
  }

  // Hardware — prices carried over from existing catalog
  const HARDWARE = {
    tablet:      { label: 'Handheld Enforcement Tablet',   price: 4050 },
    lprHandheld: { label: 'Handheld LPR Citation Device',  price: 2160 },
    printer:     { label: 'Wireless Printer',              price:  675 },
  };

  // MLPR v2 pricing from PDF — Bronze/Silver/Gold × volume band
  const MLPR_V2 = {
    camera: { base: 1500, overview: 500, embedded4G: 200 },
    monthlyPerCamera: {
      bronze: { standard: 29, bulk50: 26, bulk100: 24 },
      silver: { standard: 45, bulk50: 39, bulk100: 35 },
      gold:   { standard: 63, bulk50: 55, bulk100: 50 },
    },
  };
  const MLPR_TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

  const MONTH_NAMES = ['', 'January','February','March','April','May','June','July','August','September','October','November','December'];

  // ── PDF Theme (mirrors styles.css brand tokens) ──
  const PDF_COLORS = {
    darkTeal: [21, 98, 108],
    midTeal:  [44, 116, 128],
    blueTeal: [49, 148, 182],
    sky:      [71, 187, 232],
    green:    [77, 174, 55],
    greenLt:  [136, 191, 87],
    orange:   [235, 91, 37],
    amber:    [240, 174, 37],
    red:      [212, 27, 36],
    dark:     [15, 23, 42],
    slate:    [71, 85, 105],
    gray:     [100, 116, 139],
    bg:       [250, 250, 248],
    white:    [255, 255, 255],
  };
  const PDF_RAINBOW = [
    PDF_COLORS.darkTeal,
    PDF_COLORS.blueTeal,
    PDF_COLORS.sky,
    PDF_COLORS.green,
    PDF_COLORS.amber,
    PDF_COLORS.orange,
    PDF_COLORS.red,
  ];

  // Preload SCS logo so it's available synchronously during PDF generation
  var scsLogoImg = new Image();
  scsLogoImg.src = '../assets/scs-logo.png';

  // ── State ────────────────────────────────────────
  const state = {
    currentStep: 1,               // 1..4
    entity: null,                 // 'higher_ed' | 'municipality'
    size: null,                   // HE_TIERS key
    muniModules: { vpermit: false, vcompliance: false, vpark: false },
    muniUsage: { permits: 12000, citations: 6000, transactions: 60000, avgTxnValue: 5 },
    goLiveMonth: 7,
    integrations: { 1: 0, 2: 0, 3: 0 },

    // Hardware
    hw: { tablet: 0, lprHandheld: 0, printer: 0 },

    // MLPR
    mlprEnabled: false,
    mlprTier: null,               // 'bronze'|'silver'|'gold'
    mlprOverview: false,
    mlpr4G: false,
    cameraCount: 1,
  };

  // ── Utilities ────────────────────────────────────
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const fmtUSD = (n) => {
    const rounded = Math.round(n);
    return '$' + rounded.toLocaleString('en-US');
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // ── Calculation Functions ────────────────────────

  // Months remaining in SCS fiscal year (anchor July 1).
  // If go-live is July, prorationFactor = 1.0.
  function prorationFactor(goLiveMonth) {
    const gl = Number(goLiveMonth) || 7;
    // Months from go-live through next June (inclusive of go-live month)
    // July=7 -> 12 months, Oct=10 -> 9 months, Jan=1 -> 6 months, June=6 -> 1 month
    const monthsRem = ((12 - (gl - 7) + 12) % 12) || 12;
    return monthsRem / 12;
  }
  function monthsRemainingInFiscal(goLiveMonth) {
    const gl = Number(goLiveMonth) || 7;
    return ((12 - (gl - 7) + 12) % 12) || 12;
  }

  function heIntegrationPrice(level, size) {
    const tier = HE_TIERS[size];
    if (!tier) return INTEG[level].small;
    return INTEG[level][tier.sizeBucket];
  }

  function softwareCalc() {
    return state.entity === 'municipality' ? muniSoftwareCalc() : heSoftwareCalc();
  }

  function muniSoftwareCalc() {
    const selectedKeys = Object.keys(MUNI_MODULES).filter(k => state.muniModules[k]);
    if (selectedKeys.length === 0) return null;

    const moduleLines = selectedKeys.map(k => ({
      key: k,
      label: MUNI_MODULES[k].label,
      base: MUNI_MODULES[k].base,
      hasBase: MUNI_MODULES[k].hasBase,
      priceLabel: MUNI_MODULES[k].priceLabel,
    }));
    const baseSum = selectedKeys.reduce((s, k) => s + MUNI_MODULES[k].base, 0);

    // Usage-based charges per module (annual projections)
    const usageLines = [];
    if (state.muniModules.vpermit) {
      const overage = calcPermitOverage(state.muniUsage.permits);
      if (overage > 0) {
        usageLines.push({
          module: 'vpermit',
          label: `Permit overage (${(state.muniUsage.permits - 12000).toLocaleString()} above 12k)`,
          amount: overage,
        });
      }
    }
    if (state.muniModules.vcompliance) {
      const cite = calcCitationCost(state.muniUsage.citations);
      if (cite > 0) {
        usageLines.push({
          module: 'vcompliance',
          label: `Citation processing (${state.muniUsage.citations.toLocaleString()} citations)`,
          amount: cite,
        });
      }
    }
    if (state.muniModules.vpark) {
      const vpark = calcVparkCost(state.muniUsage.transactions, state.muniUsage.avgTxnValue);
      if (vpark > 0) {
        usageLines.push({
          module: 'vpark',
          label: `vPark (${state.muniUsage.transactions.toLocaleString()} transactions)`,
          amount: vpark,
        });
      }
    }
    const usageSum = usageLines.reduce((a, b) => a + b.amount, 0);

    const integrationCosts = [1,2,3].map(lv => {
      const unit = MUNI_INTEG_PRICE[lv];
      const count = state.integrations[lv] || 0;
      return { level: lv, count, unit, subtotal: count * unit, desc: INTEG[lv].desc };
    });
    const integrationSum = integrationCosts.reduce((a,b) => a + b.subtotal, 0);
    const integrationLift = baseSum + integrationSum + usageSum;

    // Sourcewell 10% applies universally to Municipality (when anything selected)
    const sourcewellApplies = (baseSum + usageSum + integrationSum) > 0;
    const discount = sourcewellApplies ? SOURCEWELL_DISCOUNT : 0;
    const saasFull = integrationLift * (1 - discount);
    const proratedSaas = saasFull * prorationFactor(state.goLiveMonth);
    const installation = integrationLift * MUNI_INSTALL_PCT;

    return {
      kind: 'muni',
      tier: { label: 'Municipality', base: baseSum, installPct: MUNI_INSTALL_PCT },
      moduleLines,
      usageLines,
      usageSum,
      integrationCosts,
      integrationSum,
      integrationLift,
      sourcewellApplies,
      discount,
      saasFull,
      proratedSaas,
      installation,
      year1Total: proratedSaas + installation,
      prorationFactor: prorationFactor(state.goLiveMonth),
      monthsRemaining: monthsRemainingInFiscal(state.goLiveMonth),
    };
  }

  function fmtCents(n) {
    return '$' + (Math.round(n * 100) / 100).toFixed(2);
  }

  function heSoftwareCalc() {
    const tier = HE_TIERS[state.size];
    if (!tier) return null;

    const integrationCosts = [1,2,3].map(lv => {
      const unit = heIntegrationPrice(lv, state.size);
      const count = state.integrations[lv] || 0;
      return { level: lv, count, unit, subtotal: count * unit, desc: INTEG[lv].desc };
    });
    const integrationSum = integrationCosts.reduce((a,b) => a + b.subtotal, 0);
    const integrationLift = tier.base + integrationSum;

    // Sourcewell 10% applies to all eligible tiers (Small and above).
    // K-12 and X-Small are excluded.
    const sourcewellApplies = !!tier.sourcewellEligible;
    const discount = sourcewellApplies ? SOURCEWELL_DISCOUNT : 0;
    const saasFull = integrationLift * (1 - discount);
    const proratedSaas = saasFull * prorationFactor(state.goLiveMonth);
    const installation = integrationLift * tier.installPct;

    return {
      tier,
      integrationCosts,
      integrationSum,
      integrationLift,
      sourcewellApplies,
      discount,
      saasFull,          // annual recurring at full year
      proratedSaas,      // Year 1 SaaS
      installation,
      year1Total: proratedSaas + installation,
      prorationFactor: prorationFactor(state.goLiveMonth),
      monthsRemaining: monthsRemainingInFiscal(state.goLiveMonth),
    };
  }

  function mlprVolumeBand(cameraCount) {
    if (cameraCount >= 100) return 'bulk100';
    if (cameraCount >= 50)  return 'bulk50';
    return 'standard';
  }

  function hardwareCalc(softwareCalc) {
    // Devices
    const devices = Object.keys(HARDWARE).map(key => {
      const count = state.hw[key] || 0;
      const unit = HARDWARE[key].price;
      return { key, label: HARDWARE[key].label, count, unit, subtotal: count * unit };
    });
    const devicesTotal = devices.reduce((a, b) => a + b.subtotal, 0);

    // MLPR
    let mlpr = null;
    if (state.mlprEnabled && state.mlprTier) {
      const cameras = Math.max(1, state.cameraCount | 0);
      const band = mlprVolumeBand(cameras);
      const monthlyRate = MLPR_V2.monthlyPerCamera[state.mlprTier][band];
      const hwPerCam = MLPR_V2.camera.base
        + (state.mlprOverview ? MLPR_V2.camera.overview : 0)
        + (state.mlpr4G ? MLPR_V2.camera.embedded4G : 0);
      const hwTotal = hwPerCam * cameras;

      // Annual subscription, prorated to remaining months in fiscal year (both entities)
      const monthsForYr1 = monthsRemainingInFiscal(state.goLiveMonth);
      const subYr1 = monthlyRate * cameras * monthsForYr1;
      const subAnnualGross = monthlyRate * cameras * 12;

      // Sourcewell 10% applies to MLPR when the SaaS tier is eligible (Small+)
      const sourcewellApplies = !!(softwareCalc && softwareCalc.sourcewellApplies);
      const year1Gross = hwTotal + subYr1;
      const discount = sourcewellApplies ? year1Gross * SOURCEWELL_DISCOUNT : 0;
      const year1Total = year1Gross - discount;
      const subAnnualRecurring = sourcewellApplies
        ? subAnnualGross * (1 - SOURCEWELL_DISCOUNT)
        : subAnnualGross;

      mlpr = {
        tier: state.mlprTier,
        cameras,
        band,
        monthlyRate,
        hwPerCam,
        hwTotal,
        overviewOn: state.mlprOverview,
        fourGOn: state.mlpr4G,
        monthsForYr1,
        subYr1,
        subAnnualGross,
        subAnnualRecurring,
        sourcewellApplies,
        discount,
        year1Gross,
        year1Total,
      };
    }

    return {
      devices,
      devicesTotal,
      mlpr,
      year1Total: devicesTotal + (mlpr ? mlpr.year1Total : 0),
      recurring: mlpr ? mlpr.subAnnualRecurring : 0,
    };
  }

  // ── Slide Navigation ─────────────────────────────
  function goToStep(step) {
    step = clamp(step, 1, 4);
    state.currentStep = step;

    $$('.slide').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });

    if (step > 1) {
      snapToDivider(true);  // smooth auto-snap on slide change beyond entity
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    render();
  }

  // ── Magnetic snap (JS-driven; reliable across browsers) ──
  const SNAP_NAV_HEIGHT  = 72;       // sticky navbar height
  const SNAP_PULL_RANGE  = 140;      // px from snap line that triggers pull
  const SNAP_DEAD_ZONE   = 4;        // ignore micro-movements
  const SNAP_DEBOUNCE    = 160;      // wait until scroll has paused (ms)
  const SNAP_DURATION_MS = 800;      // ~2x native browser smooth-scroll
  let snapTimer = null;
  let snapSuppress = false;
  let snapAnimRaf = null;

  function snapTargetY() {
    const divider = document.querySelector('.page-hero-divider');
    if (!divider) return null;
    return window.scrollY + divider.getBoundingClientRect().top - SNAP_NAV_HEIGHT;
  }

  // Custom scroll tween (replaces `behavior:'smooth'`) — fixed duration regardless of distance
  function smoothScrollTo(targetY, duration) {
    if (snapAnimRaf) cancelAnimationFrame(snapAnimRaf);
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 1) return;
    const startTime = performance.now();
    // easeInOutCubic — gentle acceleration, gentle settle
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      window.scrollTo(0, startY + delta * ease(t));
      if (t < 1) {
        snapAnimRaf = requestAnimationFrame(step);
      } else {
        snapAnimRaf = null;
      }
    }
    snapAnimRaf = requestAnimationFrame(step);
  }

  function snapToDivider(smooth) {
    const target = snapTargetY();
    if (target == null) return;
    snapSuppress = true;
    if (smooth) {
      smoothScrollTo(target, SNAP_DURATION_MS);
    } else {
      window.scrollTo(0, target);
    }
    setTimeout(() => { snapSuppress = false; }, SNAP_DURATION_MS + 200);
  }

  function setupMagneticSnap() {
    window.addEventListener('scroll', () => {
      if (snapSuppress) return;
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const target = snapTargetY();
        if (target == null) return;
        const dist = Math.abs(window.scrollY - target);
        if (dist > SNAP_DEAD_ZONE && dist < SNAP_PULL_RANGE) {
          snapSuppress = true;
          smoothScrollTo(target, SNAP_DURATION_MS);
          setTimeout(() => { snapSuppress = false; }, SNAP_DURATION_MS + 200);
        }
      }, SNAP_DEBOUNCE);
    }, { passive: true });
  }

  // ── Render Functions ─────────────────────────────
  function render() {
    // 1. Next button enablement for entity slide
    const nextEntityBtn = $('#slide-entity .btn-slide-next');
    if (nextEntityBtn) nextEntityBtn.disabled = !state.entity;

    // 2. Selected states for entity cards
    $$('.big-choice-card[data-entity]').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.entity === state.entity);
      btn.setAttribute('aria-pressed', btn.dataset.entity === state.entity ? 'true' : 'false');
    });

    // 3a. Show/hide entity-specific inputs (HE size vs Muni modules)
    updateEntityInputs();

    // 3b. Update integration per-unit prices based on entity (and size for HE)
    updateIntegrationPrices();

    // 4. Update MLPR tier-card annual subscription (live with bulk band)
    updateMlprTierCards();

    // 5. Update camera-count card description (dynamic with tier+bulk)
    updateCamCardDesc();

    // 5b. Show / hide camera count + add-ons (only if MLPR enabled + tier selected)
    updateConditionalSections();

    // 6. Size eligibility constraint note (K-12 / X-Small don't get Sourcewell discount)
    const note = $('#sizeConstraintNote');
    if (note) {
      const t = HE_TIERS[state.size];
      note.style.display = (t && !t.sourcewellEligible) ? 'block' : 'none';
    }

    // 7. Software summary
    renderSoftwareSummary();

    // 8. Hardware summary
    renderHardwareSummary();

    // 9. Review slide
    renderReview();
  }

  function updateMlprTierCards() {
    const band = mlprVolumeBand(state.cameraCount);
    Object.keys(MLPR_V2.monthlyPerCamera).forEach(tier => {
      const monthly = MLPR_V2.monthlyPerCamera[tier][band];
      const annual = monthly * 12;
      const annEl = document.querySelector(`[data-tier-annual="${tier}"]`);
      if (annEl) annEl.textContent = fmtUSD(annual);
    });
  }

  function updateConditionalSections() {
    const visible = !!(state.mlprEnabled && state.mlprTier);
    const cam = $('#cameraSection');
    if (cam) cam.style.display = visible ? 'block' : 'none';
  }

  function updateIntegrationPrices() {
    [1,2,3].forEach(lv => {
      const slot = document.querySelector(`[data-price-slot="${lv}"]`);
      if (!slot) return;
      const price = state.entity === 'municipality'
        ? MUNI_INTEG_PRICE[lv]
        : heIntegrationPrice(lv, state.size || 'medium');
      slot.textContent = fmtUSD(price);
    });
  }

  function updateEntityInputs() {
    document.querySelectorAll('[data-entity-input]').forEach(el => {
      el.style.display = el.dataset.entityInput === state.entity ? 'block' : 'none';
    });
  }

  function renderSoftwareSummary() {
    const configEl = $('#softwareConfigEcho');
    const linesEl = $('#softwareLines');
    const totalEl = $('#softwareTotal');
    const recurringEl = $('#softwareRecurring');
    if (!linesEl) return;

    const calc = softwareCalc();
    if (!calc) {
      const emptyMsg = state.entity === 'municipality'
        ? 'Municipality · Select modules to begin'
        : 'Higher Education · Select size to begin';
      configEl.textContent = emptyMsg;
      linesEl.innerHTML = '';
      totalEl.textContent = '$0';
      recurringEl.textContent = 'Annual recurring (Year 2+): $0/yr';
      return;
    }

    const lines = [];

    if (calc.kind === 'muni') {
      const labels = calc.moduleLines.map(m => m.label).join(' · ');
      configEl.textContent = `Municipality · ${labels}`;
      calc.moduleLines.forEach(m => {
        if (m.hasBase) {
          // Module has a fixed base subscription
          lines.push(
            `<div class="summary-line"><span class="summary-line-label">${m.label} <span class="summary-line-sub">(annual)</span></span><span class="summary-line-value">${fmtUSD(m.base)}</span></div>`
          );
        }
        // Append matching usage sublines (if any)
        const usage = calc.usageLines.find(u => u.module === m.key);
        if (usage) {
          if (m.hasBase) {
            lines.push(
              `<div class="summary-line subline"><span class="summary-line-label"><span class="summary-line-arrow">&#8627;</span>${usage.label} <span class="summary-line-sub">(annual)</span></span><span class="summary-line-value">${fmtUSD(usage.amount)}</span></div>`
            );
          } else {
            lines.push(
              `<div class="summary-line"><span class="summary-line-label">${usage.label} <span class="summary-line-sub">(annual est.)</span></span><span class="summary-line-value">${fmtUSD(usage.amount)}</span></div>`
            );
          }
        } else if (!m.hasBase) {
          // vPark selected but 0 transactions — show placeholder
          lines.push(
            `<div class="summary-line muted"><span class="summary-line-label">${m.label} <span class="summary-line-sub">(no transactions entered)</span></span><span class="summary-line-value">$0</span></div>`
          );
        }
      });
    } else {
      const tier = calc.tier;
      configEl.textContent = `Higher Education · ${tier.label}`;
      // SaaS subscription line
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">SaaS Subscription (${tier.label}) <span class="summary-line-sub">(annual)</span></span><span class="summary-line-value">${fmtUSD(tier.base)}</span></div>`
      );
    }

    // Itemized integrations by level
    const anyIntegration = calc.integrationCosts.some(ic => ic.count > 0);
    if (anyIntegration) {
      lines.push('<div class="summary-group-label">Integrations</div>');
      calc.integrationCosts.forEach(ic => {
        if (ic.count > 0) {
          lines.push(
            `<div class="summary-line subline"><span class="summary-line-label"><span class="summary-line-arrow">&#8627;</span>Level ${ic.level} &times; ${ic.count} <span class="summary-line-sub">(annual)</span></span><span class="summary-line-value">${fmtUSD(ic.subtotal)}</span></div>`
          );
        }
      });
    }

    // Sourcewell discount line
    if (calc.sourcewellApplies) {
      lines.push(
        `<div class="summary-line muted"><span class="summary-line-label">Sourcewell discount <span class="summary-line-sub">(10% off lift)</span></span><span class="summary-line-value">&minus;${fmtUSD(calc.integrationLift * SOURCEWELL_DISCOUNT)}</span></div>`
      );
    }

    // Year-1 proration adjustment (only if not full year)
    if (calc.prorationFactor < 1) {
      const prorationAdj = calc.saasFull - calc.proratedSaas;
      lines.push(
        `<div class="summary-line muted"><span class="summary-line-label">Year 1 proration <span class="summary-line-sub">(${MONTH_NAMES[state.goLiveMonth]} go-live · ${calc.monthsRemaining} mo)</span></span><span class="summary-line-value">&minus;${fmtUSD(prorationAdj)}</span></div>`
      );
    }

    // Installation (one-time)
    lines.push(
      `<div class="summary-line"><span class="summary-line-label">Installation <span class="summary-line-sub">(one-time)</span></span><span class="summary-line-value">${fmtUSD(calc.installation)}</span></div>`
    );

    linesEl.innerHTML = lines.join('');
    totalEl.textContent = fmtUSD(calc.year1Total);
    recurringEl.textContent = `Annual recurring (Year 2+): ${fmtUSD(calc.saasFull)}/yr`;
  }

  function renderHardwareSummary() {
    const configEl = $('#hardwareConfigEchoV2');
    const linesEl = $('#hardwareLines');
    const totalEl = $('#hardwareTotalV2');
    const recurringEl = $('#hardwareRecurringV2');
    if (!linesEl) return;

    const sw = softwareCalc();
    const hw = hardwareCalc(sw);

    const lines = [];
    const hasDevices = hw.devices.some(d => d.count > 0);
    const hasMLPR = !!hw.mlpr;

    if (!hasDevices && !hasMLPR) {
      configEl.textContent = 'No hardware selected';
      linesEl.innerHTML = '';
      totalEl.textContent = '$0';
      recurringEl.style.display = 'none';
      return;
    }

    const entityLabel = state.entity === 'higher_ed' ? 'Higher Education'
                       : state.entity === 'municipality' ? 'Municipality' : '';
    configEl.textContent = entityLabel
      ? `${entityLabel} · ${buildHardwareConfigEcho(hw)}`
      : buildHardwareConfigEcho(hw);

    if (hasDevices) {
      lines.push('<div class="summary-group-label">Devices</div>');
      hw.devices.forEach(d => {
        if (d.count > 0) {
          lines.push(
            `<div class="summary-line"><span class="summary-line-label">${d.label} &times; ${d.count} <span class="summary-line-sub">(one-time)</span></span><span class="summary-line-value">${fmtUSD(d.subtotal)}</span></div>`
          );
        }
      });
    }

    if (hasMLPR) {
      const m = hw.mlpr;
      lines.push('<div class="summary-group-label">Mobile LPR (Survision)</div>');
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">Camera hardware &times; ${m.cameras} <span class="summary-line-sub">(one-time)</span></span><span class="summary-line-value">${fmtUSD(m.hwTotal)}</span></div>`
      );
      if (m.overviewOn) {
        lines.push(
          `<div class="summary-line subline"><span class="summary-line-label"><span class="summary-line-arrow">&#8627;</span>Overview included <span class="summary-line-sub">(per camera)</span></span><span class="summary-line-value"></span></div>`
        );
      }
      if (m.fourGOn) {
        lines.push(
          `<div class="summary-line subline"><span class="summary-line-label"><span class="summary-line-arrow">&#8627;</span>Embedded 4G included <span class="summary-line-sub">(per camera)</span></span><span class="summary-line-value"></span></div>`
        );
      }
      const subNote = m.monthsForYr1 < 12 ? `(${m.monthsForYr1} mo prorated)` : '(annual)';
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">${MLPR_TIER_LABELS[m.tier]} subscription <span class="summary-line-sub">${subNote}</span></span><span class="summary-line-value">${fmtUSD(m.subYr1)}</span></div>`
      );
      if (m.sourcewellApplies) {
        lines.push(
          `<div class="summary-line muted"><span class="summary-line-label">Sourcewell discount <span class="summary-line-sub">(10% off MLPR)</span></span><span class="summary-line-value">&minus;${fmtUSD(m.discount)}</span></div>`
        );
      }
    }

    linesEl.innerHTML = lines.join('');
    totalEl.textContent = fmtUSD(hw.year1Total);
    if (hasMLPR) {
      recurringEl.style.display = 'block';
      recurringEl.textContent = `MLPR annual recurring (Year 2+): ${fmtUSD(hw.mlpr.subAnnualRecurring)}/yr`;
    } else {
      recurringEl.style.display = 'none';
    }
  }

  function buildHardwareConfigEcho(hw) {
    const parts = [];
    if (hw.devices.some(d => d.count > 0)) parts.push('Enforcement devices');
    if (hw.mlpr) parts.push(`Mobile LPR (${MLPR_TIER_LABELS[hw.mlpr.tier]})`);
    return parts.join(' · ') || 'No hardware selected';
  }

  function renderReview() {
    const sw = softwareCalc();
    const hw = hardwareCalc(sw);

    const yr1El = $('#reviewYear1');
    const recurEl = $('#reviewRecurring');
    const subtitleEl = $('#reviewSubtitle');
    if (!yr1El) return;

    // Software column (always visible)
    const swYr1El = $('#reviewSwYr1');
    const swRecEl = $('#reviewSwRecurring');
    if (swYr1El) swYr1El.textContent = fmtUSD(sw ? sw.year1Total : 0);
    if (swRecEl) swRecEl.textContent = (sw ? fmtUSD(sw.saasFull) : '$0') + '/yr recurring';

    // Hardware column (devices only)
    const hwCol = $('#reviewHwCol');
    const hasDevices = hw.devices.some(d => d.count > 0);
    if (hwCol) hwCol.style.display = hasDevices ? '' : 'none';
    if (hasDevices) {
      const hwYr1El = $('#reviewHwYr1');
      if (hwYr1El) hwYr1El.textContent = fmtUSD(hw.devicesTotal);
    }

    // MLPR column
    const mlprCol = $('#reviewMlprCol');
    if (mlprCol) mlprCol.style.display = hw.mlpr ? '' : 'none';
    if (hw.mlpr) {
      const mlprYr1El = $('#reviewMlprYr1');
      const mlprRecEl = $('#reviewMlprRecurring');
      if (mlprYr1El) mlprYr1El.textContent = fmtUSD(hw.mlpr.year1Total);
      if (mlprRecEl) mlprRecEl.textContent = fmtUSD(hw.mlpr.subAnnualRecurring) + '/yr recurring';
    }

    // Subtitle
    if (subtitleEl) {
      const cats = [];
      if (sw) cats.push('Software');
      if (hasDevices) cats.push('Hardware');
      if (hw.mlpr) cats.push('MLPR');
      subtitleEl.textContent = cats.length ? cats.join(' · ') : 'Configure your deployment to see totals';
    }

    // Grand totals
    const grandYr1 = (sw ? sw.year1Total : 0) + hw.year1Total;
    const grandRecurring = (sw ? sw.saasFull : 0) + hw.recurring;
    yr1El.textContent = fmtUSD(grandYr1);
    if (recurEl) recurEl.textContent = fmtUSD(grandRecurring) + '/yr';

    // Stash configuration payload for form POST
    const payload = $('#reviewConfigPayload');
    if (payload) payload.value = JSON.stringify(buildConfigPayload(sw, hw));
  }

  function buildConfigPayload(sw, hw) {
    return {
      entity: state.entity,
      size: state.size,
      muniModules: state.muniModules,
      goLiveMonth: state.goLiveMonth,
      integrations: state.integrations,
      software: sw ? {
        kind: sw.kind || 'he',
        base: sw.tier.base,
        modules: sw.kind === 'muni' ? sw.moduleLines.map(m => ({ key: m.key, label: m.label, base: m.base, tbd: m.tbd })) : null,
        prorated_saas: Math.round(sw.proratedSaas),
        installation: Math.round(sw.installation),
        year1_total: Math.round(sw.year1Total),
        annual_recurring: Math.round(sw.saasFull),
      } : null,
      hardware: {
        devices: hw.devices.filter(d => d.count > 0).map(d => ({ label: d.label, count: d.count, subtotal: d.subtotal })),
        mlpr: hw.mlpr ? {
          tier: hw.mlpr.tier,
          cameras: hw.mlpr.cameras,
          band: hw.mlpr.band,
          overview: hw.mlpr.overviewOn,
          embedded4G: hw.mlpr.fourGOn,
          hardware_total: hw.mlpr.hwTotal,
          subscription_year1: Math.round(hw.mlpr.subYr1),
          sourcewell_discount: Math.round(hw.mlpr.discount),
          year1_total: Math.round(hw.mlpr.year1Total),
          annual_recurring: Math.round(hw.mlpr.subAnnualRecurring),
        } : null,
      },
    };
  }

  // ── PDF Export ───────────────────────────────────
  function drawRainbowBar(doc, y, height) {
    const pageW = doc.internal.pageSize.getWidth();
    const seg = pageW / PDF_RAINBOW.length;
    PDF_RAINBOW.forEach((color, i) => {
      doc.setFillColor.apply(doc, color);
      doc.rect(i * seg, y, seg + 0.5, height, 'F');
    });
  }

  function downloadPdf() {
    if (!window.jspdf) {
      alert('PDF library not yet loaded. Please try again in a moment.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const sw = softwareCalc();
    const hw = hardwareCalc(sw);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 56; // margin

    // Top rainbow bar (subtle brand accent)
    drawRainbowBar(doc, 0, 6);

    // SCS logo top-right (preloaded)
    if (scsLogoImg.complete && scsLogoImg.naturalWidth > 0) {
      const logoH = 54;  // 25% smaller than the previous 72pt size
      const logoW = logoH * (scsLogoImg.naturalWidth / scsLogoImg.naturalHeight);
      doc.addImage(scsLogoImg, 'PNG', pageW - M - logoW, 30, logoW, logoH);
    }

    // Header
    doc.setFont('helvetica','bold');
    doc.setFontSize(20);
    doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
    doc.text('SCS Deployment Estimate', M, 56);

    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, PDF_COLORS.gray);
    const subheader = (() => {
      if (!sw) return state.entity === 'municipality' ? 'Municipality · No modules selected' : 'Higher Education · —';
      if (sw.kind === 'muni') return `Municipality · ${sw.moduleLines.map(m => m.label).join(' · ')}`;
      return `Higher Education · ${sw.tier.label}`;
    })();
    doc.text(subheader, M, 76);
    const today = new Date();
    doc.text(`Generated ${today.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric'})}`, M, 90);

    // Orange accent stripe under the header (matches old PDF)
    doc.setDrawColor.apply(doc, PDF_COLORS.orange);
    doc.setLineWidth(2);
    doc.line(M, 100, M + 90, 100);

    // Subtle full-width divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, 118, pageW - M, 118);

    let y = 146;

    // Section: Software
    if (sw) {
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setFont('helvetica','bold');
      doc.text('SOFTWARE PLATFORM', M, y);
      // Thin teal underline beneath section header
      doc.setDrawColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setLineWidth(0.5);
      doc.line(M, y + 4, pageW - M, y + 4);
      y += 18;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, PDF_COLORS.slate);

      // ── SaaS Subscriptions ──
      y = pdfSubheader(doc, M, y, 'SaaS Subscriptions');
      if (sw.kind === 'muni') {
        sw.moduleLines.forEach(m => {
          if (m.hasBase) {
            y = pdfLine(doc, pageW, M, y, m.label, fmtUSD(m.base), '(annual)');
          }
          const usage = sw.usageLines.find(u => u.module === m.key);
          if (usage) {
            if (m.hasBase) {
              // Indented sub-item under its parent module
              y = pdfLine(doc, pageW, M, y, '  - ' + usage.label, fmtUSD(usage.amount), '(annual)');
            } else {
              // vPark — top-level since no base
              y = pdfLine(doc, pageW, M, y, usage.label, fmtUSD(usage.amount), '(annual est.)');
            }
          } else if (!m.hasBase) {
            y = pdfLine(doc, pageW, M, y, m.label, '$0', '(no transactions)');
          }
        });
      } else {
        y = pdfLine(doc, pageW, M, y, `SaaS Subscription (${sw.tier.label})`, fmtUSD(sw.tier.base), '(annual)');
      }

      // ── Integrations (only if any selected) ──
      const hasIntegrations = sw.integrationCosts.some(ic => ic.count > 0);
      if (hasIntegrations) {
        y += 6;
        y = pdfSubheader(doc, M, y, 'Integrations');
        sw.integrationCosts.forEach(ic => {
          if (ic.count > 0) {
            y = pdfLine(doc, pageW, M, y, `Level ${ic.level} integrations × ${ic.count}`, fmtUSD(ic.subtotal), '(annual)');
          }
        });
      }

      // ── Adjustments (un-indented, no subheader) ──
      y += 4;
      if (sw.sourcewellApplies) {
        y = pdfLine(doc, pageW, M, y, 'Sourcewell discount', '-' + fmtUSD(sw.integrationLift * SOURCEWELL_DISCOUNT), '(10% off lift)');
      }
      if (sw.prorationFactor < 1) {
        const prorationAdj = sw.saasFull - sw.proratedSaas;
        y = pdfLine(doc, pageW, M, y, 'Year 1 proration', '-' + fmtUSD(prorationAdj), `(${MONTH_NAMES[state.goLiveMonth]} go-live, ${sw.monthsRemaining} mo)`);
      }
      y = pdfLine(doc, pageW, M, y, 'Installation', fmtUSD(sw.installation), '(one-time)');
      y = pdfSubtotal(doc, pageW, M, y, 'Software Year 1', fmtUSD(sw.year1Total));
      y += 14;
    }

    // Section: Devices
    const hasDevices = hw.devices.some(d => d.count > 0);
    if (hasDevices) {
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setFont('helvetica','bold');
      doc.text('ENFORCEMENT DEVICES', M, y);
      doc.setDrawColor.apply(doc, PDF_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(M, y + 4, pageW - M, y + 4);
      y += 18;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      hw.devices.forEach(d => {
        if (d.count > 0) {
          y = pdfLine(doc, pageW, M, y, `${d.label} × ${d.count}`, fmtUSD(d.subtotal), '(one-time)');
        }
      });
      y = pdfSubtotal(doc, pageW, M, y, 'Devices Total', fmtUSD(hw.devicesTotal));
      y += 14;
    }

    // Section: MLPR
    if (hw.mlpr) {
      const m = hw.mlpr;
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setFont('helvetica','bold');
      doc.text(`MOBILE LPR — ${MLPR_TIER_LABELS[m.tier].toUpperCase()}`, M, y);
      doc.setDrawColor.apply(doc, PDF_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(M, y + 4, pageW - M, y + 4);
      y += 18;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      y = pdfLine(doc, pageW, M, y, `Camera hardware × ${m.cameras}`, fmtUSD(m.hwTotal), '(one-time)');
      if (m.overviewOn) y = pdfLine(doc, pageW, M, y, '  - Overview included', '', '(per camera)');
      if (m.fourGOn)    y = pdfLine(doc, pageW, M, y, '  - Embedded 4G included', '', '(per camera)');
      const subNote = m.monthsForYr1 < 12 ? `(${m.monthsForYr1} mo prorated)` : '(annual)';
      y = pdfLine(doc, pageW, M, y, `${MLPR_TIER_LABELS[m.tier]} subscription`, fmtUSD(m.subYr1), subNote);
      if (m.sourcewellApplies) {
        y = pdfLine(doc, pageW, M, y, 'Sourcewell discount', '-' + fmtUSD(m.discount), '(10% off MLPR)');
      }
      y = pdfSubtotal(doc, pageW, M, y, 'MLPR Year 1', fmtUSD(m.year1Total));
      y += 14;
    }

    // Grand totals — flow naturally right below the last section (no bottom anchor)
    const grandYr1 = (sw ? sw.year1Total : 0) + hw.year1Total;
    const grandRecurring = (sw ? sw.saasFull : 0) + hw.recurring;

    const contentW = pageW - 2 * M;
    const totalsBoxH = 60;
    const totalsBoxY = y;

    // Filled dark-teal totals block
    doc.setFillColor.apply(doc, PDF_COLORS.darkTeal);
    doc.roundedRect(M, totalsBoxY, contentW, totalsBoxH, 8, 8, 'F');

    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, PDF_COLORS.white);
    doc.text('TOTAL YEAR 1 INVESTMENT', M + 18, totalsBoxY + 22);

    doc.setFontSize(22);
    doc.text(fmtUSD(grandYr1), pageW - M - 18, totalsBoxY + 26, { align: 'right' });

    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 220, 230);
    doc.text('Annual Recurring (Year 2+)', M + 18, totalsBoxY + 44);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.white);
    doc.text(fmtUSD(grandRecurring) + '/yr', pageW - M - 18, totalsBoxY + 46, { align: 'right' });

    y = totalsBoxY + totalsBoxH + 12;

    // Professional Services panel (grey, mirrors old PDF treatment)
    const psBoxH = 56;
    doc.setFillColor(240, 240, 242);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, contentW, psBoxH, 6, 6, 'FD');

    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, PDF_COLORS.midTeal);
    doc.text('PROFESSIONAL SERVICES', M + 16, y + 16);

    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    doc.text('Hourly rate', M + 16, y + 30);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text('$215/hr', pageW - M - 16, y + 30, { align: 'right' });

    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, PDF_COLORS.gray);
    const psDesc = doc.splitTextToSize(
      'Custom development and ancillary support billed via Statement of Work (SOW). Contact us for scoping.',
      contentW - 32
    );
    doc.text(psDesc, M + 16, y + 44);

    // Footer (centered, two lines) + bottom rainbow bar
    drawRainbowBar(doc, pageH - 6, 6);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, PDF_COLORS.gray);
    doc.text('Smarter City Solutions  |  info@smartercity.com  |  smartercity.com',
      pageW / 2, pageH - 22, { align: 'center' });
    doc.text('Estimate only. Prices subject to change. Contact us for a formal quote.',
      pageW / 2, pageH - 12, { align: 'center' });

    doc.save(`SCS-Deployment-Estimate-${today.toISOString().slice(0,10)}.pdf`);
  }

  function pdfLine(doc, pageW, M, y, label, value, note) {
    // Label in 10pt slate
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    doc.text(label, M, y);
    // Optional small grey note appended after the label
    if (note) {
      const labelW = doc.getTextWidth(label);
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, PDF_COLORS.gray);
      doc.text(' ' + note, M + labelW, y);
    }
    // Value, right-aligned, dark + bold
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(value, pageW - M, y, { align: 'right' });
    doc.setFont('helvetica','normal');
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    return y + 16;
  }
  function pdfSubtotal(doc, pageW, M, y, label, value) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, pageW - M, y + 2);
    y += 16;
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(label, M, y);
    doc.text(value, pageW - M, y, { align: 'right' });
    doc.setFont('helvetica','normal');
    return y + 14;
  }
  // Bold body-size subheader (e.g. "SaaS Subscriptions", "Integrations")
  function pdfSubheader(doc, M, y, label) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(label, M, y);
    doc.setFont('helvetica','normal');
    return y + 14;
  }

  // ── Event Wiring ─────────────────────────────────
  function wireEvents() {
    // Slide 1: Entity cards
    $$('.big-choice-card[data-entity]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled') || btn.disabled) return;
        state.entity = btn.dataset.entity;
        render();
      });
    });

    // Back / Next buttons
    $$('.btn-slide-back').forEach(btn => {
      btn.addEventListener('click', () => goToStep(state.currentStep - 1));
    });
    $$('.btn-slide-next').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        goToStep(state.currentStep + 1);
      });
    });

    // Municipality module cards — click anywhere on the header toggles the checkbox.
    // Clicks inside the expand panel (inputs/labels) don't toggle.
    $$('.checkbox-card[data-muni-card]').forEach(card => {
      const inner = card.querySelector('.checkbox-card-inner');
      const cb = card.querySelector('input[type="checkbox"][data-muni-module]');
      if (!cb || !inner) return;
      inner.addEventListener('click', (e) => {
        // Avoid double-fire when click bubbles through the checkbox itself
        if (e.target.tagName === 'INPUT') return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
    });
    $$('input[data-muni-module]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.muniModule;
        state.muniModules[key] = input.checked;
        const card = input.closest('.checkbox-card');
        if (card) card.classList.toggle('checked', input.checked);
        render();
      });
    });

    // Municipality usage inputs (annual permits / citations / transactions / avg txn value)
    $$('[data-muni-usage]').forEach(input => {
      const handler = () => {
        const key = input.dataset.muniUsage;
        const v = Number(input.value);
        state.muniUsage[key] = isFinite(v) && v > 0 ? v : 0;
        render();
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
      // Stop click bubbling so clicks on the input don't toggle the parent card
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    // Size select
    const sizeSel = $('#heSize');
    if (sizeSel) sizeSel.addEventListener('change', () => {
      state.size = sizeSel.value || null;
      render();
    });

    // Go-live select
    const golSel = $('#heGoLive');
    if (golSel) golSel.addEventListener('change', () => {
      state.goLiveMonth = Number(golSel.value) || 7;
      render();
    });

    // Level steppers
    $$('[data-level-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = Number(btn.dataset.level);
        const dir = btn.dataset.levelDir;
        const next = clamp((state.integrations[level] || 0) + (dir === '+' ? 1 : -1), 0, 20);
        state.integrations[level] = next;
        const input = document.querySelector(`[data-level-count="${level}"]`);
        if (input) input.value = next;
        render();
      });
    });
    $$('[data-level-count]').forEach(input => {
      input.addEventListener('input', () => {
        const level = Number(input.dataset.levelCount);
        state.integrations[level] = clamp(Number(input.value) | 0, 0, 20);
        render();
      });
    });

    // Hardware steppers
    $$('[data-hw-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.hw;
        const dir = btn.dataset.hwDir;
        const next = clamp((state.hw[key] || 0) + (dir === '+' ? 1 : -1), 0, 50);
        state.hw[key] = next;
        const input = document.querySelector(`[data-hw-count="${key}"]`);
        if (input) input.value = next;
        render();
      });
    });
    $$('[data-hw-count]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.hwCount;
        state.hw[key] = clamp(Number(input.value) | 0, 0, 50);
        render();
      });
    });

    // MLPR toggle (card click)
    const mlprCard = $('#mlprCardV2');
    const mlprToggle = $('#mlprToggleV2');
    if (mlprCard && mlprToggle) {
      mlprToggle.addEventListener('click', (e) => {
        if (e.target.closest('input, label, .mlpr-tier-card, .addon-check, .stepper')) return;
        state.mlprEnabled = !state.mlprEnabled;
        mlprCard.classList.toggle('active', state.mlprEnabled);
        render();
      });
    }

    // MLPR tier radios (via label click)
    $$('.mlpr-tier-card').forEach(card => {
      card.addEventListener('click', () => {
        const tier = card.dataset.tier;
        state.mlprTier = tier;
        $$('.mlpr-tier-card').forEach(c => c.classList.toggle('selected', c.dataset.tier === tier));
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        // auto-enable MLPR if tier chosen
        if (!state.mlprEnabled) {
          state.mlprEnabled = true;
          if (mlprCard) mlprCard.classList.add('active');
        }
        render();
      });
    });

    // MLPR add-ons
    const addOverview = $('#addonOverview');
    if (addOverview) addOverview.addEventListener('change', () => {
      state.mlprOverview = addOverview.checked;
      render();
    });
    const add4G = $('#addon4G');
    if (add4G) add4G.addEventListener('change', () => {
      state.mlpr4G = add4G.checked;
      render();
    });

    // Camera count stepper
    $$('[data-cam-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.camDir;
        const next = clamp(state.cameraCount + (dir === '+' ? 1 : -1), 1, 500);
        state.cameraCount = next;
        const input = $('#cameraCount');
        if (input) input.value = next;
        render();
      });
    });
    const camInput = $('#cameraCount');
    if (camInput) camInput.addEventListener('input', () => {
      state.cameraCount = clamp(Number(camInput.value) | 0, 1, 500);
      render();
    });

    // Camera Add-Ons collapsible toggle
    const addonsToggle = $('#addonsToggle');
    if (addonsToggle) {
      addonsToggle.addEventListener('click', () => {
        const expanded = addonsToggle.getAttribute('aria-expanded') === 'true';
        addonsToggle.setAttribute('aria-expanded', String(!expanded));
      });
    }

    // PDF download
    const pdfBtn = $('#btnDownloadPdf');
    if (pdfBtn) pdfBtn.addEventListener('click', downloadPdf);

    // Start Over
    const startBtn = $('#btnStartOver');
    if (startBtn) startBtn.addEventListener('click', () => {
      if (!confirm('Reset all selections and start over?')) return;
      // Reset state
      state.entity = null;
      state.size = null;
      state.muniModules = { vpermit: false, vcompliance: false, vpark: false };
      state.muniUsage = { permits: 12000, citations: 6000, transactions: 60000, avgTxnValue: 5 };
      state.goLiveMonth = 7;
      state.integrations = { 1:0, 2:0, 3:0 };
      state.hw = { tablet:0, lprHandheld:0, printer:0 };
      state.mlprEnabled = false;
      state.mlprTier = null;
      state.mlprOverview = false;
      state.mlpr4G = false;
      state.cameraCount = 1;
      // Reset DOM
      if (sizeSel) { sizeSel.value = ''; if (window.ThemedSelect) window.ThemedSelect.syncValue(sizeSel); }
      if (golSel)  { golSel.value = '7'; if (window.ThemedSelect) window.ThemedSelect.syncValue(golSel); }
      $$('[data-level-count]').forEach(i => i.value = 0);
      $$('[data-hw-count]').forEach(i => i.value = 0);
      $$('[data-muni-module]').forEach(i => {
        i.checked = false;
        const card = i.closest('.checkbox-card');
        if (card) card.classList.remove('checked');
      });
      const muniUsageDefaults = { permits: 12000, citations: 6000, transactions: 60000, avgTxnValue: 5 };
      $$('[data-muni-usage]').forEach(i => { i.value = muniUsageDefaults[i.dataset.muniUsage]; });
      if (camInput) camInput.value = 1;
      if (addOverview) addOverview.checked = false;
      if (add4G) add4G.checked = false;
      $$('.mlpr-tier-card').forEach(c => c.classList.remove('selected'));
      if (mlprCard) mlprCard.classList.remove('active');
      goToStep(1);
    });
  }

  function updateCamCardDesc() {
    const desc = $('#camCardDesc');
    if (!desc) return;
    if (state.mlprTier) {
      const band = mlprVolumeBand(state.cameraCount);
      const monthly = MLPR_V2.monthlyPerCamera[state.mlprTier][band];
      desc.textContent = `Camera hardware is $1,500 per unit and ${fmtUSD(monthly)}/month.`;
    } else {
      desc.textContent = 'Camera hardware is $1,500 per unit.';
    }
  }

  // ── Gating (localStorage demo auth) ──────────────
  function wireGating() {
    const overlay = $('#gatedOverlay');
    const wrapper = $('#gatedWrapper');
    if (!overlay || !wrapper) return;

    const authed = localStorage.getItem('scs_authed') === 'true';
    if (authed) {
      overlay.style.display = 'none';
      wrapper.style.filter = '';
      wrapper.style.pointerEvents = '';
      return;
    }

    overlay.style.display = 'block';
    wrapper.style.filter = 'blur(6px)';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.userSelect = 'none';

    const form = $('#gatedLoginForm');
    const errorEl = $('#gatedAuthError');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = ($('#gatedSwEmail').value || '').trim().toLowerCase();
      const account = ($('#gatedSwAccount').value || '').trim();
      if (email === 'demo' && account === '0000') {
        localStorage.setItem('scs_authed', 'true');
        overlay.style.display = 'none';
        wrapper.style.filter = '';
        wrapper.style.pointerEvents = '';
        wrapper.style.userSelect = '';
        if (window.SCSNavAuth && window.SCSNavAuth.refresh) window.SCSNavAuth.refresh();
      } else {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Invalid credentials. Try demo / 0000.';
      }
    });
  }

  // ── Init ─────────────────────────────────────────
  function init() {
    wireGating();
    wireEvents();
    updateIntegrationPrices();
    setupMagneticSnap();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
