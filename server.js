const express = require("express");
const Database = require("better-sqlite3");
const app = express();
const db = new Database("students.db");

db.exec(`CREATE TABLE IF NOT EXISTS students(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL, student_code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL, class_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) n FROM students").get().n;
  res.render("home", { page: "home", total });
});

const PER_PAGE = 6;

app.get("/students", (req, res) => {
  const s = (req.query.q || "").trim();
  const like = `%${s}%`;
  const where = `WHERE full_name LIKE ? OR student_code LIKE ? OR class_name LIKE ?`;
  const count = db
    .prepare(`SELECT COUNT(*) n FROM students ${where}`)
    .get(like, like, like).n;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const pageNo = Math.min(Math.max(parseInt(req.query.page) || 1, 1), pages);
  const rows = db
    .prepare(`SELECT * FROM students ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(like, like, like, PER_PAGE, (pageNo - 1) * PER_PAGE);
  res.render("students", {
    page: "students",
    rows,
    s,
    ok: req.query.ok,
    pageNo,
    pages,
  });
});

app.get("/students/:id", (req, res) => {
  const r = db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id);
  if (!r) return res.redirect("/students");
  const prev = db.prepare("SELECT id FROM students WHERE id < ? ORDER BY id DESC LIMIT 1").get(r.id);
  const next = db.prepare("SELECT id FROM students WHERE id > ? ORDER BY id ASC LIMIT 1").get(r.id);
  const no = db.prepare("SELECT COUNT(*) n FROM students WHERE id <= ?").get(r.id).n;
  const total = db.prepare("SELECT COUNT(*) n FROM students").get().n;
  res.render("student", { page: "students", detail: true, r, prev, next, no, total });
});

app.get("/register", (req, res) =>
  res.render("register", { page: "register", err: null, v: {} }),
);

app.post("/register", (req, res) => {
  const v = {};
  ["full_name", "student_code", "email", "class_name"].forEach(
    (k) => (v[k] = (req.body[k] || "").trim()),
  );
  let err = null;
  if (Object.values(v).some((x) => !x)) err = "Please fill in all 4 fields.";
  else if (!/^\S+@\S+\.\S+$/.test(v.email))
    err = "That email doesn't look right.";
  else
    try {
      db.prepare(
        `INSERT INTO students(full_name,student_code,email,class_name)
      VALUES(@full_name,@student_code,@email,@class_name)`,
      ).run(v);
    } catch {
      err = "This student ID is already registered.";
    }
  if (err)
    return res.status(400).render("register", { page: "register", err, v });
  res.redirect("/students?ok=1");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});