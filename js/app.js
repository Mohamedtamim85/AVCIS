/*
 * Alphavito CIS Controls — hash router.
 * View modules (catalog.js, assessments.js) register handlers on AVCIS.routes,
 * keyed by the first path segment; each handler receives all segments.
 */
(function () {
  "use strict";

  const { app, routes, setActiveNav } = window.AVCIS;

  routes.notFound = function () {
    setActiveNav("");
    app.innerHTML = `<h1>Page not found</h1><p class="lead"><a href="#/">Back to overview</a></p>`;
  };

  function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    const view = Object.prototype.hasOwnProperty.call(routes, parts[0]) ? routes[parts[0]] : routes.notFound;
    view(parts);
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
