import { generateTicketQrDataUrl } from './qrGenerator';

/**
 * Premium Utility to generate and download official EventLand PDF E-Tickets.
 * Formatted with EventLand logo, Event Banner image, Show Date & Time, Booking Date & Time,
 * Pass Holder details, Seat numbers, and HD Security QR Code.
 */
export async function exportTicketPdf(ticketData = {}) {
  const {
    ticketId = 'EVL-100001',
    eventTitle = 'Garbar Family (Urdu Comedy Family Theatre Play)',
    banner = '',
    venue = 'Arts Council of Pakistan, Karachi',
    cityName = 'Karachi',
    date = 'Saturday, 10th January 2027',
    time = '08:00 PM PKT',
    showTitle = '',
    showDateTime = '',
    attendeeName = 'Muhammad Ali',
    attendeeEmail = 'ali@example.com',
    phone = '0300 1234567',
    seats = [],
    paymentMethod = 'PAYFAST PAKISTAN',
    paymentStatus = 'Paid',
    totalPaid = 1500,
    bookingTime = ''
  } = ticketData;

  const qrDataUrl = await generateTicketQrDataUrl({ ticketId, eventTitle, attendeeName });
  const seatsText = seats.map(s => s.label || (typeof s.id === 'string' ? s.id.split('-').pop() : s.id)).join(', ') || 'General Admission Pass';
  const showDateStr = date || 'Saturday, 10th January 2027';
  const showTimeStr = time || '08:00 PM PKT';
  const fullShowDateTime = showDateTime || (date && time ? `${date} at ${time}` : `${showDateStr} at ${showTimeStr}`);
  const bookingDateStr = bookingTime || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Default fallback banner if none supplied
  const bannerImgUrl = banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=450&fit=crop';

  const printDocumentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EventLand E-Ticket - ${ticketId}</title>
  <style>
    @page {
      size: A4 portrait;
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
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 12px;
    }
    .ticket-card {
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      page-break-inside: avoid;
      background: #ffffff;
    }
    
    /* EventLand Top Brand Header */
    .brand-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #059669, #0f766e);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      font-size: 18px;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .brand-tagline {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
    }
    .pass-status-pill {
      background-color: #059669;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    /* Event Show Banner Image */
    .banner-container {
      width: 100%;
      position: relative;
      background-color: #0b1329;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .banner-img {
      width: 100%;
      max-height: 250px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .banner-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, transparent 100%);
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .event-title-hero {
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.6);
      line-height: 1.2;
    }

    /* Body Specs & Schedule Grid */
    .body-padding {
      padding: 20px 24px;
    }

    /* Show Schedule Highlight Box */
    .schedule-highlight-box {
      background: #eff6ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .schedule-item {
      display: flex;
      flex-direction: column;
    }
    .schedule-label {
      font-size: 10px;
      font-weight: 800;
      color: #059669;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .schedule-value {
      font-size: 15px;
      font-weight: 900;
      color: #1e3a8a;
    }

    /* Specs 2-Column Grid */
    .specs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .spec-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .spec-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .spec-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    /* QR Code & Entry Token Box */
    .qr-entry-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #ffffff;
      border: 2px dashed #0f172a;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 18px;
    }
    .qr-graphic-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .qr-border {
      padding: 8px;
      border: 2px solid #0f172a;
      border-radius: 10px;
      background: #ffffff;
    }
    .ticket-ref-text {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1px;
    }
    .barcode-svg {
      height: 40px;
      opacity: 0.85;
    }

    /* Footer Meta Note */
    .footer-bar {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
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
      .ticket-card {
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    
    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-title-wrap">
        <img src="${window.location.origin}/logo-icon.png" alt="EventLand Icon" style="height: 38px; width: auto; object-fit: contain; filter: drop-shadow(0 0 8px rgba(13, 148, 136, 0.5));" />
        <div>
          <div class="brand-name" style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; display: flex; alignItems: center; gap: 4px;">
            EVENT<span style="color: #10b981;">LAND</span> <span style="font-size: 11px; color: #99f6e4; font-weight: 800; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">PAKISTAN</span>
          </div>
          <div class="brand-tagline">Official Digital Event E-Ticket Pass</div>
        </div>
      </div>
      <div class="pass-status-pill" style="background-color: #0d9488;">OFFICIAL PASS • CONFIRMED</div>
    </div>

    <!-- Show Banner Image Section -->
    <div class="banner-container">
      <img src="${bannerImgUrl}" alt="${eventTitle}" class="banner-img" />
      <div class="banner-overlay">
        <div class="event-title-hero">${eventTitle}</div>
      </div>
    </div>

    <!-- Body Content -->
    <div class="body-padding">

      <!-- Prominent Show Date & Time Schedule Box -->
      <div class="schedule-highlight-box">
        <div class="schedule-item">
          <span class="schedule-label">📅 SHOW DATE & TIME</span>
          <span class="schedule-value">${fullShowDateTime}</span>
        </div>
        <div class="schedule-item" style="text-align: right;">
          <span class="schedule-label">⏰ SHOW TIME / SLOT</span>
          <span class="schedule-value">${showTitle || showTimeStr}</span>
        </div>
      </div>

      <!-- Specifications Grid -->
      <div class="specs-grid">
        <div class="spec-card">
          <span class="spec-label">PASS HOLDER</span>
          <span class="spec-val">${attendeeName}</span>
        </div>
        <div class="spec-card">
          <span class="spec-label">📅 SHOW DATE & TIME</span>
          <span class="spec-val" style="color: #059669;">${fullShowDateTime}</span>
        </div>
        <div class="spec-card">
          <span class="spec-label">VENUE LOCATION</span>
          <span class="spec-val">📍 ${venue}</span>
        </div>
        <div class="spec-card">
          <span class="spec-label">RESERVED SEATS / TIERS</span>
          <span class="spec-val" style="color: #059669;">${seatsText}</span>
        </div>
        <div class="spec-card">
          <span class="spec-label">TOTAL PAID (PKR)</span>
          <span class="spec-val" style="color: #059669;">PKR ${totalPaid.toLocaleString()}</span>
        </div>
        <div class="spec-card">
          <span class="spec-label">PAYMENT METHOD</span>
          <span class="spec-val">${paymentMethod}</span>
        </div>
        <div class="spec-card" style="grid-column: span 2;">
          <span class="spec-label">🕒 BOOKING DATE & TIME</span>
          <span class="spec-val">${bookingDateStr}</span>
        </div>
      </div>

      <!-- HD QR Code & Barcode Entry Token -->
      <div class="qr-entry-box">
        <div class="qr-graphic-wrap">
          <div class="qr-border">
            <img src="${qrDataUrl}" alt="Real QR Code Pass" style="width: 100px; height: 100px; display: block; object-fit: contain; border-radius: 4px;" />
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">SCAN FOR ENTRY</div>
            <div class="ticket-ref-text">${ticketId}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Encrypted Gatekeeper Verification Pass</div>
          </div>
        </div>

        <!-- Visual Gate Barcode -->
        <div style="text-align: right;">
          <svg class="barcode-svg" viewBox="0 0 120 40" width="110">
            <rect x="0" y="0" width="4" height="40" fill="#0f172a"/>
            <rect x="6" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="10" y="0" width="6" height="40" fill="#0f172a"/>
            <rect x="18" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="22" y="0" width="4" height="40" fill="#0f172a"/>
            <rect x="28" y="0" width="8" height="40" fill="#0f172a"/>
            <rect x="38" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="42" y="0" width="4" height="40" fill="#0f172a"/>
            <rect x="48" y="0" width="6" height="40" fill="#0f172a"/>
            <rect x="56" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="60" y="0" width="8" height="40" fill="#0f172a"/>
            <rect x="70" y="0" width="4" height="40" fill="#0f172a"/>
            <rect x="76" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="80" y="0" width="6" height="40" fill="#0f172a"/>
            <rect x="88" y="0" width="4" height="40" fill="#0f172a"/>
            <rect x="94" y="0" width="8" height="40" fill="#0f172a"/>
            <rect x="104" y="0" width="2" height="40" fill="#0f172a"/>
            <rect x="108" y="0" width="4" height="40" fill="#0f172a"/>
          </svg>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="footer-bar">
        <span>EventLand Pakistan • Official Ticketing & Auditorium Platform</span>
        <span>Issued: ${bookingDateStr}</span>
      </div>

    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printDocumentHtml);
    printWindow.document.close();
  }
}
