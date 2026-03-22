const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.post("/submit", (req, res) => {
  const { exam_id, set_no, answers } = req.body;

  let score = 0;
  let processed = 0;

  db.query(
    "INSERT INTO attempts (exam_id, set_no, score) VALUES (?, ?, 0)",
    [exam_id, set_no],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create attempt" });
      }

      const attemptId = result.insertId;

      answers.forEach(ans => {
        db.query(
          "SELECT correct_option FROM questions WHERE question_id = ?",
          [ans.question_id],
          (err, q) => {
            if (err) {
              console.error(err);
              return;
            }

            const isCorrect = q[0].correct_option === ans.selected;
            if (isCorrect) score++;

            db.query(
              "INSERT INTO answers (attempt_id, question_id, selected_option, is_correct) VALUES (?,?,?,?)",
              [attemptId, ans.question_id, ans.selected, isCorrect]
            );

            processed++;

            if (processed === answers.length) {
              db.query(
                "UPDATE attempts SET score = ? WHERE attempt_id = ?",
                [score, attemptId],
                () => {
                  res.json({ attempt_id: attemptId, score });
                }
              );
            }
          }
        );
      });
    }
  );
});


// Get result with unanswered questions
router.get("/result/:attemptId", (req, res) => {
  const attemptId = req.params.attemptId;

  const sql = `
    SELECT 
      q.question,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_option,
      q.explanation,
      q.explanation_1,
      q.explanation_2,
      q.explanation_3,
      a.selected_option,
      a.is_correct,
      e.exam_name
    FROM questions q
    LEFT JOIN attempts at ON at.attempt_id = ?
    JOIN exams e ON at.exam_id = e.exam_id
    LEFT JOIN answers a 
      ON q.question_id = a.question_id 
      AND a.attempt_id = ?
    WHERE q.exam_id = at.exam_id
      AND q.set_no = at.set_no
  `;

  db.query(sql, [attemptId, attemptId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Result fetch failed" });
    }
    res.json(results);
  });
});





router.get("/", (req, res) => {
  const sql = `
    SELECT 
      a.attempt_id,
      a.score,
      a.submitted_at,
      e.exam_name,
      'Guest' AS user_name
    FROM attempts a
    JOIN exams e ON a.exam_id = e.exam_id
    ORDER BY a.submitted_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(" ATTEMPTS FETCH ERROR:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(results);
  });
});


module.exports = router;
