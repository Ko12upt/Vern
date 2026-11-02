(() => {
  const { esc, fmtDate, fmtShort, fmtMoney, badge, invoicesFor, nextInvoice, rentalRate, TODAY, addDays, daysBetween, GROUND, CYCLE_DAYS } = HBP;
  const { kpi, isActive, cycleBar, timeline, itemsTable, photoGrid, groundTag, docLinks, docUrl, router, toast } = HBP.ui;
  const { rentals, customers, fleet } = HBP.data;

  const byId = (id) => rentals.find((r) => r.id === id);
  const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
  const allInvoices = () => rentals.flatMap((r) => invoicesFor(r).map((inv) => ({ ...inv, rental: r })));
  const requests = rentals.filter((r) => r.status === "requested");
  document.getElementById("req-count").textContent = requests.length || "";

  const preview = (what) => `data-preview="${esc(what)}"`;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-preview]");
    if (b) toast(`${b.dataset.preview}: this button works once the backend is connected.`);
    const sw = e.target.closest("[data-autosend]");
    if (sw) {
      const r = byId(sw.dataset.autosend);
      r.autoSend = !r.autoSend;
      sw.setAttribute("aria-checked", String(r.autoSend));
      toast(`Auto-send ${r.autoSend ? "on" : "off"} for ${r.id}`);
    }
    const row = e.target.closest("tr[data-href]");
    if (row && !e.target.closest("a, button")) location.hash = row.dataset.href;
  });
  document.addEventListener("input", (e) => {
    if (!e.target.matches("[data-search]")) return;
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(e.target.dataset.search).forEach((tr) => { tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q); });
  });

  const autoSwitch = (r) => `
    <button type="button" class="switch" role="switch" aria-checked="${r.autoSend}" data-autosend="${r.id}" aria-label="Auto-send invoices for ${r.id}"><span></span></button>`;

  const panel = (title, body, extra = "") => `
    <div class="panel">
      <div class="panel-head panel-head-sm"><h3>${title}</h3>${extra}</div>
      ${body}
    </div>`;

  const table = (head, rows, cls = "") => `
    <div class="table-scroll table-flat">
      <table class="data-table compact ${cls}">
        <thead><tr>${head}</tr></thead>
        <tbody>${rows || `<tr><td colspan="12" class="muted">Nothing here.</td></tr>`}</tbody>
      </table>
    </div>`;

  const statusChips = (base, current, opts) => `
    <div class="filter">${opts.map(([key, label, n]) => `
      <a class="chip${current === key ? " is-active" : ""}" href="#${base}${key ? "/" + key : ""}">${label}${n != null ? ` <span class="chip-n">${n}</span>` : ""}</a>`).join("")}
    </div>`;

  // ─── Dashboard ─────────────────────────────────────────
  const dashboard = () => {
    const active = rentals.filter(isActive);
    const unitsOut = fleet.filter((u) => u.status === "out").length;
    const perCycle = active.reduce((s, r) => s + rentalRate(r), 0);
    const window28 = addDays(TODAY, CYCLE_DAYS);
    const upcomingInv = allInvoices().filter((i) => i.status === "scheduled" && i.date <= window28).sort((a, b) => a.date - b.date);
    const next7 = upcomingInv.filter((i) => i.date <= addDays(TODAY, 7));
    const returns = active.filter((r) => r.expectedReturn && r.expectedReturn <= addDays(TODAY, 7));
    const movements = [
      ...rentals.filter((r) => r.status === "reserved").map((r) => ({ date: r.outDate, kind: "Ship", r })),
      ...active.map((r) => ({ date: r.expectedReturn, kind: "Return", r })),
    ].filter((m) => m.date && m.date <= addDays(TODAY, 21)).sort((a, b) => a.date - b.date);
    const inShop = fleet.filter((u) => u.status === "shop");
    const open = allInvoices().filter((i) => i.status === "open");

    return `
      <header class="view-head">
        <div><p class="eyebrow">${fmtDate(TODAY, { weekday: "long", month: "long", day: "numeric" })}</p><h1>Dashboard</h1></div>
        <div class="btn-row">
          <a class="btn btn-ghost btn-sm" href="#listings">Change listings &amp; prices</a>
          <a class="btn btn-primary btn-sm" href="#requests">Review requests (${requests.length})</a>
        </div>
      </header>
      <div class="kpis">
        ${kpi("Machines on rent", `${unitsOut}<small> / ${fleet.filter((u) => u.cat === "machine").length}</small>`, `${active.length} active rentals`)}
        ${kpi("Billing per 28 days", fmtMoney(perCycle), "Active rentals")}
        ${kpi("Invoices next 7 days", next7.length, next7.length ? fmtMoney(next7.reduce((s, i) => s + i.amount, 0)) : "None due")}
        ${kpi("Returns due ≤ 7 days", returns.length, returns.map((r) => r.id).join(", ") || "None", returns.length ? "warn" : "")}
      </div>

      <div class="dash-grid">
        ${panel(`Auto-billing, next ${CYCLE_DAYS} days`, table(
          "<th>Sends</th><th>Invoice</th><th>Customer</th><th class='num'>Amount</th><th>Auto</th>",
          upcomingInv.map((i) => `<tr data-href="rentals/${i.rental.id}">
            <td>${fmtShort(i.date)} <span class="muted small">${daysBetween(TODAY, i.date) === 0 ? "today" : `in ${daysBetween(TODAY, i.date)}d`}</span></td>
            <td class="mono">${i.no}</td><td>${esc(i.rental.cust.name)}</td>
            <td class="num">${fmtMoney(i.amount)}</td><td>${autoSwitch(i.rental)}</td></tr>`).join("")), `<a class="link small" href="#billing">All billing →</a>`)}

        ${panel("Yard schedule", `<ul class="move-list">${movements.map((m) => `
          <li>
            <span class="move-date"><strong>${fmtShort(m.date)}</strong><span class="muted small">${m.date < TODAY ? "overdue" : `in ${daysBetween(TODAY, m.date)}d`}</span></span>
            <span class="move-kind move-${m.kind.toLowerCase()}">${m.kind}</span>
            <a href="#rentals/${m.r.id}" class="move-body"><span>${m.r.id} · ${esc(m.r.cust.name)}</span><span class="muted small">${m.r.items.length} lines · ${esc(m.r.carrier || "")}</span></a>
          </li>`).join("") || '<li class="muted">Nothing scheduled.</li>'}</ul>`)}

        ${panel("Needs attention", `<ul class="attn-list">
          ${requests.map((r) => `<li><span class="status s-warn">Request</span><a href="#requests">${r.id} · ${esc(r.cust.name)} wants equipment by ${fmtShort(r.wantedDate)}</a></li>`).join("")}
          ${inShop.map((u) => `<li><span class="status s-danger">In shop</span><a href="#equipment/shop">${u.tag} · ${esc(u.name)}${u.note ? ` · ${esc(u.note)}` : ""}</a></li>`).join("")}
          ${open.map((i) => `<li><span class="status s-warn">Open</span><a href="#rentals/${i.rental.id}">${i.no} · ${fmtMoney(i.amount)} due ${fmtShort(i.due)}</a></li>`).join("")}
        </ul>`)}

        ${panel("On rent now", table(
          "<th>Rental</th><th>Customer</th><th>Cycle</th><th>Back</th>",
          active.map((r) => `<tr data-href="rentals/${r.id}"><td>${r.id}</td><td>${esc(r.cust.name)}</td>
            <td class="nowrap"><div class="mini-cycle"><span style="width:${(HBP.cycleDay(r) / CYCLE_DAYS) * 100}%"></span></div><span class="muted small">Day ${HBP.cycleDay(r)}</span></td>
            <td>${fmtShort(r.expectedReturn)}</td></tr>`).join("")), `<a class="link small" href="#rentals">All rentals →</a>`)}
      </div>`;
  };

  // ─── Requests ──────────────────────────────────────────
  const requestsView = () => `
    <header class="view-head">
      <div><p class="eyebrow">Incoming</p><h1>Rental requests</h1>
      <p class="muted">Requests from the shop page land here. Approving one reserves the equipment, assigns asset tags and sends the rental agreement to the customer.</p></div>
    </header>
    ${requests.length ? requests.map((r) => `
      <article class="rental-card">
        <header class="rental-head">
          <div>
            <p class="rental-id">${r.id} ${badge(r.status)} ${groundTag(r)}</p>
            <h3>${esc(r.cust.name)}</h3>
            <p class="muted small">${esc(r.site)} · wanted by <strong>${fmtDate(r.wantedDate)}</strong> · received ${fmtShort(r.requested)}</p>
          </div>
          <div class="btn-row">
            <a class="btn btn-ghost btn-sm" href="tel:${r.cust.phone.replace(/\D/g, "")}">Call ${esc(r.cust.contact.split(" ")[0])}</a>
            <button class="btn btn-ghost btn-sm" ${preview("Decline")}>Decline</button>
            <button class="btn btn-primary btn-sm" ${preview("Approve & send agreement")}>Approve &amp; send agreement</button>
          </div>
        </header>
        ${itemsTable(r, { rates: true, tags: false })}
        ${r.groundNote ? `<p class="note"><strong>Ground:</strong> ${esc(r.groundNote)}</p>` : ""}
      </article>`).join("") : '<p class="muted">No open requests.</p>'}`;

  // ─── Rentals ───────────────────────────────────────────
  const rentalsList = (filter) => {
    const groups = { active: rentals.filter(isActive), reserved: rentals.filter((r) => r.status === "reserved"), returned: rentals.filter((r) => r.status === "returned") };
    const list = filter && groups[filter] ? groups[filter] : rentals;
    return `
      <header class="view-head">
        <div><p class="eyebrow">Tracking</p><h1>Rentals</h1></div>
        <button class="btn btn-primary btn-sm" ${preview("New rental")}>+ New rental</button>
      </header>
      <div class="toolbar">
        ${statusChips("rentals", filter || "", [["", "All", rentals.length], ["active", "On rent", groups.active.length], ["reserved", "Reserved", groups.reserved.length], ["returned", "Returned", groups.returned.length]])}
        <input class="search" type="search" placeholder="Search rentals…" data-search="#rentals-table tbody tr">
      </div>
      <div class="panel">${table(
        "<th>Rental</th><th>Customer</th><th>Job site</th><th>Status</th><th>Shipped</th><th>Back</th><th>Next invoice</th><th class='num'>Per 28 days</th>",
        list.map((r) => {
          const next = nextInvoice(r);
          return `<tr data-href="rentals/${r.id}">
            <td><a class="link" href="#rentals/${r.id}">${r.id}</a></td>
            <td>${esc(r.cust.name)}</td>
            <td class="muted truncate">${esc(r.site)}</td>
            <td>${badge(r.status)}</td>
            <td>${r.outDate ? fmtShort(r.outDate) : "—"}</td>
            <td>${r.returnDate ? fmtShort(r.returnDate) : r.expectedReturn ? fmtShort(r.expectedReturn) : "—"}</td>
            <td>${next && r.status !== "requested" ? fmtShort(next.date) : "—"}</td>
            <td class="num">${fmtMoney(rentalRate(r))}</td>
          </tr>`;
        }).join(""), "clickable").replace("<table", '<table id="rentals-table"')}</div>`;
  };

  const primaryAction = {
    requested: "Approve & send agreement",
    reserved: "Mark shipped & send BOL",
    out: "Check in return",
    returning: "Check in return",
    returned: "Close rental",
  };

  const rentalDetail = (id) => {
    const r = byId(id);
    if (!r) return `<p class="muted">Rental ${esc(id)} not found. <a class="link" href="#rentals">Back to rentals</a></p>`;
    const invs = invoicesFor(r);
    return `
      <a class="back-link" href="#rentals">← Rentals</a>
      <header class="view-head">
        <div>
          <p class="rental-id">${r.id} ${badge(r.status)} ${groundTag(r)}</p>
          <h1>${esc(r.cust.name)}</h1>
          <p class="muted">${esc(r.site)}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary btn-sm" ${preview(primaryAction[r.status])}>${primaryAction[r.status]}</button>
        </div>
      </header>
      ${timeline(r)}
      <div class="detail-grid">
        <div class="detail-main">
          ${panel("Equipment", itemsTable(r, { rates: true }), `<button class="link-btn small" ${preview("Edit equipment")}>Edit</button>`)}

          <div class="panel">
            <div class="panel-head panel-head-sm"><h3>Condition photos</h3><span class="muted small">Take them from your phone on the trailer and at check-in</span></div>
            <div class="photo-cols panel-pad">
              <div><p class="sub-title">Check-out · ${r.outDate ? fmtShort(r.outDate) : "not shipped"}</p>${photoGrid(r, "out", { upload: true })}</div>
              <div><p class="sub-title">Return · ${r.returnDate ? fmtShort(r.returnDate) : "not returned"}</p>${photoGrid(r, "in", { upload: isActive(r) || r.status === "returned" })}</div>
            </div>
            <div class="panel-pad panel-pad-top">
              <div class="field">
                <label for="ret-notes">Return inspection notes</label>
                <textarea id="ret-notes" rows="2" placeholder="Damage, missing parts, wear past spec…">${esc(r.returnNotes || "")}</textarea>
              </div>
            </div>
          </div>

          ${panel("Billing schedule", table(
            "<th>Invoice</th><th>Period</th><th>Sends</th><th class='num'>Amount</th><th>Status</th><th></th>",
            invs.map((i) => `<tr>
              <td class="mono">${i.no}</td>
              <td class="muted">${fmtShort(i.from)} – ${fmtShort(i.to)}</td>
              <td>${fmtShort(i.date)}</td>
              <td class="num">${fmtMoney(i.amount)}</td>
              <td>${badge(i.status)}</td>
              <td class="num"><a class="link small" href="${docUrl("invoice", r, i.cycle)}" target="_blank" rel="noopener">${i.status === "scheduled" ? "Preview" : "Print"}</a></td>
            </tr>`).join("")), `<span class="switch-label small muted">Auto-send every ${CYCLE_DAYS} days ${autoSwitch(r)}</span>`)}
        </div>

        <aside class="detail-side">
          ${panel("Documents", `<div class="panel-pad">${docLinks(r, { owner: true })}</div>`)}
          ${panel("Customer", `<dl class="side-dl panel-pad">
            <div><dt>Company</dt><dd>${esc(r.cust.name)}</dd></div>
            <div><dt>Contact</dt><dd>${esc(r.cust.contact)}</dd></div>
            <div><dt>Phone</dt><dd><a class="link" href="tel:${r.cust.phone.replace(/\D/g, "")}">${esc(r.cust.phone)}</a></dd></div>
            <div><dt>Billing email</dt><dd>${esc(r.cust.email)}</dd></div>
          </dl>`)}
          ${panel("Job", `<dl class="side-dl panel-pad">
            <div><dt>Ground</dt><dd>${r.ground ? GROUND[r.ground].label : "—"}${r.groundNote ? `<br><span class="muted small">${esc(r.groundNote)}</span>` : ""}</dd></div>
            <div><dt>Delivery</dt><dd>${esc(r.carrier || "TBD")}</dd></div>
            <div><dt>Shipped</dt><dd>${r.outDate ? fmtDate(r.outDate) : "—"}</dd></div>
            <div><dt>${r.returnDate ? "Returned" : "Expected back"}</dt><dd>${r.returnDate ? fmtDate(r.returnDate) : r.expectedReturn ? fmtDate(r.expectedReturn) : "—"}</dd></div>
          </dl>${cycleBar(r) ? `<div class="panel-pad panel-pad-top">${cycleBar(r)}</div>` : ""}`)}
        </aside>
      </div>`;
  };

  // ─── Equipment ─────────────────────────────────────────
  const equipment = (filter) => {
    const counts = (s) => fleet.filter((u) => u.status === s).length;
    const list = filter ? fleet.filter((u) => u.status === filter) : fleet;
    return `
      <header class="view-head">
        <div><p class="eyebrow">Fleet</p><h1>Equipment</h1><p class="muted">Every tagged unit, where it is, and which rental it's on.</p></div>
        <button class="btn btn-primary btn-sm" ${preview("Add unit")}>+ Add unit</button>
      </header>
      <div class="toolbar">
        ${statusChips("equipment", filter || "", [["", "All", fleet.length], ["yard", "In yard", counts("yard")], ["out", "On rent", counts("out")], ["reserved", "Reserved", counts("reserved")], ["shop", "In shop", counts("shop")]])}
        <input class="search" type="search" placeholder="Search tag or model…" data-search="#fleet-table tbody tr">
      </div>
      <div class="panel">${table(
        "<th>Asset tag</th><th>Unit</th><th>Status</th><th>Location</th><th>Rental</th><th>Last service</th><th></th>",
        list.map((u) => `<tr>
          <td class="mono">${u.tag}</td>
          <td>${esc(u.name)}${u.note ? `<br><span class="muted small">${esc(u.note)}</span>` : ""}</td>
          <td>${badge(u.status)}</td>
          <td class="truncate">${esc(u.location)}${u.spot ? `<span class="muted"> · ${esc(u.spot)}</span>` : ""}${u.moved ? `<br><span class="muted small">Moved ${fmtShort(u.moved)}</span>` : ""}</td>
          <td>${u.rental ? `<a class="link" href="#rentals/${u.rental}">${u.rental}</a>` : "—"}</td>
          <td>${fmtShort(u.lastService)}</td>
          <td class="num">${u.status === "out"
            ? `<span class="muted small" title="Location follows the rental while it's out">At job site</span>`
            : `<button type="button" class="btn btn-ghost btn-sm" data-move="${u.tag}">Move</button>`}</td>
        </tr>`).join("")).replace("<table", '<table id="fleet-table"')}</div>`;
  };

  // ─── Move a unit ───────────────────────────────────────
  const openMove = (tag) => {
    const u = fleet.find((x) => x.tag === tag);
    const places = HBP.settings.places;
    const known = places.includes(u.location);
    const dlg = document.getElementById("easy-dialog");
    dlg.innerHTML = `
      <form method="dialog" class="easy-dialog" id="move-form">
        <h2>Move ${esc(u.tag)}</h2>
        <p class="muted">${esc(u.name)} · now at ${esc(u.location)}${u.spot ? `, ${esc(u.spot)}` : ""}</p>
        <p class="l-label">Where is it now?</p>
        <div class="place-list" role="radiogroup" aria-label="Location">
          ${places.map((p) => `
            <button type="button" role="radio" class="l-check${p === u.location ? " is-on" : ""}" aria-checked="${p === u.location}" data-place="${esc(p)}">
              <span class="l-box" aria-hidden="true"></span><span>${esc(p)}</span>
            </button>`).join("")}
          <button type="button" role="radio" class="l-check${known ? "" : " is-on"}" aria-checked="${!known}" data-place="">
            <span class="l-box" aria-hidden="true"></span><span>Somewhere else…</span>
          </button>
        </div>
        <div class="move-other"${known ? " hidden" : ""}>
          <input class="l-input" id="mv-other" placeholder="Place name, like “Ashland lot”" value="${known ? "" : esc(u.location)}" autocomplete="off">
          <label class="check"><input type="checkbox" id="mv-keep" checked> Save this place for next time</label>
        </div>
        <label class="l-label" for="mv-spot">Spot <span>(optional)</span></label>
        <input class="l-input" id="mv-spot" value="${esc(u.spot || "")}" placeholder="Row C, by the gate" autocomplete="off">
        <p class="wizard-error" id="mv-error" role="alert"></p>
        <div class="dialog-btns">
          <button class="btn btn-ghost btn-sm" value="cancel">Cancel</button>
          <button class="btn btn-primary btn-sm" value="ok">Save location</button>
        </div>
      </form>`;
    const form = dlg.querySelector("form");
    let place = known ? u.location : "";
    form.querySelector(".place-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-place]");
      if (!b) return;
      place = b.dataset.place;
      form.querySelectorAll("[data-place]").forEach((x) => {
        const on = x === b;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-checked", String(on));
      });
      form.querySelector(".move-other").hidden = !!place;
      if (!place) form.querySelector("#mv-other").focus();
    });
    form.addEventListener("submit", (e) => {
      if (e.submitter?.value !== "ok") return;
      const typed = form.querySelector("#mv-other").value.trim();
      const to = place || typed;
      if (!to) { e.preventDefault(); form.querySelector("#mv-error").textContent = "Pick a place or type one in."; return; }
      if (!place && form.querySelector("#mv-keep").checked && !places.includes(typed)) places.push(typed);

      const before = { location: u.location, spot: u.spot, moved: u.moved, saved: HBP.data.moves[tag] };
      const spot = form.querySelector("#mv-spot").value.trim();
      Object.assign(u, { location: to, spot, moved: TODAY });
      HBP.data.moves[tag] = { location: to, spot, moved: TODAY.toISOString() };
      HBP.store.save();
      rerender();
      toast(`${tag} moved to ${to}${spot ? `, ${spot}` : ""}`, {
        action: "Undo",
        onAction: () => {
          Object.assign(u, { location: before.location, spot: before.spot, moved: before.moved });
          if (before.saved) HBP.data.moves[tag] = before.saved; else delete HBP.data.moves[tag];
          HBP.store.save();
          rerender();
        },
      });
    });
    dlg.showModal();
  };

  // ─── Billing ───────────────────────────────────────────
  const billing = (filter) => {
    const all = allInvoices().sort((a, b) => b.date - a.date);
    const list = filter ? all.filter((i) => i.status === filter) : all;
    const n = (s) => all.filter((i) => i.status === s).length;
    return `
      <header class="view-head">
        <div><p class="eyebrow">Billing</p><h1>Invoices</h1></div>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" ${preview("Edit billing settings")}>Billing settings</button>
          <button class="btn btn-primary btn-sm" data-export="${filter || "sent"}">Export to Excel</button>
        </div>
      </header>
      <div class="settings-strip">
        <div><span class="kpi-label">Cycle</span><span>Every ${CYCLE_DAYS} days from ship date</span></div>
        <div><span class="kpi-label">Timing</span><span>Billed in advance</span></div>
        <div><span class="kpi-label">Terms</span><span>Net 15</span></div>
        <div><span class="kpi-label">Delivery</span><span>Emailed as PDF, copy to office</span></div>
      </div>
      <div class="toolbar">
        ${statusChips("billing", filter || "", [["", "All", all.length], ["scheduled", "Scheduled", n("scheduled")], ["open", "Open", n("open")], ["paid", "Paid", n("paid")]])}
        <input class="search" type="search" placeholder="Search invoices…" data-search="#inv-table tbody tr">
      </div>
      <div class="panel">${table(
        "<th>Invoice</th><th>Customer</th><th>Rental</th><th>Period</th><th>Sends / sent</th><th class='num'>Amount</th><th>Status</th><th>Auto</th><th></th>",
        list.map((i) => `<tr>
          <td class="mono">${i.no}</td>
          <td>${esc(i.rental.cust.name)}</td>
          <td><a class="link" href="#rentals/${i.rental.id}">${i.rental.id}</a></td>
          <td class="muted">${fmtShort(i.from)} – ${fmtShort(i.to)}</td>
          <td>${fmtShort(i.date)}</td>
          <td class="num">${fmtMoney(i.amount)}</td>
          <td>${badge(i.status)}</td>
          <td>${i.status === "scheduled" ? autoSwitch(i.rental) : ""}</td>
          <td class="num"><a class="link small" href="${docUrl("invoice", i.rental, i.cycle)}" target="_blank" rel="noopener">${i.status === "scheduled" ? "Preview" : "Print"}</a></td>
        </tr>`).join("")).replace("<table", '<table id="inv-table"')}</div>`;
  };

  // ─── Export to Excel ───────────────────────────────────
  const EXPORT_STATUS = {
    sent: ["Sent (open and paid)", (i) => i.status !== "scheduled"],
    all: ["All invoices", () => true],
    open: ["Open (not paid yet)", (i) => i.status === "open"],
    paid: ["Paid", (i) => i.status === "paid"],
    scheduled: ["Scheduled (not sent yet)", (i) => i.status === "scheduled"],
  };
  const monthStart = (y, m) => new Date(y, m, 1);
  const EXPORT_PERIOD = {
    all: ["All dates", () => true],
    month: ["This month", (d) => d >= monthStart(TODAY.getFullYear(), TODAY.getMonth()) && d < monthStart(TODAY.getFullYear(), TODAY.getMonth() + 1)],
    last: ["Last month", (d) => d >= monthStart(TODAY.getFullYear(), TODAY.getMonth() - 1) && d < monthStart(TODAY.getFullYear(), TODAY.getMonth())],
    q: ["Last 90 days", (d) => d >= addDays(TODAY, -90) && d <= TODAY],
    year: ["This year", (d) => d.getFullYear() === TODAY.getFullYear()],
  };
  const options = (map, sel) => Object.entries(map).map(([k, [label]]) => `<option value="${k}"${k === sel ? " selected" : ""}>${label}</option>`).join("");

  const openExport = (status) => {
    const dlg = document.getElementById("easy-dialog");
    dlg.innerHTML = `
      <form method="dialog" class="easy-dialog" id="export-form">
        <h2>Export invoices to Excel</h2>
        <p class="muted">Pick what you want. You'll get a spreadsheet with every invoice plus a second tab with the equipment on each one.</p>
        <div class="field"><label for="ex-status">Which invoices</label><div class="select"><select id="ex-status">${options(EXPORT_STATUS, EXPORT_STATUS[status] ? status : "sent")}</select></div></div>
        <div class="field"><label for="ex-period">Issued</label><div class="select"><select id="ex-period">${options(EXPORT_PERIOD, "all")}</select></div></div>
        <div class="field"><label for="ex-cust">Customer</label><div class="select"><select id="ex-cust"><option value="">All customers</option>${customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div></div>
        <p class="export-count" id="ex-count"></p>
        <div class="dialog-btns">
          <button class="btn btn-ghost btn-sm" value="cancel">Cancel</button>
          <button class="btn btn-primary btn-sm" value="ok" id="ex-go">Download Excel file</button>
        </div>
      </form>`;
    const form = dlg.querySelector("form");
    const picked = () => {
      const s = EXPORT_STATUS[form.querySelector("#ex-status").value][1];
      const p = EXPORT_PERIOD[form.querySelector("#ex-period").value][1];
      const c = form.querySelector("#ex-cust").value;
      return allInvoices().filter((i) => s(i) && p(i.date) && (!c || i.rental.customer === c));
    };
    const count = () => {
      const list = picked();
      form.querySelector("#ex-count").innerHTML = list.length
        ? `<strong>${list.length}</strong> invoice${list.length === 1 ? "" : "s"} · <strong>${fmtMoney(list.reduce((s, i) => s + i.amount, 0))}</strong>`
        : "No invoices match. Try “All dates”.";
      form.querySelector("#ex-go").disabled = !list.length;
    };
    form.addEventListener("change", count);
    form.addEventListener("submit", async (e) => {
      if (e.submitter?.value !== "ok") return;
      e.preventDefault();
      const btn = form.querySelector("#ex-go");
      btn.disabled = true;
      btn.textContent = "Preparing…";
      const list = picked();
      const kind = await HBP.exporter.exportInvoices(list, HBP.exporter.fileName("Invoices"));
      dlg.close();
      toast(kind === "xlsx"
        ? `Excel file downloaded: ${list.length} invoice${list.length === 1 ? "" : "s"}.`
        : "Couldn't reach the Excel library, so you got a CSV file instead. It opens in Excel too.");
    });
    count();
    dlg.showModal();
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-export]");
    if (b) openExport(b.dataset.export);
    const m = e.target.closest("[data-move]");
    if (m) openMove(m.dataset.move);
  });

  // ─── Customers ─────────────────────────────────────────
  const customersView = () => `
    <header class="view-head">
      <div><p class="eyebrow">Accounts</p><h1>Customers</h1><p class="muted">Each customer gets a renter portal login to see their rentals, photos, invoices and paperwork.</p></div>
      <button class="btn btn-primary btn-sm" ${preview("Invite customer")}>+ Invite customer</button>
    </header>
    <div class="panel">${table(
      "<th>Customer</th><th>Contact</th><th>Phone</th><th>Rentals</th><th class='num'>Open balance</th><th class='num'>Billed to date</th>",
      customers.map((c) => {
        const rs = rentals.filter((r) => r.customer === c.id);
        const invs = rs.flatMap(invoicesFor).filter((i) => i.status !== "scheduled");
        const open = invs.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
        return `<tr>
          <td>${esc(c.name)}<br><span class="muted small">${esc(c.city)}</span></td>
          <td>${esc(c.contact)}<br><span class="muted small">${esc(c.email)}</span></td>
          <td>${esc(c.phone)}</td>
          <td>${rs.map((r) => `<a class="link" href="#rentals/${r.id}">${r.id}</a>`).join(", ")}</td>
          <td class="num">${fmtMoney(open)}</td>
          <td class="num">${fmtMoney(invs.reduce((s, i) => s + i.amount, 0))}</td>
        </tr>`;
      }).join(""))}</div>`;

  router({
    dashboard,
    listings: HBP.listings.view,
    requests: requestsView,
    rentals: (arg) => (arg && arg.startsWith("R-") ? rentalDetail(arg) : rentalsList(arg)),
    equipment,
    billing,
    customers: customersView,
  }, "dashboard");
})();
