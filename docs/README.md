# Documentation Guide

This guide connects the repository's planning, implementation, operations, and
deployment documents. It does not replace the existing source documents.

## Read in this order

1. [Repository README](../README.md) for setup and the current implementation
   snapshot.
2. [Foundation Architecture](architecture/FOUNDATION.md) for the required
   Registration-first workflow and trust boundaries.
3. [Technical Baseline Decision](decisions/0001-technical-baseline.md) for
   agreed technology choices.
4. [PRD and Luca Plan Reconciliation](PLAN_COMPARISON.md) when the original
   Campus Front Door PRD and the current implementation plan differ.
5. [Registration Pilot Plan](operations/REGISTRATION_PILOT_PLAN.md) for the
   first end-to-end proof.
6. [Post-Registration Roadmap](operations/POST_REGISTRATION_ROADMAP.md) and
   [Organization Coordination Expansion](operations/ORGANIZATION_COORDINATION_EXPANSION.md)
   for approved expansion work.

## Current scope

The active implementation baseline is a Registration-first, auditable support
workflow. IT Support is the next deterministic department. Public FAQ retrieval
is activated only after each department has approved sources, staff routing, and
escalation rules.

The static site in `apps/admin-site` is a GitHub Pages registration mockup for
interface review. It is not the authenticated staff application, and its ticket
and conversation interactions remain browser-local until the corresponding API
endpoints exist.

## Branch convention

- `main` is the shared integration and deployment baseline.
- `russellcruz` is the collaborator branch and should be fast-forwarded from
  `main` before starting related work, unless it intentionally contains its own
  reviewed changes.
- Feature branches should start from current `main`, describe their scope in
  their pull request, and avoid unrelated documentation rewrites.

## Operations and deployment

- [Local Development](operations/LOCAL_DEVELOPMENT.md) covers local API,
  Supabase, Redis, and health checks.
- [GitHub Pages Deployment](operations/GITHUB_PAGES_DEPLOYMENT.md) is the
  handoff guide for the static mockup. Repository Pages settings require an
  owner or administrator.
