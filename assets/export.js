// Invoice export to a real Excel workbook (.xlsx).
// ExcelJS is only downloaded when someone exports, so normal page loads stay light.
// If it can't be loaded (offline, blocked CDN), we fall back to a CSV that Excel opens too.
(() => {
  const EXCELJS_URL = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
  const { company, CYCLE_DAYS, STATUS } = HBP;

  let loading;
  const loadExcelJS = () => {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    loading = loading || new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = EXCELJS_URL;
      s.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error("ExcelJS missing")));
      s.onerror = () => { loading = null; reject(new Error("Couldn't load ExcelJS")); };
      document.head.append(s);
    });
    return loading;
  };

  // Excel stores dates without a time zone; hand it UTC midnight so the day never shifts.
  const xlDate = (d) => { const x = new Date(d); return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); };
  const isoDay = (d) => xlDate(d).toISOString().slice(0, 10);
  const statusLabel = (s) => (STATUS[s] ? STATUS[s].label : s);

  const invoiceRow = (i) => ({
    no: i.no,
    customer: i.rental.cust.name,
    rental: i.rental.id,
    site: i.rental.site,
    from: xlDate(i.from),
    to: xlDate(i.to),
    issued: xlDate(i.date),
    due: i.status === "scheduled" ? null : xlDate(i.due),
    status: statusLabel(i.status),
    amount: i.amount,
  });

  const lineRows = (invoices) => invoices.flatMap((i) => i.rental.items.map((it) => ({
    no: i.no,
    customer: i.rental.cust.name,
    tag: it.tag || "",
    item: it.name,
    size: it.option || "",
    qty: it.qty,
    rate: it.rate,
    total: it.rate * it.qty,
  })));

  const INVOICE_COLS = [
    { header: "Invoice #", key: "no", width: 15 },
    { header: "Customer", key: "customer", width: 30 },
    { header: "Rental", key: "rental", width: 10 },
    { header: "Job site", key: "site", width: 42 },
    { header: "Period start", key: "from", width: 13, date: true },
    { header: "Period end", key: "to", width: 13, date: true },
    { header: "Issued", key: "issued", width: 13, date: true },
    { header: "Due", key: "due", width: 13, date: true },
    { header: "Status", key: "status", width: 11 },
    { header: "Amount", key: "amount", width: 14, money: true },
  ];
  const LINE_COLS = [
    { header: "Invoice #", key: "no", width: 15 },
    { header: "Customer", key: "customer", width: 30 },
    { header: "Asset tag", key: "tag", width: 14 },
    { header: "Item", key: "item", width: 34 },
    { header: "Size", key: "size", width: 14 },
    { header: "Qty", key: "qty", width: 7 },
    { header: `Rate / ${CYCLE_DAYS} days`, key: "rate", width: 15, money: true },
    { header: "Line total", key: "total", width: 14, money: true },
  ];

  const MONEY = '"$"#,##0.00';
  const DATE = "mmm d, yyyy";

  const addSheet = (wb, name, cols, rows, totalKeys) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map(({ header, key, width }) => ({ header, key, width }));
    rows.forEach((r) => ws.addRow(r));

    cols.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.date) col.numFmt = DATE;
      if (c.money) col.numFmt = MONEY;
      if (c.money || c.key === "qty") col.alignment = { horizontal: "right" };
    });

    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF26262C" } };
    head.alignment = { vertical: "middle" };
    head.height = 20;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

    if (rows.length && totalKeys.length) {
      const last = rows.length + 1;
      const total = ws.addRow({ [cols[0].key]: "Total" });
      totalKeys.forEach((key) => {
        const idx = cols.findIndex((c) => c.key === key) + 1;
        const letter = ws.getColumn(idx).letter;
        total.getCell(idx).value = { formula: `SUBTOTAL(9,${letter}2:${letter}${last})`, result: rows.reduce((s, r) => s + (r[key] || 0), 0) };
      });
      total.font = { bold: true };
      total.border = { top: { style: "thin" } };
    }
    return ws;
  };

  const download = (blob, filename) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const csvFallback = (invoices, filename) => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [INVOICE_COLS.map((c) => q(c.header)).join(",")];
    invoices.map(invoiceRow).forEach((r) => {
      lines.push(INVOICE_COLS.map((c) => (c.date ? (r[c.key] ? isoDay(r[c.key]) : "") : c.money ? r[c.key].toFixed(2) : q(r[c.key]))).join(","));
    });
    // BOM so Excel reads the file as UTF-8.
    download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename.replace(/\.xlsx$/, ".csv"));
  };

  const buildWorkbook = async (invoices) => {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = company.name;
    wb.company = company.name;
    wb.created = new Date();
    addSheet(wb, "Invoices", INVOICE_COLS, invoices.map(invoiceRow), ["amount"]);
    addSheet(wb, "Line items", LINE_COLS, lineRows(invoices), ["total"]);
    return wb;
  };

  // Returns "xlsx" or "csv" so the caller can tell the user what they got.
  const exportInvoices = async (invoices, filename) => {
    const sorted = [...invoices].sort((a, b) => a.date - b.date || a.no.localeCompare(b.no));
    try {
      const wb = await buildWorkbook(sorted);
      const buf = await wb.xlsx.writeBuffer();
      download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
      return "xlsx";
    } catch {
      csvFallback(sorted, filename);
      return "csv";
    }
  };

  const fileName = (label) => `${company.name.replace(/[^A-Za-z]+/g, "-").replace(/-+$/, "")}_${label}_${isoDay(new Date())}.xlsx`;

  HBP.exporter = { exportInvoices, buildWorkbook, fileName };
})();
