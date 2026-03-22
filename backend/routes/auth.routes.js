const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT user_id, role FROM users WHERE username=? AND password=?",
    [username, password],
    (err, data) => {
      if (data.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({
        user_id: data[0].user_id,
        role: data[0].role
      });
    }
  );
});

module.exports = router;
