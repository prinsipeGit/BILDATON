# Contributing

## Working rules

1. Read the architecture and active decision records before coding.
2. Keep the first release a modular monolith. Do not create network-separated services for internal modules.
3. Treat channel identity as an address, not proof of student identity.
4. Require backend authorization for every data read, state transition, and AI-requested tool call.
5. Make inbound webhooks and outbound operations idempotent.
6. Store an audit event for security-relevant and ticket-changing actions.
7. Allow student-facing AI answers to use only currently effective, published knowledge.
8. Never put secrets or student data in logs, fixtures, prompts, or commits.

## Before opening a pull request

Run:

```bash
npm run typecheck
npm test
npm run lint
```

The pull request must describe the user-visible behavior, authorization impact, data migration, failure behavior, and tests.

## Definition of done for a feature

- Acceptance criteria are written and met.
- Authorization is enforced in the API, not only in the UI.
- Retry and duplicate-delivery behavior is defined.
- Audit events are present where required.
- Tests cover the successful path, invalid input, unauthorized access, and repeated requests.
- Operational documentation is updated.
