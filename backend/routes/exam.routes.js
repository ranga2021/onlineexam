const express = require("express");
const db = require("../config/db");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = multer({ dest: path.join(__dirname, "../uploads") });
const mammoth = require("mammoth");

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}


router.post("/", (req, res) => {
  const { exam_name, duration } = req.body;

  db.query(
    "INSERT INTO exams (exam_name, duration) VALUES (?,?)",
    [exam_name, duration],
    () => res.send({ message: "Exam created" })
  );

});



router.get("/", (req, res) => {
  const { category, difficulty } = req.query;

  let sql = `

    SELECT

      e.exam_id,

      e.exam_name,

      e.duration,

      e.category,

      e.difficulty,

      e.back_link,

      COUNT(q.question_id) AS question_count

    FROM exams e

    LEFT JOIN questions q ON e.exam_id = q.exam_id

    WHERE 1=1

  `;

  const params = [];

  if (category) {
    sql += " AND e.category = ?";
    params.push(category);

  }

  if (difficulty) {
    sql += " AND e.difficulty = ?";
    params.push(difficulty);

  }

  sql += " GROUP BY e.exam_id";


  db.query(sql, params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(data);

  });

});



function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/–|—/g, "-")
    .replace(/\n{2,}/g, "\n")
    .trim();
}


function splitQuestions(text) {
  // Splits by "1. ", "2. ", etc. at the start of a section
  return text
    .split(/(?:^|\n)\s*\d+\.\s+/)
    .map(q => q.trim())
    .filter(q => q.length > 10);
}


router.post(
  "/schedule",
  upload.fields([
    { name: "fileSet1", maxCount: 1 },
    { name: "fileSet2", maxCount: 1 },
    { name: "fileSet3", maxCount: 1 },
    { name: "fileSet4", maxCount: 1 },
    { name: "fileSet5", maxCount: 1 }
  ]),
  async (req, res) => {

    const { exam_name, duration, category, difficulty, back_link } = req.body;

    const files = [
      req.files?.fileSet1?.[0],
      req.files?.fileSet2?.[0],
      req.files?.fileSet3?.[0],
      req.files?.fileSet4?.[0],
      req.files?.fileSet5?.[0]
    ];

    if (files.some(f => !f)) {
      return res.status(400).json({ error: "All 5 files are required" });
    }

    db.getConnection(async (connErr, connection) => {
      if (connErr) {
        console.error("Connection error:", connErr);
        return res.status(500).json({ error: "Database connection failed" });
      }

      try {
        // Start transaction
        await new Promise((resolve, reject) => {
          connection.beginTransaction(err => err ? reject(err) : resolve());
        });

        const slug = generateSlug(exam_name);

        // Insert exam
        const examResult = await new Promise((resolve, reject) => {
          connection.query(
            "INSERT INTO exams (exam_name, duration, category, difficulty, slug, back_link) VALUES (?,?,?,?,?,?)",
            [exam_name, duration, category, difficulty, slug, back_link || null],
            (err, result) => err ? reject(err) : resolve(result)
          );
        });

        const examId = examResult.insertId;
        let allQuestions = [];

        for (let i = 0; i < files.length; i++) {
          const setNo = i + 1;

          const parsed = await mammoth.extractRawText({ path: files[i].path });
          const cleanText = normalizeText(parsed.value);
          const blocks = splitQuestions(cleanText);

          blocks.forEach(qText => {
            const questionMatch = qText.match(/^(.*?)(?=A\.)/s);
            const question = questionMatch ? questionMatch[1].trim() : "";

            const optA = qText.match(/A\.(.*?)(?=B\.)/s);
            const optB = qText.match(/B\.(.*?)(?=C\.)/s);
            const optC = qText.match(/C\.(.*?)(?=D\.)/s);
            const optD = qText.match(/D\.(.*?)(?=Correct Answer)/s);

            const correctMatch = qText.match(/Correct Answer:\s*([A-D])/i);

            let explanation = "";
            let explanation_1 = null;
            let explanation_2 = null;
            let explanation_3 = null;

            /* --------- OPTION EXPLANATIONS --------- */
            const optionExplanationMatches = [
              ...qText.matchAll(/Option\s+[A-D]\s+.*?(?=(\nOption\s+[A-D]|$))/gis)
            ];

            if (optionExplanationMatches.length > 0)
              explanation = optionExplanationMatches[0][0].trim();
            if (optionExplanationMatches.length > 1)
              explanation_1 = optionExplanationMatches[1][0].trim();
            if (optionExplanationMatches.length > 2)
              explanation_2 = optionExplanationMatches[2][0].trim();
            if (optionExplanationMatches.length > 3)
              explanation_3 = optionExplanationMatches[3][0].trim();

            const optionA = optA ? optA[1].trim() : "";
            const optionB = optB ? optB[1].trim() : "";
            const optionC = optC ? optC[1].trim() : "";
            const optionD = optD ? optD[1].trim() : "";
            const correct = correctMatch ? correctMatch[1].trim() : "";

            if (question && optionA && optionB && optionC && optionD && correct) {
              allQuestions.push([
                examId, setNo, question,
                optionA, optionB, optionC, optionD,
                correct, explanation,
                explanation_1, explanation_2, explanation_3
              ]);
            }
          });
        }

        if (allQuestions.length === 0) {
          await new Promise((resolve) => connection.rollback(resolve));
          connection.release();
          return res.status(400).json({ error: "No valid questions found in files" });
        }

        // Insert questions
        await new Promise((resolve, reject) => {
          connection.query(
            `INSERT INTO questions
            (exam_id, set_no, question, option_a, option_b, option_c, option_d, correct_option, explanation, explanation_1, explanation_2, explanation_3)
            VALUES ?`,
            [allQuestions],
            (err) => err ? reject(err) : resolve()
          );
        });

        // Commit
        await new Promise((resolve, reject) => {
          connection.commit(err => err ? reject(err) : resolve());
        });

        connection.release();
        res.json({ message: "Exam scheduled successfully", exam_id: examId });

      } catch (err) {
        console.error("Schedule error:", err);
        connection.rollback(() => connection.release());
        res.status(500).json({ error: "Document parsing failed: " + err.message });
      }
    });

  }
);




router.get("/manager", (req, res) => {

  db.query(

    `SELECT
        e.exam_id,
        e.exam_name,
        e.category,
        e.difficulty,
        e.duration,

        COUNT(q.question_id) AS question_count

     FROM exams e

     LEFT JOIN questions q ON e.exam_id = q.exam_id

     GROUP BY e.exam_id`,

    (err, data) => {

      if (err) return res.status(500).json(err);

      res.json(data);

    }

  );

});

router.get("/slug/:slug", (req, res) => {
  const { slug } = req.params;

  db.query(
    "SELECT exam_id FROM exams WHERE slug = ?",
    [slug],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Server error" });

      if (!result.length) {
        return res.status(404).json({ error: "Exam not found" });
      }

      res.json({ exam_id: result[0].exam_id });
    }
  );
});



router.delete("/:id", (req, res) => {

  db.query(

    "DELETE FROM exams WHERE exam_id=?",

    [req.params.id],

    () => res.json({ message: "Exam deleted" })

  );

});




router.put("/:id", (req, res) => {

  const { exam_name, duration, category, difficulty } = req.body;



  db.query(

    `UPDATE exams

     SET exam_name=?, duration=?, category=?, difficulty=?

     WHERE exam_id=?`,

    [exam_name, duration, category, difficulty, req.params.id],

    err => {

      if (err) return res.status(500).json(err);

      res.json({ message: "Exam updated" });

    }

  );

});

// FIND THIS ROUTE in exam.routes.js (around the end of the file)
router.get("/slug/:slug/set-:setNo", (req, res) => {
  const { slug, setNo } = req.params;

  db.query(
    "SELECT exam_id FROM exams WHERE slug = ?",
    [slug],
    (err, result) => {
      if (err) return res.status(500).send("Server error");

      if (!result.length) {
        return res.status(404).send("Exam not found");
      }

      const examId = result[0].exam_id;

      // FIX: We redirect and pass BOTH examId and setNo in the URL
      // This ensures the frontend doesn't rely on empty localStorage
      res.redirect(`/exam.html?examId=${examId}&setNo=${setNo}`);
    }
  );
});


module.exports = router;