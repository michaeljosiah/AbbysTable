/* Abby's Table — signed-in state, shared across the site.
 *
 * WHAT IT DOES
 * A signed-in customer sees "My Account" where everyone else sees "Log in" — in the header
 * (.at-login) and in the mobile drawer (the drawer's Log in link). Only the LABEL changes; the
 * link goes to the account page (Abby's Table - My Account.dc.html); the original href is kept in
 * data-at-acct-href and restored on sign-out.
 *
 * HOW IT IS LOADED
 * A plain <script src> in each live page's <helmet>, next to at-order-state.js. Self-initialising.
 *
 * PROTOTYPE ONLY
 * localStorage key `at-account-v1` = { v: 1, ts, email? }. It is a DISPLAY flag, never an identity: in
 * production the server session decides whether the customer is signed in and renders the label
 * itself (see build-handoff.md "Signed-in state"). localStorage, not sessionStorage, because a
 * real session is shared by every tab in the browser (legal pages open in new tabs). Expires after
 * 24 hours so a demo machine does not stay "signed in" for ever.
 *
 * FAIL-SAFE
 * Unreadable, invalid or expired ⇒ signed OUT, and every page shows "Log in". The state only ever
 * changes a label; its absence is the safe default.
 */
(function () {
  "use strict";

  var KEY = "at-account-v1";
  var TTL = 24 * 60 * 60 * 1000;
  var LABEL = "My Account";
  var ACCOUNT_HREF = "Abby's Table - My Account.dc.html";

  function signedIn() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (!o || o.v !== 1 || typeof o.ts !== "number") return false;
      if (Date.now() - o.ts > TTL) { window.localStorage.removeItem(KEY); return false; }
      return true;
    } catch (e) { return false; }
  }

  function signIn(email) {
    var rec = { v: 1, ts: Date.now() };
    if (typeof email === "string" && email.indexOf("@") > 0) rec.email = email;
    try { window.localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
    apply();
  }

  // Prototype convenience so checkout can prefill the email. Production fills details from the session.
  function email() {
    if (!signedIn()) return "";
    try { var o = JSON.parse(window.localStorage.getItem(KEY)); return typeof o.email === "string" ? o.email : ""; } catch (e) { return ""; }
  }

  function signOut() {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    apply();
  }

  // The header link wraps its text in a span (for the underline); the drawer link does not.
  function textHost(el) {
    var s = el.querySelector("span");
    return s && !s.querySelector("*") ? s : el;
  }

  function targets() {
    var out = [];
    var hdr = document.querySelectorAll(".at-login");
    for (var i = 0; i < hdr.length; i++) out.push(hdr[i]);
    var dr = document.querySelectorAll(".at-drawer-link");
    for (var j = 0; j < dr.length; j++) {
      var t = (dr[j].getAttribute("data-at-acct-label") || dr[j].textContent).trim();
      if (t === "Log in") out.push(dr[j]);
    }
    return out;
  }

  var observer = null, raf = 0;

  function apply() {
    var on = signedIn();
    if (observer) observer.disconnect();
    try {
      var els = targets();
      for (var i = 0; i < els.length; i++) {
        var el = els[i], host = textHost(el);
        if (on) {
          if (el.getAttribute("href") !== ACCOUNT_HREF) {
            if (!el.getAttribute("data-at-acct-href")) el.setAttribute("data-at-acct-href", el.getAttribute("href") || "");
            el.setAttribute("href", ACCOUNT_HREF);
          }
          if (host.textContent.trim() === LABEL) continue;
          if (!el.getAttribute("data-at-acct-label")) el.setAttribute("data-at-acct-label", host.textContent.trim());
          host.textContent = LABEL;
        } else {
          if (el.getAttribute("data-at-acct-href")) el.setAttribute("href", el.getAttribute("data-at-acct-href"));
          if (el.getAttribute("data-at-acct-label") && host.textContent.trim() === LABEL) host.textContent = el.getAttribute("data-at-acct-label");
        }
      }
    } catch (e) {}
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // Components re-render after this runs, so watch the DOM rather than applying once.
  function start() {
    if (!document.body) { requestAnimationFrame(start); return; }
    apply();
    if (typeof MutationObserver !== "undefined" && !observer) {
      observer = new MutationObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    window.addEventListener("pageshow", apply);
    window.addEventListener("storage", function (e) { if (e.key === KEY || e.key === null) apply(); });
  }

  window.ATAccount = { signedIn: signedIn, email: email, signIn: signIn, signOut: signOut, apply: apply, KEY: KEY };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
