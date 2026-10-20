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
js/data/cis-controls.js  CIS v8.1 catalog: controls, safeguards, IG, asset type, function
js/app.js                Views + hash router
```

## Roadmap (built step by step)

| Step | Feature | Status |
|------|---------|--------|
| 1 | **Controls catalog** – overview of 18 controls, Implementation Groups, control detail pages, searchable/filterable list of all 153 safeguards | ✅ Done |
| 2 | **Customer & assessment setup** – customer profile, target IG, scope, assessor, saved locally with JSON import/export | ⏳ Next |
| 3 | **Safeguard assessment** – rate each in-scope safeguard (Not implemented / Partial / Implemented / N/A), maturity, evidence and notes | Planned |
| 4 | **Results dashboard** – compliance score per control, IG, asset type and security function; gap list | Planned |
| 5 | **Proposal & report** – printable/PDF customer report with executive summary, prioritized remediation roadmap and Alphavito service recommendations | Planned |
| 6 | **Optional backend** – multi-user accounts, database storage, shared assessments | Planned |

## Data source & licensing

Control and safeguard titles, Implementation Groups, asset types and security functions
follow CIS Controls v8.1. Safeguard descriptions are short paraphrased summaries; the
authoritative text is published by the Center for Internet Security at
<https://www.cisecurity.org/controls>. The CIS Controls are licensed by CIS under
CC BY-NC-ND 4.0 — review CIS's terms for commercial/consulting use.
