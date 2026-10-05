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

/* Students page: Filter / Sort dropdowns (tick options, then press Apply) */
(() => {
  const dds = [...document.querySelectorAll("[data-dd]")];
  if (!dds.length) return;

  const close = (dd) => {
    dd.querySelector(".dd-menu").hidden = true;
    dd.querySelector(".dd-btn").setAttribute("aria-expanded", "false");
    dd.classList.remove("open");
  };
  const open = (dd) => {
    dds.forEach((x) => x !== dd && close(x));
    dd.querySelector(".dd-menu").hidden = false;
    dd.querySelector(".dd-btn").setAttribute("aria-expanded", "true");
    dd.classList.add("open");
  };

  dds.forEach((dd) => {
    const btn = dd.querySelector(".dd-btn");
    const menu = dd.querySelector(".dd-menu");
    const badge = dd.querySelector(".dd-badge");
    const classRadios = [...menu.querySelectorAll('input[name="class"]')];
    const countBoxes = [...menu.querySelectorAll("input[data-count]")];

    const refresh = () => {
      // Filter: 1 if a class is picked ("All classes" has an empty value); Sort: number of ticked keys
      const n = classRadios.length
        ? classRadios.filter((i) => i.checked && i.value).length
        : countBoxes.filter((i) => i.checked).length;
      badge.textContent = n;
      badge.hidden = n === 0;
    };

    btn.addEventListener("click", () => (menu.hidden ? open(dd) : close(dd)));

    menu.addEventListener("change", refresh);
  });

  document.addEventListener("click", (e) => {
    dds.forEach((dd) => !dd.contains(e.target) && close(dd));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    dds.forEach((dd) => {
      if (!dd.querySelector(".dd-menu").hidden) {
        close(dd);
        dd.querySelector(".dd-btn").focus();
      }
    });
  });
})();

/* Home page: playable little piano (click / tap the keys, or use A S D F G H J K + W E T Y U) */
(() => {
  const keys = [...document.querySelectorAll(".key")];
  if (!keys.length) return;
  let ctx;
  function play(freq) {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 1.15);
  }
  function hit(k) {
    play(+k.dataset.note);
    k.classList.add("down");
    setTimeout(() => k.classList.remove("down"), 160);
  }
  keys.forEach((k) => {
    k.addEventListener("pointerdown", () => hit(k));
    k.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat) hit(k);
    });
  });
  const map = {};
  "asdfghjk"
    .split("")
    .forEach(
      (c, i) => (map[c] = keys.filter((k) => k.classList.contains("w"))[i]),
    );
  "wetyu"
    .split("")
    .forEach(
      (c, i) => (map[c] = keys.filter((k) => k.classList.contains("b"))[i]),
    );
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = map[e.key.toLowerCase()];
    if (k && e.target === document.body) {
      hit(k);
      const r = k.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + 20);
    }
  });
})();
