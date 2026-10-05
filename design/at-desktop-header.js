/* Abby's Table — desktop marketing-header scroll behaviour (5 Oct 2026).
 *
 * WHAT IT DOES
 * From 1024px (the site's desktop breakpoint) a header that opts in with
 * data-at-desk-hdr="marketing" moves out of view after a meaningful downward scroll, comes back
 * after a meaningful upward scroll, and is always in its normal place near the top of the page.
 * It is the same header element in every state; only a transform changes.
 *
 * WHAT IT DOES NOT TOUCH
 * Below 1024 it does nothing at all: the pages' own mobile logic (data-hidden) is untouched. Pages
 * without the opt-in attribute (ordering steps, checkout, payment, account, log in, legal, error,
 * dish pages) are not affected.
 *
 * STATES  (data-desk-hidden on the header)
 *   normal   — near the top (scrollY below the header's height): always shown, never hidden.
 *   hidden   — "true": translateY(-100%) via the header's existing transform transition.
 *   revealed — "false" further down: the existing sticky header, back in view.
 *
 * HYSTERESIS
 * Travel is measured from the turning point, not from the last event, so trackpad momentum
 * jitter (a few px either way) never flips the state:
 *   shown  → hidden   after 40px of travel down from the highest point since it was shown;
 *   hidden → shown    after 64px of travel up from the lowest point since it was hidden.
 * Reveal needs more travel than hide because an accidental reveal covers content; an accidental
 * hide costs nothing.
 *
 * Also: one passive scroll listener for the page; attributes are written only on change.
 * Focus inside the header always shows it (keyboard users). An in-page anchor jump keeps it out
 * of the way so it cannot cover the target. prefers-reduced-motion is honoured by each page's
 * existing `.at-hdr { transition: none }` rule.
 */
(function () {
  if (window.__atDeskHdr) return;
  window.__atDeskHdr = true;
  var SEL = 'header.at-hdr[data-at-desk-hdr="marketing"]';
  var HIDE = 40, REVEAL = 64, JUMP_MS = 450;
  var mq = window.matchMedia("(min-width: 1024px)");

  // Outranks each page's desktop `.at-hdr[data-hidden="true"] { transform: none !important }` by
  // specificity, and neutralises the mobile data-hidden state at desktop on opted-in pages only.
  var css = document.createElement("style");
  css.setAttribute("data-at-desk-hdr", "");
  css.textContent = "@media (min-width:1024px){" +
    SEL + '[data-hidden="true"]{transform:none!important}' +
    SEL + '[data-desk-hidden="true"]{transform:translateY(-100%)!important}}';
  (document.head || document.documentElement).appendChild(css);

  var hidden = false, ref = 0, jumpUntil = 0, el = null;

  function hdr() {
    if (!el || !el.isConnected) el = document.querySelector(SEL);
    return el;
  }
  function write(h) {
    var e = hdr();
    if (!e) return;
    var v = h ? "true" : "false";
    if (e.getAttribute("data-desk-hidden") !== v) e.setAttribute("data-desk-hidden", v);
  }
  function set(h, y) { hidden = h; ref = y; write(h); }

  function tick() {
    var e = hdr();
    if (!e) return;
    if (!mq.matches) { if (e.hasAttribute("data-desk-hidden")) e.removeAttribute("data-desk-hidden"); hidden = false; return; }
    var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
    var top = e.offsetHeight || 80;
    if (y <= top) { set(false, y); return; }
    if (Date.now() < jumpUntil) { set(true, y); return; }
    if (e.contains(document.activeElement)) { set(false, y); return; }
    if (hidden) {
      if (y > ref) ref = y;
      else if (ref - y >= REVEAL) set(false, y);
    } else {
      if (y < ref) ref = y;
      else if (y - ref >= HIDE) set(true, y);
    }
    // Re-assert after a component re-render replaced or reset the element.
    write(hidden);
  }
  // Browsers already dispatch scroll at most once per frame, so the work runs in the event itself
  // (a rAF hop adds a frame of lag and is throttled in background/embedded frames). The handler
  // only reads scrollY and the header's height, and writes an attribute when the state changes.
  function onScroll() { tick(); }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  if (mq.addEventListener) mq.addEventListener("change", onScroll); else if (mq.addListener) mq.addListener(onScroll);
  document.addEventListener("focusin", function (ev) {
    var e = hdr();
    if (e && mq.matches && e.contains(ev.target) && hidden) set(false, window.scrollY || 0);
  });
  // In-page anchor: keep the header out of the way for the jump so it cannot cover the target.
  document.addEventListener("click", function (ev) {
    if (!mq.matches || ev.defaultPrevented || ev.button !== 0) return;
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href*="#"]') : null;
    if (!a || a.closest(SEL)) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) jumpUntil = Date.now() + JUMP_MS;
  }, true);
  window.addEventListener("hashchange", function () { if (mq.matches && location.hash.length > 1) jumpUntil = Date.now() + JUMP_MS; });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onScroll); else onScroll();
})();
