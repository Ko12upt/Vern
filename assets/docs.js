// Printable rental paperwork: docs.html?type=agreement|invoice|bol|return&r=R-1042[&inv=2]
(() => {
  const { esc, fmtDate, fmtShort, fmtMoney, invoicesFor, rentalRate, GROUND, CYCLE_DAYS, TODAY, company } = HBP;
  const params = new URLSearchParams(location.search);
  const type = params.get("type") || "agreement";
  const r = HBP.data.rentals.find((x) => x.id === params.get("r")) || HBP.data.rentals[0];
  const c = r.cust;
  const invs = invoicesFor(r);
  const inv = invs.find((i) => i.cycle === +params.get("inv")) || invs.filter((i) => i.status !== "scheduled").pop() || invs[0];

  const TITLES = { agreement: "Rental Agreement", invoice: "Invoice", bol: "Bill of Lading", return: "Return Slip" };
  document.title = `${TITLES[type]} ${r.id} — ${company.name}`;

  document.getElementById("doc-tabs").innerHTML = Object.entries(TITLES).map(([k, label]) =>
    `<a class="chip${k === type ? " is-active" : ""}" href="docs.html?type=${k}&r=${r.id}${k === "invoice" && inv ? `&inv=${inv.cycle}` : ""}">${label}</a>`).join("");

  const letterhead = (title, rows) => `
    <header class="lh">
      <div class="lh-brand">
        <svg class="lh-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="7.5"/><circle cx="16" cy="16" r="2.6" class="fill"/><path d="M16 3v5.5M16 23.5V29M3 16h5.5M23.5 16H29"/></svg>
        <div>
          <p class="lh-name">${company.name}</p>
          <p>${company.address.join("<br>")}</p>
          <p>${company.phone} · ${company.email}</p>
        </div>
      </div>
      <div class="lh-doc">
        <h1>${title}</h1>
        <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      </div>
    </header>`;

  const party = (label, lines) => `<div class="party"><p class="party-label">${label}</p>${lines.filter(Boolean).map((l, i) => `<p${i === 0 ? ' class="strong"' : ""}>${l}</p>`).join("")}</div>`;
  const customerParty = (label) => party(label, [esc(c.name), `Attn: ${esc(c.contact)}`, esc(c.city), esc(c.phone), esc(c.email)]);
  const siteParty = (label) => party(label, [esc(r.site), r.ground ? `Ground: ${GROUND[r.ground].label}${r.groundNote ? `, ${esc(r.groundNote)}` : ""}` : ""]);

  const sig = (labels) => `<div class="sigs">${labels.map((l) => `
    <div class="sig"><div class="sig-line"></div><p>${l}</p><div class="sig-line sig-date"></div><p>Date</p></div>`).join("")}</div>`;

  const agreement = () => `
    ${letterhead("Rental Agreement", [["Agreement", r.id], ["Date", fmtDate(r.requested)], ["Ship date", r.outDate ? fmtDate(r.outDate) : "TBD"]])}
    <div class="parties">${party("Owner", [company.name, ...company.address])}${customerParty("Renter")}${siteParty("Job site")}</div>

    <h2>Equipment schedule</h2>
    <table class="doc-table">
      <thead><tr><th>Asset tag</th><th>Description</th><th>Size</th><th class="num">Qty</th><th class="num">Rate / ${CYCLE_DAYS} days</th><th class="num">Amount</th></tr></thead>
      <tbody>${r.items.map((it) => `<tr><td class="mono">${esc(it.tag || "TBA")}</td><td>${esc(it.name)}</td><td>${esc(it.option || "—")}</td><td class="num">${it.qty}</td><td class="num">${fmtMoney(it.rate)}</td><td class="num">${fmtMoney(it.rate * it.qty)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="5">Rent per ${CYCLE_DAYS}-day period</td><td class="num">${fmtMoney(rentalRate(r))}</td></tr></tfoot>
    </table>

    <h2>Terms</h2>
    <ol class="terms">
      <li><strong>Rental period and billing.</strong> Rent is billed in advance in ${CYCLE_DAYS}-day periods beginning on the date the equipment leaves the Owner's yard. An invoice is issued automatically at the start of each period and is due within 15 days. A partial period is billed as a full period.</li>
      <li><strong>Condition.</strong> The equipment is photographed at check-out and again at return. Those photos and the signed bill of lading and return slip record the condition of the equipment and form part of this agreement.</li>
      <li><strong>Care and use.</strong> Renter will use the equipment only at the job site listed above, operate it with qualified personnel, and keep it lubricated and maintained according to the manufacturer's guidance.</li>
      <li><strong>Wear parts.</strong> Normal wear of cutting teeth, roller cones and disc cutters is expected. Cutters worn beyond serviceable limits, broken, or lost down hole are billed at replacement cost.</li>
      <li><strong>Loss and damage.</strong> Renter is responsible for loss, theft and damage beyond normal wear from delivery until the equipment is returned and checked in, and will carry insurance covering the equipment's replacement value.</li>
      <li><strong>Return.</strong> Renter will give the Owner notice before the return date. Rent continues until the equipment is back at the Owner's yard or picked up by the Owner.</li>
    </ol>
    <p class="doc-note screen-only">Placeholder terms for layout. Have the final wording reviewed before use.</p>

    ${sig([`Renter: ${esc(c.contact)}, ${esc(c.name)}`, `Owner: ${company.name}`])}`;

  const invoice = () => {
    if (!inv) return `${letterhead("Invoice", [["Rental", r.id]])}<p>No invoices yet. The first invoice is created on the ship date.</p>`;
    const draft = inv.status === "scheduled";
    return `
      ${letterhead(draft ? "Invoice (draft)" : "Invoice", [["Invoice", inv.no], ["Issued", fmtDate(inv.date)], ["Due", fmtDate(inv.due)], ["Rental", r.id]])}
      <div class="parties">${customerParty("Bill to")}${siteParty("Job site")}
        <div class="party amount-box"><p class="party-label">Amount due</p><p class="amount">${fmtMoney(inv.amount)}</p><p>Due ${fmtDate(inv.due)}</p></div>
      </div>
      <h2>Period ${inv.cycle}: ${fmtDate(inv.from)} – ${fmtDate(inv.to)}</h2>
      <table class="doc-table">
        <thead><tr><th>Asset tag</th><th>Description</th><th>Size</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
        <tbody>${r.items.map((it) => `<tr><td class="mono">${esc(it.tag)}</td><td>${esc(it.name)}</td><td>${esc(it.option || "—")}</td><td class="num">${it.qty}</td><td class="num">${fmtMoney(it.rate)}</td><td class="num">${fmtMoney(it.rate * it.qty)}</td></tr>`).join("")}</tbody>
        <tfoot>
          <tr><td colspan="5">Subtotal</td><td class="num">${fmtMoney(inv.amount)}</td></tr>
          <tr class="grand"><td colspan="5">Total due</td><td class="num">${fmtMoney(inv.amount)}</td></tr>
        </tfoot>
      </table>
      <div class="doc-cols">
        <div><h3>Payment</h3><p>Make checks payable to ${company.name}, ${company.address.join(", ")}. Call ${company.phone} to pay by card or ACH.</p></div>
        <div><h3>Billing</h3><p>Rent is billed in advance every ${CYCLE_DAYS} days from the ship date (${fmtDate(r.outDate)}). Equipment still on rent on ${fmtDate(HBP.addDays(inv.from, CYCLE_DAYS))} starts the next period.</p></div>
      </div>`;
  };

  const bol = () => `
    ${letterhead("Bill of Lading", [["BOL", r.id.replace("R-", "BOL-")], ["Ship date", r.outDate ? fmtDate(r.outDate) : "________"], ["Rental", r.id]])}
    <div class="parties">${party("Shipper", [company.name, ...company.address, company.phone])}${party("Consignee", [esc(c.name), `Attn: ${esc(c.contact)}`, esc(r.site), esc(c.phone)])}${party("Carrier", [esc(r.carrier || "________________"), "Truck / trailer #: ________", "Driver: ________________"])}</div>
    <h2>Shipment</h2>
    <table class="doc-table">
      <thead><tr><th class="num">Pieces</th><th>Description</th><th>Asset tag</th><th>Size</th><th class="num">Est. weight (lb)</th><th class="chk">Loaded</th></tr></thead>
      <tbody>${r.items.map((it) => `<tr><td class="num">${it.qty}</td><td>${esc(it.name)}</td><td class="mono">${esc(it.tag)}</td><td>${esc(it.option || "—")}</td><td class="num blank"></td><td class="chk"><span class="box"></span></td></tr>`).join("")}</tbody>
      <tfoot><tr><td class="num">${r.items.reduce((s, it) => s + it.qty, 0)}</td><td colspan="5">Total pieces</td></tr></tfoot>
    </table>
    <div class="doc-cols">
      <div><h3>Condition at shipment</h3><p>${r.photos.out.length} check-out photo${r.photos.out.length === 1 ? "" : "s"} on file for ${r.id}.</p>
        <p class="checks"><span><span class="box"></span> Good</span><span><span class="box"></span> Noted exceptions below</span></p>
        <div class="write-lines"><span></span><span></span></div></div>
      <div><h3>Special instructions</h3><div class="write-lines"><span></span><span></span><span></span></div></div>
    </div>
    ${sig(["Shipper", "Carrier / driver", "Received by (consignee)"])}`;

  const ret = () => `
    ${letterhead("Return Slip", [["Return", r.id.replace("R-", "RET-")], ["Returned", r.returnDate ? fmtDate(r.returnDate) : "________"], ["Rental", r.id], ["Shipped", r.outDate ? fmtDate(r.outDate) : "—"]])}
    <div class="parties">${customerParty("Returned by")}${siteParty("From job site")}${party("Received at", [company.name, ...company.address])}</div>
    <h2>Equipment received</h2>
    <table class="doc-table">
      <thead><tr><th>Asset tag</th><th>Description</th><th class="num">Out</th><th class="num">Back</th><th class="chk">Good</th><th class="chk">Wear</th><th class="chk">Damage</th></tr></thead>
      <tbody>${r.items.map((it) => `<tr><td class="mono">${esc(it.tag)}</td><td>${esc(it.name)}${it.option ? `, ${esc(it.option)}` : ""}</td><td class="num">${it.qty}</td><td class="num">${r.status === "returned" ? it.qty : ""}</td><td class="chk"><span class="box"></span></td><td class="chk"><span class="box"></span></td><td class="chk"><span class="box"></span></td></tr>`).join("")}</tbody>
    </table>
    <div class="doc-cols">
      <div><h3>Inspection notes</h3>${r.returnNotes ? `<p>${esc(r.returnNotes)}</p>` : '<div class="write-lines"><span></span><span></span><span></span></div>'}</div>
      <div><h3>Photos</h3><p>${r.photos.in.length ? `${r.photos.in.length} return photo${r.photos.in.length === 1 ? "" : "s"} on file, compared against ${r.photos.out.length} check-out photo${r.photos.out.length === 1 ? "" : "s"}.` : "Return photos taken at check-in: ______"}</p>
        <h3>Final billing</h3><p>Rent stops on the return date. Any charges for damage, missing parts or worn cutters will be invoiced separately.</p></div>
    </div>
    ${sig(["Returned by", `Received by, ${company.name}`])}`;

  const builders = { agreement, invoice, bol, return: ret };
  document.getElementById("paper").innerHTML = (builders[type] || agreement)();
})();
