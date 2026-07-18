export class AuthorizationError extends Error {
  override readonly name = "AuthorizationError";
}

export function requireInstitutionScope(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new AuthorizationError("Resource is outside the active institution scope");
  }
}
