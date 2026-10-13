// PayPal Smart Buttons checkout. Client ID and environment come only from config.js.
// The buyer ticks the consent box, then presses the own order button (Section 312j(3) BGB, from noble-order.js).
// Only that click loads the PayPal SDK, so PayPal sees no visitor who is not buying.
(function () {
  "use strict";
  var cfg = window.NOBLE_CONFIG || {};
  var loaded = false, consented = false, order = null;
  var PRODUCT = "Overdue Kit, full letter kit (digital, instant access)";
  function $(s) { return document.querySelector(s); }
  function status(t) { var el = $("#pp-status"); if (el) el.textContent = t; }
  function track(n) { if (window.nobleTrack) window.nobleTrack(n); }

  function ready() {
    if (!cfg.PAYPAL_CLIENT_ID) return "Checkout is not available yet (no PayPal client ID configured).";
    if (cfg.PAYPAL_ENV === "live" && !cfg.SUPPORT_EMAIL) return "Checkout is not available yet (support address missing).";
    return "";
  }

  function load() {
    loaded = true;
    status("Loading PayPal checkout...");
    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cfg.PAYPAL_CLIENT_ID) +
      "&currency=" + encodeURIComponent(cfg.CURRENCY || "EUR") + "&intent=capture&components=buttons";
    s.onload = render;
    s.onerror = function () { loaded = false; status("PayPal could not be loaded. Check your connection or ad blocker, then press the order button again."); if (order) order.button.hidden = false; };
    document.head.appendChild(s);
  }

  function render() {
    window.paypal.Buttons({
      style: { layout: "vertical", label: "buynow", shape: "rect" },
      createOrder: function (data, actions) {
        track("checkout_start");
        return actions.order.create({
          purchase_units: [{ description: PRODUCT,
            amount: { currency_code: cfg.CURRENCY || "EUR", value: cfg.PRICE } }],
          application_context: { shipping_preference: "NO_SHIPPING", brand_name: "Overdue Kit" }
        });
      },
      onApprove: function (data, actions) {
        status("Confirming payment...");
        return actions.order.capture().then(function (details) {
          if (details && details.status === "COMPLETED") {
            track(cfg.PAYPAL_ENV === "live" ? "payment_complete" : "payment_complete_sandbox");
            status("Payment complete. Download your order confirmation below.");
            // The confirmation (Section 312f BGB) is offered before the unlock.
            return window.NobleOrder.confirm({
              lang: "en", business: "Overdue Kit", product: PRODUCT, price: cfg.PRICE, currency: cfg.CURRENCY || "EUR",
              orderId: details.id, consentText: $("#consent").parentNode.textContent.trim(), email: cfg.SUPPORT_EMAIL,
              termsUrl: "legal/terms.html", withdrawalUrl: "legal/refund.html", withdrawUrl: "legal/withdraw.html", mount: "#thanks"
            }).catch(function () {}).then(function () { window.overdueKitUnlock(details.id); });
          } else {
            status("Payment was not completed (status " + (details && details.status) + "). You have not been charged for an incomplete order. Order ID: " + data.orderID);
          }
        });
      },
      onCancel: function () { status("Checkout cancelled. Nothing was charged."); track("checkout_cancel"); },
      onError: function (err) { status("Something went wrong with PayPal. Nothing was charged. Please try again."); track("checkout_error"); if (window.console) console.error(err); }
    }).render("#paypal-buttons").then(function () { status("Choose PayPal or card to pay."); window.nobleCheckoutRendered = true; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var box = $("#consent"), btns = $("#paypal-buttons");
    if (!box) return;
    var problem = ready();
    if (problem) { status(problem); box.disabled = true; return; }
    box.addEventListener("change", function () {
      if (box.checked && !consented) { consented = true; track("consent"); }
      status(box.checked ? "Press the order button to continue to PayPal." : "Tick the box above, then press the order button.");
    });
    order = window.NobleOrder.gate({
      consent: box, paypal: btns, lang: "en", price: cfg.PRICE, currency: cfg.CURRENCY || "EUR",
      onOrder: function () { if (!loaded) load(); else status("Choose PayPal or card to pay."); }
    });
  });
})();
