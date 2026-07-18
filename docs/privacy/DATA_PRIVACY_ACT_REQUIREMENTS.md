# Data Privacy and Retrieval Security Requirements

## Status and scope

This is an engineering baseline for the Areneo University pilot, not a legal opinion or a completed Privacy Impact Assessment. The university, as the likely personal information controller, must confirm the processing purposes, lawful bases, notices, retention schedule, data-sharing arrangements, and accountable privacy officer before production use.

Primary source: [Republic Act No. 10173, Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/), especially Sections 3, 11-14, 16-21, and 25-32.

## What Luca processes

| Data flow | Examples | Privacy classification | Default rule |
|---|---|---|---|
| Messenger intake | sender ID, page ID, message text, timestamps | Personal information; message text may contain sensitive personal information | Accept only for a declared helpdesk purpose; do not treat sender ID as student identity |
| Student linking | student number, verified identity, SSO subject | Personal information; education data and government-issued identifiers may be sensitive personal information | Require a separate, time-limited verification flow and restrict access |
| Support records | ticket subject, status, department, staff notes, conversation history | Personal information; may become sensitive based on content | Use least privilege, audit access, and retain only as approved |
| Knowledge base | official policies, procedures, manuals, contact details | Usually institutional content; may contain personal or confidential material | Do not publish a document to retrieval until ownership, sensitivity, approval, and effective dates are recorded |
| AI and retrieval telemetry | prompts, retrieved chunks, citations, tool arguments, model output | May reproduce personal or sensitive information | Minimize, redact, restrict access, and define a retention period; never use raw student conversations as training data by default |
| Analytics | counts, categories, response times, trends | Prefer aggregate or de-identified data | Exclude names, sender IDs, student numbers, message text, and free-text notes unless specifically approved |

## DPA-aligned controls

The implementation must satisfy the following control families before pilot approval:

### 1. Accountability and purpose

- Name Areneo University as controller or confirm the actual controller/processor arrangement.
- Designate the accountable privacy officer and publish a contact route for privacy requests.
- Maintain a record of processing activities for Messenger, tickets, staff dashboard, knowledge retrieval, AI providers, analytics, backups, and support operations.
- Document a specific lawful basis and purpose for each flow. Consent is not the only possible basis under Section 12, and sensitive personal information requires the additional safeguards in Section 13.
- Execute processor/data-sharing agreements for Meta, hosting, database, queue, observability, and AI providers. Contracts must address confidentiality, security, permitted purpose, subprocessors, deletion/return, incident cooperation, and cross-border processing.

### 2. Transparency and data-subject rights

- Show a privacy notice at first practical opportunity in Messenger and before authenticated collection. It must state the data collected, purposes, methods, recipients, automated processing, controller contact, retention period, access/correction rights, and complaint route.
- Provide authenticated workflows for access, correction, blocking/deletion where applicable, and structured export/portability.
- Do not make a significant decision about a student solely from an AI output. Record the AI role and route consequential decisions to authorized staff.
- Keep a data-subject request audit trail without exposing request contents in ordinary logs.

### 3. Minimization, retention, and disposal

- Collect only the fields required for the current Registration workflow. Do not request student numbers, health details, financial details, or identity documents for general FAQs.
- Store separate channel identity, verified student identity, and ticket records. Messenger identity alone is never proof of student identity.
- Define retention schedules for raw messages, tickets, webhook payloads, audit events, AI runs, retrieved-chunk traces, backups, and dead-letter jobs. Retention must be purpose-based and approved by Areneo.
- Implement deletion or irreversible de-identification jobs that cover primary records, search indexes, caches, queues, logs, exports, and backups according to the approved policy.
- Keep analytics de-identified by default. Use keyed aggregation or irreversible pseudonymization only where re-identification is necessary and separately controlled.

### 4. Security of personal information

- Verify Meta signatures before parsing or persisting webhook content; enforce replay protection and rate limits.
- Encrypt data in transit and at rest, isolate production credentials, and use secret rotation. Do not store secrets in the repository, prompts, logs, or fixtures.
- Enforce institution and department scope in the API and service layer, not only in the dashboard.
- Require MFA and least privilege for staff; log ticket reads, exports, assignments, replies, knowledge publication, retrieval access, and administrative changes.
- Redact message bodies, access tokens, student identifiers, and retrieved text from routine logs and error reports.
- Maintain vulnerability management, dependency updates, backup restoration tests, monitoring, and an incident response runbook.
- Define breach triage and notification ownership. Section 20(f) requires prompt notification to the Commission and affected data subjects when the statutory risk threshold is met; the DPO must confirm the current notification procedure and timing.

## Retrieval-specific security contract

The retrieval service must enforce every item below for every query:

1. Filter by `institutionId` before similarity search; never rely on the language model to enforce tenant boundaries.
2. Retrieve only versions with `status = PUBLISHED` and an effective date covering the current time.
3. Enforce department and audience scope before returning chunks. General FAQ content must be explicitly marked as public-to-students.
4. Exclude drafts, archived versions, revoked content, private staff notes, student tickets, and raw conversations from the student-facing index.
5. Store document version, chunk ID, source title, effective dates, and approval metadata with every citation. A generated answer without traceable citations is not an acceptable FAQ answer.
6. Treat retrieved text as untrusted data. Delimit it from instructions, ignore embedded commands, and never allow a chunk to choose tools, permissions, recipients, or policy outcomes.
7. Apply an output policy that blocks or escalates answers containing student-specific data, sensitive personal information, unsupported claims, or instructions outside the published source.
8. Prevent retrieval leakage through embeddings, caches, debug traces, prompt logs, and model-provider retention. The erasure process must include the vector index and cached results.
9. Do not embed or index raw student conversations. If evaluation needs real conversations, use approved, minimized, de-identified samples with access controls and an expiry date.
10. Test cross-institution, cross-department, unpublished-content, revoked-content, prompt-injection, and deletion cases as security tests.

## Current repository gaps

The forward-only expansion migration defines `KnowledgeChunk`, vector embeddings, `KnowledgeCitation`, and institution/department scope. It must be applied to each target Supabase project before those tables can be used. The repository includes an OpenAI provider adapter, but it is not wired into a runtime route or worker and there is still no ingestion pipeline, retriever, source-review workflow, or retrieval enforcement test suite.

The model records approval and effective dates, but it does not yet provide a dedicated publication/revocation actor-and-timestamp record, retention or erasure state, or deletion jobs. Before enabling RAG, implement:

- a service API that requires institution, department, audience, publication, and effective-date filters before ranking chunks;
- source ownership, provenance, publication, revocation, and citation audit metadata;
- deletion propagation to the vector index, caches, traces, and provider-facing records;
- tests proving that unauthorized, unpublished, expired, revoked, and deleted content cannot be retrieved.

## Pilot gates

Do not connect production Messenger traffic or an AI provider until Areneo has approved:

- controller/processor roles and vendor contracts;
- privacy notice and lawful-basis register;
- DPO/privacy contact and data-subject request process;
- retention, deletion, backup, and analytics rules;
- sensitive-data and emergency-routing policy;
- retrieval publication workflow and source owners;
- breach response and notification runbook;
- security and retrieval test evidence.
