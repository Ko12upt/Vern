// "My Listings" in the back office: add, change, hide or delete what's in the shop.
// Built for someone who rarely uses a computer: one question per screen when adding,
// big buttons, plain words, and Undo after anything destructive.
(() => {
  const { esc, fmtMoney, GROUND, CYCLE_DAYS } = HBP;
  const listings = HBP.data.catalog;

  const KINDS = {
    machine:   { label: "Boring machine",     hint: "A whole machine",             img: "assets/img/hero.jpg",         example: "American Augers 36″-600" },
    auger:     { label: "Augers",             hint: "Auger sections",              img: "assets/img/augers.jpg",       example: "Augers, 4″ hex" },
    head:      { label: "Cutting head",       hint: "Dirt, rock or combo head",    img: "assets/img/cutting-head.jpg", example: "Rock head, carbide-insert cones" },
    accessory: { label: "Tool or accessory",  hint: "Track, adapters, saddles…",   img: "assets/img/accessories.jpg",  example: "Casing pusher adapter" },
  };
  const PER_SECTION = "per 10′ section";

  const ui = () => HBP.ui;
  const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
  const save = () => { if (!HBP.store.save()) ui().toast("Couldn't save on this computer. Try a smaller photo."); };
  const find = (id) => listings.find((p) => p.id === id);
  const priceText = (p) => (p.rate ? `${fmtMoney(p.rate)}` : "Call for price");
  const priceSub = (p) => (p.rate ? `every ${CYCLE_DAYS} days${p.unit ? `, ${p.unit}` : ""}` : "You quote it on the phone");

  // ─── Wizard state ──────────────────────────────────────
  let draft = null;     // the listing being added or changed
  let mode = "add";     // "add" | "edit"
  let step = 0;
  let listFilter = "all";

  const blank = () => ({ id: "", cat: "", name: "", size: "", img: "", rate: "", quoted: false, unit: "", options: [], ground: [], blurb: "", hidden: false });
  const fromListing = (p) => ({ ...blank(), ...p, rate: p.rate || "", quoted: !p.rate, options: [...(p.options || [])], ground: [...(p.ground || [])], size: p.size || "" });

  const stepsFor = (cat) => [
    ...(mode === "add" ? ["kind"] : []),
    "name", "photo", "price",
    ...(cat && cat !== "machine" ? ["sizes"] : []),
    ...(cat === "head" ? ["ground"] : []),
    ...(mode === "add" ? ["review"] : ["about"]),
  ];

  // Each step: a question and its big controls. Returns an error message or "".
  const STEPS = {
    kind: {
      title: "What are you adding?",
      body: () => `<div class="kind-grid">${Object.entries(KINDS).map(([k, v]) => `
        <button type="button" class="kind${draft.cat === k ? " is-picked" : ""}" data-l="kind" data-v="${k}">
          <img src="${v.img}" alt="">
          <span class="kind-label">${v.label}</span>
          <span class="kind-hint">${v.hint}</span>
        </button>`).join("")}</div>`,
      check: () => (draft.cat ? "" : "Tap one of the pictures."),
    },
    name: {
      title: "What's it called?",
      help: "This is the name customers see in the shop.",
      body: () => `
        <input class="l-input" data-f="name" value="${esc(draft.name)}" placeholder="Example: ${esc(KINDS[draft.cat]?.example || "")}" autocomplete="off">
        ${draft.cat === "machine" ? `
          <label class="l-label" for="l-size">What size machine is it? <span>(inches)</span></label>
          <div class="l-input-wrap is-short"><input id="l-size" class="l-input" data-f="size" type="number" inputmode="numeric" min="1" value="${esc(draft.size)}" placeholder="36"><span class="l-suffix">″</span></div>` : ""}`,
      check: () => (!draft.name.trim() ? "Type a name first." : draft.cat === "machine" && !(+draft.size > 0) ? "Type the machine size, like 36." : ""),
    },
    photo: {
      title: "Add a picture",
      help: "Take one with your phone or pick one you already have. You can skip this.",
      body: () => `
        <div class="photo-pick">
          <img src="${draft.img || KINDS[draft.cat]?.img || ""}" alt="" class="photo-pick-img${draft.img ? "" : " is-stock"}">
          <div class="photo-pick-actions">
            <label class="btn btn-primary btn-sm">
              <input type="file" accept="image/*" capture="environment" data-l="photo" hidden>
              ${draft.img ? "Use a different picture" : "Take or choose a picture"}
            </label>
            ${draft.img ? `<button type="button" class="btn btn-ghost btn-sm" data-l="photo-clear">Remove picture</button>` : `<p class="muted">No picture yet. We'll use a stock photo for now.</p>`}
          </div>
        </div>`,
      check: () => "",
    },
    price: {
      title: `How much for ${CYCLE_DAYS} days?`,
      help: () => `Customers are billed this amount every ${CYCLE_DAYS} days they keep it.${draft.cat === "auger" || draft.unit === PER_SECTION ? " For augers and track, this is the price for each 10-foot section." : ""}`,
      body: () => `
        <div class="l-input-wrap${draft.quoted ? " is-off" : ""}"><span class="l-prefix">$</span>
          <input class="l-input" data-f="rate" type="number" inputmode="decimal" min="0" step="1" value="${draft.quoted ? "" : esc(draft.rate)}" placeholder="0" ${draft.quoted ? "disabled" : ""}>
        </div>
        <button type="button" class="l-check${draft.quoted ? " is-on" : ""}" data-l="quoted" aria-pressed="${draft.quoted}">
          <span class="l-box" aria-hidden="true"></span> No set price. I'll quote it on the phone.
        </button>`,
      check: () => (draft.quoted || +draft.rate > 0 ? "" : "Type a price, or tap “No set price”."),
    },
    sizes: {
      title: "What sizes do you have?",
      help: "Type a size and tap Add. Customers pick from these.",
      body: () => `
        <div class="size-chips">${draft.options.length ? draft.options.map((o, i) => `
          <span class="size-chip">${esc(o)}<button type="button" data-l="size-remove" data-v="${i}" aria-label="Remove ${esc(o)}">×</button></span>`).join("") : '<p class="muted">No sizes yet. That\'s fine if it only comes in one size.</p>'}
        </div>
        <div class="size-add">
          <input class="l-input" id="l-size-new" placeholder='Example: 24″' autocomplete="off">
          <button type="button" class="btn btn-primary btn-sm" data-l="size-add">Add</button>
        </div>`,
      check: () => "",
    },
    ground: {
      title: "What ground is it good for?",
      help: "Tap every one that fits. The shop uses this to suggest the right head.",
      body: () => `<div class="ground-pick">${Object.entries(GROUND).map(([k, g]) => `
        <button type="button" class="l-check g-${k}${draft.ground.includes(k) ? " is-on" : ""}" data-l="ground" data-v="${k}" aria-pressed="${draft.ground.includes(k)}">
          <span class="l-box" aria-hidden="true"></span>
          <span><strong>${g.label}</strong><span class="muted small">${g.hint}</span></span>
        </button>`).join("")}</div>`,
      check: () => (draft.ground.length ? "" : "Tap at least one."),
    },
    about: {
      title: "Anything else customers should know?",
      help: "Optional. One or two sentences is plenty.",
      body: () => `<textarea class="l-input l-text" data-f="blurb" rows="3" placeholder="Example: Ships with one 10′ track section.">${esc(draft.blurb)}</textarea>`,
      check: () => "",
    },
    review: {
      title: "Look right?",
      help: "This is how it will show in your shop.",
      body: () => `
        <div class="review">
          ${previewCard(draft)}
          <div class="review-side">
            <label class="l-label" for="l-blurb">Anything else customers should know? <span>(optional)</span></label>
            <textarea id="l-blurb" class="l-input l-text" data-f="blurb" rows="3" placeholder="Example: Ships with one 10′ track section.">${esc(draft.blurb)}</textarea>
            <p class="muted">Want to fix something? Tap <strong>Back</strong>.</p>
          </div>
        </div>`,
      check: () => "",
    },
  };

  const helpText = (s) => (typeof s.help === "function" ? s.help() : s.help);

  const previewCard = (d) => `
    <article class="product product-preview">
      <div class="product-media"><img src="${d.img || KINDS[d.cat]?.img || ""}" alt=""></div>
      <div class="product-body">
        <p class="eyebrow">${HBP.CATEGORIES[d.cat] || ""}</p>
        <h3>${esc(d.name || "Your listing")}</h3>
        <p class="muted small product-meta">${d.cat === "machine" ? `${esc(d.size)}″ class` : d.options.length ? `${d.options.length} size${d.options.length === 1 ? "" : "s"} · ${d.options.map(esc).join(", ")}` : ""}</p>
        ${d.ground.length ? `<div class="gbadges">${d.ground.map((g) => `<span class="gbadge g-${g}">${GROUND[g].label}</span>`).join("")}</div>` : ""}
      </div>
      <div class="product-foot"><span class="small">${d.quoted || !+d.rate ? "Call for price" : `${fmtMoney(+d.rate)} / ${CYCLE_DAYS} days`}</span></div>
    </article>`;

  // ─── Saving ────────────────────────────────────────────
  const commit = () => {
    const p = {
      ...(mode === "edit" ? find(draft.id) : {}),
      id: draft.id || `x${Date.now().toString(36)}`,
      cat: draft.cat,
      name: draft.name.trim(),
      img: draft.img || KINDS[draft.cat].img,
      rate: draft.quoted ? 0 : Math.round(+draft.rate),
      blurb: draft.blurb.trim(),
      hidden: draft.hidden,
    };
    if (draft.cat === "machine") p.size = +draft.size; else delete p.size;
    if (draft.options.length) p.options = [...draft.options]; else delete p.options;
    if (draft.cat === "head") p.ground = [...draft.ground]; else delete p.ground;
    if (!p.unit && (draft.cat === "auger")) p.unit = PER_SECTION;
    if (draft.quoted) p.unit = "quoted per job";
    else if (p.unit === "quoted per job") delete p.unit;
    p.specs = p.specs || {};

    if (mode === "edit") listings.splice(listings.findIndex((x) => x.id === p.id), 1, p);
    else listings.unshift(p);
    save();
    const verb = mode === "edit" ? "Saved" : "Added to your shop";
    draft = null;
    location.hash = "listings";
    ui().toast(`${verb}: ${p.name}`);
  };

  // ─── Views ─────────────────────────────────────────────
  const listView = () => {
    const counts = { all: listings.length };
    listings.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    const tabs = [["all", "Everything"], ["machine", "Machines"], ["auger", "Augers"], ["head", "Heads"], ["accessory", "Tools"]];
    const list = listFilter === "all" ? listings : listings.filter((p) => p.cat === listFilter);
    const hiddenCount = listings.filter((p) => p.hidden).length;
    const showPrices = HBP.settings.showPrices;

    return `
      <div class="easy">
        <header class="view-head">
          <div>
            <p class="eyebrow">Your shop</p>
            <h1>My Listings</h1>
            <p class="muted">Everything customers can rent on your website. ${hiddenCount ? `${hiddenCount} hidden.` : ""}</p>
          </div>
          <a class="btn btn-primary btn-sm" href="#listings/new">+ Add something new</a>
        </header>

        <div class="easy-setting">
          <div>
            <p class="easy-setting-q">Show prices on the website?</p>
            <p class="muted">${showPrices ? "Customers see your prices." : "Customers see “Rate on request” and have to call."}</p>
          </div>
          <div class="yes-no" role="radiogroup" aria-label="Show prices on the website">
            <button type="button" role="radio" aria-checked="${showPrices}" class="${showPrices ? "is-on" : ""}" data-l="prices" data-v="1">Yes</button>
            <button type="button" role="radio" aria-checked="${!showPrices}" class="${!showPrices ? "is-on" : ""}" data-l="prices" data-v="0">No</button>
          </div>
        </div>

        <div class="toolbar">
          <div class="filter">${tabs.map(([k, label]) => `
            <button type="button" class="chip${listFilter === k ? " is-active" : ""}" data-l="filter" data-v="${k}">${label} <span class="chip-n">${counts[k] || 0}</span></button>`).join("")}
          </div>
          <input class="search" type="search" placeholder="Find a listing…" data-search=".listing">
        </div>

        <div class="listing-list">${list.map((p) => `
          <article class="listing${p.hidden ? " is-hidden-item" : ""}">
            <a class="listing-photo" href="#listings/edit-${p.id}"><img src="${p.img}" alt="" loading="lazy"></a>
            <div class="listing-info">
              <a class="listing-name" href="#listings/edit-${p.id}">${esc(p.name)}</a>
              <p class="muted">${HBP.CATEGORIES[p.cat]}${p.options ? ` · ${p.options.length} size${p.options.length === 1 ? "" : "s"}` : ""}</p>
              ${p.hidden ? '<span class="status s-muted">Hidden from shop</span>' : '<span class="status s-ok">In your shop</span>'}
            </div>
            <div class="listing-side">
              <p class="listing-price"><span class="listing-amount">${priceText(p)}</span> <span class="muted small">${priceSub(p)}</span></p>
              <div class="listing-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-l="price" data-v="${p.id}">Change price</button>
              <a class="btn btn-ghost btn-sm" href="#listings/edit-${p.id}">Change details</a>
              <button type="button" class="btn btn-ghost btn-sm" data-l="hide" data-v="${p.id}">${p.hidden ? "Show in shop" : "Hide from shop"}</button>
              <button type="button" class="btn btn-danger btn-sm" data-l="delete" data-v="${p.id}">Delete</button>
              </div>
            </div>
          </article>`).join("") || '<p class="muted">Nothing here yet.</p>'}
        </div>

        <p class="easy-foot muted small">Preview mode: changes are saved on this computer only. <button type="button" class="link-btn" data-l="reset">Start over with the sample listings</button></p>
      </div>`;
  };

  const wizardView = () => {
    const steps = stepsFor(draft.cat);
    const key = steps[step];
    const s = STEPS[key];
    const last = step === steps.length - 1;
    return `
      <div class="easy wizard">
        <a class="back-link" href="#listings">← Back to My Listings</a>
        <div class="wizard-progress" aria-label="Step ${step + 1} of ${steps.length}">
          ${steps.map((_, i) => `<span class="${i < step ? "is-done" : i === step ? "is-current" : ""}"></span>`).join("")}
        </div>
        <p class="eyebrow wizard-count">Step ${step + 1} of ${steps.length}</p>
        <h1 class="wizard-q">${s.title}</h1>
        ${helpText(s) ? `<p class="wizard-help">${helpText(s)}</p>` : ""}
        <div class="wizard-body">${s.body()}</div>
        <p class="wizard-error" id="wizard-error" role="alert"></p>
        <div class="wizard-nav">
          ${step > 0 ? `<button type="button" class="btn btn-ghost btn-sm" data-l="back">← Back</button>` : "<span></span>"}
          ${key === "kind" ? "" : `<button type="button" class="btn btn-primary btn-sm" data-l="${last ? "finish" : "next"}">${last ? "Put it in my shop ✓" : "Next →"}</button>`}
        </div>
      </div>`;
  };

  const editView = () => {
    const steps = stepsFor(draft.cat);
    return `
      <div class="easy wizard wizard-edit">
        <a class="back-link" href="#listings">← Back to My Listings</a>
        <header class="view-head">
          <div><p class="eyebrow">Change details</p><h1>${esc(find(draft.id)?.name || draft.name)}</h1></div>
        </header>
        ${steps.map((key, i) => `
          <section class="edit-block" data-step="${key}">
            <h2 class="wizard-q"><span class="edit-num">${i + 1}</span>${STEPS[key].title}</h2>
            ${helpText(STEPS[key]) ? `<p class="wizard-help">${helpText(STEPS[key])}</p>` : ""}
            <div class="wizard-body">${STEPS[key].body()}</div>
          </section>`).join("")}
        <p class="wizard-error" id="wizard-error" role="alert"></p>
        <div class="wizard-nav wizard-nav-sticky">
          <a class="btn btn-ghost btn-sm" href="#listings">Cancel</a>
          <button type="button" class="btn btn-primary btn-sm" data-l="finish">Save changes ✓</button>
        </div>
        <section class="danger-zone">
          <h2>Remove this listing</h2>
          <div class="danger-row">
            <div><strong>${draft.hidden ? "Put it back in the shop" : "Hide it for now"}</strong><p class="muted">${draft.hidden ? "Customers will see it again." : "Customers won't see it, but you keep everything. Good if it's broken or sold out."}</p></div>
            <button type="button" class="btn btn-ghost btn-sm" data-l="hide" data-v="${draft.id}">${draft.hidden ? "Show in shop" : "Hide from shop"}</button>
          </div>
          <div class="danger-row">
            <div><strong>Delete it for good</strong><p class="muted">Only if you sold it or don't carry it anymore.</p></div>
            <button type="button" class="btn btn-danger btn-sm" data-l="delete" data-v="${draft.id}">Delete</button>
          </div>
        </section>
      </div>`;
  };

  const view = (arg) => {
    if (arg === "new") {
      if (!draft || mode !== "add") { draft = blank(); mode = "add"; step = 0; }
      return wizardView();
    }
    if (arg && arg.startsWith("edit-")) {
      const p = find(arg.slice(5));
      if (!p) return `<p class="muted">That listing is gone. <a class="link" href="#listings">Back to My Listings</a></p>`;
      if (!draft || mode !== "edit" || draft.id !== p.id) { draft = fromListing(p); mode = "edit"; }
      return editView();
    }
    draft = null;
    return listView();
  };

  // ─── Dialog (change price, confirm delete) ─────────────
  const dialog = (html, onOk) => {
    const d = document.getElementById("easy-dialog");
    d.innerHTML = `<form method="dialog" class="easy-dialog">${html}</form>`;
    d.querySelector("form").addEventListener("submit", (e) => {
      if (e.submitter?.value === "ok" && onOk(d) === false) e.preventDefault();
    });
    d.showModal();
    d.querySelector("[autofocus]")?.focus();
  };

  const showError = (msg) => {
    const el = document.getElementById("wizard-error");
    if (el) { el.textContent = msg; if (msg) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  };

  const go = (n) => { step = n; rerender(); window.scrollTo(0, 0); };

  const addSize = () => {
    const input = document.getElementById("l-size-new");
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    if (!draft.options.includes(v)) draft.options.push(v);
    rerender();
    document.getElementById("l-size-new")?.focus();
  };

  // ─── Events ────────────────────────────────────────────
  document.addEventListener("input", (e) => {
    const f = e.target.dataset?.f;
    if (!f || !draft) return;
    draft[f] = e.target.value;
    showError("");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !draft) return;
    if (e.target.id === "l-size-new") { e.preventDefault(); addSize(); return; }
    if (e.target.classList.contains("l-input") && e.target.tagName === "INPUT" && mode === "add") {
      e.preventDefault();
      document.querySelector('[data-l="next"], [data-l="finish"]')?.click();
    }
  });

  document.addEventListener("change", async (e) => {
    if (e.target.dataset?.l !== "photo") return;
    const file = e.target.files[0];
    if (!file) return;
    draft.img = await shrink(file);
    rerender();
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-l]");
    if (!b || b.tagName === "INPUT") return;
    const act = b.dataset.l, v = b.dataset.v;
    const steps = draft ? stepsFor(draft.cat) : [];

    switch (act) {
      case "kind":
        draft.cat = v;
        if (v === "auger" && !draft.unit) draft.unit = PER_SECTION;
        go(step + 1);
        break;
      case "next": {
        const err = STEPS[steps[step]].check();
        if (err) showError(err); else go(step + 1);
        break;
      }
      case "back": go(Math.max(0, step - 1)); break;
      case "finish": {
        const bad = steps.map((k) => [k, STEPS[k].check()]).find(([, err]) => err);
        if (bad) {
          if (mode === "add") { step = steps.indexOf(bad[0]); rerender(); }
          showError(bad[1]);
          document.querySelector(`[data-step="${bad[0]}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        } else commit();
        break;
      }
      case "quoted": draft.quoted = !draft.quoted; rerender(); break;
      case "photo-clear": draft.img = ""; rerender(); break;
      case "size-add": addSize(); break;
      case "size-remove": draft.options.splice(+v, 1); rerender(); break;
      case "ground":
        draft.ground = draft.ground.includes(v) ? draft.ground.filter((g) => g !== v) : [...draft.ground, v];
        rerender();
        break;

      case "filter": listFilter = v; rerender(); break;
      case "prices":
        HBP.settings.showPrices = v === "1";
        save();
        rerender();
        ui().toast(HBP.settings.showPrices ? "Prices are now showing on your website." : "Prices are now hidden on your website.");
        break;
      case "price": {
        const p = find(v);
        dialog(`
          <h2>Change price</h2>
          <p class="muted">${esc(p.name)}</p>
          <label class="l-label" for="dlg-price">Price for ${CYCLE_DAYS} days${p.unit && p.unit !== "quoted per job" ? ` (${esc(p.unit)})` : ""}</label>
          <div class="l-input-wrap"><span class="l-prefix">$</span><input id="dlg-price" class="l-input" type="number" inputmode="decimal" min="0" value="${p.rate || ""}" placeholder="0" autofocus></div>
          <p class="muted small">Leave it empty if you'd rather quote it on the phone.</p>
          <div class="dialog-btns">
            <button class="btn btn-ghost btn-sm" value="cancel">Cancel</button>
            <button class="btn btn-primary btn-sm" value="ok">Save price</button>
          </div>`, (d) => {
          const before = { rate: p.rate, unit: p.unit };
          const n = Math.round(+d.querySelector("#dlg-price").value || 0);
          p.rate = n;
          if (!n) p.unit = "quoted per job"; else if (p.unit === "quoted per job") delete p.unit;
          save();
          rerender();
          ui().toast(`${p.name}: ${n ? `${fmtMoney(n)} every ${CYCLE_DAYS} days` : "call for price"}`, {
            action: "Undo", onAction: () => { Object.assign(p, before); if (!before.unit) delete p.unit; save(); rerender(); },
          });
        });
        break;
      }
      case "hide": {
        const p = find(v);
        p.hidden = !p.hidden;
        if (draft && draft.id === p.id) draft.hidden = p.hidden;
        save();
        rerender();
        ui().toast(p.hidden ? `Hidden from your shop: ${p.name}` : `Back in your shop: ${p.name}`, {
          action: "Undo", onAction: () => { p.hidden = !p.hidden; if (draft && draft.id === p.id) draft.hidden = p.hidden; save(); rerender(); },
        });
        break;
      }
      case "delete": {
        const p = find(v);
        dialog(`
          <h2>Delete this listing?</h2>
          <p><strong>${esc(p.name)}</strong> will be taken off your website.</p>
          <p class="muted">Rentals and invoices that already have it won't change.</p>
          <div class="dialog-btns">
            <button class="btn btn-ghost btn-sm" value="cancel" autofocus>No, keep it</button>
            <button class="btn btn-danger btn-sm" value="ok">Yes, delete it</button>
          </div>`, () => {
          const at = listings.indexOf(p);
          listings.splice(at, 1);
          save();
          draft = null;
          if (location.hash === "#listings") rerender(); else location.hash = "listings";
          ui().toast(`Deleted: ${p.name}`, { action: "Undo", onAction: () => { listings.splice(at, 0, p); save(); rerender(); } });
        });
        break;
      }
      case "reset":
        dialog(`
          <h2>Start over?</h2>
          <p>This throws away every change made on this computer and brings back the sample listings.</p>
          <div class="dialog-btns">
            <button class="btn btn-ghost btn-sm" value="cancel" autofocus>Cancel</button>
            <button class="btn btn-danger btn-sm" value="ok">Start over</button>
          </div>`, () => { HBP.store.reset(); location.reload(); });
        break;
    }
  });

  // Phone photos are huge; shrink before storing.
  const shrink = (file) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1000;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = URL.createObjectURL(file);
  });

  HBP.listings = { view };
})();
