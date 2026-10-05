/* Abby's Table — contextual edit return (site-wide helper, window.ATReturn).
   A page that sends the customer to an earlier step to EDIT one part of an otherwise complete
   order adds an explicit context to that step's URL: `?return=<target>` (e.g. `return=review`).
   The context lives in the URL only — never in the order snapshot — so it survives refresh and
   the Standards round trip, and it cannot leak into a normal visit (VIEW BOX, step 1 → step 2).

   Source page:  ATReturn.leave("dishes") as the Change link is followed (records the section).
   Edit page:    ATReturn.ctx() → "review" | null; ATReturn.go("review") to return.
   Target page:  ATReturn.takeArrival() → the section to restore focus to, once.

   go() returns with history.back() when the previous entry IS the target (so Back is not left
   pointing at a stale copy and no Review → Step 2 → Review loop is pushed); otherwise it
   location.replace()s the target with `?edited=<section>`. Either way the destination is the
   same; history only decides how to get there. */
(function () {
  var KEY = "at-return-v1";
  var TARGETS = {
    review: { href: "Abby's Table - Review v2.dc.html", match: /Review(%20|\s)v2/ },
  };
  function read() {
    try {
      var r = JSON.parse(sessionStorage.getItem(KEY) || "null");
      return r && r.v === 1 && Date.now() - r.t < 6 * 3600e3 ? r : null;
    } catch (e) { return null; }
  }
  function write(r) { try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  function ctx() {
    try { var c = new URLSearchParams(location.search).get("return"); return TARGETS[c] ? c : null; } catch (e) { return null; }
  }
  function withCtx(url, c) { return c && TARGETS[c] ? url + (url.indexOf("?") < 0 ? "?" : "&") + "return=" + c : url; }
  function href(c) { return TARGETS[c] ? TARGETS[c].href : ""; }
  function leave(section) { write({ v: 1, section: section || "", t: Date.now() }); }
  function go(c) {
    var t = TARGETS[c]; if (!t) return;
    var r = read() || { v: 1, section: "" };
    r.back = true; r.t = Date.now(); write(r);
    var prev = false;
    try { prev = history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin && t.match.test(document.referrer); } catch (e) {}
    if (prev) history.back();
    else location.replace(t.href + (r.section ? "?edited=" + encodeURIComponent(r.section) : ""));
  }
  function takeArrival(cleanHref) {
    var r = read(), q = null;
    try { q = new URLSearchParams(location.search).get("edited"); } catch (e) {}
    if (!(r && r.back) && !q) return null;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    if (q && cleanHref) { try { history.replaceState(history.state, "", cleanHref); } catch (e) {} }
    return (r && r.section) || q || null;
  }
  window.ATReturn = { ctx: ctx, withCtx: withCtx, href: href, leave: leave, go: go, takeArrival: takeArrival };
})();
