# Alphavito CIS Controls (AVCIS)

A web interface that brings together all **CIS Critical Security Controls v8.1**
(18 Controls, 153 Safeguards) in a clean, easy-to-use layout. Alphavito uses it to
present the framework to customers, propose solutions and run CIS assessments.

## Run it

It's a plain static site with no build step and no dependencies.

- Open `index.html` directly in a browser, **or**
- Serve the folder: `python3 -m http.server 8080` → http://localhost:8080

It can be hosted on any static host (Hostinger, Vercel, GitHub Pages, IIS, nginx…).

## Project structure

```
index.html               App shell (header, nav, footer)
css/styles.css           Styles (light/dark, responsive)
js/data/cis-controls.js  CIS v8.1 catalog + 0–5 maturity scale
js/core.js               Shared helpers and route registry
js/store.js              Assessment storage (localStorage) + JSON import/export
js/catalog.js            Step 1 views: overview, control detail, safeguard search
js/assessments.js        Step 2 views: assessment list, customer profile, scope
js/app.js                Hash router
```

## Roadmap (built step by step)

| Step | Feature | Status |
|------|---------|--------|
| 1 | **Controls catalog** – overview of 18 controls, Implementation Groups, control detail pages, searchable/filterable list of all 153 safeguards | ✅ Done |
| 2 | **Customer & assessment setup** – customer profile, engagement details, target IG (with a "help me choose" guide), target maturity, per-safeguard scoping with exclusion reasons; saved in the browser with JSON import/export, duplicate and delete | ✅ Done |
| 3 | **Safeguard assessment** – score each in-scope safeguard on the 0–5 maturity scale, with evidence and notes | ⏳ Next |
| 4 | **Results dashboard** – compliance score per control, IG, asset type and security function; gap list | Planned |
| 5 | **Proposal & report** – printable/PDF customer report with executive summary, prioritized remediation roadmap and Alphavito service recommendations | Planned |
| 6 | **Optional backend** – multi-user accounts, database storage, shared assessments | Planned |

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

## Where data is stored

Assessments are saved in the browser's local storage on the machine you're using; nothing is sent
to a server. Use **Export** to back up an assessment or move it to another machine, and **Import**
to load it. Clearing browser data deletes local assessments, so export anything important.

## Data source & licensing

Control and safeguard titles, Implementation Groups, asset types and security functions
follow CIS Controls v8.1. Safeguard descriptions are short paraphrased summaries; the
authoritative text is published by the Center for Internet Security at
<https://www.cisecurity.org/controls>. The CIS Controls are licensed by CIS under
CC BY-NC-ND 4.0 — review CIS's terms for commercial/consulting use.
