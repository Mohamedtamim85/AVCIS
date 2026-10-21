# Alphavito CIS Controls (AVCIS)

A web interface that brings together all **CIS Critical Security Controls v8.1**
(18 Controls, 153 Safeguards) in a clean, easy-to-use layout. Alphavito uses it to
present the framework to customers, propose solutions and run CIS assessments.

## Run it

Requires **Node.js 22.9 or newer**.

```bash
npm install
cp .env.example .env        # then set ADMIN_PASSWORD (min 10 characters)
npm start                   # http://localhost:3000
```

On first start the server creates the admin account from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Sign in, then add your team under **Users**.

> Opening `public/index.html` directly (or hosting `public/` on a static host) still works in
> **Local mode**: no sign-in, and assessments are saved only in that browser. Handy for demos.

## Data storage

| Option | When | Configure |
|---|---|---|
| **SQLite** (default) | One server (VPS, Hostinger, office server, Docker) | Nothing. Data lives in `data/avcis.db` |
| **PostgreSQL** | Managed / cloud databases (Neon, Supabase, Azure, AWS RDS) or several app servers | Set `DATABASE_URL` |

- Tables are created automatically on startup.
- Each safeguard score is saved on its own as you work, so several consultants can score the same
  assessment at once. If two people save the profile or scope at the same moment, the second person
  is told and shown the latest version, so nothing is silently overwritten.
- **Backups:** `npm run backup` writes a consistent copy of the SQLite database to `data/backups/`
  (schedule it with cron). For PostgreSQL, use your provider's backups or `pg_dump`.
  **Export** in the app also downloads assessments as JSON.
- Assessments saved earlier in a browser (Local mode) can be uploaded to the server from the
  Assessments page.

## Users and roles

| Role | Can |
|---|---|
| Admin | Everything, plus manage users |
| Consultant | Create, edit, score, import/export and delete assessments |
| Viewer | Read assessments only |

Manage users in the app (**Users**, admins only) or from the command line:

```bash
npm run user -- add j.doe --name "Jane Doe"     # consultant (prompts for password)
npm run user -- add boss --admin
npm run user -- passwd j.doe                     # reset a password
npm run user -- list
```

Security: passwords are hashed with scrypt; sessions are HMAC-signed HttpOnly cookies; failed
logins are rate-limited; a strict Content-Security-Policy is sent. **Always serve it over HTTPS in
production** (behind nginx/Caddy/your host's SSL) and set `TRUST_PROXY=true` when behind a proxy.

## Deploy

**Docker**

```bash
docker build -t avcis .
docker run -d -p 3000:3000 -v avcis-data:/data \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='change-me-please' avcis
```

**Vercel** (uses PostgreSQL, since Vercel has no permanent disk)

1. Create a PostgreSQL database, e.g. on [Neon](https://neon.tech) (free tier; also available from the Vercel Marketplace), and copy its **pooled** connection string.
2. Import this GitHub repository in Vercel. No build settings are needed: `vercel.json` serves `public/` and routes `/api/*` to `api/index.js`.
3. In **Project → Settings → Environment Variables** add:
   - `DATABASE_URL` – the Neon connection string
   - `SESSION_SECRET` – a random string of 32+ characters (e.g. `openssl rand -base64 48`)
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` – the first admin, created on first request
4. Deploy, sign in, and change the admin password under your name → **My account**.

**VPS / Hostinger Node.js hosting**: upload the project, run `npm install --omit=dev`, set the
environment variables from `.env.example` and start with `npm start` (or a process manager such as
pm2). Put it behind HTTPS.

## Tests

```bash
npm test                                                     # API tests on SQLite
TEST_DATABASE_URL=postgres://user:pass@localhost/avcis_test npm test   # also on PostgreSQL
```

## Project structure

```
public/                    Browser app (served by the server, or usable standalone)
  index.html
  css/styles.css
  js/data/cis-controls.js  CIS v8.1 catalog + 0–5 maturity scale
  js/model.js              Assessment model and validation (shared with the server)
  js/core.js               Shared helpers and route registry
  js/store.js              Storage: server API or browser (Local mode)
  js/catalog.js            Step 1: overview, control detail, safeguard search
  js/assessments.js        Steps 2–3: assessment list, profile, scope, scoring
  js/results.js            Step 4: results dashboard and gap list
  js/account.js            Sign-in, my account, user management
  js/app.js                Hash router
api/index.js               Vercel serverless entry point
vercel.json                Vercel routing and security headers
server/
  index.js                 Entry point (npm start)
  app.js                   Express app, security headers, static files
  api.js                   JSON API
  auth.js                  Passwords, sessions, roles, rate limiting
  db.js                    SQLite / PostgreSQL adapter and schema
  config.js                Environment configuration
  cli.js                   User management and backup commands
test/api.test.js           API tests
```

## Roadmap (built step by step)

| Step | Feature | Status |
|------|---------|--------|
| 1 | **Controls catalog** – overview of 18 controls, Implementation Groups, control detail pages, searchable/filterable list of all 153 safeguards | ✅ Done |
| 2 | **Customer & assessment setup** – customer profile, engagement details, target IG (with a "help me choose" guide), target maturity, per-safeguard scoping with exclusion reasons; saved in the browser with JSON import/export, duplicate and delete | ✅ Done |
| 3 | **Safeguard assessment** – score each in-scope safeguard on the 0–5 maturity scale with evidence, observations and recommendation; live progress, gaps and filters. **Shared storage**: Node.js server with SQLite or PostgreSQL, team sign-in and roles | ✅ Done |
| 4 | **Results dashboard** – overall maturity, % meeting target, gaps by priority; maturity charts by control, security function, IG and asset type (with data tables); prioritized gap list with recommendations, CSV export and print/PDF | ✅ Done |
| 5 | **Proposal & report** – branded customer report with executive summary, prioritized remediation roadmap and Alphavito service recommendations | ⏳ Next |
| 6 | **Hardening & extras** – audit history, SSO (Microsoft Entra ID), customer-facing read-only links | Planned |

## Maturity scale

Each in-scope safeguard is scored 0–5; anything below the assessment's target maturity is a gap.

| Level | Name | Meaning |
|---|---|---|
| 0 | Non-existent | Not implemented; no process or technology in place |
| 1 | Initial | Ad hoc, undocumented, inconsistent |
| 2 | Developing | Partially implemented, informal, gaps in coverage |
| 3 | Defined | Documented, approved, consistently applied |
| 4 | Managed | Measured and monitored with metrics |
| 5 | Optimized | Automated and continuously improved |

## Data source & licensing

Control and safeguard titles, Implementation Groups, asset types and security functions
follow CIS Controls v8.1. Safeguard descriptions are short paraphrased summaries; the
authoritative text is published by the Center for Internet Security at
<https://www.cisecurity.org/controls>. The CIS Controls are licensed by CIS under
CC BY-NC-ND 4.0 — review CIS's terms for commercial/consulting use.
