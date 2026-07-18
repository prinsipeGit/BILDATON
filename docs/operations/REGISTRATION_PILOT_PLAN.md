# Registration Pilot Plan

## Status

Planning only. Implementation is intentionally paused until the group commits the Supabase and Meta/Facebook connection work. Do not add credentials, tokens, or local connection files to this repository.

## Pilot objective

Prove one auditable student-support workflow for the Registration department:

```text
Student message -> Meta webhook -> deduplicated event -> conversation
-> Registration ticket -> authorized staff reply -> Messenger delivery
```

The pilot should handle registration questions, registration holds, add/drop guidance, and requests that require Registration staff follow-up. It must not make student-record changes or expose private student data based only on a Messenger identity.

## Dependencies before implementation

- Supabase project and approved database connection committed by the group.
- PostgreSQL schema and pgvector approach agreed with the repository Prisma baseline.
- Meta Developer app linked to the official Areneo Page.
- Page webhook subscription and Page Access Token flow confirmed.
- Public HTTPS callback URL available for webhook testing.
- Registration staff identity and authorization approach agreed.
- Official Registration FAQs, office hours, escalation rules, and emergency handoff content approved.

## Planned implementation order

1. Reconcile the group Supabase connection with `DATABASE_URL`, migrations, and environment validation.
2. Seed Areneo University and the first department. Use `Registration` unless the official office name is `Registrar`.
3. Add Meta webhook verification and raw-body signature validation.
4. Store each provider event exactly once and enqueue processing.
5. Create the anonymous conversation, inbound message, and Registration ticket.
6. Add department-scoped staff authentication, ticket listing, assignment, and reply endpoints.
7. Queue and record outbound Messenger delivery with retry and idempotency handling.
8. Add audit events for webhook receipt, ticket creation, staff access, status changes, and replies.
9. Run the end-to-end Registration test before adding any other department.

## Acceptance test

The pilot is ready for the next department when all of these pass:

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

