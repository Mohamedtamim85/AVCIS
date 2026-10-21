/*
 * Step 4 — Results dashboard for one assessment (#/assessment/:id/results).
 * Charts are plain HTML bars so they stay responsive, accessible and
 * within the page's Content-Security-Policy (no chart library).
 */
(function () {
  "use strict";

  const { DATA, esc } = window.AVCIS;
  const model = window.AVCIS_MODEL;
  const LEVELS = DATA.maturityLevels;

  const fmt = v => (v === null ? "–" : v.toFixed(1));
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  function priorityBadge(p) {
    return `<span class="badge prio prio-${p.toLowerCase()}">${p}</span>`;
  }

  // Horizontal bars of average maturity (0–5) with a dashed target line.
  function barChart(id, title, rows, target, labelOf) {
    const x = v => (v / 5) * 100;
    return `
      <section class="panel chart" id="${id}">
        <h3>${esc(title)}</h3>
        <div class="hbar-axis" aria-hidden="true">
          <span></span>
          <div class="hbar-ticks">${[0, 1, 2, 3, 4, 5].map(t => `<span style="left:${x(t)}%">${t}</span>`).join("")}</div>
          <span></span>
        </div>
        <div class="hbars" role="list">
          ${rows.map(r => `
            <div class="hbar-row" role="listitem" data-tip="${esc(`${labelOf(r)}\nAverage maturity: ${fmt(r.average)} (target ${target})\nScored: ${r.scored} of ${r.inScope}\nMeeting target: ${r.meeting} · Gaps: ${r.gaps}`)}">
              <span class="hbar-label">${esc(labelOf(r))}</span>
              <div class="hbar-track">
                ${[1, 2, 3, 4].map(t => `<span class="grid" style="left:${x(t)}%"></span>`).join("")}
                ${r.average === null ? `<span class="hbar-none">not scored</span>`
                  : `<span class="hbar-fill ${r.average < target ? "below" : ""}" style="width:${Math.max(x(r.average), 0.8)}%"></span>`}
                <span class="hbar-target" style="left:${x(target)}%"></span>
              </div>
              <span class="hbar-value">${fmt(r.average)}</span>
            </div>`).join("")}
        </div>
        <div class="chart-legend">
          <span><i class="key fill"></i> At or above target</span>
          <span><i class="key fill below"></i> Below target</span>
          <span><i class="key target"></i> Target ${target} – ${esc(LEVELS[target].name)}</span>
        </div>
        <details class="data-table">
          <summary>Show data table</summary>
          <div class="table-wrap"><table>
            <thead><tr><th>${esc(title.replace(/^Maturity by /, ""))}</th><th>Average</th><th>Scored</th><th>Meeting target</th><th>Gaps</th></tr></thead>
            <tbody>${rows.map(r => `<tr><td>${esc(labelOf(r))}</td><td>${fmt(r.average)}</td>
              <td>${r.scored} / ${r.inScope}</td><td>${r.meeting}</td><td>${r.gaps}</td></tr>`).join("")}</tbody>
          </table></div>
        </details>
      </section>`;
  }

  function csvCell(v) {
    let s = String(v == null ? "" : v);
    // Stop spreadsheet apps from treating text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadCsv(a, gaps) {
    const head = ["Priority", "Safeguard", "Title", "Control", "IG", "Asset type", "Function", "Current", "Target", "Gap", "Observations", "Recommendation"];
    const lines = [head].concat(gaps.map(g => [g.priority, g.id, g.title, `${g.controlId}. ${DATA.controls[g.controlId - 1].title}`,
      "IG" + g.ig, g.asset, g.fn, g.maturity, a.targetMaturity, g.gap, g.notes, g.recommendation]));
    const text = "﻿" + lines.map(l => l.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `AVCIS-gaps-${String(a.customer.name || "assessment").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Shared floating tooltip for chart rows.
  function bindTooltips(root) {
    let tip = document.getElementById("chart-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "chart-tip";
      tip.className = "chart-tip";
      tip.setAttribute("role", "tooltip");
      document.body.appendChild(tip);
    }
    const show = (row, x, y) => {
      tip.textContent = row.dataset.tip;
      tip.classList.add("show");
      const w = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(8, x + 14), window.innerWidth - w - 8) + "px";
      tip.style.top = (y + 14) + "px";
    };
    root.querySelectorAll(".hbar-row").forEach(row => {
      row.tabIndex = 0;
      row.addEventListener("mousemove", e => show(row, e.clientX, e.clientY));
      row.addEventListener("mouseleave", () => tip.classList.remove("show"));
      row.addEventListener("focus", () => {
        const r = row.getBoundingClientRect();
        show(row, r.left + r.width / 2, r.bottom - 10);
      });
      row.addEventListener("blur", () => tip.classList.remove("show"));
    });
  }

  function renderResults(a) {
    const body = document.getElementById("tab-body");
    const res = model.results(a, a.responses);
    const o = res.overall;
    const target = res.target;
    const id = encodeURIComponent(a.id);

    if (!o.inScope) {
      body.innerHTML = `<div class="panel empty"><p><strong>No safeguards are in scope.</strong></p>
        <p><a href="#/assessment/${id}/scope">Review the scope</a> first.</p></div>`;
      return;
    }

    const controlLabel = r => `${r.key}. ${r.label}`;
    const plain = r => r.label;

    body.innerHTML = `
      ${o.scored < o.inScope ? `
        <div class="panel warn">${o.inScope - o.scored} of ${o.inScope} in-scope safeguards are not scored yet, so these results are provisional.
          <a href="#/assessment/${id}/assess">Continue scoring</a></div>` : ""}

      <div class="stats results-stats">
        <div class="stat hero">
          <div class="value">${fmt(o.average)}<small> / 5</small></div>
          <div class="label">Overall maturity · target ${target} – ${esc(LEVELS[target].name)}</div>
        </div>
        <div class="stat"><div class="value">${pct(o.meeting, o.scored)}%</div>
          <div class="label">${o.meeting} of ${o.scored} scored safeguards meet the target</div></div>
        <div class="stat"><div class="value">${o.gaps}</div>
          <div class="label">Gaps: <strong>${res.gapCounts.High}</strong> high · ${res.gapCounts.Medium} medium · ${res.gapCounts.Low} low</div></div>
        <div class="stat"><div class="value">${pct(o.scored, o.inScope)}%</div>
          <div class="label">Scored (${o.scored} of ${o.inScope} in scope)</div>
          <div class="progress"><span style="width:${pct(o.scored, o.inScope)}%"></span></div></div>
      </div>

      <div class="results-actions">
        <button class="btn" type="button" id="print-results">Print / save as PDF</button>
      </div>

      ${barChart("chart-controls", "Maturity by control", res.byControl, target, controlLabel)}

      <div class="chart-grid">
        ${barChart("chart-function", "Maturity by security function", res.byFunction, target, plain)}
        ${barChart("chart-ig", "Maturity by Implementation Group", res.byIG, target, plain)}
        ${barChart("chart-asset", "Maturity by asset type", res.byAsset, target, plain)}
      </div>

      <section class="panel" id="gap-list">
        <div class="page-head">
          <div>
            <h3>Gap list</h3>
            <p class="hint">Safeguards scored below the target maturity. Priority: <strong>High</strong> = an IG1 (essential) safeguard or a gap of 3+ levels;
              <strong>Medium</strong> = IG2; <strong>Low</strong> = IG3.</p>
          </div>
          <div class="actions">
            <select id="gap-filter" aria-label="Filter gaps by priority">
              <option value="">All priorities (${res.gaps.length})</option>
              ${["High", "Medium", "Low"].map(p => `<option value="${p}">${p} (${res.gapCounts[p]})</option>`).join("")}
            </select>
            ${res.gaps.length ? `<button class="btn" type="button" id="gap-csv">Export CSV</button>` : ""}
          </div>
        </div>
        ${res.gaps.length ? `
          <div class="table-wrap">
            <table class="gap-table">
              <thead><tr><th>Priority</th><th>Safeguard</th><th class="hide-sm">Control</th><th>Now → target</th><th class="hide-sm">Recommendation</th></tr></thead>
              <tbody>
                ${res.gaps.map(g => `
                  <tr data-priority="${g.priority}">
                    <td>${priorityBadge(g.priority)}</td>
                    <td><a class="title" href="#/assessment/${id}/assess">${esc(g.id)}</a> ${esc(g.title)}
                      <div class="sg-tags">${`<span class="badge ig${g.ig}">IG${g.ig}</span>`} <span class="badge">${esc(g.asset)}</span> <span class="badge">${esc(g.fn)}</span></div></td>
                    <td class="hide-sm">${g.controlId}. ${esc(DATA.controls[g.controlId - 1].title)}</td>
                    <td class="nowrap"><span class="mdot m${g.maturity}">${g.maturity}</span> → ${target} <span class="badge gap">−${g.gap}</span></td>
                    <td class="hide-sm">${g.recommendation ? esc(g.recommendation) : `<span class="muted">No recommendation yet</span>`}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>` : `<div class="empty">${o.scored ? "No gaps: every scored safeguard meets the target." : "Score safeguards on the Assess tab to see gaps here."}</div>`}
      </section>`;

    bindTooltips(body);
    document.getElementById("print-results").addEventListener("click", () => window.print());
    document.getElementById("gap-filter").addEventListener("change", e => {
      body.querySelectorAll(".gap-table tbody tr").forEach(tr => {
        tr.hidden = !!e.target.value && tr.dataset.priority !== e.target.value;
      });
    });
    const csv = document.getElementById("gap-csv");
    if (csv) csv.addEventListener("click", () => downloadCsv(a, res.gaps));
  }

  window.AVCIS.renderResults = renderResults;
})();
