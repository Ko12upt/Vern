(() => {
  // Set to a form endpoint (e.g. Formspree: "https://formspree.io/f/xxxxxxx") to have the
  // quote form post directly. Left empty, the form opens the visitor's mail client instead.
  const FORM_ENDPOINT = "";
  const QUOTE_EMAIL = "boring_tunneling_rentals@yahoo.com";

  document.getElementById("year").textContent = new Date().getFullYear();

  // ─── Mobile nav ──────────────────────────────────────────
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav");
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });

  // ─── Scroll reveal ───────────────────────────────────────
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  // ─── Active nav link ─────────────────────────────────────
  const links = [...nav.querySelectorAll("a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  // ─── Equipment filter ────────────────────────────────────
  const chips = document.querySelectorAll(".chip");
  const rows = document.querySelectorAll(".data-table tbody tr");
  const count = document.getElementById("row-count");
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => {
      const on = c === chip;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", String(on));
    });
    let n = 0;
    rows.forEach((r) => {
      const show = f === "all" || r.dataset.brand === f;
      r.classList.toggle("is-hidden", !show);
      if (show) n++;
    });
    count.textContent = n;
  }));

  // ─── Prefill reason from CTA buttons ─────────────────────
  document.querySelectorAll("[data-reason]").forEach((btn) => btn.addEventListener("click", () => {
    document.getElementById("f-reason").value = btn.dataset.reason;
  }));

  // ─── Lightbox ────────────────────────────────────────────
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector("img");
  document.querySelectorAll(".g-item").forEach((item) => item.addEventListener("click", () => {
    lbImg.src = item.dataset.src;
    lbImg.alt = item.querySelector("img").alt;
    if (lb.showModal) lb.showModal(); else window.open(item.dataset.src, "_blank");
  }));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".lightbox-close")) lb.close(); });

  // ─── Quote form ──────────────────────────────────────────
  const form = document.getElementById("quote-form");
  const status = document.getElementById("form-status");
  const setStatus = (msg, cls) => { status.textContent = msg; status.className = "form-status small " + (cls || "muted"); };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstBad = null;
    form.querySelectorAll("[required]").forEach((el) => {
      const bad = !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value));
      el.closest(".field").classList.toggle("has-error", bad);
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) { setStatus("Please fill in the required fields.", "err"); firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));

    if (FORM_ENDPOINT) {
      setStatus("Sending…");
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        setStatus("Thanks, your request was sent. We'll be in touch soon.", "ok");
      } catch {
        setStatus("Something went wrong. Please call (606) 923-6056.", "err");
      }
      return;
    }

    const body = [
      `Name: ${data.name}`,
      `Business: ${data.business || "-"}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || "-"}`,
      `Reason: ${data.reason}`,
      "",
      data.details,
    ].join("\n");
    const subject = `${data.reason} quote request: ${data.name}`;
    window.location.href = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus("Opening your email app…", "ok");
  });

  form.addEventListener("input", (e) => {
    const field = e.target.closest(".field");
    if (field) field.classList.remove("has-error");
  });
})();
