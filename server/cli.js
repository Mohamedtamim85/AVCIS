"use strict";

/*
 * Admin command line: `npm run user -- <command>` and `npm run backup`.
 *
 *   add <username> [--admin|--viewer] [--name "Full Name"]   prompts for a password
 *   passwd <username>                                         reset a password
 *   list                                                      list users
 *   backup [file]                                             SQLite only: copy the database
 */
const crypto = require("node:crypto");
const path = require("node:path");
const readline = require("node:readline");
const { loadConfig } = require("./config.js");
const { openDatabase } = require("./db.js");
const auth = require("./auth.js");

function askPassword(prompt) {
  if (process.env.AVCIS_PASSWORD) return Promise.resolve(process.env.AVCIS_PASSWORD);
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(prompt)) process.stdout.write(s); };
    rl.question(prompt, answer => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

async function readNewPassword() {
  const pw = await askPassword("Password (min 10 characters): ");
  const problem = auth.validatePassword(pw);
  if (problem) throw new Error(problem);
  if (!process.env.AVCIS_PASSWORD && pw !== await askPassword("Repeat password: ")) throw new Error("Passwords do not match.");
  return pw;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const config = loadConfig();
  const db = await openDatabase(config);
  try {
    if (cmd === "add") {
      const username = String(args[0] || "").toLowerCase();
      if (!auth.USERNAME_RE.test(username)) throw new Error("Usage: add <username> [--admin|--viewer] [--name \"Full Name\"]");
      const role = args.includes("--admin") ? "admin" : args.includes("--viewer") ? "viewer" : "consultant";
      const nameIdx = args.indexOf("--name");
      const name = nameIdx > 0 ? String(args[nameIdx + 1] || "") : "";
      const [exists] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
      if (exists) throw new Error(`User "${username}" already exists.`);
      const hash = await auth.hashPassword(await readNewPassword());
      await db.run("INSERT INTO users (id, username, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), username, name, role, hash, new Date().toISOString()]);
      console.log(`Created ${role} "${username}".`);
    } else if (cmd === "passwd") {
      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [String(args[0] || "").toLowerCase()]);
      if (!user) throw new Error("User not found.");
      await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [await auth.hashPassword(await readNewPassword()), user.id]);
      console.log("Password updated.");
    } else if (cmd === "list") {
      const rows = await db.query("SELECT username, name, role, created_at FROM users ORDER BY username");
      rows.forEach(u => console.log(`${u.username.padEnd(24)} ${u.role.padEnd(11)} ${u.name}`));
      if (!rows.length) console.log("No users.");
    } else if (cmd === "backup") {
      if (db.kind !== "sqlite") throw new Error("For PostgreSQL use your provider's backups or pg_dump.");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const target = path.resolve(args[0] || path.join(config.dataDir, "backups", `avcis-${stamp}.db`));
      require("node:fs").mkdirSync(path.dirname(target), { recursive: true });
      await db.backup(target);
      console.log(`Backup written to ${target}`);
    } else {
      console.log("Commands: add <username> [--admin|--viewer] [--name \"Full Name\"] | passwd <username> | list | backup [file]");
    }
  } finally {
    await db.close();
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
