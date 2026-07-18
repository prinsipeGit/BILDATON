# PRD and Luca Plan Reconciliation

## Decision summary

The Luca plan is the implementation baseline. The original Campus Front Door PRD remains the product-vision source. Where they conflict, the MVP chooses the narrower, safer, and more testable behavior below.

| Topic | Original PRD | Luca plan | Repository decision |
|---|---|---|---|
| Product posture | Autonomous FAQ resolution is the primary goal | AI assists; humans retain sensitive decisions | AI may autonomously answer only published general FAQs. Every sensitive or uncertain request becomes a human-owned ticket. |
| Initial channels | Web and chat are P0 | Messenger first; web portal later | Messenger first. The staff dashboard is web-based; a student web portal is later scope. |
| Pilot | Multiple core departments implied | Registration first | One Registration vertical slice before adding departments. Department configuration remains generic. |
| Backend | Python and FastAPI | TypeScript with NestJS or Fastify | TypeScript and Fastify in an npm workspace modular monolith. |
| Finance taxonomy | Finance combines billing and aid by default | Financial Aid and Bursar/Finance are separate | Configurable departments; seed them separately when the institution actually has both offices. |
| Ticket behavior | A ticket is created only on escalation | Every actionable request receives a reference number | General published FAQs may finish without a ticket. Requests needing work, follow-up, private data, or staff action create a ticket. |
| Authentication | Progressive authentication | Messenger is explicitly not identity proof; secure link required | Adopt Luca verification rules. No student-specific lookup based only on a Messenger ID or claimed student number. |
| Asynchronous work | Not concretely specified | Redis/BullMQ worker, retries, dead-letter review | Webhook receipt responds quickly; processing and delivery run as idempotent background jobs. |
| Knowledge governance | Admin-managed KB | Versioned approval and publishing workflow | Only effective `PUBLISHED` knowledge is retrievable by student-facing AI. |
| Data model | Basic student, conversation, ticket, KB tables | Identity, access, lifecycle, audit, webhook, AI, and health entities | Begin with the operational core in Prisma; add specialized request tables only when their workflows are approved. |
| Multi-institution claim | Configuration should support many institutions | Later support for schools/campuses | Include `Institution` ownership from the start to prevent a future tenant-isolation rewrite. MVP deploys to one institution. |
| Dashboard technology | Unspecified frontend | Codex Sites | Reserve `apps/admin-site`; build it after the API workflow and authorization model are tested. |

## Shared strengths retained

- Students do not need to know the responsible department.
- Departments and routing are configuration, not application constants.
- Academic Advising stays separate from the Registrar.
- Legal, disciplinary, clinical, safety, and policy-exception decisions hard-route to authorized people.
- Student-record access is read-only by default and requires verified identity.
- Staff receive complete context and should not ask for information already collected.
- Every important automated decision and human action is auditable.

## Gaps closed by the foundation

- Tenant ownership is explicit in the database.
- Anonymous conversations are allowed and can later link to a verified student.
- Messenger identity and student verification are separate records.
- Role and department membership are modeled independently.
- Webhook deduplication, notification delivery, AI runs, tool calls, and audit logs have dedicated entities.
- Knowledge documents have version, review, approval, and publication states.

## Remaining discovery decisions

These require stakeholder input and must not be invented by developers:

1. The exact Registration pilot workflow and required ticket fields.
2. Priority definitions and service-level targets.
3. Official safety and emergency handoff destinations and operating hours.
4. Data retention periods for messages, audit events, and failed webhooks.
5. Staff identity provider and role-approval process.
6. The official Meta Page and production ownership model.
7. Approved English, Filipino, and Taglish knowledge content.
