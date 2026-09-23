const crypto = require('crypto');
const { loadDB, saveDB } = require('./_store');
const { REQUIRED_DOCS } = require('../../pricing');
const { notifyTeam } = require('./_mailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const { name, phone, address, division, slot, quote } = JSON.parse(event.body || '{}');
  if (!name || !phone || !address || !slot) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing_fields' }) };
  }

  const db = await loadDB();
  const daySlots = db.capacity[slot.date];
  const match = daySlots && daySlots.find(s => s.time === slot.time);
  if (!match || match.taken) {
    return { statusCode: 409, body: JSON.stringify({ error: 'slot_unavailable' }) };
  }
  match.taken = true; // held pending confirmation

  const booking = {
    id: 'b_' + Date.now(),
    name, phone, address, division, slot, quote,
    status: 'pending',
    confirmToken: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString()
  };
  db.bookings.push(booking);
  await saveDB(db);

  const documents = REQUIRED_DOCS[division] || REQUIRED_DOCS.default;

  try {
    await notifyTeam(booking);
  } catch (e) {
    console.error('notifyTeam failed', e); // booking still succeeds even if email fails
  }

  return { statusCode: 200, body: JSON.stringify({ booking, documents }) };
};
