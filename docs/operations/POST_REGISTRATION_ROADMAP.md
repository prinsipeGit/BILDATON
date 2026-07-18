# Post-Registration Roadmap

## Delivery Order

1. Complete and test the Registration Messenger-to-ticket workflow.
2. Add IT Support with the same deterministic ticket, staff scope, delivery, and audit behavior.
3. Prepare, ingest, and review approved student-facing sources for Registration, IT Support, Student Services, Finance, Academic Advising, and Campus Health without enabling public retrieval.
4. Activate RAG by department, beginning with Registration and IT Support. Retrieval may answer only from published, effective, cited sources.
5. Add time-limited student verification through the approved campus SSO or magic-link adapter before Finance, Academic Advising, or Campus Health handle student-specific work.
6. Activate remaining departments in this order: Student Services, Finance, Academic Advising, Campus Health.
7. Add organization coordination after every existing department has an approved staff route and activation owner.

## Activation Gate

`READY` means a department configuration can be completed; it does not enable public answers. A department is student-facing only when its `DepartmentConfiguration` is `ACTIVE`, `publicFaqEnabled` is true, a named source owner and staff routing destination exist, and approved public FAQ, operating-hour, and escalation rules are current. Missing or expired content produces a staff-owned ticket, never an invented answer.

The repository migration establishes these contracts, but it does not activate a department, publish knowledge, or implement a retriever by itself.

## Retrieval Contract

The retrieval service filters by institution, department, student audience, published status, and effective dates before it ranks chunks. It records document version and chunk citations on each AI run. Raw conversations, tickets, private notes, drafts, archived versions, and revoked content are never indexed for student answers.

OpenAI is the first embeddings and answer adapter. Its credentials and model selection live in deployment configuration only. The backend treats generated text as untrusted and escalates student-specific, sensitive, action-oriented, or uncertain requests.

## Department Boundaries

- Student Services can begin with general service and routing information.
- Finance, Academic Advising, and Campus Health require active verified identity before any student-specific lookup or response.
- Campus Health provides administrative access and appointment/service guidance only; clinical questions route to humans.
- No department performs SIS writes, payments, policy exceptions, or autonomous decisions.
