// server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { initDb, getAllCards, upsertCard, deleteCardsByBucket, getArchives, restoreArchive } = require("./db");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

initDb();

// --- API endpoints ---

app.get("/api/cards", async (req, res) => {
  const cards = await getAllCards();
  res.json({ cards });
});

app.post("/api/card", async (req, res) => {
  const card = req.body.card;
  if (!card || !card.tripId) {
    return res.status(400).json({ error: "card or tripId missing" });
  }
  await upsertCard(card);
  // broadcast to others
  io.emit("card-updated", card);
  res.json({ success: true });
});

app.post("/api/clearCompleted", async (req, res) => {
  await deleteCardsByBucket("Bundle Completed");
  io.emit("clear-completed");
  res.json({ success: true });
});

app.get("/api/archive", async (req, res) => {
  const archived = await getArchives();
  res.json({ archived });
});

app.post("/api/restoreArchive", async (req, res) => {
  const { tripId } = req.body;
  if (!tripId) {
    return res.status(400).json({ error: "tripId missing" });
  }
  await restoreArchive(tripId);
  const card = (await getAllCards()).find(c => c.tripId === tripId);
  io.emit("card-restored", card);
  res.json({ success: true });
});

// fallback to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// WebSocket connections
io.on("connection", socket => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
