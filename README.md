# Luca (BILDATON)

Luca is a Supabase-grounded university helpdesk for Facebook Messenger. It answers from published knowledge, collects structured Registration and Registrar requests, records conversations for staff oversight, and sends status updates through the originating channel.

Luca assists with classification, information collection, approved-knowledge search, and drafting. Sensitive decisions and record changes remain with authorized school personnel.

## Repository status

This repository contains the expansion foundation plus the first executable chatbot slice: signed Messenger webhooks, durable event and conversation storage, department and organization controls, published-knowledge retrieval, grounded OpenAI responses, Registrar request workflows, and authenticated staff operations. External credentials and hosted runtime configuration are intentionally not stored in Git.

Read these documents before implementing features:

Start with [`docs/README.md`](docs/README.md) for the documentation map,
current scope, branch convention, and operations handoff.

1. [`docs/PLAN_COMPARISON.md`](docs/PLAN_COMPARISON.md) — decisions made while reconciling the original PRD and Luca plan.
2. [`docs/architecture/FOUNDATION.md`](docs/architecture/FOUNDATION.md) — system boundaries and first vertical slice.
3. [`docs/decisions/0001-technical-baseline.md`](docs/decisions/0001-technical-baseline.md) — selected technical baseline.
4. [`CONTRIBUTING.md`](CONTRIBUTING.md) — exact setup and working rules.

## Prerequisites

- Node.js 24 or later
- npm 11 or later
- A hosted Supabase project

## First-time setup

```bash
cp .env.example .env
npm install
# Fill DATABASE_URL and DIRECT_URL from Supabase Dashboard -> Connect.
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
  worker/       reserved for future high-volume background work
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

## Current implementation target

Build only this path first:

```text
Messenger webhook -> deduplicated inbound event -> Supabase conversation
-> Registrar request or published knowledge answer -> Messenger reply/status update
```

Registration and IT Support follow the same department-governance and authorization boundaries. SIS access, attachments, voice transcription, payments, and student-record changes remain out of scope.

## Static Pages mockup

`apps/admin-site` contains a Registration-first GitHub Pages mockup for
interface review. It may call the public health endpoints only and keeps ticket,
conversation, and escalation interactions in the browser until those APIs are
implemented. See [GitHub Pages Deployment](docs/operations/GITHUB_PAGES_DEPLOYMENT.md)
for repository setup and deployment steps.
