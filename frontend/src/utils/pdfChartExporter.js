/**
 * Utility to generate and download a clean, high-definition printable PDF of Auditorium Seating Charts.
 * Lightweight, scalable, pure white background exporter supporting venues from 10 to 10,000+ seats
 * with zero trimming or overflow.
 */
export async function exportAuditoriumChartPdf({
  auditoriumName = 'Main Auditorium',
  venueName = 'Arts Council of Pakistan',
  cityName = 'Karachi',
  countryName = 'Pakistan',
  showName = '',
  showDate = '',
  resolvedBlueprint = null,
  currentZone = null,
  eventTitle = ''
}) {
  // Clean string helper
  const cleanAuditorium = (auditoriumName && !auditoriumName.toLowerCase().includes('undefined')) ? auditoriumName : 'Main Auditorium';
  const cleanVenue = (venueName && !venueName.toLowerCase().includes('undefined')) ? venueName : 'Arts Council of Pakistan';
  const cleanCity = (cityName && !cityName.toLowerCase().includes('undefined')) ? cityName : 'Karachi';
  const cleanCountry = (countryName && !countryName.toLowerCase().includes('undefined')) ? countryName : 'Pakistan';

  // Format location line: [Auditorium Name], [Venue Name], [City], [Country]
  const locationHeader = [cleanAuditorium, cleanVenue, cleanCity, cleanCountry]
    .filter(Boolean)
    .join(', ');

  const showNameDisplay = showName || '';
  const rawCapacity = currentZone?.totalCapacity || resolvedBlueprint?.totalSeats || resolvedBlueprint?.totalCapacity || 1100;
  const formattedCapacity = Number(rawCapacity).toLocaleString('en-US');

  // 1. Gather all rows to accurately compute max columns & aisles across ANY row (handling 10 to 10,000+ seats)
  let allRowsList = [];
  if (resolvedBlueprint?.sections && Array.isArray(resolvedBlueprint.sections)) {
    resolvedBlueprint.sections.forEach(sec => {
      if (sec.rows && Array.isArray(sec.rows)) {
        allRowsList.push(...sec.rows);
      }
    });
  } else if (resolvedBlueprint?.rows && Array.isArray(resolvedBlueprint.rows)) {
    allRowsList = resolvedBlueprint.rows;
  }

  let totalRowsCount = allRowsList.length || currentZone?.rows || 11;
  let maxColsInAnyRow = currentZone?.cols || 20;
  let maxAislesInAnyRow = 1;

  allRowsList.forEach(r => {
    let rowSeatsCount = 0;
    let aislesCount = 0;
    if (r.blocks && Array.isArray(r.blocks)) {
      rowSeatsCount = r.blocks.reduce((sum, blk) => sum + (Array.isArray(blk) ? blk.length : 0), 0);
      aislesCount = Math.max(0, r.blocks.length - 1);
    } else if (r.centerLeft || r.centerRight) {
      const parts = [r.left, r.centerLeft, r.centerRight, r.right].filter(p => p && p.length > 0);
      rowSeatsCount = parts.reduce((sum, p) => sum + p.length, 0);
      aislesCount = Math.max(0, parts.length - 1);
    } else if (r.left || r.center || r.right) {
      const parts = [r.left, r.center, r.right].filter(p => p && p.length > 0);
      rowSeatsCount = parts.reduce((sum, p) => sum + p.length, 0);
      aislesCount = Math.max(0, parts.length - 1);
    } else if (r.seats && Array.isArray(r.seats)) {
      rowSeatsCount = r.seats.length;
      aislesCount = 0;
    } else if (r.cols) {
      rowSeatsCount = r.cols;
      aislesCount = 0;
    }
    if (rowSeatsCount > maxColsInAnyRow) {
      maxColsInAnyRow = rowSeatsCount;
    }
    if (aislesCount > maxAislesInAnyRow) {
      maxAislesInAnyRow = aislesCount;
    }
  });

  // 2. High-precision dynamic dimension scaling based on maxColsInAnyRow and totalRowsCount
  // Calibrated so that charts with 10 to 10,000+ seats fit with 100% visibility and ZERO trimming
  const baseCanvasWidth = 1600;
  const containerPaddingPx = 24;
  const netContainerWidth = baseCanvasWidth - (containerPaddingPx * 2); // 1552px

  const aisleGapPx = maxColsInAnyRow > 150 ? 6 : maxColsInAnyRow > 80 ? 8 : maxColsInAnyRow > 40 ? 11 : 15;
  const seatGapPx = maxColsInAnyRow > 150 ? 0.7 : maxColsInAnyRow > 80 ? 1.1 : maxColsInAnyRow > 40 ? 1.6 : 2.2;
  const rowLabelWidthPx = maxColsInAnyRow > 120 ? 18 : maxColsInAnyRow > 60 ? 24 : 28;
  const rowLabelAllowance = (rowLabelWidthPx * 2) + 16;

  const totalAislesSpace = maxAislesInAnyRow * aisleGapPx;
  const totalSeatGapsSpace = Math.max(0, maxColsInAnyRow - 1) * seatGapPx;

  // Available width strictly for seat boxes:
  const availWidthForSeats = netContainerWidth - rowLabelAllowance - totalAislesSpace - totalSeatGapsSpace;
  const rawSeatSize = availWidthForSeats / maxColsInAnyRow;

  // For extreme column counts (e.g. 300+ columns), if rawSeatSize drops below 3.5px, expand canvas width dynamically
  let containerWidthPx = baseCanvasWidth;
  let seatSizePx = Math.round(rawSeatSize * 10) / 10;

  if (seatSizePx < 3.5) {
    seatSizePx = 3.5;
    const requiredSeatsWidth = (maxColsInAnyRow * seatSizePx) + totalSeatGapsSpace + totalAislesSpace + rowLabelAllowance;
    containerWidthPx = Math.ceil(requiredSeatsWidth + (containerPaddingPx * 2) + 40);
  } else if (seatSizePx > 20) {
    seatSizePx = 20; // Cap maximum seat size for small venues (e.g. 10-20 cols) so it looks elegant
  }

  // Calculate typography and row gaps
  let seatFontSizePx = Math.max(2.8, Math.min(9.5, Math.round(seatSizePx * 0.46 * 10) / 10));
  let rowGapPx = totalRowsCount > 80 ? 1 : totalRowsCount > 40 ? 1.8 : totalRowsCount > 25 ? 2.8 : totalRowsCount > 15 ? 3.5 : 5;
  let rowLabelFontSizePx = Math.max(6.5, Math.min(11, Math.round(Math.max(seatSizePx * 0.7, 7))));

  const seatSize = `${seatSizePx}px`;
  const seatFontSize = `${seatFontSizePx}px`;
  const seatGap = `${seatGapPx}px`;
  const aisleGap = `${aisleGapPx}px`;
  const rowGap = `${rowGapPx}px`;
  const rowLabelWidth = `${rowLabelWidthPx}px`;
  const rowLabelFontSize = `${rowLabelFontSizePx}px`;
  const containerWidth = `${containerWidthPx}px`;

  // Helper to render individual seat box
  const renderSeatBox = (rowChar, seatNum, rSpec) => {
    const seatLabel = `${rowChar}${seatNum}`;
    const isDisabled = rSpec?.disabled?.includes(seatNum) || 
                       rSpec?.unavailable?.includes(seatNum) || 
                       resolvedBlueprint?.disabledSeats?.includes(seatLabel) ||
                       resolvedBlueprint?.unavailableSeats?.includes(seatLabel);

    // Dynamic number rendering based on seat box size
    let displayText = `${seatNum}`;
    if (isDisabled) {
      displayText = 'X';
    } else if (seatSizePx < 5.5 && String(seatNum).length > 2) {
      displayText = ''; // Prevent text overflow in micro-seat tiles for 10,000+ seat venues
    }

    const borderStyle = isDisabled ? '1px dashed #cbd5e1' : (seatSizePx < 6 ? '0.5px solid #334155' : '1px solid #0f172a');
    const bgColor = isDisabled ? '#f1f5f9' : '#ffffff';
    const textColor = isDisabled ? '#94a3b8' : '#0f172a';
    const borderRadius = seatSizePx > 10 ? '2px' : '1px';

    return `<div style="min-width: ${seatSize}; width: ${seatSize}; height: ${seatSize}; border: ${borderStyle}; background-color: ${bgColor}; color: ${textColor}; font-size: ${seatFontSize}; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border-radius: ${borderRadius}; flex-shrink: 0; box-sizing: border-box; line-height: 1; padding: 0; user-select: none;">${displayText}</div>`;
  };

  const renderPrintRow = (rSpec) => {
    const rowChar = rSpec.rowChar;
    let rowContentHtml;

    if (rSpec.blocks && Array.isArray(rSpec.blocks)) {
      rowContentHtml = `<div style="display: inline-flex; gap: ${aisleGap}; align-items: center; justify-content: center; flex-shrink: 0;">` +
        rSpec.blocks.map(blk => `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + blk.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>`).join('') +
        `</div>`;
    } else if (rSpec.centerLeft || rSpec.centerRight) {
      rowContentHtml = `<div style="display: inline-flex; gap: ${aisleGap}; align-items: center; justify-content: center; flex-shrink: 0;">` +
        (rSpec.left ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.left.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.centerLeft ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.centerLeft.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.centerRight ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.centerRight.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.right ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.right.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        `</div>`;
    } else if (rSpec.left || rSpec.center || rSpec.right) {
      rowContentHtml = `<div style="display: inline-flex; gap: ${aisleGap}; align-items: center; justify-content: center; flex-shrink: 0;">` +
        (rSpec.left ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.left.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.center ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.center.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.right ? `<div style="display: inline-flex; gap: ${seatGap}; flex-shrink: 0;">` + rSpec.right.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        `</div>`;
    } else {
      const seatsArr = rSpec.seats || Array.from({ length: rSpec.cols || 20 }, (_, i) => i + 1);
      rowContentHtml = `<div style="display: inline-flex; gap: ${seatGap}; justify-content: center; flex-shrink: 0;">` +
        seatsArr.map(n => renderSeatBox(rowChar, n, rSpec)).join('') +
        `</div>`;
    }

    return `
      <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: ${rowGap}; width: 100%; box-sizing: border-box; white-space: nowrap;">
        <span style="font-size: ${rowLabelFontSize}; font-weight: 900; color: #0f172a; width: ${rowLabelWidth}; min-width: ${rowLabelWidth}; text-align: right; flex-shrink: 0; user-select: none;">${rowChar}</span>
        <div style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${rowContentHtml}
        </div>
        <span style="font-size: ${rowLabelFontSize}; font-weight: 900; color: #0f172a; width: ${rowLabelWidth}; min-width: ${rowLabelWidth}; text-align: left; flex-shrink: 0; user-select: none;">${rowChar}</span>
      </div>
    `;
  };

  // Generate complete grid HTML
  let gridHtml;
  if (resolvedBlueprint?.sections) {
    gridHtml = resolvedBlueprint.sections.map(sec => `
      <div style="margin-bottom: ${totalRowsCount > 40 ? '6px' : '10px'}; text-align: center; width: 100%;">
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 14px; background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 999px; font-size: 10px; font-weight: 900; color: #0f172a; letter-spacing: 0.6px; margin-bottom: 5px; text-transform: uppercase;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background-color: #0f172a; display: inline-block;"></span>
          ${sec.sectionName}
        </div>
        ${sec.rows.map(r => renderPrintRow(r)).join('')}
      </div>
    `).join('');
  } else if (resolvedBlueprint?.rows) {
    gridHtml = resolvedBlueprint.rows.map(r => renderPrintRow(r)).join('');
  } else {
    const numRows = Math.max(currentZone?.rows || 11, 11);
    const numCols = currentZone?.cols || 20;
    let rowsArr = [];
    for (let r = 0; r < numRows; r++) {
      const rowChar = String.fromCharCode(65 + r);
      let seatsArr = [];
      for (let c = 1; c <= numCols; c++) {
        seatsArr.push(c);
      }
      rowsArr.push({ rowChar, seats: seatsArr });
    }
    gridHtml = rowsArr.map(r => renderPrintRow(r)).join('');
  }

  const innerContentHtml = `
    <!-- Header: Main Title is strictly [Audi Name], [Venue Name], [City], [Country] -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
        <div style="font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; line-height: 1.2;">${locationHeader}</div>
        <div style="font-size: 11px; font-weight: 800; color: #1e293b; white-space: nowrap; background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 2px 10px;">
          Capacity: ${formattedCapacity} Seats
        </div>
      </div>

      <!-- Single Clean Underline Fields (Horizontal in Landscape mode) -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-top: 6px; font-size: 11.5px; font-weight: 800; color: #0f172a;">
        <div style="display: flex; align-items: flex-end; gap: 8px; flex: 1.2;">
          <span style="font-size: 11.5px; font-weight: 800; color: #0f172a; white-space: nowrap;">Show Name:</span>
          <span style="display: inline-block; border-bottom: 1.5px solid #0f172a; width: 100%; min-height: 16px; padding-left: 6px; padding-bottom: 2px; font-size: 11.5px; font-weight: 700; color: #0f172a;">${showNameDisplay || '&nbsp;'}</span>
        </div>
        <div style="display: flex; align-items: flex-end; gap: 8px; flex: 0.8;">
          <span style="font-size: 11.5px; font-weight: 800; color: #0f172a; white-space: nowrap;">Show Date:</span>
          <span style="display: inline-block; border-bottom: 1.5px solid #0f172a; width: 100%; min-height: 16px; padding-left: 6px; padding-bottom: 2px; font-size: 11.5px; font-weight: 700; color: #0f172a;">${showDate || '&nbsp;'}</span>
        </div>
      </div>
    </div>

    <!-- Stage Box -->
    <div style="background-color: #ffffff; border: 2px solid #0f172a; border-radius: 4px; padding: 4px 24px; margin: 0 auto ${totalRowsCount > 40 ? '6px' : '8px'}; text-align: center; font-weight: 900; font-size: 11px; letter-spacing: 4px; width: 35%; min-width: 240px; max-width: 440px; color: #0f172a; box-sizing: border-box;">
      STAGE / SCREEN
    </div>

    <!-- Auditorium Seating Chart (No overflow hidden, centered with flex) -->
    <div style="text-align: center; margin-bottom: 6px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      ${gridHtml}
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 5px; margin-top: 6px; width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-weight: 600;">
      <span>Official Auditorium Seating Chart • EventLand Ticketing</span>
      <span>Printed Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
    </div>
  `;

  const printDocumentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${locationHeader}</title>
  <style>
    @page {
      size: landscape;
      margin: 4mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      background-color: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 2px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .pdf-container {
      width: ${containerWidth};
      max-width: 100%;
      margin: 0 auto;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    ${innerContentHtml}
  </div>
  <script>
    setTimeout(function() {
      window.focus();
      window.print();
    }, 350);
  </script>
</body>
</html>
  `;

  // Direct high-definition PDF rendering via html2canvas & jsPDF in Landscape Orientation
  const container = document.createElement('div');
  container.className = 'pdf-export-temp-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = containerWidth;
  container.style.minWidth = containerWidth;
  container.style.maxWidth = containerWidth;
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.padding = `${containerPaddingPx}px`;
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.zIndex = '999999';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';
  container.innerHTML = innerContentHtml;
  document.body.appendChild(container);

  const cleanFileName = `${cleanAuditorium.replace(/[^a-zA-Z0-9_-]/g, '_')}_Seating_Chart.pdf`;

  try {
    // Small delay to allow the browser to complete layout and typography rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const renderedHeight = container.scrollHeight || container.offsetHeight || 1000;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: containerWidthPx,
      height: renderedHeight,
      windowWidth: containerWidthPx + 60,
      windowHeight: renderedHeight + 60
    });

    if (isCanvasBlank(canvas)) {
      console.warn('[EventLand] Rendered canvas was detected as blank, triggering print fallback.');
      triggerPrintFallback(printDocumentHtml);
      return false;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm
    const margin = 5; // 5 mm minimal margin for maximum printable chart area
    const availWidth = pageWidth - (margin * 2); // 287 mm
    const availHeight = pageHeight - (margin * 2); // 200 mm

    // Proportional scale factor so that BOTH width and height fit 100% on the page with zero trimming:
    const scaleX = availWidth / canvas.width;
    const scaleY = availHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);

    const finalWidth = canvas.width * scale;
    const finalHeight = canvas.height * scale;

    // Center perfectly on the landscape paper:
    const xOffset = margin + (availWidth - finalWidth) / 2;
    const yOffset = margin + (availHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
    pdf.save(cleanFileName);
    return true;
  } catch (err) {
    console.warn('[EventLand] Direct PDF generation failed, falling back to print dialog:', err);
    triggerPrintFallback(printDocumentHtml);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function isCanvasBlank(canvas) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return true;
  try {
    const ctx = canvas.getContext('2d');
    // Sample multiple points across top, middle, and bottom to reliably detect non-blank content
    const samplePoints = [
      { x: Math.floor(canvas.width * 0.1), y: Math.floor(canvas.height * 0.05) },
      { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.1) },
      { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.5) },
      { x: Math.floor(canvas.width * 0.2), y: Math.floor(canvas.height * 0.6) },
      { x: Math.floor(canvas.width * 0.8), y: Math.floor(canvas.height * 0.6) }
    ];

    for (const pt of samplePoints) {
      const imgData = ctx.getImageData(pt.x, pt.y, 40, 40);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        // Detect dark elements (text, borders, badges: #0f172a)
        if (a > 50 && (r < 220 || g < 220 || b < 220)) {
          return false;
        }
      }
    }
    return true;
  } catch (e) {
    console.warn('[EventLand] isCanvasBlank check warning:', e);
    return false;
  }
}

function triggerPrintFallback(htmlContent) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        const w = window.open('', '_blank', 'width=1050,height=850');
        if (w) {
          w.document.open();
          w.document.write(htmlContent);
          w.document.close();
        }
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  } catch {
    const w = window.open('', '_blank', 'width=1050,height=850');
    if (w) {
      w.document.open();
      w.document.write(htmlContent);
      w.document.close();
    }
  }
}
