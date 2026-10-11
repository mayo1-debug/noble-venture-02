// Cookieless analytics with an owner and agent exclusion filter. Events: see docs/analytics.md.
// Backends (both switched in config.js, empty value = off):
//   COUNTER_NAMESPACE: account-free counter at abacus.jasoncameron.dev (one counter per event name).
//   GOATCOUNTER_ENDPOINT: optional GoatCounter (page views, referrers, events as "event-NAME").
// Visit any page with ?noble=1 to set the exclusion flag in this browser. ?noble=0 clears it.
// When the flag is set, or the browser is automated or a bot, no analytics request fires at all.
(function () {
  var KEY = "noble_exclude";
  var UNIQUE_KEY = "noble_visitor_unique";
  var SRC_KEY = "noble_src_";
  var cfg = window.NOBLE_CONFIG || {};
  function flag() {
    try { return window.localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  try {
    var p = new URLSearchParams(window.location.search).get("noble");
    if (p === "1") window.localStorage.setItem(KEY, "1");
    if (p === "0") window.localStorage.removeItem(KEY);
  } catch (e) {}
  var ua = navigator.userAgent || "";
  var bot = navigator.webdriver === true || /bot|crawl|spider|headless|curl|wget|python|playwright/i.test(ua);
  var excluded = flag() || bot;
  window.nobleAnalyticsOff = excluded || (!cfg.COUNTER_NAMESPACE && !cfg.GOATCOUNTER_ENDPOINT);

  function counter(name) {
    if (!cfg.COUNTER_NAMESPACE) return;
    try {
      var url = "https://abacus.jasoncameron.dev/hit/" + encodeURIComponent(cfg.COUNTER_NAMESPACE) + "/" + encodeURIComponent(name);
      fetch(url, { mode: "cors", keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  function goat(name) {
    if (!cfg.GOATCOUNTER_ENDPOINT || !window.goatcounter || !window.goatcounter.count) return;
    window.goatcounter.count({ path: "event-" + name, title: name, event: true });
  }
  // track(name): one named event, sent to every enabled backend. Does nothing when excluded.
  window.track = function (name) {
    if (excluded) return;
    counter(name);
    goat(name);
  };
  window.nobleTrack = window.track;

  if (excluded) {
    if (document.documentElement) document.documentElement.setAttribute("data-noble-excluded", "1");
    return;
  }
  if (cfg.GOATCOUNTER_ENDPOINT) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", cfg.GOATCOUNTER_ENDPOINT);
    document.head.appendChild(s);
  }
  // visitor_unique: first qualified visit in this browser, on any page, counted once ever.
  var first = false;
  try { first = !window.localStorage.getItem(UNIQUE_KEY); if (first) window.localStorage.setItem(UNIQUE_KEY, new Date().toISOString().slice(0, 10)); } catch (e) {}
  if (first) counter("visitor_unique");
  // pageview_index: every qualified load of the home page.
  var path = window.location.pathname;
  if (/\/(index\.html)?$/.test(path) && !/\/guides\//.test(path)) counter("pageview_index");
  // pageview_guide: every qualified load of a guide page under /guides/.
  if (/\/guides\//.test(path)) counter("pageview_guide");
  // visit_src_<channel>: first qualified visit that carries ?src=<channel>, once per browser and channel.
  try {
    var src = (new URLSearchParams(window.location.search).get("src") || "").toLowerCase();
    if (/^[a-z0-9_-]{1,32}$/.test(src) && !window.localStorage.getItem(SRC_KEY + src)) {
      window.localStorage.setItem(SRC_KEY + src, new Date().toISOString().slice(0, 10));
      window.track("visit_src_" + src);
    }
  } catch (e) {}
})();
