"use strict";

/*
 * Vercel serverless entry point. Vercel serves public/ as static files and
 * routes /api/* here (see vercel.json). The database connection and app are
 * created once per function instance and reused across requests.
 */
const { loadConfig } = require("../server/config.js");
const { openDatabase } = require("../server/db.js");
const { createApp, bootstrapAdmin } = require("../server/app.js");

let ready = null;

async function init() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Vercel has no persistent disk, so AVCIS needs PostgreSQL (e.g. Neon).");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set. Add a random string of at least 32 characters in the Vercel project settings.");
  }
  const config = loadConfig({ COOKIE_SECURE: "true", TRUST_PROXY: "true" });
  const db = await openDatabase(config);
  try {
    await bootstrapAdmin(db, config);
  } catch (e) {
    // Another instance may have created the admin at the same moment.
    if (!/unique|duplicate/i.test(String(e.message))) throw e;
  }
  return createApp(db, config);
}

module.exports = async (req, res) => {
  try {
    ready = ready || init();
    const app = await ready;
    return app(req, res);
  } catch (e) {
    ready = null;
    console.error(e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Server is not configured: " + e.message }));
  }
};
