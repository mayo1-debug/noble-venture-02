// Overdue Kit: calculator, letters, schedule, calendar file and print. Runs fully in the browser.
(function () {
  "use strict";
  var cfg = window.NOBLE_CONFIG || {};
  var UNLOCK_KEY = "overduekit_unlock";
  var FORM_KEY = "overduekit_form";
  var RATES = null;
  var COUNTRIES = null; // site/eu-countries.json: margin and official source per EU country
  var state = null;
  var toolUsed = false; // tool_use fires on the first calculator run per page load
  var $ = function (s) { return document.querySelector(s); };
  var DAY = 86400000;

  // ---------- unlock ----------
  function unlocked() {
    try { return !!JSON.parse(localStorage.getItem(UNLOCK_KEY) || "null"); } catch (e) { return false; }
  }
  window.overdueKitUnlock = function (orderId) {
    try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ order: orderId, at: new Date().toISOString() })); } catch (e) {}
    $("#order-id").textContent = orderId;
    $("#thanks").hidden = false;
    $("#buy").hidden = true;
    if (state) render();
    $("#thanks").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // Support can restore access with a link ending in #restore=ORDERID (PayPal order IDs are 17 characters).
  var m = /#restore=([A-Z0-9]{17})$/.exec(location.hash);
  if (m) { try { localStorage.setItem(UNLOCK_KEY, JSON.stringify({ order: m[1], at: new Date().toISOString(), restored: true })); } catch (e) {} }

  // ---------- formatting ----------
  function money(v, cur, juris) {
    var loc = juris === "uk" ? "en-GB" : juris === "eu" ? "nl-NL" : "en-US";
    try { return new Intl.NumberFormat(loc, { style: "currency", currency: cur }).format(v); }
    catch (e) { return cur + " " + v.toFixed(2); }
  }
  function d(date) { return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function iso(date) { return date.toISOString().slice(0, 10); }
  function parseDate(s) { var p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function todayUTC() { var n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
  function addDays(date, n) { return new Date(date.getTime() + n * DAY); }

  // ---------- rates ----------
  function refRate(juris, due) {
    if (!RATES) return null;
    var list = juris === "eu" ? RATES.eu_reference : RATES.uk_reference;
    var key = juris === "eu" ? "from" : "date";
    var pick = null;
    list.forEach(function (r) {
      var day = parseDate(r[key]);
      // EU: rate in force on the first day of the half-year in which the debt became late.
      // UK: base rate on the 30 June or 31 December before the debt became late.
      if (juris === "eu" ? day <= due : day < due) pick = r;
    });
    return pick;
  }
  // Rate in force on the first day of the half-year in which the debt became late (EU and national series).
  function pickFrom(list, due) {
    var pick = null;
    (list || []).forEach(function (r) { if (parseDate(r.from) <= due) pick = r; });
    return pick;
  }
  function euCountry() {
    var code = $("#form").country.value;
    var list = (COUNTRIES && COUNTRIES.countries) || [];
    for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return COUNTRIES ? COUNTRIES.default : null;
  }
  // Hint made of text and links, built without innerHTML.
  function setHint(parts) {
    var hint = $("#rate-hint");
    hint.textContent = "";
    parts.forEach(function (p) {
      if (typeof p === "string") { hint.appendChild(document.createTextNode(p)); return; }
      var a = document.createElement("a"); a.href = p.href; a.textContent = p.text; a.rel = "noopener"; a.target = "_blank";
      hint.appendChild(a);
    });
  }
  function suggestRate() {
    var f = $("#form"), juris = f.juris.value;
    f.rate.required = juris !== "other";
    if (juris === "other") return;
    var due = addDays(f.due.value ? parseDate(f.due.value) : todayUTC(), 1);
    var setRate = function (v) { if (!f.rate.dataset.touched) f.rate.value = v; };
    if (juris === "uk") {
      var u = refRate("uk", due);
      if (!u) { setHint(["Enter your statutory rate. Reference rates could not be loaded."]); return; }
      var ut = Math.round((u.rate + 8) * 100) / 100;
      setRate(ut);
      setHint(["Suggested: Bank of England base rate " + u.rate + "% (on " + u.date + ") plus 8 points = " + ut + "%. If your contract sets its own late interest rate, use that instead. Source: ",
        { href: "https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt", text: "gov.uk" }, "."]);
      return;
    }
    var c = euCountry();
    if (!c || !RATES) { setHint(["Enter your statutory rate. Reference rates could not be loaded."]); return; }
    var src = [" Source: ", { href: c.source, text: c.source_label }];
    if (c.ref_source) src.push(", reference rate: ", { href: c.ref_source, text: c.ref_source_label || "official page" });
    src.push(".");
    if (c.ref === "manual") {
      setRate("");
      setHint(["No automatic rate for " + c.name + ". " + (c.note ? c.note + " " : "") + "Enter the rate from the official source."].concat(src));
      return;
    }
    var series = c.ref === "ecb" ? RATES.eu_reference : (RATES.national || {})[c.ref];
    var r = pickFrom(series, due);
    if (!r) { setRate(""); setHint(["No reference rate stored for this date. Enter the rate from the official source."].concat(src)); return; }
    var total = Math.round((r.rate + c.margin) * 100) / 100;
    setRate(total);
    setHint(["Suggested for " + c.name + ": " + c.ref_name + " " + r.rate + "% (in force " + r.from + ") plus " + c.margin + " points = " + total + "%." +
      (c.note ? " " + c.note : "") + " Edit if your contract or case differs."].concat(src));
  }
  function ukFixed(amount) { return amount < 1000 ? 40 : amount < 10000 ? 70 : 100; }

  // ---------- model ----------
  function build(f) {
    var s = {
      inv: f.inv.value.trim(), amount: parseFloat(f.amount.value), cur: f.cur.value,
      due: parseDate(f.due.value), juris: f.juris.value, rate: parseFloat(f.rate.value) || 0,
      fee: f.fee.value.trim(), client: f.client.value.trim(), contact: f.contact.value.trim(),
      me: f.me.value.trim(), biz: f.biz.value.trim(), pay: f.pay.value.trim()
    };
    var today = todayUTC();
    s.today = today;
    s.daysLate = Math.max(0, Math.round((today - s.due) / DAY));
    s.statutory = s.juris !== "other";
    s.dailyInterest = s.statutory ? s.amount * s.rate / 100 / 365 : 0;
    s.interest = Math.round(s.dailyInterest * s.daysLate * 100) / 100;
    if (s.juris === "eu") { s.comp = 40; s.compCur = "EUR"; }
    else if (s.juris === "uk") { s.comp = ukFixed(s.amount); s.compCur = "GBP"; }
    else { s.comp = 0; s.compCur = s.cur; }
    s.compInInvoiceCur = s.comp && s.compCur === s.cur;
    s.total = Math.round((s.amount + s.interest + (s.compInInvoiceCur ? s.comp : 0)) * 100) / 100;
    s.law = s.juris === "eu"
      ? "the late payment rules for business transactions (EU Directive 2011/7/EU, as implemented in national law)"
      : "the Late Payment of Commercial Debts (Interest) Act 1998";
    // Send dates: letter 1 three days after due (or today if later), then every 7 days.
    var start = new Date(Math.max(addDays(s.due, 3).getTime(), today.getTime()));
    s.dates = [start, addDays(start, 7), addDays(start, 14), addDays(start, 21)];
    s.instalments = 3;
    return s;
  }

  // ---------- letters ----------
  function sign(s) { return "\n\nKind regards,\n" + s.me + (s.biz ? "\n" + s.biz : ""); }
  function hi(s) { return (s.contact ? "Dear " + s.contact : "Dear " + s.client + " accounts team") + ",\n\n"; }
  function payLine(s) { return s.pay ? "\n\nPayment details:\n" + s.pay : ""; }
  function M(s, v) { return money(v, s.cur, s.juris); }
  function compText(s) { return money(s.comp, s.compCur, s.juris); }
  function lateDays(s, on) { return Math.max(0, Math.round((on - s.due) / DAY)); }
  function interestOn(s, on) { return Math.round(s.dailyInterest * lateDays(s, on) * 100) / 100; }
  function totalOn(s, on) { return Math.round((s.amount + interestOn(s, on) + (s.compInInvoiceCur ? s.comp : 0)) * 100) / 100; }

  function letters(s) {
    var D = s.dates, out = [];
    out.push({ n: 1, title: "Friendly reminder", date: D[0], free: true,
      subject: "Invoice " + s.inv + ": payment reminder",
      body: hi(s) + "I hope all is well. This is a quick reminder that invoice " + s.inv + " for " + M(s, s.amount) +
        " was due on " + d(s.due) + ", and I have not received payment yet.\n\nIt may simply have slipped through. Could you check, and let me know when I can expect payment?" +
        payLine(s) + "\n\nIf you have already paid, thank you, and please ignore this message. If something about the invoice is not right, tell me and I will sort it out." + sign(s) });

    var warn = s.statutory
      ? "\n\nPlease note that under " + s.law + ", statutory interest and a fixed compensation for recovery costs apply to business invoices paid late. I would prefer not to claim these, so a quick payment helps us both."
      : (s.fee ? "\n\nAs agreed in our contract, a late fee applies to overdue invoices (" + s.fee + ")." : "");
    out.push({ n: 2, title: "Firm reminder, 7-day deadline", date: D[1],
      subject: "Invoice " + s.inv + " is now " + lateDays(s, D[1]) + " days overdue",
      body: hi(s) + "Invoice " + s.inv + " for " + M(s, s.amount) + " was due on " + d(s.due) + ". It is now " + lateDays(s, D[1]) +
        " days overdue, and I have not had a reply to my reminder of " + d(D[0]) + ".\n\nPlease pay the full amount by " + d(addDays(D[1], 7)) +
        ", or reply with the date on which you will pay." + warn + payLine(s) + sign(s) });

    var b3;
    if (s.statutory) {
      b3 = hi(s) + "Invoice " + s.inv + " for " + M(s, s.amount) + ", due on " + d(s.due) + ", is still unpaid " + lateDays(s, D[2]) +
        " days after the due date, despite my reminders of " + d(D[0]) + " and " + d(D[1]) + ".\n\nUnder " + s.law + ", I am entitled to:\n" +
        "- statutory interest at " + s.rate + "% per year from " + d(addDays(s.due, 1)) + ": " + M(s, interestOn(s, D[2])) + " as of " + d(D[2]) +
        ", rising by " + M(s, Math.round(s.dailyInterest * 100) / 100) + " per day\n" +
        "- a fixed compensation for recovery costs of " + compText(s) + "\n\n" +
        (s.compInInvoiceCur
          ? "The amount now due is " + M(s, totalOn(s, D[2])) + "."
          : "The amount now due is " + M(s, s.amount + interestOn(s, D[2])) + " plus the fixed compensation of " + compText(s) + ".") +
        " Please pay this by " + d(addDays(D[2], 7)) + ". Interest continues to run until I receive payment in full.";
    } else {
      b3 = hi(s) + "Invoice " + s.inv + " for " + M(s, s.amount) + ", due on " + d(s.due) + ", is still unpaid " + lateDays(s, D[2]) +
        " days after the due date, despite my reminders of " + d(D[0]) + " and " + d(D[1]) + ".\n\n" +
        (s.fee ? "Under our contract, a late fee applies (" + s.fee + "), and I now add it to the amount due.\n\n" : "") +
        "This is a formal request to pay " + M(s, s.amount) + (s.fee ? " plus the late fee" : "") + " by " + d(addDays(D[2], 7)) + ".";
    }
    out.push({ n: 3, title: s.statutory ? "Formal notice: interest and compensation" : "Formal payment request", date: D[2],
      subject: "Formal notice: invoice " + s.inv + (s.statutory ? ", statutory interest and compensation" : ""),
      body: b3 + payLine(s) + sign(s) });

    var due4 = s.statutory
      ? (s.compInInvoiceCur ? M(s, totalOn(s, D[3])) + ", including statutory interest and the fixed compensation"
         : M(s, s.amount + interestOn(s, D[3])) + " including statutory interest, plus the fixed compensation of " + compText(s))
      : M(s, s.amount) + (s.fee ? " plus the late fee under our contract" : "");
    out.push({ n: 4, title: "Final notice before further action", date: D[3],
      subject: "Final notice before further action: invoice " + s.inv,
      body: hi(s) + "Despite my reminders of " + d(D[0]) + ", " + d(D[1]) + " and " + d(D[2]) + ", invoice " + s.inv +
        " is still unpaid. The amount due is now " + due4 + ".\n\nThis is my final notice. If I do not receive payment in full, or a written payment proposal I can accept, by " +
        d(addDays(D[3], 7)) + ", I will take further steps to recover the debt without further notice. These steps may include a debt collection agency or a court claim, which can add costs.\n\nUntil the invoice is paid, I will not start new work for you." +
        payLine(s) + sign(s) });

    var n = s.instalments, base = s.amount, per = Math.floor(base / n * 100) / 100, first = addDays(s.today, 7), lines = [];
    for (var i = 0; i < n; i++) {
      var amt = i === n - 1 ? Math.round((base - per * (n - 1)) * 100) / 100 : per;
      lines.push("- " + M(s, amt) + " by " + d(addDays(first, i * 30)));
    }
    out.push({ n: 5, title: "Payment plan offer (if they say they cannot pay in full)", date: null,
      subject: "Payment plan for invoice " + s.inv,
      body: hi(s) + "Thank you for your reply. To help you settle invoice " + s.inv + ", I can accept payment of " + M(s, base) + " in " + n + " instalments:\n" +
        lines.join("\n") + "\n\nThis offer stands if the first instalment arrives by " + d(first) + ". If any instalment is more than 7 days late, the full remaining balance becomes due at once" +
        (s.statutory ? ", and I keep my right to claim statutory interest and the fixed compensation" : "") + ".\n\nPlease confirm by reply that you agree." + payLine(s) + sign(s) });
    return out;
  }

  // ---------- render ----------
  function render() {
    var s = state, open = unlocked();
    $("#result").hidden = false;
    var rows = [["Invoice amount", M(s, s.amount)], ["Days overdue today", String(s.daysLate)]];
    if (s.statutory) {
      rows.push(["Statutory interest so far (" + s.rate + "% per year, simple)", M(s, s.interest)]);
      rows.push(["Interest per extra day", M(s, Math.round(s.dailyInterest * 100) / 100)]);
      rows.push(["Fixed compensation for recovery costs", compText(s)]);
      rows.push([s.compInInvoiceCur ? "Total you can claim today" : "Invoice plus interest today (compensation is extra)",
        s.compInInvoiceCur ? M(s, s.total) : M(s, s.amount + s.interest)]);
    } else {
      rows.push(["Statutory claims", "Not included for this debt type"]);
    }
    $("#calc").innerHTML = "<table>" + rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</table>" +
      (s.statutory ? "<p class='hint'>Business-to-business debts only. Templates and calculations, not legal advice.</p>" : "");
    var L = letters(s);
    $("#plan").innerHTML = L.filter(function (l) { return l.date; }).map(function (l) {
      return "<li><strong>" + d(l.date) + ":</strong> send letter " + l.n + ", " + esc(l.title.toLowerCase()) + "</li>";
    }).join("") + "<li><strong>When they reply that they cannot pay in full:</strong> letter 5, payment plan offer</li>";
    $("#letters").innerHTML = L.map(function (l) {
      var lock = !l.free && !open;
      return "<article class='letter" + (lock ? " locked" : "") + "' data-n='" + l.n + "'><h3>Letter " + l.n + ": " + esc(l.title) +
        (l.date ? " <span class='hint'>(send " + d(l.date) + ")</span>" : "") + "</h3>" +
        "<pre>Subject: " + esc(l.subject) + "\n\n" + esc(lock ? l.body.slice(0, 260) : l.body) + "</pre>" +
        (lock ? "<p class='lock'><a href='#buy'>Unlock the full kit</a> to read and copy this letter.</p>"
              : "<div class='tools'><button class='btn small' data-copy='" + l.n + "'>Copy text</button>" +
                (open ? "<button class='btn small ghost' data-print='" + l.n + "'>Print letter</button>" : "") + "</div>") +
        "</article>";
    }).join("") + (open ? "<p><button class='btn' id='ics'>Download calendar file (.ics)</button></p>" : "");
    $("#letters").onclick = function (e) {
      var t = e.target, n = t.getAttribute("data-copy") || t.getAttribute("data-print");
      if (!n) return;
      var l = L[+n - 1], text = "Subject: " + l.subject + "\n\n" + l.body;
      if (t.hasAttribute("data-copy")) {
        copy(text); t.textContent = "Copied"; track("copy-letter-" + n);
      } else {
        $("#print-area").textContent = (s.biz || s.me) + "\n" + d(s.today) + "\n\nTo: " + s.client + "\n\n" + text;
        window.print(); track("print-letter-" + n);
      }
    };
    var ics = $("#ics");
    if (ics) ics.onclick = function () { downloadIcs(s, L); track("ics"); };
    if (open) { $("#buy").hidden = true; }
  }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); }); }
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
  }
  function downloadIcs(s, L) {
    var stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    var ev = L.filter(function (l) { return l.date; }).map(function (l) {
      var day = iso(l.date).replace(/-/g, ""), next = iso(addDays(l.date, 1)).replace(/-/g, "");
      return ["BEGIN:VEVENT", "UID:overduekit-" + s.inv.replace(/\W/g, "") + "-" + l.n + "-" + day + "@overduekit",
        "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + day, "DTEND;VALUE=DATE:" + next,
        "SUMMARY:Send letter " + l.n + " (" + l.title + ") to " + s.client.replace(/[,;]/g, " "),
        "DESCRIPTION:Invoice " + s.inv.replace(/[,;]/g, " ") + ". Skip this if the invoice is paid.", "END:VEVENT"].join("\r\n");
    });
    var body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Overdue Kit//EN"].concat(ev, ["END:VCALENDAR"]).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = "overdue-kit-" + s.inv.replace(/\W/g, "") + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
  }
  function track(name) { if (window.nobleTrack) window.nobleTrack(name); }

  // ---------- wiring ----------
  function toggleJuris() {
    var j = $("#form").juris.value;
    document.querySelectorAll(".eu-uk").forEach(function (el) { el.hidden = j === "other"; });
    document.querySelectorAll(".other-only").forEach(function (el) { el.hidden = j !== "other"; });
    document.querySelectorAll(".eu-only").forEach(function (el) { el.hidden = j !== "eu"; });
    if (j === "uk" && $("#form").cur.value === "EUR") $("#form").cur.value = "GBP";
    suggestRate();
  }
  function save(f) {
    var o = {}; Array.prototype.forEach.call(f.elements, function (el) { if (el.name) o[el.name] = el.value; });
    try { localStorage.setItem(FORM_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function restore(f) {
    try {
      var o = JSON.parse(localStorage.getItem(FORM_KEY) || "null"); if (!o) return;
      Object.keys(o).forEach(function (k) { if (f[k]) f[k].value = o[k]; });
      if (o.rate) f.rate.dataset.touched = "1";
      if (o.country) f.country.dataset.saved = o.country; // options load later from eu-countries.json
    } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    var f = $("#form");
    if (cfg.PAYPAL_ENV !== "live") $("#test-banner").hidden = false;
    document.querySelectorAll(".price").forEach(function (el) { el.textContent = (cfg.CURRENCY || "EUR") + " " + String(cfg.PRICE || "19").replace(/\.00$/, ""); });
    document.querySelectorAll(".support").forEach(function (el) { el.textContent = cfg.SUPPORT_EMAIL || "the support address in the imprint"; });
    if (!f.due.value) f.due.value = iso(addDays(todayUTC(), -14));
    restore(f);
    f.rate.addEventListener("input", function () { f.rate.dataset.touched = "1"; });
    f.juris.addEventListener("change", function () { f.rate.dataset.touched = ""; toggleJuris(); });
    f.due.addEventListener("change", function () { if (!f.rate.dataset.touched) suggestRate(); });
    f.country.addEventListener("change", function () { f.rate.dataset.touched = ""; suggestRate(); });
    fetch("eu-countries.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      COUNTRIES = j;
      var keep = f.country.value || f.country.dataset.saved || "";
      j.countries.forEach(function (c) {
        var o = document.createElement("option"); o.value = c.code; o.textContent = c.name; f.country.appendChild(o);
      });
      f.country.value = keep;
      if (f.country.value !== keep) f.country.value = "";
      suggestRate();
    }).catch(function () { suggestRate(); });
    fetch("rates.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      RATES = j;
      $("#rates-src").textContent = "Reference rates last updated " + j.updated + " from the ECB and the Bank of England. Latest: ECB main refinancing rate " +
        j.ecb_latest.rate + "% (since " + j.ecb_latest.since + "), Bank of England base rate " + j.boe_latest.rate + "% (" + j.boe_latest.date + ").";
      toggleJuris();
    }).catch(function () { toggleJuris(); });
    toggleJuris();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      save(f);
      state = build(f);
      render();
      if (!toolUsed) { toolUsed = true; track("tool_use"); }
      track("letters_generated");
      $("#result").scrollIntoView({ behavior: "smooth" });
    });
    if (unlocked()) {
      try { var u = JSON.parse(localStorage.getItem(UNLOCK_KEY)); $("#order-id").textContent = u.order; } catch (e) {}
      $("#thanks").hidden = false; $("#buy").hidden = true;
    }
  });
})();
