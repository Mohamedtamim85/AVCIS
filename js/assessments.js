/*
 * Step 2 — customer assessments: list, create, profile and scope.
 *   #/assessments                 list of assessments, import / export
 *   #/assessment/new              new assessment form
 *   #/assessment/:id[/profile]    customer & engagement profile
 *   #/assessment/:id/scope        choose in-scope safeguards for the target IG
 */
(function () {
  "use strict";

  const { DATA, ALL_SAFEGUARDS, app, routes, esc, inIG, setActiveNav, formatDate, toast, store } = window.AVCIS;

  const STATUS_LABELS = { "draft": "Draft", "in-progress": "In progress", "completed": "Completed" };
  const INDUSTRIES = ["Banking & Financial Services", "Government & Public Sector", "Healthcare", "Education",
    "Energy & Utilities", "Oil & Gas", "Telecommunications", "Retail & E-commerce", "Manufacturing",
    "Transportation & Logistics", "Hospitality", "Technology", "Other"];
  const SIZES = ["1–50 employees", "51–250 employees", "251–1,000 employees", "1,001–5,000 employees", "5,000+ employees"];

  // ---------- shared bits ----------

  function statusBadge(status) {
    return `<span class="badge status-${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
  }

  function igBadge(ig) {
    return `<span class="badge ig${ig}">IG${ig}</span>`;
  }

  function storageWarning() {
    return store.isPersistent() ? "" : `
      <div class="panel warn">Browser storage is unavailable, so assessments are kept only until this tab is closed.
        Use <strong>Export</strong> to save your work to a file.</div>`;
  }

  function download(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function slug(s) {
    return String(s || "assessment").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "assessment";
  }

  function exportOne(a) {
    download(`AVCIS-${slug(a.customer.name)}-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON([a.id]));
  }

  // ---------- list ----------

  function renderList() {
    setActiveNav("assessments");
    const items = store.list();

    app.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Customer Assessments</h1>
          <p class="lead">Create and manage CIS Controls assessments for Alphavito customers.</p>
        </div>
        <div class="actions">
          <a class="btn primary" href="#/assessment/new">+ New assessment</a>
          <button class="btn" type="button" id="import-btn">Import</button>
          ${items.length ? `<button class="btn" type="button" id="export-all">Export all</button>` : ""}
          <input type="file" id="import-file" accept=".json,application/json" hidden>
        </div>
      </div>
      ${storageWarning()}
      ${items.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Customer</th><th class="hide-sm">Assessment</th><th>Target</th><th>Status</th>
                <th class="hide-sm">In scope</th><th class="hide-sm">Updated</th><th></th></tr>
            </thead>
            <tbody>
              ${items.map(a => `
                <tr>
                  <td>
                    <a class="title" href="#/assessment/${encodeURIComponent(a.id)}">${esc(a.customer.name || "Unnamed customer")}</a>
                    <div class="desc">${esc(a.customer.industry)}</div>
                  </td>
                  <td class="hide-sm">${esc(a.title || "—")}<div class="desc">${esc(a.assessor)}</div></td>
                  <td>${igBadge(a.targetIG)}</td>
                  <td>${statusBadge(a.status)}</td>
                  <td class="hide-sm">${store.inScope(a).length}</td>
                  <td class="hide-sm">${formatDate(a.updatedAt)}</td>
                  <td class="row-actions">
                    <a class="btn sm" href="#/assessment/${encodeURIComponent(a.id)}">Open</a>
                    <button class="btn sm" type="button" data-act="export" data-id="${esc(a.id)}">Export</button>
                    <button class="btn sm" type="button" data-act="duplicate" data-id="${esc(a.id)}">Duplicate</button>
                    <button class="btn sm danger" type="button" data-act="delete" data-id="${esc(a.id)}">Delete</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="panel empty">
          <p><strong>No assessments yet.</strong></p>
          <p>Start a new assessment for a customer, or import one exported from another machine.</p>
          <a class="btn primary" href="#/assessment/new">+ New assessment</a>
        </div>`}`;

    const fileInput = document.getElementById("import-file");
    document.getElementById("import-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("File is too large (max 5 MB)."); return; }
      file.text().then(text => {
        const imported = store.importJSON(text);
        toast(`Imported ${imported.length} assessment${imported.length === 1 ? "" : "s"}.`);
        renderList();
      }).catch(err => toast("Import failed: " + (err instanceof SyntaxError ? "invalid JSON file." : err.message)));
    });

    const exportAll = document.getElementById("export-all");
    if (exportAll) exportAll.addEventListener("click", () =>
      download(`AVCIS-all-assessments-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON()));

    app.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", () => {
      const a = store.get(btn.dataset.id);
      if (!a) return;
      if (btn.dataset.act === "export") exportOne(a);
      if (btn.dataset.act === "duplicate") { store.duplicate(a.id); toast("Assessment duplicated."); renderList(); }
      if (btn.dataset.act === "delete" &&
          confirm(`Delete the assessment for "${a.customer.name || "Unnamed customer"}"? This cannot be undone.`)) {
        store.remove(a.id);
        toast("Assessment deleted.");
        renderList();
      }
    }));
  }

  // ---------- profile form ----------

  function options(values, selected, placeholder) {
    return `<option value="">${esc(placeholder)}</option>` + values.map(v =>
      `<option ${v === selected ? "selected" : ""}>${esc(v)}</option>`).join("");
  }

  function profileForm(a, isNew) {
    const c = a.customer;
    return `
      <form id="profile-form" class="form" novalidate>
        <section class="panel">
          <h2>Customer</h2>
          <div class="grid2">
            <label class="field full">Customer / organization name *
              <input name="customer.name" required maxlength="200" value="${esc(c.name)}" placeholder="e.g. Contoso Bank">
            </label>
            <label class="field">Industry
              <select name="customer.industry">${options(INDUSTRIES, c.industry, "Select industry…")}</select>
            </label>
            <label class="field">Organization size
              <select name="customer.size">${options(SIZES, c.size, "Select size…")}</select>
            </label>
            <label class="field">Country
              <input name="customer.country" maxlength="100" value="${esc(c.country)}">
            </label>
            <label class="field">Contact person
              <input name="customer.contactName" maxlength="200" value="${esc(c.contactName)}">
            </label>
            <label class="field">Contact email
              <input name="customer.contactEmail" type="email" maxlength="200" value="${esc(c.contactEmail)}">
            </label>
            <label class="field">Contact phone
              <input name="customer.contactPhone" type="tel" maxlength="50" value="${esc(c.contactPhone)}">
            </label>
          </div>
        </section>

        <section class="panel">
          <h2>Engagement</h2>
          <div class="grid2">
            <label class="field">Assessment title
              <input name="title" maxlength="200" value="${esc(a.title)}" placeholder="e.g. CIS v8.1 Gap Assessment 2026">
            </label>
            <label class="field">Alphavito assessor
              <input name="assessor" maxlength="200" value="${esc(a.assessor)}">
            </label>
            <label class="field">Start date
              <input name="startDate" type="date" value="${esc(a.startDate)}">
            </label>
            <label class="field">Target completion
              <input name="dueDate" type="date" value="${esc(a.dueDate)}">
            </label>
            <label class="field">Status
              <select name="status">${store.STATUSES.map(s =>
                `<option value="${s}" ${s === a.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}</select>
            </label>
          </div>
          <fieldset class="field">
            <legend>Environment in scope</legend>
            <div class="checks">
              ${store.ENVIRONMENTS.map(e => `
                <label class="check"><input type="checkbox" name="environment" value="${esc(e)}" ${a.environment.includes(e) ? "checked" : ""}> ${esc(e)}</label>`).join("")}
            </div>
          </fieldset>
          <label class="field">Objectives &amp; notes
            <textarea name="objectives" rows="4" maxlength="5000" placeholder="Business drivers, regulatory requirements, key concerns…">${esc(a.objectives)}</textarea>
          </label>
        </section>

        <section class="panel">
          <h2>Targets</h2>
          <fieldset class="field">
            <legend>Target Implementation Group</legend>
            <div class="ig-choice">
              ${DATA.implementationGroups.map(g => `
                <label class="choice ig${g.ig}">
                  <input type="radio" name="targetIG" value="${g.ig}" ${a.targetIG === g.ig ? "checked" : ""}>
                  <span><strong>${esc(g.name)}</strong> · ${inIG(ALL_SAFEGUARDS, g.ig).length} safeguards<br>
                  <small>${esc(g.desc)}</small></span>
                </label>`).join("")}
            </div>
          </fieldset>
          <details class="helper">
            <summary>Help me choose an Implementation Group</summary>
            <div class="checks col">
              <label class="check"><input type="checkbox" id="q-it"> The organization has dedicated IT staff managing multiple departments</label>
              <label class="check"><input type="checkbox" id="q-data"> It stores sensitive or regulated data (PII, payment card, health, financial)</label>
              <label class="check"><input type="checkbox" id="q-sec"> It has dedicated security staff, strict regulatory oversight, or faces targeted / sophisticated attacks</label>
            </div>
            <p id="ig-suggestion" class="suggestion"></p>
          </details>

          <fieldset class="field">
            <legend>Target maturity level</legend>
            <p class="hint">Each in-scope safeguard will be scored 0–5. Safeguards below the target are reported as gaps.</p>
            <div class="maturity-choice">
              ${DATA.maturityLevels.map(m => `
                <label class="choice m${m.level}">
                  <input type="radio" name="targetMaturity" value="${m.level}" ${a.targetMaturity === m.level ? "checked" : ""}>
                  <span><strong>${m.level} – ${esc(m.name)}</strong><br><small>${esc(m.desc)}</small></span>
                </label>`).join("")}
            </div>
          </fieldset>
        </section>

        <div class="form-actions">
          <button class="btn primary" type="submit">${isNew ? "Create assessment" : "Save changes"}</button>
          ${isNew ? `<a class="btn" href="#/assessments">Cancel</a>` : ""}
          <span class="form-error" id="form-error" role="alert"></span>
        </div>
      </form>`;
  }

  function readProfileForm(form) {
    const fd = new FormData(form);
    const customer = {};
    const out = { customer, environment: fd.getAll("environment") };
    for (const [key, value] of fd.entries()) {
      if (key === "environment") continue;
      if (key.startsWith("customer.")) customer[key.slice(9)] = value.trim();
      else out[key] = typeof value === "string" ? value.trim() : value;
    }
    out.targetIG = Number(out.targetIG);
    out.targetMaturity = Number(out.targetMaturity);
    return out;
  }

  function bindProfileForm(onSave) {
    const form = document.getElementById("profile-form");
    const err = document.getElementById("form-error");

    // IG suggestion helper: the highest box ticked decides the suggestion.
    const sugg = document.getElementById("ig-suggestion");
    const suggest = () => {
      const ig = document.getElementById("q-sec").checked ? 3
        : (document.getElementById("q-it").checked || document.getElementById("q-data").checked) ? 2 : 1;
      sugg.innerHTML = `Suggested: <strong>IG${ig}</strong> <button class="btn sm" type="button" id="apply-ig">Use IG${ig}</button>`;
      document.getElementById("apply-ig").addEventListener("click", () => {
        form.querySelector(`input[name=targetIG][value="${ig}"]`).checked = true;
      });
    };
    ["q-it", "q-data", "q-sec"].forEach(id => document.getElementById(id).addEventListener("change", suggest));
    suggest();

    form.addEventListener("input", () => { err.textContent = ""; });
    form.addEventListener("submit", e => {
      e.preventDefault();
      const nameInput = form.elements["customer.name"];
      const emailInput = form.elements["customer.contactEmail"];
      err.textContent = "";
      if (!nameInput.value.trim()) { err.textContent = "Customer name is required."; nameInput.focus(); return; }
      if (!emailInput.checkValidity()) { err.textContent = "Please enter a valid email address."; emailInput.focus(); return; }
      onSave(readProfileForm(form));
    });
  }

  function renderNew() {
    setActiveNav("assessments");
    const blank = { customer: {}, environment: [], status: "draft", targetIG: 1, targetMaturity: 3,
      startDate: new Date().toISOString().slice(0, 10) };
    ["name", "industry", "country", "size", "contactName", "contactEmail", "contactPhone"].forEach(k => { blank.customer[k] = ""; });
    ["title", "assessor", "dueDate", "objectives"].forEach(k => { blank[k] = ""; });

    app.innerHTML = `
      <div class="crumbs"><a href="#/assessments">Assessments</a> › New</div>
      <h1>New assessment</h1>
      <p class="lead">Capture the customer profile and engagement targets. You can change everything later.</p>
      ${storageWarning()}
      ${profileForm(blank, true)}`;

    bindProfileForm(fields => {
      const a = store.create(fields);
      toast("Assessment created. Now confirm the scope.");
      location.hash = `#/assessment/${encodeURIComponent(a.id)}/scope`;
    });
  }

  // ---------- assessment workspace ----------

  function workspaceHeader(a, tab) {
    const id = encodeURIComponent(a.id);
    const tabs = [
      { key: "profile", label: "Profile" },
      { key: "scope", label: "Scope" },
      { key: "assess", label: "Assess", soon: "Step 3" },
      { key: "results", label: "Results", soon: "Step 4" }
    ];
    return `
      <div class="crumbs"><a href="#/assessments">Assessments</a> › ${esc(a.customer.name || "Unnamed customer")}</div>
      <div class="page-head">
        <div>
          <h1>${esc(a.customer.name || "Unnamed customer")}</h1>
          <p class="lead">${esc(a.title || "CIS Controls assessment")} · ${igBadge(a.targetIG)} · target maturity ${a.targetMaturity} · ${statusBadge(a.status)}</p>
        </div>
        <div class="actions"><button class="btn" type="button" id="export-one">Export</button></div>
      </div>
      <nav class="tabs">
        ${tabs.map(t => t.soon
          ? `<span class="tab disabled" title="Coming in ${t.soon}">${t.label} <small>${t.soon}</small></span>`
          : `<a class="tab ${t.key === tab ? "active" : ""}" href="#/assessment/${id}/${t.key}">${t.label}</a>`).join("")}
      </nav>`;
  }

  function renderAssessment(parts) {
    if (parts[1] === "new") return renderNew();
    setActiveNav("assessments");
    const a = store.get(decodeURIComponent(parts[1] || ""));
    if (!a) {
      app.innerHTML = `<h1>Assessment not found</h1><p class="lead"><a href="#/assessments">Back to assessments</a></p>`;
      return;
    }
    const tab = parts[2] === "scope" ? "scope" : "profile";
    app.innerHTML = workspaceHeader(a, tab) + storageWarning() + `<div id="tab-body"></div>`;
    document.getElementById("export-one").addEventListener("click", () => exportOne(store.get(a.id)));
    if (tab === "scope") renderScope(a);
    else renderProfile(a);
  }

  function renderProfile(a) {
    document.getElementById("tab-body").innerHTML = profileForm(a, false);
    bindProfileForm(fields => {
      store.update(a.id, fields);
      toast("Profile saved.");
      renderAssessment(["assessment", a.id, "profile"]);
    });
  }

  // ---------- scope ----------

  function renderScope(a) {
    const body = document.getElementById("tab-body");
    const igName = DATA.implementationGroups.find(g => g.ig === a.targetIG).name;

    body.innerHTML = `
      <div class="stats" id="scope-stats"></div>
      <p class="hint">Safeguards required for <strong>${esc(igName)}</strong> are included by default.
        Untick any that don't apply to this customer and note why. To add more safeguards, raise the target IG in the
        <a href="#/assessment/${encodeURIComponent(a.id)}/profile">Profile</a>.</p>
      <div class="scope-tools">
        <button class="btn sm" type="button" id="expand-all">Expand all</button>
        <button class="btn sm" type="button" id="collapse-all">Collapse all</button>
      </div>
      <div class="scope-list">
        ${DATA.controls.map(c => {
          const sgs = inIG(c.safeguards, a.targetIG);
          if (!sgs.length) return `
            <div class="scope-control muted-row">
              <div class="scope-summary"><span class="num">${c.id}</span><span class="scope-title">${esc(c.title)}</span>
              <span class="scope-count">No safeguards in IG${a.targetIG}</span></div>
            </div>`;
          return `
            <details class="scope-control" data-control="${c.id}">
              <summary class="scope-summary">
                <input type="checkbox" class="ctrl-toggle" data-control="${c.id}" aria-label="Include all safeguards of control ${c.id}">
                <span class="num">${c.id}</span>
                <span class="scope-title">${esc(c.title)}</span>
                <span class="scope-count" data-count="${c.id}"></span>
              </summary>
              <ul class="scope-items">
                ${sgs.map(s => `
                  <li data-sg="${esc(s.id)}">
                    <label class="check">
                      <input type="checkbox" class="sg-toggle" data-control="${c.id}" value="${esc(s.id)}">
                      <span><strong>${esc(s.id)}</strong> ${esc(s.title)} ${igBadge(s.ig)}</span>
                    </label>
                    <input class="reason" data-reason="${esc(s.id)}" maxlength="500" placeholder="Reason for exclusion (e.g. no mobile devices in use)">
                  </li>`).join("")}
              </ul>
            </details>`;
        }).join("")}
      </div>

      <h2>Maturity scale used for scoring</h2>
      <div class="maturity-grid">
        ${DATA.maturityLevels.map(m => `
          <div class="maturity-card m${m.level} ${m.level === a.targetMaturity ? "target" : ""}">
            <div class="lvl">${m.level}</div>
            <div><strong>${esc(m.name)}</strong>${m.level === a.targetMaturity ? ` <span class="badge">Target</span>` : ""}
              <div class="desc">${esc(m.desc)}</div></div>
          </div>`).join("")}
      </div>`;

    // Working copy of exclusions; saved on every change.
    const excluded = Object.assign({}, a.scope.excluded);
    const save = () => store.update(a.id, { scope: { excluded } });

    const sync = () => {
      const total = inIG(ALL_SAFEGUARDS, a.targetIG);
      const out = total.filter(s => s.id in excluded).length;
      document.getElementById("scope-stats").innerHTML = `
        <div class="stat"><div class="value">${total.length}</div><div class="label">Safeguards in IG${a.targetIG}</div></div>
        <div class="stat"><div class="value">${total.length - out}</div><div class="label">In scope</div></div>
        <div class="stat"><div class="value">${out}</div><div class="label">Excluded</div></div>
        <div class="stat"><div class="value">${a.targetMaturity}</div><div class="label">Target maturity</div></div>`;

      body.querySelectorAll(".sg-toggle").forEach(cb => {
        const isOut = cb.value in excluded;
        cb.checked = !isOut;
        const li = cb.closest("li");
        li.classList.toggle("excluded", isOut);
        const reason = li.querySelector(".reason");
        if (document.activeElement !== reason) reason.value = isOut ? excluded[cb.value] : "";
      });
      body.querySelectorAll(".ctrl-toggle").forEach(cb => {
        const items = [...body.querySelectorAll(`.sg-toggle[data-control="${cb.dataset.control}"]`)];
        const on = items.filter(i => i.checked).length;
        cb.checked = on === items.length;
        cb.indeterminate = on > 0 && on < items.length;
        body.querySelector(`[data-count="${cb.dataset.control}"]`).textContent = `${on} / ${items.length} in scope`;
      });
    };

    body.querySelectorAll(".sg-toggle").forEach(cb => cb.addEventListener("change", () => {
      if (cb.checked) delete excluded[cb.value];
      else excluded[cb.value] = "";
      save();
      sync();
      if (!cb.checked) cb.closest("li").querySelector(".reason").focus();
    }));

    body.querySelectorAll(".ctrl-toggle").forEach(cb => {
      // Clicking the checkbox shouldn't also open/close the <details>.
      cb.addEventListener("click", e => e.stopPropagation());
      cb.addEventListener("change", () => {
        body.querySelectorAll(`.sg-toggle[data-control="${cb.dataset.control}"]`).forEach(item => {
          if (cb.checked) delete excluded[item.value];
          else if (!(item.value in excluded)) excluded[item.value] = "";
        });
        save();
        sync();
      });
    });

    let reasonTimer;
    body.querySelectorAll(".reason").forEach(input => input.addEventListener("input", () => {
      excluded[input.dataset.reason] = input.value;
      clearTimeout(reasonTimer);
      reasonTimer = setTimeout(save, 400);
    }));
    body.querySelectorAll(".reason").forEach(input => input.addEventListener("change", () => {
      clearTimeout(reasonTimer);
      save();
    }));

    document.getElementById("expand-all").addEventListener("click", () =>
      body.querySelectorAll("details.scope-control").forEach(d => { d.open = true; }));
    document.getElementById("collapse-all").addEventListener("click", () =>
      body.querySelectorAll("details.scope-control").forEach(d => { d.open = false; }));

    sync();
  }

  routes.assessments = renderList;
  routes.assessment = renderAssessment;
})();
