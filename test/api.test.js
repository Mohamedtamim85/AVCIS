"use strict";

/*
 * API tests against a real server on a random port.
 * SQLite always; PostgreSQL too when TEST_DATABASE_URL is set.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadConfig } = require("../server/config.js");
const { openDatabase } = require("../server/db.js");
const { createApp, bootstrapAdmin } = require("../server/app.js");

const ADMIN = { username: "admin", password: "admin-password-123" };

async function startServer(databaseUrl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "avcis-test-"));
  const config = loadConfig({
    DATA_DIR: dir, DATABASE_URL: databaseUrl || "", SESSION_SECRET_OVERRIDE: "x".repeat(40),
    ADMIN_USERNAME: ADMIN.username, ADMIN_PASSWORD: ADMIN.password, COOKIE_SECURE: "false"
  });
  const db = await openDatabase(config);
  if (databaseUrl) {
    for (const t of ["responses", "assessments", "users"]) await db.run(`DELETE FROM ${t}`);
  }
  await bootstrapAdmin(db, config);
  const server = createApp(db, config).listen(0);
  await new Promise(r => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    async close() {
      await new Promise(r => server.close(r));
      await db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

// Minimal client that keeps the session cookie.
function client(base) {
  let cookie = "";
  return async function call(method, url, body, headers = {}) {
    const res = await fetch(base + "/api" + url, {
      method,
      headers: Object.assign({ "X-AVCIS": "1", "Content-Type": "application/json", Cookie: cookie }, headers),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { status: res.status, data, headers: res.headers };
  };
}

const backends = [["sqlite", ""]];
if (process.env.TEST_DATABASE_URL) backends.push(["postgres", process.env.TEST_DATABASE_URL]);

for (const [name, url] of backends) {
  test(`API (${name})`, async t => {
    const srv = await startServer(url);
    t.after(() => srv.close());
    const call = client(srv.base);

    await t.test("requires sign-in", async () => {
      assert.equal((await call("GET", "/session")).status, 401);
      assert.equal((await call("GET", "/assessments")).status, 401);
      assert.equal((await call("GET", "/session")).data.mode, "server");
    });

    await t.test("rejects state changes without the CSRF header", async () => {
      const r = await call("POST", "/login", ADMIN, { "X-AVCIS": "" });
      assert.equal(r.status, 403);
    });

    await t.test("rejects a wrong password, accepts the right one", async () => {
      assert.equal((await call("POST", "/login", { username: "admin", password: "wrong-password!" })).status, 401);
      const r = await call("POST", "/login", ADMIN);
      assert.equal(r.status, 200);
      assert.equal(r.data.user.role, "admin");
      assert.match(r.headers.get("set-cookie"), /HttpOnly/);
      assert.equal((await call("GET", "/session")).status, 200);
    });

    let id;
    let version;
    await t.test("creates and normalizes an assessment", async () => {
      assert.equal((await call("POST", "/assessments", { customer: {} })).status, 400);
      const r = await call("POST", "/assessments", {
        customer: { name: "Contoso", industry: "Healthcare", bogus: "x" },
        targetIG: 2, targetMaturity: 4, environment: ["Hybrid", "Mars"],
        scope: { excluded: { "4.11": "No mobiles", "99.9": "bad" } },
        responses: { "1.1": { maturity: 3, evidence: "CMDB export" }, "1.2": { maturity: 9 } }
      });
      assert.equal(r.status, 201);
      id = r.data.id;
      version = r.data.version;
      assert.equal(r.data.targetIG, 2);
      assert.deepEqual(r.data.environment, ["Hybrid"]);
      assert.deepEqual(r.data.scope.excluded, { "4.11": "No mobiles" });
      assert.equal(r.data.customer.bogus, undefined);
      assert.deepEqual(Object.keys(r.data.responses), ["1.1"]);
      assert.equal(r.data.createdBy, "Administrator");
    });

    await t.test("saves, updates and clears safeguard responses", async () => {
      let r = await call("PUT", `/assessments/${id}/responses/2.1`, { maturity: 2, notes: "Partial inventory" });
      assert.equal(r.status, 200);
      r = await call("PUT", `/assessments/${id}/responses/2.1`, { maturity: 4, notes: "Automated" });
      assert.equal(r.status, 200);
      assert.equal((await call("PUT", `/assessments/${id}/responses/77.1`, { maturity: 1 })).status, 400);
      assert.equal((await call("PUT", `/assessments/nope/responses/1.1`, { maturity: 1 })).status, 404);
      r = await call("GET", `/assessments/${id}`);
      assert.deepEqual(r.data.responses["2.1"], { maturity: 4, evidence: "", notes: "Automated", recommendation: "" });
      await call("PUT", `/assessments/${id}/responses/2.1`, { maturity: null });
      r = await call("GET", `/assessments/${id}`);
      assert.equal(r.data.responses["2.1"], undefined);
    });

    await t.test("lists assessments with progress", async () => {
      const r = await call("GET", "/assessments");
      assert.equal(r.data.length, 1);
      assert.deepEqual(r.data[0].progress, { inScope: 129, scored: 1 });
      assert.equal(r.data[0].responses, undefined);
    });

    await t.test("detects conflicting profile edits", async () => {
      const a = (await call("GET", `/assessments/${id}`)).data;
      let r = await call("PUT", `/assessments/${id}`, Object.assign({}, a, { title: "First", version }));
      assert.equal(r.status, 200);
      assert.equal(r.data.version, version + 1);
      r = await call("PUT", `/assessments/${id}`, Object.assign({}, a, { title: "Stale", version }));
      assert.equal(r.status, 409);
      assert.equal(r.data.current.title, "First");
    });

    await t.test("manages users and enforces roles", async () => {
      assert.equal((await call("POST", "/users", { username: "bob", password: "short" })).status, 400);
      let r = await call("POST", "/users", { username: "Viewer.One", name: "Vee", role: "viewer", password: "viewer-password-1" });
      assert.equal(r.status, 201);
      assert.equal(r.data.username, "viewer.one");
      assert.equal(r.data.password_hash, undefined);
      assert.equal((await call("POST", "/users", { username: "viewer.one", password: "viewer-password-1" })).status, 409);

      const viewer = client(srv.base);
      assert.equal((await viewer("POST", "/login", { username: "viewer.one", password: "viewer-password-1" })).status, 200);
      assert.equal((await viewer("GET", `/assessments/${id}`)).status, 200);
      assert.equal((await viewer("PUT", `/assessments/${id}/responses/1.1`, { maturity: 5 })).status, 403);
      assert.equal((await viewer("DELETE", `/assessments/${id}`)).status, 403);
      assert.equal((await viewer("GET", "/users")).status, 403);

      // Resetting the password signs the viewer out.
      r = await call("PUT", `/users/${r.data.id}`, { password: "another-password-2" });
      assert.equal(r.status, 200);
      assert.equal((await viewer("GET", "/session")).status, 401);

      const me = (await call("GET", "/session")).data.user;
      assert.equal((await call("DELETE", `/users/${me.id}`)).status, 400);
      assert.equal((await call("PUT", `/users/${me.id}`, { role: "viewer" })).status, 400);
    });

    await t.test("changes own password", async () => {
      assert.equal((await call("POST", "/me/password", { currentPassword: "nope", newPassword: "new-admin-pass-1" })).status, 400);
      assert.equal((await call("POST", "/me/password", { currentPassword: ADMIN.password, newPassword: "new-admin-pass-1" })).status, 200);
      assert.equal((await call("GET", "/session")).status, 200);
    });

    await t.test("deletes an assessment and its responses", async () => {
      assert.equal((await call("DELETE", `/assessments/${id}`)).status, 200);
      assert.equal((await call("GET", `/assessments/${id}`)).status, 404);
      assert.equal((await call("DELETE", `/assessments/${id}`)).status, 404);
    });

    await t.test("rate-limits repeated failed logins", async () => {
      const anon = client(srv.base);
      let last;
      for (let i = 0; i < 11; i++) last = await anon("POST", "/login", { username: "ghost", password: "wrong-password!" });
      assert.equal(last.status, 429);
    });

    await t.test("serves the app but not server files", async () => {
      assert.equal((await fetch(srv.base + "/")).status, 200);
      assert.match((await fetch(srv.base + "/")).headers.get("content-security-policy"), /script-src 'self'/);
      assert.equal((await fetch(srv.base + "/js/model.js")).status, 200);
      assert.equal((await fetch(srv.base + "/server/api.js")).status, 404);
      assert.equal((await fetch(srv.base + "/package.json")).status, 404);
    });
  });
}
