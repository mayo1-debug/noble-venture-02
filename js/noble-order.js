// noble-order.js: the three German checkout duties for a static Noble site, in one file.
// Copy it unchanged into the business repo (site/js/noble-order.js or site/assets/noble-order.js).
// Fix it here first, then copy again. Sources in standards/checkout/README.md.
//
// 1. NobleOrder.gate(): an own order button with the statutory wording (Section 312j(3) BGB).
//    The PayPal buttons load and show only after its click.
// 2. NobleOrder.confirm(): after capture, a contract confirmation the buyer downloads as a file
//    (Section 312f BGB, needed for the early end of withdrawal under Section 356(5) No. 2 c BGB).
// 3. The electronic withdrawal function (Section 356a BGB): any form[data-noble-withdraw] on the
//    page (written by standards/legal/render.py) is bound on load. A static site sends no email,
//    so the notice goes out through the buyer's email program, and the buyer can download a copy.
(function () {
  "use strict";

  // Must match SELLER and COUNTRY in standards/legal/texts.py (a test checks it).
  var SELLER = { name: "Mario Behrends", street: "Caspar-Rudolf-Str. 7", city: "26802 Moormerland" };
  var COUNTRY = { en: "Germany", de: "Deutschland", fr: "Allemagne", es: "Alemania" };

  var T = {
    en: {
      order: "Order with obligation to pay",
      orderHint: "Tick the box above, then press the order button.",
      confTitle: "Order confirmation",
      confLead: "Your order confirmation",
      confText: "Download this file and keep it. It confirms your contract, the terms and your consent.",
      confLink: "Download order confirmation",
      seller: "Seller", product: "Product", price: "Price", date: "Date and time of order",
      orderId: "PayPal order ID", payment: "Payment", paymentVal: "PayPal",
      finalPrice: "final price, paid once. No VAT is charged (small business, Section 19 UStG).",
      consent: "Your consent, given before payment",
      withdrawal: "Right of withdrawal",
      withdrawalText: "You agreed that delivery starts before the withdrawal period ends and confirmed that you know you lose your right of withdrawal when it starts. With this confirmation, the right of withdrawal ends once delivery has started (Section 356(5) BGB). The voluntary refund in the terms still applies.",
      withdrawOnline: "Withdraw online",
      terms: "Terms in force at the time of the order",
      termsFallback: "The full terms are online:",
      noticeSubject: "Withdrawal from contract",
      notice: function (d) {
        return "To: " + d.to + "\n\nI hereby give notice that I withdraw from my contract for the supply of the following digital content: " + d.product +
          "\n\nOrdered on: " + (d.date || "-") + "\nName: " + d.name + "\nEmail for the confirmation of receipt: " + d.email +
          "\nPayPal order ID: " + d.order + "\nDate of this notice: " + d.now;
      },
      sent: "Your email program should now show your withdrawal notice. Send that email to complete your withdrawal. If nothing opened, copy the text below and send it to ",
      copyLink: "Download a copy of your notice",
      required: "Please fill in your name, email address and order ID."
    },
    de: {
      order: "Zahlungspflichtig bestellen",
      orderHint: "Setzen Sie oben das Häkchen und klicken Sie dann auf den Bestellbutton.",
      confTitle: "Bestellbestätigung",
      confLead: "Ihre Bestellbestätigung",
      confText: "Laden Sie diese Datei herunter und bewahren Sie sie auf. Sie bestätigt Ihren Vertrag, die Bedingungen und Ihre Zustimmung.",
      confLink: "Bestellbestätigung herunterladen",
      seller: "Verkäufer", product: "Produkt", price: "Preis", date: "Datum und Uhrzeit der Bestellung",
      orderId: "PayPal-Bestellnummer", payment: "Zahlung", paymentVal: "PayPal",
      finalPrice: "Endpreis, einmalig. Keine Umsatzsteuer ausgewiesen (Kleinunternehmer, § 19 UStG).",
      consent: "Ihre Zustimmung, vor der Zahlung erteilt",
      withdrawal: "Widerrufsrecht",
      withdrawalText: "Sie haben zugestimmt, dass die Lieferung vor Ablauf der Widerrufsfrist beginnt, und bestätigt, dass Sie wissen, dass Sie mit Beginn der Lieferung Ihr Widerrufsrecht verlieren. Mit dieser Bestätigung erlischt das Widerrufsrecht, sobald die Lieferung begonnen hat (§ 356 Abs. 5 BGB). Die freiwillige Erstattung aus den Bedingungen gilt weiter.",
      withdrawOnline: "Online widerrufen",
      terms: "Bedingungen zum Zeitpunkt der Bestellung",
      termsFallback: "Die vollständigen Bedingungen stehen online:",
      noticeSubject: "Widerruf des Vertrags",
      notice: function (d) {
        return "An: " + d.to + "\n\nHiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Bereitstellung der folgenden digitalen Inhalte: " + d.product +
          "\n\nBestellt am: " + (d.date || "-") + "\nName: " + d.name + "\nE-Mail für die Eingangsbestätigung: " + d.email +
          "\nPayPal-Bestellnummer: " + d.order + "\nDatum dieser Erklärung: " + d.now;
      },
      sent: "Ihr E-Mail-Programm sollte jetzt Ihre Widerrufserklärung zeigen. Senden Sie diese E-Mail ab, um den Widerruf zu erklären. Hat sich nichts geöffnet, kopieren Sie den Text unten und senden Sie ihn an ",
      copyLink: "Kopie Ihrer Erklärung herunterladen",
      required: "Bitte geben Sie Ihren Namen, Ihre E-Mail-Adresse und die Bestellnummer an."
    },
    fr: {
      order: "Commande avec obligation de paiement",
      orderHint: "Cochez la case ci-dessus, puis cliquez sur le bouton de commande.",
      confTitle: "Confirmation de commande",
      confLead: "Votre confirmation de commande",
      confText: "Téléchargez ce fichier et conservez-le. Il confirme votre contrat, les conditions et votre consentement.",
      confLink: "Télécharger la confirmation de commande",
      seller: "Vendeur", product: "Produit", price: "Prix", date: "Date et heure de la commande",
      orderId: "Numéro de commande PayPal", payment: "Paiement", paymentVal: "PayPal",
      finalPrice: "prix final, payé une fois. TVA non applicable (petite entreprise, article 19 UStG).",
      consent: "Votre consentement, donné avant le paiement",
      withdrawal: "Droit de rétractation",
      withdrawalText: "Vous avez accepté que la fourniture commence avant la fin du délai de rétractation et confirmé savoir que vous perdez votre droit de rétractation dès qu'elle commence. Avec cette confirmation, le droit de rétractation prend fin dès le début de la fourniture (article 356, par. 5 BGB). Le remboursement volontaire prévu par les conditions reste valable.",
      withdrawOnline: "Se rétracter en ligne",
      terms: "Conditions en vigueur au moment de la commande",
      termsFallback: "Les conditions complètes sont en ligne :",
      noticeSubject: "Rétractation du contrat",
      notice: function (d) {
        return "À : " + d.to + "\n\nJe vous notifie par la présente ma rétractation du contrat portant sur la fourniture du contenu numérique suivant : " + d.product +
          "\n\nCommandé le : " + (d.date || "-") + "\nNom : " + d.name + "\nE-mail pour l'accusé de réception : " + d.email +
          "\nNuméro de commande PayPal : " + d.order + "\nDate de cette déclaration : " + d.now;
      },
      sent: "Votre messagerie devrait maintenant afficher votre déclaration de rétractation. Envoyez ce courriel pour exercer votre rétractation. Si rien ne s'est ouvert, copiez le texte ci-dessous et envoyez-le à ",
      copyLink: "Télécharger une copie de votre déclaration",
      required: "Veuillez indiquer votre nom, votre adresse e-mail et le numéro de commande."
    },
    es: {
      order: "Pedido con obligación de pago",
      orderHint: "Marque la casilla de arriba y pulse después el botón de pedido.",
      confTitle: "Confirmación del pedido",
      confLead: "Su confirmación del pedido",
      confText: "Descargue este archivo y consérvelo. Confirma su contrato, las condiciones y su consentimiento.",
      confLink: "Descargar la confirmación del pedido",
      seller: "Vendedor", product: "Producto", price: "Precio", date: "Fecha y hora del pedido",
      orderId: "Número de pedido de PayPal", payment: "Pago", paymentVal: "PayPal",
      finalPrice: "precio final, pago único. Sin IVA (pequeña empresa, artículo 19 UStG).",
      consent: "Su consentimiento, dado antes del pago",
      withdrawal: "Derecho de desistimiento",
      withdrawalText: "Usted aceptó que el suministro empiece antes de que termine el plazo de desistimiento y confirmó saber que pierde su derecho de desistimiento cuando empiece. Con esta confirmación, el derecho de desistimiento se extingue una vez iniciado el suministro (artículo 356.5 BGB). El reembolso voluntario de las condiciones sigue vigente.",
      withdrawOnline: "Desistir en línea",
      terms: "Condiciones vigentes en el momento del pedido",
      termsFallback: "Las condiciones completas están en línea:",
      noticeSubject: "Desistimiento del contrato",
      notice: function (d) {
        return "A: " + d.to + "\n\nPor la presente le comunico que desisto de mi contrato de suministro del siguiente contenido digital: " + d.product +
          "\n\nPedido el: " + (d.date || "-") + "\nNombre: " + d.name + "\nCorreo para la confirmación de recepción: " + d.email +
          "\nNúmero de pedido de PayPal: " + d.order + "\nFecha de esta declaración: " + d.now;
      },
      sent: "Su programa de correo debería mostrar ahora su declaración de desistimiento. Envíe ese correo para ejercer el desistimiento. Si no se abrió nada, copie el texto de abajo y envíelo a ",
      copyLink: "Descargar una copia de su declaración",
      required: "Indique su nombre, su dirección de correo y el número de pedido."
    }
  };

  function t(lang) { return T[lang] || T.en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(value, currency, lang) {
    var n = Number(value);
    var s = isFinite(n) ? n.toFixed(2) : String(value);
    if (lang !== "en") s = s.replace(".", ",");
    return (currency || "EUR") + " " + s;
  }
  function el(x) { return typeof x === "string" ? document.querySelector(x) : x; }
  function absolute(url) { try { return new URL(url, location.href).href; } catch (e) { return url; } }
  function sellerLine(lang, business, email) {
    return SELLER.name + ", " + business + ", " + SELLER.street + ", " + SELLER.city + ", " + (COUNTRY[lang] || COUNTRY.en) + ", " + email;
  }
  function fileLink(text, type, name, label) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    a.textContent = label;
    a.className = "btn noble-download";
    return a;
  }

  // 1. Order button. Returns { button, setLang }. opts: consent, paypal, lang, price, currency, onOrder, label (optional).
  // setLang(lang) rewrites the button for a page that switches language without a reload.
  function gate(opts) {
    var box = el(opts.consent), pp = el(opts.paypal);
    var btn = document.createElement("button");
    var label = function () { return (opts.label || t(opts.lang).order) + " · " + money(opts.price, opts.currency, opts.lang); };
    btn.type = "button";
    btn.className = "btn noble-order-btn";
    btn.textContent = label();
    btn.disabled = !box.checked;
    pp.parentNode.insertBefore(btn, pp);
    pp.hidden = true;
    box.addEventListener("change", function () {
      btn.disabled = !box.checked;
      if (!box.checked) { pp.hidden = true; btn.hidden = false; }
    });
    btn.addEventListener("click", function () {
      if (!box.checked) return;
      btn.hidden = true;
      pp.hidden = false;
      opts.onOrder();
    });
    return { button: btn, setLang: function (lang) { opts.lang = lang; btn.textContent = label(); } };
  }

  // The rendered legal block of a page, or "" if it cannot be read.
  function legalBlock(url) {
    if (!url || !window.fetch) return Promise.resolve("");
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(""); }, 4000); });
    var read = fetch(url, { credentials: "omit" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (h) {
      var m = /<!-- noble-legal:start -->([\s\S]*?)<!-- noble-legal:end -->/.exec(h);
      return m ? m[1].replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, "$1") : "";
    }).catch(function () { return ""; });
    return Promise.race([read, timeout]);
  }

  // 2. Confirmation file. opts: lang, business, product, price, currency, orderId, consentText,
  // email, termsUrl, withdrawalUrl, withdrawUrl, mount. Resolves with the file's HTML once the
  // download link is on the page.
  function confirm(opts) {
    var L = t(opts.lang), now = new Date();
    var when = now.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
    return Promise.all([legalBlock(opts.termsUrl), legalBlock(opts.withdrawalUrl)]).then(function (blocks) {
      var rows = [
        [L.seller, sellerLine(opts.lang, opts.business, opts.email)],
        [L.product, opts.product],
        [L.price, money(opts.price, opts.currency, opts.lang) + ", " + L.finalPrice],
        [L.date, when],
        [L.orderId, opts.orderId],
        [L.payment, L.paymentVal]
      ];
      var links = [opts.termsUrl, opts.withdrawalUrl].filter(Boolean).map(absolute);
      var doc = "<!doctype html><html lang=\"" + esc(opts.lang) + "\"><head><meta charset=\"utf-8\"><title>" +
        esc(L.confTitle + " · " + opts.business + " · " + opts.orderId) + "</title>" +
        "<style>body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:2em auto;padding:0 1em;color:#111}" +
        "th{text-align:left;vertical-align:top;padding:4px 12px 4px 0}td{padding:4px 0}.box{border:1px solid #999;padding:8px 12px}</style></head><body>" +
        "<h1>" + esc(L.confTitle) + ": " + esc(opts.business) + "</h1><table>" +
        rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("") +
        "</table><h2>" + esc(L.consent) + "</h2><p class=\"box\">" + esc(opts.consentText) + "</p>" +
        "<h2>" + esc(L.withdrawal) + "</h2><p>" + esc(L.withdrawalText) + "</p>" +
        (opts.withdrawUrl ? "<p>" + esc(L.withdrawOnline) + ": " + esc(absolute(opts.withdrawUrl)) + "</p>" : "") +
        "<h2>" + esc(L.terms) + "</h2>" +
        (blocks[0] || blocks[1] ? "<section>" + blocks[0] + "</section><section>" + blocks[1] + "</section>"
          : "<p>" + esc(L.termsFallback) + " " + links.map(esc).join(", ") + "</p>") +
        "</body></html>";
      var mount = el(opts.mount);
      if (mount) {
        var box = document.createElement("div");
        box.className = "noble-confirmation";
        var h = document.createElement("h3"); h.textContent = L.confLead;
        var p = document.createElement("p"); p.textContent = L.confText;
        box.appendChild(h); box.appendChild(p);
        box.appendChild(fileLink(doc, "text/html", opts.business.replace(/\W+/g, "-").toLowerCase() + "-order-" + opts.orderId + ".html", L.confLink));
        mount.insertBefore(box, mount.firstChild);
      }
      return doc;
    });
  }

  // 3. Electronic withdrawal function.
  function bindWithdraw(form) {
    var d = form.dataset, L = t(d.lang), out = form.querySelector(".noble-withdraw-result");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (n) { return (form.elements[n] && form.elements[n].value || "").trim(); };
      if (!v("name") || !v("email") || !v("order")) { out.hidden = false; out.textContent = L.required; return; }
      var text = L.notice({
        to: sellerLine(d.lang, d.business, d.email), product: d.product, date: v("date"),
        name: v("name"), email: v("email"), order: v("order"),
        now: new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")
      });
      var subject = L.noticeSubject + ": " + d.business + ", " + v("order");
      out.hidden = false;
      out.innerHTML = "";
      var p = document.createElement("p"); p.textContent = L.sent + d.email + ".";
      var ta = document.createElement("textarea"); ta.readOnly = true; ta.rows = 12; ta.value = text; ta.style.width = "100%";
      out.appendChild(p); out.appendChild(ta);
      out.appendChild(fileLink(text, "text/plain;charset=utf-8", "withdrawal-" + v("order").replace(/\W+/g, "") + ".txt", L.copyLink));
      window.nobleWithdrawNotice = { subject: subject, text: text };
      location.href = "mailto:" + d.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
    });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-noble-withdraw]");
    for (var i = 0; i < forms.length; i++) bindWithdraw(forms[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.NobleOrder = { gate: gate, confirm: confirm, strings: T };
})();
