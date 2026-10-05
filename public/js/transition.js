/* Tab transitions — works together with views/partials/transition.ejs + css/transition.css
   Flow: click a link → play the "cover" effect → navigate → the new page plays the "reveal" effect. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Destination → effect type
  const EFFECT = { "/": "fresh", "/students": "cloud", "/register": "bubble" };
  // Cover time (ms) before navigating / reveal time before cleaning up
  const COVER = { cloud: 950, bubble: 1050, fresh: 1050 };
  const REVEAL = { cloud: 1500, bubble: 1500, fresh: 1500 };

  const sparkle = (x, y) => typeof burst === "function" && burst(x, y); // star burst already defined in app.js
  let busy = false;

  /* ---------- NEW PAGE: the "reveal" half ---------- */
  if (root.classList.contains("vt-in")) {
    const type = root.dataset.vt;

    if (type === "fresh") {
      // star bursts mid-screen while the ripples collapse
      [450, 600, 750].forEach((t, i) =>
        setTimeout(
          () => sparkle(innerWidth * (0.38 + i * 0.12), innerHeight * 0.42),
          t,
        ),
      );
    }
    if (type === "bubble") {
      // a few bubbles pop with sparkles
      document.querySelectorAll(".vt-bubble .bb").forEach((b, i) => {
        if (i % 6 !== 0) return;
        const r = b.getBoundingClientRect();
        const delay =
          100 +
          (parseFloat(b.style.getPropertyValue("--po")) || 0) * 1000 +
          120;
        setTimeout(
          () => sparkle(r.left + r.width / 2, r.top + r.height / 2),
          delay,
        );
      });
    }
    if (type === "cloud") {
      setTimeout(() => sparkle(innerWidth / 2, innerHeight * 0.4), 700);
    }

    setTimeout(() => {
      root.classList.remove("vt-in");
      delete root.dataset.vt;
    }, REVEAL[type] || 1500);
  }

  /* ---------- CURRENT PAGE: the "cover" half ---------- */
  document.addEventListener("click", (e) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

    const url = new URL(a.href, location.href);
    const type = EFFECT[url.pathname];
    if (url.origin !== location.origin || !type) return;
    if (url.pathname === location.pathname && url.search === location.search)
      return; // already on that tab
    if (reduce) return; // user prefers reduced motion → navigate normally

    e.preventDefault();
    if (busy) return;
    busy = true;

    // the "fresh" ripples spread from the exact button that was clicked
    const r = a.getBoundingClientRect();
    root.style.setProperty("--ox", r.left + r.width / 2 + "px");
    root.style.setProperty("--oy", r.top + r.height / 2 + "px");

    root.dataset.vt = type;
    root.classList.add("vt-out");
    try {
      sessionStorage.setItem("vt", type);
    } catch (_) {}

    setTimeout(() => {
      location.href = url.href;
    }, COVER[type]);
  });

  // Back/Forward restored from bfcache → don't leave the overlay stuck
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    busy = false;
    root.classList.remove("vt-out", "vt-in");
    delete root.dataset.vt;
  });
})();
