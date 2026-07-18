# ADR 0001: Technical Baseline

- Status: Accepted
- Date: 2026-07-18

## Context

The PRD recommends Python/FastAPI. Luca's plan recommends TypeScript, Fastify or NestJS, Prisma, PostgreSQL/pgvector, Redis/BullMQ, and a Codex Sites dashboard. Starting with two backend stacks would slow a small team and duplicate contracts.

## Decision

Use an npm-workspace TypeScript modular monolith:

- Fastify for the API and Meta webhook
- a separate worker process sharing domain packages
- Prisma with PostgreSQL and pgvector-ready local infrastructure
- Redis/BullMQ for asynchronous processing
- OpenAPI for HTTP contracts
- Vitest and Playwright for automated tests
- Codex Sites for the staff dashboard after the API workflow is stable

No microservices will be introduced until measured scaling or ownership constraints justify them.

## Consequences

- One language covers API, worker, shared contracts, and dashboard integration.
- Webhook handling stays fast while slow work moves to the worker.
- Package boundaries require discipline even though deployment remains combined.
- FastAPI-specific examples in the original PRD are superseded.
