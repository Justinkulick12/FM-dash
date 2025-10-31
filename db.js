// db.js
const path = require("path");

let db;

function initDb() {
  db = new Database(path.join(__dirname, "bundle.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      tripId TEXT PRIMARY KEY,
      data TEXT
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS archive (
      tripId TEXT PRIMARY KEY,
      data TEXT
    );
  `);
}

function getAllCards() {
  const stmt = db.prepare("SELECT * FROM cards");
  const rows = stmt.all();
  return rows.map(r => JSON.parse(r.data));
}

function upsertCard(card) {
  const stmt = db.prepare("INSERT OR REPLACE INTO cards(tripId, data) VALUES (?, ?)");
  stmt.run(card.tripId, JSON.stringify(card));
}

function deleteCardsByBucket(bucket) {
  const sel = db.prepare("SELECT * FROM cards");
  const all = sel.all();
  const ins = db.prepare("INSERT OR REPLACE INTO archive(tripId, data) VALUES (?, ?)");
  const del = db.prepare("DELETE FROM cards WHERE tripId = ?");
  all.forEach(r => {
    const c = JSON.parse(r.data);
    if (c.currentBucket === bucket) {
      ins.run(c.tripId, r.data);
      del.run(c.tripId);
    }
  });
}

function getArchives() {
  const stmt = db.prepare("SELECT * FROM archive");
  return stmt.all().map(r => JSON.parse(r.data));
}

function restoreArchive(tripId) {
  // move from archive to cards
  const sel = db.prepare("SELECT * FROM archive WHERE tripId = ?");
  const row = sel.get(tripId);
  if (!row) return;
  const ins = db.prepare("INSERT OR REPLACE INTO cards(tripId, data) VALUES (?, ?)");
  ins.run(row.tripId, row.data);
  const del = db.prepare("DELETE FROM archive WHERE tripId = ?");
  del.run(tripId);
}

module.exports = {
  initDb,
  getAllCards,
  upsertCard,
  deleteCardsByBucket,
  getArchives,
  restoreArchive
};
