/**
 * Utility to generate and download a clean, high-definition printable PDF of Auditorium Seating Charts.
 * Designed to cover the FULL PAGE of the PDF document with zero wasted white margins.
 * Scalable from small intimate venues (10 seats) to multi-tier arenas (1,100 to 10,000+ seats),
 * guaranteeing that ALL seats are 100% covered with zero clipping.
 * 
 * STRICT MONOCHROME (Pure Black & White RGB):
 * Uses strictly #000000 and #ffffff for high-contrast, professional laser printing.
 */

// Helper to convert 0-indexed row number into Excel-style letter (0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, ...)
function getRowLabel(index) {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

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

  const showNameDisplay = showName || eventTitle || '';
  const rawCapacity = Number(currentZone?.totalCapacity || resolvedBlueprint?.totalSeats || resolvedBlueprint?.totalCapacity || 1100);
  const formattedCapacity = Number(rawCapacity).toLocaleString('en-US');

  // 1. Gather all rows from blueprint sections or rows array
  let allRowsList = [];
  let sectionCount = 0;
  if (resolvedBlueprint?.sections && Array.isArray(resolvedBlueprint.sections)) {
    sectionCount = resolvedBlueprint.sections.length;
    resolvedBlueprint.sections.forEach(sec => {
      if (sec.rows && Array.isArray(sec.rows)) {
        allRowsList.push(...sec.rows);
      }
    });
  } else if (resolvedBlueprint?.rows && Array.isArray(resolvedBlueprint.rows)) {
    allRowsList = [...resolvedBlueprint.rows];
  }

  // Fallback row generation if blueprint has no explicit rows:
  // Dynamically generates a complete layout covering ALL rawCapacity seats (e.g. all 1,100 seats)
  if (allRowsList.length === 0) {
    let numRows = currentZone?.rows;
    let numCols = currentZone?.cols;

    // If rows/cols not specified or too small for rawCapacity (e.g. 1100 seats):
    if (!numRows || !numCols || (numRows * numCols < rawCapacity * 0.75)) {
      if (rawCapacity >= 600) {
        // High-capacity venue (e.g. 1,100 seats):
        // Standard auditorium proportion: ~30 rows, ~37 seats per row
        numCols = Math.min(42, Math.max(28, Math.round(Math.sqrt(rawCapacity * 1.25))));
        numRows = Math.ceil(rawCapacity / numCols);
      } else {
        numRows = Math.max(currentZone?.rows || 11, 11);
        numCols = Math.max(currentZone?.cols || 20, Math.ceil(rawCapacity / numRows));
      }
    }

    let remainingSeats = rawCapacity;
    for (let r = 0; r < numRows; r++) {
      const rowChar = getRowLabel(r);
      const rowSeatCount = Math.min(numCols, Math.max(0, remainingSeats));
      if (rowSeatCount === 0) break;
      remainingSeats -= rowSeatCount;

      // Split rows into realistic blocks (3 blocks for wide auditoriums with 2 aisles)
      if (rowSeatCount >= 24) {
        const sideCount = Math.floor(rowSeatCount * 0.25);
        const centerCount = rowSeatCount - (sideCount * 2);
        const leftSeats = Array.from({ length: sideCount }, (_, i) => i + 1);
        const centerSeats = Array.from({ length: centerCount }, (_, i) => i + sideCount + 1);
        const rightSeats = Array.from({ length: sideCount }, (_, i) => i + sideCount + centerCount + 1);
        allRowsList.push({
          rowChar,
          left: leftSeats,
          center: centerSeats,
          right: rightSeats
        });
      } else {
        const half = Math.floor(rowSeatCount / 2);
        allRowsList.push({
          rowChar,
          left: Array.from({ length: half }, (_, i) => i + 1),
          right: Array.from({ length: rowSeatCount - half }, (_, i) => i + half + 1)
        });
      }
    }
  }

  let totalRowsCount = allRowsList.length;
  let maxColsInAnyRow = 1;
  let maxAislesInAnyRow = 0;

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

  // 2. High-precision dynamic dimension scaling for FULL PAGE COVER
  // Choose orientation: landscape for normal/wide auditoriums, portrait for tall halls
  const isPortrait = totalRowsCount > (maxColsInAnyRow * 1.15);
  const targetAspect = isPortrait ? (210 / 297) : (297 / 210); // 0.707 (Portrait) or 1.414 (Landscape)

  // Canvas coordinate system: expand dynamically if maxColsInAnyRow is wide so seats are crisp & never clip
  const canvasWidth = isPortrait ? 1200 : Math.max(1600, Math.ceil(maxColsInAnyRow * 18 + 200));
  const containerPaddingPx = 18;
  const netWidth = canvasWidth - (containerPaddingPx * 2);

  // Vertical budget for non-grid elements (expanded showMetaHeightPx for spacious handwriting):
  const headerHeightPx = 58;
  const showMetaHeightPx = 68;
  const stageHeightPx = 44;
  const footerHeightPx = 36;
  const sectionHeadersHeightPx = sectionCount > 1 ? sectionCount * 28 : 0;
  const fixedNonGridHeightPx = headerHeightPx + showMetaHeightPx + stageHeightPx + footerHeightPx + sectionHeadersHeightPx + 24;

  // Ideal canvas height matching standard A4 paper aspect ratio:
  const idealCanvasHeight = Math.round(canvasWidth / targetAspect);
  const availGridHeight = idealCanvasHeight - (containerPaddingPx * 2) - fixedNonGridHeightPx;

  // Row label widths and allowances
  const rowLabelWidthPx = maxColsInAnyRow > 80 ? 22 : maxColsInAnyRow > 40 ? 28 : 34;
  const rowLabelsAllowance = (rowLabelWidthPx * 2) + 16;

  // Aisles / Staircases spacing (generously wide corridor to clearly show stairs/aisle passages)
  const estSeatW = (netWidth - rowLabelsAllowance) / (maxColsInAnyRow * 1.25);
  const aisleGapPx = Math.max(maxColsInAnyRow > 80 ? 36 : maxColsInAnyRow > 40 ? 52 : 75, Math.round(estSeatW * 2.5));
  const totalAislesSpace = maxAislesInAnyRow * aisleGapPx;

  // Maximum width available for seat boxes and seat gaps:
  const availWidthForSeatsAndGaps = netWidth - rowLabelsAllowance - totalAislesSpace;

  // Compute seat width and seat gap: balanced seat spacing with prominent stairs separation
  const seatGapRatio = maxColsInAnyRow > 80 ? 0.12 : maxColsInAnyRow > 40 ? 0.16 : 0.20;
  const rawSeatWidth = availWidthForSeatsAndGaps / (maxColsInAnyRow + (maxColsInAnyRow - 1) * seatGapRatio);
  const seatGapPx = Math.max(1.8, Math.round(rawSeatWidth * seatGapRatio * 10) / 10);
  const seatWidthPx = Math.max(3.5, Math.floor((availWidthForSeatsAndGaps - (maxColsInAnyRow - 1) * seatGapPx) / maxColsInAnyRow));

  // Compute seat height and row gap: GUARANTEED to fit within availGridHeight without vertical overflow
  const rawRowHeight = availGridHeight / totalRowsCount;
  const rowGapRatio = totalRowsCount > 40 ? 0.15 : totalRowsCount > 20 ? 0.22 : 0.28;
  const rawSeatHeight = rawRowHeight / (1 + rowGapRatio);
  const rowGapPx = Math.max(2, Math.round(rawSeatHeight * rowGapRatio * 10) / 10);
  const seatHeightPx = Math.max(3.5, Math.floor(rawRowHeight - rowGapPx));

  // Balanced seat dimensions ensuring all seats are covered and look realistic:
  let finalSeatW = seatWidthPx;
  let finalSeatH = seatHeightPx;
  let canvasHeight = idealCanvasHeight;
  let targetFormat = 'a4';

  const seatAspect = finalSeatW / finalSeatH;

  if (seatAspect > 1.4) {
    // Width is significantly larger than row height:
    finalSeatH = Math.min(finalSeatH, Math.round(finalSeatW * 1.15));
    const naturalGridHeight = totalRowsCount * (finalSeatH + rowGapPx) + sectionHeadersHeightPx;
    if (naturalGridHeight + fixedNonGridHeightPx + (containerPaddingPx * 2) < idealCanvasHeight * 0.75) {
      canvasHeight = naturalGridHeight + fixedNonGridHeightPx + (containerPaddingPx * 2);
      targetFormat = 'custom';
    }
  } else if (seatAspect < 0.7) {
    // Many columns relative to rows (e.g. 98 cols, 14 rows):
    // Adjust height to match seat width proportion, NEVER expand width beyond seatWidthPx!
    finalSeatH = Math.max(6, Math.round(finalSeatW * 1.05));
    const dynamicRowGap = Math.max(3, Math.round(finalSeatH * 0.3));
    const naturalGridHeight = totalRowsCount * (finalSeatH + dynamicRowGap) + sectionHeadersHeightPx;
    canvasHeight = naturalGridHeight + fixedNonGridHeightPx + (containerPaddingPx * 2);
    targetFormat = 'custom';
  }

  // Typography and font sizing based on seat dimensions
  const seatFontSizePx = Math.max(3, Math.min(13, Math.round(finalSeatH * 0.44 * 10) / 10));
  const rowLabelFontSizePx = Math.max(6.5, Math.min(13, Math.round(Math.max(finalSeatH * 0.58, 8))));

  const seatWidth = `${finalSeatW}px`;
  const seatHeight = `${finalSeatH}px`;
  const seatFontSize = `${seatFontSizePx}px`;
  const seatGap = `${seatGapPx}px`;
  const aisleGap = `${aisleGapPx}px`;
  const rowGap = `${rowGapPx}px`;
  const rowLabelWidth = `${rowLabelWidthPx}px`;
  const rowLabelFontSize = `${rowLabelFontSizePx}px`;
  const containerWidth = `${canvasWidth}px`;
  const containerHeight = `${canvasHeight}px`;

  // Helper to render individual seat box in strict Black and White (#000000 and #ffffff)
  const renderSeatBox = (rowChar, seatNum, rSpec) => {
    const seatLabel = `${rowChar}${seatNum}`;
    const isDisabled = rSpec?.disabled?.includes(seatNum) || 
                       rSpec?.unavailable?.includes(seatNum) || 
                       resolvedBlueprint?.disabledSeats?.includes(seatLabel) ||
                       resolvedBlueprint?.unavailableSeats?.includes(seatLabel);

    let displayText = `${seatNum}`;
    if (isDisabled) {
      displayText = '✕';
    } else if (finalSeatW < 9 && String(seatNum).length > 2) {
      displayText = ''; // Prevent text overflow in micro-seat tiles
    }

    const borderStyle = isDisabled ? '1px dashed #000000' : (finalSeatW < 7 ? '0.5px solid #000000' : '1.5px solid #000000');
    const bgColor = '#ffffff';
    const textColor = '#000000';
    const borderRadius = Math.max(1, Math.min(3, Math.round(finalSeatW * 0.1))) + 'px';

    return `<div style="min-width: ${seatWidth}; width: ${seatWidth}; height: ${seatHeight}; border: ${borderStyle}; background-color: ${bgColor}; color: ${textColor}; font-size: ${seatFontSize}; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; border-radius: ${borderRadius}; flex-shrink: 0; box-sizing: border-box; line-height: 1; padding: 0; user-select: none;">${displayText}</div>`;
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
      <div style="display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; box-sizing: border-box; white-space: nowrap;">
        <span style="font-size: ${rowLabelFontSize}; font-weight: 900; color: #000000; width: ${rowLabelWidth}; min-width: ${rowLabelWidth}; text-align: right; flex-shrink: 0; user-select: none;">${rowChar}</span>
        <div style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${rowContentHtml}
        </div>
        <span style="font-size: ${rowLabelFontSize}; font-weight: 900; color: #000000; width: ${rowLabelWidth}; min-width: ${rowLabelWidth}; text-align: left; flex-shrink: 0; user-select: none;">${rowChar}</span>
      </div>
    `;
  };

  // Generate complete grid HTML
  let gridHtml;
  if (resolvedBlueprint?.sections && Array.isArray(resolvedBlueprint.sections)) {
    gridHtml = resolvedBlueprint.sections.map(sec => `
      <div style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; flex: 1;">
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 18px; background-color: #000000; border: 1.5px solid #000000; border-radius: 999px; font-size: 10px; font-weight: 900; color: #ffffff; letter-spacing: 0.8px; margin: 4px auto; text-transform: uppercase;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background-color: #ffffff; display: inline-block;"></span>
          ${sec.sectionName}
        </div>
        <div style="display: flex; flex-direction: column; justify-content: space-evenly; width: 100%; flex: 1;">
          ${sec.rows.map(r => renderPrintRow(r)).join('')}
        </div>
      </div>
    `).join('');
  } else {
    gridHtml = allRowsList.map(r => renderPrintRow(r)).join('');
  }

  const innerContentHtml = `
    <!-- Top Header Banner (Strict Monochrome: Black #000000 & White #ffffff) -->
    <div style="width: 100%; box-sizing: border-box; flex-shrink: 0;">
      <div style="background-color: #000000; color: #ffffff; padding: 12px 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
        <div>
          <div style="font-size: 9.5px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3px;">
            OFFICIAL AUDITORIUM SEATING BLUEPRINT
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; line-height: 1.2;">
            ${locationHeader}
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="text-align: right; background-color: #000000; border: 1.5px solid #ffffff; border-radius: 4px; padding: 5px 14px;">
            <div style="font-size: 8.5px; font-weight: 700; color: #ffffff; text-transform: uppercase;">Total Capacity</div>
            <div style="font-size: 15px; font-weight: 900; color: #ffffff;">${formattedCapacity} Seats</div>
          </div>
        </div>
      </div>

      <!-- Spacious Underline Fields for Show Name & Show Date (Generous margin and handwriting clearance) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-top: 28px; margin-bottom: 12px; font-size: 12.5px; font-weight: 900; color: #000000; width: 100%; box-sizing: border-box;">
        <div style="display: flex; align-items: flex-end; gap: 12px; flex: 1.2;">
          <span style="font-size: 12.5px; font-weight: 900; color: #000000; white-space: nowrap;">Show Name:</span>
          <span style="display: inline-block; border-bottom: 2px solid #000000; width: 100%; min-height: 28px; padding-left: 8px; padding-bottom: 4px; font-size: 12.5px; font-weight: 800; color: #000000;">${showNameDisplay || '&nbsp;'}</span>
        </div>
        <div style="display: flex; align-items: flex-end; gap: 12px; flex: 0.8;">
          <span style="font-size: 12.5px; font-weight: 900; color: #000000; white-space: nowrap;">Show Date:</span>
          <span style="display: inline-block; border-bottom: 2px solid #000000; width: 100%; min-height: 28px; padding-left: 8px; padding-bottom: 4px; font-size: 12.5px; font-weight: 800; color: #000000;">${showDate || '&nbsp;'}</span>
        </div>
      </div>
    </div>

    <!-- Stage / Screen Banner (Pure White Box with Crisp 2.5px Black Border) -->
    <div style="margin: 10px auto; width: 50%; max-width: 480px; min-width: 250px; background-color: #ffffff; border: 2.5px solid #000000; border-radius: 4px; padding: 6px 16px; text-align: center; flex-shrink: 0; box-sizing: border-box;">
      <div style="font-size: 11.5px; font-weight: 900; letter-spacing: 4px; color: #000000; text-transform: uppercase;">
        ★ STAGE / SCREEN ★
      </div>
    </div>

    <!-- Auditorium Seating Chart Grid (Full-height expansion, all seats covered) -->
    <div style="text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; flex: 1; box-sizing: border-box; overflow: visible;">
      ${gridHtml}
    </div>

    <!-- Footer with Legend & Authentication (Strict Black and White) -->
    <div style="border-top: 2px solid #000000; padding-top: 7px; margin-top: 6px; width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #000000; font-weight: 700; box-sizing: border-box; flex-shrink: 0;">
      <!-- Legend -->
      <div style="display: flex; gap: 16px; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; width: 14px; height: 14px; border: 1.5px solid #000000; background-color: #ffffff; border-radius: 2px; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; color: #000000;">1</span>
          <span style="font-size: 9.5px; font-weight: 800; color: #000000;">Available Seat</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; width: 14px; height: 14px; border: 1.5px dashed #000000; background-color: #ffffff; border-radius: 2px; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; color: #000000;">✕</span>
          <span style="font-size: 9.5px; font-weight: 800; color: #000000;">Unavailable / Blocked</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; width: 14px; height: 14px; background-color: #000000; border-radius: 2px; align-items: center; justify-content: center; font-size: 7.5px; font-weight: 900; color: #ffffff;">A</span>
          <span style="font-size: 9.5px; font-weight: 800; color: #000000;">Row Letter</span>
        </div>
      </div>

      <!-- Branding & Generation Date -->
      <div style="display: flex; gap: 16px; align-items: center;">
        <span style="color: #000000; font-weight: 800;">EventLand Ticketing System • Seating Blueprint</span>
        <span style="color: #000000; font-weight: 900;">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
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
      size: ${isPortrait ? 'portrait' : 'landscape'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .pdf-container {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: ${containerPaddingPx}px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
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

  // Render high-definition temporary DOM container with pure black & white colors
  const container = document.createElement('div');
  container.className = 'pdf-export-temp-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = containerWidth;
  container.style.height = containerHeight;
  container.style.minWidth = containerWidth;
  container.style.minHeight = containerHeight;
  container.style.maxWidth = containerWidth;
  container.style.maxHeight = containerHeight;
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.padding = `${containerPaddingPx}px`;
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.zIndex = '999999';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.innerHTML = innerContentHtml;
  document.body.appendChild(container);

  const cleanFileName = `${cleanAuditorium.replace(/[^a-zA-Z0-9_-]/g, '_')}_Seating_Chart.pdf`;

  try {
    // Delay to guarantee accurate layout and font rasterization
    await new Promise(resolve => setTimeout(resolve, 120));

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    let pdf;
    let pdfPageW;
    let pdfPageH;

    if (targetFormat === 'a4') {
      pdf = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      pdfPageW = pdf.internal.pageSize.getWidth();
      pdfPageH = pdf.internal.pageSize.getHeight();
    } else {
      const baseMm = isPortrait ? 210 : 297;
      pdfPageW = baseMm;
      pdfPageH = Math.round(baseMm * (canvasHeight / canvasWidth));
      pdf = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfPageW, pdfPageH]
      });
    }

    // High-definition 600 DPI rasterization:
    // Physical page dimension in inches: (pdfPageW / 25.4) [1 inch = 25.4 mm]
    // Target pixel dimension: Math.round((pdfPageW / 25.4) * 600) -> 7,016 px for A4 landscape (297mm)
    const TARGET_DPI = 600;
    const targetPixelWidth = Math.round((pdfPageW / 25.4) * TARGET_DPI);
    const scaleFactor = Math.round((targetPixelWidth / canvasWidth) * 10000) / 10000;

    const canvas = await html2canvas(container, {
      scale: scaleFactor,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      windowWidth: canvasWidth + 50,
      windowHeight: canvasHeight + 50
    });

    if (isCanvasBlank(canvas)) {
      console.warn('[EventLand] Rendered canvas was detected as blank, triggering print fallback.');
      triggerPrintFallback(printDocumentHtml);
      return false;
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Full-page cover with ZERO margins: all seats covered edge-to-edge at true 600 DPI
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageW, pdfPageH, undefined, 'FAST');
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
      { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.05) },
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
        // Detect dark elements (pure black #000000: r=0, g=0, b=0)
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
