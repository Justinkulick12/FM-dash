// server.js

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const CARDS_FILE = path.join(__dirname, "data", "cards.json");

// Load cards from JSON file
function loadCards() {
  try {
    const raw = fs.readFileSync(CARDS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Save cards to JSON file
function saveCards(cards) {
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf8");
}

let cards = loadCards();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Debug log
console.log("✅ Server script loaded.");

// API: get all cards
app.get("/api/cards", (req, res) => {
  res.json({ cards });
});

// API: upload CSV rows
app.post("/api/uploadCsv", (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: "Invalid rows format" });
  }
  console.log("📥 Received CSV rows:", rows.length);
  rows.forEach((row, idx) => {
    const tripId = row["Trip ID"];
    if (!tripId) return;
    // you might mirror your front logic for mapping row → card
    // but simplest: add or update
    const card = {
      tripId: tripId,
      traveler: (row["Traveler"] || "").trim(),
      usaDest: row["USA Dest"] || "",
      itemsAccepted: parseInt(row["Items Accepted"] || "0", 10),
      itemsReadyToProcess: parseInt(row["Items Ready to process"] || "0", 10),
      totalBundleWeight: row["Total Bundle Weight"],
      tripVerificationStatus: row["Trip Verification Status"],
      latamDeparture: row["LATAM Departure"],
      latamArrival: row["LATAM Arrival"],
      shipBundle: row["Ship Bundle"],
      maxUSADate: row["Max USA Date"],
      assignedTo: null,
      currentBucket: "Pending/In Progress", // you may compute this
      manuallyMoved: false,
    };
    cards[tripId] = card;
  });
  saveCards(cards);
  console.log("✅ Cards after CSV merge:", Object.keys(cards).length);
  res.json({ success: true, count: Object.keys(cards).length });
});

// API: update/add a card
app.post("/api/card", (req, res) => {
  const card = req.body.card;
  if (!card || !card.tripId) {
    console.log("❌ Invalid card received:", card);
    return res.status(400).json({ error: "Invalid card" });
  }
  cards[card.tripId] = card;
  saveCards(cards);
  console.log("✅ Card saved:", card.tripId);
  return res.json({ success: true });
});

// API: clear completed bucket
app.post("/api/clearCompleted", (req, res) => {
  Object.keys(cards).forEach((tid) => {
    if (cards[tid].currentBucket === "Bundle Completed") {
      console.log("🧹 Clearing completed card:", tid);
      delete cards[tid];
    }
  });
  saveCards(cards);
  res.json({ success: true });
});

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
