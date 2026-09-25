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
    return page('Not found', 'This link is invalid or has already been used.', '#b1442e');
  }
  if (booking.status === 'declined') {
    return page('Already declined', `${booking.name}'s request was already declined and the slot released.`, '#b1442e');
  }

  booking.status = 'declined';
  const daySlots = db.capacity[booking.slot.date];
  const match = daySlots && daySlots.find(s => s.time === booking.slot.time);
  if (match) match.taken = false; // release the slot back for others to book

  await saveDB(db);

  try { await notifyCustomer(booking, 'declined'); } catch (e) { console.error('notifyCustomer failed', e); }

  return page('Dec
