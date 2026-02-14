const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');

const DATA_FILE = path.join(__dirname, "data.json");

function readNotes() {
  try {
    if (!fs.existsSync(DATA_FILE))
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeNotes(notes) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

const app = express();
app.use(cors());
app.use(express.json());
// Serve static frontend files from project root so clients can load the app
const staticRoot = path.join(__dirname);
app.use(express.static(staticRoot));

// Fallback to index.html for SPA navigation
app.get('/', (req, res) => res.sendFile(path.join(staticRoot, 'index.html')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  const notes = readNotes();
  socket.emit('counts', { saved: Array.isArray(notes) ? notes.length : 0 });
});

app.get("/api/counts", (req, res) => {
  const notes = readNotes();
  res.json({ saved: Array.isArray(notes) ? notes.length : 0 });
});

app.get("/api/notes", (req, res) => {
  res.json(readNotes());
});

app.post("/api/notes", (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.notes))
    return res.status(400).json({ error: "notes array required" });
  const ok = writeNotes(body.notes);
  if (!ok) return res.status(500).json({ error: "write failed" });
  const saved = Array.isArray(body.notes) ? body.notes.length : 0;
  io.emit('counts', { saved });
  res.json({ saved });
});

app.post("/api/add", (req, res) => {
  const { note } = req.body || {};
  if (typeof note !== "string" || !note.trim())
    return res.status(400).json({ error: "note string required" });
  const notes = readNotes();
  notes.push(note);
  writeNotes(notes);
  const saved = notes.length;
  io.emit('counts', { saved });
  res.json({ saved });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () =>
  console.log(`Notes API listening on http://0.0.0.0:${PORT}`),
);
