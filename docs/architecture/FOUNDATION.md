# Foundation Architecture

## First vertical slice

The first deliverable proves one auditable workflow:

1. Meta sends a signed Messenger webhook.
2. The API verifies the signature and stores the provider event ID exactly once.
3. The API queues processing and acknowledges Meta quickly.
4. The worker creates or finds the anonymous conversation and persists the message.
5. The request becomes an IT Support ticket with a public reference number.
6. An authorized IT staff member views the ticket and sends a reply.
7. The worker delivers the reply through Messenger and records the outcome.
8. Every state change produces an audit event.

AI classification is added only after this non-AI path is reliable.

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
2. Database migrations and seed one institution plus IT Support.
3. Webhook verification and idempotent event storage.
4. Conversation/message persistence and IT ticket creation.
5. Staff authentication and department authorization.
6. Staff reply plus queued Messenger delivery.
7. Audit and failure-review surfaces.
8. Published-knowledge retrieval.
9. AI classification, drafting, and safety evaluation.

## Explicitly deferred

- SIS access
- Student-record changes
- Payments
- Registrar document release
- Medical assessment
- Voice and attachment processing
- Student web portal
- Multi-institution administration UI
