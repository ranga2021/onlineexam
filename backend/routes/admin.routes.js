const express = require("express");
const db = require("../config/db");

const router = express.Router();

router.get("/analytics", (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM exams) AS totalExams,
      (SELECT COUNT(*) FROM attempts) AS totalAttempts,
      (SELECT ROUND(AVG(score),2) FROM attempts) AS avgScore,
      (SELECT exam_name FROM exams ORDER BY exam_id DESC LIMIT 1) AS latestExam
  `;

  db.query(sql, (err, summary) => {
    if (err) {
      console.error("SUMMARY ERROR:", err);
      return res.status(500).json(err);
    }

    db.query(
      `SELECT 
        e.exam_id,
        e.exam_name,
        COUNT(a.attempt_id) AS attempts
      FROM exams e
      LEFT JOIN attempts a ON a.exam_id = e.exam_id
      GROUP BY e.exam_id, e.exam_name
      `,
      (err, attemptsPerExam) => {
        if (err) {
          console.error("ATTEMPTS ERROR:", err);
          return res.status(500).json(err);
        }

        db.query(
          `SELECT score, COUNT(*) AS count FROM attempts GROUP BY score`,
          (err, scoreDist) => {
            if (err) {
              console.error("SCORE DIST ERROR:", err);
              return res.status(500).json(err);
            }
            res.json({
              summary: summary[0],
              attemptsPerExam,
              scoreDist
            });
          }
        );
      }
    );
  });
});

module.exports = router;
