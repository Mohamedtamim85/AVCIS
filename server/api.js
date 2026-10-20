"use strict";

/*
 * JSON API mounted at /api.
 *
 *   GET    /session                       current user (401 if signed out)
 *   POST   /login  /logout
 *   POST   /me/password                   change own password
 *
 *   GET    /assessments                   summaries with scoring progress
 *   POST   /assessments                   create (optionally with responses, for import)
 *   GET    /assessments/:id               full assessment with responses
 *   PUT    /assessments/:id               update profile/scope; requires matching version
 *   DELETE /assessments/:id
 *   PUT    /assessments/:id/responses/:sg save one safeguard's score and notes
 *
 *   GET/POST /users, PUT/DELETE /users/:id   admin only
 */
const crypto = require("node:crypto");
const express = require("express");
const model = require("../public/js/model.js");
const auth = require("./auth.js");

const EDITORS = ["admin", "consultant"];

function createApi(db, config) {
  const router = express.Router();
  const limiter = auth.createLoginLimiter();
  const now = () => new Date().toISOString();

  // Wrap async handlers so rejections reach the error handler.
  const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // Custom header required on state-changing requests (CSRF defence in addition to SameSite).
  router.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.get("X-AVCIS") !== "1") {
      return res.status(403).json({ error: "Missing request header." });
    }
    next();
  });
  router.use(express.json({ limit: "2mb" }));
  router.use(auth.sessionMiddleware(db, config));

  // ---------- session ----------

  router.get("/session", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Please sign in.", mode: "server" });
    res.json({ mode: "server", user: auth.publicUser(req.user) });
  });

  router.post("/login", h(async (req, res) => {
    const username = String((req.body && req.body.username) || "").trim().toLowerCase().slice(0, 64);
    const password = String((req.body && req.body.password) || "").slice(0, 200);
    if (limiter.blocked(req.ip, username)) {
      return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    }
    const [user] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    const ok = user ? await auth.verifyPassword(password, user.password_hash) : (await auth.burnTime(password), false);
    if (!ok) {
      limiter.fail(req.ip, username);
      return res.status(401).json({ error: "Incorrect username or password.", mode: "server" });
    }
    limiter.reset(username);
    auth.setSession(res, req, config, user);
    res.json({ mode: "server", user: auth.publicUser(user) });
  }));

  router.post("/logout", (req, res) => {
    auth.clearSession(res, req, config);
    res.json({ ok: true });
  });

  router.post("/me/password", auth.requireUser, h(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!await auth.verifyPassword(String(currentPassword || ""), req.user.password_hash)) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
    const problem = auth.validatePassword(newPassword);
    if (problem) return res.status(400).json({ error: problem });
    const hash = await auth.hashPassword(newPassword);
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
    auth.setSession(res, req, config, Object.assign({}, req.user, { password_hash: hash }));
    res.json({ ok: true });
  }));

  // ---------- assessments ----------

  function toAssessment(row, responses) {
    return Object.assign({
      id: row.id,
      version: Number(row.version),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    }, model.normalizeAssessment(JSON.parse(row.data)), responses ? { responses } : {});
  }

  async function loadResponses(id) {
    const rows = await db.query(
      "SELECT safeguard_id, maturity, evidence, notes, recommendation FROM responses WHERE assessment_id = ?", [id]);
    const out = {};
    rows.forEach(r => {
      out[r.safeguard_id] = model.normalizeResponse({
        maturity: r.maturity === null ? null : Number(r.maturity),
        evidence: r.evidence, notes: r.notes, recommendation: r.recommendation
      });
    });
    return out;
  }

  async function loadFull(id) {
    const [row] = await db.query("SELECT * FROM assessments WHERE id = ?", [id]);
    return row ? toAssessment(row, await loadResponses(id)) : null;
  }

  function author(req) {
    return req.user.name || req.user.username;
  }

  router.get("/assessments", auth.requireUser, h(async (req, res) => {
    const rows = await db.query("SELECT * FROM assessments ORDER BY updated_at DESC");
    const scored = await db.query("SELECT assessment_id, safeguard_id FROM responses WHERE maturity IS NOT NULL");
    const byAssessment = {};
    scored.forEach(r => {
      (byAssessment[r.assessment_id] = byAssessment[r.assessment_id] || {})[r.safeguard_id] = { maturity: 0 };
    });
    res.json(rows.map(row => {
      const a = toAssessment(row);
      a.progress = model.progress(a, byAssessment[a.id] || {});
      return a;
    }));
  }));

  router.post("/assessments", auth.requireRole(...EDITORS), h(async (req, res) => {
    const body = req.body || {};
    const profile = model.normalizeAssessment(body);
    if (!profile.customer.name.trim()) return res.status(400).json({ error: "Customer name is required." });
    const responses = model.normalizeResponses(body.responses);
    const id = crypto.randomUUID();
    const ts = now();
    const who = author(req);

    await db.transaction(async tx => {
      await tx.run(
        "INSERT INTO assessments (id, data, version, created_at, updated_at, created_by, updated_by) VALUES (?, ?, 1, ?, ?, ?, ?)",
        [id, JSON.stringify(profile), ts, ts, who, who]);
      for (const [sg, r] of Object.entries(responses)) {
        await tx.run(
          `INSERT INTO responses (assessment_id, safeguard_id, maturity, evidence, notes, recommendation, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, sg, r.maturity, r.evidence, r.notes, r.recommendation, ts, who]);
      }
    });
    res.status(201).json(await loadFull(id));
  }));

  router.get("/assessments/:id", auth.requireUser, h(async (req, res) => {
    const a = await loadFull(req.params.id);
    if (!a) return res.status(404).json({ error: "Assessment not found." });
    res.json(a);
  }));

  router.put("/assessments/:id", auth.requireRole(...EDITORS), h(async (req, res) => {
    const body = req.body || {};
    const profile = model.normalizeAssessment(body);
    if (!profile.customer.name.trim()) return res.status(400).json({ error: "Customer name is required." });
    const changed = await db.run(
      "UPDATE assessments SET data = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?",
      [JSON.stringify(profile), now(), author(req), req.params.id, Number.isInteger(body.version) ? body.version : -1]);
    const current = await loadFull(req.params.id);
    if (!current) return res.status(404).json({ error: "Assessment not found." });
    if (!changed) {
      return res.status(409).json({
        error: `This assessment was changed by ${current.updatedBy || "someone else"} in the meantime.`,
        current
      });
    }
    res.json(current);
  }));

  router.delete("/assessments/:id", auth.requireRole(...EDITORS), h(async (req, res) => {
    const removed = await db.transaction(async tx => {
      await tx.run("DELETE FROM responses WHERE assessment_id = ?", [req.params.id]);
      return tx.run("DELETE FROM assessments WHERE id = ?", [req.params.id]);
    });
    if (!removed) return res.status(404).json({ error: "Assessment not found." });
    res.json({ ok: true });
  }));

  router.put("/assessments/:id/responses/:sg", auth.requireRole(...EDITORS), h(async (req, res) => {
    const { id, sg } = req.params;
    if (!model.VALID_IDS.has(sg)) return res.status(400).json({ error: "Unknown safeguard." });
    const r = model.normalizeResponse(req.body);
    const ts = now();
    const who = author(req);

    const found = await db.transaction(async tx => {
      const touched = await tx.run("UPDATE assessments SET updated_at = ?, updated_by = ? WHERE id = ?", [ts, who, id]);
      if (!touched) return false;
      if (model.isEmptyResponse(r)) {
        await tx.run("DELETE FROM responses WHERE assessment_id = ? AND safeguard_id = ?", [id, sg]);
      } else {
        await tx.run(
          `INSERT INTO responses (assessment_id, safeguard_id, maturity, evidence, notes, recommendation, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (assessment_id, safeguard_id) DO UPDATE SET
             maturity = excluded.maturity, evidence = excluded.evidence, notes = excluded.notes,
             recommendation = excluded.recommendation, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
          [id, sg, r.maturity, r.evidence, r.notes, r.recommendation, ts, who]);
      }
      return true;
    });
    if (!found) return res.status(404).json({ error: "Assessment not found." });
    res.json({ response: r, updatedAt: ts, updatedBy: who });
  }));

  // ---------- users (admin) ----------

  const admin = auth.requireRole("admin");

  router.get("/users", admin, h(async (req, res) => {
    const rows = await db.query("SELECT * FROM users ORDER BY username");
    res.json(rows.map(auth.publicUser));
  }));

  router.post("/users", admin, h(async (req, res) => {
    const body = req.body || {};
    const username = String(body.username || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 200);
    const role = auth.ROLES.includes(body.role) ? body.role : "consultant";
    if (!auth.USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3–64 characters: letters, numbers, . _ @ -" });
    }
    const problem = auth.validatePassword(body.password);
    if (problem) return res.status(400).json({ error: problem });
    const [exists] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    if (exists) return res.status(409).json({ error: "That username is already taken." });
    const user = {
      id: crypto.randomUUID(), username, name, role,
      password_hash: await auth.hashPassword(body.password), created_at: now()
    };
    await db.run("INSERT INTO users (id, username, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [user.id, user.username, user.name, user.role, user.password_hash, user.created_at]);
    res.status(201).json(auth.publicUser(user));
  }));

  async function adminCount() {
    const [row] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
    return Number(row.n);
  }

  router.put("/users/:id", admin, h(async (req, res) => {
    const body = req.body || {};
    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found." });
    const name = body.name === undefined ? user.name : String(body.name).trim().slice(0, 200);
    const role = auth.ROLES.includes(body.role) ? body.role : user.role;
    if (user.role === "admin" && role !== "admin" && await adminCount() <= 1) {
      return res.status(400).json({ error: "There must be at least one admin." });
    }
    let hash = user.password_hash;
    if (body.password) {
      const problem = auth.validatePassword(body.password);
      if (problem) return res.status(400).json({ error: problem });
      hash = await auth.hashPassword(body.password);
    }
    await db.run("UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?", [name, role, hash, user.id]);
    if (user.id === req.user.id && hash !== user.password_hash) {
      auth.setSession(res, req, config, Object.assign({}, user, { password_hash: hash }));
    }
    res.json(auth.publicUser(Object.assign({}, user, { name, role })));
  }));

  router.delete("/users/:id", admin, h(async (req, res) => {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "You can't delete your own account." });
    const [user] = await db.query("SELECT role FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin" && await adminCount() <= 1) {
      return res.status(400).json({ error: "There must be at least one admin." });
    }
    await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }));

  router.use((req, res) => res.status(404).json({ error: "Not found." }));

  return router;
}

module.exports = { createApi };
