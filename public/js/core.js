/*
 * Shared helpers and the route registry. Loaded before the view modules,
 * which register their routes on AVCIS.routes.
 */
(function () {
  "use strict";

  const DATA = window.CIS_DATA;

  // Flatten safeguards once, keeping a back-reference to their control.
  const ALL_SAFEGUARDS = DATA.controls.flatMap(c =>
    c.safeguards.map(s => Object.assign({ controlId: c.id, controlTitle: c.title }, s))
  );

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  // Safeguards included in a given IG (cumulative: IG2 contains IG1, etc.).
  function inIG(list, ig) {
    return list.filter(s => s.ig <= ig);
  }

  function setActiveNav(name) {
    document.querySelectorAll("[data-nav]").forEach(a =>
      a.classList.toggle("active", a.dataset.nav === name));
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  let toastTimer;
  function toast(message) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
  }

  // Each navigation gets a new ticket; async views check theirs is still current
  // after awaiting, so a slow response never overwrites a newer page.
  let ticket = 0;
  const nav = {
    next: () => ++ticket,
    current: () => ticket
  };

  // Views register cleanup (e.g. flushing unsaved text) to run before the next page renders.
  let leaveHooks = [];
  function onLeave(fn) {
    leaveHooks.push(fn);
  }
  function runLeaveHooks() {
    const hooks = leaveHooks;
    leaveHooks = [];
    hooks.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }

  function loading() {
    return `<div class="loading" role="status">Loading…</div>`;
  }

  window.AVCIS = {
    nav,
    loading,
    onLeave,
    runLeaveHooks,
    DATA,
    ALL_SAFEGUARDS,
    app: document.getElementById("app"),
    routes: {},
    esc,
    inIG,
    setActiveNav,
    formatDate,
    toast
  };
})();
