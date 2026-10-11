// Single source of truth for environment values. Nothing else in the site may hard-code these.
// The PayPal client ID is public. The PayPal SECRET must never be placed in this repo.
window.NOBLE_CONFIG = {
  // "sandbox" or "live". The owner switches to "live" after pasting the live client ID below.
  PAYPAL_ENV: "live",
  // "sb" is PayPal's documented public sandbox test client ID.
  PAYPAL_CLIENT_ID_SANDBOX: "sb",
  // Owner fills this in from developer.paypal.com > Apps & Credentials > Live. See noble/PING.md.
  PAYPAL_CLIENT_ID_LIVE: "BAATHyWOzpdh0unmjeb7uu-84aM0mQWCr_65O14OLTVVSeBWqr9B1CuaN9Aa2b3AleP0Kb6oKt2NfWq-3M",
  CURRENCY: "EUR",
  // One-time price. No VAT charged (Section 19 UStG).
  PRICE: "19.00",
  // Account-free event counter (abacus.jasoncameron.dev), same backend as noble-venture-03 and -04.
  // Empty string means the counter is OFF. See docs/analytics.md.
  COUNTER_NAMESPACE: "overdue-kit-nv02",
  // Optional second backend: GoatCounter endpoint, for example "https://YOURCODE.goatcounter.com/count".
  // Empty string means GoatCounter is OFF.
  GOATCOUNTER_ENDPOINT: "",
  // Owner sets a real support address before switching to live. Live checkout stays off while this is empty.
  SUPPORT_EMAIL: "support.toolkits.desk@gmail.com"
};
window.NOBLE_CONFIG.PAYPAL_CLIENT_ID =
  window.NOBLE_CONFIG.PAYPAL_ENV === "live"
    ? window.NOBLE_CONFIG.PAYPAL_CLIENT_ID_LIVE
    : window.NOBLE_CONFIG.PAYPAL_CLIENT_ID_SANDBOX;
