/*
 * Assessment model shared by the browser and the server: field lists and
 * normalization, so both sides accept exactly the same shape.
 *
 * An assessment "profile" (what normalizeAssessment returns):
 *   status          "draft" | "in-progress" | "completed"
 *   title, assessor, startDate, dueDate, objectives
 *   targetIG        1 | 2 | 3
 *   targetMaturity  0–5, the maturity level the customer aims for
 *   customer        { name, industry, country, size, contactName, contactEmail, contactPhone }
 *   environment     array of strings from ENVIRONMENTS
 *   scope.excluded  { [safeguardId]: reason } — in-IG safeguards taken out of scope
 *
 * Responses are stored per safeguard (normalizeResponse):
 *   { maturity: 0–5 | null, evidence, notes, recommendation }
 */
(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const DATA = isNode ? require("./data/cis-controls.js") : root.CIS_DATA;
  const model = factory(DATA);
  if (isNode) module.exports = model;
  else root.AVCIS_MODEL = model;
})(typeof self !== "undefined" ? self : this, function (DATA) {
  "use strict";

  const SCHEMA = 1;
  const STATUSES = ["draft", "in-progress", "completed"];
  const ENVIRONMENTS = ["On-premises", "Cloud (IaaS/PaaS)", "SaaS", "Hybrid", "Remote workforce", "OT / IoT", "Mobile devices"];
  const CUSTOMER_FIELDS = ["name", "industry", "country", "size", "contactName", "contactEmail", "contactPhone"];
  const TEXT_FIELDS = ["title", "assessor", "startDate", "dueDate", "objectives"];
  const RESPONSE_TEXT_FIELDS = ["evidence", "notes", "recommendation"];

  const SAFEGUARDS = DATA.controls.flatMap(c => c.safeguards.map(s => Object.assign({ controlId: c.id }, s)));
  const VALID_IDS = new Set(SAFEGUARDS.map(s => s.id));

  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max || 500) : "";
  }

  function clampInt(v, min, max, fallback) {
    if (v === null || v === "" || v === undefined) return fallback;
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  }

  function isObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  // Coerce any object (form data, an imported file, a request body) into a valid profile.
  function normalizeAssessment(raw) {
    raw = isObject(raw) ? raw : {};
    const a = {
      status: STATUSES.includes(raw.status) ? raw.status : "draft",
      targetIG: clampInt(raw.targetIG, 1, 3, 1),
      targetMaturity: clampInt(raw.targetMaturity, 0, 5, 3),
      customer: {},
      environment: Array.isArray(raw.environment) ? ENVIRONMENTS.filter(e => raw.environment.includes(e)) : [],
      scope: { excluded: {} }
    };
    TEXT_FIELDS.forEach(f => { a[f] = str(raw[f], f === "objectives" ? 5000 : 500); });
    const c = isObject(raw.customer) ? raw.customer : {};
    CUSTOMER_FIELDS.forEach(f => { a.customer[f] = str(c[f]); });

    const excluded = isObject(raw.scope) && isObject(raw.scope.excluded) ? raw.scope.excluded : {};
    Object.keys(excluded).forEach(id => {
      if (VALID_IDS.has(id)) a.scope.excluded[id] = str(excluded[id]);
    });
    return a;
  }

  function normalizeResponse(raw) {
    raw = isObject(raw) ? raw : {};
    const r = { maturity: clampInt(raw.maturity, 0, 5, null) };
    RESPONSE_TEXT_FIELDS.forEach(f => { r[f] = str(raw[f], 5000); });
    return r;
  }

  function isEmptyResponse(r) {
    return r.maturity === null && RESPONSE_TEXT_FIELDS.every(f => !r[f]);
  }

  // Map of safeguardId -> response, keeping only valid ids and non-empty answers.
  function normalizeResponses(raw) {
    const out = {};
    if (!isObject(raw)) return out;
    Object.keys(raw).forEach(id => {
      if (!VALID_IDS.has(id)) return;
      const r = normalizeResponse(raw[id]);
      if (!isEmptyResponse(r)) out[id] = r;
    });
    return out;
  }

  // In-scope safeguards: within the target IG and not explicitly excluded.
  function inScope(a) {
    const excluded = (a.scope && a.scope.excluded) || {};
    return SAFEGUARDS.filter(s => s.ig <= a.targetIG && !(s.id in excluded));
  }

  function progress(a, responses) {
    const ids = inScope(a);
    return {
      inScope: ids.length,
      scored: ids.filter(s => responses[s.id] && responses[s.id].maturity !== null).length
    };
  }

  // Gap priority: IG1 safeguards are the essential baseline, so their gaps come
  // first; a gap of 3+ levels is high regardless of IG.
  function priority(ig, gap) {
    if (!gap) return null;
    if (ig === 1 || gap >= 3) return "High";
    return ig === 2 ? "Medium" : "Low";
  }

  function average(values) {
    return values.length ? values.reduce((x, y) => x + y, 0) / values.length : null;
  }

  // Scores for the Results dashboard and reports. Unscored safeguards are left
  // out of averages and counted separately as coverage.
  function results(a, responses) {
    const target = a.targetMaturity;
    const items = inScope(a).map(s => {
      const r = responses[s.id] || {};
      const maturity = r.maturity === undefined ? null : r.maturity;
      const gap = maturity === null ? null : Math.max(0, target - maturity);
      return Object.assign({}, s, {
        maturity,
        gap,
        priority: priority(s.ig, gap),
        recommendation: r.recommendation || "",
        notes: r.notes || ""
      });
    });

    const summarize = list => {
      const scored = list.filter(i => i.maturity !== null);
      return {
        inScope: list.length,
        scored: scored.length,
        average: average(scored.map(i => i.maturity)),
        meeting: scored.filter(i => i.gap === 0).length,
        gaps: scored.filter(i => i.gap > 0).length
      };
    };
    const groupBy = (keys, keyOf, labelOf) => keys
      .map(k => Object.assign({ key: k, label: labelOf(k) }, summarize(items.filter(i => keyOf(i) === k))))
      .filter(g => g.inScope > 0);

    const rank = { High: 0, Medium: 1, Low: 2 };
    const gaps = items.filter(i => i.gap > 0).sort((x, y) =>
      rank[x.priority] - rank[y.priority] || y.gap - x.gap || x.controlId - y.controlId ||
      x.id.localeCompare(y.id, undefined, { numeric: true }));

    return {
      target,
      overall: summarize(items),
      byControl: groupBy(DATA.controls.map(c => c.id), i => i.controlId, id => DATA.controls.find(c => c.id === id).title),
      byFunction: groupBy(DATA.functions, i => i.fn, k => k),
      byIG: groupBy([1, 2, 3], i => i.ig, k => "IG" + k),
      byAsset: groupBy(DATA.assetTypes, i => i.asset, k => k),
      gaps,
      gapCounts: {
        High: gaps.filter(g => g.priority === "High").length,
        Medium: gaps.filter(g => g.priority === "Medium").length,
        Low: gaps.filter(g => g.priority === "Low").length
      }
    };
  }

  return {
    SCHEMA,
    STATUSES,
    ENVIRONMENTS,
    CUSTOMER_FIELDS,
    VALID_IDS,
    normalizeAssessment,
    normalizeResponse,
    normalizeResponses,
    isEmptyResponse,
    inScope,
    progress,
    priority,
    results
  };
});
