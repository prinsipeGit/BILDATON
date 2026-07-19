# Luca Admin Site

This directory contains two deliberately separate surfaces:

- The root static files are the Registration-first GitHub Pages mockup used for public interface review.
- The `app/` application is the authenticated Luca Messenger Operations dashboard used by staff.

## API connection

The page calls only the API endpoints that exist today:

- `GET /health`
- `GET /ready`

The Pages workflow writes `runtime-config.js` from the repository Actions variable `LUCA_API_BASE_URL`. Set it to the deployed public API origin before publishing, or use the connection control in the page for a browser-local override. The URL is public configuration, not a place for API keys, Supabase credentials, Meta tokens, or OpenAI keys.

The API must allow the Pages origin through `CORS_ALLOWED_ORIGINS`. The interactive queue, request creation, escalation, and conversation features are local prototype data until the Registration ticket endpoints are implemented.

## GitHub Pages deployment

The deployment workflow runs when `main` changes under `apps/admin-site`. A repository administrator must enable Pages with **GitHub Actions** as the build source. Then add the `LUCA_API_BASE_URL` repository Actions variable and configure the API deployment with:

```text
CORS_ALLOWED_ORIGINS=https://prinsipegit.github.io
```

The full repository-owner handoff is in [GitHub Pages Deployment](../../docs/operations/GITHUB_PAGES_DEPLOYMENT.md). The Pages workflow is safe to publish without `LUCA_API_BASE_URL`; the mockup will then show that no API origin is configured. Never use a Supabase database URL, `localhost`, or a secret value for this public browser configuration.

## Local preview

Run any static server with `apps/admin-site` as its root. For example:

```powershell
npx serve apps/admin-site --listen 4173
```

For a local API on port `3000`, configure `http://localhost:3000` in the page and include `http://localhost:4173` in `CORS_ALLOWED_ORIGINS`.

## Staff operations dashboard

It shows recent conversations, messages and knowledge citations, delivery and webhook failures, active chatbot rules, published knowledge, and recent AI runs. Supabase remains the source of truth; the dashboard reads through the Luca API so database credentials never reach a worker's browser.

## Local development

Start the Luca API on port 3000, then run `npm run dev` in this directory. By default, the site reads `http://127.0.0.1:3000/admin/dashboard`.

For a hosted environment, configure:

- `DASHBOARD_API_URL`: the public HTTPS URL of the deployed Luca API.
- `DASHBOARD_API_TOKEN`: the same long random value configured as `ADMIN_DASHBOARD_TOKEN` on the API.

Keep the hosted site owner-only or workspace-restricted. Editing knowledge and rules is intentionally deferred until worker accounts and audit logging are ready.
