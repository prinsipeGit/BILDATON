export class AuthorizationError extends Error {
  override readonly name = "AuthorizationError";
}

export function requireInstitutionScope(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new AuthorizationError("Resource is outside the active institution scope");
  }
}

export interface DepartmentAccessPolicy {
  status: "PLANNED" | "READY" | "ACTIVE" | "SUSPENDED";
  publicFaqEnabled: boolean;
  sourceOwnerUserId: string | null;
  routingDestination: string | null;
}

export interface VerificationState {
  studentId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export function canServePublicFaq(policy: DepartmentAccessPolicy): boolean {
  return (
    policy.status === "ACTIVE" &&
    policy.publicFaqEnabled &&
    policy.sourceOwnerUserId !== null &&
    policy.routingDestination !== null
  );
}

export function requirePublicFaqAccess(policy: DepartmentAccessPolicy): void {
  if (!canServePublicFaq(policy)) {
    throw new AuthorizationError("Department is not active for student-facing knowledge retrieval");
  }
}

export function requireVerifiedStudentAccess(
  verification: VerificationState | null,
  now: Date = new Date()
): string {
  if (!verification || verification.revokedAt !== null || verification.expiresAt <= now) {
    throw new AuthorizationError("Student-specific requests require an active verified identity");
  }
  return verification.studentId;
}

export function requireVerifiedOrganizationOfficer(
  officerStudentId: string | null,
  verifiedStudentId: string | null
): void {
  if (officerStudentId === null || officerStudentId !== verifiedStudentId) {
    throw new AuthorizationError("Organization requests require a verified active officer");
  }
}
