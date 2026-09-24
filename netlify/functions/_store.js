const { getStore } = require('@netlify/blobs');

function store() {
  return getStore({
    name: 'swfl-data',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN
  });
}

function nextWeekdays(n) {
  const out = []; let d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function loadDB() {
  const s = store();
  let db = await s.get('db', { type: 'json' });
  if (!db) {
    db = { bookings: [], capacity: {} };
    for (const date of nextWeekdays(5)) {
      db.capacity[date] = [
        { time: '8:00 AM', taken: false },
        { time: '1:00 PM', taken: false }
      ];
    }
    await s.setJSON('db', db);
  }
  return db;
}

async function saveDB(db) {
  const s = store();
  await s.setJSON('db', db);
}

module.exports = { loadDB, saveDB };
