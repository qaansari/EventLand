import QRCode from 'qrcode';

/**
 * Generates a real, high-resolution base64 PNG QR Code data URL for an E-Ticket.
 * Encodes complete ticket metadata (Pass ID, Event Title, Attendee Name, Verification URL).
 * 100% scannable by any camera phone or QR Scanner app.
 */
export async function generateTicketQrDataUrl(ticket) {
  if (!ticket) return '';

  const ticketId = ticket.ticketId || ticket.id || 'EVL-100001';
  const eventTitle = ticket.eventTitle || ticket.title || 'EventLand Pass';
  const attendee = ticket.attendeeName || ticket.customerName || 'Pass Holder';
  const verifyUrl = `https://ticketwala.pk/verify/${ticketId}`;

  const payload = `EVENTLAND TICKET PASS\nID: ${ticketId}\nEVENT: ${eventTitle}\nATTENDEE: ${attendee}\nVERIFY: ${verifyUrl}`;

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 1,
      color: {
        dark: '#07131b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate real QR Code data URL:', err);
    return '';
  }
}
