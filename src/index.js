const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SCORES_FILE = path.join(__dirname, "scores.json");

app.get("/api/scores", async (req, res) => {
  try {
    const data = await fs.readFile(SCORES_FILE, "utf8");
    const scores = JSON.parse(data)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    res.json(scores);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(SCORES_FILE, JSON.stringify([]));
      res.json([]);
    } else {
      res.status(500).json({ error: "Failed to read scores" });
    }
  }
});

app.post("/api/scores", async (req, res) => {
  const { id, score, timestamp } = req.body;
  if (!id || typeof score !== "number" || score < 0) {
    return res.status(400).json({ error: "Invalid score data" });
  }
  try {
    const data = await fs.readFile(SCORES_FILE, "utf8");
    const scores = JSON.parse(data);
    scores.push({ id, score, timestamp });
    await fs.writeFile(SCORES_FILE, JSON.stringify(scores));
    res.json({ success: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(SCORES_FILE, JSON.stringify([{ id, score, timestamp }]));
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to save score" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
