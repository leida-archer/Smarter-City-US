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

  // Mobile LPR (vehicle-mounted) — true MSRP as the comparison baseline;
  // customer pays the "Cost + 5%" tier (Partner Price × 1.05 per Survision PDF).
  // Savings % = (MSRP − Customer) / MSRP ≈ 5.5% across all packages.
  const MLPR_PRICING = {
    msrp: {  // list price — reference/comparison only
      capex_full: { hardware: 16000, software: 8000, commissioning: 2500 },
      haas_full:  { monthly: 1290, annual: 15480 },
      haas_mini:  { monthly: 1100, annual: 13200 },
    },
    sourcewell: {  // what customer actually pays (Cost + 5%)
      capex_full: { hardware: 15120, software: 7560, commissioning: 2362.50 },
      haas_full:  { monthly: 1219.05, annual: 14628.60 },
      haas_mini:  { monthly: 1039.50, annual: 12474 },
    },
  };

  // Fixed FLPR (camera-based) — customer pays Cost+5% ($1,575/camera), MSRP $1,950/camera
  // for comparison. Add-ons priced at their listed amounts (no MSRP comparison on add-ons).
  // Savings % = (MSRP − Customer) / MSRP ≈ 19.2% on the base hardware.
  const FLPR_PRICING = {
    camera: {
      base: 1575,          // customer price per camera (Cost + 5%)
      msrp: 1950,          // list price per camera — comparison baseline
      overview: 500,
      embedded4G: 200,
    },
    monthlyPerCamera: {
      bronze: { standard: 29, bulk50: 26, bulk100: 24 },
      silver: { standard: 45, bulk50: 39, bulk100: 35 },
      gold:   { standard: 63, bulk50: 55, bulk100: 50 },
    },
  };
  const FLPR_TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

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

    // Mobile LPR (vehicle-mounted, legacy)
    mlpr: { enabled: false, vehicles: 1, kit: 'full', model: 'capex' },

    // Fixed FLPR (camera-based, Bronze/Silver/Gold)
    flprEnabled: false,
    flprTier: null,               // 'bronze'|'silver'|'gold'
    flprOverview: false,
    flpr4G: false,
    flprCameras: 1,
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

  function flprVolumeBand(cameraCount) {
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

    // Fixed FLPR (camera-based, Bronze/Silver/Gold)
    let flpr = null;
    if (state.flprEnabled && state.flprTier) {
      const cameras = Math.max(1, state.flprCameras | 0);
      const band = flprVolumeBand(cameras);
      const monthlyRate = FLPR_PRICING.monthlyPerCamera[state.flprTier][band];
      const addonPerCam = (state.flprOverview ? FLPR_PRICING.camera.overview : 0)
                        + (state.flpr4G ? FLPR_PRICING.camera.embedded4G : 0);

      // Hardware — customer pays Cost+5% ($1,575/cam); MSRP ($1,950/cam) is comparison-only.
      const hwPerCam = FLPR_PRICING.camera.base + addonPerCam;            // customer price
      const hwMsrpPerCam = FLPR_PRICING.camera.msrp + addonPerCam;        // list (add-ons at list too)
      const hwTotal = hwPerCam * cameras;
      const hwMsrpTotal = hwMsrpPerCam * cameras;
      const hwSavings = (FLPR_PRICING.camera.msrp - FLPR_PRICING.camera.base) * cameras;
      const hwSavingsPct = (FLPR_PRICING.camera.msrp - FLPR_PRICING.camera.base)
                           / FLPR_PRICING.camera.msrp * 100;

      // Subscription — prorated to remaining months in fiscal year
      const monthsForYr1 = monthsRemainingInFiscal(state.goLiveMonth);
      const subYr1Gross = monthlyRate * cameras * monthsForYr1;
      const subAnnualGross = monthlyRate * cameras * 12;

      // Sourcewell 10% applies to the SUBSCRIPTION when the SaaS tier is eligible (Small+).
      // Hardware already carries its own MSRP-vs-Customer discount (~19.2%).
      const sourcewellApplies = !!(softwareCalc && softwareCalc.sourcewellApplies);
      const subDiscount = sourcewellApplies ? subYr1Gross * SOURCEWELL_DISCOUNT : 0;
      const subYr1 = subYr1Gross - subDiscount;
      const subAnnualRecurring = sourcewellApplies
        ? subAnnualGross * (1 - SOURCEWELL_DISCOUNT)
        : subAnnualGross;

      const year1Total = hwTotal + subYr1;
      const msrpYear1 = hwMsrpTotal + subYr1Gross;  // list-baseline comparison

      flpr = {
        tier: state.flprTier,
        cameras,
        band,
        monthlyRate,
        hwPerCam,
        hwMsrpPerCam,
        hwTotal,
        hwMsrpTotal,
        hwSavings,
        hwSavingsPct,
        overviewOn: state.flprOverview,
        fourGOn: state.flpr4G,
        monthsForYr1,
        subYr1,
        subYr1Gross,
        subAnnualGross,
        subAnnualRecurring,
        sourcewellApplies,
        subDiscount,
        msrpYear1,
        year1Total,
      };
    }

    // Mobile LPR (vehicle-mounted, legacy — Sourcewell price active, MSRP shown as comparison)
    const mlpr = mlprCalc();

    return {
      devices,
      devicesTotal,
      mlpr,
      flpr,
      year1Total: devicesTotal
                  + (flpr ? flpr.year1Total : 0)
                  + (mlpr ? mlpr.year1 : 0),
      recurring: (flpr ? flpr.subAnnualRecurring : 0)
                 + (mlpr ? mlpr.recurring : 0),
    };
  }

  function mlprCalc() {
    if (!state.mlpr.enabled) return null;
    const v = Math.max(1, state.mlpr.vehicles | 0);
    let kit = state.mlpr.kit;       // 'full' | 'mini'
    const model = state.mlpr.model; // 'capex' | 'haas'
    // Mini Kit is only defined under HaaS — fall back to Full on CapEx
    if (model === 'capex') kit = 'full';

    const sw = MLPR_PRICING.sourcewell;
    const msrp = MLPR_PRICING.msrp;
    let hardware = 0, software = 0, commissioning = 0, monthly = 0, year1 = 0, recurring = 0;
    let msrpYear1 = 0, msrpRecurring = 0;

    if (model === 'capex') {
      const p = sw.capex_full, m = msrp.capex_full;
      hardware = p.hardware * v;
      software = p.software * v;
      commissioning = p.commissioning * v;
      year1 = hardware + software + commissioning;
      recurring = software;          // annual SaaS portion (CapEx)
      msrpYear1 = (m.hardware + m.software + m.commissioning) * v;
      msrpRecurring = m.software * v;
    } else {
      // HaaS — no proration per spec; charge full annual in Year 1
      const p = kit === 'mini' ? sw.haas_mini : sw.haas_full;
      const m = kit === 'mini' ? msrp.haas_mini : msrp.haas_full;
      monthly = p.monthly;
      year1 = p.annual * v;
      recurring = p.annual * v;
      msrpYear1 = m.annual * v;
      msrpRecurring = m.annual * v;
    }

    const savings = msrpYear1 - year1;
    const savingsPct = msrpYear1 > 0 ? (savings / msrpYear1) * 100 : 0;

    return {
      enabled: true,
      vehicles: v,
      kit, model,
      hardware, software, commissioning, monthly,
      year1, recurring,
      msrpYear1, msrpRecurring, savings, savingsPct,
    };
  }

  // ── Slide Navigation ─────────────────────────────
  function goToStep(step) {
    step = clamp(step, 1, 4);
    state.currentStep = step;

    $$('.slide').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });

    // Populate the new slide's contents before snapping so the document's
    // final height is known (matters on slide 4, which is much taller once
    // the review columns are hydrated).
    render();

    snapToDivider(true);  // every slide lands at the top of the cream section
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

    // 4. Update Fixed FLPR tier-card annual subscription (live with bulk band)
    updateFlprTierCards();

    // 5. Update camera-count card description (dynamic with tier+bulk)
    updateCamCardDesc();

    // 5b. Show / hide camera count + add-ons (only if FLPR enabled + tier selected)
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

    // 10. Re-measure sticky summary-card offset so the card stays vertically
    //     centered regardless of how many line items it currently holds.
    updateSummaryCardCentering();
  }

  function updateSummaryCardCentering() {
    // Defer to next frame so the card's post-render layout is committed.
    requestAnimationFrame(() => {
      $$('.calc-right .summary-card').forEach(card => {
        const h = card.offsetHeight;
        if (h > 0) card.style.setProperty('--card-half-h', (h / 2) + 'px');
      });
    });
  }

  function updateFlprTierCards() {
    const band = flprVolumeBand(state.flprCameras);
    Object.keys(FLPR_PRICING.monthlyPerCamera).forEach(tier => {
      const monthly = FLPR_PRICING.monthlyPerCamera[tier][band];
      const annual = monthly * 12;
      const annEl = document.querySelector(`[data-tier-annual="${tier}"]`);
      if (annEl) annEl.textContent = fmtUSD(annual);
    });
  }

  function updateConditionalSections() {
    const visible = !!(state.flprEnabled && state.flprTier);
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
    const hasFLPR = !!hw.flpr;
    const hasMLPR = !!hw.mlpr;

    if (!hasDevices && !hasFLPR && !hasMLPR) {
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
      const mv = hw.mlpr;
      const tierHeader = mv.model === 'capex'
        ? 'CapEx · Full Kit'
        : `HaaS · ${mv.kit === 'mini' ? 'Mini Kit' : 'Full Kit'}`;
      lines.push(`<div class="summary-group-label">Mobile LPR (Survision) &middot; ${tierHeader}</div>`);
      if (mv.model === 'capex') {
        lines.push(
          `<div class="summary-line"><span class="summary-line-label">Vehicle hardware &times; ${mv.vehicles} <span class="summary-line-sub">(one-time)</span></span><span class="summary-line-value">${fmtUSD(mv.hardware)}</span></div>`
        );
        lines.push(
          `<div class="summary-line"><span class="summary-line-label">Software subscription &times; ${mv.vehicles} <span class="summary-line-sub">(annual)</span></span><span class="summary-line-value">${fmtUSD(mv.software)}</span></div>`
        );
        lines.push(
          `<div class="summary-line"><span class="summary-line-label">Commissioning &times; ${mv.vehicles} <span class="summary-line-sub">(one-time)</span></span><span class="summary-line-value">${fmtUSD(mv.commissioning)}</span></div>`
        );
      } else {
        lines.push(
          `<div class="summary-line"><span class="summary-line-label">HaaS &times; ${mv.vehicles} @ ${fmtUSD(mv.monthly)}/mo <span class="summary-line-sub">(annual · all-inclusive)</span></span><span class="summary-line-value">${fmtUSD(mv.year1)}</span></div>`
        );
      }
      lines.push(
        `<div class="summary-line muted"><span class="summary-line-label">MSRP comparison <span class="summary-line-sub">(list · not applied)</span></span><span class="summary-line-value">${fmtUSD(mv.msrpYear1)}</span></div>`
      );
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">Sourcewell savings <span class="summary-line-sub">(${mv.savingsPct.toFixed(1)}% off MSRP)</span></span><span class="summary-line-value">&minus;${fmtUSD(mv.savings)}</span></div>`
      );
    }

    if (hasFLPR) {
      const m = hw.flpr;
      lines.push('<div class="summary-group-label">Fixed FLPR (Survision)</div>');
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
      // Show subscription at its GROSS rate (pre-discount); the 10% is itemised below if eligible
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">${FLPR_TIER_LABELS[m.tier]} subscription <span class="summary-line-sub">${subNote}</span></span><span class="summary-line-value">${fmtUSD(m.subYr1Gross)}</span></div>`
      );
      // MSRP comparison (hardware list baseline)
      lines.push(
        `<div class="summary-line muted"><span class="summary-line-label">MSRP comparison <span class="summary-line-sub">(hardware list · not applied)</span></span><span class="summary-line-value">${fmtUSD(m.hwMsrpTotal)}</span></div>`
      );
      // Hardware MSRP → Sourcewell savings (always applies; baked into customer price)
      lines.push(
        `<div class="summary-line"><span class="summary-line-label">Sourcewell hardware savings <span class="summary-line-sub">(${m.hwSavingsPct.toFixed(1)}% off MSRP)</span></span><span class="summary-line-value">&minus;${fmtUSD(m.hwSavings)}</span></div>`
      );
      // Subscription 10% discount (only when SaaS tier is eligible)
      if (m.sourcewellApplies) {
        lines.push(
          `<div class="summary-line"><span class="summary-line-label">Sourcewell subscription discount <span class="summary-line-sub">(10% off)</span></span><span class="summary-line-value">&minus;${fmtUSD(m.subDiscount)}</span></div>`
        );
      }
    }

    linesEl.innerHTML = lines.join('');
    totalEl.textContent = fmtUSD(hw.year1Total);
    const recurringParts = [];
    if (hasFLPR) recurringParts.push(`Fixed FLPR: ${fmtUSD(hw.flpr.subAnnualRecurring)}/yr`);
    if (hasMLPR) recurringParts.push(`Mobile LPR: ${fmtUSD(hw.mlpr.recurring)}/yr`);
    if (recurringParts.length) {
      recurringEl.style.display = 'block';
      recurringEl.textContent = 'Annual recurring (Year 2+): ' + recurringParts.join('  ·  ');
    } else {
      recurringEl.style.display = 'none';
    }
  }

  function buildHardwareConfigEcho(hw) {
    const parts = [];
    if (hw.devices.some(d => d.count > 0)) parts.push('Enforcement devices');
    if (hw.mlpr) parts.push(`Mobile LPR (${hw.mlpr.model === 'capex' ? 'CapEx' : 'HaaS'})`);
    if (hw.flpr) parts.push(`Fixed FLPR (${FLPR_TIER_LABELS[hw.flpr.tier]})`);
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
      const hwDevicesEl = $('#reviewHwDevices');
      if (hwDevicesEl) {
        const n = hw.devices.reduce((sum, d) => sum + d.count, 0);
        hwDevicesEl.textContent = `${n} ${n === 1 ? 'device' : 'devices'}`;
      }
    }

    // Mobile LPR column (legacy, vehicle-mounted)
    const mlprCol = $('#reviewMlprCol');
    if (mlprCol) mlprCol.style.display = hw.mlpr ? '' : 'none';
    if (hw.mlpr) {
      const mv = hw.mlpr;
      const mlprYr1El = $('#reviewMlprYr1');
      const mlprRecEl = $('#reviewMlprRecurring');
      const mlprSubEl = $('#reviewMlprSub');
      if (mlprYr1El) mlprYr1El.textContent = fmtUSD(mv.year1);
      if (mlprRecEl) mlprRecEl.textContent = fmtUSD(mv.recurring) + '/yr recurring';
      if (mlprSubEl) {
        const tag = mv.model === 'capex'
          ? `Year 1 · CapEx · ${mv.vehicles} ${mv.vehicles === 1 ? 'vehicle' : 'vehicles'}`
          : `Year 1 · HaaS · ${mv.kit === 'mini' ? 'Mini' : 'Full'} · ${mv.vehicles} ${mv.vehicles === 1 ? 'vehicle' : 'vehicles'}`;
        mlprSubEl.textContent = tag;
      }
    }

    // Fixed FLPR column (camera-based)
    const flprCol = $('#reviewFlprCol');
    if (flprCol) flprCol.style.display = hw.flpr ? '' : 'none';
    if (hw.flpr) {
      const flprYr1El = $('#reviewFlprYr1');
      const flprRecEl = $('#reviewFlprRecurring');
      if (flprYr1El) flprYr1El.textContent = fmtUSD(hw.flpr.year1Total);
      if (flprRecEl) flprRecEl.textContent = fmtUSD(hw.flpr.subAnnualRecurring) + '/yr recurring';
    }

    // Subtitle
    if (subtitleEl) {
      const cats = [];
      if (sw) cats.push('Software');
      if (hasDevices) cats.push('Hardware');
      if (hw.mlpr) cats.push('Mobile LPR');
      if (hw.flpr) cats.push('Fixed FLPR');
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
          vehicles: hw.mlpr.vehicles,
          kit: hw.mlpr.kit,
          model: hw.mlpr.model,
          hardware: Math.round(hw.mlpr.hardware || 0),
          software: Math.round(hw.mlpr.software || 0),
          commissioning: Math.round(hw.mlpr.commissioning || 0),
          monthly: hw.mlpr.monthly || 0,
          year1: Math.round(hw.mlpr.year1),
          recurring: Math.round(hw.mlpr.recurring),
          msrp_year1: Math.round(hw.mlpr.msrpYear1),
          sourcewell_savings: Math.round(hw.mlpr.savings),
        } : null,
        flpr: hw.flpr ? {
          tier: hw.flpr.tier,
          cameras: hw.flpr.cameras,
          band: hw.flpr.band,
          overview: hw.flpr.overviewOn,
          embedded4G: hw.flpr.fourGOn,
          hardware_total: Math.round(hw.flpr.hwTotal),
          hardware_msrp_total: Math.round(hw.flpr.hwMsrpTotal),
          hardware_savings: Math.round(hw.flpr.hwSavings),
          subscription_year1_gross: Math.round(hw.flpr.subYr1Gross),
          subscription_year1_net: Math.round(hw.flpr.subYr1),
          sourcewell_subscription_discount: Math.round(hw.flpr.subDiscount),
          year1_total: Math.round(hw.flpr.year1Total),
          annual_recurring: Math.round(hw.flpr.subAnnualRecurring),
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

    let y = 130;

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
      y += 14;

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
        y += 4;
        y = pdfSubheader(doc, M, y, 'Integrations');
        sw.integrationCosts.forEach(ic => {
          if (ic.count > 0) {
            y = pdfLine(doc, pageW, M, y, `Level ${ic.level} integrations × ${ic.count}`, fmtUSD(ic.subtotal), '(annual)');
          }
        });
      }

      // ── Adjustments (un-indented, no subheader) ──
      y += 2;
      if (sw.sourcewellApplies) {
        y = pdfLine(doc, pageW, M, y, 'Sourcewell discount', '-' + fmtUSD(sw.integrationLift * SOURCEWELL_DISCOUNT), '(10% off lift)');
      }
      if (sw.prorationFactor < 1) {
        const prorationAdj = sw.saasFull - sw.proratedSaas;
        y = pdfLine(doc, pageW, M, y, 'Year 1 proration', '-' + fmtUSD(prorationAdj), `(${MONTH_NAMES[state.goLiveMonth]} go-live, ${sw.monthsRemaining} mo)`);
      }
      y = pdfLine(doc, pageW, M, y, 'Installation', fmtUSD(sw.installation), '(one-time)');
      y = pdfSubtotal(doc, pageW, M, y, 'Software Year 1', fmtUSD(sw.year1Total));
      y += 8;
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
      y += 14;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      hw.devices.forEach(d => {
        if (d.count > 0) {
          y = pdfLine(doc, pageW, M, y, `${d.label} × ${d.count}`, fmtUSD(d.subtotal), '(one-time)');
        }
      });
      y = pdfSubtotal(doc, pageW, M, y, 'Devices Total', fmtUSD(hw.devicesTotal));
      y += 8;
    }

    // Section: Mobile LPR (legacy, vehicle-mounted)
    if (hw.mlpr) {
      const mv = hw.mlpr;
      const configTag = mv.model === 'capex'
        ? `CAPEX · FULL KIT · ${mv.vehicles} ${mv.vehicles === 1 ? 'VEHICLE' : 'VEHICLES'}`
        : `HAAS · ${mv.kit === 'mini' ? 'MINI KIT' : 'FULL KIT'} · ${mv.vehicles} ${mv.vehicles === 1 ? 'VEHICLE' : 'VEHICLES'}`;
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setFont('helvetica','bold');
      doc.text(`MOBILE LPR — ${configTag}`, M, y);
      doc.setDrawColor.apply(doc, PDF_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(M, y + 4, pageW - M, y + 4);
      y += 14;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      if (mv.model === 'capex') {
        y = pdfLine(doc, pageW, M, y, `Vehicle hardware × ${mv.vehicles}`, fmtUSD(mv.hardware), '(one-time)');
        y = pdfLine(doc, pageW, M, y, `Software subscription × ${mv.vehicles}`, fmtUSD(mv.software), '(annual)');
        y = pdfLine(doc, pageW, M, y, `Commissioning × ${mv.vehicles}`, fmtUSD(mv.commissioning), '(one-time)');
      } else {
        y = pdfLine(doc, pageW, M, y, `HaaS × ${mv.vehicles} @ ${fmtUSD(mv.monthly)}/mo`, fmtUSD(mv.year1), '(annual · all-inclusive)');
      }
      y = pdfLine(doc, pageW, M, y, 'MSRP comparison', fmtUSD(mv.msrpYear1), '(list · not applied)');
      y = pdfLine(doc, pageW, M, y, 'Sourcewell savings', '-' + fmtUSD(mv.savings), `(${mv.savingsPct.toFixed(1)}% off MSRP)`);
      y = pdfSubtotal(doc, pageW, M, y, 'Mobile LPR Year 1', fmtUSD(mv.year1));
      y += 8;
    }

    // Section: Fixed FLPR
    if (hw.flpr) {
      const m = hw.flpr;
      doc.setFontSize(11);
      doc.setTextColor.apply(doc, PDF_COLORS.darkTeal);
      doc.setFont('helvetica','bold');
      doc.text(`FIXED FLPR — ${FLPR_TIER_LABELS[m.tier].toUpperCase()}`, M, y);
      doc.setDrawColor.apply(doc, PDF_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(M, y + 4, pageW - M, y + 4);
      y += 14;

      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      y = pdfLine(doc, pageW, M, y, `Camera hardware × ${m.cameras}`, fmtUSD(m.hwTotal), '(one-time)');
      if (m.overviewOn) y = pdfLine(doc, pageW, M, y, '  - Overview included', '', '(per camera)');
      if (m.fourGOn)    y = pdfLine(doc, pageW, M, y, '  - Embedded 4G included', '', '(per camera)');
      const subNote = m.monthsForYr1 < 12 ? `(${m.monthsForYr1} mo prorated)` : '(annual)';
      y = pdfLine(doc, pageW, M, y, `${FLPR_TIER_LABELS[m.tier]} subscription`, fmtUSD(m.subYr1Gross), subNote);
      y = pdfLine(doc, pageW, M, y, 'MSRP comparison', fmtUSD(m.hwMsrpTotal), '(hardware list · not applied)');
      y = pdfLine(doc, pageW, M, y, 'Sourcewell hardware savings', '-' + fmtUSD(m.hwSavings), `(${m.hwSavingsPct.toFixed(1)}% off MSRP)`);
      if (m.sourcewellApplies) {
        y = pdfLine(doc, pageW, M, y, 'Sourcewell subscription discount', '-' + fmtUSD(m.subDiscount), '(10% off)');
      }
      y = pdfSubtotal(doc, pageW, M, y, 'Fixed FLPR Year 1', fmtUSD(m.year1Total));
      y += 8;
    }

    // Grand totals — flow naturally right below the last section (no bottom anchor)
    const grandYr1 = (sw ? sw.year1Total : 0) + hw.year1Total;
    const grandRecurring = (sw ? sw.saasFull : 0) + hw.recurring;

    const contentW = pageW - 2 * M;
    const totalsBoxH = 52;
    const totalsBoxY = y;

    // Filled dark-teal totals block
    doc.setFillColor.apply(doc, PDF_COLORS.darkTeal);
    doc.roundedRect(M, totalsBoxY, contentW, totalsBoxH, 8, 8, 'F');

    doc.setFont('helvetica','bold');
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, PDF_COLORS.white);
    doc.text('TOTAL YEAR 1 INVESTMENT', M + 18, totalsBoxY + 19);

    doc.setFontSize(20);
    doc.text(fmtUSD(grandYr1), pageW - M - 18, totalsBoxY + 22, { align: 'right' });

    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 220, 230);
    doc.text('Annual Recurring (Year 2+)', M + 18, totalsBoxY + 38);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.white);
    doc.text(fmtUSD(grandRecurring) + '/yr', pageW - M - 18, totalsBoxY + 40, { align: 'right' });

    y = totalsBoxY + totalsBoxH + 10;

    // Professional Services panel (grey, mirrors old PDF treatment — compact layout)
    const psBoxH = 34;
    doc.setFillColor(240, 240, 242);
    doc.setDrawColor(200, 205, 210);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, contentW, psBoxH, 6, 6, 'FD');

    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, PDF_COLORS.midTeal);
    doc.text('PROFESSIONAL SERVICES', M + 16, y + 10);

    doc.setFontSize(8.5);
    doc.setFont('helvetica','normal');
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    doc.text('Hourly rate', M + 16, y + 20);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text('$215/hr', pageW - M - 16, y + 20, { align: 'right' });

    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, PDF_COLORS.gray);
    const psDesc = doc.splitTextToSize(
      'Custom development and ancillary support billed via Statement of Work (SOW). Contact us for scoping.',
      contentW - 32
    );
    doc.text(psDesc, M + 16, y + 28);

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
    // Label in 9.5pt slate (compact layout)
    doc.setFont('helvetica','normal');
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    doc.text(label, M, y);
    // Optional small grey note appended after the label
    if (note) {
      const labelW = doc.getTextWidth(label);
      doc.setFontSize(7.5);
      doc.setTextColor.apply(doc, PDF_COLORS.gray);
      doc.text(' ' + note, M + labelW, y);
    }
    // Value, right-aligned, dark + bold
    doc.setFontSize(9.5);
    doc.setFont('helvetica','bold');
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(value, pageW - M, y, { align: 'right' });
    doc.setFont('helvetica','normal');
    doc.setTextColor.apply(doc, PDF_COLORS.slate);
    return y + 13;
  }
  function pdfSubtotal(doc, pageW, M, y, label, value) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, pageW - M, y + 2);
    y += 12;
    doc.setFont('helvetica','bold');
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(label, M, y);
    doc.text(value, pageW - M, y, { align: 'right' });
    doc.setFont('helvetica','normal');
    return y + 10;
  }
  // Bold body-size subheader (e.g. "SaaS Subscriptions", "Integrations")
  function pdfSubheader(doc, M, y, label) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(9.5);
    doc.setTextColor.apply(doc, PDF_COLORS.dark);
    doc.text(label, M, y);
    doc.setFont('helvetica','normal');
    return y + 11;
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

    // Fixed FLPR toggle (card click)
    const flprCard = $('#flprCard');
    const flprToggle = $('#flprToggle');
    if (flprCard && flprToggle) {
      flprToggle.addEventListener('click', (e) => {
        if (e.target.closest('input, label, .mlpr-tier-card, .addon-check, .stepper')) return;
        state.flprEnabled = !state.flprEnabled;
        flprCard.classList.toggle('active', state.flprEnabled);
        render();
      });
    }

    // Fixed FLPR tier radios (via label click)
    $$('.mlpr-tier-card').forEach(card => {
      card.addEventListener('click', () => {
        const tier = card.dataset.tier;
        state.flprTier = tier;
        $$('.mlpr-tier-card').forEach(c => c.classList.toggle('selected', c.dataset.tier === tier));
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        if (!state.flprEnabled) {
          state.flprEnabled = true;
          if (flprCard) flprCard.classList.add('active');
        }
        render();
      });
    });

    // Fixed FLPR add-ons
    const addOverview = $('#addonOverview');
    if (addOverview) addOverview.addEventListener('change', () => {
      state.flprOverview = addOverview.checked;
      render();
    });
    const add4G = $('#addon4G');
    if (add4G) add4G.addEventListener('change', () => {
      state.flpr4G = add4G.checked;
      render();
    });

    // ── Mobile LPR (legacy, vehicle-mounted) event wiring ──
    const mlprCardEl = $('#mlprCard');
    const mlprToggleEl = $('#mlprToggle');
    if (mlprCardEl && mlprToggleEl) {
      mlprToggleEl.addEventListener('click', (e) => {
        if (e.target.closest('input, label, .kit-card, [data-mlpr-model], .stepper, [data-mlpr-veh-dir]')) return;
        state.mlpr.enabled = !state.mlpr.enabled;
        mlprCardEl.classList.toggle('active', state.mlpr.enabled);
        render();
      });
    }
    // Kit toggle (Full / Mini). Mini Kit is HaaS-only — picking it force-switches model.
    $$('[data-mlpr-kit]').forEach(card => {
      card.addEventListener('click', () => {
        state.mlpr.kit = card.dataset.mlprKit;
        if (state.mlpr.kit === 'mini' && state.mlpr.model !== 'haas') {
          state.mlpr.model = 'haas';
        }
        syncMlprCardStates();
        if (!state.mlpr.enabled) {
          state.mlpr.enabled = true;
          if (mlprCardEl) mlprCardEl.classList.add('active');
        }
        render();
      });
    });
    // Payment model toggle (CapEx / HaaS). CapEx is disabled while Mini is selected.
    $$('[data-mlpr-model]').forEach(card => {
      card.addEventListener('click', () => {
        // Block CapEx selection when Mini is active
        if (card.dataset.mlprModel === 'capex' && state.mlpr.kit === 'mini') return;
        state.mlpr.model = card.dataset.mlprModel;
        syncMlprCardStates();
        if (!state.mlpr.enabled) {
          state.mlpr.enabled = true;
          if (mlprCardEl) mlprCardEl.classList.add('active');
        }
        render();
      });
    });
    function syncMlprCardStates() {
      $$('[data-mlpr-kit]').forEach(c => c.classList.toggle('selected', c.dataset.mlprKit === state.mlpr.kit));
      $$('[data-mlpr-model]').forEach(c => {
        c.classList.toggle('selected-teal', c.dataset.mlprModel === state.mlpr.model);
        // Visually disable CapEx when Mini is the chosen kit
        const disabled = c.dataset.mlprModel === 'capex' && state.mlpr.kit === 'mini';
        c.classList.toggle('is-disabled', disabled);
        if (disabled) c.title = 'CapEx not available with Mini Kit'; else c.removeAttribute('title');
      });
    }
    // Vehicle count stepper
    $$('[data-mlpr-veh-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.mlprVehDir;
        state.mlpr.vehicles = clamp(state.mlpr.vehicles + (dir === '+' ? 1 : -1), 1, 50);
        const input = $('#mlprVehicles');
        if (input) input.value = state.mlpr.vehicles;
        render();
      });
    });
    const mlprVehInput = $('#mlprVehicles');
    if (mlprVehInput) mlprVehInput.addEventListener('input', () => {
      state.mlpr.vehicles = clamp(Number(mlprVehInput.value) | 0, 1, 50);
      render();
    });

    // Camera count stepper
    $$('[data-cam-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.camDir;
        const next = clamp(state.flprCameras + (dir === '+' ? 1 : -1), 1, 500);
        state.flprCameras = next;
        const input = $('#cameraCount');
        if (input) input.value = next;
        render();
      });
    });
    const camInput = $('#cameraCount');
    if (camInput) camInput.addEventListener('input', () => {
      state.flprCameras = clamp(Number(camInput.value) | 0, 1, 500);
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
      state.mlpr = { enabled: false, vehicles: 1, kit: 'full', model: 'capex' };
      state.goLiveMonth = 7;
      state.integrations = { 1:0, 2:0, 3:0 };
      state.hw = { tablet:0, lprHandheld:0, printer:0 };
      state.flprEnabled = false;
      state.flprTier = null;
      state.flprOverview = false;
      state.flpr4G = false;
      state.flprCameras = 1;
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
      if (flprCard) flprCard.classList.remove('active');
      // Reset legacy Mobile LPR DOM
      if (mlprCardEl) mlprCardEl.classList.remove('active');
      if (mlprVehInput) mlprVehInput.value = 1;
      $$('[data-mlpr-kit]').forEach(c => c.classList.toggle('selected', c.dataset.mlprKit === 'full'));
      $$('[data-mlpr-model]').forEach(c => c.classList.toggle('selected-teal', c.dataset.mlprModel === 'capex'));
      goToStep(1);
    });
  }

  function updateCamCardDesc() {
    const desc = $('#camCardDesc');
    if (!desc) return;
    if (state.flprTier) {
      const band = flprVolumeBand(state.flprCameras);
      const monthly = FLPR_PRICING.monthlyPerCamera[state.flprTier][band];
      desc.textContent = `Camera hardware is $1,575 per unit ($1,950 MSRP) and ${fmtUSD(monthly)}/month.`;
    } else {
      desc.textContent = 'Camera hardware is $1,575 per unit ($1,950 MSRP).';
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
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateSummaryCardCentering, 120);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
