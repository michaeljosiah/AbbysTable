// Reversible removal — the site's Undo standard (see CLAUDE.md "Undo"). One pending undo per page:
// a new removal commits the previous one. The page removes the item and updates every dependent
// value itself, then calls push(); this module owns the timer, the pause on hover/focus, the
// screen-reader announcement and focus hand-off (Remove → Undo, Undo → the restored Remove).
// It is an OVERLAY (fixed snackbar, or anchored over a rail/sheet footer) — never in flow, so
// nothing on the page moves when it appears or expires. Markup contract: the Undo button carries `data-undo-btn`; each Remove control carries
// `data-rm="<key>"`. The row forwards onMouseEnter/Leave and onFocus/Blur to the handlers here.
(function () {
  var MS = 8000, RESUME_MIN = 2500;
  function vis(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  function chain(el) { var s = []; while (el) { s.push(el); el = el.parentElement; } return s; }
  // The visible match that shares the deepest ancestor with where the action happened, so focus
  // lands in the same rail/sheet/panel rather than a copy elsewhere on the page.
  function nearest(sel, anc) {
    var best = null, bestD = -1, els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; if (!vis(e)) continue;
      var p = e; while (p && anc.indexOf(p) < 0) p = p.parentElement;
      var d = p ? anc.length - anc.indexOf(p) : 0;
      if (d > bestD) { bestD = d; best = e; }
    }
    return best;
  }
  // After the page's re-render has committed. A timer, not rAF: rAF is paused in background or
  // hidden frames (embedded previews, a tab switched mid-action), which silently dropped focus.
  function after(fn) { setTimeout(fn, 60); }
  var live = null;
  function say(t) {
    if (!live) {
      live = document.createElement("div");
      live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
      live.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;";
      document.body.appendChild(live);
    }
    live.textContent = "";
    setTimeout(function () { live.textContent = t; }, 80);
  }
  // Pausing is for people who need longer: a mouse resting on the snackbar, or KEYBOARD focus on
  // it. A tap emulates mouseenter (with no mouseleave after) and push() moves focus to Undo, so on
  // touch both would pause the timer indefinitely — hover counts only for a real mouse, and focus
  // only when it is keyboard-visible.
  var lastPointer = "mouse";
  document.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType || "mouse"; }, true);
  function kbFocus(el) { try { return !!el && el.matches(":focus-visible"); } catch (_) { return false; } }
  function ATUndo(onChange, ms) {
    var self = this;
    this.onChange = onChange; this.ms = ms || MS;
    this.cur = null; this.t = null; this.left = 0; this.at = 0; this.hov = false; this.foc = false;
    this.enter = function () { if (lastPointer !== "mouse") return; self.hov = true; self._pause(); };
    this.leave = function () { if (!self.hov) return; self.hov = false; self._resume(); };
    this.focus = function (e) { if (!kbFocus(e && e.target)) return; self.foc = true; self._pause(); };
    this.blur = function (e) { if (e && e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return; self.foc = false; self._resume(); };
    this.undo = function () { self._undo(); };
  }
  ATUndo.prototype._stop = function () { clearTimeout(this.t); this.t = null; };
  ATUndo.prototype._run = function () { var self = this; this.at = Date.now(); this.t = setTimeout(function () { self.t = null; self.cur = null; self.hov = self.foc = false; self.onChange(null); }, this.left); };
  ATUndo.prototype._pause = function () { if (!this.t) return; this.left -= Date.now() - this.at; this._stop(); };
  ATUndo.prototype._resume = function () { if (this.t || !this.cur || this.hov || this.foc) return; this.left = Math.max(this.left, RESUME_MIN); this._run(); };
  // e: { key, label, aria?, restore, from?, said?, restored?, text?, ...anything the page needs }
  // said/restored/text override the "removed" wording for a reversible ADDITION (step 2's reorder).
  ATUndo.prototype.push = function (e) {
    this._stop();
    var from = e.from || document.activeElement, hadFocus = !!from && from === document.activeElement && from !== document.body;
    var anc = chain(from), cur = {};
    for (var k in e) if (k !== "from") cur[k] = e[k];
    // Where the snackbar shows: the nearest [data-undo-scope] (rail, sheet) or "page" (fixed).
    if (!cur.where) { var sc = from && from.closest ? from.closest("[data-undo-scope]") : null; cur.where = sc ? sc.getAttribute("data-undo-scope") : "page"; }
    this.cur = cur; this.left = this.ms; this.hov = this.foc = false; this._run();
    this.onChange(cur);
    say(e.said || e.label + " removed. Undo available.");
    if (hadFocus) after(function () {
      if (vis(from) && document.activeElement === from) return;
      var b = nearest("[data-undo-btn]", anc); if (b) b.focus();
    });
  };
  ATUndo.prototype._undo = function () {
    var c = this.cur; if (!c) return;
    var a = document.activeElement, anc = a && a.hasAttribute && a.hasAttribute("data-undo-btn") ? chain(a) : null;
    this._stop(); this.cur = null; this.hov = this.foc = false;
    this.onChange(null); c.restore();
    say(c.restored || c.label + " restored.");
    if (anc) after(function () {
      var sel = '[data-rm="' + (window.CSS && CSS.escape ? CSS.escape(c.key) : c.key) + '"]';
      var r = nearest(sel, anc); if (r) r.focus();
    });
  };
  // A later change that would conflict with restoring (e.g. adding to a full box) confirms it.
  ATUndo.prototype.commit = function () { if (!this.cur) return; this._stop(); this.cur = null; this.hov = this.foc = false; this.onChange(null); };
  ATUndo.say = say;
  window.ATUndo = ATUndo;
})();
