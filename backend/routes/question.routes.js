const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const db = require("../config/db");

const router = express.Router();

const upload = multer({
  dest: "backend/uploads/"
});


/* =========================
   FETCH EXAM SETS SUMMARY
========================= */
router.get("/sets/:examId", (req, res) => {
  const query = `
    SELECT 
      q.set_no, 
      e.exam_name, 
      e.duration, 
      e.category, 
      COUNT(q.question_id) AS question_count
    FROM questions q
    JOIN exams e ON q.exam_id = e.exam_id
    WHERE q.exam_id = ?
    GROUP BY q.set_no, e.exam_name, e.duration, e.category
    ORDER BY q.set_no ASC
  `;

  db.query(query, [req.params.examId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

/* =========================
    FETCH QUESTIONS (WITH SET FILTER)
========================= */
router.get("/:examId", (req, res) => {
  const examId = req.params.examId;
  const setNo = req.query.setNo;

  let query = `
    SELECT question_id, question, option_a, option_b, option_c, option_d, 
           correct_option, explanation, explanation_1, explanation_2, explanation_3 
    FROM questions 
    WHERE exam_id = ?
  `;

  let params = [examId];

  if (setNo && !isNaN(setNo)) {
    query += " AND set_no = ?";
    params.push(setNo);
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

module.exports = router;