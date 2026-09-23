const { loadDB } = require('./_store');

exports.handler = async () => {
  const db = await loadDB();
  const out = [];
  for (const [date, slots] of Object.entries(db.capacity)) {
    slots.forEach(s => out.push({ date, time: s.time, taken: s.taken }));
  }
  return { statusCode: 200, body: JSON.stringify({ slots: out }) };
};
