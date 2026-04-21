/* ============================================
   SCS Tech Stack Calculator — PDF Generator
   Uses jsPDF (loaded via CDN in HTML)
   ============================================ */

(function () {
  'use strict';

  // Preload Sourcewell logo so it's available synchronously when generate() runs.
  var sourcewellLogo = new Image();
  sourcewellLogo.src = '../assets/sourcewell-logo.png';

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
    proBg: [240, 240, 242],
    proBorder: [200, 205, 210],
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

  // Measured via alpha-scan: within the 102px-tall Sourcewell PNG the letters
  // end at row 95, leaving 6 transparent rows below. This ratio shifts the
  // image down by exactly that padding so letter-bottoms land on the baseline.
  const SOURCEWELL_BOTTOM_PAD_RATIO = 6 / 102;

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
    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = PAGE_W - margin * 2;
    const calc = window.SCSCalc;
    const state = calc.state;
    const sw = calc.calculateSoftware();
    const hw = calc.calculateHardware();
    const fmt = calc.fmt;

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Determine conditional blocks
    const deviceCount = state.hwTablet + state.hwLprHandheld + state.hwPrinter;
    const showHardware = deviceCount > 0 || state.mlprEnabled;
    const showHwRecurring = state.mlprEnabled && hw.mlprRecurring > 0;
    const hwTotal = hw.total + hw.mlprYear1;

    // ── Compute dynamic line height so the whole report fits on one page
    const DEFAULT_LINE_H = 6;
    const SUB_RATIO = 5 / 6;
    const MIN_LINE_H = 4.2;

    const swRegular = sw.lines.filter(l => l.type !== 'subline' && l.type !== 'subitem').length;
    const swIndented = sw.lines.length - swRegular;
    const hwLineCount = showHardware ? hw.lines.length : 0;

    // Fixed vertical overhead (everything except the variable line items):
    // 0..3 rainbow top
    // 18 header baseline
    // 26 date baseline
    // 32 orange accent line
    // 42..70 config box (28mm)
    // 82 software section header baseline (10mm gap after config box + underline)
    // 87 first software line top (after 3mm underline + 4mm gap → y=89 first baseline but we track top)
    // Below the software lines: 12mm totals box + 6mm recurring line = 18mm
    // 10mm gap before hardware section
    // 11mm hardware header + underline
    // 12mm hardware totals box
    // 6mm MLPR recurring line (conditional)
    // 10mm gap before grand total
    // 30mm grand total block
    // 23mm footer + rainbow bottom
    const PREAMBLE_BOTTOM_Y = 87;  // y-coord where first software line begins
    const SW_TOTAL_BLOCK_H = 12 + 6 + 2;  // 12mm box + 6mm recurring line + 2mm gap
    const HW_HEADER_H = showHardware ? 10 + 11 : 0; // section gap + header/underline
    const HW_TOTAL_BLOCK_H = showHardware ? (12 + (showHwRecurring ? 6 : 0) + 2) : 0;
    const GRAND_TOTAL_GAP = 10;
    const GRAND_TOTAL_H = 40;  // taller to fit Annual Recurring below the big amount
    const FOOTER_H = 15;       // two centered lines + bottom rainbow

    const fixedAfterLines = SW_TOTAL_BLOCK_H + HW_HEADER_H + HW_TOTAL_BLOCK_H + GRAND_TOTAL_GAP + GRAND_TOTAL_H + FOOTER_H;
    const availableForLines = PAGE_H - PREAMBLE_BOTTOM_Y - fixedAfterLines;
    const requiredAtDefault = swRegular * DEFAULT_LINE_H + swIndented * DEFAULT_LINE_H * SUB_RATIO + hwLineCount * DEFAULT_LINE_H;

    let scale = 1;
    if (requiredAtDefault > availableForLines) {
      scale = availableForLines / requiredAtDefault;
    }
    const lineH = Math.max(MIN_LINE_H, DEFAULT_LINE_H * scale);
    const subLineH = lineH * SUB_RATIO;

    // ── Render begins
    let y = 0;

    // Rainbow top bar
    drawRainbowBar(doc, 0, 3);
    y = 3;

    // Header
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

    y += 6;
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + 40, y);

    // Configuration box
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

    let configPrefix, sourcewellActive = false;
    if (state.entity === 'campus') {
      const tier = calc.CAMPUS_TIERS[state.campusTier];
      configPrefix = 'Campus  \u00B7  ' + tier.label + ' Tier (' + tier.population + ')';
      if (state.sourcewell && tier.sourcewellDiscount) {
        sourcewellActive = true;
        configPrefix += '  \u00B7  ';
      }
    } else {
      const mods = [];
      if (state.vpermit) mods.push('vPermit');
      if (state.vcompliance) mods.push('vCompliance');
      if (state.vpark) mods.push('vPark');
      configPrefix = 'Municipality  \u00B7  ' + (mods.length ? mods.join('  \u00B7  ') : 'No modules selected');
      if (state.sourcewell) {
        sourcewellActive = true;
        configPrefix += '  \u00B7  ';
      }
    }

    if (sourcewellActive && sourcewellLogo.complete && sourcewellLogo.naturalWidth > 0) {
      const xStart = margin + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      doc.text(configPrefix, xStart, y);
      const prefixWidth = doc.getTextWidth(configPrefix);

      const logoHeight = 3.7; // +0.5mm (≈2px) taller; letter-bottom stays on baseline via SOURCEWELL_BOTTOM_PAD_RATIO
      const logoWidth = logoHeight * (sourcewellLogo.naturalWidth / sourcewellLogo.naturalHeight);
      const logoX = xStart + prefixWidth;
      // Shift down by measured transparent padding so letter-bottoms hit the baseline.
      const logoY = y - logoHeight + logoHeight * SOURCEWELL_BOTTOM_PAD_RATIO;
      doc.addImage(sourcewellLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);

      // " (10% Discount)" in gray, 7pt — small tag following the logo
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.gray);
      doc.text(' (10% Discount)', logoX + logoWidth, y);
    } else {
      doc.text(configPrefix + (sourcewellActive ? 'Sourcewell (10% Discount)' : ''), margin + 8, y);
    }

    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    const hwParts = [];
    if (state.hwTablet > 0) hwParts.push(state.hwTablet + ' Tablet' + (state.hwTablet > 1 ? 's' : ''));
    if (state.hwLprHandheld > 0) hwParts.push(state.hwLprHandheld + ' LPR Device' + (state.hwLprHandheld > 1 ? 's' : ''));
    if (state.hwPrinter > 0) hwParts.push(state.hwPrinter + ' Printer' + (state.hwPrinter > 1 ? 's' : ''));
    if (state.mlprEnabled) hwParts.push(state.vehicles + ' MLPR Vehicle' + (state.vehicles > 1 ? 's' : ''));
    doc.text('Hardware: ' + (hwParts.length ? hwParts.join('  \u00B7  ') : 'None'), margin + 8, y);

    // Software Platform
    y = 82;  // anchored below config box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.darkTeal);
    doc.text('Software Platform', margin, y);

    y += 3;
    doc.setDrawColor(...COLORS.darkTeal);
    doc.setLineWidth(0.5);
    doc.line(margin, y, PAGE_W - margin, y);

    y += 5;  // gap between underline and first line

    // Software line items
    sw.lines.forEach(line => {
      const isSubline = line.type === 'subline';
      const isSubitem = line.type === 'subitem';
      const isIndented = isSubline || isSubitem;
      const rowH = isIndented ? subLineH : lineH;

      y += rowH;  // advance first so y sits on the baseline for this row

      const labelX = margin + 4 + (isIndented ? 6 : 0);
      const labelColor = isIndented ? COLORS.gray : COLORS.slate;
      const amountColor = isIndented ? COLORS.gray : COLORS.dark;
      const amountFont = isIndented ? 'normal' : 'bold';
      const fontSize = isIndented ? 8 : 9;

      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...labelColor);
      const labelText = (isIndented ? '- ' : '') + line.label;
      doc.text(labelText, labelX, y);

      const labelRightEdge = labelX + doc.getTextWidth(labelText);
      if (line.note) {
        doc.setTextColor(...COLORS.gray);
        doc.text(' (' + line.note + ')', labelRightEdge, y);
      }

      doc.setFont('helvetica', amountFont);
      doc.setTextColor(...amountColor);
      let amountText;
      if (line.note === 'transaction-based') {
        amountText = '-';
      } else if (line.amount > 0) {
        amountText = (isSubline ? '-' : '') + fmt(line.amount);
      } else if (line.note && line.note.includes('[NEED FEE]')) {
        amountText = 'TBD';
      } else {
        amountText = '$0';
      }
      doc.text(amountText, PAGE_W - margin - 4, y, { align: 'right' });
    });

    // ── Software totals box (12mm tall, centered content)
    y += 2;
    const swBoxTop = y;
    const swBoxH = 12;
    doc.setFillColor(...COLORS.darkTeal);
    doc.roundedRect(margin, swBoxTop, contentWidth, swBoxH, 3, 3, 'F');

    // Center text vertically in the 12mm box: baseline at top + boxH/2 + capHeight/2
    // For 10pt label, cap-height ≈ 2.5mm → baseline offset from top ≈ 6 + 1.2 = 7.2mm
    const swBoxBaseline = swBoxTop + swBoxH / 2 + 1.3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    const yr1Label = (state.entity === 'campus' && state.goLiveMonth !== 7) ? 'Year 1 Total (Prorated)' : 'Year 1 Total';
    doc.text(yr1Label, margin + 8, swBoxBaseline);
    doc.setFontSize(13);
    doc.text(fmt(sw.year1), PAGE_W - margin - 8, swBoxBaseline, { align: 'right' });

    // Annual Recurring BELOW the box, gray (mirrors MLPR recurring below hardware box)
    y = swBoxTop + swBoxH + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('Annual Recurring (Year 2+): ' + fmt(sw.recurring) + '/yr', margin + 8, y);

    // ── Hardware Breakdown (conditional)
    if (showHardware) {
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.orange);
      doc.text('Hardware & Devices', margin, y);

      y += 3;
      doc.setDrawColor(...COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(margin, y, PAGE_W - margin, y);

      y += 5;
      hw.lines.forEach(line => {
        y += lineH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.slate);
        doc.text(line.label, margin + 4, y);

        if (line.note) {
          doc.setTextColor(...COLORS.gray);
          doc.text(' (' + line.note + ')', margin + 4 + doc.getTextWidth(line.label), y);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(fmt(line.amount), PAGE_W - margin - 4, y, { align: 'right' });
      });

      // Hardware totals box (12mm tall, centered content)
      y += 2;
      const hwBoxTop = y;
      const hwBoxH = 12;
      doc.setFillColor(...COLORS.bg);
      doc.setDrawColor(...COLORS.orange);
      doc.setLineWidth(1);
      doc.roundedRect(margin, hwBoxTop, contentWidth, hwBoxH, 3, 3, 'FD');

      const hwBoxBaseline = hwBoxTop + hwBoxH / 2 + 1.3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.text(state.mlprEnabled ? 'Year 1 Hardware + MLPR' : 'Hardware Total', margin + 8, hwBoxBaseline);
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.orange);
      doc.text(fmt(hwTotal), PAGE_W - margin - 8, hwBoxBaseline, { align: 'right' });

      y = hwBoxTop + hwBoxH + 5;
      if (showHwRecurring) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.gray);
        doc.text('MLPR recurring: ' + fmt(hw.mlprRecurring) + '/yr', margin + 8, y);
      }
    }

    // ── Grand Total — anchored from the bottom so it's always the last item
    const grandTotalDividerY = PAGE_H - FOOTER_H - GRAND_TOTAL_H;
    const totalYr1 = sw.year1 + hw.total + hw.mlprYear1;
    const totalRec = sw.recurring + hw.mlprRecurring;

    doc.setDrawColor(...COLORS.darkTeal);
    doc.setLineWidth(2);
    doc.line(margin, grandTotalDividerY, PAGE_W - margin, grandTotalDividerY);

    // Left column: TOTAL YEAR 1 INVESTMENT label → big amount → italic Annual Recurring
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.slate);
    doc.text('TOTAL YEAR 1 INVESTMENT', margin, grandTotalDividerY + 10);

    doc.setFontSize(24);
    doc.setTextColor(...COLORS.darkTeal);
    doc.text(fmt(totalYr1), margin, grandTotalDividerY + 24);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.slate);
    doc.text('Annual Recurring: ' + fmt(totalRec) + '/yr', margin, grandTotalDividerY + 32);

    // Right column: Professional Services block (gray, similar to estimate boxes).
    // Top aligned with cap-top of "TOTAL YEAR 1 INVESTMENT"; bottom aligned with
    // baseline of the italic Annual Recurring line.
    const psTopY = grandTotalDividerY + 7.2;
    const psBottomY = grandTotalDividerY + 32;
    const psHeight = psBottomY - psTopY;
    const psWidth = 88;
    const psX = PAGE_W - margin - psWidth;
    const psY = psTopY;

    doc.setFillColor(...COLORS.proBg);
    doc.setDrawColor(...COLORS.proBorder);
    doc.setLineWidth(0.5);
    doc.roundedRect(psX, psY, psWidth, psHeight, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.midTeal);
    doc.text('PROFESSIONAL SERVICES', psX + 6, psY + 5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.slate);
    doc.text('Hourly rate', psX + 6, psY + 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('$215/hr', psX + psWidth - 6, psY + 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    const psDesc = doc.splitTextToSize(
      'Custom development and ancillary support billed via Statement of Work (SOW). Contact us for scoping.',
      psWidth - 12
    );
    doc.text(psDesc, psX + 6, psY + 15);

    // ── Footer (two centered lines, no "Confidential")
    const footerY = PAGE_H - 12;
    drawRainbowBar(doc, PAGE_H - 3, 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text('Smarter City Solutions  |  info@smartercity.com  |  smartercity.com', PAGE_W / 2, footerY, { align: 'center' });
    doc.text('Estimate only. Prices subject to change. Contact us for a formal quote.', PAGE_W / 2, footerY + 4, { align: 'center' });

    const filename = 'SCS-Tech-Stack-Estimate-' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(filename);
  }

  window.SCSCalcPDF = { generate: generate };
})();
