# Local Development

## Services

Docker Compose provides PostgreSQL with pgvector and Redis. Application processes run through npm so debugging remains simple.

## Safe setup

1. Copy `.env.example` to `.env`.
2. Leave Meta and OpenAI values as placeholders until that integration is being implemented.
3. Run `npm install`.
4. Start services with `docker compose up -d`.
5. Generate Prisma code with `npm run db:generate`.
6. Create the first development migration with `npm run db:migrate`.
7. Run the API with `npm run dev`.

## Expected first endpoint

`GET /health` returns process health only. Dependency health and readiness must be separate before deployment so an unavailable database does not masquerade as a healthy system.
