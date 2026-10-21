"use strict";

/*
 * Configuration from environment variables (see .env.example).
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");

function bool(v, fallback) {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
}

// Use SESSION_SECRET if given; otherwise generate one and keep it next to the
// SQLite database so logins survive restarts.
function sessionSecret(dataDir) {
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return process.env.SESSION_SECRET;
  }
  const file = path.join(dataDir, ".session-secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch (e) {
    const secret = crypto.randomBytes(48).toString("base64url");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

function loadConfig(overrides) {
  const env = Object.assign({}, process.env, overrides);
  const dataDir = path.resolve(ROOT, env.DATA_DIR || "data");
  return {
    port: Number(env.PORT) || 3000,
    host: env.HOST || "0.0.0.0",
    databaseUrl: env.DATABASE_URL || "",
    sqlitePath: path.resolve(dataDir, env.SQLITE_FILE || "avcis.db"),
    dataDir,
    publicDir: path.join(ROOT, "public"),
    sessionSecret: env.SESSION_SECRET_OVERRIDE || sessionSecret(dataDir),
    // Serverless platforms run many short-lived instances: keep few connections each.
    poolSize: Number(env.PG_POOL_SIZE) || (env.VERCEL ? 3 : 10),
    sessionHours: Number(env.SESSION_HOURS) || 12,
    // "auto" sets the Secure cookie flag when the request arrived over HTTPS.
    cookieSecure: env.COOKIE_SECURE === undefined || env.COOKIE_SECURE === "" ? "auto" : bool(env.COOKIE_SECURE, false),
    trustProxy: bool(env.TRUST_PROXY, false),
    adminUsername: env.ADMIN_USERNAME || "",
    adminPassword: env.ADMIN_PASSWORD || ""
  };
}

module.exports = { loadConfig };
