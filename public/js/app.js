const colors = [
  ["#5aa9ff", "#2a6fd6"],
  ["#ff8fc7", "#d9569a"],
  ["#ffb454", "#d9822a"],
  ["#5be0a0", "#2aa56e"],
  ["#7aa8ff", "#3a64d6"],
  ["#ff6f91", "#c93a5c"],
  ["#6fe8b0", "#2aa56e"],
];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-bubble]").forEach((el) => {
  el.setAttribute("aria-label", el.dataset.bubble);
  el.innerHTML = [...el.dataset.bubble]
    .map((ch, i) => {
      const [c, d] = colors[i % colors.length];
      return ch === " "
        ? " "
        : `<span aria-hidden="true" style="--c:${c};--d:${d};--i:${i}">${ch}</span>`;
    })
    .join("");
});

function burst(x, y) {
  if (reduce) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("i"),
      a = Math.random() * 6.28,
      r = 50 + Math.random() * 70;
    s.className = "fx";
    s.style.cssText = `left:${x}px;top:${y}px;--c:${colors[i % 7][0]};--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px`;
    document.body.append(s);
    setTimeout(() => s.remove(), 800);
  }
}
document.addEventListener("click", (e) => {
  if (e.target.closest(".pop, .flip")) burst(e.clientX, e.clientY);
  const f = e.target.closest(".flip");
  if (f) f.classList.toggle("on");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("flip"))
    e.target.classList.toggle("on");
});

document.querySelectorAll(".tilt").forEach((c) => {
  c.addEventListener("mousemove", (e) => {
    const b = c.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5,
      y = (e.clientY - b.top) / b.height - 0.5;
    c.style.transform = `rotateX(${-y * 14}deg) rotateY(${x * 14}deg) translateZ(10px)`;
  });
  c.addEventListener("mouseleave", () => (c.style.transform = ""));
});

/* Students page: apply filter / sort as soon as a chip is toggled */
document
  .querySelectorAll("#filterForm .opt input")
  .forEach((i) => i.addEventListener("change", () => i.form.requestSubmit()));
