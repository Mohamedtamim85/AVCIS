/*
 * Customer assessments (Steps 2 and 3).
 *   #/assessments                 list of assessments, import / export
 *   #/assessment/new              new assessment form
 *   #/assessment/:id[/profile]    customer & engagement profile
 *   #/assessment/:id/scope        choose in-scope safeguards for the target IG
 *   #/assessment/:id/assess       score each in-scope safeguard 0–5 with evidence and notes
 */
(function () {
  "use strict";

  const { DATA, ALL_SAFEGUARDS, app, routes, esc, inIG, setActiveNav, formatDate, toast, loading, nav, onLeave, store } = window.AVCIS;
  const model = window.AVCIS_MODEL;

  const STATUS_LABELS = { "draft": "Draft", "in-progress": "In progress", "completed": "Completed" };
  const INDUSTRIES = ["Banking & Financial Services", "Government & Public Sector", "Healthcare", "Education",
    "Energy & Utilities", "Oil & Gas", "Telecommunications", "Retail & E-commerce", "Manufacturing",
    "Transportation & Logistics", "Hospitality", "Technology", "Other"];
  const SIZES = ["1–50 employees", "51–250 employees", "251–1,000 employees", "1,001–5,000 employees", "5,000+ employees"];
  const LEVELS = DATA.maturityLevels;

  // ---------- shared bits ----------

  function statusBadge(status) {
    return `<span class="badge status-${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
  }

  function igBadge(ig) {
    return `<span class="badge ig${ig}">IG${ig}</span>`;
  }

  function progressBar(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<div class="progress" title="${done} of ${total} scored"><span style="width:${pct}%"></span></div>`;
  }

  function storageNotice() {
    if (store.mode !== "local") return "";
    return store.isPersistent()
      ? `<div class="panel warn">Local mode: no server detected, so assessments are saved only in this browser.
          Use <strong>Export</strong> to back them up, or run the AVCIS server for shared storage.</div>`
      : `<div class="panel warn">Browser storage is unavailable, so assessments are kept only until this tab is closed.
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

  async function exportOne(id, name) {
    try {
      download(`AVCIS-${slug(name)}-${new Date().toISOString().slice(0, 10)}.json`, await store.exportJSON([id]));
    } catch (e) {
      toast("Export failed: " + e.message);
    }
  }

  function errorPage(title, err) {
    app.innerHTML = `<h1>${esc(title)}</h1><div class="panel warn">${esc(err.message)}</div>
      <p><a href="#/assessments">Back to assessments</a></p>`;
  }

  // Tracks in-flight saves and shows "Saving… / All changes saved / Not saved".
  function createSaver(el) {
    let pending = 0;
    let failed = false;
    const show = () => {
      if (!el.isConnected) return;
      el.className = "save-status " + (pending ? "busy" : failed ? "error" : "ok");
      el.textContent = pending ? "Saving…" : failed ? "Some changes were not saved" : "All changes saved";
    };
    show();
    return {
      track(promise) {
        pending++;
        show();
        return promise.then(
          v => { failed = false; return v; },
          e => { failed = true; throw e; }
        ).finally(() => { pending--; show(); });
      },
      busy: () => pending > 0
    };
  }

  // ---------- list ----------

  async function renderList() {
    setActiveNav("assessments");
    const t = nav.current();
    app.innerHTML = loading();
    let items;
    try {
      items = await store.list();
    } catch (e) {
      if (t === nav.current()) errorPage("Customer Assessments", e);
      return;
    }
    if (t !== nav.current()) return;
    const canEdit = store.canEdit();
    const leftovers = canEdit ? store.localLeftovers() : [];

    app.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Customer Assessments</h1>
          <p class="lead">Create and manage CIS Controls assessments for Alphavito customers.</p>
        </div>
        <div class="actions">
          ${canEdit ? `<a class="btn primary" href="#/assessment/new">+ New assessment</a>
            <button class="btn" type="button" id="import-btn">Import</button>` : ""}
          ${items.length ? `<button class="btn" type="button" id="export-all">Export all</button>` : ""}
          <input type="file" id="import-file" accept=".json,application/json" hidden>
        </div>
      </div>
      ${storageNotice()}
      ${leftovers.length ? `
        <div class="panel warn" id="leftovers">
          This browser still holds <strong>${leftovers.length}</strong> assessment${leftovers.length === 1 ? "" : "s"} saved earlier in local mode.
          <div class="actions" style="margin:8px 0 0">
            <button class="btn sm primary" type="button" id="upload-leftovers">Upload to server</button>
            <button class="btn sm" type="button" id="dismiss-leftovers">Dismiss</button>
          </div>
        </div>` : ""}
      ${items.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Customer</th><th class="hide-sm">Assessment</th><th>Target</th><th>Status</th>
                <th class="hide-sm">Progress</th><th class="hide-sm">Updated</th><th></th></tr>
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
                  <td class="hide-sm progress-cell">${progressBar(a.progress.scored, a.progress.inScope)}
                    <div class="desc">${a.progress.scored} / ${a.progress.inScope} scored</div></td>
                  <td class="hide-sm">${formatDate(a.updatedAt)}${a.updatedBy ? `<div class="desc">${esc(a.updatedBy)}</div>` : ""}</td>
                  <td class="row-actions">
                    <a class="btn sm" href="#/assessment/${encodeURIComponent(a.id)}/assess">Open</a>
                    <button class="btn sm" type="button" data-act="export" data-id="${esc(a.id)}">Export</button>
                    ${canEdit ? `
                      <button class="btn sm" type="button" data-act="duplicate" data-id="${esc(a.id)}">Duplicate</button>
                      <button class="btn sm danger" type="button" data-act="delete" data-id="${esc(a.id)}">Delete</button>` : ""}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="panel empty">
          <p><strong>No assessments yet.</strong></p>
          ${canEdit ? `<p>Start a new assessment for a customer, or import one exported from another machine.</p>
            <a class="btn primary" href="#/assessment/new">+ New assessment</a>` : ""}
        </div>`}`;

    const fileInput = document.getElementById("import-file");
    const importBtn = document.getElementById("import-btn");
    if (importBtn) importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast("File is too large (max 5 MB)."); return; }
      try {
        const imported = await store.importJSON(await file.text());
        toast(`Imported ${imported.length} assessment${imported.length === 1 ? "" : "s"}.`);
        renderList();
      } catch (err) {
        toast("Import failed: " + (err instanceof SyntaxError ? "invalid JSON file." : err.message));
      }
    });

    const exportAll = document.getElementById("export-all");
    if (exportAll) exportAll.addEventListener("click", async () => {
      try {
        download(`AVCIS-all-assessments-${new Date().toISOString().slice(0, 10)}.json`, await store.exportJSON());
      } catch (e) {
        toast("Export failed: " + e.message);
      }
    });

    const upload = document.getElementById("upload-leftovers");
    if (upload) upload.addEventListener("click", async () => {
      upload.disabled = true;
      try {
        const created = await store.uploadLeftovers();
        toast(`Uploaded ${created.length} assessment${created.length === 1 ? "" : "s"} to the server.`);
        renderList();
      } catch (e) {
        upload.disabled = false;
        toast("Upload failed: " + e.message);
      }
    });
    const dismiss = document.getElementById("dismiss-leftovers");
    if (dismiss) dismiss.addEventListener("click", () => {
      store.dismissLeftovers();
      document.getElementById("leftovers").remove();
    });

    app.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", async () => {
      const a = items.find(x => x.id === btn.dataset.id);
      if (!a) return;
      const name = a.customer.name || "Unnamed customer";
      try {
        if (btn.dataset.act === "export") await exportOne(a.id, name);
        if (btn.dataset.act === "duplicate") {
          await store.duplicate(a.id);
          toast("Assessment duplicated.");
          renderList();
        }
        if (btn.dataset.act === "delete" && confirm(`Delete the assessment for "${name}"? This cannot be undone.`)) {
          await store.remove(a.id);
          toast("Assessment deleted.");
          renderList();
        }
      } catch (e) {
        toast(e.message);
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
    const readOnly = !store.canEdit();
    return `
      <form id="profile-form" class="form" novalidate>
        <fieldset class="plain" ${readOnly ? "disabled" : ""}>
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
            <p class="hint">Each in-scope safeguard is scored 0–5. Safeguards below the target are reported as gaps.</p>
            <div class="maturity-choice">
              ${LEVELS.map(m => `
                <label class="choice m${m.level}">
                  <input type="radio" name="targetMaturity" value="${m.level}" ${a.targetMaturity === m.level ? "checked" : ""}>
                  <span><strong>${m.level} – ${esc(m.name)}</strong><br><small>${esc(m.desc)}</small></span>
                </label>`).join("")}
            </div>
          </fieldset>
        </section>
        </fieldset>

        ${readOnly ? "" : `
        <div class="form-actions">
          <button class="btn primary" type="submit">${isNew ? "Create assessment" : "Save changes"}</button>
          ${isNew ? `<a class="btn" href="#/assessments">Cancel</a>` : ""}
          <span class="form-error" id="form-error" role="alert"></span>
        </div>`}
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
    if (!err) return;

    form.addEventListener("input", () => { err.textContent = ""; });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const nameInput = form.elements["customer.name"];
      const emailInput = form.elements["customer.contactEmail"];
      err.textContent = "";
      if (!nameInput.value.trim()) { err.textContent = "Customer name is required."; nameInput.focus(); return; }
      if (!emailInput.checkValidity()) { err.textContent = "Please enter a valid email address."; emailInput.focus(); return; }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await onSave(readProfileForm(form), err);
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        if (btn.isConnected) btn.disabled = false;
      }
    });
  }

  function renderNew() {
    setActiveNav("assessments");
    if (!store.canEdit()) return routes.notFound();
    const blank = Object.assign(model.normalizeAssessment({}), { startDate: new Date().toISOString().slice(0, 10) });

    app.innerHTML = `
      <div class="crumbs"><a href="#/assessments">Assessments</a> › New</div>
      <h1>New assessment</h1>
      <p class="lead">Capture the customer profile and engagement targets. You can change everything later.</p>
      ${storageNotice()}
      ${profileForm(blank, true)}`;

    bindProfileForm(async fields => {
      const a = await store.create(fields);
      toast("Assessment created. Now confirm the scope.");
      location.hash = `#/assessment/${encodeURIComponent(a.id)}/scope`;
    });
  }

  // ---------- assessment workspace ----------

  const TABS = [
    { key: "profile", label: "Profile" },
    { key: "scope", label: "Scope" },
    { key: "assess", label: "Assess" },
    { key: "results", label: "Results" }
  ];

  function workspaceHeader(a, tab) {
    const id = encodeURIComponent(a.id);
    return `
      <div class="crumbs"><a href="#/assessments">Assessments</a> › ${esc(a.customer.name || "Unnamed customer")}</div>
      <div class="page-head">
        <div>
          <h1>${esc(a.customer.name || "Unnamed customer")}</h1>
          <p class="lead">${esc(a.title || "CIS Controls assessment")} · ${igBadge(a.targetIG)} · target maturity ${a.targetMaturity} · ${statusBadge(a.status)}
            ${store.canEdit() ? "" : ` · <span class="badge">Read-only</span>`}</p>
        </div>
        <div class="actions">
          <span class="save-status" id="save-status"></span>
          <button class="btn" type="button" id="export-one">Export</button>
        </div>
      </div>
      <nav class="tabs">
        ${TABS.map(t => t.soon
          ? `<span class="tab disabled" title="Coming in ${t.soon}">${t.label} <small>${t.soon}</small></span>`
          : `<a class="tab ${t.key === tab ? "active" : ""}" href="#/assessment/${id}/${t.key}">${t.label}</a>`).join("")}
      </nav>`;
  }

  async function renderAssessment(parts) {
    if (parts[1] === "new") return renderNew();
    setActiveNav("assessments");
    const t = nav.current();
    const id = decodeURIComponent(parts[1] || "");
    const tab = ["scope", "assess", "results"].includes(parts[2]) ? parts[2] : "profile";
    app.innerHTML = loading();
    let a;
    try {
      a = await store.get(id);
    } catch (e) {
      if (t === nav.current()) errorPage("Assessment", e);
      return;
    }
    if (t !== nav.current()) return;
    if (!a) {
      app.innerHTML = `<h1>Assessment not found</h1><p class="lead"><a href="#/assessments">Back to assessments</a></p>`;
      return;
    }
    showWorkspace(a, tab);
  }

  function showWorkspace(a, tab) {
    app.innerHTML = workspaceHeader(a, tab) + storageNotice() + `<div id="tab-body"></div>`;
    document.getElementById("export-one").addEventListener("click", () => exportOne(a.id, a.customer.name));
    const saver = createSaver(document.getElementById("save-status"));
    if (tab === "scope") renderScope(a, saver);
    else if (tab === "assess") renderAssess(a, saver);
    else if (tab === "results") window.AVCIS.renderResults(a);
    else renderProfile(a);
  }

  // Someone else saved first: show their version and say so.
  function handleConflict(e, tab) {
    if (e.status === 409 && e.data && e.data.current) {
      toast(e.message + " Showing the latest version.");
      showWorkspace(e.data.current, tab);
      return true;
    }
    return false;
  }

  function renderProfile(a) {
    document.getElementById("tab-body").innerHTML = profileForm(a, false);
    bindProfileForm(async (fields, err) => {
      try {
        const updated = await store.update(a.id, a.version, Object.assign({}, fields, { scope: a.scope }));
        toast("Profile saved.");
        showWorkspace(updated, "profile");
      } catch (e) {
        if (e.status !== 409) throw e;
        err.innerHTML = `${esc(e.message)} Your changes were not saved.
          <button class="btn sm" type="button" id="reload-latest">Load latest version</button>`;
        document.getElementById("reload-latest").addEventListener("click", () => showWorkspace(e.data.current, "profile"));
      }
    });
  }

  // ---------- scope ----------

  function renderScope(a, saver) {
    const body = document.getElementById("tab-body");
    const igName = DATA.implementationGroups.find(g => g.ig === a.targetIG).name;
    const readOnly = !store.canEdit();

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
                <input type="checkbox" class="ctrl-toggle" data-control="${c.id}" aria-label="Include all safeguards of control ${c.id}" ${readOnly ? "disabled" : ""}>
                <span class="num">${c.id}</span>
                <span class="scope-title">${esc(c.title)}</span>
                <span class="scope-count" data-count="${c.id}"></span>
              </summary>
              <ul class="scope-items">
                ${sgs.map(s => `
                  <li data-sg="${esc(s.id)}">
                    <label class="check">
                      <input type="checkbox" class="sg-toggle" data-control="${c.id}" value="${esc(s.id)}" ${readOnly ? "disabled" : ""}>
                      <span><strong>${esc(s.id)}</strong> ${esc(s.title)} ${igBadge(s.ig)}</span>
                    </label>
                    <input class="reason" data-reason="${esc(s.id)}" maxlength="500" placeholder="Reason for exclusion (e.g. no mobile devices in use)" ${readOnly ? "disabled" : ""}>
                  </li>`).join("")}
              </ul>
            </details>`;
        }).join("")}
      </div>

      <h2>Maturity scale used for scoring</h2>
      <div class="maturity-grid">
        ${LEVELS.map(m => `
          <div class="maturity-card m${m.level} ${m.level === a.targetMaturity ? "target" : ""}">
            <div class="lvl">${m.level}</div>
            <div><strong>${esc(m.name)}</strong>${m.level === a.targetMaturity ? ` <span class="badge">Target</span>` : ""}
              <div class="desc">${esc(m.desc)}</div></div>
          </div>`).join("")}
      </div>`;

    const excluded = a.scope.excluded;

    // Saves run one after another so each uses the version returned by the previous one.
    let chain = Promise.resolve();
    let conflicted = false;
    const save = () => {
      chain = chain.then(() => {
        if (conflicted) return null;
        return saver.track(store.update(a.id, a.version, a)).then(u => {
          a.version = u.version;
        }).catch(e => {
          if (handleConflict(e, "scope")) { conflicted = true; return; }
          toast("Scope not saved: " + e.message);
        });
      });
    };

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

    let reasonTimer = null;
    const flushReason = () => {
      if (reasonTimer === null) return;
      clearTimeout(reasonTimer);
      reasonTimer = null;
      save();
    };
    body.querySelectorAll(".reason").forEach(input => {
      input.addEventListener("input", () => {
        excluded[input.dataset.reason] = input.value;
        clearTimeout(reasonTimer);
        reasonTimer = setTimeout(flushReason, 600);
      });
      input.addEventListener("change", flushReason);
    });
    onLeave(flushReason);

    document.getElementById("expand-all").addEventListener("click", () =>
      body.querySelectorAll("details.scope-control").forEach(d => { d.open = true; }));
    document.getElementById("collapse-all").addEventListener("click", () =>
      body.querySelectorAll("details.scope-control").forEach(d => { d.open = false; }));

    sync();
  }

  // ---------- assess (Step 3) ----------

  // Filter settings survive switching tabs within the session.
  const assessFilters = { control: "", show: "all", q: "" };

  function gapBadge(maturity, target) {
    if (maturity === null || maturity === undefined) return `<span class="badge">Not scored</span>`;
    if (maturity >= target) return `<span class="badge meets">Meets target</span>`;
    return `<span class="badge gap">Gap −${target - maturity}</span>`;
  }

  function hasText(r) {
    return !!(r && (r.evidence || r.notes || r.recommendation));
  }

  function renderAssess(a, saver) {
    const body = document.getElementById("tab-body");
    const readOnly = !store.canEdit();
    const target = a.targetMaturity;
    const scopeIds = new Set(store.inScope(a).map(s => s.id));
    const controls = DATA.controls
      .map(c => ({ c, sgs: c.safeguards.filter(s => scopeIds.has(s.id)) }))
      .filter(x => x.sgs.length);
    const responses = a.responses;
    const get = id => responses[id] || { maturity: null, evidence: "", notes: "", recommendation: "" };

    if (!controls.length) {
      body.innerHTML = `<div class="panel empty"><p><strong>No safeguards are in scope.</strong></p>
        <p><a href="#/assessment/${encodeURIComponent(a.id)}/scope">Review the scope</a> to include safeguards.</p></div>`;
      return;
    }

    // Open the first control that still has unscored safeguards.
    const firstOpen = (controls.find(x => x.sgs.some(s => get(s.id).maturity === null)) || controls[0]).c.id;

    body.innerHTML = `
      <div class="stats" id="assess-stats"></div>

      <div class="panel scale-legend">
        <strong>Maturity scale</strong>
        ${LEVELS.map(m => `<span class="chip m${m.level}" title="${esc(m.desc)}"><b>${m.level}</b> ${esc(m.name)}</span>`).join("")}
        <span class="hint">Target: <strong>${target} – ${esc(LEVELS[target].name)}</strong></span>
      </div>

      <div class="filters">
        <input type="search" id="a-q" placeholder="Search safeguards…" value="${esc(assessFilters.q)}">
        <select id="a-control">
          <option value="">All controls</option>
          ${controls.map(x => `<option value="${x.c.id}" ${assessFilters.control === String(x.c.id) ? "selected" : ""}>${x.c.id}. ${esc(x.c.title)}</option>`).join("")}
        </select>
        <select id="a-show">
          ${[["all", "All safeguards"], ["unscored", "Not scored yet"], ["gaps", "Below target"], ["meets", "Meets target"]]
            .map(([v, l]) => `<option value="${v}" ${assessFilters.show === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
        <button class="btn sm" type="button" id="a-expand">Expand all</button>
        <button class="btn sm" type="button" id="a-collapse">Collapse all</button>
      </div>
      <div class="empty" id="a-empty" hidden>No safeguards match these filters.</div>

      <div class="assess-list">
        ${controls.map(({ c, sgs }) => `
          <details class="assess-control" data-control="${c.id}" ${c.id === firstOpen ? "open" : ""}>
            <summary class="assess-summary">
              <span class="num">${c.id}</span>
              <span class="scope-title">${esc(c.title)}</span>
              <span class="assess-meta" data-meta="${c.id}"></span>
            </summary>
            <div class="assess-items">
              ${sgs.map(s => {
                const r = get(s.id);
                return `
                <article class="sg-card" data-sg="${esc(s.id)}">
                  <div class="sg-head">
                    <span class="sg-id">${esc(s.id)}</span>
                    <div class="sg-main">
                      <div class="title">${esc(s.title)}</div>
                      <div class="desc">${esc(s.desc)}</div>
                      <div class="sg-tags">${igBadge(s.ig)} <span class="badge">${esc(s.asset)}</span> <span class="badge">${esc(s.fn)}</span></div>
                    </div>
                    <span class="sg-gap" data-gap></span>
                  </div>
                  <div class="mpick" role="group" aria-label="Current maturity for safeguard ${esc(s.id)}">
                    ${LEVELS.map(m => `
                      <button type="button" class="mbtn m${m.level}" data-level="${m.level}" aria-pressed="false"
                        title="${m.level} – ${esc(m.name)}: ${esc(m.desc)}" ${readOnly ? "disabled" : ""}>
                        <b>${m.level}</b><span>${esc(m.name)}</span>
                      </button>`).join("")}
                    ${readOnly ? "" : `<button type="button" class="btn sm mclear" title="Clear score">Clear</button>`}
                  </div>
                  <details class="sg-notes" ${hasText(r) ? "open" : ""}>
                    <summary>Evidence, observations &amp; recommendation <span class="note-flag" data-flag></span></summary>
                    <div class="notes-grid">
                      <label class="field">Evidence reviewed
                        <textarea data-field="evidence" rows="3" maxlength="5000" placeholder="Documents, screenshots, tool output, interviews…" ${readOnly ? "readonly" : ""}>${esc(r.evidence)}</textarea>
                      </label>
                      <label class="field">Observations / gaps
                        <textarea data-field="notes" rows="3" maxlength="5000" placeholder="What is in place, what is missing…" ${readOnly ? "readonly" : ""}>${esc(r.notes)}</textarea>
                      </label>
                      <label class="field">Recommendation
                        <textarea data-field="recommendation" rows="3" maxlength="5000" placeholder="What Alphavito recommends to reach the target…" ${readOnly ? "readonly" : ""}>${esc(r.recommendation)}</textarea>
                      </label>
                    </div>
                  </details>
                </article>`;
              }).join("")}
            </div>
          </details>`).join("")}
      </div>`;

    const card = id => body.querySelector(`.sg-card[data-sg="${CSS.escape(id)}"]`);

    function refreshCard(id) {
      const el = card(id);
      const r = get(id);
      el.querySelectorAll(".mbtn").forEach(b => {
        const on = r.maturity === Number(b.dataset.level);
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      el.querySelector("[data-gap]").innerHTML = gapBadge(r.maturity, target);
      el.querySelector("[data-flag]").textContent = hasText(r) ? "●" : "";
      el.classList.toggle("scored", r.maturity !== null);
    }

    function refreshControl(cid) {
      const { sgs } = controls.find(x => x.c.id === cid);
      const scored = sgs.map(s => get(s.id).maturity).filter(m => m !== null);
      const avg = scored.length ? (scored.reduce((x, y) => x + y, 0) / scored.length).toFixed(1) : "–";
      const gaps = scored.filter(m => m < target).length;
      body.querySelector(`[data-meta="${cid}"]`).innerHTML = `
        ${progressBar(scored.length, sgs.length)}
        <span>${scored.length}/${sgs.length} scored</span>
        <span>avg ${avg}</span>
        ${gaps ? `<span class="badge gap">${gaps} gap${gaps === 1 ? "" : "s"}</span>` : ""}`;
    }

    function refreshStats() {
      const all = controls.flatMap(x => x.sgs).map(s => get(s.id).maturity);
      const scored = all.filter(m => m !== null);
      const avg = scored.length ? (scored.reduce((x, y) => x + y, 0) / scored.length).toFixed(1) : "–";
      const gaps = scored.filter(m => m < target).length;
      document.getElementById("assess-stats").innerHTML = `
        <div class="stat"><div class="value">${scored.length}<small> / ${all.length}</small></div>
          <div class="label">Safeguards scored</div>${progressBar(scored.length, all.length)}</div>
        <div class="stat"><div class="value">${avg}</div><div class="label">Average maturity (target ${target})</div></div>
        <div class="stat"><div class="value">${gaps}</div><div class="label">Below target</div></div>
        <div class="stat"><div class="value">${scored.length - gaps}</div><div class="label">Meeting target</div></div>`;
    }

    // One save queue per safeguard keeps writes in order; text edits are debounced.
    const queues = {};
    const timers = {};
    function save(id) {
      clearTimeout(timers[id]);
      delete timers[id];
      const payload = Object.assign({}, get(id));
      queues[id] = (queues[id] || Promise.resolve()).then(() =>
        saver.track(store.saveResponse(a.id, id, payload)).catch(e => toast(`${id} not saved: ${e.message}`)));
    }
    function saveSoon(id) {
      clearTimeout(timers[id]);
      timers[id] = setTimeout(() => save(id), 700);
    }
    const flushAll = () => Object.keys(timers).forEach(save);
    onLeave(flushAll);
    const beforeUnload = e => {
      flushAll();
      if (saver.busy()) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", beforeUnload);
    onLeave(() => window.removeEventListener("beforeunload", beforeUnload));

    function setResponse(id, patch) {
      const r = Object.assign({}, get(id), patch);
      if (model.isEmptyResponse(r)) delete responses[id];
      else responses[id] = r;
    }

    if (!readOnly) {
      body.addEventListener("click", e => {
        const btn = e.target.closest(".mbtn, .mclear");
        if (!btn) return;
        const el = btn.closest(".sg-card");
        const id = el.dataset.sg;
        const level = btn.classList.contains("mclear") ? null : Number(btn.dataset.level);
        // Clicking the selected level again clears it.
        setResponse(id, { maturity: level === get(id).maturity ? null : level });
        refreshCard(id);
        refreshControl(Number(el.closest(".assess-control").dataset.control));
        refreshStats();
        save(id);
      });

      body.addEventListener("input", e => {
        const ta = e.target.closest("textarea[data-field]");
        if (!ta) return;
        const id = ta.closest(".sg-card").dataset.sg;
        setResponse(id, { [ta.dataset.field]: ta.value });
        refreshCard(id);
        saveSoon(id);
      });
      body.addEventListener("focusout", e => {
        const ta = e.target.closest("textarea[data-field]");
        if (ta && timers[ta.closest(".sg-card").dataset.sg]) save(ta.closest(".sg-card").dataset.sg);
      });
    }

    // Filters hide cards rather than re-rendering, so typing is never interrupted.
    function applyFilters() {
      const q = assessFilters.q.trim().toLowerCase();
      let visible = 0;
      controls.forEach(({ c, sgs }) => {
        const section = body.querySelector(`.assess-control[data-control="${c.id}"]`);
        let shown = 0;
        sgs.forEach(s => {
          const m = get(s.id).maturity;
          const ok = (!assessFilters.control || String(c.id) === assessFilters.control) &&
            (assessFilters.show === "all" ||
              (assessFilters.show === "unscored" && m === null) ||
              (assessFilters.show === "gaps" && m !== null && m < target) ||
              (assessFilters.show === "meets" && m !== null && m >= target)) &&
            (!q || (s.id + " " + s.title + " " + s.desc).toLowerCase().includes(q));
          card(s.id).hidden = !ok;
          if (ok) shown++;
        });
        section.hidden = !shown;
        if (shown && (assessFilters.control || assessFilters.show !== "all" || q)) section.open = true;
        visible += shown;
      });
      document.getElementById("a-empty").hidden = visible > 0;
    }

    const bindFilter = (elId, key, evt) => document.getElementById(elId).addEventListener(evt, e => {
      assessFilters[key] = e.target.value;
      applyFilters();
    });
    bindFilter("a-q", "q", "input");
    bindFilter("a-control", "control", "change");
    bindFilter("a-show", "show", "change");
    document.getElementById("a-expand").addEventListener("click", () =>
      body.querySelectorAll("details.assess-control").forEach(d => { d.open = true; }));
    document.getElementById("a-collapse").addEventListener("click", () =>
      body.querySelectorAll("details.assess-control").forEach(d => { d.open = false; }));

    controls.forEach(({ c, sgs }) => { sgs.forEach(s => refreshCard(s.id)); refreshControl(c.id); });
    refreshStats();
    applyFilters();
  }

  routes.assessments = renderList;
  routes.assessment = renderAssessment;
})();
