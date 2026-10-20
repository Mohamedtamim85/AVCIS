"use strict";

/*
 * Authentication: scrypt password hashes, HMAC-signed session cookies and a
 * simple in-memory login rate limiter.
 */
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const COOKIE = "avcis_session";
const ROLES = ["admin", "consultant", "viewer"];
const USERNAME_RE = /^[a-z0-9._@-]{3,64}$/;
const MIN_PASSWORD = 10;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltB64, keyB64] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return crypto.timingSafeEqual(key, expected);
}

// A dummy hash so failed logins for unknown users cost the same as real ones.
let dummyHash;
async function burnTime(password) {
  dummyHash = dummyHash || await hashPassword("not-a-real-password");
  await verifyPassword(password, dummyHash);
}

function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return "Password is too long.";
  return null;
}

// Fingerprint of the password hash: changing a password invalidates old sessions.
function stamp(passwordHash) {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function unsign(token, secret) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && payload.exp > Date.now() ? payload : null;
  } catch (e) {
    return null;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function cookieFlags(req, config, maxAgeSec) {
  const secure = config.cookieSecure === "auto" ? req.secure : config.cookieSecure;
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

function setSession(res, req, config, user) {
  const maxAge = config.sessionHours * 3600;
  const token = sign({ uid: user.id, st: stamp(user.password_hash), exp: Date.now() + maxAge * 1000 }, config.sessionSecret);
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; ${cookieFlags(req, config, maxAge)}`);
}

function clearSession(res, req, config) {
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieFlags(req, config, 0)}`);
}

// Loads req.user from the session cookie (or leaves it null).
function sessionMiddleware(db, config) {
  return async (req, res, next) => {
    req.user = null;
    const payload = unsign(readCookie(req, COOKIE), config.sessionSecret);
    if (payload) {
      try {
        const [user] = await db.query("SELECT id, username, name, role, password_hash FROM users WHERE id = ?", [payload.uid]);
        if (user && stamp(user.password_hash) === payload.st) req.user = user;
      } catch (e) {
        return next(e);
      }
    }
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please sign in.", mode: "server" });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Please sign in.", mode: "server" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You don't have permission to do that." });
    next();
  };
}

// Limits failed logins per IP and per username: 10 failures per 15 minutes.
function createLoginLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  const key = k => {
    const now = Date.now();
    let h = hits.get(k);
    if (!h || now - h.start > windowMs) { h = { start: now, count: 0 }; hits.set(k, h); }
    return h;
  };
  setInterval(() => {
    const now = Date.now();
    for (const [k, h] of hits) if (now - h.start > windowMs) hits.delete(k);
  }, windowMs).unref();
  return {
    blocked: (ip, username) => key("ip:" + ip).count >= max || key("u:" + username).count >= max,
    fail: (ip, username) => { key("ip:" + ip).count++; key("u:" + username).count++; },
    reset: username => hits.delete("u:" + username)
  };
}

function publicUser(u) {
  return { id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.created_at };
}

module.exports = {
  ROLES,
  USERNAME_RE,
  hashPassword,
  verifyPassword,
  burnTime,
  validatePassword,
  setSession,
  clearSession,
  sessionMiddleware,
  requireUser,
  requireRole,
  createLoginLimiter,
  publicUser
};
