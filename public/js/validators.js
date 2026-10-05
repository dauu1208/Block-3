/* Shared validation rules — used by the browser (live hints) AND by server.js (final check),
   so both always agree. Each rule = { text, ok(value), detail?(value) }. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Validators = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const CLASSES = ["24KTPM1", "24KTPM2", "24KTPM3", "24HTTT1", "24HTTT2"];

  const tidy = (v) => v.replace(/\s+/g, " ").trim();
  const filled = (fn) => (v) => v.length > 0 && fn(v); // an empty field never counts as "passed"

  const FIELDS = {
    full_name: [
      { text: "Name can't be empty", ok: (v) => tidy(v).length > 0 },
      { text: "Letters only — numbers aren't allowed", ok: filled((v) => !/\d/.test(v)) },
      {
        text: "No special characters (letters and spaces only)",
        ok: filled((v) => /^[\p{L}\p{M} ]*$/u.test(tidy(v).replace(/\d/g, ""))),
      },
      {
        text: "At least 2 letters",
        ok: (v) => (tidy(v).match(/\p{L}/gu) || []).length >= 2,
      },
    ],

    student_code: [
      { text: "Student ID can't be empty", ok: (v) => v.length > 0 },
      { text: "No spaces allowed", ok: filled((v) => !/\s/.test(v)) },
      {
        text: "Digits only (0–9) — no letters or symbols",
        ok: filled((v) => /^\d+$/.test(v.replace(/\s/g, ""))),
      },
      {
        text: "Exactly 8 digits",
        ok: (v) => /^\d{8}$/.test(v),
        detail: (v) => `(${v.replace(/\s/g, "").length}/8)`,
      },
    ],

    email: [
      { text: "No spaces allowed", ok: filled((v) => !/\s/.test(v)) },
      { text: "Exactly one @ symbol", ok: (v) => v.split("@").length === 2 },
      {
        text: "At least one character before the @",
        ok: (v) => v.includes("@") && v.slice(0, v.indexOf("@")).length > 0,
      },
      {
        text: "At least one character after the @",
        ok: (v) => v.includes("@") && v.slice(v.indexOf("@") + 1).length > 0,
      },
      {
        text: "Domain needs a dot with text around it (like gmail.com)",
        ok: (v) =>
          v.includes("@") &&
          /^[^.@\s]+(\.[^.@\s]+)*\.[^.@\s]{2,}$/.test(v.slice(v.indexOf("@") + 1)),
      },
    ],

    class_name: [{ text: "Pick one class from the list", ok: (v) => CLASSES.includes(v) }],
  };

  function validate(field, value) {
    const v = value == null ? "" : String(value);
    const results = FIELDS[field].map((r) => ({
      text: r.text,
      ok: !!r.ok(v),
      detail: r.detail ? r.detail(v) : "",
    }));
    return { ok: results.every((r) => r.ok), results };
  }

  return { CLASSES, FIELDS, validate, tidy };
});
