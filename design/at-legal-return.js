/* "← Back to checkout" on the legal pages (Terms of Sale, Privacy Policy).
   Shown whenever the page carries checkout's origin marker (?from=checkout, added ONLY by
   checkout's legal line). No opener or referrer is required: browsers may sever the opener
   (noopener defaults, Safari, a middle-click) and strip referrers, and a legitimate visit must not
   lose the link. Footer, navigation and ordinary URLs carry no marker, so they never show it.
   Return, in order:
   1. A live checkout tab is reachable (opener): focus it and close this tab.
   2. The browser refuses the close: stay, and say the checkout is still open in the previous tab —
      never open a second checkout while one exists.
   3. No reachable checkout tab (closed, or the opener was severed): follow the href to checkout.
      The prototype keeps the order in per-tab sessionStorage (at-order-v1), which is NOT a
      recovery mechanism across tabs; production must rehydrate checkout from the canonical
      server-side basket/order (see CLAUDE.md, "Legal line"). Nothing here reads or writes order state. */
(function () {
  var fromCk = false;
  try { fromCk = new URLSearchParams(location.search).get("from") === "checkout"; } catch (_) {}
  if (!fromCk) return;
  document.documentElement.setAttribute("data-from-checkout", "");
  function opener() { try { return window.opener && !window.opener.closed ? window.opener : null; } catch (_) { return null; } }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("[data-ck-back]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var op = opener();
    if (!op) return; // checkout tab gone: the href reopens checkout from its saved session snapshot
    e.preventDefault();
    try { op.focus(); } catch (_) {}
    try { window.close(); } catch (_) {}
    setTimeout(function () {
      if (window.closed) return;
      var msg = document.querySelector("[data-ck-back-msg]");
      if (msg) msg.textContent = "Your checkout is still open in your previous tab. Switch back to it to carry on.";
    }, 300);
  });
})();
