// Sample data so the pages can be designed and reviewed before the backend exists.
// Names, rates, asset tags and customers below are placeholders. Dates are
// relative to today so the demo always looks current.
(() => {
  const { TODAY, addDays } = HBP;
  const ago = (n) => addDays(TODAY, -n);
  const ahead = (n) => addDays(TODAY, n);

  const IMG = {
    // Blue American Augers units vs. the orange machines in the yard photos.
    machineBlue: ["assets/img/hero.jpg", "assets/img/gallery-1.jpg", "assets/img/gallery-4.jpg"],
    machineOrange: ["assets/img/gallery-2.jpg", "assets/img/gallery-6.jpg", "assets/img/crew.jpg"],
    auger: "assets/img/augers.jpg",
    head: ["assets/img/cutting-head.jpg", "assets/img/gallery-3.jpg"],
    accessory: "assets/img/accessories.jpg",
    casing: "assets/img/gallery-5.jpg",
  };

  // ─── Catalog ────────────────────────────────────────────
  const machineRows = [
    ["American Augers", "24″-150", 24, "20–30″"], ["American Augers", "24/30″-150", 30, "20–36″"],
    ["American Augers", "36″-340s", 36, "24–42″"], ["American Augers", "36″-600", 36, "24–48″"],
    ["American Augers", "42/48″-600", 48, "30–54″"], ["American Augers", "48″-900", 48, "36–60″"],
    ["American Augers", "54″-900", 54, "36–60″"], ["American Augers", "60″-900", 60, "42–72″"],
    ["American Augers", "60″-1200", 60, "42–72″"], ["American Augers", "72″-1200", 72, "48–84″"],
    ["Bor-It", "Power House II", 20, "8–24″"], ["Bor-It", "Brute", 24, "12–30″"],
    ["Bor-It", "Power Plus", 30, "16–36″"], ["Bor-It", "Workhorse", 36, "20–42″"],
    ["Bor-It", "Terminator", 48, "30–54″"],
    ["Richmond", "20″-150", 20, "8–24″"], ["Richmond", "24″-150", 24, "12–30″"],
    ["Richmond", "36″-350", 36, "20–42″"], ["Richmond", "48″-500", 48, "30–54″"],
    ["BarbCo", "60/72″-1200", 72, "48–84″"], ["Augers Unlimited", "36″-500", 36, "20–42″"],
  ];
  const machines = machineRows.map(([brand, model, size, range], i) => ({
    id: `m${i + 1}`, cat: "machine", brand, name: `${brand} ${model}`, size,
    img: (brand === "American Augers" ? IMG.machineBlue : IMG.machineOrange)[i % 3],
    rate: 3200 + size * 95,
    blurb: `${size}″ class auger boring machine. Bores ${range} with the right adapters. Ships with standard track section.`,
    specs: { "Brand": brand, "Model": model, "Machine class": `${size}″`, "Bore range": range, "Track": "1 × 10′ section included" },
  }));

  const catalog = [
    ...machines,

    { id: "a1", cat: "auger", name: "Augers, 3″ hex", size: 16, img: IMG.auger, rate: 85, unit: "per 10′ section",
      options: ["6″", "8″", "10″", "12″", "14″", "16″"],
      blurb: "Light-duty flighting for small bores and pilot work.",
      specs: { "Hex": "3″", "Diameters": "6″–16″", "Section length": "10′" } },
    { id: "a2", cat: "auger", name: "Augers, 4″ hex", size: 36, img: IMG.auger, rate: 140, unit: "per 10′ section",
      options: ["18″", "20″", "24″", "30″", "36″"],
      blurb: "Our most-rented augers. Pairs with most 24″–36″ machines.",
      specs: { "Hex": "4″", "Diameters": "18″–36″", "Section length": "10′" } },
    { id: "a3", cat: "auger", name: "Augers, 5″ hex", size: 72, img: IMG.auger, rate: 260, unit: "per 10′ section",
      options: ["36″", "42″", "48″", "54″", "60″", "72″"],
      blurb: "Heavy flighting for large-diameter casing.",
      specs: { "Hex": "5″", "Diameters": "36″–72″", "Section length": "10′" } },

    { id: "h1", cat: "head", name: "Dirt head", img: IMG.head[0], rate: 450, ground: ["dirt"],
      options: ["8″–16″", "18″–24″", "30″–36″", "42″–48″", "54″–72″"],
      blurb: "Carbide-tooth head for clay, sand, loam and gravel. Fast cutting, low cost.",
      specs: { "Cutters": "Carbide bullet teeth", "Best in": "Dirt, clay, sand, gravel" } },
    { id: "h2", cat: "head", name: "Combination head", img: IMG.head[1], rate: 900, ground: ["dirt", "mixed", "soft"],
      options: ["18″–24″", "30″–36″", "42″–48″", "54″–72″"],
      blurb: "For jobs where you expect dirt but may hit rock. Teeth up front, roller cones behind.",
      specs: { "Cutters": "Carbide teeth + roller cones", "Best in": "Mixed ground, cobbles, rock seams" } },
    { id: "h3", cat: "head", name: "Rock head, milled-tooth cones", img: IMG.head[0], rate: 1500, ground: ["soft", "medium"],
      options: ["24″", "30″", "36″", "42″", "48″"],
      blurb: "Steel milled-tooth roller cones for shale, sandstone and softer limestone.",
      specs: { "Cutters": "Milled-tooth roller cones", "Rock strength": "Up to ~15,000 PSI" } },
    { id: "h4", cat: "head", name: "Rock head, carbide-insert cones", img: IMG.head[1], rate: 2400, ground: ["medium", "hard"],
      options: ["24″", "30″", "36″", "42″", "48″", "60″"],
      blurb: "Tungsten-carbide insert (TCI) cones for limestone, dolomite and harder rock.",
      specs: { "Cutters": "TCI roller cones", "Rock strength": "8,000–25,000 PSI" } },
    { id: "h5", cat: "head", name: "Disc cutter head", img: IMG.head[0], rate: 3600, ground: ["hard"],
      options: ["36″", "42″", "48″", "60″", "72″"],
      blurb: "Single-disc cutters for granite, basalt and quartzite. Call to plan the bore.",
      specs: { "Cutters": "Single-disc cutters", "Rock strength": "18,000 PSI and up" } },

    { id: "t1", cat: "accessory", name: "Extra track", img: IMG.accessory, rate: 300, unit: "per 10′ section",
      blurb: "Additional track to extend your pit setup.", specs: { "Length": "10′", "Fits": "Match to machine class" },
      options: ["20″–30″ class", "36″–48″ class", "54″–72″ class"] },
    { id: "t2", cat: "accessory", name: "Casing pusher adapter", img: IMG.accessory, rate: 250,
      blurb: "Push casing of a different size than your machine's native ring.", specs: { "Fits": "Most brands we stock" },
      options: ["12″", "16″", "20″", "24″", "30″", "36″", "42″", "48″", "60″", "72″"] },
    { id: "t3", cat: "accessory", name: "Saddle inserts", img: IMG.accessory, rate: 200,
      blurb: "Saddle inserts to cradle smaller casing in a larger machine.", specs: { "Sold as": "Set" },
      options: ["12″", "16″", "20″", "24″", "30″", "36″", "42″", "48″"] },
    { id: "t4", cat: "accessory", name: "Hex adapter", img: IMG.accessory, rate: 120,
      blurb: "Run our augers on a machine with a different hex.", specs: { "Fits": "Machine to auger" },
      options: ["3″ → 4″", "4″ → 3″", "4″ → 5″", "5″ → 4″"] },
    { id: "t5", cat: "accessory", name: "Steel pipe casing", img: IMG.casing, rate: 0, unit: "quoted per job",
      blurb: "Casing available for purchase. Tell us the diameter, wall and length.", specs: { "Sold": "Per foot, quoted" },
      options: ["16″", "20″", "24″", "30″", "36″", "42″", "48″", "60″"] },
    { id: "t6", cat: "accessory", name: "Custom fabrication", img: IMG.accessory, rate: 0, unit: "quoted per job",
      blurb: "Need a part we don't stock? We'll build it in the shop.", specs: { "Lead time": "Call to discuss" } },
  ];

  // Sample availability, keyed by product id.
  const availability = {
    m4: { status: "out", back: ahead(9) }, m14: { status: "out", back: ahead(3) },
    m19: { status: "out", back: ahead(18) }, m8: { status: "limited" },
    h4: { status: "limited" }, h5: { status: "out", back: ahead(12) },
  };

  // ─── Customers ──────────────────────────────────────────
  const customers = [
    { id: "C-101", name: "Tri-State Utility Contractors", contact: "Dale Morgan", phone: "(606) 555-0142", email: "dale@tristateutility.example", city: "Ashland, KY" },
    { id: "C-102", name: "Ohio Valley Pipeline LLC",      contact: "Renee Hall",  phone: "(740) 555-0188", email: "rhall@ovpipeline.example",    city: "Portsmouth, OH" },
    { id: "C-103", name: "Bluegrass Directional",         contact: "Marcus Webb", phone: "(859) 555-0117", email: "mwebb@bgdirectional.example", city: "Lexington, KY" },
    { id: "C-104", name: "Mountain State Excavating",     contact: "Jo Pruitt",   phone: "(304) 555-0163", email: "jo@msexcavating.example",     city: "Huntington, WV" },
  ];

  // ─── Rentals ────────────────────────────────────────────
  // items: [productId, option, assetTag, qty, rate per 28 days]
  const line = (pid, option, tag, qty, rate) => {
    const p = catalog.find((x) => x.id === pid);
    return { pid, name: p.name, cat: p.cat, option, tag, qty, rate };
  };
  const photo = (src, caption) => ({ src, caption });

  const rentals = [
    {
      id: "R-1042", customer: "C-101", status: "out",
      site: "KY-8 road crossing, Greenup County, KY", ground: "mixed", groundNote: "Clay over fractured limestone at ~9′",
      requested: ago(48), outDate: ago(40), returnDate: null, expectedReturn: ahead(16),
      carrier: "HBP truck #2 · driver: T. Stapleton",
      items: [
        line("m4", "", "HBP-M-04", 1, 6620),
        line("a2", "24″", "HBP-A24-L1", 12, 140),
        line("h2", "18″–24″", "HBP-H2-24A", 1, 900),
        line("t1", "20″–30″ class", "HBP-T-11", 2, 300),
      ],
      photos: {
        out: [photo("assets/img/gallery-4.jpg", "Machine, left side"), photo("assets/img/augers.jpg", "Augers loaded, 12 sections"), photo("assets/img/cutting-head.jpg", "Combination head, teeth intact"), photo("assets/img/accessories.jpg", "Track sections")],
        in: [],
      },
      autoSend: true,
    },
    {
      id: "R-1043", customer: "C-102", status: "out",
      site: "US-52 gas line casing, Scioto County, OH", ground: "medium", groundNote: "Limestone, est. 12,000 PSI",
      requested: ago(20), outDate: ago(12), returnDate: null, expectedReturn: ahead(30),
      carrier: "Customer pickup",
      items: [
        line("m14", "", "HBP-M-14", 1, 6620),
        line("a2", "36″", "HBP-A36-L2", 20, 140),
        line("h4", "36″", "HBP-H4-36A", 1, 2400),
      ],
      photos: {
        out: [photo("assets/img/gallery-6.jpg", "Workhorse on trailer"), photo("assets/img/gallery-3.jpg", "TCI head, cones checked")],
        in: [],
      },
      autoSend: true,
    },
    {
      id: "R-1040", customer: "C-104", status: "returning",
      site: "Sewer main, 5th Ave, Huntington, WV", ground: "dirt", groundNote: "Fill and clay",
      requested: ago(64), outDate: ago(57), returnDate: null, expectedReturn: ahead(2),
      carrier: "HBP truck #1",
      items: [
        line("m19", "", "HBP-M-19", 1, 7760),
        line("a3", "48″", "HBP-A48-L1", 8, 260),
        line("h1", "42″–48″", "HBP-H1-48A", 1, 450),
      ],
      photos: { out: [photo("assets/img/gallery-1.jpg", "Richmond 48″ on track"), photo("assets/img/augers.jpg", "48″ augers")], in: [] },
      autoSend: true,
    },
    {
      id: "R-1039", customer: "C-103", status: "returned",
      site: "Fiber conduit, I-64 ROW, Fayette County, KY", ground: "soft", groundNote: "Shale",
      requested: ago(80), outDate: ago(70), returnDate: ago(5), expectedReturn: ago(5),
      carrier: "HBP truck #2",
      items: [
        line("m12", "", "HBP-M-12", 1, 5480),
        line("a2", "20″", "HBP-A20-L1", 10, 140),
        line("h3", "24″", "HBP-H3-24A", 1, 1500),
      ],
      photos: {
        out: [photo("assets/img/gallery-2.jpg", "Brute, power unit side"), photo("assets/img/gallery-3.jpg", "Rock head before")],
        in: [photo("assets/img/gallery-2.jpg", "Brute on return, hydraulic hose scuffed"), photo("assets/img/cutting-head.jpg", "Rock head, 2 cones worn")],
      },
      returnNotes: "Two cones on rock head worn past spec, replace before next rental. Hose scuff, no leak.",
      autoSend: true,
    },
    {
      id: "R-1047", customer: "C-101", status: "reserved",
      site: "Water line, Flatwoods, KY", ground: "dirt", groundNote: "Sandy clay",
      requested: ago(3), outDate: ahead(4), returnDate: null, expectedReturn: ahead(60),
      carrier: "HBP truck #1",
      items: [
        line("m16", "", "HBP-M-16", 1, 5100),
        line("a1", "16″", "HBP-A16-L1", 8, 85),
        line("h1", "8″–16″", "HBP-H1-16A", 1, 450),
      ],
      photos: { out: [], in: [] },
      autoSend: true,
    },
    {
      id: "R-1048", customer: "C-103", status: "requested",
      site: "Storm culvert, Winchester, KY", ground: "mixed", groundNote: "Unknown, boring logs pending",
      requested: ago(1), outDate: null, returnDate: null, expectedReturn: null, wantedDate: ahead(10),
      carrier: "",
      items: [
        line("m6", "", "", 1, 7760),
        line("a3", "48″", "", 10, 260),
        line("h2", "42″–48″", "", 1, 900),
      ],
      photos: { out: [], in: [] },
      autoSend: true,
    },
  ];
  rentals.forEach((r) => { r.cust = customers.find((c) => c.id === r.customer); });

  // ─── Fleet (individually tracked units) ─────────────────
  const fleet = machines.map((m, i) => ({
    tag: `HBP-M-${String(i + 1).padStart(2, "0")}`, name: m.name, cat: "machine", hours: 1200 + ((i * 397) % 3400),
    lastService: ago(20 + ((i * 13) % 90)), location: "South Shore yard", status: "yard",
  }));
  fleet.push(
    { tag: "HBP-H2-24A", name: "Combination head 18″–24″", cat: "head", lastService: ago(52), location: "South Shore yard", status: "yard" },
    { tag: "HBP-H3-24A", name: "Rock head, milled-tooth 24″", cat: "head", lastService: ago(5), location: "South Shore yard", status: "shop", note: "Replace 2 cones" },
    { tag: "HBP-H4-36A", name: "Rock head, TCI 36″", cat: "head", lastService: ago(30), location: "South Shore yard", status: "yard" },
    { tag: "HBP-H1-48A", name: "Dirt head 42″–48″", cat: "head", lastService: ago(70), location: "South Shore yard", status: "yard" },
  );
  fleet.find((u) => u.tag === "HBP-M-09").status = "shop";
  fleet.find((u) => u.tag === "HBP-M-09").note = "Thrust cylinder reseal";
  rentals.filter((r) => ["out", "returning", "reserved"].includes(r.status)).forEach((r) => {
    r.items.forEach((it) => {
      const unit = fleet.find((u) => u.tag === it.tag);
      if (!unit) return;
      unit.status = r.status === "reserved" ? "reserved" : "out";
      unit.rental = r.id;
      unit.location = r.status === "reserved" ? "South Shore yard" : r.site;
    });
  });

  // Listings the owner edits in the back office. Until there's a server they're
  // kept in this browser, so the shop on the same computer shows his changes.
  const LISTINGS_KEY = "hbp.listings";
  const SETTINGS_KEY = "hbp.settings";
  const MOVES_KEY = "hbp.moves";
  const load = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const saved = load(LISTINGS_KEY);
  const listings = Array.isArray(saved) ? saved : catalog.map((p) => ({ ...p }));
  const settings = { showPrices: false, places: ["South Shore yard", "Shop"], ...(load(SETTINGS_KEY) || {}) };

  // Where the owner has moved units: { tag: { location, spot, moved } }.
  // Units out on rent ignore this; they're at the rental's job site.
  const moves = load(MOVES_KEY) || {};
  fleet.forEach((u) => {
    const m = moves[u.tag];
    if (!m || u.status === "out") return;
    Object.assign(u, m, { moved: m.moved ? new Date(m.moved) : null });
  });

  HBP.store = {
    save() {
      try {
        localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        localStorage.setItem(MOVES_KEY, JSON.stringify(moves));
        return true;
      } catch { return false; }
    },
    reset() {
      try { [LISTINGS_KEY, SETTINGS_KEY, MOVES_KEY].forEach((k) => localStorage.removeItem(k)); } catch {}
    },
  };

  HBP.data = { catalog: listings, availability, customers, rentals, fleet, moves };
  HBP.settings = settings;
  HBP.company = {
    name: "Horizontal Boring, Plus",
    address: ["549 Siloam Ln.", "South Shore, KY 41175"],
    phone: "(606) 923-6056",
    email: "boring_tunneling_rentals@yahoo.com",
  };
})();
