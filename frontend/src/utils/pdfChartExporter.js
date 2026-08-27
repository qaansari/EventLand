/**
 * Utility to generate and download a clean, high-definition printable PDF of Auditorium Seating Charts.
 * Lightweight, scalable, zero-dependency, pure white background exporter.
 */
export function exportAuditoriumChartPdf({
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
  // Filter out any 'undefined' strings or empty entries
  const cleanAuditorium = (auditoriumName && !auditoriumName.toLowerCase().includes('undefined')) ? auditoriumName : 'Main Auditorium';
  const cleanVenue = (venueName && !venueName.toLowerCase().includes('undefined')) ? venueName : 'Arts Council of Pakistan';
  const cleanCity = (cityName && !cityName.toLowerCase().includes('undefined')) ? cityName : 'Karachi';
  const cleanCountry = (countryName && !countryName.toLowerCase().includes('undefined')) ? countryName : 'Pakistan';

  // Format location line: [Auditorium Name], [Venue Name], [City], [Country]
  const locationHeader = [cleanAuditorium, cleanVenue, cleanCity, cleanCountry]
    .filter(Boolean)
    .join(', ');

  // Show name placeholder: MUST NOT fall back to Auditorium Name or Event Title
  const showNameDisplay = showName || '';

  // Determine grid density for dynamic scaling to fit all content on 1 single PDF page
  let totalRowsCount = 11;
  if (resolvedBlueprint?.sections) {
    totalRowsCount = resolvedBlueprint.sections.reduce((acc, sec) => acc + (sec.rows?.length || 0), 0);
  } else if (resolvedBlueprint?.rows) {
    totalRowsCount = resolvedBlueprint.rows.length;
  } else if (currentZone?.rows) {
    totalRowsCount = Math.max(currentZone.rows, 11);
  }

  // Dynamic dimension scaling based on total seating rows (ensuring row K and beyond fit)
  const seatSize = totalRowsCount > 18 ? '14px' : totalRowsCount >= 11 ? '16px' : '18px';
  const seatFontSize = totalRowsCount > 18 ? '7px' : totalRowsCount >= 11 ? '7.5px' : '8.5px';
  const rowGap = totalRowsCount > 18 ? '2px' : totalRowsCount >= 11 ? '2.5px' : '3.5px';

  // Helper to render individual seat box
  const renderSeatBox = (rowChar, seatNum, rSpec) => {
    const seatLabel = `${rowChar}${seatNum}`;
    const isDisabled = rSpec?.disabled?.includes(seatNum) || 
                       rSpec?.unavailable?.includes(seatNum) || 
                       resolvedBlueprint?.disabledSeats?.includes(seatLabel) ||
                       resolvedBlueprint?.unavailableSeats?.includes(seatLabel);

    if (isDisabled) {
      return `<div style="min-width: ${seatSize}; height: ${seatSize}; border: 1px dashed #cbd5e1; background-color: #f1f5f9; color: #94a3b8; font-size: ${seatFontSize}; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px; flex-shrink: 0;">X</div>`;
    }

    return `<div style="min-width: ${seatSize}; height: ${seatSize}; border: 1px solid #0f172a; background-color: #ffffff; color: #0f172a; font-size: ${seatFontSize}; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px; flex-shrink: 0;">${seatNum}</div>`;
  };

  const renderPrintRow = (rSpec) => {
    const rowChar = rSpec.rowChar;
    let rowContentHtml = '';

    if (rSpec.blocks && Array.isArray(rSpec.blocks)) {
      rowContentHtml = `<div style="display: flex; gap: 10px; align-items: center; justify-content: center;">` +
        rSpec.blocks.map(blk => `<div style="display: flex; gap: 1.5px;">` + blk.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>`).join('') +
        `</div>`;
    } else if (rSpec.centerLeft || rSpec.centerRight) {
      rowContentHtml = `<div style="display: flex; gap: 10px; align-items: center; justify-content: center;">` +
        (rSpec.left ? `<div style="display: flex; gap: 1.5px;">` + rSpec.left.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.centerLeft ? `<div style="display: flex; gap: 1.5px;">` + rSpec.centerLeft.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.centerRight ? `<div style="display: flex; gap: 1.5px;">` + rSpec.centerRight.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.right ? `<div style="display: flex; gap: 1.5px;">` + rSpec.right.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        `</div>`;
    } else if (rSpec.left || rSpec.center || rSpec.right) {
      rowContentHtml = `<div style="display: flex; gap: 10px; align-items: center; justify-content: center;">` +
        (rSpec.left ? `<div style="display: flex; gap: 1.5px;">` + rSpec.left.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.center ? `<div style="display: flex; gap: 1.5px;">` + rSpec.center.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        (rSpec.right ? `<div style="display: flex; gap: 1.5px;">` + rSpec.right.map(n => renderSeatBox(rowChar, n, rSpec)).join('') + `</div>` : '') +
        `</div>`;
    } else {
      const seatsArr = rSpec.seats || Array.from({ length: rSpec.cols || 20 }, (_, i) => i + 1);
      rowContentHtml = `<div style="display: flex; gap: 1.5px; justify-content: center;">` +
        seatsArr.map(n => renderSeatBox(rowChar, n, rSpec)).join('') +
        `</div>`;
    }

    return `
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: ${rowGap};">
        <span style="font-size: 10px; font-weight: 800; color: #0f172a; width: 18px; text-align: right; flex-shrink: 0;">${rowChar}</span>
        ${rowContentHtml}
        <span style="font-size: 10px; font-weight: 800; color: #0f172a; width: 18px; text-align: left; flex-shrink: 0;">${rowChar}</span>
      </div>
    `;
  };

  // Generate complete grid HTML
  let gridHtml = '';
  if (resolvedBlueprint?.sections) {
    gridHtml = resolvedBlueprint.sections.map(sec => `
      <div style="margin-bottom: 14px; text-align: center;">
        <div style="display: inline-block; padding: 2px 14px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 10px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 6px;">
          ${sec.sectionName.toUpperCase()}
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

  const printDocumentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${locationHeader}</title>
  <style>
    @page {
      size: portrait;
      margin: 8mm;
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
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 10px;
    }
    .pdf-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      page-break-inside: avoid;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .location-main-title {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
      line-height: 1.25;
      margin-bottom: 4px;
    }
    .capacity-badge {
      font-size: 11px;
      font-weight: 800;
      color: #475569;
      white-space: nowrap;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 14px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .field-row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
    }
    .field-label {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      min-width: 85px;
    }
    .line-blank {
      display: inline-block;
      border-bottom: 1.5px solid #0f172a;
      width: 360px;
      min-height: 18px;
      padding-left: 6px;
      padding-bottom: 2px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .stage-element {
      background-color: #ffffff;
      border: 2px solid #0f172a;
      border-radius: 4px;
      padding: 6px 30px;
      margin: 0 auto 16px;
      text-align: center;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 3px;
      max-width: 440px;
      color: #0f172a;
    }
    .chart-wrapper {
      text-align: center;
      margin-bottom: 14px;
      width: 100%;
      overflow: hidden;
    }
    .footer-bar {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    @media print {
      body {
        padding: 0;
      }
      .pdf-container {
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    <!-- Header: Main Title is strictly [Audi Name], [Venue Name], [City], [Country] -->
    <div class="header-box">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div class="location-main-title">${locationHeader}</div>
        <div class="capacity-badge">Capacity: ${currentZone?.totalCapacity || resolvedBlueprint?.totalSeats || '1,085'} Seats</div>
      </div>

      <!-- Single Clean Underline Fields (Zero Double Lines) -->
      <div class="field-group">
        <div class="field-row">
          <span class="field-label">Show Name</span>
          <span class="line-blank">${showNameDisplay || '&nbsp;'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Show Date</span>
          <span class="line-blank">${showDate || '&nbsp;'}</span>
        </div>
      </div>
    </div>

    <!-- Stage Box -->
    <div class="stage-element">
      STAGE / SCREEN
    </div>

    <!-- Auditorium Seating Chart -->
    <div class="chart-wrapper">
      ${gridHtml}
    </div>

    <!-- Footer -->
    <div class="footer-bar">
      <span>Official Auditorium Seating Chart • EventLand Ticketing</span>
      <span>Printed Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=1050,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printDocumentHtml);
    printWindow.document.close();
  }
}
