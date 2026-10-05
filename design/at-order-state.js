/* Abby's Table — order-in-progress state, shared across the site.
 *
 * WHY THIS EXISTS
 * Once a customer has started a box in checkout step 1, the marketing pages must stop inviting
 * them to start one. "Get started" becomes VIEW BOX, and the mobile purchase bar stops selling
 * ("Minimum 6 dishes · From £158") and starts reporting ("6-dish box · £105 · VIEW BOX").
 *
 * HOW IT IS LOADED
 * A plain <script src> in each page's <helmet>. It self-initialises, so a page needs no other
 * code. One file, so the behaviour cannot drift between pages.
 *
 * STORAGE
 * sessionStorage, key `at-order-v1`. An order in progress is session-scoped: localStorage would
 * leave a stale "VIEW BOX" on a page weeks later, promising a box that no longer exists. All
 * access is inside try/catch — private modes and blocked storage must not break a marketing page.
 *
 * FAIL-SAFE
 * If storage is unreadable, invalid, or this script never loads, every page keeps its normal
 * selling chrome. The order state only ever ADDS information; its absence is the safe default.
 */
(function () {
  "use strict";

  var KEY = "at-order-v1";
  var BOX_HREF = "Abby's Table - Choose Box v2.dc.html";

  function read() {
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      // An invalid stored value is not an order. Same rule as the consent manager.
      if (!o || typeof o !== "object") return null;
      if (typeof o.label !== "string" || !o.label) return null;
      if (typeof o.total !== "string" || !o.total) return null;
      return o;
    } catch (e) { return null; }
  }

  /* ACTIVE BOX — the one rule (mirrored verbatim as atIsActive in each checkout step's order block):
     a valid record is ACTIVE when the box is COMMITTED (Step 1 → Step 2) or genuinely holds a dish,
     a carried Step-1 dish included. An empty committed box is active; dish count is not the only
     signal. Gift intent is a property of the box, never what makes it active. */
  function dishCount(o) {
    var sn = (o && o.snap) || {}, ks = ["s2", "s4", "s3", "s5"];
    for (var i = 0; i < ks.length; i++) { var x = sn[ks[i]]; if (x && Object.prototype.toString.call(x.lines) === "[object Array]") { var n = 0; for (var j = 0; j < x.lines.length; j++) n += parseInt(x.lines[j].qty, 10) || 0; return n; } }
    return sn.s1 && sn.s1.okraIn ? Math.max(1, parseInt(sn.s1.okraQty, 10) || 1) : 0;
  }
  function isActive(o) { return !!(o && o.label && o.total && (o.boxCommitted === true || dishCount(o) > 0)); }

  function save(order) {
    try {
      if (!order || !order.label || !order.total) return;
      // Merged, not replaced: the record also carries the step last reached and each step's
      // snapshot (written by the checkout steps), which a label/total update must not wipe.
      var prev = read() || {};
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.v = 1; next.ts = Date.now(); next.lastActivityAt = next.ts; next.label = String(order.label); next.total = String(order.total);
      if (!next.step) { next.step = 1; next.href = BOX_HREF + "?resume=1"; }
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
    apply();
  }

  function clear() {
    try { window.sessionStorage.removeItem(KEY); } catch (e) {}
  }

  var BOX_GLYPH =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green-forest)"' +
    ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/></svg>';

  /* The header pill. Terracotta "Get started" becomes a brand-green VIEW BOX: a different job,
     so a different colour — terracotta is reserved for starting a purchase. */
  function applyHeader(order) {
    var sels = [".at-hdr .at-cta", "header .at-cta", ".at-hdr-cta", "header .at-hdr-cta"];
    for (var i = 0; i < sels.length; i++) {
      var els = document.querySelectorAll(sels[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el.closest(".at-drawer")) continue; // the drawer CTA is handled separately
        if (el.getAttribute("data-at-order") === "on") continue;
        el.setAttribute("data-at-order", "on");
        el.setAttribute("data-at-order-label", el.textContent.trim());
        el.textContent = "View box";
        el.style.setProperty("background", "var(--green-forest)", "important");
        el.style.setProperty("color", "var(--blush)", "important");
        el.style.textTransform = "uppercase";
        el.style.letterSpacing = ".12em";
        if (el.tagName === "A") el.setAttribute("href", resumeHref(order));
      }
    }
  }

  // VIEW BOX returns to the step last reached, restored, rather than to step 1.
  function resumeHref(order) { return order && typeof order.href === "string" && order.href.indexOf("Abby's Table - ") === 0 ? order.href : BOX_HREF; }

  /* The mobile purchase bar. Band colour, height and pill treatment are untouched — only what
     the bar SAYS changes, from an offer to the order the customer already has. */
  function applyBar(order) {
    var bars = document.querySelectorAll(".at-mobbar");
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      if (bar.getAttribute("data-at-order") === "on") continue;

      var cta = bar.querySelector(".at-mobbar-cta");
      var blurb = null;
      for (var k = 0; k < bar.children.length; k++) {
        if (bar.children[k] !== cta) { blurb = bar.children[k]; break; }
      }
      if (!blurb || !cta) continue;

      bar.setAttribute("data-at-order", "on");

      blurb.innerHTML =
        '<span style="display: flex; align-items: center; gap: 13px; min-width: 0;">' +
          '<span style="flex: 0 0 auto; width: 46px; height: 46px; border-radius: 50%;' +
          ' background: var(--sand); display: flex; align-items: center; justify-content: center;">' +
            BOX_GLYPH +
          "</span>" +
          '<span style="min-width: 0; display: block;">' +
            '<span style="display: block; margin-bottom: 3px; font-family: var(--font-sans);' +
            ' font-size: 16px; color: var(--brown);">' + esc(order.label) + "</span>" +
            '<span style="display: block; font-family: var(--font-display);' +
            ' font-weight: var(--weight-medium); font-size: 21px; line-height: 1.1;' +
            ' color: var(--green-forest);">' + esc(order.total) + "</span>" +
          "</span>" +
        "</span>";

      // Caps, no arrow, original colour — the same label as the header so one order reads as one
      // thing wherever the customer meets it.
      cta.textContent = "View box";
      cta.style.textTransform = "uppercase";
      cta.style.letterSpacing = ".12em";
      if (cta.tagName === "A") cta.setAttribute("href", resumeHref(order));
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var observer = null;
  var raf = 0;

  function apply() {
    var order = read();
    if (!isActive(order)) return;
    // Disconnect while writing: the observer would otherwise see its own mutations and re-enter.
    if (observer) observer.disconnect();
    try {
      applyHeader(order);
      applyBar(order);
    } catch (e) {}
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  /* The pages are re-rendered by their component after this script runs, so a one-shot pass on
     load would be undone. Watching the DOM is the documented pattern here (build-handoff § 3x):
     post-render work needs a poll or an observer, never a single callback. */
  function start() {
    if (!document.body) { requestAnimationFrame(start); return; }
    apply();
    if (typeof MutationObserver !== "undefined" && !observer) {
      observer = new MutationObserver(function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(apply);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    // Another tab in the same session may start or finish an order.
    window.addEventListener("pageshow", apply);
  }

  window.ATOrder = { read: read, save: save, clear: clear, apply: apply, isActive: isActive, dishCount: dishCount, KEY: KEY };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
