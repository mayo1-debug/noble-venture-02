// Newsletter sign-up through Buttondown's embed form (https://docs.buttondown.com/building-your-subscriber-base).
// Shown only when NOBLE_CONFIG.BUTTONDOWN_USERNAME is set. The form submits normally (Buttondown asks for a
// plain form post, not fetch, so its confirmation and CAPTCHA steps work) into a new tab, so the visitor
// stays on the page. Buttondown then sends a confirmation email (double opt-in).
(function () {
  "use strict";
  var user = (window.NOBLE_CONFIG || {}).BUTTONDOWN_USERNAME;
  function init() {
    var boxes = document.querySelectorAll(".newsletter");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i], form = box.querySelector("form");
      if (!user || !form) continue;
      form.action = "https://buttondown.com/api/emails/embed-subscribe/" + encodeURIComponent(user);
      form.addEventListener("submit", function () { if (window.nobleTrack) window.nobleTrack("newsletter_signup"); });
      box.hidden = false;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
