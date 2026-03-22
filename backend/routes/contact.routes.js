const express = require("express");
const db = require("../config/db");
const router = express.Router();

/* =========================
   SUBMIT CONTACT FORM
========================= */
router.post("/", (req, res) => {
  const { full_name, email, subject, message } = req.body;

  if (!full_name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const sql = `
    INSERT INTO contact_messages 
    (full_name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [full_name, email, subject, message],
    (err, result) => {
      if (err) {
        console.error("CONTACT INSERT ERROR:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        message: "Message sent successfully",
        id: result.insertId
      });
    }
  );
});

/* =========================
   FETCH ALL MESSAGES (ADMIN)
========================= */
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM contact_messages ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("CONTACT FETCH ERROR:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    }
  );
});

/* =========================
   UPDATE MESSAGE STATUS
========================= */
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  db.query(
    "UPDATE contact_messages SET status = ? WHERE id = ?",
    [status, id],
    (err) => {
      if (err) {
        console.error("CONTACT UPDATE ERROR:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "Status updated" });
    }
  );
});


module.exports = router;
