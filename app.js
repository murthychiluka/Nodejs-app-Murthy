const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
app.use(express.json());

// --- DB Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// --- Health Check ---
app.get("/", (req, res) => {
  res.json({ message: "Node.js + MySQL RDS is working!" });
});

// --- CREATE ---
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const [result] = await pool.execute(
      "INSERT INTO tasks (title) VALUES (?)",
      [title]
    );
    res.status(201).json({ id: result.insertId, title, done: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- READ ALL ---
app.get("/tasks", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM tasks");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- READ ONE ---
app.get("/tasks/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM tasks WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE ---
app.put("/tasks/:id", async (req, res) => {
  const { title, done } = req.body;
  try {
    const [result] = await pool.execute(
      "UPDATE tasks SET title = COALESCE(?, title), done = COALESCE(?, done) WHERE id = ?",
      [title, done, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "not found" });
    res.json({ message: "updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DELETE ---
app.delete("/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM tasks WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "not found" });
    res.json({ message: "deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Node.js app running on port ${PORT}`);
});
