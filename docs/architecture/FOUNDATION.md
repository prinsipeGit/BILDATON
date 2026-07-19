# Foundation Architecture

## Simplified chatbot vertical slice

The first deliverable proves one auditable workflow:

1. Meta sends a signed Messenger webhook.
2. The API verifies the signature and stores the provider event ID exactly once.
3. The API acknowledges Meta after durable storage.
4. A small database-backed processor creates or finds the anonymous conversation and message.
5. Structured Registrar requests enter an auditable staff queue; general questions load active rules and effective published knowledge.
6. OpenAI drafts general answers only from that material, while authorized staff control request status changes.
7. Answers, citations, AI runs, status events, and delivery state are stored in Supabase.
8. Answers and request-status notifications are delivered through Messenger.

Retryable webhook failures are reclaimed by the database-backed processor up to five total attempts. After that, they remain visible in the operations dashboard for staff investigation instead of retrying forever.

Redis and a separate worker are intentionally deferred until measured traffic or reliability needs justify them.

## Trust boundaries

- Meta request data is untrusted until its signature is verified.
- Messenger sender IDs identify channel accounts, not students.
- The dashboard is untrusted for authorization decisions; the API enforces permissions.
- AI output is untrusted input to the backend. Tool names and arguments require schema, authorization, policy, and idempotency checks.
- Retrieved documents are answerable only when their version is published and effective.

## Module boundaries

| Module | Owns |
|---|---|
| Identity | users, students, staff profiles, channel identities, verifications |
| Access | roles, permissions, department memberships |
| Conversations | conversations, messages, attachments, channel correlation |
| Tickets | lifecycle, assignment, priority, notes, transfers, reference numbers |
| Knowledge | documents, versions, approvals, chunks, effective dates |
| AI | runs, citations, structured classifications, approved tool requests |
| Integrations | webhooks, outgoing deliveries, retry/dead-letter state |
| Audit | append-only security and business events |
| Operations | health observations and job visibility |

Modules share one deployment and database initially, but may not bypass another module's public service interface.

## Required implementation order

1. Configuration validation and health endpoint.
2. Database migrations and seed one institution.
3. Webhook verification and idempotent event storage.
4. Conversation and message persistence.
5. Structured Registrar requests plus staff authentication and authorization.
6. Active rules, published-knowledge retrieval, and grounded OpenAI answers.
7. Messenger delivery, status notifications, and retry handling.
8. Staff operations, audit, and failure-review surfaces.
9. Embeddings and higher-scale processing when measured needs justify them.

## Explicitly deferred

- SIS access
- Student-record changes
- Payments
- Registrar document release
- Medical assessment
- Voice and attachment processing
- Student web portal
- Multi-institution administration UI
