const nodemailer = require('nodemailer');

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });
}

async function notifyTeam(booking) {
  const siteUrl = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const confirmUrl = `${siteUrl}/api/confirm?id=${booking.id}&token=${booking.confirmToken}`;
  const declineUrl = `${siteUrl}/api/decline?id=${booking.id}&token=${booking.confirmToken}`;
  const quoteText = booking.quote
    ? (booking.quote.low === booking.quote.high ? `$${booking.quote.low}` : `$${booking.quote.low}-$${booking.quote.high}`)
    : 'n/a';

  const html = `
    <p><strong>New booking request — needs confirmation</strong></p>
    <p>
      Name: ${booking.name}<br>Phone: ${booking.phone}<br>Address: ${booking.address}<br>
      Division: ${booking.division}<br>Requested: ${booking.slot.date} at ${booking.slot.time}<br>
      Quote: ${quoteText}
    </p>
    <p>
      <a href="${confirmUrl}" style="background:#1f5c4a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;margin-right:8px;">Confirm</a>
      <a href="${declineUrl}" style="background:#b1442e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Decline / release slot</a>
    </p>
  `;

  await getTransport().sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.OWNER_EMAIL || process.env.GMAIL_USER,
    subject: `New booking request — ${booking.name}, ${booking.slot.date} ${booking.slot.time}`,
    html
  });
}

module.exports = { notifyTeam };
