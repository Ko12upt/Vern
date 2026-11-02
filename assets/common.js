// Shared helpers for the shop, portal, back office and printable documents.
// Everything here is static for now; when the backend exists, swap HBP.data
// for API calls and keep the helpers.
(() => {
  const DAY = 86400000;
  const CYCLE_DAYS = 28;

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const TODAY = startOfDay(new Date());
  const addDays = (d, n) => new Date(startOfDay(d).getTime() + n * DAY);
  const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

  const fmtDate = (d, opts) => new Date(d).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
  const fmtShort = (d) => fmtDate(d, { month: "short", day: "numeric" });
  const fmtMoney = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const GROUND = {
    dirt:   { label: "Dirt",        hint: "Clay, sand, loam, gravel" },
    mixed:  { label: "Mixed",       hint: "Dirt with cobbles, boulders or rock seams" },
    soft:   { label: "Soft rock",   hint: "Shale, sandstone, soft limestone · under 8,000 PSI" },
    medium: { label: "Medium rock", hint: "Limestone, dolomite · 8,000–18,000 PSI" },
    hard:   { label: "Hard rock",   hint: "Granite, basalt, quartzite · over 18,000 PSI" },
  };

  const CATEGORIES = {
    machine:   "Boring machines",
    auger:     "Augers",
    head:      "Cutting heads",
    accessory: "Tooling & accessories",
  };

  // Rentals bill in advance, every 28 days from the ship date.
  const rentalRate = (r) => r.items.reduce((sum, it) => sum + it.rate * it.qty, 0);

  const invoicesFor = (r) => {
    if (!r.outDate) return [];
    const list = [];
    for (let i = 0; ; i++) {
      const date = addDays(r.outDate, i * CYCLE_DAYS);
      if (r.returnDate && date >= startOfDay(r.returnDate)) break;
      const isFuture = date > TODAY;
      const due = addDays(date, 15);
      const status = date > TODAY ? "scheduled" : due < TODAY ? "paid" : "open";
      list.push({
        no: `${r.id.replace("R-", "INV-")}-${String(i + 1).padStart(2, "0")}`,
        cycle: i + 1, date, due, status,
        from: date, to: addDays(date, CYCLE_DAYS - 1),
        amount: rentalRate(r),
      });
      if (isFuture) break;
    }
    return list;
  };

  const nextInvoice = (r) => invoicesFor(r).find((inv) => inv.status === "scheduled");
  const cycleDay = (r) => r.outDate ? (daysBetween(r.outDate, r.returnDate || TODAY) % CYCLE_DAYS) + 1 : 0;

  const STATUS = {
    requested: { label: "Requested", cls: "s-warn" },
    reserved:  { label: "Reserved",  cls: "s-info" },
    out:       { label: "On rent",   cls: "s-ok" },
    returning: { label: "Return due", cls: "s-warn" },
    returned:  { label: "Returned",  cls: "s-muted" },
    paid:      { label: "Paid",      cls: "s-muted" },
    open:      { label: "Open",      cls: "s-warn" },
    scheduled: { label: "Scheduled", cls: "s-info" },
    yard:      { label: "In yard",   cls: "s-ok" },
    shop:      { label: "In shop",   cls: "s-danger" },
  };
  const badge = (key) => { const s = STATUS[key] || { label: key, cls: "s-muted" }; return `<span class="status ${s.cls}">${s.label}</span>`; };

  // Shared header bits: mobile nav + footer year.
  document.addEventListener("DOMContentLoaded", () => {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.getElementById("nav");
    if (toggle && nav) {
      const setOpen = (open) => { nav.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); };
      toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
      nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    }
  });

  window.HBP = {
    DAY, CYCLE_DAYS, TODAY, addDays, daysBetween, fmtDate, fmtShort, fmtMoney, esc,
    GROUND, CATEGORIES, STATUS, badge, rentalRate, invoicesFor, nextInvoice, cycleDay,
  };
})();
