# GitHub Pages Deployment

This guide deploys the static Registration mockup in `apps/admin-site`. It does
not deploy the Fastify API, Messenger integration, Supabase, Redis, or OpenAI.

## What is already in the repository

- `.github/workflows/deploy-pages.yml` builds and deploys the static site from
  `main`.
- `apps/admin-site/runtime-config.js` is replaced during the workflow with a
  public API origin from the `LUCA_API_BASE_URL` Actions variable.
- The mockup calls `GET /health` and `GET /ready` only. Other visible ticket and
  conversation controls are local demo state.

## Required repository setting

An owner or administrator must enable GitHub Pages before the workflow can
publish.

1. Open the repository **Settings** page.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Save the setting if GitHub prompts for confirmation.

Write-only collaborators may not see this setting. The `GITHUB_TOKEN` in the
workflow also cannot create a Pages site when repository policy disallows it.

## Deploy the mockup

1. Open **Actions** in `prinsipeGit/BILDATON`.
2. Select **Deploy Registration Mockup**.
3. Select **Run workflow** and keep branch `main`.
4. Run the workflow and wait for the `build` and `deploy` jobs to succeed.
5. Open `https://prinsipegit.github.io/BILDATON/` or the URL shown by the
   successful deployment.

The workflow also runs automatically when `main` changes under
`apps/admin-site` or when `.github/workflows/deploy-pages.yml` changes.

## Connect a deployed API

The static site can publish before the API is deployed. To display API health
from the published site, add an Actions repository variable:

1. Open **Settings -> Secrets and variables -> Actions -> Variables**.
2. Create `LUCA_API_BASE_URL`.
3. Set it to the public HTTPS origin of the deployed Luca API, for example
   `https://api.example.edu`.
4. Configure that API's `CORS_ALLOWED_ORIGINS` with
   `https://prinsipegit.github.io`.
5. Run the Pages workflow again.

Do not put API keys, Meta access tokens, OpenAI keys, Supabase credentials,
database URLs, or `localhost` values in `LUCA_API_BASE_URL`.

## Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| `Get Pages site failed` | Pages has not been enabled. | Complete the required repository setting above. |
| `Resource not accessible by integration` | The workflow cannot create the Pages site under the current repository policy. | Have an owner or administrator enable Pages, then run the workflow again. |
| The site says API is not configured | `LUCA_API_BASE_URL` is absent. | Add the public API origin as an Actions variable and redeploy. |
| The site cannot reach `/health` | The API is unavailable or CORS excludes the Pages origin. | Verify the API health endpoint and `CORS_ALLOWED_ORIGINS`. |
