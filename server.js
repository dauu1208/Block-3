const express = require("express");
const Database = require("better-sqlite3");
const Validators = require("./public/js/validators.js");
const app = express();
const db = new Database("students.db");

db.exec(`CREATE TABLE IF NOT EXISTS students(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL, student_code TEXT NOT NULL,
  email TEXT NOT NULL, class_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_code, class_name))`);

// Older databases were created with `student_code TEXT UNIQUE`, which blocks the same
// student ID across ALL classes. `CREATE TABLE IF NOT EXISTS` never changes an existing
// table, so rebuild it once with UNIQUE(student_code, class_name) (data is kept).
(function migrateStudentsTable() {
  const idCodeOnly = db
    .prepare("PRAGMA index_list(students)")
    .all()
    .filter((i) => i.unique)
    .some((i) => {
      const cols = db.prepare(`PRAGMA index_info("${i.name}")`).all();
      return cols.length === 1 && cols[0].name === "student_code";
    });
  if (!idCodeOnly) return;
  db.transaction(() => {
    db.exec(`
      ALTER TABLE students RENAME TO students_old;
      CREATE TABLE students(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL, student_code TEXT NOT NULL,
        email TEXT NOT NULL, class_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_code, class_name));
      INSERT INTO students(id, full_name, student_code, email, class_name, created_at)
        SELECT id, full_name, student_code, email, class_name, created_at FROM students_old;
      DROP TABLE students_old;`);
  })();
})();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) n FROM students").get().n;
  res.render("home", { page: "home", total });
});

const PER_PAGE = 6;
const tidyName = Validators.tidy;
const nameCollator = new Intl.Collator("vi", { sensitivity: "base" });

app.get("/students", (req, res) => {
  const s = (req.query.q || "").toString().trim();
  const like = `%${s}%`;

  // Filter by class: exactly one class (only the known ones). Empty = all classes
  const cls = Validators.CLASSES.includes(req.query.class)
    ? req.query.class
    : "";

  // Sort keys: "id" and/or "name". Both ticked -> Student ID first, Name breaks ties.
  const sorts = []
    .concat(req.query.sort || [])
    .filter((x) => x === "id" || x === "name");
  const sortId = sorts.includes("id");
  const sortName = sorts.includes("name");
  const sortCount = (sortId ? 1 : 0) + (sortName ? 1 : 0);

  // Order: A -> Z (asc) or Z -> A (desc)
  const order = req.query.order === "desc" ? "desc" : "asc";
  const dir = order === "desc" ? -1 : 1;

  let sql = `SELECT * FROM students WHERE (full_name LIKE ? OR student_code LIKE ? OR class_name LIKE ?)`;
  const params = [like, like, like];
  if (cls) {
    sql += ` AND class_name = ?`;
    params.push(cls);
  }
  let all = db.prepare(sql).all(...params);

  if (sortCount) {
    all.sort((a, b) => {
      let r = 0;
      if (sortId) r = a.student_code.localeCompare(b.student_code);
      if (!r && sortName) r = nameCollator.compare(a.full_name, b.full_name);
      return r * dir || a.id - b.id;
    });
  } else all.sort((a, b) => b.id - a.id); // default: newest first

  const count = all.length;
  const pages = Math.max(1, Math.ceil(count / PER_PAGE));
  const pageNo = Math.min(Math.max(parseInt(req.query.page) || 1, 1), pages);
  const rows = all.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  // Query string carried by the pagination links (ends with "&" when not empty)
  const base = new URLSearchParams();
  if (s) base.set("q", s);
  if (cls) base.set("class", cls);
  sorts.forEach((x) => base.append("sort", x));
  if (sortCount && order === "desc") base.set("order", "desc");
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
    sortCount,
    order,
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
  // One class can only hold a student ID once. Same ID in the same class = already there,
  // even if the name is different. The same ID may join other classes freely.
  if (!err) {
    const dup = db
      .prepare(
        "SELECT full_name FROM students WHERE student_code = ? AND class_name = ?",
      )
      .get(v.student_code, v.class_name);
    if (dup) {
      const norm = (x) => tidyName(x).normalize("NFC").toLocaleLowerCase("vi");
      err =
        norm(dup.full_name) === norm(v.full_name)
          ? `${v.full_name} (${v.student_code}) is already registered in ${v.class_name}.`
          : `Student ID ${v.student_code} already exists in ${v.class_name}.`;
    }
  }
  if (!err)
    try {
      db.prepare(
        `INSERT INTO students(full_name,student_code,email,class_name)
      VALUES(@full_name,@student_code,@email,@class_name)`,
      ).run(v);
    } catch (e) {
      // Only a real duplicate (same ID + same class) gets this message; show other errors as-is
      if (!String(e.code).startsWith("SQLITE_CONSTRAINT")) throw e;
      err = `Student ID ${v.student_code} already exists in ${v.class_name}.`;
    }
  if (err) return registerView(res, err, v, 400);
  res.redirect("/students?ok=1");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
