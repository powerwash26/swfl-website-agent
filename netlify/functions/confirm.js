const { loadDB, saveDB } = require('./_store');
const { notifyCustomer } = require('./_mailer');

function page(title, message, color) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!doctype html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;">
      <h1 style="color:${color};">${title}</h1><p>${message}</p></body></html>`
  };
}

exports.handler = async (event) => {
  const { id, token } = event.queryStringParameters || {};
  const db = await loadDB();
  const booking = db.bookings.find(b => b.id === id);

  if (!booking || booking.confirmToken !== token) {
    return page('Not found', 'This confirmation link is invalid or has already been used.', '#b1442e');
  }
  if (booking.status === 'confirmed') {
    return page('Already confirmed', `${booking.name}'s ${booking.slot.date} ${booking.slot.time} booking is already confirmed.`, '#1f5c4a');
  }

  booking.status = 'confirmed';
  await saveDB(db);

  try { await notifyCustomer(booking, 'confirmed'); } catch (e) { console.error('notifyCustomer failed', e); }

  return page('Booking confirmed ✓', `${booking.name} — ${booking.slot.date} at ${booking.slot.time} is now confirmed. Customer can be notified directly.`, '#1f5c4a');
};
