/* ============================================
   SCS Tech Stack Calculator — PDF Generator
   Uses jsPDF (loaded via CDN in HTML)
   ============================================ */

(function () {
  'use strict';

  // SCS Brand Colors
  const COLORS = {
    darkTeal: [21, 98, 108],
    midTeal: [44, 116, 128],
    blueTeal: [49, 148, 182],
    sky: [71, 187, 232],
    green: [77, 174, 55],
    greenLight: [136, 191, 87],
    orange: [235, 91, 37],
    amber: [240, 174, 37],
    red: [212, 27, 36],
    dark: [15, 23, 42],
    slate: [71, 85, 105],
    gray: [100, 116, 139],
    white: [255, 255, 255],
    bg: [250, 250, 248],
  };

  // Rainbow bar colors
  const RAINBOW = [
    COLORS.darkTeal,
    COLORS.blueTeal,
    COLORS.green,
    COLORS.greenLight,
    COLORS.amber,
    COLORS.orange,
    COLORS.red,
  ];

  function drawRainbowBar(doc, y, height) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const segWidth = pageWidth / RAINBOW.length;
    RAINBOW.forEach((color, i) => {
      doc.setFillColor(...color);
      doc.rect(i * segWidth, y, segWidth + 0.5, height, 'F');
    });
  }

  function generate() {
    if (!window.jspdf || !window.SCSCalc) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const calc = window.SCSCalc;
    const state = calc.state;
    const sw = calc.calculateSoftware();
    const hw = calc.calculateHardware();
    const fmt = calc.fmt;

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let y = 0;

    // ── Rainbow top bar
    drawRainbowBar(doc, 0, 3);
    y = 3;

    // ── Header
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.darkTeal);
    doc.text('SCS Tech Stack Pricing Estimate', margin, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('Smarter City Solutions  |  ' + today, margin, y);

    // ── Orange accent line
    y += 6;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 40, y);

    // ── Configuration Summary Box
    y += 10;
    doc.setFillColor(...COLORS.bg);
    doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.midTeal);
    doc.text('CONFIGURATION', margin + 8, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);

    let configLine;
    if (state.entity === 'campus') {
      const tier = calc.CAMPUS_TIERS[state.campusTier];
      configLine = 'Campus / University  \u2022  ' + tier.label + ' Tier (' + tier.population + ' students)';
      if (state.sourcewell && tier.sourcewellDiscount) configLine += '  \u2022  Sourcewell 10% Discount';
    } else {
      const mods = [];
      if (state.vpermit) mods.push('vPermit');
      if (state.vcompliance) mods.push('vCompliance');
      if (state.vpark) mods.push('vPark');
      configLine = 'Municipality / Standalone  \u2022  ' + mods.join(' + ');
    }
    doc.text(configLine, margin + 8, y);

    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    const hwParts = [];
    if (state.hwTablet > 0) hwParts.push(state.hwTablet + ' Tablet(s)');
    if (state.hwLprHandheld > 0) hwParts.push(state.hwLprHandheld + ' LPR Device(s)');
    if (state.hwPrinter > 0) hwParts.push(state.hwPrinter + ' Printer(s)');
    if (state.mlprEnabled) hwParts.push(state.vehicles + ' MLPR Vehicle(s)');
    doc.text('Hardware: ' + (hwParts.length ? hwParts.join(', ') : 'None'), margin + 8, y);

    // ── Software Breakdown
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.darkTeal);
    doc.text('Software Platform', margin, y);

    y += 3;
    doc.setDrawColor(...COLORS.darkTeal);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;
    doc.setFontSize(9);
    sw.lines.forEach(line => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.slate);
      doc.text(line.label, margin + 4, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      doc.text('(' + line.note + ')', margin + 4 + doc.getTextWidth(line.label) + 3, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.dark);
      const amountText = line.amount > 0 ? fmt(line.amount) : (line.note.includes('[NEED FEE]') ? 'TBD' : '$0');
      doc.text(amountText, pageWidth - margin - 4, y, { align: 'right' });

      y += 6;
    });

    // Software totals
    y += 2;
    doc.setFillColor(...COLORS.darkTeal);
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, 'F');

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text('Year 1 Total', margin + 8, y);
    doc.setFontSize(14);
    doc.text(fmt(sw.year1), pageWidth - margin - 8, y, { align: 'right' });

    y += 8;
    doc.setFontSize(9);
    doc.text('Annual Recurring (Year 2+): ' + fmt(sw.recurring) + '/yr', margin + 8, y);

    // ── Hardware Breakdown
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.orange);
    doc.text('Hardware & Devices', margin, y);

    y += 3;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 8;
    doc.setFontSize(9);

    if (hw.lines.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      doc.text('No hardware selected', margin + 4, y);
      y += 6;
    } else {
      hw.lines.forEach(line => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.slate);
        doc.text(line.label, margin + 4, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray);
        doc.text('(' + line.note + ')', margin + 4 + doc.getTextWidth(line.label) + 3, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(fmt(line.amount), pageWidth - margin - 4, y, { align: 'right' });

        y += 6;
      });
    }

    // Hardware total
    y += 2;
    const hwTotal = hw.total + hw.mlprYear1;
    doc.setFillColor(...COLORS.bg);
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, 'FD');

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text('Hardware Year 1', margin + 8, y);
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.orange);
    doc.text(fmt(hwTotal), pageWidth - margin - 8, y, { align: 'right' });

    if (state.mlprEnabled && hw.mlprRecurring > 0) {
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      doc.text('MLPR recurring: ' + fmt(hw.mlprRecurring) + '/yr', margin + 8, y);
    }

    // ── Grand Total
    y += 16;
    const totalYr1 = sw.year1 + hw.total + hw.mlprYear1;
    const totalRec = sw.recurring + hw.mlprRecurring;

    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      drawRainbowBar(doc, 0, 2);
      y = 20;
    }

    doc.setDrawColor(...COLORS.darkTeal);
    doc.setLineWidth(2);
    doc.line(margin, y, pageWidth - margin, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.slate);
    doc.text('TOTAL YEAR 1 INVESTMENT', margin, y);

    y += 10;
    doc.setFontSize(24);
    doc.setTextColor(...COLORS.darkTeal);
    doc.text(fmt(totalYr1), margin, y);

    doc.setFontSize(12);
    doc.setTextColor(...COLORS.slate);
    doc.text('Annual Recurring: ' + fmt(totalRec) + '/yr', pageWidth - margin, y, { align: 'right' });

    // ── TCO Projection
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.midTeal);
    doc.text('TOTAL COST OF OWNERSHIP', margin, y);

    y += 8;
    const tcoBoxWidth = (contentWidth - 16) / 3;

    [1, 3, 5].forEach((yr, i) => {
      const x = margin + i * (tcoBoxWidth + 8);
      const swTco = sw.tco[yr] || 0;
      const mlprTco = state.mlprEnabled ? (hw.mlprTco[yr] || 0) : 0;
      const total = swTco + hw.total + mlprTco;
      const isActive = yr === 3;

      if (isActive) {
        doc.setFillColor(...COLORS.darkTeal);
        doc.roundedRect(x, y, tcoBoxWidth, 22, 3, 3, 'F');
        doc.setTextColor(...COLORS.white);
      } else {
        doc.setFillColor(...COLORS.bg);
        doc.roundedRect(x, y, tcoBoxWidth, 22, 3, 3, 'F');
        doc.setTextColor(...COLORS.dark);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(fmt(total), x + tcoBoxWidth / 2, y + 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (isActive) {
        doc.setTextColor(255, 255, 255, 0.7);
      } else {
        doc.setTextColor(...COLORS.gray);
      }
      doc.text(yr + (yr === 1 ? ' Year' : ' Years'), x + tcoBoxWidth / 2, y + 18, { align: 'center' });
    });

    // ── Footer
    y = doc.internal.pageSize.getHeight() - 20;

    // Rainbow bottom bar
    drawRainbowBar(doc, doc.internal.pageSize.getHeight() - 3, 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Smarter City Solutions  |  info@smartercity.com  |  smartercity.com', margin, y);
    doc.text('Estimate only. Prices subject to change. Contact us for a formal quote.', margin, y + 4);

    doc.setTextColor(...COLORS.midTeal);
    doc.text('Confidential', pageWidth - margin, y, { align: 'right' });

    // ── Save
    const filename = 'SCS-Tech-Stack-Estimate-' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(filename);
  }

  window.SCSCalcPDF = { generate: generate };
})();
