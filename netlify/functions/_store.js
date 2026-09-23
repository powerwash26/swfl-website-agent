const { getStore } = require('@netlify/blobs');

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
  const store = getStore('swfl-data');
  let db = await store.get('db', { type: 'json' });
  if (!db) {
    db = { bookings: [], capacity: {} };
    for (const date of nextWeekdays(5)) {
      db.capacity[date] = [
        { time: '8:00 AM', taken: false },
        { time: '1:00 PM', taken: false }
      ];
    }
    await store.setJSON('db', db);
  }
  return db;
}

async function saveDB(db) {
  const store = getStore('swfl-data');
  await store.setJSON('db', db);
}

module.exports = { loadDB, saveDB };
