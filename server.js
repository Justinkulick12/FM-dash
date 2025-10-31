// server.js

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const CARDS_FILE = path.join(__dirname, "data", "cards.json");

// Utility: load cards from JSON storage
function loadCards() {
  try {
    const raw = fs.readFileSync(CARDS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Utility: save cards to JSON storage
function saveCards(cards) {
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf8");
}

// This function returns all cards
async function getAllCards() {
  const cards = loadCards();
  return cards;
}

// Initial cards object loaded
let cards = loadCards();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API: get all cards
app.get("/api/cards", async (req, res) => {
  const allCards = await getAllCards();
  res.json({ cards: allCards });
});

// API: update/add a card
app.post("/api/card", (req, res) => {
  const card = req.body.card;
  if (!card || !card.tripId) {
    return res.status(400).json({ error: "Invalid card" });
  }
  cards[card.tripId] = card;
  saveCards(cards);
  return res.json({ success: true });
});

// API: clear completed bucket
app.post("/api/clearCompleted", (req, res) => {
  for (let tid in cards) {
    if (cards[tid].currentBucket === "Bundle Completed") {
      delete cards[tid];
    }
  }
  saveCards(cards);
  res.json({ success: true });
});

// Serve the front‑end
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

