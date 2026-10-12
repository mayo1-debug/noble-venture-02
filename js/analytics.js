// Noble analytics standard, version 1 (12 October 2026).
// Source of truth: Operation-Noble standards/analytics/. Every Noble business copies this file
// unchanged into its site and configures it only through window.NOBLE_CONFIG. Do not edit the copy.
//
// Hard core (README.md in this folder):
// - Counts only when this script runs, so bots that do not run JavaScript are never counted.
// - Owner and agent exclusion: ?noble=1 marks a browser, ?noble=0 clears it; automated browsers
//   (navigator.webdriver) and bot user agents are dropped.
// - AI fetchers that do run JavaScript are counted only as ai_fetch, never as human.
// - Human gate: a page load counts as "visit" at once, but as a qualified human only after a
//   scroll, a click, a key press, a touch, any product event, or 5 seconds visible.
// - Fixed funnel names: visit, qualified_visit, visitor_unique, visit_src_<channel>,
//   checkout_start, payment_complete (and payment_complete_sandbox), each with _src_<channel>
//   for the first channel a browser arrived from.
// - Visitors referred by an AI assistant (ChatGPT, Claude, Perplexity, Gemini, Copilot) are real
//   people: they count as human with channel "ai".
//
// Config (window.NOBLE_CONFIG): COUNTER_NAMESPACE (or ABACUS_NAMESPACE), GOATCOUNTER_CODE or
// GOATCOUNTER_ENDPOINT, optional ANALYTICS_HOSTS (only count on these host names), optional
// SRC_CHANNELS (allowed ?src values; "ai" is always allowed).
// API: NobleAnalytics.track(name, oncePerPage). window.track and window.nobleTrack are aliases.
(function (root) {
  'use strict';
  var cfg = root.NOBLE_CONFIG || {};
  var doc = root.document;
  var nav = root.navigator || {};
  var loc = root.location || { search: '', hostname: '', pathname: '/' };
  var FLAG = 'noble_exclude';
  var BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|playwright|puppeteer|selenium/i;
  var AI_UA = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|Bytespider|CCBot|meta-externalagent|Amazonbot|Applebot-Extended|cohere-ai|DuckAssistBot|MistralAI-User/i;
  var AI_REF = /(^|\.)(chatgpt\.com|chat\.openai\.com|claude\.ai|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|chat\.mistral\.ai|you\.com|phind\.com)$/i;
  var GATE_MS = 5000;
  var PER_SRC = { checkout_start: 1, payment_complete: 1, payment_complete_sandbox: 1 };

  function store(fn) { try { return fn(root.localStorage); } catch (e) { return null; } }
  function param(name) { try { return new URLSearchParams(loc.search).get(name); } catch (e) { return null; } }

  var q = param('noble');
  if (q === '1') store(function (s) { s.setItem(FLAG, '1'); });
  if (q === '0') store(function (s) { s.removeItem(FLAG); });

  var ua = nav.userAgent || '';
  var ns = cfg.COUNTER_NAMESPACE || cfg.ABACUS_NAMESPACE || '';
  var goatUrl = cfg.GOATCOUNTER_ENDPOINT ||
    (cfg.GOATCOUNTER_CODE ? 'https://' + cfg.GOATCOUNTER_CODE + '.goatcounter.com/count' : '');
  var hosts = cfg.ANALYTICS_HOSTS || [];

  var reason = null;
  var aiFetcher = AI_UA.test(ua);
  if (q === '1' || store(function (s) { return s.getItem(FLAG); }) === '1') reason = 'noble flag';
  else if (!aiFetcher && nav.webdriver === true) reason = 'automated browser';
  else if (!aiFetcher && BOT_UA.test(ua)) reason = 'bot user agent';
  else if (hosts.length && hosts.indexOf(loc.hostname) < 0) reason = 'host not in ANALYTICS_HOSTS';
  else if (!ns && !goatUrl) reason = 'no backend configured';
  if (!reason && aiFetcher) reason = 'ai fetcher';

  function send(name) {
    if (ns) {
      var url = 'https://abacus.jasoncameron.dev/hit/' + encodeURIComponent(ns) + '/' + encodeURIComponent(name);
      try { root.fetch(url, { mode: 'cors', keepalive: true }).catch(function () {}); } catch (e) {}
    }
    if (goatUrl && root.goatcounter && root.goatcounter.count) {
      root.goatcounter.count({ path: 'event-' + name, title: name, event: true });
    }
  }

  // An AI fetcher that runs JavaScript is counted once per page as ai_fetch and nothing else.
  if (reason === 'ai fetcher') send('ai_fetch');
  var enabled = !reason;

  // Channel: ?src=<channel> wins; otherwise a referrer from an AI assistant means channel "ai".
  var channels = cfg.SRC_CHANNELS || null;
  var src = (param('src') || '').toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(src) || (channels && channels.indexOf(src) < 0 && src !== 'ai')) src = '';
  if (!src && doc && doc.referrer) {
    try { if (AI_REF.test(new URL(doc.referrer).hostname)) src = 'ai'; } catch (e) {}
  }
  var firstSrc = enabled ? store(function (s) { return s.getItem('noble_first_src'); }) : null;

  var page = (doc && doc.currentScript && doc.currentScript.getAttribute('data-page')) ||
    (doc && doc.body && doc.body.getAttribute('data-page')) ||
    ((loc.pathname || '/').split('/').pop() || 'index').replace(/\.html$/, '') || 'index';

  var qualified = false;
  var sent = {};
  var queue = [];

  function qualify() {
    if (!enabled || qualified) return;
    qualified = true;
    send('qualified_visit');
    send('pageview_' + page);
    if (store(function (s) { return s.getItem('noble_visitor_unique'); }) !== '1') {
      store(function (s) { s.setItem('noble_visitor_unique', '1'); });
      send('visitor_unique');
    }
    if (src && store(function (s) { return s.getItem('noble_src_' + src); }) !== '1') {
      store(function (s) {
        s.setItem('noble_src_' + src, '1');
        if (!s.getItem('noble_first_src')) s.setItem('noble_first_src', src);
      });
      if (!firstSrc) firstSrc = src;
      send('visit_src_' + src);
    }
    while (queue.length) send(queue.shift());
    disarm();
  }

  // track(name): a product or funnel event. Product events come from a person acting, so the
  // first one also passes the human gate.
  function track(name, oncePerPage) {
    if (!enabled || !name) return;
    if (oncePerPage && sent[name]) return;
    sent[name] = true;
    qualify();
    send(name);
    if (PER_SRC[name] && firstSrc) send(name + '_src_' + firstSrc);
  }

  var GATE_EVENTS = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
  var timer = null;
  var visibleSince = null;
  var visibleMs = 0;
  function onEvent() { qualify(); }
  function tick() {
    if (!doc || doc.visibilityState === 'visible') {
      visibleSince = Date.now();
      timer = root.setTimeout(qualify, Math.max(0, GATE_MS - visibleMs));
    }
  }
  function onVisibility() {
    if (doc.visibilityState === 'visible') { tick(); return; }
    if (timer) root.clearTimeout(timer);
    timer = null;
    if (visibleSince) visibleMs += Date.now() - visibleSince;
    visibleSince = null;
  }
  function disarm() {
    if (timer) root.clearTimeout(timer);
    timer = null;
    if (!root.removeEventListener) return;
    GATE_EVENTS.forEach(function (e) { root.removeEventListener(e, onEvent, true); });
    if (doc && doc.removeEventListener) doc.removeEventListener('visibilitychange', onVisibility);
  }

  if (enabled) {
    if (goatUrl && doc && doc.createElement) {
      var s = doc.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', goatUrl);
      doc.head.appendChild(s);
    }
    send('visit');
    if (root.addEventListener) GATE_EVENTS.forEach(function (e) { root.addEventListener(e, onEvent, { capture: true, passive: true }); });
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', onVisibility);
    tick();
  } else if (doc && doc.documentElement && reason !== 'no backend configured') {
    doc.documentElement.setAttribute('data-noble-excluded', '1');
  }

  root.NobleAnalytics = { track: track, enabled: enabled, reason: reason, version: 1, isQualified: function () { return qualified; } };
  root.track = track;
  root.nobleTrack = track;
})(typeof window !== 'undefined' ? window : this);
