const { loadDB } = require('./_store');

exports.handler = async (event) => {
  const token = (event.queryStringParameters || {}).token;
  if (token !== process.env.ADMIN_TOKEN) return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  const db = await loadDB();
  return { statusCode: 200, body: JSON.stringify({ bookings: db.bookings.slice().reverse() }) };
};
