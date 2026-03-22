const express = require("express");
const db = require("../config/db");

const router = express.Router();

/*
  SLUG REDIRECT ROUTE
  Example:
  /c458-health-fitness-and-wellness
*/

router.get("/:slug", (req, res, next) => {
  const slug = req.params.slug;

  db.query(
    "SELECT exam_id FROM exams WHERE slug = ?",
    [slug],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Server error");
      }

      if (result.length === 0) {
        return next(); // Not an exam slug → continue normally
      }

      // Redirect to your existing page
      res.redirect(`/exam_sets.html?examId=${result[0].exam_id}`);
    }
  );
});

module.exports = router;
