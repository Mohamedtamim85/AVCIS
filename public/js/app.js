/*
 * Alphavito CIS Controls — hash router.
 * View modules (catalog.js, assessments.js, account.js) register handlers on
 * AVCIS.routes, keyed by the first path segment; each handler receives all
 * segments. In server mode every page requires signing in first.
 */
(function () {
  "use strict";

  const { app, routes, setActiveNav, nav, esc, loading, store } = window.AVCIS;

  routes.notFound = function () {
    setActiveNav("");
    app.innerHTML = `<h1>Page not found</h1><p class="lead"><a href="#/">Back to overview</a></p>`;
  };

  function renderUserbox() {
    const box = document.getElementById("userbox");
    if (store.mode === "local") {
      box.innerHTML = `<span class="badge mode-local" title="No server detected: assessments are saved only in this browser.">Local mode</span>`;
    } else if (store.user) {
      box.innerHTML = `
        ${store.isAdmin() ? `<a href="#/users" data-nav="users">Users</a>` : ""}
        <a href="#/account" data-nav="account" title="Signed in as ${esc(store.user.username)}">${esc(store.user.name || store.user.username)}</a>
        <button class="btn sm" type="button" id="logout">Sign out</button>`;
      document.getElementById("logout").addEventListener("click", async () => {
        await store.logout();
        route();
      });
    } else {
      box.innerHTML = "";
    }
  }

  function route() {
    window.AVCIS.runLeaveHooks();
    nav.next();
    renderUserbox();
    const signedOut = store.mode === "server" && !store.user;
    document.body.classList.toggle("signed-out", signedOut);
    if (signedOut) {
      routes.login();
      return;
    }
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    const view = Object.prototype.hasOwnProperty.call(routes, parts[0]) ? routes[parts[0]] : routes.notFound;
    view(parts);
    window.scrollTo(0, 0);
  }

  // Session expired mid-work: show the sign-in page, then return to the same page.
  store.onUnauthorized(() => {
    if (!store.user) return;
    store.user = null;
    route();
  });

  window.AVCIS.rerender = route;
  window.addEventListener("hashchange", route);

  app.innerHTML = loading();
  store.init().then(route);
})();
