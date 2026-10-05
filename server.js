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

app.get("/students", (req, res) => {
  const s = (req.query.q || "").trim();
  const like = `%${s}%`;
  const rows = db
    .prepare(
      `SELECT * FROM students WHERE full_name LIKE ? OR student_code LIKE ?
    OR class_name LIKE ? ORDER BY id DESC`,
    )
    .all(like, like, like);
  res.render("students", { page: "students", rows, s, ok: req.query.ok });
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

app.listen(3000, () => console.log("Running at http://localhost:3000"));
