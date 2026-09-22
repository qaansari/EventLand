import { generateTicketQrDataUrl } from './qrGenerator';

/**
 * Premium Utility to export official EventLand PDF E-Tickets.
 * Generates an exact replica of the in-browser rendered digital pass:
 * - Luxury dark midnight palette (#10192d to #1a294a)
 * - Cyan dashed border and VIP verified badges
 * - Event banner, title, venue, show date & time highlight box
 * - Specifications grid (Pass Holder, Tier, Reserved Seats, Total Paid, Booking Time)
 * - Real scannable high-res QR code
 * - Security barcode and verification token
 * 
 * Downloads directly as `${ticketNumber}.pdf` (e.g. EVL-10023.pdf).
 *
 * Supports:
 * 1. Live DOM capture if `sourceElement` is provided (e.g. from DigitalTicketModal).
 * 2. Headless/offscreen render matching the exact card design if called directly (from tables/dashboards).
 */
export async function exportTicketPdf(ticketData = {}, sourceElement = null) {
  // 1. Resolve ticket number and strict filename: ${ticketNumber}.pdf
  const rawNumber = ticketData.ticketId || ticketData.bookingRef || ticketData.bookingNumber || ticketData.bookingId || ticketData.id || 'EVL-TICKET';
  const cleanTicketNumber = String(rawNumber).trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'EVL-TICKET';
  const fileName = `${cleanTicketNumber}.pdf`;

  // Dynamic import of html2canvas and jsPDF (bundled via html2pdf.js)
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf')
  ]);

  let targetElement = sourceElement;
  let createdOffscreenContainer = false;
  let offscreenContainer = null;

  try {
    // If no live DOM element was passed, create an offscreen container that faithfully renders the in-browser pass
    if (!targetElement) {
      createdOffscreenContainer = true;
      offscreenContainer = document.createElement('div');
      offscreenContainer.style.position = 'fixed';
      offscreenContainer.style.top = '0';
      offscreenContainer.style.left = '0';
      offscreenContainer.style.width = '580px';
      offscreenContainer.style.zIndex = '999999';
      offscreenContainer.style.opacity = '1';
      offscreenContainer.style.pointerEvents = 'none';
      offscreenContainer.style.background = '#070c18';
      offscreenContainer.style.padding = '20px';
      offscreenContainer.style.fontFamily = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      // Resolve ticket fields
      const {
        eventTitle = 'EventLand Show Pass',
        banner = '',
        venue = 'Arts Council of Pakistan, Karachi',
        date = 'Saturday, 10th January 2027',
        time = '08:00 PM PKT',
        showTitle = '',
        showDateTime = '',
        attendeeName = 'Pass Holder',
        seats = [],
        totalPaid = 0,
        bookingTime = ''
      } = ticketData;

      const rawBanner = banner || ticketData.eventBanner || ticketData.bannerUrl || '';
      const seatCount = ticketData.seatCount || seats.length || ticketData.quantity || 1;
      const categoryName = ticketData.ticketTierName || ticketData.tierName || ticketData.category || ticketData.ticketTier || 'Standard Pass';
      const rawSeats = seats.map(s => s.label || (typeof s.id === 'string' ? s.id.split('-').pop() : s.id)).join(', ');
      const fullShowDateTime = showDateTime || (date && time ? `${date} at ${time}` : (date || 'Jan 10, 2027 @ 8:00 PM PKT'));
      const bookingDateStr = bookingTime || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      // Generate real QR code
      const qrDataUrl = await generateTicketQrDataUrl({
        ticketId: cleanTicketNumber,
        eventTitle,
        attendeeName,
        bookingRef: cleanTicketNumber
      });

      offscreenContainer.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #10192d 0%, #1a294a 100%);
          border: 2px dashed rgba(13, 148, 136, 0.45);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
          position: relative;
          color: #ffffff;
          box-sizing: border-box;
        ">
          <!-- Ticket Brand Header -->
          <div style="
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          ">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="/logo-icon.png" alt="EventLand Logo" style="width: 32px; height: 32px; object-fit: contain;" />
              <div>
                <span style="font-weight: 900; letter-spacing: -0.02em; font-size: 16px; color: #fff; display: block; line-height: 1;">EVENTLAND PAKISTAN</span>
                <span style="font-size: 11px; color: #2dd4bf;">Official E-Ticket Pass</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; background: rgba(13, 148, 136, 0.25); border: 1px solid #0d9488; color: #2dd4bf; padding: 3px 10px; border-radius: 9999px; font-weight: 800;">
                🎫 TIER: ${categoryName.toUpperCase()}
              </span>
              <span style="font-size: 11px; background: #0d9488; color: #ffffff; padding: 3px 10px; border-radius: 9999px; font-weight: 800;">
                CONFIRMED PASS
              </span>
            </div>
          </div>

          <!-- Event Show Banner Image -->
          ${rawBanner ? `
            <div style="width: 100%; position: relative; background: #070c18; border-bottom: 1px solid rgba(13, 148, 136, 0.2);">
              <img src="${rawBanner}" alt="${eventTitle}" style="width: 100%; height: auto; max-height: 240px; object-fit: cover; display: block;" />
            </div>
          ` : ''}

          <!-- Main Pass Body -->
          <div style="padding: 20px; display: flex; flex-direction: column;">
            <h3 style="font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 6px 0; line-height: 1.2;">
              ${eventTitle}
            </h3>
            <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px 0; font-weight: 600;">
              📍 ${venue}
            </p>

            <!-- Show Schedule Box -->
            <div style="background: rgba(13, 148, 136, 0.12); border: 1px solid rgba(13, 148, 136, 0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="display: block; font-size: 11px; color: #2dd4bf; font-weight: 800; text-transform: uppercase;">📅 SHOW DATE & TIME</span>
                <span style="font-size: 14px; font-weight: 800; color: #fff;">${fullShowDateTime}</span>
              </div>
              <div style="text-align: right;">
                <span style="display: block; font-size: 11px; color: #2dd4bf; font-weight: 800; text-transform: uppercase;">⏰ SHOW SLOT / TIME</span>
                <span style="font-size: 14px; font-weight: 800; color: #2dd4bf;">${showTitle || time || '08:00 PM PKT'}</span>
              </div>
            </div>

            <!-- Grid Specifications -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; background-color: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
              <div>
                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 700;">PASS HOLDER</span>
                <span style="font-size: 14px; font-weight: 800; color: #fff;">${attendeeName}</span>
              </div>
              <div>
                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 700;">🎫 TICKET TIER / CATEGORY</span>
                <span style="font-size: 14px; font-weight: 800; color: #38bdf8;">${categoryName}</span>
              </div>
              <div style="grid-column: span 2;">
                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 700;">RESERVED SEATS & TIER SPECIFICATIONS</span>
                <span style="font-size: 14px; font-weight: 800; color: #2dd4bf;">
                  Tier: <strong>${categoryName}</strong> ${rawSeats ? `• Seats: ${rawSeats}` : ''} (${seatCount} ${seatCount === 1 ? 'Seat Reserved' : 'Seats Reserved'})
                </span>
              </div>
              <div>
                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 700;">TOTAL PAID (PKR)</span>
                <span style="font-size: 14px; font-weight: 800; color: #34d399;">PKR ${Number(totalPaid || 0).toLocaleString()}</span>
              </div>
              <div>
                <span style="display: block; font-size: 11px; color: #94a3b8; font-weight: 700;">🕒 BOOKED AT</span>
                <span style="font-size: 13px; font-weight: 700; color: #cbd5e1;">${bookingDateStr}</span>
              </div>
            </div>

            <!-- Real QR Code Display -->
            <div style="text-align: center; margin: 12px 0 16px 0;">
              <div style="display: inline-block; background-color: #ffffff; padding: 12px; border-radius: 16px; box-shadow: 0 0 20px rgba(13, 148, 136, 0.35);">
                <img src="${qrDataUrl}" alt="Real QR Pass" style="width: 140px; height: 140px; display: block; border-radius: 4px;" />
              </div>
              <span style="display: block; font-size: 12px; color: #2dd4bf; margin-top: 8px; font-weight: 600;">
                ✔ Verified Official Gate Pass • Scan at Entry
              </span>
            </div>

            <!-- Security Barcode & Ticket Number Strip -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(13, 148, 136, 0.3); padding-top: 14px; margin-top: 4px;">
              <div>
                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">SECURITY VERIFICATION REF</div>
                <div style="font-size: 15px; font-weight: 900; color: #2dd4bf; letter-spacing: 1px;">${cleanTicketNumber}</div>
              </div>
              <svg viewBox="0 0 120 36" width="120" height="36">
                <rect x="0" y="0" width="3" height="36" fill="#2dd4bf"/>
                <rect x="5" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="9" y="0" width="5" height="36" fill="#2dd4bf"/>
                <rect x="16" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="20" y="0" width="3" height="36" fill="#2dd4bf"/>
                <rect x="25" y="0" width="6" height="36" fill="#2dd4bf"/>
                <rect x="33" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="37" y="0" width="4" height="36" fill="#2dd4bf"/>
                <rect x="43" y="0" width="5" height="36" fill="#2dd4bf"/>
                <rect x="50" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="54" y="0" width="6" height="36" fill="#2dd4bf"/>
                <rect x="62" y="0" width="3" height="36" fill="#2dd4bf"/>
                <rect x="67" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="71" y="0" width="5" height="36" fill="#2dd4bf"/>
                <rect x="78" y="0" width="3" height="36" fill="#2dd4bf"/>
                <rect x="83" y="0" width="6" height="36" fill="#2dd4bf"/>
                <rect x="91" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="95" y="0" width="4" height="36" fill="#2dd4bf"/>
                <rect x="101" y="0" width="2" height="36" fill="#2dd4bf"/>
                <rect x="105" y="0" width="5" height="36" fill="#2dd4bf"/>
                <rect x="112" y="0" width="3" height="36" fill="#2dd4bf"/>
                <rect x="117" y="0" width="3" height="36" fill="#2dd4bf"/>
              </svg>
            </div>

            <div style="font-size: 10px; color: #64748b; text-align: center; margin-top: 10px; font-weight: 600;">
              EventLand Pakistan • Official Ticketing & Auditorium Platform
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(offscreenContainer);
      targetElement = offscreenContainer;
    }

    // Wait 250ms for images and layout to settle
    await new Promise(resolve => setTimeout(resolve, 250));

    // Capture target element with html2canvas
    const canvas = await html2canvas(targetElement, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#070c18',
      logging: false,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    // Fill luxury midnight background on entire PDF page
    pdf.setFillColor(7, 12, 24); // #070c18
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Margins
    const marginX = 14;
    const marginY = 14;
    const availWidth = pageWidth - (marginX * 2);
    const availHeight = pageHeight - (marginY * 2);

    const scaleX = availWidth / canvas.width;
    const scaleY = availHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);

    const finalWidth = canvas.width * scale;
    const finalHeight = canvas.height * scale;

    // Center on page
    const xOffset = marginX + (availWidth - finalWidth) / 2;
    const yOffset = marginY + (availHeight - finalHeight) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
    pdf.save(fileName);

    return { success: true, fileName, ticketNumber: cleanTicketNumber };
  } finally {
    if (createdOffscreenContainer && offscreenContainer && document.body.contains(offscreenContainer)) {
      document.body.removeChild(offscreenContainer);
    }
  }
}
