const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const examRoutes = require("./routes/exam.routes");
const questionRoutes = require("./routes/question.routes");
const attemptRoutes = require("./routes/attempt.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const redirectRoutes = require("./routes/redirect.routes");
const contactRoutes = require("./routes/contact.routes");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

/* ─────────────────────────────────
   STATIC FILES
────────────────────────────────── */
app.use("/assets", express.static(path.join(__dirname, "../frontend/assets")));
app.use("/components", express.static(path.join(__dirname, "../frontend/components")));

/* ─────────────────────────────────
   API ROUTES
────────────────────────────────── */
app.get("/api", (req, res) => {
  res.json({ status: "API is running" });
});

app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

/* ─────────────────────────────────
   NAVBAR COMPONENT ENDPOINT
────────────────────────────────── */
app.get("/Nav", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/components/navbar.html"));
});

/* ─────────────────────────────────
   BLOCK ROOT DOMAIN — empty page
────────────────────────────────── */
app.get("/", (req, res) => {
  res.status(200).send("");
});

app.get("/Home", (req, res) => {
  res.status(200).send("");
});

app.get("/index", (req, res) => {
  res.status(200).send("");
});

/* ─────────────────────────────────
   ADMIN LOGIN — /admin
────────────────────────────────── */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

/* ─────────────────────────────────
   ADMIN PAGES
────────────────────────────────── */
app.get("/admin/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-dashboard.html"));
});

app.get("/admin/schedule", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-schedule.html"));
});

app.get("/admin/exam-manager", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-exam-manager.html"));
});

app.get("/admin/attempts", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-attempts.html"));
});

app.get("/admin/contacts", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin-contacts.html"));
});

/* ─────────────────────────────────
   STUDENT-FACING PAGES (exam only)
────────────────────────────────── */
app.get("/exam", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/exam.html"));
});

app.get("/result", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/result.html"));
});

app.get("/exam_sets.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/exam_sets.html"));
});

/* ─────────────────────────────────
   EXAM SET SLUG ROUTES
────────────────────────────────── */
app.get("/exam_sets/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/exam_sets.html"));
});

app.get("/exam_sets/:slug/set-:setNo", (req, res) => {
  const { slug, setNo } = req.params;
  const db = require("./config/db");
  db.query("SELECT exam_id FROM exams WHERE slug = ?", [slug], (err, result) => {
    if (err || !result.length) return res.status(404).send("Exam not found");
    res.redirect(`/exam?examId=${result[0].exam_id}&setNo=${setNo}`);
  });
});

/* ─────────────────────────────────
   BLOCK OLD PUBLIC PAGES
────────────────────────────────── */
const blockedPages = ["/login", "/exams", "/profile", "/help", "/contact", "/terms", "/privacy", "/admin-dashboard", "/admin-contacts"];
blockedPages.forEach(route => {
  app.get(route, (req, res) => res.status(200).send(""));
});

/* ─────────────────────────────────
   SLUG REDIRECT (catch-all for exam slugs)
   Must be LAST before 404
────────────────────────────────── */
app.use(redirectRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
