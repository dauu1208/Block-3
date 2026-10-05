const express = require("express");
const Database = require("better-sqlite3");
const Validators = require("./public/js/validators.js");
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
const nameCollator = new Intl.Collator("vi", { sensitivity: "base" });

app.get("/students", (req, res) => {
  const s = (req.query.q || "").toString().trim();
  const like = `%${s}%`;

  // Filter by class (only accept the known classes)
  const cls = Validators.CLASSES.includes(req.query.class)
    ? req.query.class
    : "";

  // Sort options: any of "id" / "name". If both are chosen, Student ID wins.
  const sorts = []
    .concat(req.query.sort || [])
    .filter((x) => x === "id" || x === "name");
  const sortId = sorts.includes("id");
  const sortName = sorts.includes("name");

  let sql = `SELECT * FROM students WHERE (full_name LIKE ? OR student_code LIKE ? OR class_name LIKE ?)`;
  const params = [like, like, like];
  if (cls) {
    sql += ` AND class_name = ?`;
    params.push(cls);
  }
  let all = db.prepare(sql).all(...params);

  if (sortId)
    all.sort(
      (a, b) => a.student_code.localeCompare(b.student_code) || a.id - b.id,
    );
  else if (sortName)
    all.sort(
      (a, b) => nameCollator.compare(a.full_name, b.full_name) || a.id - b.id,
    );
  else all.sort((a, b) => b.id - a.id); // default: newest first

  const count = all.length;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const pageNo = Math.min(Math.max(parseInt(req.query.page) || 1, 1), pages);
  const rows = all.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  // Query string carried by the pagination links (ends with "&" when not empty)
  const base = new URLSearchParams();
  if (s) base.set("q", s);
  if (cls) base.set("class", cls);
  sorts.forEach((x) => base.append("sort", x));
  const baseQs = base.toString() ? base.toString() + "&" : "";

  res.render("students", {
    page: "students",
    rows,
    s,
    ok: req.query.ok,
    pageNo,
    pages,
    count,
    cls,
    sortId,
    sortName,
    classes: Validators.CLASSES,
    baseQs,
    hasFilter: !!(s || cls),
  });
});

app.get("/students/:id", (req, res) => {
  const r = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(req.params.id);
  if (!r) return res.redirect("/students");
  const prev = db
    .prepare("SELECT id FROM students WHERE id < ? ORDER BY id DESC LIMIT 1")
    .get(r.id);
  const next = db
    .prepare("SELECT id FROM students WHERE id > ? ORDER BY id ASC LIMIT 1")
    .get(r.id);
  const no = db
    .prepare("SELECT COUNT(*) n FROM students WHERE id <= ?")
    .get(r.id).n;
  const total = db.prepare("SELECT COUNT(*) n FROM students").get().n;
  res.render("student", {
    page: "students",
    detail: true,
    r,
    prev,
    next,
    no,
    total,
  });
});

const registerView = (res, err, v, status = 200) =>
  res.status(status).render("register", {
    page: "register",
    err,
    v,
    classes: Validators.CLASSES,
    scripts: ["/js/validators.js", "/js/register.js"],
  });

app.get("/register", (req, res) => registerView(res, null, {}));

app.post("/register", (req, res) => {
  const v = {
    full_name: Validators.tidy((req.body.full_name || "").toString()),
    // ID, email and class are checked exactly as typed (e.g. spaces in the ID are an error)
    student_code: (req.body.student_code || "").toString(),
    email: (req.body.email || "").toString(),
    class_name: (req.body.class_name || "").toString(),
  };
  let err = null;
  if (Object.values(v).some((x) => !x)) err = "Please fill in all 4 fields.";
  else {
    for (const field of Object.keys(v)) {
      const failed = Validators.validate(field, v[field]).results.find(
        (r) => !r.ok,
      );
      if (failed) {
        err = failed.text + ".";
        break;
      }
    }
  }
  if (!err)
    try {
      db.prepare(
        `INSERT INTO students(full_name,student_code,email,class_name)
      VALUES(@full_name,@student_code,@email,@class_name)`,
      ).run(v);
    } catch {
      err = "This student ID is already registered.";
    }
  if (err) return registerView(res, err, v, 400);
  res.redirect("/students?ok=1");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
