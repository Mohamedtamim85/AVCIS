"use strict";

/*
 * Express application: security headers, the JSON API and the static frontend.
 */
const express = require("express");
const { createApi } = require("./api.js");
const auth = require("./auth.js");

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

function createApp(db, config) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", CSP);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });

  app.use("/api", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); }, createApi(db, config));
  app.use(express.static(config.publicDir, { index: "index.html", dotfiles: "ignore" }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}

// Create the first admin from ADMIN_USERNAME / ADMIN_PASSWORD when there are no users yet.
async function bootstrapAdmin(db, config) {
  const [row] = await db.query("SELECT COUNT(*) AS n FROM users");
  if (Number(row.n) > 0) return null;
  if (!config.adminUsername || !config.adminPassword) return false;
  const username = config.adminUsername.trim().toLowerCase();
  if (!auth.USERNAME_RE.test(username)) throw new Error("ADMIN_USERNAME is not a valid username.");
  const problem = auth.validatePassword(config.adminPassword);
  if (problem) throw new Error("ADMIN_PASSWORD: " + problem);
  await db.run("INSERT INTO users (id, username, name, role, password_hash, created_at) VALUES (?, ?, ?, 'admin', ?, ?)",
    [require("node:crypto").randomUUID(), username, "Administrator", await auth.hashPassword(config.adminPassword), new Date().toISOString()]);
  return username;
}

module.exports = { createApp, bootstrapAdmin };
