(() => {
  // The owner turns prices on or off from My Listings in the back office.
  const SHOW_RATES = HBP.settings.showPrices;
  // Like the quote form: with no endpoint, the request opens the visitor's mail client.
  const REQUEST_ENDPOINT = "";
  const REQUEST_EMAIL = HBP.company.email;
  const STORE_KEY = "hbp.request";

  const catalog = HBP.data.catalog.filter((p) => !p.hidden);
  const { availability } = HBP.data;
  const { GROUND, CATEGORIES, esc, fmtShort } = HBP;
  const $ = (id) => document.getElementById(id);

  const state = { cat: "all", ground: "", q: "", size: "", availOnly: false, sort: "cat" };
  let request = [];
  try { request = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { request = []; }
  const saveRequest = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(request)); } catch {} };

  const optionLabel = (p) => p.cat === "accessory" && p.id === "t1" ? "Machine class" : p.cat === "accessory" && p.id === "t4" ? "Hex" : p.cat === "auger" ? "Diameter" : "Size";
  const rateText = (p) => !SHOW_RATES ? "Rate on request" : p.rate ? `${HBP.fmtMoney(p.rate)} / 28 days${p.unit ? ` · ${p.unit}` : ""}` : "Quoted per job";
  const availOf = (p) => availability[p.id] || { status: "available" };
  const availHtml = (p) => {
    const a = availOf(p);
    if (a.status === "out") return `<span class="avail avail-out">Out on rent${a.back ? ` · back ~${fmtShort(a.back)}` : ""}</span>`;
    if (a.status === "limited") return `<span class="avail avail-limited">Limited</span>`;
    return `<span class="avail avail-ok">Available</span>`;
  };
  const groundBadges = (p) => p.ground ? p.ground.map((g) => `<span class="gbadge g-${g}">${GROUND[g].label}</span>`).join("") : "";

  // ─── Ground matcher ────────────────────────────────────
  const groundList = $("ground-list");
  groundList.innerHTML = Object.entries(GROUND).map(([key, g]) => `
    <button type="button" class="ground-opt g-${key}" role="radio" aria-checked="false" data-ground="${key}">
      <span class="ground-swatch" aria-hidden="true"></span>
      <span><span class="ground-label">${g.label}</span><span class="ground-hint">${g.hint}</span></span>
    </button>`).join("");
  groundList.addEventListener("click", (e) => {
    const btn = e.target.closest(".ground-opt");
    if (!btn) return;
    state.ground = state.ground === btn.dataset.ground ? "" : btn.dataset.ground;
    if (state.ground && state.cat !== "all" && state.cat !== "head") state.cat = "head";
    render();
  });

  // ─── Category list ─────────────────────────────────────
  const catList = $("cat-list");
  const renderCats = () => {
    const counts = { all: catalog.length };
    catalog.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    catList.innerHTML = [["all", "All equipment"], ...Object.entries(CATEGORIES)].map(([key, label]) => `
      <button type="button" class="cat-btn${state.cat === key ? " is-active" : ""}" data-cat="${key}">
        <span>${label}</span><span class="cat-n">${counts[key] || 0}</span>
      </button>`).join("");
  };
  catList.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-btn");
    if (!btn) return;
    state.cat = btn.dataset.cat;
    render();
  });

  $("q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
  $("size").addEventListener("change", (e) => { state.size = e.target.value; render(); });
  $("avail-only").addEventListener("change", (e) => { state.availOnly = e.target.checked; render(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("clear-filters").addEventListener("click", () => {
    Object.assign(state, { cat: "all", ground: "", q: "", size: "", availOnly: false });
    $("q").value = ""; $("size").value = ""; $("avail-only").checked = false;
    render();
  });

  // ─── Grid ──────────────────────────────────────────────
  const catOrder = Object.keys(CATEGORIES);
  const filtered = () => {
    let list = catalog.filter((p) => {
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.ground && p.cat === "head" && !p.ground.includes(state.ground)) return false;
      if (state.availOnly && availOf(p).status === "out") return false;
      if (state.size && p.cat === "machine") {
        const [lo, hi] = state.size.split("-").map(Number);
        if (p.size < lo || p.size > hi) return false;
      }
      if (state.q) {
        const hay = [p.name, p.brand || "", p.blurb || "", ...(p.options || []), CATEGORIES[p.cat]].join(" ").toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    });
    const bySize = (p) => p.size || 0;
    const sorters = {
      cat: (a, b) => catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat) || bySize(a) - bySize(b),
      "size-asc": (a, b) => bySize(a) - bySize(b),
      "size-desc": (a, b) => bySize(b) - bySize(a),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    // With a ground condition chosen, matching heads come first.
    if (state.ground) list.sort((a, b) => (b.cat === "head") - (a.cat === "head") || sorters[state.sort](a, b));
    else list.sort(sorters[state.sort]);
    return list;
  };

  const grid = $("grid");
  const render = () => {
    renderCats();
    groundList.querySelectorAll(".ground-opt").forEach((b) => {
      const on = b.dataset.ground === state.ground;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", String(on));
    });
    const ga = $("ground-active");
    ga.hidden = !state.ground;
    if (state.ground) ga.innerHTML = `Heads for <span class="gbadge g-${state.ground}">${GROUND[state.ground].label}</span> <button type="button" class="link-btn" data-clear-ground>Clear</button>`;

    const list = filtered();
    $("result-count").textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    $("empty").hidden = list.length > 0;
    grid.innerHTML = list.map((p) => `
      <article class="product" data-id="${p.id}">
        <button type="button" class="product-media" data-open="${p.id}" aria-label="View ${esc(p.name)}">
          <img src="${p.img}" alt="" loading="lazy">
          ${availHtml(p)}
        </button>
        <div class="product-body">
          <p class="eyebrow">${CATEGORIES[p.cat]}</p>
          <h3><button type="button" class="link-btn product-title" data-open="${p.id}">${esc(p.name)}</button></h3>
          <p class="muted small product-meta">${p.cat === "machine" ? `${p.size}″ class${p.specs?.["Bore range"] ? ` · bores ${esc(p.specs["Bore range"])}` : ""}` : p.options ? `${p.options.length} sizes · ${esc(p.options[0])} to ${esc(p.options[p.options.length - 1])}` : esc(p.unit || "")}</p>
          ${p.ground ? `<div class="gbadges">${groundBadges(p)}</div>` : ""}
        </div>
        <div class="product-foot">
          <span class="muted small">${rateText(p)}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-open="${p.id}">${p.options ? "Choose size" : "Add"}</button>
        </div>
      </article>`).join("");
  };
  $("ground-active").addEventListener("click", (e) => { if (e.target.closest("[data-clear-ground]")) { state.ground = ""; render(); } });
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (btn) openProduct(btn.dataset.open);
  });

  // ─── Product modal ─────────────────────────────────────
  const modal = $("product-modal");
  let current = null;
  const openProduct = (id) => {
    current = catalog.find((p) => p.id === id);
    const p = current;
    $("pm-img").src = p.img;
    $("pm-cat").textContent = CATEGORIES[p.cat];
    $("pm-title").textContent = p.name;
    $("pm-blurb").textContent = p.blurb || "";
    $("pm-ground").innerHTML = p.ground
      ? `<p class="filter-title">Rated for</p><div class="gbadges">${groundBadges(p)}</div>`
      : p.cat === "head" ? "" : "";
    $("pm-specs").innerHTML = Object.entries(p.specs || {}).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")
      + `<div><dt>Availability</dt><dd>${availHtml(p)}</dd></div>`;
    const optField = $("pm-option-field");
    optField.hidden = !p.options;
    if (p.options) {
      $("pm-option-label").textContent = optionLabel(p);
      $("pm-option").innerHTML = p.options.map((o) => `<option>${esc(o)}</option>`).join("");
    }
    $("pm-qty").value = 1;
    $("pm-rate").textContent = rateText(p);
    modal.showModal();
  };
  $("pm-form").addEventListener("submit", (e) => {
    if (e.submitter?.value !== "add" || !current) return;
    const option = current.options ? $("pm-option").value : "";
    const qty = Math.max(1, parseInt($("pm-qty").value, 10) || 1);
    const existing = request.find((r) => r.id === current.id && r.option === option);
    if (existing) existing.qty += qty;
    else request.push({ id: current.id, option, qty });
    saveRequest();
    renderRequest();
    bump();
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  // ─── Request drawer ────────────────────────────────────
  const drawer = $("request-drawer");
  const countEl = $("request-count");
  const bump = () => { countEl.classList.remove("is-bump"); void countEl.offsetWidth; countEl.classList.add("is-bump"); };

  $("rq-start").min = new Date().toISOString().slice(0, 10);
  $("rq-ground").innerHTML = `<option value="">Not sure</option>` + Object.entries(GROUND).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join("");

  const renderRequest = () => {
    const n = request.reduce((s, r) => s + r.qty, 0);
    countEl.textContent = n;
    $("rq-count").textContent = n;
    $("rq-empty").hidden = request.length > 0;
    $("rq-items").innerHTML = request.map((r, i) => {
      const p = catalog.find((x) => x.id === r.id);
      if (!p) return "";
      return `<li class="rq-item">
        <img src="${p.img}" alt="">
        <div>
          <p class="rq-name">${esc(p.name)}</p>
          <p class="muted small">${[CATEGORIES[p.cat], r.option].filter(Boolean).map(esc).join(" · ")}</p>
        </div>
        <div class="qty">
          <button type="button" data-qty="${i}" data-d="-1" aria-label="Fewer">−</button>
          <span>${r.qty}</span>
          <button type="button" data-qty="${i}" data-d="1" aria-label="More">+</button>
        </div>
      </li>`;
    }).join("");
  };
  $("rq-items").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qty]");
    if (!b) return;
    const item = request[+b.dataset.qty];
    item.qty += +b.dataset.d;
    if (item.qty < 1) request.splice(+b.dataset.qty, 1);
    saveRequest();
    renderRequest();
  });

  $("open-request").addEventListener("click", () => {
    if (state.ground && !$("rq-ground").value) $("rq-ground").value = state.ground;
    drawer.showModal();
  });
  drawer.addEventListener("click", (e) => { if (e.target === drawer || e.target.closest("[data-close]")) drawer.close(); });

  const rqForm = $("request-form");
  const rqStatus = $("rq-status");
  const setStatus = (msg, cls) => { rqStatus.textContent = msg; rqStatus.className = "form-status small " + (cls || "muted"); };
  rqForm.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("has-error"));
  rqForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!request.length) { setStatus("Add at least one item first.", "err"); return; }
    let firstBad = null;
    rqForm.querySelectorAll("[required]").forEach((el) => {
      const bad = !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value));
      el.closest(".field").classList.toggle("has-error", bad);
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) { setStatus("Please fill in the required fields.", "err"); firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(rqForm));
    const items = request.map((r) => {
      const p = catalog.find((x) => x.id === r.id);
      return { product: p.name, option: r.option, qty: r.qty };
    });

    if (REQUEST_ENDPOINT) {
      setStatus("Sending…");
      try {
        const res = await fetch(REQUEST_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, items }),
        });
        if (!res.ok) throw new Error(res.statusText);
        request = []; saveRequest(); renderRequest(); rqForm.reset();
        setStatus("Request sent. We'll confirm availability and send your agreement.", "ok");
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
      "",
      `Needed by: ${data.start}`,
      `Rental length: ${data.length}`,
      `Job site: ${data.site}`,
      `Ground: ${data.ground ? GROUND[data.ground].label : "Not sure"}`,
      `Delivery: ${data.delivery}`,
      "",
      "Equipment:",
      ...items.map((it) => `  ${it.qty} × ${it.product}${it.option ? ` (${it.option})` : ""}`),
      "",
      data.notes || "",
    ].join("\n");
    const subject = `Rental request: ${data.business || data.name}`;
    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus("Opening your email app…", "ok");
  });

  // Deep link: shop.html?ground=hard or ?cat=head
  const params = new URLSearchParams(location.search);
  if (GROUND[params.get("ground")]) state.ground = params.get("ground");
  if (CATEGORIES[params.get("cat")]) state.cat = params.get("cat");

  render();
  renderRequest();
})();
