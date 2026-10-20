"use strict";

/*
 * Server entry point: `npm start`.
 */
const { loadConfig } = require("./config.js");
const { openDatabase } = require("./db.js");
const { createApp, bootstrapAdmin } = require("./app.js");

async function main() {
  const config = loadConfig();
  const db = await openDatabase(config);
  console.log(db.kind === "sqlite" ? `Database: SQLite (${config.sqlitePath})` : "Database: PostgreSQL (DATABASE_URL)");

  const created = await bootstrapAdmin(db, config);
  if (created) console.log(`Created admin user "${created}".`);
  if (created === false) {
    console.warn("No users exist yet. Create the first admin with:\n  npm run user -- add <username> --admin\n" +
      "or start the server with ADMIN_USERNAME and ADMIN_PASSWORD set.");
  }

  const server = createApp(db, config).listen(config.port, config.host, () =>
    console.log(`Alphavito CIS Controls running at http://localhost:${config.port}`));

  const shutdown = () => server.close(() => db.close().then(() => process.exit(0)));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
