/*
 * Alphavito CIS Controls — Step 1: catalog browser.
 * Plain JavaScript, hash-based routing, no build step.
 *   #/               overview of all 18 controls
 *   #/control/:id    one control with its safeguards
 *   #/safeguards     searchable / filterable list of all 153 safeguards
 */
(function () {
  "use strict";

  const DATA = window.CIS_DATA;
  const app = document.getElementById("app");

  // Flatten safeguards once, keeping a back-reference to their control.
  const ALL_SAFEGUARDS = DATA.controls.flatMap(c =>
    c.safeguards.map(s => Object.assign({ controlId: c.id, controlTitle: c.title }, s))
  );

  // Persisted filter state for the "All Safeguards" view.
  const filters = { q: "", ig: "", asset: "", fn: "", control: "" };

  // ---------- helpers ----------

  function esc(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function igCounts(list) {
    return {
      1: list.filter(s => s.ig === 1).length,
      2: list.filter(s => s.ig === 2).length,
      3: list.filter(s => s.ig === 3).length
    };
  }

  // Safeguards included in a given IG (cumulative: IG2 contains IG1, etc.).
  function inIG(list, ig) {
    return list.filter(s => s.ig <= ig);
  }

  function igBar(list) {
    const n = igCounts(list);
    const total = list.length || 1;
    return `
      <div class="igbar" title="IG1: ${n[1]} · IG2 adds ${n[2]} · IG3 adds ${n[3]}">
        <span class="g1" style="width:${(n[1] / total) * 100}%"></span>
        <span class="g2" style="width:${(n[2] / total) * 100}%"></span>
        <span class="g3" style="width:${(n[3] / total) * 100}%"></span>
      </div>
      <div class="igbar-legend">
        <span>${list.length} safeguards</span>
        <span>IG1 ${n[1]}</span><span>+IG2 ${n[2]}</span><span>+IG3 ${n[3]}</span>
      </div>`;
  }

  // Three dots showing which IGs include a safeguard.
  function igDots(ig) {
    return `<div class="ig-dots" aria-label="Included from IG${ig}">
      ${[1, 2, 3].map(g => `<span class="${g >= ig ? "on" + ig : ""}">${g}</span>`).join("")}
    </div>`;
  }

  function safeguardTable(list, showControl) {
    if (!list.length) return `<div class="table-wrap"><div class="empty">No safeguards match your filters.</div></div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Safeguard</th>
              <th class="hide-sm">Asset type</th>
              <th class="hide-sm">Function</th>
              <th>IG1 IG2 IG3</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td class="id">${esc(s.id)}</td>
                <td>
                  <div class="title">${esc(s.title)}</div>
                  <div class="desc">${esc(s.desc)}</div>
                  ${showControl ? `<div class="desc"><a href="#/control/${s.controlId}">Control ${s.controlId}: ${esc(s.controlTitle)}</a></div>` : ""}
                </td>
                <td class="hide-sm"><span class="badge">${esc(s.asset)}</span></td>
                <td class="hide-sm"><span class="badge">${esc(s.fn)}</span></td>
                <td>${igDots(s.ig)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function setActiveNav(name) {
    document.querySelectorAll("[data-nav]").forEach(a =>
      a.classList.toggle("active", a.dataset.nav === name));
  }

  // ---------- views ----------

  function renderHome() {
    setActiveNav("home");
    const igColors = { 1: "var(--ig1)", 2: "var(--ig2)", 3: "var(--ig3)" };
    app.innerHTML = `
      <h1>CIS Critical Security Controls v${DATA.version}</h1>
      <p class="lead">A prioritized set of ${DATA.controls.length} controls and ${ALL_SAFEGUARDS.length} safeguards
        to defend against the most common cyber attacks. Use this catalog to walk customers through the framework
        and scope an Alphavito assessment.</p>

      <div class="stats">
        <div class="stat"><div class="value">${DATA.controls.length}</div><div class="label">Controls</div></div>
        <div class="stat"><div class="value">${ALL_SAFEGUARDS.length}</div><div class="label">Safeguards</div></div>
        ${[1, 2, 3].map(g => `
          <div class="stat"><div class="value">${inIG(ALL_SAFEGUARDS, g).length}</div><div class="label">Safeguards in IG${g}</div></div>`).join("")}
      </div>

      <h2>Implementation Groups</h2>
      <div class="ig-grid">
        ${DATA.implementationGroups.map(g => `
          <div class="ig-card" style="--ig-color:${igColors[g.ig]}">
            <h3>${esc(g.name)}</h3>
            <p>${esc(g.desc)}</p>
            <div class="count">${inIG(ALL_SAFEGUARDS, g.ig).length} safeguards</div>
          </div>`).join("")}
      </div>

      <h2>The 18 Controls</h2>
      <div class="control-grid">
        ${DATA.controls.map(c => `
          <a class="control-card" href="#/control/${c.id}">
            <div class="head"><span class="num">${c.id}</span><h3>${esc(c.title)}</h3></div>
            <p>${esc(c.desc)}</p>
            ${igBar(c.safeguards)}
          </a>`).join("")}
      </div>`;
  }

  function renderControl(id) {
    setActiveNav("");
    const idx = DATA.controls.findIndex(c => c.id === id);
    if (idx < 0) return renderNotFound();
    const c = DATA.controls[idx];
    const prev = DATA.controls[idx - 1];
    const next = DATA.controls[idx + 1];

    app.innerHTML = `
      <div class="crumbs"><a href="#/">Overview</a> › Control ${c.id}</div>
      <h1>Control ${c.id}: ${esc(c.title)}</h1>
      <p class="lead">${esc(c.desc)}</p>
      <div class="panel why"><strong>Why it matters:</strong> ${esc(c.why)}</div>

      <h2>Safeguards</h2>
      <div style="margin-bottom:12px">${igBar(c.safeguards)}</div>
      ${safeguardTable(c.safeguards, false)}

      <div class="pager">
        ${prev ? `<a class="btn" href="#/control/${prev.id}">← ${prev.id}. ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#/control/${next.id}">${next.id}. ${esc(next.title)} →</a>` : "<span></span>"}
      </div>`;
  }

  function renderSafeguards() {
    setActiveNav("safeguards");
    const opt = (values, selected, label) =>
      `<option value="">${label}</option>` +
      values.map(v => `<option value="${esc(v)}" ${String(v) === selected ? "selected" : ""}>${esc(v)}</option>`).join("");

    app.innerHTML = `
      <h1>All Safeguards</h1>
      <p class="lead">Search and filter all ${ALL_SAFEGUARDS.length} safeguards by Implementation Group, asset type, security function or control.</p>
      <div class="filters">
        <input type="search" id="f-q" placeholder="Search by number, title or description…" value="${esc(filters.q)}">
        <select id="f-ig">
          <option value="">All IGs</option>
          ${[1, 2, 3].map(g => `<option value="${g}" ${filters.ig === String(g) ? "selected" : ""}>Required for IG${g}</option>`).join("")}
        </select>
        <select id="f-asset">${opt(DATA.assetTypes, filters.asset, "All asset types")}</select>
        <select id="f-fn">${opt(DATA.functions, filters.fn, "All functions")}</select>
        <select id="f-control">
          <option value="">All controls</option>
          ${DATA.controls.map(c => `<option value="${c.id}" ${filters.control === String(c.id) ? "selected" : ""}>${c.id}. ${esc(c.title)}</option>`).join("")}
        </select>
        <button class="btn" id="f-reset" type="button">Reset</button>
      </div>
      <div class="result-count" id="f-count"></div>
      <div id="f-results"></div>`;

    const update = () => {
      const q = filters.q.trim().toLowerCase();
      const list = ALL_SAFEGUARDS.filter(s =>
        (!filters.ig || s.ig <= Number(filters.ig)) &&
        (!filters.asset || s.asset === filters.asset) &&
        (!filters.fn || s.fn === filters.fn) &&
        (!filters.control || s.controlId === Number(filters.control)) &&
        (!q || (s.id + " " + s.title + " " + s.desc + " " + s.controlTitle).toLowerCase().includes(q))
      );
      document.getElementById("f-count").textContent = `Showing ${list.length} of ${ALL_SAFEGUARDS.length} safeguards`;
      document.getElementById("f-results").innerHTML = safeguardTable(list, true);
    };

    const bind = (elId, key, evt) =>
      document.getElementById(elId).addEventListener(evt, e => { filters[key] = e.target.value; update(); });
    bind("f-q", "q", "input");
    bind("f-ig", "ig", "change");
    bind("f-asset", "asset", "change");
    bind("f-fn", "fn", "change");
    bind("f-control", "control", "change");
    document.getElementById("f-reset").addEventListener("click", () => {
      Object.keys(filters).forEach(k => { filters[k] = ""; });
      renderSafeguards();
    });

    update();
  }

  function renderNotFound() {
    setActiveNav("");
    app.innerHTML = `<h1>Page not found</h1><p class="lead"><a href="#/">Back to overview</a></p>`;
  }

  // ---------- router ----------

  function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    switch (parts[0]) {
      case "":
        renderHome(); break;
      case "control":
        renderControl(Number(parts[1])); break;
      case "safeguards":
        renderSafeguards(); break;
      default:
        renderNotFound();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();
})();
