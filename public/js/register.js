/* Register page: live validation hints under each field + single-choice class dropdown */
(() => {
  const V = window.Validators;
  const form = document.getElementById("regForm");
  if (!form || !V) return;

  let submitted = false;
  const fields = {};
  form.querySelectorAll(".field").forEach((f) => {
    const name = f.dataset.field;
    fields[name] = { name, f, input: f.querySelector("[name]"), list: f.querySelector(".rules"), focused: false, blurred: false };
  });

  /* ---------- hints ---------- */
  function render(st) {
    const v = st.input.value;
    const res = V.validate(st.name, v);
    const dirty = v.length > 0 || st.blurred || submitted;

    st.list.hidden = !(dirty || st.focused);
    st.f.classList.toggle("ok", res.ok);
    st.f.classList.toggle("bad", !res.ok && (st.blurred || submitted));

    st.list.innerHTML = "";
    res.results.forEach((r) => {
      const li = document.createElement("li");
      const state = r.ok ? "ok" : dirty ? "bad" : "idle";
      li.className = "rule " + state;
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = r.ok ? "✓" : dirty ? "✗" : "○";
      li.append(mark, document.createTextNode(r.text + (r.detail ? " " + r.detail : "")));
      st.list.append(li);
    });
    return res.ok;
  }

  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f) render(fields[f.dataset.field]);
  });
  form.addEventListener("focusin", (e) => {
    const f = e.target.closest(".field");
    if (f) { fields[f.dataset.field].focused = true; render(fields[f.dataset.field]); }
  });
  form.addEventListener("focusout", (e) => {
    const f = e.target.closest(".field");
    if (!f || f.contains(e.relatedTarget)) return;
    const st = fields[f.dataset.field];
    st.focused = false;
    st.blurred = true;
    render(st);
  });

  /* ---------- class dropdown (pick exactly one) ---------- */
  const sel = form.querySelector(".select");
  const btn = sel.querySelector(".select-btn");
  const menu = sel.querySelector(".select-menu");
  const val = sel.querySelector(".select-val");
  const hidden = sel.querySelector('input[type="hidden"]');
  const opts = [...menu.querySelectorAll("li")];

  const isOpen = () => !menu.hidden;
  function setOpen(open, focusOpt) {
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    sel.classList.toggle("open", open);
    if (open && focusOpt !== false) (opts.find((o) => o.getAttribute("aria-selected") === "true") || opts[0]).focus();
  }
  function choose(o) {
    opts.forEach((x) => x.setAttribute("aria-selected", x === o));
    hidden.value = o.dataset.value;
    val.textContent = o.dataset.value;
    val.classList.add("picked");
    setOpen(false);
    btn.focus();
    hidden.dispatchEvent(new Event("input", { bubbles: true }));
  }
  // restore value after a server-side error
  const current = opts.find((o) => o.dataset.value === hidden.value);
  if (current) { current.setAttribute("aria-selected", "true"); val.textContent = current.dataset.value; val.classList.add("picked"); }
  else hidden.value = "";

  btn.addEventListener("click", () => setOpen(!isOpen()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setOpen(true); }
  });
  menu.addEventListener("click", (e) => { const o = e.target.closest("li"); if (o) choose(o); });
  menu.addEventListener("keydown", (e) => {
    const i = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); opts[Math.max(i - 1, 0)].focus(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (i > -1) choose(opts[i]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.focus(); }
    else if (e.key === "Tab") setOpen(false, false);
  });
  document.addEventListener("click", (e) => { if (isOpen() && !sel.contains(e.target)) setOpen(false, false); });

  /* ---------- submit ---------- */
  form.addEventListener("submit", (e) => {
    submitted = true;
    let firstBad = null;
    Object.values(fields).forEach((st) => { if (!render(st) && !firstBad) firstBad = st; });
    if (firstBad) {
      e.preventDefault();
      (firstBad.name === "class_name" ? btn : firstBad.input).focus();
    }
  });

  // initial paint (values coming back from the server after an error)
  Object.values(fields).forEach((st) => { if (st.input.value) render(st); });
})();
