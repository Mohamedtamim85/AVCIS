/*
 * Assessment storage. Assessments live in the browser's localStorage and can
 * be moved between machines with JSON export/import. If storage is blocked
 * (private window, strict settings) data is kept in memory for the session.
 *
 * Assessment shape (schema 1):
 *   id, schema, createdAt, updatedAt
 *   status          "draft" | "in-progress" | "completed"
 *   title, assessor, startDate, dueDate, objectives
 *   targetIG        1 | 2 | 3
 *   targetMaturity  0–5, the maturity level the customer aims for
 *   customer        { name, industry, country, size, contactName, contactEmail, contactPhone }
 *   environment     array of strings from ENVIRONMENTS
 *   scope.excluded  { [safeguardId]: reason } — in-IG safeguards taken out of scope
 *   responses       { [safeguardId]: { maturity, evidence, notes } } — filled in Step 3
 */
(function () {
  "use strict";

  const KEY = "avcis.assessments.v1";
  const SCHEMA = 1;
  const STATUSES = ["draft", "in-progress", "completed"];
  const ENVIRONMENTS = ["On-premises", "Cloud (IaaS/PaaS)", "SaaS", "Hybrid", "Remote workforce", "OT / IoT", "Mobile devices"];
  const CUSTOMER_FIELDS = ["name", "industry", "country", "size", "contactName", "contactEmail", "contactPhone"];
  const TEXT_FIELDS = ["title", "assessor", "startDate", "dueDate", "objectives"];

  const VALID_IDS = new Set(window.AVCIS.ALL_SAFEGUARDS.map(s => s.id));

  let cache = null;
  let persistent = true;

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max || 500) : "";
  }

  function clampInt(v, min, max, fallback) {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  }

  // Coerce any object (e.g. from an imported file) into a valid assessment.
  function normalize(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    const now = new Date().toISOString();
    const a = {
      id: str(raw.id, 64) || newId(),
      schema: SCHEMA,
      createdAt: str(raw.createdAt, 40) || now,
      updatedAt: str(raw.updatedAt, 40) || now,
      status: STATUSES.includes(raw.status) ? raw.status : "draft",
      targetIG: clampInt(raw.targetIG, 1, 3, 1),
      targetMaturity: clampInt(raw.targetMaturity, 0, 5, 3),
      customer: {},
      environment: Array.isArray(raw.environment) ? raw.environment.filter(e => ENVIRONMENTS.includes(e)) : [],
      scope: { excluded: {} },
      responses: {}
    };
    TEXT_FIELDS.forEach(f => { a[f] = str(raw[f], f === "objectives" ? 5000 : 500); });
    const c = raw.customer && typeof raw.customer === "object" ? raw.customer : {};
    CUSTOMER_FIELDS.forEach(f => { a.customer[f] = str(c[f]); });

    const excluded = raw.scope && raw.scope.excluded && typeof raw.scope.excluded === "object" ? raw.scope.excluded : {};
    Object.keys(excluded).forEach(id => {
      if (VALID_IDS.has(id)) a.scope.excluded[id] = str(excluded[id]);
    });

    const responses = raw.responses && typeof raw.responses === "object" ? raw.responses : {};
    Object.keys(responses).forEach(id => {
      const r = responses[id];
      if (!VALID_IDS.has(id) || !r || typeof r !== "object") return;
      a.responses[id] = {
        maturity: r.maturity == null ? null : clampInt(r.maturity, 0, 5, null),
        evidence: str(r.evidence, 5000),
        notes: str(r.notes, 5000)
      };
    });
    return a;
  }

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.map(normalize) : [];
    } catch (e) {
      cache = [];
      persistent = false;
    }
    return cache;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
      persistent = true;
    } catch (e) {
      persistent = false;
    }
  }

  function list() {
    return load().slice().sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  }

  function get(id) {
    return load().find(a => a.id === id) || null;
  }

  function create(fields) {
    const a = normalize(Object.assign({}, fields, { id: newId(), createdAt: null, updatedAt: null }));
    load().push(a);
    persist();
    return a;
  }

  // Merge a partial update into an assessment and save it.
  function update(id, patch) {
    const items = load();
    const i = items.findIndex(a => a.id === id);
    if (i < 0) return null;
    const merged = Object.assign({}, items[i], patch, { id, createdAt: items[i].createdAt });
    merged.updatedAt = new Date().toISOString();
    items[i] = normalize(merged);
    persist();
    return items[i];
  }

  function remove(id) {
    cache = load().filter(a => a.id !== id);
    persist();
  }

  function duplicate(id) {
    const src = get(id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.title = (copy.title ? copy.title + " " : "") + "(copy)";
    copy.status = "draft";
    return create(copy);
  }

  function exportJSON(ids) {
    const items = ids ? load().filter(a => ids.includes(a.id)) : load();
    return JSON.stringify({
      format: "avcis-assessments",
      schema: SCHEMA,
      exportedAt: new Date().toISOString(),
      assessments: items
    }, null, 2);
  }

  // Accepts our export format, a bare assessment or an array of assessments.
  // Imported items whose id already exists are added as copies with a new id.
  function importJSON(text) {
    const parsed = JSON.parse(text);
    let items;
    if (Array.isArray(parsed)) items = parsed;
    else if (parsed && Array.isArray(parsed.assessments)) items = parsed.assessments;
    else if (parsed && typeof parsed === "object" && parsed.customer) items = [parsed];
    else throw new Error("This file does not contain AVCIS assessments.");

    const existing = new Set(load().map(a => a.id));
    const imported = items.filter(x => x && typeof x === "object").map(x => {
      const a = normalize(x);
      if (existing.has(a.id)) a.id = newId();
      existing.add(a.id);
      return a;
    });
    if (!imported.length) throw new Error("No assessments found in this file.");
    load().push(...imported);
    persist();
    return imported;
  }

  // In-scope safeguards: within the target IG and not explicitly excluded.
  function inScope(a) {
    return window.AVCIS.ALL_SAFEGUARDS.filter(s => s.ig <= a.targetIG && !(s.id in a.scope.excluded));
  }

  window.AVCIS.store = {
    STATUSES,
    ENVIRONMENTS,
    list,
    get,
    create,
    update,
    remove,
    duplicate,
    exportJSON,
    importJSON,
    inScope,
    isPersistent: () => (load(), persistent)
  };
})();
