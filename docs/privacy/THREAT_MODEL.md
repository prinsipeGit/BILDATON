# Initial Threat Model

This is an engineering checklist, not a completed Privacy Impact Assessment. The institution's Data Protection Officer must approve production handling.

| Threat | Required control |
|---|---|
| Forged Messenger events | Verify Meta signatures before parsing or persistence |
| Duplicate or replayed events | Unique provider event ID and idempotent processing |
| Student impersonation | Treat Messenger identity as unverified; use short-lived SSO verification links |
| Cross-department data exposure | API-enforced department membership and tenant scoping |
| Prompt injection | Published-only retrieval; strict allowlisted tools; backend authorization |
| Sensitive data in logs | Structured redaction and no raw message bodies in diagnostic logs |
| Repeated outgoing action | Idempotency keys and delivery state machine |
| Compromised staff account | MFA, least privilege, session controls, immutable audit trail |
| Unsafe automated advice | safety classification, uncertainty escalation, and human ownership |
| Tenant data leakage | institution ID on owned records and scoped database queries |

Before pilot, document retention, deletion, breach response, backup restoration, subprocessors, data residency, and emergency escalation ownership.
