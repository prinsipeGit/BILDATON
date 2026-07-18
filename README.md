# Luca (BILDATON)

Luca is an AI-assisted university helpdesk. The first vertical slice accepts a student request, creates a traceable Registration ticket, lets authorized staff respond, and returns the response through the originating channel.

Luca assists with classification, information collection, approved-knowledge search, and drafting. Sensitive decisions and record changes remain with authorized school personnel.

## Repository status

This repository is at the **expansion-foundation** stage. It contains the Registration/IT delivery baseline, hosted Supabase schema, department activation controls, retrieval and citation contracts, verification guards, and organization-workflow models. Messenger, Redis, SSO, and OpenAI remain deployment integrations and are not configured in Git.

Read these documents before implementing features:

1. [`docs/PLAN_COMPARISON.md`](docs/PLAN_COMPARISON.md) — decisions made while reconciling the original PRD and Luca plan.
2. [`docs/architecture/FOUNDATION.md`](docs/architecture/FOUNDATION.md) — system boundaries and first vertical slice.
3. [`docs/decisions/0001-technical-baseline.md`](docs/decisions/0001-technical-baseline.md) — selected technical baseline.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) — exact setup and working rules.

## Prerequisites

- Node.js 24 or later
- npm 11 or later
- A hosted Supabase project
- Redis, either local through Docker Compose or a hosted Redis provider

## First-time setup

```bash
cp .env.example .env
npm install
# Fill DATABASE_URL and DIRECT_URL from Supabase Dashboard -> Connect.
# Start only Redis locally when a hosted REDIS_URL is not available.
docker compose up -d redis
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Do not add real credentials to `.env.example` or commit a local `.env` file.

`DATABASE_URL` is the runtime URL. Use Supabase's session pooler for a long-running API, or transaction pooler for serverless hosting. `DIRECT_URL` is the migration URL: prefer Supabase's direct connection, or use the session pooler when the migration environment is IPv4-only. Never use the transaction-mode pooler for migrations. Use `npm run db:deploy` to apply committed migrations to hosted Supabase; reserve `npm run db:migrate` for creating migrations during schema development.

## Workspace layout

```text
apps/
  api/          HTTP API and channel webhooks
  worker/       queued AI, notification, and retry work
  admin-site/   staff dashboard placeholder
packages/
  ai/           prompts, retrieval, schemas, and approved tools
  config/       environment parsing and validation
  contracts/    shared domain and API contracts
  database/     Prisma schema and database client
  security/     authorization and validation helpers
docs/           architecture, decisions, privacy, API, and operations
tests/          cross-package integration and end-to-end tests
```

## First implementation target

Build only this path first:

```text
Messenger webhook -> deduplicated inbound event -> conversation
-> Registration ticket -> authorized staff reply -> Messenger delivery job
```

IT Support follows the same deterministic path. Student-facing RAG activates per department only after approved sources, staff routing, and publication gates are in place. SIS access, attachments, voice transcription, payments, and record changes remain out of scope.
