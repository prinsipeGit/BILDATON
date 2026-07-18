# Organization Coordination Expansion

Organization coordination begins only after the six core departments have passed their activation gates. It supports verified student officers submitting event, permit, and office-information requests without replacing university approval authority. The repository schema is a future-work contract only; no organization endpoint, dashboard workflow, or external adapter is active yet.

## Workflow

1. An active, verified organization officer submits a request to a reviewing department. Verification requires a current student-verification record and an officer record that has not been revoked.
2. The request carries a title, description, optional requested dates/venue, and file-link metadata only.
3. The responsible office reviews the request, requests information, approves, or rejects it through an auditable review record.
4. Venue status starts as manual. A future calendar adapter may report availability, but it cannot approve a venue or permit.

## Boundaries

- Officers cannot approve their own requests.
- Staff, not an AI agent, make permit, policy, budget, and venue decisions.
- Submitting a request never creates a permit, reserves a venue, or changes a university record.
- External office and venue systems remain adapter interfaces with mock implementations until their approved APIs and ownership are known.
- Files use approved metadata and links; private documents, payment processing, and automatic scheduling are out of scope.
