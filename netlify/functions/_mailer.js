const nodemailer = require('nodemailer');

function getTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

async function notifyTeam(booking) {
  const siteUrl = process.env.SITE_URL || '';
  const confirmUrl = `${siteUrl}/.netlify/functions/confirm?id=${booking.id}&token=${booking.confirmToken}`;
  const declineUrl = `${siteUrl}/.netlify/functions/decline?id=${booking.id}&token=${booking.confirmToken}`;
  const quoteText = booking.quote
    ? (booking.quote.low === booking.quote.high ? `$${booking.quote.low}` : `$${booking.quote.low}-$${booking.quote.high}`)
    : 'n/a';

  const html = `
    <p><strong>New booking request — needs confirmation</strong></p>
    <p>
      Name: ${booking.name}<br>
      Phone: ${booking.phone}<br>
      Email: ${booking.email}<br>
      Address: ${booking.address}<br>
      Division: ${booking.division}<br>
      Requested: ${booking.slot.date} at ${booking.slot.time}<br>
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

async function notifyCustomer(booking, status) {
  if (!booking.email) return;
  const isConfirmed = status === 'confirmed';
  const html = `
    <p>Dear ${booking.name},</p>
    <p>${isConfirmed
      ? `Thank you for choosing Southwest Florida Clean &amp; Wash Solutions. Your service request for <strong>${booking.slot.date} at ${booking.slot.time}</strong> has been confirmed. Please ensure the property is accessible at the scheduled time.`
      : `We regret that we are unable to accommodate your requested date and time of ${booking.slot.date} at ${booking.slot.time}. Please contact us at your convenience to arrange an alternative.`}</p>
    <p>If you have any questions, please don't hesitate to reach out.</p>
    <p>Sincerely,<br>
    Southwest Florida Clean &amp; Wash Solutions LLC<br>
    239-603-9744<br>
    swflcleanandwash@gmail.com</p>
  `;
  await getTransport().sendMail({
    from: process.env.GMAIL_USER,
    to: booking.email,
    subject: isConfirmed ? 'Your Service Request Has Been Confirmed' : 'Update Regarding Your Service Request',
    html
  });
}

module.exports = { notifyTeam, notifyCustomer };
