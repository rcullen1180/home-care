(function () {
  const cfg = window.SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const pretty = (d) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = cfg.businessName || el.textContent));
  if (cfg.businessName) document.title = cfg.businessName;
  $("year").textContent = new Date().getFullYear();
  $("email-link").href = "mailto:" + (cfg.contactEmail || "");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  let view = new Date(firstMonth);
  let booked = new Set();
  let start = null, end = null;

  fetch("booked-dates.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      (data.booked || []).forEach((b) => {
        for (let d = parse(b.start); d <= parse(b.end || b.start); d.setDate(d.getDate() + 1)) booked.add(key(d));
      });
    })
    .catch(() => {})
    .finally(render);

  function rangeHasBooked(a, b) {
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (booked.has(key(d))) return true;
    return false;
  }

  function pick(d) {
    if (!start || end || d < start) { start = d; end = null; }
    else if (rangeHasBooked(start, d)) { start = d; end = null; setStatus("Those dates overlap a booked day, so we started a new selection.", "err"); render(); return; }
    else end = d;
    setStatus("");
    render();
  }

  function render() {
    $("month-label").textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    $("prev").disabled = view <= firstMonth;
    $("next").disabled = view >= lastMonth;
    const days = $("days");
    days.innerHTML = "";
    const lead = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < lead; i++) { const e = document.createElement("span"); e.className = "day empty"; days.appendChild(e); }
    for (let n = 1; n <= count; n++) {
      const d = new Date(view.getFullYear(), view.getMonth(), n);
      const b = document.createElement("button");
      b.type = "button"; b.className = "day"; b.textContent = n;
      const k = key(d);
      if (d < today) { b.classList.add("past"); b.disabled = true; }
      else if (booked.has(k)) { b.classList.add("booked"); b.disabled = true; b.setAttribute("aria-label", pretty(d) + ", booked"); }
      else {
        b.setAttribute("aria-label", pretty(d) + ", available");
        b.addEventListener("click", () => pick(d));
      }
      if (start && k === key(start)) b.classList.add("start");
      if (end && k === key(end)) b.classList.add("end");
      if (start && end && d > start && d < end) b.classList.add("in-range");
      days.appendChild(b);
    }
    const form = $("request-form");
    form.start_date.value = start ? key(start) : "";
    form.end_date.value = end ? key(end) : (start ? key(start) : "");
    $("picked").textContent = !start ? "No dates picked yet."
      : !end ? `${pretty(start)}. Tap your return day, or send for a single day.`
      : `${pretty(start)} to ${pretty(end)}`;
    $("submit").disabled = !start;
  }

  $("prev").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
  $("next").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });

  function setStatus(msg, cls) { const s = $("status"); s.textContent = msg; s.className = "status " + (cls || ""); }

  $("request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form._gotcha.value) return;
    const data = new FormData(form);
    data.delete("_gotcha");
    data.append("_subject", `Booking request: ${data.get("start_date")} to ${data.get("end_date")}`);

    const gf = cfg.googleForm || {};
    if (!cfg.formEndpoint && gf.action) {
      const out = new FormData();
      Object.entries(gf.fields || {}).forEach(([k, id]) => { if (id) out.append(id, data.get(k) || ""); });
      $("submit").disabled = true;
      setStatus("Sending...");
      try {
        // Google Forms doesn't allow reading the response, so a no-cors post is sent and assumed delivered.
        await fetch(gf.action, { method: "POST", mode: "no-cors", body: out });
        form.reset(); start = end = null; render();
        setStatus("Thanks! Your request is in. We'll confirm by email soon.", "ok");
      } catch {
        $("submit").disabled = false;
        setStatus("Something went wrong sending your request. Please try again or email us.", "err");
      }
      return;
    }
    if (!cfg.formEndpoint) {
      const body = [...data.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
      location.href = `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(data.get("_subject"))}&body=${encodeURIComponent(body)}`;
      return;
    }
    $("submit").disabled = true;
    setStatus("Sending...");
    try {
      const r = await fetch(cfg.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error();
      form.reset(); start = end = null; render();
      setStatus("Thanks! Your request is in. We'll confirm by email soon.", "ok");
    } catch {
      $("submit").disabled = false;
      setStatus("Something went wrong sending your request. Please try again or email us.", "err");
    }
  });
})();
