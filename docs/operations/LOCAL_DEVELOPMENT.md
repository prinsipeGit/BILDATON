# Local Development

## Services

PostgreSQL is hosted by Supabase. Docker Compose is retained only as an optional local Redis service. Application processes run through npm so debugging remains simple.

## Safe setup

1. Copy `.env.example` to `.env`.
2. In Supabase Dashboard, open **Connect** and copy the appropriate pooler URI into `DATABASE_URL`.
3. Copy the direct connection URI into `DIRECT_URL`. If the machine is IPv4-only, the session pooler URI is an acceptable fallback. This variable is reserved for Prisma migrations and schema tools.
4. Leave Meta and OpenAI values as placeholders until that integration is being implemented.
5. Set `REDIS_URL` to hosted Redis, or run `docker compose up -d redis` for local Redis.
6. Run `npm install` and `npm run db:generate`.
7. Apply committed migrations to Supabase with `npm run db:deploy`, then run `npm run db:seed`. Use `npm run db:migrate` only while intentionally creating a new development migration.
8. Run the API with `npm run dev`.

Never use Supabase's transaction-mode pooler for `DIRECT_URL`; transaction mode does not support all migration operations. Supabase direct connections use IPv6 by default, so an IPv4-only development network must use the session pooler or Supabase's IPv4 add-on.

## Expected first endpoint

`GET /health` returns process health only. Dependency health and readiness must be separate before deployment so an unavailable database does not masquerade as a healthy system.

`GET /ready` checks PostgreSQL and Redis. It returns `200 READY` only when both dependencies respond, otherwise `503 NOT_READY`. Dependency errors are not returned to clients.

## Pages mockup preview

The static Registration mockup is served from `apps/admin-site`. Run a static
server with that directory as its root, for example:

```powershell
npx serve apps/admin-site --listen 4173
```

Keep `http://localhost:4173` in `CORS_ALLOWED_ORIGINS` when testing the mockup
against a local API. The page calls `GET /health` and `GET /ready` only. Ticket,
conversation, new-request, and escalation controls are browser-local prototype
state until their API endpoints are implemented.

For deployment instructions, see
[GitHub Pages Deployment](GITHUB_PAGES_DEPLOYMENT.md).
