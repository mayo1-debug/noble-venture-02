// PayPal Smart Buttons checkout. Client ID and environment come only from config.js.
// The SDK loads only after the buyer ticks the consent box, so PayPal sees no visitor who is not buying.
(function () {
  "use strict";
  var cfg = window.NOBLE_CONFIG || {};
  var loaded = false;
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
    s.onerror = function () { loaded = false; status("PayPal could not be loaded. Check your connection or ad blocker, then tick the box again."); };
    document.head.appendChild(s);
  }

  function render() {
    window.paypal.Buttons({
      style: { layout: "vertical", label: "pay", shape: "rect" },
      createOrder: function (data, actions) {
        track("checkout_start");
        return actions.order.create({
          purchase_units: [{ description: "Overdue Kit, full letter kit (digital, instant access)",
            amount: { currency_code: cfg.CURRENCY || "EUR", value: cfg.PRICE } }],
          application_context: { shipping_preference: "NO_SHIPPING", brand_name: "Overdue Kit" }
        });
      },
      onApprove: function (data, actions) {
        status("Confirming payment...");
        return actions.order.capture().then(function (details) {
          if (details && details.status === "COMPLETED") {
            track(cfg.PAYPAL_ENV === "live" ? "payment_complete" : "payment_complete_sandbox");
            window.overdueKitUnlock(details.id);
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
    btns.classList.add("disabled");
    box.addEventListener("change", function () {
      btns.classList.toggle("disabled", !box.checked);
      if (box.checked && !loaded) { track("consent"); load(); }
      if (!box.checked) status("Tick the box above to enable checkout.");
    });
  });
})();
