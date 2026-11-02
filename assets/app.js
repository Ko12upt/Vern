// Shared building blocks for the renter portal and the owner back office.
(() => {
  const { esc, fmtDate, fmtShort, fmtMoney, badge, CYCLE_DAYS, TODAY, cycleDay, invoicesFor, nextInvoice, rentalRate, GROUND, daysBetween } = HBP;

  const docUrl = (type, r, inv) => `docs.html?type=${type}&r=${r.id}${inv ? `&inv=${inv}` : ""}`;

  const kpi = (label, value, sub, tone) => `
    <div class="kpi${tone ? ` kpi-${tone}` : ""}">
      <p class="kpi-label">${label}</p>
      <p class="kpi-value">${value}</p>
      ${sub ? `<p class="kpi-sub">${sub}</p>` : ""}
    </div>`;

  const isActive = (r) => r.status === "out" || r.status === "returning";

  const cycleBar = (r) => {
    if (!isActive(r)) return "";
    const day = cycleDay(r);
    const next = nextInvoice(r);
    return `
      <div class="cycle">
        <div class="cycle-top">
          <span class="small">Day <strong>${day}</strong> of ${CYCLE_DAYS}</span>
          <span class="muted small">${next ? `Next invoice ${fmtShort(next.date)}` : ""}</span>
        </div>
        <div class="cycle-bar"><span style="width:${(day / CYCLE_DAYS) * 100}%"></span></div>
      </div>`;
  };

  const STEPS = ["Requested", "Agreement", "Shipped", "On rent", "Returned"];
  const stepIndex = { requested: 0, reserved: 1, out: 3, returning: 3, returned: 4 };
  const timeline = (r) => {
    const at = stepIndex[r.status];
    const dates = [r.requested, r.status !== "requested" ? r.requested : null, r.outDate && r.outDate <= TODAY ? r.outDate : null, r.outDate && r.outDate <= TODAY ? r.outDate : null, r.returnDate];
    return `<ol class="steps">${STEPS.map((s, i) => `
      <li class="${i < at || r.status === "returned" ? "is-done" : i === at ? "is-current" : ""}">
        <span class="step-dot"></span>
        <span class="step-label">${s}</span>
        <span class="step-date">${dates[i] && i <= at ? fmtShort(dates[i]) : ""}</span>
      </li>`).join("")}</ol>`;
  };

  const itemsTable = (r, { rates = false, tags = true } = {}) => `
    <div class="table-scroll table-flat">
      <table class="data-table compact">
        <thead><tr>${tags ? "<th>Asset tag</th>" : ""}<th>Item</th><th>Size</th><th class="num">Qty</th>${rates ? '<th class="num">Rate / 28 days</th><th class="num">Line</th>' : ""}</tr></thead>
        <tbody>${r.items.map((it) => `
          <tr>
            ${tags ? `<td class="mono">${esc(it.tag || "Unassigned")}</td>` : ""}
            <td>${esc(it.name)}</td>
            <td class="muted">${esc(it.option || "—")}</td>
            <td class="num">${it.qty}</td>
            ${rates ? `<td class="num">${fmtMoney(it.rate)}</td><td class="num">${fmtMoney(it.rate * it.qty)}</td>` : ""}
          </tr>`).join("")}
        </tbody>
        ${rates ? `<tfoot><tr><td colspan="${tags ? 5 : 4}">Total per 28-day period</td><td class="num">${fmtMoney(rentalRate(r))}</td></tr></tfoot>` : ""}
      </table>
    </div>`;

  // Photos: owner can attach from phone camera or files. Nothing is uploaded yet;
  // picked images show as local previews until the backend exists.
  const photoGrid = (r, phase, { upload = false } = {}) => {
    const list = r.photos[phase];
    const tiles = list.map((p, i) => `
      <button type="button" class="photo" data-photo="${r.id}|${phase}|${i}">
        <img src="${p.src}" alt="${esc(p.caption)}" loading="lazy">
        <span class="photo-cap">${esc(p.caption)}</span>
        ${p.local ? '<span class="photo-flag">Not saved</span>' : ""}
      </button>`).join("");
    const add = upload ? `
      <label class="photo photo-add">
        <input type="file" accept="image/*" capture="environment" multiple data-upload="${r.id}|${phase}">
        <span class="photo-plus" aria-hidden="true">+</span>
        <span class="small">Add photos</span>
      </label>` : "";
    const empty = !list.length && !upload
      ? `<p class="muted small photo-empty">${phase === "out" ? "Check-out photos will appear here when the equipment ships." : "Return photos will appear here after check-in."}</p>` : "";
    return `<div class="photos">${tiles}${add}</div>${empty}`;
  };

  const groundTag = (r) => r.ground ? `<span class="gbadge g-${r.ground}">${GROUND[r.ground].label}</span>` : "";

  const docLinks = (r, { owner = false } = {}) => {
    const invs = invoicesFor(r).filter((i) => i.status !== "scheduled");
    const latest = invs[invs.length - 1];
    const links = [];
    if (r.status !== "requested") links.push(["agreement", "Rental agreement"]);
    if (r.status !== "requested" && (owner || r.outDate <= TODAY)) links.push(["bol", "Bill of lading"]);
    if (latest) links.push(["invoice", `Invoice ${latest.no}`, latest.cycle]);
    if (r.status === "returned" || (owner && isActive(r))) links.push(["return", "Return slip"]);
    if (!links.length) return `<p class="muted small">Documents are created once the request is approved.</p>`;
    return `<div class="doc-links">${links.map(([t, label, inv]) => `
      <a class="doc-link" href="${docUrl(t, r, inv)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z M9.5 1.5V5H13"/></svg>${label}
      </a>`).join("")}</div>`;
  };

  // ─── Toast ─────────────────────────────────────────────
  let toastTimer;
  // toast("Saved") or toast("Removed", { action: "Undo", onAction: fn })
  const toast = (msg, { action, onAction } = {}) => {
    const t = document.getElementById("toast");
    t.textContent = msg;
    if (action) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toast-action";
      b.textContent = action;
      b.addEventListener("click", () => { t.hidden = true; onAction(); });
      t.append(b);
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 8000 : 3200);
  };

  // ─── Lightbox + photo uploads (delegated) ──────────────
  document.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-photo]");
    if (!tile) return;
    const [rid, phase, i] = tile.dataset.photo.split("|");
    const p = HBP.data.rentals.find((r) => r.id === rid).photos[phase][+i];
    const lb = document.getElementById("lightbox");
    lb.querySelector("img").src = p.src;
    lb.querySelector("img").alt = p.caption;
    lb.querySelector(".lightbox-cap").textContent = `${rid} · ${phase === "out" ? "Check-out" : "Return"} · ${p.caption}`;
    lb.showModal();
  });
  document.addEventListener("DOMContentLoaded", () => {
    const lb = document.getElementById("lightbox");
    if (lb) lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".lightbox-close")) lb.close(); });
  });
  document.addEventListener("change", (e) => {
    const input = e.target.closest("[data-upload]");
    if (!input) return;
    const [rid, phase] = input.dataset.upload.split("|");
    const r = HBP.data.rentals.find((x) => x.id === rid);
    [...input.files].forEach((f) => r.photos[phase].push({ src: URL.createObjectURL(f), caption: f.name, local: true }));
    toast(`${input.files.length} photo${input.files.length === 1 ? "" : "s"} added to ${rid}. Saving turns on once the backend is connected.`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

  // ─── Hash router ───────────────────────────────────────
  const router = (views, fallback) => {
    const main = document.getElementById("view");
    const nav = document.querySelector(".app-nav");
    const go = (e) => {
      if (e && e.isTrusted) window.scrollTo(0, 0);
      const [key, arg] = location.hash.replace(/^#/, "").split("/");
      const view = views[key] ? key : fallback;
      main.innerHTML = views[view](arg ? decodeURIComponent(arg) : undefined);
      nav.querySelectorAll("[data-view]").forEach((a) => a.classList.toggle("is-current", a.dataset.view === view));
    };
    window.addEventListener("hashchange", go);
    go();
  };

  HBP.ui = { docUrl, kpi, isActive, cycleBar, timeline, itemsTable, photoGrid, groundTag, docLinks, toast, router, daysBetween };
})();
