# Luca Admin Site

This static site is the Registration-first support mockup for GitHub Pages. It is intentionally separate from the staff application that will eventually consume authenticated ticket, assignment, and reply APIs.

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

## Local preview

Run any static server with `apps/admin-site` as its root. For example:

```powershell
npx serve apps/admin-site --listen 4173
```

For a local API on port `3000`, configure `http://localhost:3000` in the page and include `http://localhost:4173` in `CORS_ALLOWED_ORIGINS`.
