# SAOS — local ServiceNow review workspace

SAOS runs on this device at `http://127.0.0.1:3000`. It reads allow-listed ServiceNow tables into a local PostgreSQL-compatible PGlite database, checks a limited set of evidence-based rules, and lets an operator preview and record decisions. One reviewed duplicate-relationship fix has an explicit live Apply and rollback path; all other suggestions are review-only.

## Start

Requires Node.js 24 and pnpm 11. From this directory:

On macOS, double-click `start-saos.command`; it starts the local app and opens your default browser. Keep its Terminal window open while using SAOS.

Or start manually:

```bash
pnpm install
pnpm run build
pnpm run start
```

Open <http://127.0.0.1:3000>. The app binds only to loopback. The first screen is intentionally empty; no demonstration records are loaded. Open **Settings** to add an HTTPS ServiceNow instance and an account with read access to the modules you want checked. Live Apply needs a separately reviewed write permission. Test the connection, then load records. Do not paste passwords into chat or commit them.

For development, use `pnpm run dev`. For the full API integration suite, use `pnpm run build && pnpm run test:integration`. `pnpm run lint` and `pnpm exec tsc --noEmit` check the code.

## What works now

- Read-only, paginated allow-listed source sync with verified core CMDB tables, domain-safe relationship handling, field/count checks, optional-table exclusions and local coverage warnings.
- Local persistence and narrow deterministic checks across CMDB, Incident, SLA, HRSD, CSM and Security Incident records; same CI names and missing extracted endpoints are deliberately **not** treated as proven errors.
- Versioned findings and plans, preview, human approve/reject, a scoped live duplicate-relationship delete with captured rollback, append-only tamper-evident action history, JSON export and source-switch protection.
- Editable local connection settings, data/privacy view, in-app guide, responsive interface and independent scrolling of list/detail panels on wide screens.
- Optional local Ollama model selection and on-demand plain-language explanation. The model does not create findings, scores or changes.

## Important limits

This is **not** yet a complete enterprise SAOS implementation. Most of the 44 catalogued agents have no implemented rule pack. It does not analyse scoped-app code/configuration, security/GRC, licensing or the full process estate. It has no general-purpose ServiceNow write-back, CAB update-set generation, scheduled/event ingestion, peer benchmark dataset, production authentication, encryption-at-rest or external compliance certification. Approval alone is not an Apply action. The local hash chain detects application-level tampering but is not a substitute for an independent immutable audit store.

See [User guide](docs/USER_GUIDE.md), [Coverage and safety](docs/COVERAGE.md) and [Local AI](docs/LOCAL_MODELS.md).
