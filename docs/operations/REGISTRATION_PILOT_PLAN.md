# Registration Pilot Plan

## Status

The repository now contains the hosted-Supabase foundation, health/readiness endpoints, Prisma schema, and committed migration history. The Registration Messenger-to-ticket workflow is still pending: it is not connected to production Meta traffic and it does not yet create tickets or send replies.

As checked on 2026-07-18, the connected Supabase project has the initial and outbound-delivery Prisma migrations applied. Apply the expansion migration before relying on department configuration, student verification, retrieval, or organization tables. Do not add credentials, tokens, or local connection files to this repository.

## Pilot objective

Prove one auditable student-support workflow for the Registration department:

```text
Student message -> Meta webhook -> deduplicated event -> conversation
-> Registration ticket -> authorized staff reply -> Messenger delivery
```

The pilot should handle registration questions, registration holds, add/drop guidance, and requests that require Registration staff follow-up. It must not make student-record changes or expose private student data based only on a Messenger identity.

## Pilot dependencies

- Connected Supabase project plus approved deployment-secret paths for `DATABASE_URL` and `DIRECT_URL`; values remain outside Git.
- All committed Prisma migrations applied to the target project, with the seed run only after the expansion migration is present.
- Meta Developer app linked to the official Areneo Page.
- Page webhook subscription and Page Access Token flow confirmed.
- Public HTTPS callback URL available for webhook testing.
- Supabase Auth staff identity and department-authorization approach configured.
- Official Registration FAQs, office hours, escalation rules, and emergency handoff content approved.

## Planned implementation order

1. Validate the target Supabase connection, apply committed Prisma migrations, and run the seed through approved secret storage.
2. Confirm the seeded Registration configuration and staff route. Registration remains the only pilot service even though later departments may be present as non-public configuration.
3. Add Meta webhook verification and raw-body signature validation.
4. Store each provider event exactly once and enqueue processing.
5. Create the anonymous conversation, inbound message, and Registration ticket.
6. Add department-scoped staff authentication, ticket listing, assignment, and reply endpoints.
7. Queue and record outbound Messenger delivery with retry and idempotency handling.
8. Add audit events for webhook receipt, ticket creation, staff access, status changes, and replies.
9. Run the end-to-end Registration test before adding any other department.

## Acceptance test

The pilot can open the next department only when all of these pass:

- One signed Messenger event creates one conversation and one Registration ticket.
- Replaying the same provider event creates no duplicate message or ticket.
- The ticket has a public reference number and the expected Registration fields.
- Registration staff can see and act on the ticket only within their authorized scope.
- A staff reply is recorded and delivered through Messenger once.
- Failed delivery is retryable and visible for review.
- Audit records exist for each security-relevant and ticket-changing action.
- No student-specific lookup or record change occurs without the approved verification flow.

## Deferred until after the pilot

- Other departments and cross-department ticket linking.
- Autonomous AI answers and RAG retrieval.
- Student-record integrations.
- Attachments, voice, payments, and calendar integrations.
- Production analytics and long-term retention automation.

