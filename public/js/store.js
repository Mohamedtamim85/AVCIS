/*
 * Assessment store with two backends behind one async interface:
 *
 *   server — the AVCIS Node server (/api). Shared, multi-user, signed in.
 *   local  — browser localStorage, used when the page is opened without the
 *            server (e.g. straight from disk or a static host) for demos.
 *
 * init() detects which one is available. Full assessments look like
 *   { id, version, createdAt, updatedAt, createdBy, updatedBy, ...profile, responses }
 * where profile is defined in model.js. list() returns the same objects
 * without responses, plus progress { inScope, scored }.
 */
(function () {
  "use strict";

  const model = window.AVCIS_MODEL;
  const LOCAL_KEY = "avcis.assessments.v1";
  const MIGRATED_KEY = "avcis.assessments.v1.migrated";

  // ---------- helpers ----------

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function readLocal(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  // Rebuild a full assessment from untrusted input (local storage or a file).
  function hydrate(raw, keepMeta) {
    raw = raw && typeof raw === "object" ? raw : {};
    const now = new Date().toISOString();
    return Object.assign({
      id: keepMeta && typeof raw.id === "string" ? raw.id : newId(),
      version: keepMeta && Number.isInteger(raw.version) ? raw.version : 1,
      createdAt: keepMeta && typeof raw.createdAt === "string" ? raw.createdAt : now,
      updatedAt: keepMeta && typeof raw.updatedAt === "string" ? raw.updatedAt : now,
      createdBy: keepMeta && typeof raw.createdBy === "string" ? raw.createdBy : "",
      updatedBy: keepMeta && typeof raw.updatedBy === "string" ? raw.updatedBy : ""
    }, model.normalizeAssessment(raw), { responses: model.normalizeResponses(raw.responses) });
  }

  function summary(a) {
    const s = Object.assign({}, a, { progress: model.progress(a, a.responses || {}) });
    delete s.responses;
    return s;
  }

  // ---------- local backend ----------

  function localBackend() {
    let items = null;
    let persistent = true;

    const load = () => {
      if (items) return items;
      try {
        localStorage.getItem(LOCAL_KEY);
      } catch (e) {
        persistent = false;
      }
      items = readLocal(LOCAL_KEY).map(x => hydrate(x, true));
      return items;
    };
    const persist = () => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
        persistent = true;
      } catch (e) {
        persistent = false;
      }
    };
    const find = id => load().find(a => a.id === id);
    const copy = a => JSON.parse(JSON.stringify(a));

    return {
      isPersistent: () => (load(), persistent),
      async list() {
        return load().slice().sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).map(summary);
      },
      async get(id) {
        const a = find(id);
        return a ? copy(a) : null;
      },
      async create(fields) {
        const a = hydrate(fields, false);
        load().push(a);
        persist();
        return copy(a);
      },
      async update(id, version, fields) {
        const a = find(id);
        if (!a) throw Object.assign(new Error("Assessment not found."), { status: 404 });
        Object.assign(a, model.normalizeAssessment(fields), { version: a.version + 1, updatedAt: new Date().toISOString() });
        persist();
        return copy(a);
      },
      async remove(id) {
        items = load().filter(a => a.id !== id);
        persist();
      },
      async saveResponse(id, sg, response) {
        const a = find(id);
        if (!a) throw Object.assign(new Error("Assessment not found."), { status: 404 });
        const r = model.normalizeResponse(response);
        if (model.isEmptyResponse(r)) delete a.responses[sg];
        else a.responses[sg] = r;
        a.updatedAt = new Date().toISOString();
        persist();
        return { response: r, updatedAt: a.updatedAt };
      }
    };
  }

  // ---------- server backend ----------

  let onUnauthorized = () => {};

  async function api(method, path, body) {
    let res;
    try {
      res = await fetch("api" + path, {
        method,
        credentials: "same-origin",
        headers: Object.assign({ "X-AVCIS": "1" }, body === undefined ? {} : { "Content-Type": "application/json" }),
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw Object.assign(new Error("Can't reach the server. Check your connection."), { status: 0 });
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = Object.assign(new Error((data && data.error) || `Request failed (${res.status}).`), { status: res.status, data });
      if (res.status === 401 && path !== "/login" && path !== "/session") onUnauthorized();
      throw err;
    }
    return data;
  }

  function serverBackend() {
    const enc = encodeURIComponent;
    return {
      isPersistent: () => true,
      list: () => api("GET", "/assessments"),
      get: id => api("GET", `/assessments/${enc(id)}`).catch(e => { if (e.status === 404) return null; throw e; }),
      create: fields => api("POST", "/assessments", fields),
      update: (id, version, fields) => api("PUT", `/assessments/${enc(id)}`, Object.assign({}, fields, { version })),
      remove: id => api("DELETE", `/assessments/${enc(id)}`),
      saveResponse: (id, sg, response) => api("PUT", `/assessments/${enc(id)}/responses/${enc(sg)}`, response)
    };
  }

  // ---------- public interface ----------

  const store = {
    mode: null,          // "server" | "local"
    user: null,          // signed-in user in server mode
    backend: null,

    // Detects the server. Resolves to "server" or "local".
    async init() {
      try {
        const res = await fetch("api/session", { credentials: "same-origin" });
        const data = await res.json();
        if (data && data.mode === "server") {
          this.mode = "server";
          this.user = res.ok ? data.user : null;
          this.backend = serverBackend();
          return this.mode;
        }
      } catch (e) {
        // No server (opened from disk, static host) — fall through to local mode.
      }
      this.mode = "local";
      this.backend = localBackend();
      return this.mode;
    },

    onUnauthorized(fn) { onUnauthorized = fn; },

    async login(username, password) {
      const data = await api("POST", "/login", { username, password });
      this.user = data.user;
      return data.user;
    },

    async logout() {
      await api("POST", "/logout").catch(() => {});
      this.user = null;
    },

    // What the current user may do. Local mode has no accounts, so everything is allowed.
    canEdit() { return this.mode === "local" || (this.user && this.user.role !== "viewer"); },
    isAdmin() { return this.mode === "server" && this.user && this.user.role === "admin"; },
    isPersistent() { return this.backend.isPersistent(); },

    list() { return this.backend.list(); },
    get(id) { return this.backend.get(id); },
    create(fields) { return this.backend.create(fields); },
    update(id, version, fields) { return this.backend.update(id, version, fields); },
    remove(id) { return this.backend.remove(id); },
    saveResponse(id, sg, response) { return this.backend.saveResponse(id, sg, response); },

    async duplicate(id) {
      const src = await this.get(id);
      if (!src) throw new Error("Assessment not found.");
      return this.create(Object.assign({}, src, {
        title: (src.title ? src.title + " " : "") + "(copy)",
        status: "draft"
      }));
    },

    async exportJSON(ids) {
      const targets = ids || (await this.list()).map(a => a.id);
      const assessments = [];
      for (const id of targets) {
        const a = await this.get(id);
        if (a) assessments.push(a);
      }
      return JSON.stringify({
        format: "avcis-assessments",
        schema: model.SCHEMA,
        exportedAt: new Date().toISOString(),
        assessments
      }, null, 2);
    },

    // Accepts our export format, a bare assessment or an array of them.
    // Imported assessments always get new ids.
    async importJSON(text) {
      const parsed = JSON.parse(text);
      let items;
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed && Array.isArray(parsed.assessments)) items = parsed.assessments;
      else if (parsed && typeof parsed === "object" && parsed.customer) items = [parsed];
      else throw new Error("This file does not contain AVCIS assessments.");
      items = items.filter(x => x && typeof x === "object" && x.customer);
      if (!items.length) throw new Error("No assessments found in this file.");
      const created = [];
      for (const raw of items) {
        const a = hydrate(raw, false);
        if (!a.customer.name.trim()) a.customer.name = "Unnamed customer";
        created.push(await this.create(a));
      }
      return created;
    },

    // Assessments left in this browser from local mode, offered for upload in server mode.
    localLeftovers() {
      return this.mode === "server" ? readLocal(LOCAL_KEY) : [];
    },

    async uploadLeftovers() {
      const items = readLocal(LOCAL_KEY);
      const created = await this.importJSON(JSON.stringify(items));
      try {
        localStorage.setItem(MIGRATED_KEY, JSON.stringify(items));
        localStorage.removeItem(LOCAL_KEY);
      } catch (e) {
        // Ignore: the upload succeeded, the browser copy just stays.
      }
      return created;
    },

    dismissLeftovers() {
      try {
        localStorage.setItem(MIGRATED_KEY, localStorage.getItem(LOCAL_KEY) || "[]");
        localStorage.removeItem(LOCAL_KEY);
      } catch (e) {
        // Nothing to do.
      }
    },

    // Users (server mode, admin only).
    users: {
      list: () => api("GET", "/users"),
      create: u => api("POST", "/users", u),
      update: (id, u) => api("PUT", `/users/${encodeURIComponent(id)}`, u),
      remove: id => api("DELETE", `/users/${encodeURIComponent(id)}`)
    },

    changePassword: (currentPassword, newPassword) => api("POST", "/me/password", { currentPassword, newPassword }),

    inScope: a => model.inScope(a),
    STATUSES: model.STATUSES,
    ENVIRONMENTS: model.ENVIRONMENTS
  };

  window.AVCIS.store = store;
})();
