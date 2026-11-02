(() => {
  // Preview account. With accounts in place this comes from the signed-in session.
  const CUSTOMER_ID = "C-101";

  const { esc, fmtDate, fmtShort, fmtMoney, badge, invoicesFor, nextInvoice, rentalRate, TODAY, company } = HBP;
  const { kpi, isActive, cycleBar, timeline, itemsTable, photoGrid, groundTag, docLinks, docUrl, router } = HBP.ui;

  const me = HBP.data.customers.find((c) => c.id === CUSTOMER_ID);
  const mine = HBP.data.rentals.filter((r) => r.customer === CUSTOMER_ID);
  const active = mine.filter(isActive);
  const allInvoices = mine.flatMap((r) => invoicesFor(r).map((inv) => ({ ...inv, rental: r })))
    .sort((a, b) => b.date - a.date);

  document.getElementById("acct-initials").textContent = me.contact.split(" ").map((w) => w[0]).join("");
  document.getElementById("acct-name").textContent = me.contact;
  document.getElementById("acct-org").textContent = me.name;

  const rentalCard = (r, { open = false } = {}) => `
    <article class="rental-card">
      <header class="rental-head">
        <div>
          <p class="rental-id">${r.id} ${badge(r.status)} ${groundTag(r)}</p>
          <h3>${esc(r.site)}</h3>
        </div>
        ${isActive(r) ? `<a class="btn btn-ghost btn-sm" href="mailto:${company.email}?subject=${encodeURIComponent(`Return pickup: ${r.id}`)}">Schedule return</a>` : ""}
      </header>
      ${timeline(r)}
      <dl class="rental-meta">
        <div><dt>${r.outDate && r.outDate <= TODAY ? "Shipped" : "Ships"}</dt><dd>${r.outDate ? fmtDate(r.outDate) : "TBD"}</dd></div>
        <div><dt>${r.returnDate ? "Returned" : "Expected back"}</dt><dd>${r.returnDate ? fmtDate(r.returnDate) : r.expectedReturn ? fmtDate(r.expectedReturn) : "TBD"}</dd></div>
        <div><dt>Per 28 days</dt><dd>${fmtMoney(rentalRate(r))}</dd></div>
        <div><dt>Delivery</dt><dd>${esc(r.carrier || "TBD")}</dd></div>
      </dl>
      ${cycleBar(r)}
      <details class="rental-more"${open ? " open" : ""}>
        <summary>Equipment, photos &amp; documents</summary>
        <div class="rental-more-body">
          <p class="sub-title">Equipment</p>
          ${itemsTable(r, { rates: true })}
          <div class="photo-cols">
            <div><p class="sub-title">Condition at check-out</p>${photoGrid(r, "out")}</div>
            <div><p class="sub-title">Condition at return</p>${photoGrid(r, "in")}</div>
          </div>
          ${r.returnNotes ? `<p class="note"><strong>Return notes:</strong> ${esc(r.returnNotes)}</p>` : ""}
          <p class="sub-title">Documents</p>
          ${docLinks(r)}
        </div>
      </details>
    </article>`;

  const invoiceRows = (list) => list.map((inv) => `
    <tr>
      <td class="mono">${inv.no}</td>
      <td>${inv.rental.id}</td>
      <td class="muted">${fmtShort(inv.from)} – ${fmtShort(inv.to)}</td>
      <td>${fmtDate(inv.date)}</td>
      <td>${inv.status === "scheduled" ? "—" : fmtDate(inv.due)}</td>
      <td class="num">${fmtMoney(inv.amount)}</td>
      <td>${badge(inv.status)}</td>
      <td class="num">${inv.status === "scheduled" ? "" : `<a class="link small" href="${docUrl("invoice", inv.rental, inv.cycle)}" target="_blank" rel="noopener">View</a>`}</td>
    </tr>`).join("");

  const invoiceTable = (list) => `
    <div class="panel"><div class="table-scroll">
      <table class="data-table compact">
        <thead><tr><th>Invoice</th><th>Rental</th><th>Period</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${invoiceRows(list)}</tbody>
      </table>
    </div></div>`;

  const views = {
    overview() {
      const open = allInvoices.filter((i) => i.status === "open");
      const balance = open.reduce((s, i) => s + i.amount, 0);
      const nexts = active.map(nextInvoice).filter(Boolean).sort((a, b) => a.date - b.date);
      const units = active.reduce((s, r) => s + r.items.reduce((n, it) => n + it.qty, 0), 0);
      const upcoming = mine.filter((r) => r.status === "reserved" || r.status === "requested");
      return `
        <header class="view-head">
          <div>
            <p class="eyebrow">Welcome back</p>
            <h1>${esc(me.name)}</h1>
          </div>
        </header>
        <div class="kpis">
          ${kpi("Pieces on rent", units, `${active.length} rental${active.length === 1 ? "" : "s"}`)}
          ${kpi("Next invoice", nexts[0] ? fmtShort(nexts[0].date) : "—", nexts[0] ? fmtMoney(nexts[0].amount) : "")}
          ${kpi("Open balance", fmtMoney(balance), `${open.length} open invoice${open.length === 1 ? "" : "s"}`, balance ? "warn" : "")}
          ${kpi("Coming up", upcoming.length, upcoming[0] ? `${upcoming[0].id} ships ${fmtShort(upcoming[0].outDate)}` : "No reservations")}
        </div>
        <section class="view-section">
          <h2 class="view-title">On rent</h2>
          ${active.length ? active.map((r) => rentalCard(r)).join("") : '<p class="muted">Nothing on rent right now.</p>'}
        </section>
        ${upcoming.length ? `<section class="view-section"><h2 class="view-title">Reserved</h2>${upcoming.map((r) => rentalCard(r)).join("")}</section>` : ""}
        <section class="view-section">
          <h2 class="view-title">Recent invoices <a class="link small" href="#invoices">See all →</a></h2>
          ${invoiceTable(allInvoices.slice(0, 4))}
        </section>`;
    },

    rentals() {
      return `
        <header class="view-head"><div><p class="eyebrow">Rentals</p><h1>All rentals</h1></div></header>
        ${mine.map((r) => rentalCard(r)).join("")}`;
    },

    invoices() {
      return `
        <header class="view-head">
          <div>
            <p class="eyebrow">Billing</p>
            <h1>Invoices</h1>
            <p class="muted">Equipment bills in advance every 28 days from the day it ships. Invoices are emailed to ${esc(me.email)} automatically and are due in 15 days.</p>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-export-mine>Export to Excel</button>
        </header>
        ${invoiceTable(allInvoices)}`;
    },

    documents() {
      return `
        <header class="view-head"><div><p class="eyebrow">Paperwork</p><h1>Documents</h1><p class="muted">Agreements, bills of lading, invoices and return slips for every rental. Open one to print or save it as a PDF.</p></div></header>
        <div class="doc-groups">
          ${mine.map((r) => `
            <div class="panel doc-group">
              <div class="panel-head"><div><h3>${r.id} ${badge(r.status)}</h3><p class="muted small">${esc(r.site)}</p></div></div>
              <div class="doc-group-body">${docLinks(r)}</div>
            </div>`).join("")}
        </div>`;
    },
  };

  // Renters export the invoices they've been sent, not ones still scheduled.
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-export-mine]");
    if (!b) return;
    const sent = allInvoices.filter((i) => i.status !== "scheduled");
    b.disabled = true;
    b.textContent = "Preparing…";
    const kind = await HBP.exporter.exportInvoices(sent, HBP.exporter.fileName("Invoices"));
    b.disabled = false;
    b.textContent = "Export to Excel";
    HBP.ui.toast(kind === "xlsx" ? `Excel file downloaded: ${sent.length} invoices.` : "Downloaded as a CSV file. It opens in Excel too.");
  });

  router(views, "overview");
})();
