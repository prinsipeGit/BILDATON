# Luca (BILDATON)

Luca is an AI-assisted university helpdesk. The first vertical slice accepts a student request, creates a traceable IT Support ticket, lets authorized staff respond, and returns the response through the originating channel.

Luca assists with classification, information collection, approved-knowledge search, and drafting. Sensitive decisions and record changes remain with authorized school personnel.

## Repository status

This repository is at the **foundation** stage. It contains the agreed architecture, initial domain contracts, database schema, service entry points, and local-infrastructure definitions. Messenger credentials, Supabase, Redis, and OpenAI are not configured yet.

Read these documents before implementing features:

1. [`docs/PLAN_COMPARISON.md`](docs/PLAN_COMPARISON.md) — decisions made while reconciling the original PRD and Luca plan.
2. [`docs/architecture/FOUNDATION.md`](docs/architecture/FOUNDATION.md) — system boundaries and first vertical slice.
3. [`docs/decisions/0001-technical-baseline.md`](docs/decisions/0001-technical-baseline.md) — selected technical baseline.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) — exact setup and working rules.

## Prerequisites

- Node.js 24 or later
- npm 11 or later
- Docker with Compose (for PostgreSQL and Redis)

## First-time setup

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Do not add real credentials to `.env.example` or commit a local `.env` file.

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
-> IT Support ticket -> authorized staff reply -> Messenger delivery job
```

FAQ generation, embeddings, attachments, voice transcription, and SIS access come after the auditable ticket path is working.
