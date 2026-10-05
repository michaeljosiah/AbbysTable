// "Your box" rail fit — shared by checkout step 1 (Choose Box v2) and step 2 (Add Dishes v2).
// Decided from live measurements, never a viewport-height breakpoint. `stops` are the rail's
// bottom clearances in order of preference (e.g. step 2: normal 88px for the Top control, then
// reclaim 24px); when none leaves the list `min` px, the mode is "short" — status and list scroll
// together above the pinned footer. Hysteresis: a lower mode is left only once the list would get
// `back` px again. Markup contract: .ad-rail-card > header + .ad-rail-body (.ad-rail-status +
// .ad-rail-list) + footer; the page owns the CSS and the state.
(function () {
  function atRailFit(o) {
    var stops = o.stops, first = stops[0].name;
    var card = o.card, body = o.body, list = o.list;
    if (!card || !list || !body || !window.matchMedia("(min-width: 1024px)").matches) return first;
    var names = stops.map(function (s) { return s.name; }).concat(["short"]);
    var cur = Math.max(0, names.indexOf(o.mode || first));
    var min = o.min || 120, back = o.back || 140;
    var status = body.querySelector(".ad-rail-status");
    var ck = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ck-h")) || 0;
    var fixed = (card.offsetHeight - body.offsetHeight) + (status ? status.offsetHeight : 0);
    var need = list.scrollHeight;
    for (var i = 0; i < stops.length; i++) {
      var avail = window.innerHeight - ck - 24 - stops[i].clear - fixed;
      if (avail >= Math.min(need, cur > i ? back : min)) return stops[i].name;
    }
    return "short";
  }
  window.atRailFit = atRailFit;
})();
