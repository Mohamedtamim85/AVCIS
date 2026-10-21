"use strict";

/*
 * Database access with two interchangeable backends:
 *   - SQLite (default): a single file under data/, using Node's built-in node:sqlite.
 *   - PostgreSQL: used when DATABASE_URL is set (Neon, Supabase, RDS, self-hosted…).
 *
 * Queries are written with "?" placeholders and converted to $1, $2… for Postgres.
 * Both backends expose: query(sql, params) -> rows, run(sql, params) -> changed row
 * count, transaction(fn), close(), and kind.
 */
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY,
     username TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL DEFAULT '',
     role TEXT NOT NULL DEFAULT 'consultant',
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS assessments (
     id TEXT PRIMARY KEY,
     data TEXT NOT NULL,
     version INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     created_by TEXT NOT NULL DEFAULT '',
     updated_by TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS responses (
     assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
     safeguard_id TEXT NOT NULL,
     maturity INTEGER,
     evidence TEXT NOT NULL DEFAULT '',
     notes TEXT NOT NULL DEFAULT '',
     recommendation TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL,
     updated_by TEXT NOT NULL DEFAULT '',
     PRIMARY KEY (assessment_id, safeguard_id)
   )`
];

function openSqlite(file) {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  // node:sqlite is synchronous, so a transaction runs without other requests
  // interleaving as long as fn only awaits these (already-resolved) calls.
  const api = {
    kind: "sqlite",
    async query(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      return Number(db.prepare(sql).run(...params).changes);
    },
    async transaction(fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(api);
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async backup(target) {
      db.prepare("VACUUM INTO ?").run(target);
    },
    async close() {
      db.close();
    }
  };
  return api;
}

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => "$" + (++i));
}

function openPostgres(url, poolSize) {
  const { Pool } = require("pg");
  const local = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url) || /sslmode=disable/.test(url);
  const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true }, max: poolSize || 10 });

  const wrap = client => ({
    kind: "postgres",
    async query(sql, params = []) {
      return (await client.query(toPg(sql), params)).rows;
    },
    async run(sql, params = []) {
      return (await client.query(toPg(sql), params)).rowCount;
    }
  });

  return Object.assign(wrap(pool), {
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    }
  });
}

async function openDatabase(config) {
  const db = config.databaseUrl ? openPostgres(config.databaseUrl, config.poolSize) : openSqlite(config.sqlitePath);
  for (const stmt of SCHEMA) await db.run(stmt);
  return db;
}

module.exports = { openDatabase };
